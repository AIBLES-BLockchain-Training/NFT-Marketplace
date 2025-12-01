// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IPermissions.sol";

contract NFTOffer is ReentrancyGuard {
    // ============= STORAGE STRUCTS =============
    struct CoreStorage {
        uint256 offerIdCounter;
        address feeRecipient;
        uint256 feePercentage;
        IPermission permissions;
        bool initialized;
    }

    struct OfferData {
        mapping(uint256 => Offer) offers;
    }

    struct FeeData {
        mapping(address => uint256) accumulatedFees;
    }

    struct OfferStorage {
        CoreStorage coreStorage;
        OfferData offerData;
        FeeData feeData;
    }

    // ============= UNSTRUCTURED STORAGE SLOT =============
    uint256 private constant OFFER_STORAGE_SLOT = uint256(keccak256("eip1967.offer.storage")) - 1;

    function _offerStorage() internal pure returns (OfferStorage storage s) {
        uint256 slot = OFFER_STORAGE_SLOT;
        assembly {
            s.slot := slot
        }
    }

    // ============= CONSTANTS & ENUMS =============
    uint256 private constant BASIS_POINTS = 10000;

    // Use functions instead of constants to work with delegatecall
    function MANAGEMENT_ROLE() public pure returns (bytes32) {
        return keccak256("MANAGEMENT_ROLE");
    }

    function OFFER_ROLE() public pure returns (bytes32) {
        return keccak256("OFFER_ROLE");
    }

    function NFT_ROLE() public pure returns (bytes32) {
        return keccak256("NFT_ROLE");
    }

    enum Status {
        UNSET,
        ACTIVE,
        COMPLETED,
        CANCELLED
    }

    enum TokenType {
        ERC721,
        ERC1155
    }

    struct OfferParams {
        address assetContract;
        uint256 tokenId;
        uint256 quantity;
        address currency;
        uint256 totalPrice;
        uint256 expirationTimestamp;
    }

    struct Offer {
        uint256 offerId;
        address offeror;
        address assetContract;
        uint256 tokenId;
        uint256 quantity;
        address currency;
        uint256 totalPrice;
        uint256 expirationTimestamp;
        TokenType tokenType;
        Status status;
    }

    // ============= ERRORS =============
    error ZeroQuantity();
    error ZeroPrice();
    error InvalidExpirationTimestamp();
    error QuantityMustBeOne();
    error AssetMustBeERC721OrERC1155();
    error InsufficientCurrencyBalance();
    error InsufficientCurrencyAllowance();
    error OfferDoesNotExist();
    error NotOfferor();
    error OfferNotActive();
    error OfferExpired();
    error NotOwnerOfNFT();
    error MarketplaceNotApprovedForNFT();
    error InsufficientNFTBalance();
    error InvalidRange();
    error OfferIdOutOfRange();
    error CallerDoesNotHaveOfferRole();
    error CallerDoesNotHaveManagementRole();
    error NFTNotWhitelisted();
    error CurrencyNotSupported();
    error ZeroAddress();
    error NoFeesToWithdraw();
    error ETHWithdrawalFailed();
    error FeeWithdrawalFailed();
    error IncorrectTotalPrice(uint256 expected, uint256 actual);

    // ============= EVENTS =============
    event OfferCreated(
        uint256 indexed offerId,
        address indexed offeror,
        address indexed assetContract,
        uint256 tokenId,
        uint256 quantity,
        address currency,
        uint256 totalPrice,
        uint256 expirationTimestamp
    );

    event OfferCancelled(uint256 indexed offerId, address indexed offeror);

    event OfferAccepted(
        uint256 indexed offerId,
        address indexed offeror,
        address indexed assetOwner,
        address assetContract,
        uint256 tokenId,
        uint256 quantity,
        address currency,
        uint256 totalPrice
    );

    event FeeWithdrawn(address indexed admin, address indexed currency, uint256 amount);

    // ============= CONSTRUCTOR (for standalone deployment) =============
    constructor(address _feeRecipient, uint256 _feePercentage, address _permissions) {
        if (_feeRecipient == address(0)) revert ZeroAddress();
        if (_permissions == address(0)) revert ZeroAddress();
        require(_feePercentage <= 1000, "Fee too high");

        // Note: Constructor storage won't be used when called via Router (delegatecall)
        // This is only for standalone deployment
        OfferStorage storage s = _offerStorage();
        s.coreStorage.feeRecipient = _feeRecipient;
        s.coreStorage.feePercentage = _feePercentage;
        s.coreStorage.permissions = IPermission(_permissions);
        s.coreStorage.initialized = true;
    }

    // ============= INITIALIZATION (for Router pattern) =============
    function initializeOffer(address _permissions, address _feeRecipient, uint256 _feePercentage) external {
        OfferStorage storage s = _offerStorage();
        require(!s.coreStorage.initialized, "Already initialized");
        if (_feeRecipient == address(0)) revert ZeroAddress();
        if (_permissions == address(0)) revert ZeroAddress();
        require(_feePercentage <= 1000, "Fee too high");

        s.coreStorage.permissions = IPermission(_permissions);
        s.coreStorage.feeRecipient = _feeRecipient;
        s.coreStorage.feePercentage = _feePercentage;
        s.coreStorage.initialized = true;
    }

    // ============= MODIFIERS =============
    modifier onlyOfferRole() {
        OfferStorage storage s = _offerStorage();
        if (!s.coreStorage.permissions.hasRole(OFFER_ROLE(), msg.sender)) revert CallerDoesNotHaveOfferRole();
        _;
    }

    // ============= MAIN FUNCTIONS =============
    function makeOffer(OfferParams memory params) external payable nonReentrant onlyOfferRole returns (uint256 offerId) {
        OfferStorage storage s = _offerStorage();

        if (!s.coreStorage.permissions.hasRole(NFT_ROLE(), params.assetContract)) revert NFTNotWhitelisted();
        if (!s.coreStorage.permissions.supportedCurrencies(params.currency)) revert CurrencyNotSupported();
        if (params.quantity == 0) revert ZeroQuantity();
        if (params.totalPrice == 0) revert ZeroPrice();
        if (params.expirationTimestamp <= block.timestamp) revert InvalidExpirationTimestamp();

        TokenType tokenType;
        try IERC721(params.assetContract).supportsInterface(type(IERC721).interfaceId) returns (bool isERC721) {
            if (isERC721) {
                tokenType = TokenType.ERC721;
                if (params.quantity != 1) revert QuantityMustBeOne();
            } else {
                bool isERC1155 = IERC1155(params.assetContract).supportsInterface(type(IERC1155).interfaceId);
                if (!isERC1155) revert AssetMustBeERC721OrERC1155();
                tokenType = TokenType.ERC1155;
            }
        } catch {
            revert AssetMustBeERC721OrERC1155();
        }

        // Check balance and allowance for Native Token (ETH) or ERC20
        if (params.currency == address(0)) {
            // Native Token (ETH) - user must send ETH with this transaction (escrow model)
            if (msg.value != params.totalPrice) revert IncorrectTotalPrice(params.totalPrice, msg.value);
        } else {
            // ERC20 Token - check balance and allowance
            if (msg.value != 0) revert IncorrectTotalPrice(0, msg.value);
            IERC20 currency = IERC20(params.currency);
            if (currency.balanceOf(msg.sender) < params.totalPrice) revert InsufficientCurrencyBalance();
            if (currency.allowance(msg.sender, address(this)) < params.totalPrice) revert InsufficientCurrencyAllowance();
        }

        s.coreStorage.offerIdCounter++;
        offerId = s.coreStorage.offerIdCounter;

        s.offerData.offers[offerId] = Offer({
            offerId: offerId,
            offeror: msg.sender,
            assetContract: params.assetContract,
            tokenId: params.tokenId,
            quantity: params.quantity,
            currency: params.currency,
            totalPrice: params.totalPrice,
            expirationTimestamp: params.expirationTimestamp,
            tokenType: tokenType,
            status: Status.ACTIVE
        });

        emit OfferCreated(
            offerId,
            msg.sender,
            params.assetContract,
            params.tokenId,
            params.quantity,
            params.currency,
            params.totalPrice,
            params.expirationTimestamp
        );

        return offerId;
    }

    function cancelOffer(uint256 offerId) external nonReentrant {
        OfferStorage storage s = _offerStorage();
        Offer storage offer = s.offerData.offers[offerId];

        if (offer.offerId != offerId) revert OfferDoesNotExist();
        if (offer.offeror != msg.sender) revert NotOfferor();
        if (offer.status != Status.ACTIVE) revert OfferNotActive();

        offer.status = Status.CANCELLED;

        // Refund escrowed ETH if offer was made with Native Token
        if (offer.currency == address(0)) {
            (bool success, ) = msg.sender.call{value: offer.totalPrice}("");
            if (!success) revert ETHWithdrawalFailed();
        }

        emit OfferCancelled(offerId, msg.sender);
    }

    function acceptOffer(uint256 offerId) external payable nonReentrant {
        OfferStorage storage s = _offerStorage();
        Offer storage offer = s.offerData.offers[offerId];

        if (offer.offerId != offerId) revert OfferDoesNotExist();
        if (offer.status != Status.ACTIVE) revert OfferNotActive();
        if (offer.expirationTimestamp < block.timestamp) revert OfferExpired();

        // Check offeror's balance and allowance (only for ERC20, ETH is already escrowed)
        if (offer.currency != address(0)) {
            IERC20 currency = IERC20(offer.currency);
            if (currency.balanceOf(offer.offeror) < offer.totalPrice) revert InsufficientCurrencyBalance();
            if (currency.allowance(offer.offeror, address(this)) < offer.totalPrice) revert InsufficientCurrencyAllowance();
        }

        // Check NFT ownership and approval (CEI pattern - Checks)
        if (offer.tokenType == TokenType.ERC721) {
            IERC721 nft = IERC721(offer.assetContract);
            if (nft.ownerOf(offer.tokenId) != msg.sender) revert NotOwnerOfNFT();
            if (!nft.isApprovedForAll(msg.sender, address(this)) && nft.getApproved(offer.tokenId) != address(this))
                revert MarketplaceNotApprovedForNFT();
        } else {
            IERC1155 nft = IERC1155(offer.assetContract);
            if (nft.balanceOf(msg.sender, offer.tokenId) < offer.quantity) revert InsufficientNFTBalance();
            if (!nft.isApprovedForAll(msg.sender, address(this))) revert MarketplaceNotApprovedForNFT();
        }

        // Calculate fee and sellerAmount
        uint256 platformFee = (offer.totalPrice * s.coreStorage.feePercentage) / BASIS_POINTS;
        uint256 sellerAmount = offer.totalPrice - platformFee;

        // Update state before external calls (CEI pattern - Effects)
        offer.status = Status.COMPLETED;

        // Transfer NFT to offeror (CEI pattern - Interactions)
        if (offer.tokenType == TokenType.ERC721) {
            IERC721(offer.assetContract).safeTransferFrom(msg.sender, offer.offeror, offer.tokenId);
        } else {
            IERC1155(offer.assetContract).safeTransferFrom(msg.sender, offer.offeror, offer.tokenId, offer.quantity, "");
        }

        // Handle payment based on currency type
        if (offer.currency == address(0)) {
            // Native Token (ETH) - ETH is already escrowed in contract
            if (msg.value != 0) revert IncorrectTotalPrice(0, msg.value);

            // Accumulate fee
            s.feeData.accumulatedFees[offer.currency] += platformFee;

            // Transfer sellerAmount from contract to asset owner (msg.sender)
            (bool success, ) = msg.sender.call{value: sellerAmount}("");
            if (!success) revert ETHWithdrawalFailed();
        } else {
            // ERC20 Token
            if (msg.value != 0) revert IncorrectTotalPrice(0, msg.value);

            IERC20 currency = IERC20(offer.currency);

            // Accumulate fee
            s.feeData.accumulatedFees[offer.currency] += platformFee;

            // Transfer sellerAmount to asset owner (msg.sender)
            if (!currency.transferFrom(offer.offeror, msg.sender, sellerAmount)) revert FeeWithdrawalFailed();

            // Transfer fee to contract
            if (platformFee > 0) {
                if (!currency.transferFrom(offer.offeror, address(this), platformFee)) revert FeeWithdrawalFailed();
            }
        }

        emit OfferAccepted(
            offer.offerId,
            offer.offeror,
            msg.sender,
            offer.assetContract,
            offer.tokenId,
            offer.quantity,
            offer.currency,
            offer.totalPrice
        );
    }

    // ============= VIEW FUNCTIONS =============
    function totalOffers() external view returns (uint256) {
        return _offerStorage().coreStorage.offerIdCounter;
    }

    function getOffer(uint256 offerId) external view returns (Offer memory offer) {
        OfferStorage storage s = _offerStorage();
        if (offerId == 0 || offerId > s.coreStorage.offerIdCounter) revert OfferIdOutOfRange();
        return s.offerData.offers[offerId];
    }

    function getAllOffers(uint256 startId, uint256 endId) external view returns (Offer[] memory offers) {
        OfferStorage storage s = _offerStorage();
        if (startId > endId) revert InvalidRange();
        if (endId > s.coreStorage.offerIdCounter) revert OfferIdOutOfRange();

        uint256 length = endId - startId + 1;
        offers = new Offer[](length);

        for (uint256 i = 0; i < length; i++) {
            offers[i] = s.offerData.offers[startId + i];
        }

        return offers;
    }

    function getAllValidOffers(uint256 startId, uint256 endId) external view returns (Offer[] memory offers) {
        OfferStorage storage s = _offerStorage();
        if (startId > endId) revert InvalidRange();
        if (endId > s.coreStorage.offerIdCounter) revert OfferIdOutOfRange();

        uint256 validCount = 0;
        for (uint256 i = startId; i <= endId; i++) {
            Offer memory offer = s.offerData.offers[i];
            if (_isOfferValid(offer)) {
                validCount++;
            }
        }

        offers = new Offer[](validCount);

        uint256 currentIndex = 0;
        for (uint256 i = startId; i <= endId; i++) {
            Offer memory offer = s.offerData.offers[i];
            if (_isOfferValid(offer)) {
                offers[currentIndex] = offer;
                currentIndex++;
            }
        }

        return offers;
    }

    function _isOfferValid(Offer memory offer) internal view returns (bool) {
        if (offer.status != Status.ACTIVE || offer.expirationTimestamp < block.timestamp) {
            return false;
        }

        // For Native Token (ETH), funds are already escrowed, so always valid if status is ACTIVE
        if (offer.currency == address(0)) {
            return true;
        }

        // For ERC20, check balance and allowance
        IERC20 currency = IERC20(offer.currency);
        return (currency.balanceOf(offer.offeror) >= offer.totalPrice &&
            currency.allowance(offer.offeror, address(this)) >= offer.totalPrice);
    }

    function permissions() external view returns (address) {
        return address(_offerStorage().coreStorage.permissions);
    }

    function feeRecipient() external view returns (address) {
        return _offerStorage().coreStorage.feeRecipient;
    }

    function feePercentage() external view returns (uint256) {
        return _offerStorage().coreStorage.feePercentage;
    }

    function offerAccumulatedFees(address currency) external view returns (uint256) {
        return _offerStorage().feeData.accumulatedFees[currency];
    }

    // ============= ADMIN FUNCTIONS =============
    function setFeeRecipient(address _feeRecipient) external {
        OfferStorage storage s = _offerStorage();
        if (!s.coreStorage.permissions.hasRole(MANAGEMENT_ROLE(), msg.sender)) revert CallerDoesNotHaveManagementRole();
        if (_feeRecipient == address(0)) revert ZeroAddress();
        s.coreStorage.feeRecipient = _feeRecipient;
    }

    function setFeePercentage(uint256 _feePercentage) external {
        OfferStorage storage s = _offerStorage();
        if (!s.coreStorage.permissions.hasRole(MANAGEMENT_ROLE(), msg.sender)) revert CallerDoesNotHaveManagementRole();
        require(_feePercentage <= 1000, "Fee too high");
        s.coreStorage.feePercentage = _feePercentage;
    }

    function withdrawOfferFees(address currency) external {
        OfferStorage storage s = _offerStorage();
        if (!s.coreStorage.permissions.hasRole(MANAGEMENT_ROLE(), msg.sender)) revert CallerDoesNotHaveManagementRole();

        uint256 amount = s.feeData.accumulatedFees[currency];
        if (amount == 0) revert NoFeesToWithdraw();

        // Reset to 0 before transfer (CEI pattern - Checks-Effects-Interactions)
        s.feeData.accumulatedFees[currency] = 0;

        if (currency == address(0)) {
            // Native Token (ETH)
            (bool success, ) = msg.sender.call{value: amount}("");
            if (!success) revert ETHWithdrawalFailed();
        } else {
            // ERC20 Token
            if (!IERC20(currency).transfer(msg.sender, amount)) revert FeeWithdrawalFailed();
        }

        emit FeeWithdrawn(msg.sender, currency, amount);
    }

    receive() external payable {}
}
