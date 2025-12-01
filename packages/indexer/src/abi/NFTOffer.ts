import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    FeeWithdrawn: event("0x00ed5939179dc194223f0edd1517ecee2210b22da7f82c8e4b1795e93b9f06aa", "FeeWithdrawn(address,address,uint256)", {"admin": indexed(p.address), "currency": indexed(p.address), "amount": p.uint256}),
    OfferAccepted: event("0x7bd0ddd73195a425576126800ce5139c341ea40544c64c4ff027a57306ffd3a3", "OfferAccepted(uint256,address,address,address,uint256,uint256,address,uint256)", {"offerId": indexed(p.uint256), "offeror": indexed(p.address), "assetOwner": indexed(p.address), "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "totalPrice": p.uint256}),
    OfferCancelled: event("0x1f51377b3e685a0e2419f9bb4ba7c07ec54936353ba3d0fb3c6538dab6766222", "OfferCancelled(uint256,address)", {"offerId": indexed(p.uint256), "offeror": indexed(p.address)}),
    OfferCreated: event("0xdca81464157430ede65dbc88b4aba35f309e8142e6fb6237c1f61e0fd1d32485", "OfferCreated(uint256,address,address,uint256,uint256,address,uint256,uint256)", {"offerId": indexed(p.uint256), "offeror": indexed(p.address), "assetContract": indexed(p.address), "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "totalPrice": p.uint256, "expirationTimestamp": p.uint256}),
}

export const functions = {
    OFFER_MANAGEMENT_ROLE: viewFun("0x1ea62026", "OFFER_MANAGEMENT_ROLE()", {}, p.bytes32),
    OFFER_NFT_ROLE: viewFun("0x7ddd9beb", "OFFER_NFT_ROLE()", {}, p.bytes32),
    OFFER_OFFER_ROLE: viewFun("0xa467d44b", "OFFER_OFFER_ROLE()", {}, p.bytes32),
    acceptOffer: fun("0xc815729d", "acceptOffer(uint256)", {"offerId": p.uint256}, ),
    cancelOffer: fun("0xef706adf", "cancelOffer(uint256)", {"offerId": p.uint256}, ),
    feePercentage: viewFun("0xa001ecdd", "feePercentage()", {}, p.uint256),
    feeRecipient: viewFun("0x46904840", "feeRecipient()", {}, p.address),
    getAllOffers: viewFun("0xc1edcfbe", "getAllOffers(uint256,uint256)", {"startId": p.uint256, "endId": p.uint256}, p.array(p.struct({"offerId": p.uint256, "offeror": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "totalPrice": p.uint256, "expirationTimestamp": p.uint256, "tokenType": p.uint8, "status": p.uint8}))),
    getAllValidOffers: viewFun("0x91940b3e", "getAllValidOffers(uint256,uint256)", {"startId": p.uint256, "endId": p.uint256}, p.array(p.struct({"offerId": p.uint256, "offeror": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "totalPrice": p.uint256, "expirationTimestamp": p.uint256, "tokenType": p.uint8, "status": p.uint8}))),
    getOffer: viewFun("0x4579268a", "getOffer(uint256)", {"offerId": p.uint256}, p.struct({"offerId": p.uint256, "offeror": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "totalPrice": p.uint256, "expirationTimestamp": p.uint256, "tokenType": p.uint8, "status": p.uint8})),
    initializeOffer: fun("0x56d331c2", "initializeOffer(address,address,uint256)", {"_permissions": p.address, "_feeRecipient": p.address, "_feePercentage": p.uint256}, ),
    makeOffer: fun("0x016767fa", "makeOffer((address,uint256,uint256,address,uint256,uint256))", {"params": p.struct({"assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "totalPrice": p.uint256, "expirationTimestamp": p.uint256})}, p.uint256),
    offerAccumulatedFees: viewFun("0xc2f1412a", "offerAccumulatedFees(address)", {"currency": p.address}, p.uint256),
    permissions: viewFun("0xab8c71c0", "permissions()", {}, p.address),
    setFeePercentage: fun("0xae06c1b7", "setFeePercentage(uint256)", {"_feePercentage": p.uint256}, ),
    setFeeRecipient: fun("0xe74b981b", "setFeeRecipient(address)", {"_feeRecipient": p.address}, ),
    totalOffers: viewFun("0xa9fd8ed1", "totalOffers()", {}, p.uint256),
    withdrawOfferFees: fun("0xbc9fc552", "withdrawOfferFees(address)", {"currency": p.address}, ),
}

export class Contract extends ContractBase {

    OFFER_MANAGEMENT_ROLE() {
        return this.eth_call(functions.OFFER_MANAGEMENT_ROLE, {})
    }

    OFFER_NFT_ROLE() {
        return this.eth_call(functions.OFFER_NFT_ROLE, {})
    }

    OFFER_OFFER_ROLE() {
        return this.eth_call(functions.OFFER_OFFER_ROLE, {})
    }

    feePercentage() {
        return this.eth_call(functions.feePercentage, {})
    }

    feeRecipient() {
        return this.eth_call(functions.feeRecipient, {})
    }

    getAllOffers(startId: GetAllOffersParams["startId"], endId: GetAllOffersParams["endId"]) {
        return this.eth_call(functions.getAllOffers, {startId, endId})
    }

    getAllValidOffers(startId: GetAllValidOffersParams["startId"], endId: GetAllValidOffersParams["endId"]) {
        return this.eth_call(functions.getAllValidOffers, {startId, endId})
    }

    getOffer(offerId: GetOfferParams["offerId"]) {
        return this.eth_call(functions.getOffer, {offerId})
    }

    offerAccumulatedFees(currency: OfferAccumulatedFeesParams["currency"]) {
        return this.eth_call(functions.offerAccumulatedFees, {currency})
    }

    permissions() {
        return this.eth_call(functions.permissions, {})
    }

    totalOffers() {
        return this.eth_call(functions.totalOffers, {})
    }
}

/// Event types
export type FeeWithdrawnEventArgs = EParams<typeof events.FeeWithdrawn>
export type OfferAcceptedEventArgs = EParams<typeof events.OfferAccepted>
export type OfferCancelledEventArgs = EParams<typeof events.OfferCancelled>
export type OfferCreatedEventArgs = EParams<typeof events.OfferCreated>

/// Function types
export type OFFER_MANAGEMENT_ROLEParams = FunctionArguments<typeof functions.OFFER_MANAGEMENT_ROLE>
export type OFFER_MANAGEMENT_ROLEReturn = FunctionReturn<typeof functions.OFFER_MANAGEMENT_ROLE>

export type OFFER_NFT_ROLEParams = FunctionArguments<typeof functions.OFFER_NFT_ROLE>
export type OFFER_NFT_ROLEReturn = FunctionReturn<typeof functions.OFFER_NFT_ROLE>

export type OFFER_OFFER_ROLEParams = FunctionArguments<typeof functions.OFFER_OFFER_ROLE>
export type OFFER_OFFER_ROLEReturn = FunctionReturn<typeof functions.OFFER_OFFER_ROLE>

export type AcceptOfferParams = FunctionArguments<typeof functions.acceptOffer>
export type AcceptOfferReturn = FunctionReturn<typeof functions.acceptOffer>

export type CancelOfferParams = FunctionArguments<typeof functions.cancelOffer>
export type CancelOfferReturn = FunctionReturn<typeof functions.cancelOffer>

export type FeePercentageParams = FunctionArguments<typeof functions.feePercentage>
export type FeePercentageReturn = FunctionReturn<typeof functions.feePercentage>

export type FeeRecipientParams = FunctionArguments<typeof functions.feeRecipient>
export type FeeRecipientReturn = FunctionReturn<typeof functions.feeRecipient>

export type GetAllOffersParams = FunctionArguments<typeof functions.getAllOffers>
export type GetAllOffersReturn = FunctionReturn<typeof functions.getAllOffers>

export type GetAllValidOffersParams = FunctionArguments<typeof functions.getAllValidOffers>
export type GetAllValidOffersReturn = FunctionReturn<typeof functions.getAllValidOffers>

export type GetOfferParams = FunctionArguments<typeof functions.getOffer>
export type GetOfferReturn = FunctionReturn<typeof functions.getOffer>

export type InitializeOfferParams = FunctionArguments<typeof functions.initializeOffer>
export type InitializeOfferReturn = FunctionReturn<typeof functions.initializeOffer>

export type MakeOfferParams = FunctionArguments<typeof functions.makeOffer>
export type MakeOfferReturn = FunctionReturn<typeof functions.makeOffer>

export type OfferAccumulatedFeesParams = FunctionArguments<typeof functions.offerAccumulatedFees>
export type OfferAccumulatedFeesReturn = FunctionReturn<typeof functions.offerAccumulatedFees>

export type PermissionsParams = FunctionArguments<typeof functions.permissions>
export type PermissionsReturn = FunctionReturn<typeof functions.permissions>

export type SetFeePercentageParams = FunctionArguments<typeof functions.setFeePercentage>
export type SetFeePercentageReturn = FunctionReturn<typeof functions.setFeePercentage>

export type SetFeeRecipientParams = FunctionArguments<typeof functions.setFeeRecipient>
export type SetFeeRecipientReturn = FunctionReturn<typeof functions.setFeeRecipient>

export type TotalOffersParams = FunctionArguments<typeof functions.totalOffers>
export type TotalOffersReturn = FunctionReturn<typeof functions.totalOffers>

export type WithdrawOfferFeesParams = FunctionArguments<typeof functions.withdrawOfferFees>
export type WithdrawOfferFeesReturn = FunctionReturn<typeof functions.withdrawOfferFees>

