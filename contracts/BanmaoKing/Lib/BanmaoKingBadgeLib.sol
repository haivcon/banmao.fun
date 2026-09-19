// SPDX-License-Identifier: MIT
// Author: haivcon
// Telegram: t.me/haivcon | X: x.com/haivcon | GitHub: github.com/haivcon
// All for the advancement of Web3.
pragma solidity ^0.8.30;
import {BanmaoKingIdentityLib as Identity} from "./BanmaoKingIdentityLib.sol";
import {BanmaoKingTraits} from "../IBanmaoKingRenderer.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

library BanmaoKingBadgeLib {
    using Strings for uint256;
    function render(uint256 id, uint8 background) internal pure returns (string memory) {
        bytes memory text = bytes(id.toString());
        string memory opening = string.concat('<g class="king-token-badge" transform="', Identity.BADGE_TRANSFORM, '" fill="', Identity.ink(background), '">');
        if (text.length > 6) return string.concat(opening, '<title>Token #', string(text), '</title><text x="386" y="40" font-size="8" textLength="112" lengthAdjust="spacingAndGlyphs">#', string(text), '</text></g>');
        // Pre-compute the 11 glyph maps once; avoids allocating string[11]
        // inside every _cell call (up to 105x).
        bytes[11] memory maps;
        maps[0] = '111101101101111'; maps[1] = '010110010010111';
        maps[2] = '111001111100111'; maps[3] = '111001111001111';
        maps[4] = '101101111001001'; maps[5] = '111100111001111';
        maps[6] = '111100111101111'; maps[7] = '111001010010010';
        maps[8] = '111101111101111'; maps[9] = '111101111001111';
        maps[10] = '101111101111101';
        // Merge adjacent chunks in a balanced tree. Repeatedly appending to one
        // growing string copies the entire prefix up to 105 times and inflates EVM memory.
        // This preserves every SVG byte while bounding the copying to O(n log n).
        string[105] memory cells;
        uint256 count = text.length > 4 ? (text.length + 1) * 15 : 75;
        for (uint256 i; i < count; ++i) cells[i] = _cell(id, text, i, maps);
        while (count > 1) {
            uint256 next;
            for (uint256 i; i < count; i += 2) {
                cells[next++] = i + 1 < count ? string.concat(cells[i], cells[i + 1]) : cells[i];
            }
            count = next;
        }
        return string.concat(opening, '<title>Token #', string(text), '</title><g class="king-token-cells">', cells[0], '</g></g>');
    }
    function compositionCode(BanmaoKingTraits memory traits_) internal pure returns (string memory) {
        require(traits_.body < 15 && traits_.expression < 21 && traits_.accessory >= 1 && traits_.accessory <= 25 && traits_.background < 17, "Invalid traits");
        return string.concat("banmao-", _ordinal(traits_.body), _ordinal(traits_.expression), _ordinal(traits_.accessory - 1), _ordinal(traits_.background));
    }
    function _ordinal(uint8 id) private pure returns (string memory) {
        uint256 number = uint256(id) + 1;
        return number < 10 ? string.concat("0", number.toString()) : number.toString();
    }
    function watermark(BanmaoKingTraits memory traits_) internal pure returns (string memory) {
        return string.concat(Identity.WATERMARK_OPEN, ' fill="', Identity.ink(traits_.background), '" stroke="', Identity.outline(traits_.background), '"', Identity.WATERMARK_FONT, '>', compositionCode(traits_), '</text></g>');
    }
    function _cell(uint256 id, bytes memory text, uint256 i, bytes[11] memory maps) private pure returns (string memory) {
        uint256 glyph = i / 15;
        uint256 cell = i % 15;
        string memory lit;
        {
            bool isLit;
            if (glyph <= text.length) {
                uint256 digit = glyph == 0 ? 10 : uint8(text[glyph - 1]) - 48;
                isLit = maps[digit][cell] == '1';
            }
            lit = isLit ? '1' : '0';
        }
        return _cellShape(id, i, lit);
    }
    function _cellShape(uint256 id, uint256 i, string memory lit) private pure returns (string memory) {
        bool bar = (i / 15) == 0 && ((i % 15) / 3 == 1 || (i % 15) / 3 == 3);
        string memory w = bar ? '6' : (i / 15) == 0 ? '3' : '4';
        uint256 x = (i / 15) == 0 ? 386 + (bar ? (i % 15) % 3 * 6 : 3 + (i % 15) % 3 * 3) : 386 + (i / 15) * 22 + (i % 15) % 3 * 5;
        uint256 y = 25 + (i % 15) / 3 * 5;
        string memory part;
        {
            string memory logoTx = _logoOffset(i, x, false);
            string memory logoTy = _logoOffset(i, y, true);
            part = string.concat('" style="--tx:', logoTx, 'px;--ty:', logoTy, 'px;--sx:');
            part = string.concat(part, _scatterStyle(id, i, x, y));
            part = string.concat(part, 'px;--lit:', lit, ';--cell-width:', w, 'px;--logo-lit:', i < 75 && (i % 15) < 9 ? '1' : '0', '">');
            part = string.concat(part, _motion(id, i, x, y, lit, w, logoTx, logoTy), '</rect>');
        }
        return string.concat('<rect x="', x.toString(), '" y="', y.toString(), '" width="', w, '" height="4" opacity="', lit, part);
    }
    function _scatterStyle(uint256 id, uint256 i, uint256 x, uint256 y) private pure returns (string memory) {
        return string.concat(_delta(384 + (id % 97 + i * 17) % 111, x), 'px;--sy:', _delta(14 + (i * 13 + id % 31) % 43, y));
    }
    function _motion(uint256 id, uint256 i, uint256 x, uint256 y, string memory lit, string memory width, string memory logoTx, string memory logoTy) private pure returns (string memory) {
        string memory motion;
        {
        string memory logo = string.concat(logoTx, ' ', logoTy);
        string memory scatter = string.concat(_delta(384 + (id % 97 + i * 17) % 111, x), ' ', _delta(14 + (i * 13 + id % 31) % 43, y));
        motion = string.concat('<animateTransform attributeName="transform" type="translate" values="0 0;0 0;', scatter, ';', logo, ';', logo, ';', scatter, ';0 0;0 0" keyTimes="0;.2;.3;.42;.64;.76;.88;1" dur="8s" repeatCount="indefinite" additive="sum"/>');
        }
        motion = string.concat(motion, _animate('opacity', lit, i < 75 && i % 15 < 9 ? '1' : '0'));
        return string.concat(motion, _animate('width', width, '3'), _animate('height', '4', '3'));
    }
    function _animate(string memory attribute, string memory base, string memory logo) private pure returns(string memory) {
        return string.concat('<animate attributeName="', attribute, '" values="', base, ';', base, ';', logo, ';', logo, ';', base, ';', base, '" keyTimes="0;.3;.42;.64;.88;1" dur="8s" repeatCount="indefinite"/>');
    }
    // Five solid 7x7 squares (overlapping tiles); extra digit groups reuse positions but remain hidden.
    function _logoOffset(uint256 i, uint256 base, bool vertical) private pure returns (string memory) {
        uint256[5] memory offsets = vertical ? [uint256(1),1,9,17,17] : [uint256(1),17,9,1,17];
        uint256 tile = vertical ? (i % 15) % 9 / 3 : (i % 15) % 3;
        uint256 center = vertical ? Identity.LOGO_CENTER_Y : Identity.LOGO_CENTER_X;
        return _delta(center + offsets[(i / 15) % 5] + tile * 2, base);
    }
    function _delta(uint256 a, uint256 b) private pure returns (string memory) {
        return a >= b ? (a - b).toString() : string.concat('-', (b - a).toString());
    }
}
