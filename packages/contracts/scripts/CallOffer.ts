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
  private contract: any;

  constructor(contract: any) {
    this.contract = contract;
  }

  static async init(address: string, signer: Signer) {
    console.log(`Initializing Offer contract at address: ${address}`);
    const contract = await ethers.getContractAt('NFTOffer', address, signer);
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
    } catch (error) {
      console.error('Error creating offer:', error);
      throw new Error('Failed to create offer');
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
  const [signer, offerMaker, assetOwner] = await ethers.getSigners();
  
  // Replace with your deployed Offer contract address
  const OFFER_CONTRACT_ADDRESS = '0x...'; // TODO: Add your deployed offer contract address here
  
  const offer = await Offer.init(OFFER_CONTRACT_ADDRESS, signer);
  // const offer = await Offer.init(OFFER_CONTRACT_ADDRESS, offerMaker);
  // const offer = await Offer.init(OFFER_CONTRACT_ADDRESS, assetOwner);

  console.log('Signer address:', await signer.getAddress());
  console.log('Offer maker address:', await offerMaker.getAddress());
  console.log('Asset owner address:', await assetOwner.getAddress());

  // Get total offers
  const totalOffers = await offer.getTotalOffers();
  console.log('Total Offers:', totalOffers.toString());

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
  // const offerParams: OfferParams = {
  //   assetContract: '0x600883Fb6F707e0EE8efD2B88AD488f54f62cA32', // NFT contract address
  //   tokenId: 1,
  //   quantity: 1, // Must be 1 for ERC721
  //   currency: '0xF43843516260b1b78BF77148F149cabD9240425A', // ERC20 token address
  //   totalPrice: ethers.parseEther('0.5'),
  //   expirationTimestamp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
  // };
  // await offer.makeOffer(offerParams);

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