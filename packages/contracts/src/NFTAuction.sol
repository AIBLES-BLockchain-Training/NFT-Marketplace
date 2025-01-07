// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract NFTAuction {
    // enum AuctionStatus
    enum AuctionStatus {
        Created, // Created
        Active, // Active
        Ended, // Ended
        Cancelled // Cancelled
    }

    struct Auction {
        uint256 id; // Auction ID
        address seller; // Seller address
        address nftAddress; // NFT address
        uint256 tokenId; // Token ID
        uint256 startPrice;
        uint256 ceilingPrice; // Ceiling Price
        uint256 startTime;
        uint256 endTime;
        address highestBidder; // Highest bidder address
        uint256 highestBid; // Highest bid
        bool isPayoutCollected; // Is payout collected
        bool isTokenCollected; // Is token collected
        AuctionStatus status; // Auction status
    }

    struct Params {
        uint256 startPrice;
        uint256 startTime;
        uint256 endTime;
    }

    // total Auctions
    uint256 public totalAuctions;

    // map Auctions
    mapping(uint256 auctionId => Auction) private auctions;

    // map check bid amount in a auction
    mapping(uint256 auctionId => mapping(address => uint256)) public bids;

    // event Auction Created
    event NewAuction(address auctionCreator, uint256 auctionId, address assetContract, Auction auction);

    event AuctionCloser(
        uint256 auctionId,
        address assetContract,
        address closer,
        uint256 tokenId,
        address auctionCreater,
        address winningBidder
    );

    // Auction Cancelled
    event CancelledAuction(address auctionCreator, uint256 auctionId);

    // Bid Placed
    event BidPlaced(uint256 id, address bidder, uint256 amount);

    // Auction Payout Collected
    event AuctionPayoutCollected(uint256 id, address bidder, uint256 amount);

    // Auction Token Collected
    event AuctionTokenCollected(uint256 id, address bidder);

    // modifier
    // check if auction exists
    modifier auctionExists(uint256 _auctionId) {
        require(_auctionId < totalAuctions, "Auction does not exist");
        _;
    }

    // check only seller
    modifier onlySeller(uint256 _auctionId) {
        require(auctions[_auctionId].seller == msg.sender, "Only seller can call this function");
        _;
    }

    // check auction active: bid?
    modifier isAuctionActive(uint256 _auctionId) {
        require(auctions[_auctionId].status == AuctionStatus.Active, "Auction is not active");
        _;
    }

    // function
    // get data of a auction
    function getAuction(uint256 _auctionId) public view auctionExists(_auctionId) returns (Auction memory) {
        return auctions[_auctionId];
    }

    // get all auctions
    function getAllAuctions(uint256 _startId, uint256 _endId) public view returns (Auction[] memory) {
        require(_startId < _endId && _endId <= totalAuctions, "Invalid range"); // Check range validity
        Auction[] memory _auctions = new Auction[](_endId - _startId);
        for (uint256 i = _startId; i < _endId; i++) {
            _auctions[i - _startId] = auctions[i];
        }
        return _auctions;
    }

    // get all valid auctions
    function getAllValidAuctions(uint256 _startId, uint256 _endId) public view returns (Auction[] memory) {
        require(_startId < _endId && _endId <= totalAuctions, "Invalid range"); // Check range validity
        Auction[] memory _auctions = new Auction[](_endId - _startId);
        uint256 j = 0;
        for (uint256 i = _startId; i < _endId; i++) {
            // Check if auction is active and not expired
            if (auctions[i].status == AuctionStatus.Active && !isAuctionExpired(i)) {
                _auctions[j] = auctions[i];
                j++;
            }
        }
        return _auctions;
    }

    // get new winnig bid
    function getNewWinningBid(uint256 _auctionId) public view auctionExists(_auctionId) returns (address, uint256) {
        return (
            auctions[_auctionId].highestBidder, // Winning bidder
            auctions[_auctionId].highestBid // Winning bid
        );
    }

    // get auction is expired
    function isAuctionExpired(uint256 _auctionId) public view auctionExists(_auctionId) returns (bool) {
        return block.timestamp > auctions[_auctionId].endTime;
    }

    // check bid is new winning bid
    function isNewWinningBid(
        uint256 _auctionId,
        uint256 _bidAmount
    ) public view auctionExists(_auctionId) returns (bool) {
        return _bidAmount > auctions[_auctionId].highestBid;
    }

    // Read contract
}
