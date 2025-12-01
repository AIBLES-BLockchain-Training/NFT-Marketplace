# Hướng Dẫn Deploy NFT Marketplace

Hướng dẫn này bao gồm việc deploy NFT Marketplace với:
- **Indexer (GraphQL Server)** → Google Cloud Platform (GCP)
- **Frontend (Next.js UI)** → Vercel

## Tổng Quan Kiến Trúc

```
┌─────────────────┐
│   Vercel        │
│   (Next.js UI)  │
│   Port: 3000    │
└────────┬────────┘
         │
         │ GraphQL API
         ▼
┌─────────────────┐      ┌──────────────┐
│   GCP           │      │  PostgreSQL  │
│   (Indexer)     │◄─────┤  (Cloud SQL) │
│   Port: 4001    │      └──────────────┘
└────────┬────────┘
         │
         │ RPC
         ▼
┌─────────────────┐
│  Ethereum       │
│  (Sepolia)      │
└─────────────────┘
```

---

## Phần 1: Deploy Indexer lên GCP

### Yêu Cầu

1. **Cài đặt Google Cloud SDK**
   ```bash
   # macOS
   brew install --cask google-cloud-sdk

   # Linux
   curl https://sdk.cloud.google.com | bash

   # Windows
   # Tải từ: https://cloud.google.com/sdk/docs/install

   # Kiểm tra cài đặt
   gcloud --version
   ```

2. **Đăng nhập vào GCP**
   ```bash
   gcloud auth login
   gcloud config set project PROJECT_ID_CUA_BAN
   ```

### Bước 1: Thiết Lập Cloud SQL (PostgreSQL)

```bash
# Tạo PostgreSQL instance
gcloud sql instances create nft-marketplace-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=MAT_KHAU_MANH_CUA_BAN

# Tạo database
gcloud sql databases create nft_marketplace \
  --instance=nft-marketplace-db

# Tạo user
gcloud sql users create indexer_user \
  --instance=nft-marketplace-db \
  --password=MAT_KHAU_USER_CUA_BAN
```

**Lưu lại thông tin:**
- Database connection name: `PROJECT_ID:REGION:INSTANCE_NAME`
- Database host (cho Cloud Run): `/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`

### Bước 2: Build và Push Docker Image

**LƯU Ý QUAN TRỌNG:** Build Docker từ thư mục GỐC của project (không phải trong packages/indexer)

```bash
# Di chuyển đến thư mục gốc project
cd /duong/dan/den/NFT-Marketplace

# Build Docker image (từ thư mục gốc!)
docker build -f packages/indexer/Dockerfile -t gcr.io/PROJECT_ID_CUA_BAN/nft-indexer:latest .

# Xác thực Docker với GCP
gcloud auth configure-docker

# Push image lên Google Container Registry
docker push gcr.io/PROJECT_ID_CUA_BAN/nft-indexer:latest
```

**Kiểm tra Docker build local trước:**
```bash
# Test build trước khi push
docker build -f packages/indexer/Dockerfile -t nft-indexer:test .

# Chạy thử local
docker run -p 4001:4001 --env-file packages/indexer/.env nft-indexer:test
```

### Bước 3: Deploy lên Cloud Run

```bash
gcloud run deploy nft-indexer \
  --image=gcr.io/PROJECT_ID_CUA_BAN/nft-indexer:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=4001 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=10 \
  --add-cloudsql-instances=PROJECT_ID_CUA_BAN:us-central1:nft-marketplace-db \
  --set-env-vars="DB_HOST=/cloudsql/PROJECT_ID_CUA_BAN:us-central1:nft-marketplace-db,\
DB_PORT=5432,\
DB_NAME=nft_marketplace,\
DB_USER=indexer_user,\
DB_PASS=MAT_KHAU_USER_CUA_BAN,\
GQL_PORT=4001,\
RPC_SEPOLIA_HTTP=https://sepolia.infura.io/v3/INFURA_KEY_CUA_BAN,\
PROCESSING_MODE=parallel,\
PERMISSIONS_CONTRACT=0xDiaChiPermissionsContractCuaBan,\
ROUTER_CONTRACT=0xDiaChiRouterContractCuaBan,\
LISTING_CONTRACT=0xDiaChiListingContractCuaBan,\
ADDRESS_PERMISSIONS=0xDiaChiPermissionsCuaBan,\
ADDRESS_EXTENSION_MANAGER=0xDiaChiExtensionManagerCuaBan,\
ADDRESS_AUCTION=0xDiaChiAuctionCuaBan,\
ADDRESS_OFFER=0xDiaChiOfferCuaBan,\
MORALIS_API_KEY=moralis_api_key_cua_ban,\
RARIBLE_API_KEY=rarible_api_key_cua_ban,\
RARIBLE_CHAIN_ID=SEPOLIA"
```

