import {
  Role,
  Subject,
  SubjectType,
  RoleAssignment,
  PermissionEvent,
  PermissionEventType,
  SupportedCurrency
} from '../model'

export interface PermissionsABI {
  events: {
    RoleGranted: {
      topic: string
      decode: (log: any) => {
        role: string
        account: string
        sender: string
      }
    }
    RoleRevoked: {
      topic: string
      decode: (log: any) => {
        role: string
        account: string
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
    CurrencyAdded: {
      topic: string
      decode: (log: any) => {
        currency: string
      }
    }
    CurrencyRemoved: {
      topic: string
      decode: (log: any) => {
        currency: string
      }
    }
    NFTRoleAssigned: {
      topic: string
      decode: (log: any) => {
        nft: string
      }
    }
    NFTRoleRevoked: {
      topic: string
      decode: (log: any) => {
        nft: string
      }
    }
    UserRoleAssigned: {
      topic: string
      decode: (log: any) => {
        role: string
        account: string
      }
    }
    UserRoleRevoked: {
      topic: string
      decode: (log: any) => {
        role: string
        account: string
      }
    }
    RoleRegistered: {
      topic: string
      decode: (log: any) => {
        role: string
        adminRole: string
      }
    }
    RoleRequested: {
      topic: string
      decode: (log: any) => {
        requester: string
        role: string
      }
    }
    NFTRoleRequested: {
      topic: string
      decode: (log: any) => {
        nft: string
        tokenId: bigint
        requester: string
      }
    }
  }
}

export function getPermissionsTopics(abi: PermissionsABI): string[] {
  return [
    abi.events.RoleGranted?.topic,
    abi.events.RoleRevoked?.topic,
    abi.events.RoleAdminChanged?.topic,
    abi.events.CurrencyAdded?.topic,
    abi.events.CurrencyRemoved?.topic,
    abi.events.NFTRoleAssigned?.topic,
    abi.events.NFTRoleRevoked?.topic,
    abi.events.UserRoleAssigned?.topic,
    abi.events.UserRoleRevoked?.topic,
    abi.events.RoleRegistered?.topic,
    abi.events.RoleRequested?.topic,
    abi.events.NFTRoleRequested?.topic
  ].filter(Boolean) as string[]
}

export async function processPermissionsEvents(
  logs: any[],
  ctx: any,
  abi: PermissionsABI,
  contractAddress: string,
  roleMap: Map<string, Role>,
  subjectMap: Map<string, Subject>,
  currencyMap: Map<string, SupportedCurrency>,
  roleAssignments: RoleAssignment[],
  permissionEvents: PermissionEvent[]
) {
  async function getOrCreateRole(roleHash: string, roleName?: string): Promise<Role> {
    if (roleMap.has(roleHash)) {
      return roleMap.get(roleHash)!
    }

    let role = await ctx.store.get(Role, roleHash)
    if (!role) {
      role = new Role({
        id: roleHash,
        roleHash: roleHash,
        roleName: roleName || `Role_${roleHash.slice(0, 8)}`,
        description: undefined,
        assignments: []
      })
    }
    roleMap.set(roleHash, role)
    return role
  }

  async function getOrCreateSubject(address: string): Promise<Subject> {
    const subjectId = address.toLowerCase()

    if (subjectMap.has(subjectId)) {
      return subjectMap.get(subjectId)!
    }

    let subject = await ctx.store.get(Subject, subjectId)
    if (!subject) {
      const subjectType = SubjectType.USER

      subject = new Subject({
        id: subjectId,
        subjectType: subjectType,
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

  async function getOrCreateCurrency(address: string): Promise<SupportedCurrency | null> {
    const currencyId = address.toLowerCase()

    if (currencyMap.has(currencyId)) {
      return currencyMap.get(currencyId)!
    }

    let currency = await ctx.store.get(SupportedCurrency, currencyId)
    if (currency) {
      currencyMap.set(currencyId, currency)
      return currency
    }
    return null
  }

  for (let log of logs) {
    const topic0 = log.topics[0]
    const timestamp = new Date(log.block.header.timestamp)
    const blockNumber = log.block.header.height
    const transactionHash = log.transactionHash || ''

    try {
      if (topic0 === abi.events.RoleGranted?.topic) {
        const { role: roleHash, account, sender } = abi.events.RoleGranted.decode(log)

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
          const assignmentId = `${subject.id}-${role.id}-${transactionHash}-${log.logIndex}`
          const assignment = new RoleAssignment({
            id: assignmentId,
            subject: subject,
            role: role,
            assignedAt: timestamp,
            assignedBy: grantor.id,
            transactionHash: transactionHash
          })
          roleAssignments.push(assignment)
        } else {
          existingAssignment.assignedAt = timestamp
          existingAssignment.assignedBy = grantor.id
          existingAssignment.transactionHash = transactionHash
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

      else if (topic0 === abi.events.RoleRevoked?.topic) {
        const { role: roleHash, account, sender } = abi.events.RoleRevoked.decode(log)

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

      else if (topic0 === abi.events.CurrencyAdded?.topic) {
        const { currency: currencyAddress } = abi.events.CurrencyAdded.decode(log)

        let currency = await getOrCreateCurrency(currencyAddress)
        if (!currency) {
          currency = new SupportedCurrency({
            id: currencyAddress.toLowerCase(),
            name: `Currency_${currencyAddress.slice(0, 6)}`,
            symbol: 'UNKNOWN',
            decimals: 18,
            isActive: true,
            feePercentage: 0,
            totalAmountFee: BigInt(0),
            currencyApprovals: [],
            purchaseHistory: []
          })
          currencyMap.set(currency.id, currency)
        } else {
          currency.isActive = true
          currencyMap.set(currency.id, currency)
        }
      }

      else if (topic0 === abi.events.CurrencyRemoved?.topic) {
        const { currency: currencyAddress } = abi.events.CurrencyRemoved.decode(log)

        const currency = await getOrCreateCurrency(currencyAddress)
        if (currency) {
          currency.isActive = false
          currencyMap.set(currency.id, currency)
        }
      }

    } catch (error) {
      console.error(`Error processing permissions log at block ${blockNumber}, tx ${transactionHash}:`, error)
    }
  }
}