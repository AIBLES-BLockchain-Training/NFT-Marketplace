# 📋 IMPLEMENTATION GUIDE: Moralis + Dynamic Collections

## 🎯 MỤC TIÊU

1. **Profile Page**: Dùng Moralis API để hiển thị NFTs của user (real-time)
2. **Collections**: Chỉ hiển thị collections có activity trên marketplace
3. **Auto-create**: Tự động tạo collection khi user list/auction NFT lần đầu

---

## ✅ NHỮNG GÌ ĐÃ LÀM (COMPLETED)

### 1. ✅ Tạo Moralis Client
**File**: `apps/app/src/lib/moralis/client.ts`

**Features**:
- `getNFTsByAddress()`: Lấy tất cả NFTs của wallet
- `getNFTMetadata()`: Lấy metadata của 1 NFT cụ thể
- `getCollectionMetadata()`: Lấy metadata của collection

### 2. ✅ Update Profile Page
**File**: `apps/app/src/app/profile/[address]/page.tsx`

**Changes**:
- ❌ Xóa GraphQL query `GET_USER_NFTS_QUERY`
- ✅ Dùng `getNFTsByAddress()` từ Moralis
- ✅ Transform Moralis NFTs sang app format
- ✅ Real-time data từ blockchain

### 3. ✅ Tạo Metadata Utils cho Indexer
**File**: `packages/indexer/src/utils/metadata.ts`

**Features**:
- `fetchCollectionMetadata()`: Fetch name, symbol, contractURI từ blockchain
- `detectContractType()`: Detect ERC721 vs ERC1155
- IPFS gateway support

---

## 🔧 NHỮNG GÌ CẦN LÀM (TODO)

### **STEP 1: Setup Moralis API Key**

#### A. Đăng ký Moralis
1. Truy cập: https://moralis.io/
2. Tạo tài khoản miễn phí
3. Dashboard → Get API Key

#### B. Thêm vào `.env.local`
```env
# apps/app/.env.local
NEXT_PUBLIC_MORALIS_API_KEY=your_moralis_api_key_here
```

---

### **STEP 2: Update Indexer để Auto-create Collections**

#### A. Cài packages cần thiết
```bash
cd packages/indexer
yarn add ethers
```

#### B. Sửa `listing.processor.ts`

**File**: `packages/indexer/src/processors/listing.processor.ts`

**Thay đổi function `getOrCreateCollection`**:

```typescript
import { fetchCollectionMetadata, detectContractType } from '../utils/metadata'
import { ethers } from 'ethers'

// Thêm provider vào đầu file
const provider = new ethers.JsonRpcProvider(
  process.env.RPC_ENDPOINT || process.env.RPC_SEPOLIA_HTTP
)

async function getOrCreateCollection(
  contractAddress: string,
  creator?: Subject
): Promise<Collection> {
  const collectionId = contractAddress.toLowerCase()

  if (collectionMap.has(collectionId)) {
    return collectionMap.get(collectionId)!
  }

  let collection = await ctx.store.get(Collection, collectionId)

  if (!collection) {
    // ✅ FETCH METADATA TỪ BLOCKCHAIN
    console.log(`🔍 Fetching metadata for new collection: ${contractAddress}`)

    const [metadata, contractType] = await Promise.all([
      fetchCollectionMetadata(contractAddress, provider),
      detectContractType(contractAddress, provider)
    ])

    collection = new Collection({
      id: collectionId,
      name: metadata.name,           // ✅ Real name from contract
      symbol: metadata.symbol,       // ✅ Real symbol
      description: metadata.description,
      logoUrl: metadata.image,       // ✅ Logo from contractURI
      bannerUrl: metadata.banner_image,
      collectionType: contractType === 'ERC721'
        ? CollectionType.ERC721
        : CollectionType.ERC1155,
      creator: creator,
      totalSupply: BigInt(0),
      floorPrice: undefined,
      createdAt: new Date(),
      nfts: [],
      traits: [],
      traitStats: []
    })

    console.log(`✅ Collection created: ${metadata.name} (${metadata.symbol})`)
  }

  collectionMap.set(collectionId, collection)
  return collection
}
```

