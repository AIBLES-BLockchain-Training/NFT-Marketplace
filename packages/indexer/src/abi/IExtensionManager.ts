import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const functions = {
    getExtensionImplementation: viewFun("0xb4d99d2d", "getExtensionImplementation(bytes4)", {"_functionSelector": p.bytes4}, p.address),
}

export class Contract extends ContractBase {

    getExtensionImplementation(_functionSelector: GetExtensionImplementationParams["_functionSelector"]) {
        return this.eth_call(functions.getExtensionImplementation, {_functionSelector})
    }
}

/// Function types
export type GetExtensionImplementationParams = FunctionArguments<typeof functions.getExtensionImplementation>
export type GetExtensionImplementationReturn = FunctionReturn<typeof functions.getExtensionImplementation>

