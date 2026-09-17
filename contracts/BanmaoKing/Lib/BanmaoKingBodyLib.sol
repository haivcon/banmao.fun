// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {BanmaoKingRoyalLib} from "./BanmaoKingRoyalLib.sol";
import {BanmaoKingBodyEffects, BanmaoKingCyborgBody} from "./BanmaoKingBodyEffects.sol";

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IBanmaoKingBodyLib} from "../IBanmaoKingRenderer.sol";

import {BanmaoKingAnatomyPart} from "./BanmaoKingAnatomyPart.sol";
/// @notice Stateless, permanently deployed body-layer catalogue.
// BEGIN CANONICAL BodyTips
/// @notice Canonical compact lower-tip artwork. Badge bodies intentionally return empty.
library BanmaoKingBodyTips {
    function render(uint8 id) internal pure returns (string memory) {
        string memory shape;
        if (id == 0) shape = '<path d="M-10-5Q0-1 10-5Q8 5 0 9Q-8 5-10-5Z" fill="#95612f" stroke="#704927" stroke-width="1.2"/><path d="M-6-2Q0 1 6-2" fill="none" stroke="#e2b46e" stroke-width="1.3"/>';
        else if (id == 2) shape = '<path d="M-10-5L-3-3 0-8 3-3 10-5Q7 4 0 10Q-7 4-10-5Z" fill="#65822d" stroke="#435f24" stroke-width="1.2"/><path d="M0-4V6M-5-1L0 3 5-1" fill="none" stroke="#b8d675" stroke-width="1.1"/>';
        else if (id == 3) shape = '<path d="M-10-4Q-5-8 0-4Q5-8 10-4Q9 5 0 9Q-9 5-10-4Z" fill="#b96e64" stroke="#894a48" stroke-width="1.2"/><path d="M-6-2Q-2-4 1-1" fill="none" stroke="#ffd2ae" stroke-width="1.5" stroke-linecap="round"/>';
        else if (id == 4) shape = '<path d="M-8-7H8L11-3V5L7 8H-7L-11 5V-3Z" fill="#647789" stroke="#324653" stroke-width="1.2"/><path d="M-7-5H7M-8 5H8" stroke="#d4e4eb" stroke-width="1.2"/><rect x="-6" y="-1" width="12" height="3" rx="1" fill="#81f5ed"><animate attributeName="opacity" values=".55;1;.55" dur="4s" repeatCount="indefinite"/></rect>';
        else if (id == 5) shape = '<path d="M-6-8H6L11-1 0 10-11-1Z" fill="#593783" stroke="#b99ae9" stroke-width="1.1"/><path d="M-6-8L0-1 6-8M-11-1H11M0-1V10" fill="none" stroke="#9675c3" stroke-width=".9"/><path d="M2-6L3-3 6-2 3-1 2 2 1-1-2-2 1-3Z" fill="#f6e6ff"><animate attributeName="opacity" values=".4;1;.4" dur="5s" repeatCount="indefinite"/></path>';
        else if (id == 10) shape = '<rect x="-11" y="-7" width="22" height="15" rx="3" fill="#b9c6d6" stroke="#34455f" stroke-width="1.2"/><rect x="-7" y="-3" width="14" height="7" rx="1" fill="#304563"/><path d="M0-3V4M-8-5H7" stroke="#eef4fa" stroke-width="1.2"/>';
        else if (id == 11) shape = '<path d="M0 8Q-12 5-11-7Q0-6 1 5Q0-5 11-8Q13 3 0 8Z" fill="#b4c5ac" stroke="#839c80" stroke-width="1.1"/><path d="M-7-3L0 8 7-4" fill="none" stroke="#e1e8d5" stroke-width="1.1"/><path data-sakura-bud="true" d="M0 4Q-7-1 0-8Q7-1 0 4Z" fill="#edb4c6" stroke="#b96c8c" stroke-width=".9"/><path d="M0-5V1" stroke="#fff2ed" stroke-width="1"/>';
        else if (id == 13) shape = '<path d="M-10-6Q0-10 10-6L8 4 0 10-8 4Z" fill="#d9a63b" stroke="#855323" stroke-width="1.2"/><path d="M-7-4L-5 3 0 7 5 3 7-4M-5-5H5" fill="none" stroke="#fff0b2" stroke-width="1"/><path d="M0-5L4 0 0 5-4 0Z" fill="#b93251" stroke="#73263d" stroke-width=".8"/><path d="M-1-3L1-1" stroke="#ffd5df" stroke-width="1.2"><animate attributeName="opacity" values=".45;1;.45" dur="6s" repeatCount="indefinite"/></path>';
        else if (id == 14) shape = '<path d="M-11-6Q0-2 11-6L9 3Q5 8 0 10Q-5 8-9 3Z" fill="#386780" stroke="#285674" stroke-width="1.5"/><path d="M-11-6Q0-10 11-6L8-1 3 0 0 4-3 0-8-1Z" fill="#b4efff" stroke="#285674" stroke-width="1.1"/><path d="M-7-5Q0-7 7-5M-4 2L0 7 4 2" fill="none" stroke="#efffff" stroke-width="1.3" stroke-linecap="round"/>';
        else return '';
        return string.concat('<g data-body-tip="', _name(id), '" transform="translate(272 470)" stroke-linejoin="round">', shape, '</g>');
    }

    function _name(uint8 id) private pure returns (string memory) {
        if (id == 0) return 'honey';
        if (id == 2) return 'lime';
        if (id == 3) return 'peach';
        if (id == 4) return 'cyborg';
        if (id == 5) return 'cosmic';
        if (id == 10) return 'office';
        if (id == 11) return 'nature';
        if (id == 14) return 'frost';
        return 'gold';
    }
}
// END CANONICAL BodyTips
contract BanmaoKingBodyLib is IBanmaoKingBodyLib {
    // Validation errors.
    error InvalidBody(uint8 traitId);
    error InvalidPart(address part);

    // Dependencies: anatomy is injected; effects and Cyborg are constructor children.
    BanmaoKingAnatomyPart public immutable anatomyPart;
    BanmaoKingBodyEffects public immutable effects = new BanmaoKingBodyEffects();
    BanmaoKingCyborgBody public immutable cyborg = new BanmaoKingCyborgBody();
    constructor(address part) {
        if (part.code.length == 0) revert InvalidPart(part);
        anatomyPart = BanmaoKingAnatomyPart(part);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId || interfaceId == type(IBanmaoKingBodyLib).interfaceId;
    }

    function traitName(uint8 traitId) external pure returns (string memory) {
        if (traitId == 0) return "Golden Banana";
        if (traitId == 1) return "Ripe Sunshine";
        if (traitId == 2) return "Lime Banana";
        if (traitId == 3) return "Peach Banana";
        if (traitId == 4) return "Cyborg Suit";
        if (traitId == 5) return "Cosmic Suit";
        if (traitId == 6) return "Bitcoin Suit";
        if (traitId == 7) return "Ethereum Suit";
        if (traitId == 8) return "OKB Suit";
        if (traitId == 9) return "Developer Suit";
        if (traitId == 10) return "Office Suit";
        if (traitId == 11) return "Nature Suit";
        if (traitId == 12) return "Royal Suit";
        if (traitId == 13) return BanmaoKingRoyalLib.BODY_NAME;
        if (traitId == 14) return "Frost Suit";
        revert InvalidBody(traitId);
    }

    function render(uint8 traitId, uint256 tokenId) external view returns (string memory) {
        (string memory peel, string memory shade) = traitId == 13 ? (BanmaoKingRoyalLib.BODY_COLOR, BanmaoKingRoyalLib.BODY_SHADE) : _colors(traitId);
        if (traitId == 4) return cyborg.render(4);
        return string.concat('<g id="body">', _defs(peel, shade), anatomyPart.actionPose(tokenId), _catBehind(), _bananaShell(shade, _peelHighlight(peel)), _faceRim(), _cat(), _costumeDetails(traitId), effects.render(traitId), '</g>');
    }

    function _peelHighlight(string memory peel) private pure returns (string memory) {
        if (bytes7(bytes(peel)) == bytes7("#fff36b")) return "#fffac5";
        if (bytes7(bytes(peel)) == bytes7("#bde33b")) return "#edf9be";
        if (bytes7(bytes(peel)) == bytes7("#ffad6b")) return "#ffe3c4";
        if (bytes7(bytes(peel)) == bytes7("#72d8e8")) return "#d8faff";
        if (bytes7(bytes(peel)) == bytes7("#a985e8")) return "#eee3ff";
        if (bytes7(bytes(peel)) == bytes7("#ff8fc6")) return "#ffe0f0";
        if (bytes7(bytes(peel)) == bytes7("#d8d8d8")) return "#ffffff";
        if (bytes7(bytes(peel)) == bytes7("#49318c")) return "#b5a0d8";
        if (bytes7(bytes(peel)) == bytes7("#f7931a")) return "#ffe2a0";
        if (bytes7(bytes(peel)) == bytes7("#8198ef")) return "#d8e3ff";
        if (bytes7(bytes(peel)) == bytes7("#eeeeee")) return "#ffffff";
        if (bytes7(bytes(peel)) == bytes7("#46d5b0")) return "#c0f5e8";
        if (bytes7(bytes(peel)) == bytes7("#50658c")) return "#b8c6dc";
        if (bytes7(bytes(peel)) == bytes7("#ffb7ce")) return "#ffe5ef";
        if (bytes7(bytes(peel)) == bytes7("#ca4262")) return "#f0a0b8";
        if (bytes7(bytes(peel)) == bytes7("#b4efff")) return "#f0ffff";
        return "#fff9a8";
    }

    function _defs(string memory peel, string memory shade) private pure returns (string memory) {
        return string.concat('<defs>', keccak256(bytes(peel)) == keccak256(bytes(BanmaoKingRoyalLib.BODY_COLOR)) ? BanmaoKingRoyalLib.PEEL : string.concat('<linearGradient id="bk-peel" x1=".12" y1=".08" x2=".9" y2=".82"><stop stop-color="', _peelHighlight(peel), '"/><stop offset=".28" stop-color="', peel, '"/><stop offset=".72" stop-color="', peel, '"/><stop offset="1" stop-color="', shade, '"/></linearGradient>'), '<linearGradient id="bk-fur" x1=".2" y1="0" x2=".8" y2="1"><stop stop-color="#ffc77e"/><stop offset=".58" stop-color="#e99a50"/><stop offset="1" stop-color="#c87538"/></linearGradient><radialGradient id="bk-muzzle"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="#f3d5b4"/></radialGradient><radialGradient id="bk-opening" cx="50%" cy="44%" r="62%"><stop offset=".72" stop-color="#744823"/><stop offset=".9" stop-color="#5b351c"/><stop offset="1" stop-color="#3f2516"/></radialGradient></defs>');
    }

    function _catBehind() private pure returns (string memory) {
        return '<g id="cat-behind" display="none"><g transform="translate(318 405) scale(1.07) translate(-318 -382)"><path d="M318 382c29-2 39 25 61 30 22 5 41-8 42-27 1-15-11-24-22-18-8 4-9 15-2 20 5 4 12 1 14-4 2 10-6 18-16 19-22 3-38-27-77-25z" fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8" stroke-linejoin="round"/><path d="M342 387q9 15 20 20M362 402q9 10 19 12M385 405q9 5 18 3" fill="none" stroke="#9f572f" stroke-width="5" stroke-linecap="round"/></g><path d="M178 418l-2 39c-16 6-24 19-19 29 6 13 39 14 52 3 9-7 6-21-7-29l2-42zM308 418l2 42c-13 8-16 22-7 29 13 11 46 10 52-3 5-10-3-23-19-29l-2-39z" fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8"/><path d="M162 477q22-9 45 0M305 477q23-9 45 0M176 462q-3 10 0 19M196 461q-2 10 1 19M315 461q-3 10-1 19M336 462q3 10 0 19" fill="none" stroke="#b66c38" stroke-width="3" stroke-linecap="round"/><path d="M171 301c-27 7-48 29-49 53-1 20 13 34 30 28 20-7 30-42 33-74zM341 301c27 7 48 29 49 53 1 20-13 34-30 28-20-7-30-42-33-74z" fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8"/><path d="M143 330q16 3 32 12M139 347q15 4 30 13M370 331q-16 3-32 12M374 348q-15 4-30 13" fill="none" stroke="#b96832" stroke-width="4" stroke-linecap="round"/><path d="M139 361q8 10 18 7M373 362q-8 10-18 7" fill="none" stroke="#ffe1b2" stroke-width="4" stroke-linecap="round"/></g>';
    }

    function _bananaShell(string memory shade, string memory highlight) private pure returns (string memory) {
        return string.concat('<g id="banana-shell"><path d="M239 76c-9-18-10-38-5-56 10-7 24-9 34-4 4 18 2 40-4 58 44 19 73 64 85 119 15 73 15 158-6 216-9 26-22 43-39 57-22 10-51 11-76 4-34-8-60-27-70-58-21-58-21-143-6-216 12-58 38-102 82-126z" fill="url(#bk-peel)" stroke="#80643a" stroke-width="2.8" stroke-linejoin="round"/><path d="M264 74c44 19 73 64 85 119 15 73 15 158-6 216-9 26-22 43-39 57-10 4-20 6-31 7 26-39 39-97 36-176-3-90-16-165-45-223z" fill="', shade, '" opacity=".2"/><path d="M234 20c10-7 24-9 34-4l1 15c-10 8-25 10-36 5z" fill="#79512f" stroke="#65503a" stroke-width="2.4"/><path d="M239 22q12-5 25-3" fill="none" stroke="#c39b71" stroke-width="1.8" stroke-linecap="round"/><path d="M165 194c17-42 49-64 91-64s76 22 91 64c6 53-26 91-91 94-65-3-97-41-91-94z" fill="url(#bk-opening)" stroke="#80643a" stroke-width="2.4"/><path data-shell-reflection="edge" d="M166 319Q162 407 218 446" fill="none" stroke="', highlight, '" stroke-width="3" stroke-linecap="round" opacity=".22"/><path data-shell-reflection="seam" d="M242 104c-14 91-12 181-2 253 8 57 18 91 30 108" fill="none" stroke="', highlight, '" stroke-width="1.2" stroke-linecap="round" opacity=".22"/><path d="M322 115c25 71 31 155 21 226-9 62-33 104-70 124" fill="none" stroke="', shade, '" stroke-width="2.2" stroke-linecap="round" opacity=".48"/></g>');
    }

    // Paint the opening rim behind the cat so it cannot cut across moving ears.
    function _faceRim() private pure returns (string memory) {
        return '<g id="face-rim"><path d="M165 194c17-42 49-64 91-64s76 22 91 64c6 53-26 91-91 94-65-3-97-41-91-94z" fill="none" stroke="#62462b" stroke-width="3.5" opacity=".58"/><path class="king-rim-light" d="M170 238c12 32 42 50 86 52 43-2 74-20 86-52" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".38"/></g>';
    }

    function _cat() private pure returns (string memory) {
        return '<g id="cat"><path d="M171 198c9-39 40-63 85-64 45 1 76 25 85 64 8 51-23 86-85 89-62-3-93-38-85-89z" fill="url(#bk-fur)"/><g id="smil-king-ear-left" class="king-ear king-ear-left"><g class="king-ear-shape" transform="translate(205 153) scale(.85 .82) translate(-205 -153)"><path d="M180 160Q180 123 193 94Q218 112 230 151Z" fill="url(#bk-fur)" stroke="#87502d" stroke-width="3" stroke-linejoin="round"/><path d="M189 145L195 109L219 145Z" fill="#f4b16c"/><path d="M195 119l8 23" stroke="#ffd5a0" stroke-width="3" stroke-linecap="round"/></g></g><g id="smil-king-ear-right" class="king-ear king-ear-right"><g class="king-ear-shape" transform="translate(307 153) scale(.85 .82) translate(-307 -153)"><path d="M332 160Q332 123 319 94Q294 112 282 151Z" fill="url(#bk-fur)" stroke="#87502d" stroke-width="3" stroke-linejoin="round"/><path d="M323 145L317 109L293 145Z" fill="#f4b16c"/><path d="M317 119l-8 23" stroke="#ffd5a0" stroke-width="3" stroke-linecap="round"/></g></g><path d="M216 143q13 17 16 42M256 135v48M296 143q-13 17-16 42" fill="none" stroke="#a95d31" stroke-width="6" stroke-linecap="round"/><path d="M179 230q19 9 37 5M333 230q-19 9-37 5" fill="none" stroke="#c3733d" stroke-width="4" stroke-linecap="round"/><ellipse cx="236" cy="258" rx="27" ry="20" fill="url(#bk-muzzle)"/><ellipse cx="276" cy="258" rx="27" ry="20" fill="url(#bk-muzzle)"/></g>';
    }

    function _costumeDetails(uint8 traitId) private pure returns (string memory) {
        return string.concat('<g id="costume-details">', BanmaoKingBodyTips.render(traitId), '</g>');
    }
    function _colors(uint8 traitId) private pure returns (string memory peel, string memory shade) {
        if (traitId == 0) return ("#ffe53b", "#d9ad14");
        if (traitId == 1) return ("#fff36b", "#efbe28");
        if (traitId == 2) return ("#bde33b", "#75a51e");
        if (traitId == 3) return ("#ffad6b", "#e06b45");
        if (traitId == 4) return ("#d8d8d8", "#777777");
        if (traitId == 5) return ("#49318c", "#201342");
        if (traitId == 6) return ("#f7931a", "#994609");
        if (traitId == 7) return ("#8198ef", "#39468b");
        if (traitId == 8) return ("#eeeeee", "#454545");
        if (traitId == 9) return ("#46d5b0", "#147663");
        if (traitId == 10) return ("#50658c", "#202f4b");
        if (traitId == 11) return ("#ffb7ce", "#ae5477");
        if (traitId == 12) return ("#ca4262", "#76213d");
        if (traitId == 14) return ("#b4efff", "#4e9fc9");
        revert InvalidBody(traitId);
    }

}
