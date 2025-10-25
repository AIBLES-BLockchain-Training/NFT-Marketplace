export type Address = `0x${string}`;

export enum SubjectType {
  USER = 'USER',
  CONTRACT = 'CONTRACT',
}

export enum CollectionType {
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

export enum ListingStatus {
  UNSET = 'UNSET',
  CREATED = 'CREATED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export enum AuctionStatus {
  CREATED = 'CREATED',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  ENDED = 'ENDED',
}

export enum OfferStatus {
  UNSET = 'UNSET',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TradeType {
  AUCTION = 'AUCTION',
  LISTING = 'LISTING',
}

export interface Subject {
  id: Address;
  subjectType: SubjectType;
  name: string;
  avatarUrl?: string;
  backgroundUrl?: string;
  bio?: string;
  createdAt: string;
}

export interface Role {
  id: string;
  roleName: string;
  roleHash: string;
  description?: string;
}

export interface RoleAssignment {
  id: string;
  subject: Subject;
  role: Role;
  assignedAt: string;
  assignedBy?: string;
  transactionHash?: string;
}

export interface Collection {
  id: Address;
  name: string;
  symbol: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  collectionType: CollectionType;
  creator: Subject;
  totalSupply: string;
  floorPrice?: string;
  royaltyBps?: string;
  royaltyRecipient?: Address;
  createdAt: string;
}

export interface Trait {
  id: string;
  traitType: string;
  value: string;
  displayType?: string;
}

export interface TokenOwnership {
  id: string;
  ownerAddress: Address;
  balance: string;
  updatedAt: string;
}

export interface NFT {
  id: string;
  collection: Collection;
  tokenId: string;
  name: string;
  imageUrl?: string;
  description?: string;
  metadataUri?: string;
  traits?: Trait[];
  owners?: TokenOwnership[];
  listings?: Listing[];
  auctions?: Auction[];
  offers?: Offer[];
}

export interface SupportedCurrency {
  id: Address;
  name: string;
  symbol: string;
  decimals: number;
  isActive: boolean;
  feePercentage: number;
  totalAmountFee: string;
}

export interface CurrencyApproval {
  id: string;
  currency: SupportedCurrency;
  pricePerToken: string;
  approvedBy: Address;
  createdAt: string;
  updatedAt?: string;
  transactionHash?: string;
}

export interface BuyerApproval {
  id: string;
  buyerAddress: Address;
  isApproved: boolean;
  approvedBy: Address;
  createdAt: string;
  updatedAt?: string;
  transactionHash?: string;
}

export interface Listing {
  id: string;
  listingId: string;
  owner: Subject;
  listingCreator: Subject; // Alias for owner
  nft: NFT;
  quantity: string;
  pricePerToken: string;
  currency: Address; // Currency address
  startTimestamp: string;
  endTimestamp: string;
  endTime?: string; // Alias for endTimestamp
  isReserved: boolean;
  status: ListingStatus;
  createdAt: string;
  updatedAt?: string;
  transactionHash?: string;
  currencyApprovals?: CurrencyApproval[];
  buyerApprovals?: BuyerApproval[];
}

export interface Bid {
  id: string;
  bidderAddress: Address;
  bidder: Subject; // Bidder details
  bidAmount: string;
  timestamp: string;
}

export interface Auction {
  id: string;
  auctionId: string;
  nft: NFT; // Changed from nftId for clarity
  sellerAddress: Address;
  auctionCreator: Subject; // Auction creator details
  quantity: string;
  currency: SupportedCurrency;
  minimumBidAmount: string; // Minimum bid for auction
  startPrice: string;
  stepAmount: string;
  ceilingPrice?: string;
  bidBufferBps: string; // Bid buffer in basis points
  startTime: string;
  endTime: string;
  timeBufferInSeconds: number;
  status: AuctionStatus;
  winningBid?: Bid;
  bids?: Bid[];
  createdAt: string;
}

export interface Offer {
  id: string;
  offerId: string;
  buyerAddress: Address;
  offeror: Subject; // Offer maker details
  tokenOwner?: Subject; // Target token owner (for specific offers)
  nft: NFT; // Changed from nftId for clarity
  quantity: string;
  totalPrice: string;
  currency: SupportedCurrency;
  expirationTime: string;
  expirationTimestamp: string; // Alias for expirationTime
  status: OfferStatus;
  createdAt: string;
}

export interface PurchaseHistory {
  id: string;
  transactionHash: string;
  nft: NFT;
  seller: Subject;
  buyer: Subject;
  quantity: string;
  currency: SupportedCurrency;
  totalPrice: string;
  tradeType: TradeType;
  timestamp: string;
  blockNumber: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  page: number;
  limit: number;
}

export interface EncodedTransaction {
  to: Address;
  data: string;
  value: string;
}

// Trade/Activity type for admin dashboard
export interface Trade {
  id: string;
  type: 'LISTING_CREATED' | 'LISTING_UPDATED' | 'LISTING_CANCELLED' | 'LISTING_BOUGHT' |
        'AUCTION_CREATED' | 'AUCTION_BID' | 'AUCTION_CANCELLED' | 'AUCTION_CLOSED' |
        'OFFER_MADE' | 'OFFER_ACCEPTED' | 'OFFER_CANCELLED';
  timestamp: string;
  actor: Subject;
  nft?: NFT;
  metadata?: any;
}

// GraphQL Connection types for pagination
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface Edge<T> {
  node: T;
  cursor: string;
}

export interface Connection<T> {
  totalCount: number;
  edges: Edge<T>[];
  pageInfo: PageInfo;
}

// Specific connection types
export type CollectionsConnection = Connection<Collection>;
export type NFTsConnection = Connection<NFT>;
export type ListingsConnection = Connection<Listing>;
export type AuctionsConnection = Connection<Auction>;
export type OffersConnection = Connection<Offer>;
export type SubjectsConnection = Connection<Subject>;
export type TradesConnection = Connection<Trade>;
