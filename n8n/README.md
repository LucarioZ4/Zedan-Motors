# Integración de Agente IA con n8n y OpenWA (WhatsApp) - Zedan Motors

Este directorio contiene la configuración y el flujo de automatización de **n8n** junto con **OpenWA** para el agendamiento inteligente de citas en el taller **Zedan Motors**.

---

## 📌 Arquitectura del Flujo

El flujo combina dos canales de entrada (Web y WhatsApp) procesados por un **Agente IA (DeepSeek)** que interactúa directamente con la base de datos PostgreSQL de Zedan Motors:

```
                  ┌──────────────────────┐
                  │   Web Chat Webhook   │──┐
                  └──────────────────────┘  │
                                            ▼
                  ┌──────────────────────┐  Format Input
                  │    OpenWA Trigger    │──┐
                  │     (WhatsApp)       │  │
                  └──────────────────────┘  │
                                            ▼
                                   ┌─────────────────┐
                                   │  AI Agent Zedan │ ◄── [DeepSeek LM]
                                   │   (LangChain)   │ ◄── [Simple Memory]
                                   └────────┬────────┘
                                            │
               ┌────────────────────────────┼───────────────────────────┐
               ▼                            ▼                           ▼
     [Herramienta Postgres]       [Herramienta Postgres]      [Herramienta Postgres]
         Insert Cliente               Insert Vehículo               Insert Cita
               │                            │                           │
               └────────────────────────────┼───────────────────────────┘
                                            ▼
                                  ┌───────────────────┐
                                  │   Route Response  │
                                  └─────────┬─────────┘
                                            │
                       ┌────────────────────┴────────────────────┐
                       ▼                                         ▼
            [Canal: WhatsApp]                              [Canal: Web]
        Send WhatsApp Message (OpenWA)                   Respond to Webhook
```

---

## 🚀 Archivos en esta carpeta

- [workflow_zedan_motors.json](./workflow_zedan_motors.json): Definición exportada completa del flujo de n8n para importar con un clic.

---

## ✅ Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y abierto.
- Una API Key de DeepSeek (`sk-...`).
- Un número de WhatsApp disponible para vincular (se recomienda uno de pruebas).

---

## 🛠️ Paso a Paso para la Puesta en Marcha

### 0. Crear el archivo `.env` de la raíz
`docker compose` lee el archivo `.env` de la **raíz del proyecto** (no el de `backend/`, que solo se usa cuando corres el backend a mano con `npm run dev`).

```bash
# Linux / macOS
cp .env.example .env
# Windows (PowerShell)
Copy-Item .env.example .env
```

Edita el `.env` y define como mínimo:

- `DB_PASSWORD`: una contraseña propia para la base de datos de Docker.
- `JWT_SECRET`: un secreto propio de al menos 32 caracteres. Puedes generarlo con:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `DB_PORT`: puerto de la base de datos **en tu máquina**. Si ya tienes PostgreSQL instalado localmente (usa el `5432`), pon `5433` para evitar el choque. Dentro de Docker la base siempre usa el `5432`.

> En el `.env` de la raíz, `DB_HOST` debe ser `postgres` (el nombre del servicio en Docker), no `localhost`.

### 1. Iniciar los Contenedores con Docker Compose
En la raíz del proyecto, ejecuta:
```bash
docker compose up -d --build
```
Esto levantará:
- **`zedan-postgres`**: Base de datos con las tablas y extensiones (`pgcrypto`) inicializadas (puerto `5433` en tu máquina por defecto, `5432` dentro de Docker).
- **`zedan-backend`**: API Node.js y Frontend en `http://localhost:3000`.
- **`zedan-n8n`**: Plataforma n8n en `http://localhost:5678`.
- **`zedan-openwa`**: API de WhatsApp y su dashboard en `http://localhost:2785`.

Comprueba que los cuatro estén arriba con:
```bash
docker compose ps
```

> **Sobre la base de datos de Docker:** es una base **independiente** de cualquier PostgreSQL que tengas instalado en tu computador y de Supabase. Lo que cree el agente de n8n queda en esta base y se ve en `http://localhost:3000` (backend del contenedor), no en un backend que corras a mano apuntando a otra base.
>
> El `schema.sql` y el `seed.sql` se ejecutan **solo la primera vez**, al crearse el volumen. El `seed.sql` crea usuarios de prueba (`admin`, `mecanico`, `recepcion`, todos con contraseña `1234`). Para reiniciar la base desde cero (**esto borra todos los datos**): `docker compose down -v`.

### 2. Vincular WhatsApp en OpenWA (Escanear QR)
Para conectar tu número de WhatsApp con OpenWA:
1. Abre el dashboard en `http://localhost:2785`, o revisa los logs del contenedor:
   ```bash
   docker logs -f zedan-openwa
   ```
2. Escanea el código QR: abre WhatsApp en tu teléfono > **Dispositivos vinculados** > **Vincular dispositivo**.
3. Una vez vinculado, la sesión se guarda en la carpeta `./openwa-data/` y no requerirá escanear de nuevo aunque reinicies el contenedor.

> ⚠️ `openwa-data/` contiene la sesión de WhatsApp y la API Key de OpenWA. Ya está en el `.gitignore`: **nunca la subas al repositorio**. Si la borras, se generará una API Key nueva y tendrás que volver a escanear el QR y actualizar la credencial en n8n.

