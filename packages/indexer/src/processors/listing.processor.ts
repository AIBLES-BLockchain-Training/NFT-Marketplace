import { EvmBatchProcessor } from '@subsquid/evm-processor'
import { TypeormDatabase } from '@subsquid/typeorm-store'
import {
  Listing,
  ListingStatus,
  Subject,
  SubjectType,
  NFT,
  Collection,
  CollectionType,
  PurchaseHistory,
  TradeType
} from '../model'

interface ListingABI {
  events: {
    ListingCreated: {
      topic: string
      decode: (log: any) => {
        listingId: bigint
        tokenContract: string
        tokenId: bigint
        seller: string
        price: bigint
        currency: string
        startTime: bigint
        endTime: bigint
      }
    }
    ListingUpdated: {
      topic: string
      decode: (log: any) => {
        listingId: bigint
        newPrice: bigint
        newCurrency: string
      }
    }
    ListingCancelled: {
      topic: string
      decode: (log: any) => {
        listingId: bigint
        cancelledBy: string
      }
    }
    ListingSold: {
      topic: string
      decode: (log: any) => {
        listingId: bigint
        buyer: string
        price: bigint
        currency: string
      }
    }
  }
}

export class ListingProcessor {
  private processor: EvmBatchProcessor
  private contractAddress: string
  private abi: ListingABI

  constructor(
    contractAddress: string,
    abi: ListingABI,
    gateway: string = 'https://v2.archive.subsquid.io/network/ethereum-sepolia',
    rpcEndpoint?: string
  ) {
    this.contractAddress = contractAddress
    this.abi = abi

    this.processor = new EvmBatchProcessor()
      .setGateway(gateway)
      .setFinalityConfirmation(12)

    if (rpcEndpoint) {
      this.processor.setRpcEndpoint({
        url: rpcEndpoint,
        rateLimit: 5
      })
    }

    this.processor.addLog({
      address: [this.contractAddress],
      topic0: [
        this.abi.events.ListingCreated.topic,
        this.abi.events.ListingUpdated.topic,
        this.abi.events.ListingCancelled.topic,
        this.abi.events.ListingSold.topic
      ]
    })
  }

