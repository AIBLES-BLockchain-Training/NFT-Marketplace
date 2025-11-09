// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./IPermissions.sol";
import "./library/ReentrancyGuard.sol";

error InvalidAssetContract();
error QuantityMustBeGreaterThanZero();
error InvalidTimestamps(uint128 start, uint128 end);
error PricePerTokenMustBeGreaterThanZero();
error StartTimeNotInFuture();
error ERC721QuantityMustBeOne(uint256 quantity);
error InsufficientAvailableBalance(uint256 available, uint256 required);

error ListingDoesNotExist();
error InvalidRange(uint256 start, uint256 end);
error EndIdExceedsTotalListings(uint256 end, uint256 total);

error OnlyOwner(address caller, address owner);

error ListingNotInCreatedStatus();
error ListingNotReserved();
error ListingNotAvailable();

error InvalidRecipientAddress();
error InvalidQuantity(uint256 requested, uint256 available);
error CurrencyNotApprovedForListing(address currency);
error IncorrectTotalPrice(uint256 expected, uint256 actual);
error BuyerNotApproved();
error BuyerInsufficientAllowance(uint256 allowance, uint256 required);
error InsufficientBalance(uint256 available, uint256 required);

error SellerDoesNotOwnToken(uint256 tokenId, address seller);
error SellerInsufficientTokens(uint256 available, uint256 required);
error ContractNotApprovedForERC721();
error ContractNotApprovedForERC1155();

error FeeOutOfRange(uint256 fee, uint256 max);
error CurrencyFeeMustBeGreaterThanZero();
error NoFeesToWithdraw();
error ETHWithdrawalFailed();
error FeeWithdrawalFailed();

error RecipientNotERC721Receiver();
error RecipientCannotHandleERC721Tokens();
error RecipientNotERC1155Receiver();
error RecipientCannotHandleERC1155Tokens();

error TokenTypeNotSupported();

error PermissionContractNotSet();
error UserNotAuthorizedToCreateListing(address user);
error NFTNotWhitelistedForListing(address nftContract);
error CurrencyNotSupportedForListing(address currency);

error OnlyCallableViaRouter();
error InvalidRouterAddress();
error OnlyFeeReceiver();
error InvalidFeeReceiverAddress();
error FeeReceiverNotSet();

