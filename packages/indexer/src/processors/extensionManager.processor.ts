import { EvmBatchProcessor } from '@subsquid/evm-processor'
import { TypeormDatabase } from '@subsquid/typeorm-store'
import {
  Extension,
  NFT,
  Collection,
  CollectionType
} from '../model'

interface ExtensionManagerABI {
  events: {
    ExtensionAdded: {
      topic: string
      decode: (log: any) => {
        tokenContract: string
        tokenId: bigint
        extensionName: string
        extensionData: string
      }
    }
    ExtensionUpdated: {
      topic: string
      decode: (log: any) => {
        tokenContract: string
        tokenId: bigint
        extensionName: string
        newData: string
      }
    }
    ExtensionRemoved: {
      topic: string
      decode: (log: any) => {
        tokenContract: string
        tokenId: bigint
        extensionName: string
      }
    }
    ExtensionEnabled: {
      topic: string
      decode: (log: any) => {
        tokenContract: string
        tokenId: bigint
        extensionName: string
      }
    }
    ExtensionDisabled: {
      topic: string
      decode: (log: any) => {
        tokenContract: string
        tokenId: bigint
        extensionName: string
      }
    }
  }
}

export class ExtensionManagerProcessor {
  private processor: EvmBatchProcessor
  private contractAddress: string
  private abi: ExtensionManagerABI

  constructor(
    contractAddress: string,
    abi: ExtensionManagerABI,
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
        this.abi.events.ExtensionAdded.topic,
        this.abi.events.ExtensionUpdated.topic,
        this.abi.events.ExtensionRemoved.topic,
        this.abi.events.ExtensionEnabled.topic,
        this.abi.events.ExtensionDisabled.topic
      ]
    })
  }

  async process(db: TypeormDatabase) {
    const extensionMap: Map<string, Extension> = new Map()
    const nftMap: Map<string, NFT> = new Map()
    const collectionMap: Map<string, Collection> = new Map()

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

    async function getExtension(extensionId: string): Promise<Extension | null> {
      if (extensionMap.has(extensionId)) {
        return extensionMap.get(extensionId)!
      }
      const extension = await db.get(Extension, extensionId)
      if (extension) {
        extensionMap.set(extensionId, extension)
        return extension
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

          if (topic0 === this.abi.events.ExtensionAdded.topic) {
            const { tokenContract, tokenId, extensionName, extensionData } =
              this.abi.events.ExtensionAdded.decode(log)

            const nft = await getOrCreateNFT(tokenContract, tokenId)
            const extensionId = `${nft.id}-${extensionName}`

            let extension = await getExtension(extensionId)
            if (!extension) {
              extension = new Extension({
                id: extensionId,
                nft: nft,
                name: extensionName,
                data: extensionData,
                enabled: true,
                createdAt: timestamp,
                updatedAt: timestamp,
                transactionHash: transactionHash
              })
              extensionMap.set(extensionId, extension)
            }
          }

          if (topic0 === this.abi.events.ExtensionUpdated.topic) {
            const { tokenContract, tokenId, extensionName, newData } =
              this.abi.events.ExtensionUpdated.decode(log)

            const nft = await getOrCreateNFT(tokenContract, tokenId)
            const extensionId = `${nft.id}-${extensionName}`

            let extension = await getExtension(extensionId)
            if (extension) {
              extension.data = newData
              extension.updatedAt = timestamp
            }
          }

          if (topic0 === this.abi.events.ExtensionRemoved.topic) {
            const { tokenContract, tokenId, extensionName } =
              this.abi.events.ExtensionRemoved.decode(log)

            const nft = await getOrCreateNFT(tokenContract, tokenId)
            const extensionId = `${nft.id}-${extensionName}`

            const extension = await getExtension(extensionId)
            if (extension) {
              await ctx.store.remove(extension)
              extensionMap.delete(extensionId)
            }
          }

          if (topic0 === this.abi.events.ExtensionEnabled.topic) {
            const { tokenContract, tokenId, extensionName } =
              this.abi.events.ExtensionEnabled.decode(log)

            const nft = await getOrCreateNFT(tokenContract, tokenId)
            const extensionId = `${nft.id}-${extensionName}`

            let extension = await getExtension(extensionId)
            if (extension) {
              extension.enabled = true
              extension.updatedAt = timestamp
            }
          }

          if (topic0 === this.abi.events.ExtensionDisabled.topic) {
            const { tokenContract, tokenId, extensionName } =
              this.abi.events.ExtensionDisabled.decode(log)

            const nft = await getOrCreateNFT(tokenContract, tokenId)
            const extensionId = `${nft.id}-${extensionName}`

            let extension = await getExtension(extensionId)
            if (extension) {
              extension.enabled = false
              extension.updatedAt = timestamp
            }
          }
        }
      }

      await ctx.store.save([...collectionMap.values()])
      await ctx.store.save([...nftMap.values()])
      await ctx.store.save([...extensionMap.values()])
    })
  }

  getProcessor(): EvmBatchProcessor {
    return this.processor
  }
}