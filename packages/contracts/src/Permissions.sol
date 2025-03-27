// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract Permissions is AccessControl {

    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;

    bytes32 public constant MANAGE_USER_ROLE      = keccak256("MANAGE_USER_ROLE");
    bytes32 public constant MANAGE_ASSET_ROLE     = keccak256("MANAGE_ASSET_ROLE");
    bytes32 public constant MANAGE_CURRENCY_ROLE  = keccak256("MANAGE_CURRENCY_ROLE");

    bytes32 public constant LISTING_ROLE = keccak256("LISTING_ROLE");
    bytes32 public constant AUCTION_ROLE = keccak256("AUCTION_ROLE");
    bytes32 public constant OFFER_ROLE   = keccak256("OFFER_ROLE");

    bytes32 public constant NFT_ROLE = keccak256("NFT_ROLE");

    mapping(address => bool) public supportedCurrencies;

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


    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MANAGE_USER_ROLE, admin);
        _grantRole(MANAGE_ASSET_ROLE, admin);
        _grantRole(MANAGE_CURRENCY_ROLE, admin);
    }

    // Currencies
    function addCurrency(address[] calldata _currencies) external onlyRole(MANAGE_CURRENCY_ROLE) {
        for (uint256 i = 0; i < _currencies.length; i++) {
            supportedCurrencies[_currencies[i]] = true;
            emit CurrencyAdded(_currencies[i]);
        }
    }

    function removeCurrency(address[] calldata _currencies) external onlyRole(MANAGE_CURRENCY_ROLE) {
        for (uint256 i = 0; i < _currencies.length; i++) {
            supportedCurrencies[_currencies[i]] = false;
            emit CurrencyRemoved(_currencies[i]);
        }
    }

    // Assets
    function assignNFTRole(address[] calldata _nfts) external onlyRole(MANAGE_ASSET_ROLE) {
        for (uint i = 0; i < _nfts.length; i++) {
            _grantRole(NFT_ROLE, _nfts[i]);
            emit NFTRoleAssigned(_nfts[i]);
        }
    }

    function revokeNFTRole(address[] calldata _nfts) external onlyRole(MANAGE_ASSET_ROLE) {
        for (uint i = 0; i < _nfts.length; i++) {
            _revokeRole(NFT_ROLE, _nfts[i]);
            emit NFTRoleRevoked(_nfts[i]);
        }
    }

    // Listing Role
    function assignListingRole(address[] calldata _accounts) external onlyRole(MANAGE_USER_ROLE) {
        for (uint i = 0; i < _accounts.length; i++) {
            _grantRole(LISTING_ROLE, _accounts[i]);
            emit ListingRoleAssigned(_accounts[i]);
        }
    }

    function revokeListingRole(address[] calldata _accounts) external onlyRole(MANAGE_USER_ROLE) {
        for (uint i = 0; i < _accounts.length; i++) {
            _revokeRole(LISTING_ROLE, _accounts[i]);
            emit ListingRoleRevoked(_accounts[i]);
        }
    }

    // Auction Role
    function assignAuctionRole(address[] calldata _accounts) external onlyRole(MANAGE_USER_ROLE) {
        for (uint i = 0; i < _accounts.length; i++) {
            _grantRole(AUCTION_ROLE, _accounts[i]);
            emit AuctionRoleAssigned(_accounts[i]);
        }
    }

    function revokeAuctionRole(address[] calldata _accounts) external onlyRole(MANAGE_USER_ROLE) {
        for (uint i = 0; i < _accounts.length; i++) {
            _revokeRole(AUCTION_ROLE, _accounts[i]);
            emit AuctionRoleRevoked(_accounts[i]);
        }
    }

    // Offer Role
    function assignOfferRole(address[] calldata _accounts) external onlyRole(MANAGE_USER_ROLE) {
        for (uint i = 0; i < _accounts.length; i++) {
            _grantRole(OFFER_ROLE, _accounts[i]);
            emit OfferRoleAssigned(_accounts[i]);
        }
    }

    function revokeOfferRole(address[] calldata _accounts) external onlyRole(MANAGE_USER_ROLE) {
        for (uint i = 0; i < _accounts.length; i++) {
            _revokeRole(OFFER_ROLE, _accounts[i]);
            emit OfferRoleRevoked(_accounts[i]);
        }
    }

    function hasRole(bytes32 role, address account) public view override returns (bool) {
        if (
            role == LISTING_ROLE ||
            role == AUCTION_ROLE ||
            role == OFFER_ROLE ||
            role == NFT_ROLE
        ) {
            if (super.hasRole(role, address(0))) {
                return true;
            }
        }
        return super.hasRole(role, account);
    }

    // Request Role
    function requestUserRoles(bytes32[] calldata roles) external {
      for(uint i = 0; i < roles.length; i++){
          bytes32 role = roles[i];
          require(
              role == LISTING_ROLE || role == AUCTION_ROLE || role == OFFER_ROLE,
              "Invalid role"
          );

          require(!super.hasRole(role, address(0)), "Role already granted globally");
          require(!hasRole(role, msg.sender), "Role already granted");
          
          emit RoleRequested(msg.sender, role);
      }
    }

    function requestNFTRole(address nftContract, uint256 tokenId) external {
        require(!super.hasRole(NFT_ROLE, address(0)), "NFT role already granted globally");
        require(!hasRole(NFT_ROLE, nftContract), "NFT already whitelisted");

        bool isERC721 = ERC165Checker.supportsInterface(nftContract, _INTERFACE_ID_ERC721);
        bool isERC1155 = ERC165Checker.supportsInterface(nftContract, _INTERFACE_ID_ERC1155);

        if (isERC721) {
            require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Caller is not owner of the NFT");
        } else if (isERC1155) {
            require(IERC1155(nftContract).balanceOf(msg.sender, tokenId) > 0, "Caller does not own this NFT");
        }
        else {
            revert("Target is not NFT");
        }

        emit NFTRoleRequested(nftContract, tokenId, msg.sender);
    }
}
