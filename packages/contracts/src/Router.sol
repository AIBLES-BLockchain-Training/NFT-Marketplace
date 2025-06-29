// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRouter {
    fallback() external payable;
    receive() external payable;
    function getImplementationForFunction(bytes4 _functionSelector) external view returns (address implementation);
}

interface IExtensionManager {
    function getImplementationForFunction(bytes4 _functionSelector) external view returns (address implementation);
}

contract Router is IRouter {
    address public immutable extensionManager;

    error RouterFunctionDoesNotExist();
    error RouterInvalidExtensionManager();

    constructor(address _extensionManager) {
        if (_extensionManager == address(0)) revert RouterInvalidExtensionManager();
        extensionManager = _extensionManager;
    }

    fallback() external payable virtual {
        if (msg.data.length == 0) return;
        
        address implementation = getImplementationForFunction(msg.sig);
        if (implementation == address(0)) revert RouterFunctionDoesNotExist();
        _delegate(implementation);
    }

    receive() external payable virtual {}

    function getImplementationForFunction(bytes4 _functionSelector) public view virtual returns (address implementation) {
        implementation = IExtensionManager(extensionManager).getImplementationForFunction(_functionSelector);
    }

    function _delegate(address implementation) internal virtual {
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())

            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
}