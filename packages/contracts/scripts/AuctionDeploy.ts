import { ethers, run } from 'hardhat';

async function main() {
  await run('compile');
  console.log('Compiled contract...');

  console.log('Deploying Auction contract...');
  const Auction = await ethers.getContractFactory('NFTAuction');
  const auction = await Auction.deploy(); // Không truyền permissionsAddr
  await auction.waitForDeployment();

  const auctionAddr = await auction.getAddress();
  console.log('Auction deployed to:', auctionAddr);

 console.log('\nWaiting 60 seconds before verification...');
  await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

  console.log('\nVerifying contract on Etherscan...');
  try {
    await run('verify:verify', {
      address: auctionAddr,
      constructorArguments: [], // No constructor arguments
    });
    console.log('Contract verified!');
  } catch (error: any) {
    if (error.message.includes('Already Verified')) {
      console.log('Contract already verified!');
    } else {
      console.error('Verification failed:', error.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});