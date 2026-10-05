# Integración de Agente IA con n8n y OpenWA (WhatsApp) - Zedan Motors

Este directorio contiene la configuración y el flujo de automatización de **n8n** junto con **OpenWA (WA-Automate)** para el agendamiento inteligente de citas en el taller **Zedan Motors**.

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

- [workflow_zedan_motors.json](file:///c:/Users/taich/Downloads/Zedan-Motors/n8n/workflow_zedan_motors.json): Definición exportada completa del flujo de n8n para importar con un clic.

---

## 🛠️ Paso a Paso para la Puesta en Marcha

### 1. Iniciar los Contenedores con Docker Compose
En la raíz del proyecto, ejecuta:
```bash
docker compose up -d
```
Esto levantará:
- **`zedan-postgres`**: Base de datos con las tablas y extensiones (`pgcrypto`) inicializadas en el puerto `5432`.
- **`zedan-backend`**: API Node.js y Frontend en el puerto `3000`.
- **`zedan-n8n`**: Plataforma n8n en `http://localhost:5678`.
- **`zedan-openwa`**: API de WhatsApp en `http://localhost:8080`.

### 2. Vincular WhatsApp en OpenWA (Escanear QR)
Para conectar tu número de WhatsApp con OpenWA:
1. Revisa los logs del contenedor de OpenWA:
   ```bash
   docker logs -f zedan-openwa
   ```
2. Verás el código QR impreso en la terminal (o ingresa a `http://localhost:8080` si usas la interfaz web).
3. Abre WhatsApp en tu teléfono > **Dispositivos vinculados** > **Vincular dispositivo** y escanea el código.
4. Una vez vinculado, la sesión se guardará en la carpeta `./openwa-data/` y no requerirá escanear de nuevo aunque reinicies el contenedor.

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
3. Selecciona el archivo [workflow_zedan_motors.json](file:///c:/Users/taich/Downloads/Zedan-Motors/n8n/workflow_zedan_motors.json).

### 5. Configurar las Credenciales en n8n

Dentro del flujo importado, deberás asociar tres credenciales:

#### A. PostgreSQL (`Postgres account`)
- **Host:** `postgres` *(nombre del servicio en Docker)*
- **Database:** `zedan_motors`
- **User:** `postgres`
- **Password:** `postgres_secure_pass` *(o el configurado en tu `.env`)*
- **Port:** `5432`
- **SSL:** `disable`

#### B. DeepSeek (`DeepSeek account`)
- **API Key:** Tu API Key de DeepSeek (`sk-...`)

#### C. OpenWA (`OpenWA Account`)
- **Base URL:** `http://openwa:8080` *(comunicación directa interna en Docker)* o `http://localhost:8080`
- **API Key:** `zedan_openwa_api_secret_key_12345` *(o el configurado en `OPENWA_API_KEY`)*

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
- **Vía WhatsApp:** Envía un mensaje desde cualquier número de WhatsApp al número vinculado en OpenWA. El Agente responderá automáticamente guiando al usuario por el registro de cliente, vehículo y cita.