**Kết quả**:
- ✅ Khi user tạo listing lần đầu → Collection tự động được tạo
- ✅ Collection có metadata đầy đủ (name, symbol, logo)
- ✅ Không cần admin whitelist trước

---

### **STEP 3: Simplify Permissions (Optional)**

Vì giờ không cần whitelist NFT contracts trước, có thể simplify permissions:

#### Option 1: Giữ nguyên (Recommended)
- Vẫn dùng `NFT_ROLE` để kiểm soát NFT contracts nào được phép
- Admin vẫn có thể ban contracts
- Security tốt hơn

#### Option 2: Remove NFT_ROLE
- Cho phép list bất kỳ NFT nào
- Đơn giản hơn nhưng ít kiểm soát

**Recommendation**: Giữ nguyên, chỉ cần update logic:

**File**: `packages/contracts/src/Listing.sol`

```solidity
// Thay đổi modifier
modifier onlyWhitelistedNFT(address assetContract) {
    // Option 1: Check if NFT_ROLE granted (strict)
    // _checkNFTPermission(assetContract);

    // Option 2: Auto-approve all NFTs (permissionless)
    // Skip check
    _;
}
```

---

### **STEP 4: Update Create Page để dùng Moralis**

**File**: `apps/app/src/app/create/page.tsx`

**Thay đổi**:

```typescript
import { getNFTsByAddress } from '../../lib/moralis/client';

// Trong component
const loadUserNFTs = async () => {
  if (!address) return;

  try {
    setIsLoading(true);

    // ✅ Fetch from Moralis instead of GraphQL
    const moralisNFTs = await getNFTsByAddress(address);

    // Transform to app format
    const transformedNFTs = moralisNFTs.map(nft => ({
      id: `${nft.token_address}_${nft.token_id}`,
      tokenId: nft.token_id,
      name: nft.normalized_metadata?.name || `${nft.symbol} #${nft.token_id}`,
      imageUrl: nft.normalized_metadata?.image,
      collection: {
        id: nft.token_address.toLowerCase(),
        name: nft.name,
        symbol: nft.symbol,
        collectionType: nft.contract_type,
      }
    }));

    setUserNFTs(transformedNFTs);
  } catch (error) {
    console.error('Failed to load NFTs:', error);
    toast.error('Failed to load your NFTs');
  } finally {
    setIsLoading(false);
  }
};
```

---

### **STEP 5: Update Asset Detail Page**

**File**: `apps/app/src/app/asset/[id]/page.tsx`

**Hybrid approach**: Combine Moralis + GraphQL

```typescript
const loadNFTData = async () => {
  const [contractAddress, tokenId] = id.split('_');

  // ✅ Get NFT ownership from Moralis (real-time)
  const moralisNFT = await getNFTMetadata(contractAddress, tokenId);

  // ✅ Get marketplace data from GraphQL (listings, auctions, offers)
  const marketplaceData = await graphqlClient.query(GET_NFT_BY_ID_QUERY, {
    id: `${contractAddress.toLowerCase()}-${tokenId}`
  });

  // Merge data
  setNFT({
    ...transformMoralisNFT(moralisNFT),
    listings: marketplaceData.data?.nft?.listings || [],
    auctions: marketplaceData.data?.nft?.auctions || [],
    offers: marketplaceData.data?.nft?.offers || [],
  });
};
```

---

## 🎨 UI/UX IMPROVEMENTS

### **Collections Page**

**Thêm filters**:
```typescript
// apps/app/src/app/collections/page.tsx

const [sortBy, setSortBy] = useState<'recent' | 'volume' | 'floor'>('recent');

