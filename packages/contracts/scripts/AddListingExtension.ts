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
    { selector: "0x6cf8745d", signature: "initializeListing(address,address)" },
    { selector: "0x51d5f97c", signature: "setCurrencyFee(address,uint256)" },
    { selector: "0x164e68de", signature: "withdrawFees(address)" },
    { selector: "0x48dd77df", signature: "approveBuyerForListing(uint256,address,bool)" },
    { selector: "0xea8f9a3c", signature: "approveCurrencyForListing(uint256,address,uint256)" },
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
  const listingAddress = process.env['ADDRESS_LISTING'] || "";
  
  if (!extensionManagerAddress || !listingAddress) {
    throw new Error("Please set ADDRESS_EXTENSION_MANAGER and ADDRESS_LISTING environment variables");
  }
  
  const [signer] = await ethers.getSigners();
  const extensionManager = await ethers.getContractAt("ExtensionManager", extensionManagerAddress, signer);
  
  return { extensionManager, listingAddress, signer };
}

async function checkCurrentExtensions(extensionManager: any) {
  console.log("Checking current extensions...");
  const extensions = await extensionManager.getAllExtensions();
  console.log("Current extensions count:", extensions.length);
  
  for (const ext of extensions) {
    console.log(`- ${ext.metadata.name} at ${ext.metadata.implementation}`);
  }
  
  return extensions;
}

async function addListingExtension(extensionManager: any, listingAddress: string) {
  console.log("Adding Listing extension...");
  const extension = createListingExtension(listingAddress);
  
  console.log("Extension details:");
  console.log("- Name:", extension.metadata.name);
  console.log("- Implementation:", extension.metadata.implementation);
  console.log("- Functions count:", extension.functions.length);
  
  const extensionTuple = [
    [extension.metadata.name, extension.metadata.metadataURI, extension.metadata.implementation],
    extension.functions.map(f => [f.functionSelector, f.functionSignature])
  ];
  
  console.log("Sending transaction with tuple format...");
  const tx = await extensionManager.addExtension(extensionTuple);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Extension added! Gas used:", receipt.gasUsed.toString());
}

async function verifyExtension(extensionManager: any, listingAddress: string) {
  console.log("Verifying Listing extension...");
  
  const extensions = await extensionManager.getAllExtensions();
  const listing = extensions.find(
    (ext: any) => ext.metadata.name === "Listing"
  );
  
  if (listing) {
    console.log("Listing extension verified:");
    console.log("- Implementation:", listing.metadata.implementation);
    console.log("- Functions:", listing.functions.length);
    return true;
  } else {
    console.log("WARNING: Listing extension not found!");
    return false;
  }
}

async function main() {
  const delayBetweenCalls = 1000;
  
  try {
    const { extensionManager, listingAddress, signer } = await getContracts();
    console.log("Using signer:", signer.address);
    console.log("ExtensionManager address:", await extensionManager.getAddress());
    console.log("Listing implementation:", listingAddress);
    
    console.log("\nChecking ExtensionManager ownership...");
    try {
      const owner = await extensionManager['owner']();
      console.log("ExtensionManager owner:", owner);
      console.log("Is signer the owner?", owner.toLowerCase() === signer.address.toLowerCase());
      
      if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.error("ERROR: Signer is not the owner of ExtensionManager!");
        console.error("Please use the owner account or transfer ownership first.");
        process.exit(1);
      }
    } catch (ownerError) {
      console.log("Could not check ownership:", ownerError);
    }
    
    const functionsToCall = [
      () => checkCurrentExtensions(extensionManager),
      () => addListingExtension(extensionManager, listingAddress),
      () => verifyExtension(extensionManager, listingAddress)
    ];
    
    for (const fn of functionsToCall) {
      await fn();
      await delay(delayBetweenCalls);
    }
    
    console.log("\nSetup complete!");
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}