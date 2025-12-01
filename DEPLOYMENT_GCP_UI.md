# 🚀 Deploy NFT Marketplace Indexer lên GCP qua UI

Hướng dẫn deploy Indexer lên Google Cloud Platform sử dụng giao diện web (không cần terminal).

---

## 📋 Chuẩn Bị

### Yêu Cầu
- ✅ Google Account
- ✅ Credit Card (để verify, free tier $300)
- ✅ Docker image đã build thành công local
- ✅ Contract addresses đã deploy

### Thông Tin Cần Thiết
- **Project Name:** NFT Marketplace
- **Database:** PostgreSQL
- **Region:** us-central1
- **Port:** 4001

---

## 🏗️ BƯỚC 1: Tạo GCP Project

### 1.1 Truy Cập GCP Console
- Đi tới: https://console.cloud.google.com
- Đăng nhập bằng Google Account

### 1.2 Tạo Project Mới
1. Click **Select a project** (top bar)
2. Click **NEW PROJECT**
3. Điền thông tin:
   - **Project name:** `NFT Marketplace`
   - **Project ID:** `nft-marketplace-prod` (hoặc tự sinh)
   - **Location:** No organization
4. Click **CREATE**

### 1.3 Enable Billing
1. **Navigation menu** → **Billing**
2. **Link a billing account**
3. Nhập thông tin credit card
4. **Free tier $300** sẽ được kích hoạt

### 1.4 Enable APIs
1. **Navigation menu** → **APIs & Services** → **Enabled APIs & services**
2. Click **+ ENABLE APIS AND SERVICES**
3. Enable các APIs sau:
   - **Cloud Run API**
   - **Cloud SQL Admin API** 
   - **Container Registry API**
   - **Compute Engine API**

---

## 💾 BƯỚC 2: Tạo Cloud SQL Database

### 2.1 Tạo PostgreSQL Instance
1. **Navigation menu** → **SQL**
2. Click **CREATE INSTANCE**
3. Chọn **PostgreSQL**

### 2.2 Configure Instance
**Instance Info:**
- **Instance ID:** `nft-marketplace-db`
- **Password:** `[Tạo password mạnh]`
- **Database version:** PostgreSQL 15
- **Region:** us-central1

**Machine Configuration:**
- **Machine type:** Shared core → 1 vCPU, 0.614 GB
- **Storage:** SSD, 10 GB
- **Backup:** Automated backups enabled

### 2.3 Network Configuration  
- **Public IP:** Enable
- **Authorized networks:** 0.0.0.0/0 (tạm thời)
- **Private IP:** Disable (để đơn giản)

### 2.4 Tạo Database
1. Click **CREATE INSTANCE** (5-10 phút)
2. Sau khi tạo xong, vào instance
3. **Databases** tab → **CREATE DATABASE**
4. **Database name:** `nft_marketplace`

### 2.5 Tạo User  
1. **Users** tab → **ADD USER ACCOUNT**
2. **Username:** `indexer_user`
3. **Password:** `[Password mạnh]`
4. Click **ADD**

### 2.6 Lưu Connection Info
**Ghi lại thông tin:**
```
Connection name: PROJECT_ID:us-central1:nft-marketplace-db
Public IP: [IP hiển thị]
Database: nft_marketplace
Username: indexer_user  
Password: [Password bạn đặt]
```

---

## 🐳 BƯỚC 3: Push Docker Image lên Container Registry

### 3.1 Mở Cloud Shell
1. Click icon **`>_`** (Activate Cloud Shell) ở top bar
2. Terminal sẽ mở trong browser

### 3.2 Upload Project Code
```bash
# Option 1: Clone từ GitHub (khuyến nghị)
git clone https://github.com/YOUR_USERNAME/NFT-Marketplace.git
cd NFT-Marketplace

# Option 2: Upload files (nếu chưa có trên GitHub)
# Sử dụng Cloud Shell Editor để upload
```

### 3.3 Build và Push Docker Image
```bash
# Set project ID
gcloud config set project nft-marketplace-prod

# Enable Docker authentication
gcloud auth configure-docker

# Build Docker image
docker build -f packages/indexer/Dockerfile -t gcr.io/nft-marketplace-prod/nft-indexer:latest .

# Push to Google Container Registry
docker push gcr.io/nft-marketplace-prod/nft-indexer:latest
```

---

## ☁️ BƯỚC 4: Deploy lên Cloud Run

### 4.1 Truy Cập Cloud Run
1. **Navigation menu** → **Cloud Run**
2. Click **CREATE SERVICE**

### 4.2 Configure Service
**Service Info:**
- **Service name:** `nft-indexer`
- **Region:** us-central1 
- **CPU allocation:** CPU only allocated during request processing

**Container:**
- **Container image URL:** `gcr.io/nft-marketplace-prod/nft-indexer:latest`
- **Port:** 4001

### 4.3 Configure Advanced Settings

**Variables & Secrets:**
Click **VARIABLES & SECRETS** tab, thêm environment variables:

