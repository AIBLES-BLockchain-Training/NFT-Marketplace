import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { log } from 'console';
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
    await listing['initializeListing'](await permissions.getAddress());

    const NFTAuctionFactory = await ethers.getContractFactory('NFTAuction');
    const nftAuction = await NFTAuctionFactory.deploy(await permissions.getAddress());
    await nftAuction.waitForDeployment();

    const OfferFactory = await ethers.getContractFactory('NFTOffer');
    const offer = await OfferFactory.deploy(admin.address, 250, await permissions.getAddress()); 
    await offer.waitForDeployment();

    // Deploy ExtensionManager and Router
    const ExtensionManagerFactory = await ethers.getContractFactory('ExtensionManager');
    const extensionManager = await ExtensionManagerFactory.deploy(admin.address);
    await extensionManager.waitForDeployment();

    const RouterFactory = await ethers.getContractFactory('Router');
    const router = await RouterFactory.deploy(await extensionManager.getAddress());
    await router.waitForDeployment();

    // Setup permissions - only assign LISTING_ROLE to user1
    const LISTING_ROLE = await permissions['LISTING_ROLE']();
    await permissions.connect(admin)['assignRole'](LISTING_ROLE, [user1.address]);
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

    const routerAsListing = await ethers.getContractAt('Listing', await router.getAddress());
    const routerAsAuction = await ethers.getContractAt('NFTAuction', await router.getAddress());
    const routerAsOffer = await ethers.getContractAt('NFTOffer', await router.getAddress());
    const routerAsPermissions = await ethers.getContractAt('Permissions', await router.getAddress());

    // Setup Extensions
    const permissionsExtension = {
      metadata: {
        name: 'Permissions',
        metadataURI: 'ipfs://permissions',
        implementation: await permissions.getAddress(),
      },
      functions: [
        {
          functionSelector: permissions.interface.getFunction('initialize')!.selector,
          functionSignature: 'initialize(address)',
        },
        {
          functionSelector: permissions.interface.getFunction('addCurrency')!.selector,
          functionSignature: 'addCurrency(address[])',
        },
        {
          functionSelector: permissions.interface.getFunction('removeCurrency')!.selector,
          functionSignature: 'removeCurrency(address[])',
        },
        {
          functionSelector: permissions.interface.getFunction('assignNFTRole')!.selector,
          functionSignature: 'assignNFTRole(address[])',
        },
        {
          functionSelector: permissions.interface.getFunction('revokeNFTRole')!.selector,
          functionSignature: 'revokeNFTRole(address[])',
        },
        {
          functionSelector: permissions.interface.getFunction('assignRole')!.selector,
          functionSignature: 'assignRole(bytes32,address[])',
        },
        {
          functionSelector: permissions.interface.getFunction('hasRole')!.selector,
          functionSignature: 'hasRole(bytes32,address)',
        },
        {
          functionSelector: permissions.interface.getFunction('supportedCurrencies')!.selector,
          functionSignature: 'supportedCurrencies(address)',
        },
        {
          functionSelector: permissions.interface.getFunction('revokeRole(bytes32,address)')!.selector,
          functionSignature: 'revokeRole(bytes32,address)',
        },
      ],
    };

    const listingExtension = {
      metadata: {
        name: 'Listing',
        metadataURI: 'ipfs://listing',
        implementation: await listing.getAddress(),
      },
      functions: [
        {
          functionSelector: listing.interface.getFunction('initializeListing')!.selector,
          functionSignature: 'initializeListing(address)',
        },
        {
          functionSelector: listing.interface.getFunction('createListing')!.selector,
          functionSignature: 'createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))',
        },
        {
          functionSelector: listing.interface.getFunction('updateListing')!.selector,
          functionSignature: 'updateListing(uint256,(address,uint256,uint256,address,uint256,uint128,uint128,bool))',
        },
        {
          functionSelector: listing.interface.getFunction('buyFromListing')!.selector,
          functionSignature: 'buyFromListing(uint256,address,uint256,address,uint256)',
        },
        {
          functionSelector: listing.interface.getFunction('cancelListing')!.selector,
          functionSignature: 'cancelListing(uint256)',
        },
        {
          functionSelector: listing.interface.getFunction('getListing')!.selector,
          functionSignature: 'getListing(uint256)',
        },
        {
          functionSelector: listing.interface.getFunction('listingCounter')!.selector,
          functionSignature: 'listingCounter()',
        },
        {
          functionSelector: listing.interface.getFunction('decimalListing')!.selector,
          functionSignature: 'decimalListing()',
        },
        {
          functionSelector: listing.interface.getFunction('approveBuyerForListing')!.selector,
          functionSignature: 'approveBuyerForListing(uint256,address,bool)',
        },
        {
          functionSelector: listing.interface.getFunction('approveCurrencyForListing')!.selector,
          functionSignature: 'approveCurrencyForListing(uint256,address,uint256)',
        },
      ],
    };

    const nftAuctionExtension = {
      metadata: {
        name: 'NFTAuction',
        metadataURI: 'ipfs://auction-full',
        implementation: await nftAuction.getAddress(),
      },
      functions: [
        {
          functionSelector: nftAuction.interface.getFunction('createAuction')!.selector,
          functionSignature: 'createAuction((address,uint256,uint256,address,uint256,uint256,uint256,uint256,uint256,uint256))',
        },
        {
          functionSelector: nftAuction.interface.getFunction('bidInAuction')!.selector,
          functionSignature: 'bidInAuction(uint256,uint256)',
        },
        {
          functionSelector: nftAuction.interface.getFunction('cancelAuction')!.selector,
          functionSignature: 'cancelAuction(uint256)',
        },
        {
          functionSelector: nftAuction.interface.getFunction('collectAuctionPayout')!.selector,
          functionSignature: 'collectAuctionPayout(uint256)',
        },
        {
          functionSelector: nftAuction.interface.getFunction('collectAuctionToken')!.selector,
          functionSignature: 'collectAuctionToken(uint256)',
        },
        {
          functionSelector: nftAuction.interface.getFunction('getAuction')!.selector,
          functionSignature: 'getAuction(uint256)',
        },
        {
          functionSelector: nftAuction.interface.getFunction('getAllAuctions')!.selector,
          functionSignature: 'getAllAuctions(uint256,uint256)',
        },
        {
          functionSelector: nftAuction.interface.getFunction('getAllValidAuctions')!.selector,
          functionSignature: 'getAllValidAuctions(uint256,uint256)',
        },
        {
          functionSelector: nftAuction.interface.getFunction('getNewWinningBid')!.selector,
          functionSignature: 'getNewWinningBid(uint256)',
        },
        {
          functionSelector: nftAuction.interface.getFunction('isAuctionExpired')!.selector,
          functionSignature: 'isAuctionExpired(uint256)',
        },
        {
          functionSelector: nftAuction.interface.getFunction('isNewWinningBid')!.selector,
          functionSignature: 'isNewWinningBid(uint256,uint256)',
        },
        {
          functionSelector: nftAuction.interface.getFunction('totalAuctions')!.selector,
          functionSignature: 'totalAuctions()',
        },
      ],
    };

    // Add extensions to ExtensionManager
    await extensionManager.connect(admin)['addExtension'](permissionsExtension);
    await extensionManager.connect(admin)['addExtension'](listingExtension);
    await extensionManager.connect(admin)['addExtension'](nftAuctionExtension);
    // Note: Offer extension commented out until contract is updated
    // await extensionManager.connect(admin)['addExtension'](offerExtension);

    // Initialize contracts through Router to setup proper roles
    await routerAsPermissions.connect(admin)['initialize'](admin.address);
    await routerAsListing.connect(admin)['initializeListing'](await permissions.getAddress());

    return {
      router,
      extensionManager,
      listing,
      nftAuction,
      offer,
      permissions,
      routerAsListing,
      routerAsAuction,
      routerAsOffer,
      routerAsPermissions,
      mockToken,
      mockERC721,
      mockERC1155,
      admin,
      user1,
      user2,
      user3,
    };
  }

  describe('1. Extension Integration Tests', function () {
    describe('1.1 Adding All Extensions', function () {
      it('Should add Listing extension with all key functions', async function () {
        const { router, extensionManager, listing, admin } = await loadFixture(setup);

        const listingInterface = listing.interface;
        const listingExtension = {
          metadata: {
            name: 'Listing',
            metadataURI: 'ipfs://listing-full',
            implementation: await listing.getAddress(),
          },
          functions: [
            {
              functionSelector: listingInterface.getFunction('initializeListing')!.selector,
              functionSignature: 'initialize(address)',
            },
            {
              functionSelector: listingInterface.getFunction('createListing')!.selector,
              functionSignature: 'createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))',
            },
            {
              functionSelector: listingInterface.getFunction('updateListing')!.selector,
              functionSignature: 'updateListing(uint256,(address,uint256,uint256,address,uint256,uint128,uint128,bool))',
            },
            {
              functionSelector: listingInterface.getFunction('buyFromListing')!.selector,
              functionSignature: 'buyFromListing(uint256,address,uint256,address,uint256)',
            },
            {
              functionSelector: listingInterface.getFunction('cancelListing')!.selector,
              functionSignature: 'cancelListing(uint256)',
            },
            {
              functionSelector: listingInterface.getFunction('approveBuyerForListing')!.selector,
              functionSignature: 'approveBuyerForListing(uint256,address,bool)',
            },
            {
              functionSelector: listingInterface.getFunction('approveCurrencyForListing')!.selector,
              functionSignature: 'approveCurrencyForListing(uint256,address,uint256)',
            },
            {
              functionSelector: listingInterface.getFunction('listingCounter')!.selector,
              functionSignature: 'listingCounter()',
            },
            {
              functionSelector: listingInterface.getFunction('getListing')!.selector,
              functionSignature: 'getListing(uint256)',
            },
          ],
        };

        for (const func of listingExtension.functions) {
          const implementation = await extensionManager['getImplementationForFunction'](func.functionSelector);
          expect(implementation).to.equal(await listing.getAddress());
        }
      });

      // Temporarily commented out until Offer contract is updated
      /*it('Should add Offer extension with all key functions', async function () {
        const { router, extensionManager, offer, admin } = await loadFixture(setup);

        const offerInterface = offer.interface;
        const offerExtension = {
          metadata: {
            name: 'Offer',
            metadataURI: 'ipfs://offer-full',
            implementation: await offer.getAddress(),
          },
          functions: [
            {
              functionSelector: offerInterface.getFunction('makeOffer')!.selector,
              functionSignature: 'makeOffer((address,uint256,uint256,address,uint256,uint256))',
            },
            {
              functionSelector: offerInterface.getFunction('cancelOffer')!.selector,
              functionSignature: 'cancelOffer(uint256)',
            },
            {
              functionSelector: offerInterface.getFunction('acceptOffer')!.selector,
              functionSignature: 'acceptOffer(uint256)',
            },
            {
              functionSelector: offerInterface.getFunction('getOffer')!.selector,
              functionSignature: 'getOffer(uint256)',
            },
            {
              functionSelector: offerInterface.getFunction('totalOffers')!.selector,
              functionSignature: 'totalOffers()',
            },
            {
              functionSelector: offerInterface.getFunction('feeRecipient')!.selector,
              functionSignature: 'feeRecipient()',
            },
          ],
        };

        // Extension already added in setup, no need to add again
        // await extensionManager.connect(admin)['addExtension'](offerExtension);

        // Verify all functions are mapped correctly
        for (const func of offerExtension.functions) {
          const implementation = await extensionManager['getImplementationForFunction'](func.functionSelector);
          expect(implementation).to.equal(await offer.getAddress());
        }
      });*/

      it('Should add Permissions extension with all key functions', async function () {
        const { router, extensionManager, permissions, admin } = await loadFixture(setup);

        const permissionsInterface = permissions.interface;
        const permissionsExtension = {
          metadata: {
            name: 'Permissions',
            metadataURI: 'ipfs://permissions-full',
            implementation: await permissions.getAddress(),
          },
          functions: [
            {
              functionSelector: permissionsInterface.getFunction('initialize')!.selector,
              functionSignature: 'initialize(address)',
            },
            {
              functionSelector: permissionsInterface.getFunction('addCurrency')!.selector,
              functionSignature: 'addCurrency(address[])',
            },
            {
              functionSelector: permissionsInterface.getFunction('removeCurrency')!.selector,
              functionSignature: 'removeCurrency(address[])',
            },
            {
              functionSelector: permissionsInterface.getFunction('assignNFTRole')!.selector,
              functionSignature: 'assignNFTRole(address[])',
            },
            {
              functionSelector: permissionsInterface.getFunction('revokeNFTRole')!.selector,
              functionSignature: 'revokeNFTRole(address[])',
            },
            {
              functionSelector: permissionsInterface.getFunction('assignRole')!.selector,
              functionSignature: 'assignRole(bytes32,address[])',
            },
            {
              functionSelector: permissionsInterface.getFunction('revokeRole(bytes32,address)')!.selector,
              functionSignature: 'revokeRole(bytes32,address)',
            },
            {
              functionSelector: permissionsInterface.getFunction('hasRole')!.selector,
              functionSignature: 'hasRole(bytes32,address)',
            },
            {
              functionSelector: permissionsInterface.getFunction('supportedCurrencies')!.selector,
              functionSignature: 'supportedCurrencies(address)',
            },
          ],
        };

        for (const func of permissionsExtension.functions) {
          const implementation = await extensionManager['getImplementationForFunction'](func.functionSelector);
          expect(implementation).to.equal(await permissions.getAddress());
        }
      });

      it('Should add NFTAuction extension with all key functions', async function () {
        const { router, extensionManager, nftAuction, admin } = await loadFixture(setup);

        const auctionInterface = nftAuction.interface;
        const auctionExtension = {
          metadata: {
            name: 'NFTAuction',
            metadataURI: 'ipfs://auction-full',
            implementation: await nftAuction.getAddress(),
          },
          functions: [
            {
              functionSelector: auctionInterface.getFunction('createAuction')!.selector,
              functionSignature: 'createAuction((address,uint256,uint256,uint256,address,uint256,uint256,uint64,uint64,uint64))',
            },
            {
              functionSelector: auctionInterface.getFunction('bidInAuction')!.selector,
              functionSignature: 'bidInAuction(uint256,uint256)',
            },
            {
              functionSelector: auctionInterface.getFunction('cancelAuction')!.selector,
              functionSignature: 'cancelAuction(uint256)',
            },
            {
              functionSelector: auctionInterface.getFunction('collectAuctionPayout')!.selector,
              functionSignature: 'collectAuctionPayout(uint256)',
            },
            {
              functionSelector: auctionInterface.getFunction('collectAuctionToken')!.selector,
              functionSignature: 'collectAuctionToken(uint256)',
            },
            {
              functionSelector: auctionInterface.getFunction('totalAuctions')!.selector,
              functionSignature: 'totalAuctions()',
            },
            {
              functionSelector: auctionInterface.getFunction('getAuction')!.selector,
              functionSignature: 'getAuction(uint256)',
            },
          ],
        };

        for (const func of auctionExtension.functions) {
          const implementation = await extensionManager['getImplementationForFunction'](func.functionSelector);
          expect(implementation).to.equal(await nftAuction.getAddress());
        }
      });
    });

    describe('1.2 Extension Management Operations', function () {
      it('Should replace extension while maintaining router functionality', async function () {
        const { router, extensionManager, listing, offer, admin } = await loadFixture(setup);

        // Same name, different implementation
        const replacementExtension = {
          metadata: {
            name: 'Listing', 
            metadataURI: 'ipfs://listing-v2',
            implementation: await offer.getAddress(),
          },
          functions: [
            {
              functionSelector: offer.interface.getFunction('totalOffers')!.selector,
              functionSignature: 'totalOffers()',
            },
          ],
        };

        await extensionManager.connect(admin)['replaceExtension'](replacementExtension);

        const totalOffersSelector = offer.interface.getFunction('totalOffers')!.selector;
        const implementation = await router['getImplementationForFunction'](totalOffersSelector);
        expect(implementation).to.equal(await offer.getAddress());

        const listingCounterSelector = listing.interface.getFunction('listingCounter')!.selector;
        const oldImplementation = await router['getImplementationForFunction'](listingCounterSelector);
        expect(oldImplementation).to.equal(ethers.ZeroAddress);
      });

      it('Should remove extension and make functions unavailable', async function () {
        const { router, extensionManager, listing, admin } = await loadFixture(setup);

        const listingCounterSelector = listing.interface.getFunction('listingCounter')!.selector;
        let implementation = await router['getImplementationForFunction'](listingCounterSelector);
        expect(implementation).to.equal(await listing.getAddress());

        await extensionManager.connect(admin)['removeExtension']('Listing');

        implementation = await router['getImplementationForFunction'](listingCounterSelector);
        expect(implementation).to.equal(ethers.ZeroAddress);
      });

      it('Should enable/disable individual functions in extension', async function () {
        const { router, extensionManager, listing, admin } = await loadFixture(setup);

        const additionalFunction = {
          functionSelector: listing.interface.getFunction('permissionContract')!.selector,
          functionSignature: 'permissionContract()',
        };

        await extensionManager.connect(admin)['enableFunctionInExtension']('Listing', additionalFunction);

        let implementation1 = await router['getImplementationForFunction'](listing.interface.getFunction('listingCounter')!.selector);
        let implementation2 = await router['getImplementationForFunction'](listing.interface.getFunction('permissionContract')!.selector);
        expect(implementation1).to.equal(await listing.getAddress());
        expect(implementation2).to.equal(await listing.getAddress());

        await extensionManager.connect(admin)['disableFunctionInExtension']('Listing', listing.interface.getFunction('permissionContract')!.selector);

        implementation1 = await router['getImplementationForFunction'](listing.interface.getFunction('listingCounter')!.selector);
        implementation2 = await router['getImplementationForFunction'](listing.interface.getFunction('permissionContract')!.selector);
        expect(implementation1).to.equal(await listing.getAddress());
        expect(implementation2).to.equal(ethers.ZeroAddress);
      });
    });
  });

  describe('2. Function Tests for Extensions', function () {
    describe('2.1 Permissions Functions through Router', function () {
      it('Should initialize permissions through Router', async function () {
        const { routerAsPermissions, admin, permissions } = await loadFixture(setup);
        
        const MANAGEMENT_ROLE = await permissions['MANAGEMENT_ROLE']();
        expect(await routerAsPermissions['hasRole'](MANAGEMENT_ROLE, admin.address)).to.be.true;
      });

      it('Should add currency through Router', async function () {
        const { routerAsPermissions, mockToken, admin } = await loadFixture(setup);

        await routerAsPermissions.connect(admin)['addCurrency']([await mockToken.getAddress()]);
        
        expect(await routerAsPermissions['supportedCurrencies'](await mockToken.getAddress())).to.be.true;
      });

      it('Should assign NFT role through Router', async function () {
        const { routerAsPermissions, mockERC721, admin, permissions } = await loadFixture(setup);

        await routerAsPermissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);
        
        const NFT_ROLE = await permissions['NFT_ROLE']();
        expect(await routerAsPermissions['hasRole'](NFT_ROLE, await mockERC721.getAddress())).to.be.true;
      });

      it('Should assign user roles through Router', async function () {
        const { routerAsPermissions, permissions, admin, user1 } = await loadFixture(setup);
        
        const LISTING_ROLE = await permissions['LISTING_ROLE']();
        await routerAsPermissions.connect(admin)['assignRole'](LISTING_ROLE, [user1.address]);
        
        expect(await routerAsPermissions['hasRole'](LISTING_ROLE, user1.address)).to.be.true;
      });

      it('Should revert when non-admin tries to assign roles', async function () {
        const { routerAsPermissions, permissions, admin, user1, user2 } = await loadFixture(setup);

        const LISTING_ROLE = await permissions['LISTING_ROLE']();
        await expect(
          routerAsPermissions.connect(user1)['assignRole'](LISTING_ROLE, [user2.address])
        ).to.be.reverted;
      });
    });

    describe('2.2 Listing Functions through Router', function () {
      it('Should create listing through Router', async function () {
        const { routerAsListing, routerAsPermissions, mockERC721, admin, user1, permissions } = await loadFixture(setup);

        const LISTING_ROLE = await permissions['LISTING_ROLE']();
        await routerAsPermissions.connect(admin)['assignRole'](LISTING_ROLE, [user1.address]);
        await routerAsPermissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);
        await routerAsPermissions.connect(admin)['addCurrency']([ethers.ZeroAddress]);

        await mockERC721.connect(admin)['mint'](user1.address, 3);
        await mockERC721.connect(user1)['approve'](await routerAsListing.getAddress(), 3);

        const block = await ethers.provider.getBlock('latest');
        const currentTimestamp = block!.timestamp;

        const listingParams = {
          assetContract: await mockERC721.getAddress(),
          tokenId: 3,
          quantity: 1,
          currency: ethers.ZeroAddress,
          pricePerToken: ethers.parseEther('1'),
          startTimestamp: currentTimestamp + 60,
          endTimestamp: currentTimestamp + 604800,
          reserved: false,
        };

        await routerAsListing.connect(user1)['createListing'](listingParams);
        
        const counter = await routerAsListing['listingCounter']();
        expect(counter).to.be.greaterThan(0);

        const retrievedListing = await routerAsListing['getListing'](counter - BigInt(1));
        expect(retrievedListing.assetContract).to.equal(await mockERC721.getAddress());
        expect(retrievedListing.tokenId).to.equal(3);
      });

      it('Should update listing through Router', async function () {
        const { routerAsListing, routerAsPermissions, mockERC721, admin, user1, permissions } = await loadFixture(setup);
        
        const LISTING_ROLE = await permissions['LISTING_ROLE']();
        await routerAsPermissions.connect(admin)['assignRole'](LISTING_ROLE, [user1.address]);
        await routerAsPermissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);
        await routerAsPermissions.connect(admin)['addCurrency']([ethers.ZeroAddress]);

        await mockERC721.connect(admin)['mint'](user1.address, 4);
        await mockERC721.connect(user1)['approve'](await routerAsListing.getAddress(), 4);

        const block = await ethers.provider.getBlock('latest');
        const currentTimestamp = block!.timestamp;

        const listingParams = {
          assetContract: await mockERC721.getAddress(),
          tokenId: 4,
          quantity: 1,
          currency: ethers.ZeroAddress,
          pricePerToken: ethers.parseEther('1'),
          startTimestamp: currentTimestamp + 60,
          endTimestamp: currentTimestamp + 604800,
          reserved: false,
        };

        await routerAsListing.connect(user1)['createListing'](listingParams);
        const listingId = (await routerAsListing['listingCounter']()) - BigInt(1);

        const updatedParams = {
          ...listingParams,
          pricePerToken: ethers.parseEther('2'),
        };

        await routerAsListing.connect(user1)['updateListing'](listingId, updatedParams);

        const updatedListing = await routerAsListing['getListing'](listingId);
        expect(updatedListing.pricePerToken).to.equal(ethers.parseEther('2'));
      });

      it('Should cancel listing through Router', async function () {
        const { routerAsListing, routerAsPermissions, mockERC721, admin, user1, permissions } = await loadFixture(setup);

        const LISTING_ROLE = await permissions['LISTING_ROLE']();
        await routerAsPermissions.connect(admin)['assignRole'](LISTING_ROLE, [user1.address]);
        await routerAsPermissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);
        await routerAsPermissions.connect(admin)['addCurrency']([ethers.ZeroAddress]);

        await mockERC721.connect(admin)['mint'](user1.address, 5);
        await mockERC721.connect(user1)['approve'](await routerAsListing.getAddress(), 5);

        const block = await ethers.provider.getBlock('latest');
        const currentTimestamp = block!.timestamp;

        const listingParams = {
          assetContract: await mockERC721.getAddress(),
          tokenId: 5,
          quantity: 1,
          currency: ethers.ZeroAddress,
          pricePerToken: ethers.parseEther('1'),
          startTimestamp: currentTimestamp + 60,
          endTimestamp: currentTimestamp + 604800,
          reserved: false,
        };

        await routerAsListing.connect(user1)['createListing'](listingParams);
        const listingId = (await routerAsListing['listingCounter']()) - BigInt(1);

        await routerAsListing.connect(user1)['cancelListing'](listingId);

        const cancelledListing = await routerAsListing['getListing'](listingId);
        expect(cancelledListing.status).to.equal(3); 
      });

      it('Should revert when unauthorized user tries to create listing', async function () {
        const { routerAsListing, routerAsPermissions, mockERC721, admin, user2, permissions, listing } = await loadFixture(setup);

        const LISTING_ROLE = await permissions['LISTING_ROLE']();
        const user2HasRole = await routerAsPermissions['hasRole'](LISTING_ROLE, user2.address);
        expect(user2HasRole).to.be.false;

        await mockERC721.connect(admin)['mint'](user2.address, 6);
        await mockERC721.connect(user2)['approve'](await routerAsListing.getAddress(), 6);

        const block = await ethers.provider.getBlock('latest');
        const currentTimestamp = block!.timestamp;

        const listingParams = {
          assetContract: await mockERC721.getAddress(),
          tokenId: 6,
          quantity: 1,
          currency: ethers.ZeroAddress,
          pricePerToken: ethers.parseEther('1'),
          startTimestamp: currentTimestamp + 60,
          endTimestamp: currentTimestamp + 604800,
          reserved: false,
        };
        
        await expect(
          routerAsListing.connect(user2)['createListing'](listingParams)
        ).to.be.revertedWithCustomError(listing, 'UserNotAuthorizedToCreateListing');
      });
    });

    /*describe('2.3 Offer Functions through Router', function () {
      it('Should make offer through Router', async function () {
        const { routerAsOffer, routerAsPermissions, mockToken, mockERC721, admin, user1, user2, permissions } = await loadFixture(setup);

        // Setup permissions
        // Already initialized in setup
        // await routerAsPermissions.connect(admin)['initialize'](admin.address);
        
        const OFFER_ROLE = await permissions['OFFER_ROLE']();
        await routerAsPermissions.connect(admin)['assignRole'](OFFER_ROLE, [user2.address]);
        await routerAsPermissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);
        await routerAsPermissions.connect(admin)['addCurrency']([await mockToken.getAddress()]);

        // Mint NFT to user1 and tokens to user2
        await mockERC721.connect(admin)['mint'](user1.address, 7);
        await mockToken.connect(admin)['mint'](user2.address, ethers.parseEther('10'));
        await mockToken.connect(user2)['approve'](await routerAsOffer.getAddress(), ethers.parseEther('5'));

        const block = await ethers.provider.getBlock('latest');
        const expirationTimestamp = block!.timestamp + 86400;

        const offerParams = {
          assetContract: await mockERC721.getAddress(),
          tokenId: 7,
          quantity: 1,
          currency: await mockToken.getAddress(),
          totalPrice: ethers.parseEther('5'),
          expirationTimestamp: expirationTimestamp,
        };

        await routerAsOffer.connect(user2)['makeOffer'](offerParams);

        const totalOffers = await routerAsOffer['totalOffers']();
        expect(totalOffers).to.be.greaterThan(0);

        const retrievedOffer = await routerAsOffer['getOffer'](totalOffers - BigInt(1));
        expect(retrievedOffer.offeror).to.equal(user2.address);
        expect(retrievedOffer.assetContract).to.equal(await mockERC721.getAddress());
        expect(retrievedOffer.tokenId).to.equal(7);
      });

      it('Should cancel offer through Router', async function () {
        const { routerAsOffer, routerAsPermissions, mockToken, mockERC721, admin, user1, user2, permissions } = await loadFixture(setup);

        // Setup and make offer
        // Already initialized in setup
        // await routerAsPermissions.connect(admin)['initialize'](admin.address);
        
        const OFFER_ROLE = await permissions['OFFER_ROLE']();
        await routerAsPermissions.connect(admin)['assignRole'](OFFER_ROLE, [user2.address]);
        await routerAsPermissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);
        await routerAsPermissions.connect(admin)['addCurrency']([await mockToken.getAddress()]);

        await mockERC721.connect(admin)['mint'](user1.address, 8);
        await mockToken.connect(admin)['mint'](user2.address, ethers.parseEther('10'));
        await mockToken.connect(user2)['approve'](await routerAsOffer.getAddress(), ethers.parseEther('5'));

        const block = await ethers.provider.getBlock('latest');
        const expirationTimestamp = block!.timestamp + 86400;

        const offerParams = {
          assetContract: await mockERC721.getAddress(),
          tokenId: 8,
          quantity: 1,
          currency: await mockToken.getAddress(),
          totalPrice: ethers.parseEther('5'),
          expirationTimestamp: expirationTimestamp,
        };

        await routerAsOffer.connect(user2)['makeOffer'](offerParams);
        const offerId = (await routerAsOffer['totalOffers']()) - BigInt(1);

        // Cancel offer
        await routerAsOffer.connect(user2)['cancelOffer'](offerId);

        const cancelledOffer = await routerAsOffer['getOffer'](offerId);
        expect(cancelledOffer.status).to.equal(2); // CANCELLED status
      });

      it('Should accept offer through Router', async function () {
        const { routerAsOffer, routerAsPermissions, mockToken, mockERC721, admin, user1, user2, permissions } = await loadFixture(setup);

        // Setup and make offer
        // Already initialized in setup
        // await routerAsPermissions.connect(admin)['initialize'](admin.address);
        
        const OFFER_ROLE = await permissions['OFFER_ROLE']();
        await routerAsPermissions.connect(admin)['assignRole'](OFFER_ROLE, [user2.address]);
        await routerAsPermissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);
        await routerAsPermissions.connect(admin)['addCurrency']([await mockToken.getAddress()]);

        await mockERC721.connect(admin)['mint'](user1.address, 9);
        await mockERC721.connect(user1)['approve'](await routerAsOffer.getAddress(), 9);
        await mockToken.connect(admin)['mint'](user2.address, ethers.parseEther('10'));
        await mockToken.connect(user2)['approve'](await routerAsOffer.getAddress(), ethers.parseEther('5'));

        const block = await ethers.provider.getBlock('latest');
        const expirationTimestamp = block!.timestamp + 86400;

        const offerParams = {
          assetContract: await mockERC721.getAddress(),
          tokenId: 9,
          quantity: 1,
          currency: await mockToken.getAddress(),
          totalPrice: ethers.parseEther('5'),
          expirationTimestamp: expirationTimestamp,
        };

        await routerAsOffer.connect(user2)['makeOffer'](offerParams);
        const offerId = (await routerAsOffer['totalOffers']()) - BigInt(1);

        // Accept offer
        await routerAsOffer.connect(user1)['acceptOffer'](offerId);

        // Verify NFT transferred to offerer
        expect(await mockERC721['ownerOf'](9)).to.equal(user2.address);

        const acceptedOffer = await routerAsOffer['getOffer'](offerId);
        expect(acceptedOffer.status).to.equal(1); // ACCEPTED status
      });

      it('Should revert when unauthorized user tries to make offer', async function () {
        const { routerAsOffer, routerAsPermissions, mockToken, mockERC721, admin, user1, user2, permissions, offer } = await loadFixture(setup);

        // Setup permissions for user1 but not user2
        // Already initialized in setup
        // await routerAsPermissions.connect(admin)['initialize'](admin.address);
        
        const OFFER_ROLE = await permissions['OFFER_ROLE']();
        await routerAsPermissions.connect(admin)['assignRole'](OFFER_ROLE, [user1.address]); // Only user1 has role
        await routerAsPermissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);
        await routerAsPermissions.connect(admin)['addCurrency']([await mockToken.getAddress()]);

        await mockERC721.connect(admin)['mint'](user1.address, 10);
        await mockToken.connect(admin)['mint'](user2.address, ethers.parseEther('10'));
        await mockToken.connect(user2)['approve'](await routerAsOffer.getAddress(), ethers.parseEther('5'));

        const block = await ethers.provider.getBlock('latest');
        const expirationTimestamp = block!.timestamp + 86400;

        const offerParams = {
          assetContract: await mockERC721.getAddress(),
          tokenId: 10,
          quantity: 1,
          currency: await mockToken.getAddress(),
          totalPrice: ethers.parseEther('5'),
          expirationTimestamp: expirationTimestamp,
        };

        await expect(
          routerAsOffer.connect(user2)['makeOffer'](offerParams)
        ).to.be.revertedWithCustomError(offer, 'CallerDoesNotHaveOfferRole');
      });
    });*/
  });

  // Temporarily commented out until Offer contract is updated
  /*describe('3. Storage Collision Tests', function () {
    it('Should maintain independent storage for each extension', async function () {
      const { router, extensionManager, listing, offer, permissions, mockERC721, mockToken, admin, user1 } = await loadFixture(setup);

      // Add all extensions
      const extensions = [
        {
          metadata: { name: 'Permissions', metadataURI: '', implementation: await permissions.getAddress() },
          functions: [
            { functionSelector: permissions.interface.getFunction('initialize')!.selector, functionSignature: 'initialize(address)' },
            { functionSelector: permissions.interface.getFunction('addCurrency')!.selector, functionSignature: 'addCurrency(address[])' },
            { functionSelector: permissions.interface.getFunction('assignNFTRole')!.selector, functionSignature: 'assignNFTRole(address[])' },
            { functionSelector: permissions.interface.getFunction('assignRole')!.selector, functionSignature: 'assignRole(bytes32,address[])' },
          ],
        },
        {
          metadata: { name: 'Listing', metadataURI: '', implementation: await listing.getAddress() },
          functions: [
            { functionSelector: listing.interface.getFunction('initializeListing')!.selector, functionSignature: 'initializeListing(address)' },
            { functionSelector: listing.interface.getFunction('createListing')!.selector, functionSignature: 'createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))' },
            { functionSelector: listing.interface.getFunction('listingCounter')!.selector, functionSignature: 'listingCounter()' },
          ],
        },
        {
          metadata: { name: 'Offer', metadataURI: '', implementation: await offer.getAddress() },
          functions: [
            { functionSelector: offer.interface.getFunction('makeOffer')!.selector, functionSignature: 'makeOffer((address,uint256,uint256,address,uint256,uint256))' },
            { functionSelector: offer.interface.getFunction('totalOffers')!.selector, functionSignature: 'totalOffers()' },
          ],
        },
      ];

      for (const ext of extensions) {
        // Extension already added in setup, no need to add again
        // await extensionManager.connect(admin)['addExtension'](ext);
      }

      const routerAsPermissions = await ethers.getContractAt('Permissions', await router.getAddress());
      const routerAsListing = await ethers.getContractAt('Listing', await router.getAddress());
      const routerAsOffer = await ethers.getContractAt('NFTOffer', await router.getAddress());

      // Initialize contracts
      // Already initialized in setup
      // await routerAsPermissions.connect(admin)['initializeListing'](admin.address);
      // Already initialized in setup
      // await routerAsListing.connect(admin)['initializeListing'](await permissions.getAddress());

      // Setup permissions
      const LISTING_ROLE = await permissions['LISTING_ROLE']();
      const OFFER_ROLE = await permissions['OFFER_ROLE']();
      await routerAsPermissions.connect(admin)['assignRole'](LISTING_ROLE, [user1.address]);
      await routerAsPermissions.connect(admin)['assignRole'](OFFER_ROLE, [user1.address]);
      await routerAsPermissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);
      await routerAsPermissions.connect(admin)['addCurrency']([await mockToken.getAddress()]);

      // Create listing
      await mockERC721.connect(admin)['mint'](user1.address, 11);
      await mockERC721.connect(user1)['approve'](await router.getAddress(), 11);

      const block = await ethers.provider.getBlock('latest');
      const currentTimestamp = block!.timestamp;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 11,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseEther('1'),
        startTimestamp: currentTimestamp + 60,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      await routerAsListing.connect(user1)['createListing'](listingParams);

      // Create offer for different NFT
      await mockERC721.connect(admin)['mint'](user1.address, 12);
      await mockToken.connect(admin)['mint'](user1.address, ethers.parseEther('10'));
      await mockToken.connect(user1)['approve'](await router.getAddress(), ethers.parseEther('5'));

      const offerParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 12,
        quantity: 1,
        currency: await mockToken.getAddress(),
        totalPrice: ethers.parseEther('5'),
        expirationTimestamp: currentTimestamp + 86400,
      };

      await routerAsOffer.connect(user1)['makeOffer'](offerParams);

      // Verify independent counters
      const listingCounter = await routerAsListing['listingCounter']();
      const offerCounter = await routerAsOffer['totalOffers']();

      expect(listingCounter).to.be.greaterThan(0);
      expect(offerCounter).to.be.greaterThan(0);

      // Test data persistence after extension removal and re-addition
      await extensionManager.connect(admin)['removeExtension']('Listing');

      // Re-add listing extension
      await extensionManager.connect(admin)['addExtension'](extensions[1]);

      // Verify data persists (storage is maintained)
      const persistedCounter = await routerAsListing['listingCounter']();
      expect(persistedCounter).to.equal(listingCounter);
    });

    it('Should handle storage conflicts gracefully', async function () {
      const { router, extensionManager, listing, offer, admin } = await loadFixture(setup);

      // Add listing extension
      const listingExtension = {
        metadata: { name: 'Listing', metadataURI: '', implementation: await listing.getAddress() },
        functions: [
          { functionSelector: listing.interface.getFunction('listingCounter')!.selector, functionSignature: 'listingCounter()' },
          { functionSelector: listing.interface.getFunction('decimalListing')!.selector, functionSignature: 'decimalListing()' },
        ],
      };

      await extensionManager.connect(admin)['addExtension'](listingExtension);

      const routerAsListing = await ethers.getContractAt('Listing', await router.getAddress());

      // Call functions that might read from uninitialized storage
      const counter = await routerAsListing['listingCounter']();
      const decimal = await routerAsListing['decimalListing']();

      // Should return default values (0) without reverting
      expect(counter).to.equal(0);
      expect(decimal).to.equal(0);

      // Add offer extension with overlapping function selectors
      const offerExtension = {
        metadata: { name: 'Offer', metadataURI: '', implementation: await offer.getAddress() },
        functions: [
          { functionSelector: offer.interface.getFunction('totalOffers')!.selector, functionSignature: 'totalOffers()' },
        ],
      };

      await extensionManager.connect(admin)['addExtension'](offerExtension);

      const routerAsOffer = await ethers.getContractAt('NFTOffer', await router.getAddress());

      // Both extensions should work independently
      const listingCounter = await routerAsListing['listingCounter']();
      const offerCounter = await routerAsOffer['totalOffers']();

      expect(listingCounter).to.equal(0);
      expect(offerCounter).to.equal(0);
    });
  });

  describe('4. Function Selector Conflict Tests', function () {
    it('Should prevent adding extension with duplicate function selector', async function () {
      const { extensionManager, listing, offer, admin } = await loadFixture(setup);

      // Add listing extension with createListing function
      const listingExtension = {
        metadata: { name: 'Listing', metadataURI: '', implementation: await listing.getAddress() },
        functions: [
          { functionSelector: listing.interface.getFunction('createListing')!.selector, functionSignature: 'createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))' },
        ],
      };

      await extensionManager.connect(admin)['addExtension'](listingExtension);

      // Try to add offer extension with same function selector (should fail)
      const duplicateExtension = {
        metadata: { name: 'Offer', metadataURI: '', implementation: await offer.getAddress() },
        functions: [
          { functionSelector: listing.interface.getFunction('createListing')!.selector, functionSignature: 'createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))' },
        ],
      };

      await expect(
        extensionManager.connect(admin)['addExtension'](duplicateExtension)
      ).to.be.revertedWithCustomError(extensionManager, 'FunctionAlreadyExists');
    });

    it('Should allow same function selector in replacement extension', async function () {
      const { extensionManager, listing, offer, admin } = await loadFixture(setup);

      // Add initial listing extension
      const listingExtension = {
        metadata: { name: 'Listing', metadataURI: '', implementation: await listing.getAddress() },
        functions: [
          { functionSelector: listing.interface.getFunction('listingCounter')!.selector, functionSignature: 'listingCounter()' },
        ],
      };

      await extensionManager.connect(admin)['addExtension'](listingExtension);

      // Replace with offer extension using same function selector (should succeed)
      const replacementExtension = {
        metadata: { name: 'Listing', metadataURI: '', implementation: await offer.getAddress() },
        functions: [
          { functionSelector: listing.interface.getFunction('listingCounter')!.selector, functionSignature: 'listingCounter()' }, // Same selector, different implementation
        ],
      };

      await extensionManager.connect(admin)['replaceExtension'](replacementExtension);

      // Verify function selector now points to offer implementation
      const implementation = await extensionManager['getImplementationForFunction'](listing.interface.getFunction('listingCounter')!.selector);
      expect(implementation).to.equal(await offer.getAddress());
    });

    it('Should calculate function selectors correctly', async function () {
      const { listing, offer, permissions } = await loadFixture(setup);

      // Verify unique selectors for different functions
      const createListingSelector = listing.interface.getFunction('createListing')!.selector;
      const makeOfferSelector = offer.interface.getFunction('makeOffer')!.selector;
      const addCurrencySelector = permissions.interface.getFunction('addCurrency')!.selector;

      expect(createListingSelector).to.not.equal(makeOfferSelector);
      expect(createListingSelector).to.not.equal(addCurrencySelector);
      expect(makeOfferSelector).to.not.equal(addCurrencySelector);

      // Verify selector calculation matches ethers
      expect(createListingSelector).to.equal(ethers.id('createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))').slice(0, 10));
      expect(makeOfferSelector).to.equal(ethers.id('makeOffer((address,uint256,uint256,address,uint256,uint256))').slice(0, 10));
      expect(addCurrencySelector).to.equal(ethers.id('addCurrency(address[])').slice(0, 10));
    });
  });

  describe('5. Edge Cases and Security Tests', function () {
    describe('5.1 Fallback Function Edge Cases', function () {
      it('Should revert on non-existent function call', async function () {
        const { router, user1 } = await loadFixture(setup);

        const nonExistentSelector = '0x12345678';
        await expect(
          user1.sendTransaction({
            to: await router.getAddress(),
            data: nonExistentSelector,
          })
        ).to.be.revertedWithCustomError(router, 'RouterFunctionDoesNotExist');
      });

      it('Should handle receive function for ETH transfers', async function () {
        const { router, user1 } = await loadFixture(setup);

        const amount = ethers.parseEther('1');
        await expect(
          user1.sendTransaction({
            to: await router.getAddress(),
            value: amount,
          })
        ).to.changeEtherBalance(router, amount);
      });

      it('Should revert with empty calldata but no value', async function () {
        const { router, user1 } = await loadFixture(setup);

        await expect(
          user1.sendTransaction({
            to: await router.getAddress(),
            data: '0x',
            value: 0,
          })
        ).to.be.revertedWithCustomError(router, 'RouterFunctionDoesNotExist');
      });
    });

    describe('5.2 Access Control through Router', function () {
      it('Should propagate permission errors through Router', async function () {
        const { router, extensionManager, listing, mockERC721, admin, user1, permissions } = await loadFixture(setup);

        // Add listing extension
        const listingExtension = {
          metadata: { name: 'Listing', metadataURI: '', implementation: await listing.getAddress() },
          functions: [
            { functionSelector: listing.interface.getFunction('createListing')!.selector, functionSignature: 'createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))' },
          ],
        };

        // Extension already added in setup, no need to add again
        // await extensionManager.connect(admin)['addExtension'](listingExtension);

        const routerAsListing = await ethers.getContractAt('Listing', await router.getAddress());

        // Try to create listing without proper permissions
        const block = await ethers.provider.getBlock('latest');
        const currentTimestamp = block!.timestamp;

        const listingParams = {
          assetContract: await mockERC721.getAddress(),
          tokenId: 1,
          quantity: 1,
          currency: ethers.ZeroAddress,
          pricePerToken: ethers.parseEther('1'),
          startTimestamp: currentTimestamp + 60,
          endTimestamp: currentTimestamp + 604800,
          reserved: false,
        };

        await expect(
          routerAsListing.connect(user1)['createListing'](listingParams)
        ).to.be.revertedWithCustomError(listing, 'PermissionContractNotSet');
      });

      it('Should respect role hierarchy through Router', async function () {
        const { router, extensionManager, permissions, admin, user1, user2 } = await loadFixture(setup);

        // Add permissions extension
        const permissionsExtension = {
          metadata: { name: 'Permissions', metadataURI: '', implementation: await permissions.getAddress() },
          functions: [
            { functionSelector: permissions.interface.getFunction('initialize')!.selector, functionSignature: 'initialize(address)' },
            { functionSelector: permissions.interface.getFunction('assignRole')!.selector, functionSignature: 'assignRole(bytes32,address[])' },
            { functionSelector: permissions.interface.getFunction('hasRole')!.selector, functionSignature: 'hasRole(bytes32,address)' },
          ],
        };

        // Extension already added in setup, no need to add again
        // await extensionManager.connect(admin)['addExtension'](permissionsExtension);

        const routerAsPermissions = await ethers.getContractAt('Permissions', await router.getAddress());

        // Already initialized in setup
        // await routerAsPermissions.connect(admin)['initialize'](admin.address);

        const MANAGEMENT_ROLE = await permissions['MANAGEMENT_ROLE']();
        const LISTING_ROLE = await permissions['LISTING_ROLE']();

        // Admin should have management role
        expect(await routerAsPermissions['hasRole'](MANAGEMENT_ROLE, admin.address)).to.be.true;

        // Non-admin cannot assign roles
        await expect(
          routerAsPermissions.connect(user1)['assignRole'](LISTING_ROLE, [user2.address])
        ).to.be.reverted;
      });
    });

    describe('5.3 Gas and Performance Tests', function () {
      it('Should measure gas overhead of Router delegation', async function () {
        const { router, extensionManager, listing, permissions, mockERC721, admin, user1 } = await loadFixture(setup);

        // Setup
        const permissionsExtension = {
          metadata: { name: 'Permissions', metadataURI: '', implementation: await permissions.getAddress() },
          functions: [
            { functionSelector: permissions.interface.getFunction('initialize')!.selector, functionSignature: 'initialize(address)' },
            { functionSelector: permissions.interface.getFunction('addCurrency')!.selector, functionSignature: 'addCurrency(address[])' },
            { functionSelector: permissions.interface.getFunction('assignNFTRole')!.selector, functionSignature: 'assignNFTRole(address[])' },
            { functionSelector: permissions.interface.getFunction('assignRole')!.selector, functionSignature: 'assignRole(bytes32,address[])' },
          ],
        };

        const listingExtension = {
          metadata: { name: 'Listing', metadataURI: '', implementation: await listing.getAddress() },
          functions: [
            { functionSelector: listing.interface.getFunction('initializeListing')!.selector, functionSignature: 'initializeListing(address)' },
            { functionSelector: listing.interface.getFunction('createListing')!.selector, functionSignature: 'createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))' },
          ],
        };

        // Extension already added in setup, no need to add again
        // await extensionManager.connect(admin)['addExtension'](permissionsExtension);
        // Extension already added in setup, no need to add again
        // await extensionManager.connect(admin)['addExtension'](listingExtension);

        const routerAsPermissions = await ethers.getContractAt('Permissions', await router.getAddress());
        const routerAsListing = await ethers.getContractAt('Listing', await router.getAddress());

        // Setup permissions
        // Already initialized in setup
        // await routerAsPermissions.connect(admin)['initialize'](admin.address);
        // Already initialized in setup
        // await routerAsListing.connect(admin)['initializeListing'](await permissions.getAddress());

        const LISTING_ROLE = await permissions['LISTING_ROLE']();
        await routerAsPermissions.connect(admin)['assignRole'](LISTING_ROLE, [user1.address]);
        await routerAsPermissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);
        await routerAsPermissions.connect(admin)['addCurrency']([ethers.ZeroAddress]);

        await mockERC721.connect(admin)['mint'](user1.address, 13);
        await mockERC721.connect(user1)['approve'](await router.getAddress(), 13);

        const block = await ethers.provider.getBlock('latest');
        const currentTimestamp = block!.timestamp;

        const listingParams = {
          assetContract: await mockERC721.getAddress(),
          tokenId: 13,
          quantity: 1,
          currency: ethers.ZeroAddress,
          pricePerToken: ethers.parseEther('1'),
          startTimestamp: currentTimestamp + 60,
          endTimestamp: currentTimestamp + 604800,
          reserved: false,
        };

        // Measure gas for Router call
        const routerTx = await routerAsListing.connect(user1)['createListing'](listingParams);
        const routerReceipt = await routerTx.wait();

        console.log('Gas used through Router:', routerReceipt!.gasUsed.toString());

        // Gas should be reasonable (additional overhead from delegation should be minimal)
        expect(routerReceipt!.gasUsed).to.be.lessThan(1000000); // Reasonable gas limit
      });
    });
  });

  describe('6. Full User Flow Tests', function () {
    it('Should complete full marketplace flow: list, offer, and buy', async function () {
      const { router, extensionManager, listing, offer, permissions, mockToken, mockERC721, admin, user1, user2 } = await loadFixture(setup);

      // 1. Setup all extensions
      const extensions = [
        {
          metadata: { name: 'Permissions', metadataURI: '', implementation: await permissions.getAddress() },
          functions: [
            { functionSelector: permissions.interface.getFunction('initialize')!.selector, functionSignature: 'initialize(address)' },
            { functionSelector: permissions.interface.getFunction('addCurrency')!.selector, functionSignature: 'addCurrency(address[])' },
            { functionSelector: permissions.interface.getFunction('assignNFTRole')!.selector, functionSignature: 'assignNFTRole(address[])' },
            { functionSelector: permissions.interface.getFunction('assignRole')!.selector, functionSignature: 'assignRole(bytes32,address[])' },
          ],
        },
        {
          metadata: { name: 'Listing', metadataURI: '', implementation: await listing.getAddress() },
          functions: [
            { functionSelector: listing.interface.getFunction('initializeListing')!.selector, functionSignature: 'initializeListing(address)' },
            { functionSelector: listing.interface.getFunction('createListing')!.selector, functionSignature: 'createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))' },
            { functionSelector: listing.interface.getFunction('buyFromListing')!.selector, functionSignature: 'buyFromListing(uint256,address,uint256,address,uint256)' },
            { functionSelector: listing.interface.getFunction('cancelListing')!.selector, functionSignature: 'cancelListing(uint256)' },
            { functionSelector: listing.interface.getFunction('listingCounter')!.selector, functionSignature: 'listingCounter()' },
          ],
        },
        {
          metadata: { name: 'Offer', metadataURI: '', implementation: await offer.getAddress() },
          functions: [
            { functionSelector: offer.interface.getFunction('makeOffer')!.selector, functionSignature: 'makeOffer((address,uint256,uint256,address,uint256,uint256))' },
            { functionSelector: offer.interface.getFunction('acceptOffer')!.selector, functionSignature: 'acceptOffer(uint256)' },
            { functionSelector: offer.interface.getFunction('totalOffers')!.selector, functionSignature: 'totalOffers()' },
          ],
        },
      ];

      for (const ext of extensions) {
        // Extension already added in setup, no need to add again
        // await extensionManager.connect(admin)['addExtension'](ext);
      }

      const routerAsPermissions = await ethers.getContractAt('Permissions', await router.getAddress());
      const routerAsListing = await ethers.getContractAt('Listing', await router.getAddress());
      const routerAsOffer = await ethers.getContractAt('NFTOffer', await router.getAddress());

      // 2. Setup permissions and currencies
      // Already initialized in setup
      // await routerAsPermissions.connect(admin)['initializeListing'](admin.address);
      // Already initialized in setup
      // await routerAsListing.connect(admin)['initializeListing'](await permissions.getAddress());

      await routerAsPermissions.connect(admin)['addCurrency']([await mockToken.getAddress()]);
      await routerAsPermissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);

      const LISTING_ROLE = await permissions['LISTING_ROLE']();
      const OFFER_ROLE = await permissions['OFFER_ROLE']();
      await routerAsPermissions.connect(admin)['assignRole'](LISTING_ROLE, [user1.address]);
      await routerAsPermissions.connect(admin)['assignRole'](OFFER_ROLE, [user2.address]);

      // 3. Mint NFT and create listing
      await mockERC721.connect(admin)['mint'](user1.address, 14);
      await mockERC721.connect(user1)['approve'](await router.getAddress(), 14);

      const block = await ethers.provider.getBlock('latest');
      const currentTimestamp = block!.timestamp;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 14,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseEther('10'),
        startTimestamp: currentTimestamp + 60,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      await routerAsListing.connect(user1)['createListing'](listingParams);
      const listingId = (await routerAsListing['listingCounter']()) - BigInt(1);

      // 4. Make offer from different user
      await mockToken.connect(admin)['mint'](user2.address, ethers.parseEther('50'));
      await mockToken.connect(user2)['approve'](await router.getAddress(), ethers.parseEther('5'));

      const offerParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 14,
        quantity: 1,
        currency: await mockToken.getAddress(),
        totalPrice: ethers.parseEther('5'),
        expirationTimestamp: currentTimestamp + 86400,
      };

      await routerAsOffer.connect(user2)['makeOffer'](offerParams);
      const offerId = (await routerAsOffer['totalOffers']()) - BigInt(1);

      // 5. Cancel listing to prepare for offer acceptance
      await routerAsListing.connect(user1)['cancelListing'](listingId);

      // 6. Accept offer
      await mockERC721.connect(user1)['approve'](await router.getAddress(), 14);
      await routerAsOffer.connect(user1)['acceptOffer'](offerId);

      // 7. Verify final state
      expect(await mockERC721['ownerOf'](14)).to.equal(user2.address);
      
      // Check tokens were transferred (minus any fees)
      const user1Balance = await mockToken['balanceOf'](user1.address);
      expect(user1Balance).to.be.greaterThan(0);
    });

    it('Should handle concurrent operations on same NFT', async function () {
      const { router, extensionManager, listing, offer, permissions, mockToken, mockERC721, admin, user1, user2, user3 } = await loadFixture(setup);

      // Setup extensions (simplified)
      const extensions = [
        {
          metadata: { name: 'Permissions', metadataURI: '', implementation: await permissions.getAddress() },
          functions: [
            { functionSelector: permissions.interface.getFunction('initialize')!.selector, functionSignature: 'initialize(address)' },
            { functionSelector: permissions.interface.getFunction('addCurrency')!.selector, functionSignature: 'addCurrency(address[])' },
            { functionSelector: permissions.interface.getFunction('assignNFTRole')!.selector, functionSignature: 'assignNFTRole(address[])' },
            { functionSelector: permissions.interface.getFunction('assignRole')!.selector, functionSignature: 'assignRole(bytes32,address[])' },
          ],
        },
        {
          metadata: { name: 'Listing', metadataURI: '', implementation: await listing.getAddress() },
          functions: [
            { functionSelector: listing.interface.getFunction('initializeListing')!.selector, functionSignature: 'initializeListing(address)' },
            { functionSelector: listing.interface.getFunction('createListing')!.selector, functionSignature: 'createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))' },
            { functionSelector: listing.interface.getFunction('buyFromListing')!.selector, functionSignature: 'buyFromListing(uint256,address,uint256,address,uint256)' },
            { functionSelector: listing.interface.getFunction('listingCounter')!.selector, functionSignature: 'listingCounter()' },
          ],
        },
        {
          metadata: { name: 'Offer', metadataURI: '', implementation: await offer.getAddress() },
          functions: [
            { functionSelector: offer.interface.getFunction('makeOffer')!.selector, functionSignature: 'makeOffer((address,uint256,uint256,address,uint256,uint256))' },
            { functionSelector: offer.interface.getFunction('totalOffers')!.selector, functionSignature: 'totalOffers()' },
          ],
        },
      ];

      for (const ext of extensions) {
        // Extension already added in setup, no need to add again
        // await extensionManager.connect(admin)['addExtension'](ext);
      }

      const routerAsPermissions = await ethers.getContractAt('Permissions', await router.getAddress());
      const routerAsListing = await ethers.getContractAt('Listing', await router.getAddress());
      const routerAsOffer = await ethers.getContractAt('NFTOffer', await router.getAddress());

      // Setup permissions
      // Already initialized in setup
      // await routerAsPermissions.connect(admin)['initializeListing'](admin.address);
      // Already initialized in setup
      // await routerAsListing.connect(admin)['initializeListing'](await permissions.getAddress());

      await routerAsPermissions.connect(admin)['addCurrency']([await mockToken.getAddress()]);
      await routerAsPermissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);

      const LISTING_ROLE = await permissions['LISTING_ROLE']();
      const OFFER_ROLE = await permissions['OFFER_ROLE']();
      await routerAsPermissions.connect(admin)['assignRole'](LISTING_ROLE, [user1.address]);
      await routerAsPermissions.connect(admin)['assignRole'](OFFER_ROLE, [user2.address, user3.address]);

      // Create listing
      await mockERC721.connect(admin)['mint'](user1.address, 15);
      await mockERC721.connect(user1)['approve'](await router.getAddress(), 15);

      const block = await ethers.provider.getBlock('latest');
      const currentTimestamp = block!.timestamp;

      const listingParams = {
        assetContract: await mockERC721.getAddress(),
        tokenId: 15,
        quantity: 1,
        currency: await mockToken.getAddress(),
        pricePerToken: ethers.parseEther('10'),
        startTimestamp: currentTimestamp + 60,
        endTimestamp: currentTimestamp + 604800,
        reserved: false,
      };

      await routerAsListing.connect(user1)['createListing'](listingParams);

      // Multiple users make offers
      await mockToken.connect(admin)['mint'](user2.address, ethers.parseEther('50'));
      await mockToken.connect(admin)['mint'](user3.address, ethers.parseEther('50'));
      await mockToken.connect(user2)['approve'](await router.getAddress(), ethers.parseEther('5'));
      await mockToken.connect(user3)['approve'](await router.getAddress(), ethers.parseEther('7'));

      await routerAsOffer.connect(user2)['makeOffer']({
        assetContract: await mockERC721.getAddress(),
        tokenId: 15,
        quantity: 1,
        currency: await mockToken.getAddress(),
        totalPrice: ethers.parseEther('5'),
        expirationTimestamp: currentTimestamp + 86400,
      });

      await routerAsOffer.connect(user3)['makeOffer']({
        assetContract: await mockERC721.getAddress(),
        tokenId: 15,
        quantity: 1,
        currency: await mockToken.getAddress(),
        totalPrice: ethers.parseEther('7'),
        expirationTimestamp: currentTimestamp + 86400,
      });

      // Someone buys from listing (offers become invalid for this specific NFT)
      await mockToken.connect(admin)['mint'](user2.address, ethers.parseEther('10'));
      await mockToken.connect(user2)['approve'](await router.getAddress(), ethers.parseEther('10'));

      // Advance time to make listing active
      await ethers.provider.send('evm_increaseTime', [120]);
      await ethers.provider.send('evm_mine', []);

      await routerAsListing.connect(user2)['buyFromListing'](
        0, // listingId
        user2.address, // buyFor
        1, // quantityToBuy
        await mockToken.getAddress(), // currency
        ethers.parseEther('10') // totalPrice
      );

      // Verify NFT transferred to buyer
      expect(await mockERC721['ownerOf'](15)).to.equal(user2.address);

      // Verify counters are correct
      const finalListingCounter = await routerAsListing['listingCounter']();
      const finalOfferCounter = await routerAsOffer['totalOffers']();

      expect(finalListingCounter).to.be.greaterThan(0);
      expect(finalOfferCounter).to.equal(2); // Two offers were made
    });
  });*/
});
