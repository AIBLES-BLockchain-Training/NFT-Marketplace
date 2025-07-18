import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { NFTAuction } from '../typechain-types';

describe('NFTAuction with ERC721', function () {
  async function deployContractLoadfixture() {
    const [admin, seller, bidder1, bidder2] = await ethers.getSigners();

    // Deploy Permissions
    const PermissionsFactory = await ethers.getContractFactory('Permissions');
    const permissions: any = await PermissionsFactory.deploy(admin.address);
    await permissions.waitForDeployment();

    // Deploy MockToken (ERC20)
    const MockToken = await ethers.getContractFactory('MockToken');
    const mockERC20: any = await MockToken.deploy(admin.address);
    await mockERC20.waitForDeployment();

    // Deploy MockERC721
    const MockERC721 = await ethers.getContractFactory('MockERC721');
    const mockERC721: any = await MockERC721.deploy();
    await mockERC721.waitForDeployment();

    // Deploy NFTAuction
    const NFTAuction = await ethers.getContractFactory('NFTAuction');
    const auction = await NFTAuction.deploy();
    await auction.waitForDeployment();
    await auction['initializeAuction'](await permissions.getAddress());

    nftAuction = auction as unknown as NFTAuction;

    // Assign roles to seller
    await permissions.connect(admin).assignAuctionRole([seller.address]);
    
    // Assign roles for nft
    await permissions.connect(admin).assignNFTRole([mockERC721.getAddress()]);

    // add support currency
    await permissions.addCurrency([mockERC20.getAddress()]);

    // Mint NFTs for seller
    await mockERC721.mint(seller.address, 1);

    // Mint tokens for bidders
    const value = ethers.parseEther('100');
    await mockERC20.mint(bidder1.address, value);
    await mockERC20.mint(bidder2.address, value);

    // Get auction contract address
    const auctionAddress = await nftAuction.getAddress();

    // Approve tokens for auction contract
    await mockERC20.connect(bidder1).approve(auctionAddress, value);
    await mockERC20.connect(bidder2).approve(auctionAddress, value);

    return {
      nftAuction,
      mockERC20,
      mockERC721,
      admin,
      seller,
      bidder1,
      bidder2,
      addressErc20: await mockERC20.getAddress(),
      addressErc721: await mockERC721.getAddress(),
      addressSystem: auctionAddress,
      permissions,
    };
  }

  let nftAuction, mockERC20, mockERC721, admin, seller, bidder1, bidder2, addressErc20, addressErc721, addressSystem, permissions;

  beforeEach(async function () {
    ({ nftAuction, mockERC20, mockERC721, admin, seller, bidder1, bidder2, addressErc20, addressErc721, addressSystem, permissions } =
      await loadFixture(deployContractLoadfixture));
  });

  function transformAuctionObject(auction: any) {
    return {
      id: auction[0],
      auctionCreator: auction[1],
      assetContract: auction[2],
      tokenId: auction[3],
      quantity: auction[4],
      currency: auction[5],
      startPrice: auction[6],
      ceilingPrice: auction[7],
      startTime: auction[8],
      endTime: auction[9],
      timeBufferInSeconds: auction[10],
      highestBidder: auction[11],
      highestBid: auction[12],
      stepAmount: auction[13],
      isPayoutCollected: auction[14],
      isTokenCollected: auction[15],
      status: auction[16],
      tokenType: auction[17],
    };
  }

  async function createAuction(tokenId: number) {
    const startTime = await time.latest();
    const endTime = startTime + 3600; // 1 hour later

    const auctionArgs = {
      _assetContract: addressErc721,
      _tokenId: tokenId,
      _quantity: 1,
      _currency: addressErc20,
      _startPrice: ethers.parseEther('1'),
      _ceilingPrice: ethers.parseEther('100'),
      _stepAmount: 500,
      _timeBufferInSeconds: 120,
      _startTime: startTime,
      _endTime: endTime,
    };

    // Approve all NFT transfer before creating auction
    await mockERC721.connect(seller).setApprovalForAll(addressSystem, true);
    await nftAuction.connect(seller).createAuction(auctionArgs);

    const auction = await nftAuction.auctions(0);
    const auctionObject = transformAuctionObject(auction);
    return { startTime, endTime, auctionObject };
  }

  async function bid(auctionId: number, bidder: HardhatEthersSigner, amount: string) {
    const balance = await mockERC20.balanceOf(bidder.address);
    const value = ethers.parseEther(amount);

    if (balance < value) {
      console.log('❌ Insufficient balance');
      console.log('💰 Balance:', ethers.formatEther(balance));
      return;
    }

    const allowance = await mockERC20.allowance(bidder.address, addressSystem);

    if (allowance < value) {
      await mockERC20.connect(bidder).approve(addressSystem, 0); // Reset if needed
      await mockERC20.connect(bidder).approve(addressSystem, value);
    }

    await nftAuction.connect(bidder).bidInAuction(auctionId, value);
  }

  // Test cases with ERC721
  describe('Auction function create and cancel with ERC721', function () {
    it('Should create an auction', async function () {
      const { startTime, endTime, auctionObject } = await createAuction(1);
      // console.log(auctionObject);

      expect(await mockERC721.ownerOf(1)).to.equal(addressSystem);
      expect(auctionObject).to.deep.include({
        id: BigInt(0),
        auctionCreator: seller.address,
        assetContract: addressErc721,
        tokenId: BigInt(1),
        quantity: BigInt(1),
        currency: addressErc20,
        startPrice: ethers.parseEther('1'),
        ceilingPrice: ethers.parseEther('100'),
        startTime: BigInt(startTime),
        endTime: BigInt(endTime),
        timeBufferInSeconds: BigInt(120),
        highestBidder: ethers.ZeroAddress,
        highestBid: ethers.parseEther('1'),
        stepAmount: BigInt(500),
        isPayoutCollected: false,
        isTokenCollected: false,
        status: BigInt(0),
        tokenType: BigInt(0),
      });
    });

    it('Should revert an auction if NFT ERC721 is not approved', async function () {
      const startTime = await time.latest();
      const endTime = startTime + 3600; // 1 hour later

      await expect(
        nftAuction.connect(seller).createAuction({
          _assetContract: addressErc721,
          _tokenId: 1,
          _quantity: 1,
          _currency: addressErc20,
          _startPrice: ethers.parseEther('1'),
          _ceilingPrice: ethers.parseEther('100'),
          _stepAmount: 500,
          _timeBufferInSeconds: 120, // 2 minutes
          _startTime: startTime,
          _endTime: endTime,
        }),
      ).to.be.revertedWith('Contract should be approved to transfer NFT');
    });

    it('Should revert if seller not assigns role AUCTION_ROLE', async function () {
      const startTime = await time.latest();
      const endTime = startTime + 3600; // 1 hour later
      await expect(
        nftAuction.connect(bidder1).createAuction({
          _assetContract: addressErc721,
          _tokenId: 1,
          _quantity: 1,
          _currency: addressErc20,
          _startPrice: ethers.parseEther('1'),
          _ceilingPrice: ethers.parseEther('100'),
          _stepAmount: 500,
          _timeBufferInSeconds: 120, // 2 minutes
          _startTime: startTime,
          _endTime: endTime,
        }),
      ).to.be.revertedWith('Caller does not have the auction role');
    });

    it('Should revert if bidder nft 721 with quantity > 1', async function () {
      await mockERC721.connect(seller).setApprovalForAll(addressSystem, true);
      const startTime = await time.latest();
      const endTime = startTime + 3600; // 1 hour later
      await expect(
        nftAuction.connect(seller).createAuction({
          _assetContract: addressErc721,
          _tokenId: 1,
          _quantity: 2, // Invalid quantity for ERC721
          _currency: addressErc20,
          _startPrice: ethers.parseEther('1'),
          _ceilingPrice: ethers.parseEther('100'),
          _stepAmount: 500,
          _timeBufferInSeconds: 120, // 2 minutes
          _startTime: startTime,
          _endTime: endTime,
        }),
      ).to.be.revertedWith('Quantity should be 1 for ERC721');
    });

    it('Should revert if seller is not owner of nft', async function () {
      await mockERC721.mint(bidder1.address, 4);
      await expect(
        nftAuction.connect(seller).createAuction({
          _assetContract: addressErc721,
          _tokenId: 4,
          _quantity: 1,
          _currency: addressErc20,
          _startPrice: ethers.parseEther('1'),
          _ceilingPrice: ethers.parseEther('100'),
          _stepAmount: 500,
          _timeBufferInSeconds: 120, // 2 minutes
          _startTime: await time.latest(),
          _endTime: (await time.latest()) + 3600, // 1 hour later
        }),
      ).to.be.revertedWith('You are not owner of this NFT');
    });

    it('Should revert if start price is greater than ceiling price', async function () {
      const startTime = await time.latest();
      const endTime = startTime + 3600; // 1 hour later
      await expect(
        nftAuction.connect(seller).createAuction({
          _assetContract: addressErc721,
          _tokenId: 1,
          _quantity: 1,
          _currency: addressErc20,
          _startPrice: ethers.parseEther('101'), // Start price greater than ceiling price
          _ceilingPrice: ethers.parseEther('100'),
          _stepAmount: 500,
          _timeBufferInSeconds: 120, // 2 minutes
          _startTime: startTime,
          _endTime: endTime,
        }),
      ).to.be.revertedWith('Ceiling price should be greater than start price');
    });

    it('Should revert if start time is greater than end time', async function () {
      const startTime = await time.latest();
      const endTime = startTime + 600; // 10 minutes later
      await expect(
        nftAuction.connect(seller).createAuction({
          _assetContract: addressErc721,
          _tokenId: 1,
          _quantity: 1,
          _currency: addressErc20,
          _startPrice: ethers.parseEther('1'),
          _ceilingPrice: ethers.parseEther('100'),
          _stepAmount: 500,
          _timeBufferInSeconds: 120, // 2 minutes
          _startTime: startTime,
          _endTime: endTime,
        }),
      ).to.be.revertedWith('Auction time is too short');
    });

    it('Should revert if nft is not whitelisted', async function () {
      const startTime = await time.latest();
      const endTime = startTime + 3600; // 1 hour later

      await permissions.connect(admin).revokeNFTRole([mockERC721.getAddress()]);

      await expect(
        nftAuction.connect(seller).createAuction({
          _assetContract: addressErc721,
          _tokenId: 1,
          _quantity: 1,
          _currency: addressErc20,
          _startPrice: ethers.parseEther('1'),
          _ceilingPrice: ethers.parseEther('100'),
          _stepAmount: 500,
          _timeBufferInSeconds: 120, // 2 minutes
          _startTime: startTime,
          _endTime: endTime,
        }),
      ).to.be.revertedWith('NFT contract is not whitelisted');
    });

    it('Should revert if currency is not supported', async function () {
      await permissions.connect(admin).removeCurrency([addressErc20]);
      const startTime = await time.latest();
      const endTime = startTime + 3600; // 1 hour later

      await expect(
        nftAuction.connect(seller).createAuction({
          _assetContract: addressErc721,
          _tokenId: 1,
          _quantity: 1,
          _currency: addressErc20,
          _startPrice: ethers.parseEther('1'),
          _ceilingPrice: ethers.parseEther('100'),
          _stepAmount: 500,
          _timeBufferInSeconds: 120, // 2 minutes
          _startTime: startTime,
          _endTime: endTime,
        }),
      ).to.be.revertedWith('Currency is not whitelisted');
    });

    describe('Should test function cancelAuction', function () {
      beforeEach(async function () {
        await createAuction(1);
      });

      it('Should cancel an auction', async function () {
        await nftAuction.connect(seller).cancelAuction(0);

        const auction = await nftAuction.auctions(0);
        expect(auction.status).to.equal(2);
      });

      it('Should check transfer back NFT 721 to auction creator', async function () {
        await nftAuction.connect(seller).cancelAuction(0);
        expect(await mockERC721.ownerOf(1)).to.equal(seller.address);
      });

      it('Should check nft of system if cancel failed', async function () {
        expect(await mockERC721.ownerOf(1)).to.equal(addressSystem);
      });

      it('Should revert if not the auction creator', async function () {
        await expect(nftAuction.connect(bidder1).cancelAuction(0)).to.be.revertedWith('You are not creator of this auction');
      });

      it('Should revert if auction is not exists', async function () {
        await expect(nftAuction.cancelAuction(2)).to.be.revertedWith('Auction does not exist');
      });

      it('Should revert if auction has bidder', async function () {
        await bid(0, bidder1, '11');
        await expect(nftAuction.connect(seller).cancelAuction(0)).to.be.revertedWith('Auction has bidders');
      });

      it('Should revert if auction is expired', async function () {
        // Cancel auction after 2 hours
        await time.increase(7200);
        await expect(nftAuction.connect(seller).cancelAuction(0)).to.be.revertedWith('Auction is expired');
      });
    });
  });

  describe('Should test get auction', function () {
    beforeEach(async function () {
      // mint nfts erc721 for seller
      await mockERC721.mint(seller.address, 2);
      await mockERC721.mint(seller.address, 3);

      await createAuction(1);
      await createAuction(2);
      await createAuction(3);
    });

    it('Should check total auction', async function () {
      expect(await nftAuction.totalAuctions()).to.equal(3);
    });

    it('Should get all auctions', async function () {
      const auctions = await nftAuction.getAllAuctions(1, 3);
      // console.log(auctions);
      expect(auctions.length).to.equal(2); // [1, 3)
    });

    it('Should get all valid auctions', async function () {
      // bid in auction 1
      await bid(1, bidder1, '11');
      const auctions = await nftAuction.getAllValidAuctions(1, 3);
      // console.log(auctions);
      expect(auctions.length).to.equal(1);
    });
  });

  describe('Should test function bid', function () {
    it('Should allow bidding in an auction', async function () {
      await createAuction(1);

      // Bidder1 approves ERC20 tokens for auction contract
      await mockERC20.connect(bidder1).approve(addressSystem, ethers.parseEther('12'));

      // Bidder1 places a bid
      await nftAuction.connect(bidder1).bidInAuction(0, ethers.parseEther('12'));
      const balanceBidder1 = await mockERC20.balanceOf(bidder1.address);
      expect(balanceBidder1).to.equal(ethers.parseEther('88')); // 100 - 12 = 88
      const auction = await nftAuction.auctions(0);
      expect(auction.status).to.equal(1);
      expect(auction.highestBidder).to.equal(bidder1.address);
      expect(auction.highestBid).to.equal(ethers.parseEther('12'));
    });

    it('Should transfer for previos bidder', async function () {
      await createAuction(1);
      // Bidder1 approves ERC20 tokens for auction contract
      await mockERC20.connect(bidder1).approve(addressSystem, ethers.parseEther('12'));
      // Bidder1 places a bid
      await nftAuction.connect(bidder1).bidInAuction(0, ethers.parseEther('12'));
      const balanceBidder1 = await mockERC20.balanceOf(bidder1.address);
      expect(balanceBidder1).to.equal(ethers.parseEther('88')); // 100 - 12 = 88
      // Bidder2 approves ERC20 tokens for auction contract
      await mockERC20.connect(bidder2).approve(addressSystem, ethers.parseEther('15'));
      // Bidder2 places a bid
      await nftAuction.connect(bidder2).bidInAuction(0, ethers.parseEther('15'));
      const balanceBidder2 = await mockERC20.balanceOf(bidder2.address);
      expect(balanceBidder2).to.equal(ethers.parseEther('85')); // 100 - 15 = 85
      const auction = await nftAuction.auctions(0);
      expect(auction.highestBidder).to.equal(bidder2.address);
      expect(auction.highestBid).to.equal(ethers.parseEther('15'));
      expect(auction.status).to.equal(1);
      // Check that previous bidder's funds were returned
      const balanceBidder1After = await mockERC20.balanceOf(bidder1.address);
      expect(balanceBidder1After).to.equal(ethers.parseEther('100')); // 88 + 12 = 100
    });

    it('Should revert if not approve token', async function () {
      await createAuction(1);
      // Reset bidder2's allowance to 0
      await mockERC20.connect(bidder2).approve(addressSystem, 0);
      // Bidder2 places a bid without approval
      await expect(nftAuction.connect(bidder2).bidInAuction(0, ethers.parseEther('12'))).to.be.revertedWith(
        'Insufficient allowance',
      );
    });

    it('Should revert if auction is not exists', async function () {
      await expect(nftAuction.connect(bidder1).bidInAuction(0, ethers.parseEther('2'))).to.be.revertedWith(
        'Auction does not exist',
      );
    });

    it('Should revert if auction is expired', async function () {
      await createAuction(1);
      // Bidder1 places a bid
      await time.increase(7200);
      await expect(nftAuction.connect(bidder1).bidInAuction(0, ethers.parseEther('2'))).to.be.revertedWith('Auction is expired');
    });

    it('Should revert if auction is cancelled', async function () {
      await createAuction(1);
      await nftAuction.connect(seller).cancelAuction(0);
      // Bidder1 approves ERC20 tokens for auction contract
      await mockERC20.connect(bidder1).approve(addressSystem, ethers.parseEther('2'));

      await expect(nftAuction.connect(bidder1).bidInAuction(0, ethers.parseEther('2'))).to.be.revertedWith(
        'Auction is not active',
      );
    });

    it('Should test time buffer', async function () {
      await createAuction(1);
      await bid(0, bidder1, '12');
      const auctionBefore = await nftAuction.auctions(0);
      const preEndTime = auctionBefore.endTime;
      await time.increase(3500);
      await bid(0, bidder2, '13'); // bidder2 bid after 1 hour (time buffer 60 seconds)
      const auction = await nftAuction.auctions(0);
      const expectedEndTime = preEndTime + BigInt(auction.timeBufferInSeconds);
      expect(expectedEndTime).to.equal(auction.endTime);
      expect(auction.highestBidder).to.equal(bidder2.address);
    });

    it('Should revert if bid is less than start price', async function () {
      await createAuction(1);
      await expect(nftAuction.connect(bidder1).bidInAuction(0, ethers.parseEther('0.5'))).to.be.revertedWith(
        'Bid amount is not a new winning bid',
      );
    });

    it('Should revert if bidder is highest bidder', async function () {
      await createAuction(1);
      await bid(0, bidder1, '12');
      await expect(nftAuction.connect(bidder1).bidInAuction(0, ethers.parseEther('13'))).to.be.revertedWith(
        'You are already highest bidder',
      );
    });

    it('Should revert if bidder is seller', async function () {
      await createAuction(1);
      await expect(nftAuction.connect(seller).bidInAuction(0, ethers.parseEther('2'))).to.be.revertedWith(
        'Auction creator can not bid',
      );
    });

    it('Should revert if bid amount is > ceiling price', async function () {
      await createAuction(1);
      await expect(nftAuction.connect(bidder1).bidInAuction(0, ethers.parseEther('101'))).to.be.revertedWith(
        'Bid amount is not a new winning bid',
      );
    });
  });

  describe('Should test function isWinningBidder', function () {
    it('Should check winning bidder', async function () {
      await createAuction(1);
      const check1 = await nftAuction.isNewWinningBid(0, ethers.parseEther('2'));
      expect(check1).to.equal(true);
      // console.log("check1" + check1);
      const check2 = await nftAuction.isNewWinningBid(0, ethers.parseEther('1'));
      expect(check2).to.equal(false);
    });
  });

  describe('Should test function get new winning bidder', function () {
    it('Should get new winning bidder', async function () {
      await createAuction(1);
      await bid(0, bidder1, '11');
      const result = await nftAuction.getNewWinningBid(0);
      // console.log(result);
      expect(result[0]).to.equal(bidder1.address);
    });
  });

  describe('Should test function claim token', function () {
    beforeEach(async function () {
      await createAuction(1);
      await bid(0, bidder1, '11');
    });

    it('Should claim token the auction', async function () {
      await time.increase(3610); // 1 hour later
      const balance = await mockERC20.balanceOf(seller.address);
      await nftAuction.connect(seller).collectAuctionPayout(0);
      // check balance of seller (add 5 ether) = current balance + 5 ether
      const newBalance = await mockERC20.balanceOf(seller.address);
      expect(newBalance).to.equal(balance + ethers.parseEther('11'));
    });

    it('Should revert if not the auction creator', async function () {
      await expect(nftAuction.connect(bidder1).collectAuctionPayout(0)).to.be.revertedWith('You are not creator of this auction');
    });

    it('Should revert if auction is not exists', async function () {
      await expect(nftAuction.collectAuctionPayout(2)).to.be.revertedWith('Auction does not exist');
    });

    it('Should revert if auction is not expired', async function () {
      await expect(nftAuction.connect(seller).collectAuctionPayout(0)).to.be.revertedWith('Auction is not expired');
    });

    it('Should revert if double claim', async function () {
      await time.increase(3610); // 1 hour later
      await nftAuction.connect(seller).collectAuctionPayout(0);
      await expect(nftAuction.connect(seller).collectAuctionPayout(0)).to.be.revertedWith('Payout already collected');
    });

    it('Should revert if auction has no bidder', async function () {
      await mockERC721.mint(seller.address, 2);
      await createAuction(2);
      await time.increase(3610); // 1 hour later
      await expect(nftAuction.connect(seller).collectAuctionPayout(1)).to.be.revertedWith('Auction has no bidder');
    });
  });

  describe('Should test function claim nft', function () {
    beforeEach(async function () {
      await createAuction(1);
      await bid(0, bidder1, '11');
    });

    it('Should claim token the auction', async function () {
      await time.increase(3610); // 1 hour later
      await nftAuction.connect(bidder1).collectAuctionToken(0);
      const owner = await mockERC721.ownerOf(1);
      expect(owner).to.equal(bidder1.address);
    });

    it('Should revert if not winning bidder', async function () {
      await time.increase(3610); // 1 hour later
      await expect(nftAuction.connect(bidder2).collectAuctionToken(0)).to.be.revertedWith(
        'Only winning bidder can collect token',
      );
    });

    it('Should revert if auction is not exists', async function () {
      await expect(nftAuction.collectAuctionToken(2)).to.be.revertedWith('Auction does not exist');
    });

    it('Should revert if auction is not expired', async function () {
      await expect(nftAuction.collectAuctionToken(0)).to.be.revertedWith('Auction is not expired');
    });

    it('Should revert if double claim', async function () {
      await time.increase(3610); // 1 hour later
      await nftAuction.connect(bidder1).collectAuctionToken(0);
      await expect(nftAuction.connect(bidder1).collectAuctionToken(0)).to.be.revertedWith('Token NFT already collected');
    });
  });
});

