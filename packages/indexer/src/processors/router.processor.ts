import { EvmBatchProcessor } from '@subsquid/evm-processor'
import { TypeormDatabase } from '@subsquid/typeorm-store'
import {
  RouterEvent,
  RouterEventType,
  Subject,
  SubjectType
} from '../model'

interface RouterABI {
  events: {
    RouteExecuted: {
      topic: string
      decode: (log: any) => {
        from: string
        to: string
        selector: string
        value: bigint
      }
    }
    RouteCreated: {
      topic: string
      decode: (log: any) => {
        routeId: string
        from: string
        to: string
      }
    }
    RouteRemoved: {
      topic: string
      decode: (log: any) => {
        routeId: string
      }
    }
  }
}

export class RouterProcessor {
  private processor: EvmBatchProcessor
  private contractAddress: string
  private abi: RouterABI

  constructor(
    contractAddress: string,
    abi: RouterABI,
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
        this.abi.events.RouteExecuted.topic,
        this.abi.events.RouteCreated.topic,
        this.abi.events.RouteRemoved.topic
      ]
    })
  }

  async process(db: TypeormDatabase) {
    const routerEvents: RouterEvent[] = []
    const subjectMap: Map<string, Subject> = new Map()

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

    await this.processor.run(db, async (ctx) => {
      for (let block of ctx.blocks) {
        for (let log of block.logs) {
          const topic0 = log.topics[0]
          const timestamp = new Date(block.header.timestamp)
          const blockNumber = block.header.height
          const transactionHash = log.transaction?.hash || ''

          if (topic0 === this.abi.events.RouteExecuted.topic) {
            const { from, to, selector, value } = this.abi.events.RouteExecuted.decode(log)

            const fromSubject = await getOrCreateSubject(from)
            const toSubject = await getOrCreateSubject(to)

            const event = new RouterEvent({
              id: `${transactionHash}-${log.logIndex}`,
              eventType: RouterEventType.ROUTE_EXECUTED,
              routeId: null,
              fromAddress: fromSubject.id,
              toAddress: toSubject.id,
              selector: selector,
              value: value,
              timestamp: timestamp,
              transactionHash: transactionHash,
              blockNumber: blockNumber
            })
            routerEvents.push(event)
          }

          if (topic0 === this.abi.events.RouteCreated.topic) {
            const { routeId, from, to } = this.abi.events.RouteCreated.decode(log)

            const fromSubject = await getOrCreateSubject(from)
            const toSubject = await getOrCreateSubject(to)

            const event = new RouterEvent({
              id: `${transactionHash}-${log.logIndex}`,
              eventType: RouterEventType.ROUTE_CREATED,
              routeId: routeId,
              fromAddress: fromSubject.id,
              toAddress: toSubject.id,
              selector: null,
              value: BigInt(0),
              timestamp: timestamp,
              transactionHash: transactionHash,
              blockNumber: blockNumber
            })
            routerEvents.push(event)
          }

          if (topic0 === this.abi.events.RouteRemoved.topic) {
            const { routeId } = this.abi.events.RouteRemoved.decode(log)

            const event = new RouterEvent({
              id: `${transactionHash}-${log.logIndex}`,
              eventType: RouterEventType.ROUTE_REMOVED,
              routeId: routeId,
              fromAddress: null,
              toAddress: null,
              selector: null,
              value: BigInt(0),
              timestamp: timestamp,
              transactionHash: transactionHash,
              blockNumber: blockNumber
            })
            routerEvents.push(event)
          }
        }
      }

      await ctx.store.save([...subjectMap.values()])
      await ctx.store.save(routerEvents)
    })
  }

  getProcessor(): EvmBatchProcessor {
    return this.processor
  }
}