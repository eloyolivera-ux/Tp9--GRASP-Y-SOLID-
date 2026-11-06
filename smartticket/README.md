# SmartTicket – TP9 GRASP y SOLID aplicados (Python / FastAPI)

## Ejecutar
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload      # Swagger en http://127.0.0.1:8000/docs
pytest -q                          # 10 escenarios del TP automatizados
```
Orden sugerido en Swagger: `POST /lugares` → `POST /sectores` (x N) → `POST /clientes` → `POST /eventos`
(con un precio por cada sector del lugar; genera las entradas) → `/cotizar` → `/iniciar-pago` → `/escanear-acceso`.
Tarjeta que termina en `0000` = pago rechazado por la pasarela simulada.

## 1. Diagrama de clases (estructura estática)
```mermaid
classDiagram
    class Lugar { +id +nombre +direccion }
    class Sector { +id +nombre +capacidad }
    class Evento {
        +id +nombre +fecha
        +precio_para(sector_id) Decimal
        +configurar(lugar, precios)
    }
    class PrecioSector { +precio }
    class Entrada {
        +codigo_qr +estado +hora_ingreso
        +precio Decimal
        +reservar() +liberar() +emitir() +utilizar(ahora)
    }
    class Cliente { +id +nombre +email }
    class Venta {
        +estado +total
        +agregar_entrada(e) +calcular_total() +pagar() +cancelar()
    }
    class PasarelaPagos { <<interface>> +cobrar(monto, tarjeta) }
    class PasarelaSimulada
    class CotizacionService { +cotizar() }
    class PagoService { +iniciar_pago() }
    class AccesoService { +escanear() }

    Lugar "1" *-- "1..*" Sector
    Evento "*" --> "1" Lugar
    Evento "1" *-- "*" PrecioSector
    PrecioSector "*" --> "1" Sector
    Evento "1" *-- "*" Entrada : crea
    Entrada "*" --> "1" Sector
    Cliente "1" --> "*" Venta : inicia
    Venta "1" o-- "*" Entrada
    PasarelaPagos <|.. PasarelaSimulada
    PagoService ..> PasarelaPagos
    PagoService ..> Venta
    CotizacionService ..> Evento
    AccesoService ..> Entrada
```

## 2. Diagramas de secuencia (comportamiento dinámico)

### HU1 – Cotización
```mermaid
sequenceDiagram
    actor E as Espectador
    participant C as Controller
    participant S as CotizacionService
    participant ER as EventoRepository
    participant NR as EntradaRepository
    participant Ev as Evento
    E->>C: POST /cotizar {evento, sector, cantidad}
    C->>S: cotizar(evento_id, sector_id, cantidad)
    alt cantidad <= 0
        S-->>C: CantidadInvalida
        C-->>E: 400 "La cantidad ... debe ser mayor a cero"
    end
    S->>ER: obtener(evento_id)
    S->>Ev: precio_para(sector_id)
    S->>NR: disponibles(evento, sector, cantidad)
    alt disponibles < cantidad
        S-->>C: CapacidadInsuficiente
        C-->>E: 400 "Capacidad insuficiente o entradas no disponibles"
    else hay stock
        S-->>C: Cotizacion(subtotal = precio x cantidad)
        C-->>E: 200 total
    end
```

### HU2 – Pago y emisión
```mermaid
sequenceDiagram
    actor E as Cliente
    participant C as Controller
    participant S as PagoService
    participant NR as EntradaRepository
    participant V as Venta
    participant P as PasarelaPagos
    E->>C: POST /iniciar-pago {cliente, entrada_ids, tarjeta}
    C->>S: iniciar_pago(...)
    S->>NR: por_ids(entrada_ids)
    alt alguna entrada ya no esta Disponible
        S-->>C: EntradasNoDisponibles (SIN llamar a la pasarela)
        C-->>E: 409 "Los lugares seleccionados ya no se encuentran disponibles"
    end
    S->>V: agregar_entrada(e) -> Entrada.reservar()
    S->>P: cobrar(total, tarjeta)
    alt Aprobado
        S->>V: pagar() -> Entrada.emitir()
        C-->>E: 201 Venta Pagada + QR
    else Rechazado
        S->>V: cancelar() -> Entrada.liberar()
        C-->>E: 402 "Pago denegado"
    end
```

### HU3 – Control de acceso
```mermaid
sequenceDiagram
    actor A as Acomodador
    participant C as Controller
    participant S as AccesoService
    participant NR as EntradaRepository
    participant En as Entrada
    A->>C: POST /escanear-acceso {codigo_qr}
    C->>S: escanear(codigo_qr)
    S->>NR: por_codigo_qr(codigo)
    alt no existe
        C-->>A: 404 "Ticket Inválido o Inexistente"
    end
    S->>En: utilizar(ahora)
    alt estado = Utilizada
        C-->>A: 409 "Entrada ya utilizada"
    else estado != Emitida
        C-->>A: 403 "Ticket no emitido / Falta de pago"
    else estado = Emitida
        En->>En: estado = Utilizada, hora_ingreso = ahora
        C-->>A: 200 "Acceso Permitido"
    end
```

## 3. Aplicación de GRASP y SOLID
| Principio | Dónde se aplica |
|---|---|
| **SRP** | Controllers solo traducen HTTP↔servicio; servicios orquestan; repositorios persisten; entidades guardan reglas. |
| **Experto en Información** | `Entrada` valida sus transiciones de estado; `Venta` calcula su total; `Evento` conoce sus precios. Ningún `if` de negocio en controllers. |
| **Creator** | `Evento.configurar()` crea sus `PrecioSector` y sus `Entrada` (las que usa/contiene). |
| **Controller (GRASP)** | Los servicios son los controladores de caso de uso. |
| **Low Coupling / Pure Fabrication** | Repositorios y servicios no existen en el dominio real, se inventan para bajar el acoplamiento. |
| **Protected Variations** | `PasarelaPagos` aísla el cambio de proveedor de pagos. |
| **OCP** | Nueva pasarela = nueva clase, sin modificar `PagoService`. |
| **LSP** | `PasarelaSimulada` sustituye a `PasarelaPagos` (el test usa un espía subclase). |
| **ISP** | Interfaz de pasarela con un solo método; servicios dependen solo de los repositorios que usan. |
| **DIP** | Dependencias inyectadas por constructor (`dependencies.py` es la única composición). |

## 4. Decisiones de diseño a justificar en la defensa
- `/cotizar` devuelve además `entrada_ids` propuestos; `/iniciar-pago` los recibe. Así se puede detectar la pérdida de disponibilidad (HU2-E3).
- El total se **recalcula en el servidor** a partir de las entradas; nunca se confía en el monto del cliente.
- Las entradas se **reservan** (`Reservada`) antes de cobrar y se liberan si la pasarela rechaza.
- Concurrencia: en SQLite alcanza el chequeo+reserva en una transacción; en producción se usaría `SELECT ... FOR UPDATE` o bloqueo optimista (columna `version`).
- Mejoras posibles: validar que el QR corresponda al evento del día; endpoint `webhook-pagos` para pasarelas asíncronas.
