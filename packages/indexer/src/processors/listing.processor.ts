import {
  Listing,
  ListingStatus,
  Subject,
  SubjectType,
  NFT,
  Collection,
  CollectionType,
  PurchaseHistory,
  TradeType,
  CurrencyApproval,
  BuyerApproval,
  SupportedCurrency
} from '../model'
import * as ListingABI from '../abi/Listing'

export function getListingTopics(): string[] {
  return [
    ListingABI.events.ListingCreated?.topic,
    ListingABI.events.ListingUpdated?.topic,
    ListingABI.events.ListingCompleted?.topic,
    ListingABI.events.ListingCancelled?.topic,
    ListingABI.events.BuyerApproved?.topic,
    ListingABI.events.CurrencyApproved?.topic,
    ListingABI.events.NFTPurchased?.topic,
    ListingABI.events.FeeWithdrawn?.topic,
    ListingABI.events.CurrencyFeeUpdated?.topic,
    ListingABI.events.PermissionContractUpdated?.topic
  ].filter(Boolean) as string[]
}

export async function processListingEvents(
  logs: any[],
  ctx: any,
  contractAddress: string,
  listingMap: Map<string, Listing>,
  subjectMap: Map<string, Subject>,
  collectionMap: Map<string, Collection>,
  nftMap: Map<string, NFT>,
  currencyMap: Map<string, SupportedCurrency>,
  purchaseHistories: PurchaseHistory[],
  currencyApprovals: CurrencyApproval[],
  buyerApprovals: BuyerApproval[]
) {
  async function getOrCreateSubject(address: string): Promise<Subject> {
    const subjectId = address.toLowerCase()
    if (subjectMap.has(subjectId)) {
      return subjectMap.get(subjectId)!
    }
    let subject = await ctx.store.get(Subject, subjectId)
    if (!subject) {
      subject = new Subject({
        id: subjectId,
        subjectType: SubjectType.USER,
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        avatarUrl: undefined,
        backgroundUrl: undefined,
        bio: undefined,
        createdAt: new Date(),
        collections: [],
        listings: [],
        roleAssignments: [],
        purchaseHistoryAsSeller: [],
        purchaseHistoryAsBuyer: []
      })
    }
    subjectMap.set(subjectId, subject)
    return subject
  }

  async function getOrCreateCollection(contractAddress: string, creator?: Subject): Promise<Collection> {
    const collectionId = contractAddress.toLowerCase()
    if (collectionMap.has(collectionId)) {
      return collectionMap.get(collectionId)!
    }
    let collection = await ctx.store.get(Collection, collectionId)
    if (!collection) {
      collection = new Collection({
        id: collectionId,
        name: `Collection ${contractAddress.slice(0, 6)}`,
        symbol: 'NFT',
        description: undefined,
        logoUrl: undefined,
        bannerUrl: undefined,
        collectionType: CollectionType.ERC721,
        creator: creator,
        totalSupply: BigInt(0),
        floorPrice: undefined,
        createdAt: new Date(),
        nfts: [],
        traits: [],
        traitStats: []
      })
    }
    collectionMap.set(collectionId, collection)
    return collection
  }

  async function getOrCreateNFT(contractAddress: string, tokenId: bigint, owner?: Subject): Promise<NFT> {
    const nftId = `${contractAddress.toLowerCase()}-${tokenId.toString()}`
    if (nftMap.has(nftId)) {
      return nftMap.get(nftId)!
    }
    let nft = await ctx.store.get(NFT, nftId)
    if (!nft) {
      const collection = await getOrCreateCollection(contractAddress, owner)
      nft = new NFT({
        id: nftId,
        collection: collection,
        tokenId: tokenId,
        name: `NFT #${tokenId}`,
        imageUrl: undefined,
        description: undefined,
        metadataUri: undefined,
        listings: [],
        purchaseHistory: [],
        traits: [],
        extensions: [],
        owners: []
      })
    }
    nftMap.set(nftId, nft)
    return nft
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

  async function getListing(listingId: string): Promise<Listing | null> {
    if (listingMap.has(listingId)) {
      return listingMap.get(listingId)!
    }
    const listing = await ctx.store.get(Listing, listingId)
    if (listing) {
      listingMap.set(listingId, listing)
      return listing
    }
    return null
  }

  for (let log of logs) {
    const topic0 = log.topics[0]
    const timestamp = new Date(log.block.header.timestamp)
    const blockNumber = log.block.header.height
    const transactionHash = log.transactionHash || ''

    try {
      if (topic0 === ListingABI.events.ListingCreated?.topic) {
        const {
          listingId, owner, assetContract, tokenId, quantity,
          currency, pricePerToken, startTimestamp, endTimestamp, reserved
        } = ListingABI.events.ListingCreated.decode(log)

        const listingIdStr = listingId.toString()
        const ownerSubject = await getOrCreateSubject(owner)
        const nft = await getOrCreateNFT(assetContract, tokenId, ownerSubject)

        let listing = await getListing(listingIdStr)
        if (!listing) {
          listing = new Listing({
            id: listingIdStr,
            owner: ownerSubject,
            nft: nft,
            quantity: quantity,
            pricePerToken: pricePerToken,
            startTimestamp: new Date(Number(startTimestamp) * 1000),
            endTimestamp: new Date(Number(endTimestamp) * 1000),
            isReserved: reserved,
            status: ListingStatus.CREATED,
            createdAt: timestamp,
            updatedAt: timestamp,
            transactionHash: transactionHash,
            currencyApprovals: [],
            buyerApprovals: [],
            purchaseHistory: []
          })
          listingMap.set(listingIdStr, listing)
        }
      }

      else if (topic0 === ListingABI.events.ListingUpdated?.topic) {
        const {
          listingId, assetContract, tokenId, quantity,
          currency, pricePerToken, startTimestamp, endTimestamp, reserved
        } = ListingABI.events.ListingUpdated.decode(log)

        const listingIdStr = listingId.toString()
        let listing = await getListing(listingIdStr)
        if (listing) {
          const nft = await getOrCreateNFT(assetContract, tokenId)
          listing.nft = nft
          listing.quantity = quantity
          listing.pricePerToken = pricePerToken
          listing.startTimestamp = new Date(Number(startTimestamp) * 1000)
          listing.endTimestamp = new Date(Number(endTimestamp) * 1000)
          listing.isReserved = reserved
          listing.updatedAt = timestamp
          listing.transactionHash = transactionHash
        }
      }

      else if (topic0 === ListingABI.events.ListingCompleted?.topic) {
        const { listingId } = ListingABI.events.ListingCompleted.decode(log)
        const listingIdStr = listingId.toString()
        let listing = await getListing(listingIdStr)
        if (listing) {
          listing.status = ListingStatus.COMPLETED
          listing.updatedAt = timestamp
          listing.transactionHash = transactionHash
        }
      }

      else if (topic0 === ListingABI.events.ListingCancelled?.topic) {
        const { listingId } = ListingABI.events.ListingCancelled.decode(log)
        const listingIdStr = listingId.toString()
        let listing = await getListing(listingIdStr)
        if (listing) {
          listing.status = ListingStatus.CANCELED
          listing.updatedAt = timestamp
          listing.transactionHash = transactionHash
        }
      }

      else if (topic0 === ListingABI.events.NFTPurchased?.topic) {
        const { listingId, buyer, quantity, totalPrice } = ListingABI.events.NFTPurchased.decode(log)
        const listingIdStr = listingId.toString()
        let listing = await getListing(listingIdStr)
        if (listing) {
          const buyerSubject = await getOrCreateSubject(buyer)
          let usedCurrency = await getOrCreateCurrency('0x0000000000000000000000000000000000000000')

          const approvedCurrencies = await ctx.store.find(CurrencyApproval, {
            where: { listing: { id: listingIdStr } }
          })

          if (approvedCurrencies.length > 0) {
            for (const approval of approvedCurrencies) {
              const expectedPrice = approval.pricePerToken * quantity
              if (expectedPrice === totalPrice) {
                usedCurrency = approval.currency
                break
              }
            }
          }

          if (listing.quantity < quantity) {
            console.error(`Insufficient quantity in listing ${listingIdStr}: available ${listing.quantity}, requested ${quantity}`)
            continue
          }

          const purchaseHistory = new PurchaseHistory({
            id: `${transactionHash}-${log.logIndex}`,
            transactionHash: transactionHash,
            nft: listing.nft,
            seller: listing.owner,
            buyer: buyerSubject,
            quantity: quantity,
            currency: usedCurrency,
            totalPrice: totalPrice,
            tradeType: TradeType.LISTING,
            timestamp: timestamp,
            blockNumber: blockNumber,
            auction: undefined,
            listing: listing
          })
          purchaseHistories.push(purchaseHistory)

          listing.quantity = listing.quantity - quantity
          listing.updatedAt = timestamp
          listing.transactionHash = transactionHash

          if (listing.quantity === BigInt(0)) {
            listing.status = ListingStatus.COMPLETED
          }
        }
      }

    } catch (error) {
      console.error(`Error processing listing log at block ${blockNumber}, tx ${transactionHash}:`, error)
    }
  }
}