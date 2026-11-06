"""Excepciones de dominio. No conocen HTTP: el mapeo a códigos de estado vive en main.py."""


class ErrorDeDominio(Exception):
    mensaje = "Error de dominio"

    def __init__(self, mensaje: str | None = None):
        super().__init__(mensaje or self.mensaje)
        self.mensaje = mensaje or self.mensaje


class CantidadInvalida(ErrorDeDominio):
    mensaje = "La cantidad de entradas solicitadas debe ser mayor a cero"


class CapacidadInsuficiente(ErrorDeDominio):
    mensaje = "Capacidad insuficiente o entradas no disponibles"


class EntradasNoDisponibles(ErrorDeDominio):
    mensaje = "Los lugares seleccionados ya no se encuentran disponibles"


class PagoDenegado(ErrorDeDominio):
    mensaje = "Pago denegado"


class TicketInvalido(ErrorDeDominio):
    mensaje = "Ticket Inválido o Inexistente"


class EntradaYaUtilizada(ErrorDeDominio):
    mensaje = "Entrada ya utilizada"


class TicketNoEmitido(ErrorDeDominio):
    mensaje = "Ticket no emitido / Falta de pago"


class NoEncontrado(ErrorDeDominio):
    mensaje = "Recurso no encontrado"


class DatosInvalidos(ErrorDeDominio):
    mensaje = "Datos inválidos"
