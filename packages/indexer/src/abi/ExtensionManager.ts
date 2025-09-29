import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    ExtensionAdded: event("0xbb37a605de78ba6bc667aeaf438d0aae8247e6f48a8fad23730e4fbbb480abf3", "ExtensionAdded(string,address,((string,string,address),(bytes4,string)[]))", {"name": indexed(p.string), "implementation": indexed(p.address), "extension": p.struct({"metadata": p.struct({"name": p.string, "metadataURI": p.string, "implementation": p.address}), "functions": p.array(p.struct({"functionSelector": p.bytes4, "functionSignature": p.string}))})}),
    ExtensionRemoved: event("0x3169a23cec9ad1a25ab59bbe00ecf8973dd840c745775ea8877041ef5ce65bcc", "ExtensionRemoved(string,((string,string,address),(bytes4,string)[]))", {"name": indexed(p.string), "extension": p.struct({"metadata": p.struct({"name": p.string, "metadataURI": p.string, "implementation": p.address}), "functions": p.array(p.struct({"functionSelector": p.bytes4, "functionSignature": p.string}))})}),
    ExtensionReplaced: event("0x5f1ef2b136db521971a88818ce904a8e310082338afdc100212a312706642158", "ExtensionReplaced(string,address,((string,string,address),(bytes4,string)[]))", {"name": indexed(p.string), "implementation": indexed(p.address), "extension": p.struct({"metadata": p.struct({"name": p.string, "metadataURI": p.string, "implementation": p.address}), "functions": p.array(p.struct({"functionSelector": p.bytes4, "functionSignature": p.string}))})}),
    FunctionDisabled: event("0xbb931a9651175c9c82f86afbf6ad37a9141aa8d1d42bf798739be245a12e4e88", "FunctionDisabled(string,bytes4,(string,string,address))", {"name": indexed(p.string), "functionSelector": indexed(p.bytes4), "extMetadata": p.struct({"name": p.string, "metadataURI": p.string, "implementation": p.address})}),
    FunctionEnabled: event("0x681115194e519bda23de4da5218f3bc38f5585eab7c6b7d5fa66caa4602f574d", "FunctionEnabled(string,bytes4,(bytes4,string),(string,string,address))", {"name": indexed(p.string), "functionSelector": indexed(p.bytes4), "extFunction": p.struct({"functionSelector": p.bytes4, "functionSignature": p.string}), "extMetadata": p.struct({"name": p.string, "metadataURI": p.string, "implementation": p.address})}),
    OwnershipTransferred: event("0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0", "OwnershipTransferred(address,address)", {"previousOwner": indexed(p.address), "newOwner": indexed(p.address)}),
}

export const functions = {
    addExtension: fun("0xe05688fe", "addExtension(((string,string,address),(bytes4,string)[]))", {"_extension": p.struct({"metadata": p.struct({"name": p.string, "metadataURI": p.string, "implementation": p.address}), "functions": p.array(p.struct({"functionSelector": p.bytes4, "functionSignature": p.string}))})}, ),
    disableFunctionInExtension: fun("0x512cf914", "disableFunctionInExtension(string,bytes4)", {"_extensionName": p.string, "_functionSelector": p.bytes4}, ),
    enableFunctionInExtension: fun("0x8856a113", "enableFunctionInExtension(string,(bytes4,string))", {"_extensionName": p.string, "_function": p.struct({"functionSelector": p.bytes4, "functionSignature": p.string})}, ),
    extensionNames: viewFun("0x83a91bde", "extensionNames(uint256)", {"_0": p.uint256}, p.string),
    getAllExtensionNames: viewFun("0x23c55785", "getAllExtensionNames()", {}, p.array(p.string)),
    getAllExtensions: viewFun("0x4a00cc48", "getAllExtensions()", {}, p.array(p.struct({"metadata": p.struct({"name": p.string, "metadataURI": p.string, "implementation": p.address}), "functions": p.array(p.struct({"functionSelector": p.bytes4, "functionSignature": p.string}))}))),
    getAllFunctions: viewFun("0xab6418b4", "getAllFunctions()", {}, p.array(p.struct({"functionSelector": p.bytes4, "functionSignature": p.string}))),
    getExtension: viewFun("0xc22707ee", "getExtension(string)", {"_extensionName": p.string}, p.struct({"metadata": p.struct({"name": p.string, "metadataURI": p.string, "implementation": p.address}), "functions": p.array(p.struct({"functionSelector": p.bytes4, "functionSignature": p.string}))})),
    getImplementationForFunction: viewFun("0xce0b6013", "getImplementationForFunction(bytes4)", {"_functionSelector": p.bytes4}, p.address),
    getMetadataForFunction: viewFun("0xa0dbaefd", "getMetadataForFunction(bytes4)", {"_functionSelector": p.bytes4}, p.struct({"name": p.string, "metadataURI": p.string, "implementation": p.address})),
    owner: viewFun("0x8da5cb5b", "owner()", {}, p.address),
    removeExtension: fun("0xee7d2adf", "removeExtension(string)", {"_extensionName": p.string}, ),
    renounceOwnership: fun("0x715018a6", "renounceOwnership()", {}, ),
    replaceExtension: fun("0xc0562f6d", "replaceExtension(((string,string,address),(bytes4,string)[]))", {"_extension": p.struct({"metadata": p.struct({"name": p.string, "metadataURI": p.string, "implementation": p.address}), "functions": p.array(p.struct({"functionSelector": p.bytes4, "functionSignature": p.string}))})}, ),
    transferOwnership: fun("0xf2fde38b", "transferOwnership(address)", {"newOwner": p.address}, ),
}

