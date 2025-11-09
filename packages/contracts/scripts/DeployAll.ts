import { ethers } from "hardhat";
import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Full deployment script for NFT Marketplace
 *
 * Deployment order:
 * 1. MultiSigWallet (Fee Receiver)
 * 2. Permissions
 * 3. ExtensionManager
 * 4. Router
 * 5. Listing (initialized with Router + Multisig)
 * 6. NFTAuction
 * 7. NFTOffer
 */

async function deployMultiSigWallet(owners: string[], requiredConfirmations: number, signer: any) {
  console.log("Deploying MultiSigWallet contract...");
  console.log(`   Owners (${owners.length}):`, owners);
  console.log(`   Required Confirmations: ${requiredConfirmations}/${owners.length}`);

  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet", signer);
  const multisig = await MultiSigWallet.deploy(owners, requiredConfirmations);
  await multisig.waitForDeployment();

  const multisigAddress = await multisig.getAddress();
  console.log(`MultiSigWallet deployed to: ${multisigAddress}`);

  // Verify multisig setup
  const actualOwners = await multisig['getOwners']();
  const actualRequired = await multisig['numConfirmationsRequired']();
  console.log(`   Verified - Owners: ${actualOwners.length}, Required: ${actualRequired}`);

  console.log("Waiting 30 seconds before verification...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  try {
    console.log("Verifying MultiSigWallet on Etherscan...");
    await hre.run("verify:verify", {
      address: multisigAddress,
      constructorArguments: [owners, requiredConfirmations],
    });
    console.log("MultiSigWallet verified on Etherscan");
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("MultiSigWallet already verified");
    } else {
      console.log("Verification failed (can verify manually later):", error.message);
    }
  }

  return multisigAddress;
}

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

