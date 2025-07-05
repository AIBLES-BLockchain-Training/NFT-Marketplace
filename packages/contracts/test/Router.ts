import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Router', function () {
  async function setup() {
    const [admin, user1, user2, user3] = await ethers.getSigners();

    // Deploy Permissions
    const PermissionsFactory = await ethers.getContractFactory('Permissions');
    const permissions = await PermissionsFactory.deploy();
    await permissions.waitForDeployment();
    await permissions['initialize'](admin.address);

    // Deploy Mock Tokens and NFTs
    const MockTokenFactory = await ethers.getContractFactory('MockToken');
    const mockToken = await MockTokenFactory.deploy(admin.address);
    await mockToken.waitForDeployment();

    const MockERC721Factory = await ethers.getContractFactory('MockERC721');
    const mockERC721 = await MockERC721Factory.deploy();
    await mockERC721.waitForDeployment();

    const MockERC1155Factory = await ethers.getContractFactory('MockERC1155');
    const mockERC1155 = await MockERC1155Factory.deploy();
    await mockERC1155.waitForDeployment();

    // Deploy Core Contracts
    const ListingFactory = await ethers.getContractFactory('Listing');
    const listing = await ListingFactory.deploy();
    await listing.waitForDeployment();
    await listing['initialize'](admin.address, await permissions.getAddress());

    const NFTAuctionFactory = await ethers.getContractFactory('NFTAuction');
    const nftAuction = await NFTAuctionFactory.deploy(await permissions.getAddress());
    await nftAuction.waitForDeployment();

    const OfferFactory = await ethers.getContractFactory('NFTOffer');
    const offer = await OfferFactory.deploy(admin.address, 250, await permissions.getAddress()); // 2.5% fee
    await offer.waitForDeployment();

    // Deploy ExtensionManager and Router
    const ExtensionManagerFactory = await ethers.getContractFactory('ExtensionManager');
    const extensionManager = await ExtensionManagerFactory.deploy(admin.address);
    await extensionManager.waitForDeployment();

    const RouterFactory = await ethers.getContractFactory('Router');
    const router = await RouterFactory.deploy(await extensionManager.getAddress());
    await router.waitForDeployment();

    // Setup permissions
    await permissions.connect(admin)['assignListingRole']([user1.address, user2.address]);
    await permissions.connect(admin)['assignAuctionRole']([user1.address, user2.address]);
    await permissions.connect(admin)['assignOfferRole']([user1.address, user2.address]);
    await permissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress(), await mockERC1155.getAddress()]);
    await permissions.connect(admin)['addCurrency']([await mockToken.getAddress(), ethers.ZeroAddress]);

    // Mint tokens and NFTs
    const initialSupply = ethers.parseUnits('1000', 18);
    await mockToken.connect(admin)['mint'](user1.address, initialSupply);
    await mockToken.connect(admin)['mint'](user2.address, initialSupply);
    
    await mockERC721.connect(admin)['mint'](user1.address, 1);
    await mockERC721.connect(admin)['mint'](user2.address, 2);
    
    await mockERC1155.connect(admin)['mint'](user1.address, 1, 10);
    await mockERC1155.connect(admin)['mint'](user2.address, 2, 5);

    return {
      router,
      extensionManager,
      listing,
      nftAuction,
      offer,
      permissions,
      mockToken,
      mockERC721,
      mockERC1155,
      admin,
      user1,
      user2,
      user3,
    };
  }

  describe('Deployment', function () {
    it('Should deploy with correct extension manager', async function () {
      const { router, extensionManager } = await loadFixture(setup);
      
      expect(await router['extensionManager']()).to.equal(await extensionManager.getAddress());
    });

    it('Should revert if extension manager is zero address', async function () {
      const RouterFactory = await ethers.getContractFactory('Router');
      
      await expect(RouterFactory.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(RouterFactory, 'RouterInvalidExtensionManager');
    });
  });

  describe('Router with Listing Extension', function () {
    it('Should add Listing extension and call functions through router', async function () {
      const { router, extensionManager, listing, admin } = await loadFixture(setup);
      
      // Add Listing extension
      const listingExtension = {
        metadata: {
          name: 'Listing',
          metadataURI: 'ipfs://listing',
          implementation: await listing.getAddress(),
        },
        functions: [
          {
            functionSelector: '0x61bc221a', // listingCounter()
            functionSignature: 'listingCounter()',
          },
          {
            functionSelector: '0x313ce567', // decimal()
            functionSignature: 'decimal()',
          },
          {
            functionSelector: '0x427e2f42', // permissionContract()
            functionSignature: 'permissionContract()',
          },
        ],
      };
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      // Test calling listingCounter through router
      const listingCounterData = listing.interface.encodeFunctionData('listingCounter');
      const result = await admin.call({
        to: await router.getAddress(),
        data: listingCounterData,
      });
      
      const decodedResult = listing.interface.decodeFunctionResult('listingCounter', result);
      expect(decodedResult[0]).to.equal(0); // Initial counter should be 0
    });

    it('Should handle complex listing creation through router', async function () {
      const { router, extensionManager, listing, mockToken, mockERC721, admin, user1 } = await loadFixture(setup);
      
      // Add Listing extension with createListing function
      const listingExtension = {
        metadata: {
          name: 'Listing',
          metadataURI: 'ipfs://listing',
          implementation: await listing.getAddress(),
        },
        functions: [
          {
            functionSelector: '0x1d1f1c20', // createListing(ListingParameters)
            functionSignature: 'createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))',
          },
        ],
      };
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      // Setup for listing creation
      await mockERC721.connect(user1)['setApprovalForAll'](await router.getAddress(), true);
      
      const block = await ethers.provider.getBlock('latest');
      const currentTimestamp = block!.timestamp + 1000;
      
      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 1,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      
      // Create listing through router
      const createListingData = listing.interface.encodeFunctionData('createListing', [listingParams]);
      
      await expect(
        user1.sendTransaction({
          to: await router.getAddress(),
          data: createListingData,
        })
      ).to.emit(listing, 'ListingCreated');
    });
  });

  describe('Router with NFTAuction Extension', function () {
    it('Should add NFTAuction extension and create auction through router', async function () {
      const { router, extensionManager, nftAuction, mockToken, mockERC721, admin, user1 } = await loadFixture(setup);
      
      // Add NFTAuction extension
      const auctionExtension = {
        metadata: {
          name: 'NFTAuction',
          metadataURI: 'ipfs://auction',
          implementation: await nftAuction.getAddress(),
        },
        functions: [
          {
            functionSelector: '0x2d915b59', // createAuction(AuctionParams)
            functionSignature: 'createAuction((address,uint256,uint256,address,uint256,uint256,uint256,uint256,uint256,uint256))',
          },
          {
            functionSelector: '0x19b58f14', // totalAuctions()
            functionSignature: 'totalAuctions()',
          },
        ],
      };
      
      await extensionManager.connect(admin)['addExtension'](auctionExtension);
      
      // Setup for auction creation
      await mockERC721.connect(user1)['setApprovalForAll'](await router.getAddress(), true);
      
      const block = await ethers.provider.getBlock('latest');
      const currentTimestamp = block!.timestamp;
      
      const auctionParams = {
        _assetContract: await mockERC721.getAddress(),
        _tokenId: 1,
        _quantity: 1,
        _currency: await mockToken.getAddress(),
        _startPrice: ethers.parseUnits('0.1', 18),
        _ceilingPrice: ethers.parseUnits('10', 18),
        _stepAmount: 500, // 5%
        _timeBufferInSeconds: 300, // 5 minutes
        _startTime: currentTimestamp + 100,
        _endTime: currentTimestamp + 7200, // 2 hours
      };
      
      // Create auction through router
      const createAuctionData = nftAuction.interface.encodeFunctionData('createAuction', [auctionParams]);
      
      await expect(
        user1.sendTransaction({
          to: await router.getAddress(),
          data: createAuctionData,
        })
      ).to.emit(nftAuction, 'NewAuction');
    });
  });

  describe('Router with Offer Extension', function () {
    it('Should add Offer extension and create offer through router', async function () {
      const { router, extensionManager, offer, mockToken, mockERC721, admin, user1 } = await loadFixture(setup);
      
      // Add Offer extension
      const offerExtension = {
        metadata: {
          name: 'NFTOffer',
          metadataURI: 'ipfs://offer',
          implementation: await offer.getAddress(),
        },
        functions: [
          {
            functionSelector: '0x4b8bcf2d', // makeOffer(OfferParams)
            functionSignature: 'makeOffer((address,uint256,uint256,address,uint256,uint256))',
          },
          {
            functionSelector: '0x4f0503e1', // totalOffers()
            functionSignature: 'totalOffers()',
          },
        ],
      };
      
      await extensionManager.connect(admin)['addExtension'](offerExtension);
      
      // Setup for offer creation
      await mockToken.connect(user1)['approve'](await router.getAddress(), ethers.parseUnits('1', 18));
      
      const block = await ethers.provider.getBlock('latest');
      const currentTimestamp = block!.timestamp;
      
      const offerParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 2, // user2's NFT
        quantity: 1,
        currency: await mockToken.getAddress(),
        totalPrice: ethers.parseUnits('1', 18),
        expirationTimestamp: currentTimestamp + 3600, // 1 hour
      };
      
      // Create offer through router
      const makeOfferData = offer.interface.encodeFunctionData('makeOffer', [offerParams]);
      
      await expect(
        user1.sendTransaction({
          to: await router.getAddress(),
          data: makeOfferData,
        })
      ).to.emit(offer, 'OfferCreated');
    });
  });

  describe('Multiple Extensions Integration', function () {
    it('Should handle multiple extensions simultaneously', async function () {
      const { router, extensionManager, listing, nftAuction, offer, admin } = await loadFixture(setup);
      
      // Add all three extensions
      const extensions = [
        {
          metadata: {
            name: 'Listing',
            metadataURI: 'ipfs://listing',
            implementation: await listing.getAddress(),
          },
          functions: [
            {
              functionSelector: '0x61bc221a', // listingCounter()
              functionSignature: 'listingCounter()',
            },
          ],
        },
        {
          metadata: {
            name: 'NFTAuction',
            metadataURI: 'ipfs://auction',
            implementation: await nftAuction.getAddress(),
          },
          functions: [
            {
              functionSelector: '0x19b58f14', // totalAuctions()
              functionSignature: 'totalAuctions()',
            },
          ],
        },
        {
          metadata: {
            name: 'NFTOffer',
            metadataURI: 'ipfs://offer',
            implementation: await offer.getAddress(),
          },
          functions: [
            {
              functionSelector: '0x4f0503e1', // totalOffers()
              functionSignature: 'totalOffers()',
            },
          ],
        },
      ];
      
      for (const ext of extensions) {
        await extensionManager.connect(admin)['addExtension'](ext);
      }
      
      // Test calling functions from different extensions
      const listingCounterData = listing.interface.encodeFunctionData('listingCounter');
      const totalAuctionsData = nftAuction.interface.encodeFunctionData('totalAuctions');
      const totalOffersData = offer.interface.encodeFunctionData('totalOffers');
      
      // All should work through the same router
      await admin.call({ to: await router.getAddress(), data: listingCounterData });
      await admin.call({ to: await router.getAddress(), data: totalAuctionsData });
      await admin.call({ to: await router.getAddress(), data: totalOffersData });
    });

    it('Should replace extension and maintain router functionality', async function () {
      const { router, extensionManager, listing, nftAuction, admin } = await loadFixture(setup);
      
      // Add initial listing extension
      const listingExtension = {
        metadata: {
          name: 'Listing',
          metadataURI: 'ipfs://listing',
          implementation: await listing.getAddress(),
        },
        functions: [
          {
            functionSelector: '0x61bc221a', // listingCounter()
            functionSignature: 'listingCounter()',
          },
        ],
      };
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      // Replace with auction extension (same name but different impl)
      const replacementExtension = {
        metadata: {
          name: 'Listing', // Same name
          metadataURI: 'ipfs://auction-replacement',
          implementation: await nftAuction.getAddress(),
        },
        functions: [
          {
            functionSelector: '0x19b58f14', // totalAuctions()
            functionSignature: 'totalAuctions()',
          },
        ],
      };
      
      await extensionManager.connect(admin)['replaceExtension'](replacementExtension);
      
      // Old function should no longer work
      const listingCounterData = listing.interface.encodeFunctionData('listingCounter');
      await expect(
        admin.call({
          to: await router.getAddress(),
          data: listingCounterData,
        })
      ).to.be.revertedWithCustomError(router, 'RouterFunctionDoesNotExist');
      
      // New function should work
      const totalAuctionsData = nftAuction.interface.encodeFunctionData('totalAuctions');
      await admin.call({
        to: await router.getAddress(),
        data: totalAuctionsData,
      });
    });
  });

  describe('Error Handling', function () {
    it('Should bubble up access control errors from extensions', async function () {
      const { router, extensionManager, listing, mockToken, mockERC721, admin, user3 } = await loadFixture(setup);
      
      // Add listing extension
      const listingExtension = {
        metadata: {
          name: 'Listing',
          metadataURI: 'ipfs://listing',
          implementation: await listing.getAddress(),
        },
        functions: [
          {
            functionSelector: '0x1d1f1c20', // createListing
            functionSignature: 'createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))',
          },
        ],
      };
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      const block = await ethers.provider.getBlock('latest');
      const currentTimestamp = block!.timestamp + 1000;
      
      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 1,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseUnits('1', 18),
        startTimestamp: currentTimestamp,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };
      
      const createListingData = listing.interface.encodeFunctionData('createListing', [listingParams]);
      
      // user3 doesn't have LISTING_ROLE, should revert
      await expect(
        user3.sendTransaction({
          to: await router.getAddress(),
          data: createListingData,
        })
      ).to.be.revertedWith('AccessControl: account is missing role');
    });

    it('Should handle function not found errors', async function () {
      const { router, user1 } = await loadFixture(setup);
      
      // Try calling non-existent function
      const nonExistentData = '0x12345678';
      
      await expect(
        user1.sendTransaction({
          to: await router.getAddress(),
          data: nonExistentData,
        })
      ).to.be.revertedWithCustomError(router, 'RouterFunctionDoesNotExist');
    });
  });

  describe('Receive Function', function () {
    it('Should accept ETH transfers', async function () {
      const { router, user1 } = await loadFixture(setup);
      
      const amount = ethers.parseEther('1');
      await expect(
        user1.sendTransaction({
          to: await router.getAddress(),
          value: amount,
        })
      ).to.changeEtherBalance(router, amount);
    });
  });

  describe('getImplementationForFunction', function () {
    it('Should return correct implementation for registered functions', async function () {
      const { router, extensionManager, listing, admin } = await loadFixture(setup);
      
      const listingExtension = {
        metadata: {
          name: 'Listing',
          metadataURI: 'ipfs://listing',
          implementation: await listing.getAddress(),
        },
        functions: [
          {
            functionSelector: '0x61bc221a', // listingCounter()
            functionSignature: 'listingCounter()',
          },
        ],
      };
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      const implementation = await router['getImplementationForFunction']('0x61bc221a');
      expect(implementation).to.equal(await listing.getAddress());
    });

    it('Should return zero address for unregistered functions', async function () {
      const { router } = await loadFixture(setup);
      
      const implementation = await router['getImplementationForFunction']('0x12345678');
      expect(implementation).to.equal(ethers.ZeroAddress);
    });
  });
});