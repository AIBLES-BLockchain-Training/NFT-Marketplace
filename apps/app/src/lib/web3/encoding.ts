import { ethers } from 'ethers';
import { EncodedTransaction, Address } from '../../types';
import { CONTRACT_ADDRESSES, ZERO_ADDRESS } from '../contracts/addresses';
import { ListingABI, AuctionABI, OfferABI, PermissionsABI } from '../contracts/abis';

export interface ListingParams {
  assetContract: Address;
  tokenId: bigint;
  quantity: bigint;
  currency: Address;
  pricePerToken: bigint;
  startTimestamp: bigint;
  endTimestamp: bigint;
  reserved: boolean;
}

export interface AuctionParams {
  assetContract: Address;
  tokenId: bigint;
  quantity: bigint;
  currency: Address;
  startPrice: bigint;
  stepAmount: bigint;
  ceilingPrice: bigint;
  startTimestamp: bigint;
  endTimestamp: bigint;
}

export interface OfferParams {
  assetContract: Address;
  tokenId: bigint;
  quantity: bigint;
  currency: Address;
  totalPrice: bigint;
  expirationTime: bigint;
}

export function encodeCreateListing(params: ListingParams): EncodedTransaction {
  const listingInterface = new ethers.Interface(ListingABI);
  const data = listingInterface.encodeFunctionData('createListing', [
    {
      assetContract: params.assetContract,
      tokenId: params.tokenId,
      quantity: params.quantity,
      currency: params.currency,
      pricePerToken: params.pricePerToken,
      startTimestamp: params.startTimestamp,
      endTimestamp: params.endTimestamp,
      reserved: params.reserved,
    },
  ]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeUpdateListing(listingId: bigint, params: ListingParams): EncodedTransaction {
  const listingInterface = new ethers.Interface(ListingABI);
  const data = listingInterface.encodeFunctionData('updateListing', [
    listingId,
    {
      assetContract: params.assetContract,
      tokenId: params.tokenId,
      quantity: params.quantity,
      currency: params.currency,
      pricePerToken: params.pricePerToken,
      startTimestamp: params.startTimestamp,
      endTimestamp: params.endTimestamp,
      reserved: params.reserved,
    },
  ]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeCancelListing(listingId: bigint): EncodedTransaction {
  const listingInterface = new ethers.Interface(ListingABI);
  const data = listingInterface.encodeFunctionData('cancelListing', [listingId]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeBuyFromListing(
  listingId: bigint,
  buyFor: Address,
  quantity: bigint,
  currency: Address,
  expectedTotalPrice: bigint
): EncodedTransaction {
  const listingInterface = new ethers.Interface(ListingABI);
  const data = listingInterface.encodeFunctionData('buyFromListing', [
    listingId,
    buyFor,
    quantity,
    currency,
    expectedTotalPrice,
  ]);

  const value = currency === ZERO_ADDRESS ? expectedTotalPrice.toString() : '0';

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value,
  };
}

export function encodeApproveBuyerForListing(
  listingId: bigint,
  buyer: Address,
  toApprove: boolean
): EncodedTransaction {
  const listingInterface = new ethers.Interface(ListingABI);
  const data = listingInterface.encodeFunctionData('approveBuyerForListing', [listingId, buyer, toApprove]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeApproveCurrencyForListing(
  listingId: bigint,
  currency: Address,
  pricePerTokenInCurrency: bigint
): EncodedTransaction {
  const listingInterface = new ethers.Interface(ListingABI);
  const data = listingInterface.encodeFunctionData('approveCurrencyForListing', [
    listingId,
    currency,
    pricePerTokenInCurrency,
  ]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeCreateAuction(params: AuctionParams): EncodedTransaction {
  const auctionInterface = new ethers.Interface(AuctionABI);
  const data = auctionInterface.encodeFunctionData('createAuction', [
    {
      assetContract: params.assetContract,
      tokenId: params.tokenId,
      quantity: params.quantity,
      currency: params.currency,
      startPrice: params.startPrice,
      stepAmount: params.stepAmount,
      ceilingPrice: params.ceilingPrice,
      startTimestamp: params.startTimestamp,
      endTimestamp: params.endTimestamp,
    },
  ]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeBidInAuction(auctionId: bigint, bidAmount: bigint): EncodedTransaction {
  const auctionInterface = new ethers.Interface(AuctionABI);
  const data = auctionInterface.encodeFunctionData('bidInAuction', [auctionId, bidAmount]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeCancelAuction(auctionId: bigint): EncodedTransaction {
  const auctionInterface = new ethers.Interface(AuctionABI);
  const data = auctionInterface.encodeFunctionData('cancelAuction', [auctionId]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeCollectAuctionPayout(auctionId: bigint): EncodedTransaction {
  const auctionInterface = new ethers.Interface(AuctionABI);
  const data = auctionInterface.encodeFunctionData('collectAuctionPayout', [auctionId]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeCollectAuctionToken(auctionId: bigint): EncodedTransaction {
  const auctionInterface = new ethers.Interface(AuctionABI);
  const data = auctionInterface.encodeFunctionData('collectAuctionToken', [auctionId]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeMakeOffer(params: OfferParams): EncodedTransaction {
  const offerInterface = new ethers.Interface(OfferABI);
  const data = offerInterface.encodeFunctionData('makeOffer', [params]);

  return {
    to: CONTRACT_ADDRESSES.OFFER,
    data,
    value: '0',
  };
}

export function encodeAcceptOffer(offerId: bigint): EncodedTransaction {
  const offerInterface = new ethers.Interface(OfferABI);
  const data = offerInterface.encodeFunctionData('acceptOffer', [offerId]);

  return {
    to: CONTRACT_ADDRESSES.OFFER,
    data,
    value: '0',
  };
}

export function encodeCancelOffer(offerId: bigint): EncodedTransaction {
  const offerInterface = new ethers.Interface(OfferABI);
  const data = offerInterface.encodeFunctionData('cancelOffer', [offerId]);

  return {
    to: CONTRACT_ADDRESSES.OFFER,
    data,
    value: '0',
  };
}

export function encodeGrantRole(roleHash: string, account: Address): EncodedTransaction {
  const permissionsInterface = new ethers.Interface(PermissionsABI);
  const data = permissionsInterface.encodeFunctionData('grantRole', [roleHash, account]);

  return {
    to: CONTRACT_ADDRESSES.PERMISSIONS,
    data,
    value: '0',
  };
}

export function encodeRevokeRole(roleHash: string, account: Address): EncodedTransaction {
  const permissionsInterface = new ethers.Interface(PermissionsABI);
  const data = permissionsInterface.encodeFunctionData('revokeRole', [roleHash, account]);

  return {
    to: CONTRACT_ADDRESSES.PERMISSIONS,
    data,
    value: '0',
  };
}

export function encodeAssignRole(roleHash: string, accounts: Address[]): EncodedTransaction {
  const permissionsInterface = new ethers.Interface(PermissionsABI);
  const data = permissionsInterface.encodeFunctionData('assignRole', [roleHash, accounts]);

  return {
    to: CONTRACT_ADDRESSES.PERMISSIONS,
    data,
    value: '0',
  };
}