**Sau khi deploy, lưu lại Cloud Run URL:**
```
Service URL: https://nft-indexer-XXXXX-uc.a.run.app
GraphQL Endpoint: https://nft-indexer-XXXXX-uc.a.run.app/graphql
```

### Bước 4: Kiểm Tra Indexer

```bash
# Test GraphQL endpoint
curl https://nft-indexer-XXXXX-uc.a.run.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'
```

---

## Phần 2: Deploy Frontend lên Vercel

### Yêu Cầu

1. **Cài đặt Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Đăng nhập vào Vercel**
   ```bash
   vercel login
   ```

### Bước 1: Cấu Hình Biến Môi Trường

Tạo file `.env.production` trong `apps/app/`:

```bash
# apps/app/.env.production

# GraphQL Endpoint - SỬ DỤNG URL CLOUD RUN CỦA BẠN
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://nft-indexer-XXXXX-uc.a.run.app/graphql

# Cấu hình Network
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CHAIN_NAME=Sepolia

# Địa chỉ Smart Contract
NEXT_PUBLIC_PERMISSIONS_CONTRACT=0xDiaChiPermissionsContractCuaBan
NEXT_PUBLIC_EXTENSION_MANAGER_CONTRACT=0xDiaChiExtensionManagerContractCuaBan
NEXT_PUBLIC_LISTING_CONTRACT=0xDiaChiListingContractCuaBan
NEXT_PUBLIC_ROUTER_CONTRACT=0xDiaChiRouterContractCuaBan
NEXT_PUBLIC_OFFER_CONTRACT=0xDiaChiOfferContractCuaBan
NEXT_PUBLIC_AUCTION_CONTRACT=0xDiaChiAuctionContractCuaBan

# RPC Endpoint
NEXT_PUBLIC_RPC_ENDPOINT=https://sepolia.infura.io/v3/INFURA_KEY_CUA_BAN

# Moralis API
NEXT_PUBLIC_MORALIS_API_KEY=moralis_api_key_cua_ban

# Pinata IPFS
NEXT_PUBLIC_PINATA_API_KEY=pinata_api_key_cua_ban
NEXT_PUBLIC_PINATA_API_SECRET=pinata_api_secret_cua_ban
NEXT_PUBLIC_PINATA_JWT=pinata_jwt_cua_ban

# Rarible API (Chỉ dùng server-side)
RARIBLE_API_KEY=rarible_api_key_cua_ban

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=firebase_api_key_cua_ban
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ten-project-cua-ban.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=firebase-project-id-cua-ban
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ten-project-cua-ban.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=sender_id_cua_ban
NEXT_PUBLIC_FIREBASE_APP_ID=app_id_cua_ban
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=measurement_id_cua_ban
```

### Bước 2: Deploy lên Vercel

**Cách A: Qua Vercel CLI**

```bash
# Di chuyển đến thư mục app
cd apps/app

# Deploy production
vercel --prod

# Làm theo hướng dẫn:
# - Link tới project có sẵn hoặc tạo mới
# - Build command: nx build app --prod
# - Output directory: ../../dist/apps/app
# - Install command: yarn install
```

**Cách B: Qua Vercel Dashboard (Khuyến nghị)**

1. **Push lên GitHub**
   ```bash
   git add .
   git commit -m "feat: chuẩn bị deploy"
   git push origin main
   ```

2. **Import vào Vercel**
   - Truy cập https://vercel.com/new
   - Chọn GitHub repository của bạn
   - Framework Preset: **Next.js**
   - Root Directory: `apps/app`
   - Build Command: `cd ../.. && yarn nx build app --prod`
   - Output Directory: `../../dist/apps/app`
   - Install Command: `yarn install`

3. **Thêm Environment Variables trong Vercel Dashboard**
   - Vào Project Settings → Environment Variables
   - Thêm tất cả biến từ file `.env.production`
   - Đảm bảo đánh dấu `NEXT_PUBLIC_*` để hiển thị cho cả Build và Runtime

4. **Deploy**
   - Click "Deploy"
   - Đợi build hoàn thành

### Bước 3: Cấu Hình Custom Domain (Tùy chọn)

```bash
# Thêm domain qua CLI
vercel domains add domain-cua-ban.com

# Hoặc qua dashboard:
# Project Settings → Domains → Add Domain
```

### Bước 4: Kiểm Tra Frontend

Truy cập Vercel URL của bạn:
```
https://ten-app-cua-ban.vercel.app
```

