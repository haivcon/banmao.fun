// SPDX-License-Identifier: MIT
// Author: haivcon
// Telegram: t.me/haivcon | X: x.com/haivcon | GitHub: github.com/haivcon
// All for the advancement of Web3.
pragma solidity ^0.8.30;


import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

struct BanmaoKingTraits {
    uint8 body;
    uint8 expression;
    uint8 accessory;
    uint8 background;
}

/// @author haivcon
/// @custom:telegram https://t.me/haivcon
/// @custom:x https://x.com/haivcon
/// @custom:github https://github.com/haivcon
/// @custom:mission Dedicated to advancing Web3.
interface IBanmaoKingBodyLib is IERC165 {
    function render(uint8 traitId, uint256 tokenId) external view returns (string memory);
    function traitName(uint8 traitId) external view returns (string memory);
}

/// @author haivcon
/// @custom:telegram https://t.me/haivcon
/// @custom:x https://x.com/haivcon
/// @custom:github https://github.com/haivcon
/// @custom:mission Dedicated to advancing Web3.
interface IBanmaoKingExpressionLib is IERC165 {
    function render(uint8 traitId) external view returns (string memory);
    function traitName(uint8 traitId) external view returns (string memory);
}

/// @author haivcon
/// @custom:telegram https://t.me/haivcon
/// @custom:x https://x.com/haivcon
/// @custom:github https://github.com/haivcon
/// @custom:mission Dedicated to advancing Web3.
interface IBanmaoKingAccessoryLib is IERC165 {
    function renderRear(uint8 traitId) external view returns (string memory);
    function render(uint8 traitId) external view returns (string memory);
    function traitName(uint8 traitId) external view returns (string memory);
}

/// @author haivcon
/// @custom:telegram https://t.me/haivcon
/// @custom:x https://x.com/haivcon
/// @custom:github https://github.com/haivcon
/// @custom:mission Dedicated to advancing Web3.
interface IBanmaoKingRenderer is IERC165 {
    function tokenURI(uint256 tokenId, BanmaoKingTraits calldata traits) external view returns (string memory);
    function renderSVG(uint256 tokenId, BanmaoKingTraits calldata traits) external view returns (string memory);
    function renderAttributes(uint256 tokenId, BanmaoKingTraits calldata traits) external view returns (string memory);
}
