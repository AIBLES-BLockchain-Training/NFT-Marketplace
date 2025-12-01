import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    CurrencyAdded: event("0xe0390a89516146ccfb796a9fbfc3f7646282194c554d05020484599ee992dd5a", "CurrencyAdded(address)", {"currency": indexed(p.address)}),
    CurrencyRemoved: event("0xa40d69111be14f29022626d38310e47cc2d7f4cb728961509c2f65a4bee08c5b", "CurrencyRemoved(address)", {"currency": indexed(p.address)}),
    NFTRoleAssigned: event("0x59247e5c00fc2d2bdc87ba657d2a0c15c319f48b3f5c3f7f2ade39e55b9ef6c0", "NFTRoleAssigned(address)", {"nft": indexed(p.address)}),
    NFTRoleRequested: event("0xb1e62f2bcfbbe798619fc68bfa6a62c352410fa47f015720db7e03a88d604b5c", "NFTRoleRequested(address,uint256,address)", {"nft": indexed(p.address), "tokenId": p.uint256, "requester": indexed(p.address)}),
    NFTRoleRevoked: event("0x5544471505d081e75487b44bafb95f27cb6656e7497bb70d699a3579232998b8", "NFTRoleRevoked(address)", {"nft": indexed(p.address)}),
    RoleAdminChanged: event("0xbd79b86ffe0ab8e8776151514217cd7cacd52c909f66475c3af44e129f0b00ff", "RoleAdminChanged(bytes32,bytes32,bytes32)", {"role": indexed(p.bytes32), "previousAdminRole": indexed(p.bytes32), "newAdminRole": indexed(p.bytes32)}),
    RoleGranted: event("0x2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d", "RoleGranted(bytes32,address,address)", {"role": indexed(p.bytes32), "account": indexed(p.address), "sender": indexed(p.address)}),
    RoleRegistered: event("0xbe731b2171af48a9ac1e334654f853cd6cbbb48547ac0fe6ca5b148f3bd41344", "RoleRegistered(bytes32,bytes32)", {"role": indexed(p.bytes32), "adminRole": indexed(p.bytes32)}),
    RoleRequested: event("0x2c5d566a9ea3fa5f9d93d90fcbfad5dbc454cf7907a3994e129541ceff4f1c22", "RoleRequested(address,bytes32)", {"requester": indexed(p.address), "role": p.bytes32}),
    RoleRevoked: event("0xf6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b", "RoleRevoked(bytes32,address,address)", {"role": indexed(p.bytes32), "account": indexed(p.address), "sender": indexed(p.address)}),
    UserRoleAssigned: event("0x790845889125c8ba498bfb3af67d5114da13db649ccd37a3bc579312b8f2ff4d", "UserRoleAssigned(bytes32,address)", {"role": indexed(p.bytes32), "account": indexed(p.address)}),
    UserRoleRevoked: event("0x1b657c620098024c31a71bd93ec7ab15587b2cb33d293dc18e899b7d6b831227", "UserRoleRevoked(bytes32,address)", {"role": indexed(p.bytes32), "account": indexed(p.address)}),
}

