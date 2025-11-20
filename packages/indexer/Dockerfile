# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy root package files
COPY package.json yarn.lock .yarnrc ./
COPY .yarn ./.yarn
COPY nx.json ./
COPY tsconfig.base.json ./

# Copy indexer source
COPY packages/indexer ./packages/indexer

# Install dependencies with yarn
# Note: Not using --frozen-lockfile to allow lockfile updates during build
RUN yarn install --production=false

# Build indexer
WORKDIR /app/packages/indexer
RUN npx tsc

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install dependencies for running
RUN apk add --no-cache libc6-compat

# Copy built files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/indexer/lib ./lib
COPY --from=builder /app/packages/indexer/schema.graphql ./schema.graphql
COPY --from=builder /app/packages/indexer/squid.yaml ./squid.yaml
COPY --from=builder /app/packages/indexer/db ./db

# Copy entrypoint script
COPY packages/indexer/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Expose GraphQL port
EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/graphql', (r) => {if(r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start both processor and GraphQL server
CMD ["./entrypoint.sh"]
