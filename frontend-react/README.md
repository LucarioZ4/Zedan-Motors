# Zedan Motors - Frontend (React + Vite)

Cliente web (SPA) para el sistema de gestión del taller mecánico **Zedan Motors**, desarrollado con React 19 y Vite.

## Tecnologías

- **Framework:** [React 19](https://react.dev/)
- **Bundler / Servidor dev:** [Vite](https://vite.dev/)
- **Enrutamiento:** [React Router v7](https://reactrouter.com/)
- **Estilos:** CSS modular y temas por componentes
- **Compilador:** React Compiler integrado con preset de Babel

## Módulos implementados

1. **Autenticación y Sesión:** `/login` (manejo de tokens JWT y expiración)
2. **Dashboard:** `/dashboard` (indicadores y métricas operativas)
3. **Clientes:** `/clientes` (gestión de clientes)
4. **Vehículos:** `/vehiculos` (gestión vehicular y asociación con clientes)
5. **Citas:** `/citas` (calendario y agendamiento)
6. **Órdenes de Trabajo:** `/ordenes` (servicios, repuestos, diagnósticos)
7. **Empleados:** `/empleados` (equipo de trabajo y cargos)
8. **Servicios:** `/servicios` (catálogo de servicios y precios)
9. **Inventario:** `/inventario` (control de repuestos, stock e importación CSV)
10. **Facturación:** `/facturacion` (emisión de facturas y generación de comprobantes PDF)
11. **Historial Vehicular:** `/historial` (timeline de eventos por placa)

## Instalación y ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar en modo desarrollo
npm run dev

# 3. Construir para producción
npm run build
```

La aplicación se ejecutará por defecto en `http://localhost:5173`.
Requiere que el backend esté ejecutándose en `http://localhost:3000`.
