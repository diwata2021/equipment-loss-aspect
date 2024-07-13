// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract AspectMap is ERC721, ERC721Burnable, Ownable {
    uint256 private _nextTokenId;
    string constant public CurrentLossPre = "#currentLoss";
    string constant public TransferTimesPre = "#transferTimes";

    constructor()
    ERC721("AspectMap", "AM")
    Ownable(msg.sender)
    {}

    function safeMint(address to) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
    }

    function getLossValue(address aspectId, uint256 index) public returns (uint256 lossValue) {
        bytes memory contextKey = abi.encodePacked(aspectId, address(this), index, CurrentLossPre);
        (bool success, bytes memory returnData) = address(0x64).call(contextKey);
        // 如果不存在key，是新的
        if (!success) {
            return 100;
        }
        return uint256(returnData);
    }

    // 过于中心化，可以考虑是否需要
    function updateLossValue(address aspectId, uint256 index, uint256 newLossValue) public onlyOwner returns (string memory validationData) {
        bytes memory contextKey = abi.encodePacked(aspectId, address(this), index, CurrentLossPre);
        bytes memory contextValue = abi.encode(contextKey, newLossValue);
        (bool success,) = address(0x66).call(contextValue);
        return success;
    }
}