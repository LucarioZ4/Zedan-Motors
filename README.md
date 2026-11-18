# Zedan Motors 🚗

**Zedan Motors** es una aplicación web completa para la gestión de un taller mecánico. Está construida con **Node.js + Express** en el backend y **React (Vite)** en el frontend. Utiliza **PostgreSQL** como base de datos y **Supabase Storage** para almacenar archivos multimedia (fotos y videos).

El proyecto ya cuenta con módulos para:
- Autenticación (JWT)
- Dashboard
- Clientes
- Vehículos
- Citas
- Estados de órdenes
- Órdenes de trabajo
- Empleados
- Servicios
- Inventario (con IA para reconocimiento de imágenes)
- Facturación
- Cargos
- Historial
- Mensajes

Y, recientemente, **Diagnóstico**, que permite registrar inspecciones detalladas de los vehículos al ingresar al taller, adjuntar fotos y videos, y compartir la información por WhatsApp.

---

## 📋 Tabla de contenidos
- [Descripción general](#descripción-general)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Migraciones de base de datos](#migraciones-de-base-de-datos)
- [Ejecutar la aplicación](#ejecutar-la-aplicación)
- [API REST (resumen de rutas)](#api-rest-resumen-de-rutas)
- [Módulo Diagnóstico – Detalles](#módulo-diagnóstico--detalles)
- [Frontend – Navegación y componentes](#frontend--navegación-y-componentes)
- [Subida de archivos (fotos / videos)](#subida-de-archivos-fotos--videos)
- [Envío por WhatsApp](#envío-por-whatsapp)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Tests](#tests)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

---

## descripción general

- **Backend**: `backend/` → Express, middleware de seguridad (helmet, cors, rate‑limiting), autenticación JWT, conexión a PostgreSQL mediante `pg` (`src/config/database.js`).
- **Frontend**: `frontend-react/` → React 19 con Vite, router `react-router-dom`, componentes reutilizables y estilos CSS/ Tailwind.
- **Almacenamiento**: Supabase Storage, buckets `videos-ordenes` (para videos de órdenes) y `diagnosticos` (para fotos/videos de diagnóstico).
- **Gestión de estado**: JWT en `sessionStorage`, encabezado `Authorization` añadido automáticamente por `apiFetch`.

---

## requisitos previos

- **Node.js** ≥ 18
- **npm** ≥ 9
- **PostgreSQL** ≥ 13 (acceso a la base de datos indicada en `.env`)
- **Supabase** account con URL y Service Role Key (los buckets se crean automáticamente al subir el primer archivo).
- **Git** (para trabajar con ramas)
- **Docker** (opcional, para levantar PostgreSQL rápidamente)

---

## instalación

```bash
# 1️⃣ Clonar el repositorio
git clone <URL‑DEL‑REPOSITORIO>
cd Zedan-Motors

# 2️⃣ Backend
cd backend
npm install

# 3️⃣ Frontend
cd ../frontend-react
npm install
```

---

## variables de entorno

### Backend (`backend/.env`)
```env
# Puerto del servidor (por defecto 3000)
PORT=3000

# JWT – clave secreta (mínimo 32 caracteres)
JWT_SECRET=<<generar_con_node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">>
JWT_EXPIRES_IN=8h

# Orígenes permitidos por CORS (ajustar si despliegas en otro dominio)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Conexión a PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zedan_motors
DB_USER=postgres
DB_PASSWORD=<<tu_contraseña>>

# Supabase – almacenamiento
SUPABASE_URL=https://<tu‑project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<<service‑role‑key>>
VIDEOS_BUCKET=videos-ordenes   # bucket existente para videos de órdenes

# ----------- Módulo Diagnóstico ------------------------------------------
# Límite máximo por archivo (MB)
DIAG_MAX_MB=10
# Bucket donde se guardan fotos y videos de diagnóstico
DIAG_BUCKET=diagnosticos
# MIME permitidos (imágenes y videos comunes)
DIAG_ALLOWED_MIME=image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime
```

### Frontend (`frontend-react/.env`)
```env
# URL base del backend (usada por apiFetch)
VITE_API_URL=http://localhost:3000

# Configuración del módulo diagnóstico (se exponen como REACT_APP_)
REACT_APP_DIAG_MAX_MB=10
REACT_APP_DIAG_ALLOWED_MIME=image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime
```

> **⚠️ Nota**: después de crear/modificar cualquier `.env` reinicia los servidores para que los cambios sean cargados.

---

## migraciones de base de datos

El proyecto incluye scripts SQL en `backend/database/migrations/`. Ejecuta cada archivo en el orden indicado (las migraciones originales del proyecto ya fueron aplicadas previamente). Solo la nueva migración necesita ejecución adicional:

```bash
# Desde la carpeta backend
cd backend
psql -U $DB_USER -d $DB_NAME -f database/migrations/20231101_create_diagnostico.sql
```

Esta migración crea tres tablas:
- `diagnostico`
- `diagnostico_accesorio`
- `diagnostico_archivo`

---

## ejecutar la aplicación

```bash
# Terminal 1 – Backend
cd backend
npm run dev
# Salida esperada: 🚀 Servidor corriendo en http://localhost:3000

# Terminal 2 – Frontend
cd ../frontend-react
npm run dev
# Salida esperada: Vite dev server running at http://localhost:5173
```

Abre el navegador en `http://localhost:5173`. El menú incluye ahora la opción **Diagnóstico**.

---

## api rest — resumen de rutas

| Módulo | Método | Ruta | Acción |
|--------|--------|------|--------|
| **auth** | POST | `/api/auth/login` | Autenticación y obtención de JWT |
| | POST | `/api/auth/register` | Registro de usuarios |
| **clientes** | CRUD (`/api/clientes`) | Operaciones sobre clientes |
| **vehiculos** | CRUD (`/api/vehiculos`) | Operaciones sobre vehículos (asociados a cliente) |
| **citas** | CRUD (`/api/citas`) | Gestión de citas de taller |
| **ordenes** | CRUD (`/api/ordenes`) | Órdenes de trabajo y archivos de video |
| **inventario** | CRUD (`/api/inventario`) | Repuestos y gestión con IA (fotos) |
| **mensajes** | CRUD (`/api/mensajes`) | Comunicación interna |
| **diagnosticos** | **POST** | `/api/diagnosticos` | Crear diagnóstico (vehículo, cita opcional, datos básicos, accesorios) |
| | **GET** | `/api/diagnosticos` | Listado con filtros (`vehiculo`, `cliente`, `fechaDesde`, `fechaHasta`, `estado`) |
| | **GET** | `/api/diagnosticos/:id` | Detalle (incluye accesorios y archivos) |
| | **PUT** | `/api/diagnosticos/:id` | Actualizar diagnóstico (todos los campos opcionales) |
| | **DELETE** | `/api/diagnosticos/:id` | Elimina diagnóstico y archivos asociados |
| | **POST** | `/api/diagnosticos/:id/archivos` | Genera firma de subida a Supabase (valida MIME y tamaño) |
| | **DELETE** | `/api/diagnosticos/:id/archivos/:archivoId` | Elimina archivo tanto de la BD como del bucket |

> Todos los endpoints están protegidos por el middleware JWT presente en `src/middleware/auth.js`.

---

## módulo diagnóstico – detalles

### Entidades
- **diagnostico**: registro principal (vehículo, cita, fecha/hora, kilometraje, nivel de gasolina, observaciones, estado).
- **diagnostico_accesorio**: lista de accesorios inspeccionados (nombre, estado, observación opcional). El checklist está pensado para ser extensible añadiendo nuevos objetos sin tocar el código.
- **diagnostico_archivo**: referencia a cada foto o video (ruta en Supabase, tipo, nombre original, tamaño, descripción).

### Flujo típico
1. El usuario abre **Diagnóstico → Nuevo**.
2. Selecciona el vehículo (lista desplegable con placa, marca, modelo y cliente).
3. (Opcional) elige la cita asociada.
4. Completa kilometraje, nivel de gasolina y estado del diagnóstico.
5. Marca accesorios mediante el componente `AccesoriosChecklist`.
6. Adjunta fotos y/o videos con `ArchivoUploader` (puede capturar directamente desde la cámara del dispositivo).
7. Al guardar, el backend crea los registros y devuelve el diagnóstico creado.
8. En la vista de detalle se muestra una galería y un botón **Enviar por WhatsApp** que genera un enlace `wa.me` con texto pre‑llenado y URLs a los archivos.

---

## frontend – navegación y componentes

- **NavBar.jsx** (`src/components/NavBar.jsx`) – se añadió el enlace `Diagnóstico`.
- **Rutas** (`src/App.jsx`):
  ```jsx
  <Route path="/diagnosticos/*" element={<Diagnosticos />} />
  ```
- **Componentes dentro de `src/pages/Diagnosticos/`**:
  - `Diagnosticos.jsx` – tabla con filtros, paginación y botón *Nuevo*.
  - `DiagnosticoForm.jsx` – formulario con validación (kilometraje ≥0, campos obligatorios, selector de nivel de gasolina, etc.).
  - `DiagnosticoDetalle.jsx` – muestra toda la información, galería de fotos/video (preview, reproductor) y botón WhatsApp.
  - `AccesoriosChecklist.jsx` – lista de accesorios con estados `Bueno / Regular / Malo / No tiene` y campo de observación opcional.
  - `ArchivoUploader.jsx` – input `<input type="file" multiple capture="environment">`, validación de MIME y tamaño contra `REACT_APP_DIAG_MAX_MB`, obtención de firma y subida a Supabase.

Todos los componentes siguen la misma convención de estilo que el resto del proyecto (hooks, `apiFetch`, mensajes de éxito/error con `toast`).

---

## subida de archivos (fotos / videos)

1. **Solicitud de firma**: `POST /api/diagnosticos/:id/archivos` con cuerpo `{tipo, nombre_original, mime, tamano, descripcion}`.
2. El backend verifica que `mime` esté dentro de `diagAllowedMime` y que `tamano` ≤ `diagMaxMb` × 1024 × 1024.
3. Devuelve `{ruta, token, bucket}`; `ruta` es la ruta completa dentro del bucket y `token` es la firma de subida.
4. El cliente usa `fetch` con método `PUT` y los headers `Authorization: Bearer <token>` para subir directamente a Supabase.
5. Una vez completada la carga, el registro ya está guardado en `diagnostico_archivo`.

Los archivos se almacenan bajo la ruta:
```
diagnosticos/<id_diagnostico>/<tipo>-<timestamp>-<hash>.<ext>
```

Los buckets están listados en `.gitignore` (`uploads/` no se versiona). Supabase gestiona la expiración de URLs firmadas.

---

## envío por whatsapp

`DiagnosticoDetalle.jsx` genera una URL:
```
https://wa.me/<tel>?text=Hola%20<Cliente>%21%20Diagnóstico%20de%20<Placa>%20en%20<enlaces>
```
- `<tel>` proviene del cliente registrado (campo `telefono`).
- `<enlaces>` contiene URLs públicas (signed URLs con `expiresIn=3600`) a cada foto/video.
- El código está comentado para una futura integración directa con la **API de WhatsApp Business** o **Twilio** que permitiría envío automático de multimedia.

---

## estructura del proyecto

```
Zedan-Motors/
├─ backend/                         # API Express
│  ├─ src/
│  │  ├─ config/                   # env, base de datos
│  │  ├─ middleware/               # auth, rate‑limiter, error handler
│  │  ├─ modules/                  # cada dominio (auth, clientes, vehiculos, …, diagnosticos)
│  │  └─ services/                 # storage.service.js (Supabase)
│  └─ database/migrations/         # scripts SQL
├─ frontend-react/                  # UI React (Vite)
│  ├─ src/
│  │  ├─ components/               # NavBar, Loading, etc.
│  │  └─ pages/
│  │      ├─ Dashboard/
│  │      ├─ Clientes/
│  │      ├─ Vehiculos/
│  │      ├─ Citas/
│  │      ├─ Ordenes/
│  │      ├─ Inventario/
│  │      └─ Diagnosticos/        # nuevo módulo
│  └─ .env                         # variables de entorno del cliente
├─ .env                             # variables comunes (JWT_SECRET, DB credentials, etc.)
├─ .gitignore
├─ README.md                        # <‑‑ este archivo
└─ package.json (raíz)             # scripts comunes (optional)
```

---

## tests

El proyecto incluye pruebas unitarias y de integración en cada módulo (`backend/tests/` y `frontend-react/src/__tests__/`). Para ejecutarlas:

```bash
# Backend
cd backend
npm test

# Frontend
cd ../frontend-react
npm test
```

Asegúrate de que la base de datos de pruebas esté configurada (puedes usar una base SQLite en memoria o una instancia PostgreSQL temporal).

---

## contribuir

1. **Fork** el repositorio.
2. Crea una rama descriptiva: `git checkout -b feature/mi‑nueva‑funcionalidad`.
3. Realiza los cambios y verifica que `npm run lint` y los tests pasen.
4. Abre un **Pull Request** describiendo la motivación y los cambios.
5. El mantenedor revisará y, tras aprobación, mergeará la rama.

---

## licencia

Este proyecto está bajo la **Licencia MIT**. Consulta el archivo `LICENSE` para más detalles.

---

*Documentado y actualizado al 2026‑11‑16.*
---

## contribuir

1. **Fork** el repositorio.
2. Crea una rama descriptiva: `git checkout -b feature/mi‑nueva‑funcionalidad`.
3. Realiza los cambios y verifica que `npm run lint` y los tests pasen.
4. Abre un **Pull Request** describiendo la motivación y los cambios.
5. El mantenedor revisará y, tras aprobación, mergeará la rama.

---

## licencia

Este proyecto está bajo la **Licencia MIT**. Consulta el archivo `LICENSE` para más detalles.

---

*Documentado y actualizado al 2026‑11‑16.*

El [contrato HTTP de Node y C#](docs/contrato-apis.md) incluye las rutas y la configuración de proveedores.
