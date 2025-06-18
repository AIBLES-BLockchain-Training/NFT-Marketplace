import '@nomicfoundation/hardhat-chai-matchers';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('NFTOffer', function () {
  let nftOffer: any;
  let permissions: any;
  let mockNFT: any;
  let mockERC1155: any;
  let mockERC20: any;

  let owner: HardhatEthersSigner;
  let offeror: HardhatEthersSigner;
  let nftOwner: HardhatEthersSigner;
  let feeRecipient: HardhatEthersSigner;
  let otherUser: HardhatEthersSigner;

  const TOKEN_ID = 1;
  const OFFER_PRICE = ethers.parseEther('1');
  const FEE_PERCENTAGE = 250; // 2.5%

  beforeEach(async function () {
    [owner, offeror, nftOwner, feeRecipient, otherUser] = await ethers.getSigners();

    // Deploy Permissions contract
    const PermissionsFactory = await ethers.getContractFactory('Permissions');
    permissions = await PermissionsFactory.deploy(owner.address);

    // Deploy mock contracts
    const MockNFTFactory = await ethers.getContractFactory('src/Mock/MockERC721.sol:MockERC721');
    mockNFT = await MockNFTFactory.deploy();

    const MockERC1155Factory = await ethers.getContractFactory('src/Mock/MockERC1155.sol:MockERC1155');
    mockERC1155 = await MockERC1155Factory.deploy();

    const MockERC20Factory = await ethers.getContractFactory('src/Mock/MockToken.sol:MockToken');
    mockERC20 = await MockERC20Factory.deploy(owner.address);

    // Deploy NFTOffer contract
    const NFTOfferFactory = await ethers.getContractFactory('NFTOffer');
    nftOffer = await NFTOfferFactory.deploy(feeRecipient.address, FEE_PERCENTAGE, await permissions.getAddress());

    // Setup permissions
    await permissions.assignOfferRole([offeror.address]);
    await permissions.assignNFTRole([await mockNFT.getAddress(), await mockERC1155.getAddress()]);
    await permissions.addCurrency([await mockERC20.getAddress()]);

    // Mint tokens
    await mockNFT.connect(owner).mint(nftOwner.address, TOKEN_ID);
    await mockERC1155.connect(owner).mint(nftOwner.address, TOKEN_ID, 10);
    await mockERC20.connect(owner).mint(offeror.address, ethers.parseEther('100'));

    // Setup approvals
    await mockNFT.connect(nftOwner).setApprovalForAll(await nftOffer.getAddress(), true);
    await mockERC1155.connect(nftOwner).setApprovalForAll(await nftOffer.getAddress(), true);
    await mockERC20.connect(offeror).approve(await nftOffer.getAddress(), ethers.parseEther('100'));
  });

  describe('Deployment', function () {
    it('should set correct initial values', async function () {
      expect(await nftOffer.owner()).to.equal(owner.address);
      expect(await nftOffer.feeRecipient()).to.equal(feeRecipient.address);
      expect(await nftOffer.feePercentage()).to.equal(FEE_PERCENTAGE);
      expect(await nftOffer.totalOffers()).to.equal(0);
    });
  });

  describe('makeOffer', function () {
    it('should create ERC721 offer successfully', async function () {
      const expirationTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      
      const params = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 1,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      await expect(nftOffer.connect(offeror).makeOffer(params))
        .to.emit(nftOffer, 'OfferCreated')
        .withArgs(1, offeror.address, await mockNFT.getAddress(), TOKEN_ID, 1, await mockERC20.getAddress(), OFFER_PRICE, expirationTime);

      const offer = await nftOffer.getOffer(1);
      expect(offer.offeror).to.equal(offeror.address);
      expect(offer.status).to.equal(1); // ACTIVE
      expect(offer.tokenType).to.equal(0); // ERC721
    });

    it('should create ERC1155 offer successfully', async function () {
      const expirationTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      
      const params = {
        assetContract: await mockERC1155.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 5,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      await nftOffer.connect(offeror).makeOffer(params);
      
      const offer = await nftOffer.getOffer(1);
      expect(offer.quantity).to.equal(5);
      expect(offer.tokenType).to.equal(1); // ERC1155
    });

    it('should revert when caller has no OFFER_ROLE', async function () {
      const expirationTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      
      const params = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 1,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      await expect(nftOffer.connect(otherUser).makeOffer(params))
        .to.be.revertedWithCustomError(nftOffer, 'CallerDoesNotHaveOfferRole');
    });

    it('should revert when quantity is zero', async function () {
      const expirationTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      
      const params = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 0,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      await expect(nftOffer.connect(offeror).makeOffer(params))
        .to.be.revertedWithCustomError(nftOffer, 'ZeroQuantity');
    });

    it('should revert when price is zero', async function () {
      const expirationTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      
      const params = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 1,
        currency: await mockERC20.getAddress(),
        totalPrice: 0,
        expirationTimestamp: expirationTime
      };

      await expect(nftOffer.connect(offeror).makeOffer(params))
        .to.be.revertedWithCustomError(nftOffer, 'ZeroPrice');
    });

    it('should revert when expiration is in past', async function () {
      const pastTime = Math.floor(Date.now() / 1000) - 3600;
      
      const params = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 1,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: pastTime
      };

      await expect(nftOffer.connect(offeror).makeOffer(params))
        .to.be.revertedWithCustomError(nftOffer, 'InvalidExpirationTimestamp');
    });

    it('should revert when ERC721 quantity > 1', async function () {
      const expirationTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      
      const params = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 2,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      await expect(nftOffer.connect(offeror).makeOffer(params))
        .to.be.revertedWithCustomError(nftOffer, 'QuantityMustBeOne');
    });
  });

  describe('cancelOffer', function () {
    beforeEach(async function () {
      const expirationTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      
      const params = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 1,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      await nftOffer.connect(offeror).makeOffer(params);
    });

    it('should cancel offer successfully', async function () {
      await expect(nftOffer.connect(offeror).cancelOffer(1))
        .to.emit(nftOffer, 'OfferCancelled')
        .withArgs(1, offeror.address);

      const offer = await nftOffer.getOffer(1);
      expect(offer.status).to.equal(3); // CANCELLED
    });

    it('should revert when caller is not offeror', async function () {
      await expect(nftOffer.connect(otherUser).cancelOffer(1))
        .to.be.revertedWithCustomError(nftOffer, 'NotOfferor');
    });

    it('should revert when offer does not exist', async function () {
      await expect(nftOffer.connect(offeror).cancelOffer(999))
        .to.be.revertedWithCustomError(nftOffer, 'OfferDoesNotExist');
    });
  });

  describe('acceptOffer', function () {
    beforeEach(async function () {
      const expirationTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      
      const params = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 1,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      await nftOffer.connect(offeror).makeOffer(params);
    });

    it('should accept ERC721 offer successfully', async function () {
      const offerorTokenBefore = await mockERC20.balanceOf(offeror.address);
      const nftOwnerTokenBefore = await mockERC20.balanceOf(nftOwner.address);
      const feeRecipientBefore = await mockERC20.balanceOf(feeRecipient.address);

      await expect(nftOffer.connect(nftOwner).acceptOffer(1))
        .to.emit(nftOffer, 'OfferAccepted');

      // Check NFT transfer
      expect(await mockNFT.ownerOf(TOKEN_ID)).to.equal(offeror.address);

      // Check token transfers
      const fee = OFFER_PRICE * BigInt(250) / BigInt(10000); // 2.5%
      const sellerAmount = OFFER_PRICE - fee;

      expect(await mockERC20.balanceOf(offeror.address)).to.equal(offerorTokenBefore - OFFER_PRICE);
      expect(await mockERC20.balanceOf(nftOwner.address)).to.equal(nftOwnerTokenBefore + sellerAmount);
      expect(await mockERC20.balanceOf(feeRecipient.address)).to.equal(feeRecipientBefore + fee);

      const offer = await nftOffer.getOffer(1);
      expect(offer.status).to.equal(2); // COMPLETED
    });

    it('should accept ERC1155 offer successfully', async function () {
      const expirationTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      
      const params = {
        assetContract: await mockERC1155.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 3,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      await nftOffer.connect(offeror).makeOffer(params);

      const nftOwnerBefore = await mockERC1155.balanceOf(nftOwner.address, TOKEN_ID);
      const offerorBefore = await mockERC1155.balanceOf(offeror.address, TOKEN_ID);

      await nftOffer.connect(nftOwner).acceptOffer(2);

      expect(await mockERC1155.balanceOf(nftOwner.address, TOKEN_ID)).to.equal(nftOwnerBefore - BigInt(3));
      expect(await mockERC1155.balanceOf(offeror.address, TOKEN_ID)).to.equal(offerorBefore + BigInt(3));
    });

    it('should revert when caller is not NFT owner', async function () {
      await expect(nftOffer.connect(otherUser).acceptOffer(1))
        .to.be.revertedWithCustomError(nftOffer, 'NotOwnerOfNFT');
    });

    it('should revert when offer does not exist', async function () {
      await expect(nftOffer.connect(nftOwner).acceptOffer(999))
        .to.be.revertedWithCustomError(nftOffer, 'OfferDoesNotExist');
    });

    it('should revert when offer is expired', async function () {
      const shortTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes - valid for creation
      
      const params = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID + 1,
        quantity: 1,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: shortTime
      };

      await mockNFT.connect(owner).mint(nftOwner.address, TOKEN_ID + 1);
      await nftOffer.connect(offeror).makeOffer(params);

      // Fast forward past expiration
      await time.increase(3600); // 1 hour

      await expect(nftOffer.connect(nftOwner).acceptOffer(2))
        .to.be.revertedWithCustomError(nftOffer, 'OfferExpired');
    });
  });

  describe('View Functions', function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      const expirationTime = currentTime + 1800; // 30 minutes
      
      const params1 = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 1,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      await nftOffer.connect(offeror).makeOffer(params1);
      
      const params2 = {
        assetContract: await mockERC1155.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 2,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      await nftOffer.connect(offeror).makeOffer(params2);
    });

    it('should return correct total offers', async function () {
      expect(await nftOffer.totalOffers()).to.equal(2);
    });

    it('should get offer details correctly', async function () {
      const offer = await nftOffer.getOffer(1);
      expect(offer.offeror).to.equal(offeror.address);
      expect(offer.assetContract).to.equal(await mockNFT.getAddress());
      expect(offer.tokenId).to.equal(TOKEN_ID);
      expect(offer.quantity).to.equal(1);
      expect(offer.status).to.equal(1); // ACTIVE
    });

    it('should get all offers in range', async function () {
      const offers = await nftOffer.getAllOffers(1, 2);
      expect(offers.length).to.equal(2);
      expect(offers[0].offerId).to.equal(1);
      expect(offers[1].offerId).to.equal(2);
    });

    it('should get only valid offers', async function () {
      await nftOffer.connect(offeror).cancelOffer(1);
      
      const validOffers = await nftOffer.getAllValidOffer(1, 2);
      expect(validOffers.length).to.equal(1);
      expect(validOffers[0].offerId).to.equal(2);
    });

    it('should revert when range is invalid', async function () {
      await expect(nftOffer.getAllOffers(2, 1))
        .to.be.revertedWithCustomError(nftOffer, 'InvalidRange');
    });

    it('should revert when ID is out of range', async function () {
      await expect(nftOffer.getOffer(999))
        .to.be.revertedWithCustomError(nftOffer, 'OfferIdOutOfRange');
    });
  });

  describe('Edge Cases', function () {
    it('should handle zero fee percentage', async function () {
      const zeroFeeOffer = await ethers.getContractFactory('NFTOffer');
      const zeroFeeContract: any = await zeroFeeOffer.deploy(feeRecipient.address, 0, await permissions.getAddress());

      await mockNFT.connect(nftOwner).setApprovalForAll(await zeroFeeContract.getAddress(), true);
      await mockERC20.connect(offeror).approve(await zeroFeeContract.getAddress(), OFFER_PRICE);

      const currentTime = await time.latest();
      const expirationTime = currentTime + 1800; // 30 minutes
      const params = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 1,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      await zeroFeeContract.connect(offeror).makeOffer(params);

      const nftOwnerBefore = await mockERC20.balanceOf(nftOwner.address);
      await zeroFeeContract.connect(nftOwner).acceptOffer(1);
      
      expect(await mockERC20.balanceOf(nftOwner.address)).to.equal(nftOwnerBefore + OFFER_PRICE);
    });

    it('should handle multiple offers from same user', async function () {
      await mockNFT.connect(owner).mint(nftOwner.address, TOKEN_ID + 1);
      
      const currentTime = await time.latest();
      const expirationTime = currentTime + 1800; // 30 minutes
      
      const params1 = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID,
        quantity: 1,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      const params2 = {
        assetContract: await mockNFT.getAddress(),
        tokenId: TOKEN_ID + 1,
        quantity: 1,
        currency: await mockERC20.getAddress(),
        totalPrice: OFFER_PRICE,
        expirationTimestamp: expirationTime
      };

      await nftOffer.connect(offeror).makeOffer(params1);
      await nftOffer.connect(offeror).makeOffer(params2);

      expect(await nftOffer.totalOffers()).to.equal(2);
      
      await nftOffer.connect(nftOwner).acceptOffer(1);
      await nftOffer.connect(nftOwner).acceptOffer(2);

      expect(await mockNFT.ownerOf(TOKEN_ID)).to.equal(offeror.address);
      expect(await mockNFT.ownerOf(TOKEN_ID + 1)).to.equal(offeror.address);
    });
  });
});