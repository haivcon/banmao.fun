// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

struct BanmaoKingTraits {
    uint8 body;
    uint8 expression;
    uint8 accessory;
    uint8 background;
}

interface IBanmaoKingBodyLib is IERC165 {
    function render(uint8 traitId, uint256 tokenId) external pure returns (string memory);
    function traitName(uint8 traitId) external pure returns (string memory);
}

interface IBanmaoKingExpressionLib is IERC165 {
    function render(uint8 traitId) external pure returns (string memory);
    function traitName(uint8 traitId) external pure returns (string memory);
}

interface IBanmaoKingAccessoryLib is IERC165 {
    function renderRear(uint8 traitId) external pure returns (string memory);
    function render(uint8 traitId) external pure returns (string memory);
    function traitName(uint8 traitId) external pure returns (string memory);
}

interface IBanmaoKingRenderer is IERC165 {
    function tokenURI(uint256 tokenId, BanmaoKingTraits calldata traits) external view returns (string memory);
    function renderSVG(uint256 tokenId, BanmaoKingTraits calldata traits) external view returns (string memory);
    function renderAttributes(uint256 tokenId, BanmaoKingTraits calldata traits) external view returns (string memory);
}
