"""Carga datos de demostración usando la propia API (con el servidor levantado).

    uvicorn app.main:app --reload      # terminal 1
    python seed.py                     # terminal 2
"""
import json
import sys
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"


def llamar(metodo, ruta, cuerpo=None):
    req = urllib.request.Request(BASE + ruta, method=metodo,
                                 data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


if llamar("GET", "/eventos"):
    print("Ya hay eventos cargados; no se vuelve a sembrar.")
    sys.exit(0)

LUGARES = {
    "Estadio Monumental": ("Av. Figueroa Alcorta 7597, CABA",
                           {"Campo": 60, "Platea": 40, "VIP": 5}),
    "Teatro Colón": ("Cerrito 628, CABA", {"Platea Alta": 30, "Palco": 20}),
}
PRECIOS = {"Campo": 8000, "Platea": 12000, "VIP": 30000, "Platea Alta": 15000, "Palco": 25000}
EVENTOS = [("Rock Fest", "2026-12-05T21:00:00", "Estadio Monumental"),
           ("Superclásico", "2026-12-20T17:00:00", "Estadio Monumental"),
           ("Filarmónica de Gala", "2026-12-12T20:30:00", "Teatro Colón")]

lugar_ids, sectores_por_lugar = {}, {}
for nombre, (direccion, sectores) in LUGARES.items():
    lugar = llamar("POST", "/lugares", {"nombre": nombre, "direccion": direccion})
    lugar_ids[nombre] = lugar["id"]
    sectores_por_lugar[nombre] = [
        llamar("POST", "/sectores", {"nombre": n, "capacidad": c, "lugar_id": lugar["id"]})
        for n, c in sectores.items()]

for nombre, email in [("Juan Pérez", "juan@mail.com"), ("María Gómez", "maria@mail.com"),
                      ("Lucas Fernández", "lucas@mail.com")]:
    llamar("POST", "/clientes", {"nombre": nombre, "email": email})

for nombre, fecha, lugar in EVENTOS:
    precios = [{"sector_id": s["id"], "precio": PRECIOS[s["nombre"]]} for s in sectores_por_lugar[lugar]]
    llamar("POST", "/eventos", {"nombre": nombre, "fecha": fecha,
                                "lugar_id": lugar_ids[lugar], "precios": precios})
print("Datos de demo cargados: 2 lugares, 5 sectores, 3 clientes, 3 eventos (con sus entradas).")
