# 7AM Hub — Next.js 16 (standalone) + worker process
# Build context: project root (7amhub/)
# Usage: docker compose up -d --build

# ─── Stage 1: Install all dependencies ────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY app/package*.json ./
RUN npm ci

# ─── Stage 2: Build Next.js app ───────────────────────────────────────────────
FROM deps AS builder
# SOURCE_HASH changes whenever app source files change, busting the build cache
ARG SOURCE_HASH=default
RUN echo "$SOURCE_HASH" > /tmp/source.hash
COPY app/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: Production runtime ──────────────────────────────────────────────
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DB_PATH=/app/data/7amhub.db

# Next.js standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Drizzle migration files
COPY --from=builder /app/drizzle ./drizzle

# Worker + TypeScript sources (run via tsx at startup)
COPY --from=builder /app/worker.ts ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/package.json ./

# Full node_modules: tsx (worker runner) + better-sqlite3 (native) + all deps
COPY --from=deps /app/node_modules ./node_modules

RUN mkdir -p data
EXPOSE 3000
