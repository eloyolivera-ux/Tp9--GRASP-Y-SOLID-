"""Un test por cada escenario Gherkin del TP (10 escenarios)."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.dependencies import get_db, get_pasarela
from app.main import app
from app.pasarela import PasarelaSimulada

TARJETA_OK = {"numero": "4111111111111111", "titular": "Ana", "vencimiento": "12/30", "cvv": "123"}
TARJETA_SIN_FONDOS = {**TARJETA_OK, "numero": "4000000000000000"}


class PasarelaEspia(PasarelaSimulada):
    def __init__(self):
        self.llamadas = 0

    def cobrar(self, monto, tarjeta):
        self.llamadas += 1
        return super().cobrar(monto, tarjeta)


@pytest.fixture()
def espia():
    return PasarelaEspia()


@pytest.fixture()
def client(espia):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def _db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_pasarela] = lambda: espia
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def escenario(client):
    """Rock Fest: Platea $12.000 (cap. 5) y VIP $30.000 (cap. 1)."""
    lugar = client.post("/lugares", json={"nombre": "Estadio", "direccion": "Calle 1"}).json()
    platea = client.post("/sectores", json={"nombre": "Platea", "capacidad": 5, "lugar_id": lugar["id"]}).json()
    vip = client.post("/sectores", json={"nombre": "VIP", "capacidad": 1, "lugar_id": lugar["id"]}).json()
    evento = client.post("/eventos", json={
        "nombre": "Rock Fest", "fecha": "2026-12-01T21:00:00", "lugar_id": lugar["id"],
        "precios": [{"sector_id": platea["id"], "precio": 12000}, {"sector_id": vip["id"], "precio": 30000}],
    }).json()
    cliente = client.post("/clientes", json={"nombre": "Ana", "email": "ana@mail.com"}).json()
    return {"evento": evento["id"], "platea": platea["id"], "vip": vip["id"], "cliente": cliente["id"]}


def cotizar(client, e, sector, cantidad):
    return client.post("/cotizar", json={"evento_id": e["evento"], "sector_id": e[sector], "cantidad": cantidad})


def pagar(client, e, ids, tarjeta=TARJETA_OK):
    return client.post("/iniciar-pago", json={"cliente_id": e["cliente"], "entrada_ids": ids, "tarjeta": tarjeta})


def comprar_platea(client, e, n=2):
    ids = cotizar(client, e, "platea", n).json()["entrada_ids"]
    return pagar(client, e, ids).json()


# ----------------------------- HU1 -----------------------------
def test_hu1_e1_cotizacion_exitosa(client, escenario):
    r = cotizar(client, escenario, "platea", 2)
    assert r.status_code == 200
    assert r.json()["subtotal"] == 24000 and r.json()["total"] == 24000


def test_hu1_e2_capacidad_insuficiente(client, escenario):
    r = cotizar(client, escenario, "vip", 3)
    assert r.status_code == 400
    assert r.json()["detail"] == "Capacidad insuficiente o entradas no disponibles"


@pytest.mark.parametrize("cantidad", [0, -2])
def test_hu1_e3_cantidad_invalida(client, escenario, cantidad):
    r = cotizar(client, escenario, "platea", cantidad)
    assert r.status_code == 400
    assert r.json()["detail"] == "La cantidad de entradas solicitadas debe ser mayor a cero"


# ----------------------------- HU2 -----------------------------
def test_hu2_e1_pago_exitoso(client, escenario):
    ids = cotizar(client, escenario, "platea", 2).json()["entrada_ids"]
    r = pagar(client, escenario, ids)
    assert r.status_code == 201
    body = r.json()
    assert body["estado"] == "Pagada" and body["total"] == 24000
    assert all(e["estado"] == "Emitida" for e in body["entradas"])


def test_hu2_e2_pago_rechazado(client, escenario):
    ids = cotizar(client, escenario, "platea", 2).json()["entrada_ids"]
    r = pagar(client, escenario, ids, TARJETA_SIN_FONDOS)
    assert r.status_code == 402 and r.json()["detail"] == "Pago denegado"
    # las entradas siguen disponibles para otros clientes
    assert cotizar(client, escenario, "platea", 5).status_code == 200


def test_hu2_e3_perdida_de_disponibilidad(client, escenario, espia):
    ids = cotizar(client, escenario, "platea", 2).json()["entrada_ids"]
    assert pagar(client, escenario, ids).status_code == 201      # otro usuario compra primero
    llamadas_antes = espia.llamadas
    r = pagar(client, escenario, ids)
    assert r.status_code == 409
    assert r.json()["detail"] == "Los lugares seleccionados ya no se encuentran disponibles"
    assert espia.llamadas == llamadas_antes                       # NO se consultó a la pasarela


# ----------------------------- HU3 -----------------------------
def test_hu3_e1_ingreso_exitoso(client, escenario):
    qr = comprar_platea(client, escenario)["entradas"][0]["codigo_qr"]
    r = client.post("/escanear-acceso", json={"codigo_qr": qr})
    assert r.status_code == 200 and r.json()["mensaje"] == "Acceso Permitido"
    assert r.json()["hora_ingreso"]


def test_hu3_e2_entrada_ya_utilizada(client, escenario):
    qr = comprar_platea(client, escenario)["entradas"][0]["codigo_qr"]
    primera = client.post("/escanear-acceso", json={"codigo_qr": qr}).json()
    r = client.post("/escanear-acceso", json={"codigo_qr": qr})
    assert r.status_code == 409 and r.json()["detail"] == "Entrada ya utilizada"
    # la hora original no se sobreescribe: un tercer intento sigue rechazado igual
    assert client.post("/escanear-acceso", json={"codigo_qr": qr}).status_code == 409
    assert primera["hora_ingreso"]


def test_hu3_e3_qr_inexistente(client, escenario):
    r = client.post("/escanear-acceso", json={"codigo_qr": "falso123"})
    assert r.status_code == 404 and r.json()["detail"] == "Ticket Inválido o Inexistente"


def test_hu3_e4_entrada_no_pagada(client, escenario):
    # se reserva sin pagar: la entrada queda en estado Reservada
    from app.models import Entrada, EstadoEntrada
    from app.dependencies import get_db
    db = next(app.dependency_overrides[get_db]())
    entrada = db.query(Entrada).filter_by(sector_id=escenario["platea"]).first()
    entrada.reservar()
    db.commit()
    r = client.post("/escanear-acceso", json={"codigo_qr": entrada.codigo_qr})
    assert r.status_code == 403 and r.json()["detail"] == "Ticket no emitido / Falta de pago"
    # y una entrada Disponible tampoco entra
    otra = db.query(Entrada).filter_by(sector_id=escenario["platea"], estado=EstadoEntrada.DISPONIBLE).first()
    r = client.post("/escanear-acceso", json={"codigo_qr": otra.codigo_qr})
    assert r.status_code == 403
