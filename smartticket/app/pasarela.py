"""
Pasarela de pagos. DIP + OCP + Protected Variations: el servicio depende de la
abstracción; cambiar a MercadoPago/Stripe = nueva clase, sin tocar PagoService.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal


@dataclass
class DatosTarjeta:
    numero: str
    titular: str
    vencimiento: str
    cvv: str


@dataclass
class ResultadoPago:
    aprobado: bool
    motivo: str = ""


class PasarelaPagos(ABC):
    @abstractmethod
    def cobrar(self, monto: Decimal, tarjeta: DatosTarjeta) -> ResultadoPago: ...


class PasarelaSimulada(PasarelaPagos):
    """Regla de simulación: tarjetas terminadas en 0000 => Rechazado (fondos insuficientes)."""

    def cobrar(self, monto: Decimal, tarjeta: DatosTarjeta) -> ResultadoPago:
        if tarjeta.numero.endswith("0000"):
            return ResultadoPago(False, "Fondos insuficientes")
        return ResultadoPago(True, "Aprobado")
