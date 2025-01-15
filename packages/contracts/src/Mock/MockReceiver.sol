// // SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.9;

// import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
// import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
// import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
// import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";

// contract MockReceiver is Ownable, IERC721Receiver, IERC1155Receiver {
//     mapping(address => mapping(uint256 => uint256)) public receivedERC1155;
//     mapping(address => mapping(uint256 => address)) public receivedERC721;

//     constructor(address _owner) Ownable(_owner) {}

//     // Hàm tiếp nhận ERC721, ghi đè từ giao diện IERC721Receiver
//     function onERC721Received(
//         address operator,
//         address from,
//         uint256 tokenId,
//         bytes calldata data
//     ) external override returns (bytes4) {
//         receivedERC721[msg.sender][tokenId] = from;
//         return this.onERC721Received.selector;
//     }

//     // Hàm tiếp nhận ERC1155, ghi đè từ giao diện IERC1155Receiver
//     function onERC1155Received(
//         address operator,
//         address from,
//         uint256 tokenId,
//         uint256 amount,
//         bytes calldata data
//     ) external override returns (bytes4) {
//         receivedERC1155[msg.sender][tokenId] += amount;
//         return this.onERC1155Received.selector;
//     }

//     // Hàm nhận ERC721
//     function receiveERC721(address tokenAddress, uint256 tokenId) external {
//         IERC721 token = IERC721(tokenAddress);
//         address owner = token.ownerOf(tokenId);

//         token.safeTransferFrom(owner, address(this), tokenId);

//         receivedERC721[tokenAddress][tokenId] = owner;
//     }

//     // Hàm nhận ERC1155
//     function receiveERC1155(address tokenAddress, uint256 tokenId, uint256 amount) external {
//         IERC1155 token = IERC1155(tokenAddress);

//         token.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

//         receivedERC1155[tokenAddress][tokenId] += amount;
//     }

//     // Rút ERC721
//     function withdrawERC721(address tokenAddress, uint256 tokenId, address to) external onlyOwner {
//         IERC721 token = IERC721(tokenAddress);
//         address owner = token.ownerOf(tokenId);
//         require(owner == address(this), "Contract does not own this token");

//         token.safeTransferFrom(address(this), to, tokenId);
//     }

//     // Rút ERC1155
//     function withdrawERC1155(address tokenAddress, uint256 tokenId, uint256 amount, address to) external onlyOwner {
//         IERC1155 token = IERC1155(tokenAddress);
//         uint256 balance = receivedERC1155[tokenAddress][tokenId];
//         require(balance >= amount, "Insufficient balance");

//         receivedERC1155[tokenAddress][tokenId] -= amount;
//         token.safeTransferFrom(address(this), to, tokenId, amount, "");
//     }
// }
