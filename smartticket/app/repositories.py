"""Repositorios: único lugar que habla con SQLAlchemy (Pure Fabrication + DIP)."""
from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (Cliente, Entrada, EstadoEntrada, Evento, Lugar, Sector, Venta)

T = TypeVar("T")


class RepositorioBase(Generic[T]):
    modelo: type[T]

    def __init__(self, db: Session):
        self.db = db

    def agregar(self, obj: T) -> T:
        self.db.add(obj)
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def obtener(self, id: int) -> T | None:
        return self.db.get(self.modelo, id)

    def listar(self) -> list[T]:
        return list(self.db.scalars(select(self.modelo)))

    def confirmar(self) -> None:
        self.db.commit()


class LugarRepository(RepositorioBase[Lugar]):
    modelo = Lugar


class SectorRepository(RepositorioBase[Sector]):
    modelo = Sector


class ClienteRepository(RepositorioBase[Cliente]):
    modelo = Cliente


class EventoRepository(RepositorioBase[Evento]):
    modelo = Evento


class VentaRepository(RepositorioBase[Venta]):
    modelo = Venta


class EntradaRepository(RepositorioBase[Entrada]):
    modelo = Entrada

    def disponibles(self, evento_id: int, sector_id: int, limite: int) -> list[Entrada]:
        stmt = (select(Entrada)
                .where(Entrada.evento_id == evento_id, Entrada.sector_id == sector_id,
                       Entrada.estado == EstadoEntrada.DISPONIBLE)
                .order_by(Entrada.id).limit(limite))
        return list(self.db.scalars(stmt))

    def por_ids(self, ids: list[int]) -> list[Entrada]:
        return list(self.db.scalars(select(Entrada).where(Entrada.id.in_(ids))))

    def por_codigo_qr(self, codigo: str) -> Entrada | None:
        return self.db.scalar(select(Entrada).where(Entrada.codigo_qr == codigo))
