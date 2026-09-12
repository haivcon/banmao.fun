// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

library BanmaoKingBadgeLib {
    using Strings for uint256;
    function render(uint256 id, uint8 background) internal pure returns (string memory) {
        bytes memory text = bytes(id.toString());
        string memory opening = string.concat('<g class="king-token-badge" transform="translate(8 8) scale(.8) translate(-386 -14)" fill="', background == 3 || background == 4 ? '#ffe9a0' : '#634323', '">');
        if (text.length > 4) return string.concat(opening, '<title>Token #', string(text), '</title><text x="386" y="40" font-size="8" textLength="112" lengthAdjust="spacingAndGlyphs">#', string(text), '</text></g>');
        string memory cells;
        for (uint256 i; i < 75; ++i) cells = string.concat(cells, _cell(id, text, i));
        return string.concat(opening, '<title>Token #', string(text), '</title><g class="king-token-cells">', cells, '</g></g>');
    }
    function _cell(uint256 id, bytes memory text, uint256 i) private pure returns (string memory) {
        uint256 glyph = i / 15;
        uint256 cell = i % 15;
        string memory lit = '0';
        {
        string[11] memory maps = ['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001010010010','111101111101111','111101111001111','101111101111101'];
        if (glyph <= text.length) {
            uint256 digit = glyph == 0 ? 10 : uint8(text[glyph - 1]) - 48;
            if (bytes(maps[digit])[cell] == '1') lit = '1';
        }
        }
        bool bar = glyph == 0 && (cell / 3 == 1 || cell / 3 == 3);
        uint256 x = glyph == 0 ? 386 + (bar ? cell % 3 * 6 : 3 + cell % 3 * 3) : 386 + glyph * 22 + cell % 3 * 5;
        uint256 y = 25 + cell / 3 * 5;
        string memory start = string.concat('<rect x="', x.toString(), '" y="', y.toString(), '" width="', bar ? '6' : glyph == 0 ? '3' : '4', '" height="4" opacity="', lit);
        {
        uint256[5] memory cx = [uint256(386),446,416,386,446];
        uint256[5] memory cy = [uint256(14),14,44,74,74];
        start = string.concat(start, '" style="--tx:', _delta(cx[glyph] + cell % 3 * 10, x), 'px;--ty:', _delta(cy[glyph] + cell % 9 / 3 * 10, y));
        }
        return string.concat(start, 'px;--sx:', _delta(384 + (id % 97 + i * 17) % 111, x), 'px;--sy:', _delta(14 + (i * 13 + id % 31) % 43, y), 'px;--lit:', lit, ';--cell-width:', bar ? '6' : glyph == 0 ? '3' : '4', 'px;--logo-lit:', cell < 9 ? '1' : '0', '"/>');
    }
    function _delta(uint256 a, uint256 b) private pure returns (string memory) {
        return a >= b ? (a - b).toString() : string.concat('-', (b - a).toString());
    }
}
