import "reflect-metadata"
import { EvmBatchProcessor } from '@subsquid/evm-processor'
import { TypeormDatabase } from '@subsquid/typeorm-store'
import {
  Listing,
  Offer,
  Subject,
  Collection,
  NFT,
  SupportedCurrency,
  Role,
  RoleAssignment,
  PermissionEvent,
  PurchaseHistory,
  CurrencyApproval,
  BuyerApproval,
  TokenOwnership,
  RoleRequest,
  NFTRoleRequest,
  FeeWithdrawal,
  Auction,
  Bid
} from './model'

import {
  processPermissionsEvents,
  getPermissionsTopics
} from './processors/permissions.processor'
import {
  processListingEvents,
  getListingTopics
} from './processors/listing.processor'
import {
  processOfferEvents,
  getOfferTopics
} from './processors/offer.processor'
import {
  processAuctionEvents,
  getAuctionTopics
} from './processors/auction.processor'

const NETWORK_CONFIG = {
  gateway: process.env.GATEWAY_URL || 'https://v2.archive.subsquid.io/network/ethereum-sepolia',
  rpcEndpoint: process.env.RPC_ENDPOINT || process.env.RPC_SEPOLIA_HTTP
}

const CONTRACT_ADDRESSES = {
  permissions: process.env.PERMISSIONS_CONTRACT || '0xbc07643c3300a45a8ACc8761EdE748403E9Df35f',
  // IMPORTANT: Use Router address, not Listing address!
  // Events are emitted from Router when using delegatecall
  router: process.env.ROUTER_CONTRACT || '0x1279e1f267968eC70841dFa26Fbab60F65CdF717'
}

class CombinedIndexer {
  private processor: EvmBatchProcessor

  constructor() {
    this.processor = new EvmBatchProcessor()
      .setGateway(NETWORK_CONFIG.gateway)
      .setFinalityConfirmation(12)
      .setBlockRange({ from: 9347902 })

    if (NETWORK_CONFIG.rpcEndpoint) {
      this.processor.setRpcEndpoint({
        url: NETWORK_CONFIG.rpcEndpoint,
        rateLimit: 5
      })
    }

    this.processor.setFields({
      log: {
        topics: true,
        data: true,
        transactionHash: true,
        address: true
      },
      block: {
        timestamp: true,
        height: true
      },
      transaction: {
        hash: true
      }
    })

    // Add logs for permissions contract
    const permissionsTopics = getPermissionsTopics()
    if (permissionsTopics.length > 0) {
      this.processor.addLog({
        address: [CONTRACT_ADDRESSES.permissions.toLowerCase()],
        topic0: permissionsTopics
      })
    }

    // Add logs for listing contract
    const listingTopics = getListingTopics()
    if (listingTopics.length > 0) {
      this.processor.addLog({
        address: [CONTRACT_ADDRESSES.router.toLowerCase()],
        topic0: listingTopics
      })
    }

    // Add logs for offer contract
    const offerTopics = getOfferTopics()
    if (offerTopics.length > 0) {
      this.processor.addLog({
        address: [CONTRACT_ADDRESSES.router.toLowerCase()],
        topic0: offerTopics
      })
    }

    // Add logs for auction contract
    const auctionTopics = getAuctionTopics()
    if (auctionTopics.length > 0) {
      this.processor.addLog({
        address: [CONTRACT_ADDRESSES.router.toLowerCase()],
        topic0: auctionTopics
      })
    }
  }

