// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IPermissions.sol";

contract NFTOffer is ReentrancyGuard {
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

    // Storage
    mapping(uint256 => Offer) private _offers;
    uint256 private _offerIdCounter;

    address public feeRecipient;
    uint256 public feePercentage;
    uint256 private constant BASIS_POINTS = 10000;

    IPermission public permissions;

    // Errors
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

    // Events
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

    constructor(address _feeRecipient, uint256 _feePercentage, address _permissions) {
        if (_feeRecipient == address(0)) revert ZeroAddress();
        if (_permissions == address(0)) revert ZeroAddress();
        require(_feePercentage <= 1000, "Fee too high");

        feeRecipient = _feeRecipient;
        feePercentage = _feePercentage;
        permissions = IPermission(_permissions);
    }

    modifier onlyOfferRole() {
        if (!permissions.hasRole(OFFER_ROLE(), msg.sender)) revert CallerDoesNotHaveOfferRole();
        _;
    }

    function makeOffer(OfferParams memory params) external nonReentrant onlyOfferRole returns (uint256 offerId) {
        if (!permissions.hasRole(NFT_ROLE(), params.assetContract)) revert NFTNotWhitelisted();

        if (!permissions.supportedCurrencies(params.currency)) revert CurrencyNotSupported();

        if (params.quantity == 0) revert ZeroQuantity();
        if (params.totalPrice == 0) revert ZeroPrice();
        if (params.expirationTimestamp <= block.timestamp) revert InvalidExpirationTimestamp();

        TokenType tokenType;
        try IERC721(params.assetContract).supportsInterface(type(IERC721).interfaceId) returns (bool isERC721) {
            if (isERC721) {
                tokenType = TokenType.ERC721;
                if (params.quantity != 1) revert QuantityMustBeOne();
            } else {
                // Check if it's ERC1155
                bool isERC1155 = IERC1155(params.assetContract).supportsInterface(type(IERC1155).interfaceId);
                if (!isERC1155) revert AssetMustBeERC721OrERC1155();
                tokenType = TokenType.ERC1155;
            }
        } catch {
            revert AssetMustBeERC721OrERC1155();
        }

        IERC20 currency = IERC20(params.currency);
        if (currency.balanceOf(msg.sender) < params.totalPrice) revert InsufficientCurrencyBalance();
        if (currency.allowance(msg.sender, address(this)) < params.totalPrice) revert InsufficientCurrencyAllowance();

        _offerIdCounter++;
        offerId = _offerIdCounter;

        _offers[offerId] = Offer({
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
        Offer storage offer = _offers[offerId];

        if (offer.offerId != offerId) revert OfferDoesNotExist();
        if (offer.offeror != msg.sender) revert NotOfferor();
        if (offer.status != Status.ACTIVE) revert OfferNotActive();

        offer.status = Status.CANCELLED;

        emit OfferCancelled(offerId, msg.sender);
    }

    function acceptOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = _offers[offerId];

        if (offer.offerId != offerId) revert OfferDoesNotExist();
        if (offer.status != Status.ACTIVE) revert OfferNotActive();
        if (offer.expirationTimestamp < block.timestamp) revert OfferExpired();

        IERC20 currency = IERC20(offer.currency);
        if (currency.balanceOf(offer.offeror) < offer.totalPrice) revert InsufficientCurrencyBalance();
        if (currency.allowance(offer.offeror, address(this)) < offer.totalPrice) revert InsufficientCurrencyAllowance();

        if (offer.tokenType == TokenType.ERC721) {
            IERC721 nft = IERC721(offer.assetContract);
            if (nft.ownerOf(offer.tokenId) != msg.sender) revert NotOwnerOfNFT();
            if (!nft.isApprovedForAll(msg.sender, address(this)) && nft.getApproved(offer.tokenId) != address(this))
                revert MarketplaceNotApprovedForNFT();

            nft.safeTransferFrom(msg.sender, offer.offeror, offer.tokenId);
        } else {
            IERC1155 nft = IERC1155(offer.assetContract);
            if (nft.balanceOf(msg.sender, offer.tokenId) < offer.quantity) revert InsufficientNFTBalance();
            if (!nft.isApprovedForAll(msg.sender, address(this))) revert MarketplaceNotApprovedForNFT();

            nft.safeTransferFrom(msg.sender, offer.offeror, offer.tokenId, offer.quantity, "");
        }

        uint256 platformFee = (offer.totalPrice * feePercentage) / BASIS_POINTS;
        uint256 sellerAmount = offer.totalPrice - platformFee;

        if (platformFee > 0) {
            currency.transferFrom(offer.offeror, feeRecipient, platformFee);
        }
        currency.transferFrom(offer.offeror, msg.sender, sellerAmount);

        offer.status = Status.COMPLETED;

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

    function totalOffers() external view returns (uint256) {
        return _offerIdCounter;
    }

    function getOffer(uint256 offerId) external view returns (Offer memory offer) {
        if (offerId == 0 || offerId > _offerIdCounter) revert OfferIdOutOfRange();
        return _offers[offerId];
    }

    function getAllOffers(uint256 startId, uint256 endId) external view returns (Offer[] memory offers) {
        if (startId > endId) revert InvalidRange();
        if (endId > _offerIdCounter) revert OfferIdOutOfRange();

        uint256 length = endId - startId + 1;
        offers = new Offer[](length);

        for (uint256 i = 0; i < length; i++) {
            offers[i] = _offers[startId + i];
        }

        return offers;
    }

    function getAllValidOffers(uint256 startId, uint256 endId) external view returns (Offer[] memory offers) {
        if (startId > endId) revert InvalidRange();
        if (endId > _offerIdCounter) revert OfferIdOutOfRange();

        // First, count valid offers
        uint256 validCount = 0;
        for (uint256 i = startId; i <= endId; i++) {
            Offer memory offer = _offers[i];
            if (isOfferValid(offer)) {
                validCount++;
            }
        }

        offers = new Offer[](validCount);

        uint256 currentIndex = 0;
        for (uint256 i = startId; i <= endId; i++) {
            Offer memory offer = _offers[i];
            if (isOfferValid(offer)) {
                offers[currentIndex] = offer;
                currentIndex++;
            }
        }

        return offers;
    }

    function isOfferValid(Offer memory offer) internal view returns (bool) {
        if (offer.status != Status.ACTIVE || offer.expirationTimestamp < block.timestamp) {
            return false;
        }

        IERC20 currency = IERC20(offer.currency);
        return (currency.balanceOf(offer.offeror) >= offer.totalPrice &&
            currency.allowance(offer.offeror, address(this)) >= offer.totalPrice);
    }

    // Admin functions
    function setFeeRecipient(address _feeRecipient) external {
        if (!permissions.hasRole(MANAGEMENT_ROLE(), msg.sender)) revert CallerDoesNotHaveManagementRole();

        if (_feeRecipient == address(0)) revert ZeroAddress();
        feeRecipient = _feeRecipient;
    }

    function setFeePercentage(uint256 _feePercentage) external {
        if (!permissions.hasRole(MANAGEMENT_ROLE(), msg.sender)) revert CallerDoesNotHaveManagementRole();
        require(_feePercentage <= 1000, "Fee too high");
        feePercentage = _feePercentage;
    }
}

