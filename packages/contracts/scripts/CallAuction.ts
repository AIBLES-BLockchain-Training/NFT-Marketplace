import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
dotenv.config();

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

  static async init(address: any, signer: Signer) {
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

  async bidInAuction(auctionId: number, bidAmount: bigint, signer: Signer, isNative: boolean) {
    console.log(`Bidding in auction ID: ${auctionId} with amount: ${bidAmount}`);
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

  async setMinTimeAuction(minTimeInSeconds: number) {
    console.log(`Setting minimum time for auction to ${minTimeInSeconds} seconds...`);
    try {
      const tx = await this.contract.setMinTimeAuction(minTimeInSeconds);
      await tx.wait();
      console.log('Minimum time for auction set successfully: ' , tx.hash);
    } catch (error) {
      console.error('Error setting minimum time for auction:', error);
      throw new Error('Failed to set minimum time for auction');
    }
  }

  async setCurrencyFee(currency: string, fee: number) {
    console.log(`Setting currency fee for ${currency} to ${fee}...`);
    try {
      const tx = await this.contract.setCurrencyFee(currency, fee);
      await tx.wait();
      console.log('Currency fee set successfully: ' , tx.hash);
    } catch (error) {
      console.error('Error setting currency fee:', error);
      throw new Error('Failed to set currency fee');
    }
  }

  async getMin() {
    return await this.contract.getMinTimeAuction();
  }

  async getAddressPermissionsContract() {
    return await this.contract.getPermissionsContract();
  }

  async getAddressFeeReceiver() {
    return await this.contract.getFeeReceiver();
  }
  
  async getAddressRouter() {
    return await this.contract.getRouter();
  }

  async getCurrencyFee(currency: string) {
    return await this.contract.getCurrencyFee(currency);
  }

  async getAccumulatedFee(currency: string) {
    return await this.contract.getAccumulatedFee(currency);
  }

  async withdrawFees(currency: string) {
    console.log(`Withdrawing accumulated fee for currency: ${currency}`);
    try {
      const tx = await this.contract.withdrawFees(currency);
      await tx.wait();
      console.log('Withdraw fee successful:', tx.hash);
    } catch (error) {
      console.error('Error withdrawing fee:', error);
      throw new Error('Failed to withdraw fee');
    }
  }
}

class Currency {
  private contract: any;
  
  constructor(contract: any) {
    this.contract = contract;
  }

  static async init(address: any, signer: Signer) {
    console.log(`Initializing Currency contract at address: ${address}`);
    const contract = await ethers.getContractAt('MockToken', address, signer);
    return new Currency(contract);
  }

  async mint(to: string, amount: bigint) {
    console.log(`Minting ${amount} tokens to address: ${to}`);
    try {
      const tx = await this.contract.mint(to, amount);
      await tx.wait();
      console.log('Mint successful:', tx.hash);
    } catch (error) {
      console.error('Error minting tokens:', error);
      throw new Error('Failed to mint tokens');
    }
  }

  async approve(spender: string, amount: bigint) {
    console.log(`Approving ${amount} tokens for spender: ${spender}`);
    try {
      const tx = await this.contract.approve(spender, amount);
      await tx.wait();
      console.log('Approval successful:', tx.hash);
    } catch (error) {
      console.error('Error approving tokens:', error);
      throw new Error('Failed to approve tokens');
    }
  }
}

class NFT {
  private contract: any;
  
  constructor(contract: any) {
    this.contract = contract;
  }

  static async init(address: any, signer: Signer) {
    console.log(`Initializing NFT contract at address: ${address}`);
    const contract = await ethers.getContractAt('MockERC721', address, signer);
    return new NFT(contract);
  }
  async setApprovalForAll(operator: string, approved: boolean) {
    console.log(`Setting approval for all: operator=${operator}, approved=${approved}`);
    try {
      const tx = await this.contract.setApprovalForAll(operator, approved);
      await tx.wait();
      console.log('Set approval for all successful:', tx.hash);
    } catch (error) {
      console.error('Error setting approval for all:', error);
      throw new Error('Failed to set approval for all');
    }
  }
}

async function main() {
  const [signer] = await ethers.getSigners();
  const AUCTION_ADDRESS = process.env['ADDRESS_AUCTION'];
  const CURRENCY_ADDRESS = process.env['CURRENCY_ADDRESS'];
  const NFT_ADDRESS = process.env['NFT_ADDRESS'];

  if (!AUCTION_ADDRESS) {
    throw new Error('AUCTION_ADDRESS is not defined in environment variables');
  }

  if (!CURRENCY_ADDRESS) {
    throw new Error('CURRENCY_ADDRESS is not defined in environment variables');
  }

  if (!NFT_ADDRESS) {
    throw new Error('NFT_ADDRESS is not defined in environment variables');
  }

  const auction = await Auction.init(AUCTION_ADDRESS, signer);
  const currency = await Currency.init(CURRENCY_ADDRESS, signer);
  const nft =  await NFT.init(NFT_ADDRESS, signer);
  // const auction = await Auction.init('0xD571fAD055557D1F1954454E1511973FF919bfe4', bidder);
  console.log('Signer address: ', await signer.getAddress());
  // console.log('Bidder address: ', await bidder.getAddress());
  
  console.log('-----------------------------------');
  console.log('Permissions Contract Address:', await auction.getAddressPermissionsContract());
  console.log('Router Address:', await auction.getAddressRouter());
  console.log('Fee Receiver Address:', await auction.getAddressFeeReceiver());
  console.log('Minimum Time for Auction (seconds):', (await auction.getMin()).toString());
  console.log('Fee Of Currency:', (await auction.getCurrencyFee(CURRENCY_ADDRESS)).toString());
  console.log('Currency Accumulated Fee:', (await auction.getAccumulatedFee(CURRENCY_ADDRESS)).toString());

  console.log('-----------------------------------');
  const totalAuctions = await auction.getTotalAuction();
  console.log('Total Auctions:', totalAuctions.toString());
  // await currency.mint(await signer.getAddress(), ethers.parseEther('10'));
  // await auction.setCurrencyFee(CURRENCY_ADDRESS, 200); // Set fee 2%
  // await auction.setMinTimeAuction(300); // Set min time auction to 5 minutes

  const auctionDetails = await auction.getAuctionDetails(1);
  console.log('Auction Details:', auctionDetails);

  // const allAuctions = await auction.getAllAuctions('0', '10');
  // console.log('All Auctions:', allAuctions);

  // const allValidAuctions = await auction.getAllValidAuctions('0', '10');
  // console.log('All Valid Auctions:', allValidAuctions);

  // const newWinningBid = await auction.getNewWinningBid('0');
  // console.log('New Winning Bid:', newWinningBid);

  // const auctionExpired = await auction.getAuctionExpired('0');
  // console.log('Auction Expired:', auctionExpired);

  // const cancelAuction = await auction.cancelAuction(1);
  // console.log('Cancel Auction:', cancelAuction);

  // const auctionParams: AuctionParams = {
  //   _assetContract: NFT_ADDRESS,
  //   _tokenId: 84,
  //   _quantity: 1,
  //   _currency: CURRENCY_ADDRESS,
  //   _startPrice: ethers.parseEther('0.01'),
  //   _ceilingPrice: ethers.parseEther('0.02'),
  //   _stepAmount: 50,
  //   _timeBufferInSeconds: 300,
  //   _startTime: Math.floor(Date.now() / 1000),
  //   _endTime: Math.floor(Date.now() / 1000) + 300, // 5p
  // };
  // // await nft.setApprovalForAll(AUCTION_ADDRESS, true);
  // await auction.createAuction(auctionParams);

  // const isNewWinningBid = await auction.checkIsNewWinningBid(1, ethers.parseEther('0.015'));
  // console.log('Is New Winning Bid:', isNewWinningBid);
  // await currency.approve(AUCTION_ADDRESS, ethers.parseEther('10'));
  // const bidAuction = await auction.bidInAuction(1, ethers.parseEther('0.015'), signer, false);
  // console.log('Bid Auction:', bidAuction);

  // auction.checkAuctionExpired(1);

  // const payout = await auction.collectAuctionPayout(1);
  // console.log('Auction Payout:', payout);

  // const collectToken = await auction.collectAuctionToken(1);
  // console.log('Auction Collect Token:', collectToken);

  // await auction.withdrawFees(CURRENCY_ADDRESS);
}

main().catch(console.error);
