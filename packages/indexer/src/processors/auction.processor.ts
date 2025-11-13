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
    let nft = await ctx.store.get(NFT, nftId);
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
    const auction = await ctx.store.get(Auction, auctionId);
    if (auction) {
      // đảm bảo luôn có mảng trống
      auction.bids = auction.bids || [];
      auction.purchaseHistory = auction.purchaseHistory || [];
      auctionMap.set(auctionId, auction);
      return auction;
    }
    return null;
  }

  async function getOrCreateBid(bidId: string, auction: Auction, bidder: Subject): Promise<Bid> {
    if (bidMap.has(bidId)) {
      return bidMap.get(bidId)!;
    }
    let bid = await ctx.store.get(Bid, bidId);
    if (!bid) {
      bid = new Bid({
        id: bidId,
        auction: auction,
        bidder: bidder,
        bidAmount: 0n,
        timestamp: new Date(),
      });
    }
    bidMap.set(bidId, bid);
    return bid;
  }

  async function getOrCreateCurrency(address: string): Promise<SupportedCurrency> {
    const currencyId = address.toLowerCase()
    if (currencyMap.has(currencyId)) {
      return currencyMap.get(currencyId)!
    }
    let currency = await ctx.store.get(SupportedCurrency, currencyId)
    if (!currency) {
      currency = new SupportedCurrency({
        id: currencyId,
        name: currencyId === '0x0000000000000000000000000000000000000000' ? 'ETH' : `Token_${address.slice(0, 6)}`,
        symbol: currencyId === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'TKN',
        decimals: 18,
        isActive: true,
        feePercentage: 0,
        totalAmountFee: BigInt(0),
        currencyApprovals: [],
        purchaseHistory: []
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
        const currencyEntity = await getOrCreateCurrency(currency);
        let auction = await getAuction(auctionIdStr);
        if (!auction) {
          console.log('Chưa có auction, tạo mới:', auctionIdStr);
          auction = new Auction({
            id: auctionIdStr,
            nft: nft,
            seller: sellerSubject,
            winningBidder: null,
            quantity: quantity,
            currency: currencyEntity,
            startPrice: startPrice,
            ceilingPrice: ceilingPrice,
            startTime: new Date(Number(startTime) * 1000),
            endTime: new Date(Number(endTime) * 1000),
            timeBufferInSeconds: Number(timeBufferInSeconds),
            stepAmount: stepAmount,
            status: AuctionStatus.CREATED,
            isPayoutCollected: false,
            isTokenCollected: false,

            bids: [],
            purchaseHistory: [],
          });
          auctionMap.set(auctionIdStr, auction);
          await updateTokenOwnership(
            auction.nft,
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
          auction.winningBidder = bidderSubject;
        }
        const bidId = `${auctionIdStr}-${bidder.toLowerCase()}`;
        console.log(`Processing bid ${bidId} for auction ${auctionIdStr}`);
        const bid = await getOrCreateBid(bidId, auction, bidderSubject);
        bid.bidAmount = bidAmount;
        bid.timestamp = timestamp;
        auction.bids.push(bid);
      }

      if (topic0 === auctionEvents.AuctionFinalized.topic) {
        const { auctionId, winner, winningBid, currency } = auctionEvents.AuctionFinalized.decode(log);
        const auctionIdStr = auctionId.toString();
        const winnerSubject = await getOrCreateSubject(winner);
        const auction = await getAuction(auctionIdStr);
        const usedCurrency = await getOrCreateCurrency(currency);
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

      if(topic0 == auctionEvents.AuctionTokenCollected.topic) {
        const { auctionId, winner, tokenId } = auctionEvents.AuctionTokenCollected.decode(log);
        const auctionIdStr = auctionId.toString();
        const auction = await getAuction(auctionIdStr);
        if(auction) {
          auction.isTokenCollected = true;
          auction.winningBidder = await getOrCreateSubject(winner);
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