  async run() {
    console.log('Starting combined NFT marketplace indexer...')
    console.log('Processing contracts:', Object.keys(CONTRACT_ADDRESSES))
    console.log('Contracts addresses:', CONTRACT_ADDRESSES)

    const db = new TypeormDatabase()

    await this.processor.run(db, async (ctx) => {
      const listingMap: Map<string, Listing> = new Map()
      const offerMap: Map<string, Offer> = new Map()
      const auctionMap: Map<string, Auction> = new Map()
      const subjectMap: Map<string, Subject> = new Map()
      const collectionMap: Map<string, Collection> = new Map()
      const nftMap: Map<string, NFT> = new Map()
      const currencyMap: Map<string, SupportedCurrency> = new Map()
      const roleMap: Map<string, Role> = new Map()
      const tokenOwnershipMap: Map<string, TokenOwnership> = new Map()
      const bidMap: Map<string, Bid> = new Map()

      const roleAssignments: RoleAssignment[] = []
      const permissionEvents: PermissionEvent[] = []
      const purchaseHistories: PurchaseHistory[] = []
      const currencyApprovals: CurrencyApproval[] = []
      const buyerApprovals: BuyerApproval[] = []
      const roleRequests: RoleRequest[] = []
      const nftRoleRequests: NFTRoleRequest[] = []
      const feeWithdrawals: FeeWithdrawal[] = []

      const permissionsLogs: any[] = []
      const listingLogs: any[] = []
      const offerLogs: any[] = []
      const auctionLogs: any[] = []

      for (let block of ctx.blocks) {
        for (let log of block.logs) {
          const logAddress = log.address.toLowerCase()

          if (logAddress === CONTRACT_ADDRESSES.permissions.toLowerCase()) {
            permissionsLogs.push({ ...log, block })
          } else if (logAddress === CONTRACT_ADDRESSES.router.toLowerCase()) {
            // Router emits both Listing and Offer events
            listingLogs.push({ ...log, block })
            offerLogs.push({ ...log, block })
            auctionLogs.push({ ...log, block })
          }
        }
      }

      // Process permissions events
      if (permissionsLogs.length > 0) {
        console.log(`Processing ${permissionsLogs.length} permissions events`)
        await processPermissionsEvents(
          permissionsLogs,
          ctx,
          CONTRACT_ADDRESSES.permissions.toLowerCase(),
          roleMap,
          subjectMap,
          currencyMap,
          roleAssignments,
          permissionEvents,
          roleRequests,
          nftRoleRequests
        )
      }

      // Process listing events
      if (listingLogs.length > 0) {
        console.log(`Processing ${listingLogs.length} listing events`)
        await processListingEvents(
          listingLogs,
          ctx,
          CONTRACT_ADDRESSES.router.toLowerCase(),
          listingMap,
          subjectMap,
          collectionMap,
          nftMap,
          currencyMap,
          purchaseHistories,
          currencyApprovals,
          buyerApprovals,
          tokenOwnershipMap,
          feeWithdrawals
        )
      }

      // Process offer events
      if (offerLogs.length > 0) {
        console.log(`Processing ${offerLogs.length} offer events`)
        await processOfferEvents(
          offerLogs,
          ctx,
          CONTRACT_ADDRESSES.router.toLowerCase(),
          offerMap,
          subjectMap,
          collectionMap,
          nftMap,
          currencyMap,
          purchaseHistories
        )
      }

      // Process auction events
      if (auctionLogs.length > 0) {
        console.log(`Processing ${auctionLogs.length} auction events`)
        await processAuctionEvents(
          auctionLogs,
          ctx,
          CONTRACT_ADDRESSES.router.toLowerCase(),
          auctionMap,
          nftMap,
          subjectMap,
          collectionMap,
          bidMap,
          currencyMap,
          purchaseHistories,
          tokenOwnershipMap
        )
      }

      console.log('Saving entities to database...')
      await ctx.store.save(Array.from(subjectMap.values()))
      await ctx.store.save(Array.from(roleMap.values()))
      await ctx.store.save(Array.from(collectionMap.values()))
      await ctx.store.save(Array.from(nftMap.values()))

      // Save traits from all NFTs
      const allTraits = Array.from(nftMap.values())
        .flatMap(nft => nft.traits || [])
        .filter(trait => trait != null)
      if (allTraits.length > 0) {
        console.log(`Saving ${allTraits.length} traits...`)
        await ctx.store.save(allTraits)
      }

      await ctx.store.save(Array.from(tokenOwnershipMap.values()))
      await ctx.store.save(Array.from(currencyMap.values()))
      await ctx.store.save(Array.from(listingMap.values()))
      await ctx.store.save(Array.from(offerMap.values()))
      await ctx.store.save(Array.from(auctionMap.values()))
      await ctx.store.save(Array.from(bidMap.values()))

      const assignmentsToRemove = roleAssignments.filter((a: any) => a._toRemove)
      const assignmentsToSave = roleAssignments.filter((a: any) => !a._toRemove)

      // Deduplicate role assignments by ID to avoid "ON CONFLICT" errors
      const uniqueAssignmentsMap = new Map<string, any>()
      for (const assignment of assignmentsToSave) {
        uniqueAssignmentsMap.set(assignment.id, assignment)
      }
      const uniqueAssignments = Array.from(uniqueAssignmentsMap.values())

      if (assignmentsToRemove.length > 0) {
        console.log(`Removing ${assignmentsToRemove.length} role assignments`)
        await ctx.store.remove(assignmentsToRemove)
      }

      if (uniqueAssignments.length > 0) {
        console.log(`Saving ${uniqueAssignments.length} unique role assignments (${assignmentsToSave.length - uniqueAssignments.length} duplicates removed)`)
        await ctx.store.save(uniqueAssignments)
      }

      await ctx.store.save(permissionEvents)
      await ctx.store.save(currencyApprovals)
      await ctx.store.save(buyerApprovals)
      await ctx.store.save(purchaseHistories)
      await ctx.store.save(roleRequests)
      await ctx.store.save(nftRoleRequests)
      await ctx.store.save(feeWithdrawals)

      console.log(`Batch completed: ${permissionsLogs.length + listingLogs.length + offerLogs.length} events processed`)
      console.log(`Batch completed: ${permissionsLogs.length + listingLogs.length} events processed`)
      console.log(`Role requests: ${roleRequests.length}, NFT role requests: ${nftRoleRequests.length}`)
      console.log(`Fee withdrawals: ${feeWithdrawals.length}`)
    })
  }
}

async function main() {
  const indexer = new CombinedIndexer()
  await indexer.run()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})