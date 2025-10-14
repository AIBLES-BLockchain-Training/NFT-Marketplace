import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    ConfirmTransaction: event("0x5cbe105e36805f7820e291f799d5794ff948af2a5f664e580382defb63390041", "ConfirmTransaction(address,uint256)", {"owner": indexed(p.address), "txIndex": indexed(p.uint256)}),
    Deposit: event("0x90890809c654f11d6e72a28fa60149770a0d11ec6c92319d6ceb2bb0a4ea1a15", "Deposit(address,uint256,uint256)", {"sender": indexed(p.address), "amount": p.uint256, "balance": p.uint256}),
    ExecuteTransaction: event("0x5445f318f4f5fcfb66592e68e0cc5822aa15664039bd5f0ffde24c5a8142b1ac", "ExecuteTransaction(address,uint256)", {"owner": indexed(p.address), "txIndex": indexed(p.uint256)}),
    OwnerAddition: event("0xf39e6e1eb0edcf53c221607b54b00cd28f3196fed0a24994dc308b8f611b682d", "OwnerAddition(address)", {"newOwner": indexed(p.address)}),
    OwnerRemoval: event("0x8001553a916ef2f495d26a907cc54d96ed840d7bda71e73194bf5a9df7a76b90", "OwnerRemoval(address)", {"removedOwner": indexed(p.address)}),
    RequirementChange: event("0xa3f1ee9126a074d9326c682f561767f710e927faa811f7a99829d49dc421797a", "RequirementChange(uint256)", {"newRequirement": p.uint256}),
    RevokeConfirmation: event("0xf0dca620e2e81f7841d07bcc105e1704fb01475b278a9d4c236e1c62945edd55", "RevokeConfirmation(address,uint256)", {"owner": indexed(p.address), "txIndex": indexed(p.uint256)}),
    SubmitTransaction: event("0xd5a05bf70715ad82a09a756320284a1b54c9ff74cd0f8cce6219e79b563fe59d", "SubmitTransaction(address,uint256,address,uint256,bytes)", {"owner": indexed(p.address), "txIndex": indexed(p.uint256), "to": indexed(p.address), "value": p.uint256, "data": p.bytes}),
}

export const functions = {
    addOwner: fun("0x7065cb48", "addOwner(address)", {"_newOwner": p.address}, ),
    changeRequirement: fun("0xba51a6df", "changeRequirement(uint256)", {"_newRequirement": p.uint256}, ),
    confirmTransaction: fun("0xc01a8c84", "confirmTransaction(uint256)", {"_txIndex": p.uint256}, ),
    executeTransaction: fun("0xee22610b", "executeTransaction(uint256)", {"_txIndex": p.uint256}, ),
    getOwners: viewFun("0xa0e67e2b", "getOwners()", {}, p.array(p.address)),
    getTransaction: viewFun("0x33ea3dc8", "getTransaction(uint256)", {"_txIndex": p.uint256}, {"to": p.address, "value": p.uint256, "data": p.bytes, "executed": p.bool, "numConfirmations": p.uint256}),
    getTransactionCount: viewFun("0x2e7700f0", "getTransactionCount()", {}, p.uint256),
    isConfirmed: viewFun("0x80f59a65", "isConfirmed(uint256,address)", {"_0": p.uint256, "_1": p.address}, p.bool),
    isOwner: viewFun("0x2f54bf6e", "isOwner(address)", {"_0": p.address}, p.bool),
    numConfirmationsRequired: viewFun("0xd0549b85", "numConfirmationsRequired()", {}, p.uint256),
    owners: viewFun("0x025e7c27", "owners(uint256)", {"_0": p.uint256}, p.address),
    removeOwner: fun("0x173825d9", "removeOwner(address)", {"_owner": p.address}, ),
    replaceOwner: fun("0xe20056e6", "replaceOwner(address,address)", {"_oldOwner": p.address, "_newOwner": p.address}, ),
    revokeConfirmation: fun("0x20ea8d86", "revokeConfirmation(uint256)", {"_txIndex": p.uint256}, ),
    submitTransaction: fun("0xc6427474", "submitTransaction(address,uint256,bytes)", {"_to": p.address, "_value": p.uint256, "_data": p.bytes}, ),
    transactions: viewFun("0x9ace38c2", "transactions(uint256)", {"_0": p.uint256}, {"to": p.address, "value": p.uint256, "data": p.bytes, "executed": p.bool, "numConfirmations": p.uint256}),
}

export class Contract extends ContractBase {

