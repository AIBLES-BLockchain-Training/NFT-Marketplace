import { ethers } from "hardhat";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

function getOfferFunctions(): OfferFunction[] {
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

async function getContracts() {
  const extensionManagerAddress = process.env['ADDRESS_EXTENSION_MANAGER'] || "";
  const newOfferAddress = process.env['ADDRESS_OFFER'] || "";

  if (!extensionManagerAddress) {
    throw new Error("Please set ADDRESS_EXTENSION_MANAGER in .env");
  }

  if (!newOfferAddress) {
    throw new Error("Please set ADDRESS_OFFER in .env with the newly deployed Offer contract address");
  }

  const [signer] = await ethers.getSigners();
  const extensionManager = await ethers.getContractAt("ExtensionManager", extensionManagerAddress, signer);

  return { extensionManager, newOfferAddress, signer };
}

async function checkCurrentExtensions(extensionManager: any) {
  console.log("\nChecking current extensions...");
  const extensions = await extensionManager.getAllExtensions();
  console.log(`Found ${extensions.length} extension(s)`);

  for (const ext of extensions) {
    console.log(`- ${ext.metadata.name} at ${ext.metadata.implementation}`);
  }

  return extensions;
}

async function getOldOfferAddress(extensionManager: any): Promise<string | null> {
  try {
    const extension = await extensionManager.getExtension("Offer");
    return extension.metadata.implementation;
  } catch (error) {
    console.log("WARNING: Offer extension does not exist yet");
    return null;
  }
}

async function replaceOfferExtension(extensionManager: any, newOfferAddress: string, oldOfferAddress: string | null) {
  console.log("\nUpgrading Offer extension...");
  console.log(`Old implementation: ${oldOfferAddress || "N/A"}`);
  console.log(`New implementation: ${newOfferAddress}`);

  const extension = createOfferExtension(newOfferAddress);

  console.log("\nExtension details:");
  console.log(`- Name: ${extension.metadata.name}`);
  console.log(`- Implementation: ${extension.metadata.implementation}`);
  console.log(`- Functions count: ${extension.functions.length}`);

  const extensionTuple = [
    [extension.metadata.name, extension.metadata.metadataURI, extension.metadata.implementation],
    extension.functions.map(f => [f.functionSelector, f.functionSignature])
  ];

  console.log("\nSending replaceExtension transaction...");
  const tx = await extensionManager.replaceExtension(extensionTuple);
  console.log(`Transaction hash: ${tx.hash}`);

  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log(`Confirmed! Gas used: ${receipt.gasUsed.toString()}`);

  return receipt;
}

async function verifyUpgrade(extensionManager: any, expectedAddress: string) {
  console.log("\nVerifying upgrade...");

  const extension = await extensionManager.getExtension("Offer");
  const currentImpl = extension.metadata.implementation;

  console.log(`Current implementation: ${currentImpl}`);
  console.log(`Expected implementation: ${expectedAddress}`);

  if (currentImpl.toLowerCase() === expectedAddress.toLowerCase()) {
    console.log("Implementation address matches!");
    console.log(`Functions registered: ${extension.functions.length}`);
    return true;
  } else {
    console.log("Implementation address mismatch!");
    return false;
  }
}

async function main() {
  const delayBetweenCalls = 1000;

  try {
    console.log("\n" + "=".repeat(70));
    console.log("OFFER EXTENSION UPGRADE SCRIPT");
    console.log("=".repeat(70));

    const { extensionManager, newOfferAddress, signer } = await getContracts();

    console.log("\nSigner:", signer.address);
    console.log("ExtensionManager:", await extensionManager.getAddress());
    console.log("New Offer Implementation:", newOfferAddress);

    console.log("\nChecking ExtensionManager ownership...");
    try {
      const owner = await extensionManager['owner']();
      console.log(`Owner: ${owner}`);
      console.log(`Is signer the owner? ${owner.toLowerCase() === signer.address.toLowerCase() ? "Yes" : "No"}`);

      if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.error("\nERROR: Signer is not the owner of ExtensionManager!");
        console.error("Please use the owner account or transfer ownership first.");
        process.exit(1);
      }
    } catch (ownerError) {
      console.log("Could not check ownership:", ownerError);
    }

    await delay(delayBetweenCalls);
    await checkCurrentExtensions(extensionManager);

    await delay(delayBetweenCalls);
    const oldOfferAddress = await getOldOfferAddress(extensionManager);

    await delay(delayBetweenCalls);
    await replaceOfferExtension(extensionManager, newOfferAddress, oldOfferAddress);

    await delay(delayBetweenCalls);
    const success = await verifyUpgrade(extensionManager, newOfferAddress);

    if (success) {
      console.log("\n" + "=".repeat(70));
      console.log("Offer extension upgraded successfully!");
      console.log("=".repeat(70));
    } else {
      console.log("\nUpgrade verification failed!");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("\nError:", error.message || error);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
