"""Consultas de solo lectura (listados) usadas por el panel Explorador del frontend.
Controladores delgados: traducen el modelo a esquemas, sin reglas de negocio."""
from fastapi import APIRouter, Depends

from app import schemas
from app.dependencies import get_entradas, get_ventas

router = APIRouter()


@router.get("/entradas", response_model=list[schemas.EntradaRead], tags=["Consultas"])
def listar_entradas(evento_id: int | None = None, sector_id: int | None = None,
                    estado: str | None = None, repo=Depends(get_entradas)):
    return [schemas.EntradaRead(id=e.id, codigo_qr=e.codigo_qr, estado=e.estado.value,
                                hora_ingreso=e.hora_ingreso, evento_id=e.evento_id,
                                sector_id=e.sector_id, venta_id=e.venta_id)
            for e in repo.listar()
            if (evento_id is None or e.evento_id == evento_id)
            and (sector_id is None or e.sector_id == sector_id)
            and (estado is None or e.estado.value.lower() == estado.lower())]


@router.get("/ventas", response_model=list[schemas.VentaRead], tags=["Consultas"])
def listar_ventas(repo=Depends(get_ventas)):
    return [schemas.VentaRead(id=v.id, fecha=v.fecha, estado=v.estado.value, total=v.total,
                              cliente_id=v.cliente_id, entrada_ids=[e.id for e in v.entradas])
            for v in repo.listar()]