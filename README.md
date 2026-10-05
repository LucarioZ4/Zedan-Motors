# Zedan Motors

Sistema de gestión para taller mecánico: clientes, vehículos, citas, órdenes de trabajo, inventario, empleados y facturación.

## Tecnologías

- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL (con extensión `pgcrypto`)
- **Autenticación:** JWT + bcrypt
- **Frontend:** HTML, CSS y JavaScript (sin framework), servido directamente por Express
- **Automatización y Agente IA:** n8n + LangChain + DeepSeek
- **Integración WhatsApp:** OpenWA (WA-Automate)
- **Contenedores:** Docker & Docker Compose

## Estructura del proyecto

```
Zedan-Motors/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuración de entorno y conexión a la BD
│   │   ├── middleware/     # Middleware de autenticación (JWT)
│   │   ├── modules/         # Un módulo por entidad (rutas + controlador)
│   │   └── app.js           # Punto de entrada de la API
│   ├── Dockerfile
│   ├── .template.env       # Plantilla de variables de entorno
│   └── package.json
├── database/
│   ├── schema.sql           # Estructura de la base de datos (tablas, funciones, catálogos)
│   └── seed.sql              # Datos de prueba (solo para desarrollo local)
├── frontend/
│   ├── css/
│   ├── js/
│   └── pages/
├── n8n/
│   ├── README.md            # Guía detallada del agente IA y OpenWA
│   └── workflow_zedan_motors.json # Flujo importable de n8n
├── docs/
│   └── documentacion_proyecto_ZedanMotors.md
├── docker-compose.yml       # Orquestación de PostgreSQL, Backend, n8n y OpenWA
├── .env.example             # Variables de entorno globales para Docker
└── README.md
```

## Módulos de la API

| Módulo | Ruta base | Descripción |
|---|---|---|
| Auth | `/api/auth` | Login y verificación de sesión |
| Dashboard | `/api/dashboard` | Resumen general del sistema |
| Clientes | `/api/clientes` | Gestión de clientes |
| Vehículos | `/api/vehiculos` | Vehículos asociados a clientes |
| Citas | `/api/citas` | Agendamiento de citas |
| Estados | `/api/estados` | Estados de citas/órdenes |
| Órdenes | `/api/ordenes` | Órdenes de trabajo del taller |
| Empleados | `/api/empleados` | Gestión de empleados |
| Cargos | `/api/cargos` | Cargos/roles de empleados |
| Servicios | `/api/servicios` | Catálogo de servicios ofrecidos |
| Inventario | `/api/inventario` | Repuestos y stock |
| Facturación | `/api/facturacion` | Facturas (integración con Factus) |
| Historial | `/api/historial` | Historial de eventos por vehículo |

## Despliegue con Docker Compose (Recomendado)

La forma más rápida y completa de levantar todo el ecosistema (PostgreSQL, Backend, n8n y OpenWA) en una sola red aislada:

### 1. Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo.

### 2. Configurar variables de entorno
Copia la plantilla `.env.example` a `.env`:
```bash
cp .env.example .env
```
*(En Windows PowerShell: `Copy-Item .env.example .env`)*

### 3. Iniciar todos los servicios
```bash
docker compose up -d
```

Esto iniciará automáticamente:
| Servicio | Contenedor | Puerto local | Descripción |
|---|---|---|---|
| **PostgreSQL 16** | `zedan-postgres` | `5432` | DB inicializada con tablas y datos de prueba (`schema.sql` y `seed.sql`) |
| **Backend & Frontend** | `zedan-backend` | `3000` | [http://localhost:3000](http://localhost:3000) |
| **n8n (Agente IA)** | `zedan-n8n` | `5678` | [http://localhost:5678](http://localhost:5678) |
| **OpenWA (WhatsApp API)** | `zedan-openwa` | `8080` | [http://localhost:8080](http://localhost:8080) |

Para ver el código QR de vinculación de WhatsApp:
```bash
docker logs -f zedan-openwa
```

Para más detalles sobre la importación del flujo de n8n y su configuración, consulta [n8n/README.md](n8n/README.md).

---

## Instalación y ejecución manual (sin Docker)

### 1. Clonar el repositorio

```bash
git clone https://github.com/LucarioZ4/Zedan-Motors.git
cd Zedan-Motors
```

### 2. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 3. Configurar variables de entorno

Copia `backend/.template.env` a un nuevo archivo `backend/.env` y completa tus valores:

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=
JWT_SECRET=
JWT_EXPIRES_IN=8h
FACTUS_API_URL=
FACTUS_API_TOKEN=
```

> `JWT_SECRET` puede ser cualquier cadena larga y aleatoria que inventes. `FACTUS_API_URL` y `FACTUS_API_TOKEN` son opcionales: si se dejan vacíos, el módulo de facturación funciona en modo simulado.

### 4. Crear la base de datos

Con PostgreSQL corriendo y una base de datos vacía creada, ejecuta en orden (desde pgAdmin, `psql` o tu cliente preferido):

```bash
database/schema.sql   # Estructura: tablas, funciones y catálogos
database/seed.sql     # Datos de prueba (usuarios y empleados ficticios)
```

Esto crea 3 usuarios de prueba, todos con contraseña `1234`:

| Usuario | Rol |
|---|---|
| `admin` | Administrador |
| `mecanico` | Mecánico |
| `recepcion` | Recepcionista |

> ⚠️ `seed.sql` es solo para desarrollo local. En un ambiente de producción, ejecutar únicamente `schema.sql` y crear los usuarios reales manualmente.

### 5. Levantar el servidor

```bash
npm run dev
```

El servidor queda disponible en [http://localhost:3000](http://localhost:3000), que sirve tanto la API como el frontend.

## Seguridad

- Las contraseñas se almacenan hasheadas con bcrypt, nunca en texto plano.
- El archivo `.env` está excluido del control de versiones (`.gitignore`); nunca debe subirse al repositorio.
- No compartir el contenido de `backend/.env` fuera del equipo del proyecto.