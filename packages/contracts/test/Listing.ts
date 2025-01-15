import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers, network } from 'hardhat';

describe('Listing', function () {
  async function setup() {
    const [admin, user1, user2, user3] = await ethers.getSigners();

    const MockTokenFactory = await ethers.getContractFactory('MockToken');
    const mockToken = await MockTokenFactory.deploy(admin.address);
    await mockToken.waitForDeployment();

    const MockTokenFactory2 = await ethers.getContractFactory('MockToken');
    const mockToken2 = await MockTokenFactory.deploy(admin.address);
    await mockToken2.waitForDeployment();

    const initialSupply = ethers.parseUnits('1000', 18);
    await mockToken.connect(admin)['mint'](admin.address, initialSupply);
    await mockToken.connect(admin)['mint'](user1.address, initialSupply);
    await mockToken.connect(admin)['mint'](user2.address, ethers.parseUnits('0.01', 18));
    await mockToken.connect(admin)['mint'](user3.address, initialSupply);

    const MockERC721Factory = await ethers.getContractFactory('MockERC721');
    const mockERC721 = await MockERC721Factory.deploy();
    await mockERC721.waitForDeployment();

    await mockERC721.connect(admin)['mint'](user1.address, 0);
    await mockERC721.connect(admin)['mint'](user2.address, 1);
    await mockERC721.connect(admin)['mint'](user3.address, 2);

    const MockERC1155Factory = await ethers.getContractFactory('MockERC1155');
    const mockERC1155 = await MockERC1155Factory.deploy();
    await mockERC1155.waitForDeployment();

    await mockERC1155.connect(admin)['mint'](user1.address, 0, 10);
    await mockERC1155.connect(admin)['mint'](user2.address, 1, 5);
    await mockERC1155.connect(admin)['mint'](user3.address, 2, 3);

    // const MockReceiverFactory = await ethers.getContractFactory("MockReceiver");
    // const mockReceiver = await MockReceiverFactory.deploy(admin.address);
    // await mockReceiver.waitForDeployment();

    const ListingFactory = await ethers.getContractFactory('Listing');
    const listing = await ListingFactory.deploy(admin.address);
    await listing.waitForDeployment();

    return {
      listing,
      mockToken,
      mockToken2,
      mockERC721,
      mockERC1155,
      // mockReceiver,
      admin,
      user1,
      user2,
      user3,
    };
  }

  it('Should allow the owner to set a currency fee', async function () {
    const { listing, mockToken, admin } = await loadFixture(setup);

    const fee = 500;
    await expect(listing.connect(admin)['setCurrencyFee'](mockToken.target, fee))
      .to.emit(listing, 'CurrencyFeeUpdated')
      .withArgs(mockToken.target, fee);

    const storedFee = await listing['currencyFees'](mockToken.target);
    expect(storedFee).to.equal(fee);
  });

  it('Should revert if non-owner tries to set a currency fee', async function () {
    const { listing, mockToken, user1 } = await loadFixture(setup);

    const fee = 500;
    await expect(listing.connect(user1)['setCurrencyFee'](mockToken.target, fee))
      .to.be.revertedWithCustomError(listing, 'OwnableUnauthorizedAccount')
      .withArgs(user1.address);
  });

  it('Should revert if the currency address is invalid', async function () {
    const { listing, admin } = await loadFixture(setup);

    const fee = 500;
    await expect(listing.connect(admin)['setCurrencyFee'](ethers.ZeroAddress, fee)).to.be.revertedWith(
      'Invalid currency address',
    );
  });

  it('Should revert if the fee is out of range', async function () {
    const { listing, mockToken, admin } = await loadFixture(setup);

    await expect(listing.connect(admin)['setCurrencyFee'](mockToken.target, 0)).to.be.revertedWith(
      'Fee must be between 0 and 10000 (100%)',
    );

    await expect(listing.connect(admin)['setCurrencyFee'](mockToken.target, 10001)).to.be.revertedWith(
      'Fee must be between 0 and 10000 (100%)',
    );
  });

  describe('Create Listing', function () {
    it('Should create a ERC721 listing with valid parameters', async function () {
      const { listing, mockToken, mockERC721, admin, user1 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      const createdListing = await listing['listings'](listingCounter);
      expect(createdListing.owner).to.equal(user1.address);
      expect(createdListing.assetContract).to.equal(await mockERC721.getAddress());
      expect(createdListing.tokenId).to.equal(0);
      expect(createdListing.quantity).to.equal(1);
      expect(createdListing.pricePerToken).to.equal(ethers.parseUnits('1', 18));
      expect(createdListing.startTimestamp).to.equal(currentTimestamp);
      expect(createdListing.endTimestamp).to.equal(currentTimestamp + 604800);
      expect(createdListing.tokenType).to.equal(0);
      expect(createdListing.reserved).to.equal(false);
      expect(createdListing.status).to.equal(1);

      const ownedListingsAfter = await listing['getUserOwnedListings'](user1.address);

      expect(ownedListingsAfter).to.include(listingCounter);
    });

    it('Should create a ERC1155 listing with valid parameters', async function () {
      const { listing, mockToken, mockERC1155, admin, user1 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC1155.getAddress(),
        tokenId: 0,
        quantity: 5,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      await mockERC1155.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      const createdListing = await listing['listings'](listingCounter);
      expect(createdListing.owner).to.equal(user1.address);
      expect(createdListing.assetContract).to.equal(await mockERC1155.getAddress());
      expect(createdListing.tokenId).to.equal(0);
      expect(createdListing.quantity).to.equal(5);
      expect(createdListing.pricePerToken).to.equal(ethers.parseUnits('1', 18));
      expect(createdListing.startTimestamp).to.equal(currentTimestamp);
      expect(createdListing.endTimestamp).to.equal(currentTimestamp + 604800);
      expect(createdListing.tokenType).to.equal(1);
      expect(createdListing.reserved).to.equal(false);
      expect(createdListing.status).to.equal(1);

      const ownedListingsAfter = await listing['getUserOwnedListings'](user1.address);

      expect(ownedListingsAfter).to.include(listingCounter);
    });

    // it("Should revert if seller not approve NFT", async function () {
    //   const { listing, mockToken, mockERC721, mockERC1155, admin, user1 } = await loadFixture(setup);

    //   const block = await ethers.provider.getBlock("latest");
    //   if (!block) {
    //     throw new Error("Failed to get block");
    //   }
    //   const currentTimestamp = block.timestamp + 1000;

    //   const listingParams = {
    //     assetContract: await mockERC721.getAddress(),
    //     tokenId: 0,
    //     quantity: 1,
    //     currency: await mockToken.getAddress(),
    //     pricePerToken: ethers.parseUnits("1", 18),
    //     startTimestamp: currentTimestamp,
    //     endTimestamp: currentTimestamp + 604800,
    //     reserved: false,
    //   };
    //   await mockERC721.connect(user1)['approve'](await mockERC1155.getAddress(), 0);
    //   const listingCounter = await listing['listingCounter']();

    //   await expect(
    //     listing.connect(user1)['createListing'](listingParams)
    //   ).to.be.revertedWith("Contract is not approved to manage the token");

    // });

    // ======================================================================================================

    // it("Should not create listing with Unsupported token type", async function () {
    //   const { listing, mockToken, mockERC1155, admin, user1 } = await loadFixture(setup);

    //   const block = await ethers.provider.getBlock("latest");
    //   if (!block) {
    //     throw new Error("Failed to get block");
    //   }
    //   const currentTimestamp = block.timestamp + 1000;

    //   const listingParams = {
    //     assetContract: await mockToken.getAddress(),
    //     tokenId: 0,
    //     quantity: 5,
    //     currency: await mockToken.getAddress(),
    //     pricePerToken: ethers.parseUnits("1", 18),
    //     startTimestamp: currentTimestamp,
    //     endTimestamp: currentTimestamp + 604800,
    //     reserved: false,
    //   };

    //   await expect(listing.connect(user1)['createListing'](listingParams))
    //   .to.be.revertedWith("Unsupported token type");
    // });

    it('Should revert for invalid parameters', async function () {
      const { listing, mockToken, mockERC1155, admin, user1 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const invalidParamsList = [
        {
          description: 'invalid asset contract address',
          listingParams: {
            assetContract: ethers.ZeroAddress,
            tokenId: 0,
            quantity: 5,
            currency: await mockToken.getAddress(),
            pricePerToken: ethers.parseUnits('1', 18),
            startTimestamp: currentTimestamp,
            endTimestamp: currentTimestamp + 604800,
            reserved: false,
          },
          expectedRevert: 'Invalid asset contract address',
        },
        {
          description: 'invalid quantity (zero)',
          listingParams: {
            assetContract: await mockERC1155.getAddress(),
            tokenId: 0,
            quantity: 0,
            currency: await mockToken.getAddress(),
            pricePerToken: ethers.parseUnits('1', 18),
            startTimestamp: currentTimestamp,
            endTimestamp: currentTimestamp + 604800,
            reserved: false,
          },
          expectedRevert: 'Quantity must be greater than zero',
        },
        {
          description: 'invalid timestamps (start > end)',
          listingParams: {
            assetContract: await mockERC1155.getAddress(),
            tokenId: 0,
            quantity: 5,
            currency: await mockToken.getAddress(),
            pricePerToken: ethers.parseUnits('1', 18),
            startTimestamp: currentTimestamp + 10000,
            endTimestamp: currentTimestamp + 5000,
            reserved: false,
          },
          expectedRevert: 'Invalid timestamps',
        },
        {
          description: 'invalid price per token (zero)',
          listingParams: {
            assetContract: await mockERC1155.getAddress(),
            tokenId: 0,
            quantity: 5,
            currency: await mockToken.getAddress(),
            pricePerToken: ethers.parseUnits('0', 18),
            startTimestamp: currentTimestamp,
            endTimestamp: currentTimestamp + 604800,
            reserved: false,
          },
          expectedRevert: 'Price per token must be greater than zero',
        },
        {
          description: 'invalid start timestamp (in the past)',
          listingParams: {
            assetContract: await mockERC1155.getAddress(),
            tokenId: 0,
            quantity: 5,
            currency: await mockToken.getAddress(),
            pricePerToken: ethers.parseUnits('1', 18),
            startTimestamp: currentTimestamp - 1000,
            endTimestamp: currentTimestamp + 604800,
            reserved: false,
          },
          expectedRevert: 'Start time must be in the future',
        },
      ];

      for (const { listingParams, expectedRevert } of invalidParamsList) {
        await expect(listing.connect(user1)['createListing'](listingParams)).to.be.revertedWith(expectedRevert);
      }
    });
  });

  describe('Update Listing', function () {
    it('Should update the listing successfully', async function () {
      const { listing, mockToken, mockERC721, admin, user1 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      const updatedParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('2', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 691200,
        reserved: true,
      };
      await listing.connect(user1)['updateListing'](0, updatedParams);
      const updatedListing = await listing['listings'](listingCounter);
      expect(updatedListing.assetContract).to.equal(updatedParams.assetContract);
      expect(updatedListing.tokenId).to.equal(updatedParams.tokenId);
      expect(updatedListing.quantity).to.equal(updatedParams.quantity);
      expect(updatedListing.currency).to.equal(updatedParams.currency);
      expect(updatedListing.pricePerToken).to.equal(updatedParams.pricePerToken);
      expect(updatedListing.startTimestamp).to.equal(updatedParams.startTimestamp);
      expect(updatedListing.endTimestamp).to.equal(updatedParams.endTimestamp);
      expect(updatedListing.reserved).to.equal(updatedParams.reserved);
    });

    it('Should revert if listing parameters are invalid', async function () {
      const { listing, mockToken, mockERC721, mockERC1155, admin, user1, user2 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      const invalidParamsList = [
        {
          description: 'invalid asset contract address',
          listingParams: {
            assetContract: ethers.ZeroAddress,
            tokenId: 0,
            quantity: 5,
            currency: await mockToken.getAddress(),
            pricePerToken: ethers.parseUnits('1', 18),
            startTimestamp: currentTimestamp,
            endTimestamp: currentTimestamp + 604800,
            reserved: false,
          },
          expectedRevert: 'Invalid asset contract address',
        },
        {
          description: 'invalid quantity (zero)',
          listingParams: {
            assetContract: await mockERC1155.getAddress(),
            tokenId: 0,
            quantity: 0,
            currency: await mockToken.getAddress(),
            pricePerToken: ethers.parseUnits('1', 18),
            startTimestamp: currentTimestamp,
            endTimestamp: currentTimestamp + 604800,
            reserved: false,
          },
          expectedRevert: 'Quantity must be greater than zero',
        },
        {
          description: 'invalid timestamps (start > end)',
          listingParams: {
            assetContract: await mockERC1155.getAddress(),
            tokenId: 0,
            quantity: 5,
            currency: await mockToken.getAddress(),
            pricePerToken: ethers.parseUnits('1', 18),
            startTimestamp: currentTimestamp + 10000,
            endTimestamp: currentTimestamp + 5000,
            reserved: false,
          },
          expectedRevert: 'Invalid timestamps',
        },
        {
          description: 'invalid price per token (zero)',
          listingParams: {
            assetContract: await mockERC1155.getAddress(),
            tokenId: 0,
            quantity: 5,
            currency: await mockToken.getAddress(),
            pricePerToken: ethers.parseUnits('0', 18),
            startTimestamp: currentTimestamp,
            endTimestamp: currentTimestamp + 604800,
            reserved: false,
          },
          expectedRevert: 'Price per token must be greater than zero',
        },
        {
          description: 'invalid start timestamp (in the past)',
          listingParams: {
            assetContract: await mockERC1155.getAddress(),
            tokenId: 0,
            quantity: 5,
            currency: await mockToken.getAddress(),
            pricePerToken: ethers.parseUnits('1', 18),
            startTimestamp: currentTimestamp - 1000,
            endTimestamp: currentTimestamp + 604800,
            reserved: false,
          },
          expectedRevert: 'Start time must be in the future',
        },
      ];

      for (const { listingParams, expectedRevert } of invalidParamsList) {
        await expect(listing.connect(user1)['updateListing'](0, listingParams)).to.be.revertedWith(expectedRevert);
      }
    });

    it('Should revert if the caller is not the owner', async function () {
      const { listing, mockToken, mockERC721, admin, user1, user2 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      const updatedParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('2', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 691200,
        reserved: true,
      };

      await expect(listing.connect(user2)['updateListing'](0, updatedParams)).to.be.revertedWith('Only owner can update listing');
    });

    it('Should not update listing with non-exist listing', async function () {
      const { listing, mockToken, mockERC721, admin, user1 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }

      const currentTimestamp = block.timestamp + 1000;
      const updatedParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('2', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 691200,
        reserved: true,
      };
      await expect(listing.connect(user1)['updateListing'](1, updatedParams)).to.be.revertedWith('Listing does not exist');
    });

    it('Should not update listings with non-CREATED status', async function () {
      const { listing, mockToken, mockERC721, admin, user1 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      await listing.connect(user1)['cancelListing'](0);

      const updatedParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('2', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 691200,
        reserved: true,
      };
      await expect(listing.connect(user1)['updateListing'](0, updatedParams)).to.be.revertedWith(
        'Listing must be in CREATED status',
      );
    });
  });

  describe('Cancel Listing', function () {
    it('Should cancel the listing successfully', async function () {
      const { listing, mockToken, mockERC721, admin, user1 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      await listing.connect(user1)['cancelListing'](0);

      const createdListing = await listing['listings'](listingCounter);
      expect(createdListing.status).to.equal(3);
    });

    it('Should not cancel listing with non-exist listing', async function () {
      const { listing, mockToken, mockERC721, admin, user1 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      await expect(listing.connect(user1)['cancelListing'](1)).to.be.revertedWith('Listing does not exist');
    });

    it('Should revert if the caller is not the owner', async function () {
      const { listing, mockToken, mockERC721, admin, user1, user2 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      await expect(listing.connect(user2)['cancelListing'](0)).to.be.revertedWith('Only owner can cancel listing');
    });

    it('Should not cancel listings with non-CREATED status', async function () {
      const { listing, mockToken, mockERC721, admin, user1 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      await listing.connect(user1)['cancelListing'](0);
      await expect(listing.connect(user1)['cancelListing'](0)).to.be.revertedWith('Listing must be in CREATED status');
    });
  });
  describe('Approve Buyer For Listing', function () {
    it('Should approve a buyer successfully for a reserved listing', async function () {
      const { listing, mockToken, mockERC721, admin, user1, user2 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: true,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      await listing.connect(user1)['approveBuyerForListing'](listingCounter, user2.address, true);

      const isApproved = await listing['buyerApprovals'](listingCounter, user2.address);
      expect(isApproved).to.equal(true);
    });

    it('Should not approve buyer with non-exist listing', async function () {
      const { listing, mockToken, mockERC721, admin, user1, user2 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      await expect(listing.connect(user1)['approveBuyerForListing'](1, user2.address, true)).to.be.revertedWith(
        'Listing does not exist',
      );
    });

    it('Should revert if the caller is not the owner of the listing', async function () {
      const { listing, mockToken, mockERC721, admin, user1, user2 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: true,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      const listingCounter = await listing['listingCounter']();

      await listing.connect(user1)['createListing'](listingParams);

      await expect(listing.connect(user2)['approveBuyerForListing'](listingCounter, user2.address, true)).to.be.revertedWith(
        'Only owner can approve currency',
      );
    });

    it('Should revert if the listing is not in CREATED status', async function () {
      const { listing, mockERC721, admin, user1, user2 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: true,
      };

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      const listingId = await listing['listingCounter']();

      await listing.connect(user1)['cancelListing'](0);

      await expect(listing.connect(user1)['approveBuyerForListing'](0, user2.address, true)).to.be.revertedWith(
        'Listing must be in CREATED status',
      );
    });

    it('Should revert if the listing is not reserved', async function () {
      const { listing, mockERC721, admin, user1, user2 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await expect(listing.connect(user1)['approveBuyerForListing'](0, user2.address, true)).to.be.revertedWith(
        'Listing is not reserved',
      );
    });
  });

  describe('Approve Currency For Listing', function () {
    it('Should approve a currency successfully with a valid price', async function () {
      const { listing, mockERC721, admin, user1, mockToken } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      const pricePerTokenInCurrency = ethers.parseUnits('2', 18);

      await expect(
        listing.connect(user1)['approveCurrencyForListing'](listingId, await mockToken.getAddress(), pricePerTokenInCurrency),
      )
        .to.emit(listing, 'CurrencyApproved')
        .withArgs(listingId, await mockToken.getAddress(), pricePerTokenInCurrency);

      const approvedPrice = await listing['currencyApprovals'](listingId, await mockToken.getAddress());
      expect(approvedPrice).to.equal(pricePerTokenInCurrency);
    });

    it('Should remove a currency approval if pricePerTokenInCurrency is 0', async function () {
      const { listing, mockERC721, admin, user1, mockToken } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      const pricePerTokenInCurrency = ethers.parseUnits('2', 18);

      await listing.connect(user1)['approveCurrencyForListing'](listingId, await mockToken.getAddress(), pricePerTokenInCurrency);

      await expect(listing.connect(user1)['approveCurrencyForListing'](listingId, await mockToken.getAddress(), 0))
        .to.emit(listing, 'CurrencyApproved')
        .withArgs(listingId, await mockToken.getAddress(), 0);

      const approvedPrice = await listing['currencyApprovals'](listingId, await mockToken.getAddress());
      expect(approvedPrice).to.equal(0);
    });

    it('Should not approve currency with non-exist listing', async function () {
      const { listing, mockToken, mockERC721, admin, user1, user2 } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);

      await listing.connect(user1)['createListing'](listingParams);

      const pricePerTokenInCurrency = ethers.parseUnits('2', 18);

      await expect(
        listing.connect(user1)['approveCurrencyForListing'](1, await mockToken.getAddress(), pricePerTokenInCurrency),
      ).to.be.revertedWith('Listing does not exist');
    });

    it('Should revert if the caller is not the owner of the listing', async function () {
      const { listing, mockERC721, admin, user1, user2, mockToken } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      const pricePerTokenInCurrency = ethers.parseUnits('2', 18);

      await expect(
        listing.connect(user2)['approveCurrencyForListing'](listingId, await mockToken.getAddress(), pricePerTokenInCurrency),
      ).to.be.revertedWith('Only owner can approve buyers');
    });

    it('Should revert if the listing is not in CREATED status', async function () {
      const { listing, mockERC721, admin, user1, mockToken } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      const pricePerTokenInCurrency = ethers.parseUnits('2', 18);

      await listing.connect(user1)['cancelListing'](listingId);

      await expect(
        listing.connect(user1)['approveCurrencyForListing'](listingId, await mockToken.getAddress(), pricePerTokenInCurrency),
      ).to.be.revertedWith('Listing must be in CREATED status');
    });
  });

  describe('Buy From Listing', function () {
    it('Should allow valid purchase for ERC721 listing', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      const beforeSellerBalance = await mockToken['balanceOf'](user1.address);

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      )
        .to.emit(listing, 'NFTPurchased')
        .withArgs(listingId, user3.address, 1, ethers.parseUnits('1', 18));

      const updatedListing = await listing['listings'](listingId);
      expect(updatedListing.quantity).to.equal(0);
      expect(updatedListing.status).to.equal(2);

      const user3Balance = await mockERC721['balanceOf'](user3.address);
      expect(user3Balance).to.equal(2);

      const accumulatedFee = await listing['accumulatedFees'](await mockToken.getAddress());
      expect(accumulatedFee).to.equal(ethers.parseUnits('0.05', 18));

      const afterSellerBalance = await mockToken['balanceOf'](user1.address);
      expect(afterSellerBalance).to.equal(beforeSellerBalance + ethers.parseUnits('0.95', 18));
    });

    it('Should allow valid purchase for ERC721 listing with approve reserve', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: true,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing.connect(user1)['approveBuyerForListing'](listingId, user3.address, true);
      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      const beforeSellerBalance = await mockToken['balanceOf'](user1.address);

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      )
        .to.emit(listing, 'NFTPurchased')
        .withArgs(listingId, user3.address, 1, ethers.parseUnits('1', 18));

      const updatedListing = await listing['listings'](listingId);
      expect(updatedListing.quantity).to.equal(0);
      expect(updatedListing.status).to.equal(2);

      const user3Balance = await mockERC721['balanceOf'](user3.address);
      expect(user3Balance).to.equal(2);

      const accumulatedFee = await listing['accumulatedFees'](await mockToken.getAddress());
      expect(accumulatedFee).to.equal(ethers.parseUnits('0.05', 18));

      const afterSellerBalance = await mockToken['balanceOf'](user1.address);
      expect(afterSellerBalance).to.equal(beforeSellerBalance + ethers.parseUnits('0.95', 18));
    });

    it('Should allow valid purchase for ERC1155 listing', async function () {
      const { listing, mockERC1155, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC1155.getAddress(),
        tokenId: 0,
        quantity: 10,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC1155.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      const beforeSellerBalance = await mockToken['balanceOf'](user1.address);

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      )
        .to.emit(listing, 'NFTPurchased')
        .withArgs(listingId, user3.address, 1, ethers.parseUnits('1', 18));

      const updatedListing = await listing['listings'](listingId);
      expect(updatedListing.quantity).to.equal(9);
      expect(updatedListing.status).to.equal(1);

      const user3Balance = await mockERC1155['balanceOf'](user3.address, 0);
      expect(user3Balance).to.equal(1);

      const accumulatedFee = await listing['accumulatedFees'](await mockToken.getAddress());
      expect(accumulatedFee).to.equal(ethers.parseUnits('0.05', 18));

      const afterSellerBalance = await mockToken['balanceOf'](user1.address);
      expect(afterSellerBalance).to.equal(beforeSellerBalance + ethers.parseUnits('0.95', 18));
    });

    it('Should not buy listing with non-exist listing id', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      const beforeSellerBalance = await mockToken['balanceOf'](user1.address);

      await expect(
        listing.connect(user3)['buyFromListing'](1, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Listing does not exist');
    });

    it('Should revert if buyFor is address 0', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      const beforeSellerBalance = await mockToken['balanceOf'](user1.address);

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, ethers.ZeroAddress, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Invalid recipient address');
    });

    it('Should revert if listing ended', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      const beforeSellerBalance = await mockToken['balanceOf'](user1.address);

      await network.provider.send('evm_increaseTime', [6048010]);
      await network.provider.send('evm_mine');

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Listing ended');
    });

    it('Should revert if listing is not available', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      await listing.connect(user1)['cancelListing'](listingId);

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Listing is not available for purchase');
    });

    it('Should revert if buy listing with invalid quantity', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken, mockToken2 } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 2, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Invalid quantity');
    });

    it('Should revert if buy listing with currency not approve', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken, mockToken2 } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken2.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Currency not approved for this listing');
    });

    it('Should revert if buy listing with incorect total price', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken, mockToken2 } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('0.5', 18)),
      ).to.be.revertedWith('Incorrect total price');
    });

    it('Should revert if payment transfer failed', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken, mockToken2 } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(admin)['setTransferFailType'](1);

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Payment transfer failed');
    });

    it('Should revert if payment transfer failed', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken, mockToken2 } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(admin)['setTransferFailType'](2);

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Fee transfer failed');
    });

    // it("Should allow valid purchase for ERC721 listing and buy for a contract", async function () {
    //   const { listing, mockERC721, admin, user1, user3, mockToken, mockReceiver } = await loadFixture(setup);

    //   await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

    //   const block = await ethers.provider.getBlock("latest");
    //   if (!block) {
    //       throw new Error("Failed to get block");
    //   }
    //   const currentTimestamp = block.timestamp + 1000;

    //   const listingParams = {
    //       assetContract: await mockERC721.getAddress(),
    //       tokenId: 0,
    //       quantity: 1,
    //       currency: ethers.ZeroAddress,
    //       pricePerToken: ethers.parseUnits("1", 18),
    //       startTimestamp: currentTimestamp,
    //       endTimestamp: currentTimestamp + 604800,
    //       reserved: false,
    //   };

    //   const listingId = await listing['listingCounter']();

    //   await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
    //   await listing.connect(user1)['createListing'](listingParams);

    //   await listing.connect(user1)['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits("1", 18))

    //   await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits("1", 18));

    //   const beforeSellerBalance = await mockToken['balanceOf'](user1.address);

    //   await expect(
    //     listing.connect(user3)['buyFromListing'](
    //         listingId,
    //         await mockReceiver.getAddress(),
    //         1,
    //         await mockToken.getAddress(),
    //         ethers.parseUnits("1", 18)
    //     )
    //   )
    //     .to.emit(listing, "NFTPurchased")
    //     .withArgs(listingId, user3.address, 1, ethers.parseUnits("1", 18));

    //   const updatedListing = await listing['listings'](listingId);
    //   expect(updatedListing.quantity).to.equal(0);
    //   expect(updatedListing.status).to.equal(2);

    //   const user3Balance = await mockERC721['balanceOf'](user3.address);
    //   expect(user3Balance).to.equal(2);

    //   const accumulatedFee = await listing['accumulatedFees'](await mockToken.getAddress());
    //   expect(accumulatedFee).to.equal(ethers.parseUnits("0.05", 18));

    //   const afterSellerBalance = await mockToken['balanceOf'](user1.address);
    //   expect(afterSellerBalance).to.equal(beforeSellerBalance + ethers.parseUnits("0.95", 18));
    // });

    // it("Should allow valid purchase for ERC1155 listing and buy for a contract", async function () {
    //   const { listing, mockERC1155, admin, user1, user3, mockToken, mockReceiver } = await loadFixture(setup);

    //   await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

    //   const block = await ethers.provider.getBlock("latest");
    //   if (!block) {
    //       throw new Error("Failed to get block");
    //   }
    //   const currentTimestamp = block.timestamp + 1000;

    //   const listingParams = {
    //       assetContract: await mockERC1155.getAddress(),
    //       tokenId: 0,
    //       quantity: 10,
    //       currency: ethers.ZeroAddress,
    //       pricePerToken: ethers.parseUnits("1", 18),
    //       startTimestamp: currentTimestamp,
    //       endTimestamp: currentTimestamp + 604800,
    //       reserved: false,
    //   };

    //   const listingId = await listing['listingCounter']();

    //   await mockERC1155.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
    //   await listing.connect(user1)['createListing'](listingParams);

    //   await listing.connect(user1)['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits("1", 18))

    //   await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits("1", 18));

    //   const beforeSellerBalance = await mockToken['balanceOf'](user1.address);

    //   await expect(
    //     listing.connect(user3)['buyFromListing'](
    //         listingId,
    //         await mockReceiver.getAddress(),
    //         1,
    //         await mockToken.getAddress(),
    //         ethers.parseUnits("1", 18)
    //     )
    //   )
    //     .to.emit(listing, "NFTPurchased")
    //     .withArgs(listingId, user3.address, 1, ethers.parseUnits("1", 18));

    //   const updatedListing = await listing['listings'](listingId);
    //   expect(updatedListing.quantity).to.equal(9);
    //   expect(updatedListing.status).to.equal(1);

    //   const user3Balance = await mockERC1155['balanceOf'](user3.address, 0);
    //   expect(user3Balance).to.equal(1);

    //   const accumulatedFee = await listing['accumulatedFees'](await mockToken.getAddress());
    //   expect(accumulatedFee).to.equal(ethers.parseUnits("0.05", 18));

    //   const afterSellerBalance = await mockToken['balanceOf'](user1.address);
    //   expect(afterSellerBalance).to.equal(beforeSellerBalance + ethers.parseUnits("0.95", 18));
    // });
    it('Should revert if seller no longer owns the ERC721 token', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken, mockToken2 } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      await mockERC721.connect(user1)['transferFrom'](user1.address, user3.address, 0);

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Seller no longer owns the token');
    });

    it('Should revert if seller does not have enough ERC1155 tokens', async function () {
      const { listing, mockERC1155, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC1155.getAddress(),
        tokenId: 0,
        quantity: 10,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC1155.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      await mockERC1155.connect(user1)['safeTransferFrom'](user1.address, user3.address, 0, 5, '0x');

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 6, await mockToken.getAddress(), ethers.parseUnits('6', 18)),
      ).to.be.revertedWith('Seller does not have enough tokens');
    });

    it('Should revert if seller is not approved ERC721', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken, mockToken2 } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), false);

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Contract is not approved to manage the token');
    });

    it('Should revert if seller is not approved ERC1155', async function () {
      const { listing, mockERC1155, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC1155.getAddress(),
        tokenId: 0,
        quantity: 10,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC1155.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      await mockERC1155.connect(user1)['setApprovalForAll'](await listing.getAddress(), false);

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 6, await mockToken.getAddress(), ethers.parseUnits('6', 18)),
      ).to.be.revertedWith('Contract is not approved to manage the tokens');
    });

    it('Should revert if seller is not approved ERC721 with approve func', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken, mockToken2 } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['approve'](await listing.getAddress(), 0);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      await mockERC721.connect(user1)['approve'](await mockToken.getAddress(), 0);

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Contract is not approved to manage the token');
    });

    it('Should revert if Buyer is not approved for this listing', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken, mockToken2 } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: true,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['approve'](await listing.getAddress(), 0);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Buyer is not approved for this listing');
    });
    it('Should revert if buyer has not approved enough currency', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken, mockToken2 } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['approve'](await listing.getAddress(), 0);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('0.5', 18));

      await expect(
        listing
          .connect(user3)
          ['buyFromListing'](listingId, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Buyer has not approved enough currency');
    });

    it('Should revert if buyer not enough currency', async function () {
      const { listing, mockERC721, admin, user1, user2, mockToken, mockToken2 } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['approve'](await listing.getAddress(), 0);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user2)['approve'](await listing.getAddress(), ethers.parseUnits('0.01', 18));

      await expect(
        listing
          .connect(user2)
          ['buyFromListing'](listingId, user2.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18)),
      ).to.be.revertedWith('Insufficient balance');
    });
  });
  describe('Get Function', function () {
    it('Should return the total number of listings', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      const totalListings = await listing['totalListings']();
      expect(totalListings).to.equal(1);
    });

    it('Should return the all listings', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      const allListings = await listing['getAllListings'](0, 0);
      expect(allListings.length).to.equal(1);
      // console.log(allListings);
    });

    it('Should revert if get all listing startId > endId', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await expect(listing['getAllListings'](1, 0)).to.be.revertedWith('Invalid range');
    });

    it('Should revert if get all listing endId > listing counter', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await expect(listing['getAllListings'](0, 5)).to.be.revertedWith('End ID exceeds total listings');
    });

    it('Should return the all valid listings', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      const allListings = await listing['getAllValidListings'](0, 0);
      expect(allListings.length).to.equal(1);
    });

    it('Should revert if get all valid listing startId > endId', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await expect(listing['getAllValidListings'](1, 0)).to.be.revertedWith('Invalid range');
    });

    it('Should revert if get all valid listing endId > listing counter', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await expect(listing['getAllValidListings'](0, 5)).to.be.revertedWith('End ID exceeds total listings');
    });

    it('Should return the user owned listings', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      const allListings = await listing['getUserOwnedListings'](user1.address);
      expect(allListings.length).to.equal(1);
    });

    it('Should return detail listings', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      const listingDetail = await listing['getListing'](0);
    });

    it('Should revert if get detail listings with non-exist listingId', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await expect(listing['getListing'](1)).to.be.revertedWith('Listing does not exist');
    });

    it('Should revert if admin not set currency fee', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await expect(listing['getCurrencyFee'](await mockToken.getAddress())).to.be.revertedWith(
        'Currency fee must be greater than 0',
      );
    });

    it('Should with draw fee correctly', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      const beforeAdminBalance = await mockToken['balanceOf'](admin.address);

      await listing
        .connect(user3)
        ['buyFromListing'](0, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18));
      await listing.connect(admin)['withdrawFees'](await mockToken.getAddress());
      const afterAdminBalance = await mockToken['balanceOf'](admin.address);
      expect(afterAdminBalance).to.equal(beforeAdminBalance + ethers.parseUnits('0.05', 18));
    });

    it('Should revert if non-admin with draw fee ', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await listing
        .connect(user1)
        ['approveCurrencyForListing'](listingId, await mockToken.getAddress(), ethers.parseUnits('1', 18));

      await mockToken.connect(user3)['approve'](await listing.getAddress(), ethers.parseUnits('1', 18));

      const beforeAdminBalance = await mockToken['balanceOf'](admin.address);

      await listing
        .connect(user3)
        ['buyFromListing'](0, user3.address, 1, await mockToken.getAddress(), ethers.parseUnits('1', 18));
      await expect(listing.connect(user1)['withdrawFees'](await mockToken.getAddress())).to.be.revertedWithCustomError(
        listing,
        'OwnableUnauthorizedAccount',
      );
    });

    it('Should revert if no fees to withdraw', async function () {
      const { listing, mockERC721, admin, user1, user3, mockToken } = await loadFixture(setup);

      await listing.connect(admin)['setCurrencyFee'](mockToken.target, 500);

      const block = await ethers.provider.getBlock('latest');
      if (!block) {
        throw new Error('Failed to get block');
      }
      const currentTimestamp = block.timestamp + 1000;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 0,
        quantity: 1,
        currency: ethers.ZeroAddress,
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      const listingId = await listing['listingCounter']();

      await mockERC721.connect(user1)['setApprovalForAll'](await listing.getAddress(), true);
      await listing.connect(user1)['createListing'](listingParams);

      await expect(listing.connect(admin)['withdrawFees'](await mockToken.getAddress())).to.be.revertedWith(
        'No fees to withdraw',
      );
    });
  });
});
