import { ethers, run } from 'hardhat';

async function main() {
  await run('compile');
  console.log('Compiled contract...');

  console.log('Deploying MockERC721 contract...');
  const MockERC721 = await ethers.getContractFactory('MockERC721');
  const mockERC721 = await MockERC721.deploy();
  await mockERC721.waitForDeployment();

  const mockERC721Address = await mockERC721.getAddress();
  console.log('MockERC721 deployed to:', mockERC721Address);

  await run('verify:verify', {
    address: mockERC721Address,
    constructorArguments: [],
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
