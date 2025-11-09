import { ethers } from 'ethers';

// Import all contract errors for auto-decoding
const LISTING_ERRORS = [
  'error InvalidAssetContract()',
  'error QuantityMustBeGreaterThanZero()',
  'error InvalidTimestamps(uint128 start, uint128 end)',
  'error PricePerTokenMustBeGreaterThanZero()',
  'error StartTimeNotInFuture()',
  'error ERC721QuantityMustBeOne(uint256 quantity)',
  'error ListingDoesNotExist()',
  'error InvalidRange(uint256 start, uint256 end)',
  'error EndIdExceedsTotalListings(uint256 end, uint256 total)',
  'error OnlyOwner(address caller, address owner)',
  'error ListingNotInCreatedStatus()',
  'error ListingNotReserved()',
  'error ListingNotAvailable()',
  'error InvalidRecipientAddress()',
  'error InvalidQuantity(uint256 requested, uint256 available)',
  'error CurrencyNotApprovedForListing(address currency)',
  'error IncorrectTotalPrice(uint256 expected, uint256 actual)',
  'error BuyerNotApproved()',
  'error BuyerInsufficientAllowance(uint256 allowance, uint256 required)',
  'error InsufficientBalance(uint256 available, uint256 required)',
  'error SellerDoesNotOwnToken(uint256 tokenId, address seller)',
  'error SellerInsufficientTokens(uint256 available, uint256 required)',
  'error ContractNotApprovedForERC721()',
  'error ContractNotApprovedForERC1155()',
  'error FeeOutOfRange(uint256 fee, uint256 max)',
  'error CurrencyFeeMustBeGreaterThanZero()',
  'error NoFeesToWithdraw()',
  'error ETHWithdrawalFailed()',
  'error FeeWithdrawalFailed()',
  'error RecipientNotERC721Receiver()',
  'error RecipientCannotHandleERC721Tokens()',
  'error RecipientNotERC1155Receiver()',
  'error RecipientCannotHandleERC1155Tokens()',
  'error TokenTypeNotSupported()',
  'error PermissionContractNotSet()',
  'error UserNotAuthorizedToCreateListing(address user)',
  'error NFTNotWhitelistedForListing(address nftContract)',
  'error CurrencyNotSupportedForListing(address currency)',
];

const AUCTION_ERRORS = [
  'error InvalidAssetContract()',
  'error QuantityMustBeGreaterThanZero()',
  'error InvalidTimestamps(uint128 start, uint128 end)',
  'error StartPriceMustBeGreaterThanZero()',
  'error StepAmountMustBeGreaterThanZero()',
  'error CeilingPriceMustBeGreaterThanStartPrice()',
  'error AuctionDoesNotExist()',
  'error OnlyOwner(address caller, address owner)',
  'error AuctionNotActive()',
  'error BidBelowMinimum(uint256 bid, uint256 minimum)',
  'error BidExceedsCeiling(uint256 bid, uint256 ceiling)',
  'error AuctionNotEnded()',
  'error AuctionAlreadySettled()',
  'error NoWinningBid()',
  'error UserNotAuthorizedToCreateAuction(address user)',
  'error NFTNotWhitelistedForAuction(address nftContract)',
];

const OFFER_ERRORS = [
  'error InvalidAssetContract()',
  'error QuantityMustBeGreaterThanZero()',
  'error InvalidTimestamps(uint128 start, uint128 end)',
  'error PricePerTokenMustBeGreaterThanZero()',
  'error OfferDoesNotExist()',
  'error OnlyOwner(address caller, address owner)',
  'error OfferNotActive()',
  'error NotTokenOwner()',
  'error UserNotAuthorizedToMakeOffer(address user)',
  'error NFTNotWhitelistedForOffer(address nftContract)',
];

const PERMISSIONS_ERRORS = [
  'error Unauthorized()',
  'error InvalidRole()',
  'error RoleAlreadyAssigned()',
  'error OnlyAdmin()',
];

// Create contract interface for auto-decoding
const contractInterface = new ethers.Interface([
  ...LISTING_ERRORS,
  ...AUCTION_ERRORS,
  ...OFFER_ERRORS,
  ...PERMISSIONS_ERRORS,
]);

