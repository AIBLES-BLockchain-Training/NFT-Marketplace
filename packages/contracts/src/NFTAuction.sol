// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC1155";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract NFTAuction is IERC721Receiver {
    // enum AuctionStatus
    enum AuctionStatus {
        Created, // Created: when auction is created
        Active, // Active: when auction has bidder
        Cancelled // Cancelled by seller
        Ended // Ended: when auction is ended
    }
    // enum token type
    enum TokenType {
        ERC721,
        ERC1155
    }

    struct Auction {
        uint256 id; // Auction ID
        address auctionCreator; // Seller address
        address assetContract; // NFT address
        uint256 tokenId; // Token ID
        uint256 startPrice;
        uint256 ceilingPrice; // Ceiling Price
        uint256 startTime; // uint ms
        uint256 endTime;
        uint256 timeBufferInSeconds; // Time buffer in seconds
        address highestBidder; // Highest bidder address
        uint256 highestBid; // Highest bid
        uint256 stepAmount; // Step amount 
        bool isPayoutCollected; // Is payout collected
        bool isTokenCollected; // Is token collected
        AuctionStatus status; // Auction status
        TokenType tokenType; // Token type
    }

    /*
     * timeBufferInSeconds: time can delay to bid after end time
    */
    struct AuctionParams {
        address _assetContract;
        uint256 _tokenId;   
        uint256 _quantity; // Quantity of NFTs
        address _currency; // Currency address for bidding (optional)
        uint256 _startPrice;
        uint256 _ceilingPrice;
        uint256 _stepAmount; // Step amount uinit %
        uint256 _timeBufferInSeconds; 
        uint256 _startTime;
        uint256 _endTime;
    }

    // total Auctions is created
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
    event BidPlaced(uint256 auctionId, address bidder, uint256 amount);

    // Auction Payout Collected is collected
    event AuctionPayoutCollected(uint256 auctionId, address auctionCreator, uint256 amount);

    // Auction Token Collected is collected
    event AuctionTokenCollected(uint256 auctionId, address bidder);

    // NFT Received
    event NFTReceived(address operator, address from, uint256 tokenId, bytes data);

    // modifier
    // check if auction exists
    modifier auctionExists(uint256 _auctionId) {
        require(_auctionId < totalAuctions, "Auction does not exist");
        _;
    }

    // check only seller
    modifier onlySeller(uint256 _auctionId) {
        require(auctions[_auctionId].auctionCreator == msg.sender, "Only seller can call this function");
        _;
    }

    // check auction active: bid?
    modifier isAuctionActive(uint256 _auctionId) {
        require(auctions[_auctionId].status == AuctionStatus.Active, "Auction is not active");
        _;
    }

    // onERC721Received function
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        emit NFTReceived(operator, from, tokenId, data);
        return this.onERC721Received.selector;
    }

    function checkEnsureNFTBalance(address _assetContract, uint256 _tokenId, uint256 _quantity, uint types) public view {
        if(types == 1) {
            require(IERC721(_assetContract).ownerOf(_tokenId) == msg.sender, "You are not owner of this NFT");
        } else {
            require(IERC1155(_assetContract).balanceOf(msg.sender, _tokenId) >= _quantity, "Insufficient NFT balance");
        }
    }

    // create auction
    function createAuction(AuctionParams memory _auctionParams) public {
        require(_auctionParams._quantity > 0, "Quantity should be greater than 0"); 
        require(_auctionParams._tokenId > 0, "Token ID should be greater than 0");
        require(_auctionParams._startPrice > 0, "Start price should be greater than 0");
        require(_auctionParams._ceilingPrice > _auctionParams._startPrice, "Ceiling price should be greater than start price");
        require(_auctionParams._timeBufferInSeconds > 0, "Time buffer should be greater than 0");
        require(_auctionParams._stepAmount > 0, "Step amount should be greater than 0"); // decimal and max step amount, 10000 == 100%
        require(_auctionParams._startTime < _auctionParams._endTime, "Start time should be less than end time");

        uint types = IERC165(_auctionParams._assetContract).supportsInterface(type(IERC721).interfaceId) ? 1 : 2;
        
        // Check if auction creator has enough NFT balance
        checkEnsureNFTBalance(_auctionParams._assetContract, _auctionParams._tokenId, _auctionParams._quantity);
        if(types == 1) {
            // Transfer NFT from seller to contract use safeTransferFrom for ERC721
            IERC721(_auctionParams._assetContract).safeTransferFrom(msg.sender, address(this), _auctionParams._tokenId);
        } else if(types == 2) {
            // Transfer NFT from seller to contract use safeTransferFrom for ERC1155
            IERC1155(_auctionParams._assetContract).safeTransferFrom(msg.sender, address(this), _auctionParams._tokenId, _auctionParams._quantity, "");
        }
  
        auctions[totalAuctions] = Auction({
            id: totalAuctions, 
            auctionCreator: payable(msg.sender),
            assetContract: _auctionParams._assetContract,
            tokenId: _auctionParams._tokenId,
            startPrice: _auctionParams._startPrice,
            ceilingPrice: _auctionParams._ceilingPrice,
            startTime: _auctionParams._startTime,             
            endTime: _auctionParams._endTime, 
            timeBufferInSeconds: _auctionParams._timeBufferInSeconds,
            highestBidder: address(0),
            highestBid: 0,
            stepAmount: _auctionParams._stepAmount,
            isPayoutCollected: false,
            isTokenCollected: false,
            status: AuctionStatus.Created,
            tokenType: if(types == 1) TokenType.ERC721 else TokenType.ERC1155
            //state ...
        });

        emit NewAuction(msg.sender, totalAuctions, _auctionParams._assetContract, auctions[totalAuctions]);
        totalAuctions++;
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
        return _bidAmount > auctions[_auctionId].highestBid + auctions[_auctionId].stepAmount;
    }

    // Read contract

    // bid in auction
    function bidInAuction(uint256 _auctionId, uint256 _bidAmount) public auctionExists(_auctionId) {
        require(!isAuctionExpired(_auctionId), "Auction is expired");
        require(_bidAmount > auctions[_auctionId].startPrice, "Bid amount should be greater than start price");
        require(msg.sender != auctions[_auctionId].highestBidder, "You are already highest bidder");
        require(msg.sender != auctions[_auctionId].auctionCreator, "auction creator can not bid in auction");
        require(isNewWinningBid(_auctionId, _bidAmount), "Bid amount should be greater than highest bid");

        bids[_auctionId][msg.sender] = _bidAmount; // Save bid amount

        // update highest bid and bidder
        auctions[_auctionId].highestBidder = msg.sender;
        auctions[_auctionId].highestBid = _bidAmount;

        auctions[_auctionId].status = AuctionStatus.Active;
        emit BidPlaced(_auctionId, msg.sender, _bidAmount);
    }

    // cancel auction
    function cancelAuction(uint256 _auctionId) public auctionExists(_auctionId) onlySeller(_auctionId) {
        require(!isAuctionExpired(_auctionId), "Auction is expired");
        require(auctions[_auctionId].status != AuctionStatus.Active, "Auction is active");
        require(auctions[_auctionId].status != AuctionStatus.Cancelled, "Auction is already cancelled");
        auctions[_auctionId].status = AuctionStatus.Cancelled;

        // Transfer NFT back to seller
        IERC721(auctions[_auctionId].assetContract).transferFrom(address(this), auctions[_auctionId].auctionCreator, auctions[_auctionId].tokenId);

        emit CancelledAuction(msg.sender, _auctionId);
    }

    // collect auction payout
    function collectAuctionPayout(uint256 _auctionId) public auctionExists(_auctionId) onlySeller(_auctionId) {
        require(isAuctionExpired(_auctionId), "Auction is not expired");
        require(!auctions[_auctionId].isPayoutCollected, "Payout already collected");

        auctions[_auctionId].isPayoutCollected = true;

        // Transfer payout to auction creator
        payable(msg.sender).transfer(auctions[_auctionId].highestBid);

        emit AuctionPayoutCollected(_auctionId, msg.sender, auctions[_auctionId].highestBid);
    }

    // collect auction token
    function collectAuctionToken(uint256 _auctionId) public auctionExists(_auctionId) {
        require(isAuctionExpired(_auctionId), "Auction is not expired");
        require(auctions[_auctionId].highestBidder == msg.sender, "Only winning bidder can collect token");
        require(!auctions[_auctionId].isTokenCollected, "Token already collected");

        auctions[_auctionId].isTokenCollected = true;

        // Transfer NFT to winning bidder
        IERC721(auctions[_auctionId].assetContract).transferFrom(address(this), msg.sender, auctions[_auctionId].tokenId);

        emit AuctionTokenCollected(_auctionId, msg.sender);
    }

}


/*
// check balance and allowance
// type NFT
// time buffer
 */
 