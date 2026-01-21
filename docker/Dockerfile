# Multi-stage build for better optimization
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first to leverage Docker layer caching
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --only=production

# Copy prisma files and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code and build
COPY src ./src/
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy prisma files and generated client
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma/

# Copy built application
COPY --from=builder /app/dist ./dist/

ENV NODE_ENV=production
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/index.js || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
