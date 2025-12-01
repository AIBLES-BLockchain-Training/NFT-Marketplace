import { ethers } from "hardhat";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Data structures
interface AuctionFunction {
 selector: string;
 signature: string;
}

interface Extension {
 metadata: {
  name: string;
  metadataURI: string;
  implementation: string;
 };
 functions: {
  functionSelector: string;
  functionSignature: string;
 }[];
}

// Configuration
function getAuctionFunctions(): AuctionFunction[] {
return [
  { selector: "0x172e9f7b", signature: "createAuction((address,uint256,uint256,address,uint256,uint256,uint256,uint256,uint256,uint256))" },
  { selector: "0x96b5a755", signature: "cancelAuction(uint256)" },
  { selector: "0x0858e5ad", signature: "bidInAuction(uint256,uint256)" },
  { selector: "0xebf05a62", signature: "collectAuctionPayout(uint256)" },
  { selector: "0x12090b22", signature: "collectAuctionToken(uint256)" },

  { selector: "0x150b7a02", signature: "onERC721Received(address,address,uint256,bytes)" },
  { selector: "0xf23a6e61", signature: "onERC1155Received(address,address,uint256,uint256,bytes)" },
  { selector: "0xbc197c81", signature: "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)" },
  { selector: "0x01ffc9a7", signature: "supportsInterface(bytes4)" },

  { selector: "0x3db0f5c1", signature: "initializeAuction(address,address,address)" },
  { selector: "0xefdcd974", signature: "setFeeReceiver(address)" },
  { selector: "0xf9a6b221", signature: "setMinTimeAuction(uint256)" },
  { selector: "0xd183ce74", signature: "setPermissionsContract(address)" },
  { selector: "0xc0d78655", signature: "setRouter(address)" },

  { selector: "0xc291537c", signature: "getAllAuctions(uint256,uint256)" },
  { selector: "0x7b063801", signature: "getAllValidAuctions(uint256,uint256)" },
  { selector: "0x78bd7935", signature: "getAuction(uint256)" },
  { selector: "0x16002f4a", signature: "totalAuctions()" },
  { selector: "0xb0f479a1", signature: "getRouter()" },
  { selector: "0xe8a35392", signature: "getFeeReceiver()" },
  { selector: "0x964623dd", signature: "getPermissionsContract()" },
  { selector: "0x0b9d3578", signature: "getMinTimeAuction()" },
  { selector: "0x8e9dafdb", signature: "getAccumulatedFee(address)" }
];
}

// Helper functions
function createAuctionExtension(auctionAddress: string): Extension {
 const functions = getAuctionFunctions();
 return {
  metadata: {
   name: "Auction", // Đã đổi tên
   metadataURI: "", // Có thể thêm URI metadata của bạn ở đây
   implementation: auctionAddress
  },
  functions: functions.map(f => ({
   functionSelector: f.selector,
   functionSignature: f.signature
  }))
 };
}

// Main operations
async function getContracts() {
 const extensionManagerAddress = process.env['ADDRESS_EXTENSION_MANAGER'] || "";
 const newAuctionAddress = process.env['ADDRESS_AUCTION'] || ""; // Đổi tên biến

 if (!extensionManagerAddress) {
  throw new Error("Please set ADDRESS_EXTENSION_MANAGER in .env");
 }

 if (!newAuctionAddress) { // Đổi thông báo lỗi
  throw new Error("Please set ADDRESS_AUCTION in .env with the newly deployed Auction contract address");
 }

 const [signer] = await ethers.getSigners();
 const extensionManager = await ethers.getContractAt("ExtensionManager", extensionManagerAddress, signer);

 return { extensionManager, newAuctionAddress, signer }; // Đổi tên biến trả về
}

async function checkCurrentExtensions(extensionManager: any) {
 console.log("\n📋 Checking current extensions...");
 const extensions = await extensionManager.getAllExtensions();
 console.log(`  Found ${extensions.length} extension(s)`);

 for (const ext of extensions) {
  console.log(`  - ${ext.metadata.name} → ${ext.metadata.implementation}`);
 }

 return extensions;
}

