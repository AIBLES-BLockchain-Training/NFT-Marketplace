import { ethers, run } from "hardhat";

async function main() {
    await run("compile");
    console.log("Compiled contract...");

    console.log("Deploying Listing...");
    const owner = "0xEcf58FE15b7606DA86D7CAa7B58aa878D206041a";

    const Listing = await ethers.getContractFactory("Listing");
    const listing = await Listing.deploy(owner);
    
    const listingAddr = await listing.getAddress();
    console.log("Listing deployed to:", listingAddr);

    console.log("Wait to verify contract");

    await new Promise((resolve) => {
        setTimeout(resolve, 60 * 1000);
    });
    await run("verify:verify", {
        address: listingAddr,
        constructorArguments: [owner],
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
