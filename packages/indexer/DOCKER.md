# Docker Setup cho NFT Marketplace Indexer

## Tổng Quan

Indexer sử dụng Subsquid framework để index dữ liệu từ Ethereum blockchain và cung cấp GraphQL API.

## Cấu Trúc

```
NFT-Marketplace/                  <- Build từ đây!
├── package.json
├── nx.json
├── tsconfig.base.json
└── packages/
    └── indexer/
        ├── Dockerfile             <- Dockerfile
        ├── entrypoint.sh          <- Script khởi động
        ├── schema.graphql         <- GraphQL schema
        ├── squid.yaml             <- Subsquid config
        ├── src/                   <- Source code
        └── db/                    <- Migrations
```

## Build Docker Image

### Bước 1: Di chuyển đến thư mục gốc

```bash
cd /path/to/NFT-Marketplace
```

### Bước 2: Build image

```bash
docker build -f packages/indexer/Dockerfile -t nft-indexer:latest .
```

**LƯU Ý:**

- Phải build từ thư mục GỐC (NFT-Marketplace/)
- KHÔNG build từ packages/indexer/

### Bước 3: Kiểm tra image

```bash
docker images | grep nft-indexer
```

## Chạy Local với Docker

### Sử dụng Docker Run

```bash
docker run -p 4001:4001 \
  --env-file packages/indexer/.env \
  nft-indexer:latest
```

### Sử dụng Docker Compose

Tạo file `docker-compose.indexer.yml` ở thư mục gốc:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: indexer_user
      POSTGRES_PASSWORD: indexer_pass
      POSTGRES_DB: nft_marketplace
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  indexer:
    build:
      context: .
      dockerfile: packages/indexer/Dockerfile
    ports:
      - '4001:4001'
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: nft_marketplace
      DB_USER: indexer_user
      DB_PASS: indexer_pass
      GQL_PORT: 4001
      RPC_SEPOLIA_HTTP: ${RPC_SEPOLIA_HTTP}
      PERMISSIONS_CONTRACT: ${PERMISSIONS_CONTRACT}
      ROUTER_CONTRACT: ${ROUTER_CONTRACT}
      LISTING_CONTRACT: ${LISTING_CONTRACT}
      ADDRESS_PERMISSIONS: ${ADDRESS_PERMISSIONS}
      ADDRESS_EXTENSION_MANAGER: ${ADDRESS_EXTENSION_MANAGER}
      ADDRESS_AUCTION: ${ADDRESS_AUCTION}
      ADDRESS_OFFER: ${ADDRESS_OFFER}
      MORALIS_API_KEY: ${MORALIS_API_KEY}
      RARIBLE_API_KEY: ${RARIBLE_API_KEY}
    depends_on:
      - postgres

volumes:
  postgres_data:
```

Chạy:

```bash
docker-compose -f docker-compose.indexer.yml up
```

## Environment Variables

Các biến môi trường cần thiết:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nft_marketplace
DB_USER=indexer_user
DB_PASS=your_password

# GraphQL Server
GQL_PORT=4001

# Blockchain RPC
RPC_SEPOLIA_HTTP=https://sepolia.infura.io/v3/YOUR_KEY

# Smart Contracts
PERMISSIONS_CONTRACT=0x...
ROUTER_CONTRACT=0x...
LISTING_CONTRACT=0x...
ADDRESS_PERMISSIONS=0x...
ADDRESS_EXTENSION_MANAGER=0x...
ADDRESS_AUCTION=0x...
ADDRESS_OFFER=0x...

# APIs
MORALIS_API_KEY=your_key
RARIBLE_API_KEY=your_key
RARIBLE_CHAIN_ID=SEPOLIA
```

## Deploy lên GCP

### Build và Push

```bash
# Tag cho GCP
docker build -f packages/indexer/Dockerfile -t gcr.io/PROJECT_ID/nft-indexer:latest .

# Authenticate
gcloud auth configure-docker

# Push
docker push gcr.io/PROJECT_ID/nft-indexer:latest
```

