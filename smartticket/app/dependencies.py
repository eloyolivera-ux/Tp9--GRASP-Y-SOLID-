"""Inyección de dependencias (composición de objetos): único lugar que hace los `new`."""
from fastapi import Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.pasarela import PasarelaPagos, PasarelaSimulada
from app.repositories import (ClienteRepository, EntradaRepository, EventoRepository,
                              LugarRepository, SectorRepository, VentaRepository)
from app.services.acceso_service import AccesoService
from app.services.cotizacion_service import CotizacionService
from app.services.evento_service import EventoService
from app.services.pago_service import PagoService


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_pasarela() -> PasarelaPagos:
    return PasarelaSimulada()


def get_lugares(db: Session = Depends(get_db)): return LugarRepository(db)
def get_sectores(db: Session = Depends(get_db)): return SectorRepository(db)
def get_clientes(db: Session = Depends(get_db)): return ClienteRepository(db)
def get_eventos(db: Session = Depends(get_db)): return EventoRepository(db)


def get_evento_service(db: Session = Depends(get_db)):
    return EventoService(EventoRepository(db), LugarRepository(db))


def get_cotizacion_service(db: Session = Depends(get_db)):
    return CotizacionService(EventoRepository(db), EntradaRepository(db))


def get_pago_service(db: Session = Depends(get_db), pasarela: PasarelaPagos = Depends(get_pasarela)):
    return PagoService(ClienteRepository(db), EntradaRepository(db), VentaRepository(db), pasarela)


def get_acceso_service(db: Session = Depends(get_db)):
    return AccesoService(EntradaRepository(db))
