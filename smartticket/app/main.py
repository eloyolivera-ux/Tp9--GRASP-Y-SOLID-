from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app import exceptions as ex
from app.database import Base, engine
from app.routers import catalogo, historias


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="SmartTicket API", version="1.0.0",
              description="TP9 - POO - GRASP y SOLID aplicados", lifespan=lifespan)

# Mapeo excepción de dominio -> código HTTP (la capa web decide, el dominio no sabe de HTTP)
STATUS = {
    ex.CantidadInvalida: 400,
    ex.CapacidadInsuficiente: 400,
    ex.DatosInvalidos: 400,
    ex.EntradasNoDisponibles: 409,
    ex.EntradaYaUtilizada: 409,
    ex.PagoDenegado: 402,
    ex.TicketNoEmitido: 403,
    ex.TicketInvalido: 404,
    ex.NoEncontrado: 404,
}


@app.exception_handler(ex.ErrorDeDominio)
async def manejar_error_de_dominio(_: Request, exc: ex.ErrorDeDominio):
    return JSONResponse(status_code=STATUS.get(type(exc), 400), content={"detail": exc.mensaje})


app.include_router(catalogo.router)
app.include_router(historias.router)