  async process(db: TypeormDatabase) {
    const listingMap: Map<string, Listing> = new Map()
    const subjectMap: Map<string, Subject> = new Map()
    const collectionMap: Map<string, Collection> = new Map()
    const nftMap: Map<string, NFT> = new Map()
    const purchaseHistories: PurchaseHistory[] = []

    async function getOrCreateSubject(address: string): Promise<Subject> {
      const subjectId = address.toLowerCase()

      if (subjectMap.has(subjectId)) {
        return subjectMap.get(subjectId)!
      }

      let subject = await db.get(Subject, subjectId)
      if (!subject) {
        subject = new Subject({
          id: subjectId,
          subjectType: SubjectType.ADDRESS,
          name: `${address.slice(0, 6)}...${address.slice(-4)}`,
          avatarUrl: null,
          backgroundUrl: null,
          bio: null,
          createdAt: new Date(),
          collections: [],
          listings: [],
          roleAssignments: [],
          purchaseHistoryAsSeller: [],
          purchaseHistoryAsBuyer: []
        })
        subjectMap.set(subjectId, subject)
      } else {
        subjectMap.set(subjectId, subject)
      }
      return subject
    }

    async function getOrCreateCollection(contractAddress: string): Promise<Collection> {
      const collectionId = contractAddress.toLowerCase()

      if (collectionMap.has(collectionId)) {
        return collectionMap.get(collectionId)!
      }

      let collection = await db.get(Collection, collectionId)
      if (!collection) {
        collection = new Collection({
          id: collectionId,
          contractAddress: collectionId,
          name: `Collection ${contractAddress.slice(0, 6)}`,
          symbol: 'NFT',
          description: null,
          bannerImageUrl: null,
          logoImageUrl: null,
          collectionType: CollectionType.ERC721,
          creator: null,
          createdAt: new Date(),
          royaltyPercentage: 0,
          royaltyRecipient: null,
          nfts: [],
          collectionTraitStats: [],
          supportedCurrencies: []
        })
        collectionMap.set(collectionId, collection)
      } else {
        collectionMap.set(collectionId, collection)
      }
      return collection
    }

    async function getOrCreateNFT(
      contractAddress: string,
      tokenId: bigint
    ): Promise<NFT> {
      const nftId = `${contractAddress.toLowerCase()}-${tokenId.toString()}`

      if (nftMap.has(nftId)) {
        return nftMap.get(nftId)!
      }

      let nft = await db.get(NFT, nftId)
      if (!nft) {
        const collection = await getOrCreateCollection(contractAddress)
        nft = new NFT({
          id: nftId,
          tokenId: tokenId,
          collection: collection,
          name: `NFT #${tokenId}`,
          description: null,
          imageUrl: null,
          metadataUrl: null,
          animationUrl: null,
          currentOwner: null,
          mintedAt: new Date(),
          mintedBy: null,
          mintPrice: BigInt(0),
          traits: [],
          listings: [],
          tokenOwnerships: []
        })
        nftMap.set(nftId, nft)
      } else {
        nftMap.set(nftId, nft)
      }
      return nft
    }

    async function getListing(listingId: string): Promise<Listing | null> {
      if (listingMap.has(listingId)) {
        return listingMap.get(listingId)!
      }
      const listing = await db.get(Listing, listingId)
      if (listing) {
        listingMap.set(listingId, listing)
        return listing
      }
      return null
    }

    await this.processor.run(db, async (ctx) => {
      for (let block of ctx.blocks) {
        for (let log of block.logs) {
          const topic0 = log.topics[0]
          const timestamp = new Date(block.header.timestamp)
          const blockNumber = block.header.height
          const transactionHash = log.transaction?.hash || ''

          if (topic0 === this.abi.events.ListingCreated.topic) {
            const {
              listingId,
              tokenContract,
              tokenId,
              seller,
              price,
              currency,
              startTime,
              endTime
            } = this.abi.events.ListingCreated.decode(log)

            const listingIdStr = listingId.toString()
            const sellerSubject = await getOrCreateSubject(seller)
            const nft = await getOrCreateNFT(tokenContract, tokenId)

            let listing = await getListing(listingIdStr)
            if (!listing) {
              listing = new Listing({
                id: listingIdStr,
                nft: nft,
                owner: sellerSubject,
                price: price,
                currency: currency,
                startTime: new Date(Number(startTime) * 1000),
                endTime: endTime ? new Date(Number(endTime) * 1000) : null,
                status: ListingStatus.ACTIVE,
                createdAt: timestamp,
                updatedAt: timestamp,
                auction: null,
                offers: [],
                purchaseHistory: []
              })
              listingMap.set(listingIdStr, listing)
            }
          }

          if (topic0 === this.abi.events.ListingUpdated.topic) {
            const { listingId, newPrice, newCurrency } = this.abi.events.ListingUpdated.decode(log)

            const listingIdStr = listingId.toString()
            let listing = await getListing(listingIdStr)
            if (listing) {
              listing.price = newPrice
              listing.currency = newCurrency
              listing.updatedAt = timestamp
            }
          }

          if (topic0 === this.abi.events.ListingCancelled.topic) {
            const { listingId } = this.abi.events.ListingCancelled.decode(log)

            const listingIdStr = listingId.toString()
            let listing = await getListing(listingIdStr)
            if (listing) {
              listing.status = ListingStatus.CANCELLED
              listing.updatedAt = timestamp
            }
          }

          if (topic0 === this.abi.events.ListingSold.topic) {
            const { listingId, buyer, price, currency } = this.abi.events.ListingSold.decode(log)

            const listingIdStr = listingId.toString()
            let listing = await getListing(listingIdStr)
            if (listing) {
              listing.status = ListingStatus.SOLD
              listing.updatedAt = timestamp

              const buyerSubject = await getOrCreateSubject(buyer)

              const purchaseHistory = new PurchaseHistory({
                id: `${transactionHash}-${log.logIndex}`,
                nft: listing.nft,
                listing: listing,
                seller: listing.owner,
                buyer: buyerSubject,
                price: price,
                currency: currency,
                tradeType: TradeType.DIRECT_SALE,
                purchasedAt: timestamp,
                transactionHash: transactionHash
              })
              purchaseHistories.push(purchaseHistory)

              if (listing.nft) {
                listing.nft.currentOwner = buyerSubject
              }
            }
          }
        }
      }

      await ctx.store.save([...subjectMap.values()])
      await ctx.store.save([...collectionMap.values()])
      await ctx.store.save([...nftMap.values()])
      await ctx.store.save([...listingMap.values()])
      await ctx.store.save(purchaseHistories)
    })
  }

  getProcessor(): EvmBatchProcessor {
    return this.processor
  }
}