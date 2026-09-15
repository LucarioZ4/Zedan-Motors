# Documentación técnica del proyecto Zedan Motors

## Introducción

Este proyecto es un sistema de gestión para un taller automotriz llamado Zedan Motor’s. Está conformado por dos grandes capas:

1. Backend: API REST construida con Node.js y Express, que maneja autenticación, base de datos PostgreSQL, módulos de negocio y negocio de operaciones del taller.
2. Frontend: interfaz web estática en HTML, CSS y JavaScript, que permite al usuario interactuar con el sistema mediante formularios, tablas, dashboards, autenticación y páginas por módulo.

La estructura de carpetas separa claramente el lado del servidor y el lado del cliente:

- backend/: lógica de negocio y API
- frontend/: archivos HTML, CSS, JavaScript, recursos visuales e iconos

---

# Capítulo 1: Backend

## 1.1 Propósito del backend

El backend es el centro de lógica del sistema. Su función principal es:

- recibir peticiones HTTP desde el frontend,
- verificar la autenticación del usuario,
- consultar o modificar datos en la base de datos PostgreSQL,
- aplicar reglas de negocio del taller automotriz,
- devolver respuestas JSON o servir archivos estáticos del frontend.

La API central está construida sobre Express y se organiza por módulos funcionales.

## 1.2 Tecnologías y dependencias principales

El archivo package.json define el proyecto como API Node.js. Sus dependencias principales son:

- express: framework principal de la API REST
- pg: cliente de PostgreSQL
- cors: permite conexiones desde el frontend en otro origen
- dotenv: carga variables de entorno
- jwt: autenticación basada en JSON Web Tokens
- bcryptjs: encriptación de contraseñas
- helmet: seguridad HTTP
- morgan: logging de peticiones
- nodemon: desarrollo local con auto reinicio

Estas librerías permiten armar una API segura, con control de acceso, manejo de sesión y conexión con PostgreSQL.

## 1.3 Estructura global del backend

El directorio backend/src contiene:

- app.js: archivo principal donde se inicia Express y se registran rutas.
- config/: configuración ambiental y conexión a base de datos.
- middleware/: lógica reutilizable como autenticación.
- modules/: cada dominio funcional del taller tiene su propio controlador y rutas.

## 1.4 Archivo principal de la aplicación

En backend/src/app.js se crea una instancia de Express, se habilitan middlewares y se registran todas las rutas de módulos.

Las principales secciones son:

- carga de variables de entorno con dotenv
- configuración de Helmet, CORS, Morgan y parser JSON
- registro de rutas de módulos
- servicio estático del frontend
- endpoint raíz de la aplicación
- health check para comprobar la base de datos
- manejo de rutas no encontradas y errores internos
- arranque del servidor con app.listen

La API principal expone rutas como:

- /api/auth
- /api/dashboard
- /api/clientes
- /api/vehiculos
- /api/citas
- /api/estados
- /api/ordenes
- /api/empleados
- /api/servicios
- /api/inventario
- /api/facturacion

Además, la API sirve también el frontend desde la carpeta frontend.

## 1.5 Configuración de entorno y base de datos

El proyecto usa dos archivos de configuración:

1. backend/src/config/env.js
2. backend/src/config/database.js

El archivo env.js carga variables de entorno para conexión y credenciales. El archivo database.js prepara el Pool de PostgreSQL. El sistema usa un cliente PostgreSQL a través de pg, con credenciales leídas desde variables de entorno.

La base de datos es el almacén central para:

- usuarios y empleados,
- clientes,
- vehículos,
- servicios,
- citas,
- órdenes de trabajo,
- inventario,
- facturas.

## 1.6 Middleware de autenticación

El middleware ubicado en backend/src/middleware/auth.js valida el token JWT recibido en la cabecera Authorization.

El flujo es:

1. El cliente obtiene un token al hacer login.
2. El frontend guarda el token en sessionStorage.
3. Cada petición a un recurso protegido lleva el token en el encabezado.
4. El middleware verifica la firma del token.
5. Si es válido, deja pasar la petición; si no, responde con error de autenticación.