```bash
DB_HOST=/cloudsql/nft-marketplace-prod:us-central1:nft-marketplace-db
DB_PORT=5432
DB_NAME=nft_marketplace
DB_USER=indexer_user
DB_PASS=[Password của bạn]
GQL_PORT=4001
RPC_SEPOLIA_HTTP=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PROCESSING_MODE=parallel

# Contract Addresses (từ .env.example)
PERMISSIONS_CONTRACT=0xCD7eb6E3884777EE74B0A2e0d6abBc9E71919Ebc
ROUTER_CONTRACT=0x1279e1f267968eC70841dFa26Fbab60F65CdF717
LISTING_CONTRACT=0x59E47516E027726699918F910D334731fCA15051
ADDRESS_PERMISSIONS=0xCD7eb6E3884777EE74B0A2e0d6abBc9E71919Ebc
ADDRESS_EXTENSION_MANAGER=0x6D0883Bf083F1789A92EfBAF4188AC0D6A01607c
ADDRESS_AUCTION=0x28568B5EfbD9084471E86C5b72e26CF449Da49Bd
ADDRESS_OFFER=0x1A15b4b73D3FaE9384872967C2803b85A5344802

# API Keys
MORALIS_API_KEY=your_moralis_api_key
RARIBLE_API_KEY=your_rarible_api_key  
RARIBLE_CHAIN_ID=SEPOLIA
```

**Connections:**
- **Cloud SQL connections:** Select `nft-marketplace-db`

**Capacity:**
- **Memory:** 1 GiB
- **CPU:** 1
- **Max requests per instance:** 80
- **Min instances:** 0
- **Max instances:** 10

**Authentication:**
- **Allow unauthenticated invocations:** ✅ Checked

### 4.4 Deploy Service
1. Click **CREATE** 
2. Đợi deployment hoàn thành (3-5 phút)
3. **Service URL** sẽ được hiển thị

---

## ✅ BƯỚC 5: Kiểm Tra Deployment

### 5.1 Test GraphQL Endpoint
1. Copy **Service URL** (vd: `https://nft-indexer-xxx-uc.a.run.app`)
2. Mở browser và truy cập: `[SERVICE_URL]/graphql`
3. Nên thấy GraphQL Playground interface

### 5.2 Test API Query
Trong Cloud Shell:
```bash
curl https://nft-indexer-xxx-uc.a.run.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'
```

### 5.3 Kiểm Tra Logs
1. **Cloud Run** → Service `nft-indexer` 
2. **LOGS** tab
3. Xem logs khởi động và operation

---

## 🔧 BƯỚC 6: Monitoring & Management

### 6.1 Setup Monitoring
1. **Navigation menu** → **Monitoring**
2. **Dashboards** → **Cloud Run**
3. Monitor requests, latency, errors

### 6.2 Setup Alerting
1. **Monitoring** → **Alerting**
2. **CREATE POLICY**
3. Configure alerts cho:
   - High error rate (>5%)
   - High latency (>10s)  
   - Low availability (<95%)

### 6.3 Database Monitoring
1. **SQL** → Instance `nft-marketplace-db`
2. **Monitoring** tab
3. Monitor CPU, memory, connections

---

## 🔐 BƯỚC 7: Security & Optimization

### 7.1 Database Security
1. **SQL** → Instance → **Connections**
2. **Authorized networks:** Remove 0.0.0.0/0
3. Add only Cloud Run IP ranges

### 7.2 IAM Security
1. **IAM & Admin** → **IAM**
2. Review permissions
3. Remove unnecessary access

### 7.3 Enable Backup
1. **SQL** → Instance → **Backups**
2. **Automated backups:** Enable
3. **Backup window:** 03:00 UTC
4. **Retained backups:** 7 days

---

## 💰 Chi Phí Ước Tính

### Cloud Run (monthly)
- **CPU:** 1 vCPU = ~$10-40 (depending on usage)
- **Memory:** 1 GiB = included
- **Requests:** Free tier: 2M requests/month

### Cloud SQL (monthly)
- **db-f1-micro:** ~$7.67
- **Storage:** 10GB = ~$1.70
- **Network:** ~$0.12/GB

### Container Registry
- **Storage:** <1GB = ~$0.02

**Tổng chi phí:** ~$20-50/month

---

## 🚨 Troubleshooting

### Lỗi "Service Unavailable"
1. **Cloud Run** → Service → **LOGS**
2. Kiểm tra container startup errors
3. Verify environment variables

### Lỗi Database Connection
1. Check Cloud SQL connection name format
2. Verify DB credentials
3. Check Cloud SQL authorized networks

### Lỗi Out of Memory
1. **Cloud Run** → Service → **EDIT & DEPLOY NEW REVISION**
2. Increase memory: 2 GiB
3. Monitor memory usage

### Lỗi Cold Start Timeout
1. Set **Min instances** = 1 (tốn phí hơn)
2. Hoặc optimize application startup time

---

## 🔄 Updates & Maintenance

### Deploy Updates
1. Build new Docker image với tag mới
2. Push to Container Registry
3. **Cloud Run** → Service → **EDIT & DEPLOY NEW REVISION**
4. Update container image URL
5. **DEPLOY**

### Database Maintenance  
1. **SQL** → Instance → **Maintenance**
2. Schedule maintenance windows
3. Enable automatic minor version updates

---

## 🎯 Next Steps

1. **Lưu Service URL:** Dùng cho frontend
2. **Setup Custom Domain:** (optional)
3. **Deploy Frontend:** Theo `DEPLOYMENT_VERCEL_UI.md`
4. **End-to-end Testing:** Frontend + Indexer
5. **Production Monitoring:** Setup alerts

---

## 📞 Support

- **GCP Documentation:** https://cloud.google.com/docs
- **Cloud Run Docs:** https://cloud.google.com/run/docs  
- **Cloud SQL Docs:** https://cloud.google.com/sql/docs

**🎉 Indexer deployment hoàn thành! Service URL là endpoint GraphQL cho frontend.**