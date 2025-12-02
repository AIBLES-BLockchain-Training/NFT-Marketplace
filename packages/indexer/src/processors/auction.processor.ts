import { ethers } from 'ethers';
import { events as auctionEvents } from '../abi/NFTAuction';
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
  TradeType,
  Trait,
} from '../model';
import {
  fetchCollectionMetadata,
  fetchNFTMetadataUnified,
  detectContractType
} from '../utils/metadata'
import { fetchTokenInfo } from '../utils/erc20'

export function getAuctionTopics(): string[] {
  return [
    auctionEvents.AuctionCreated?.topic,
    auctionEvents.AuctionCancelled?.topic,
    auctionEvents.AuctionBidPlaced?.topic,
    auctionEvents.AuctionPayoutCollected?.topic,
    auctionEvents.AuctionTokenCollected?.topic,
    auctionEvents.AuctionFinalized?.topic,
    auctionEvents.NFTReceived?.topic,
    auctionEvents.UpdatePermissionsContract?.topic,
  ].filter(Boolean) as string[];
}

const provider = new ethers.JsonRpcProvider(
  process.env.RPC_ENDPOINT || process.env.RPC_SEPOLIA_HTTP
)


export async function processAuctionEvents(
  logs: any[],
  ctx: any,
  contractAddress: string,
  auctionMap: Map<string, Auction>, // Key: auctionId
  nftMap: Map<string, NFT>, // Key: `${assetContract.toLowerCase()}-${tokenId.toString()}`
  subjectMap: Map<string, Subject>, // key is address in lowercase
  collectionMap: Map<string, Collection>, // key is contract address in lowercase
  bidMap: Map<string, Bid>, // Key: `${auctionId.toString()}-${bidder.toLowerCase()}`
  currencyMap: Map<string, SupportedCurrency>,
  purchaseHistories: PurchaseHistory[], // key is auto-generated
  ownershipMap: Map<string, TokenOwnership> = new Map() // gom ownerships cần cập nhật
) {

  async function getOrCreateSubject(address: string, type?: SubjectType): Promise<Subject> {
    const subjectId = address.toLowerCase();
    if (subjectMap.has(subjectId)) {
      return subjectMap.get(subjectId)!;
    }
    let subject = await ctx.store.get(Subject, subjectId);
    if (!subject) {
      subject = new Subject({
        id: subjectId,
        subjectType: type || SubjectType.USER,
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
    }
    subjectMap.set(subjectId, subject);
    return subject;
  }

  async function getOrCreateCollection(contractAddress: string, creator?: Subject): Promise<Collection> {
    const collectionId = contractAddress.toLowerCase();
    if (collectionMap.has(collectionId)) {
      return collectionMap.get(collectionId)!;
    }
    let collection = await ctx.store.get(Collection, collectionId);
    if (!collection) {
      const [metadata, contractType] = await Promise.all([
        fetchCollectionMetadata(contractAddress, provider),
        detectContractType(contractAddress, provider)
      ]);

      collection = new Collection({
        id: collectionId,
        name: metadata.name,
        symbol: metadata.symbol,
        collectionType: contractType == 'ERC721' ? CollectionType.ERC721 : CollectionType.ERC1155,
        creator: creator,
        createdAt: new Date(),
        totalSupply: 0n,
        floorPrice: 0n,
        nfts: [],
        traits: [],
        traitStats: [],
      });
    }
    collectionMap.set(collectionId, collection);
    return collection;
  }

  async function getOrCreateNFT(contractAddress: string, tokenId: bigint, owner?: Subject): Promise<NFT> {
    const nftId = `${contractAddress.toLowerCase()}-${tokenId.toString()}`;
    if (nftMap.has(nftId)) {
      return nftMap.get(nftId)!;
    }
    let nft = await ctx.store.get(NFT, {
      where: { id: nftId },
      relations: { collection: true }
    });
    if (!nft) {
      const contractSubject = await getOrCreateSubject(contractAddress, SubjectType.CONTRACT);
      const collection = await getOrCreateCollection(contractAddress, contractSubject);

      const metadata = await fetchNFTMetadataUnified(contractAddress, tokenId.toString(), provider);

      nft = new NFT({
        id: nftId,
        collection: collection,
        tokenId: tokenId,
        name: metadata?.name || `${collection.name} #${tokenId}`,
        imageUrl: metadata?.image,
        description: metadata?.description,
        metadataUri: undefined,
        listings: [],
        purchaseHistory: [],
        traits: [],
        extensions: [],
        owners: [],
      });

      if (metadata?.attributes && Array.isArray(metadata.attributes)) {
        const traits: Trait[] = []
        for (const attr of metadata.attributes) {
          if (attr.trait_type && attr.value !== undefined && attr.value !== null) {
            const traitId = `${nftId}-${attr.trait_type}-${attr.value}`
            const trait = new Trait({
              id: traitId,
              nft: nft,
              traitType: String(attr.trait_type),
              value: String(attr.value),
              displayType: attr.display_type || undefined
            })
            traits.push(trait)
          }
        }
        nft.traits = traits
      }
    }
    nftMap.set(nftId, nft);
    return nft;
  }

  async function getAuction(auctionId: string): Promise<Auction | null> {
    if (auctionMap.has(auctionId)) {
      return auctionMap.get(auctionId)!;
    }
    const auction = await ctx.store.get(Auction, {
      where: { id: auctionId },
      relations: { nft: true, bids: true, purchaseHistory: true}
    })
    if (auction) {
      // đảm bảo luôn có mảng trống
      auction.bids = auction.bids || [];
      auction.purchaseHistory = auction.purchaseHistory || [];
      auctionMap.set(auctionId, auction);
      return auction;
    }
    return null;
  }

  async function getOrCreateBid(bidId: string, auction: Auction, bidder: Subject, bidderAddress: string): Promise<Bid> {
    if (bidMap.has(bidId)) {
      return bidMap.get(bidId)!;
    }
    let bid = await ctx.store.get(Bid, bidId);
    if (!bid) {
      bid = new Bid({
        id: bidId,
        auction: auction,
        bidder: bidder,
        bidderAddress: bidderAddress.toLowerCase(),
        bidAmount: 0n,
        timestamp: new Date(),
      });
    }
    bidMap.set(bidId, bid);
    return bid;
  }

  async function getOrCreateCurrency(address: string, block: any): Promise<SupportedCurrency> {
    const currencyId = address.toLowerCase()
    if (currencyMap.has(currencyId)) {
      return currencyMap.get(currencyId)!
    }
    let currency = await ctx.store.get(SupportedCurrency, currencyId)
    if (!currency) {
      // Fetch real token info from ERC-20 contract
      const tokenInfo = await fetchTokenInfo(ctx, block, currencyId);

      currency = new SupportedCurrency({
        id: currencyId,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        isActive: true,
        feePercentage: 0,
        totalAmountFee: BigInt(0),
        // Do NOT set @derivedFrom fields - they are auto-populated
        // currencyApprovals: [],
        // purchaseHistory: []
      })
    }
    currencyMap.set(currencyId, currency)
    return currency
  }

  async function getOrCreateTokenOwnership(nft: NFT, ownerAddress: string): Promise<TokenOwnership> {
    const ownershipId = `${nft.id}-${ownerAddress.toLowerCase()}`;
    if (ownershipMap.has(ownershipId)) {
      return ownershipMap.get(ownershipId)!;
    }

    let ownership = await ctx.store.get(TokenOwnership, ownershipId)
    if (!ownership) {
      ownership = new TokenOwnership({
        id: ownershipId,
        nft: nft,
        ownerAddress: ownerAddress.toLowerCase(),
        balance: BigInt(0),
        updatedAt: new Date()
      })
    }
    ownershipMap.set(ownershipId, ownership)
    return ownership
  }

  async function updateTokenOwnership(
    nft: NFT,
    fromAddress: string,
    toAddress: string,
    quantity: bigint,
    timestamp: Date
  ) {
    const sellerOwnership = await getOrCreateTokenOwnership(nft, fromAddress)
    sellerOwnership.balance = sellerOwnership.balance - quantity
    sellerOwnership.updatedAt = timestamp

    if (sellerOwnership.balance < BigInt(0)) {
      console.warn(`Negative balance for ${fromAddress} on NFT ${nft.id}. Setting to 0.`)
      sellerOwnership.balance = BigInt(0)
    }

    const buyerOwnership = await getOrCreateTokenOwnership(nft, toAddress)
    buyerOwnership.balance = buyerOwnership.balance + quantity
    buyerOwnership.updatedAt = timestamp
  }

  for (let log of logs) {
    const topic0 = log.topics[0];
    const timestamp = new Date(log.block.header.timestamp);
    const blockNumber = log.block.header.height;
    const transactionHash = log.transactionHash || '';

    try {
      if (topic0 === auctionEvents.AuctionCreated.topic) {
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
        } = auctionEvents.AuctionCreated.decode(log);

        const auctionIdStr = auctionId.toString();
        const sellerSubject = await getOrCreateSubject(seller, SubjectType.USER);
        const nft = await getOrCreateNFT(assetContract, tokenId, sellerSubject);
        const currencyEntity = await getOrCreateCurrency(currency, log.block);
        let auction = await getAuction(auctionIdStr);
        if (!auction) {
          console.log('Chưa có auction, tạo mới:', auctionIdStr);

          // Determine token type from collection
          const tokenType = nft.collection.collectionType === CollectionType.ERC721 ? 'ERC721' : 'ERC1155';

          // stepAmount is now BPS (basis points) directly from contract
          // No need to calculate bidBufferBps separately

          auction = new Auction({
            id: auctionIdStr,
            auctionId: auctionId, // Contract's auction ID (BigInt)
            nft: nft,
            seller: sellerSubject,
            sellerAddress: seller.toLowerCase(), // Seller's address (string)
            winningBidder: null,
            quantity: quantity,
            currency: currencyEntity,
            minimumBidAmount: startPrice, // Minimum bid equals start price
            startPrice: startPrice,
            stepAmount: stepAmount, // Now stored as BPS (e.g., 500 for 5%)
            bidBufferBps: stepAmount, // stepAmount IS bidBufferBps (both are BPS)
            ceilingPrice: ceilingPrice,
            startTime: new Date(Number(startTime) * 1000),
            endTime: new Date(Number(endTime) * 1000),
            timeBufferInSeconds: Number(timeBufferInSeconds),
            tokenType: tokenType,
            status: AuctionStatus.CREATED,
            isPayoutCollected: false,
            isTokenCollected: false,
            createdAt: timestamp,
            updatedAt: timestamp,

            bids: [],
            purchaseHistory: [],
          });
          auctionMap.set(auctionIdStr, auction);
          await updateTokenOwnership(
            nft,
            auction.seller.id,
            contractAddress,
            quantity,
            timestamp
          );
        }
      }

      if (topic0 === auctionEvents.AuctionCancelled.topic) {
        const { auctionId } = auctionEvents.AuctionCancelled.decode(log);
        const auctionIdStr = auctionId.toString();
        const auction = await getAuction(auctionIdStr);
        if (auction) {
          auction.status = AuctionStatus.CANCELLED;
          // Trả lại token cho seller
          await updateTokenOwnership(
            auction.nft,
            contractAddress,
            auction.seller.id,
            auction.quantity,
            timestamp
          );
        }
      }

      if (topic0 === auctionEvents.AuctionBidPlaced.topic) {
        const { auctionId, bidder, bidAmount } = auctionEvents.AuctionBidPlaced.decode(log);
        const auctionIdStr = auctionId.toString();
        const bidderSubject = await getOrCreateSubject(bidder);
        const auction = await getAuction(auctionIdStr);
        if (auction === null) {
          continue;
        }
        if (auction.status === AuctionStatus.CREATED) {
          auction.status = AuctionStatus.ACTIVE;
        }

        // Create unique bid ID using transaction hash and log index
        const bidId = `${transactionHash}-${log.logIndex}`;
        console.log(`Processing bid ${bidId} for auction ${auctionIdStr}`);
        const bid = await getOrCreateBid(bidId, auction, bidderSubject, bidder);
        bid.bidAmount = bidAmount;
        bid.timestamp = timestamp;

        // Update winning bidder to the latest bidder (highest bid)
        auction.winningBidder = bidderSubject;
        
        // Check if bid amount reaches ceiling price (buyout)
        if (auction.ceilingPrice && bidAmount >= auction.ceilingPrice) {
          console.log(`Auction ${auctionIdStr} reached buyout price: ${bidAmount} >= ${auction.ceilingPrice}`);
          auction.status = AuctionStatus.ENDED;
          
          // Create purchase history for buyout
          const usedCurrency = auction.currency;
          const purchaseHistory = new PurchaseHistory({
            id: `${transactionHash}-${log.logIndex}-buyout`, // Unique ID for buyout
            nft: auction.nft,
            seller: auction.seller,
            buyer: bidderSubject,
            quantity: auction.quantity,
            currency: usedCurrency,
            totalPrice: bidAmount,
            tradeType: TradeType.AUCTION,
            timestamp: timestamp,
            blockNumber: blockNumber,
            auction: auction,
            listing: undefined,
            transactionHash: transactionHash,
          });
          purchaseHistories.push(purchaseHistory);
          auction.purchaseHistory.push(purchaseHistory);
        }
      }

      if (topic0 === auctionEvents.AuctionFinalized.topic) {
        const { auctionId, winner, winningBid, currency } = auctionEvents.AuctionFinalized.decode(log);
        const auctionIdStr = auctionId.toString();
        const winnerSubject = await getOrCreateSubject(winner);
        const auction = await getAuction(auctionIdStr);
        const usedCurrency = await getOrCreateCurrency(currency, log.block);
        if (auction) {
          const purchaseHistory = new PurchaseHistory({
            id: `${transactionHash}-${log.logIndex}`, // Unique ID
            nft: auction.nft,
            seller: auction.seller,
            buyer: winnerSubject,
            quantity: auction.quantity,
            currency: usedCurrency,
            totalPrice: winningBid,
            tradeType: TradeType.AUCTION,
            timestamp: timestamp,
            blockNumber: blockNumber,
            auction: auction,
            listing: undefined,
            transactionHash: transactionHash,
          });
          purchaseHistories.push(purchaseHistory);
          auction.purchaseHistory.push(purchaseHistory);
          auction.status = AuctionStatus.ENDED;
          auction.isPayoutCollected = true;
          // Update auction status
          auctionMap.set(auction.id, auction);
        }
      }

      if (topic0 === auctionEvents.AuctionPayoutCollected.topic) {
        const { auctionId } = auctionEvents.AuctionPayoutCollected.decode(log);
        const auctionIdStr = auctionId.toString();
        const auction = await getAuction(auctionIdStr);
        if (auction) {
          auction.isPayoutCollected = true;
          // Update status to ENDED when payout is collected
          if (auction.status === AuctionStatus.ACTIVE || auction.status === AuctionStatus.CREATED) {
            auction.status = AuctionStatus.ENDED;
          }
        }
      }

      if(topic0 == auctionEvents.AuctionTokenCollected.topic) {
        const { auctionId, winner, tokenId } = auctionEvents.AuctionTokenCollected.decode(log);
        const auctionIdStr = auctionId.toString();
        const auction = await getAuction(auctionIdStr);
        if(auction) {
          auction.isTokenCollected = true;
          auction.winningBidder = await getOrCreateSubject(winner);
          // Update status to ENDED when NFT is collected
          if (auction.status === AuctionStatus.ACTIVE || auction.status === AuctionStatus.CREATED) {
            auction.status = AuctionStatus.ENDED;
          }
          // chuyen token ve cho winner
          await updateTokenOwnership(
            auction.nft,
            contractAddress,
            winner,
            auction.quantity,
            timestamp
          );
        }
      }
    } catch (error) {
      console.error(`Error processing log in tx ${transactionHash} at block ${blockNumber}:`, error);
    }
  }
}
