import { ethers } from "hardhat";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper functions
async function getContracts() {
 const routerAddress = process.env['ADDRESS_ROUTER'] || "";
 const permissionsAddress = process.env['ADDRESS_PERMISSIONS'] || "";
 const feeReceiverAddress = process.env['ADDRESS_FEE_RECEIVER'] || "";

 if (!routerAddress || !permissionsAddress || !feeReceiverAddress) {
  throw new Error("Please set ADDRESS_ROUTER, ADDRESS_PERMISSIONS, and ADDRESS_FEE_RECEIVER environment variables");
 }

 const [signer] = await ethers.getSigners();
  // Lấy ABI của NFTAuction...
 const auctionInterface = (await ethers.getContractFactory("NFTAuction")).interface;
  // ...nhưng trỏ nó vào địa chỉ Router (Proxy)
 const routerAsAuction = new ethers.Contract(routerAddress, auctionInterface, signer);

 return { routerAsAuction, routerAddress, permissionsAddress, feeReceiverAddress, signer };
}

// Initialization functions
async function checkCurrentPermissionContract(routerAsAuction: any) {
 console.log("Checking current permission contract...");
 try {
    // Sửa tên hàm: permissionContract() -> getPermissionsContract()
  const currentPermission = await routerAsAuction.getPermissionsContract();
  console.log("Current permission contract:", currentPermission);
  return currentPermission;
 } catch (error) {
  console.log("No permission contract set yet");
  return ethers.ZeroAddress; // Giả định địa chỉ 0x0...
 }
}

async function initializeAuction(
 routerAsAuction: any,
 permissionsAddress: string,
 routerAddress: string,
 feeReceiverAddress: string
) {
 console.log("Initializing Auction contract..."); // Sửa log
 console.log("- Permissions address:", permissionsAddress);
 console.log("- Router address:", routerAddress);
 console.log("- Fee Receiver address (Multisig):", feeReceiverAddress);

  // Sửa tên hàm: initializeListing -> initializeAuction
 const tx = await routerAsAuction.initializeAuction(
  permissionsAddress,
  routerAddress,
  feeReceiverAddress
 );
 console.log("Transaction hash:", tx.hash);

 const receipt = await tx.wait();
 console.log("Auction initialized! Gas used:", receipt.gasUsed.toString()); // Sửa log
}

async function setPermissionsContract(routerAsAuction: any, permissionsAddress: string) {
 console.log("Setting permission contract...");
 console.log("New permissions address:", permissionsAddress);
 
  // Sửa tên hàm: setPermissionContract -> setPermissionsContract
 const tx = await routerAsAuction.setPermissionsContract(permissionsAddress);
 console.log("Transaction hash:", tx.hash);
 
 const receipt = await tx.wait();
 console.log("Permission contract updated! Gas used:", receipt.gasUsed.toString());
}

async function setCurrencyFee(routerAsAuction: any, currency: string, fee: string) {
 const currencyName = currency === ethers.ZeroAddress ? "ETH" : currency;
 console.log(`Setting fee for ${currencyName}...`);
 console.log(`Fee: ${fee} basis points (${Number(fee) / 100}%)`);
 
 const tx = await routerAsAuction.setCurrencyFee(currency, fee);
 console.log("Transaction hash:", tx.hash);
 
 const receipt = await tx.wait();
 console.log("Currency fee set! Gas used:", receipt.gasUsed.toString());
}

async function verifyConfiguration(routerAsAuction: any, permissionsAddress: string) {
 console.log("Verifying configuration...");
 
  // Sửa tên hàm: permissionContract() -> getPermissionsContract()
 const currentPermission = await routerAsAuction.getPermissionsContract();
 console.log("Permission contract:", currentPermission);
 console.log("Matches expected:", currentPermission.toLowerCase() === permissionsAddress.toLowerCase());
 
 const ethFee = await routerAsAuction.getCurrencyFee(ethers.ZeroAddress);
 console.log("ETH fee:", ethFee.toString(), `(${Number(ethFee) / 100}%)`);
 
 // Bỏ hàm decimalListing() vì nó không có trong Auction
 
 return currentPermission.toLowerCase() === permissionsAddress.toLowerCase();
}

async function main() {
 const delayBetweenCalls = 1000;

 try {
  const { routerAsAuction, routerAddress, permissionsAddress, feeReceiverAddress, signer } = await getContracts();
  console.log("Using signer:", signer.address);
  console.log("Router address:", await routerAsAuction.getAddress());
  console.log("");

  const functionsToCall = [
   () => checkCurrentPermissionContract(routerAsAuction),

   async (currentPermission: string) => {
    if (currentPermission === ethers.ZeroAddress) {
     await initializeAuction(routerAsAuction, permissionsAddress, routerAddress, feeReceiverAddress);
    } else if (currentPermission.toLowerCase() !== permissionsAddress.toLowerCase()) {
     console.log("Different permission contract already set, updating...");
     await setPermissionsContract(routerAsAuction, permissionsAddress); // Sửa tên hàm
    } else {
     console.log("Auction already initialized with correct permissions"); // Sửa log
    }
   },

   () => setCurrencyFee(routerAsAuction, ethers.ZeroAddress, "250"), // 2.5% for ETH

   () => verifyConfiguration(routerAsAuction, permissionsAddress)
  ];

  let result: any;
  for (const fn of functionsToCall) {
   result = await fn(result) || result;
   await delay(delayBetweenCalls);
  }

  console.log("\nAuction initialization complete!"); // Sửa log

 } catch (error) {
  console.error("Error:", error);
  process.exit(1);
 }
}

if (require.main === module) {
 main().catch(console.error);
}