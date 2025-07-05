import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('ExtensionManager', function () {
  async function setup() {
    const [admin, user1, user2] = await ethers.getSigners();

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
    const offer = await OfferFactory.deploy(admin.address, 250, await permissions.getAddress());
    await offer.waitForDeployment();

    // Deploy ExtensionManager
    const ExtensionManagerFactory = await ethers.getContractFactory('ExtensionManager');
    const extensionManager = await ExtensionManagerFactory.deploy(admin.address);
    await extensionManager.waitForDeployment();

    // Setup permissions
    await permissions.connect(admin)['assignListingRole']([user1.address, user2.address]);
    await permissions.connect(admin)['assignAuctionRole']([user1.address, user2.address]);
    await permissions.connect(admin)['assignOfferRole']([user1.address, user2.address]);
    await permissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress(), await mockERC1155.getAddress()]);
    await permissions.connect(admin)['addCurrency']([await mockToken.getAddress(), ethers.ZeroAddress]);

    // Create real extension configurations
    const listingExtension = {
      metadata: {
        name: 'Listing',
        metadataURI: 'ipfs://listing-metadata',
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
          functionSelector: '0x1d1f1c20', // createListing(ListingParameters)
          functionSignature: 'createListing((address,uint256,uint256,address,uint256,uint128,uint128,bool))',
        },
      ],
    };

    const auctionExtension = {
      metadata: {
        name: 'NFTAuction',
        metadataURI: 'ipfs://auction-metadata',
        implementation: await nftAuction.getAddress(),
      },
      functions: [
        {
          functionSelector: '0x19b58f14', // totalAuctions()
          functionSignature: 'totalAuctions()',
        },
        {
          functionSelector: '0x2d915b59', // createAuction(AuctionParams)
          functionSignature: 'createAuction((address,uint256,uint256,address,uint256,uint256,uint256,uint256,uint256,uint256))',
        },
      ],
    };

    const offerExtension = {
      metadata: {
        name: 'NFTOffer',
        metadataURI: 'ipfs://offer-metadata',
        implementation: await offer.getAddress(),
      },
      functions: [
        {
          functionSelector: '0x4f0503e1', // totalOffers()
          functionSignature: 'totalOffers()',
        },
        {
          functionSelector: '0x4b8bcf2d', // makeOffer(OfferParams)
          functionSignature: 'makeOffer((address,uint256,uint256,address,uint256,uint256))',
        },
      ],
    };

    return {
      extensionManager,
      listing,
      nftAuction,
      offer,
      permissions,
      mockToken,
      mockERC721,
      mockERC1155,
      listingExtension,
      auctionExtension,
      offerExtension,
      admin,
      user1,
      user2,
    };
  }

  describe('Deployment', function () {
    it('Should deploy with correct owner', async function () {
      const { extensionManager, admin } = await loadFixture(setup);
      
      expect(await extensionManager['owner']()).to.equal(admin.address);
    });
  });

  describe('addExtension with Real Contracts', function () {
    it('Should add Listing extension successfully', async function () {
      const { extensionManager, listingExtension, admin } = await loadFixture(setup);
      
      await expect(extensionManager.connect(admin)['addExtension'](listingExtension))
        .to.emit(extensionManager, 'ExtensionAdded')
        .withArgs(
          listingExtension.metadata.name,
          listingExtension.metadata.implementation,
          listingExtension
        );
      
      // Verify extension was added
      const storedExtension = await extensionManager['getExtension'](listingExtension.metadata.name);
      expect(storedExtension.metadata.name).to.equal(listingExtension.metadata.name);
      expect(storedExtension.metadata.implementation).to.equal(listingExtension.metadata.implementation);
      expect(storedExtension.functions.length).to.equal(3);
    });

    it('Should emit FunctionEnabled events for all Listing functions', async function () {
      const { extensionManager, listingExtension, admin } = await loadFixture(setup);
      
      const tx = await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      // Check all FunctionEnabled events
      for (let i = 0; i < listingExtension.functions.length; i++) {
        await expect(tx)
          .to.emit(extensionManager, 'FunctionEnabled')
          .withArgs(
            listingExtension.metadata.name,
            listingExtension.functions[i].functionSelector,
            listingExtension.functions[i],
            listingExtension.metadata
          );
      }
    });

    it('Should add NFTAuction extension successfully', async function () {
      const { extensionManager, auctionExtension, admin } = await loadFixture(setup);
      
      await expect(extensionManager.connect(admin)['addExtension'](auctionExtension))
        .to.emit(extensionManager, 'ExtensionAdded')
        .withArgs(
          auctionExtension.metadata.name,
          auctionExtension.metadata.implementation,
          auctionExtension
        );
      
      const storedExtension = await extensionManager['getExtension'](auctionExtension.metadata.name);
      expect(storedExtension.metadata.name).to.equal(auctionExtension.metadata.name);
      expect(storedExtension.functions.length).to.equal(2);
    });

    it('Should add NFTOffer extension successfully', async function () {
      const { extensionManager, offerExtension, admin } = await loadFixture(setup);
      
      await expect(extensionManager.connect(admin)['addExtension'](offerExtension))
        .to.emit(extensionManager, 'ExtensionAdded')
        .withArgs(
          offerExtension.metadata.name,
          offerExtension.metadata.implementation,
          offerExtension
        );
      
      const storedExtension = await extensionManager['getExtension'](offerExtension.metadata.name);
      expect(storedExtension.metadata.name).to.equal(offerExtension.metadata.name);
      expect(storedExtension.functions.length).to.equal(2);
    });

    it('Should revert if trying to add extension with conflicting function selectors', async function () {
      const { extensionManager, listingExtension, listing, admin } = await loadFixture(setup);
      
      // Add first extension
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      // Try to add another extension with same function selector
      const conflictingExtension = {
        metadata: {
          name: 'ConflictingListing',
          metadataURI: 'ipfs://conflicting',
          implementation: await listing.getAddress(),
        },
        functions: [
          {
            functionSelector: '0x61bc221a', // Same as listingCounter() in listingExtension
            functionSignature: 'listingCounter()',
          },
        ],
      };
      
      await expect(extensionManager.connect(admin)['addExtension'](conflictingExtension))
        .to.be.revertedWithCustomError(extensionManager, 'FunctionAlreadyExists')
        .withArgs('0x61bc221a');
    });

    it('Should revert if non-owner tries to add extension', async function () {
      const { extensionManager, listingExtension, user1 } = await loadFixture(setup);
      
      await expect(extensionManager.connect(user1)['addExtension'](listingExtension))
        .to.be.revertedWithCustomError(extensionManager, 'OwnableUnauthorizedAccount')
        .withArgs(user1.address);
    });
  });

  describe('replaceExtension with Real Contracts', function () {
    it('Should replace Listing extension with updated version', async function () {
      const { extensionManager, listingExtension, listing, admin } = await loadFixture(setup);
      
      // Add initial extension
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      // Create updated version with different functions
      const updatedListingExtension = {
        metadata: {
          name: listingExtension.metadata.name, // Same name
          metadataURI: 'ipfs://listing-v2',
          implementation: await listing.getAddress(),
        },
        functions: [
          {
            functionSelector: '0x427e2f42', // permissionContract()
            functionSignature: 'permissionContract()',
          },
          {
            functionSelector: '0x8e86fb1e', // setCurrencyFee(address,uint256)
            functionSignature: 'setCurrencyFee(address,uint256)',
          },
        ],
      };
      
      await expect(extensionManager.connect(admin)['replaceExtension'](updatedListingExtension))
        .to.emit(extensionManager, 'ExtensionReplaced')
        .withArgs(
          updatedListingExtension.metadata.name,
          updatedListingExtension.metadata.implementation,
          updatedListingExtension
        );
      
      // Verify extension was replaced
      const storedExtension = await extensionManager['getExtension'](updatedListingExtension.metadata.name);
      expect(storedExtension.functions.length).to.equal(2);
      expect(storedExtension.metadata.metadataURI).to.equal('ipfs://listing-v2');
    });

    it('Should emit FunctionDisabled for old functions when replacing', async function () {
      const { extensionManager, listingExtension, listing, admin } = await loadFixture(setup);
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      const replacementExtension = {
        metadata: {
          name: listingExtension.metadata.name,
          metadataURI: 'ipfs://replacement',
          implementation: await listing.getAddress(),
        },
        functions: [
          {
            functionSelector: '0x427e2f42', // permissionContract()
            functionSignature: 'permissionContract()',
          },
        ],
      };
      
      const tx = await extensionManager.connect(admin)['replaceExtension'](replacementExtension);
      
      // Check FunctionDisabled events for all old functions
      for (let i = 0; i < listingExtension.functions.length; i++) {
        await expect(tx)
          .to.emit(extensionManager, 'FunctionDisabled')
          .withArgs(
            listingExtension.metadata.name,
            listingExtension.functions[i].functionSelector,
            listingExtension.metadata
          );
      }
    });

    it('Should replace one extension type with another', async function () {
      const { extensionManager, listingExtension, auctionExtension, admin } = await loadFixture(setup);
      
      // Add listing extension
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      // Replace with auction extension (same name but different implementation)
      const hybridExtension = {
        metadata: {
          name: listingExtension.metadata.name, // Same name as listing
          metadataURI: 'ipfs://hybrid',
          implementation: auctionExtension.metadata.implementation, // But auction implementation
        },
        functions: auctionExtension.functions, // And auction functions
      };
      
      await extensionManager.connect(admin)['replaceExtension'](hybridExtension);
      
      // Old listing functions should no longer be available
      expect(await extensionManager['getImplementationForFunction']('0x61bc221a')).to.equal(ethers.ZeroAddress);
      
      // New auction functions should be available
      expect(await extensionManager['getImplementationForFunction']('0x19b58f14')).to.equal(auctionExtension.metadata.implementation);
    });
  });

  describe('removeExtension with Real Contracts', function () {
    it('Should remove Listing extension successfully', async function () {
      const { extensionManager, listingExtension, admin } = await loadFixture(setup);
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      await expect(extensionManager.connect(admin)['removeExtension'](listingExtension.metadata.name))
        .to.emit(extensionManager, 'ExtensionRemoved')
        .withArgs(listingExtension.metadata.name, listingExtension);
      
      // Verify extension was removed
      await expect(extensionManager['getExtension'](listingExtension.metadata.name))
        .to.be.revertedWithCustomError(extensionManager, 'ExtensionDoesNotExist')
        .withArgs(listingExtension.metadata.name);
    });

    it('Should remove all function mappings when removing extension', async function () {
      const { extensionManager, listingExtension, admin } = await loadFixture(setup);
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      // Verify functions are mapped before removal
      for (const func of listingExtension.functions) {
        expect(await extensionManager['getImplementationForFunction'](func.functionSelector))
          .to.equal(listingExtension.metadata.implementation);
      }
      
      await extensionManager.connect(admin)['removeExtension'](listingExtension.metadata.name);
      
      // Verify all functions are unmapped after removal
      for (const func of listingExtension.functions) {
        expect(await extensionManager['getImplementationForFunction'](func.functionSelector))
          .to.equal(ethers.ZeroAddress);
      }
    });
  });

  describe('Function Management with Real Contracts', function () {
    it('Should enable additional Listing function in existing extension', async function () {
      const { extensionManager, listingExtension, admin } = await loadFixture(setup);
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      const newFunction = {
        functionSelector: '0x8e86fb1e', // setCurrencyFee(address,uint256)
        functionSignature: 'setCurrencyFee(address,uint256)',
      };
      
      await expect(
        extensionManager.connect(admin)['enableFunctionInExtension'](listingExtension.metadata.name, newFunction)
      )
        .to.emit(extensionManager, 'FunctionEnabled')
        .withArgs(
          listingExtension.metadata.name,
          newFunction.functionSelector,
          newFunction,
          listingExtension.metadata
        );
      
      // Verify function was added
      const storedExtension = await extensionManager['getExtension'](listingExtension.metadata.name);
      expect(storedExtension.functions.length).to.equal(4); // 3 original + 1 new
      
      // Verify function mapping
      expect(await extensionManager['getImplementationForFunction'](newFunction.functionSelector))
        .to.equal(listingExtension.metadata.implementation);
    });

    it('Should disable specific function from Listing extension', async function () {
      const { extensionManager, listingExtension, admin } = await loadFixture(setup);
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      
      const functionToDisable = listingExtension.functions[0].functionSelector; // listingCounter()
      
      await expect(
        extensionManager.connect(admin)['disableFunctionInExtension'](listingExtension.metadata.name, functionToDisable)
      )
        .to.emit(extensionManager, 'FunctionDisabled')
        .withArgs(listingExtension.metadata.name, functionToDisable, listingExtension.metadata);
      
      // Verify function was removed
      const storedExtension = await extensionManager['getExtension'](listingExtension.metadata.name);
      expect(storedExtension.functions.length).to.equal(2); // 3 original - 1 removed
      
      // Verify function mapping was removed
      expect(await extensionManager['getImplementationForFunction'](functionToDisable))
        .to.equal(ethers.ZeroAddress);
    });

    it('Should revert when trying to disable function from wrong extension', async function () {
      const { extensionManager, listingExtension, auctionExtension, admin } = await loadFixture(setup);
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      await extensionManager.connect(admin)['addExtension'](auctionExtension);
      
      // Try to disable auction function from listing extension
      const auctionFunctionSelector = auctionExtension.functions[0].functionSelector; // totalAuctions()
      
      await expect(
        extensionManager.connect(admin)['disableFunctionInExtension'](listingExtension.metadata.name, auctionFunctionSelector)
      )
        .to.be.revertedWithCustomError(extensionManager, 'FunctionNotInExtension')
        .withArgs(listingExtension.metadata.name, auctionFunctionSelector);
    });
  });

  describe('Multiple Extensions Integration', function () {
    it('Should handle all three marketplace extensions simultaneously', async function () {
      const { extensionManager, listingExtension, auctionExtension, offerExtension, admin } = await loadFixture(setup);
      
      // Add all three extensions
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      await extensionManager.connect(admin)['addExtension'](auctionExtension);
      await extensionManager.connect(admin)['addExtension'](offerExtension);
      
      // Verify all extensions are registered
      const allExtensions = await extensionManager['getAllExtensions']();
      expect(allExtensions.length).to.equal(3);
      
      const extensionNames = await extensionManager['getAllExtensionNames']();
      expect(extensionNames).to.include('Listing');
      expect(extensionNames).to.include('NFTAuction');
      expect(extensionNames).to.include('NFTOffer');
      
      // Verify all functions are mapped correctly
      const allFunctions = await extensionManager['getAllFunctions']();
      const totalExpectedFunctions = listingExtension.functions.length + 
                                   auctionExtension.functions.length + 
                                   offerExtension.functions.length;
      expect(allFunctions.length).to.equal(totalExpectedFunctions);
    });

    it('Should retrieve correct implementation for each contract function', async function () {
      const { extensionManager, listingExtension, auctionExtension, offerExtension, admin } = await loadFixture(setup);
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      await extensionManager.connect(admin)['addExtension'](auctionExtension);
      await extensionManager.connect(admin)['addExtension'](offerExtension);
      
      // Test Listing functions
      expect(await extensionManager['getImplementationForFunction']('0x61bc221a')) // listingCounter()
        .to.equal(listingExtension.metadata.implementation);
      
      // Test Auction functions
      expect(await extensionManager['getImplementationForFunction']('0x19b58f14')) // totalAuctions()
        .to.equal(auctionExtension.metadata.implementation);
      
      // Test Offer functions
      expect(await extensionManager['getImplementationForFunction']('0x4f0503e1')) // totalOffers()
        .to.equal(offerExtension.metadata.implementation);
    });

    it('Should handle extension lifecycle with real marketplace contracts', async function () {
      const { extensionManager, listingExtension, auctionExtension, offerExtension, admin } = await loadFixture(setup);
      
      // Phase 1: Add Listing only
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      expect(await extensionManager['getImplementationForFunction']('0x61bc221a')).to.equal(listingExtension.metadata.implementation);
      
      // Phase 2: Add Auction
      await extensionManager.connect(admin)['addExtension'](auctionExtension);
      expect(await extensionManager['getImplementationForFunction']('0x19b58f14')).to.equal(auctionExtension.metadata.implementation);
      
      // Phase 3: Replace Listing with Offer using same name
      const offerAsListing = {
        metadata: {
          name: 'Listing', // Same name as listing
          metadataURI: offerExtension.metadata.metadataURI,
          implementation: offerExtension.metadata.implementation,
        },
        functions: offerExtension.functions,
      };
      
      await extensionManager.connect(admin)['replaceExtension'](offerAsListing);
      
      // Old listing functions should be gone
      expect(await extensionManager['getImplementationForFunction']('0x61bc221a')).to.equal(ethers.ZeroAddress);
      
      // New offer functions should work under "Listing" name
      expect(await extensionManager['getImplementationForFunction']('0x4f0503e1')).to.equal(offerExtension.metadata.implementation);
      
      // Auction should still work
      expect(await extensionManager['getImplementationForFunction']('0x19b58f14')).to.equal(auctionExtension.metadata.implementation);
      
      // Phase 4: Remove all
      await extensionManager.connect(admin)['removeExtension']('Listing'); // Now contains offer
      await extensionManager.connect(admin)['removeExtension']('NFTAuction');
      
      // Everything should be clean
      expect(await extensionManager['getAllExtensions']()).to.have.length(0);
      expect(await extensionManager['getAllFunctions']()).to.have.length(0);
    });
  });

  describe('View Functions with Real Data', function () {
    it('Should get correct metadata for marketplace functions', async function () {
      const { extensionManager, listingExtension, auctionExtension, admin } = await loadFixture(setup);
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      await extensionManager.connect(admin)['addExtension'](auctionExtension);
      
      // Test listing function metadata
      const listingMetadata = await extensionManager['getMetadataForFunction']('0x61bc221a'); // listingCounter()
      expect(listingMetadata.name).to.equal('Listing');
      expect(listingMetadata.metadataURI).to.equal('ipfs://listing-metadata');
      expect(listingMetadata.implementation).to.equal(listingExtension.metadata.implementation);
      
      // Test auction function metadata
      const auctionMetadata = await extensionManager['getMetadataForFunction']('0x19b58f14'); // totalAuctions()
      expect(auctionMetadata.name).to.equal('NFTAuction');
      expect(auctionMetadata.metadataURI).to.equal('ipfs://auction-metadata');
      expect(auctionMetadata.implementation).to.equal(auctionExtension.metadata.implementation);
    });

    it('Should return all functions from all marketplace extensions', async function () {
      const { extensionManager, listingExtension, auctionExtension, offerExtension, admin } = await loadFixture(setup);
      
      await extensionManager.connect(admin)['addExtension'](listingExtension);
      await extensionManager.connect(admin)['addExtension'](auctionExtension);
      await extensionManager.connect(admin)['addExtension'](offerExtension);
      
      const allFunctions = await extensionManager['getAllFunctions']();
      const expectedTotal = listingExtension.functions.length + 
                           auctionExtension.functions.length + 
                           offerExtension.functions.length;
      
      expect(allFunctions.length).to.equal(expectedTotal);
      
      // Verify specific functions are present
      const functionSelectors = allFunctions.map(f => f.functionSelector);
      expect(functionSelectors).to.include('0x61bc221a'); // listingCounter()
      expect(functionSelectors).to.include('0x19b58f14'); // totalAuctions()
      expect(functionSelectors).to.include('0x4f0503e1'); // totalOffers()
    });
  });

  describe('Error Cases with Real Contracts', function () {
    it('Should revert when trying to get non-existent extension', async function () {
      const { extensionManager } = await loadFixture(setup);
      
      await expect(extensionManager['getExtension']('NonExistentExtension'))
        .to.be.revertedWithCustomError(extensionManager, 'ExtensionDoesNotExist')
        .withArgs('NonExistentExtension');
    });

    it('Should revert when trying to get metadata for non-existent function', async function () {
      const { extensionManager } = await loadFixture(setup);
      
      await expect(extensionManager['getMetadataForFunction']('0x12345678'))
        .to.be.revertedWithCustomError(extensionManager, 'FunctionDoesNotExist')
        .withArgs('0x12345678');
    });

    it('Should validate extension data properly', async function () {
      const { extensionManager, listing, admin } = await loadFixture(setup);
      
      // Test empty name
      const invalidNameExtension = {
        metadata: {
          name: '',
          metadataURI: 'ipfs://test',
          implementation: await listing.getAddress(),
        },
        functions: [
          {
            functionSelector: '0x12345678',
            functionSignature: 'test()',
          },
        ],
      };
      
      await expect(extensionManager.connect(admin)['addExtension'](invalidNameExtension))
        .to.be.revertedWithCustomError(extensionManager, 'ExtensionInvalidName');
      
      // Test zero address implementation
      const invalidImplExtension = {
        metadata: {
          name: 'TestExtension',
          metadataURI: 'ipfs://test',
          implementation: ethers.ZeroAddress,
        },
        functions: [
          {
            functionSelector: '0x12345678',
            functionSignature: 'test()',
          },
        ],
      };
      
      await expect(extensionManager.connect(admin)['addExtension'](invalidImplExtension))
        .to.be.revertedWithCustomError(extensionManager, 'ExtensionInvalidImplementation');
      
      // Test no functions
      const noFunctionsExtension = {
        metadata: {
          name: 'TestExtension',
          metadataURI: 'ipfs://test',
          implementation: await listing.getAddress(),
        },
        functions: [],
      };
      
      await expect(extensionManager.connect(admin)['addExtension'](noFunctionsExtension))
        .to.be.revertedWithCustomError(extensionManager, 'ExtensionNoFunctions');
    });
  });
});