describe('NFTAuction with ERC1155', function () {
  async function deployContractLoadfixture() {
    const [admin, seller, bidder1, bidder2] = await ethers.getSigners();

    // Deploy Permissions
    const PermissionsFactory = await ethers.getContractFactory('Permissions');
    const permissions: any = await PermissionsFactory.deploy(admin.address);
    await permissions.waitForDeployment();

    // Deploy MockToken (ERC20)
    const MockToken = await ethers.getContractFactory('MockToken');
    const mockERC20: any = await MockToken.deploy(admin.address);
    await mockERC20.waitForDeployment();

    // Deploy MockERC1155
    const MockERC1155 = await ethers.getContractFactory('MockERC1155');
    const mockERC1155: any = await MockERC1155.deploy();
    await mockERC1155.waitForDeployment();

    // Deploy NFTAuction
    const NFTAuction = await ethers.getContractFactory('NFTAuction');
    const auction = await NFTAuction.deploy();
    await auction.waitForDeployment();
    await auction['initializeAuction'](await permissions.getAddress());

    // Assign roles to seller
    await permissions.connect(admin).assignAuctionRole([seller.address]);

    // Assign roles for nft
    await permissions.connect(admin).assignNFTRole([mockERC1155.getAddress()]);

    // add support currency
    await permissions.addCurrency([mockERC20.getAddress()]);

    // Mint NFTs for seller
    await mockERC1155.mint(seller.address, 1, 10);

    // Mint tokens for bidders
    const value = ethers.parseEther('100');
    await mockERC20['mint'](bidder1.address, value);
    await mockERC20['mint'](bidder2.address, value);

    // Approve tokens for auction contract
    const auctionAddress = await auction.getAddress();
    await mockERC20.connect(bidder1).approve(auctionAddress, value);
    await mockERC20.connect(bidder2).approve(auctionAddress, value);

    return {
      nftAuction: auction,
      mockERC20,
      mockERC1155,
      seller,
      admin,
      bidder1,
      bidder2,
      addressErc20: await mockERC20.getAddress(),
      addressErc1155: await mockERC1155.getAddress(),
      addressSystem: auctionAddress,
      permissions,
    };
  }

  let nftAuction, mockERC20, mockERC1155, admin, seller, bidder1, bidder2, addressErc20, addressErc1155, addressSystem, permissions;

  beforeEach(async function () {
    ({ nftAuction, mockERC20, mockERC1155, admin, seller, bidder1, bidder2, addressErc20, addressErc1155, addressSystem, permissions } =
      await loadFixture(deployContractLoadfixture));
  });

  function transformAuctionObject(auction: any) {
    return {
      id: auction[0],
      auctionCreator: auction[1],
      assetContract: auction[2],
      tokenId: auction[3],
      quantity: auction[4],
      currency: auction[5],
      startPrice: auction[6],
      ceilingPrice: auction[7],
      startTime: auction[8],
      endTime: auction[9],
      timeBufferInSeconds: auction[10],
      highestBidder: auction[11],
      highestBid: auction[12],
      stepAmount: auction[13],
      isPayoutCollected: auction[14],
      isTokenCollected: auction[15],
      status: auction[16],
      tokenType: auction[17],
    };
  }

  async function createAuction(tokenId: number) {
    const startTime = await time.latest();
    const endTime = startTime + 3600; // 1 hour later

    const auctionArgs = {
      _assetContract: addressErc1155,
      _tokenId: tokenId,
      _quantity: 10,
      _currency: addressErc20,
      _startPrice: ethers.parseEther('1'),
      _ceilingPrice: ethers.parseEther('100'),
      _stepAmount: 1,
      _timeBufferInSeconds: 120,
      _startTime: startTime,
      _endTime: endTime,
    };

    // Approve NFT transfer before creating auction
    await mockERC1155.connect(seller).setApprovalForAll(addressSystem, true);
    await nftAuction.connect(seller).createAuction(auctionArgs);

    const auction = await nftAuction.auctions(0);
    const auctionObject = transformAuctionObject(auction);
    return { startTime, endTime, auctionObject };
  }

  async function bid(auctionId: number, bidder: HardhatEthersSigner, amount: string) {
    const balance = await mockERC20.balanceOf(bidder.address);
    const value = ethers.parseEther(amount);

    if (balance < value) {
      console.log('❌ Insufficient balance');
      console.log('💰 Balance:', ethers.formatEther(balance));
      return;
    }

    const allowance = await mockERC20.allowance(bidder.address, addressSystem);

    if (allowance < value) {
      await mockERC20.connect(bidder).approve(addressSystem, 0); // Reset if needed
      await mockERC20.connect(bidder).approve(addressSystem, value);
    }

    await nftAuction.connect(bidder).bidInAuction(auctionId, value);
  }

  describe('Auction function create and cancel with ERC1155', function () {
    it('Should create an auction', async function () {
      const { startTime, endTime, auctionObject } = await createAuction(1);
      // console.log(auctionObject);
      expect(await mockERC1155.balanceOf(addressSystem, 1)).to.equal(10);

      expect(auctionObject).to.deep.include({
        id: BigInt(0),
        auctionCreator: seller.address,
        assetContract: addressErc1155,
        tokenId: BigInt(1),
        quantity: BigInt(10),
        currency: addressErc20,
        startPrice: ethers.parseEther('1'),
        ceilingPrice: ethers.parseEther('100'),
        startTime: BigInt(startTime),
        endTime: BigInt(endTime),
        timeBufferInSeconds: BigInt(120),
        highestBidder: ethers.ZeroAddress,
        highestBid: ethers.parseEther('1'),
        stepAmount: BigInt(1),
        isPayoutCollected: false,
        isTokenCollected: false,
        status: BigInt(0),
        tokenType: BigInt(1),
      });
    });
    it('Should revert an auction if NFT ERC1155 is not approved', async function () {
      // Override the createAuction function behavior to test without approval
      const startTime = await time.latest();
      const endTime = startTime + 3600; // 1 hour later

      const auctionArgs = {
        _assetContract: addressErc1155,
        _tokenId: 1,
        _quantity: 10,
        _currency: addressErc20,
        _startPrice: ethers.parseEther('1'),
        _ceilingPrice: ethers.parseEther('100'),
        _stepAmount: 1,
        _timeBufferInSeconds: 120,
        _startTime: startTime,
        _endTime: endTime,
      };

      // Revoke approval to test error case
      await mockERC1155.connect(seller).setApprovalForAll(addressSystem, false);
      await expect(nftAuction.connect(seller).createAuction(auctionArgs)).to.be.revertedWith(
        'Contract should be approved to transfer NFT',
      );
    });
    it('Should revert an auction if seller not enough balance', async function () {
      // Create a new token ID that doesn't exist for seller
      const nonExistentTokenId = 99;

      // Set approval for all to pass the approval check
      await mockERC1155.connect(seller).setApprovalForAll(addressSystem, true);

      // Try to create auction with a token the seller doesn't have
      const startTime = await time.latest();
      const endTime = startTime + 3600;

      const auctionArgs = {
        _assetContract: addressErc1155,
        _tokenId: nonExistentTokenId,
        _quantity: 10,
        _currency: addressErc20,
        _startPrice: ethers.parseEther('1'),
        _ceilingPrice: ethers.parseEther('100'),
        _stepAmount: 1,
        _timeBufferInSeconds: 120,
        _startTime: startTime,
        _endTime: endTime,
      };

      // Should fail with insufficient balance
      await expect(nftAuction.connect(seller).createAuction(auctionArgs)).to.be.revertedWith('Insufficient NFT balance');
    });

    it('Should revert if nft is not whitelisted', async function () {
      const startTime = await time.latest();
      const endTime = startTime + 3600; // 1 hour later

      await permissions.connect(admin).revokeNFTRole([mockERC1155.getAddress()]);

      await expect(
        nftAuction.connect(seller).createAuction({
          _assetContract: addressErc1155,
          _tokenId: 1,
          _quantity: 10,
          _currency: addressErc20,
          _startPrice: ethers.parseEther('1'),
          _ceilingPrice: ethers.parseEther('100'),
          _stepAmount: 1,
          _timeBufferInSeconds: 120, // 2 minutes
          _startTime: startTime,
          _endTime: endTime,
        }),
      ).to.be.revertedWith('NFT contract is not whitelisted');
    });
  });

  describe('Should test cancel auction', function () {
    beforeEach(async function () {
      await createAuction(1);
    });
    it('Should cancel an auction', async function () {
      await nftAuction.connect(seller).cancelAuction(0);
      const auction = await nftAuction.auctions(0);
      expect(auction.status).to.equal(2);
    });
    it('Should check transfer back NFT 1155 to auction creator', async function () {
      await nftAuction.connect(seller).cancelAuction(0);
      const balance = await mockERC1155.balanceOf(seller.address, 1);
      expect(balance).to.equal(10);
    });
    it('Should check nft of system if cancel failed', async function () {
      expect(await mockERC1155.balanceOf(addressSystem, 1)).to.equal(10);
    });
    it('Should revert if not the auction creator', async function () {
      await expect(nftAuction.connect(bidder1).cancelAuction(0)).to.be.revertedWith('You are not creator of this auction');
    });
    it('Should revert if auction is not exists', async function () {
      await expect(nftAuction.cancelAuction(2)).to.be.revertedWith('Auction does not exist');
    });
    it('Should revert if auction has bidder', async function () {
      await bid(0, bidder1, '11');
      await expect(nftAuction.connect(seller).cancelAuction(0)).to.be.revertedWith('Auction has bidders');
    });
    it('Should revert if auction is expired', async function () {
      await time.increase(7200); // 2 hours later
      await expect(nftAuction.connect(seller).cancelAuction(0)).to.be.revertedWith('Auction is expired');
    });
  });

  describe('Should test get auction', function () {
    beforeEach(async function () {
      // mint nfts erc1155 for seller
      await mockERC1155.mint(seller.address, 2, 10);
      await mockERC1155.mint(seller.address, 3, 10);

      await createAuction(1);
      await createAuction(2);
      await createAuction(3);
    });

    it('Should check total auction', async function () {
      expect(await nftAuction.totalAuctions()).to.equal(3);
    });

    it('Should get all auctions', async function () {
      const auctions = await nftAuction.getAllAuctions(1, 3);
      // console.log(auctions);
      expect(auctions.length).to.equal(2); // [1, 3)
    });

    it('Should get all valid auctions', async function () {
      // bid in auction 1
      await bid(1, bidder1, '11');
      const auctions = await nftAuction.getAllValidAuctions(1, 3);
      // console.log(auctions);
      expect(auctions.length).to.equal(1);
    });
  });

  describe('Should test claim NFT', function () {
    it('Should claim token the auction', async function () {
      await createAuction(1);

      // First, make sure bidder1 has enough tokens
      await mockERC20['mint'](bidder1.address, ethers.parseEther('11'));

      // Then approve and place a bid
      await mockERC20.connect(bidder1).approve(addressSystem, ethers.parseEther('11'));
      await nftAuction.connect(bidder1).bidInAuction(0, ethers.parseEther('11'));

      await time.increase(3610); // 1 hour later

      // First the seller needs to collect the payout to avoid ERC20InvalidReceiver error
      await nftAuction.connect(seller).collectAuctionPayout(0);

      // Then bidder1 can collect the NFT
      await nftAuction.connect(bidder1).collectAuctionToken(0);
      const balance = await mockERC1155.balanceOf(bidder1.address, 1);
      expect(balance).to.equal(10);
    });
    it('Should revert if not winning bidder', async function () {
      await createAuction(1);
      await time.increase(3610); // 1 hour later
      await expect(nftAuction.connect(bidder2).collectAuctionToken(0)).to.be.revertedWith(
        'Only winning bidder can collect token',
      );
    });
    it('Should revert if auction is not exists', async function () {
      await expect(nftAuction.collectAuctionToken(2)).to.be.revertedWith('Auction does not exist');
    });
    it('Should revert if auction is not expired', async function () {
      await expect(nftAuction.collectAuctionToken(0)).to.be.revertedWith('Auction does not exist');
    });
    it('Should revert if double claim', async function () {
      await createAuction(1);
      await bid(0, bidder1, '11');
      await time.increase(3610); // 1 hour later
      await nftAuction.connect(bidder1).collectAuctionToken(0);
      await expect(nftAuction.connect(bidder1).collectAuctionToken(0)).to.be.revertedWith('Token NFT already collected');
    });
  });
});
