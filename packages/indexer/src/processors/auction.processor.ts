import { EvmBatchProcessor } from '@subsquid/evm-processor';
import { TypeormDatabase } from '@subsquid/typeorm-store';
import {
  Auction,
  AuctionStatus,
  Bid,
  Collection,
  CollectionType,
  NFT,
  PurchaseHistory,
  Subject,
  SubjectType,
  SupportedCurrency,
  TokenOwnership,
} from '../model';

interface AuctionABI {
  events: {
    AuctionCreated: {
      topic: string;
      decode: (log: any) => {
        auctionId: bigint;
        seller: string;
        assetContract: string;
        tokenId: bigint;
        quantity: bigint;
        currency: string;
        startPrice: bigint;
        ceilingPrice: bigint;
        startTime: bigint;
        endTime: bigint;
        timeBufferInSeconds: bigint;
        stepAmount: bigint;
        tokenType: number;
      };
    };

    AuctionCancelled: {
      topic: string;
      decode: (log: any) => {
        auctionId: bigint;
        seller: string; //who cancelled the auction
      };
    };

    AuctionBidPlaced: {
      topic: string;
      decode: (log: any) => {
        auctionId: bigint;
        bidder: string;
        bidAmount: bigint;
        currency: string;
      };
    };

    AuctionPayoutCollected: {
      topic: string;
      decode: (log: any) => {
        auctionId: bigint;
        seller: string; //who collected the payout
        amount: bigint;
      };
    };

    AuctionTokenCollected: {
      topic: string;
      decode: (log: any) => {
        auctionId: bigint;
        winner: string; //who collected the token
        tokenId: bigint;
      };
    };

    AuctionFinalized: {
      topic: string;
      decode: (log: any) => {
        auctionId: bigint;
        winner: string;
        winningBid: bigint;
        currency: string;
      };
    };
  };
}

export class AuctionProcessor {
  private processor: EvmBatchProcessor;
  private contractAddress: string;
  private abi: AuctionABI;

