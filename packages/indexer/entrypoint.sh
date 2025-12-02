#!/bin/sh
set -e

echo "Starting NFT Marketplace Indexer..."

# Wait for database to be ready
echo "Waiting for database connection..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
  echo "Database is not ready yet, waiting..."
  sleep 2
done
echo "Database is ready!"

# Apply database migrations
echo "Applying database migrations..."
npx squid-typeorm-migration apply
if [ $? -ne 0 ]; then
    echo "Migration failed! Exiting..."
    exit 1
fi
echo "Migrations completed successfully!"

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
