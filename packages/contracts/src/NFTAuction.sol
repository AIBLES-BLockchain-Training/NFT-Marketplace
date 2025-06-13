// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./IPermissions.sol";

contract NFTAuction is IERC721Receiver, ERC1155Holder {
    // Permissions contract address
    IPermission public permissionsContract;
    bytes32 public constant AUCTION_ROLE = keccak256("AUCTION_ROLE");

    // enum AuctionStatus
    enum AuctionStatus {
        CREATED, // Created: when auction is created
        ACTIVE, // Active: when auction has bidder
        CANCELLED, // Cancelled by seller
        ENDED // Ended: when auction is ended
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
        uint256 quantity; // Quantity of NFTs
        address currency; // Currency address for bidding (optional)
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
        uint256 _stepAmount; // Step amount uinit % same 50/10000 is 0.5%
        uint256 _timeBufferInSeconds;
        uint256 _startTime;
        uint256 _endTime;
    }

    // total Auctions is created
    uint256 public totalAuctions;

    // map Auctions
    mapping(uint256 auctionId => Auction) public auctions;

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

    // check is creator of auction
    modifier onlyCreator(uint256 _auctionId) {
        require(auctions[_auctionId].auctionCreator == msg.sender, "You are not creator of this auction");
        _;
    }

    // check if caller is auctioneer
    modifier onlyAuctioneer() {
        require(
            permissionsContract.hasRole(AUCTION_ROLE, msg.sender),
            "Auction: Caller does not have the auction role"
        );
        _;
    }

    constructor(address _permissionsContract) {
        permissionsContract = IPermission(_permissionsContract);
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

    function checkEnsureNFTBalance(
        address _assetContract,
        uint256 _tokenId,
        uint256 _quantity,
        uint types
    ) private view {
        if (types == 1) {
            require(IERC721(_assetContract).ownerOf(_tokenId) == msg.sender, "You are not owner of this NFT");
        } else {
            require(IERC1155(_assetContract).balanceOf(msg.sender, _tokenId) >= _quantity, "Insufficient NFT balance");
        }
    }

    // create auction
    function createAuction(AuctionParams memory _auctionParams) external onlyAuctioneer {
        require(_auctionParams._quantity > 0, "Quantity should be greater than 0");
        require(_auctionParams._tokenId > 0, "Token ID should be greater than 0");
        require(_auctionParams._startPrice > 0, "Start price should be greater than 0");
        require(
            _auctionParams._ceilingPrice > _auctionParams._startPrice,
            "Ceiling price should be greater than start price"
        );
        require(_auctionParams._timeBufferInSeconds > 0, "Time buffer should be greater than 0");
        require(_auctionParams._stepAmount > 0, "Step amount should be greater than 0"); // decimal and max step amount, 10000 == 100%
        require(_auctionParams._startTime < _auctionParams._endTime, "Start time should be less than end time");

        uint types = IERC165(_auctionParams._assetContract).supportsInterface(type(IERC721).interfaceId) ? 1 : 2;

        // Check if auction creator has enough NFT balance
        checkEnsureNFTBalance(_auctionParams._assetContract, _auctionParams._tokenId, _auctionParams._quantity, types);

        if (types == 1) {
            // Transfer NFT from seller to contract use safeTransferFrom for ERC721
            // require approval before transfer
            require(
                IERC721(_auctionParams._assetContract).getApproved(_auctionParams._tokenId) == address(this),
                "Contract should be approved to transfer NFT"
            );
            require(_auctionParams._quantity == 1, "Quantity should be 1 for ERC721");
            IERC721(_auctionParams._assetContract).safeTransferFrom(msg.sender, address(this), _auctionParams._tokenId);
        } else if (types == 2) {
            // Transfer NFT from seller to contract use safeTransferFrom for ERC1155
            require(
                IERC1155(_auctionParams._assetContract).isApprovedForAll(msg.sender, address(this)),
                "Contract should be approved to transfer NFT"
            );
            IERC1155(_auctionParams._assetContract).safeTransferFrom(
                msg.sender,
                address(this),
                _auctionParams._tokenId,
                _auctionParams._quantity,
                ""
            );
        }

        auctions[totalAuctions] = Auction({
            id: totalAuctions,
            auctionCreator: payable(msg.sender),
            assetContract: _auctionParams._assetContract,
            tokenId: _auctionParams._tokenId,
            quantity: _auctionParams._quantity,
            currency: _auctionParams._currency,
            startPrice: _auctionParams._startPrice,
            ceilingPrice: _auctionParams._ceilingPrice,
            startTime: _auctionParams._startTime,
            endTime: _auctionParams._endTime,
            timeBufferInSeconds: _auctionParams._timeBufferInSeconds,
            highestBidder: address(0),
            highestBid: _auctionParams._startPrice,
            stepAmount: _auctionParams._stepAmount,
            isPayoutCollected: false,
            isTokenCollected: false,
            status: AuctionStatus.CREATED,
            tokenType: types == 1 ? TokenType.ERC721 : TokenType.ERC1155
            //state ...
        });

        emit NewAuction(msg.sender, totalAuctions, _auctionParams._assetContract, auctions[totalAuctions]);
        totalAuctions++;
    }

    // cancel auction
    function cancelAuction(uint256 _auctionId) external auctionExists(_auctionId) onlyCreator(_auctionId) {
        require(!isAuctionExpired(_auctionId), "Auction is expired");
        require(auctions[_auctionId].status != AuctionStatus.ACTIVE, "Auction has bidders");
        auctions[_auctionId].status = AuctionStatus.CANCELLED;

        // check type of NFT
        if (auctions[_auctionId].tokenType == TokenType.ERC1155) {
            // Transfer NFT back to seller if nft is ERC1155
            IERC1155(auctions[_auctionId].assetContract).safeTransferFrom(
                address(this),
                auctions[_auctionId].auctionCreator,
                auctions[_auctionId].tokenId,
                auctions[_auctionId].quantity,
                ""
            );
        } else {
            // Transfer NFT back to seller if nft is ERC721
            IERC721(auctions[_auctionId].assetContract).transferFrom(
                address(this),
                auctions[_auctionId].auctionCreator,
                auctions[_auctionId].tokenId
            );
        }

        emit CancelledAuction(msg.sender, _auctionId);
    }

    // collect auction payout
    function collectAuctionPayout(uint256 _auctionId) external auctionExists(_auctionId) onlyCreator(_auctionId) {
        require(isAuctionExpired(_auctionId), "Auction is not expired");
        require(auctions[_auctionId].highestBidder != address(0), "Auction has no bidder");
        require(!auctions[_auctionId].isPayoutCollected, "Payout already collected");

        auctions[_auctionId].isPayoutCollected = true;

        // Transfer payout to auction creator
        IERC20 currency = IERC20(auctions[_auctionId].currency);
        require(
            currency.transfer(auctions[_auctionId].auctionCreator, auctions[_auctionId].highestBid),
            "Payout transfer failed"
        );

        emit AuctionPayoutCollected(_auctionId, msg.sender, auctions[_auctionId].highestBid);
    }

    // collect auction token
    function collectAuctionToken(uint256 _auctionId) external auctionExists(_auctionId) {
        require(isAuctionExpired(_auctionId), "Auction is not expired");
        require(auctions[_auctionId].highestBidder == msg.sender, "Only winning bidder can collect token");
        require(!auctions[_auctionId].isTokenCollected, "Token NFT already collected");

        auctions[_auctionId].isTokenCollected = true;

        if (auctions[_auctionId].tokenType == TokenType.ERC1155) {
            // Transfer NFT to winning bidder
            IERC1155(auctions[_auctionId].assetContract).safeTransferFrom(
                address(this),
                msg.sender,
                auctions[_auctionId].tokenId,
                auctions[_auctionId].quantity,
                ""
            );
        } else {
            // Transfer NFT to winning bidder
            IERC721(auctions[_auctionId].assetContract).transferFrom(
                address(this),
                msg.sender,
                auctions[_auctionId].tokenId
            );
        }

        emit AuctionTokenCollected(_auctionId, msg.sender);
    }

    // bid in auction
    function bidInAuction(uint256 _auctionId, uint256 _bidAmount) external payable auctionExists(_auctionId) {
        // ======================== 1. CHECKS (Kiểm tra điều kiện) ========================
        Auction storage auction = auctions[_auctionId];

        // Tất cả các lệnh require được đặt ở đây
        require(!_isContract(msg.sender), "Contract can not bid in auction");
        require(msg.sender != address(0), "Invalid bidder address");
        require(block.timestamp < auction.endTime, "Auction is expired");
        require(
            auction.status == AuctionStatus.CREATED || auction.status == AuctionStatus.ACTIVE,
            "Auction is not active"
        );
        require(msg.sender != auction.highestBidder, "You are already highest bidder");
        require(msg.sender != auction.auctionCreator, "Auction creator can not bid");
        require(isNewWinningBid(_auctionId, _bidAmount), "Bid amount is not a new winning bid");

        // Lấy thông tin người trả giá cũ và token currency TRƯỚC KHI thay đổi bất cứ thứ gì
        address previousHighestBidder = auction.highestBidder;
        uint256 previousHighestBid = auction.highestBid;
        IERC20 currency = IERC20(auction.currency);

        // Kiểm tra số dư và allowance của người dùng
        require(currency.balanceOf(msg.sender) >= _bidAmount, "Insufficient balance");
        require(currency.allowance(msg.sender, address(this)) >= _bidAmount, "Insufficient allowance");

        // ======================== 2. EFFECTS (Cập nhật TOÀN BỘ trạng thái nội bộ) ========================

        // Cập nhật người trả giá cao nhất mới
        auction.highestBidder = msg.sender;
        auction.highestBid = _bidAmount;
        bids[_auctionId][msg.sender] = _bidAmount;

        // Cập nhật trạng thái đấu giá
        if (auction.status == AuctionStatus.CREATED) {
            auction.status = AuctionStatus.ACTIVE;
        }

        // Cập nhật thời gian kết thúc (time buffer)
        if (block.timestamp >= auction.endTime - auction.timeBufferInSeconds) {
            auction.endTime += auction.timeBufferInSeconds;
        }

        emit BidPlaced(_auctionId, msg.sender, _bidAmount);

        // ======================== 3. INTERACTIONS (Tương tác với BÊN NGOÀI) ========================
        // Lấy tiền của người mới VÀO hợp đồng
        currency.transferFrom(msg.sender, address(this), _bidAmount);

        // Hoàn trả tiền cho người cũ RA KHỎI hợp đồng
        if (previousHighestBidder != address(0)) {
            currency.transfer(previousHighestBidder, previousHighestBid);
        }
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
        require(_startId < _endId && _endId <= totalAuctions, "Invalid range");

        // Đếm số lượng đấu giá hợp lệ
        uint256 count = 0;
        for (uint256 i = _startId; i < _endId; i++) {
            if (auctions[i].status == AuctionStatus.ACTIVE && !isAuctionExpired(i)) {
                count++;
            }
        }

        // Khởi tạo mảng với kích thước chính xác
        Auction[] memory _auctions = new Auction[](count);
        uint256 index = 0;
        for (uint256 i = _startId; i < _endId; i++) {
            if (auctions[i].status == AuctionStatus.ACTIVE && !isAuctionExpired(i)) {
                _auctions[index] = auctions[i];
                index++;
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
        uint256 currentHighestBid = auctions[_auctionId].highestBid;
        uint256 requiredAmount;

        // 1. Giá thầu phải nhỏ hơn hoặc bằng giá trần
        if (_bidAmount > auctions[_auctionId].ceilingPrice) {
            return false;
        }

        // Nếu chưa có ai đặt giá
        if (auctions[_auctionId].highestBidder == address(0)) {
            requiredAmount =
                auctions[_auctionId].startPrice +
                ((auctions[_auctionId].startPrice * auctions[_auctionId].stepAmount) / 10000); // nếu chưa có người đặt giá thì đặt giá bằng start price
        } else {
            // Nếu đã có người đặt giá, tính bước giá tối thiểu ex step = 500 is 5%
            requiredAmount = currentHighestBid + ((currentHighestBid * auctions[_auctionId].stepAmount) / 10000); // step amount in %
        }

        return _bidAmount >= requiredAmount;
    }

    // check if address is contract
    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}
