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
  timeBufferInSeconds: bigint; // Time buffer for auction extension
  startTimestamp: bigint;
  endTimestamp: bigint;
}

export interface OfferParams {
  assetContract: Address;
  tokenId: bigint;
  quantity: bigint;
  currency: Address;
  totalPrice: bigint;
  expirationTimestamp: bigint;
}

export function encodeCreateListing(params: ListingParams): EncodedTransaction {
  const listingInterface = new ethers.Interface(ListingABI.abi);
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
  const listingInterface = new ethers.Interface(ListingABI.abi);
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
  const listingInterface = new ethers.Interface(ListingABI.abi);
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
  const listingInterface = new ethers.Interface(ListingABI.abi);

  // Check if currency is native token (ETH)
  // Contract uses address(0) for native ETH
  const isNativeToken = currency === ZERO_ADDRESS;

  const data = listingInterface.encodeFunctionData('buyFromListing', [
    listingId,
    buyFor,
    quantity,
    currency,
    expectedTotalPrice,
  ]);

  // Send ETH value if buying with native token
  const value = isNativeToken ? expectedTotalPrice.toString() : '0';

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
  const listingInterface = new ethers.Interface(ListingABI.abi);
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
  const listingInterface = new ethers.Interface(ListingABI.abi);
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
  const auctionInterface = new ethers.Interface(AuctionABI.abi);
  const data = auctionInterface.encodeFunctionData('createAuction', [
    {
      _assetContract: params.assetContract,
      _tokenId: params.tokenId,
      _quantity: params.quantity,
      _currency: params.currency,
      _startPrice: params.startPrice,
      _ceilingPrice: params.ceilingPrice,
      _stepAmount: params.stepAmount,
      _timeBufferInSeconds: params.timeBufferInSeconds,
      _startTime: params.startTimestamp,
      _endTime: params.endTimestamp,
    },
  ]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeBidInAuction(params: {
  auctionId: bigint;
  bidAmount: bigint;
  currency: Address;
}): EncodedTransaction {
  const auctionInterface = new ethers.Interface(AuctionABI.abi);
  const data = auctionInterface.encodeFunctionData('bidInAuction', [params.auctionId, params.bidAmount]);

  // Check if currency is native token (ETH)
  // Contract uses address(0) or 0xEEEE... for native ETH
  const isNativeToken = params.currency.toLowerCase() === ZERO_ADDRESS.toLowerCase() ||
                        params.currency.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

  // Only send ETH value if bidding with native token
  // For ERC-20 tokens, value should be 0 (tokens are transferred via approve + transferFrom)
  const value = isNativeToken ? params.bidAmount.toString() : '0';

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value,
  };
}

export function encodeCancelAuction(params: { auctionId: bigint }): EncodedTransaction {
  const auctionInterface = new ethers.Interface(AuctionABI.abi);
  const data = auctionInterface.encodeFunctionData('cancelAuction', [params.auctionId]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeCollectAuctionPayout(params: { auctionId: bigint }): EncodedTransaction {
  const auctionInterface = new ethers.Interface(AuctionABI.abi);
  const data = auctionInterface.encodeFunctionData('collectAuctionPayout', [params.auctionId]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeCollectAuctionToken(params: { auctionId: bigint }): EncodedTransaction {
  const auctionInterface = new ethers.Interface(AuctionABI.abi);
  const data = auctionInterface.encodeFunctionData('collectAuctionToken', [params.auctionId]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeMakeOffer(params: OfferParams): EncodedTransaction {
  const offerInterface = new ethers.Interface(OfferABI.abi);
  const data = offerInterface.encodeFunctionData('makeOffer', [
    {
      assetContract: params.assetContract,
      tokenId: params.tokenId,
      quantity: params.quantity,
      currency: params.currency,
      totalPrice: params.totalPrice,
      expirationTimestamp: params.expirationTimestamp,
    },
  ]);

  // Check if currency is native token (ETH) - contract uses address(0) for native ETH
  const isNativeToken = params.currency.toLowerCase() === ZERO_ADDRESS.toLowerCase() ||
                        params.currency.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

  // For native ETH offers, send ETH value with transaction (escrow model)
  // For ERC20 offers, value should be 0 (tokens transferred via approve + transferFrom)
  const value = isNativeToken ? params.totalPrice.toString() : '0';

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value,
  };
}

export function encodeAcceptOffer(offerId: bigint): EncodedTransaction {
  const offerInterface = new ethers.Interface(OfferABI.abi);
  const data = offerInterface.encodeFunctionData('acceptOffer', [offerId]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeCancelOffer(offerId: bigint): EncodedTransaction {
  const offerInterface = new ethers.Interface(OfferABI.abi);
  const data = offerInterface.encodeFunctionData('cancelOffer', [offerId]);

  return {
    to: CONTRACT_ADDRESSES.ROUTER,
    data,
    value: '0',
  };
}

export function encodeGrantRole(roleHash: string, account: Address): EncodedTransaction {
  const permissionsInterface = new ethers.Interface(PermissionsABI.abi);
  const data = permissionsInterface.encodeFunctionData('grantRole', [roleHash, account]);

  return {
    to: CONTRACT_ADDRESSES.PERMISSIONS,
    data,
    value: '0',
  };
}

export function encodeRevokeRole(roleHash: string, account: Address): EncodedTransaction {
  const permissionsInterface = new ethers.Interface(PermissionsABI.abi);
  const data = permissionsInterface.encodeFunctionData('revokeRole', [roleHash, account]);

  return {
    to: CONTRACT_ADDRESSES.PERMISSIONS,
    data,
    value: '0',
  };
}

export function encodeAssignRole(roleHash: string, accounts: Address[]): EncodedTransaction {
  const permissionsInterface = new ethers.Interface(PermissionsABI.abi);
  const data = permissionsInterface.encodeFunctionData('assignRole', [roleHash, accounts]);

  return {
    to: CONTRACT_ADDRESSES.PERMISSIONS,
    data,
    value: '0',
  };
}
