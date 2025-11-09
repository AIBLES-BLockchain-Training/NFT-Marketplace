import { ethers } from "hardhat";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper functions
async function getContracts() {
  const routerAddress = process.env['ADDRESS_ROUTER'];
  const permissionsAddress = process.env['ADDRESS_PERMISSIONS'];
  const testNFTAddress = "0x7408EEF6F74E89ACE60729CC29CC4274ee81aaE2"; // Example NFT address

  if (!routerAddress || !permissionsAddress) {
    throw new Error("Please set ADDRESS_ROUTER and ADDRESS_PERMISSIONS environment variables");
  }

  const [signer] = await ethers.getSigners();
  const permissionsInterface = (await ethers.getContractFactory("Permissions")).interface;
  const routerAsPermissions = new ethers.Contract(routerAddress, permissionsInterface, signer);

  // Direct connection to Permissions for constants (can't be called via delegatecall)
  const permissionsDirect = new ethers.Contract(permissionsAddress, permissionsInterface, signer);

  return { routerAsPermissions, permissionsDirect, testNFTAddress, signer };
}

// View functions
async function checkCurrencySupport(routerAsPermissions: any, currency: string) {
  console.log("Checking currency support...");
  const isSupported = await routerAsPermissions.supportedCurrencies(currency);
  const currencyName = currency === ethers.ZeroAddress ? "ETH" : currency;
  console.log(`Currency ${currencyName} is supported: ${isSupported}`);
  return isSupported;
}

async function checkRole(routerAsPermissions: any, role: string, account: string) {
  console.log(`Checking if ${account} has role ${role}...`);
  const hasRole = await routerAsPermissions.hasRole(role, account);
  console.log(`Has role: ${hasRole}`);
  return hasRole;
}

async function getRoleConstants(permissionsDirect: any) {
  console.log("Getting role constants...");
  console.log("(Note: Constants must be read directly from Permissions, not through Router)");

  const MANAGEMENT_ROLE = await permissionsDirect.MANAGEMENT_ROLE();
  const LISTING_ROLE = await permissionsDirect.LISTING_ROLE();
  const AUCTION_ROLE = await permissionsDirect.AUCTION_ROLE();
  const OFFER_ROLE = await permissionsDirect.OFFER_ROLE();
  const NFT_ROLE = await permissionsDirect.NFT_ROLE();

  console.log("Role Constants:");
  console.log("- MANAGEMENT_ROLE:", MANAGEMENT_ROLE);
  console.log("- LISTING_ROLE:", LISTING_ROLE);
  console.log("- AUCTION_ROLE:", AUCTION_ROLE);
  console.log("- OFFER_ROLE:", OFFER_ROLE);
  console.log("- NFT_ROLE:", NFT_ROLE);

  return { MANAGEMENT_ROLE, LISTING_ROLE, AUCTION_ROLE, OFFER_ROLE, NFT_ROLE };
}

// Currency management functions
async function addCurrencies(routerAsPermissions: any, currencies: string[]) {
  console.log("Adding currencies...");
  console.log("Currencies to add:", currencies);

  const tx = await routerAsPermissions.addCurrency(currencies);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Currencies added! Gas used:", receipt.gasUsed.toString());

  // Check events
  const events = receipt.logs.filter((log: any) => {
    try {
      const parsed = routerAsPermissions.interface.parseLog(log);
      return parsed?.name === "CurrencyAdded";
    } catch {
      return false;
    }
  });

  console.log(`${events.length} CurrencyAdded events emitted`);
}

async function removeCurrencies(routerAsPermissions: any, currencies: string[]) {
  console.log("Removing currencies...");
  console.log("Currencies to remove:", currencies);

  const tx = await routerAsPermissions.removeCurrency(currencies);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Currencies removed! Gas used:", receipt.gasUsed.toString());
}

// NFT role management functions
async function assignNFTRoles(routerAsPermissions: any, nfts: string[]) {
  console.log("Assigning NFT roles...");
  console.log("NFTs to whitelist:", nfts);

  const tx = await routerAsPermissions.assignNFTRole(nfts);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("NFT roles assigned! Gas used:", receipt.gasUsed.toString());

  // Check events
  const events = receipt.logs.filter((log: any) => {
    try {
      const parsed = routerAsPermissions.interface.parseLog(log);
      return parsed?.name === "NFTRoleAssigned";
    } catch {
      return false;
    }
  });

  console.log(`${events.length} NFTRoleAssigned events emitted`);
}

async function revokeNFTRoles(routerAsPermissions: any, nfts: string[]) {
  console.log("Revoking NFT roles...");
  console.log("NFTs to remove:", nfts);

  const tx = await routerAsPermissions.revokeNFTRole(nfts);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("NFT roles revoked! Gas used:", receipt.gasUsed.toString());
}

