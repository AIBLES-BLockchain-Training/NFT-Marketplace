// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/// @author thirdweb

import "./IAccessControl.sol";

/**
 *  @title   AccessControl
 *  @notice  Thirdweb's `AccessControl` is a contract extension to be used with any base contract. It exposes functions for setting and reading
 *           roles and permissions in the inheriting smart contract, enabling role-based access control using ERC-7201 storage pattern.
 */

library AccessControlStorage {
    /// @custom:storage-location erc7201:access.control.storage
    bytes32 public constant ACCESS_CONTROL_STORAGE_POSITION =
        keccak256(abi.encode(uint256(keccak256("access.control.storage")) - 1)) & ~bytes32(uint256(0xff));

    struct RoleData {
        mapping(address => bool) members;
        bytes32 adminRole;
    }

    struct Data {
        mapping(bytes32 => RoleData) _roles;
        bytes32 _defaultAdminRole;
    }

    function data() internal pure returns (Data storage data_) {
        bytes32 position = ACCESS_CONTROL_STORAGE_POSITION;
        assembly {
            data_.slot := position
        }
    }
}

abstract contract AccessControl is IAccessControl {
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /// @dev Modifier that checks that an account has a specific role. Reverts with a standardized message.
    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) public view virtual override returns (bool) {
        return _accessControlStorage()._roles[role].members[account];
    }

    /**
     * @dev Revert with a standard message if `_msgSender()` is missing `role`.
     * Overriding this function changes the behavior of the {onlyRole} modifier.
     */
    function _checkRole(bytes32 role) internal view virtual {
        _checkRole(role, msg.sender);
    }

    /**
     * @dev Revert with a standard message if `account` is missing `role`.
     */
    function _checkRole(bytes32 role, address account) internal view virtual {
        if (!hasRole(role, account)) {
            revert("AccessControl: account is missing role");
        }
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and {revokeRole}.
     */
    function getRoleAdmin(bytes32 role) public view virtual override returns (bytes32) {
        return _accessControlStorage()._roles[role].adminRole;
    }

    /**
     * @dev Grants `role` to `account`.
     */
    function grantRole(bytes32 role, address account) public virtual override onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     */
    function revokeRole(bytes32 role, address account) public virtual override onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     */
    function renounceRole(bytes32 role, address account) public virtual override {
        require(account == msg.sender, "AccessControl: can only renounce roles for self");
        _revokeRole(role, account);
    }

    /**
     * @dev Grants `role` to `account`.
     */
    function _grantRole(bytes32 role, address account) internal virtual {
        if (!hasRole(role, account)) {
            _accessControlStorage()._roles[role].members[account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }

    /**
     * @dev Revokes `role` from `account`.
     */
    function _revokeRole(bytes32 role, address account) internal virtual {
        if (hasRole(role, account)) {
            _accessControlStorage()._roles[role].members[account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
        bytes32 previousAdminRole = getRoleAdmin(role);
        _accessControlStorage()._roles[role].adminRole = adminRole;
        emit RoleAdminChanged(role, previousAdminRole, adminRole);
    }

    /**
     * @dev Grants `role` to `account`.
     */
    function _setupRole(bytes32 role, address account) internal virtual {
        _grantRole(role, account);
    }

    /// @dev Returns the AccessControl storage.
    function _accessControlStorage() internal pure returns (AccessControlStorage.Data storage data) {
        data = AccessControlStorage.data();
    }
}