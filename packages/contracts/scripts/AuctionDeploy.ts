import { ethers, run } from 'hardhat';

async function main() {
  await run('compile');
  console.log('Compiled contract...');

  const permissionsAddr = process.env['ADDRESS_PERMISSIONS'];

  console.log('Deploying Auction contract...');
  const Auction = await ethers.getContractFactory('NFTAuction');
  const auction = await Auction.deploy(); // Không truyền permissionsAddr
  await auction.waitForDeployment();

  const auctionAddr = await auction.getAddress();
  console.log('Auction deployed to:', auctionAddr);

  console.log('Initializing contract...');
  const tx = await auction['initializeAuction'](permissionsAddr);
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