Kiểm tra:
- ✅ Trang chủ load được
- ✅ Trang Collections hiển thị dữ liệu (từ GCP GraphQL)
- ✅ Kết nối ví hoạt động
- ✅ Console không có lỗi GraphQL

---

## Phần 3: Cấu Hình Sau Deploy

### Cập Nhật CORS trên Indexer (nếu cần)

Nếu gặp lỗi CORS, cập nhật Cloud Run service:

```bash
gcloud run services update nft-indexer \
  --region=us-central1 \
  --set-env-vars="CORS_ORIGIN=https://ten-app-cua-ban.vercel.app"
```

### Thiết Lập Monitoring

**GCP (Indexer):**
```bash
# Xem logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Thiết lập cảnh báo
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Indexer Error Rate" \
  --condition-threshold-value=0.1
```

**Vercel (Frontend):**
- Vào Project → Analytics
- Bật Web Vitals monitoring
- Thiết lập thông báo deployment trong Settings → Notifications

---

## Phần 4: Cấu Hình Theo Môi Trường

### Development (Phát triển)
```bash
# Indexer: PostgreSQL local
docker-compose -f packages/indexer/docker-compose.yaml up -d

# Frontend: Dev server local
yarn dev
```

### Staging (Thử nghiệm)
- Deploy Indexer lên Cloud Run với hậu tố `-staging`
- Deploy Frontend lên Vercel preview branch
- Sử dụng database instance riêng

### Production (Sản phẩm)
- Làm theo các bước deploy ở trên
- Bật auto-scaling trên Cloud Run
- Bật CDN trên Vercel (tự động)
- Bật database backups:
  ```bash
  gcloud sql backups create \
    --instance=nft-marketplace-db \
    --description="Backup thủ công"
  ```

---

## Xử Lý Sự Cố

### Vấn Đề Với Indexer

**Kết nối Database thất bại**
```bash
# Kiểm tra Cloud SQL connection
gcloud sql instances describe nft-marketplace-db

# Test kết nối từ Cloud Run
gcloud run services logs read nft-indexer --region=us-central1 --limit=50
```

**GraphQL không phản hồi**
```bash
# Kiểm tra trạng thái service
gcloud run services describe nft-indexer --region=us-central1

# Khởi động lại service
gcloud run services update nft-indexer --region=us-central1
```

### Vấn Đề Với Frontend

**GraphQL Endpoint không hoạt động**
- Kiểm tra `NEXT_PUBLIC_GRAPHQL_ENDPOINT` trỏ đúng Cloud Run URL
- Kiểm tra cài đặt CORS trên indexer
- Xác minh environment variables trong Vercel dashboard

**Build thất bại**
```bash
# Test build ở local
cd apps/app
npm run build

# Xem Vercel build logs
vercel logs URL_DEPLOYMENT_CUA_BAN
```

---

## Ước Tính Chi Phí

### GCP (Hàng tháng)
- Cloud Run (1 GB RAM, 1 CPU): ~$10-30
- Cloud SQL (db-f1-micro): ~$7-15
- Networking: ~$5
- **Tổng: ~$22-50/tháng**

### Vercel
- Hobby: Miễn phí (có giới hạn)
- Pro: $20/tháng (khuyến nghị cho production)

### Tổng Chi Phí Ước Tính: $22-70/tháng

---

## Checklist Bảo Mật

- [ ] Database sử dụng mật khẩu mạnh
- [ ] Cloud SQL có cấu hình authorized networks
- [ ] Environment variables không chứa secrets trong code
- [ ] CORS được cấu hình đúng cho production domain
- [ ] Firebase security rules được thiết lập đúng
- [ ] API keys bị hạn chế theo domain/IP cụ thể
- [ ] HTTPS đã bật (tự động trên Cloud Run & Vercel)
- [ ] Database backups được lên lịch định kỳ

---

## CI/CD Pipeline (Tùy chọn)

### GitHub Actions cho Auto-Deploy

Tạo file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy-indexer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          service_account_key: ${{ secrets.GCP_SA_KEY }}

      - name: Build và Push Docker
        run: |
          docker build -f packages/indexer/Dockerfile -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/nft-indexer:latest .
          gcloud auth configure-docker
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/nft-indexer:latest

      - name: Deploy lên Cloud Run
        run: |
          gcloud run deploy nft-indexer \
            --image=gcr.io/${{ secrets.GCP_PROJECT_ID }}/nft-indexer:latest \
            --region=us-central1 \
            --platform=managed

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Các Lệnh Thường Dùng

