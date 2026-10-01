# ==========================================
# NestJS Backend - Multi-stage Production Dockerfile
# ==========================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace and backend dependency definitions
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

# Install dependencies deterministically
RUN npm ci

# Copy backend source and database schema
COPY backend/tsconfig*.json ./backend/
COPY backend/nest-cli.json ./backend/
COPY backend/prisma ./backend/prisma/
COPY backend/src ./backend/src/

# Generate Prisma Client and compile TypeScript
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

# Prune dev dependencies for lean production image
WORKDIR /app
RUN npm prune --production

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for container health check
RUN apk add --no-cache curl

# Security: create non-root application user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000

# Copy node_modules and built artifacts
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/backend/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/backend/package.json ./package.json

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/main.js"]
