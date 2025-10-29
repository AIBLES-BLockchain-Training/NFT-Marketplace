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
} from '../model';
import { events as auctionEvents } from '../abi/NFTAuction'


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
  updatedOwnerships: TokenOwnership[], // gom ownerships cần cập nhật
) {
  async function getOrCreateSubject(address: string): Promise<Subject> {
    const subjectId = address.toLowerCase();
    if (subjectMap.has(subjectId)) {
      return subjectMap.get(subjectId)!;
    }
    let subject = await ctx.store.get(Subject, subjectId);
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
      collection = new Collection({
        id: collectionId,
        name: `Collection ${contractAddress.slice(0, 6)}`,
        symbol: 'NFT',
        description: undefined,
        bannerUrl: undefined,
        logoUrl: undefined,
        collectionType: CollectionType.ERC721, // erc721 or 1155
        creator: creator,
        createdAt: new Date(),
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
      const collection = await getOrCreateCollection(contractAddress, owner);
      nft = new NFT({
        id: nftId,
        collection: collection,
        tokenId: tokenId,
        name: `NFT #${tokenId.toString()}`,
        imageUrl: undefined,
        description: undefined,
        metadataUri: undefined,
        listings: [],
        purchaseHistory: [],
        traits: [],
        extensions: [],
        owners: [],
      });
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
      auctionMap.set(auctionId, auction);
      return auction;
    }
    return null;
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

  async function updateTokenOwnership(
    nft: NFT,
    owner: Subject,
    quantityChange: bigint,
    timestamp: Date,
  ): Promise<TokenOwnership> {
    const ownershipId = `${nft.id}-${owner.id}`;
    let ownership = await ctx.store.get(TokenOwnership, ownershipId);

    if (!ownership) {
      // chưa có account và quantiy dương -> nhận được
      if (quantityChange < 0n) {
        throw new Error(`Cannot reduce ownership below zero for ${ownershipId}`);
      }
      ownership = new TokenOwnership({
        id: ownershipId,
        nft,
        ownerAddress: owner.id,
        balance: quantityChange, // khởi tạo balance = số dương nhận được
        updatedAt: timestamp,
      });
    } else {
      // đã có account, cập nhật balance
      const currentBalance = BigInt(ownership.balance.toString()); // ép về BigInt để cộng trừ
      const newBalance = currentBalance + quantityChange; // nếu quantityChange âm thì trừ đi Ex: -3n

      if (newBalance < 0n) {
        throw new Error(`Ownership balance cannot go negative for ${ownershipId}`);
      }

      ownership.balance = newBalance;
      ownership.updatedAt = timestamp;
    }

    // thay vì save từng ownership, return ra để gom batch save
    return ownership;
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
        const sellerSubject = await getOrCreateSubject(seller);
        const nft = await getOrCreateNFT(assetContract, tokenId);
        const currencyEntity = await getOrCreateCurrency(currency);
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
            status: AuctionStatus.CREATED,
          });
          auctionMap.set(auctionIdStr, auction);
          // update owner of NFT from seller to contract
          const oldOwner = await updateTokenOwnership(nft, sellerSubject, -quantity, timestamp);
          const newOwner = await updateTokenOwnership(nft, await getOrCreateSubject(contractAddress), quantity, timestamp);
          updatedOwnerships.push(oldOwner, newOwner);
        }
      }

      if (topic0 === auctionEvents.AuctionCancelled.topic) {
        const { auctionId } = auctionEvents.AuctionCancelled.decode(log);
        const auctionIdStr = auctionId.toString();
        const auction = await getAuction(auctionIdStr);
        if (auction) {
          // update auction status
          auction.status = AuctionStatus.CANCELLED;
        }
        // return NFT to seller
        try {
          if (auction) {
            const oldOwner = await updateTokenOwnership(auction.nft, await getOrCreateSubject(contractAddress), -auction.quantity, timestamp);
            const newOwner = await updateTokenOwnership(auction.nft, auction.seller, auction.quantity, timestamp);
            updatedOwnerships.push(oldOwner, newOwner);
          }
        } catch (error) {
          console.error('Error updating token ownership on auction cancellation:', error);
        }
      }

      if (topic0 === auctionEvents.AuctionBidPlaced.topic) {
        const { auctionId, bidder, bidAmount } = auctionEvents.AuctionBidPlaced.decode(log);
        const auctionIdStr = auctionId.toString();
        const bidderSubject = await getOrCreateSubject(bidder);
        const auction = await getAuction(auctionIdStr);
        if (!auction) {
          continue;
        }
        if (auction.status === AuctionStatus.CREATED) {
          auction.status = AuctionStatus.ACTIVE;
        }
        const bidId = `${auctionIdStr}-${bidder.toLowerCase()}`;
        if (!bidMap.has(bidId)) {
          const bid = new Bid({
            id: bidId,
            auction: auction,
            bidder: bidderSubject,
            bidAmount: bidAmount,
            timestamp: timestamp,
          });
          bidMap.set(bidId, bid);

          // Update auction's current highest bid if needed
          auction.winningBid = bid;
          auction.bids.push(bid);
          auctionMap.set(auction.id, auction);
        }
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
          // Update auction status
          auctionMap.set(auction.id, auction);
        }
      }

      if(topic0 == auctionEvents.AuctionTokenCollected.topic) {
        const { auctionId, winner, tokenId } = auctionEvents.AuctionTokenCollected.decode(log);
        const auctionIdStr = auctionId.toString();
        const winnerSubject = await getOrCreateSubject(winner);
        const auction = await getAuction(auctionIdStr);
        if (auction) {
          // transfer NFT from contract to winner
          try {
            const oldOwner = await updateTokenOwnership(auction.nft, await getOrCreateSubject(contractAddress), -auction.quantity, timestamp);
            const newOwner = await updateTokenOwnership(auction.nft, winnerSubject, auction.quantity, timestamp);
            updatedOwnerships.push(oldOwner, newOwner);
          } catch (error) {
            console.error('Error updating token ownership on auction token collection:', error);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing log in tx ${transactionHash} at block ${blockNumber}:`, error);
    }
  }
}
