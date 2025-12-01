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
     // === Các hàm tương tác lõi (User-facing) ===
    { selector: "0x172e9f7b", signature: "createAuction((address,uint256,uint256,address,uint256,uint256,uint256,uint256,uint256,uint256))" },
    { selector: "0x96b5a755", signature: "cancelAuction(uint256)" },
    { selector: "0x0858e5ad", signature: "bidInAuction(uint256,uint256)" },
    { selector: "0xebf05a62", signature: "collectAuctionPayout(uint256)" },
    { selector: "0x12090b22", signature: "collectAuctionToken(uint256)" },

    // === NFT Receiver callbacks ===
    { selector: "0x150b7a02", signature: "onERC721Received(address,address,uint256,bytes)" },
    { selector: "0xf23a6e61", signature: "onERC1155Received(address,address,uint256,uint256,bytes)" },
    { selector: "0xbc197c81", signature: "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)" },
    { selector: "0x01ffc9a7", signature: "supportsInterface(bytes4)" },

    // === Các hàm quản trị (Admin/Setter) ===
    { selector: "0x3db0f5c1", signature: "initializeAuction(address,address,address)" },
    { selector: "0xefdcd974", signature: "setFeeReceiver(address)" },
    { selector: "0xf9a6b221", signature: "setMinTimeAuction(uint256)" },
    { selector: "0xd183ce74", signature: "setPermissionsContract(address)" },
    { selector: "0xc0d78655", signature: "setRouter(address)" },
      
    // === Các hàm xem/đọc (View/Getter) ===
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
      name: "Auction",
      metadataURI: "",
      implementation: auctionAddress,
    },
    functions: functions.map(f => ({
      functionSelector: f.selector,
      functionSignature: f.signature
    }))
  };
}

async function getContracts() {
  const extensionManagerAddress = process.env['ADDRESS_EXTENSION_MANAGER'] || "";
  const auctionAddress = process.env['ADDRESS_AUCTION'] || "";

  if (!extensionManagerAddress || !auctionAddress) {
    throw new Error("Please set ADDRESS_EXTENSION_MANAGER and ADDRESS_AUCTION in your .env file");
  }

  const [signer] = await ethers.getSigners();
  const extensionManager = await ethers.getContractAt("ExtensionManager", extensionManagerAddress, signer);

  return { extensionManager, auctionAddress, signer };
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

async function addAuctionExtension(extensionManager: any, auctionAddress: string) {
  console.log("Adding Auction extension...");
  const extension = createAuctionExtension(auctionAddress);
  console.log("Extension details:");
  console.log("- Name:", extension.metadata.name);
  console.log("- Implementation:", extension.metadata.implementation);
  console.log("- Functions count:", extension.functions.length);
  const extensionObj = {
    metadata: {
      name: extension.metadata.name,
      metadataURI: extension.metadata.metadataURI,
      implementation: extension.metadata.implementation
    },
    functions: extension.functions.map(f => ({
      functionSelector: f.functionSelector,
      functionSignature: f.functionSignature
    }))
  };



  console.log("Submitting transaction to add extension...");
  const tx = await extensionManager.addExtension(extensionObj);
  console.log("Transaction submitted. Hash:", tx.hash);
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log("Extension added! Gas used:", receipt.gasUsed.toString());
}

async function verifyExtension(extensionManager: any, auctionAddress: string) {
  console.log("Verifying the added Auction extension...");
  const extensions = await extensionManager.getAllExtensions();
  const auction = extensions.find(
    (ext: any) => ext.metadata.name === "Auction"
  );

  if(auction) {
    console.log("Auction extension verified successfully at address:", auction.metadata.implementation);
    console.log("- Implementation:", auction.metadata.implementation);
    console.log("- Functions:", auction.functions.length);
  } else {
    console.log("Auction extension not found!");
    return false;
  }
}

async function main() {
  const delayMs = 1000;
  try {
    const { extensionManager, auctionAddress, signer } = await getContracts();
    console.log("Signer address:", signer.address);
    console.log("Extension Manager address:", await extensionManager.getAddress());
    console.log("Auction contract address:", auctionAddress);

    console.log("Checking extension manager owner...");

    try {
      const owner = await extensionManager['owner']();
      console.log("Extension Manager owner:", owner);
      console.log("Is signer the owner?", owner.toLowerCase() === signer.address.toLowerCase());

      if(owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.error("Signer is not the owner of the Extension Manager. Exiting.");
        process.exit(1);
      }
    } catch(ownerError) {
      console.error("Failed to fetch owner:", ownerError);
    }

    const functionsToCall = [
      () => checkCurrentExtensions(extensionManager),
      () => addAuctionExtension(extensionManager, auctionAddress),
      () => verifyExtension(extensionManager, auctionAddress)
    ];

    for (const func of functionsToCall) {
      await func();
      console.log(`Waiting for ${delayMs} ms before next operation...`);
      await delay(delayMs);
    }

    console.log("Script execution completed successfully.");

  } catch (error) {
    console.error("Error in script execution:", error);
    process.exit(1);
  }
}

if(require.main === module) {
  main().catch(console.error);
}