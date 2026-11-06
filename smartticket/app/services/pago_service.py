from app.exceptions import CantidadInvalida, EntradasNoDisponibles, NoEncontrado, PagoDenegado
from app.models import Venta
from app.pasarela import DatosTarjeta, PasarelaPagos
from app.repositories import ClienteRepository, EntradaRepository, VentaRepository


class PagoService:
    """HU2. Orquesta el caso de uso; las reglas de estado viven en Entrada y Venta."""

    def __init__(self, clientes: ClienteRepository, entradas: EntradaRepository,
                 ventas: VentaRepository, pasarela: PasarelaPagos):
        self.clientes = clientes
        self.entradas = entradas
        self.ventas = ventas
        self.pasarela = pasarela

    def iniciar_pago(self, cliente_id: int, entrada_ids: list[int], tarjeta: DatosTarjeta) -> Venta:
        if not entrada_ids:
            raise CantidadInvalida()
        cliente = self.clientes.obtener(cliente_id)
        if cliente is None:
            raise NoEncontrado("Cliente no encontrado")
        entradas = self.entradas.por_ids(list(set(entrada_ids)))
        if len(entradas) != len(set(entrada_ids)):
            raise NoEncontrado("Alguna entrada no existe")

        # Escenario 3: se verifica disponibilidad ANTES de consultar a la pasarela
        if not all(e.esta_disponible for e in entradas):
            raise EntradasNoDisponibles()

        # Se reservan las entradas para que nadie más las tome mientras se cobra
        venta = Venta(cliente=cliente)
        for e in entradas:
            venta.agregar_entrada(e)
        self.ventas.agregar(venta)

        resultado = self.pasarela.cobrar(venta.total, tarjeta)
        if resultado.aprobado:
            venta.pagar()                 # Escenario 1: Venta Pagada + entradas Emitidas
        else:
            venta.cancelar()              # Escenario 2: entradas vuelven a Disponible
        self.ventas.confirmar()
        if not resultado.aprobado:
            raise PagoDenegado()
        return venta
