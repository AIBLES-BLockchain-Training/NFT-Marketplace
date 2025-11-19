# Fixed Dockerfile for Indexer package
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++ curl

# Install global dependencies
RUN npm install -g @subsquid/commands

# Copy root package files
COPY package.json yarn.lock .yarnrc ./

# Copy .yarn directory with custom yarn binary
COPY .yarn ./.yarn

# Copy NX config files
COPY nx.json ./
COPY tsconfig.base.json ./

# Copy indexer source
COPY packages/indexer ./packages/indexer

# Install dependencies with increased memory and skip post-install scripts
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN yarn install --production=false --ignore-scripts || npm install --legacy-peer-deps

# Build indexer
WORKDIR /app/packages/indexer
RUN npm run build || npx tsc

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache libc6-compat
RUN npm install -g @subsquid/commands

# Copy built files from builder
COPY --from=builder /app/packages/indexer/lib ./lib
COPY --from=builder /app/packages/indexer/schema.graphql ./schema.graphql
COPY --from=builder /app/packages/indexer/squid.yaml ./squid.yaml
COPY --from=builder /app/packages/indexer/commands.json ./commands.json

# Copy entrypoint script
COPY packages/indexer/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Create symlink for sqd command
RUN ln -s $(which squid-commands) /usr/local/bin/sqd

# Expose GraphQL port
EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4001/graphql', (r) => {if(r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start both processor and GraphQL server
CMD ["./entrypoint.sh"]