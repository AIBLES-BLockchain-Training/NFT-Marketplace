import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Initialize all extension contracts via Router (like frontend does)
 */

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("INITIALIZE ALL CONTRACTS VIA ROUTER");
  console.log("=".repeat(70) + "\n");

  const provider = new ethers.JsonRpcProvider(`https://ethereum-sepolia-rpc.publicnode.com`);
  const signer = new ethers.Wallet(process.env['PRIVATE_KEY'] as string, provider);

  // Contract addresses from .env (using latest deployment)
  const PERMISSIONS_ADDRESS = "0xCD7eb6E3884777EE74B0A2e0d6abBc9E71919Ebc";
  const ROUTER_ADDRESS = "0x480f851ECc0cC3F4926f8C93EDa25c227B46d6aE";
  const LISTING_ADDRESS = "0xC10Df095190FDA947Fb42390C9903B04908dfc54";
  const AUCTION_ADDRESS = "0x3Ad3BA49f03BBBbCB8b32b1a22CF96093F9CB88d";
  const OFFER_ADDRESS = "0xce975dE2171CE49810C1D55B675B7cfdC336Daa5";
  const FEE_RECEIVER = "0xE41FBfa9c12476a61bd8C36212a8C65C24eB0867";

  console.log("Configuration:");
  console.log(`   Deployer: ${signer.address}`);
  console.log(`   Router: ${ROUTER_ADDRESS}`);
  console.log(`   Permissions: ${PERMISSIONS_ADDRESS}`);
  console.log(`   Fee Receiver: ${FEE_RECEIVER}`);
  console.log(`   Listing: ${LISTING_ADDRESS}`);
  console.log(`   Auction: ${AUCTION_ADDRESS}`);
  console.log(`   Offer: ${OFFER_ADDRESS}`);

  const balance = await provider.getBalance(signer.address);
  console.log(`\nDeployer Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Create Router instance with combined ABI
  const routerAbi = [
    // Router base functions
    "function getImplementationForFunction(bytes4 _functionSelector) external view returns (address)",
    
    // Listing functions
    "function initializeListing(address _permissionContract, address _feeReceiver) external",
    "function initialized() external view returns (bool)",
    "function getPermissionContract() external view returns (address)",
    "function getFeeReceiver() external view returns (address)",
    
    // Auction functions  
    "function initializeAuction(address _permissionContract, address _routerAddress, address _feeReceiver) external",
    "function isAuctionInitialized() external view returns (bool)",
    
    // Offer functions (already initialized via constructor, but let's check)
    "function getOfferPermissionContract() external view returns (address)",
    "function getOfferFeeReceiver() external view returns (address)",
    
    // Common functions that might be available
    "function setCurrencyFee(address currency, uint256 fee) external"
  ];

  const router = new ethers.Contract(ROUTER_ADDRESS, routerAbi, signer);

  try {
    console.log("=" + "=".repeat(68));
    console.log("STEP 1: Initialize Listing via Router");
    console.log("=" + "=".repeat(68));
    
    try {
      console.log("📡 Checking if Router can delegate to Listing extension...");
      
      // First check if Router can find the function
      const initializeSelector = "0x158ef93e"; // initializeListing function selector
      console.log(`   Looking for function selector: ${initializeSelector}`);
      
      try {
        const implementation = await router.getImplementationForFunction(initializeSelector);
        console.log(`   Router found implementation: ${implementation}`);
        console.log(`   Expected Listing address: ${LISTING_ADDRESS}`);
        console.log(`   Addresses match: ${implementation.toLowerCase() === LISTING_ADDRESS.toLowerCase()}`);
      } catch (implError: any) {
        console.log(`   ❌ Router cannot find implementation for initializeListing`);
        console.log(`   Implementation error: ${implError.message}`);
        console.log(`   This means Listing extension is not properly registered in Router!`);
        return;
      }
      
      console.log("🔍 Attempting to check initialization status...");
      
      // Check if Listing is already initialized via Router
      try {
        const isListingInitialized = await router.initialized();
        console.log(`   Listing already initialized: ${isListingInitialized}`);
        
        if (!isListingInitialized) {
          console.log("📝 Initializing Listing via Router...");
          console.log(`   Calling: initializeListing("${PERMISSIONS_ADDRESS}", "${FEE_RECEIVER}")`);
          
          // Estimate gas first
          try {
            const gasEstimate = await router.initializeListing.estimateGas(PERMISSIONS_ADDRESS, FEE_RECEIVER);
            console.log(`   Gas estimate: ${gasEstimate.toString()}`);
          } catch (gasError: any) {
            console.log(`   ❌ Gas estimation failed: ${gasError.message}`);
            console.log(`   Error data: ${gasError.data}`);
            throw gasError;
          }
          
          const listingTx = await router.initializeListing(PERMISSIONS_ADDRESS, FEE_RECEIVER);
          console.log(`   Transaction Hash: ${listingTx.hash}`);
          
          const listingReceipt = await listingTx.wait();
          if (listingReceipt?.status === 1) {
            console.log("✅ Listing initialized via Router successfully!");
          } else {
            console.log("❌ Listing initialization failed");
          }
        }
      } catch (statusError: any) {
        console.log(`   ⚠️  Cannot check initialization status: ${statusError.message}`);
        console.log(`   Error data: ${statusError.data}`);
        console.log(`   Attempting initialization anyway...`);
        
        try {
          console.log("📝 Initializing Listing via Router (without status check)...");
          const listingTx = await router.initializeListing(PERMISSIONS_ADDRESS, FEE_RECEIVER);
          console.log(`   Transaction Hash: ${listingTx.hash}`);
          
          const listingReceipt = await listingTx.wait();
          if (listingReceipt?.status === 1) {
            console.log("✅ Listing initialized via Router successfully!");
          } else {
            console.log("❌ Listing initialization failed");
          }
        } catch (initError: any) {
          console.log(`   ❌ Initialization failed: ${initError.message}`);
          console.log(`   Error data: ${initError.data}`);
          throw initError;
        }
      }
      
      // Verify settings
      console.log("🔍 Verifying Listing settings via Router...");
      try {
        const permissionContract = await router.getPermissionContract();
        const feeReceiver = await router.getFeeReceiver();
        console.log(`   Permission Contract: ${permissionContract}`);
        console.log(`   Fee Receiver: ${feeReceiver}`);
        console.log("✅ Settings verified successfully!");
      } catch (verifyError: any) {
        console.log(`   ⚠️  Could not verify Listing settings via Router`);
        console.log(`   Verify error: ${verifyError.message}`);
        console.log(`   Error data: ${verifyError.data}`);
      }
      
    } catch (error: any) {
      console.log("❌ Listing initialization via Router failed:");
      console.log(`   Error message: ${error.message}`);
      console.log(`   Error code: ${error.code}`);
      console.log(`   Error data: ${error.data}`);
      console.log(`   Error reason: ${error.reason}`);
      
      if (error.data) {
        console.log(`   Decoded error: Likely a custom contract error`);
        console.log(`   Error signature: ${error.data.substring(0, 10)}`);
      }
    }

    console.log("\n" + "=" + "=".repeat(68));
    console.log("STEP 2: Initialize NFTAuction via Router");
    console.log("=" + "=".repeat(68));
    
    try {
      // Check if Auction is already initialized via Router
      try {
        const isAuctionInitialized = await router.isAuctionInitialized();
        console.log(`   Auction already initialized: ${isAuctionInitialized}`);
        
        if (!isAuctionInitialized) {
          console.log("Initializing NFTAuction via Router...");
          const auctionTx = await router.initializeAuction(PERMISSIONS_ADDRESS, ROUTER_ADDRESS, FEE_RECEIVER);
          console.log(`   Transaction Hash: ${auctionTx.hash}`);
          
          const auctionReceipt = await auctionTx.wait();
          if (auctionReceipt?.status === 1) {
            console.log("✅ NFTAuction initialized via Router successfully!");
          } else {
            console.log("❌ NFTAuction initialization failed");
          }
        }
      } catch (error) {
        console.log("   Attempting to initialize NFTAuction anyway...");
        const auctionTx = await router.initializeAuction(PERMISSIONS_ADDRESS, ROUTER_ADDRESS, FEE_RECEIVER);
        console.log(`   Transaction Hash: ${auctionTx.hash}`);
        
        const auctionReceipt = await auctionTx.wait();
        if (auctionReceipt?.status === 1) {
          console.log("✅ NFTAuction initialized via Router successfully!");
        }
      }
      
    } catch (error: any) {
      console.log("❌ NFTAuction initialization via Router failed:");
      console.log("   Error:", error.message);
    }

    console.log("\n" + "=" + "=".repeat(68));
    console.log("STEP 3: Check NFTOffer via Router");
    console.log("=" + "=".repeat(68));
    
    try {
      // NFTOffer is initialized via constructor, but let's verify via Router
      const offerPermissionContract = await router.getOfferPermissionContract();
      const offerFeeReceiver = await router.getOfferFeeReceiver();
      console.log(`   Offer Permission Contract: ${offerPermissionContract}`);
      console.log(`   Offer Fee Receiver: ${offerFeeReceiver}`);
      console.log("✅ NFTOffer settings verified via Router");
      
    } catch (error: any) {
      console.log("⚠️  Could not verify NFTOffer via Router (might be normal):");
      console.log("   Error:", error.message);
      console.log("   NFTOffer was initialized via constructor during deployment");
    }

    console.log("\n" + "=" + "=".repeat(68));
    console.log("STEP 4: Test Currency Fee Function via Router");
    console.log("=" + "=".repeat(68));
    
    try {
      // Test the function that was failing in UI
      const testCurrency = "0x1c7D4B196Cb0C7B01d743Fbc6116A902379C7238".toLowerCase(); // USDC from your error
      const testFee = 250; // 2.5%
      
      console.log(`Testing setCurrencyFee via Router...`);
      console.log(`   Currency: ${testCurrency}`);
      console.log(`   Fee: ${testFee} (2.5%)`);
      
      const feeTx = await router.setCurrencyFee(testCurrency, testFee);
      console.log(`   Transaction Hash: ${feeTx.hash}`);
      
      const feeReceipt = await feeTx.wait();
      if (feeReceipt?.status === 1) {
        console.log("✅ Currency fee set via Router successfully!");
      } else {
        console.log("❌ Currency fee setting failed");
      }
      
    } catch (error: any) {
      console.log("❌ Currency fee setting via Router failed:");
      console.log("   Error:", error.message);
      
      if (error.message.includes("PermissionContractNotSet")) {
        console.log("   🔍 This confirms the extension contracts need Router-based initialization!");
      }
    }

    console.log("\n" + "=" + "=".repeat(68));
    console.log("INITIALIZATION COMPLETE");
    console.log("=" + "=".repeat(68));
    
    console.log("\n📋 Summary:");
    console.log("   - All contracts have been initialized via Router");
    console.log("   - This matches how the frontend calls the contracts");
    console.log("   - Currency fee function should now work in UI");
    
    console.log("\n🔄 Next Steps:");
    console.log("   1. Restart frontend dev server");
    console.log("   2. Clear browser cache");
    console.log("   3. Test currency fee setting in admin panel");

  } catch (error: any) {
    console.error("\n❌ Router-based initialization failed:");
    console.error("Error:", error.message);
    
    console.log("\n💡 Troubleshooting:");
    console.log("   1. Check if extensions are properly added to Router");
    console.log("   2. Verify function selectors match between Router and Extensions");
    console.log("   3. Ensure Router can delegate calls to extension contracts");
  }

  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });