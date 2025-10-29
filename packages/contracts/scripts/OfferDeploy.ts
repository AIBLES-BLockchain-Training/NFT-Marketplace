import fs from 'fs';
import { ethers, network, run } from 'hardhat';
import path from 'path';

async function main() {
  await run('compile');
  console.log('Compiled contracts...');
  console.log('Network:', network.name);

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');

  // Deploy configuration
  const config = {
    feeRecipient: process.env['FEE_RECIPIENT'] || deployer.address,
    feePercentage: 250, // 2.5%
    permissionsAddress: process.env['PERMISSIONS_ADDRESS'] || '', // Must be provided
  };

  // Validate required parameters
  if (!config.permissionsAddress) {
    console.error('PERMISSIONS_ADDRESS environment variable is required!');
    console.log('Set it like: export PERMISSIONS_ADDRESS=0x...');
    process.exit(1);
  }

  console.log('\n📋 Deploy Configuration:');
  console.log('- Deployer:', deployer.address);
  console.log('- Fee Recipient:', config.feeRecipient);
  console.log(' - Fee Percentage:', config.feePercentage, '(2.5%)');
  console.log('- Permissions:', config.permissionsAddress);

  try {
    // Deploy NFTOffer contract
    console.log('\nDeploying NFTOffer...');
    const NFTOfferFactory = await ethers.getContractFactory('NFTOffer');
    const nftOffer = await NFTOfferFactory.deploy(config.feeRecipient, config.feePercentage, config.permissionsAddress);
    await nftOffer.waitForDeployment();

    const nftOfferAddr = await nftOffer.getAddress();
    const txHash = nftOffer.deploymentTransaction()?.hash;

    console.log('NFTOffer deployed to:', nftOfferAddr);
    console.log('Transaction hash:', txHash);

    // Save deployment info
    const deploymentData = {
      network: network.name,
      deployer: deployer.address,
      deployedAt: new Date().toISOString(),
      contract: {
        name: 'NFTOffer',
        address: nftOfferAddr,
        txHash: txHash,
      },
      config,
    };

    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }

    // Save to file
    const filename = `nft-offer-${network.name}-${Date.now()}.json`;
    fs.writeFileSync(path.join(deploymentsDir, filename), JSON.stringify(deploymentData, null, 2));
    console.log('💾 Deployment data saved to:', filename);

    // Verify contract if on testnet/mainnet
    if (network.name !== 'hardhat' && network.name !== 'localhost') {
      console.log('\nWaiting 60 seconds before verification...');
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

      try {
        console.log('Verifying contract on Etherscan...');
        await run('verify:verify', {
          address: nftOfferAddr,
          constructorArguments: [config.feeRecipient, config.feePercentage, config.permissionsAddress],
        });
        console.log('Contract verified successfully!');
      } catch (error: any) {
        console.log('Verification failed:', error.message);
        console.log('You can verify manually later with these arguments:');
        console.log('- Address:', nftOfferAddr);
        console.log(
          '- Constructor args:',
          JSON.stringify([config.feeRecipient, config.feePercentage, config.permissionsAddress]),
        );
      }
    }

    console.log('\nDeployment completed successfully!');
    console.log('Contract Address:', nftOfferAddr);
    console.log('Network:', network.name);
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
