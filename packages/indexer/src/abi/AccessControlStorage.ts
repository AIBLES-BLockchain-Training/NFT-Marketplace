import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const functions = {
    ACCESS_CONTROL_STORAGE_POSITION: viewFun("0xf2805b13", "ACCESS_CONTROL_STORAGE_POSITION()", {}, p.bytes32),
}

export class Contract extends ContractBase {

    ACCESS_CONTROL_STORAGE_POSITION() {
        return this.eth_call(functions.ACCESS_CONTROL_STORAGE_POSITION, {})
    }
}

/// Function types
export type ACCESS_CONTROL_STORAGE_POSITIONParams = FunctionArguments<typeof functions.ACCESS_CONTROL_STORAGE_POSITION>
export type ACCESS_CONTROL_STORAGE_POSITIONReturn = FunctionReturn<typeof functions.ACCESS_CONTROL_STORAGE_POSITION>

