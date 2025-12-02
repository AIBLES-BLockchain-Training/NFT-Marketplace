import { ethers } from 'hardhat';

async function main() {
  console.log('=== INITIALIZING OFFER VIA ROUTER ===\n');

  const [signer] = await ethers.getSigners();
  const ROUTER_ADDRESS = process.env['ADDRESS_ROUTER'] || '';
  const PERMISSIONS_ADDRESS = process.env['ADDRESS_PERMISSIONS'] || '';
  const FEE_RECIPIENT = process.env['ADDRESS_MULTISIG'] || '';
  const FEE_PERCENTAGE = 250; // 2.5%

  if (!ROUTER_ADDRESS || !PERMISSIONS_ADDRESS) {
    console.error('ADDRESS_ROUTER and ADDRESS_PERMISSIONS environment variables are required!');
    process.exit(1);
  }

  console.log('Signer:', signer.address);
  console.log('Router:', ROUTER_ADDRESS);
  console.log('Permissions:', PERMISSIONS_ADDRESS);
  console.log('Fee Recipient:', FEE_RECIPIENT);
  console.log('Fee Percentage:', FEE_PERCENTAGE, '(2.5%)');
  console.log('');

  const offerInterface = (await ethers.getContractFactory('NFTOffer')).interface;
  const routerAsOffer = new ethers.Contract(ROUTER_ADDRESS, offerInterface, signer);

  // Check if already initialized
  console.log('Checking if Offer is already initialized...');
  try {
    const currentPermissions = await routerAsOffer['permissions']();
    console.log('Current Permissions address:', currentPermissions);

    if (currentPermissions !== ethers.ZeroAddress) {
      console.log('Offer already initialized!');
      console.log('');
      return;
    }
  } catch (error) {
    console.log('Offer not initialized yet, proceeding...');
  }

  // Initialize Offer
  console.log('\nInitializing Offer...');
  try {
    const tx = await routerAsOffer['initializeOffer'](
      PERMISSIONS_ADDRESS,
      FEE_RECIPIENT,
      FEE_PERCENTAGE
    );
    console.log('Transaction hash:', tx.hash);

    const receipt = await tx.wait();
    console.log('Offer initialized successfully!');
    console.log('Gas used:', receipt.gasUsed.toString());
    console.log('');

    // Verify
    const verifyPermissions = await routerAsOffer['permissions']();
    const verifyFeeRecipient = await routerAsOffer['feeRecipient']();
    const verifyFeePercentage = await routerAsOffer['feePercentage']();

    console.log('=== VERIFICATION ===');
    console.log('Permissions:', verifyPermissions, verifyPermissions === PERMISSIONS_ADDRESS ? 'OK' : 'FAIL');
    console.log('Fee Recipient:', verifyFeeRecipient, verifyFeeRecipient === FEE_RECIPIENT ? 'OK' : 'FAIL');
    console.log('Fee Percentage:', verifyFeePercentage.toString(), verifyFeePercentage.toString() === FEE_PERCENTAGE.toString() ? 'OK' : 'FAIL');

    console.log('\nOffer is ready to use via Router!');

  } catch (error: any) {
    if (error.message.includes('Already initialized')) {
      console.log('Offer already initialized (from error)');
    } else {
      console.error('Error initializing:', error.message);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
