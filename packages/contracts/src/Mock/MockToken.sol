// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockToken is ERC20, Ownable {
    enum TransferType {
        VALID,
        PAYMENT,
        FEE
    }
    TransferType public transferFailType;

    constructor(address initialOwner) ERC20("MockToken", "MTK") Ownable(initialOwner) {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function setTransferFailType(TransferType _failType) external {
        transferFailType = _failType;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        if (transferFailType == TransferType.PAYMENT) {
            revert("Payment transfer failed");
        }
        if (transferFailType == TransferType.FEE) {
            revert("Fee transfer failed");
        }
        return super.transferFrom(sender, recipient, amount);
    }
}