export const functions = {
    AUCTION_ROLE: viewFun("0x4320ac6c", "AUCTION_ROLE()", {}, p.bytes32),
    MANAGEMENT_ROLE: viewFun("0x3c5d58d6", "MANAGEMENT_ROLE()", {}, p.bytes32),
    NFT_ROLE: viewFun("0xe2dca2b2", "NFT_ROLE()", {}, p.bytes32),
    DEFAULT_ADMIN_ROLE: viewFun("0xa217fddf", "DEFAULT_ADMIN_ROLE()", {}, p.bytes32),
    LISTING_ROLE: viewFun("0x96f88ae4", "LISTING_ROLE()", {}, p.bytes32),
    OFFER_ROLE: viewFun("0xa467d44b", "OFFER_ROLE()", {}, p.bytes32),
    addCurrency: fun("0xd13d7197", "addCurrency(address[])", {"_currencies": p.array(p.address)}, ),
    assignNFTRole: fun("0xfe1d7ce1", "assignNFTRole(address[])", {"_nfts": p.array(p.address)}, ),
    assignRole: fun("0x87f39dfc", "assignRole(bytes32,address[])", {"role": p.bytes32, "accounts": p.array(p.address)}, ),
    getRoleAdmin: viewFun("0x248a9ca3", "getRoleAdmin(bytes32)", {"role": p.bytes32}, p.bytes32),
    grantRole: fun("0x2f2ff15d", "grantRole(bytes32,address)", {"role": p.bytes32, "account": p.address}, ),
    hasRole: viewFun("0x91d14854", "hasRole(bytes32,address)", {"role": p.bytes32, "account": p.address}, p.bool),
    initialize: fun("0xc4d66de8", "initialize(address)", {"admin": p.address}, ),
    registerRole: fun("0x15b549bb", "registerRole(bytes32,bytes32)", {"role": p.bytes32, "adminRole": p.bytes32}, ),
    removeCurrency: fun("0xf1ea59df", "removeCurrency(address[])", {"_currencies": p.array(p.address)}, ),
    renounceRole: fun("0x36568abe", "renounceRole(bytes32,address)", {"role": p.bytes32, "account": p.address}, ),
    requestNFTRole: fun("0x7f8e4af8", "requestNFTRole(address,uint256)", {"nftContract": p.address, "tokenId": p.uint256}, ),
    requestUserRoles: fun("0xbaf69352", "requestUserRoles(bytes32[])", {"roles": p.array(p.bytes32)}, ),
    revokeNFTRole: fun("0xb41afbaf", "revokeNFTRole(address[])", {"_nfts": p.array(p.address)}, ),
    'revokeRole(bytes32,address[])': fun("0x1bdc4a12", "revokeRole(bytes32,address[])", {"role": p.bytes32, "accounts": p.array(p.address)}, ),
    'revokeRole(bytes32,address)': fun("0xd547741f", "revokeRole(bytes32,address)", {"role": p.bytes32, "account": p.address}, ),
    supportedCurrencies: viewFun("0xace2bed5", "supportedCurrencies(address)", {"currency": p.address}, p.bool),
}

export class Contract extends ContractBase {

    AUCTION_ROLE() {
        return this.eth_call(functions.AUCTION_ROLE, {})
    }

    MANAGEMENT_ROLE() {
        return this.eth_call(functions.MANAGEMENT_ROLE, {})
    }

    NFT_ROLE() {
        return this.eth_call(functions.NFT_ROLE, {})
    }

    DEFAULT_ADMIN_ROLE() {
        return this.eth_call(functions.DEFAULT_ADMIN_ROLE, {})
    }

    LISTING_ROLE() {
        return this.eth_call(functions.LISTING_ROLE, {})
    }

    OFFER_ROLE() {
        return this.eth_call(functions.OFFER_ROLE, {})
    }

    getRoleAdmin(role: GetRoleAdminParams["role"]) {
        return this.eth_call(functions.getRoleAdmin, {role})
    }

    hasRole(role: HasRoleParams["role"], account: HasRoleParams["account"]) {
        return this.eth_call(functions.hasRole, {role, account})
    }

    supportedCurrencies(currency: SupportedCurrenciesParams["currency"]) {
        return this.eth_call(functions.supportedCurrencies, {currency})
    }
}

/// Event types
export type CurrencyAddedEventArgs = EParams<typeof events.CurrencyAdded>
export type CurrencyRemovedEventArgs = EParams<typeof events.CurrencyRemoved>
export type NFTRoleAssignedEventArgs = EParams<typeof events.NFTRoleAssigned>
export type NFTRoleRequestedEventArgs = EParams<typeof events.NFTRoleRequested>
export type NFTRoleRevokedEventArgs = EParams<typeof events.NFTRoleRevoked>
export type RoleAdminChangedEventArgs = EParams<typeof events.RoleAdminChanged>
export type RoleGrantedEventArgs = EParams<typeof events.RoleGranted>
export type RoleRegisteredEventArgs = EParams<typeof events.RoleRegistered>
export type RoleRequestedEventArgs = EParams<typeof events.RoleRequested>
export type RoleRevokedEventArgs = EParams<typeof events.RoleRevoked>
export type UserRoleAssignedEventArgs = EParams<typeof events.UserRoleAssigned>
export type UserRoleRevokedEventArgs = EParams<typeof events.UserRoleRevoked>

