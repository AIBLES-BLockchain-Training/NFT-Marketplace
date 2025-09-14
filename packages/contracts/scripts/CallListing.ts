import { ethers } from "hardhat";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Data structures
interface ListingParameters {
  assetContract: string;
  tokenId: number;
  quantity: number;
  currency: string;
  pricePerToken: string;
  startTimestamp: number;
  endTimestamp: number;
  reserved: boolean;
}

// Helper functions
function createListingParams(
  nftAddress: string,
  tokenId: number = 1,
  priceInEth: string = "0.1"
): ListingParameters {
  const now = Math.floor(Date.now() / 1000);
  return {
    assetContract: nftAddress,
    tokenId,
    quantity: 1,
    currency: ethers.ZeroAddress, // ETH
    pricePerToken: ethers.parseEther(priceInEth).toString(),
    startTimestamp: now,
    endTimestamp: now + 86400 * 7, // 7 days
    reserved: false
  };
}

// Contract interaction functions
async function getContracts() {
  const routerAddress = process.env['ADDRESS_ROUTER'] || "";
  const nftAddress = process.env['NFT_CONTRACT_ADDRESS'] || "";
  
  if (!routerAddress || !nftAddress) {
    throw new Error("Please set ADDRESS_ROUTER and NFT_CONTRACT_ADDRESS environment variables");
  }
  
  const [signer] = await ethers.getSigners();
  const listingInterface = (await ethers.getContractFactory("Listing")).interface;
  const routerAsListing = new ethers.Contract(routerAddress, listingInterface, signer);
  
  return { routerAsListing, nftAddress, signer };
}

// View functions
async function checkListingPermission(routerAsListing: any, user: string) {
  console.log("Checking listing permission...");
  const hasPermission = await routerAsListing.hasListingPermission(user);
  console.log(`User ${user} has permission: ${hasPermission}`);
  return hasPermission;
}

async function checkNFTWhitelisted(routerAsListing: any, nftAddress: string) {
  console.log("Checking NFT whitelist status...");
  const isWhitelisted = await routerAsListing.isNFTWhitelisted(nftAddress);
  console.log(`NFT ${nftAddress} is whitelisted: ${isWhitelisted}`);
  return isWhitelisted;
}

async function checkCurrencySupported(routerAsListing: any, currency: string) {
  console.log("Checking currency support...");
  const isSupported = await routerAsListing.isCurrencySupported(currency);
  const currencyName = currency === ethers.ZeroAddress ? "ETH" : currency;
  console.log(`Currency ${currencyName} is supported: ${isSupported}`);
  return isSupported;
}

async function getTotalListings(routerAsListing: any) {
  console.log("Getting total listings...");
  const total = await routerAsListing.totalListings();
  console.log(`Total listings: ${total}`);
  return total;
}

async function getListingDetails(routerAsListing: any, listingId: number) {
  console.log(`Getting listing #${listingId} details...`);
  const listing = await routerAsListing.getListing(listingId);
  console.log("Listing details:");
  console.log("- Asset:", listing.assetContract);
  console.log("- Token ID:", listing.tokenId);
  console.log("- Price:", ethers.formatEther(listing.pricePerToken), "ETH");
  console.log("- Status:", listing.status);
  return listing;
}

async function getUserListings(routerAsListing: any, user: string) {
  console.log(`Getting listings for user ${user}...`);
  const listings = await routerAsListing.userOwnedListings(user);
  console.log(`User listings: [${listings.join(", ")}]`);
  return listings;
}

// State changing functions
async function createListing(routerAsListing: any, params: ListingParameters) {
  console.log("Creating new listing...");
  console.log("Parameters:", {
    asset: params.assetContract,
    tokenId: params.tokenId,
    price: ethers.formatEther(params.pricePerToken) + " ETH"
  });
  
  const tx = await routerAsListing.createListing(params);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Listing created! Gas used:", receipt.gasUsed.toString());
  
  // Get the listing ID from events
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = routerAsListing.interface.parseLog(log);
      return parsed?.name === "NewListing";
    } catch {
      return false;
    }
  });
  
  if (event) {
    const parsed = routerAsListing.interface.parseLog(event);
    console.log("New listing ID:", parsed.args.listingId.toString());
    return parsed.args.listingId;
  }
  
  return null;
}

async function updateListing(routerAsListing: any, listingId: number, newPrice: string) {
  console.log(`Updating listing #${listingId}...`);
  
  const listing = await routerAsListing.getListing(listingId);
  const updatedParams = {
    assetContract: listing.assetContract,
    tokenId: listing.tokenId,
    quantity: listing.quantity,
    currency: listing.currency,
    pricePerToken: ethers.parseEther(newPrice).toString(),
    startTimestamp: listing.startTimestamp,
    endTimestamp: listing.endTimestamp,
    reserved: listing.reserved
  };
  
  const tx = await routerAsListing.updateListing(listingId, updatedParams);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Listing updated! Gas used:", receipt.gasUsed.toString());
}

async function cancelListing(routerAsListing: any, listingId: number) {
  console.log(`Cancelling listing #${listingId}...`);
  
  const tx = await routerAsListing.cancelListing(listingId);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Listing cancelled! Gas used:", receipt.gasUsed.toString());
}

async function approveBuyer(routerAsListing: any, listingId: number, buyer: string) {
  console.log(`Approving buyer ${buyer} for listing #${listingId}...`);
  
  const tx = await routerAsListing.approveBuyerForListing(listingId, buyer, true);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Buyer approved! Gas used:", receipt.gasUsed.toString());
}

// Main execution flow
async function main() {
  const delayBetweenCalls = 1000;
  
  try {
    const { routerAsListing, nftAddress, signer } = await getContracts();
    console.log("Using signer:", signer.address);
    console.log("Router address:", await routerAsListing.getAddress());
    console.log("NFT address:", nftAddress);
    console.log("");
    
    // Define functions to call
    const functionsToCall = [
      // Check permissions
      () => checkListingPermission(routerAsListing, signer.address),
      () => checkNFTWhitelisted(routerAsListing, nftAddress),
      () => checkCurrencySupported(routerAsListing, ethers.ZeroAddress),
      
      // Get current state
      () => getTotalListings(routerAsListing),
      () => getUserListings(routerAsListing, signer.address),
      
      // Create listing
      async () => {
        const params = createListingParams(nftAddress, 1, "0.1");
        const listingId = await createListing(routerAsListing, params);
        return listingId;
      },
      
      // Get created listing details
      async (listingId: any) => {
        if (listingId !== null && listingId !== undefined) {
          await getListingDetails(routerAsListing, listingId);
        }
      },
      
      // Update listing price
      async (listingId: any) => {
        if (listingId !== null && listingId !== undefined) {
          await updateListing(routerAsListing, listingId, "0.15");
        }
      },
      
      // Final state check
      () => getTotalListings(routerAsListing),
      () => getUserListings(routerAsListing, signer.address)
    ];
    
    // Execute all functions
    let result: any;
    for (const fn of functionsToCall) {
      result = await fn(result) || result;
      await delay(delayBetweenCalls);
    }
    
    console.log("\nAll operations completed successfully!");
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}