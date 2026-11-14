from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class _Read(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LugarCreate(BaseModel):
    nombre: str
    direccion: str


class LugarRead(_Read, LugarCreate):
    id: int


class SectorCreate(BaseModel):
    nombre: str
    capacidad: int = Field(gt=0)
    lugar_id: int


class SectorRead(_Read, SectorCreate):
    id: int


class ClienteCreate(BaseModel):
    nombre: str
    email: str


class ClienteRead(_Read, ClienteCreate):
    id: int


class PrecioSectorIn(BaseModel):
    sector_id: int
    precio: Decimal = Field(gt=0)


class PrecioSectorRead(_Read):
    sector_id: int
    precio: float


class EventoCreate(BaseModel):
    nombre: str
    fecha: datetime
    lugar_id: int
    precios: list[PrecioSectorIn]


class EventoRead(_Read):
    id: int
    nombre: str
    fecha: datetime
    lugar_id: int
    precios: list[PrecioSectorRead]


# ---- HU1 ----
class CotizacionRequest(BaseModel):
    evento_id: int
    sector_id: int
    cantidad: int          # sin gt=0: la regla "cantidad > 0" es de negocio (400 + mensaje exacto)


class CotizacionResponse(BaseModel):
    evento_id: int
    sector_id: int
    cantidad: int
    precio_unitario: float
    subtotal: float
    total: float
    entrada_ids: list[int]


# ---- HU2 ----
class TarjetaIn(BaseModel):
    numero: str
    titular: str
    vencimiento: str
    cvv: str


class PagoRequest(BaseModel):
    cliente_id: int
    entrada_ids: list[int]
    tarjeta: TarjetaIn


class EntradaEmitida(_Read):
    id: int
    codigo_qr: str
    estado: str


class PagoResponse(BaseModel):
    venta_id: int
    estado: str
    total: float
    entradas: list[EntradaEmitida]


# ---- HU3 ----
class EscaneoRequest(BaseModel):
    codigo_qr: str


class EscaneoResponse(BaseModel):
    mensaje: str
    entrada_id: int
    hora_ingreso: datetime



# ---- Consultas de solo lectura (para el panel "Explorador" del frontend) ----
class EntradaRead(BaseModel):
    id: int
    codigo_qr: str
    estado: str
    hora_ingreso: datetime | None
    evento_id: int
    sector_id: int
    venta_id: int | None


class VentaRead(BaseModel):
    id: int
    fecha: datetime
    estado: str
    total: float
    cliente_id: int
    entrada_ids: list[int]