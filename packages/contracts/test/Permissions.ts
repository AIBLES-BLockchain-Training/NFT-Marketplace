import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Listing', function () {
  async function setup() {
    const [admin, user1, user2, user3] = await ethers.getSigners();

    const MockTokenFactory = await ethers.getContractFactory('MockToken');
    const mockToken = await MockTokenFactory.deploy(admin.address);
    await mockToken.waitForDeployment();

    const MockTokenFactory2 = await ethers.getContractFactory('MockToken');
    const mockToken2 = await MockTokenFactory2.deploy(admin.address);
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

    const PermissionsFactory = await ethers.getContractFactory('Permissions');
    const permissions = await PermissionsFactory.deploy(admin.address);
    await permissions.waitForDeployment();

    return {
      permissions,
      mockToken,
      mockToken2,
      mockERC721,
      mockERC1155,
      admin,
      user1,
      user2,
      user3,
    };
  }

  describe('Currencies', function () {
    it('Should allow MANAGE_CURRENCY_ROLE to add currencies', async function () {
      const { permissions, mockToken, mockToken2, admin } = await loadFixture(setup);
      const manageCurrencyRole = await permissions['MANAGE_CURRENCY_ROLE']();

      await expect(
        permissions.connect(admin)['addCurrency']([await mockToken.getAddress(), await mockToken2.getAddress()]),
      ).to.emit(permissions, 'CurrencyAdded');

      expect(await permissions['supportedCurrencies'](await mockToken.getAddress())).to.be.true;
      expect(await permissions['supportedCurrencies'](await mockToken2.getAddress())).to.be.true;
    });

    it('Should allow MANAGE_CURRENCY_ROLE to remove currencies', async function () {
      const { permissions, mockToken, mockToken2, admin } = await loadFixture(setup);

      await permissions.connect(admin)['addCurrency']([await mockToken.getAddress(), await mockToken2.getAddress()]);
      await expect(
        permissions.connect(admin)['removeCurrency']([await mockToken.getAddress(), await mockToken2.getAddress()]),
      ).to.emit(permissions, 'CurrencyRemoved');

      expect(await permissions['supportedCurrencies'](await mockToken.getAddress())).to.be.false;
      expect(await permissions['supportedCurrencies'](await mockToken2.getAddress())).to.be.false;
    });

    it('Should revert addCurrency when called by non-authorized account', async function () {
      const { permissions, mockToken, mockToken2, user1 } = await loadFixture(setup);
      const manageCurrencyRole = await permissions['MANAGE_CURRENCY_ROLE']();

      await expect(permissions.connect(user1)['addCurrency']([await mockToken.getAddress(), await mockToken2.getAddress()]))
        .to.be.revertedWithCustomError(permissions, 'AccessControlUnauthorizedAccount')
        .withArgs(user1.address, manageCurrencyRole);
    });

    it('Should revert removeCurrency when called by non-authorized account', async function () {
      const { permissions, mockToken, mockToken2, user1 } = await loadFixture(setup);
      const manageCurrencyRole = await permissions['MANAGE_CURRENCY_ROLE']();

      await expect(permissions.connect(user1)['removeCurrency']([await mockToken.getAddress(), await mockToken2.getAddress()]))
        .to.be.revertedWithCustomError(permissions, 'AccessControlUnauthorizedAccount')
        .withArgs(user1.address, manageCurrencyRole);
    });
  });

  describe('Assets Roles', function () {
    it('Should allow MANAGE_ASSET_ROLE to assign and revoke NFT role', async function () {
      const { permissions, mockERC721, admin } = await loadFixture(setup);

      await expect(permissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]))
        .to.emit(permissions, 'NFTRoleAssigned')
        .withArgs(await mockERC721.getAddress());
      expect(await permissions['hasRole'](await permissions['NFT_ROLE'](), await mockERC721.getAddress())).to.be.true;

      await expect(permissions.connect(admin)['revokeNFTRole']([await mockERC721.getAddress()]))
        .to.emit(permissions, 'NFTRoleRevoked')
        .withArgs(await mockERC721.getAddress());
      expect(await permissions['hasRole'](await permissions['NFT_ROLE'](), await mockERC721.getAddress())).to.be.false;
    });

    it('Should revert NFT role assignment/revocation when called by non-authorized account', async function () {
      const { permissions, mockERC721, user1 } = await loadFixture(setup);
      const manageAssetRole = await permissions['MANAGE_ASSET_ROLE']();

      await expect(permissions.connect(user1)['assignNFTRole']([await mockERC721.getAddress()]))
        .to.be.revertedWithCustomError(permissions, 'AccessControlUnauthorizedAccount')
        .withArgs(user1.address, manageAssetRole);

      await expect(permissions.connect(user1)['revokeNFTRole']([await mockERC721.getAddress()]))
        .to.be.revertedWithCustomError(permissions, 'AccessControlUnauthorizedAccount')
        .withArgs(user1.address, manageAssetRole);
    });

    it('Should allow assigning NFT role to address(0) and reflect as global', async function () {
      const { permissions, admin, mockERC721 } = await loadFixture(setup);

      await expect(permissions.connect(admin)['assignNFTRole']([ethers.ZeroAddress]))
        .to.emit(permissions, 'NFTRoleAssigned')
        .withArgs(ethers.ZeroAddress);
      expect(await permissions['hasRole'](await permissions['NFT_ROLE'](), mockERC721.getAddress())).to.be.true;
    });
  });

  describe('Listing Role', function () {
    it('Should allow MANAGE_USER_ROLE to assign and revoke listing role', async function () {
      const { permissions, user1, admin } = await loadFixture(setup);

      await expect(permissions.connect(admin)['assignListingRole']([user1.address]))
        .to.emit(permissions, 'ListingRoleAssigned')
        .withArgs(user1.address);
      expect(await permissions['hasRole'](await permissions['LISTING_ROLE'](), user1.address)).to.be.true;

      await expect(permissions.connect(admin)['revokeListingRole']([user1.address]))
        .to.emit(permissions, 'ListingRoleRevoked')
        .withArgs(user1.address);
      expect(await permissions['hasRole'](await permissions['LISTING_ROLE'](), user1.address)).to.be.false;
    });

    it('Should revert listing role assignment/revocation when called by non-authorized account', async function () {
      const { permissions, user1, user2 } = await loadFixture(setup);
      const manageUserRole = await permissions['MANAGE_USER_ROLE']();

      await expect(permissions.connect(user2)['assignListingRole']([user1.address]))
        .to.be.revertedWithCustomError(permissions, 'AccessControlUnauthorizedAccount')
        .withArgs(user2.address, manageUserRole);

      await expect(permissions.connect(user2)['revokeListingRole']([user1.address]))
        .to.be.revertedWithCustomError(permissions, 'AccessControlUnauthorizedAccount')
        .withArgs(user2.address, manageUserRole);
    });

    it('Should allow assigning listing role to address(0) and reflect as global', async function () {
      const { permissions, admin, user2 } = await loadFixture(setup);

      await expect(permissions.connect(admin)['assignListingRole']([ethers.ZeroAddress]))
        .to.emit(permissions, 'ListingRoleAssigned')
        .withArgs(ethers.ZeroAddress);
      expect(await permissions['hasRole'](await permissions['LISTING_ROLE'](), user2.address)).to.be.true;
    });
  });

  describe('Auction Role', function () {
    it('Should allow MANAGE_USER_ROLE to assign and revoke auction role', async function () {
      const { permissions, user2, admin } = await loadFixture(setup);

      await expect(permissions.connect(admin)['assignAuctionRole']([user2.address]))
        .to.emit(permissions, 'AuctionRoleAssigned')
        .withArgs(user2.address);
      expect(await permissions['hasRole'](await permissions['AUCTION_ROLE'](), user2.address)).to.be.true;

      await expect(permissions.connect(admin)['revokeAuctionRole']([user2.address]))
        .to.emit(permissions, 'AuctionRoleRevoked')
        .withArgs(user2.address);
      expect(await permissions['hasRole'](await permissions['AUCTION_ROLE'](), user2.address)).to.be.false;
    });

    it('Should revert auction role assignment/revocation when called by non-authorized account', async function () {
      const { permissions, user1, user2 } = await loadFixture(setup);
      const manageUserRole = await permissions['MANAGE_USER_ROLE']();

      await expect(permissions.connect(user1)['assignAuctionRole']([user2.address]))
        .to.be.revertedWithCustomError(permissions, 'AccessControlUnauthorizedAccount')
        .withArgs(user1.address, manageUserRole);

      await expect(permissions.connect(user1)['revokeAuctionRole']([user2.address]))
        .to.be.revertedWithCustomError(permissions, 'AccessControlUnauthorizedAccount')
        .withArgs(user1.address, manageUserRole);
    });

    it('Should allow assigning auction role to address(0) and reflect as global', async function () {
      const { permissions, admin, user3 } = await loadFixture(setup);

      await expect(permissions.connect(admin)['assignAuctionRole']([ethers.ZeroAddress]))
        .to.emit(permissions, 'AuctionRoleAssigned')
        .withArgs(ethers.ZeroAddress);
      expect(await permissions['hasRole'](await permissions['AUCTION_ROLE'](), user3.address)).to.be.true;
    });
  });

  describe('Offer Role', function () {
    it('Should allow MANAGE_USER_ROLE to assign and revoke offer role', async function () {
      const { permissions, user3, admin } = await loadFixture(setup);

      await expect(permissions.connect(admin)['assignOfferRole']([user3.address]))
        .to.emit(permissions, 'OfferRoleAssigned')
        .withArgs(user3.address);
      expect(await permissions['hasRole'](await permissions['OFFER_ROLE'](), user3.address)).to.be.true;

      await expect(permissions.connect(admin)['revokeOfferRole']([user3.address]))
        .to.emit(permissions, 'OfferRoleRevoked')
        .withArgs(user3.address);
      expect(await permissions['hasRole'](await permissions['OFFER_ROLE'](), user3.address)).to.be.false;
    });

    it('Should revert offer role assignment/revocation when called by non-authorized account', async function () {
      const { permissions, user2, user3 } = await loadFixture(setup);
      const manageUserRole = await permissions['MANAGE_USER_ROLE']();

      await expect(permissions.connect(user2)['assignOfferRole']([user3.address]))
        .to.be.revertedWithCustomError(permissions, 'AccessControlUnauthorizedAccount')
        .withArgs(user2.address, manageUserRole);

      await expect(permissions.connect(user2)['revokeOfferRole']([user3.address]))
        .to.be.revertedWithCustomError(permissions, 'AccessControlUnauthorizedAccount')
        .withArgs(user2.address, manageUserRole);
    });

    it('Should allow assigning offer role to address(0) and reflect as global', async function () {
      const { permissions, admin, user1 } = await loadFixture(setup);

      await expect(permissions.connect(admin)['assignOfferRole']([ethers.ZeroAddress]))
        .to.emit(permissions, 'OfferRoleAssigned')
        .withArgs(ethers.ZeroAddress);
      expect(await permissions['hasRole'](await permissions['OFFER_ROLE'](), user1.address)).to.be.true;
    });
  });

  describe('Request Roles', function () {
    describe('requestUserRoles', function () {
      it('Should emit RoleRequested for valid roles', async function () {
        const { permissions, user1 } = await loadFixture(setup);
        const listingRole = await permissions['LISTING_ROLE']();
        const auctionRole = await permissions['AUCTION_ROLE']();

        await expect(permissions.connect(user1)['requestUserRoles']([listingRole, auctionRole]))
          .to.emit(permissions, 'RoleRequested')
          .withArgs(user1.address, listingRole)
          .and.to.emit(permissions, 'RoleRequested')
          .withArgs(user1.address, auctionRole);
      });

      it('Should revert if any role is invalid', async function () {
        const { permissions, user1 } = await loadFixture(setup);
        const nftRole = await permissions['NFT_ROLE']();

        await expect(permissions.connect(user1)['requestUserRoles']([nftRole]))
          .to.be.revertedWithCustomError(permissions, 'InvalidRole')
          .withArgs(nftRole);
      });

      it('Should revert if role is already granted globally', async function () {
        const { permissions, admin, user1 } = await loadFixture(setup);
        const listingRole = await permissions['LISTING_ROLE']();

        await permissions.connect(admin)['assignListingRole']([ethers.ZeroAddress]);
        await expect(permissions.connect(user1)['requestUserRoles']([listingRole]))
          .to.be.revertedWithCustomError(permissions, 'RoleAlreadyGrantedGlobally')
          .withArgs(listingRole);
      });

      it('Should revert if role is already granted to msg.sender', async function () {
        const { permissions, admin, user1 } = await loadFixture(setup);
        const offerRole = await permissions['OFFER_ROLE']();

        await permissions.connect(admin)['assignOfferRole']([user1.address]);
        await expect(permissions.connect(user1)['requestUserRoles']([offerRole]))
          .to.be.revertedWithCustomError(permissions, 'RoleAlreadyGranted')
          .withArgs(user1.address, offerRole);
      });
    });

    describe('requestNFTRole', function () {
      it('Should emit NFTRoleRequested for valid ERC721 NFT when caller is owner', async function () {
        const { permissions, mockERC721, user1 } = await loadFixture(setup);
        await expect(permissions.connect(user1)['requestNFTRole'](await mockERC721.getAddress(), 0))
          .to.emit(permissions, 'NFTRoleRequested')
          .withArgs(await mockERC721.getAddress(), 0, user1.address);
      });

      it('Should emit NFTRoleRequested for valid ERC1155 NFT when caller has balance', async function () {
        const { permissions, mockERC1155, user1 } = await loadFixture(setup);
        await expect(permissions.connect(user1)['requestNFTRole'](await mockERC1155.getAddress(), 0))
          .to.emit(permissions, 'NFTRoleRequested')
          .withArgs(await mockERC1155.getAddress(), 0, user1.address);
      });

      it('Should revert if NFT role already granted globally', async function () {
        const { permissions, mockERC721, admin, user1 } = await loadFixture(setup);
        await permissions.connect(admin)['assignNFTRole']([ethers.ZeroAddress]);
        await expect(
          permissions.connect(user1)['requestNFTRole'](await mockERC721.getAddress(), 0),
        ).to.be.revertedWithCustomError(permissions, 'NFTRoleAlreadyGrantedGlobally');
      });

      it('Should revert if NFT already whitelisted', async function () {
        const { permissions, mockERC721, admin, user1 } = await loadFixture(setup);
        await permissions.connect(admin)['assignNFTRole']([await mockERC721.getAddress()]);
        await expect(permissions.connect(user1)['requestNFTRole'](await mockERC721.getAddress(), 0))
          .to.be.revertedWithCustomError(permissions, 'NFTAlreadyWhitelisted')
          .withArgs(await mockERC721.getAddress());
      });

      it('Should revert for ERC721 if caller is not owner', async function () {
        const { permissions, mockERC721, user2 } = await loadFixture(setup);
        await expect(permissions.connect(user2)['requestNFTRole'](await mockERC721.getAddress(), 0))
          .to.be.revertedWithCustomError(permissions, 'CallerNotOwnerOfNFT')
          .withArgs(0, user2.address);
      });

      it('Should revert for ERC1155 if caller does not own the NFT', async function () {
        const { permissions, mockERC1155, user2 } = await loadFixture(setup);
        await expect(permissions.connect(user2)['requestNFTRole'](await mockERC1155.getAddress(), 0))
          .to.be.revertedWithCustomError(permissions, 'CallerDoesNotOwnNFT')
          .withArgs(0, user2.address);
      });

      it('Should revert if target is not NFT', async function () {
        const { permissions, mockToken, user2 } = await loadFixture(setup);
        await expect(permissions.connect(user2)['requestNFTRole'](await mockToken.getAddress(), 0)).to.be.revertedWithCustomError(
          permissions,
          'TargetIsNotNFT',
        );
      });
    });
  });
});
