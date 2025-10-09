import { ethers } from "hardhat";
import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function deployPermissions(owner: string, signer: any) {
  console.log("Deploying Permissions contract...");
  
  await hre.run("compile");
  const Permissions = await ethers.getContractFactory("Permissions", signer);
  const permissions = await Permissions.deploy();
  await permissions.waitForDeployment();
  
  const permissionsAddress = await permissions.getAddress();
  console.log(`Permissions deployed to: ${permissionsAddress}`);
  
  console.log("Initializing Permissions...");
  await permissions['initialize'](owner);
  console.log(`Permissions initialized with admin: ${owner}`);
  
  console.log("Waiting 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  try {
    console.log("Verifying Permissions on Etherscan...");
    await hre.run("verify:verify", {
      address: permissionsAddress,
      constructorArguments: [],
    });
    console.log("Permissions verified on Etherscan");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("Permissions already verified");
    } else {
      console.log("Verification failed (can verify manually later):", error.message);
    }
  }
  
  return permissionsAddress;
}

async function deployExtensionManager(owner: string, signer: any) {
  console.log("Deploying ExtensionManager contract...");
  
  const ExtensionManager = await ethers.getContractFactory("ExtensionManager", signer);
  const extensionManager = await ExtensionManager.deploy(owner);
  await extensionManager.waitForDeployment();
  
  const extensionManagerAddress = await extensionManager.getAddress();
  console.log(`ExtensionManager deployed to: ${extensionManagerAddress}`);
  
  console.log("Waiting 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  try {
    console.log("Verifying ExtensionManager on Etherscan...");
    await hre.run("verify:verify", {
      address: extensionManagerAddress,
      constructorArguments: [owner],
    });
    console.log("ExtensionManager verified on Etherscan");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("ExtensionManager already verified");
    } else {
      console.log("Verification failed (can verify manually later):", error.message);
    }
  }
  
  return extensionManagerAddress;
}

async function deployRouter(extensionManagerAddress: string, signer: any) {
  console.log("Deploying Router contract...");
  
  const Router = await ethers.getContractFactory("Router", signer);
  const router = await Router.deploy(extensionManagerAddress);
  await router.waitForDeployment();
  
  const routerAddress = await router.getAddress();
  console.log(`Router deployed to: ${routerAddress}`);
  
  console.log("Waiting 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  try {
    console.log("Verifying Router on Etherscan...");
    await hre.run("verify:verify", {
      address: routerAddress,
      constructorArguments: [extensionManagerAddress],
    });
    console.log("Router verified on Etherscan");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("Router already verified");
    } else {
      console.log("Verification failed (can verify manually later):", error.message);
    }
  }
  
  return routerAddress;
}

async function deployListing(permissionsAddress: string, signer: any) {
  console.log("Deploying Listing contract...");
  
  const Listing = await ethers.getContractFactory("Listing", signer);
  const listing = await Listing.deploy();
  await listing.waitForDeployment();
  
  const listingAddress = await listing.getAddress();
  console.log(`Listing deployed to: ${listingAddress}`);
  
  console.log("Initializing Listing...");
  await listing['initializeListing'](permissionsAddress);
  console.log(`Listing initialized with permissions: ${permissionsAddress}`);
  
  console.log("Waiting 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  try {
    console.log("Verifying Listing on Etherscan...");
    await hre.run("verify:verify", {
      address: listingAddress,
      constructorArguments: [],
    });
    console.log("Listing verified on Etherscan");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("Listing already verified");
    } else {
      console.log("Verification failed (can verify manually later):", error.message);
    }
  }
  
  return listingAddress;
}

async function deployOffer(feeRecipient: string, feePercentage: number, permissionsAddress: string, signer: any) {
  console.log("Deploying Offer contract...");
  
  const Offer = await ethers.getContractFactory("NFTOffer", signer);
  const offer = await Offer.deploy(feeRecipient, feePercentage, permissionsAddress);
  await offer.waitForDeployment();
  
  const offerAddress = await offer.getAddress();
  console.log(`Offer deployed to: ${offerAddress}`);
  
  console.log("Waiting 60 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  try {
    await hre.run("verify:verify", {
      address: offerAddress,
      constructorArguments: [feeRecipient, feePercentage, permissionsAddress],
    });
    console.log("Offer verified on Etherscan");
  } catch (error) {
    console.log("Verification failed:", error);
  }
  
  return offerAddress;
}

