# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and npm config
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and install production deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/src/health-check.js || exit 1

# Expose port (for any HTTP endpoints)
EXPOSE 3000

# Start
CMD ["node", "dist/src/index.js"]
