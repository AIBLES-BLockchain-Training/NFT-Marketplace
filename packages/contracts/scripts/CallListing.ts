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
async function createListingParams(
  nftAddress: string,
  tokenId: number = 1,
  priceInEth: string = "0.1",
  delayMinutes: number = 5 // Default: start 5 minutes from now
): Promise<ListingParameters> {
  // Get current block timestamp from blockchain
  const latestBlock = await ethers.provider.getBlock('latest');
  const now = latestBlock!.timestamp;

  return {
    assetContract: nftAddress,
    tokenId,
    quantity: 1,
    currency: ethers.ZeroAddress, // ETH
    pricePerToken: ethers.parseEther(priceInEth).toString(),
    startTimestamp: now + (delayMinutes * 60), // Start X minutes from now
    endTimestamp: now + 86400 * 7, // 7 days
    reserved: false
  };
}

// Contract interaction functions
async function getContracts() {
  const routerAddress = process.env['ADDRESS_ROUTER'];
  const nftAddress = "0xD704424d262e312fD2954eA7a51Be352fDa8E38A"; // Updated NFT address

  if (!routerAddress || !nftAddress) {
    throw new Error("Please set ADDRESS_ROUTER environment variables");
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
  console.log("- Owner:", listing.owner);
  console.log("- Asset:", listing.assetContract);
  console.log("- Token ID:", listing.tokenId.toString());
  console.log("- Quantity:", listing.quantity.toString());
  console.log("- Price:", ethers.formatEther(listing.pricePerToken), "ETH");
  console.log("- Currency:", listing.currency === ethers.ZeroAddress ? "ETH" : listing.currency);
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
    quantity: params.quantity,
    currency: params.currency === ethers.ZeroAddress ? "ETH" : params.currency,
    price: params.pricePerToken ? ethers.formatEther(params.pricePerToken) + " ETH" : "N/A",
    startTimestamp: new Date(params.startTimestamp * 1000).toISOString(),
    endTimestamp: new Date(params.endTimestamp * 1000).toISOString(),
    reserved: params.reserved
  });

  try {
    const tx = await routerAsListing.createListing(params);
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("Listing created! Gas used:", receipt.gasUsed.toString());

    // Get the listing ID from events
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = routerAsListing.interface.parseLog(log);
        return parsed?.name === "ListingCreated";
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
  } catch (error: any) {
    console.error("\n❌ CreateListing failed!");
    console.error("Error message:", error.message);

    // Try to decode the revert reason
    if (error.data) {
      try {
        const decodedError = routerAsListing.interface.parseError(error.data);
        console.error("Decoded error:", decodedError);
      } catch (e) {
        console.error("Could not decode error data");
      }
    }
    throw error;
  }
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

async function approveCurrency(routerAsListing: any, listingId: number, currency: string, pricePerToken: string) {
  console.log(`Approving currency for listing #${listingId}...`);
  console.log("- Currency:", currency === ethers.ZeroAddress ? "ETH" : currency);
  console.log("- Price:", ethers.formatEther(pricePerToken), "ETH");

  const tx = await routerAsListing.approveCurrencyForListing(listingId, currency, pricePerToken);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Currency approved! Gas used:", receipt.gasUsed.toString());
}

async function setCurrencyFee(routerAsListing: any, currency: string, fee: number) {
  console.log(`Setting currency fee...`);
  console.log("- Currency:", currency === ethers.ZeroAddress ? "ETH" : currency);
  console.log("- Fee:", fee / 100, "%");

  const tx = await routerAsListing.setCurrencyFee(currency, fee);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Currency fee set! Gas used:", receipt.gasUsed.toString());
}

async function getCurrencyFee(routerAsListing: any, currency: string) {
  console.log(`Getting currency fee for ${currency === ethers.ZeroAddress ? "ETH" : currency}...`);
  const fee = await routerAsListing.currencyFees(currency);
  const decimal = await routerAsListing.decimalListing();
  const feePercent = (Number(fee) / Number(decimal)) * 100;
  console.log(`Fee: ${fee.toString()} (${feePercent}%)`);
  return fee;
}

async function withdrawFees(routerAsListing: any, currency: string) {
  console.log(`Withdrawing fees for ${currency === ethers.ZeroAddress ? "ETH" : currency}...`);

  const accumulated = await routerAsListing.accumulatedFees(currency);
  console.log("Accumulated fees:", ethers.formatEther(accumulated));

  if (accumulated.toString() === "0") {
    console.log("No fees to withdraw");
    return;
  }

  const tx = await routerAsListing.withdrawFees(currency);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Fees withdrawn! Gas used:", receipt.gasUsed.toString());
}

async function getAllListings(routerAsListing: any, startId: number, endId: number) {
  console.log(`Getting all listings from ${startId} to ${endId}...`);
  const listings = await routerAsListing.getAllListings(startId, endId);
  console.log(`Found ${listings.length} listings`);

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`\nListing #${startId + i}:`);
    console.log("- Owner:", listing.owner);
    console.log("- Asset:", listing.assetContract);
    console.log("- Token ID:", listing.tokenId.toString());
    console.log("- Price:", ethers.formatEther(listing.pricePerToken), "ETH");
    console.log("- Status:", listing.status.toString());
  }

  return listings;
}