async function deployNFTAuction(permissionsAddress: string, signer: any) {
  console.log("Deploying NFTAuction contract...");

  const NFTAuction = await ethers.getContractFactory("NFTAuction", signer);
  const nftAuction = await NFTAuction.deploy();
  await nftAuction.waitForDeployment();
  
  const nftAuctionAddress = await nftAuction.getAddress();
  console.log(`NFTAuction deployed to: ${nftAuctionAddress}`);

  console.log("Initializing NFTAuction...");
  await nftAuction['initializeAuction'](permissionsAddress);
  console.log(`NFTAuction initialized with permissions: ${permissionsAddress}`);

  console.log("Waiting 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  try {
    console.log("Verifying NFTAuction on Etherscan...");
    await hre.run("verify:verify", {
      address: nftAuctionAddress,
      constructorArguments: [], // NFTAuction has no constructor parameters
    });
    console.log("NFTAuction verified on Etherscan");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("NFTAuction already verified");
    } else {
      console.log("Verification failed (can verify manually later):", error.message);
    }
  }
  
  return nftAuctionAddress;
}

async function main() {
  console.log("Starting NFT Marketplace Full Deployment...\n");

  const provider = new ethers.JsonRpcProvider(`https://ethereum-sepolia-rpc.publicnode.com`);
  const signer = new ethers.Wallet(process.env['PRIVATE_KEY'] as string, provider);

  const ADMIN_ADDRESS = process.env['ADMIN_ADDRESS'] || signer.address;
  const FEE_RECIPIENT = process.env['ADMIN_ADDRESS'] || signer.address;
  const FEE_PERCENTAGE = 250;

  if (!ADMIN_ADDRESS) {
    throw new Error("Missing ADMIN_ADDRESS in .env");
  }

  console.log("Deploying contracts with account:", ADMIN_ADDRESS);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(ADMIN_ADDRESS)), "ETH\n");
  
  console.log("Deployment Configuration:");
  console.log(`   Admin Address: ${ADMIN_ADDRESS}`);
  console.log(`   Fee Recipient: ${FEE_RECIPIENT}`);
  console.log(`   Fee Percentage: ${FEE_PERCENTAGE / 100}%\n`);
  
  try {
    // const permissionsAddress = await deployPermissions(ADMIN_ADDRESS, signer);
    // console.log("-".repeat(60));
    
    // const extensionManagerAddress = await deployExtensionManager(ADMIN_ADDRESS, signer);
    // console.log("-".repeat(60));
    
    // const routerAddress = await deployRouter(extensionManagerAddress, signer);
    // console.log("-".repeat(60));
    
    // const listingAddress = await deployListing("0xCD7eb6E3884777EE74B0A2e0d6abBc9E71919Ebc", signer);
    // console.log("-".repeat(60));
    
    // const offerAddress = await deployOffer(FEE_RECIPIENT, FEE_PERCENTAGE, "0xCD7eb6E3884777EE74B0A2e0d6abBc9E71919Ebc", signer);
    // console.log("-".repeat(60));
    
    const nftAuctionAddress = await deployNFTAuction("0xCD7eb6E3884777EE74B0A2e0d6abBc9E71919Ebc", signer);
    console.log("-".repeat(60));
    
    console.log("ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
    console.log("\nContract Addresses:");
    // console.log(`   Permissions:      ${permissionsAddress}`);
    // console.log(`   ExtensionManager: ${extensionManagerAddress}`);
    // console.log(`   Router:           ${routerAddress}`);
    // console.log(`   Listing:          ${listingAddress}`);
    // console.log(`   Offer:            ${offerAddress}`);
    console.log(`   NFTAuction:       ${nftAuctionAddress}`);
    
    console.log("\nSave these addresses for your frontend configuration!");
    
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });