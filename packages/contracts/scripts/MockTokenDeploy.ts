import { ethers, run } from 'hardhat';

async function main() {
  await run('compile');
  console.log('Compiled contract...');

  const owner = '0xBac2B69C092d8F9D5A102D1762a197A90947DCbB';

  console.log('Deploying MockToken contract...');
  const MockToken = await ethers.getContractFactory('MockToken');
  const mockToken = await MockToken.deploy(owner);
  await mockToken.waitForDeployment();

  const mockTokenAddress = await mockToken.getAddress();
  console.log('MockToken deployed to:', mockTokenAddress);

  await run('verify:verify', {
    address: mockTokenAddress,
    constructorArguments: [owner],
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
