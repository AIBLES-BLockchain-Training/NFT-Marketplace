import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const functions = {
    getImplementationForFunction: viewFun("0xce0b6013", "getImplementationForFunction(bytes4)", {"_functionSelector": p.bytes4}, p.address),
}

export class Contract extends ContractBase {

    getImplementationForFunction(_functionSelector: GetImplementationForFunctionParams["_functionSelector"]) {
        return this.eth_call(functions.getImplementationForFunction, {_functionSelector})
    }
}

/// Function types
export type GetImplementationForFunctionParams = FunctionArguments<typeof functions.getImplementationForFunction>
export type GetImplementationForFunctionReturn = FunctionReturn<typeof functions.getImplementationForFunction>