  constructor(
    contractAddress: string,
    abi: AuctionABI,
    gateway: string = 'https://v2.archive.subsquid.io/network/ethereum-sepolia',
    rpcEndpoint?: string,
  ) {
    this.contractAddress = contractAddress.toLowerCase();
    this.abi = abi;

    // Initialize the EvmBatchProcessor
    this.processor = new EvmBatchProcessor().setGateway(gateway).setFinalityConfirmation(12);

    // If a custom RPC endpoint is provided, set it with a rate limit
    if (rpcEndpoint) {
      this.processor.setRpcEndpoint({
        url: rpcEndpoint,
        rateLimit: 5,
      });
    }

    this.processor.addLog({
      address: [this.contractAddress],
      topic0: [
        this.abi.events.AuctionCreated.topic,
        this.abi.events.AuctionCancelled.topic,
        this.abi.events.AuctionBidPlaced.topic,
        this.abi.events.AuctionPayoutCollected.topic,
        this.abi.events.AuctionTokenCollected.topic,
        this.abi.events.AuctionFinalized.topic,
      ],
    });

    const process = async (db: TypeormDatabase) => {
      const auctionMap: Map<string, Auction> = new Map(); // Key: auctionId
      const nftMap: Map<string, NFT> = new Map(); // Key: `${assetContract.toLowerCase()}-${tokenId.toString()}`
      const subjectMap: Map<string, Subject> = new Map(); // key is address in lowercase
      const collectionMap: Map<string, Collection> = new Map(); // key is contract address in lowercase
      const bidMap: Map<string, Bid> = new Map(); // Key: `${auctionId.toString()}-${bidder.toLowerCase()}`
      const purchaseHistories: PurchaseHistory[] = []; // key is auto-generated

      async function getOrCreateSubject(address: string): Promise<Subject> {
        const subjectId = address.toLowerCase();

        if (subjectMap.has(subjectId)) {
          return subjectMap.get(subjectId)!;
        }

        let subject = await db.get(Subject, subjectId);
        if (!subject) {
          subject = new Subject({
            id: subjectId,
            subjectType: SubjectType.USER,
            name: `${address.slice(0, 6)}...${address.slice(-4)}`,
            avatarUrl: null,
            backgroundUrl: null,
            bio: null,
            createdAt: new Date(),
            collections: [],
            listings: [],
            roleAssignments: [],
            purchaseHistoryAsSeller: [],
            purchaseHistoryAsBuyer: [],
          });
          subjectMap.set(subjectId, subject);
        } else {
          subjectMap.set(subjectId, subject);
        }
        return subject;
      }

      async function getOrCreateCollection(contractAddress: string): Promise<Collection> {
        const collectionId = contractAddress.toLowerCase();

        if (collectionMap.has(collectionId)) {
          return collectionMap.get(collectionId)!;
        }

        let collection = await db.get(Collection, collectionId);
        if (!collection) {
          collection = new Collection({
            id: collectionId,
            name: `Collection ${contractAddress.slice(0, 6)}`,
            symbol: 'NFT',
            description: null,
            bannerUrl: null,
            logoUrl: null,
            collectionType: CollectionType.ERC721,
            creator: undefined,
            createdAt: new Date(),
            nfts: [],
            traits: [],
            traitStats: [],
          });
          collectionMap.set(collectionId, collection);
        } else {
          collectionMap.set(collectionId, collection);
        }
        return collection;
      }

      async function getOrCreateNFT(contractAddress: string, tokenId: bigint): Promise<NFT> {
        const nftId = `${contractAddress.toLowerCase()}-${tokenId.toString()}`;

        if (nftMap.has(nftId)) {
          return nftMap.get(nftId)!;
        }

        let nft = await db.get(NFT, nftId);
        if (!nft) {
          const collection = await getOrCreateCollection(contractAddress);
          nft = new NFT({
            id: nftId,
            tokenId: tokenId,
            collection: collection,
            name: `NFT #${tokenId}`,
            imageUrl: null,
            description: null,
            metadataUri: null,
            traits: [],
            listings: [],
            owners: [],
          });
          nftMap.set(nftId, nft);
        } else {
          nftMap.set(nftId, nft);
        }
        return nft;
      }

      async function getAuction(auctionId: string): Promise<Auction | null> {
        if (auctionMap.has(auctionId)) {
          return auctionMap.get(auctionId)!;
        }

        const auction = await db.get(Auction, auctionId);
        if (auction) {
          auctionMap.set(auctionId, auction);
          return auction;
        }
        return null;
      }

      // Helper to get SupportedCurrency by address
      async function getOnlyCurrency(address: string): Promise<SupportedCurrency> {
        const currencyId = address.toLowerCase();
        let currency = await db.get(SupportedCurrency, currencyId);
        if (!currency) {
          throw new Error(`Currency ${currencyId} not found in DB but was used in auction`);
        }
        return currency!;
      }


      async function transferNft(nft: NFT, from: Subject, to: Subject, quantity: bigint) {
        // Update the ownership records
        // await updateTokenOwnership(nft, from, -quantity, new Date());
        // await updateTokenOwnership(nft, to, quantity, new Date());g k em 
      }

      await this.processor.run(db, async (ctx) => {
        for (let block of ctx.blocks) {
          for (let log of block.logs) {
            const transactionHash = log.transaction?.hash.toString() || '';
            // Process AuctionCreated event
            if (log.topics[0] === this.abi.events.AuctionCreated.topic) {
              const {
                auctionId,
                seller,
                assetContract,
                tokenId,
                quantity,
                currency,
                startPrice,
                ceilingPrice,
                startTime,
                endTime,
                timeBufferInSeconds,
                stepAmount,
              } = this.abi.events.AuctionCreated.decode(log);

              const auctionIdStr = auctionId.toString();
              const sellerSubject = await getOrCreateSubject(seller);
              const nft = await getOrCreateNFT(assetContract, tokenId);
              try {
                const currencyEntity = await getOnlyCurrency(currency);
                let auction = await getAuction(auctionIdStr);
                if (!auction) {
                  auction = new Auction({
                    id: auctionIdStr,
                    nft: nft,
                    seller: sellerSubject,
                    quantity: quantity,
                    currency: currencyEntity,
                    startPrice: startPrice,
                    ceilingPrice: ceilingPrice,
                    startTime: new Date(Number(startTime) * 1000),
                    endTime: new Date(Number(endTime) * 1000),
                    timeBufferInSeconds: Number(timeBufferInSeconds),
                    stepAmount: stepAmount,
                  });
                  auctionMap.set(auctionIdStr, auction);
                }
              } catch (error) {
                console.error('Error fetching metadata:', error);
              }
            }

            if (log.topics[0] === this.abi.events.AuctionCancelled.topic) {
              const { auctionId } = this.abi.events.AuctionCancelled.decode(log);
              const auctionIdStr = auctionId.toString();
              const auction = await getAuction(auctionIdStr);
              if (auction) {
                // update auction status
                auction.status = AuctionStatus.CANCELLED;
              }
            }

            if (log.topics[0] === this.abi.events.AuctionBidPlaced.topic) {
              const { auctionId, bidder, bidAmount } = this.abi.events.AuctionBidPlaced.decode(log);
              const auctionIdStr = auctionId.toString();
              const bidderSubject = await getOrCreateSubject(bidder);
              const auction = await getAuction(auctionIdStr);
              if (!auction) {
                continue;
              }
              const bidId = `${auctionIdStr}-${bidder.toLowerCase()}`;
              if (!bidMap.has(bidId)) {
                const bid = new Bid({
                  id: bidId,
                  auction: auction,
                  bidderAddress: bidderSubject,
                  bidAmount: bidAmount,
                  timestamp: new Date(block.header.timestamp),
                });
                bidMap.set(bidId, bid);

                // Update auction's current highest bid if needed
                auction.winningBid = bid;
                auction.bids.push(bid);
              }
            }

            /*
             We can skip AuctionPayoutCollected and AuctionTokenCollected              
            */
            if (log.topics[0] === this.abi.events.AuctionFinalized.topic) {
              const { auctionId, winner, winningBid, currency } = this.abi.events.AuctionFinalized.decode(log);
              const auctionIdStr = auctionId.toString();
              const winnerSubject = await getOrCreateSubject(winner);
              const auction = await getAuction(auctionIdStr);
              if (auction) {
                const purchaseHistory = new PurchaseHistory({
                  id: `${transactionHash}-${auctionIdStr}-${winner.toLowerCase()}`, // Unique ID
                  nft: auction.nft,
                  seller: auction.seller,
                  buyer: winnerSubject,
                  quantity: auction.quantity,
                  totalPrice: winningBid,
                  currency: await getOnlyCurrency(currency),
                  timestamp: new Date(block.header.timestamp),
                  transactionHash: transactionHash,
                });
                purchaseHistories.push(purchaseHistory);

                // Update NFT owners
                const ownershipId = `${auction.nft.id}-${winner.toLowerCase()}`;
                const ownership = new TokenOwnership({
                  id: ownershipId,  
                  nft: auction.nft,
                  // ownerAddress: winnerSubject,
                  balance: auction.quantity,
                  updatedAt: new Date(block.header.timestamp),
                });
                auction.nft.owners.push(ownership);
              }
            }
          }
        }

        // Process the collected data
        await ctx.store.save([...subjectMap.values()]);
        await ctx.store.save([...collectionMap.values()]);
        await ctx.store.save([...nftMap.values()]);
        await ctx.store.save([...auctionMap.values()]);
        await ctx.store.save([...bidMap.values()]);
        await ctx.store.save([...purchaseHistories]);
      });
    };
  }

  getProcessor(): EvmBatchProcessor {
    return this.processor;
  }
}