const sortedCollections = useMemo(() => {
  switch (sortBy) {
    case 'recent':
      return [...collections].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case 'floor':
      return [...collections].sort((a, b) =>
        (Number(a.floorPrice) || 0) - (Number(b.floorPrice) || 0)
      );
    default:
      return collections;
  }
}, [collections, sortBy]);
```

**Hiển thị stats**:
```tsx
<div className="grid grid-cols-3 gap-4">
  <div>
    <p className="text-xs text-gray-400">Items</p>
    <p className="text-lg font-bold">{collection.totalSupply}</p>
  </div>
  <div>
    <p className="text-xs text-gray-400">Floor Price</p>
    <p className="text-lg font-bold">
      {collection.floorPrice ? `${formatEther(collection.floorPrice)} ETH` : '-'}
    </p>
  </div>
  <div>
    <p className="text-xs text-gray-400">Type</p>
    <Badge>{collection.collectionType}</Badge>
  </div>
</div>
```

---

## 📊 DATA FLOW SUMMARY

### **Before (Old Flow)**
```
Admin whitelist NFT contract
  ↓
Collection created in indexer
  ↓
Users can list NFTs
  ↓
Profile shows NFTs from indexer (TokenOwnership)
```

### **After (New Flow)**
```
User owns NFT (any contract)
  ↓
Profile fetches from Moralis API (real-time)
  ↓
User creates listing
  ↓
Indexer auto-creates Collection (with metadata)
  ↓
Collection visible in /collections
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Get Moralis API key
- [ ] Add `NEXT_PUBLIC_MORALIS_API_KEY` to `.env.local`
- [ ] Update indexer `listing.processor.ts`
- [ ] Update create page to use Moralis
- [ ] Update asset detail page (hybrid approach)
- [ ] Test profile page with Moralis
- [ ] Test collection auto-creation
- [ ] Deploy indexer with new logic
- [ ] Deploy frontend with Moralis integration

---

## 🎯 BENEFITS

### ✅ Profile Page
- Real-time ownership data
- Không cần index ownership
- Support tất cả NFTs (không cần whitelist)
- Faster load time

### ✅ Collections
- Chỉ show collections có activity
- Metadata đầy đủ (name, symbol, logo)
- Organic growth
- Không spam collections

### ✅ Marketplace
- User-friendly: List bất kỳ NFT nào
- Auto-discover collections
- Cleaner UX

---

## ⚠️ NOTES

### Rate Limits (Moralis Free Tier)
- 40,000 requests/month
- ~1,333 requests/day
- Đủ cho development & small production

### Caching Strategy
Consider caching Moralis responses:
```typescript
// Simple in-memory cache
const nftCache = new Map<string, { data: any, timestamp: number }>();

async function getCachedNFTs(address: string) {
  const cacheKey = address.toLowerCase();
  const cached = nftCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < 60000) { // 1 min cache
    return cached.data;
  }

  const fresh = await getNFTsByAddress(address);
  nftCache.set(cacheKey, { data: fresh, timestamp: Date.now() });
  return fresh;
}
```

### Fallback Strategy
If Moralis fails, fallback to GraphQL:
```typescript
try {
  const nfts = await getNFTsByAddress(address);
  return nfts;
} catch (error) {
  console.warn('Moralis failed, falling back to GraphQL');
  const result = await graphqlClient.query(GET_USER_NFTS_QUERY, { address });
  return result.data?.tokenOwnerships || [];
}
```

---

## 📝 TESTING

### Test Profile Page
```bash
# Start frontend
yarn nx dev app

# Navigate to
http://localhost:3000/profile/0xYOUR_ADDRESS

# Should show NFTs from Moralis
```

### Test Collection Auto-creation
```bash
# 1. List an NFT from new collection
# 2. Check indexer logs:
# "🔍 Fetching metadata for new collection: 0x..."
# "✅ Collection created: Bored Ape (BAYC)"

# 3. Navigate to /collections
# Should see new collection
```

---

## 🆘 TROUBLESHOOTING

### Moralis API not working
- Check API key in `.env.local`
- Verify network (sepolia)
- Check rate limits

### Collection metadata not loading
- Check RPC endpoint in indexer
- Verify contract supports `name()`, `symbol()`
- Check IPFS gateway timeout

### Profile shows empty
- Verify address has NFTs on Sepolia
- Check Moralis dashboard for API calls
- Try testnet faucet NFTs