### 3. Instalar el nodo comunitario de OpenWA en n8n
1. Entra a n8n en tu navegador: [http://localhost:5678](http://localhost:5678).
2. Si es tu primera vez, crea tu usuario inicial de n8n.
3. Dirígete a **Settings** (ícono de engranaje en la esquina inferior izquierda) > **Community Nodes**.
4. Haz clic en **Install**.
5. Escribe el nombre del paquete:
   ```text
   @rmyndharis/n8n-nodes-openwa
   ```
6. Acepta los términos e instala el paquete.

### 4. Importar el Flujo
1. En el menú de n8n, ve a **Workflows**.
2. Haz clic en los tres puntos `...` (arriba a la derecha) y selecciona **Import from file**.
3. Selecciona el archivo [workflow_zedan_motors.json](./workflow_zedan_motors.json).

### 5. Configurar las Credenciales en n8n

Dentro del flujo importado, deberás asociar tres credenciales:

#### A. PostgreSQL (`Postgres account`)
Usa los datos de la base **de Docker**, tomados del `.env` de la raíz. No uses los de un PostgreSQL local de tu computador: dentro de un contenedor, `localhost` es el propio contenedor.

| Campo | Valor |
|---|---|
| **Host** | `postgres` *(nombre del servicio en Docker)* |
| **Port** | `5432` *(puerto interno de Docker, no el `DB_PORT` publicado en tu máquina)* |
| **Database** | el `DB_NAME` de tu `.env` (por defecto `zedan_motors`) |
| **User** | el `DB_USER` de tu `.env` (por defecto `postgres`) |
| **Password** | el `DB_PASSWORD` de tu `.env` |
| **SSL** | `disable` |

#### B. DeepSeek (`DeepSeek account`)
- **API Key:** Tu API Key de DeepSeek (`sk-...`)

#### C. OpenWA (`OpenWA Account`)
- **Base URL:** `http://openwa:2785` *(comunicación interna entre contenedores)*
- **API Key:** OpenWA la genera en su primer arranque y la guarda en `openwa-data/.api-key`. Para leerla:
  ```bash
  # Linux / macOS
  cat openwa-data/.api-key
  # Windows (PowerShell)
  Get-Content openwa-data\.api-key
  ```

### 6. Activar el flujo
Con el flujo abierto, enciende el interruptor **Active** (arriba a la derecha). **Mientras esté inactivo, el webhook de producción y el trigger de WhatsApp no responden.**

> La URL `/webhook-test/...` (con "Listen for test event") solo sirve para pruebas puntuales dentro del editor; la que se usa normalmente es `/webhook/zedan-web-chat`, que requiere el flujo activo.

---

## 🧪 Pruebas y Uso

- **Vía Web Chat:** Envía un POST a:
  ```http
  POST http://localhost:5678/webhook/zedan-web-chat
  Content-Type: application/json

  {
    "sessionId": "web-usuario-1",
    "message": "Hola, quiero agendar una cita para mi carro"
  }
  ```
  En Windows (PowerShell):
  ```powershell
  Invoke-RestMethod -Method Post -Uri http://localhost:5678/webhook/zedan-web-chat `
    -ContentType 'application/json' `
    -Body '{"sessionId":"web-usuario-1","message":"Hola, quiero agendar una cita para mi carro"}'
  ```
- **Vía WhatsApp:** Envía un mensaje desde cualquier número de WhatsApp al número vinculado en OpenWA. El Agente responderá automáticamente guiando al usuario por el registro de cliente, vehículo y cita.
- **Ver el resultado:** inicia sesión en `http://localhost:3000` (por ejemplo con `admin` / `1234`) y revisa Clientes, Vehículos y Citas.

---

## 🔧 Solución de problemas

| Síntoma | Qué revisar |
|---|---|
| El webhook responde 404 | El flujo no está activo (paso 6), o estás usando la URL `/webhook-test/` fuera del modo de prueba. |
| n8n no conecta con PostgreSQL | El host debe ser `postgres` y el puerto `5432`; la contraseña debe ser la `DB_PASSWORD` del `.env` de la raíz. |
| `docker compose up` falla por el puerto de la base | Ya tienes otro PostgreSQL en ese puerto. Cambia `DB_PORT` en el `.env` (por ejemplo a `5433`). |
| n8n no puede usar OpenWA (error de autenticación) | Verifica que la API Key coincida con la de `openwa-data/.api-key` y que la Base URL sea `http://openwa:2785`. |
| Los datos creados por el agente no aparecen en tu backend local | Son bases distintas: el agente escribe en la base de Docker. Mira el backend del contenedor en `http://localhost:3000`. |
| Cambiaste el esquema y no se refleja | `schema.sql` solo corre al crear el volumen. Usa `docker compose down -v` (borra los datos) y vuelve a levantar. |

---

## 🔒 Seguridad (leer antes de publicar fuera de tu computador)

Esta configuración está pensada para **desarrollo local**. Antes de exponerla a internet:

- **Protege el webhook** `zedan-web-chat` (por ejemplo con *Header Auth* en n8n): ahora mismo cualquiera que conozca la URL puede hablar con el agente, que escribe en la base de datos.
- **No publiques el puerto `2785` de OpenWA:** su dashboard administra la sesión de WhatsApp.
- **Usa un usuario de base de datos con permisos mínimos** para la credencial de n8n (solo `INSERT` en `cliente`, `vehiculo` y `cita`), en lugar del usuario administrador.
- Los registros que crea el agente se insertan directamente en la base y **no pasan por las validaciones del backend**; solo aplican las restricciones de la base de datos.
- **Cambia las contraseñas de los usuarios de prueba** (`seed.sql`) y define tus propios `JWT_SECRET` y `DB_PASSWORD`.
- No subas al repositorio el `.env`, `openwa-data/` ni capturas con claves.