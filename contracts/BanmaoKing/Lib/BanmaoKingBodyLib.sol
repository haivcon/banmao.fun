// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IBanmaoKingBodyLib} from "../IBanmaoKingRenderer.sol";

/// @notice Stateless, permanently deployed body-layer catalogue.
contract BanmaoKingBodyLib is IBanmaoKingBodyLib {
    error InvalidBody(uint8 traitId);

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId || interfaceId == type(IBanmaoKingBodyLib).interfaceId;
    }

    function traitName(uint8 traitId) external pure returns (string memory) {
        if (traitId == 0) return "Golden Banana";
        if (traitId == 1) return "Ripe Sunshine";
        if (traitId == 2) return "Lime Banana";
        if (traitId == 3) return "Peach Banana";
        if (traitId == 4) return "Blue Banana";
        if (traitId == 5) return "Royal Purple";
        if (traitId == 6) return "Pink Banana";
        if (traitId == 7) return "Mono Banana";
        revert InvalidBody(traitId);
    }

    function render(uint8 traitId) external pure returns (string memory) {
        (string memory peel, string memory shade) = _colors(traitId);
        return string.concat(
            '<g id="body"><ellipse cx="256" cy="467" rx="126" ry="20" fill="#15111f" opacity=".18"/>',
            '<path d="M351 314c54 5 84 43 59 71-18 20-52 7-45-15 4-13 20-13 24-4-2-17-18-25-40-24" fill="none" stroke="#c9782f" stroke-width="19" stroke-linecap="round"/>',
            '<path d="M182 389c-5 36-4 62 2 72 8 12 42 12 48-1 5-11 2-42-3-68M284 393c-3 35-1 62 6 69 9 10 42 8 47-5 4-11-4-43-10-68" fill="#d98b3c" stroke="#713d24" stroke-width="5"/>',
            '<path d="M183 458q21-19 46 1M290 459q21-20 44-2" fill="#f3c87d" stroke="#713d24" stroke-width="4"/>',
            '<path d="M171 264c-33 25-55 74-43 90 14 19 39-12 55-50M339 262c35 15 60 54 52 73-10 23-40-4-57-36" fill="#d98b3c" stroke="#713d24" stroke-width="6" stroke-linecap="round"/>',
            '<path d="M256 51c80 18 127 107 114 218-9 79-45 162-105 179-62 17-111-16-120-96-10-89 20-138 40-187 14-35 37-57 51-72l-7-38z" fill="', peel, '" stroke="#5b4620" stroke-width="7"/>',
            '<path d="M256 51c49 17 86 91 81 192-4 85-25 157-72 205 60-17 96-100 105-179 13-111-34-200-114-218z" fill="', shade, '" opacity=".42"/>',
            '<path d="M229 55l-6-28q21-14 43-6l7 30z" fill="#75421f" stroke="#4b2b19" stroke-width="6"/>',
            '<path d="M196 165c-33 26-33 101 12 128 33 20 99 16 126-18 27-35 11-96-30-114-31-14-82-14-108 4z" fill="#df9046" stroke="#713d24" stroke-width="7"/>',
            '<path d="M203 176q22-22 43-9M315 176q-22-22-43-9" fill="none" stroke="#a65427" stroke-width="8" stroke-linecap="round" opacity=".7"/>',
            '<path d="M202 246q54 42 126 1c-4 39-33 57-65 58-31 0-56-19-61-59z" fill="#f6d9a8" opacity=".86"/>',
            '<path d="M146 382q36 25 51 60" fill="none" stroke="#fff36b" stroke-width="9" opacity=".35" stroke-linecap="round"/>',
            '<ellipse cx="218" cy="410" rx="25" ry="14" fill="#8b5832" opacity=".92"/></g>'
        );
    }

    function _colors(uint8 traitId) private pure returns (string memory peel, string memory shade) {
        if (traitId == 0) return ("#ffe53b", "#d9ad14");
        if (traitId == 1) return ("#fff36b", "#efbe28");
        if (traitId == 2) return ("#bde33b", "#75a51e");
        if (traitId == 3) return ("#ffad6b", "#e06b45");
        if (traitId == 4) return ("#72d8e8", "#3288b4");
        if (traitId == 5) return ("#a985e8", "#6540a9");
        if (traitId == 6) return ("#ff8fc6", "#d64f91");
        if (traitId == 7) return ("#d8d8d8", "#777777");
        revert InvalidBody(traitId);
    }
}
