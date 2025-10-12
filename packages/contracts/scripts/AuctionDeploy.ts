import { ethers, run } from 'hardhat';

async function main() {
  await run('compile');
  console.log('Compiled contract...');

  const permissionsAddr = '0x37034119b05f710acD1a7983105FEAEeB80851A6';

  console.log('Deploying Auction contract...');
  const Auction = await ethers.getContractFactory('NFTAuction');
  const auction = await Auction.deploy(); // Không truyền permissionsAddr
  await auction.waitForDeployment();

  const auctionAddr = await auction.getAddress();
  console.log('Auction deployed to:', auctionAddr);

  console.log('Initializing contract...');
  const tx = await auction.initializeAuction(permissionsAddr);
  await tx.wait();
  console.log('Auction initialized with permissions address:', permissionsAddr);

  console.log('Waiting before verification...');
  await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

  await run('verify:verify', {
    address: auctionAddr,
    constructorArguments: [],
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