async function getAllValidListings(routerAsListing: any, startId: number, endId: number) {
  console.log(`Getting all valid listings from ${startId} to ${endId}...`);
  const listings = await routerAsListing.getAllValidListings(startId, endId);
  console.log(`Found ${listings.length} valid listings`);

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`\nValid Listing:`);
    console.log("- ID:", i);
    console.log("- Owner:", listing.owner);
    console.log("- Asset:", listing.assetContract);
    console.log("- Token ID:", listing.tokenId.toString());
    console.log("- Price:", ethers.formatEther(listing.pricePerToken), "ETH");
  }

  return listings;
}

// Helper function to approve NFT
async function approveNFT(nftAddress: string, routerAddress: string, signer: any) {
  console.log("Checking NFT approval...");
  const nft = await ethers.getContractAt("IERC721", nftAddress, signer);
  const isApproved = await nft.isApprovedForAll(signer.address, routerAddress);

  if (!isApproved) {
    console.log("Approving Router for NFT...");
    const tx = await nft.setApprovalForAll(routerAddress, true);
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    console.log("Router approved for all NFTs");
  } else {
    console.log("Router already approved");
  }
}

// Main execution flow
async function main() {
  const delayBetweenCalls = 1000;

  try {
    const { routerAsListing, nftAddress, signer } = await getContracts();
    const routerAddress = await routerAsListing.getAddress();

    console.log("Using signer:", signer.address);
    console.log("Router address:", routerAddress);
    console.log("NFT address:", nftAddress);
    console.log("");
    
    const functionsToCall = [
      // ========== STEP 1: Check Permissions ==========
      () => console.log("\n========== CHECKING PERMISSIONS =========="),
      () => checkListingPermission(routerAsListing, signer.address),
      () => checkNFTWhitelisted(routerAsListing, nftAddress),
      () => checkCurrencySupported(routerAsListing, ethers.ZeroAddress),

      // ========== STEP 2: Setup ==========
      () => console.log("\n========== SETUP =========="),
      () => approveNFT(nftAddress, routerAddress, signer),
      () => getCurrencyFee(routerAsListing, ethers.ZeroAddress),

      // ========== STEP 3: View Current State ==========
      () => console.log("\n========== CURRENT STATE =========="),
      () => getTotalListings(routerAsListing),
      () => getUserListings(routerAsListing, signer.address),

      // ========== STEP 4: Create New Listing ==========
      () => console.log("\n========== CREATE NEW LISTING =========="),
      async () => {
        const params = await createListingParams(nftAddress, 1, "0.1", 5); // Start 5 minutes from now
        const listingId = await createListing(routerAsListing, params);
        return listingId;
      },

      // ========== STEP 5: Get Listing Details ==========
      () => console.log("\n========== GET LISTING DETAILS =========="),
      async (listingId: any) => {
        if (listingId !== null && listingId !== undefined) {
          await getListingDetails(routerAsListing, listingId);
          return listingId;
        }
      },

      // ========== STEP 6: Approve Currency for Listing ==========
      () => console.log("\n========== APPROVE CURRENCY =========="),
      async (listingId: any) => {
        if (listingId !== null && listingId !== undefined) {
          await approveCurrency(routerAsListing, listingId, ethers.ZeroAddress, ethers.parseEther("0.12"));
          return listingId;
        }
      },

      // ========== STEP 7: Update Listing Price ==========
      () => console.log("\n========== UPDATE LISTING =========="),
      async (listingId: any) => {
        if (listingId !== null && listingId !== undefined) {
          try {
            await updateListing(routerAsListing, listingId, "0.15");
          } catch (error: any) {
            console.error("Update failed:", error.message);
            console.log("(This is expected if listing already started)");
          }
          return listingId;
        }
      },

      // ========== STEP 8: Get All Listings ==========
      () => console.log("\n========== GET ALL LISTINGS =========="),
      async () => {
        const total = await routerAsListing.totalListings();
        if (total > 0) {
          await getAllListings(routerAsListing, 0, Math.min(Number(total) - 1, 2));
        }
      },

      // ========== STEP 9: Get All Valid Listings ==========
      () => console.log("\n========== GET ALL VALID LISTINGS =========="),
      async () => {
        const total = await routerAsListing.totalListings();
        if (total > 0) {
          await getAllValidListings(routerAsListing, 0, Math.min(Number(total) - 1, 2));
        }
      },

      // ========== STEP 10: Cancel Listing ==========
      () => console.log("\n========== CANCEL LISTING =========="),
      async (listingId: any) => {
        if (listingId !== null && listingId !== undefined) {
          try {
            await cancelListing(routerAsListing, listingId);
            console.log("✓ Listing cancelled successfully");
          } catch (error: any) {
            console.error("Cancel failed:", error.message);
          }
        }
      },

      // ========== STEP 11: Final State ==========
      () => console.log("\n========== FINAL STATE =========="),
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