import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Check all extension mappings in ExtensionManager
 */

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("CHECK EXTENSION MANAGER FUNCTION MAPPINGS");
  console.log("=".repeat(70) + "\n");

  const provider = new ethers.JsonRpcProvider(`https://ethereum-sepolia-rpc.publicnode.com`);
  const signer = new ethers.Wallet(process.env['PRIVATE_KEY'] as string, provider);

  // Contract addresses from your deployment
  const EXTENSION_MANAGER_ADDRESS = "0x1d4F6dD29Da3c0Da5C7D21A5aB098A2F35CF4C18";
  const ROUTER_ADDRESS = "0x39c27078172Ed22aCF1D4fe0cea2731606d980B5";
  const LISTING_ADDRESS = "0x83aA8DA7054f8A2e908F8a20CA06f02699Bc77A3";
  const AUCTION_ADDRESS = "0xc85404936c2B9bD70Bae51033eD9FC7A2130342D";
  const OFFER_ADDRESS = "0x3EF70eEF49c49395641d3a63575b3C0d35954B6e";

  console.log("Configuration:");
  console.log(`   Extension Manager: ${EXTENSION_MANAGER_ADDRESS}`);
  console.log(`   Router: ${ROUTER_ADDRESS}`);
  console.log(`   Listing: ${LISTING_ADDRESS}`);
  console.log(`   Auction: ${AUCTION_ADDRESS}`);
  console.log(`   Offer: ${OFFER_ADDRESS}`);

  // ExtensionManager ABI
  const extensionManagerAbi = [
    "function getExtensionImplementation(bytes4 _functionSelector) external view returns (address)",
    "function getAllExtensions() external view returns (address[])",
    "function getExtensionForFunction(bytes4 _functionSelector) external view returns (address)",
    "function isFunctionEnabled(bytes4 _functionSelector) external view returns (bool)",
    // Additional functions for debugging
    "function extensions(uint256 index) external view returns (address)",
    "function getExtensionCount() external view returns (uint256)"
  ];

  const extensionManager = new ethers.Contract(EXTENSION_MANAGER_ADDRESS, extensionManagerAbi, signer);

  try {
    console.log("\n" + "=".repeat(70));
    console.log("STEP 1: Check Function Selectors for Key Functions");
    console.log("=".repeat(70));

    // Important function selectors to check
    const functionSelectors = {
      // Listing functions
      "createListing": "0x63d9fe5c",
      "updateListing": "0x9e8c4067", 
      "cancelListing": "0x1dc42516",
      "buyFromListing": "0x2a55205a",
      
      // Auction functions
      "createAuction": "0x172e9f7b",
      "bidOnAuction": "0xbcfad877",
      "settleAuction": "0x2c3e7612",
      "cancelAuction": "0xdfc24a6d",
      
      // Offer functions  
      "makeOffer": "0x4b8fe5fe",
      "acceptOffer": "0x67ad69c5",
      "cancelOffer": "0xf6d2d1d4",
      
      // Common/Admin functions
      "setCurrencyFee": "0xa0c1b505",
      "withdrawFees": "0x476343ee",
      "setFeeReceiver": "0xefdcd974"
    };

    console.log("\nChecking function selector mappings:\n");

    for (const [functionName, selector] of Object.entries(functionSelectors)) {
      try {
        console.log(`📍 ${functionName} (${selector}):`);
        
        // Check if function is enabled
        const isEnabled = await extensionManager.isFunctionEnabled(selector);
        console.log(`   Enabled: ${isEnabled}`);
        
        if (isEnabled) {
          // Get implementation address
          const implementation = await extensionManager.getExtensionImplementation(selector);
          console.log(`   Implementation: ${implementation}`);
          
          // Determine which contract this should map to
          let expectedContract = "UNKNOWN";
          let isCorrect = false;
          
          if (functionName.includes("Listing") || functionName.includes("listing") || 
              ["createListing", "updateListing", "cancelListing", "buyFromListing"].includes(functionName)) {
            expectedContract = "LISTING";
            isCorrect = implementation.toLowerCase() === LISTING_ADDRESS.toLowerCase();
          } else if (functionName.includes("Auction") || functionName.includes("auction") || 
                     ["createAuction", "bidOnAuction", "settleAuction", "cancelAuction"].includes(functionName)) {
            expectedContract = "AUCTION";
            isCorrect = implementation.toLowerCase() === AUCTION_ADDRESS.toLowerCase();
          } else if (functionName.includes("Offer") || functionName.includes("offer") || 
                     ["makeOffer", "acceptOffer", "cancelOffer"].includes(functionName)) {
            expectedContract = "OFFER";
            isCorrect = implementation.toLowerCase() === OFFER_ADDRESS.toLowerCase();
          } else {
            // Could be in any contract, check which one
            if (implementation.toLowerCase() === LISTING_ADDRESS.toLowerCase()) {
              expectedContract = "LISTING";
              isCorrect = true;
            } else if (implementation.toLowerCase() === AUCTION_ADDRESS.toLowerCase()) {
              expectedContract = "AUCTION"; 
              isCorrect = true;
            } else if (implementation.toLowerCase() === OFFER_ADDRESS.toLowerCase()) {
              expectedContract = "OFFER";
              isCorrect = true;
            }
          }
          
          console.log(`   Expected: ${expectedContract}`);
          console.log(`   Status: ${isCorrect ? '✅ CORRECT' : '❌ WRONG MAPPING!'}`);
          
          if (!isCorrect) {
            console.log(`   🚨 ISSUE FOUND: ${functionName} maps to wrong contract!`);
          }
        } else {
          console.log(`   ⚠️  Function not enabled in ExtensionManager`);
        }
        
        console.log("");
        
      } catch (error: any) {
        console.log(`   ❌ Error checking ${functionName}: ${error.message}`);
        console.log("");
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log("STEP 2: Get All Registered Extensions");
    console.log("=".repeat(70));

    try {
      // Try to get all extensions
      let allExtensions: string[] = [];
      
      try {
        allExtensions = await extensionManager.getAllExtensions();
        console.log(`\nFound ${allExtensions.length} registered extensions:`);
        
        allExtensions.forEach((extension, index) => {
          let contractType = "UNKNOWN";
          if (extension.toLowerCase() === LISTING_ADDRESS.toLowerCase()) {
            contractType = "LISTING";
          } else if (extension.toLowerCase() === AUCTION_ADDRESS.toLowerCase()) {
            contractType = "AUCTION";
          } else if (extension.toLowerCase() === OFFER_ADDRESS.toLowerCase()) {
            contractType = "OFFER";
          }
          
          console.log(`   ${index + 1}. ${extension} (${contractType})`);
        });
        
      } catch (getAllError) {
        console.log("getAllExtensions() not available, trying alternative method...");
        
        // Try to get extensions count and iterate
        try {
          const count = await extensionManager.getExtensionCount();
          console.log(`\nFound ${count} registered extensions:`);
          
          for (let i = 0; i < count; i++) {
            try {
              const extension = await extensionManager.extensions(i);
              let contractType = "UNKNOWN";
              if (extension.toLowerCase() === LISTING_ADDRESS.toLowerCase()) {
                contractType = "LISTING";
              } else if (extension.toLowerCase() === AUCTION_ADDRESS.toLowerCase()) {
                contractType = "AUCTION";
              } else if (extension.toLowerCase() === OFFER_ADDRESS.toLowerCase()) {
                contractType = "OFFER";
              }
              
              console.log(`   ${i + 1}. ${extension} (${contractType})`);
              allExtensions.push(extension);
            } catch (error: any) {
              console.log(`   Error getting extension ${i}: ${error.message}`);
            }
          }
        } catch (countError) {
          console.log("Could not get extension count either.");
          
          // Manually check if our known contracts are registered
          console.log("\nManually checking known contracts:");
          
          const knownContracts = [
            { name: "LISTING", address: LISTING_ADDRESS },
            { name: "AUCTION", address: AUCTION_ADDRESS },
            { name: "OFFER", address: OFFER_ADDRESS }
          ];
          
          for (const contract of knownContracts) {
            // Check if any functions map to this contract
            let hasFunctions = false;
            for (const selector of Object.values(functionSelectors)) {
              try {
                const impl = await extensionManager.getExtensionImplementation(selector);
                if (impl.toLowerCase() === contract.address.toLowerCase()) {
                  hasFunctions = true;
                  break;
                }
              } catch (e) {
                // Ignore errors
              }
            }
            
            console.log(`   ${contract.name} (${contract.address}): ${hasFunctions ? '✅ HAS FUNCTIONS' : '❌ NO FUNCTIONS'}`);
          }
        }
      }
      
    } catch (error: any) {
      console.log(`Error getting extensions: ${error.message}`);
    }

    console.log("\n" + "=".repeat(70));
    console.log("STEP 3: Router Function Delegation Test");
    console.log("=".repeat(70));
    
    // Test Router delegation for createAuction function
    const routerAbi = [
      "function getImplementationForFunction(bytes4 _functionSelector) external view returns (address implementation)"
    ];
    
    const router = new ethers.Contract(ROUTER_ADDRESS, routerAbi, signer);
    
    console.log("\nTesting Router delegation:");
    
    const createAuctionSelector = "0x172e9f7b";
    try {
      const routerImplementation = await router.getImplementationForFunction(createAuctionSelector);
      console.log(`\nRouter.getImplementationForFunction(${createAuctionSelector}):`);
      console.log(`   Returns: ${routerImplementation}`);
      console.log(`   Expected (Auction): ${AUCTION_ADDRESS}`);
      console.log(`   Actual vs Expected: ${routerImplementation.toLowerCase() === AUCTION_ADDRESS.toLowerCase() ? '✅ CORRECT' : '❌ WRONG'}`);
      
      if (routerImplementation.toLowerCase() === OFFER_ADDRESS.toLowerCase()) {
        console.log(`   🚨 CONFIRMED: Router delegates createAuction to OFFER contract instead of AUCTION!`);
      }
      
    } catch (error: any) {
      console.log(`   ❌ Router delegation test failed: ${error.message}`);
    }

    console.log("\n" + "=".repeat(70));
    console.log("SUMMARY & RECOMMENDATIONS");
    console.log("=".repeat(70));
    
    console.log("\n📋 Next Steps:");
    console.log("1. If createAuction maps to wrong contract, run UpdateAuctionExtension.ts");
    console.log("2. If extensions are missing, run Add*Extension.ts scripts");
    console.log("3. If selectors conflict, check for duplicate function signatures");
    console.log("4. Verify all mappings are correct before testing frontend");

  } catch (error: any) {
    console.error("\n❌ Extension mapping check failed:");
    console.error("Error:", error.message);
  }

  console.log("\n" + "=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });