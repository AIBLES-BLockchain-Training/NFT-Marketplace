import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const functions = {
    NFT_ROLE: viewFun("0xf684f33c", "NFT_ROLE()", {}, p.bytes32),
    OFFER_ROLE: viewFun("0x2d663f30", "OFFER_ROLE()", {}, p.bytes32),
    hasRole: viewFun("0x91d14854", "hasRole(bytes32,address)", {"role": p.bytes32, "account": p.address}, p.bool),
    supportedCurrencies: viewFun("0xace2bed5", "supportedCurrencies(address)", {"currency": p.address}, p.bool),
}

export class Contract extends ContractBase {

    NFT_ROLE() {
        return this.eth_call(functions.NFT_ROLE, {})
    }

    OFFER_ROLE() {
        return this.eth_call(functions.OFFER_ROLE, {})
    }

    hasRole(role: HasRoleParams["role"], account: HasRoleParams["account"]) {
        return this.eth_call(functions.hasRole, {role, account})
    }

    supportedCurrencies(currency: SupportedCurrenciesParams["currency"]) {
        return this.eth_call(functions.supportedCurrencies, {currency})
    }
}

/// Function types
export type NFT_ROLEParams = FunctionArguments<typeof functions.NFT_ROLE>
export type NFT_ROLEReturn = FunctionReturn<typeof functions.NFT_ROLE>

export type OFFER_ROLEParams = FunctionArguments<typeof functions.OFFER_ROLE>
export type OFFER_ROLEReturn = FunctionReturn<typeof functions.OFFER_ROLE>

export type HasRoleParams = FunctionArguments<typeof functions.hasRole>
export type HasRoleReturn = FunctionReturn<typeof functions.hasRole>

export type SupportedCurrenciesParams = FunctionArguments<typeof functions.supportedCurrencies>
export type SupportedCurrenciesReturn = FunctionReturn<typeof functions.supportedCurrencies>

