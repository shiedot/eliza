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

COPY package.json turbo.json tsconfig.json lerna.json .npmrc build-utils.ts ./
COPY scripts ./scripts
COPY packages ./packages

# Install dependencies and build in one step
RUN SKIP_POSTINSTALL=1 bun install --no-cache && \
    NODE_OPTIONS="--max-old-space-size=2048" bun run build

ENV NODE_ENV=production

EXPOSE 3000
EXPOSE 50000-50100/udp

CMD ["bun", "run", "start"]
