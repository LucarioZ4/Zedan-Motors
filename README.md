# Zedan Motors

Sistema de gestión para taller mecánico: clientes, vehículos, citas, órdenes de trabajo, inventario, empleados y facturación.

## Tecnologías

- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL
- **Autenticación:** JWT + bcrypt
- **Frontend:** HTML, CSS y JavaScript (sin framework), servido directamente por Express

## Estructura del proyecto

```
Zedan-Motors/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuración de entorno y conexión a la BD
│   │   ├── middleware/     # Middleware de autenticación (JWT)
│   │   ├── modules/         # Un módulo por entidad (rutas + controlador)
│   │   └── app.js           # Punto de entrada de la API
│   ├── .template.env       # Plantilla de variables de entorno
│   └── package.json
├── database/
│   ├── schema.sql           # Estructura de la base de datos (tablas, funciones, catálogos)
│   └── seed.sql              # Datos de prueba (solo para desarrollo local)
├── frontend/
│   ├── css/
│   ├── js/
│   └── pages/
└── docs/
    └── documentacion_proyecto_ZedanMotors.md
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

## Requisitos previos

- [Node.js](https://nodejs.org/) (v18 o superior recomendado)
- [PostgreSQL](https://www.postgresql.org/download/) con la extensión `pgcrypto` disponible
- Un cliente de base de datos como [pgAdmin](https://www.pgadmin.org/) (opcional, pero recomendado)

## Instalación y ejecución local

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