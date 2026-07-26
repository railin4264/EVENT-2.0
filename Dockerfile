# Multi-stage build for EventConnect 2.0
FROM node:24-alpine-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install backend dependencies
COPY backend-api/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Install frontend dependencies
WORKDIR /app/frontend
COPY "eventconnect-frontend/package*.json" ./
RUN npm ci --only=production && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy backend dependencies
COPY --from=deps /app/node_modules ./backend-api/node_modules
COPY backend-api/ ./backend-api/

# Copy frontend dependencies
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY "eventconnect-frontend/" ./frontend/

# Build frontend
WORKDIR /app/frontend
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 eventconnect

# Copy backend
COPY --from=builder /app/backend-api ./backend-api
COPY --from=builder /app/frontend/dist ./frontend/dist

# Create logs directory
RUN mkdir -p /app/logs && chown eventconnect:nodejs /app/logs

# Set proper permissions
RUN chown -R eventconnect:nodejs /app
USER eventconnect

# Expose port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node backend-api/scripts/health-check.js

# Start the application
CMD ["node", "backend-api/src/server.js"]
















