import { ethers, run } from 'hardhat';

async function main() {
  await run('compile');
  console.log('Compiled contract...');

  console.log('\n='.repeat(70));
  console.log('DEPLOYING LISTING CONTRACT');
  console.log('='.repeat(70));

  const [deployer] = await ethers.getSigners();
  console.log('\nDeploying with account:', deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('   Account balance:', ethers.formatEther(balance), 'ETH');

  console.log('\nDeploying Listing implementation...');
  const Listing = await ethers.getContractFactory('Listing');

  // Listing has no constructor, deploy directly
  const listing = await Listing.deploy();
  await listing.waitForDeployment();

  const listingAddr = await listing.getAddress();
  console.log('Listing deployed to:', listingAddr);

  console.log('\nWaiting 60 seconds before verification...');
  await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

  console.log('\nVerifying contract on Etherscan...');
  try {
    await run('verify:verify', {
      address: listingAddr,
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

  console.log('\n' + '='.repeat(70));
  console.log('DEPLOYMENT SUMMARY');
  console.log('='.repeat(70));
  console.log('Listing Implementation:', listingAddr);
  console.log('\nNEXT STEPS:');
  console.log('1. Set ADDRESS_LISTING=' + listingAddr + ' in .env');
  console.log('2. Run AddListingExtension.ts to register in ExtensionManager');
  console.log('3. Run InitListing.ts to initialize with:');
  console.log('   - Permissions contract');
  console.log('   - Router address');
  console.log('   - Fee Receiver (Multisig Wallet)');
  console.log('='.repeat(70) + '\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
