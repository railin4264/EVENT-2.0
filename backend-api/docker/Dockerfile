# EventConnect 2.0 - Production Backend Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++ libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 eventconnect

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    tini \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Copy node_modules from builder
COPY --from=builder --chown=eventconnect:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=eventconnect:nodejs . .

# Create necessary directories
RUN mkdir -p logs uploads temp cache \
    && chown -R eventconnect:nodejs logs uploads temp cache

# Remove unnecessary files
RUN rm -rf \
    tests \
    *.md \
    .git* \
    docker \
    scripts/*.test.js \
    src/**/*.test.js

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Switch to app user
USER eventconnect

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "src/server.js"]