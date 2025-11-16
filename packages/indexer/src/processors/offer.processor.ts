import {
  Offer,
  OfferStatus,
  Subject,
  SubjectType,
  NFT,
  Collection,
  CollectionType,
  PurchaseHistory,
  TradeType,
  SupportedCurrency
} from '../model'
import * as OfferABI from '../abi/NFTOffer'

export function getOfferTopics(): string[] {
  return [
    OfferABI.events.OfferCreated?.topic,
    OfferABI.events.OfferCancelled?.topic,
    OfferABI.events.OfferAccepted?.topic
  ].filter(Boolean) as string[]
}

export async function processOfferEvents(
  logs: any[],
  ctx: any,
  contractAddress: string,
  offerMap: Map<string, Offer>,
  subjectMap: Map<string, Subject>,
  collectionMap: Map<string, Collection>,
  nftMap: Map<string, NFT>,
  currencyMap: Map<string, SupportedCurrency>,
  purchaseHistories: PurchaseHistory[]
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
        // description: undefined,
        // logoUrl: undefined,
        // bannerUrl: undefined,
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

  async function getOffer(offerId: string): Promise<Offer | null> {
    if (offerMap.has(offerId)) {
      return offerMap.get(offerId)!
    }
    const offer = await ctx.store.get(Offer, offerId)
    if (offer) {
      offerMap.set(offerId, offer)
      return offer
    }
    return null
  }

  for (let log of logs) {
    const topic0 = log.topics[0]
    const timestamp = new Date(log.block.header.timestamp)
    const blockNumber = log.block.header.height
    const transactionHash = log.transactionHash || ''

    try {
      // OfferCreated event
      if (topic0 === OfferABI.events.OfferCreated?.topic) {
        const {
          offerId, offeror, assetContract, tokenId, quantity,
          currency, totalPrice, expirationTimestamp
        } = OfferABI.events.OfferCreated.decode(log)

        const offerIdStr = offerId.toString()
        const offerorSubject = await getOrCreateSubject(offeror)
        const nft = await getOrCreateNFT(assetContract, tokenId, offerorSubject)
        const currencyEntity = await getOrCreateCurrency(currency)

        let offer = await getOffer(offerIdStr)
        if (!offer) {
          offer = new Offer({
            id: offerIdStr,
            buyerAddress: offerorSubject.id,
            nftId: nft,
            quantity: quantity,
            totalPrice: totalPrice,
            currency: currencyEntity,
            expirationTime: new Date(Number(expirationTimestamp) * 1000),
            status: OfferStatus.ACTIVE
          })
          offerMap.set(offerIdStr, offer)
        }
      }

      // OfferCancelled event
      else if (topic0 === OfferABI.events.OfferCancelled?.topic) {
        const { offerId, offeror } = OfferABI.events.OfferCancelled.decode(log)
        const offerIdStr = offerId.toString()
        let offer = await getOffer(offerIdStr)
        if (offer) {
          offer.status = OfferStatus.CANCELLED
        }
      }

      // OfferAccepted event
      else if (topic0 === OfferABI.events.OfferAccepted?.topic) {
        const {
          offerId, offeror, assetOwner, assetContract,
          tokenId, quantity, currency, totalPrice
        } = OfferABI.events.OfferAccepted.decode(log)

        const offerIdStr = offerId.toString()
        let offer = await getOffer(offerIdStr)

        if (offer) {
          offer.status = OfferStatus.COMPLETED

          const offerorSubject = await getOrCreateSubject(offeror)
          const assetOwnerSubject = await getOrCreateSubject(assetOwner)
          const nft = await getOrCreateNFT(assetContract, tokenId)
          const currencyEntity = await getOrCreateCurrency(currency)

          // Create purchase history
          const purchaseHistory = new PurchaseHistory({
            id: `${transactionHash}-${log.logIndex}`,
            transactionHash: transactionHash,
            nft: nft,
            seller: assetOwnerSubject,
            buyer: offerorSubject,
            quantity: quantity,
            currency: currencyEntity,
            totalPrice: totalPrice,
            tradeType: TradeType.LISTING, // Using LISTING as there's no OFFER type in schema
            timestamp: timestamp,
            blockNumber: blockNumber,
            auction: undefined,
            listing: undefined
          })
          purchaseHistories.push(purchaseHistory)
        }
      }

    } catch (error) {
      console.error(`Error processing offer log at block ${blockNumber}, tx ${transactionHash}:`, error)
    }
  }
}