async function deployListing(
  permissionsAddress: string,
  routerAddress: string,
  feeReceiverAddress: string,
  signer: any
) {
  console.log("Deploying Listing contract...");

  const Listing = await ethers.getContractFactory("Listing", signer);
  const listing = await Listing.deploy();
  await listing.waitForDeployment();

  const listingAddress = await listing.getAddress();
  console.log(`Listing deployed to: ${listingAddress}`);

  console.log("Initializing Listing...");
  console.log(`   Permissions: ${permissionsAddress}`);
  console.log(`   Router: ${routerAddress}`);
  console.log(`   Fee Receiver (Multisig): ${feeReceiverAddress}`);

  await listing['initializeListing'](permissionsAddress, routerAddress, feeReceiverAddress);
  console.log(`Listing initialized successfully`);

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
  console.log("\n" + "=".repeat(70));
  console.log("NFT MARKETPLACE FULL DEPLOYMENT");
  console.log("=".repeat(70) + "\n");

  const provider = new ethers.JsonRpcProvider(`https://ethereum-sepolia-rpc.publicnode.com`);
  const signer = new ethers.Wallet(process.env['PRIVATE_KEY'] as string, provider);

  const ADMIN_ADDRESS = process.env['ADMIN_ADDRESS'] || signer.address;
  const OFFER_FEE_PERCENTAGE = 250; // 2.5% for Offer contract

  const MULTISIG_OWNERS_STR = process.env['MULTISIG_OWNERS'] || ADMIN_ADDRESS;
  const MULTISIG_OWNERS = MULTISIG_OWNERS_STR.split(',').map(addr => addr.trim());
  const MULTISIG_REQUIRED_CONFIRMATIONS = parseInt(process.env['MULTISIG_REQUIRED'] || '2');

  if (!ADMIN_ADDRESS) {
    throw new Error("Missing ADMIN_ADDRESS in .env");
  }

  if (MULTISIG_OWNERS.length < 2) {
    console.warn("WARNING: Multisig has less than 2 owners. For production, use multiple owners!");
  }

  if (MULTISIG_REQUIRED_CONFIRMATIONS > MULTISIG_OWNERS.length) {
    throw new Error(`MULTISIG_REQUIRED (${MULTISIG_REQUIRED_CONFIRMATIONS}) cannot be greater than number of owners (${MULTISIG_OWNERS.length})`);
  }

  console.log("Deployment Configuration:");
  console.log(`   Deployer: ${signer.address}`);
  console.log(`   Admin Address: ${ADMIN_ADDRESS}`);
  console.log(`   Multisig Owners (${MULTISIG_OWNERS.length}):`, MULTISIG_OWNERS);
  console.log(`   Multisig Required Confirmations: ${MULTISIG_REQUIRED_CONFIRMATIONS}/${MULTISIG_OWNERS.length}`);
  console.log(`   Offer Fee: ${OFFER_FEE_PERCENTAGE / 100}%`);

  const balance = await provider.getBalance(signer.address);
  console.log(`\nDeployer Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (parseFloat(ethers.formatEther(balance)) < 0.1) {
    console.warn("WARNING: Low balance! Deployment may fail.\n");
  }

  try {
    // 1. Deploy MultiSigWallet (Fee Receiver)
    console.log("=".repeat(70));
    console.log("STEP 1: Deploying MultiSigWallet (Fee Receiver)");
    console.log("=".repeat(70));
    const multisigAddress = await deployMultiSigWallet(MULTISIG_OWNERS, MULTISIG_REQUIRED_CONFIRMATIONS, signer);
    console.log("-".repeat(70) + "\n");

    // // 2. Deploy Permissions
    // console.log("=".repeat(70));
    // console.log("STEP 2: Deploying Permissions");
    // console.log("=".repeat(70));
    // const permissionsAddress = await deployPermissions(ADMIN_ADDRESS, signer);
    // console.log("-".repeat(70) + "\n");

    // // 3. Deploy ExtensionManager
    // console.log("=".repeat(70));
    // console.log("STEP 3: Deploying ExtensionManager");
    // console.log("=".repeat(70));
    // const extensionManagerAddress = await deployExtensionManager(ADMIN_ADDRESS, signer);
    // console.log("-".repeat(70) + "\n");

    // // 4. Deploy Router
    // console.log("=".repeat(70));
    // console.log("STEP 4: Deploying Router");
    // console.log("=".repeat(70));
    // const routerAddress = await deployRouter(extensionManagerAddress, signer);
    // console.log("-".repeat(70) + "\n");

    // 5. Deploy Listing
    console.log("=".repeat(70));
    console.log("STEP 5: Deploying Listing");
    console.log("=".repeat(70));
    const listingAddress = await deployListing('0xCD7eb6E3884777EE74B0A2e0d6abBc9E71919Ebc', '0x1279e1f267968eC70841dFa26Fbab60F65CdF717', multisigAddress, signer);
    console.log("-".repeat(70) + "\n");

    // // 6. Deploy NFTAuction
    // console.log("=".repeat(70));
    // console.log("STEP 6: Deploying NFTAuction");
    // console.log("=".repeat(70));
    // const nftAuctionAddress = await deployNFTAuction(permissionsAddress, signer);
    // console.log("-".repeat(70) + "\n");

    // // 7. Deploy NFTOffer
    // console.log("=".repeat(70));
    // console.log("STEP 7: Deploying NFTOffer");
    // console.log("=".repeat(70));
    // const offerAddress = await deployOffer(multisigAddress, OFFER_FEE_PERCENTAGE, permissionsAddress, signer);
    // console.log("-".repeat(70) + "\n");

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
    console.log("=".repeat(70));
    console.log("\nContract Addresses:");
    console.log(`   MultiSigWallet:   ${multisigAddress}`);
    // console.log(`   Permissions:      ${permissionsAddress}`);
    // console.log(`   ExtensionManager: ${extensionManagerAddress}`);
    // console.log(`   Router:           ${routerAddress}`);
    console.log(`   Listing:          ${listingAddress}`);
    // console.log(`   NFTAuction:       ${nftAuctionAddress}`);
    // console.log(`   NFTOffer:         ${offerAddress}`);

    console.log("\nNEXT STEPS:");
    console.log("1. Run AddListingExtension.ts to register Listing in Router");
    console.log("2. Run AddAuctionExtension.ts to register NFTAuction in Router");
    console.log("3. Configure permissions (assign roles, whitelist NFTs, add currencies)");
    console.log("4. Test withdrawal from Listing to Multisig");
    console.log("5. Save all addresses to .env and frontend config");

    console.log("\n.env configuration:");
    console.log(`ADDRESS_MULTISIG=${multisigAddress}`);
    // console.log(`ADDRESS_PERMISSIONS=${permissionsAddress}`);
    // console.log(`ADDRESS_EXTENSION_MANAGER=${extensionManagerAddress}`);
    // console.log(`ADDRESS_ROUTER=${routerAddress}`);
    // console.log(`ADDRESS_LISTING=${listingAddress}`);
    // console.log(`ADDRESS_AUCTION=${nftAuctionAddress}`);
    // console.log(`ADDRESS_OFFER=${offerAddress}`);
    // console.log(`ADDRESS_FEE_RECEIVER=${multisigAddress}`);

    console.log("\n" + "=".repeat(70) + "\n");

  } catch (error) {
    console.error("\nDeployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });