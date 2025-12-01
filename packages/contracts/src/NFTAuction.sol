// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./IPermissions.sol";
import "./library/ReentrancyGuard.sol";

error InValidRouterAddress();
error InValidFeeReceiverAddress();
error OnlyCallableViaRouter();
error OnlyFeeReceiver();
error FeeReceiverNotSet();
error ETHWithdrawalFailed();
error FeeWithdrawalFailed();
error NoFeesToWithdraw();

contract NFTAuction is IERC721Receiver, ERC1155Holder, ReentrancyGuard {
    // ============= STORAGE STRUCTS =============
    struct CoreStorage {
        uint256 totalAuctions;
        IPermission permissionsContract;
        bool initialized;
        uint256 decimal;
        uint256 minTimeAuction;
    }

    struct AuctionData {
        mapping(uint256 => Auction) auctions;
        mapping(uint256 => mapping(address => uint256)) bids; // map check bid amount in a auction
    }

    struct FeeData {
        mapping(address => uint256) currencyFees;
        mapping(address => uint256) accumulatedFees;
    }

    struct AuctionStorage {
        CoreStorage coreStorage;
        AuctionData auctionData;
        FeeData feeData;
        address router;
        address feeReceiver;
    }


    // ============= UNSTRUCTURED STORAGE SLOT =============
    uint256 private constant AUCTION_STORAGE_SLOT = uint256(keccak256("eip1967.auction.storage")) - 1;

    function _auctionStorage() internal pure returns (AuctionStorage storage s) {
        uint256 slot = AUCTION_STORAGE_SLOT;
        assembly {
            s.slot := slot
        }
    }

    // ============= CONSTANTS & ENUMS =============
    // Use functions instead of constants to work with delegatecall
    function MANAGEMENT_ROLE() public pure returns (bytes32) {
        return keccak256("MANAGEMENT_ROLE");
    }

    function AUCTION_ROLE() public pure returns (bytes32) {
        return keccak256("AUCTION_ROLE");
    }

    function NFT_ROLE() public pure returns (bytes32) {
        return keccak256("NFT_ROLE");
    }

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

    // ============= EVENTS =============
    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address indexed assetContract,
        uint256 tokenId,
        uint256 quantity,
        address currency,
        uint256 startPrice,
        uint256 ceilingPrice,
        uint256 startTime,
        uint256 endTime,
        uint256 timeBufferInSeconds,
        uint256 stepAmount,
        uint8 tokenType
    );

    event AuctionFinalized(uint256 indexed auctionId, address indexed winner, uint256 winningBid, address currency);

    event AuctionCancelled(uint256 indexed auctionId, address indexed seller);
    event AuctionBidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 bidAmount, address currency);
    event AuctionPayoutCollected(uint256 indexed auctionId, address indexed seller, uint256 amount);
    event AuctionTokenCollected(uint256 indexed auctionId, address indexed winner, uint256 tokenId);
    event NFTReceived(address operator, address from, uint256 tokenId, bytes data);
    event UpdatePermissionsContract(address oldPermissionsContract, address newPermissionsContract);
    event RouterSet(address indexed router);
    event FeeReceiverUpdated(address indexed oldReceiver, address indexed newReceiver);
    event FeeWithdrawn(address indexed feeReceiver, address indexed currency, uint256 amount);
    event AuctionStorageReset(address indexed admin);

    // ============= INITIALIZATION =============
    function initializeAuction(address _permissionsContract, address _router, address _feeReceiver) external {
        AuctionStorage storage s = _auctionStorage();
        require(!s.coreStorage.initialized, "Auction: Already initialized");
        if (_router == address(0)) revert InValidRouterAddress();
        if (_feeReceiver == address(0)) revert InValidFeeReceiverAddress();

        s.coreStorage.totalAuctions = 0;
        s.coreStorage.decimal = 10000; // set decimal
        s.coreStorage.minTimeAuction = 15 minutes; // set min time auction 15 minutes
        s.coreStorage.permissionsContract = IPermission(_permissionsContract);
        s.router = _router;
        s.feeReceiver = _feeReceiver;
        s.coreStorage.initialized = true;

        emit RouterSet(_router);
        emit FeeReceiverUpdated(address(0), _feeReceiver);
    }

    // ============= GET STORAGE =============
    function auctions(uint256 _auctionId) external view returns (Auction memory) {
        return _auctionStorage().auctionData.auctions[_auctionId];
    }

    function totalAuctions() external view returns (uint256) {
        return _auctionStorage().coreStorage.totalAuctions;
    }

    function getMinTimeAuction() external view returns (uint256) {
        return _auctionStorage().coreStorage.minTimeAuction;
    }

    function getCurrencyFeeAuction(address _currency) external view returns (uint256) {
        return _auctionStorage().feeData.currencyFees[_currency];
    }

    function getAccumulatedFeeAuction(address _currency) external view returns (uint256) {
        return _auctionStorage().feeData.accumulatedFees[_currency];
    }

    // ============= PERMISSION FUNCTIONS =============
    function hasAuctionRole(address _account) internal view {
        AuctionStorage storage s = _auctionStorage();
        if (address(s.coreStorage.permissionsContract) == address(0)) revert("Permission contract not initialized");
        if (!s.coreStorage.permissionsContract.hasRole(AUCTION_ROLE(), _account)) {
            revert("Caller does not have the auction role");
        }
    }

    function hasAuctionNFTRole(address _nft) internal view {
        AuctionStorage storage s = _auctionStorage();
        if (!s.coreStorage.permissionsContract.hasRole(NFT_ROLE(), _nft)) {
            revert("NFT contract is not whitelisted");
        }
    }

    function hasAuctionCurrencyRole(address _currency) internal view {
        AuctionStorage storage s = _auctionStorage();
        if (!s.coreStorage.permissionsContract.supportedCurrencies(_currency)) {
            revert("Currency is not whitelisted");
        }
    }

    function _checkManagementPermission() internal view {
        AuctionStorage storage s = _auctionStorage();
        if (!s.coreStorage.permissionsContract.hasRole(MANAGEMENT_ROLE(), msg.sender)) {
            revert("Caller does not have MANAGEMENT_ROLE");
        }
    }

    // ============= MODIFIERS =============
    modifier auctionExists(uint256 _auctionId) {
        require(_auctionId < _auctionStorage().coreStorage.totalAuctions, "Auction does not exist");
        _;
    }

    modifier onlyCreator(uint256 _auctionId) {
        require(
            _auctionStorage().auctionData.auctions[_auctionId].auctionCreator == msg.sender,
            "You are not creator of this auction"
        );
        _;
    }

    modifier onlyAuctioneer() {
        hasAuctionRole(msg.sender);
        _;
    }

    modifier onlyWhitelistedNFT(address _nft) {
        hasAuctionNFTRole(_nft);
        _;
    }

    modifier onlySupportedCurrency(address _currency) {
        hasAuctionCurrencyRole(_currency);
        _;
    }

    modifier onlyRouter() {
        AuctionStorage storage s = _auctionStorage();
        if (s.router != address(0) && address(this) != s.router) revert OnlyCallableViaRouter();
        _;
    }

    modifier onlyFeeReceiver() {
        AuctionStorage storage s = _auctionStorage();
        if (msg.sender != s.feeReceiver) revert OnlyFeeReceiver();
        _;
    }

    // ============= ADMIN FUNCTIONS =============
    function setPermissionsContract(address _permissionsContract) external {
        _checkManagementPermission();
        AuctionStorage storage s = _auctionStorage();
        address oldPermissionsContract = address(s.coreStorage.permissionsContract);
        s.coreStorage.permissionsContract = IPermission(_permissionsContract);
        emit UpdatePermissionsContract(oldPermissionsContract, _permissionsContract);
    }

    function setFeeReceiverAuction(address _feeReceiver) external {
        _checkManagementPermission();
        if (_feeReceiver == address(0)) revert InValidFeeReceiverAddress();
        AuctionStorage storage s = _auctionStorage();
        address oldReceiver = s.feeReceiver;
        s.feeReceiver = _feeReceiver;
        emit FeeReceiverUpdated(oldReceiver, _feeReceiver);
    }

    function setCurrencyFeeAuction(address _currency, uint256 _fee) external {
        _checkManagementPermission();
        AuctionStorage storage s = _auctionStorage();
        s.feeData.currencyFees[_currency] = _fee;
    }

    function setRouterAuction(address _router) external {
        _checkManagementPermission();
        if (_router == address(0)) revert InValidRouterAddress();
        AuctionStorage storage s = _auctionStorage();
        s.router = _router;
        emit RouterSet(_router);
    }

    function setMinTimeAuction(uint256 _minTimeAuction) external {
        _checkManagementPermission();
        AuctionStorage storage s = _auctionStorage();
        s.coreStorage.minTimeAuction = _minTimeAuction;
    }

    function getPermissionsAuction() external view returns (address) {
        return address(_auctionStorage().coreStorage.permissionsContract);
    }

    function getRouterAuction() external view returns (address) {
        return _auctionStorage().router;
    }

    function getFeeReceiverAuction() external view returns (address) {
        return _auctionStorage().feeReceiver;
    }

    // ============= MAIN FUNCTIONS =============
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
        TokenType types
    ) private view {
        if (types == TokenType.ERC721) {
            require(IERC721(_assetContract).ownerOf(_tokenId) == msg.sender, "You are not owner of this NFT");
        } else {
            require(IERC1155(_assetContract).balanceOf(msg.sender, _tokenId) >= _quantity, "Insufficient NFT balance");
        }
    }

    function createAuction(
        AuctionParams memory _auctionParams
    )
        external
        onlyAuctioneer
        onlyWhitelistedNFT(_auctionParams._assetContract)
        onlySupportedCurrency(_auctionParams._currency)
    {
        // ======================== 1. CHECKS (Kiểm tra điều kiện) ========================
        require(_auctionParams._quantity > 0, "Quantity should be greater than 0");
        require(_auctionParams._tokenId > 0, "Token ID should be greater than 0");
        require(_auctionParams._startPrice > 0, "Start price should be greater than 0");
        require(
            _auctionParams._ceilingPrice > _auctionParams._startPrice,
            "Ceiling price should be greater than start price"
        );
        require(_auctionParams._timeBufferInSeconds > 0, "Time buffer should be greater than 0");
        require(_auctionParams._stepAmount > 0, "Step amount should be greater than 0"); // decimal and max step amount, 10000 == 100%
        require(_auctionParams._startTime + _auctionStorage().coreStorage.minTimeAuction <= _auctionParams._endTime, "Auction time is too short");

        TokenType types = IERC165(_auctionParams._assetContract).supportsInterface(type(IERC721).interfaceId)
            ? TokenType.ERC721
            : TokenType.ERC1155;

        // Check if auction creator has enough NFT balance
        checkEnsureNFTBalance(_auctionParams._assetContract, _auctionParams._tokenId, _auctionParams._quantity, types);

        if (types == TokenType.ERC721) {
            // Transfer NFT from seller to contract use safeTransferFrom for ERC721
            // get approved for all
            require(
                IERC721(_auctionParams._assetContract).isApprovedForAll(msg.sender, address(this)) ||
                    IERC721(_auctionParams._assetContract).getApproved(_auctionParams._tokenId) == address(this),
                "Contract should be approved to transfer NFT"
            );
            require(_auctionParams._quantity == 1, "Quantity should be 1 for ERC721");
            IERC721(_auctionParams._assetContract).safeTransferFrom(msg.sender, address(this), _auctionParams._tokenId);
        } else if (types == TokenType.ERC1155) {
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

        AuctionStorage storage s = _auctionStorage();
        uint256 totalAuction = s.coreStorage.totalAuctions;

        s.auctionData.auctions[totalAuction] = Auction({
            id: totalAuction,
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
            tokenType: types // Set token type based on the contract interface
            //state variables
        });

        emit AuctionCreated(
            totalAuction,
            msg.sender,
            _auctionParams._assetContract,
            _auctionParams._tokenId,
            _auctionParams._quantity,
            _auctionParams._currency,
            _auctionParams._startPrice,
            _auctionParams._ceilingPrice,
            _auctionParams._startTime,
            _auctionParams._endTime,
            _auctionParams._timeBufferInSeconds,
            _auctionParams._stepAmount,
            uint8(types)
        );
        s.coreStorage.totalAuctions++;
    }

    // cancel auction
    function cancelAuction(uint256 _auctionId) external auctionExists(_auctionId) onlyCreator(_auctionId) {
        AuctionStorage storage s = _auctionStorage();
        Auction storage auction = s.auctionData.auctions[_auctionId];
        require(!isAuctionExpired(_auctionId), "Auction is expired");
        require(auction.status != AuctionStatus.ACTIVE, "Auction has bidders");
        auction.status = AuctionStatus.CANCELLED;

        // check type of NFT
        if (auction.tokenType == TokenType.ERC1155) {
            // Transfer NFT back to seller if nft is ERC1155
            IERC1155(auction.assetContract).safeTransferFrom(
                address(this),
                auction.auctionCreator,
                auction.tokenId,
                auction.quantity,
                ""
            );
        } else {
            // Transfer NFT back to seller if nft is ERC721
            IERC721(auction.assetContract).transferFrom(address(this), auction.auctionCreator, auction.tokenId);
        }

        emit AuctionCancelled(_auctionId, msg.sender);
    }

    // collect auction payout
    function collectAuctionPayout(uint256 _auctionId) external auctionExists(_auctionId) onlyCreator(_auctionId) nonReentrant {
        AuctionStorage storage s = _auctionStorage();
        Auction storage auction = s.auctionData.auctions[_auctionId];
        require(isAuctionExpired(_auctionId), "Auction is not expired");
        require(auction.highestBidder != address(0), "Auction has no bidder");
        require(!auction.isPayoutCollected, "Payout already collected");

        auction.isPayoutCollected = true;

        bool isETH = (auction.currency == address(0));

        // calculate fee amount
        uint256 feeAmount = (auction.highestBid * s.feeData.currencyFees[auction.currency]) / s.coreStorage.decimal;
        s.feeData.accumulatedFees[auction.currency] += feeAmount;
        uint256 creatorAmount = auction.highestBid - feeAmount;

        if(isETH) {
            // transfer ETH to seller
            payable(auction.auctionCreator).transfer(creatorAmount);
        } else {
            // transfer ERC20 to seller
            IERC20 currency = IERC20(auction.currency);
            require(currency.transfer(auction.auctionCreator, creatorAmount), "ERC20 payout failed");
        }
        

        emit AuctionPayoutCollected(_auctionId, msg.sender, auction.highestBid);
        emit AuctionFinalized(_auctionId, auction.highestBidder, auction.highestBid, auction.currency);
    }

    // collect auction token
    function collectAuctionToken(uint256 _auctionId) external auctionExists(_auctionId) {
        AuctionStorage storage s = _auctionStorage();
        Auction storage auction = s.auctionData.auctions[_auctionId];
        require(isAuctionExpired(_auctionId), "Auction is not expired");

        // check reentrancy
        require(!auction.isTokenCollected, "Token NFT already collected");
        auction.isTokenCollected = true; // 2 role is seller | winner

        if (auction.highestBidder == address(0)) {
            // back nft for seller
            require(auction.auctionCreator == msg.sender, "Only seller can collect token");
            transferNft(
                auction.assetContract,
                address(this),
                auction.auctionCreator,
                auction.tokenId,
                auction.quantity,
                auction.tokenType
            );
        } else {
            require(auction.highestBidder == msg.sender, "Only winning bidder can collect token");
            transferNft(
                auction.assetContract,
                address(this),
                msg.sender,
                auction.tokenId,
                auction.quantity,
                auction.tokenType
            );
        }

        emit AuctionTokenCollected(_auctionId, msg.sender, auction.tokenId);
    }

    // internal function to transfer nft for user | winner
    function transferNft(
        address asset,
        address from,
        address to,
        uint256 tokenId,
        uint256 quantity,
        TokenType tokenType
    ) internal {
        if (tokenType == TokenType.ERC1155) {
            // Transfer NFT to winning bidder
            IERC1155(asset).safeTransferFrom(from, to, tokenId, quantity, "");
        } else {
            // Transfer NFT to winning bidder
            IERC721(asset).safeTransferFrom(from, to, tokenId);
        }
    }

    // bid in auction
    function bidInAuction(uint256 _auctionId, uint256 _bidAmount) external payable auctionExists(_auctionId) nonReentrant {
        // ======================== 1. CHECKS (Kiểm tra điều kiện) ========================
        AuctionStorage storage s = _auctionStorage();
        Auction storage auction = s.auctionData.auctions[_auctionId];

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

        bool isETH = (auction.currency == address(0));
        if (isETH) {
            require(msg.value == _bidAmount, "ETH sent != bid amount");
        } else {
            IERC20 currency = IERC20(auction.currency);
            // Kiểm tra số dư và allowance của người dùng
            require(currency.balanceOf(msg.sender) >= _bidAmount, "Insufficient balance");
            require(currency.allowance(msg.sender, address(this)) >= _bidAmount, "Insufficient allowance");
        }

        // ======================== 2. EFFECTS (Cập nhật TOÀN BỘ trạng thái nội bộ) ========================
        // Cập nhật người trả giá cao nhất mới
        auction.highestBidder = msg.sender;
        auction.highestBid = _bidAmount;
        s.auctionData.bids[_auctionId][msg.sender] = _bidAmount;

        // Cập nhật trạng thái đấu giá
        if (auction.status == AuctionStatus.CREATED) {
            auction.status = AuctionStatus.ACTIVE;
        }

        // Cập nhật thời gian kết thúc (time buffer)
        if (block.timestamp >= auction.endTime - auction.timeBufferInSeconds) {
            auction.endTime += auction.timeBufferInSeconds;
        }

        emit AuctionBidPlaced(_auctionId, msg.sender, _bidAmount, auction.currency);

        // ======================== 3. INTERACTIONS (Tương tác với BÊN NGOÀI) ========================
        // Lấy tiền của người mới VÀO hợp đồng
        if(!isETH) {
            IERC20 currency = IERC20(auction.currency);
            require(currency.transferFrom(msg.sender, address(this), _bidAmount), "Bid transfer failed");
        }

        // Hoàn trả tiền cho người cũ RA KHỎI hợp đồng
        if (previousHighestBidder != address(0)) {
            if (isETH) {
                payable(previousHighestBidder).transfer(previousHighestBid);
            } else {
                IERC20 currency = IERC20(auction.currency);
                require(currency.transfer(previousHighestBidder, previousHighestBid), "Bid refund failed");
            }
        }
    }

    // function
    // get data of a auction
    function getAuction(uint256 _auctionId) public view auctionExists(_auctionId) returns (Auction memory) {
        return _auctionStorage().auctionData.auctions[_auctionId];
    }

    // get all auctions
    function getAllAuctions(uint256 _startId, uint256 _endId) public view returns (Auction[] memory) {
        Auction[] memory _auctions = new Auction[](_endId - _startId);
        for (uint256 i = _startId; i < _endId; i++) {
            _auctions[i - _startId] = _auctionStorage().auctionData.auctions[i];
        }
        return _auctions;
    }

    // get all valid auctions
    function getAllValidAuctions(uint256 _startId, uint256 _endId) public view returns (Auction[] memory) {
        AuctionStorage storage s = _auctionStorage();
        // Đếm số lượng đấu giá hợp lệ
        uint256 count = 0;
        for (uint256 i = _startId; i < _endId; i++) {
            if (s.auctionData.auctions[i].status == AuctionStatus.ACTIVE && !isAuctionExpired(i)) {
                count++;
            }
        }

        // Khởi tạo mảng với kích thước chính xác
        Auction[] memory _auctions = new Auction[](count);
        uint256 index = 0;
        for (uint256 i = _startId; i < _endId; i++) {
            if (s.auctionData.auctions[i].status == AuctionStatus.ACTIVE && !isAuctionExpired(i)) {
                _auctions[index] = s.auctionData.auctions[i];
                index++;
            }
        }

        return _auctions;
    }

    // get new winnig bid
    function getNewWinningBid(uint256 _auctionId) public view auctionExists(_auctionId) returns (address, uint256) {
        return (
            _auctionStorage().auctionData.auctions[_auctionId].highestBidder, // Winning bidder
            _auctionStorage().auctionData.auctions[_auctionId].highestBid // Winning bid
        );
    }

    // get auction is expired
    function isAuctionExpired(uint256 _auctionId) public view auctionExists(_auctionId) returns (bool) {
        return block.timestamp > _auctionStorage().auctionData.auctions[_auctionId].endTime;
    }

    // check bid is new winning bid
    function isNewWinningBid(
        uint256 _auctionId,
        uint256 _bidAmount
    ) public view auctionExists(_auctionId) returns (bool) {
        AuctionStorage storage s = _auctionStorage();

        uint256 currentHighestBid = s.auctionData.auctions[_auctionId].highestBid;
        uint256 requiredAmount;

        // 1. Giá thầu phải nhỏ hơn hoặc bằng giá trần
        if (_bidAmount > s.auctionData.auctions[_auctionId].ceilingPrice) {
            return false;
        }

        // Nếu chưa có ai đặt giá
        if (s.auctionData.auctions[_auctionId].highestBidder == address(0)) {
            requiredAmount =
                s.auctionData.auctions[_auctionId].startPrice +
                ((s.auctionData.auctions[_auctionId].startPrice * s.auctionData.auctions[_auctionId].stepAmount) / s.coreStorage.decimal); // nếu chưa có người đặt giá thì đặt giá bằng start price
        } else {
            // Nếu đã có người đặt giá, tính bước giá tối thiểu ex step = 500 is 5%
            requiredAmount =
                currentHighestBid +
                ((currentHighestBid * s.auctionData.auctions[_auctionId].stepAmount) / s.coreStorage.decimal); // step amount in %
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

    function withdrawFeesAuction(address currency) external onlyFeeReceiver nonReentrant {
        AuctionStorage storage s = _auctionStorage();
        if (s.feeReceiver == address(0)) revert FeeReceiverNotSet();

        uint256 amount = s.feeData.accumulatedFees[currency];
        if (amount == 0) revert NoFeesToWithdraw();

        s.feeData.accumulatedFees[currency] = 0;

        if (currency == address(0)) {
            (bool success, ) = s.feeReceiver.call{value: amount}("");
            if (!success) revert ETHWithdrawalFailed();
        } else {
            if (!IERC20(currency).transfer(s.feeReceiver, amount)) revert FeeWithdrawalFailed();
        }

        emit FeeWithdrawn(s.feeReceiver, currency, amount);
    }

    function resetAuctionStorage() external {
        _checkManagementPermission();
        AuctionStorage storage s = _auctionStorage();

        delete s.coreStorage;
        delete s.auctionData;
        delete s.feeData;

        s.router = address(0);
        s.feeReceiver = address(0);

        emit AuctionStorageReset(msg.sender);
    }
}