### Deploy lên Cloud Run

```bash
gcloud run deploy nft-indexer \
  --image=gcr.io/PROJECT_ID/nft-indexer:latest \
  --platform=managed \
  --region=us-central1 \
  --port=4001 \
  --memory=1Gi \
  --set-env-vars="..."
```

Chi tiết xem file `DEPLOYMENT.md` ở thư mục gốc.

## Troubleshooting

### Lỗi: "COPY failed: file not found"

**Nguyên nhân:** Build từ sai thư mục

**Giải pháp:**

```bash
# SAI - Đừng làm thế này
cd packages/indexer
docker build -t nft-indexer .

# ĐÚNG - Làm thế này
cd /path/to/NFT-Marketplace
docker build -f packages/indexer/Dockerfile -t nft-indexer .
```

### Lỗi: "Cannot connect to database"

**Kiểm tra:**

1. Database đã chạy chưa?
2. DB_HOST đúng chưa? (localhost cho local, /cloudsql/... cho Cloud Run)
3. DB credentials đúng chưa?

```bash
# Test database connection
docker exec -it <container_id> sh
npx typeorm query "SELECT 1"
```

### Lỗi: "Port 4001 already in use"

**Giải pháp:**

```bash
# Tìm process đang dùng port 4001
lsof -i :4001

# Hoặc dùng port khác
docker run -p 4002:4001 nft-indexer
```

### GraphQL server không khởi động

**Kiểm tra logs:**

```bash
docker logs <container_id>
```

**Kiểm tra migrations:**

```bash
docker exec -it <container_id> sh
ls -la db/migrations/
```

## Cấu Trúc Dockerfile

### Stage 1: Builder

- Cài đặt dependencies với yarn
- Build TypeScript thành JavaScript
- Tạo folder `lib/`

### Stage 2: Production

- Copy compiled code từ builder
- Copy node_modules
- Copy schema và config files
- Chạy entrypoint.sh

**LƯU Ý:** Dockerfile sử dụng yarn, đảm bảo đã có `yarn.lock` và `.yarnrc` trong project

## Entrypoint Script

Script `entrypoint.sh` thực hiện:

1. Apply database migrations
2. Start processor (index blockchain data)
3. Start GraphQL server (port 4001)
4. Handle graceful shutdown

## Development vs Production

### Development

```bash
# Local dev (không dùng Docker)
cd packages/indexer
yarn install
npx squid-typeorm-migration apply
yarn run process:dev  # Terminal 1
yarn run serve        # Terminal 2
```

### Production

```bash
# Dùng Docker
docker-compose up
```

## Health Check

Container có health check tự động:

- Interval: 30 giây
- Timeout: 10 giây
- Retries: 3

Kiểm tra manual:

```bash
curl http://localhost:4001/graphql -H "Content-Type: application/json" -d '{"query":"{ __schema { types { name } } }"}'
```

## Logs

```bash
# Xem logs real-time
docker logs -f <container_id>

# Xem 100 dòng cuối
docker logs --tail 100 <container_id>

# Lọc logs theo pattern
docker logs <container_id> 2>&1 | grep ERROR
```

## Performance

### Tối ưu build time

- Dùng multi-stage build (đã implement)
- Cache node_modules layer
- Build artifact size: ~200-300MB

### Tối ưu runtime

- Memory: 512MB - 1GB
- CPU: 1 core đủ cho hầu hết use cases
- GraphQL cache: In-memory với TTL 1000ms

## Bảo Mật

1. Không commit `.env` file
2. Sử dụng secrets manager cho production
3. Chạy container với non-root user (TODO)
4. Scan image cho vulnerabilities:
   ```bash
   docker scan nft-indexer:latest
   ```

## Tài Liệu Tham Khảo

- Subsquid Docs: https://docs.subsquid.io
- Docker Best Practices: https://docs.docker.com/develop/dev-best-practices/
- Cloud Run Docs: https://cloud.google.com/run/docs