```bash
# Xem logs Indexer
gcloud run services logs read nft-indexer --region=us-central1 --limit=50

# Kết nối database
gcloud sql connect nft-marketplace-db --user=indexer_user

# Xem logs Vercel
vercel logs --follow

# Deploy lại indexer
gcloud run deploy nft-indexer --image=gcr.io/PROJECT_ID/nft-indexer:latest

# Deploy lại frontend
vercel --prod

# Rollback deployment (Vercel)
vercel rollback [DEPLOYMENT_URL]

# Xem danh sách deployments (Vercel)
vercel ls

# Xóa deployment cũ (Vercel)
vercel rm [DEPLOYMENT_URL]

# Xem trạng thái Cloud Run
gcloud run services list --platform managed

# Scale Cloud Run
gcloud run services update nft-indexer \
  --min-instances=0 \
  --max-instances=5 \
  --region=us-central1
```

---

## Tài Nguyên & Hỗ Trợ

- **Tài liệu GCP**: https://cloud.google.com/run/docs
- **Tài liệu Vercel**: https://vercel.com/docs
- **PostgreSQL trên Cloud SQL**: https://cloud.google.com/sql/docs/postgres
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Firebase Console**: https://console.firebase.google.com
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## Lưu Ý Quan Trọng

### Indexer (GCP)
1. **Docker Build Context**: Phải build từ thư mục GỐC project, không phải từ packages/indexer
2. **Database Connection**: Đảm bảo sử dụng Unix socket path `/cloudsql/...` thay vì IP khi kết nối từ Cloud Run
3. **Memory**: Nếu indexer bị crash do out of memory, tăng `--memory=2Gi`
4. **Cold Start**: Để giảm cold start time, dùng `--min-instances=1` (tốn phí hơn)
5. **Region**: Chọn region gần với users của bạn nhất
6. **Port**: GraphQL server chạy trên port 4001 (không phải 4000)

### Frontend (Vercel)
1. **Environment Variables**: Tất cả biến `NEXT_PUBLIC_*` đều exposed ra client-side
2. **Build Time**: Nếu build lâu, kiểm tra xem có cần optimize dependencies không
3. **Image Optimization**: Vercel tự động optimize images, không cần thêm config
4. **Caching**: Vercel tự động cache static assets và API responses

### Bảo Mật
1. **API Keys**: Không bao giờ commit API keys vào Git
2. **Database Password**: Sử dụng Secret Manager của GCP cho production
3. **CORS**: Chỉ cho phép domain production của bạn
4. **Rate Limiting**: Cân nhắc thêm rate limiting cho GraphQL API

---

## Quy Trình Deploy Từng Bước

### Lần Đầu Deploy

```bash
# 1. Tạo GCP project (nếu chưa có)
gcloud projects create nft-marketplace-prod --name="NFT Marketplace Production"
gcloud config set project nft-marketplace-prod

# 2. Enable APIs cần thiết
gcloud services enable run.googleapis.com
gcloud services enable sql-component.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable containerregistry.googleapis.com

# 3. Tạo database
gcloud sql instances create nft-marketplace-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_PASSWORD

gcloud sql databases create nft_marketplace --instance=nft-marketplace-db
gcloud sql users create indexer_user --instance=nft-marketplace-db --password=USER_PASSWORD

# 4. Build và deploy indexer
docker build -f packages/indexer/Dockerfile -t gcr.io/nft-marketplace-prod/nft-indexer:latest .
docker push gcr.io/nft-marketplace-prod/nft-indexer:latest
gcloud run deploy nft-indexer --image=gcr.io/nft-marketplace-prod/nft-indexer:latest ...

# 5. Lưu lại GraphQL URL
export GRAPHQL_URL=$(gcloud run services describe nft-indexer --region=us-central1 --format='value(status.url)')
echo "GraphQL Endpoint: $GRAPHQL_URL/graphql"

# 6. Deploy frontend
cd apps/app
# Cập nhật NEXT_PUBLIC_GRAPHQL_ENDPOINT trong Vercel dashboard
vercel --prod
```

### Deploy Lại (Update)

```bash
# Indexer
docker build -f packages/indexer/Dockerfile -t gcr.io/PROJECT_ID/nft-indexer:latest .
docker push gcr.io/PROJECT_ID/nft-indexer:latest
gcloud run deploy nft-indexer --image=gcr.io/PROJECT_ID/nft-indexer:latest --region=us-central1

# Frontend
vercel --prod
# Hoặc push lên GitHub (nếu đã setup auto-deploy)
```

---

**Tạo bởi:** Claude Code
**Cập nhật lần cuối:** 2025-01-18
**Ngôn ngữ:** Tiếng Việt
