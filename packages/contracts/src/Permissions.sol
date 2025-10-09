// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./IPermissions.sol";
import "./library/AccessControl.sol";

error InvalidRole(bytes32 role);
error RoleAlreadyGrantedGlobally(bytes32 role);
error RoleAlreadyGranted(address caller, bytes32 role);
error NFTRoleAlreadyGrantedGlobally();
error NFTAlreadyWhitelisted(address nft);
error CallerNotOwnerOfNFT(uint256 tokenId, address caller);
error CallerDoesNotOwnNFT(uint256 tokenId, address caller);
error TargetIsNotNFT();

contract Permissions is IPermission, AccessControl {

    // ============= STORAGE STRUCTS =============
    
    struct CurrencyStorage {
        mapping(address => bool) supportedCurrencies;
        bool initialized;
    }
    
    struct PermissionsStorage {
        CurrencyStorage currency;
        mapping(bytes32 => bool) allowedRoles; 
    }
    
    // ============= UNSTRUCTURED STORAGE SLOT =============
    
    uint256 private constant PERMISSIONS_STORAGE_SLOT = 
        uint256(keccak256("eip1967.permissions.storage")) - 1;
    
    function _permissionsStorage() private pure returns (PermissionsStorage storage s) {
        uint256 slot = PERMISSIONS_STORAGE_SLOT;
        assembly {
            s.slot := slot
        }
    }
    
    // ============= CONSTANTS =============
    // Use functions instead of constants to work with delegatecall (if needed in future)

    function MANAGEMENT_ROLE() public pure returns (bytes32) {
        return keccak256("MANAGEMENT_ROLE");
    }

    function LISTING_ROLE() public pure returns (bytes32) {
        return keccak256("LISTING_ROLE");
    }

    function AUCTION_ROLE() public pure returns (bytes32) {
        return keccak256("AUCTION_ROLE");
    }

    function OFFER_ROLE() public pure returns (bytes32) {
        return keccak256("OFFER_ROLE");
    }

    function NFT_ROLE() public pure returns (bytes32) {
        return keccak256("NFT_ROLE");
    }
    
    // ============= INITIALIZATION =============
    
    function initialize(address admin) external {
        PermissionsStorage storage s = _permissionsStorage();
        require(!s.currency.initialized, "Already initialized");
        
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(MANAGEMENT_ROLE(), admin);

        _setRoleAdmin(MANAGEMENT_ROLE(), DEFAULT_ADMIN_ROLE);

        _setRoleAdmin(LISTING_ROLE(), MANAGEMENT_ROLE());
        _setRoleAdmin(AUCTION_ROLE(), MANAGEMENT_ROLE());
        _setRoleAdmin(OFFER_ROLE(), MANAGEMENT_ROLE());
        _setRoleAdmin(NFT_ROLE(), MANAGEMENT_ROLE());

        s.allowedRoles[LISTING_ROLE()] = true;
        s.allowedRoles[AUCTION_ROLE()] = true;
        s.allowedRoles[OFFER_ROLE()] = true;
        s.allowedRoles[NFT_ROLE()] = true;
        
        s.currency.initialized = true;
    }

    // ============= PUBLIC GETTERS =============
    
    function supportedCurrencies(address currency) external view returns (bool) {
        return _permissionsStorage().currency.supportedCurrencies[currency];
    }
    
    function hasRole(bytes32 role, address account) public view override(AccessControl, IPermission) returns (bool) {
        if (_permissionsStorage().allowedRoles[role]) {
            if (super.hasRole(role, address(0))) {
                return true;
            }
        }
        return super.hasRole(role, account);
    }
    
    // ============= CURRENCY MANAGEMENT =============
    
    function addCurrency(address[] calldata _currencies) external onlyRole(MANAGEMENT_ROLE()) {
        PermissionsStorage storage s = _permissionsStorage();
        require(_currencies.length > 0, "Empty currency array");
        for (uint256 i = 0; i < _currencies.length; i++) {
            s.currency.supportedCurrencies[_currencies[i]] = true;
            emit CurrencyAdded(_currencies[i]);
        }
    }
    
    function removeCurrency(address[] calldata _currencies) external onlyRole(MANAGEMENT_ROLE()) {
        PermissionsStorage storage s = _permissionsStorage();
        for (uint256 i = 0; i < _currencies.length; i++) {
            s.currency.supportedCurrencies[_currencies[i]] = false;
            emit CurrencyRemoved(_currencies[i]);
        }
    }
    
    // ============= ASSET MANAGEMENT =============
    
    function assignNFTRole(address[] calldata _nfts) external onlyRole(MANAGEMENT_ROLE()) {
        for (uint i = 0; i < _nfts.length; i++) {
            _grantRole(NFT_ROLE(), _nfts[i]);
            emit NFTRoleAssigned(_nfts[i]);
        }
    }

    function revokeNFTRole(address[] calldata _nfts) external onlyRole(MANAGEMENT_ROLE()) {
        for (uint i = 0; i < _nfts.length; i++) {
            _revokeRole(NFT_ROLE(), _nfts[i]);
            emit NFTRoleRevoked(_nfts[i]);
        }
    }
    
    // ============= USER ROLE MANAGEMENT =============
    
    function registerRole(bytes32 role, bytes32 adminRole) external onlyRole(MANAGEMENT_ROLE()) {
        PermissionsStorage storage s = _permissionsStorage();
        require(!s.allowedRoles[role], "Role already registered");
        s.allowedRoles[role] = true;
        _setRoleAdmin(role, adminRole);
        emit RoleRegistered(role, adminRole);
    }
    
    function assignRole(bytes32 role, address[] calldata accounts) external onlyRole(MANAGEMENT_ROLE()) {
        PermissionsStorage storage s = _permissionsStorage();
        require(s.allowedRoles[role], "InvalidRole");
        
        for (uint i = 0; i < accounts.length; i++) {
            _grantRole(role, accounts[i]);
            emit UserRoleAssigned(role, accounts[i]);
        }
    }
    
    function revokeRole(bytes32 role, address[] calldata accounts) external onlyRole(MANAGEMENT_ROLE()) {
        PermissionsStorage storage s = _permissionsStorage();
        require(s.allowedRoles[role], "InvalidRole");
        
        for (uint i = 0; i < accounts.length; i++) {
            _revokeRole(role, accounts[i]);
            emit UserRoleRevoked(role, accounts[i]);
        }
    }
    
    // ============= ROLE REQUESTS =============
    
    function requestUserRoles(bytes32[] calldata roles) external {
        PermissionsStorage storage s = _permissionsStorage();
        uint256 successCount = 0;
        
        for (uint i = 0; i < roles.length; i++) {
            bytes32 role = roles[i];
            if (!s.allowedRoles[role]) {
                continue;
            }
            
            if (super.hasRole(role, address(0))) {
                continue;
            }
            if (super.hasRole(role, msg.sender)) {
                continue;
            }
            
            emit RoleRequested(msg.sender, role);
            successCount++;
        }
        require(successCount > 0, "No valid role requests");
    }
    
    function requestNFTRole(address nftContract, uint256 tokenId) external {
        if (hasRole(NFT_ROLE(), address(0))) {
            revert NFTRoleAlreadyGrantedGlobally();
        }
        if (hasRole(NFT_ROLE(), nftContract)) {
            revert NFTAlreadyWhitelisted(nftContract);
        }
        
        bool isERC721 = ERC165Checker.supportsInterface(nftContract, type(IERC721).interfaceId);
        bool isERC1155 = ERC165Checker.supportsInterface(nftContract, type(IERC1155).interfaceId);
        
        if (isERC721) {
            if (IERC721(nftContract).ownerOf(tokenId) != msg.sender) {
                revert CallerNotOwnerOfNFT(tokenId, msg.sender);
            }
        } else if (isERC1155) {
            if (IERC1155(nftContract).balanceOf(msg.sender, tokenId) == 0) {
                revert CallerDoesNotOwnNFT(tokenId, msg.sender);
            }
        } else {
            revert TargetIsNotNFT();
        }
        
        emit NFTRoleRequested(nftContract, tokenId, msg.sender);
    }
}