La capa auth es importante porque todas las rutas principales del sistema están protegidas por este middleware.

## 1.7 Módulo de autenticación

El módulo auth está en backend/src/modules/auth/.

Contiene:

- auth.controller.js: lógica de login y verificación de sesión.
- auth.routes.js: endpoints de auth.

El endpointPOST /api/auth/login recibe usuario y password. El backend compara la contraseña con el hash almacenado en la base de datos usando bcryptjs. Si la contraseña es válida, genera un JWT y responde con:

- token,
- usuario,
- rol,
- nombre.

La autenticación no solamente inicia sesión, sino que valida la identidad del usuario para poder usar cualquiera de los módulos del sistema.

## 1.8 Módulo de clientes

El registro de clientes está en backend/src/modules/clientes/.

El controlador permite:

- listar todos los clientes
- consultar un cliente por id
- crear un cliente
- actualizar un cliente
- eliminar o desactivar un cliente
- consultar vehículos asociados a un cliente

Este módulo es base para relacionar clientes con citas, ordenes y vehículos.

## 1.9 Módulo de vehículos

El módulo de vehículos está en backend/src/modules/vehiculos/.

Incluye:

- listado de vehículos
- consulta por id
- creación de registros
- modificación
- eliminación
- importación masiva de vehículos a través de un endpoint /importar

El módulo conecta vehículos con clientes, ordenes de trabajo, historial y citas.

## 1.10 Módulo de citas

El módulo citas soporta cronograma del servicio automotriz. Tiene endpoints para:

- obtener todas las citas
- consultar una cita por id
- crear cita
- modificar cita
- eliminar cita

Las citas del taller conectan clientes, vehículos, horarios y servicios a programar.

## 1.11 Módulo de servicios

El módulo servicios maneja:

- catálogo de servicios que ofrece el taller,
- precios,
- identificación de servicio,
- activación o eliminación de servicios.

Es una base importante para la relación entre ordenes y facturación.

## 1.12 Módulo de órdenes de trabajo

El módulo ordenes está entre los más completos del backend.

Permite:

- obtener ordenes
- consultar una orden por id
- crear nuevas ordenes
- editar ordenes
- eliminar
- listar servicios asociados a la orden
- agregar servicios a la orden
- actualizar estados y costos

La orden de servicio es el núcleo del flujo operativo del taller. Representa el trabajo a realizar sobre un vehículo.

## 1.13 Módulo de inventario

El módulo inventario soporta:

- registro de repuestos y herramientas,
- listado del stock,
- actualización de inventario,
- registro de entradas y salidas,
- importación masiva de datos con /importar.

Este módulo ayuda a gestionar stock crítico y controlar piezas necesarias para atender órdenes.

## 1.14 Módulo de facturación

El módulo facturacion se encarga de:

- crear y consultar facturas,
- relacionar servicios o trabajos facturables,
- registrar pagos o saldos,
- consultar detalle por factura.

La facturación conecta la operación del taller con la parte administrativa financiera.

## 1.15 Módulo de empleados

El módulo empleados permite administrar:

- perfiles de usuarios del taller,
- cargos,
- roles,
- información de empleados y personal.

El backend expone rutas para listar empleados, cargos y consultar perfiles de personal.

## 1.16 Módulo de estados

El módulo estados maneja catálogo de estados del sistema, por ejemplo:

- estado de una orden,
- estado de una cita,
- estado de un vehículo o servicio.

Se usa para normalizar los valores de estado y evitar inconsistencias en la base de datos.

## 1.17 Módulo de historial

El módulo historial expone el registro histórico de un vehículo o servicio. Permite:

- consultar el historial de mantenimientos o servicio de un vehículo,
- documentar el seguimiento de ordenes y actividades.

Es importante para trazabilidad y control de operaciones.

## 1.18 Módulo de dashboard

El dashboard es un módulo analítico y central.

El controlador de dashboard expone endpoints para:

- kpi general del sistema
- citas de hoy
- resumen de recursos de negocio

Esto permite a los usuarios visualizar rápidamente:

