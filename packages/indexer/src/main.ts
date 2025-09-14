import "reflect-metadata"
import { TypeormDatabase } from '@subsquid/typeorm-store'
import { PermissionsProcessor } from './processors/permissions.processor'
import { RouterProcessor } from './processors/router.processor'
import { ListingProcessor } from './processors/listing.processor'
import { ExtensionManagerProcessor } from './processors/extensionManager.processor'

import * as permissionsAbi from './abi/permissions'
import * as routerAbi from './abi/router'
import * as listingAbi from './abi/listing'
import * as extensionManagerAbi from './abi/extension-manager'

const NETWORK_CONFIG = {
  gateway: process.env.GATEWAY_URL || 'https://v2.archive.subsquid.io/network/ethereum-sepolia',
  rpcEndpoint: process.env.RPC_ENDPOINT || process.env.RPC_SEPOLIA_HTTP
}

const CONTRACT_ADDRESSES = {
  permissions: process.env.PERMISSIONS_CONTRACT || '0x0000000000000000000000000000000000000001',
  router: process.env.ROUTER_CONTRACT || '0x0000000000000000000000000000000000000002',
  listing: process.env.LISTING_CONTRACT || '0x0000000000000000000000000000000000000003',
  extensionManager: process.env.EXTENSION_MANAGER_CONTRACT || '0x0000000000000000000000000000000000000004'
}

class MultiContractIndexer {
  private db: TypeormDatabase
  private processors: Map<string, any>

  constructor() {
    this.db = new TypeormDatabase()
    this.processors = new Map()
    this.initializeProcessors()
  }

  private initializeProcessors() {
    const permissionsProcessor = new PermissionsProcessor(
      CONTRACT_ADDRESSES.permissions,
      permissionsAbi,
      NETWORK_CONFIG.gateway,
      NETWORK_CONFIG.rpcEndpoint
    )
    this.processors.set('permissions', permissionsProcessor)

    const routerProcessor = new RouterProcessor(
      CONTRACT_ADDRESSES.router,
      routerAbi,
      NETWORK_CONFIG.gateway,
      NETWORK_CONFIG.rpcEndpoint
    )
    this.processors.set('router', routerProcessor)

    const listingProcessor = new ListingProcessor(
      CONTRACT_ADDRESSES.listing,
      listingAbi,
      NETWORK_CONFIG.gateway,
      NETWORK_CONFIG.rpcEndpoint
    )
    this.processors.set('listing', listingProcessor)

    const extensionManagerProcessor = new ExtensionManagerProcessor(
      CONTRACT_ADDRESSES.extensionManager,
      extensionManagerAbi,
      NETWORK_CONFIG.gateway,
      NETWORK_CONFIG.rpcEndpoint
    )
    this.processors.set('extensionManager', extensionManagerProcessor)
  }

  async run() {
    console.log('Starting multi-contract indexer...')
    console.log('Processing contracts:', Object.keys(CONTRACT_ADDRESSES))

    const processingMode = process.env.PROCESSING_MODE || 'parallel'

    if (processingMode === 'parallel') {
      await this.runParallel()
    } else {
      await this.runSequential()
    }
  }

  private async runParallel() {
    console.log('Running processors in parallel mode...')

    const processorPromises = Array.from(this.processors.entries()).map(
      async ([name, processor]) => {
        try {
          console.log(`Starting ${name} processor...`)
          await processor.process(this.db)
          console.log(`${name} processor completed successfully`)
        } catch (error) {
          console.error(`Error in ${name} processor:`, error)
          throw error
        }
      }
    )

    try {
      await Promise.all(processorPromises)
      console.log('All processors completed successfully')
    } catch (error) {
      console.error('Error during parallel processing:', error)
      throw error
    }
  }

  private async runSequential() {
    console.log('Running processors in sequential mode...')

    for (const [name, processor] of this.processors.entries()) {
      try {
        console.log(`Starting ${name} processor...`)
        await processor.process(this.db)
        console.log(`${name} processor completed successfully`)
      } catch (error) {
        console.error(`Error in ${name} processor:`, error)
        throw error
      }
    }

    console.log('All processors completed successfully')
  }

  async runSpecificProcessor(processorName: string) {
    const processor = this.processors.get(processorName)
    if (!processor) {
      throw new Error(`Processor ${processorName} not found`)
    }

    console.log(`Running ${processorName} processor...`)
    try {
      await processor.process(this.db)
      console.log(`${processorName} processor completed successfully`)
    } catch (error) {
      console.error(`Error in ${processorName} processor:`, error)
      throw error
    }
  }
}

async function main() {
  const indexer = new MultiContractIndexer()

  const specificProcessor = process.env.RUN_PROCESSOR
  if (specificProcessor) {
    await indexer.runSpecificProcessor(specificProcessor)
  } else {
    await indexer.run()
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})