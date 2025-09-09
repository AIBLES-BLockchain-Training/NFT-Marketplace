import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Permissions', function () {
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
    const permissions = await PermissionsFactory.deploy();
    await permissions.waitForDeployment();
    await permissions['initialize'](admin.address)

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

  describe('Initialization', function () {
    it('Should initialize contract with correct roles and permissions', async function () {
      const [admin, user1] = await ethers.getSigners();
      
      const PermissionsFactory = await ethers.getContractFactory('Permissions');
      const permissions = await PermissionsFactory.deploy();
      await permissions.waitForDeployment();
      
      // Initialize contract
      await permissions['initialize'](admin.address);
      
      // Check admin has DEFAULT_ADMIN_ROLE
      const defaultAdminRole = await permissions['DEFAULT_ADMIN_ROLE']();
      expect(await permissions['hasRole'](defaultAdminRole, admin.address)).to.be.true;
      
      // Check admin has MANAGEMENT_ROLE
      const managementRole = await permissions['MANAGEMENT_ROLE']();
      expect(await permissions['hasRole'](managementRole, admin.address)).to.be.true;
      
      // Check role admins are set correctly
      expect(await permissions['getRoleAdmin'](managementRole)).to.equal(defaultAdminRole);
      
      const listingRole = await permissions['LISTING_ROLE']();
      const auctionRole = await permissions['AUCTION_ROLE']();
      const offerRole = await permissions['OFFER_ROLE']();
      const nftRole = await permissions['NFT_ROLE']();
      
      expect(await permissions['getRoleAdmin'](listingRole)).to.equal(managementRole);
      expect(await permissions['getRoleAdmin'](auctionRole)).to.equal(managementRole);
      expect(await permissions['getRoleAdmin'](offerRole)).to.equal(managementRole);
      expect(await permissions['getRoleAdmin'](nftRole)).to.equal(managementRole);
    });
    
    it('Should revert when trying to initialize twice', async function () {
      const [admin] = await ethers.getSigners();
      
      const PermissionsFactory = await ethers.getContractFactory('Permissions');
      const permissions = await PermissionsFactory.deploy();
      await permissions.waitForDeployment();
      
      // First initialization
      await permissions['initialize'](admin.address);
      
      // Second initialization should fail
      await expect(permissions['initialize'](admin.address))
        .to.be.revertedWith('Already initialized');
    });
    
    it('Should allow different admin address during initialization', async function () {
      const [deployer, admin] = await ethers.getSigners();
      
      const PermissionsFactory = await ethers.getContractFactory('Permissions');
      const permissions = await PermissionsFactory.connect(deployer).deploy();
      await permissions.waitForDeployment();
      
      // Initialize with different admin
      await permissions.connect(deployer)['initialize'](admin.address);
      
      // Check admin has roles, not deployer
      const defaultAdminRole = await permissions['DEFAULT_ADMIN_ROLE']();
      const managementRole = await permissions['MANAGEMENT_ROLE']();
      
      expect(await permissions['hasRole'](defaultAdminRole, admin.address)).to.be.true;
      expect(await permissions['hasRole'](managementRole, admin.address)).to.be.true;
      expect(await permissions['hasRole'](defaultAdminRole, deployer.address)).to.be.false;
      expect(await permissions['hasRole'](managementRole, deployer.address)).to.be.false;
    });
  });

  describe('Currencies', function () {
    it('Should allow MANAGEMENT_ROLE to add currencies', async function () {
      const { permissions, mockToken, mockToken2, admin } = await loadFixture(setup);
      const managementRole = await permissions['MANAGEMENT_ROLE']();

      await expect(
        permissions.connect(admin)['addCurrency']([await mockToken.getAddress(), await mockToken2.getAddress()]),
      ).to.emit(permissions, 'CurrencyAdded');

      expect(await permissions['supportedCurrencies'](await mockToken.getAddress())).to.be.true;
      expect(await permissions['supportedCurrencies'](await mockToken2.getAddress())).to.be.true;
    });

    it('Should allow MANAGEMENT_ROLE to remove currencies', async function () {
      const { permissions, mockToken, mockToken2, admin } = await loadFixture(setup);

      await permissions.connect(admin)['addCurrency']([await mockToken.getAddress(), await mockToken2.getAddress()]);
      await expect(
        permissions.connect(admin)['removeCurrency']([await mockToken.getAddress(), await mockToken2.getAddress()]),
      ).to.emit(permissions, 'CurrencyRemoved');

      expect(await permissions['supportedCurrencies'](await mockToken.getAddress())).to.be.false;
      expect(await permissions['supportedCurrencies'](await mockToken2.getAddress())).to.be.false;
    });

    it('Should revert addCurrency when empty array is provided', async function () {
      const { permissions, admin } = await loadFixture(setup);

      await expect(permissions.connect(admin)['addCurrency']([]))
        .to.be.revertedWith('Empty currency array');
    });

    it('Should revert addCurrency when called by non-authorized account', async function () {
      const { permissions, mockToken, mockToken2, user1 } = await loadFixture(setup);
      const managementRole = await permissions['MANAGEMENT_ROLE']();

      await expect(permissions.connect(user1)['addCurrency']([await mockToken.getAddress(), await mockToken2.getAddress()]))
        .to.be.revertedWith('AccessControl: account is missing role');
    });

    it('Should revert removeCurrency when called by non-authorized account', async function () {
      const { permissions, mockToken, mockToken2, user1 } = await loadFixture(setup);
      const managementRole = await permissions['MANAGEMENT_ROLE']();

      await expect(permissions.connect(user1)['removeCurrency']([await mockToken.getAddress(), await mockToken2.getAddress()]))
        .to.be.revertedWith('AccessControl: account is missing role');
    });
  });

  describe('Assets Roles', function () {
    it('Should allow MANAGEMENT_ROLE to assign and revoke NFT role', async function () {
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
      const managementRole = await permissions['MANAGEMENT_ROLE']();

      await expect(permissions.connect(user1)['assignNFTRole']([await mockERC721.getAddress()]))
        .to.be.revertedWith('AccessControl: account is missing role');

      await expect(permissions.connect(user1)['revokeNFTRole']([await mockERC721.getAddress()]))
        .to.be.revertedWith('AccessControl: account is missing role');
    });

    it('Should allow assigning NFT role to address(0) and reflect as global', async function () {
      const { permissions, admin, mockERC721 } = await loadFixture(setup);

      await expect(permissions.connect(admin)['assignNFTRole']([ethers.ZeroAddress]))
        .to.emit(permissions, 'NFTRoleAssigned')
        .withArgs(ethers.ZeroAddress);
      expect(await permissions['hasRole'](await permissions['NFT_ROLE'](), mockERC721.getAddress())).to.be.true;
    });
  });

  describe('User Role Management', function () {
    it('Should allow MANAGEMENT_ROLE to register new roles', async function () {
      const { permissions, admin } = await loadFixture(setup);
      const newRole = ethers.keccak256(ethers.toUtf8Bytes('NEW_ROLE'));
      const managementRole = await permissions['MANAGEMENT_ROLE']();

      await expect(permissions.connect(admin)['registerRole'](newRole, managementRole))
        .to.emit(permissions, 'RoleRegistered')
        .withArgs(newRole, managementRole);
    });

    it('Should revert registerRole when called by non-MANAGEMENT_ROLE', async function () {
      const { permissions, user1 } = await loadFixture(setup);
      const newRole = ethers.keccak256(ethers.toUtf8Bytes('NEW_ROLE'));
      const managementRole = await permissions['MANAGEMENT_ROLE']();

      await expect(permissions.connect(user1)['registerRole'](newRole, managementRole))
        .to.be.revertedWith('AccessControl: account is missing role');
    });

    it('Should revert when trying to register an already registered role', async function () {
      const { permissions, admin } = await loadFixture(setup);
      const listingRole = await permissions['LISTING_ROLE']();
      const managementRole = await permissions['MANAGEMENT_ROLE']();

      // LISTING_ROLE is already registered during initialization
      await expect(permissions.connect(admin)['registerRole'](listingRole, managementRole))
        .to.be.revertedWith('Role already registered');
    });

    it('Should allow MANAGEMENT_ROLE to assign and revoke listing role', async function () {
      const { permissions, user1, admin } = await loadFixture(setup);
      const listingRole = await permissions['LISTING_ROLE']();

      await expect(permissions.connect(admin)['assignRole'](listingRole, [user1.address]))
        .to.emit(permissions, 'UserRoleAssigned')
        .withArgs(listingRole, user1.address);
      expect(await permissions['hasRole'](listingRole, user1.address)).to.be.true;

      await permissions.connect(admin)['revokeRole(bytes32,address[])'](listingRole, [user1.address]);
      expect(await permissions['hasRole'](listingRole, user1.address)).to.be.false;
    });

    it('Should allow MANAGEMENT_ROLE to assign and revoke auction role', async function () {
      const { permissions, user2, admin } = await loadFixture(setup);
      const auctionRole = await permissions['AUCTION_ROLE']();

      await expect(permissions.connect(admin)['assignRole'](auctionRole, [user2.address]))
        .to.emit(permissions, 'UserRoleAssigned')
        .withArgs(auctionRole, user2.address);
      expect(await permissions['hasRole'](auctionRole, user2.address)).to.be.true;

      await permissions.connect(admin)['revokeRole(bytes32,address[])'](auctionRole, [user2.address]);
      expect(await permissions['hasRole'](auctionRole, user2.address)).to.be.false;
    });

    it('Should allow MANAGEMENT_ROLE to assign and revoke offer role', async function () {
      const { permissions, user3, admin } = await loadFixture(setup);
      const offerRole = await permissions['OFFER_ROLE']();

      await expect(permissions.connect(admin)['assignRole'](offerRole, [user3.address]))
        .to.emit(permissions, 'UserRoleAssigned')
        .withArgs(offerRole, user3.address);
      expect(await permissions['hasRole'](offerRole, user3.address)).to.be.true;

      await permissions.connect(admin)['revokeRole(bytes32,address[])'](offerRole, [user3.address]);
      expect(await permissions['hasRole'](offerRole, user3.address)).to.be.false;
    });

    it('Should revert role assignment/revocation when called by non-authorized account', async function () {
      const { permissions, user1, user2 } = await loadFixture(setup);
      const managementRole = await permissions['MANAGEMENT_ROLE']();
      const listingRole = await permissions['LISTING_ROLE']();

      await expect(permissions.connect(user2)['assignRole'](listingRole, [user1.address]))
        .to.be.revertedWith('AccessControl: account is missing role');

      await expect(permissions.connect(user2)['revokeRole(bytes32,address[])'](listingRole, [user1.address]))
        .to.be.revertedWith('AccessControl: account is missing role');
    });

    it('Should allow assigning role to address(0) and reflect as global', async function () {
      const { permissions, admin, user2 } = await loadFixture(setup);
      const listingRole = await permissions['LISTING_ROLE']();

      await expect(permissions.connect(admin)['assignRole'](listingRole, [ethers.ZeroAddress]))
        .to.emit(permissions, 'UserRoleAssigned')
        .withArgs(listingRole, ethers.ZeroAddress);
      expect(await permissions['hasRole'](listingRole, user2.address)).to.be.true;
    });

    it('Should revert when trying to assign or revoke invalid role', async function () {
      const { permissions, admin, user1 } = await loadFixture(setup);
      const invalidRole = ethers.keccak256(ethers.toUtf8Bytes('INVALID_ROLE'));

      await expect(permissions.connect(admin)['assignRole'](invalidRole, [user1.address]))
        .to.be.revertedWith('InvalidRole');

      await expect(permissions.connect(admin)['revokeRole(bytes32,address[])'](invalidRole, [user1.address]))
        .to.be.revertedWith('InvalidRole');
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
        const invalidRole = ethers.keccak256(ethers.toUtf8Bytes('INVALID_ROLE'));

        await expect(permissions.connect(user1)['requestUserRoles']([invalidRole]))
          .to.be.revertedWithCustomError(permissions, 'InvalidRole')
          .withArgs(invalidRole);
      });

      it('Should revert if role is already granted globally', async function () {
        const { permissions, admin, user1 } = await loadFixture(setup);
        const listingRole = await permissions['LISTING_ROLE']();

        await permissions.connect(admin)['assignRole'](listingRole, [ethers.ZeroAddress]);
        await expect(permissions.connect(user1)['requestUserRoles']([listingRole]))
          .to.be.revertedWithCustomError(permissions, 'RoleAlreadyGrantedGlobally')
          .withArgs(listingRole);
      });

      it('Should revert if role is already granted to msg.sender', async function () {
        const { permissions, admin, user1 } = await loadFixture(setup);
        const offerRole = await permissions['OFFER_ROLE']();

        await permissions.connect(admin)['assignRole'](offerRole, [user1.address]);
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