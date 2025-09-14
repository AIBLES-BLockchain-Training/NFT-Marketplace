import { EvmBatchProcessor } from '@subsquid/evm-processor'
import { TypeormDatabase } from '@subsquid/typeorm-store'
import {
  Role,
  Subject,
  SubjectType,
  RoleAssignment,
  PermissionEvent,
  PermissionEventType
} from '../model'

interface PermissionsABI {
  events: {
    RoleGranted: {
      topic: string
      decode: (log: any) => {
        account: string
        role: string
        sender: string
      }
    }
    RoleRevoked: {
      topic: string
      decode: (log: any) => {
        account: string
        role: string
        sender: string
      }
    }
    RoleAdminChanged: {
      topic: string
      decode: (log: any) => {
        role: string
        previousAdminRole: string
        newAdminRole: string
      }
    }
  }
}

class IdGenerator {
  private ids: Record<string, number>

  constructor() {
    this.ids = {}
  }

  public getNextId(key: string): number {
    if (this.ids[key] === undefined) {
      this.ids[key] = 0
    }
    return this.ids[key]++
  }
}

export class PermissionsProcessor {
  private processor: EvmBatchProcessor
  private contractAddress: string
  private abi: PermissionsABI
  private idGenerator: IdGenerator

  constructor(
    contractAddress: string,
    abi: PermissionsABI,
    gateway: string = 'https://v2.archive.subsquid.io/network/ethereum-sepolia',
    rpcEndpoint?: string
  ) {
    this.contractAddress = contractAddress
    this.abi = abi
    this.idGenerator = new IdGenerator()

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
        this.abi.events.RoleGranted.topic,
        this.abi.events.RoleRevoked.topic,
        this.abi.events.RoleAdminChanged.topic
      ]
    })
  }

  async process(db: TypeormDatabase) {
    const roleMap: Map<string, Role> = new Map()
    const subjectMap: Map<string, Subject> = new Map()
    const roleAssignments: RoleAssignment[] = []
    const permissionEvents: PermissionEvent[] = []

    async function getOrCreateRole(roleHash: string, roleName?: string): Promise<Role> {
      if (roleMap.has(roleHash)) {
        return roleMap.get(roleHash)!
      }

      let role = await db.get(Role, roleHash)
      if (!role) {
        role = new Role({
          id: roleHash,
          roleHash: roleHash,
          roleName: roleName || `Role_${roleHash.slice(0, 8)}`,
          description: null,
          assignments: []
        })
        roleMap.set(roleHash, role)
      } else {
        roleMap.set(roleHash, role)
      }
      return role
    }

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

          if (topic0 === this.abi.events.RoleGranted.topic) {
            const { account, role: roleHash, sender } = this.abi.events.RoleGranted.decode(log)

            const role = await getOrCreateRole(roleHash)
            const subject = await getOrCreateSubject(account)
            const grantor = await getOrCreateSubject(sender)

            const existingAssignment = await ctx.store.findOne(RoleAssignment, {
              where: {
                subject: { id: subject.id },
                role: { id: role.id }
              }
            })

            if (!existingAssignment) {
              const assignment = new RoleAssignment({
                id: `${subject.id}-${role.id}-${blockNumber}`,
                subject: subject,
                role: role,
                assignedAt: timestamp,
                assignedBy: grantor.id,
                transactionHash: transactionHash
              })
              roleAssignments.push(assignment)
            }

            const event = new PermissionEvent({
              id: `${transactionHash}-${log.logIndex}`,
              eventType: PermissionEventType.ROLE_GRANTED,
              role: role,
              subject: subject,
              granted: true,
              grantedBy: grantor.id,
              timestamp: timestamp,
              transactionHash: transactionHash,
              blockNumber: blockNumber
            })
            permissionEvents.push(event)
          }

          if (topic0 === this.abi.events.RoleRevoked.topic) {
            const { account, role: roleHash, sender } = this.abi.events.RoleRevoked.decode(log)

            const role = await getOrCreateRole(roleHash)
            const subject = await getOrCreateSubject(account)
            const revoker = await getOrCreateSubject(sender)

            const existingAssignment = await ctx.store.findOne(RoleAssignment, {
              where: {
                subject: { id: subject.id },
                role: { id: role.id }
              }
            })

            if (existingAssignment) {
              await ctx.store.remove(existingAssignment)
            }

            const event = new PermissionEvent({
              id: `${transactionHash}-${log.logIndex}`,
              eventType: PermissionEventType.ROLE_REVOKED,
              role: role,
              subject: subject,
              granted: false,
              grantedBy: revoker.id,
              timestamp: timestamp,
              transactionHash: transactionHash,
              blockNumber: blockNumber
            })
            permissionEvents.push(event)
          }

          if (topic0 === this.abi.events.RoleAdminChanged.topic) {
            const { role: roleHash, previousAdminRole, newAdminRole } =
              this.abi.events.RoleAdminChanged.decode(log)

            const role = await getOrCreateRole(roleHash)
            const previousAdmin = await getOrCreateRole(previousAdminRole, 'Admin')
            const newAdmin = await getOrCreateRole(newAdminRole, 'Admin')

            const event = new PermissionEvent({
              id: `${transactionHash}-${log.logIndex}`,
              eventType: PermissionEventType.ADMIN_ROLE_CHANGED,
              role: role,
              subject: null,
              granted: true,
              grantedBy: this.contractAddress,
              timestamp: timestamp,
              transactionHash: transactionHash,
              blockNumber: blockNumber
            })
            permissionEvents.push(event)
          }
        }
      }

      await ctx.store.save([...roleMap.values()])
      await ctx.store.save([...subjectMap.values()])
      await ctx.store.save(roleAssignments)
      await ctx.store.save(permissionEvents)
    })
  }

  getProcessor(): EvmBatchProcessor {
    return this.processor
  }
}