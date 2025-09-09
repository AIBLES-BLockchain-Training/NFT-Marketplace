import { ethers, run } from "hardhat";

async function main() {
    await run("compile");
    console.log("Compiled contract...");

    const owner = "0xBac2B69C092d8F9D5A102D1762a197A90947DCbB";

    console.log("Deploying Permissions...");
    const Permissions = await ethers.getContractFactory("Permissions");
    const permissions = await Permissions.deploy(); 
    await permissions.waitForDeployment();

    // Lấy địa chỉ contract và đảm bảo đã resolve Promise
    const permissionsAddr = await permissions.getAddress(); 
    console.log("Permissions deployed to:", permissionsAddr);

    // Gọi initialize
    const tx = await permissions.initialize(owner);
    await tx.wait();
    console.log("Permissions initialized with admin:", owner);

    console.log("Wait to verify contract...");
    await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

    await run("verify:verify", {
        address: permissionsAddr, // đã là string
        constructorArguments: [],
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
