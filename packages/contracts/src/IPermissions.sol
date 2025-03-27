// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPermission {
    // -------------------- CURRENCY --------------------
    function addCurrency(address[] calldata _currencies) external;
    function removeCurrency(address[] calldata _currencies) external;

    // -------------------- NFT ROLE MANAGEMENT --------------------
    function assignNFTRole(address[] calldata _nfts) external;
    function revokeNFTRole(address[] calldata _nfts) external;

    // -------------------- USER ROLE MANAGEMENT --------------------
    // Listing Role
    function assignListingRole(address[] calldata _accounts) external;
    function revokeListingRole(address[] calldata _accounts) external;
    // Auction Role
    function assignAuctionRole(address[] calldata _accounts) external;
    function revokeAuctionRole(address[] calldata _accounts) external;
    // Offer Role
    function assignOfferRole(address[] calldata _accounts) external;
    function revokeOfferRole(address[] calldata _accounts) external;

    // -------------------- ROLE REQUESTS --------------------
    function requestUserRoles(bytes32[] calldata roles) external;
    function requestNFTRole(address nftContract, uint256 tokenId) external;

    // -------------------- ROLE CHECK --------------------
    function hasRole(bytes32 role, address account) external view returns (bool);

    // -------------------- EVENTS --------------------
    event CurrencyAdded(address indexed currency);
    event CurrencyRemoved(address indexed currency);

    event NFTRoleAssigned(address indexed nft);
    event NFTRoleRevoked(address indexed nft);

    event ListingRoleAssigned(address indexed account);
    event ListingRoleRevoked(address indexed account);
    event AuctionRoleAssigned(address indexed account);
    event AuctionRoleRevoked(address indexed account);
    event OfferRoleAssigned(address indexed account);
    event OfferRoleRevoked(address indexed account);

    event RoleRequested(address indexed requester, bytes32 role);
    event NFTRoleRequested(address indexed nft, uint256 tokenId, address indexed requester);
}
