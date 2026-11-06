from datetime import datetime

from app.exceptions import TicketInvalido
from app.models import Entrada
from app.repositories import EntradaRepository


class AccesoService:
    """HU3. La validación de estados la hace la propia Entrada (Experto)."""

    def __init__(self, entradas: EntradaRepository):
        self.entradas = entradas

    def escanear(self, codigo_qr: str) -> Entrada:
        entrada = self.entradas.por_codigo_qr(codigo_qr)
        if entrada is None:
            raise TicketInvalido()                   # Escenario 3 -> 404
        entrada.utilizar(datetime.now())             # Escenarios 1, 2 y 4
        self.entradas.confirmar()
        return entrada
