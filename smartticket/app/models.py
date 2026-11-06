"""
Modelo de dominio (entidades ORM).

GRASP - Experto en Información: cada entidad contiene el comportamiento que depende
de SUS datos (Entrada cambia su propio estado, Venta calcula su total, Evento conoce
sus precios y crea sus entradas).
"""
import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.exceptions import (DatosInvalidos, EntradaYaUtilizada, EntradasNoDisponibles,
                            TicketNoEmitido)


class EstadoEntrada(str, enum.Enum):
    DISPONIBLE = "Disponible"
    RESERVADA = "Reservada"
    EMITIDA = "Emitida"
    UTILIZADA = "Utilizada"


class EstadoVenta(str, enum.Enum):
    PENDIENTE = "Pendiente"
    PAGADA = "Pagada"
    CANCELADA = "Cancelada"


class Lugar(Base):
    __tablename__ = "lugares"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    direccion: Mapped[str] = mapped_column(String(200))
    sectores: Mapped[list["Sector"]] = relationship(back_populates="lugar", cascade="all, delete-orphan")


class Sector(Base):
    """El sector define y limita la capacidad máxima física."""
    __tablename__ = "sectores"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(80))
    capacidad: Mapped[int]
    lugar_id: Mapped[int] = mapped_column(ForeignKey("lugares.id"))
    lugar: Mapped[Lugar] = relationship(back_populates="sectores")


class Cliente(Base):
    __tablename__ = "clientes"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(120), unique=True)
    ventas: Mapped[list["Venta"]] = relationship(back_populates="cliente")


class PrecioSector(Base):
    """Precio de un sector para UN evento particular (clase de asociación)."""
    __tablename__ = "precios_sector"
    id: Mapped[int] = mapped_column(primary_key=True)
    evento_id: Mapped[int] = mapped_column(ForeignKey("eventos.id"))
    sector_id: Mapped[int] = mapped_column(ForeignKey("sectores.id"))
    precio: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    evento: Mapped["Evento"] = relationship(back_populates="precios")
    sector: Mapped[Sector] = relationship()


class Evento(Base):
    __tablename__ = "eventos"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    fecha: Mapped[datetime] = mapped_column(DateTime)
    lugar_id: Mapped[int] = mapped_column(ForeignKey("lugares.id"))
    lugar: Mapped[Lugar] = relationship()
    precios: Mapped[list[PrecioSector]] = relationship(back_populates="evento", cascade="all, delete-orphan")
    entradas: Mapped[list["Entrada"]] = relationship(back_populates="evento", cascade="all, delete-orphan")

    def precio_para(self, sector_id: int) -> Decimal:
        for p in self.precios:
            if p.sector_id == sector_id:
                return p.precio
        raise DatosInvalidos("El sector no pertenece a este evento")

    def configurar(self, lugar: Lugar, precios: dict[int, Decimal]) -> None:
        """GRASP Creator: Evento agrega los datos que usa (PrecioSector) y crea sus Entradas."""
        if set(precios) != {s.id for s in lugar.sectores}:
            raise DatosInvalidos("Debe definirse un precio para cada sector del lugar")
        for sector in lugar.sectores:
            self.precios.append(PrecioSector(sector=sector, precio=precios[sector.id]))
            for _ in range(sector.capacidad):
                self.entradas.append(Entrada(sector=sector, codigo_qr=uuid.uuid4().hex))


class Entrada(Base):
    __tablename__ = "entradas"
    id: Mapped[int] = mapped_column(primary_key=True)
    codigo_qr: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    estado: Mapped[EstadoEntrada] = mapped_column(SAEnum(EstadoEntrada), default=EstadoEntrada.DISPONIBLE)
    hora_ingreso: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    evento_id: Mapped[int] = mapped_column(ForeignKey("eventos.id"))
    sector_id: Mapped[int] = mapped_column(ForeignKey("sectores.id"))
    venta_id: Mapped[int | None] = mapped_column(ForeignKey("ventas.id"), nullable=True)
    evento: Mapped[Evento] = relationship(back_populates="entradas")
    sector: Mapped[Sector] = relationship()
    venta: Mapped["Venta | None"] = relationship(back_populates="entradas")

    @property
    def precio(self) -> Decimal:
        return self.evento.precio_para(self.sector_id)

    @property
    def esta_disponible(self) -> bool:
        return self.estado == EstadoEntrada.DISPONIBLE

    # --- Máquina de estados: la entrada protege sus propias transiciones ---
    def reservar(self) -> None:
        if not self.esta_disponible:
            raise EntradasNoDisponibles()
        self.estado = EstadoEntrada.RESERVADA

    def liberar(self) -> None:
        self.estado = EstadoEntrada.DISPONIBLE

    def emitir(self) -> None:
        if self.estado != EstadoEntrada.RESERVADA:
            raise EntradasNoDisponibles()
        self.estado = EstadoEntrada.EMITIDA

    def utilizar(self, ahora: datetime) -> None:
        if self.estado == EstadoEntrada.UTILIZADA:
            raise EntradaYaUtilizada()          # no se sobreescribe hora_ingreso
        if self.estado != EstadoEntrada.EMITIDA:
            raise TicketNoEmitido()
        self.estado = EstadoEntrada.UTILIZADA
        self.hora_ingreso = ahora


class Venta(Base):
    __tablename__ = "ventas"
    id: Mapped[int] = mapped_column(primary_key=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    estado: Mapped[EstadoVenta] = mapped_column(SAEnum(EstadoVenta), default=EstadoVenta.PENDIENTE)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"))
    cliente: Mapped[Cliente] = relationship(back_populates="ventas")
    entradas: Mapped[list[Entrada]] = relationship(back_populates="venta")

    def agregar_entrada(self, entrada: Entrada) -> None:
        entrada.reservar()
        self.entradas.append(entrada)
        self.total = self.calcular_total()

    def calcular_total(self) -> Decimal:
        return sum((e.precio for e in self.entradas), Decimal("0"))

    def pagar(self) -> None:
        self.estado = EstadoVenta.PAGADA
        for e in self.entradas:
            e.emitir()

    def cancelar(self) -> None:
        self.estado = EstadoVenta.CANCELADA
        for e in list(self.entradas):
            e.liberar()
        self.entradas.clear()
