import { ethers, network, run } from 'hardhat';

async function main() {
  const networkName = network.name;
  console.log(`Deploying to ${networkName} network...`);
  const deployer = (await ethers.getSigners())[0];

  // Compile contracts.
  await run('compile');
  console.log('Compiled contracts...');

  // Deploy contracts.
  const MockUSDT = await ethers.getContractFactory('MockERC20');

  const contract = await MockUSDT.connect(deployer).deploy('Mock USDT', 'M-USDT', 0);

  // Wait for the contract to be deployed before exiting the script.
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`Deployed to ${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
