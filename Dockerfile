# 7AM Hub — build TypeScript backend + đóng gói cùng 2 frontend tĩnh (web/).
# Layout trong container: /app/{dist,drizzle,web,node_modules,data}

FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    WEB_DIR=./web \
    DB_PATH=./data/7amhub.db
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY web ./web
RUN mkdir -p data
EXPOSE 8787
# chạy migrations rồi khởi động server (ingest/AI/digest cron tự bật bên trong)
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
