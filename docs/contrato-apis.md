# Contrato HTTP de Zedan Motors

El frontend puede usar la misma ruta y el mismo cuerpo JSON con Express y con ASP.NET Core. La URL base identifica el servidor. Todas las rutas de esta tabla llevan el prefijo `/api`.

| Módulo | Rutas |
| --- | --- |
| Sesión | `POST auth/login` y `GET auth/verificar` |
| Catálogos | `GET cargos`, `GET cargos/{id}`, `GET empleados/cargos`, `GET estados` y `GET estados/{id}` |
| Clientes, empleados, vehículos, citas, servicios e inventario | `GET` y `POST` en la colección, `GET`, `PUT` y `DELETE` en `/{id}`. Clientes también expone `GET clientes/{id}/vehiculos` |
| Importación | `POST vehiculos/importar` y `POST inventario/importar` |
| Órdenes | CRUD en `ordenes`. Dentro de `ordenes/{id}`, `GET` y `POST` en `servicios` y `repuestos`. `DELETE` en cada línea por su identificador |
| Facturación | `GET` y `POST facturacion`, `GET`, `PUT` y `DELETE facturacion/{id}`. El PUT recibe `metodo_pago` |
| Mensajes e historial | `GET` y `POST mensajes`, `GET historial/vehiculo/{id}` |
| Dashboard | `GET dashboard/kpis`, `GET dashboard/citas-hoy` y `GET dashboard/graficas` |
| Diagnósticos | CRUD en `diagnosticos`, `POST diagnosticos/{id}/archivos` y `DELETE diagnosticos/{id}/archivos/{archivoId}` |
| Videos | `GET` y `POST ordenes/{id}/videos`, `POST ordenes/{id}/videos/firma` y `DELETE ordenes/{id}/videos/{vid}` |
| Inventario con IA | `POST inventario/ia/analizar` y `POST inventario/ia/aplicar` |

### Datos y errores

- El login acepta `{usuario, password}` y entrega `{token, usuario}`. La sesión contiene `id`, `id_empleado`, `usuario`, `rol` y `nombre`. Las demás rutas requieren `Authorization: Bearer <token>`.
- Los identificadores, importes, cantidades y contadores son números JSON. Las fechas de calendario se devuelven como `YYYY-MM-DDT00:00:00` y las horas de citas como `HH:mm`. Los nombres usan `snake_case`, salvo claves ya consumidas por el dashboard como `stockBajo` y `citasPorEstado`.
- Las listas devuelven arreglos. La creación de un recurso devuelve 201, su lectura y actualización devuelven 200. Los importadores aceptan un arreglo o `{items: [...]}` de hasta 1000 filas y devuelven `{mensaje, total, data}` con `errores` cuando hay filas rechazadas.
- Los errores tienen un campo `error` de texto para mostrar al usuario. El cliente distingue la validación (400), la sesión inválida (401), el rol insuficiente (403), el recurso ausente (404) y el conflicto (409) a través del estado HTTP.
- En `POST ordenes` se pueden enviar `id_servicios` y `repuestos` con `{id_repuesto, cantidad}`. Los cambios de stock y la creación de la orden se confirman en una transacción. Una factura emitida bloquea modificaciones en su orden.

### Archivos e IA

Los vehículos incluyen `cliente`, `nombre_cliente`, `telefono_cliente` y `correo_cliente` en sus respuestas de listado, detalle, creación y actualización. El listado de diagnósticos incluye color, año, teléfono del cliente y los contadores `total_accesorios` y `total_archivos`; el filtro `vehiculo` busca por placa, marca o modelo. Su detalle incluye los datos del cliente y de la cita, accesorios con `id_accesorio` y archivos ordenados por `creado_en`, con `url` para visualizarlos.

El servidor firma la subida y devuelve `{ruta, token, bucket}`. El navegador usa estos datos para subir el archivo directamente a Supabase Storage. Los videos requieren además un POST a la colección para registrar el objeto tras verificar el tamaño y MIME almacenados. Los nuevos archivos de diagnóstico (rutas `archivos/`) se guardan en `DIAG_BUCKET`. Los registros anteriores siguen resolviéndose en el bucket de videos, tanto para consultar enlaces como para eliminarlos. Si el almacenamiento no está configurado o falla la firma, el detalle sigue disponible y `url` conserva la ruta del archivo; esa ruta por sí sola no permite abrir un archivo privado.

El análisis de inventario recibe `{imagen, tipo_media}` y devuelve `{items, observaciones, calidad_imagen}`. El usuario revisa la propuesta y envía `{id_operacion, modo, items, nota}` a `aplicar`. El cliente genera un UUID por propuesta en `id_operacion` y lo conserva al reintentar. Una confirmación repetida devuelve el resultado guardado; cambiar sus datos después de aplicarla devuelve 409. Una cantidad inválida detectada se devuelve como `null` para que el usuario la corrija. Los modos son `sumar` y `establecer`. Una fila identifica un repuesto mediante `id_repuesto` o un producto nuevo mediante `nuevo: {nombre, marca, precio}`, y lleva `cantidad`. La respuesta contiene `{mensaje, total, resultados}`. El stock y la auditoría en `movimiento_inventario` se guardan juntos.

### Configuración del servidor

C# lee las credenciales de su propia configuración de ASP.NET Core. Para usar sesiones nuevas entre servidores, configura la misma clave en `JWT_SECRET` de Node y `Jwt__Key` de C#. Los valores predeterminados de emisor y audiencia son `ZedanMotorsApi` y `ZedanMotorsFrontend`. Si los personalizas, alinea `JWT_ISSUER` y `JWT_AUDIENCE` con `Jwt__Issuer` y `Jwt__Audience`.

Para archivos, configura `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en ambos servidores. Los buckets predeterminados son `videos-ordenes` y `diagnosticos`. Para IA configura `GEMINI_API_KEY` o `ANTHROPIC_API_KEY` y el modelo correspondiente. El proyecto .NET copia las instrucciones compartidas del análisis al compilar y publicar. Para Factus se usan `FACTUS_API_TOKEN` y `FACTUS_API_URL`. Sin token se devuelve una emisión simulada, como en Node.

Ambas APIs requieren las tablas de cada módulo en el entorno de destino. En particular, la operación de IA escribe `id_repuesto`, `tipo`, `origen`, `stock_anterior`, `stock_nuevo`, `nota` e `id_usuario` en `movimiento_inventario`.
