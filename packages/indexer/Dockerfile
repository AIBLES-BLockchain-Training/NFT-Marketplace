FROM node:20-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY ../../package*.json ./

RUN npm install 

COPY . .

RUN npx nx reset && npm run build
 
COPY packages/indexer/schema.graphql /app/schema.graphql
COPY packages/indexer/squid.yaml /app/squid.yaml
COPY packages/indexer/tsconfig.json /app/tsconfig.json

EXPOSE 4000

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
