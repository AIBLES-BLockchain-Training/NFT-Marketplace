import { Signer } from 'ethers';
import { ethers } from 'hardhat';

type AuctionParams = {
  _assetContract: string;
  _tokenId: number;
  _quantity: number; // Quantity of NFTs
  _currency: string; // Currency address for bidding (optional)
  _startPrice: bigint;
  _ceilingPrice: bigint;
  _stepAmount: number; // Step amount unit % same 50/10000 is 0.5%
  _timeBufferInSeconds: number;
  _startTime: number;
  _endTime: number;
};

class Auction {
  private contract: any;

  constructor(contract: any) {
    this.contract = contract;
  }

  static async init(address: string, signer: Signer) {
    console.log(`Initializing Auction contract at address: ${address}`);
    const contract = await ethers.getContractAt('NFTAuction', address, signer);
    return new Auction(contract);
  }

  async getTotalAuction() {
    console.log('Fetching total auctions...');
    return await this.contract.totalAuctions();
  }

  async getAuctionDetails(auctionId: number) {
    console.log(`Fetching details for auction ID: ${auctionId}`);
    return await this.contract.auctions(auctionId);
  }

  async getAllAuctions(startId: number, endId: number) {
    console.log('Fetching all auctions...');
    return await this.contract.getAllAuctions(startId, endId);
  }

  async getAllValidAuctions(startId: number, endId: number) {
    console.log('Fetching all valid auctions...');
    return await this.contract.getAllValidAuctions(startId, endId);
  }

  async getNewWinningBid(auctionId: number) {
    console.log(`Fetching new winning bid for auction ID: ${auctionId}`);
    return await this.contract.getNewWinningBid(auctionId);
  }

  async checkIsNewWinningBid(auctionId: number, bidAmount: bigint) {
    console.log(`Checking if new winning bid for auction ID: ${auctionId} with amount: ${bidAmount}`);
    return await this.contract.isNewWinningBid(auctionId, bidAmount);
  }

  async getAuctionExpired(auctionId: number) {
    console.log(`Fetching auction expired status for auction ID: ${auctionId}`);
    return await this.contract.isAuctionExpired(auctionId);
  }

  async cancelAuction(auctionId: number) {
    console.log(`Cancelling auction ID: ${auctionId}`);
    try {
      const tx = await this.contract.cancelAuction(auctionId);
      await tx.wait();
      console.log(`Auction ID ${auctionId} cancelled successfully.`);
      return tx;
    } catch (error) {
      console.error('Error cancelling auction:', error);
      throw new Error(`Failed to cancel auction ID ${auctionId}`);
    }
  }

  async createAuction(auctionParams: AuctionParams) {
    console.log('Creating auction with parameters:', auctionParams);
    try {
      const tx = await this.contract.createAuction(auctionParams);
      await tx.wait();
      console.log('Auction created successfully:', tx);
    } catch (error) {
      console.error('Error creating auction:', error);
      throw new Error('Failed to create auction');
    }
  }

  async bidInAuction(auctionId: number, bidAmount: bigint, isNative: boolean) {
    console.log(`Bidding in auction ID: ${auctionId} with amount: ${bidAmount}`);
    // console.log(`Bidder address: ${await bidder.getAddress()}`);
    try {
      let tx;
      if (isNative) {
        console.log('Placing native bid...');
        tx = await this.contract.bidInAuction(auctionId, { value: bidAmount });
      } else {
        console.log('Placing ERC20 bid...');
        tx = await this.contract.bidInAuction(auctionId, bidAmount);
      }

      await tx.wait();
      console.log('Bid placed successfully:', tx);
    } catch (error) {
      console.error('Error placing bid:', error);
      throw new Error(`Failed to place bid in auction ID ${auctionId}`);
    }
  }

  async collectAuctionPayout(auctionId: number) {
    console.log(`Collecting auction payout for auction ID: ${auctionId}`);
    try {
      const tx = await this.contract.collectAuctionPayout(auctionId);
      await tx.wait();
      console.log(`Auction payout collected successfully for auction ID: ${auctionId}`);
      return tx;
    } catch (error) {
      console.error('Error collecting auction payout:', error);
      throw new Error(`Failed to collect auction payout for auction ID ${auctionId}`);
    }
  }

