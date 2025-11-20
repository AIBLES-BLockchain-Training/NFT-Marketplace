# Deployment Checklist

Checklist đầy đủ cho việc deploy NFT Marketplace lên Production.

---

## Trước Khi Deploy

### 1. Chuẩn Bị Môi Trường Local

- [ ] Đã cài đặt dependencies
  ```bash
  yarn install
  ```

- [ ] Có file `yarn.lock` trong project

- [ ] Build thành công local
  ```bash
  cd packages/indexer
  npx tsc
  ls -la lib/  # Kiểm tra output
  ```

- [ ] Test Indexer local
  ```bash
  # Terminal 1: Start processor
  cd packages/indexer
  npx squid-typeorm-migration apply
  node lib/main.js

  # Terminal 2: Start GraphQL
  npx squid-graphql-server
  ```

- [ ] Test UI local
  ```bash
  yarn nx serve app
  ```

---

## GCP Setup

### 2. Tạo Google Cloud Project

- [ ] Đã tạo GCP project
  ```bash
  gcloud projects create PROJECT_ID --name="NFT Marketplace"
  gcloud config set project PROJECT_ID
  ```

- [ ] Enable billing cho project (cần để sử dụng Cloud Run)

- [ ] Enable APIs cần thiết
  ```bash
  gcloud services enable run.googleapis.com
  gcloud services enable sql-component.googleapis.com
  gcloud services enable sqladmin.googleapis.com
  gcloud services enable containerregistry.googleapis.com
  ```

### 3. Tạo Cloud SQL Database

- [ ] Tạo PostgreSQL instance
  ```bash
  gcloud sql instances create nft-marketplace-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --root-password=YOUR_ROOT_PASSWORD
  ```

- [ ] Tạo database
  ```bash
  gcloud sql databases create nft_marketplace \
    --instance=nft-marketplace-db
  ```

- [ ] Tạo user
  ```bash
  gcloud sql users create indexer_user \
    --instance=nft-marketplace-db \
    --password=YOUR_USER_PASSWORD
  ```

- [ ] Lưu lại connection name
  ```bash
  gcloud sql instances describe nft-marketplace-db --format="value(connectionName)"
  # Ví dụ: project-id:us-central1:nft-marketplace-db
  ```

### 4. Tạo Service Account cho GitHub Actions

- [ ] Tạo service account
  ```bash
  gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions"
  ```

- [ ] Gán quyền Cloud Run Admin
  ```bash
  gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"
  ```

- [ ] Gán quyền Storage Admin (cho GCR)
  ```bash
  gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"
  ```

- [ ] Gán quyền Service Account User
  ```bash
  gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
  ```

- [ ] Export service account key
  ```bash
  gcloud iam service-accounts keys create key.json \
    --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com
  ```

---

## GitHub Configuration

### 5. Cấu Hình GitHub Secrets

Tham khảo file `GITHUB_SECRETS.md` để biết chi tiết.

- [ ] `GCP_PROJECT_ID`
- [ ] `GCP_SA_KEY`
- [ ] `CLOUD_SQL_CONNECTION_NAME`
- [ ] `DB_HOST`
- [ ] `DB_PORT`
- [ ] `DB_NAME`
- [ ] `DB_USER`
- [ ] `DB_PASS`
- [ ] `RPC_SEPOLIA_HTTP`
- [ ] `PERMISSIONS_CONTRACT`
- [ ] `ROUTER_CONTRACT`
- [ ] `LISTING_CONTRACT`
- [ ] `ADDRESS_PERMISSIONS`
- [ ] `ADDRESS_EXTENSION_MANAGER`
- [ ] `ADDRESS_AUCTION`
- [ ] `ADDRESS_OFFER`
- [ ] `MORALIS_API_KEY`
- [ ] `RARIBLE_API_KEY`

### 6. Test Docker Build

- [ ] Build Docker image local
  ```bash
  docker build -f packages/indexer/Dockerfile -t test-indexer .
  ```

- [ ] Kiểm tra image size
  ```bash
  docker images | grep test-indexer
  # Nên < 500MB
  ```

- [ ] Test run container
  ```bash
  docker run -p 4001:4001 --env-file packages/indexer/.env test-indexer
  # Kiểm tra GraphQL: http://localhost:4001/graphql
  ```

---

## Deploy Indexer

### 7. Deploy lên GCP Cloud Run

**Option A: Qua GitHub Actions (Khuyến nghị)**

- [ ] Push code lên GitHub branch `main`
  ```bash
  git add .
  git commit -m "feat: ready for deployment"
  git push origin main
  ```

- [ ] Vào GitHub Actions tab, chờ workflow chạy

- [ ] Kiểm tra logs, đảm bảo không có lỗi

- [ ] Lưu lại Cloud Run URL từ logs

**Option B: Deploy thủ công**

- [ ] Build và push image
  ```bash
  docker build -f packages/indexer/Dockerfile -t gcr.io/PROJECT_ID/nft-indexer:latest .
  gcloud auth configure-docker
  docker push gcr.io/PROJECT_ID/nft-indexer:latest
  ```

