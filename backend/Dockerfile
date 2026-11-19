FROM node:20-alpine

WORKDIR /app

# Instalar dependencias de producción
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production || npm install --production

# Copiar el código de backend y frontend
WORKDIR /app
COPY backend ./backend
COPY frontend ./frontend
COPY database/migrations/2026-11-agendar-cita-chat.sql ./database/migrations/2026-11-agendar-cita-chat.sql

WORKDIR /app/backend
EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/app.js"]
