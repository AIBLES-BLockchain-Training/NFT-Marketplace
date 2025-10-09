import * as p from '@subsquid/evm-codec'
import { event, fun, viewFun, indexed, ContractBase } from '@subsquid/evm-abi'
import type { EventParams as EParams, FunctionArguments, FunctionReturn } from '@subsquid/evm-abi'

export const events = {
    AuctionBidPlaced: event("0x8cb9a5059c7ef5de4bab6a5d6b8d370b0cb2265ab475501d8fbd9749879a8608", "AuctionBidPlaced(uint256,address,uint256,address)", {"auctionId": indexed(p.uint256), "bidder": indexed(p.address), "bidAmount": p.uint256, "currency": p.address}),
    AuctionCancelled: event("0x10ac9f0bb365b5d22d7bec500408692f23fdf83eadfec71615ef88b4c1134f0e", "AuctionCancelled(uint256,address)", {"auctionId": indexed(p.uint256), "seller": indexed(p.address)}),
    AuctionCreated: event("0xe65d666b934fa6a599a38cb331d43bea98c313296c5b786f21e11c23938658fe", "AuctionCreated(uint256,address,address,uint256,uint256,address,uint256,uint256,uint256,uint256,uint256,uint256,uint8)", {"auctionId": indexed(p.uint256), "seller": indexed(p.address), "assetContract": indexed(p.address), "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "startPrice": p.uint256, "ceilingPrice": p.uint256, "startTime": p.uint256, "endTime": p.uint256, "timeBufferInSeconds": p.uint256, "stepAmount": p.uint256, "tokenType": p.uint8}),
    AuctionFinalized: event("0x81bd28ae84f5a9d2a1eff49e950eba8746e0f1681c140b90c6c0f569996ac0c3", "AuctionFinalized(uint256,address,uint256,address)", {"auctionId": indexed(p.uint256), "winner": indexed(p.address), "winningBid": p.uint256, "currency": p.address}),
    AuctionPayoutCollected: event("0xab2d11a4cba899440e689b797feb807ed64a0e6a275253a20549e47958ccc9b6", "AuctionPayoutCollected(uint256,address,uint256)", {"auctionId": indexed(p.uint256), "seller": indexed(p.address), "amount": p.uint256}),
    AuctionTokenCollected: event("0xc09791e926fed93c83ece90e9339e29eac0a7446063dfa0b4531928b3e147695", "AuctionTokenCollected(uint256,address,uint256)", {"auctionId": indexed(p.uint256), "winner": indexed(p.address), "tokenId": p.uint256}),
    NFTReceived: event("0x1d823cdc8f0514a95b53538df2d2f3deaf98d1c534c6e750daa593173c27f8f0", "NFTReceived(address,address,uint256,bytes)", {"operator": p.address, "from": p.address, "tokenId": p.uint256, "data": p.bytes}),
    UpdatePermissionsContract: event("0x8accae49e7f28887d579627d809fdc995fe8c2b9cc71b7249d2b367fd5538c58", "UpdatePermissionsContract(address,address)", {"oldPermissionsContract": p.address, "newPermissionsContract": p.address}),
}

export const functions = {
    AUCTION_ROLE: viewFun("0x430730a3", "AUCTION_ROLE()", {}, p.bytes32),
    MANAGEMENT_ROLE: viewFun("0xcda5f89f", "MANAGEMENT_ROLE()", {}, p.bytes32),
    MIN_TIME_AUCTION: viewFun("0xc078d359", "MIN_TIME_AUCTION()", {}, p.uint256),
    NFT_ROLE: viewFun("0xf684f33c", "NFT_ROLE()", {}, p.bytes32),
    auctions: viewFun("0x571a26a0", "auctions(uint256)", {"_auctionId": p.uint256}, p.struct({"id": p.uint256, "auctionCreator": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "startPrice": p.uint256, "ceilingPrice": p.uint256, "startTime": p.uint256, "endTime": p.uint256, "timeBufferInSeconds": p.uint256, "highestBidder": p.address, "highestBid": p.uint256, "stepAmount": p.uint256, "isPayoutCollected": p.bool, "isTokenCollected": p.bool, "status": p.uint8, "tokenType": p.uint8})),
    bidInAuction: fun("0x0858e5ad", "bidInAuction(uint256,uint256)", {"_auctionId": p.uint256, "_bidAmount": p.uint256}, ),
    cancelAuction: fun("0x96b5a755", "cancelAuction(uint256)", {"_auctionId": p.uint256}, ),
    collectAuctionPayout: fun("0xebf05a62", "collectAuctionPayout(uint256)", {"_auctionId": p.uint256}, ),
    collectAuctionToken: fun("0x12090b22", "collectAuctionToken(uint256)", {"_auctionId": p.uint256}, ),
    createAuction: fun("0x172e9f7b", "createAuction((address,uint256,uint256,address,uint256,uint256,uint256,uint256,uint256,uint256))", {"_auctionParams": p.struct({"_assetContract": p.address, "_tokenId": p.uint256, "_quantity": p.uint256, "_currency": p.address, "_startPrice": p.uint256, "_ceilingPrice": p.uint256, "_stepAmount": p.uint256, "_timeBufferInSeconds": p.uint256, "_startTime": p.uint256, "_endTime": p.uint256})}, ),
    getAllAuctions: viewFun("0xc291537c", "getAllAuctions(uint256,uint256)", {"_startId": p.uint256, "_endId": p.uint256}, p.array(p.struct({"id": p.uint256, "auctionCreator": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "startPrice": p.uint256, "ceilingPrice": p.uint256, "startTime": p.uint256, "endTime": p.uint256, "timeBufferInSeconds": p.uint256, "highestBidder": p.address, "highestBid": p.uint256, "stepAmount": p.uint256, "isPayoutCollected": p.bool, "isTokenCollected": p.bool, "status": p.uint8, "tokenType": p.uint8}))),
    getAllValidAuctions: viewFun("0x7b063801", "getAllValidAuctions(uint256,uint256)", {"_startId": p.uint256, "_endId": p.uint256}, p.array(p.struct({"id": p.uint256, "auctionCreator": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "startPrice": p.uint256, "ceilingPrice": p.uint256, "startTime": p.uint256, "endTime": p.uint256, "timeBufferInSeconds": p.uint256, "highestBidder": p.address, "highestBid": p.uint256, "stepAmount": p.uint256, "isPayoutCollected": p.bool, "isTokenCollected": p.bool, "status": p.uint8, "tokenType": p.uint8}))),
    getAuction: viewFun("0x78bd7935", "getAuction(uint256)", {"_auctionId": p.uint256}, p.struct({"id": p.uint256, "auctionCreator": p.address, "assetContract": p.address, "tokenId": p.uint256, "quantity": p.uint256, "currency": p.address, "startPrice": p.uint256, "ceilingPrice": p.uint256, "startTime": p.uint256, "endTime": p.uint256, "timeBufferInSeconds": p.uint256, "highestBidder": p.address, "highestBid": p.uint256, "stepAmount": p.uint256, "isPayoutCollected": p.bool, "isTokenCollected": p.bool, "status": p.uint8, "tokenType": p.uint8})),
    getNewWinningBid: viewFun("0x62349d13", "getNewWinningBid(uint256)", {"_auctionId": p.uint256}, {"_0": p.address, "_1": p.uint256}),
    initializeAuction: fun("0x51a345a7", "initializeAuction(address)", {"_permissionsContract": p.address}, ),
    isAuctionExpired: viewFun("0x1389b117", "isAuctionExpired(uint256)", {"_auctionId": p.uint256}, p.bool),
    isNewWinningBid: viewFun("0x2eb566bd", "isNewWinningBid(uint256,uint256)", {"_auctionId": p.uint256, "_bidAmount": p.uint256}, p.bool),
    onERC1155BatchReceived: fun("0xbc197c81", "onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)", {"_0": p.address, "_1": p.address, "_2": p.array(p.uint256), "_3": p.array(p.uint256), "_4": p.bytes}, p.bytes4),
    onERC1155Received: fun("0xf23a6e61", "onERC1155Received(address,address,uint256,uint256,bytes)", {"_0": p.address, "_1": p.address, "_2": p.uint256, "_3": p.uint256, "_4": p.bytes}, p.bytes4),
    onERC721Received: fun("0x150b7a02", "onERC721Received(address,address,uint256,bytes)", {"operator": p.address, "from": p.address, "tokenId": p.uint256, "data": p.bytes}, p.bytes4),
    setPermissionsContract: fun("0xd183ce74", "setPermissionsContract(address)", {"_permissionsContract": p.address}, ),
    supportsInterface: viewFun("0x01ffc9a7", "supportsInterface(bytes4)", {"interfaceId": p.bytes4}, p.bool),
    totalAuctions: viewFun("0x16002f4a", "totalAuctions()", {}, p.uint256),
}

export class Contract extends ContractBase {

    AUCTION_ROLE() {
        return this.eth_call(functions.AUCTION_ROLE, {})
    }

    MANAGEMENT_ROLE() {
        return this.eth_call(functions.MANAGEMENT_ROLE, {})
    }

    MIN_TIME_AUCTION() {
        return this.eth_call(functions.MIN_TIME_AUCTION, {})
    }

    NFT_ROLE() {
        return this.eth_call(functions.NFT_ROLE, {})
    }

    auctions(_auctionId: AuctionsParams["_auctionId"]) {
        return this.eth_call(functions.auctions, {_auctionId})
    }

    getAllAuctions(_startId: GetAllAuctionsParams["_startId"], _endId: GetAllAuctionsParams["_endId"]) {
        return this.eth_call(functions.getAllAuctions, {_startId, _endId})
    }

    getAllValidAuctions(_startId: GetAllValidAuctionsParams["_startId"], _endId: GetAllValidAuctionsParams["_endId"]) {
        return this.eth_call(functions.getAllValidAuctions, {_startId, _endId})
    }

    getAuction(_auctionId: GetAuctionParams["_auctionId"]) {
        return this.eth_call(functions.getAuction, {_auctionId})
    }

    getNewWinningBid(_auctionId: GetNewWinningBidParams["_auctionId"]) {
        return this.eth_call(functions.getNewWinningBid, {_auctionId})
    }

    isAuctionExpired(_auctionId: IsAuctionExpiredParams["_auctionId"]) {
        return this.eth_call(functions.isAuctionExpired, {_auctionId})
    }

    isNewWinningBid(_auctionId: IsNewWinningBidParams["_auctionId"], _bidAmount: IsNewWinningBidParams["_bidAmount"]) {
        return this.eth_call(functions.isNewWinningBid, {_auctionId, _bidAmount})
    }

    supportsInterface(interfaceId: SupportsInterfaceParams["interfaceId"]) {
        return this.eth_call(functions.supportsInterface, {interfaceId})
    }

    totalAuctions() {
        return this.eth_call(functions.totalAuctions, {})
    }
}

/// Event types
export type AuctionBidPlacedEventArgs = EParams<typeof events.AuctionBidPlaced>
export type AuctionCancelledEventArgs = EParams<typeof events.AuctionCancelled>
export type AuctionCreatedEventArgs = EParams<typeof events.AuctionCreated>
export type AuctionFinalizedEventArgs = EParams<typeof events.AuctionFinalized>
export type AuctionPayoutCollectedEventArgs = EParams<typeof events.AuctionPayoutCollected>
export type AuctionTokenCollectedEventArgs = EParams<typeof events.AuctionTokenCollected>
export type NFTReceivedEventArgs = EParams<typeof events.NFTReceived>
export type UpdatePermissionsContractEventArgs = EParams<typeof events.UpdatePermissionsContract>

/// Function types
export type AUCTION_ROLEParams = FunctionArguments<typeof functions.AUCTION_ROLE>
export type AUCTION_ROLEReturn = FunctionReturn<typeof functions.AUCTION_ROLE>

export type MANAGEMENT_ROLEParams = FunctionArguments<typeof functions.MANAGEMENT_ROLE>
export type MANAGEMENT_ROLEReturn = FunctionReturn<typeof functions.MANAGEMENT_ROLE>

export type MIN_TIME_AUCTIONParams = FunctionArguments<typeof functions.MIN_TIME_AUCTION>
export type MIN_TIME_AUCTIONReturn = FunctionReturn<typeof functions.MIN_TIME_AUCTION>

export type NFT_ROLEParams = FunctionArguments<typeof functions.NFT_ROLE>
export type NFT_ROLEReturn = FunctionReturn<typeof functions.NFT_ROLE>

export type AuctionsParams = FunctionArguments<typeof functions.auctions>
export type AuctionsReturn = FunctionReturn<typeof functions.auctions>

export type BidInAuctionParams = FunctionArguments<typeof functions.bidInAuction>
export type BidInAuctionReturn = FunctionReturn<typeof functions.bidInAuction>

export type CancelAuctionParams = FunctionArguments<typeof functions.cancelAuction>
export type CancelAuctionReturn = FunctionReturn<typeof functions.cancelAuction>

export type CollectAuctionPayoutParams = FunctionArguments<typeof functions.collectAuctionPayout>
export type CollectAuctionPayoutReturn = FunctionReturn<typeof functions.collectAuctionPayout>

export type CollectAuctionTokenParams = FunctionArguments<typeof functions.collectAuctionToken>
export type CollectAuctionTokenReturn = FunctionReturn<typeof functions.collectAuctionToken>

export type CreateAuctionParams = FunctionArguments<typeof functions.createAuction>
export type CreateAuctionReturn = FunctionReturn<typeof functions.createAuction>

export type GetAllAuctionsParams = FunctionArguments<typeof functions.getAllAuctions>
export type GetAllAuctionsReturn = FunctionReturn<typeof functions.getAllAuctions>

export type GetAllValidAuctionsParams = FunctionArguments<typeof functions.getAllValidAuctions>
export type GetAllValidAuctionsReturn = FunctionReturn<typeof functions.getAllValidAuctions>

export type GetAuctionParams = FunctionArguments<typeof functions.getAuction>
export type GetAuctionReturn = FunctionReturn<typeof functions.getAuction>

export type GetNewWinningBidParams = FunctionArguments<typeof functions.getNewWinningBid>
export type GetNewWinningBidReturn = FunctionReturn<typeof functions.getNewWinningBid>

export type InitializeAuctionParams = FunctionArguments<typeof functions.initializeAuction>
export type InitializeAuctionReturn = FunctionReturn<typeof functions.initializeAuction>

export type IsAuctionExpiredParams = FunctionArguments<typeof functions.isAuctionExpired>
export type IsAuctionExpiredReturn = FunctionReturn<typeof functions.isAuctionExpired>

export type IsNewWinningBidParams = FunctionArguments<typeof functions.isNewWinningBid>
export type IsNewWinningBidReturn = FunctionReturn<typeof functions.isNewWinningBid>

export type OnERC1155BatchReceivedParams = FunctionArguments<typeof functions.onERC1155BatchReceived>
export type OnERC1155BatchReceivedReturn = FunctionReturn<typeof functions.onERC1155BatchReceived>

export type OnERC1155ReceivedParams = FunctionArguments<typeof functions.onERC1155Received>
export type OnERC1155ReceivedReturn = FunctionReturn<typeof functions.onERC1155Received>

export type OnERC721ReceivedParams = FunctionArguments<typeof functions.onERC721Received>
export type OnERC721ReceivedReturn = FunctionReturn<typeof functions.onERC721Received>

export type SetPermissionsContractParams = FunctionArguments<typeof functions.setPermissionsContract>
export type SetPermissionsContractReturn = FunctionReturn<typeof functions.setPermissionsContract>

export type SupportsInterfaceParams = FunctionArguments<typeof functions.supportsInterface>
export type SupportsInterfaceReturn = FunctionReturn<typeof functions.supportsInterface>

export type TotalAuctionsParams = FunctionArguments<typeof functions.totalAuctions>
export type TotalAuctionsReturn = FunctionReturn<typeof functions.totalAuctions>

