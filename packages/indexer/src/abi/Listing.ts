import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    BuyerApproved: event("0x2567fdbe582648fa6bc26a9f161326680394c1e95fd47ee901548ac8c46a2761", "BuyerApproved(uint256,address,bool)", {"listingId": indexed(p.uint256), "buyer": indexed(p.address), "isApproved": p.bool}),
    CurrencyApproved: event("0xcd55607a6ea1e41df95afc07dd0662b0f7c28ce22df721e6fd40ca18ceee95d6", "CurrencyApproved(uint256,address,uint256)", {"listingId": indexed(p.uint256), "currency": indexed(p.address), "price": p.uint256}),
    CurrencyFeeUpdated: event("0xa04b41580e473d95212f4fe0c4034fdbfbac74e0b462bd358fc857152d1406c8", "CurrencyFeeUpdated(address,uint256)", {"currency": indexed(p.address), "fee": p.uint256}),
    FeeReceiverUpdated: event("0xa92ff4390fe6943f0b30e8fe715dde86f85ab79b2b2c640a10fc094cc4036cc8", "FeeReceiverUpdated(address,address)", {"oldReceiver": indexed(p.address), "newReceiver": indexed(p.address)}),
    FeeWithdrawn: event("0x00ed5939179dc194223f0edd1517ecee2210b22da7f82c8e4b1795e93b9f06aa", "FeeWithdrawn(address,address,uint256)", {"receiver": indexed(p.address), "currency": indexed(p.address), "amount": p.uint256}),
    ListingCancelled: event("0x411aee90354c51b1b04cd563fcab2617142a9d50da19232d888547c8a1b7fd8a", "ListingCancelled(uint256)", {"listingId": indexed(p.uint256)}),
    ListingCompleted: event("0x19c81e6a2e218c59063172f10c45d68ea6c85114dcad15bfa654ee78ff39a157", "ListingCompleted(uint256)", {"listingId": indexed(p.uint256)}),
    ListingCreated: event("0x3473b39386e15920e3f2d54d66242ec5d00c21b63db4729298ac2c174321f4f6", "ListingCreated(uint256,address,address,uint256,uint256,address,uint256,uint256,uint256,bool)", {"listingId": indexed(p.uint256), "owner": indexed(p.address), "assetContract": indexed(p.address), "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "pricePerToken": p.uint256, "startTimestamp": p.uint256, "endTimestamp": p.uint256, "reserved": p.bool}),
    ListingUpdated: event("0x5b909691e9190dbfec5a2dacdcc228fc75b4d5a15f5354a5205400272854c047", "ListingUpdated(uint256,address,uint256,uint256,address,uint256,uint256,uint256,bool)", {"listingId": indexed(p.uint256), "assetContract": indexed(p.address), "tokenId": indexed(p.uint256), "quantity": p.uint256, "currency": p.address, "pricePerToken": p.uint256, "startTimestamp": p.uint256, "endTimestamp": p.uint256, "reserved": p.bool}),
    NFTPurchased: event("0xe65053baf2552c73f4daf8c2256e85bee60d26e07421e21b4391ef6b0c63da78", "NFTPurchased(uint256,address,uint256,uint256)", {"listingId": indexed(p.uint256), "buyer": indexed(p.address), "quantity": p.uint256, "totalPrice": p.uint256}),
    PermissionContractUpdated: event("0x07a8049becf9ad296091dbce9d13ede0ff5165990f380ffe4a72c152b6abaf20", "PermissionContractUpdated(address,address)", {"oldPermission": indexed(p.address), "newPermission": indexed(p.address)}),
}

export const functions = {
    LISTING_ROLE: viewFun("0x96f88ae4", "LISTING_ROLE()", {}, p.bytes32),
    MANAGEMENT_ROLE: viewFun("0xc045934e", "MANAGEMENT_ROLE()", {}, p.bytes32),
    NFT_ROLE: viewFun("0x0c84d795", "NFT_ROLE()", {}, p.bytes32),
    approveBuyerForListing: fun("0x48dd77df", "approveBuyerForListing(uint256,address,bool)", {"listingId": p.uint256, "buyer": p.address, "toApprove": p.bool}, ),
    approveCurrencyForListing: fun("0xea8f9a3c", "approveCurrencyForListing(uint256,address,uint256)", {"listingId": p.uint256, "currency": p.address, "pricePerTokenInCurrency": p.uint256}, ),
    buyFromListing: fun("0x704232dc", "buyFromListing(uint256,address,uint256,address,uint256)", {"listingId": p.uint256, "buyFor": p.address, "quantity": p.uint256, "currency": p.address, "expectedTotalPrice": p.uint256}, ),
    buyerApprovals: viewFun("0x6ce1432a", "buyerApprovals(uint256,address)", {"listingId": p.uint256, "buyer": p.address}, p.bool),
    cancelListing: fun("0x305a67a8", "cancelListing(uint256)", {"listingId": p.uint256}, ),
    createListing: fun("0x746415b5", "createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))", {"params": p.struct({"assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "pricePerToken": p.uint256, "startTimestamp": p.uint128, "endTimestamp": p.uint128, "reserved": p.bool})}, p.uint256),
    currencyApprovals: viewFun("0xe4801a2d", "currencyApprovals(uint256,address)", {"listingId": p.uint256, "currency": p.address}, p.uint256),
    currencyFees: viewFun("0xb79bc82b", "currencyFees(address)", {"currency": p.address}, p.uint256),
    decimalListing: viewFun("0x50d549af", "decimalListing()", {}, p.uint256),
    feeReceiver: viewFun("0xb3f00674", "feeReceiver()", {}, p.address),
    getAllListings: viewFun("0xc5275fb0", "getAllListings(uint256,uint256)", {"startId": p.uint256, "endId": p.uint256}, p.array(p.struct({"owner": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "pricePerToken": p.uint256, "startTimestamp": p.uint128, "endTimestamp": p.uint128, "reserved": p.bool, "tokenType": p.uint8, "status": p.uint8}))),
    getAllValidListings: viewFun("0x31654b4d", "getAllValidListings(uint256,uint256)", {"startId": p.uint256, "endId": p.uint256}, p.array(p.struct({"owner": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "pricePerToken": p.uint256, "startTimestamp": p.uint128, "endTimestamp": p.uint128, "reserved": p.bool, "tokenType": p.uint8, "status": p.uint8}))),
    getCurrencyFee: viewFun("0x752d8a09", "getCurrencyFee(address)", {"currency": p.address}, p.uint256),
    getListing: viewFun("0x107a274a", "getListing(uint256)", {"listingId": p.uint256}, p.struct({"owner": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "pricePerToken": p.uint256, "startTimestamp": p.uint128, "endTimestamp": p.uint128, "reserved": p.bool, "tokenType": p.uint8, "status": p.uint8})),
    getTokenType: viewFun("0x93272baf", "getTokenType(address)", {"assetContract": p.address}, p.uint8),
    hasListingPermission: viewFun("0x07e45ca1", "hasListingPermission(address)", {"user": p.address}, p.bool),
    initializeListing: fun("0x6cf8745d", "initializeListing(address,address)", {"_permissionContract": p.address, "_feeReceiver": p.address}, ),
    isCurrencySupported: viewFun("0x70dfaeca", "isCurrencySupported(address)", {"currency": p.address}, p.bool),
    isNFTWhitelisted: viewFun("0xaf36199b", "isNFTWhitelisted(address)", {"nftContract": p.address}, p.bool),
    listingAccumulatedFees: viewFun("0x38ca5838", "listingAccumulatedFees(address)", {"currency": p.address}, p.uint256),
    listingCounter: viewFun("0x6c2c9c7d", "listingCounter()", {}, p.uint256),
    listings: viewFun("0xde74e57b", "listings(uint256)", {"listingId": p.uint256}, p.struct({"owner": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "pricePerToken": p.uint256, "startTimestamp": p.uint128, "endTimestamp": p.uint128, "reserved": p.bool, "tokenType": p.uint8, "status": p.uint8})),
    permissionContract: viewFun("0xd53cb718", "permissionContract()", {}, p.address),
    setCurrencyFee: fun("0x51d5f97c", "setCurrencyFee(address,uint256)", {"currency": p.address, "fee": p.uint256}, ),
    setFeeReceiver: fun("0xefdcd974", "setFeeReceiver(address)", {"_feeReceiver": p.address}, ),
    setPermissionContract: fun("0x2275b838", "setPermissionContract(address)", {"_permissionContract": p.address}, ),
    totalListings: viewFun("0xc78b616c", "totalListings()", {}, p.uint256),
    updateListing: fun("0x07b67758", "updateListing(uint256,(address,uint256,uint256,address,uint256,uint128,uint128,bool))", {"listingId": p.uint256, "params": p.struct({"assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "pricePerToken": p.uint256, "startTimestamp": p.uint128, "endTimestamp": p.uint128, "reserved": p.bool})}, ),
    userOwnedListings: viewFun("0xbfc5ca2b", "userOwnedListings(address)", {"user": p.address}, p.array(p.uint256)),
    withdrawListingFees: fun("0x779450ba", "withdrawListingFees(address)", {"currency": p.address}, ),
}

export class Contract extends ContractBase {

    LISTING_ROLE() {
        return this.eth_call(functions.LISTING_ROLE, {})
    }

    MANAGEMENT_ROLE() {
        return this.eth_call(functions.MANAGEMENT_ROLE, {})
    }

    NFT_ROLE() {
        return this.eth_call(functions.NFT_ROLE, {})
    }

    buyerApprovals(listingId: BuyerApprovalsParams["listingId"], buyer: BuyerApprovalsParams["buyer"]) {
        return this.eth_call(functions.buyerApprovals, {listingId, buyer})
    }

    currencyApprovals(listingId: CurrencyApprovalsParams["listingId"], currency: CurrencyApprovalsParams["currency"]) {
        return this.eth_call(functions.currencyApprovals, {listingId, currency})
    }

    currencyFees(currency: CurrencyFeesParams["currency"]) {
        return this.eth_call(functions.currencyFees, {currency})
    }

    decimalListing() {
        return this.eth_call(functions.decimalListing, {})
    }

    feeReceiver() {
        return this.eth_call(functions.feeReceiver, {})
    }

    getAllListings(startId: GetAllListingsParams["startId"], endId: GetAllListingsParams["endId"]) {
        return this.eth_call(functions.getAllListings, {startId, endId})
    }

    getAllValidListings(startId: GetAllValidListingsParams["startId"], endId: GetAllValidListingsParams["endId"]) {
        return this.eth_call(functions.getAllValidListings, {startId, endId})
    }

    getCurrencyFee(currency: GetCurrencyFeeParams["currency"]) {
        return this.eth_call(functions.getCurrencyFee, {currency})
    }

    getListing(listingId: GetListingParams["listingId"]) {
        return this.eth_call(functions.getListing, {listingId})
    }

    getTokenType(assetContract: GetTokenTypeParams["assetContract"]) {
        return this.eth_call(functions.getTokenType, {assetContract})
    }

    hasListingPermission(user: HasListingPermissionParams["user"]) {
        return this.eth_call(functions.hasListingPermission, {user})
    }

    isCurrencySupported(currency: IsCurrencySupportedParams["currency"]) {
        return this.eth_call(functions.isCurrencySupported, {currency})
    }

    isNFTWhitelisted(nftContract: IsNFTWhitelistedParams["nftContract"]) {
        return this.eth_call(functions.isNFTWhitelisted, {nftContract})
    }

    listingAccumulatedFees(currency: ListingAccumulatedFeesParams["currency"]) {
        return this.eth_call(functions.listingAccumulatedFees, {currency})
    }

    listingCounter() {
        return this.eth_call(functions.listingCounter, {})
    }

    listings(listingId: ListingsParams["listingId"]) {
        return this.eth_call(functions.listings, {listingId})
    }

    permissionContract() {
        return this.eth_call(functions.permissionContract, {})
    }

    totalListings() {
        return this.eth_call(functions.totalListings, {})
    }

    userOwnedListings(user: UserOwnedListingsParams["user"]) {
        return this.eth_call(functions.userOwnedListings, {user})
    }
}

/// Event types
export type BuyerApprovedEventArgs = EParams<typeof events.BuyerApproved>
export type CurrencyApprovedEventArgs = EParams<typeof events.CurrencyApproved>
export type CurrencyFeeUpdatedEventArgs = EParams<typeof events.CurrencyFeeUpdated>
export type FeeReceiverUpdatedEventArgs = EParams<typeof events.FeeReceiverUpdated>
export type FeeWithdrawnEventArgs = EParams<typeof events.FeeWithdrawn>
export type ListingCancelledEventArgs = EParams<typeof events.ListingCancelled>
export type ListingCompletedEventArgs = EParams<typeof events.ListingCompleted>
export type ListingCreatedEventArgs = EParams<typeof events.ListingCreated>
export type ListingUpdatedEventArgs = EParams<typeof events.ListingUpdated>
export type NFTPurchasedEventArgs = EParams<typeof events.NFTPurchased>
export type PermissionContractUpdatedEventArgs = EParams<typeof events.PermissionContractUpdated>

/// Function types
export type LISTING_ROLEParams = FunctionArguments<typeof functions.LISTING_ROLE>
export type LISTING_ROLEReturn = FunctionReturn<typeof functions.LISTING_ROLE>

export type MANAGEMENT_ROLEParams = FunctionArguments<typeof functions.MANAGEMENT_ROLE>
export type MANAGEMENT_ROLEReturn = FunctionReturn<typeof functions.MANAGEMENT_ROLE>

export type NFT_ROLEParams = FunctionArguments<typeof functions.NFT_ROLE>
export type NFT_ROLEReturn = FunctionReturn<typeof functions.NFT_ROLE>

export type ApproveBuyerForListingParams = FunctionArguments<typeof functions.approveBuyerForListing>
export type ApproveBuyerForListingReturn = FunctionReturn<typeof functions.approveBuyerForListing>

export type ApproveCurrencyForListingParams = FunctionArguments<typeof functions.approveCurrencyForListing>
export type ApproveCurrencyForListingReturn = FunctionReturn<typeof functions.approveCurrencyForListing>

export type BuyFromListingParams = FunctionArguments<typeof functions.buyFromListing>
export type BuyFromListingReturn = FunctionReturn<typeof functions.buyFromListing>

export type BuyerApprovalsParams = FunctionArguments<typeof functions.buyerApprovals>
export type BuyerApprovalsReturn = FunctionReturn<typeof functions.buyerApprovals>

export type CancelListingParams = FunctionArguments<typeof functions.cancelListing>
export type CancelListingReturn = FunctionReturn<typeof functions.cancelListing>

export type CreateListingParams = FunctionArguments<typeof functions.createListing>
export type CreateListingReturn = FunctionReturn<typeof functions.createListing>

export type CurrencyApprovalsParams = FunctionArguments<typeof functions.currencyApprovals>
export type CurrencyApprovalsReturn = FunctionReturn<typeof functions.currencyApprovals>

export type CurrencyFeesParams = FunctionArguments<typeof functions.currencyFees>
export type CurrencyFeesReturn = FunctionReturn<typeof functions.currencyFees>

export type DecimalListingParams = FunctionArguments<typeof functions.decimalListing>
export type DecimalListingReturn = FunctionReturn<typeof functions.decimalListing>

export type FeeReceiverParams = FunctionArguments<typeof functions.feeReceiver>
export type FeeReceiverReturn = FunctionReturn<typeof functions.feeReceiver>

export type GetAllListingsParams = FunctionArguments<typeof functions.getAllListings>
export type GetAllListingsReturn = FunctionReturn<typeof functions.getAllListings>

export type GetAllValidListingsParams = FunctionArguments<typeof functions.getAllValidListings>
export type GetAllValidListingsReturn = FunctionReturn<typeof functions.getAllValidListings>

export type GetCurrencyFeeParams = FunctionArguments<typeof functions.getCurrencyFee>
export type GetCurrencyFeeReturn = FunctionReturn<typeof functions.getCurrencyFee>

export type GetListingParams = FunctionArguments<typeof functions.getListing>
export type GetListingReturn = FunctionReturn<typeof functions.getListing>

export type GetTokenTypeParams = FunctionArguments<typeof functions.getTokenType>
export type GetTokenTypeReturn = FunctionReturn<typeof functions.getTokenType>

export type HasListingPermissionParams = FunctionArguments<typeof functions.hasListingPermission>
export type HasListingPermissionReturn = FunctionReturn<typeof functions.hasListingPermission>

export type InitializeListingParams = FunctionArguments<typeof functions.initializeListing>
export type InitializeListingReturn = FunctionReturn<typeof functions.initializeListing>

export type IsCurrencySupportedParams = FunctionArguments<typeof functions.isCurrencySupported>
export type IsCurrencySupportedReturn = FunctionReturn<typeof functions.isCurrencySupported>

export type IsNFTWhitelistedParams = FunctionArguments<typeof functions.isNFTWhitelisted>
export type IsNFTWhitelistedReturn = FunctionReturn<typeof functions.isNFTWhitelisted>

export type ListingAccumulatedFeesParams = FunctionArguments<typeof functions.listingAccumulatedFees>
export type ListingAccumulatedFeesReturn = FunctionReturn<typeof functions.listingAccumulatedFees>

export type ListingCounterParams = FunctionArguments<typeof functions.listingCounter>
export type ListingCounterReturn = FunctionReturn<typeof functions.listingCounter>

export type ListingsParams = FunctionArguments<typeof functions.listings>
export type ListingsReturn = FunctionReturn<typeof functions.listings>

export type PermissionContractParams = FunctionArguments<typeof functions.permissionContract>
export type PermissionContractReturn = FunctionReturn<typeof functions.permissionContract>

export type SetCurrencyFeeParams = FunctionArguments<typeof functions.setCurrencyFee>
export type SetCurrencyFeeReturn = FunctionReturn<typeof functions.setCurrencyFee>

export type SetFeeReceiverParams = FunctionArguments<typeof functions.setFeeReceiver>
export type SetFeeReceiverReturn = FunctionReturn<typeof functions.setFeeReceiver>

export type SetPermissionContractParams = FunctionArguments<typeof functions.setPermissionContract>
export type SetPermissionContractReturn = FunctionReturn<typeof functions.setPermissionContract>

export type TotalListingsParams = FunctionArguments<typeof functions.totalListings>
export type TotalListingsReturn = FunctionReturn<typeof functions.totalListings>

export type UpdateListingParams = FunctionArguments<typeof functions.updateListing>
export type UpdateListingReturn = FunctionReturn<typeof functions.updateListing>

export type UserOwnedListingsParams = FunctionArguments<typeof functions.userOwnedListings>
export type UserOwnedListingsReturn = FunctionReturn<typeof functions.userOwnedListings>

export type WithdrawListingFeesParams = FunctionArguments<typeof functions.withdrawListingFees>
export type WithdrawListingFeesReturn = FunctionReturn<typeof functions.withdrawListingFees>

