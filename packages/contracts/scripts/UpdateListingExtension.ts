import { ethers } from "hardhat";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Data structures
interface ListingFunction {
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
// IMPORTANT: Use canonical signatures (with tuples expanded) to match ethers.js encoding
function getListingFunctions(): ListingFunction[] {
  return [
    { selector: "0x746415b5", signature: "createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))" },
    { selector: "0x704232dc", signature: "buyFromListing(uint256,address,uint256,address,uint256)" },
    { selector: "0x305a67a8", signature: "cancelListing(uint256)" },
    { selector: "0x07b67758", signature: "updateListing(uint256,(address,uint256,uint256,address,uint256,uint128,uint128,bool))" },
    { selector: "0xc5275fb0", signature: "getAllListings(uint256,uint256)" },
    { selector: "0x31654b4d", signature: "getAllValidListings(uint256,uint256)" },
    { selector: "0x107a274a", signature: "getListing(uint256)" },
    { selector: "0xc78b616c", signature: "totalListings()" },
    { selector: "0x99c194c4", signature: "initializeListing(address,address,address)" },
    { selector: "0x51d5f97c", signature: "setCurrencyFee(address,uint256)" },
    { selector: "0x164e68de", signature: "withdrawFees(address)" },
    { selector: "0x48dd77df", signature: "approveBuyerForListing(uint256,address,bool)" },
    { selector: "0xea8f9a3c", signature: "approveCurrencyForListing(uint256,address,uint256)" },
    { selector: "0x0d2b4dd3", signature: "setRouter(address)" },
    { selector: "0xf0f44260", signature: "router()" },
    { selector: "0x3fa615b0", signature: "feeReceiver()" }
  ];
}

// Helper functions
function createListingExtension(listingAddress: string): Extension {
  const functions = getListingFunctions();
  return {
    metadata: {
      name: "Listing",
      metadataURI: "",
      implementation: listingAddress
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
  const newListingAddress = process.env['ADDRESS_LISTING'] || "";

  if (!extensionManagerAddress) {
    throw new Error("Please set ADDRESS_EXTENSION_MANAGER in .env");
  }

  if (!newListingAddress) {
    throw new Error("Please set ADDRESS_LISTING in .env with the newly deployed Listing contract address");
  }

  const [signer] = await ethers.getSigners();
  const extensionManager = await ethers.getContractAt("ExtensionManager", extensionManagerAddress, signer);

  return { extensionManager, newListingAddress, signer };
}

async function checkCurrentExtensions(extensionManager: any) {
  console.log("\n📋 Checking current extensions...");
  const extensions = await extensionManager.getAllExtensions();
  console.log(`   Found ${extensions.length} extension(s)`);

  for (const ext of extensions) {
    console.log(`   - ${ext.metadata.name} → ${ext.metadata.implementation}`);
  }

  return extensions;
}

async function getOldListingAddress(extensionManager: any): Promise<string | null> {
  try {
    const extension = await extensionManager.getExtension("Listing");
    return extension.metadata.implementation;
  } catch (error) {
    console.log("⚠️  Listing extension does not exist yet");
    return null;
  }
}

async function replaceListingExtension(extensionManager: any, newListingAddress: string, oldListingAddress: string | null) {
  console.log("\n🔄 Upgrading Listing extension...");
  console.log(`   Old implementation: ${oldListingAddress || "N/A"}`);
  console.log(`   New implementation: ${newListingAddress}`);

  const extension = createListingExtension(newListingAddress);

  console.log("\n📦 Extension details:");
  console.log(`   - Name: ${extension.metadata.name}`);
  console.log(`   - Implementation: ${extension.metadata.implementation}`);
  console.log(`   - Functions count: ${extension.functions.length}`);

  const extensionTuple = [
    [extension.metadata.name, extension.metadata.metadataURI, extension.metadata.implementation],
    extension.functions.map(f => [f.functionSelector, f.functionSignature])
  ];

  console.log("\n📤 Sending replaceExtension transaction...");
  const tx = await extensionManager.replaceExtension(extensionTuple);
  console.log(`   Transaction hash: ${tx.hash}`);

  console.log("⏳ Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log(`   ✅ Confirmed! Gas used: ${receipt.gasUsed.toString()}`);

  return receipt;
}

async function verifyUpgrade(extensionManager: any, expectedAddress: string) {
  console.log("\n🔍 Verifying upgrade...");

  const extension = await extensionManager.getExtension("Listing");
  const currentImpl = extension.metadata.implementation;

  console.log(`   Current implementation: ${currentImpl}`);
  console.log(`   Expected implementation: ${expectedAddress}`);

  if (currentImpl.toLowerCase() === expectedAddress.toLowerCase()) {
    console.log("   ✅ Implementation address matches!");
    console.log(`   ✅ Functions registered: ${extension.functions.length}`);
    return true;
  } else {
    console.log("   ❌ Implementation address mismatch!");
    return false;
  }
}

async function main() {
  const delayBetweenCalls = 1000;

  try {
    console.log("\n" + "=".repeat(70));
    console.log("🚀 LISTING EXTENSION UPGRADE SCRIPT");
    console.log("=".repeat(70));

    const { extensionManager, newListingAddress, signer } = await getContracts();

    console.log("\n👤 Signer:", signer.address);
    console.log("📍 ExtensionManager:", await extensionManager.getAddress());
    console.log("📍 New Listing Implementation:", newListingAddress);

    console.log("\n🔐 Checking ExtensionManager ownership...");
    try {
      const owner = await extensionManager['owner']();
      console.log(`   Owner: ${owner}`);
      console.log(`   Is signer the owner? ${owner.toLowerCase() === signer.address.toLowerCase() ? "✅ Yes" : "❌ No"}`);

      if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.error("\n❌ ERROR: Signer is not the owner of ExtensionManager!");
        console.error("   Please use the owner account or transfer ownership first.");
        process.exit(1);
      }
    } catch (ownerError) {
      console.log("   ⚠️  Could not check ownership:", ownerError);
    }

    await delay(delayBetweenCalls);
    await checkCurrentExtensions(extensionManager);

    await delay(delayBetweenCalls);
    const oldListingAddress = await getOldListingAddress(extensionManager);

    await delay(delayBetweenCalls);
    await replaceListingExtension(extensionManager, newListingAddress, oldListingAddress);

    await delay(delayBetweenCalls);
    const success = await verifyUpgrade(extensionManager, newListingAddress);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