export class Contract extends ContractBase {

    extensionNames(_0: ExtensionNamesParams["_0"]) {
        return this.eth_call(functions.extensionNames, {_0})
    }

    getAllExtensionNames() {
        return this.eth_call(functions.getAllExtensionNames, {})
    }

    getAllExtensions() {
        return this.eth_call(functions.getAllExtensions, {})
    }

    getAllFunctions() {
        return this.eth_call(functions.getAllFunctions, {})
    }

    getExtension(_extensionName: GetExtensionParams["_extensionName"]) {
        return this.eth_call(functions.getExtension, {_extensionName})
    }

    getImplementationForFunction(_functionSelector: GetImplementationForFunctionParams["_functionSelector"]) {
        return this.eth_call(functions.getImplementationForFunction, {_functionSelector})
    }

    getMetadataForFunction(_functionSelector: GetMetadataForFunctionParams["_functionSelector"]) {
        return this.eth_call(functions.getMetadataForFunction, {_functionSelector})
    }

    owner() {
        return this.eth_call(functions.owner, {})
    }
}

/// Event types
export type ExtensionAddedEventArgs = EParams<typeof events.ExtensionAdded>
export type ExtensionRemovedEventArgs = EParams<typeof events.ExtensionRemoved>
export type ExtensionReplacedEventArgs = EParams<typeof events.ExtensionReplaced>
export type FunctionDisabledEventArgs = EParams<typeof events.FunctionDisabled>
export type FunctionEnabledEventArgs = EParams<typeof events.FunctionEnabled>
export type OwnershipTransferredEventArgs = EParams<typeof events.OwnershipTransferred>

/// Function types
export type AddExtensionParams = FunctionArguments<typeof functions.addExtension>
export type AddExtensionReturn = FunctionReturn<typeof functions.addExtension>

export type DisableFunctionInExtensionParams = FunctionArguments<typeof functions.disableFunctionInExtension>
export type DisableFunctionInExtensionReturn = FunctionReturn<typeof functions.disableFunctionInExtension>

export type EnableFunctionInExtensionParams = FunctionArguments<typeof functions.enableFunctionInExtension>
export type EnableFunctionInExtensionReturn = FunctionReturn<typeof functions.enableFunctionInExtension>

export type ExtensionNamesParams = FunctionArguments<typeof functions.extensionNames>
export type ExtensionNamesReturn = FunctionReturn<typeof functions.extensionNames>

export type GetAllExtensionNamesParams = FunctionArguments<typeof functions.getAllExtensionNames>
export type GetAllExtensionNamesReturn = FunctionReturn<typeof functions.getAllExtensionNames>

export type GetAllExtensionsParams = FunctionArguments<typeof functions.getAllExtensions>
export type GetAllExtensionsReturn = FunctionReturn<typeof functions.getAllExtensions>

export type GetAllFunctionsParams = FunctionArguments<typeof functions.getAllFunctions>
export type GetAllFunctionsReturn = FunctionReturn<typeof functions.getAllFunctions>

export type GetExtensionParams = FunctionArguments<typeof functions.getExtension>
export type GetExtensionReturn = FunctionReturn<typeof functions.getExtension>

export type GetImplementationForFunctionParams = FunctionArguments<typeof functions.getImplementationForFunction>
export type GetImplementationForFunctionReturn = FunctionReturn<typeof functions.getImplementationForFunction>

export type GetMetadataForFunctionParams = FunctionArguments<typeof functions.getMetadataForFunction>
export type GetMetadataForFunctionReturn = FunctionReturn<typeof functions.getMetadataForFunction>

export type OwnerParams = FunctionArguments<typeof functions.owner>
export type OwnerReturn = FunctionReturn<typeof functions.owner>

export type RemoveExtensionParams = FunctionArguments<typeof functions.removeExtension>
export type RemoveExtensionReturn = FunctionReturn<typeof functions.removeExtension>

export type RenounceOwnershipParams = FunctionArguments<typeof functions.renounceOwnership>
export type RenounceOwnershipReturn = FunctionReturn<typeof functions.renounceOwnership>

export type ReplaceExtensionParams = FunctionArguments<typeof functions.replaceExtension>
export type ReplaceExtensionReturn = FunctionReturn<typeof functions.replaceExtension>

export type TransferOwnershipParams = FunctionArguments<typeof functions.transferOwnership>
export type TransferOwnershipReturn = FunctionReturn<typeof functions.transferOwnership>

