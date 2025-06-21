import { ethers, run } from 'hardhat';

async function main() {
  await run('compile');
  console.log('Compiled contract...');

  console.log('Deploying Offer...');

  const [deployer] = await ethers.getSigners();

  const feeRecipient = process.env['FEE_RECIPIENT'] || deployer.address; // Fallback to deployer
  const feePercentage = 250;
  const permissionsAddress = '0xEcf58FE15b7606DA86D7CAa7B58aa878D206041a';

  console.log('📋 Deploy Configuration:');
  console.log('- Deployer:', deployer.address);
  console.log('- Fee Recipient:', feeRecipient);
  console.log('- Fee Percentage:', feePercentage, '(2.5%)');
  console.log('- Permissions:', permissionsAddress);

  const NFTOffer = await ethers.getContractFactory('NFTOffer');
  console.log('Deploying Offer contract...');

  const nftOffer = await NFTOffer.deploy(feeRecipient, feePercentage, permissionsAddress);
  await nftOffer.waitForDeployment();

  const nftOfferAddr = await nftOffer.getAddress();
  console.log('Offer deployed to:', nftOfferAddr);
  console.log('Transaction hash:', nftOffer.deploymentTransaction()?.hash);

  console.log('Waiting 60 seconds before verification...');
  await new Promise((resolve) => {
    setTimeout(resolve, 60 * 1000);
  });

  try {
    console.log('🔍 Verifying contract on Etherscan...');
    await run('verify:verify', {
      address: nftOfferAddr,
      constructorArguments: [feeRecipient, feePercentage, permissionsAddress],
    });
    console.log('Contract verified successfully!');
  } catch (error) {
    console.log('Verification failed:', error);
    console.log('You can verify manually later with these arguments:');
    console.log('- Address:', nftOfferAddr);
    console.log('- Constructor args:', [feeRecipient, feePercentage, permissionsAddress]);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