- número de clientes,
- stock bajo,
- vehículos ,
- citas del día,
- facturas y empleados,
- tráfico de operaciones.

## 1.19 Patrón de diseño del backend

El backend sigue un patrón MVC simple y modular:

- routes: define las rutas y endpoints
- controller: contiene la lógica de petición y manipulación de datos
- database: consulta a PostgreSQL

Cada módulo mantiene su propia carpeta y su estilo de organización. Aunque no todos los controladores siguen exactamente el mismo patrón, la idea es la misma: separar la ruta de la lógica del negocio.

## 1.20 Seguridad del backend

El backend implementa varias capas de seguridad:

- uso de Helmet para headers de seguridad
- uso de CORS
- validación de token JWT
- protección de endpoints con middleware auth
- uso de bcryptjs para contraseñas
- manejo de errores y rutas no encontradas

## 1.21 Flujo de login en backend

El flujo típico es:

1. El usuario entra a la interfaz web.
2. Envía usuario y contraseña al endpoint /api/auth/login.
3. El backend verifica el usuario en la base de datos.
4. Compara contraseña usando bcrypt.
5. Si la contraseña coincide, genera un JWT.
6. El backend responde con token y metadata del usuario.
7. El frontend guarda token y redirige al dashboard.

---

# Capítulo 2: Frontend

## 2.1 Propósito del frontend

El frontend es la capa visual del sistema. Está construido como una interfaz web estática con HTML, CSS y JavaScript. Su objetivo es:

- mostrar formularios y pantallas para el flujo de trabajo del taller,
- autenticar usuarios,
- consumir la API REST del backend,
- mostrar dashboards y reportes,
- permitir operaciones CRUD sobre clientes, vehículos, servicios, citas, inventario y facturas.

## 2.2 Tecnología y organización del frontend

La interfaz está organizada en:

- frontend/index.html: página principal de acceso/login.
- frontend/pages/ : páginas HTML del sistema de gestión.
- frontend/css/ : estilos visuales por módulo.
- frontend/js/ : lógica de interacción de cada página.
- frontend/assets/ : imágenes, iconos, branding y recursos gráficos.

La aplicación usa Bootstrap Icons y fuentes externas para mejorar la visual.

## 2.3 Página principal de login

La página principal del sistema está en frontend/index.html, y sirve como puerta de ingreso al sistema.

Contiene:

- formulario de usuario y contraseña,
- botón de mostrar/ocultar password,
- identificar el error en caso de credenciales invalidas,
- botón de login para enviar el formulario.

La lógica de login se encuentra en frontend/js/login.js. Esta función:

1. obtiene usuario y password del formulario,
2. valida que ambos campos estén completos,
3. llama al endpoint POST /api/auth/login,
4. si el login es correcto, guarda token y datos de usuario en sessionStorage,
5. redirige a la pantalla dashboard.

## 2.4 Archivo global de frontend

El archivo frontend/js/global.js contiene funciones reutilizables en el lado cliente.

Incluye:

- API_URL base = http://localhost:3000
- getHeaders(): prepara los encabezados con Authorization y Content-Type
- verificarSesion(): valida si existe token de sesión; si no existe, devuelve al login
- cargarSesion(): carga nombre, rol y avatar desde sessionStorage
- logout(): limpia la sesión y redirige al login
- cargarFecha(): muestra fecha actual en el topbar
- mostrarToast(): despliega mensajes emergentes de éxito o error

Este archivo es la base común para todos los módulos front-end.

## 2.5 Arquitectura de las páginas del frontend

El frontend contiene páginas separadas por dominio:

- citas.html
- clientes.html
- dashboard.html
- facturacion.html
- historial.html
- inventario.html
- ordenes.html
- servicios.html
- vehiculos.html

Cada página tiene su HTML propio, su CSS propio y su JS propio. Esto permite modularizar cada flujo de negocio.

## 2.6 Página dashboard

La pantalla dashboard es una página central, diseñada para mostrar resumen operativo.

Su archivo correspondiente es:

- frontend/pages/dashboard.html
- frontend/js/dashboard.js
- frontend/css/dashboard.css

La lógica de dashboard obtiene KPIs usando:

