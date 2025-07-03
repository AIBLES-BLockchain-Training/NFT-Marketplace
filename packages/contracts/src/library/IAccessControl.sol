// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

/// @author thirdweb

/**
 *  Thirdweb's `AccessControl` is a contract extension to be used with any base contract. It exposes functions for setting and reading
 *  roles and permissions in the inheriting smart contract, enabling role-based access control.
 */

interface IAccessControl {
    /// @dev Returns `true` if `account` has been granted `role`.
    function hasRole(bytes32 role, address account) external view returns (bool);

    /// @dev Returns the admin role that controls `role`. See {grantRole} and {revokeRole}.
    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    /// @dev Grants `role` to `account`.
    function grantRole(bytes32 role, address account) external;

    /// @dev Revokes `role` from `account`.
    function revokeRole(bytes32 role, address account) external;

    /// @dev Revokes `role` from the calling account.
    function renounceRole(bytes32 role, address account) external;

    /// @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /// @dev Emitted when `account` is granted `role`.
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /// @dev Emitted when `account` is revoked `role`.
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
}