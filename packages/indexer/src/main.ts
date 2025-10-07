import "reflect-metadata"
import { EvmBatchProcessor } from '@subsquid/evm-processor'
import { TypeormDatabase } from '@subsquid/typeorm-store'
import {
  Listing,
  Subject,
  Collection,
  NFT,
  SupportedCurrency,
  Role,
  RoleAssignment,
  PermissionEvent,
  PurchaseHistory,
  CurrencyApproval,
  BuyerApproval
} from './model'

import {
  processPermissionsEvents,
  getPermissionsTopics,
  type PermissionsABI
} from './processors/permissions.processor'
import {
  processListingEvents,
  getListingTopics,
  type ListingABI
} from './processors/listing.processor'

import * as permissionsAbi from './abi/Permissions'
import * as listingAbi from './abi/Listing'

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
    const permissionsTopics = getPermissionsTopics(permissionsAbi as PermissionsABI)
    if (permissionsTopics.length > 0) {
      this.processor.addLog({
        address: [CONTRACT_ADDRESSES.permissions.toLowerCase()],
        topic0: permissionsTopics
      })
    }

    // Add logs for listing contract
    const listingTopics = getListingTopics(listingAbi as ListingABI)
    if (listingTopics.length > 0) {
      this.processor.addLog({
        address: [CONTRACT_ADDRESSES.router.toLowerCase()],
        topic0: listingTopics
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
      const subjectMap: Map<string, Subject> = new Map()
      const collectionMap: Map<string, Collection> = new Map()
      const nftMap: Map<string, NFT> = new Map()
      const currencyMap: Map<string, SupportedCurrency> = new Map()
      const roleMap: Map<string, Role> = new Map()

      const roleAssignments: RoleAssignment[] = []
      const permissionEvents: PermissionEvent[] = []
      const purchaseHistories: PurchaseHistory[] = []
      const currencyApprovals: CurrencyApproval[] = []
      const buyerApprovals: BuyerApproval[] = []

      const permissionsLogs: any[] = []
      const listingLogs: any[] = []

      for (let block of ctx.blocks) {
        for (let log of block.logs) {
          const logAddress = log.address.toLowerCase()

          if (logAddress === CONTRACT_ADDRESSES.permissions.toLowerCase()) {
            permissionsLogs.push({ ...log, block })
          } else if (logAddress === CONTRACT_ADDRESSES.router.toLowerCase()) {
            listingLogs.push({ ...log, block })
          }
        }
      }

      // Process permissions events
      if (permissionsLogs.length > 0) {
        console.log(`Processing ${permissionsLogs.length} permissions events`)
        await processPermissionsEvents(
          permissionsLogs,
          ctx,
          permissionsAbi as PermissionsABI,
          CONTRACT_ADDRESSES.permissions.toLowerCase(),
          roleMap,
          subjectMap,
          currencyMap,
          roleAssignments,
          permissionEvents
        )
      }

      // Process listing events
      if (listingLogs.length > 0) {
        console.log(`Processing ${listingLogs.length} listing events`)
        await processListingEvents(
          listingLogs,
          ctx,
          listingAbi as ListingABI,
          CONTRACT_ADDRESSES.router.toLowerCase(),
          listingMap,
          subjectMap,
          collectionMap,
          nftMap,
          currencyMap,
          purchaseHistories,
          currencyApprovals,
          buyerApprovals
        )
      }

      console.log('Saving entities to database...')
      await ctx.store.save(Array.from(subjectMap.values()))
      await ctx.store.save(Array.from(roleMap.values()))
      await ctx.store.save(Array.from(collectionMap.values()))
      await ctx.store.save(Array.from(nftMap.values()))
      await ctx.store.save(Array.from(currencyMap.values()))
      await ctx.store.save(Array.from(listingMap.values()))
      await ctx.store.save(roleAssignments)
      await ctx.store.save(permissionEvents)
      await ctx.store.save(currencyApprovals)
      await ctx.store.save(buyerApprovals)
      await ctx.store.save(purchaseHistories)

      console.log(`Batch completed: ${permissionsLogs.length + listingLogs.length} events processed`)
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