  async collectAuctionToken(auctionId: number) {
    console.log(`Collecting auction token for auction ID: ${auctionId}`);
    try {
      const tx = await this.contract.collectAuctionToken(auctionId);
      await tx.wait();
      console.log(`Auction token collected successfully for auction ID: ${auctionId}`);
      return tx;
    } catch (error) {
      console.error('Error collecting auction token:', error);
      throw new Error(`Failed to collect auction token for auction ID ${auctionId}`);
    }
  }

  async setPermissionContract(newPermissionAddress: string) {
    console.log('Setting permission contract...');
    try {
      const tx = await this.contract.setPermissionContract(newPermissionAddress);
      await tx.wait();
      console.log('Permission contract set successfully:', tx);
    } catch (error) {
      console.error('Error setting permission contract:', error);
      throw new Error('Failed to set permission contract');
    }
  }

  async checkAuctionExpired(auctionId: number) {
    console.log(`Checking if auction ID ${auctionId} has expired...`);
    try {
      const b = await this.contract.isAuctionExpired(auctionId);
      console.log(`Auction ID ${auctionId} has expired:`, b);
      return b;
    } catch (error) {
      console.error('Error checking auction expiration:', error);
      throw new Error(`Failed to check auction expiration for auction ID ${auctionId}`);
    }
  }
}

async function main() {
  const [signer, bidder] = await ethers.getSigners();
  const auction = await Auction.init('0xb12cEB4FbD9B4A84DEB52BD00C44aFDa9fc58690', signer);
  // const auction = await Auction.init('0xD571fAD055557D1F1954454E1511973FF919bfe4', bidder);

  console.log('Signer address: ', await signer.getAddress());
  // console.log('Bidder address: ', await bidder.getAddress());

  const totalAuctions = await auction.getTotalAuction();
  console.log('Total Auctions:', totalAuctions.toString());

  // const auctionDetails = await auction.getAuctionDetails(3);
  // console.log('Auction Details:', auctionDetails);

  // const allAuctions = await auction.getAllAuctions('0', '10');
  // console.log('All Auctions:', allAuctions);

  // const allValidAuctions = await auction.getAllValidAuctions('0', '10');
  // console.log('All Valid Auctions:', allValidAuctions);

  // const newWinningBid = await auction.getNewWinningBid('0');
  // console.log('New Winning Bid:', newWinningBid);

  // const auctionExpired = await auction.getAuctionExpired('0');
  // console.log('Auction Expired:', auctionExpired);

  // const cancelAuction = await auction.cancelAuction(2);
  // console.log('Cancel Auction:', cancelAuction);

  const auctionParams: AuctionParams = {
    _assetContract: '0xB0eB2df330E749516Ec7CA058359D2B05c452094',
    _tokenId: 84,
    _quantity: 1,
    _currency: '0xB6321DCd16BC2e2C8Da380a0772707068c5Ad390',
    _startPrice: ethers.parseEther('0.01'),
    _ceilingPrice: ethers.parseEther('0.02'),
    _stepAmount: 50,
    _timeBufferInSeconds: 300,
    _startTime: Math.floor(Date.now() / 1000),
    _endTime: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  await auction.createAuction(auctionParams);

  // const isNewWinningBid = await auction.checkIsNewWinningBid(3, ethers.parseEther('0.2'));
  // console.log('Is New Winning Bid:', isNewWinningBid);

  // const bidAuction = await auction.bidInAuction(3, ethers.parseEther('0.101'), bidder, false);
  // console.log('Bid Auction:', bidAuction);

  // auction.checkAuctionExpired(3);

  // const payout = await auction.collectAuctionPayout(3);
  // console.log('Auction Payout:', payout);\

  // const collectToken = await auction.collectAuctionToken(3);
  // console.log('Auction Collect Token:', collectToken);
}

main().catch(console.error);