- GET /api/dashboard/kpis
- GET /api/dashboard/citas-hoy

Los KPIs mostrados pueden incluir:

- número de clientes
- número de vehículos
- número de citas de hoy
- número de órdenes
- número de empleados
- nivel de stock bajo
- facturas

La pantalla presenta además una agenda visual de citas del día.

## 2.7 Módulo de clientes en el frontend

El frontend para clientes se organiza en:

- frontend/pages/clientes.html
- frontend/js/clientes.js
- frontend/css/clientes.css

La interfaz permite:

- listar clientes,
- crear clientes,
- editar datos,
- eliminar o dar de baja clientes,
- cargar vehículos relacionados al cliente,
- buscar y filtrar registros.

El flujo JS del módulo usa fetch hacia el backend para consumir endpoints de /api/clientes.

## 2.8 Módulo de vehículos en el frontend

La pantalla de vehículos se basa en:

- vehiculos.html
- vehiculos.js
- vehiculos.css

Permite:

- listar vehículos,
- registrar nuevos vehículos,
- modificar datos,
- importar vehículos desde un archivo o plantilla,
- asociar los vehículos a clientes,
- mostrar estado, marca, modelo y placa.

## 2.9 Módulo de citas en el frontend

La pantalla de citas ofrece una interfaz para:

- crear citas para clientes y vehículos,
- gestionar fechas, horarios y servicios,
- visualizar citas por día o calendario,
- calendarizar tareas del taller.

Se conecta a /api/citas con fetch.

## 2.10 Módulo de servicios en el frontend

La interfaz de servicios presenta:

- catálogo de servicios disponibles,
- costos y descripciones,
- creación de nuevos servicios,
- edición o eliminación de servicios.

Se consume la API de servicios y se usa como parte del flujo de creación de órdenes y facturas.

## 2.11 Módulo de órdenes en el frontend

La pantalla de ordenes es clave para la operación del taller.

Permite:

- crear ordenes de trabajo,
- asignar servicios,
- asociar vehículo y cliente,
- registrar prioridad y fecha,
- actualizar estado de la orden,
- listar servicios incluidos en cada orden.

El archivo frontend/js/ordenes.js maneja la integración con el endpoint /api/ordenes.

## 2.12 Módulo de inventario en el frontend

La interfaz de inventario es funcional para manejo de repuestos.

Permite:

- mostrar stock de repuestos,
- registrar entradas y salidas,
- ver piezas con bajo stock,
- importar inventario desde archivo, si el sistema lo habilita.

Se comunica con /api/inventario y usa fetch para listar elementos y crear o editar registros.

## 2.13 Módulo de facturación en el frontend

La interfaz de facturación genera y consulta documentos de cobro o servicios prestados.

Permite:

- recuperar facturas,
- listar facturas por cliente o vehículo,
- crear facturación a partir de una orden y servicio,
- visualizar detalles de facturas.

Su conexión se realiza con /api/facturacion.

## 2.14 Módulo de historial en el frontend

La pantalla de historial muestra la evolución del vehículo o del trabajo del taller.

Incluye:

- ordenes pasadas,
- servicios hechos,
- fechas de mantenimiento,
- relación con el vehículo y el cliente.

## 2.15 Módulo de empleados en el frontend

Aunque el proyecto no tiene una página frontal explícita llamada empleados.html, las rutas y la API de empleados están preparadas para cubrir perfiles y roles del taller.

La parte visual puede reutilizar el layout de las demás páginas MVC o mostrar datos en el dashboard y módulos de administración.

## 2.16 Estilos y diseño visual

El CSS se encuentra modularizado por dominio. Por ejemplo:

- frontend/css/login.css
- dashboard.css
- clientes.css
- vehiculos.css
- facturacion.css
- inventario.css
- ordenes.css
- servicios.css
- citas.css
- historial.css

Estos archivos definen:

- formularios,
- tablas,
- cards,
- layout general,
- sidebar,
- topbar,
- botones,
- contenido administrativo,
- tonos de éxito, error y advertencia.

## 2.17 Flujo general del frontend

