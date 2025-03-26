// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract Permission is AccessControl {

    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;

    bytes32 public constant MANAGE_USER_ROLE     = keccak256("MANAGE_USER_ROLE");
    bytes32 public constant MANAGE_ASSET_ROLE    = keccak256("MANAGE_ASSET_ROLE");
    bytes32 public constant MANAGE_CURRENCY_ROLE = keccak256("MANAGE_CURRENCY_ROLE");
    bytes32 public constant MANAGE_REQUESTS_ROLE = keccak256("MANAGE_REQUESTS_ROLE");

    bool public onlyWhitelistedUser;
    bool public onlyWhitelistedNFT;

    enum RequestType { None, User, NFT }

    mapping(address => bool) public supportedCurrencies;
    mapping(address => bool) public whitelistedNFTs;
    mapping(address => bool) public validUsers;
    mapping(address => RequestType) public pendingRequests;

    event CurrencyAdded(address indexed currency);
    event CurrencyRemoved(address indexed currency);

    event NFTWhitelisted(address indexed nft);
    event NFTRemoved(address indexed nft);
    event UserAdded(address indexed user);
    event UserRemoved(address indexed user);

    event RequestApproval(address indexed target, RequestType requestType);
    event RequestApproved(address indexed target, RequestType requestType);
    event RequestRejected(address indexed target, RequestType requestType);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGE_USER_ROLE, msg.sender);
        _grantRole(MANAGE_ASSET_ROLE, msg.sender);
        _grantRole(MANAGE_CURRENCY_ROLE, msg.sender);
        _grantRole(MANAGE_REQUESTS_ROLE, msg.sender);
        
        onlyWhitelistedUser = true;
        onlyWhitelistedNFT  = true;
    }

    function addCurrency(address _currency) external onlyRole(MANAGE_CURRENCY_ROLE) {
        supportedCurrencies[_currency] = true;
        emit CurrencyAdded(_currency);
    }

    function removeCurrency(address _currency) external onlyRole(MANAGE_CURRENCY_ROLE) {
        supportedCurrencies[_currency] = false;
        emit CurrencyRemoved(_currency);
    }

    function whitelistNFT(address _nft) external onlyRole(MANAGE_ASSET_ROLE) {
        whitelistedNFTs[_nft] = true;
        emit NFTWhitelisted(_nft);
    }

    function removeWhitelistedNFT(address _nft) external onlyRole(MANAGE_ASSET_ROLE) {
        whitelistedNFTs[_nft] = false;
        emit NFTRemoved(_nft);
    }

    function addUser(address _user) external onlyRole(MANAGE_USER_ROLE) {
        validUsers[_user] = true;
        emit UserAdded(_user);
    }

    function removeUser(address _user) external onlyRole(MANAGE_USER_ROLE) {
        validUsers[_user] = false;
        emit UserRemoved(_user);
    }

    function setOnlyWhitelistedUser(bool _status) external onlyRole(MANAGE_USER_ROLE) {
        onlyWhitelistedUser = _status;
    }

    function setOnlyWhitelistedNFT(bool _status) external onlyRole(MANAGE_ASSET_ROLE) {
        onlyWhitelistedNFT = _status;
    }

    function requestUserApproval() external {
        require(onlyWhitelistedUser, "User whitelist is not active");
        require(pendingRequests[msg.sender] == RequestType.None, "Request already exists");
        require(!validUsers[msg.sender], "User already approved");

        pendingRequests[msg.sender] = RequestType.User;
        emit RequestApproval(msg.sender, RequestType.User);
    }

    function requestNFTApproval(address nftContract, uint256 tokenId) external {
        require(onlyWhitelistedNFT, "NFT whitelist is not active");
        require(pendingRequests[nftContract] == RequestType.None, "Request already exists");
        require(!whitelistedNFTs[nftContract], "NFT already approved");

        bool isERC721 = ERC165Checker.supportsInterface(nftContract, _INTERFACE_ID_ERC721);
        bool isERC1155 = ERC165Checker.supportsInterface(nftContract, _INTERFACE_ID_ERC1155);
        require(isERC721 || isERC1155, "Target is not NFT");

        if (isERC721) {
            require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Caller is not owner of the NFT");
        } else if (isERC1155) {
            require(IERC1155(nftContract).balanceOf(msg.sender, tokenId) > 0, "Caller does not own this NFT");
        }

        pendingRequests[nftContract] = RequestType.NFT;
        emit RequestApproval(nftContract, RequestType.NFT);
    }

  function approveRequests(address[] calldata targets) external onlyRole(MANAGE_REQUESTS_ROLE) {
        for (uint i = 0; i < targets.length; i++) {
            RequestType reqType = pendingRequests[targets[i]];
            require(reqType != RequestType.None, "No pending request for target");

            if (reqType == RequestType.User) {
                validUsers[targets[i]] = true;
            } else if (reqType == RequestType.NFT) {
                whitelistedNFTs[targets[i]] = true;
            }
            pendingRequests[targets[i]] = RequestType.None;
            emit RequestApproved(targets[i], reqType);
        }
    }

    function rejectRequests(address[] calldata targets) external onlyRole(MANAGE_REQUESTS_ROLE) {
        for (uint i = 0; i < targets.length; i++) {
            RequestType reqType = pendingRequests[targets[i]];
            require(reqType != RequestType.None, "No pending request for target");

            pendingRequests[targets[i]] = RequestType.None;
            emit RequestRejected(targets[i], reqType);
        }
    }
}
