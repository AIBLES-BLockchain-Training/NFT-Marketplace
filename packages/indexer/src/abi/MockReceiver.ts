import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const functions = {
    buy: fun("0xa6f2ae3a", "buy()", {}, ),
}

export class Contract extends ContractBase {
}

/// Function types
export type BuyParams = FunctionArguments<typeof functions.buy>
export type BuyReturn = FunctionReturn<typeof functions.buy>

