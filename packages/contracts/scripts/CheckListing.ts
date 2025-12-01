import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const ROUTER_ADDRESS = process.env.ADDRESS_ROUTER;
  const LISTING_ID = 9;

  if (!ROUTER_ADDRESS) {
    throw new Error("ADDRESS_ROUTER not found in .env");
  }

  console.log("\n======================================================================");
  console.log("🔍 CHECKING LISTING #" + LISTING_ID);
  console.log("======================================================================\n");

  const [signer] = await ethers.getSigners();
  console.log(`👤 Signer: ${signer.address}\n`);

  // Get Router contract with Listing ABI
  const ListingABI = [
    "function getListing(uint256 listingId) external view returns (tuple(address owner, address assetContract, uint256 tokenId, uint256 quantity, address currency, uint256 pricePerToken, uint128 startTimestamp, uint128 endTimestamp, bool reserved, uint8 status, uint8 tokenType))",
    "function getAllListings() external view returns (tuple(uint256 listingId, address owner, address assetContract, uint256 tokenId, uint256 quantity, address currency, uint256 pricePerToken, uint128 startTimestamp, uint128 endTimestamp, bool reserved, uint8 status, uint8 tokenType)[])"
  ];

  const router = new ethers.Contract(ROUTER_ADDRESS, ListingABI, signer);

  try {
    console.log("📋 Getting listing data...");
    const listing = await router.getListing(LISTING_ID);

    console.log("\n✅ Listing found:");
    console.log(`   Owner: ${listing.owner}`);
    console.log(`   Asset Contract: ${listing.assetContract}`);
    console.log(`   Token ID: ${listing.tokenId}`);
    console.log(`   Quantity: ${listing.quantity}`);
    console.log(`   Currency: ${listing.currency}`);
    console.log(`   Price Per Token: ${ethers.formatEther(listing.pricePerToken)} ETH`);
    console.log(`   Start: ${new Date(Number(listing.startTimestamp) * 1000).toISOString()}`);
    console.log(`   End: ${new Date(Number(listing.endTimestamp) * 1000).toISOString()}`);
    console.log(`   Reserved: ${listing.reserved}`);
    console.log(`   Status: ${listing.status}`);
    console.log(`   Token Type: ${listing.tokenType === 0 ? 'ERC721' : 'ERC1155'}`);

    console.log("\n📊 Getting all listings...");
    const allListings = await router.getAllListings();
    console.log(`   Total listings: ${allListings.length}`);

    allListings.forEach((l: any, i: number) => {
      console.log(`   [${i}] ID: ${l.listingId}, Currency: ${l.currency}, Status: ${l.status}`);
    });

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.data) {
      console.error("   Error data:", error.data);
    }
  }

  console.log("\n======================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
