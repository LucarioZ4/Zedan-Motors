FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend-react
COPY frontend-react/package*.json ./
RUN npm ci
COPY frontend-react ./
# Vite usa las variables públicas del frontend y la API del mismo origen.
RUN --mount=type=secret,id=frontend_env,target=/app/frontend-react/.env VITE_API_URL= npm run build

FROM node:22-alpine

WORKDIR /app

# Instalar dependencias de producción
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

# Copiar el código de backend y frontend
WORKDIR /app
COPY backend ./backend
COPY --from=frontend-build /app/frontend-react/dist ./frontend-react/dist

WORKDIR /app/backend
EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/app.js"]
