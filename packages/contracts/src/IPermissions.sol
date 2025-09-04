// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPermission {
    // -------------------- CURRENCY --------------------
    function addCurrency(address[] calldata _currencies) external;
    function removeCurrency(address[] calldata _currencies) external;
    
    function supportedCurrencies(address currency) external view returns (bool);

    // -------------------- NFT ROLE MANAGEMENT --------------------
    function assignNFTRole(address[] calldata _nfts) external;
    function revokeNFTRole(address[] calldata _nfts) external;

    // -------------------- USER ROLE MANAGEMENT --------------------
    function assignRole(bytes32 role, address[] calldata _accounts) external;
    function revokeRole(bytes32 role, address[] calldata _accounts) external;

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

    event UserRoleAssigned(bytes32 indexed role, address indexed account);
    event UserRoleRevoked(bytes32 indexed role, address indexed account);
    event RoleRegistered(bytes32 indexed role, bytes32 indexed adminRole);

    event RoleRequested(address indexed requester, bytes32 role);
    event NFTRoleRequested(address indexed nft, uint256 tokenId, address indexed requester);
}