El flujo completo del cliente es:

1. El usuario carga la página principal index.html.
2. El login valida usuario y contraseña con backend.
3. El backend responde con un JWT.
4. El frontend guarda token en sessionStorage.
5. El usuario es redirigido al dashboard o a otra página funcional.
6. Cada página usa JS para consumir endpoints protegidos.
7. El resultado se visualiza en tablas, cards, dashboard y formularios.

## 2.18 Relación entre frontend y backend

La comunicación es directa mediante fetch hacia http://localhost:3000. El patrón es:

- fetch(`${API_URL}/api/...`)

Las llamadas se realizan con:

- GET para consultar,
- POST para crear,
- PUT para actualizar,
- DELETE para eliminar.

El backend responde en formato JSON. Las páginas HTML y CSS no están ejecutandose en un framework moderno, sino como páginas del lado cliente combinando HTML estático con scripts JavaScript.

## 2.19 Resumen del frontend

El frontend del proyecto es una solución de interfaz web estática y modular. Tiene:

- login central,
- dashboard principal,
- módulos por dominio,
- estilo visual por CSS modular,
- lógica por JavaScript por módulo,
- sesión manejada con sessionStorage,
- autenticación basada en JWT.

---

# Anexo: explicación de líneas clave del código

## backend/src/app.js

- require('dotenv').config(); carga variables de entorno desde .env.
- const path = require('path'); importa el manejo de rutas del sistema.
- const express = require('express'); inicia el framework Express.
- const cors = require('cors'); habilita peticiones entre dominios.
- const helmet = require('helmet'); añade seguridad HTTP.
- const morgan = require('morgan'); registra peticiones en modo desarrollo.
- const app = express(); crea la aplicación API.
- const port = process.env.PORT || 3000; define el puerto local.
- app.use(helmet(...)); activa seguridad de cabeceras.
- app.use(cors()); permite peticiones del frontend.
- app.use(morgan('dev')); muestra logs de peticiones.
- app.use(express.json()); permite parsear JSON.
- app.use(express.urlencoded({ extended: true })); permite formularios urlencoded.
- app.use('/api/auth', require(...)); registra el módulo de autenticación.
- app.use('/api/dashboard', require(...)); registra el dashboard.
- app.use('/api/clientes', require(...)); registra clientes.
- app.use('/api/vehiculos', require(...)); registra vehículos.
- app.use('/api/citas', require(...)); registra citas.
- app.use('/api/estados', require(...)); registra estados.
- app.use('/api/ordenes', require(...)); registra ordenes.
- app.use('/api/empleados', require(...)); registra empleados.
- app.use('/api/servicios', require(...)); registra servicios.
- app.use('/api/inventario', require(...)); registra inventario.
- app.use('/api/facturacion', require(...)); registra facturación.
- app.use(express.static(...)); sirve el frontend estático.
- app.get('/', ...) sirve index.html.
- app.get('/health', ...) valida la base de datos.
- app.use((req, res) => ...) responde 404.
- app.use((err, req, res, next) => ...) captura errores internos.
- app.listen(port, ...) arranca el servidor.

## backend/src/config/database.js

- require('dotenv').config(); carga variables de entorno.
- const { Pool } = require('pg'); importa el cliente PostgreSQL.
- const pool = new Pool({...}); crea el grupo de conexiones a la base de datos.
- host, port, database, user, password corresponden a credenciales de PostgreSQL.
- pool.connect(...) prueba la conexión.
- console.error(...) muestra error de conexión si falla.
- console.log(...) confirma conexión.
- module.exports = pool; exporta el pool para usarlo desde otros módulos.

## backend/src/middleware/auth.js

- const jwt = require('jsonwebtoken'); importa JWT para verificar tokens.
- const { jwtSecret } = require('../config/env'); carga la clave compartida.
- module.exports = (req, res, next) => ... exporta middleware.
- const header = req.headers['authorization'] lee la cabecera con token.
- if (!header || !header.startsWith('Bearer ')) valida si el token viene con el formato correcto.
- const token = header.split(' ')[1] extrae la parte del token.
- jwt.verify(token, jwtSecret) verifica la firma del token.
- req.usuario = decoded; añade datos del usuario autenticado a la petición.
- next(); permite continuar con el siguiente middleware o controlador.
- catch responde con error 401 cuando el token no es válido.

