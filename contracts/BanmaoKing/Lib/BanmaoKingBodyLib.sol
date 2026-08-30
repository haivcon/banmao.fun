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
            '<g id="body">', _defs(peel, shade), _catBehind(), _bananaShell(shade), _cat(),
            _costumeDetails(shade), '</g>'
        );
    }

    function _defs(string memory peel, string memory shade) private pure returns (string memory) {
        return string.concat(
            '<defs><linearGradient id="bk-peel" x1="0" y1="0" x2="1" y2=".72"><stop offset="0" stop-color="#fff8a6"/><stop offset=".26" stop-color="',
            peel, '"/><stop offset=".76" stop-color="', peel, '"/><stop offset="1" stop-color="', shade,
            '"/></linearGradient><linearGradient id="bk-fur" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f7bd73"/><stop offset="1" stop-color="#df8b43"/></linearGradient></defs>'
        );
    }

    function _catBehind() private pure returns (string memory) {
        return string.concat(
            '<g id="cat-behind"><ellipse cx="260" cy="478" rx="103" ry="10" fill="#302014" opacity=".14"/>',
            '<path d="M337 397c28 37 64 42 83 19 14-17 5-38-13-40-17-2-28 13-22 28" fill="none" stroke="#df9147" stroke-width="24" stroke-linecap="round"/>',
            '<path d="M355 414l14-21M381 423l14-22M406 418l12-19" fill="none" stroke="#b76531" stroke-width="4" stroke-linecap="round"/>',
            '<g transform="rotate(-4 256 440)"><path d="M198 422l-3 38c-16 7-22 20-14 30 10 12 35 9 48-1 9-7 7-19-4-28l-1-39M286 423l1 37c-11 9-12 21-2 29 13 10 38 12 49 1 9-10 2-23-14-30l-4-39" fill="url(#bk-fur)" stroke="#784727" stroke-width="4" stroke-linejoin="round"/>',
            '<path d="M185 479q18-9 35 1M294 480q17-9 34 1" fill="none" stroke="#ffd49d" stroke-width="4" stroke-linecap="round"/></g></g>'
        );
    }

    function _bananaShell(string memory shade) private pure returns (string memory) {
        return string.concat(
            '<g id="banana-shell"><path d="M72 390c35-31 59-75 76-128 22-68 57-128 105-176 28-28 47-43 52-57l1-8c1-11 10-18 22-17 12 2 19 11 16 22l-6 24c-4 18 7 37 29 59 43 44 64 101 59 163-6 69-44 127-107 162-60 34-134 37-196 9-21-9-38-22-49-37-11-16-4-27 18-38z" fill="url(#bk-peel)" stroke="#6b5320" stroke-width="4" stroke-linejoin="round"/>',
            '<path d="M338 50c-4 18 7 37 29 59 43 44 64 101 59 163-6 69-44 127-107 162 29-43 43-93 43-148 0-67-10-147-24-236z" fill="', shade, '" opacity=".2"/>',
            '<path d="M306 21c1-11 10-18 22-17 12 2 19 11 16 22l-3 13c-11 5-26 4-36-2z" fill="#76502d" stroke="#51351f" stroke-width="4" stroke-linejoin="round"/>',
            '<path d="M313 20q12 5 24 3M312 28q11 5 23 2" fill="none" stroke="#bd9367" stroke-width="2" stroke-linecap="round"/>',
            '<path d="M89 381c34-37 59-81 79-133 22-57 49-108 86-153M109 421c53 31 120 35 179 11 65-27 105-78 112-144 6-63-14-124-60-174M146 449c50 16 105 12 152-11 54-27 89-72 100-126" fill="none" stroke="', shade, '" stroke-width="2.5" stroke-linecap="round" opacity=".42"/>',
            '<path d="M101 394c35-38 61-82 82-134 22-55 48-102 81-142M132 424c48 22 103 21 153 1 57-23 94-66 108-119" fill="none" stroke="#fff8a6" stroke-width="2" stroke-linecap="round" opacity=".48"/>',
            '<path d="M77 398c42 44 106 64 168 53 32-6 62-18 88-37" fill="none" stroke="', shade, '" stroke-width="3" stroke-linecap="round" opacity=".55"/>',
            '<path d="M170 210c17-39 47-60 87-61 42-1 74 20 91 60-1 57-36 91-91 92-54 1-87-32-87-91z" fill="#795323" stroke="#6b5320" stroke-width="3" transform="rotate(5 256 235)"/></g>'
        );
    }

    function _cat() private pure returns (string memory) {
        return string.concat(
            '<g id="cat" transform="rotate(5 256 235)"><path d="M178 210c13-36 42-55 80-56 40-1 70 19 84 58 3 46-30 79-85 80-53 1-84-32-79-82z" fill="url(#bk-fur)" stroke="#784727" stroke-width="4" stroke-linejoin="round"/>',
            '<path d="M207 168q18-11 36-12l-7 23M307 168q-16-11-34-12l7 23M252 155l-3 25M265 155l3 25" fill="none" stroke="#b96832" stroke-width="4" stroke-linecap="round"/>',
            '<path d="M189 239q17 11 32 6M325 239q-17 11-32 6" fill="none" stroke="#c3733d" stroke-width="3" stroke-linecap="round"/>',
            '<ellipse cx="229" cy="263" rx="30" ry="22" fill="#fff1d9"/><ellipse cx="283" cy="263" rx="30" ry="22" fill="#fff1d9"/>',
            '<path d="M158 305c-22 13-32 38-22 58 9 19 30 20 44 3 12-15 14-36 10-55M349 304c23 11 35 35 27 56-8 20-29 23-44 7-13-14-16-35-14-55" fill="url(#bk-fur)" stroke="#784727" stroke-width="4" stroke-linecap="round"/>',
            '<path d="M145 328l37 11M143 346l36 10M366 328l-36 12M369 347l-37 11" fill="none" stroke="#b96832" stroke-width="4" stroke-linecap="round"/>',
            '<path d="M143 362q15-1 26 10M369 362q-15 0-25 11" fill="none" stroke="#ffd49d" stroke-width="4" stroke-linecap="round"/></g>'
        );
    }

    function _costumeDetails(string memory shade) private pure returns (string memory) {
        return string.concat(
            '<g id="costume-details"><path d="M83 379c-10 2-17 8-20 15 5 9 14 15 25 15l11-14z" fill="#75502d" stroke="#51351f" stroke-width="3" stroke-linejoin="round"/>',
            '<path d="M69 393q10 8 20 9" fill="none" stroke="#bd9367" stroke-width="2" stroke-linecap="round"/></g>'
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
