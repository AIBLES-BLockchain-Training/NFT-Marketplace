// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

contract Listing is Ownable {
    uint256 public listingCounter;

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

    mapping(uint256 => NFTListing) public listings;
    mapping(uint256 => mapping(address => bool)) public buyerApprovals;
    mapping(uint256 => mapping(address => uint256)) public currencyApprovals;
    mapping(address => uint256[]) public userOwnedListings;
    mapping(address => uint256) public currencyFees;
    mapping(address => uint256) public accumulatedFees;

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
    event BuyerApproved(uint256 indexed listingId, address indexed buyer, bool isApproved);
    event CurrencyApproved(uint256 indexed listingId, address indexed currency, uint256 price);
    event ListingCancelled(uint256 indexed listingId);
    event NFTPurchased(uint256 indexed listingId, address indexed buyer, uint256 quantity, uint256 totalPrice);
    event FeeWithdrawn(address indexed admin, address indexed currency, uint256 amount);
    event CurrencyFeeUpdated(address indexed currency, uint256 fee);

    constructor(address _owner) Ownable(_owner) {
        listingCounter = 0;
    }

    modifier validParams(ListingParameters memory params) {
        require(params.assetContract != address(0), "Invalid asset contract address");
        require(params.quantity > 0, "Quantity must be greater than zero");
        require(params.startTimestamp < params.endTimestamp, "Invalid timestamps");
        require(params.pricePerToken > 0, "Price per token must be greater than zero");
        require(params.startTimestamp >= block.timestamp, "Start time must be in the future");
        _;
    }

    modifier listingExists(uint256 listingId) {
        require(listings[listingId].status != Status.UNSET, "Listing does not exist");
        _;
    }

    modifier validRange(uint256 startId, uint256 endId) {
        require(startId <= endId, "Invalid range");
        require(endId <= listingCounter, "End ID exceeds total listings");
        _;
    }

    function setCurrencyFee(address currency, uint256 fee) external onlyOwner {
        require(currency != address(0), "Invalid currency address");
        require(fee > 0 && fee <= 10000, "Fee must be between 0 and 10000 (100%)");
        currencyFees[currency] = fee;

        emit CurrencyFeeUpdated(currency, fee);
    }

    function createListing(ListingParameters memory params) external validParams(params) returns (uint256 listingId) {
        TokenType tokenType = getTokenType(params.assetContract);

        checkSellerTokenOwnership(params.assetContract, tokenType, msg.sender, params.tokenId, params.quantity);
        checkSellerApproval(params.assetContract, tokenType, msg.sender, params.tokenId);

        listingId = listingCounter;

        listings[listingId] = NFTListing({
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

        userOwnedListings[msg.sender].push(params.tokenId);
        listingCounter++;

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
        return listingId;
    }

    function getTokenType(address assetContract) internal view returns (TokenType) {
        IERC165 contractInstance = IERC165(assetContract);
        if (contractInstance.supportsInterface(0x80ac58cd)) {
            return TokenType.ERC721;
        }
        if (contractInstance.supportsInterface(0xd9b67a26)) {
            return TokenType.ERC1155;
        }
    }

    function updateListing(
        uint256 listingId,
        ListingParameters memory params
    ) external validParams(params) listingExists(listingId) {
        NFTListing storage listing = listings[listingId];

        require(listing.owner == msg.sender, "Only owner can update listing");
        require(listing.status == Status.CREATED, "Listing must be in CREATED status");

        listing.assetContract = params.assetContract;
        listing.tokenId = params.tokenId;
        listing.quantity = params.quantity;
        listing.currency = params.currency;
        listing.pricePerToken = params.pricePerToken;
        listing.startTimestamp = params.startTimestamp;
        listing.endTimestamp = params.endTimestamp;
        listing.reserved = params.reserved;

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
    }

    function cancelListing(uint256 listingId) external payable listingExists(listingId) {
        NFTListing storage listing = listings[listingId];
        require(listing.owner == msg.sender, "Only owner can cancel listing");
        require(listing.status == Status.CREATED, "Listing must be in CREATED status");

        listing.status = Status.CANCELED;

        emit ListingCancelled(listingId);
    }

    function approveBuyerForListing(
        uint256 listingId,
        address buyer,
        bool toApprove
    ) external listingExists(listingId) {
        NFTListing storage listing = listings[listingId];

        require(listing.owner == msg.sender, "Only owner can approve currency");
        require(listing.status == Status.CREATED, "Listing must be in CREATED status");
        require(listing.reserved, "Listing is not reserved");

        buyerApprovals[listingId][buyer] = toApprove;

        emit BuyerApproved(listingId, buyer, toApprove);
    }

    function approveCurrencyForListing(
        uint256 listingId,
        address currency,
        uint256 pricePerTokenInCurrency
    ) external listingExists(listingId) {
        NFTListing storage listing = listings[listingId];

        require(listing.owner == msg.sender, "Only owner can approve buyers");
        require(listing.status == Status.CREATED, "Listing must be in CREATED status");

        if (pricePerTokenInCurrency > 0) {
            currencyApprovals[listingId][currency] = pricePerTokenInCurrency;
        } else {
            delete currencyApprovals[listingId][currency];
        }

        emit CurrencyApproved(listingId, currency, pricePerTokenInCurrency);
    }

    function buyFromListing(
        uint256 listingId,
        address buyFor,
        uint256 quantity,
        address currency,
        uint256 expectedTotalPrice
    ) external listingExists(listingId) {
        NFTListing storage listing = listings[listingId];

        require(buyFor != address(0), "Invalid recipient address");
        require(block.timestamp <= listing.endTimestamp, "Listing ended");
        require(listing.status == Status.CREATED, "Listing is not available for purchase");
        require(quantity > 0 && quantity <= listing.quantity, "Invalid quantity");

        uint256 priceInCurrency = currencyApprovals[listingId][currency];
        require(priceInCurrency > 0, "Currency not approved for this listing");

        uint256 totalPrice = quantity * listing.pricePerToken;
        require(expectedTotalPrice == totalPrice, "Incorrect total price");

        checkSellerTokenOwnership(
            listing.assetContract,
            listing.tokenType,
            listing.owner,
            listing.tokenId,
            listing.quantity
        );
        checkSellerApproval(listing.assetContract, listing.tokenType, listing.owner, listing.tokenId);

        checkBuyerApproval(listingId, msg.sender);
        checkBuyerBalance(msg.sender, currency, totalPrice);
        checkBuyerAllowance(currency, totalPrice);

        ensureCanReceiveToken(buyFor, listing.tokenId, quantity, listing.tokenType);

        listing.quantity -= quantity;

        if (listing.tokenType == TokenType.ERC721) {
            IERC721(listing.assetContract).safeTransferFrom(listing.owner, buyFor, listing.tokenId);
        }
        if (listing.tokenType == TokenType.ERC1155) {
            IERC1155(listing.assetContract).safeTransferFrom(listing.owner, buyFor, listing.tokenId, quantity, "");
        }

        uint256 fee = (totalPrice * getCurrencyFee(currency)) / 10000;
        uint256 sellerAmount = totalPrice - fee;

        accumulatedFees[currency] += fee;

        require(IERC20(currency).transferFrom(msg.sender, listing.owner, sellerAmount), "Payment transfer failed");
        require(IERC20(currency).transferFrom(msg.sender, address(this), fee), "Fee transfer failed");

        emit NFTPurchased(listingId, buyFor, quantity, totalPrice);

        if (listing.quantity == 0) {
            listing.status = Status.COMPLETED;
        }
    }

    function ensureCanReceiveToken(address recipient, uint256 tokenId, uint256 quantity, TokenType tokenType) internal {
        if (!_isContract(recipient)) {
            return;
        }

        if (tokenType == TokenType.ERC721) {
            require(
                IERC165(recipient).supportsInterface(type(IERC721Receiver).interfaceId),
                "Recipient does not support ERC721Receiver interface"
            );
            try IERC721Receiver(recipient).onERC721Received(address(this), msg.sender, tokenId, "") returns (
                bytes4 response
            ) {
                require(response == IERC721Receiver.onERC721Received.selector, "Recipient cannot handle ERC721 tokens");
            } catch {
                revert("Recipient contract cannot handle ERC721 tokens");
            }
        } else if (tokenType == TokenType.ERC1155) {
            require(
                IERC165(recipient).supportsInterface(type(IERC1155Receiver).interfaceId),
                "Recipient does not support ERC1155Receiver interface"
            );
            try
                IERC1155Receiver(recipient).onERC1155Received(address(this), msg.sender, tokenId, quantity, "")
            returns (bytes4 response) {
                require(
                    response == IERC1155Receiver.onERC1155Received.selector,
                    "Recipient cannot handle ERC1155 tokens"
                );
            } catch {
                revert("Recipient contract cannot handle ERC1155 tokens");
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

    function checkSellerTokenOwnership(
        address assetContract,
        TokenType tokenType,
        address seller,
        uint256 tokenId,
        uint256 quantity
    ) internal view {
        if (tokenType == TokenType.ERC721) {
            require(IERC721(assetContract).ownerOf(tokenId) == seller, "Seller no longer owns the token");
        }
        if (tokenType == TokenType.ERC1155) {
            uint256 sellerBalance = IERC1155(assetContract).balanceOf(seller, tokenId);
            require(sellerBalance >= quantity, "Seller does not have enough tokens");
        }
    }

    function checkSellerApproval(
        address assetContract,
        TokenType tokenType,
        address seller,
        uint256 tokenId
    ) internal view {
        if (tokenType == TokenType.ERC721) {
            require(
                IERC721(assetContract).isApprovedForAll(seller, address(this)) ||
                    IERC721(assetContract).getApproved(tokenId) == address(this),
                "Contract is not approved to manage the token"
            );
        }
        if (tokenType == TokenType.ERC1155) {
            require(
                IERC1155(assetContract).isApprovedForAll(seller, address(this)),
                "Contract is not approved to manage the tokens"
            );
        }
    }

    function checkBuyerApproval(uint256 listingId, address buyer) internal view {
        NFTListing storage listing = listings[listingId];
        require(buyerApprovals[listingId][buyer] || !listing.reserved, "Buyer is not approved for this listing");
    }

    function checkBuyerAllowance(address currency, uint256 totalPrice) internal view {
        require(
            IERC20(currency).allowance(msg.sender, address(this)) >= totalPrice,
            "Buyer has not approved enough currency"
        );
    }

    function checkBuyerBalance(address buyer, address currency, uint256 totalPrice) public view {
        uint256 availableBalance = IERC20(currency).balanceOf(buyer);
        require(availableBalance >= totalPrice, "Insufficient balance");
    }

    function totalListings() external view returns (uint256) {
        return listingCounter;
    }

    function getAllListings(
        uint256 startId,
        uint256 endId
    ) external view validRange(startId, endId) returns (NFTListing[] memory) {
        uint256 length = endId - startId + 1;
        NFTListing[] memory allListings = new NFTListing[](length);

        for (uint256 i = 0; i < length; i++) {
            uint256 listingId = startId + i;
            allListings[i] = listings[listingId];
        }

        return allListings;
    }

    function getAllValidListings(
        uint256 startId,
        uint256 endId
    ) external view validRange(startId, endId) returns (NFTListing[] memory) {
        uint256 length = 0;

        for (uint256 i = startId; i <= endId; i++) {
            if (listings[i].status == Status.CREATED) {
                length++;
            }
        }

        NFTListing[] memory validListings = new NFTListing[](length);
        uint256 index = 0;

        for (uint256 i = startId; i <= endId; i++) {
            if (listings[i].status == Status.CREATED) {
                validListings[index] = listings[i];
                index++;
            }
        }

        return validListings;
    }

    function getListing(uint256 listingId) external view listingExists(listingId) returns (NFTListing memory) {
        return listings[listingId];
    }

    function getUserOwnedListings(address user) external view returns (uint256[] memory) {
        return userOwnedListings[user];
    }

    function getCurrencyFee(address currency) public view returns (uint256) {
        uint256 currencyFee = currencyFees[currency];
        require(currencyFee > 0, "Currency fee must be greater than 0");

        return currencyFee;
    }

    function withdrawFees(address currency) external onlyOwner {
        uint256 amount = accumulatedFees[currency];
        require(amount > 0, "No fees to withdraw");
        accumulatedFees[currency] = 0;

        require(IERC20(currency).transfer(msg.sender, amount), "Fee withdrawal failed");

        emit FeeWithdrawn(msg.sender, currency, amount);
    }
}