// Fallback mapping for manual error codes (legacy)
const CONTRACT_ERRORS: Record<string, string> = {
  '0x9776c88f': 'NFT contract is not whitelisted. Please contact an admin to whitelist this NFT collection.',
  '0x82b42900': 'Unauthorized: You do not have permission to perform this action.',
  '0x7f8e4af8': 'Missing required role: You do not have the necessary permissions for this action. Please request the required role from an admin.',
  '0xdb16a55a': 'Missing OFFER role: You need to request the Offer Maker role to make offers.',
  '0x77be3871': 'Missing MANAGEMENT role: Only admins can perform this action.',
  '0x125a2bb7': 'Invalid role specified.',
  '0xe2517d3f': 'Access denied: You do not have the required role for this action.',
  '0x118cdaa7': 'Insufficient balance or allowance.',
  '0x48fee69c': 'Invalid listing parameters.',
  '0xe0283d5e': 'NFT not approved for transfer. Please approve this contract to transfer your NFT first.',
  '0xe9b63971': 'NFT not approved for transfer. You need to approve the marketplace contract to manage your NFT before creating a listing.',
  '0xfb8f41b2': 'Listing has expired.',
  '0x734a6a5c': 'Listing does not exist.',
  '0x2c5211c6': 'Invalid price: must be greater than 0.',
  '0x3b8d3d99': 'Invalid quantity: must be greater than 0.',
  '0x4e487b71': 'Panic error: likely arithmetic overflow/underflow.',
};

/**
 * Convert error name to user-friendly message
 */
function getErrorMessage(errorName: string, args?: unknown[]): string {
  switch (errorName) {
    // Listing errors
    case 'NFTNotWhitelistedForListing':
      return `NFT collection ${args?.[0] || ''} is not whitelisted. Please request whitelist in your Profile.`;
    case 'UserNotAuthorizedToCreateListing':
      return 'You do not have permission to create listings. Please request the LISTING role in your Profile.';
    case 'CurrencyNotSupportedForListing':
      return 'This currency is not supported for listings.';
    case 'PricePerTokenMustBeGreaterThanZero':
      return 'Price must be greater than 0.';
    case 'QuantityMustBeGreaterThanZero':
      return 'Quantity must be greater than 0.';
    case 'InvalidTimestamps':
      return 'Invalid time range. End time must be after start time.';
    case 'ContractNotApprovedForERC721':
    case 'ContractNotApprovedForERC1155':
      return 'NFT not approved. Please approve the marketplace contract first.';
    case 'SellerDoesNotOwnToken':
      return 'You do not own this NFT.';
    case 'ListingDoesNotExist':
      return 'Listing not found.';
    case 'ListingNotAvailable':
      return 'This listing is no longer available.';
    case 'InsufficientBalance':
      return 'Insufficient balance to complete this transaction.';

    // Auction errors
    case 'NFTNotWhitelistedForAuction':
      return `NFT collection ${args?.[0] || ''} is not whitelisted for auctions. Please request whitelist in your Profile.`;
    case 'UserNotAuthorizedToCreateAuction':
      return 'You do not have permission to create auctions. Please request the AUCTION role in your Profile.';
    case 'StartPriceMustBeGreaterThanZero':
      return 'Starting price must be greater than 0.';
    case 'StepAmountMustBeGreaterThanZero':
      return 'Bid step amount must be greater than 0.';
    case 'CeilingPriceMustBeGreaterThanStartPrice':
      return 'Buyout price must be greater than starting price.';
    case 'BidBelowMinimum':
      return 'Your bid is too low. Please increase your bid.';
    case 'AuctionNotActive':
      return 'This auction is not active.';
    case 'AuctionNotEnded':
      return 'Auction has not ended yet.';

    // Offer errors
    case 'NFTNotWhitelistedForOffer':
      return `NFT collection ${args?.[0] || ''} is not whitelisted for offers. Please request whitelist in your Profile.`;
    case 'UserNotAuthorizedToMakeOffer':
      return 'You do not have permission to make offers. Please request the OFFER role in your Profile.';
    case 'NotTokenOwner':
      return 'You do not own this token.';
    case 'OfferNotActive':
      return 'This offer is no longer active.';

    // Permission errors
    case 'Unauthorized':
    case 'OnlyAdmin':
      return 'You are not authorized to perform this action.';
    case 'InvalidRole':
      return 'Invalid role specified.';

    // Generic errors
    case 'OnlyOwner':
      return 'Only the owner can perform this action.';

    default:
      return `Contract error: ${errorName}`;
  }
}

