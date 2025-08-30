FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g bun@1.2.5

COPY package.json turbo.json tsconfig.json lerna.json .npmrc ./
COPY scripts ./scripts

# Install dependencies first
RUN SKIP_POSTINSTALL=1 bun install --no-cache

# Copy packages after deps to leverage Docker layer caching
COPY packages ./packages

# Build with memory optimization
RUN NODE_OPTIONS="--max-old-space-size=2048" bun run build

FROM node:20-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    git \
    python3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g bun@1.2.5

COPY --from=builder /app/package.json ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/lerna.json ./
COPY --from=builder /app/renovate.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/scripts ./scripts

ENV NODE_ENV=production

EXPOSE 3000
EXPOSE 50000-50100/udp

CMD ["bun", "run", "start"]
