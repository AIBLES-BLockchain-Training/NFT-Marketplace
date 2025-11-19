# GitHub Secrets Configuration

Hướng dẫn cấu hình GitHub Secrets cho CI/CD deployment.

## Cách Thêm Secrets

1. Truy cập repository trên GitHub
2. Vào **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Nhập tên và giá trị cho mỗi secret dưới đây

---

## Secrets Cần Thiết

### GCP Authentication

#### `GCP_PROJECT_ID`
- **Mô tả:** Google Cloud Project ID
- **Cách lấy:**
  ```bash
  gcloud config get-value project
  ```
- **Ví dụ:** `nft-marketplace-123456`

#### `GCP_SA_KEY`
- **Mô tả:** Service Account Key (JSON format)
- **Cách tạo:**
  ```bash
  # Tạo service account
  gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions"

  # Gán quyền
  gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

  gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

  gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

  # Export key
  gcloud iam service-accounts keys create key.json \
    --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com

  # Copy nội dung file key.json vào secret
  cat key.json
  ```

---

### Database Configuration

#### `CLOUD_SQL_CONNECTION_NAME`
- **Mô tả:** Cloud SQL connection name
- **Format:** `PROJECT_ID:REGION:INSTANCE_NAME`
- **Cách lấy:**
  ```bash
  gcloud sql instances describe INSTANCE_NAME --format="value(connectionName)"
  ```
- **Ví dụ:** `nft-marketplace-123456:us-central1:nft-marketplace-db`

#### `DB_HOST`
- **Mô tả:** Database host cho Cloud Run
- **Format:** `/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME`
- **Ví dụ:** `/cloudsql/nft-marketplace-123456:us-central1:nft-marketplace-db`

#### `DB_PORT`
- **Giá trị:** `5432`

#### `DB_NAME`
- **Mô tả:** Database name
- **Ví dụ:** `nft_marketplace`

#### `DB_USER`
- **Mô tả:** Database username
- **Ví dụ:** `indexer_user`

#### `DB_PASS`
- **Mô tả:** Database password
- **Cách tạo:**
  ```bash
  # Tạo password mạnh
  openssl rand -base64 32
  ```

---

### Blockchain Configuration

#### `RPC_SEPOLIA_HTTP`
- **Mô tả:** Ethereum Sepolia RPC endpoint
- **Ví dụ:**
  - Infura: `https://sepolia.infura.io/v3/YOUR_API_KEY`
  - Alchemy: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
  - Public: `https://rpc.sepolia.org`

---

### Smart Contract Addresses

#### `PERMISSIONS_CONTRACT`
- **Mô tả:** Permissions contract address
- **Ví dụ:** `0xCD7eb6E3884777EE74B0A2e0d6abBc9E71919Ebc`

#### `ROUTER_CONTRACT`
- **Mô tả:** Router contract address
- **Ví dụ:** `0x1279e1f267968eC70841dFa26Fbab60F65CdF717`

#### `LISTING_CONTRACT`
- **Mô tả:** Listing contract address
- **Ví dụ:** `0x59E47516E027726699918F910D334731fCA15051`

#### `ADDRESS_PERMISSIONS`
- **Mô tả:** Permissions address (giống PERMISSIONS_CONTRACT)
- **Ví dụ:** `0xCD7eb6E3884777EE74B0A2e0d6abBc9E71919Ebc`

#### `ADDRESS_EXTENSION_MANAGER`
- **Mô tả:** Extension Manager address
- **Ví dụ:** `0x6D0883Bf083F1789A92EfBAF4188AC0D6A01607c`

#### `ADDRESS_AUCTION`
- **Mô tả:** Auction contract address
- **Ví dụ:** `0x28568B5EfbD9084471E86C5b72e26CF449Da49Bd`

#### `ADDRESS_OFFER`
- **Mô tả:** Offer contract address
- **Ví dụ:** `0x1A15b4b73D3FaE9384872967C2803b85A5344802`

---

### External API Keys

#### `MORALIS_API_KEY`
- **Mô tả:** Moralis API key cho NFT metadata
- **Cách lấy:** https://admin.moralis.io/settings

#### `RARIBLE_API_KEY`
- **Mô tả:** Rarible API key
- **Cách lấy:** https://docs.rarible.org/reference/authentication

---

## Kiểm Tra Secrets

Sau khi thêm tất cả secrets, kiểm tra bằng cách:

1. Vào **Actions** tab trên GitHub
2. Chọn workflow **Deploy Indexer to GCP Cloud Run**
3. Click **Run workflow** → **Run workflow**
4. Theo dõi logs để đảm bảo không có lỗi về secrets

---

## Bảo Mật

- Không bao giờ commit secrets vào Git
- Không share secrets qua chat/email
- Rotate secrets định kỳ (mỗi 3-6 tháng)
- Sử dụng least privilege principle cho service accounts
- Enable audit logging trên GCP để theo dõi access

---

## Troubleshooting

### Lỗi: "Permission denied"
- Kiểm tra service account có đủ roles
- Kiểm tra `GCP_SA_KEY` có đúng format JSON

### Lỗi: "Cloud SQL connection failed"
- Kiểm tra `CLOUD_SQL_CONNECTION_NAME` đúng format
- Kiểm tra service account có role `cloudsql.client`

### Lỗi: "Secret not found"
- Kiểm tra tên secret khớp với workflow
- Secrets phân biệt HOA/thường

---

## Tham Khảo

- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GCP Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Cloud Run Authentication](https://cloud.google.com/run/docs/authenticating/overview)
