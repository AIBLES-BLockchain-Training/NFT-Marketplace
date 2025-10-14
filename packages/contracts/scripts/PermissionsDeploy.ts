import { ethers, run } from 'hardhat';

async function main() {
  await run('compile');
  console.log('Compiled contract...');

  console.log('Deploying Permissions...');
  const owner = '0xEcf58FE15b7606DA86D7CAa7B58aa878D206041a';

  const Permissions = await ethers.getContractFactory("Permissions");
  const permissions = await Permissions.deploy();
  
  const permissionsAddr = await permissions.getAddress();
  console.log("Permissions deployed to:", permissionsAddr);
  
  console.log("Initializing Permissions contract...");
  const tx = await permissions['initialize'](owner);
  await tx.wait();
  console.log("Permissions initialized with admin:", owner);

  await new Promise((resolve) => {
      setTimeout(resolve, 60 * 1000);
  });
  await run("verify:verify", {
      address: permissionsAddr,
      constructorArguments: [],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
