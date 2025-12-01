import { ethers } from "hardhat";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Data structures
interface OfferFunction {
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
function getOfferFunctions(): OfferFunction[] {
  // Function selectors computed from keccak256(signature)
  return [
    { selector: "0x016767fa", signature: "makeOffer((address,uint256,uint256,address,uint256,uint256))" },
    { selector: "0xef706adf", signature: "cancelOffer(uint256)" },
    { selector: "0xc815729d", signature: "acceptOffer(uint256)" },
    { selector: "0xa9fd8ed1", signature: "totalOffers()" },
    { selector: "0x4579268a", signature: "getOffer(uint256)" },
    { selector: "0xc1edcfbe", signature: "getAllOffers(uint256,uint256)" },
    { selector: "0x91940b3e", signature: "getAllValidOffers(uint256,uint256)" },
    { selector: "0x46904840", signature: "feeRecipient()" },
    { selector: "0xa001ecdd", signature: "feePercentage()" },
    { selector: "0xe74b981b", signature: "setFeeRecipient(address)" },
    { selector: "0xae06c1b7", signature: "setFeePercentage(uint256)" },
    { selector: "0x56d331c2", signature: "initializeOffer(address,address,uint256)" },
    { selector: "0xab8c71c0", signature: "permissions()" },
    { selector: "0xa221e161", signature: "withdrawFees(address)" },
    { selector: "0xd6c083d5", signature: "accumulatedFees(address)" }
  ];
}

// Helper functions
function createOfferExtension(offerAddress: string): Extension {
  const functions = getOfferFunctions();
  return {
    metadata: {
      name: "Offer",
      metadataURI: "",
      implementation: offerAddress
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
  const offerAddress = process.env['ADDRESS_OFFER'] || "";

  if (!extensionManagerAddress || !offerAddress) {
    throw new Error("Please set ADDRESS_EXTENSION_MANAGER and ADDRESS_OFFER environment variables");
  }

  const [signer] = await ethers.getSigners();
  const extensionManager = await ethers.getContractAt("ExtensionManager", extensionManagerAddress, signer);

  return { extensionManager, offerAddress, signer };
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

async function addOfferExtension(extensionManager: any, offerAddress: string) {
  console.log("Adding Offer extension...");
  const extension = createOfferExtension(offerAddress);

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

async function verifyExtension(extensionManager: any, offerAddress: string) {
  console.log("Verifying Offer extension...");

  const extensions = await extensionManager.getAllExtensions();
  const offer = extensions.find(
    (ext: any) => ext.metadata.name === "Offer"
  );

  if (offer) {
    console.log("Offer extension verified:");
    console.log("- Implementation:", offer.metadata.implementation);
    console.log("- Functions:", offer.functions.length);
    return true;
  } else {
    console.log("WARNING: Offer extension not found!");
    return false;
  }
}

async function main() {
  const delayBetweenCalls = 1000;

  try {
    const { extensionManager, offerAddress, signer } = await getContracts();
    console.log("Using signer:", signer.address);
    console.log("ExtensionManager address:", await extensionManager.getAddress());
    console.log("Offer implementation:", offerAddress);

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
      async () => {
        const extensions = await checkCurrentExtensions(extensionManager);
        const hasOffer = extensions.some((ext: any) => ext.metadata.name === "Offer");
        return hasOffer;
      },
      async (hasOffer: boolean) => {
        if (hasOffer) {
          console.log("Removing old Offer extension...");
          const tx = await extensionManager['removeExtension']("Offer");
          console.log("Transaction hash:", tx.hash);
          await tx.wait();
          console.log("Old extension removed!");
        }
      },
      () => addOfferExtension(extensionManager, offerAddress),
      () => verifyExtension(extensionManager, offerAddress)
    ];

    let result: any;
    for (const fn of functionsToCall) {
      result = await fn(result);
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
