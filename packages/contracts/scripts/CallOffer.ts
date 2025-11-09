import { Signer } from 'ethers';
import { ethers } from 'hardhat';

type OfferParams = {
  assetContract: string;
  tokenId: number;
  quantity: number;
  currency: string;
  totalPrice: bigint;
  expirationTimestamp: number;
};

class Offer {
  public contract: any;

  constructor(contract: any) {
    this.contract = contract;
  }

  static async init(address: string, signer: Signer) {
    console.log(`Initializing Offer via Router at address: ${address}`);
    // IMPORTANT: Use Router address with NFTOffer interface (delegatecall pattern)
    const offerInterface = (await ethers.getContractFactory('NFTOffer')).interface;
    const contract = new ethers.Contract(address, offerInterface, signer);
    return new Offer(contract);
  }

  async getTotalOffers() {
    console.log('Fetching total offers...');
    return await this.contract.totalOffers();
  }

  async getOfferDetails(offerId: number) {
    console.log(`Fetching details for offer ID: ${offerId}`);
    return await this.contract.getOffer(offerId);
  }

  async getAllOffers(startId: number, endId: number) {
    console.log('Fetching all offers...');
    return await this.contract.getAllOffers(startId, endId);
  }

  async getAllValidOffers(startId: number, endId: number) {
    console.log('Fetching all valid offers...');
    return await this.contract.getAllValidOffers(startId, endId);
  }

  async makeOffer(offerParams: OfferParams) {
    console.log('Creating offer with parameters:', offerParams);
    try {
      const tx = await this.contract.makeOffer(offerParams);
      await tx.wait();
      console.log('Offer created successfully:', tx);
      return tx;
    } catch (error: any) {
      console.error('Error creating offer:', error);
      if (error.data) {
        console.error('Error data:', error.data);
      }
      if (error.reason) {
        console.error('Revert reason:', error.reason);
      }
      throw error;
    }
  }

  async cancelOffer(offerId: number) {
    console.log(`Cancelling offer ID: ${offerId}`);
    try {
      const tx = await this.contract.cancelOffer(offerId);
      await tx.wait();
      console.log(`Offer ID ${offerId} cancelled successfully.`);
      return tx;
    } catch (error) {
      console.error('Error cancelling offer:', error);
      throw new Error(`Failed to cancel offer ID ${offerId}`);
    }
  }

  async acceptOffer(offerId: number) {
    console.log(`Accepting offer ID: ${offerId}`);
    try {
      const tx = await this.contract.acceptOffer(offerId);
      await tx.wait();
      console.log(`Offer ID ${offerId} accepted successfully.`);
      return tx;
    } catch (error) {
      console.error('Error accepting offer:', error);
      throw new Error(`Failed to accept offer ID ${offerId}`);
    }
  }

  async getFeeRecipient() {
    console.log('Fetching fee recipient...');
    return await this.contract.feeRecipient();
  }

  async getFeePercentage() {
    console.log('Fetching fee percentage...');
    return await this.contract.feePercentage();
  }

  async setFeeRecipient(newFeeRecipient: string) {
    console.log('Setting fee recipient...');
    try {
      const tx = await this.contract.setFeeRecipient(newFeeRecipient);
      await tx.wait();
      console.log('Fee recipient set successfully:', tx);
      return tx;
    } catch (error) {
      console.error('Error setting fee recipient:', error);
      throw new Error('Failed to set fee recipient');
    }
  }

  async setFeePercentage(newFeePercentage: number) {
    console.log('Setting fee percentage...');
    try {
      const tx = await this.contract.setFeePercentage(newFeePercentage);
      await tx.wait();
      console.log('Fee percentage set successfully:', tx);
      return tx;
    } catch (error) {
      console.error('Error setting fee percentage:', error);
      throw new Error('Failed to set fee percentage');
    }
  }
}

