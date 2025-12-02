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
import { fetchTokenInfo } from '../utils/erc20'

export function getOfferTopics(): string[] {
  return [
    OfferABI.events.OfferCreated?.topic,
    OfferABI.events.OfferCancelled?.topic,
    OfferABI.events.OfferAccepted?.topic,
    OfferABI.events.FeeWithdrawn?.topic
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
// 6 lệnh của nó để restart indexer là: docker compose down -v, docker conpose up -d, npx tsc, npx squid-typeorm-codegen, npx squid-typeorm-migration generate, npx squid-typeorm-migration apply, node -r dotenv/config lib/main.js
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

  async function getOrCreateCurrency(address: string, block: any): Promise<SupportedCurrency> {
    const currencyId = address.toLowerCase()
    if (currencyMap.has(currencyId)) {
      return currencyMap.get(currencyId)!
    }
    let currency = await ctx.store.get(SupportedCurrency, currencyId)
    if (!currency) {
      // Fetch proper token info using ERC20 utility
      const tokenInfo = await fetchTokenInfo(ctx, block, address)
      
      currency = new SupportedCurrency({
        id: currencyId,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals, // Use correct decimals (6 for USDC, 18 for others)
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

  let offerCreatedCount = 0
  let offerCancelledCount = 0
  let offerAcceptedCount = 0
  let feeWithdrawnCount = 0

  for (let log of logs) {
    const topic0 = log.topics[0]
    const timestamp = new Date(log.block.header.timestamp)
    const blockNumber = log.block.header.height
    const transactionHash = log.transactionHash || ''

    try {
      // OfferCreated event
      if (topic0 === OfferABI.events.OfferCreated?.topic) {
        console.log(`[Offer] Processing OfferCreated at block ${blockNumber}, tx ${transactionHash}`)

        const {
          offerId, offeror, assetContract, tokenId, quantity,
          currency, totalPrice, expirationTimestamp
        } = OfferABI.events.OfferCreated.decode(log)

        const offerIdStr = `${contractAddress.toLowerCase()}-${offerId.toString()}`
        console.log(`[Offer] Decoded OfferCreated: offerId=${offerIdStr}, offeror=${offeror}, assetContract=${assetContract}, tokenId=${tokenId}`)
        const offerorSubject = await getOrCreateSubject(offeror)
        console.log(`[Offer] Created/Found subject: ${offerorSubject.id}`)

        const nft = await getOrCreateNFT(assetContract, tokenId, offerorSubject)
        console.log(`[Offer] Created/Found NFT: ${nft.id}`)

        const currencyEntity = await getOrCreateCurrency(currency, log.block)
        console.log(`[Offer] Created/Found currency: ${currencyEntity.id}`)

        // Try to get NFT owner at time of offer creation
        let tokenOwner: Subject | undefined = undefined
        try {
          if (nft.owners && nft.owners.length > 0) {
            const ownerSubject = nft.owners[0]
            if (ownerSubject && ownerSubject.id) {
              tokenOwner = await getOrCreateSubject(ownerSubject.id)
            }
          }
        } catch (error) {
          // Leave tokenOwner as undefined if we can't determine it
        }

        let offer = await getOffer(offerIdStr)
        if (!offer) {
          offer = new Offer({
            id: offerIdStr,
            offerId: offerId.toString(),
            offeror: offerorSubject,
            tokenOwner: tokenOwner,
            nft: nft,
            quantity: quantity,
            totalPrice: totalPrice,
            currency: currencyEntity,
            expirationTime: new Date(Number(expirationTimestamp) * 1000),
            expirationTimestamp: expirationTimestamp,
            status: OfferStatus.ACTIVE,
            createdAt: timestamp,
            updatedAt: timestamp,
            transactionHash: transactionHash,
            blockNumber: blockNumber
          })
          offerMap.set(offerIdStr, offer)
          offerCreatedCount++
          console.log(`[Offer] Created new offer ${offerIdStr} and added to offerMap (size: ${offerMap.size})`)
        } else {
          console.log(`[Offer] Offer ${offerIdStr} already exists, skipping`)
        }
      }

      // OfferCancelled event
      else if (topic0 === OfferABI.events.OfferCancelled?.topic) {
        console.log(`[Offer] Processing OfferCancelled at block ${blockNumber}, tx ${transactionHash}`)

        const { offerId, offeror } = OfferABI.events.OfferCancelled.decode(log)
        const offerIdStr = `${contractAddress.toLowerCase()}-${offerId.toString()}`
        console.log(`[Offer] Cancelling offer ${offerIdStr}`)

        let offer = await getOffer(offerIdStr)
        if (offer) {
          offer.status = OfferStatus.CANCELLED
          offer.updatedAt = timestamp
          offerCancelledCount++
          console.log(`[Offer] Offer ${offerIdStr} marked as CANCELLED`)
        } else {
          console.warn(`[Offer] Cannot cancel - Offer ${offerIdStr} not found`)
        }
      }

      // OfferAccepted event
      else if (topic0 === OfferABI.events.OfferAccepted?.topic) {
        console.log(`[Offer] Processing OfferAccepted at block ${blockNumber}, tx ${transactionHash}`)

        const {
          offerId, offeror, assetOwner, assetContract,
          tokenId, quantity, currency, totalPrice
        } = OfferABI.events.OfferAccepted.decode(log)

        const offerIdStr = `${contractAddress.toLowerCase()}-${offerId.toString()}`
        console.log(`[Offer] Accepting offer ${offerIdStr}`)

        let offer = await getOffer(offerIdStr)

        if (offer) {
          offer.status = OfferStatus.COMPLETED
          offer.updatedAt = timestamp

          const offerorSubject = await getOrCreateSubject(offeror)
          const assetOwnerSubject = await getOrCreateSubject(assetOwner)
          const nft = await getOrCreateNFT(assetContract, tokenId)
          const currencyEntity = await getOrCreateCurrency(currency, log.block)

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
            tradeType: TradeType.OFFER,
            timestamp: timestamp,
            blockNumber: blockNumber,
            auction: undefined,
            listing: undefined
          })
          purchaseHistories.push(purchaseHistory)
          offerAcceptedCount++
          console.log(`[Offer] Offer ${offerIdStr} marked as COMPLETED, purchase history created`)
        } else {
          console.warn(`[Offer] Cannot accept - Offer ${offerIdStr} not found`)
        }
      }

      // FeeWithdrawn event
      else if (topic0 === OfferABI.events.FeeWithdrawn?.topic) {
        console.log(`[Offer] Processing FeeWithdrawn at block ${blockNumber}, tx ${transactionHash}`)

        const { admin, currency, amount } = OfferABI.events.FeeWithdrawn.decode(log)

        console.log(`[Offer] Fee withdrawn by admin ${admin} for currency ${currency}: ${amount.toString()}`)
        feeWithdrawnCount++
      }

    } catch (error) {
      console.error(`[Offer] ERROR processing log at block ${blockNumber}, tx ${transactionHash}:`, error)
      console.error(`[Offer] Error details:`, JSON.stringify(error, null, 2))
    }
  }

  console.log(`[Offer] Processed ${offerCreatedCount} OfferCreated, ${offerCancelledCount} OfferCancelled, ${offerAcceptedCount} OfferAccepted, ${feeWithdrawnCount} FeeWithdrawn`)
  console.log(`[Offer] Total offers in map: ${offerMap.size}`)
}
