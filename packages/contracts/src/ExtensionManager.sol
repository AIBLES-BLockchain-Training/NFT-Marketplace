// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IExtension {
    struct ExtensionMetadata {
        string name;
        string metadataURI;
        address implementation;
    }

    struct ExtensionFunction {
        bytes4 functionSelector;
        string functionSignature;
    }

    struct Extension {
        ExtensionMetadata metadata;
        ExtensionFunction[] functions;
    }
}
contract ExtensionManager is IExtension, Ownable {
    mapping(bytes4 => ExtensionMetadata) private functionToExtension;
    mapping(string => Extension) private extensions;
    string[] public extensionNames;

    event ExtensionAdded(string indexed name, address indexed implementation, Extension extension);
    event ExtensionReplaced(string indexed name, address indexed implementation, Extension extension);
    event ExtensionRemoved(string indexed name, Extension extension);
    event FunctionEnabled(string indexed name, bytes4 indexed functionSelector, ExtensionFunction extFunction, ExtensionMetadata extMetadata);
    event FunctionDisabled(string indexed name, bytes4 indexed functionSelector, ExtensionMetadata extMetadata);

    error ExtensionAlreadyExists(string name);
    error ExtensionDoesNotExist(string name);
    error ExtensionNoFunctions();
    error ExtensionInvalidImplementation();
    error ExtensionInvalidName();
    error FunctionAlreadyExists(bytes4 selector);
    error FunctionDoesNotExist(bytes4 selector);
    error FunctionNotInExtension(string name, bytes4 selector);

    constructor(address _owner) Ownable(_owner) {}

    function addExtension(Extension memory _extension) external onlyOwner {
        _validateExtension(_extension);
        
        string memory name = _extension.metadata.name;
        if (_extensionExists(name)) revert ExtensionAlreadyExists(name);

        extensionNames.push(name);
        extensions[name].metadata = _extension.metadata;

        for (uint256 i = 0; i < _extension.functions.length; i++) {
            extensions[name].functions.push(_extension.functions[i]);
            bytes4 selector = _extension.functions[i].functionSelector;
            if (functionToExtension[selector].implementation != address(0)) {
                revert FunctionAlreadyExists(selector);
            }
            functionToExtension[selector] = _extension.metadata;
            emit FunctionEnabled(name, selector, _extension.functions[i], _extension.metadata);
        }

        emit ExtensionAdded(name, _extension.metadata.implementation, _extension);
    }

    function replaceExtension(Extension memory _extension) external onlyOwner {
        _validateExtension(_extension);
        
        string memory name = _extension.metadata.name;
        if (!_extensionExists(name)) revert ExtensionDoesNotExist(name);

        Extension storage oldExtension = extensions[name];
        for (uint256 i = 0; i < oldExtension.functions.length; i++) {
            bytes4 selector = oldExtension.functions[i].functionSelector;
            delete functionToExtension[selector];
            emit FunctionDisabled(name, selector, oldExtension.metadata);
        }

        delete extensions[name].functions;
        extensions[name].metadata = _extension.metadata;

        for (uint256 i = 0; i < _extension.functions.length; i++) {
            extensions[name].functions.push(_extension.functions[i]);
            bytes4 selector = _extension.functions[i].functionSelector;
            if (functionToExtension[selector].implementation != address(0)) {
                revert FunctionAlreadyExists(selector);
            }
            functionToExtension[selector] = _extension.metadata;
            emit FunctionEnabled(name, selector, _extension.functions[i], _extension.metadata);
        }

        emit ExtensionReplaced(name, _extension.metadata.implementation, _extension);
    }

    function removeExtension(string memory _extensionName) external onlyOwner {
        if (!_extensionExists(_extensionName)) revert ExtensionDoesNotExist(_extensionName);

        Extension memory extension = extensions[_extensionName];
        for (uint256 i = 0; i < extension.functions.length; i++) {
            bytes4 selector = extension.functions[i].functionSelector;
            delete functionToExtension[selector];
            emit FunctionDisabled(_extensionName, selector, extension.metadata);
        }

        for (uint256 i = 0; i < extensionNames.length; i++) {
            if (keccak256(bytes(extensionNames[i])) == keccak256(bytes(_extensionName))) {
                extensionNames[i] = extensionNames[extensionNames.length - 1];
                extensionNames.pop();
                break;
            }
        }
        delete extensions[_extensionName];

        emit ExtensionRemoved(_extensionName, extension);
    }

    function enableFunctionInExtension(string memory _extensionName, ExtensionFunction memory _function) external onlyOwner {
        if (!_extensionExists(_extensionName)) revert ExtensionDoesNotExist(_extensionName);

        if (functionToExtension[_function.functionSelector].implementation != address(0)) {
            revert FunctionAlreadyExists(_function.functionSelector);
        }

        Extension storage extension = extensions[_extensionName];
        extension.functions.push(_function);
        functionToExtension[_function.functionSelector] = extension.metadata;

        emit FunctionEnabled(_extensionName, _function.functionSelector, _function, extension.metadata);
    }

    function disableFunctionInExtension(string memory _extensionName, bytes4 _functionSelector) external onlyOwner {
        if (!_extensionExists(_extensionName)) revert ExtensionDoesNotExist(_extensionName);

        Extension storage extension = extensions[_extensionName];
        if (functionToExtension[_functionSelector].implementation != extension.metadata.implementation) {
            revert FunctionNotInExtension(_extensionName, _functionSelector);
        }

        delete functionToExtension[_functionSelector];
        for (uint256 i = 0; i < extension.functions.length; i++) {
            if (extension.functions[i].functionSelector == _functionSelector) {
                extension.functions[i] = extension.functions[extension.functions.length - 1];
                extension.functions.pop();
                break;
            }
        }

        emit FunctionDisabled(_extensionName, _functionSelector, extension.metadata);
    }

    function getImplementationForFunction(bytes4 _functionSelector) external view returns (address) {
        return functionToExtension[_functionSelector].implementation;
    }

    function getExtension(string memory _extensionName) external view returns (Extension memory) {
        if (!_extensionExists(_extensionName)) revert ExtensionDoesNotExist(_extensionName);
        return extensions[_extensionName];
    }

    function getAllExtensions() external view returns (Extension[] memory) {
        Extension[] memory allExtensions = new Extension[](extensionNames.length);
        for (uint256 i = 0; i < extensionNames.length; i++) {
            allExtensions[i] = extensions[extensionNames[i]];
        }
        return allExtensions;
    }

    function getAllFunctions() external view returns (ExtensionFunction[] memory) {
        uint256 totalFunctions = 0;
        for (uint256 i = 0; i < extensionNames.length; i++) {
            totalFunctions += extensions[extensionNames[i]].functions.length;
        }

        ExtensionFunction[] memory allFunctions = new ExtensionFunction[](totalFunctions);
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < extensionNames.length; i++) {
            Extension memory ext = extensions[extensionNames[i]];
            for (uint256 j = 0; j < ext.functions.length; j++) {
                allFunctions[currentIndex] = ext.functions[j];
                currentIndex++;
            }
        }
        return allFunctions;
    }

    function getMetadataForFunction(bytes4 _functionSelector) external view returns (ExtensionMetadata memory) {
        ExtensionMetadata memory metadata = functionToExtension[_functionSelector];
        if (metadata.implementation == address(0)) revert FunctionDoesNotExist(_functionSelector);
        return metadata;
    }

    function getAllExtensionNames() public view returns (string[] memory) {
        return extensionNames;
    }

    function _validateExtension(Extension memory _extension) private pure {
        if (bytes(_extension.metadata.name).length == 0) revert ExtensionInvalidName();
        if (_extension.metadata.implementation == address(0)) revert ExtensionInvalidImplementation();
        if (_extension.functions.length == 0) revert ExtensionNoFunctions();
    }

    function _extensionExists(string memory _name) private view returns (bool) {
        for (uint256 i = 0; i < extensionNames.length; i++) {
            if (keccak256(bytes(extensionNames[i])) == keccak256(bytes(_name))) {
                return true;
            }
        }
        return false;
    }
}