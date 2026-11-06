from dataclasses import dataclass
from decimal import Decimal

from app.exceptions import CantidadInvalida, CapacidadInsuficiente, NoEncontrado
from app.repositories import EntradaRepository, EventoRepository


@dataclass
class Cotizacion:
    evento_id: int
    sector_id: int
    cantidad: int
    precio_unitario: Decimal
    entrada_ids: list[int]

    @property
    def subtotal(self) -> Decimal:
        return self.precio_unitario * self.cantidad

    @property
    def total(self) -> Decimal:
        return self.subtotal


class CotizacionService:
    """HU1. Repositorios inyectados por constructor (DIP)."""

    def __init__(self, eventos: EventoRepository, entradas: EntradaRepository):
        self.eventos = eventos
        self.entradas = entradas

    def cotizar(self, evento_id: int, sector_id: int, cantidad: int) -> Cotizacion:
        if cantidad <= 0:                                   # Escenario 3
            raise CantidadInvalida()
        evento = self.eventos.obtener(evento_id)
        if evento is None:
            raise NoEncontrado("Evento no encontrado")
        precio = evento.precio_para(sector_id)              # Experto: Evento conoce sus precios
        disponibles = self.entradas.disponibles(evento_id, sector_id, cantidad)
        if len(disponibles) < cantidad:                     # Escenario 2
            raise CapacidadInsuficiente()
        return Cotizacion(evento_id, sector_id, cantidad, precio, [e.id for e in disponibles])
