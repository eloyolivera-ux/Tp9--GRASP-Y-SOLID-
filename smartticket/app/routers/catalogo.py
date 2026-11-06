"""ABM básico: Lugar, Sector, Cliente, Evento. Controladores delgados."""
from fastapi import APIRouter, Depends

from app import schemas
from app.dependencies import (get_clientes, get_evento_service, get_eventos, get_lugares,
                              get_sectores)
from app.exceptions import NoEncontrado
from app.models import Cliente, Lugar, Sector

router = APIRouter()


def _o404(obj, nombre):
    if obj is None:
        raise NoEncontrado(f"{nombre} no encontrado")
    return obj


@router.post("/lugares", response_model=schemas.LugarRead, status_code=201, tags=["Lugares"])
def crear_lugar(datos: schemas.LugarCreate, repo=Depends(get_lugares)):
    return repo.agregar(Lugar(**datos.model_dump()))


@router.get("/lugares", response_model=list[schemas.LugarRead], tags=["Lugares"])
def listar_lugares(repo=Depends(get_lugares)):
    return repo.listar()


@router.get("/lugares/{id}", response_model=schemas.LugarRead, tags=["Lugares"])
def obtener_lugar(id: int, repo=Depends(get_lugares)):
    return _o404(repo.obtener(id), "Lugar")


@router.post("/sectores", response_model=schemas.SectorRead, status_code=201, tags=["Sectores"])
def crear_sector(datos: schemas.SectorCreate, repo=Depends(get_sectores), lugares=Depends(get_lugares)):
    _o404(lugares.obtener(datos.lugar_id), "Lugar")
    return repo.agregar(Sector(**datos.model_dump()))


@router.get("/sectores", response_model=list[schemas.SectorRead], tags=["Sectores"])
def listar_sectores(repo=Depends(get_sectores)):
    return repo.listar()


@router.post("/clientes", response_model=schemas.ClienteRead, status_code=201, tags=["Clientes"])
def crear_cliente(datos: schemas.ClienteCreate, repo=Depends(get_clientes)):
    return repo.agregar(Cliente(**datos.model_dump()))


@router.get("/clientes", response_model=list[schemas.ClienteRead], tags=["Clientes"])
def listar_clientes(repo=Depends(get_clientes)):
    return repo.listar()


@router.post("/eventos", response_model=schemas.EventoRead, status_code=201, tags=["Eventos"])
def crear_evento(datos: schemas.EventoCreate, servicio=Depends(get_evento_service)):
    precios = {p.sector_id: p.precio for p in datos.precios}
    return servicio.crear(datos.nombre, datos.fecha, datos.lugar_id, precios)


@router.get("/eventos", response_model=list[schemas.EventoRead], tags=["Eventos"])
def listar_eventos(repo=Depends(get_eventos)):
    return repo.listar()


@router.get("/eventos/{id}", response_model=schemas.EventoRead, tags=["Eventos"])
def obtener_evento(id: int, repo=Depends(get_eventos)):
    return _o404(repo.obtener(id), "Evento")
