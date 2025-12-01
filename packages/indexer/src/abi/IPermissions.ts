import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    CurrencyAdded: event("0xe0390a89516146ccfb796a9fbfc3f7646282194c554d05020484599ee992dd5a", "CurrencyAdded(address)", {"currency": indexed(p.address)}),
    CurrencyRemoved: event("0xa40d69111be14f29022626d38310e47cc2d7f4cb728961509c2f65a4bee08c5b", "CurrencyRemoved(address)", {"currency": indexed(p.address)}),
    NFTRoleAssigned: event("0x59247e5c00fc2d2bdc87ba657d2a0c15c319f48b3f5c3f7f2ade39e55b9ef6c0", "NFTRoleAssigned(address)", {"nft": indexed(p.address)}),
    NFTRoleRequested: event("0xb1e62f2bcfbbe798619fc68bfa6a62c352410fa47f015720db7e03a88d604b5c", "NFTRoleRequested(address,uint256,address)", {"nft": indexed(p.address), "tokenId": p.uint256, "requester": indexed(p.address)}),
    NFTRoleRevoked: event("0x5544471505d081e75487b44bafb95f27cb6656e7497bb70d699a3579232998b8", "NFTRoleRevoked(address)", {"nft": indexed(p.address)}),
    RoleRegistered: event("0xbe731b2171af48a9ac1e334654f853cd6cbbb48547ac0fe6ca5b148f3bd41344", "RoleRegistered(bytes32,bytes32)", {"role": indexed(p.bytes32), "adminRole": indexed(p.bytes32)}),
    RoleRequested: event("0x2c5d566a9ea3fa5f9d93d90fcbfad5dbc454cf7907a3994e129541ceff4f1c22", "RoleRequested(address,bytes32)", {"requester": indexed(p.address), "role": p.bytes32}),
    UserRoleAssigned: event("0x790845889125c8ba498bfb3af67d5114da13db649ccd37a3bc579312b8f2ff4d", "UserRoleAssigned(bytes32,address)", {"role": indexed(p.bytes32), "account": indexed(p.address)}),
    UserRoleRevoked: event("0x1b657c620098024c31a71bd93ec7ab15587b2cb33d293dc18e899b7d6b831227", "UserRoleRevoked(bytes32,address)", {"role": indexed(p.bytes32), "account": indexed(p.address)}),
}

export const functions = {
    addCurrency: fun("0xd13d7197", "addCurrency(address[])", {"_currencies": p.array(p.address)}, ),
    assignNFTRole: fun("0xfe1d7ce1", "assignNFTRole(address[])", {"_nfts": p.array(p.address)}, ),
    assignRole: fun("0x87f39dfc", "assignRole(bytes32,address[])", {"role": p.bytes32, "_accounts": p.array(p.address)}, ),
    hasRole: viewFun("0x91d14854", "hasRole(bytes32,address)", {"role": p.bytes32, "account": p.address}, p.bool),
    removeCurrency: fun("0xf1ea59df", "removeCurrency(address[])", {"_currencies": p.array(p.address)}, ),
    requestNFTRole: fun("0x7f8e4af8", "requestNFTRole(address,uint256)", {"nftContract": p.address, "tokenId": p.uint256}, ),
    requestUserRoles: fun("0xbaf69352", "requestUserRoles(bytes32[])", {"roles": p.array(p.bytes32)}, ),
    revokeNFTRole: fun("0xb41afbaf", "revokeNFTRole(address[])", {"_nfts": p.array(p.address)}, ),
    revokeRole: fun("0x1bdc4a12", "revokeRole(bytes32,address[])", {"role": p.bytes32, "_accounts": p.array(p.address)}, ),
    supportedCurrencies: viewFun("0xace2bed5", "supportedCurrencies(address)", {"currency": p.address}, p.bool),
}

export class Contract extends ContractBase {

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
export type RoleRegisteredEventArgs = EParams<typeof events.RoleRegistered>
export type RoleRequestedEventArgs = EParams<typeof events.RoleRequested>
export type UserRoleAssignedEventArgs = EParams<typeof events.UserRoleAssigned>
export type UserRoleRevokedEventArgs = EParams<typeof events.UserRoleRevoked>

/// Function types
export type AddCurrencyParams = FunctionArguments<typeof functions.addCurrency>
export type AddCurrencyReturn = FunctionReturn<typeof functions.addCurrency>

export type AssignNFTRoleParams = FunctionArguments<typeof functions.assignNFTRole>
export type AssignNFTRoleReturn = FunctionReturn<typeof functions.assignNFTRole>

export type AssignRoleParams = FunctionArguments<typeof functions.assignRole>
export type AssignRoleReturn = FunctionReturn<typeof functions.assignRole>

export type HasRoleParams = FunctionArguments<typeof functions.hasRole>
export type HasRoleReturn = FunctionReturn<typeof functions.hasRole>

export type RemoveCurrencyParams = FunctionArguments<typeof functions.removeCurrency>
export type RemoveCurrencyReturn = FunctionReturn<typeof functions.removeCurrency>

export type RequestNFTRoleParams = FunctionArguments<typeof functions.requestNFTRole>
export type RequestNFTRoleReturn = FunctionReturn<typeof functions.requestNFTRole>

export type RequestUserRolesParams = FunctionArguments<typeof functions.requestUserRoles>
export type RequestUserRolesReturn = FunctionReturn<typeof functions.requestUserRoles>

export type RevokeNFTRoleParams = FunctionArguments<typeof functions.revokeNFTRole>
export type RevokeNFTRoleReturn = FunctionReturn<typeof functions.revokeNFTRole>

export type RevokeRoleParams = FunctionArguments<typeof functions.revokeRole>
export type RevokeRoleReturn = FunctionReturn<typeof functions.revokeRole>

export type SupportedCurrenciesParams = FunctionArguments<typeof functions.supportedCurrencies>
export type SupportedCurrenciesReturn = FunctionReturn<typeof functions.supportedCurrencies>

