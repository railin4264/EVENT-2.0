# Root context builds the API. The Next.js image has its own Dockerfile.
# docker compose builds and runs both services together.
FROM node:22-alpine AS dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY backend-api/package*.json ./
RUN npm ci --omit=dev
FROM node:22-alpine AS runner
ENV NODE_ENV=production PORT=5000
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 eventconnect
COPY --from=dependencies /app/node_modules ./node_modules
COPY backend-api/package.json ./package.json
COPY backend-api/src ./src
COPY backend-api/scripts/verify-release-indexes.js backend-api/scripts/inspect-event-scale.js ./scripts/
RUN mkdir -p uploads logs && chown -R eventconnect:nodejs uploads logs
USER eventconnect
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -q --spider http://127.0.0.1:5000/ready || exit 1
CMD ["node", "src/server.js"]
