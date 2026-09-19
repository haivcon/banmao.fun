// SPDX-License-Identifier: MIT
// Author: haivcon
// Telegram: t.me/haivcon | X: x.com/haivcon | GitHub: github.com/haivcon
// All for the advancement of Web3.
pragma solidity ^0.8.30;

// Canonical layout and palette; exported downstream by tools/sync-king-identity.cjs.
library BanmaoKingIdentityLib {
    // Anchor the token digits at an equal 8-unit inset from the top and left edges.
    string internal constant BADGE_TRANSFORM = "translate(8 8) scale(.8) translate(-386 -25)";
    // Quarter-scale cluster centers align the 24-unit logo box with the digit height.
    uint256 internal constant LOGO_CENTER_X = 386;
    uint256 internal constant LOGO_CENTER_Y = 25;
    string internal constant WATERMARK_OPEN = '<g class="king-composition-watermark"><text x="506" y="505" text-anchor="end"';
    string internal constant WATERMARK_FONT = ' font-family="monospace" font-size="11" stroke-width="2" stroke-linejoin="round" paint-order="stroke"';
    function light(uint8 background) internal pure returns (bool) {
        return background == 3 || background == 4 || background >= 8;
    }
    function ink(uint8 background) internal pure returns (string memory) {
        return light(background) ? '#fff4cf' : '#342313';
    }
    function outline(uint8 background) internal pure returns (string memory) {
        return light(background) ? '#24182e' : '#fff8e8';
    }
}
