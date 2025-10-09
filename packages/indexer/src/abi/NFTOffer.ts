import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    OfferAccepted: event("0x7bd0ddd73195a425576126800ce5139c341ea40544c64c4ff027a57306ffd3a3", "OfferAccepted(uint256,address,address,address,uint256,uint256,address,uint256)", {"offerId": indexed(p.uint256), "offeror": indexed(p.address), "assetOwner": indexed(p.address), "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "totalPrice": p.uint256}),
    OfferCancelled: event("0x1f51377b3e685a0e2419f9bb4ba7c07ec54936353ba3d0fb3c6538dab6766222", "OfferCancelled(uint256,address)", {"offerId": indexed(p.uint256), "offeror": indexed(p.address)}),
    OfferCreated: event("0xdca81464157430ede65dbc88b4aba35f309e8142e6fb6237c1f61e0fd1d32485", "OfferCreated(uint256,address,address,uint256,uint256,address,uint256,uint256)", {"offerId": indexed(p.uint256), "offeror": indexed(p.address), "assetContract": indexed(p.address), "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "totalPrice": p.uint256, "expirationTimestamp": p.uint256}),
    OwnershipTransferred: event("0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0", "OwnershipTransferred(address,address)", {"previousOwner": indexed(p.address), "newOwner": indexed(p.address)}),
}

export const functions = {
    acceptOffer: fun("0xc815729d", "acceptOffer(uint256)", {"offerId": p.uint256}, ),
    cancelOffer: fun("0xef706adf", "cancelOffer(uint256)", {"offerId": p.uint256}, ),
    feePercentage: viewFun("0xa001ecdd", "feePercentage()", {}, p.uint256),
    feeRecipient: viewFun("0x46904840", "feeRecipient()", {}, p.address),
    getAllOffers: viewFun("0xc1edcfbe", "getAllOffers(uint256,uint256)", {"startId": p.uint256, "endId": p.uint256}, p.array(p.struct({"offerId": p.uint256, "offeror": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "totalPrice": p.uint256, "expirationTimestamp": p.uint256, "tokenType": p.uint8, "status": p.uint8}))),
    getAllValidOffer: viewFun("0x9087be71", "getAllValidOffer(uint256,uint256)", {"startId": p.uint256, "endId": p.uint256}, p.array(p.struct({"offerId": p.uint256, "offeror": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "totalPrice": p.uint256, "expirationTimestamp": p.uint256, "tokenType": p.uint8, "status": p.uint8}))),
    getOffer: viewFun("0x4579268a", "getOffer(uint256)", {"offerId": p.uint256}, p.struct({"offerId": p.uint256, "offeror": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "totalPrice": p.uint256, "expirationTimestamp": p.uint256, "tokenType": p.uint8, "status": p.uint8})),
    makeOffer: fun("0x016767fa", "makeOffer((address,uint256,uint256,address,uint256,uint256))", {"params": p.struct({"assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "totalPrice": p.uint256, "expirationTimestamp": p.uint256})}, p.uint256),
    owner: viewFun("0x8da5cb5b", "owner()", {}, p.address),
    permissions: viewFun("0xab8c71c0", "permissions()", {}, p.address),
    renounceOwnership: fun("0x715018a6", "renounceOwnership()", {}, ),
    totalOffers: viewFun("0xa9fd8ed1", "totalOffers()", {}, p.uint256),
    transferOwnership: fun("0xf2fde38b", "transferOwnership(address)", {"newOwner": p.address}, ),
}

export class Contract extends ContractBase {

    feePercentage() {
        return this.eth_call(functions.feePercentage, {})
    }

    feeRecipient() {
        return this.eth_call(functions.feeRecipient, {})
    }

    getAllOffers(startId: GetAllOffersParams["startId"], endId: GetAllOffersParams["endId"]) {
        return this.eth_call(functions.getAllOffers, {startId, endId})
    }

    getAllValidOffer(startId: GetAllValidOfferParams["startId"], endId: GetAllValidOfferParams["endId"]) {
        return this.eth_call(functions.getAllValidOffer, {startId, endId})
    }

    getOffer(offerId: GetOfferParams["offerId"]) {
        return this.eth_call(functions.getOffer, {offerId})
    }

    owner() {
        return this.eth_call(functions.owner, {})
    }

    permissions() {
        return this.eth_call(functions.permissions, {})
    }

    totalOffers() {
        return this.eth_call(functions.totalOffers, {})
    }
}

/// Event types
export type OfferAcceptedEventArgs = EParams<typeof events.OfferAccepted>
export type OfferCancelledEventArgs = EParams<typeof events.OfferCancelled>
export type OfferCreatedEventArgs = EParams<typeof events.OfferCreated>
export type OwnershipTransferredEventArgs = EParams<typeof events.OwnershipTransferred>

/// Function types
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

export type GetAllValidOfferParams = FunctionArguments<typeof functions.getAllValidOffer>
export type GetAllValidOfferReturn = FunctionReturn<typeof functions.getAllValidOffer>

export type GetOfferParams = FunctionArguments<typeof functions.getOffer>
export type GetOfferReturn = FunctionReturn<typeof functions.getOffer>

export type MakeOfferParams = FunctionArguments<typeof functions.makeOffer>
export type MakeOfferReturn = FunctionReturn<typeof functions.makeOffer>

export type OwnerParams = FunctionArguments<typeof functions.owner>
export type OwnerReturn = FunctionReturn<typeof functions.owner>

export type PermissionsParams = FunctionArguments<typeof functions.permissions>
export type PermissionsReturn = FunctionReturn<typeof functions.permissions>

export type RenounceOwnershipParams = FunctionArguments<typeof functions.renounceOwnership>
export type RenounceOwnershipReturn = FunctionReturn<typeof functions.renounceOwnership>

export type TotalOffersParams = FunctionArguments<typeof functions.totalOffers>
export type TotalOffersReturn = FunctionReturn<typeof functions.totalOffers>

export type TransferOwnershipParams = FunctionArguments<typeof functions.transferOwnership>
export type TransferOwnershipReturn = FunctionReturn<typeof functions.transferOwnership>