// User role management functions
async function assignUserRoles(routerAsPermissions: any, role: string, accounts: string[]) {
  console.log("Assigning user roles...");
  console.log("Role:", role);
  console.log("Accounts:", accounts);

  const tx = await routerAsPermissions.assignRole(role, accounts);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("User roles assigned! Gas used:", receipt.gasUsed.toString());

  // Check events
  const events = receipt.logs.filter((log: any) => {
    try {
      const parsed = routerAsPermissions.interface.parseLog(log);
      return parsed?.name === "UserRoleAssigned";
    } catch {
      return false;
    }
  });

  console.log(`${events.length} UserRoleAssigned events emitted`);
}

async function revokeUserRoles(routerAsPermissions: any, role: string, accounts: string[]) {
  console.log("Revoking user roles...");
  console.log("Role:", role);
  console.log("Accounts:", accounts);

  const tx = await routerAsPermissions.revokeRole(role, accounts);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("User roles revoked! Gas used:", receipt.gasUsed.toString());
}

// Role request functions
async function requestUserRoles(routerAsPermissions: any, roles: string[]) {
  console.log("Requesting user roles...");
  console.log("Roles:", roles);

  const tx = await routerAsPermissions.requestUserRoles(roles);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("User roles requested! Gas used:", receipt.gasUsed.toString());

  // Check events
  const events = receipt.logs.filter((log: any) => {
    try {
      const parsed = routerAsPermissions.interface.parseLog(log);
      return parsed?.name === "RoleRequested";
    } catch {
      return false;
    }
  });

  console.log(`${events.length} RoleRequested events emitted`);
}

async function requestNFTRole(routerAsPermissions: any, nftContract: string, tokenId: number) {
  console.log("Requesting NFT role...");
  console.log("NFT Contract:", nftContract);
  console.log("Token ID:", tokenId);

  const tx = await routerAsPermissions.requestNFTRole(nftContract, tokenId);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("NFT role requested! Gas used:", receipt.gasUsed.toString());

  // Check events
  const events = receipt.logs.filter((log: any) => {
    try {
      const parsed = routerAsPermissions.interface.parseLog(log);
      return parsed?.name === "NFTRoleRequested";
    } catch {
      return false;
    }
  });

  if (events.length > 0) {
    const parsed = routerAsPermissions.interface.parseLog(events[0]);
    console.log("NFT Role Request Details:");
    console.log("- NFT:", parsed.args.nft);
    console.log("- Token ID:", parsed.args.tokenId.toString());
    console.log("- Requester:", parsed.args.requester);
  }
}

async function registerNewRole(routerAsPermissions: any, role: string, adminRole: string) {
  console.log("Registering new role...");
  console.log("Role:", role);
  console.log("Admin Role:", adminRole);

  const tx = await routerAsPermissions.registerRole(role, adminRole);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Role registered! Gas used:", receipt.gasUsed.toString());
}

// Main execution flow
async function main() {
  const delayBetweenCalls = 1000;

  try {
    const { routerAsPermissions, permissionsDirect, testNFTAddress, signer } = await getContracts();
    console.log("Using signer:", signer.address);
    console.log("Router address:", await routerAsPermissions.getAddress());
    console.log("Permissions address:", await permissionsDirect.getAddress());
    console.log("");

    // Get role constants (must use direct connection)
    const roles = await getRoleConstants(permissionsDirect);
    await delay(delayBetweenCalls);

    // NOTE: Permissions contract uses unstructured storage, so it cannot work properly
    // through Router's delegatecall. All calls must go directly to Permissions contract.
    console.log("NOTE: Using direct Permissions contract (not through Router)");
    console.log("Reason: Permissions uses EIP-1967 storage which doesn't work with delegatecall\n");

    // Define functions to call - All use permissionsDirect instead of routerAsPermissions
    const functionsToCall = [
      // Step 1: Add ETH as supported currency
      // () => addCurrencies(permissionsDirect, [ethers.ZeroAddress]),

      // Step 2: Assign NFT role to test NFT
      // () => assignNFTRoles(permissionsDirect, ["0x01b398945A4a005c074e472aeefC04081485fBBC"]),

      // Step 3: Assign LISTING_ROLE to signer
      // () => assignUserRoles(permissionsDirect, roles.LISTING_ROLE, [signer.address]),

      // Verify setup
      () => checkCurrencySupport(permissionsDirect, ethers.ZeroAddress),
      () => checkRole(permissionsDirect, roles.LISTING_ROLE, signer.address),
      () => checkRole(permissionsDirect, roles.NFT_ROLE, "0x01b398945A4a005c074e472aeefC04081485fBBC"),
    ];

    // Execute all functions
    for (const fn of functionsToCall) {
      await fn();
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
