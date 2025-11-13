import { ethers } from "hardhat";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper functions
async function getContracts() {
  const listingAddress = process.env['ADDRESS_LISTING'] || "";
  const permissionsAddress = process.env['ADDRESS_PERMISSIONS'] || "";
  const feeReceiverAddress = process.env['ADDRESS_FEE_RECEIVER'] || "";

  if (!listingAddress || !permissionsAddress || !feeReceiverAddress) {
    throw new Error("Please set ADDRESS_LISTING, ADDRESS_PERMISSIONS, and ADDRESS_FEE_RECEIVER environment variables");
  }

  const [signer] = await ethers.getSigners();
  const listing = await ethers.getContractAt("Listing", listingAddress, signer);

  return { listing, permissionsAddress, feeReceiverAddress, signer };
}

// Initialization functions
async function checkCurrentPermissionContract(routerAsListing: any) {
  console.log("Checking current permission contract...");
  try {
    const currentPermission = await routerAsListing.permissionContract();
    console.log("Current permission contract:", currentPermission);
    return currentPermission;
  } catch (error) {
    console.log("No permission contract set yet");
    return ethers.ZeroAddress;
  }
}

async function initializeListing(
  routerAsListing: any,
  permissionsAddress: string,
  feeReceiverAddress: string
) {
  console.log("Initializing Listing contract...");
  console.log("- Permissions address:", permissionsAddress);
  console.log("- Fee Receiver address (Multisig):", feeReceiverAddress);

  const tx = await routerAsListing.initializeListing(
    permissionsAddress,
    feeReceiverAddress
  );
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Listing initialized! Gas used:", receipt.gasUsed.toString());
}

async function setPermissionContract(routerAsListing: any, permissionsAddress: string) {
  console.log("Setting permission contract...");
  console.log("New permissions address:", permissionsAddress);
  
  const tx = await routerAsListing.setPermissionContract(permissionsAddress);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Permission contract updated! Gas used:", receipt.gasUsed.toString());
}

async function setCurrencyFee(routerAsListing: any, currency: string, fee: string) {
  const currencyName = currency === ethers.ZeroAddress ? "ETH" : currency;
  console.log(`Setting fee for ${currencyName}...`);
  console.log(`Fee: ${fee} basis points (${Number(fee) / 100}%)`);
  
  const tx = await routerAsListing.setCurrencyFee(currency, fee);
  console.log("Transaction hash:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("Currency fee set! Gas used:", receipt.gasUsed.toString());
}

async function verifyConfiguration(routerAsListing: any, permissionsAddress: string) {
  console.log("Verifying configuration...");
  
  const currentPermission = await routerAsListing.permissionContract();
  console.log("Permission contract:", currentPermission);
  console.log("Matches expected:", currentPermission === permissionsAddress);
  
  const ethFee = await routerAsListing.getCurrencyFee(ethers.ZeroAddress);
  console.log("ETH fee:", ethFee.toString(), `(${Number(ethFee) / 100}%)`);
  
  const decimals = await routerAsListing.decimalListing();
  console.log("Listing decimals:", decimals.toString());
  
  return currentPermission === permissionsAddress;
}

async function main() {
  const delayBetweenCalls = 1000;

  try {
    const { routerAsListing, routerAddress, permissionsAddress, feeReceiverAddress, signer } = await getContracts();
    console.log("Using signer:", signer.address);
    console.log("Router address:", await routerAsListing.getAddress());
    console.log("");

    const functionsToCall = [
      () => checkCurrentPermissionContract(routerAsListing),

      async (currentPermission: string) => {
        if (currentPermission === ethers.ZeroAddress) {
          await initializeListing(routerAsListing, permissionsAddress, feeReceiverAddress);
        } else if (currentPermission !== permissionsAddress) {
          console.log("Different permission contract already set, updating...");
          await setPermissionContract(routerAsListing, permissionsAddress);
        } else {
          console.log("Listing already initialized with correct permissions");
        }
      },

      () => setCurrencyFee(routerAsListing, ethers.ZeroAddress, "250"), // 2.5% for ETH

      () => verifyConfiguration(routerAsListing, permissionsAddress)
    ];

    let result: any;
    for (const fn of functionsToCall) {
      result = await fn(result) || result;
      await delay(delayBetweenCalls);
    }

    console.log("\nListing initialization complete!");

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}