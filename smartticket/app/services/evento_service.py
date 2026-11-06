from decimal import Decimal

from app.exceptions import NoEncontrado
from app.models import Evento
from app.repositories import EventoRepository, LugarRepository


class EventoService:
    def __init__(self, eventos: EventoRepository, lugares: LugarRepository):
        self.eventos = eventos
        self.lugares = lugares

    def crear(self, nombre, fecha, lugar_id: int, precios: dict[int, Decimal]) -> Evento:
        lugar = self.lugares.obtener(lugar_id)
        if lugar is None:
            raise NoEncontrado("Lugar no encontrado")
        evento = Evento(nombre=nombre, fecha=fecha, lugar=lugar)
        evento.configurar(lugar, precios)            # valida precios y genera las entradas
        return self.eventos.agregar(evento)
