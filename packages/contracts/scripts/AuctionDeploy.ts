import { ethers, run } from 'hardhat';

async function main() {
  await run('compile');
  console.log('Compiled contract...');

  const permissionsAddr = process.env['ADDRESS_PERMISSIONS'];
  const routerAddr = process.env['ADDRESS_ROUTER'];
  const feeReceiverAddr = process.env['ADDRESS_FEE_RECEIVER'];

  if (!permissionsAddr || !routerAddr || !feeReceiverAddr) {
    throw new Error('Please set ADDRESS_PERMISSIONS, ADDRESS_ROUTER, and ADDRESS_FEE_RECEIVER in your .env file');
  }

  console.log('================= Deployment Parameters ================');
  console.log('Permissions Address:', permissionsAddr);
  console.log('Router Address:', routerAddr);
  console.log('Fee Receiver Address:', feeReceiverAddr);
  console.log('========================================================');

  console.log('Deploying Auction contract...');
  const Auction = await ethers.getContractFactory('NFTAuction');
  const auction = await Auction.deploy(); // Không truyền permissionsAddr
  await auction.waitForDeployment();

  const auctionAddr = await auction.getAddress();
  console.log('Auction deployed to:', auctionAddr);

  console.log('Initializing contract...');
  const tx = await auction['initializeAuction'](permissionsAddr, routerAddr, feeReceiverAddr);
  await tx.wait();
  
  console.log('Auction initialized with permissions address:', permissionsAddr);
  console.log('Auction initialized with router address:', routerAddr);
  console.log('Auction initialized with fee receiver address:', feeReceiverAddr);

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