/// Function types
export type AUCTION_ROLEParams = FunctionArguments<typeof functions.AUCTION_ROLE>
export type AUCTION_ROLEReturn = FunctionReturn<typeof functions.AUCTION_ROLE>

export type MANAGEMENT_ROLEParams = FunctionArguments<typeof functions.MANAGEMENT_ROLE>
export type MANAGEMENT_ROLEReturn = FunctionReturn<typeof functions.MANAGEMENT_ROLE>

export type NFT_ROLEParams = FunctionArguments<typeof functions.NFT_ROLE>
export type NFT_ROLEReturn = FunctionReturn<typeof functions.NFT_ROLE>

export type DEFAULT_ADMIN_ROLEParams = FunctionArguments<typeof functions.DEFAULT_ADMIN_ROLE>
export type DEFAULT_ADMIN_ROLEReturn = FunctionReturn<typeof functions.DEFAULT_ADMIN_ROLE>

export type LISTING_ROLEParams = FunctionArguments<typeof functions.LISTING_ROLE>
export type LISTING_ROLEReturn = FunctionReturn<typeof functions.LISTING_ROLE>

export type OFFER_ROLEParams = FunctionArguments<typeof functions.OFFER_ROLE>
export type OFFER_ROLEReturn = FunctionReturn<typeof functions.OFFER_ROLE>

export type AddCurrencyParams = FunctionArguments<typeof functions.addCurrency>
export type AddCurrencyReturn = FunctionReturn<typeof functions.addCurrency>

export type AssignNFTRoleParams = FunctionArguments<typeof functions.assignNFTRole>
export type AssignNFTRoleReturn = FunctionReturn<typeof functions.assignNFTRole>

export type AssignRoleParams = FunctionArguments<typeof functions.assignRole>
export type AssignRoleReturn = FunctionReturn<typeof functions.assignRole>

export type GetRoleAdminParams = FunctionArguments<typeof functions.getRoleAdmin>
export type GetRoleAdminReturn = FunctionReturn<typeof functions.getRoleAdmin>

export type GrantRoleParams = FunctionArguments<typeof functions.grantRole>
export type GrantRoleReturn = FunctionReturn<typeof functions.grantRole>

export type HasRoleParams = FunctionArguments<typeof functions.hasRole>
export type HasRoleReturn = FunctionReturn<typeof functions.hasRole>

export type InitializeParams = FunctionArguments<typeof functions.initialize>
export type InitializeReturn = FunctionReturn<typeof functions.initialize>

export type RegisterRoleParams = FunctionArguments<typeof functions.registerRole>
export type RegisterRoleReturn = FunctionReturn<typeof functions.registerRole>

export type RemoveCurrencyParams = FunctionArguments<typeof functions.removeCurrency>
export type RemoveCurrencyReturn = FunctionReturn<typeof functions.removeCurrency>

export type RenounceRoleParams = FunctionArguments<typeof functions.renounceRole>
export type RenounceRoleReturn = FunctionReturn<typeof functions.renounceRole>

export type RequestNFTRoleParams = FunctionArguments<typeof functions.requestNFTRole>
export type RequestNFTRoleReturn = FunctionReturn<typeof functions.requestNFTRole>

export type RequestUserRolesParams = FunctionArguments<typeof functions.requestUserRoles>
export type RequestUserRolesReturn = FunctionReturn<typeof functions.requestUserRoles>

export type RevokeNFTRoleParams = FunctionArguments<typeof functions.revokeNFTRole>
export type RevokeNFTRoleReturn = FunctionReturn<typeof functions.revokeNFTRole>

export type RevokeRoleParams_0 = FunctionArguments<typeof functions['revokeRole(bytes32,address[])']>
export type RevokeRoleReturn_0 = FunctionReturn<typeof functions['revokeRole(bytes32,address[])']>

export type RevokeRoleParams_1 = FunctionArguments<typeof functions['revokeRole(bytes32,address)']>
export type RevokeRoleReturn_1 = FunctionReturn<typeof functions['revokeRole(bytes32,address)']>

export type SupportedCurrenciesParams = FunctionArguments<typeof functions.supportedCurrencies>
export type SupportedCurrenciesReturn = FunctionReturn<typeof functions.supportedCurrencies>