async function main() {
  const [signer] = await ethers.getSigners();

  // IMPORTANT: Use ROUTER address, not Offer contract address!
  // Events are emitted from Router when using delegatecall
  const ROUTER_ADDRESS = process.env['ADDRESS_ROUTER'] || '0x...'; // TODO: Set ADDRESS_ROUTER env variable

  if (!ROUTER_ADDRESS || ROUTER_ADDRESS === '0x...') {
    throw new Error('Please set ADDRESS_ROUTER environment variable');
  }

  const offer = await Offer.init(ROUTER_ADDRESS, signer);

  console.log('Signer address:', await signer.getAddress());

  // Initialize Offer if needed
  try {
    console.log('\nInitializing Offer contract...');
    const PERMISSIONS_ADDRESS = process.env['ADDRESS_PERMISSIONS'] || '';
    const FEE_RECIPIENT = await signer.getAddress();
    const FEE_PERCENTAGE = 250; // 2.5%

    if (!PERMISSIONS_ADDRESS) {
      console.error('ADDRESS_PERMISSIONS environment variable is required!');
      process.exit(1);
    }

    const tx = await offer.contract.initializeOffer(PERMISSIONS_ADDRESS, FEE_RECIPIENT, FEE_PERCENTAGE);
    console.log('Transaction hash:', tx.hash);
    await tx.wait();
    console.log('Offer initialized successfully!');
  } catch (error: any) {
    if (error.message.includes('Already initialized')) {
      console.log('Offer already initialized');
    } else {
      console.log('Initialization error:', error.message);
    }
  }

  // Get total offers (skip if causing issues)
  // const totalOffers = await offer.getTotalOffers();
  // console.log('\nTotal Offers:', totalOffers.toString());

  // Example: Get offer details
  // const offerDetails = await offer.getOfferDetails(1);
  // console.log('Offer Details:', offerDetails);

  // Example: Get all offers
  // const allOffers = await offer.getAllOffers(0, 10);
  // console.log('All Offers:', allOffers);

  // Example: Get all valid offers
  // const allValidOffers = await offer.getAllValidOffers(0, 10);
  // console.log('All Valid Offers:', allValidOffers);

  // Example: Create a new offer
  const MOCK_TOKEN_ADDRESS = process.env['ADDRESS_MOCK_TOKEN'] || '';
  const NFT_CONTRACT_ADDRESS = process.env['ADDRESS_NFT'] || '';

  if (!MOCK_TOKEN_ADDRESS || !NFT_CONTRACT_ADDRESS) {
    console.error('ADDRESS_MOCK_TOKEN and ADDRESS_NFT environment variables are required!');
    process.exit(1);
  }

  const offerAmount = ethers.parseEther('10'); // 10 MTK

  // Approve MockToken for Router
  console.log('\nApproving MockToken for Router...');
  const mockToken = await ethers.getContractAt('MockToken', MOCK_TOKEN_ADDRESS);
  const approveTx = await mockToken['approve'](ROUTER_ADDRESS, offerAmount);
  await approveTx.wait();
  console.log('MockToken approved');

  const offerParams: OfferParams = {
    assetContract: NFT_CONTRACT_ADDRESS,
    tokenId: 1,
    quantity: 1, // Must be 1 for ERC721
    currency: MOCK_TOKEN_ADDRESS,
    totalPrice: offerAmount,
    expirationTimestamp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
  };
  await offer.makeOffer(offerParams);

  // Example: Cancel an offer
  // await offer.cancelOffer(1);

  // Example: Accept an offer (must be called by NFT owner)
  // await offer.acceptOffer(1);

  // Example: Get fee info
  // const feeRecipient = await offer.getFeeRecipient();
  // console.log('Fee Recipient:', feeRecipient);
  
  // const feePercentage = await offer.getFeePercentage();
  // console.log('Fee Percentage:', feePercentage.toString(), 'basis points');

  // Example: Admin functions (requires MANAGEMENT_ROLE)
  // await offer.setFeeRecipient('0x...');
  // await offer.setFeePercentage(300); // 3%
}

main().catch(console.error);