async function getOldAuctionAddress(extensionManager: any): Promise<string | null> { // Đổi tên hàm
 try {
  const extension = await extensionManager.getExtension("Auction"); // Đổi "Listing" -> "Auction"
  return extension.metadata.implementation;
 } catch (error) {
  console.log("⚠️ Auction extension does not exist yet"); // Đổi log
  return null;
 }
}

async function replaceAuctionExtension(extensionManager: any, newAuctionAddress: string, oldAuctionAddress: string | null) { // Đổi tên hàm
 console.log("\n🔄 Upgrading Auction extension..."); // Đổi log
 console.log(`  Old implementation: ${oldAuctionAddress || "N/A"}`);
 console.log(`  New implementation: ${newAuctionAddress}`);

 const extension = createAuctionExtension(newAuctionAddress); // Gọi hàm createAuctionExtension

 console.log("\n📦 Extension details:");
 console.log(`  - Name: ${extension.metadata.name}`);
 console.log(`  - Implementation: ${extension.metadata.implementation}`);
 console.log(`  - Functions count: ${extension.functions.length}`);

 const extensionTuple = [
  [extension.metadata.name, extension.metadata.metadataURI, extension.metadata.implementation],
  extension.functions.map(f => [f.functionSelector, f.functionSignature])
 ];

 console.log("\n📤 Sending replaceExtension transaction...");
 const tx = await extensionManager.replaceExtension(extensionTuple);
 console.log(`  Transaction hash: ${tx.hash}`);

 console.log("⏳ Waiting for confirmation...");
 const receipt = await tx.wait();
 console.log(`  ✅ Confirmed! Gas used: ${receipt.gasUsed.toString()}`);

 return receipt;
}

async function verifyAuctionUpgrade(extensionManager: any, expectedAddress: string) { // Đổi tên hàm
 console.log("\n🔍 Verifying upgrade...");

 const extension = await extensionManager.getExtension("Auction"); // Đổi "Listing" -> "Auction"
 const currentImpl = extension.metadata.implementation;

 console.log(`  Current implementation: ${currentImpl}`);
 console.log(`  Expected implementation: ${expectedAddress}`);

 if (currentImpl.toLowerCase() === expectedAddress.toLowerCase()) {
  console.log("  ✅ Implementation address matches!");
  console.log(`  ✅ Functions registered: ${extension.functions.length}`);
  return true;
 } else {
  console.log("  ❌ Implementation address mismatch!");
  return false;
 }
}

async function main() {
 const delayBetweenCalls = 1000;

 try {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 AUCTION EXTENSION UPGRADE SCRIPT"); // Đổi tiêu đề
  console.log("=".repeat(70));

  const { extensionManager, newAuctionAddress, signer } = await getContracts(); // Đổi tên biến

  console.log("\n👤 Signer:", signer.address);
  console.log("📍 ExtensionManager:", await extensionManager.getAddress());
  console.log("📍 New Auction Implementation:", newAuctionAddress); // Đổi log

  console.log("\n🔐 Checking ExtensionManager ownership...");
  try {
   const owner = await extensionManager['owner']();
   console.log(`  Owner: ${owner}`);
   console.log(`  Is signer the owner? ${owner.toLowerCase() === signer.address.toLowerCase() ? "✅ Yes" : "❌ No"}`);

   if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error("\n❌ ERROR: Signer is not the owner of ExtensionManager!");
    console.error("  Please use the owner account or transfer ownership first.");
    process.exit(1);
   }
  } catch (ownerError) {
   console.log("  ⚠️ Could not check ownership:", ownerError);
  }

  await delay(delayBetweenCalls);
  await checkCurrentExtensions(extensionManager);

  await delay(delayBetweenCalls);
  const oldAuctionAddress = await getOldAuctionAddress(extensionManager); // Đổi tên hàm

  await delay(delayBetweenCalls);
  await replaceAuctionExtension(extensionManager, newAuctionAddress, oldAuctionAddress); // Đổi tên hàm

  await delay(delayBetweenCalls);
  const success = await verifyAuctionUpgrade(extensionManager, newAuctionAddress); // Đổi tên hàm
 } catch (error: any) {
  console.error("\n❌ Error:", error.message || error);
  if (error.reason) {
   console.error("  Reason:", error.reason);
  }
  process.exit(1);
 }
}

if (require.main === module) {
 main().catch(console.error);
}