/**
 * Decode contract error and return user-friendly message
 */
export function decodeContractError(error: unknown): string {
  try {
    // Extract error data from various error formats
    let errorData: string | undefined;
    const err = error as Record<string, any>;

    // Format 1: CALL_EXCEPTION with data in error object (most common with ethers v6)
    if (err?.code === 'CALL_EXCEPTION' && err?.data) {
      errorData = err.data;
    }

    // Format 2: error.info.error.data (ethers v6 gas estimation)
    if (!errorData && err?.info?.error?.data) {
      errorData = err.info.error.data;
    }

    // Format 3: error.data contains the revert data
    if (!errorData && err?.data) {
      errorData = err.data;
    }

    // Format 4: error.error.data (nested)
    if (!errorData && err?.error?.data) {
      errorData = err.error.data;
    }

    // Format 5: error in transaction object
    if (!errorData && err?.transaction?.data) {
      errorData = err.transaction.data;
    }

    // If we have error data, try to auto-decode using contract interface
    if (errorData && typeof errorData === 'string' && errorData.startsWith('0x')) {
      try {
        const parsedError = contractInterface.parseError(errorData);
        if (parsedError) {
          return getErrorMessage(parsedError.name, parsedError.args);
        }
      } catch (parseError) {
        // Failed to parse, continue to fallback
      }

      // Fallback to manual mapping
      const selector = errorData.slice(0, 10);
      if (CONTRACT_ERRORS[selector]) {
        return CONTRACT_ERRORS[selector];
      }

      // If not in our mapping, return generic message with selector
      return `Transaction reverted with error code: ${selector}. Please check contract requirements.`;
    }

    // Check for common error messages in the error object
    const errorMessage = err?.message || err?.reason || (typeof error === 'object' && error ? error.toString() : '') || '';

    // User rejected transaction
    if (errorMessage.includes('user rejected') || errorMessage.includes('User denied')) {
      return 'Transaction cancelled by user';
    }

    // Insufficient funds
    if (errorMessage.includes('insufficient funds')) {
      return 'Insufficient funds to complete this transaction';
    }

    // Gas estimation failed
    if (errorMessage.includes('gas required exceeds allowance') || errorMessage.includes('cannot estimate gas')) {
      return 'Transaction would fail. Please check your inputs and try again.';
    }

    // Nonce too low
    if (errorMessage.includes('nonce too low')) {
      return 'Transaction nonce error. Please try again.';
    }

    // Network error
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return 'Network error. Please check your connection and try again.';
    }

    // Generic execution revert
    if (errorMessage.includes('execution reverted')) {
      // Check if it's likely an approval issue or missing role
      if (errorMessage.includes('unknown custom error') || errorMessage.includes('estimateGas')) {
        return 'Transaction would fail. Common causes:\n\n• Missing required role - Request role from admin in Profile > Request Roles\n• NFT not whitelisted - Request whitelist in Profile > Request Roles\n• NFT not approved - Approve marketplace contract first\n• Not the owner of this NFT\n\nPlease verify your permissions and approvals.';
      }
      return 'Transaction failed: The contract rejected this transaction. Please verify all requirements are met.';
    }

    // Return original error message if we can't decode it
    return errorMessage || 'An unknown error occurred';

  } catch (decodeError) {
    console.error('Error decoding contract error:', decodeError);
    return 'An error occurred while processing the transaction';
  }
}

/**
 * Check if error is a user rejection
 */
export function isUserRejection(error: unknown): boolean {
  const err = error as Record<string, any>;
  const errorMessage = err?.message || err?.reason || (typeof error === 'object' && error ? error.toString() : '') || '';
  return errorMessage.includes('user rejected') || errorMessage.includes('User denied');
}

/**
 * Extract transaction hash from error (if available)
 */
export function extractTxHash(error: unknown): string | null {
  const err = error as Record<string, any>;
  if (err?.transactionHash) return err.transactionHash;
  if (err?.transaction?.hash) return err.transaction.hash;
  if (err?.hash) return err.hash;
  return null;
}
