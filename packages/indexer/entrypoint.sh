#!/bin/sh
set -e

echo "Starting NFT Marketplace Indexer..."

# Apply database migrations
echo "Applying database migrations..."
npx squid-typeorm-migration apply

# Function to handle shutdown
shutdown() {
    echo "Shutting down gracefully..."
    kill -TERM "$processor_pid" "$graphql_pid" 2>/dev/null
    wait "$processor_pid" "$graphql_pid"
    exit 0
}

trap shutdown SIGTERM SIGINT

# Start processor in background
echo "Starting processor..."
node lib/main.js &
processor_pid=$!

# Wait a bit for processor to initialize
sleep 5

# Start GraphQL server in background
echo "Starting GraphQL server on port ${GQL_PORT:-4001}..."
npx squid-graphql-server \
  --dumb-cache in-memory \
  --dumb-cache-ttl 1000 \
  --dumb-cache-size 100 \
  --dumb-cache-max-age 1000 &
graphql_pid=$!

echo "Indexer is running"
echo "Processor PID: $processor_pid"
echo "GraphQL PID: $graphql_pid"
echo "GraphQL URL: http://localhost:${GQL_PORT:-4001}/graphql"

# Wait for both processes
wait "$processor_pid" "$graphql_pid"