contract Listing is ReentrancyGuard {
    
    // ============= STORAGE STRUCTS =============
    
    struct CoreStorage {
        uint256 listingCounter;
        uint256 decimal;
        IPermission permissionContract;
        bool initialized;
    }
    
    struct ListingData {
        mapping(uint256 => NFTListing) listings;
        mapping(address => uint256[]) userOwnedListings;
    }
    
    struct ApprovalData {
        mapping(uint256 => mapping(address => bool)) buyerApprovals;
        mapping(uint256 => mapping(address => uint256)) currencyApprovals;
    }
    
    struct FeeData {
        mapping(address => uint256) currencyFees;
        mapping(address => uint256) accumulatedFees;
    }
    
    struct ListingStorage {
        CoreStorage core;
        ListingData listings;
        ApprovalData approvals;
        FeeData fees;
        mapping(address => mapping(address => mapping(uint256 => uint256))) listedQuantity;
        address router;
        address feeReceiver;
    }
    
    // ============= UNSTRUCTURED STORAGE SLOT =============

    uint256 private constant LISTING_STORAGE_SLOT = 
        uint256(keccak256("eip1967.listing.storage")) - 1;
    
    function _listingStorage() private pure returns (ListingStorage storage s) {
        uint256 slot = LISTING_STORAGE_SLOT;
        assembly {
            s.slot := slot
        }
    }
    

    // ============= CONSTANTS & ENUMS =============

    // Use functions instead of constants to work with delegatecall
    function MANAGEMENT_ROLE() public pure returns (bytes32) {
        return keccak256("MANAGEMENT_ROLE");
    }

    function LISTING_ROLE() public pure returns (bytes32) {
        return keccak256("LISTING_ROLE");
    }

    function NFT_ROLE() public pure returns (bytes32) {
        return keccak256("NFT_ROLE");
    }

    enum Status {
        UNSET,
        CREATED,
        COMPLETED,
        CANCELED
    }
    
    enum TokenType {
        ERC721,
        ERC1155
    }

    struct NFTListing {
        address owner;
        address assetContract;
        uint256 tokenId;
        uint256 quantity;
        address currency;
        uint256 pricePerToken;
        uint128 startTimestamp;
        uint128 endTimestamp;
        bool reserved;
        TokenType tokenType;
        Status status;
    }

    struct ListingParameters {
        address assetContract;
        uint256 tokenId;
        uint256 quantity;
        address currency;
        uint256 pricePerToken;
        uint128 startTimestamp;
        uint128 endTimestamp;
        bool reserved;
    }

    // ============= EVENTS =============
    
    
    event ListingCreated(
        uint256 indexed listingId,
        address indexed owner,
        address indexed assetContract,
        uint256 tokenId,
        uint256 quantity,
        address currency,
        uint256 pricePerToken,
        uint256 startTimestamp,
        uint256 endTimestamp,
        bool reserved
    );
    event ListingUpdated(
        uint256 indexed listingId,
        address indexed assetContract,
        uint256 indexed tokenId,
        uint256 quantity,
        address currency,
        uint256 pricePerToken,
        uint256 startTimestamp,
        uint256 endTimestamp,
        bool reserved
    );
    event ListingCompleted(uint256 indexed listingId);
    event BuyerApproved(uint256 indexed listingId, address indexed buyer, bool isApproved);
    event CurrencyApproved(uint256 indexed listingId, address indexed currency, uint256 price);
    event ListingCancelled(uint256 indexed listingId);
    event NFTPurchased(uint256 indexed listingId, address indexed buyer, uint256 quantity, uint256 totalPrice);
    event FeeWithdrawn(address indexed receiver, address indexed currency, uint256 amount);
    event CurrencyFeeUpdated(address indexed currency, uint256 fee);
    event PermissionContractUpdated(address indexed oldPermission, address indexed newPermission);
    event RouterSet(address indexed router);
    event FeeReceiverUpdated(address indexed oldReceiver, address indexed newReceiver);

    // ============= INITIALIZATION =============

    /**
     * @notice Initialize Listing contract with Router and Fee Receiver
     * @param _permissionContract Permission contract address
     * @param _router Router contract address (can be updated later by MANAGEMENT_ROLE)
     * @param _feeReceiver Fee receiver address - Multisig Wallet (can only be updated by itself)
     */
    function initializeListing(
        address _permissionContract,
        address _router,
        address _feeReceiver
    ) external {
        ListingStorage storage s = _listingStorage();
        require(!s.core.initialized, "Already initialized");
        if (_router == address(0)) revert InvalidRouterAddress();
        if (_feeReceiver == address(0)) revert InvalidFeeReceiverAddress();

        s.core.listingCounter = 0;
        s.core.decimal = 10000;
        s.core.permissionContract = IPermission(_permissionContract);
        s.router = _router;
        s.feeReceiver = _feeReceiver;
        s.core.initialized = true;

        emit RouterSet(_router);
        emit FeeReceiverUpdated(address(0), _feeReceiver);
    }

    // ============= PUBLIC GETTERS =============
    
    function listingCounter() external view returns (uint256) {
        return _listingStorage().core.listingCounter;
    }
    
    function decimalListing() external view returns (uint256) {
        return _listingStorage().core.decimal;
    }
    
    function permissionContract() external view returns (IPermission) {
        return _listingStorage().core.permissionContract;
    }
    
    function listings(uint256 listingId) external view returns (NFTListing memory) {
        return _listingStorage().listings.listings[listingId];
    }
    
    function buyerApprovals(uint256 listingId, address buyer) external view returns (bool) {
        return _listingStorage().approvals.buyerApprovals[listingId][buyer];
    }
    
    function currencyApprovals(uint256 listingId, address currency) external view returns (uint256) {
        return _listingStorage().approvals.currencyApprovals[listingId][currency];
    }
    
    function userOwnedListings(address user) external view returns (uint256[] memory) {
        return _listingStorage().listings.userOwnedListings[user];
    }
    
    function currencyFees(address currency) external view returns (uint256) {
        return _listingStorage().fees.currencyFees[currency];
    }
    
    function accumulatedFees(address currency) external view returns (uint256) {
        return _listingStorage().fees.accumulatedFees[currency];
    }

    // ============= MODIFIERS =============

    modifier onlyAuthorizedSeller() {
        _checkListingPermission(msg.sender);
        _;
    }

    modifier onlyWhitelistedNFT(address assetContract) {
        _checkNFTPermission(assetContract);
        _;
    }

    modifier onlySupportedCurrency(address currency) {
        _checkCurrencyPermission(currency);
        _;
    }

    modifier validParams(ListingParameters memory params) {
        _isValidParams(params);
        _;
    }

    modifier listingExists(uint256 listingId) {
        if (_listingStorage().listings.listings[listingId].status == Status.UNSET) revert ListingDoesNotExist();
        _;
    }

    modifier validRange(uint256 startId, uint256 endId) {
        ListingStorage storage s = _listingStorage();
        if (startId > endId) revert InvalidRange(startId, endId);
        if (endId > s.core.listingCounter) revert EndIdExceedsTotalListings(endId, s.core.listingCounter);
        _;
    }

    modifier onlyRouter() {
        ListingStorage storage s = _listingStorage();
        if (s.router != address(0) && address(this) != s.router) revert OnlyCallableViaRouter();
        _;
    }

    modifier onlyFeeReceiver() {
        ListingStorage storage s = _listingStorage();
        if (msg.sender != s.feeReceiver) revert OnlyFeeReceiver();
        _;
    }

    // ============= ADMIN FUNCTIONS =============

    function setPermissionContract(address _permissionContract) external {
        _checkManagementPermission();
        ListingStorage storage s = _listingStorage();
        address oldPermission = address(s.core.permissionContract);
        s.core.permissionContract = IPermission(_permissionContract);
        emit PermissionContractUpdated(oldPermission, _permissionContract);
    }

    function setCurrencyFee(address currency, uint256 fee) external {
        _checkManagementPermission();
        ListingStorage storage s = _listingStorage();
        if (fee == 0 || fee > s.core.decimal) revert FeeOutOfRange(fee, s.core.decimal);
        s.fees.currencyFees[currency] = fee;
        emit CurrencyFeeUpdated(currency, fee);
    }

    function setRouter(address _router) external {
        _checkManagementPermission();
        if (_router == address(0)) revert InvalidRouterAddress();

        ListingStorage storage s = _listingStorage();
        s.router = _router;
        emit RouterSet(_router);
    }

    function setFeeReceiver(address _feeReceiver) external onlyFeeReceiver {
        if (_feeReceiver == address(0)) revert InvalidFeeReceiverAddress();

        ListingStorage storage s = _listingStorage();
        address oldReceiver = s.feeReceiver;

        s.feeReceiver = _feeReceiver;
        emit FeeReceiverUpdated(oldReceiver, _feeReceiver);
    }

    function router() external view returns (address) {
        return _listingStorage().router;
    }

    function feeReceiver() external view returns (address) {
        return _listingStorage().feeReceiver;
    }

    // ============= PERMISSION FUNCTIONS =============

    function _checkManagementPermission() internal view {
        ListingStorage storage s = _listingStorage();
        if (address(s.core.permissionContract) == address(0)) revert PermissionContractNotSet();
        if (!s.core.permissionContract.hasRole(MANAGEMENT_ROLE(), msg.sender)) {
            revert("Caller does not have MANAGEMENT_ROLE");
        }
    }

    function _checkListingPermission(address user) internal view {
        ListingStorage storage s = _listingStorage();
        if (address(s.core.permissionContract) == address(0)) revert PermissionContractNotSet();
        if (!s.core.permissionContract.hasRole(LISTING_ROLE(), user)) {
            revert UserNotAuthorizedToCreateListing(user);
        }
    }

    function _checkNFTPermission(address nftContract) internal view {
        ListingStorage storage s = _listingStorage();
        if (address(s.core.permissionContract) == address(0)) revert PermissionContractNotSet();
        if (!s.core.permissionContract.hasRole(NFT_ROLE(), nftContract)) {
            revert NFTNotWhitelistedForListing(nftContract);
        }
    }

    function _checkCurrencyPermission(address currency) internal view {
        ListingStorage storage s = _listingStorage();
        if (address(s.core.permissionContract) == address(0)) revert PermissionContractNotSet();
        if (!s.core.permissionContract.supportedCurrencies(currency)) {
            revert CurrencyNotSupportedForListing(currency);
        }
    }

    function hasListingPermission(address user) external view returns (bool) {
        ListingStorage storage s = _listingStorage();
        if (address(s.core.permissionContract) == address(0)) return false;
        return s.core.permissionContract.hasRole(LISTING_ROLE(), user);
    }

    function isNFTWhitelisted(address nftContract) external view returns (bool) {
        ListingStorage storage s = _listingStorage();
        if (address(s.core.permissionContract) == address(0)) return false;
        return s.core.permissionContract.hasRole(NFT_ROLE(), nftContract);
    }

    function isCurrencySupported(address currency) external view returns (bool) {
        ListingStorage storage s = _listingStorage();
        if (address(s.core.permissionContract) == address(0)) return false;
        return s.core.permissionContract.supportedCurrencies(currency);
    }

    // ============= VALIDATION FUNCTIONS =============

    function _isValidParams(ListingParameters memory params) internal view {
        if (params.assetContract == address(0)) revert InvalidAssetContract();
        if (params.quantity == 0) revert QuantityMustBeGreaterThanZero();
        if (params.startTimestamp >= params.endTimestamp)
            revert InvalidTimestamps(params.startTimestamp, params.endTimestamp);
        if (params.pricePerToken == 0) revert PricePerTokenMustBeGreaterThanZero();
        if (params.startTimestamp < block.timestamp) revert StartTimeNotInFuture();

        TokenType tokenType = getTokenType(params.assetContract);
        if (tokenType == TokenType.ERC721) {
            if (params.quantity != 1) revert ERC721QuantityMustBeOne(params.quantity);
        }
    }

    // ============= LISTING FUNCTIONS =============

    function createListing(ListingParameters memory params)
        external
        onlyRouter
        validParams(params)
        onlyAuthorizedSeller()
        onlyWhitelistedNFT(params.assetContract)
        onlySupportedCurrency(params.currency)
        nonReentrant
        returns (uint256 listingId)
    {
        TokenType tokenType = getTokenType(params.assetContract);

        _checkSellerTokenOwnership(params.assetContract, tokenType, msg.sender, params.tokenId, params.quantity);
        _checkSellerApproval(params.assetContract, tokenType, msg.sender, params.tokenId);

        ListingStorage storage s = _listingStorage();

        if (tokenType == TokenType.ERC1155) {
            uint256 currentlyListed = s.listedQuantity[msg.sender][params.assetContract][params.tokenId];
            uint256 totalBalance = IERC1155(params.assetContract).balanceOf(msg.sender, params.tokenId);
            uint256 availableBalance = totalBalance - currentlyListed;

            if (availableBalance < params.quantity) {
                revert InsufficientAvailableBalance(availableBalance, params.quantity);
            }

            s.listedQuantity[msg.sender][params.assetContract][params.tokenId] += params.quantity;
        }

        listingId = s.core.listingCounter;

        s.listings.listings[listingId] = NFTListing({
            owner: msg.sender,
            assetContract: params.assetContract,
            tokenId: params.tokenId,
            quantity: params.quantity,
            currency: params.currency,
            pricePerToken: params.pricePerToken,
            startTimestamp: params.startTimestamp,
            endTimestamp: params.endTimestamp,
            reserved: params.reserved,
            tokenType: tokenType,
            status: Status.CREATED
        });

        s.listings.userOwnedListings[msg.sender].push(listingId);
        s.core.listingCounter++;

        s.approvals.currencyApprovals[listingId][params.currency] = params.pricePerToken;

        emit ListingCreated(
            listingId,
            msg.sender,
            params.assetContract,
            params.tokenId,
            params.quantity,
            params.currency,
            params.pricePerToken,
            params.startTimestamp,
            params.endTimestamp,
            params.reserved
        );

        emit CurrencyApproved(listingId, params.currency, params.pricePerToken);

        return listingId;
    }

    function getTokenType(address assetContract) public view returns (TokenType) {
        try IERC165(assetContract).supportsInterface(type(IERC721).interfaceId) returns (bool supports721) {
            if (supports721) return TokenType.ERC721;
        } catch {}

        try IERC165(assetContract).supportsInterface(type(IERC1155).interfaceId) returns (bool supports1155) {
            if (supports1155) return TokenType.ERC1155;
        } catch {}

        revert TokenTypeNotSupported();
    }

    function updateListing(
        uint256 listingId,
        ListingParameters memory params
    ) external onlyRouter validParams(params) listingExists(listingId) onlySupportedCurrency(params.currency) nonReentrant { 
        ListingStorage storage s = _listingStorage();
        NFTListing storage listing = s.listings.listings[listingId];

        if (listing.owner != msg.sender) revert OnlyOwner(msg.sender, listing.owner);
        if (listing.status != Status.CREATED) revert ListingNotInCreatedStatus();

        if (listing.assetContract != params.assetContract) {
            _checkNFTPermission(params.assetContract);
        }

        TokenType tokenType = getTokenType(params.assetContract);

        if (tokenType == TokenType.ERC1155 && listing.quantity != params.quantity) {
            uint256 oldQuantity = listing.quantity;
            int256 quantityDelta = int256(params.quantity) - int256(oldQuantity);

            if (quantityDelta > 0) {
                uint256 currentlyListed = s.listedQuantity[msg.sender][params.assetContract][params.tokenId];
                uint256 totalBalance = IERC1155(params.assetContract).balanceOf(msg.sender, params.tokenId);
                uint256 availableBalance = totalBalance - currentlyListed;

                if (availableBalance < uint256(quantityDelta)) {
                    revert InsufficientAvailableBalance(availableBalance, uint256(quantityDelta));
                }

                s.listedQuantity[msg.sender][params.assetContract][params.tokenId] += uint256(quantityDelta);
            } else {
                s.listedQuantity[msg.sender][params.assetContract][params.tokenId] -= uint256(-quantityDelta);
            }
        }

        listing.assetContract = params.assetContract;
        listing.tokenId = params.tokenId;
        listing.quantity = params.quantity;
        listing.currency = params.currency;
        listing.pricePerToken = params.pricePerToken;
        listing.startTimestamp = params.startTimestamp;
        listing.endTimestamp = params.endTimestamp;
        listing.reserved = params.reserved;

        s.approvals.currencyApprovals[listingId][params.currency] = params.pricePerToken;

        emit ListingUpdated(
            listingId,
            params.assetContract,
            params.tokenId,
            params.quantity,
            params.currency,
            params.pricePerToken,
            params.startTimestamp,
            params.endTimestamp,
            params.reserved
        );

        emit CurrencyApproved(listingId, params.currency, params.pricePerToken);
    }

    function cancelListing(uint256 listingId) external onlyRouter listingExists(listingId) nonReentrant {
        ListingStorage storage s = _listingStorage();
        NFTListing storage listing = s.listings.listings[listingId];
        if (listing.owner != msg.sender) revert OnlyOwner(msg.sender, listing.owner);
        if (listing.status != Status.CREATED) revert ListingNotInCreatedStatus();

        // Only decrement listedQuantity if it was tracked (for backward compatibility with old listings)
        if (listing.tokenType == TokenType.ERC1155) {
            uint256 currentListed = s.listedQuantity[listing.owner][listing.assetContract][listing.tokenId];
            if (currentListed >= listing.quantity) {
                s.listedQuantity[listing.owner][listing.assetContract][listing.tokenId] -= listing.quantity;
            }
        }

        listing.status = Status.CANCELED;
        emit ListingCancelled(listingId);
    }

    function approveBuyerForListing(
        uint256 listingId,
        address buyer,
        bool toApprove
    ) external onlyRouter listingExists(listingId) nonReentrant {
        ListingStorage storage s = _listingStorage();
        NFTListing storage listing = s.listings.listings[listingId];
        if (listing.owner != msg.sender) revert OnlyOwner(msg.sender, listing.owner);
        if (listing.status != Status.CREATED) revert ListingNotInCreatedStatus();
        if (!listing.reserved) revert ListingNotReserved();

        s.approvals.buyerApprovals[listingId][buyer] = toApprove;
        emit BuyerApproved(listingId, buyer, toApprove);
    }

    function approveCurrencyForListing(
        uint256 listingId,
        address currency,
        uint256 pricePerTokenInCurrency
    ) external onlyRouter listingExists(listingId) onlySupportedCurrency(currency) nonReentrant {  
        ListingStorage storage s = _listingStorage();
        NFTListing storage listing = s.listings.listings[listingId];
        if (listing.owner != msg.sender) revert OnlyOwner(msg.sender, listing.owner);
        if (listing.status != Status.CREATED) revert ListingNotInCreatedStatus();

        if (pricePerTokenInCurrency > 0) {
            s.approvals.currencyApprovals[listingId][currency] = pricePerTokenInCurrency;
        } else {
            delete s.approvals.currencyApprovals[listingId][currency];
        }
        emit CurrencyApproved(listingId, currency, pricePerTokenInCurrency);
    }

    function buyFromListing(
        uint256 listingId,
        address buyFor,
        uint256 quantity,
        address currency,
        uint256 expectedTotalPrice
    ) external payable onlyRouter listingExists(listingId) nonReentrant {
        ListingStorage storage s = _listingStorage();
        NFTListing storage listing = s.listings.listings[listingId];

        if (buyFor == address(0)) revert InvalidRecipientAddress();
        if (!(block.timestamp >= listing.startTimestamp && block.timestamp <= listing.endTimestamp))
            revert ListingNotAvailable();
        if (listing.status != Status.CREATED) revert ListingNotAvailable();
        if (quantity == 0 || quantity > listing.quantity) revert InvalidQuantity(quantity, listing.quantity);

        uint256 priceInCurrency = s.approvals.currencyApprovals[listingId][currency];
        if (priceInCurrency == 0) revert CurrencyNotApprovedForListing(currency);

        uint256 totalPrice = quantity * priceInCurrency;
        if (expectedTotalPrice != totalPrice) revert IncorrectTotalPrice(totalPrice, expectedTotalPrice);

        _checkSellerTokenOwnership(
            listing.assetContract,
            listing.tokenType,
            listing.owner,
            listing.tokenId,
            listing.quantity
        );
        _checkSellerApproval(listing.assetContract, listing.tokenType, listing.owner, listing.tokenId);

        _checkBuyerApproval(s, listingId, msg.sender);
        _checkBuyerBalance(msg.sender, currency, totalPrice);
        _checkBuyerAllowance(currency, totalPrice);

        _ensureCanReceiveToken(buyFor, listing.tokenId, quantity, listing.tokenType);

        listing.quantity -= quantity;

        if (listing.tokenType == TokenType.ERC1155) {
            uint256 currentListed = s.listedQuantity[listing.owner][listing.assetContract][listing.tokenId];
            if (currentListed >= quantity) {
                s.listedQuantity[listing.owner][listing.assetContract][listing.tokenId] -= quantity;
            }
        }

        uint256 fee = (totalPrice * getCurrencyFee(currency)) / s.core.decimal;
        uint256 sellerAmount = totalPrice - fee;

        if (listing.tokenType == TokenType.ERC721) {
            IERC721(listing.assetContract).safeTransferFrom(listing.owner, buyFor, listing.tokenId);
        }
        if (listing.tokenType == TokenType.ERC1155) {
            IERC1155(listing.assetContract).safeTransferFrom(listing.owner, buyFor, listing.tokenId, quantity, "");
        }

        if (currency == address(0)) {
            if (msg.value != totalPrice) revert IncorrectTotalPrice(totalPrice, msg.value);
            s.fees.accumulatedFees[currency] += fee;

            (bool success, ) = listing.owner.call{value: sellerAmount}("");
            if (!success) revert ETHWithdrawalFailed();
        } else {
            if (msg.value != 0) revert IncorrectTotalPrice(0, msg.value);
            s.fees.accumulatedFees[currency] += fee;
            if (!IERC20(currency).transferFrom(msg.sender, listing.owner, sellerAmount)) revert FeeWithdrawalFailed();
            if (!IERC20(currency).transferFrom(msg.sender, address(this), fee)) revert FeeWithdrawalFailed();
        }

        emit NFTPurchased(listingId, buyFor, quantity, totalPrice);

        if (listing.quantity == 0) {
            listing.status = Status.COMPLETED;
            emit ListingCompleted(listingId);
        }
    }

    // ============= VALIDATION HELPER FUNCTIONS =============

    function _ensureCanReceiveToken(
        address recipient,
        uint256 tokenId,
        uint256 quantity,
        TokenType tokenType
    ) internal {
        if (!_isContract(recipient)) {
            return;
        }

        if (tokenType == TokenType.ERC721) {
            if (!IERC165(recipient).supportsInterface(type(IERC721Receiver).interfaceId))
                revert RecipientNotERC721Receiver();
            try IERC721Receiver(recipient).onERC721Received(address(this), msg.sender, tokenId, "") returns (
                bytes4 response
            ) {
                if (response != IERC721Receiver.onERC721Received.selector) revert RecipientCannotHandleERC721Tokens();
            } catch {
                revert RecipientCannotHandleERC721Tokens();
            }
        } else if (tokenType == TokenType.ERC1155) {
            if (!IERC165(recipient).supportsInterface(type(IERC1155Receiver).interfaceId))
                revert RecipientNotERC1155Receiver();
            try
                IERC1155Receiver(recipient).onERC1155Received(address(this), msg.sender, tokenId, quantity, "")
            returns (bytes4 response) {
                if (response != IERC1155Receiver.onERC1155Received.selector)
                    revert RecipientCannotHandleERC1155Tokens();
            } catch {
                revert RecipientCannotHandleERC1155Tokens();
            }
        }
    }

    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    function _checkSellerTokenOwnership(
        address assetContract,
        TokenType tokenType,
        address seller,
        uint256 tokenId,
        uint256 quantity
    ) internal view {
        if (tokenType == TokenType.ERC721) {
            if (IERC721(assetContract).ownerOf(tokenId) != seller) revert SellerDoesNotOwnToken(tokenId, seller);
        }
        if (tokenType == TokenType.ERC1155) {
            uint256 sellerBalance = IERC1155(assetContract).balanceOf(seller, tokenId);
            if (sellerBalance < quantity) revert SellerInsufficientTokens(sellerBalance, quantity);
        }
    }

    function _checkSellerApproval(
        address assetContract,
        TokenType tokenType,
        address seller,
        uint256 tokenId
    ) internal view {
        if (tokenType == TokenType.ERC721) {
            if (
                !(IERC721(assetContract).isApprovedForAll(seller, address(this)) ||
                    IERC721(assetContract).getApproved(tokenId) == address(this))
            ) revert ContractNotApprovedForERC721();
        }
        if (tokenType == TokenType.ERC1155) {
            if (!IERC1155(assetContract).isApprovedForAll(seller, address(this)))
                revert ContractNotApprovedForERC1155();
        }
    }

    function _checkBuyerApproval(ListingStorage storage s, uint256 listingId, address buyer) internal view {
        NFTListing storage listing = s.listings.listings[listingId];
        if (!(s.approvals.buyerApprovals[listingId][buyer] || !listing.reserved)) revert BuyerNotApproved();
    }

    function _checkBuyerAllowance(address currency, uint256 totalPrice) internal view {
        if (currency != address(0)) {
            uint256 allowance = IERC20(currency).allowance(msg.sender, address(this));
            if (allowance < totalPrice) revert BuyerInsufficientAllowance(allowance, totalPrice);
        }
    }

    function _checkBuyerBalance(address buyer, address currency, uint256 totalPrice) internal view {
        uint256 availableBalance;
        if (currency == address(0)) {
            availableBalance = buyer.balance;
        } else {
            availableBalance = IERC20(currency).balanceOf(buyer);
        }
        if (availableBalance < totalPrice) revert InsufficientBalance(availableBalance, totalPrice);
    }

    // ============= VIEW FUNCTIONS =============

    function totalListings() external view returns (uint256) {
        return _listingStorage().core.listingCounter;
    }

    function getAllListings(
        uint256 startId,
        uint256 endId
    ) external view validRange(startId, endId) returns (NFTListing[] memory) {
        ListingStorage storage s = _listingStorage();
        uint256 length = endId - startId + 1;
        NFTListing[] memory allListings = new NFTListing[](length);
        for (uint256 i = 0; i < length; i++) {
            uint256 listingId = startId + i;
            allListings[i] = s.listings.listings[listingId];
        }
        return allListings;
    }

    function getAllValidListings(
        uint256 startId,
        uint256 endId
    ) external view validRange(startId, endId) returns (NFTListing[] memory) {
        ListingStorage storage s = _listingStorage();
        uint256 length = 0;
        for (uint256 i = startId; i <= endId; i++) {
            if (s.listings.listings[i].status == Status.CREATED) {
                length++;
            }
        }
        NFTListing[] memory validListings = new NFTListing[](length);
        uint256 index = 0;
        for (uint256 i = startId; i <= endId; i++) {
            if (s.listings.listings[i].status == Status.CREATED) {
                validListings[index] = s.listings.listings[i];
                index++;
            }
        }
        return validListings;
    }

    function getListing(uint256 listingId) external view listingExists(listingId) returns (NFTListing memory) {
        return _listingStorage().listings.listings[listingId];
    }

    function getCurrencyFee(address currency) public view returns (uint256) {
        ListingStorage storage s = _listingStorage();
        uint256 currencyFee = s.fees.currencyFees[currency];
        if (currencyFee == 0) revert CurrencyFeeMustBeGreaterThanZero();
        return currencyFee;
    }

    function withdrawFees(address currency) external onlyFeeReceiver nonReentrant {
        ListingStorage storage s = _listingStorage();
        if (s.feeReceiver == address(0)) revert FeeReceiverNotSet();

        uint256 amount = s.fees.accumulatedFees[currency];
        if (amount == 0) revert NoFeesToWithdraw();

        s.fees.accumulatedFees[currency] = 0;

        if (currency == address(0)) {
            (bool success, ) = s.feeReceiver.call{value: amount}("");
            if (!success) revert ETHWithdrawalFailed();
        } else {
            if (!IERC20(currency).transfer(s.feeReceiver, amount)) revert FeeWithdrawalFailed();
        }

        emit FeeWithdrawn(s.feeReceiver, currency, amount);
    }

    receive() external payable {}
}