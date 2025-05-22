// contracts/MockReceiver.sol
pragma solidity ^0.8.20;

contract MockReceiver {
    function buy() external payable {
        revert("ETH transfer failed");
    }
}
