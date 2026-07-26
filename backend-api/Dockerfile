# ============================================
# EventConnect 2.0 Backend - Dockerfile
# ============================================

FROM node:20-alpine AS base

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ============================================
# Etapa de dependencias
# ============================================
FROM base AS deps

COPY package.json package-lock.json* ./
RUN npm install --production

# ============================================
# Etapa de build
# ============================================
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ============================================
# Etapa de producción
# ============================================
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=5000

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 eventconnect

# Copiar archivos necesarios
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

# Crear directorios de uploads y logs
RUN mkdir -p /app/uploads /app/logs && chown -R eventconnect:nodejs /app/uploads /app/logs

USER eventconnect

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