    getOwners() {
        return this.eth_call(functions.getOwners, {})
    }

    getTransaction(_txIndex: GetTransactionParams["_txIndex"]) {
        return this.eth_call(functions.getTransaction, {_txIndex})
    }

    getTransactionCount() {
        return this.eth_call(functions.getTransactionCount, {})
    }

    isConfirmed(_0: IsConfirmedParams["_0"], _1: IsConfirmedParams["_1"]) {
        return this.eth_call(functions.isConfirmed, {_0, _1})
    }

    isOwner(_0: IsOwnerParams["_0"]) {
        return this.eth_call(functions.isOwner, {_0})
    }

    numConfirmationsRequired() {
        return this.eth_call(functions.numConfirmationsRequired, {})
    }

    owners(_0: OwnersParams["_0"]) {
        return this.eth_call(functions.owners, {_0})
    }

    transactions(_0: TransactionsParams["_0"]) {
        return this.eth_call(functions.transactions, {_0})
    }
}

/// Event types
export type ConfirmTransactionEventArgs = EParams<typeof events.ConfirmTransaction>
export type DepositEventArgs = EParams<typeof events.Deposit>
export type ExecuteTransactionEventArgs = EParams<typeof events.ExecuteTransaction>
export type OwnerAdditionEventArgs = EParams<typeof events.OwnerAddition>
export type OwnerRemovalEventArgs = EParams<typeof events.OwnerRemoval>
export type RequirementChangeEventArgs = EParams<typeof events.RequirementChange>
export type RevokeConfirmationEventArgs = EParams<typeof events.RevokeConfirmation>
export type SubmitTransactionEventArgs = EParams<typeof events.SubmitTransaction>

/// Function types
export type AddOwnerParams = FunctionArguments<typeof functions.addOwner>
export type AddOwnerReturn = FunctionReturn<typeof functions.addOwner>

export type ChangeRequirementParams = FunctionArguments<typeof functions.changeRequirement>
export type ChangeRequirementReturn = FunctionReturn<typeof functions.changeRequirement>

export type ConfirmTransactionParams = FunctionArguments<typeof functions.confirmTransaction>
export type ConfirmTransactionReturn = FunctionReturn<typeof functions.confirmTransaction>

export type ExecuteTransactionParams = FunctionArguments<typeof functions.executeTransaction>
export type ExecuteTransactionReturn = FunctionReturn<typeof functions.executeTransaction>

export type GetOwnersParams = FunctionArguments<typeof functions.getOwners>
export type GetOwnersReturn = FunctionReturn<typeof functions.getOwners>

export type GetTransactionParams = FunctionArguments<typeof functions.getTransaction>
export type GetTransactionReturn = FunctionReturn<typeof functions.getTransaction>

export type GetTransactionCountParams = FunctionArguments<typeof functions.getTransactionCount>
export type GetTransactionCountReturn = FunctionReturn<typeof functions.getTransactionCount>

export type IsConfirmedParams = FunctionArguments<typeof functions.isConfirmed>
export type IsConfirmedReturn = FunctionReturn<typeof functions.isConfirmed>

export type IsOwnerParams = FunctionArguments<typeof functions.isOwner>
export type IsOwnerReturn = FunctionReturn<typeof functions.isOwner>

export type NumConfirmationsRequiredParams = FunctionArguments<typeof functions.numConfirmationsRequired>
export type NumConfirmationsRequiredReturn = FunctionReturn<typeof functions.numConfirmationsRequired>

export type OwnersParams = FunctionArguments<typeof functions.owners>
export type OwnersReturn = FunctionReturn<typeof functions.owners>

export type RemoveOwnerParams = FunctionArguments<typeof functions.removeOwner>
export type RemoveOwnerReturn = FunctionReturn<typeof functions.removeOwner>

export type ReplaceOwnerParams = FunctionArguments<typeof functions.replaceOwner>
export type ReplaceOwnerReturn = FunctionReturn<typeof functions.replaceOwner>

export type RevokeConfirmationParams = FunctionArguments<typeof functions.revokeConfirmation>
export type RevokeConfirmationReturn = FunctionReturn<typeof functions.revokeConfirmation>

export type SubmitTransactionParams = FunctionArguments<typeof functions.submitTransaction>
export type SubmitTransactionReturn = FunctionReturn<typeof functions.submitTransaction>

export type TransactionsParams = FunctionArguments<typeof functions.transactions>
export type TransactionsReturn = FunctionReturn<typeof functions.transactions>

