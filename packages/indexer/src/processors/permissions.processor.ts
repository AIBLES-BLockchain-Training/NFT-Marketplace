import {
  Role,
  Subject,
  SubjectType,
  RoleAssignment,
  PermissionEvent,
  PermissionEventType,
  SupportedCurrency,
  Collection,
  CollectionType
} from '../model'
import * as PermissionsABI from '../abi/Permissions'

export function getPermissionsTopics(): string[] {
  return [
    PermissionsABI.events.RoleGranted?.topic,
    PermissionsABI.events.RoleRevoked?.topic,
    PermissionsABI.events.RoleAdminChanged?.topic,
    PermissionsABI.events.CurrencyAdded?.topic,
    PermissionsABI.events.CurrencyRemoved?.topic,
    PermissionsABI.events.NFTRoleAssigned?.topic,
    PermissionsABI.events.NFTRoleRevoked?.topic,
    PermissionsABI.events.UserRoleAssigned?.topic,
    PermissionsABI.events.UserRoleRevoked?.topic,
    PermissionsABI.events.RoleRegistered?.topic,
    PermissionsABI.events.RoleRequested?.topic,
    PermissionsABI.events.NFTRoleRequested?.topic
  ].filter(Boolean) as string[]
}

export async function processPermissionsEvents(
  logs: any[],
  ctx: any,
  contractAddress: string,
  roleMap: Map<string, Role>,
  subjectMap: Map<string, Subject>,
  currencyMap: Map<string, SupportedCurrency>,
  roleAssignments: RoleAssignment[],
  permissionEvents: PermissionEvent[],
  collectionMap: Map<string, Collection>
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

  async function getOrCreateSubject(address: string, type?: SubjectType): Promise<Subject> {
    const subjectId = address.toLowerCase()

    if (subjectMap.has(subjectId)) {
      return subjectMap.get(subjectId)!
    }

    let subject = await ctx.store.get(Subject, subjectId)
    if (!subject) {
      const subjectType = type || SubjectType.USER

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

  async function getOrCreateCollection(contractAddress: string, creator?: Subject): Promise<Collection> {
    const collectionId = contractAddress.toLowerCase()

    if (collectionMap.has(collectionId)) {
      return collectionMap.get(collectionId)!
    }

    let collection = await ctx.store.get(Collection, collectionId)
    if (!collection) {
      collection = new Collection({
        id: collectionId,
        name: `Collection ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`,
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

  for (let log of logs) {
    const topic0 = log.topics[0]
    const timestamp = new Date(log.block.header.timestamp)
    const blockNumber = log.block.header.height
    const transactionHash = log.transactionHash || ''

    try {
      if (topic0 === PermissionsABI.events.RoleGranted?.topic) {
        const { role: roleHash, account, sender } = PermissionsABI.events.RoleGranted.decode(log)

        const role = await getOrCreateRole(roleHash)
        const subject = await getOrCreateSubject(account)
        const grantor = await getOrCreateSubject(sender)

        let existingAssignment = roleAssignments.find(a =>
          a.subject.id === subject.id && a.role.id === role.id && !(a as any)._toRemove
        )

        if (!existingAssignment) {
          existingAssignment = await ctx.store.findOne(RoleAssignment, {
            where: {
              subject: { id: subject.id },
              role: { id: role.id }
            }
          })
        }

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
          roleAssignments.push(existingAssignment)
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

      else if (topic0 === PermissionsABI.events.RoleRevoked?.topic) {
        const { role: roleHash, account, sender } = PermissionsABI.events.RoleRevoked.decode(log)

        const role = await getOrCreateRole(roleHash)
        const subject = await getOrCreateSubject(account)
        const revoker = await getOrCreateSubject(sender)

        const assignmentId = `${subject.id}-${role.id}`
        let existingAssignment = roleAssignments.find(a =>
          a.subject.id === subject.id && a.role.id === role.id
        )

        if (!existingAssignment) {
          existingAssignment = await ctx.store.findOne(RoleAssignment, {
            where: {
              subject: { id: subject.id },
              role: { id: role.id }
            }
          })
        }

        if (existingAssignment) {
          const index = roleAssignments.indexOf(existingAssignment)
          if (index > -1) {
            roleAssignments.splice(index, 1)
          }
          (existingAssignment as any)._toRemove = true
          roleAssignments.push(existingAssignment)
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

      else if (topic0 === PermissionsABI.events.CurrencyAdded?.topic) {
        const { currency: currencyAddress } = PermissionsABI.events.CurrencyAdded.decode(log)

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

      else if (topic0 === PermissionsABI.events.CurrencyRemoved?.topic) {
        const { currency: currencyAddress } = PermissionsABI.events.CurrencyRemoved.decode(log)

        const currency = await getOrCreateCurrency(currencyAddress)
        if (currency) {
          currency.isActive = false
          currencyMap.set(currency.id, currency)
        }
      }

      else if (topic0 === PermissionsABI.events.RoleAdminChanged?.topic) {
        const { role: roleHash, previousAdminRole, newAdminRole } = PermissionsABI.events.RoleAdminChanged.decode(log)

        console.log(`Role admin changed for role ${roleHash}: ${previousAdminRole} -> ${newAdminRole} at block ${blockNumber}`)
      }

      else if (topic0 === PermissionsABI.events.RoleRegistered?.topic) {
        const { role: roleHash, adminRole } = PermissionsABI.events.RoleRegistered.decode(log)

        await getOrCreateRole(roleHash)
        console.log(`Role registered: ${roleHash} with admin role ${adminRole} at block ${blockNumber}`)
      }

      else if (topic0 === PermissionsABI.events.UserRoleAssigned?.topic) {
        const { role: roleHash, account } = PermissionsABI.events.UserRoleAssigned.decode(log)

        const role = await getOrCreateRole(roleHash)
        const subject = await getOrCreateSubject(account)

        let existingAssignment = roleAssignments.find(a =>
          a.subject.id === subject.id && a.role.id === role.id && !(a as any)._toRemove
        )

        if (!existingAssignment) {
          existingAssignment = await ctx.store.findOne(RoleAssignment, {
            where: {
              subject: { id: subject.id },
              role: { id: role.id }
            }
          })
        }

        if (!existingAssignment) {
          const assignmentId = `${subject.id}-${role.id}-${transactionHash}-${log.logIndex}`
          const assignment = new RoleAssignment({
            id: assignmentId,
            subject: subject,
            role: role,
            assignedAt: timestamp,
            assignedBy: contractAddress,
            transactionHash: transactionHash
          })
          roleAssignments.push(assignment)
        }
      }

      else if (topic0 === PermissionsABI.events.UserRoleRevoked?.topic) {
        const { role: roleHash, account } = PermissionsABI.events.UserRoleRevoked.decode(log)

        const role = await getOrCreateRole(roleHash)
        const subject = await getOrCreateSubject(account)

        let existingAssignment = roleAssignments.find(a =>
          a.subject.id === subject.id && a.role.id === role.id
        )

        if (!existingAssignment) {
          existingAssignment = await ctx.store.findOne(RoleAssignment, {
            where: {
              subject: { id: subject.id },
              role: { id: role.id }
            }
          })
        }

        if (existingAssignment) {
          const index = roleAssignments.indexOf(existingAssignment)
          if (index > -1) {
            roleAssignments.splice(index, 1)
          }
          (existingAssignment as any)._toRemove = true
          roleAssignments.push(existingAssignment)
        }
      }

      else if (topic0 === PermissionsABI.events.NFTRoleAssigned?.topic) {
        const { nft } = PermissionsABI.events.NFTRoleAssigned.decode(log)

        // NFT_ROLE hash = keccak256('NFT_ROLE')
        const NFT_ROLE_HASH = '0x8736816fdbcc15f6cc3f6dcf60e42b0ef33eb02281d312c807a38b4ad09190c0'

        const role = await getOrCreateRole(NFT_ROLE_HASH, 'NFT_ROLE')
        const nftSubject = await getOrCreateSubject(nft, SubjectType.CONTRACT)

        // Create Collection for this NFT contract
        const collection = await getOrCreateCollection(nft, nftSubject)

        let existingAssignment = roleAssignments.find(a =>
          a.subject.id === nftSubject.id && a.role.id === role.id && !(a as any)._toRemove
        )

        if (!existingAssignment) {
          existingAssignment = await ctx.store.findOne(RoleAssignment, {
            where: {
              subject: { id: nftSubject.id },
              role: { id: role.id }
            }
          })
        }

        if (!existingAssignment) {
          const assignmentId = `${nftSubject.id}-${role.id}-${transactionHash}-${log.logIndex}`
          const assignment = new RoleAssignment({
            id: assignmentId,
            subject: nftSubject,
            role: role,
            assignedAt: timestamp,
            assignedBy: contractAddress,
            transactionHash: transactionHash
          })
          roleAssignments.push(assignment)
        } else {
          existingAssignment.assignedAt = timestamp
          existingAssignment.assignedBy = contractAddress
          existingAssignment.transactionHash = transactionHash
          roleAssignments.push(existingAssignment)
        }

        console.log(`NFT role assigned to ${nft} (collection created/updated) at block ${blockNumber}`)
      }

      else if (topic0 === PermissionsABI.events.NFTRoleRevoked?.topic) {
        const { nft } = PermissionsABI.events.NFTRoleRevoked.decode(log)

        // NFT_ROLE hash = keccak256('NFT_ROLE')
        const NFT_ROLE_HASH = '0x8736816fdbcc15f6cc3f6dcf60e42b0ef33eb02281d312c807a38b4ad09190c0'

        const role = await getOrCreateRole(NFT_ROLE_HASH, 'NFT_ROLE')
        const nftSubject = await getOrCreateSubject(nft, SubjectType.CONTRACT)

        let existingAssignment = roleAssignments.find(a =>
          a.subject.id === nftSubject.id && a.role.id === role.id
        )

        if (!existingAssignment) {
          existingAssignment = await ctx.store.findOne(RoleAssignment, {
            where: {
              subject: { id: nftSubject.id },
              role: { id: role.id }
            }
          })
        }

        if (existingAssignment) {
          const index = roleAssignments.indexOf(existingAssignment)
          if (index > -1) {
            roleAssignments.splice(index, 1)
          }
          (existingAssignment as any)._toRemove = true
          roleAssignments.push(existingAssignment)
        }

        console.log(`NFT role revoked from ${nft} at block ${blockNumber}`)
      }

      else if (topic0 === PermissionsABI.events.RoleRequested?.topic) {
        const { requester, role: roleHash } = PermissionsABI.events.RoleRequested.decode(log)

        console.log(`Role ${roleHash} requested by ${requester} at block ${blockNumber}`)
      }

      else if (topic0 === PermissionsABI.events.NFTRoleRequested?.topic) {
        const { nft, tokenId, requester } = PermissionsABI.events.NFTRoleRequested.decode(log)

        console.log(`NFT role requested for ${nft}#${tokenId} by ${requester} at block ${blockNumber}`)
      }

    } catch (error) {
      console.error(`Error processing permissions log at block ${blockNumber}, tx ${transactionHash}:`, error)
    }
  }
}