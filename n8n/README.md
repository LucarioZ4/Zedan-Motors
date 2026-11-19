# Integración de Agente IA con n8n y OpenWA (WhatsApp) - Zedan Motors

Este directorio contiene la configuración y el flujo de automatización de **n8n** junto con **OpenWA** para el agendamiento inteligente de citas en el taller **Zedan Motors**.

---

## 📌 Arquitectura del Flujo

El flujo combina dos canales de entrada (Web y WhatsApp) procesados por un **Agente IA (DeepSeek)** que interactúa directamente con la base de datos PostgreSQL de Zedan Motors:

Cada mensaje entra por el webhook web o por OpenWA. El agente conserva el historial por canal y sesión en PostgreSQL. Tras confirmar los datos, llama a `agendar_cita_chat` y devuelve el resultado por el canal de origen. La disponibilidad se controla por vehículo y horario.


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

### 0. Configurar Supabase y Docker
El backend del contenedor carga `backend/.env`, el mismo archivo usado por el backend local. Define `DATABASE_URL` con la conexión PostgreSQL de Supabase, `DB_SSL=true` y los secretos del backend. Puedes partir de `backend/.env.example`.

El archivo `.env` de la raíz configura los puertos y las opciones de Compose. Puedes partir de `.env.example`. El backend toma siempre su conexión de `backend/.env`.

### 1. Reconstruir e iniciar los servicios
Desde la raíz del proyecto:

```bash
docker compose build backend
docker compose run --rm --no-deps backend node scripts/migrate-chat.js
docker compose up -d --build
docker compose ps
```

Se levantan el backend en `http://localhost:3000`, n8n en `http://localhost:5678` y OpenWA en `http://localhost:2785`. La migración instala la función de agendamiento en la base indicada por `DATABASE_URL`. Las tablas del negocio deben existir previamente en Supabase.

Si queda un contenedor `zedan-postgres` de la configuración anterior, puedes detenerlo con `docker stop zedan-postgres`. Su volumen conserva los datos anteriores.

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
Usa la misma conexión Supabase de `DATABASE_URL` en `backend/.env`. En Supabase, el panel **Connect** muestra los campos de PostgreSQL.

| Campo | Valor |
|---|---|
| **Host** | Host de la URL de Supabase |
| **Port** | Puerto de esa URL (6543 para el pooler de transacciones) |
| **Database** | Nombre de la base en la URL |
| **User** | Usuario completo de la URL, incluido el identificador de proyecto si usas pooler |
| **Password** | Contraseña de la base |
| **SSL** | Activado; permite certificados autofirmados si la conexión lo requiere |

Asocia esta credencial a **Agendar cita** y **Memoria PostgreSQL**. El usuario necesita permisos para la reserva y para crear y mantener `n8n_chat_histories`. Las credenciales guardadas anteriormente en n8n deben actualizarse desde su editor, ya que Compose no las reemplaza.

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

En **OpenWA Trigger**, selecciona la sesión vinculada (el flujo propone `zedan-motors`). Configura `WEBHOOK_URL=http://n8n:5678/` en el entorno de Compose para que OpenWA alcance el callback.

En **Web Chat Webhook**, crea una credencial Header Auth con nombre `X-Chat-Key` y un secreto propio. Guárdalo en el servidor que llama al webhook. Ese servidor debe asignar un identificador de sesión privado por conversación.

### 6. Activar el flujo
Con el flujo abierto, enciende el interruptor **Active** (arriba a la derecha). **Mientras esté inactivo, el webhook de producción y el trigger de WhatsApp no responden.**

> La URL `/webhook-test/...` (con "Listen for test event") solo sirve para pruebas puntuales dentro del editor; la que se usa normalmente es `/webhook/zedan-web-chat`, que requiere el flujo activo.

---

## 🧪 Pruebas y Uso

- **Vía Web Chat:** Envía un POST a:
  ```http
  POST http://localhost:5678/webhook/zedan-web-chat
  Content-Type: application/json
  X-Chat-Key: <secreto>

  {
    "sessionId": "web-usuario-1",
    "message": "Hola, quiero agendar una cita para mi carro"
  }
  ```
  En Windows (PowerShell):
  ```powershell
  Invoke-RestMethod -Method Post -Uri http://localhost:5678/webhook/zedan-web-chat `
    -Headers @{ 'X-Chat-Key' = $env:ZEDAN_CHAT_KEY } -ContentType 'application/json' `
    -Body '{"sessionId":"web-usuario-1","message":"Hola, quiero agendar una cita para mi carro"}'
  ```
- **Vía WhatsApp:** Envía un mensaje desde cualquier número de WhatsApp al número vinculado en OpenWA. El Agente responderá automáticamente guiando al usuario por el registro de cliente, vehículo y cita.
- **Ver el resultado:** inicia sesión en `http://localhost:3000` con tu usuario del sistema y revisa Clientes, Vehículos y Citas.

---

## 🔧 Solución de problemas

| Síntoma | Qué revisar |
|---|---|
| El webhook responde 404 | El flujo no está activo (paso 6), o estás usando la URL `/webhook-test/` fuera del modo de prueba. |
| n8n no conecta con PostgreSQL | Revisa host, puerto, usuario completo, contraseña y SSL de Supabase en la credencial de n8n. |
| n8n no puede usar OpenWA (error de autenticación) | Verifica que la API Key coincida con la de `openwa-data/.api-key` y que la Base URL sea `http://openwa:2785`. |
| Los datos del agente no aparecen | Comprueba que la credencial PostgreSQL de n8n y DATABASE_URL del backend apunten al mismo proyecto y base de Supabase. |

---

## 🔒 Seguridad (leer antes de publicar fuera de tu computador)

Esta configuración está pensada para **desarrollo local**. Antes de exponerla a internet:

- Configura la credencial Header Auth descrita arriba.
- **No publiques el puerto `2785` de OpenWA:** su dashboard administra la sesión de WhatsApp.
- **Usa un usuario de base de datos con permisos mínimos** para la credencial de n8n (lectura de catálogos y registros, permisos de escritura y secuencias para la reserva y la memoria), en lugar del usuario administrador.
- Los registros que crea el agente se insertan directamente en la base y **no pasan por las validaciones del backend**; solo aplican las restricciones de la base de datos.
- Define un JWT_SECRET propio en backend/.env y usa las credenciales reales de Supabase.
- No subas al repositorio el `.env`, `openwa-data/` ni capturas con claves.