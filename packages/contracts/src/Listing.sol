// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

contract ListingContract is Ownable {
    uint256 public listingCounter;
    uint256 public fee;
    uint256 private accumulatedFee;

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

    struct Listing {
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

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => mapping(address => bool)) public buyerApprovals;
    mapping(uint256 => mapping(address => uint256)) public currencyApprovals;
    mapping(address => uint256[]) public userOwnedListings;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed owner,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 quantity
    );
    event BuyerApproved(uint256 indexed listingId, address indexed buyer, bool isApproved);
    event CurrencyApproved(uint256 indexed listingId, address indexed currency, uint256 price);
    event ListingUpdated(uint256 indexed listingId, uint256 newPrice, uint256 newQuantity);
    event ListingCancelled(uint256 indexed listingId);
    event NFTPurchased(uint256 indexed listingId, address indexed buyer, uint256 quantity, uint256 totalPrice);
    event FeeWithdrawn(address indexed admin, uint256 amount);

    constructor(address _owner) Ownable(_owner) {
        listingCounter = 0;
        fee = 0;
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

    modifier requiresFee() {
        require(msg.value == fee, "Insufficient fee");
        _;
    }

    function setFee(uint256 _fee) external onlyOwner {
        require(_fee > 0, "Fee must be greater than zero");
        fee = _fee;
    }

    function createListing(
        ListingParameters memory params
    ) external payable validParams(params) requiresFee returns (uint256 listingId) {

        TokenType tokenType = params.quantity == 1 ? TokenType.ERC721 : TokenType.ERC1155;

        checkSellerTokenOwnership(params.assetContract, tokenType, msg.sender, params.tokenId, params.quantity);
        checkSellerApproval(params.assetContract, tokenType, msg.sender, params.tokenId);

        listingCounter++;
        listingId = listingCounter;

        listings[listingId] = Listing({
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
        accumulatedFee += fee;

        emit ListingCreated(
            listingId,
            msg.sender,
            params.assetContract,
            params.tokenId,
            params.pricePerToken,
            params.quantity
        );
        return listingId;
    }

    function updateListing(
        uint256 listingId,
        ListingParameters memory params
    ) external payable validParams(params) listingExists(listingId) requiresFee {
        Listing storage listing = listings[listingId];

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

        accumulatedFee += fee;

        emit ListingUpdated(listingId, params.pricePerToken, params.quantity);
    }

    function cancelListing(uint256 listingId) external payable listingExists(listingId) requiresFee {
        Listing storage listing = listings[listingId];
        require(listing.owner == msg.sender, "Only owner can cancel listing");
        require(listing.status == Status.CREATED, "Listing must be in CREATED status");

        listing.status = Status.CANCELED;

        accumulatedFee += fee;

        emit ListingCancelled(listingId);
    }

    function approveBuyerForListing(
        uint256 listingId,
        address buyer,
        bool toApprove
    ) external listingExists(listingId) {
        Listing storage listing = listings[listingId];

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
        Listing storage listing = listings[listingId];

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
    ) external payable listingExists(listingId) requiresFee {
        Listing storage listing = listings[listingId];

        require(buyFor != address(0), "Invalid recipient address");
        require(block.timestamp <= listing.endTimestamp, "Listing ended");
        require(listing.status == Status.CREATED, "Listing is not available for purchase");
        require(quantity > 0 && quantity <= listing.quantity, "Invalid quantity");

        uint256 totalPrice = quantity * listing.pricePerToken;
        require(expectedTotalPrice == totalPrice, "Incorrect total price");

        uint256 priceInCurrency = currencyApprovals[listingId][currency];
        require(priceInCurrency > 0, "Currency not approved for this listing");

        checkSellerTokenOwnership(
            listing.assetContract,
            listing.tokenType,
            listing.owner,
            listing.tokenId,
            listing.quantity
        );
        checkSellerApproval(listing.assetContract, listing.tokenType, listing.owner, listing.tokenId);

        checkBuyerApproval(listingId, msg.sender);
        checkBuyerAllowance(currency, totalPrice);

        ensureCanReceiveToken(buyFor, listing.tokenId, quantity, listing.tokenType);

        listing.quantity -= quantity;

        if (listing.tokenType == TokenType.ERC721) {
            IERC721(listing.assetContract).safeTransferFrom(listing.owner, buyFor, listing.tokenId);
        } else if (listing.tokenType == TokenType.ERC1155) {
            IERC1155(listing.assetContract).safeTransferFrom(listing.owner, buyFor, listing.tokenId, quantity, "");
        }

        require(IERC20(currency).transferFrom(msg.sender, listing.owner, totalPrice), "Payment transfer failed");

        accumulatedFee += fee;

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
                require(response == IERC1155Receiver.onERC1155Received.selector, "Recipient cannot handle ERC1155 tokens");
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
        } else if (tokenType == TokenType.ERC1155) {
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
        } else if (tokenType == TokenType.ERC1155) {
            require(
                IERC1155(assetContract).isApprovedForAll(seller, address(this)),
                "Contract is not approved to manage the tokens"
            );
        }
    }

    function checkBuyerApproval(uint256 listingId, address buyer) internal view {
        Listing storage listing = listings[listingId];
        require(buyerApprovals[listingId][buyer] || !listing.reserved, "Buyer is not approved for this listing");
    }

    function checkBuyerAllowance(address currency, uint256 totalPrice) internal view {
        require(
            IERC20(currency).allowance(msg.sender, address(this)) >= totalPrice,
            "Buyer has not approved enough currency"
        );
    }

    function totalListings() external view returns (uint256) {
        return listingCounter;
    }

    function getAllListings(uint256 startId, uint256 endId) external view returns (Listing[] memory) {
        require(startId <= endId, "Invalid range");
        require(endId <= listingCounter, "End ID exceeds total listings");

        uint256 length = endId - startId + 1;
        Listing[] memory allListings = new Listing[](length);

        for (uint256 i = 0; i < length; i++) {
            uint256 listingId = startId + i;
            allListings[i] = listings[listingId];
        }

        return allListings;
    }

    function getAllValidListings(uint256 startId, uint256 endId) external view returns (Listing[] memory) {
        require(startId <= endId, "Invalid range");
        require(endId <= listingCounter, "End ID exceeds total listings");

        uint256 length = 0;

        for (uint256 i = startId; i <= endId; i++) {
            if (listings[i].status == Status.CREATED) {
                length++;
            }
        }

        Listing[] memory validListings = new Listing[](length);
        uint256 index = 0;

        for (uint256 i = startId; i <= endId; i++) {
            if (listings[i].status == Status.CREATED) {
                validListings[index] = listings[i];
                index++;
            }
        }

        return validListings;
    }

    function getListing(uint256 listingId) external view listingExists(listingId) returns (Listing memory) {
        return listings[listingId];
    }

    function getUserOwnedListings(address user) external view returns (uint256[] memory) {
        return userOwnedListings[user];
    }

    function withdrawFee(address to, uint256 amount) external onlyOwner {
        require(amount <= accumulatedFee, "Insufficient fee balance");
        accumulatedFee -= amount;
        require(IERC20(address(this)).transfer(to, amount), "Fee withdrawal failed");
        emit FeeWithdrawn(to, amount);
    }
}