- [ ] Deploy lên Cloud Run (xem DEPLOYMENT.md để biết chi tiết command)

### 8. Kiểm Tra Indexer

- [ ] Test GraphQL endpoint
  ```bash
  curl https://YOUR_CLOUD_RUN_URL/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __schema { types { name } } }"}'
  ```

- [ ] Kiểm tra logs
  ```bash
  gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=nft-indexer" --limit 50
  ```

- [ ] Kiểm tra database có dữ liệu
  ```bash
  gcloud sql connect nft-marketplace-db --user=indexer_user
  # Trong psql:
  \c nft_marketplace
  SELECT COUNT(*) FROM subject;
  ```

---

## Deploy UI

### 9. Chuẩn Bị Frontend

- [ ] Cập nhật `.env.production` trong `apps/app/`
  ```bash
  NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://YOUR_CLOUD_RUN_URL/graphql
  NEXT_PUBLIC_CHAIN_ID=11155111
  # ... (xem DEPLOYMENT.md)
  ```

- [ ] Test build local
  ```bash
  yarn nx build app --prod
  ```

### 10. Deploy lên Vercel

- [ ] Push code lên GitHub
  ```bash
  git add .
  git commit -m "feat: add production env"
  git push origin main
  ```

- [ ] Import vào Vercel
  - Vào https://vercel.com/new
  - Chọn repository
  - Root Directory: `apps/app`
  - Build Command: `cd ../.. && yarn nx build app --prod`
  - Output Directory: `../../dist/apps/app`
  - Install Command: `yarn install`

- [ ] Thêm Environment Variables trong Vercel dashboard
  - Copy tất cả từ `.env.production`
  - Đảm bảo `NEXT_PUBLIC_*` có sẵn cho Build

- [ ] Deploy

### 11. Kiểm Tra UI

- [ ] Trang chủ load được
- [ ] Collections hiển thị dữ liệu
- [ ] Wallet connect hoạt động
- [ ] GraphQL queries thành công (check Network tab)
- [ ] Không có lỗi trong Console

---

## Post-Deploy

### 12. Monitoring & Logging

- [ ] Thiết lập Cloud Run monitoring
  ```bash
  # Xem metrics
  gcloud monitoring dashboards list
  ```

- [ ] Thiết lập alerting cho errors
  ```bash
  gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="Indexer High Error Rate"
  ```

- [ ] Enable Vercel Analytics
  - Vào Project Settings → Analytics
  - Bật Web Vitals

### 13. Backup

- [ ] Enable Cloud SQL backups
  ```bash
  gcloud sql backups create \
    --instance=nft-marketplace-db \
    --description="Initial production backup"
  ```

- [ ] Thiết lập automated backups
  ```bash
  gcloud sql instances patch nft-marketplace-db \
    --backup-start-time=03:00
  ```

### 14. Domain & SSL (Tùy chọn)

- [ ] Thêm custom domain cho Vercel
  - Project Settings → Domains → Add Domain

- [ ] Thêm custom domain cho Cloud Run
  ```bash
  gcloud run domain-mappings create \
    --service=nft-indexer \
    --domain=api.your-domain.com \
    --region=us-central1
  ```

---

## Verification

### 15. End-to-End Test

- [ ] Tạo NFT collection mới
- [ ] Tạo listing
- [ ] Tạo auction
- [ ] Tạo offer
- [ ] Accept offer
- [ ] Kiểm tra indexer có index events
- [ ] Kiểm tra UI hiển thị đúng dữ liệu

---

## Rollback Plan

Nếu có vấn đề:

- [ ] Rollback Cloud Run
  ```bash
  # List revisions
  gcloud run revisions list --service=nft-indexer --region=us-central1

  # Rollback
  gcloud run services update-traffic nft-indexer \
    --to-revisions=PREVIOUS_REVISION=100 \
    --region=us-central1
  ```

- [ ] Rollback Vercel
  - Vào Deployments tab
  - Chọn deployment cũ
  - Click "Promote to Production"

---

## Chi Phí Dự Kiến

- **Cloud SQL (db-f1-micro):** ~$7.67/tháng
- **Cloud Run (1GB RAM, 1 CPU):** ~$10-40/tháng (tùy traffic)
- **Cloud Storage (GCR):** ~$0.02/GB
- **Vercel:** Free tier (hoặc $20/tháng cho Pro)

**Tổng:** ~$22-70/tháng

---

## Support

Nếu gặp vấn đề:
1. Kiểm tra logs trên Cloud Run
2. Kiểm tra logs trên Vercel
3. Xem file `DEPLOYMENT.md` và `GITHUB_SECRETS.md`
4. Kiểm tra GitHub Issues

---

## Hoàn Thành

Chúc mừng! NFT Marketplace đã được deploy thành công.

- Indexer URL: https://YOUR_CLOUD_RUN_URL/graphql
- Frontend URL: https://YOUR_VERCEL_URL
