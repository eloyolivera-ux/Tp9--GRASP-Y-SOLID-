"""Controladores de las HU 1-3. SRP: solo traducen HTTP <-> servicio. Cero reglas de negocio."""
from fastapi import APIRouter, Depends

from app import schemas
from app.dependencies import get_acceso_service, get_cotizacion_service, get_pago_service
from app.pasarela import DatosTarjeta

router = APIRouter()


@router.post("/cotizar", response_model=schemas.CotizacionResponse, tags=["HU1 Cotización"],
             summary="Cotiza entradas (200 / 400)")
def cotizar(req: schemas.CotizacionRequest, servicio=Depends(get_cotizacion_service)):
    c = servicio.cotizar(req.evento_id, req.sector_id, req.cantidad)
    return schemas.CotizacionResponse(
        evento_id=c.evento_id, sector_id=c.sector_id, cantidad=c.cantidad,
        precio_unitario=c.precio_unitario, subtotal=c.subtotal, total=c.total,
        entrada_ids=c.entrada_ids)


@router.post("/iniciar-pago", response_model=schemas.PagoResponse, status_code=201,
             tags=["HU2 Pago"], summary="Paga y emite entradas (201 / 402 / 409)")
def iniciar_pago(req: schemas.PagoRequest, servicio=Depends(get_pago_service)):
    venta = servicio.iniciar_pago(req.cliente_id, req.entrada_ids, DatosTarjeta(**req.tarjeta.model_dump()))
    return schemas.PagoResponse(
        venta_id=venta.id, estado=venta.estado.value, total=venta.total,
        entradas=[schemas.EntradaEmitida(id=e.id, codigo_qr=e.codigo_qr, estado=e.estado.value)
                  for e in venta.entradas])


@router.post("/escanear-acceso", response_model=schemas.EscaneoResponse, tags=["HU3 Acceso"],
             summary="Valida QR en puerta (200 / 403 / 404 / 409)")
def escanear_acceso(req: schemas.EscaneoRequest, servicio=Depends(get_acceso_service)):
    e = servicio.escanear(req.codigo_qr)
    return schemas.EscaneoResponse(mensaje="Acceso Permitido", entrada_id=e.id, hora_ingreso=e.hora_ingreso)
