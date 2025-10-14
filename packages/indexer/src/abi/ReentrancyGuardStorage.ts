import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const functions = {
    REENTRANCY_GUARD_STORAGE_POSITION: viewFun("0x984b83ff", "REENTRANCY_GUARD_STORAGE_POSITION()", {}, p.bytes32),
}

export class Contract extends ContractBase {

    REENTRANCY_GUARD_STORAGE_POSITION() {
        return this.eth_call(functions.REENTRANCY_GUARD_STORAGE_POSITION, {})
    }
}

/// Function types
export type REENTRANCY_GUARD_STORAGE_POSITIONParams = FunctionArguments<typeof functions.REENTRANCY_GUARD_STORAGE_POSITION>
export type REENTRANCY_GUARD_STORAGE_POSITIONReturn = FunctionReturn<typeof functions.REENTRANCY_GUARD_STORAGE_POSITION>