## backend/src/modules/auth/auth.controller.js

- const jwt = require('jsonwebtoken'); integra autenticación por JWT.
- const bcrypt = require('bcryptjs'); integra bcrypt para validar contraseñas.
- const { jwtSecret, jwtExpires } = require('../../config/env'); carga la clave y duración del token.
- const USUARIOS = [...] representa usuarios demo con hashes encriptados.
- const login = async (req, res) => ... define el flujo de autenticación.
- const { usuario, password } = req.body; toma las credenciales del cuerpo de la petición.
- if (!usuario || !password) valida que el usuario y la contraseña se hayan enviado.
- USUARIOS.find(...) busca el usuario válido y compara la contraseña con el hash.
- if (!encontrado) devuelve error 401 si los datos son incorrectos.
- jwt.sign(...) firma un token con datos de usuario, rol y nombre.
- res.json({ token, usuario: encontrado }); responde con token y datos del usuario.
- const verificar = (req, res) => ... devuelve el usuario autenticado para validación.
- module.exports = { login, verificar }; exporta funciones del módulo.

## frontend/js/global.js

- const API_URL = 'http://localhost:3000'; define dirección del backend.
- function getHeaders() devuelve cabeceras con JSON y Authorization.
- const token = sessionStorage.getItem('token'); lee el token guardado localmente.
- return { ... } añade el token al header con formato Bearer.
- function verificarSesion() valida si el navegador tiene una sesión activa.
- if (!token) redirige al login si no hay token.
- function cargarSesion() toma nombre, rol y avatar del usuario guardado.
- function logout() limpia la sesión y manda al login.
- function cargarFecha() escribe la fecha real en el topbar.
- function mostrarToast() crea un toast con color según el tipo de mensaje.

## frontend/js/login.js

- const API_URL = 'http://localhost:3000'; define la URL del servicio API.
- function togglePassword() permite mostrar o ocultar la contraseña.
- function mostrarError() muestra la caja de error del login.
- function ocultarError() oculta la caja de error.
- function setLoading() cambia el botón del login a estado de carga.
- async function handleLogin(e) es la función principal del proceso de login.
- const usuario = ... y const password = ... toman los datos del formulario.
- if (!usuario || !password) valida el formulario.
- fetch(`${API_URL}/api/auth/login`, ...) envía el usuario y la contraseña al backend.
- const data = await response.json(); convierte la respuesta del backend en JSON.
- if (response.ok) guarda token y datos de usuario en sessionStorage.
- else ... muestra error si el backend responde con un problema.
- catch(err) ... muestra conexión fallida si la API no responde.

## frontend/js/dashboard.js

- async function cargarKPIs() obtiene indicadores resumen del backend.
- fetch(`${API_URL}/api/dashboard/kpis`, { headers: getHeaders()}) llama al endpoint de dashboard.
- response.ok verifica si la respuesta fue exitosa.
- data.clientes, data.vehiculos, etc. se muestran en elementos del DOM.
- async function cargarCitasHoy() obtienes las citas agendadas para el día.
- fetch(`${API_URL}/api/dashboard/citas-hoy`, { headers: getHeaders()}) consume la API del dashboard.
- citas.length valida si hay o no citas.
- tbody.innerHTML = citas.map(...) genera filas HTML dinámicamente en la lista de citas.

---

# Conclusión

El proyecto Zedan Motors combina un backend API REST robusto con un frontend estático modular. El backend se organiza por módulos funcionales del taller automotriz, y el frontend ofrece una experiencia de negocio separada por pantalla y módulo.

La arquitectura permite que el sistema sea fácil de mantener, porque cada dominio funcional tiene su propio archivo de rutas, controlador y pantalla de usuario. El manejo de autenticación con JWT, la conexión con PostgreSQL y la separación entre páginas y recursos CSS/JS hacen que el sistema sea claro, reutilizable y escalable.
