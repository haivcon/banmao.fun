// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IBanmaoKingBodyLib} from "../IBanmaoKingRenderer.sol";

import {BanmaoKingAnatomyPart} from "./BanmaoKingAnatomyPart.sol";
/// @notice Stateless, permanently deployed body-layer catalogue.
contract BanmaoKingBodyLib is IBanmaoKingBodyLib {
    error InvalidBody(uint8 traitId);
    error InvalidPart(address part);
    BanmaoKingAnatomyPart public immutable anatomyPart;
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
        if (traitId == 4) return "Blue Banana";
        if (traitId == 5) return "Royal Purple";
        if (traitId == 6) return "Pink Banana";
        if (traitId == 7) return "Mono Banana";
        revert InvalidBody(traitId);
    }

    function render(uint8 traitId, uint256 tokenId) external view returns (string memory) {
        (string memory peel, string memory shade) = _colors(traitId);
        return string.concat('<g id="body">', _defs(peel, shade), anatomyPart.actionPose(tokenId), _catBehind(), _bananaShell(shade), _faceRim(), _cat(), _costumeDetails(), anatomyPart.frontPaws(tokenId), '</g>');
    }



    function _peelHighlight(string memory peel) private pure returns (string memory) {
        if (keccak256(bytes(peel)) == keccak256(bytes("#fff36b"))) return "#fffac5";
        if (keccak256(bytes(peel)) == keccak256(bytes("#bde33b"))) return "#edf9be";
        if (keccak256(bytes(peel)) == keccak256(bytes("#ffad6b"))) return "#ffe3c4";
        if (keccak256(bytes(peel)) == keccak256(bytes("#72d8e8"))) return "#d8faff";
        if (keccak256(bytes(peel)) == keccak256(bytes("#a985e8"))) return "#eee3ff";
        if (keccak256(bytes(peel)) == keccak256(bytes("#ff8fc6"))) return "#ffe0f0";
        if (keccak256(bytes(peel)) == keccak256(bytes("#d8d8d8"))) return "#ffffff";
        return "#fff9a8";
    }

    function _defs(string memory peel, string memory shade) private pure returns (string memory) {
        return string.concat('<defs><linearGradient id="bk-peel" x1=".12" y1=".08" x2=".9" y2=".82"><stop stop-color="', _peelHighlight(peel), '"/><stop offset=".28" stop-color="', peel, '"/><stop offset=".72" stop-color="', peel, '"/><stop offset="1" stop-color="', shade, '"/></linearGradient><linearGradient id="bk-fur" x1=".2" y1="0" x2=".8" y2="1"><stop stop-color="#ffc77e"/><stop offset=".58" stop-color="#e99a50"/><stop offset="1" stop-color="#c87538"/></linearGradient><radialGradient id="bk-muzzle"><stop stop-color="#fffaf0"/><stop offset="1" stop-color="#f3d5b4"/></radialGradient><radialGradient id="bk-opening" cx="50%" cy="44%" r="62%"><stop offset=".72" stop-color="#744823"/><stop offset=".9" stop-color="#5b351c"/><stop offset="1" stop-color="#3f2516"/></radialGradient></defs>');
    }

    function _catBehind() private pure returns (string memory) {
        return '<g id="cat-behind" display="none"><g transform="translate(318 405) scale(1.07) translate(-318 -382)"><path d="M318 382c29-2 39 25 61 30 22 5 41-8 42-27 1-15-11-24-22-18-8 4-9 15-2 20 5 4 12 1 14-4 2 10-6 18-16 19-22 3-38-27-77-25z" fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8" stroke-linejoin="round"/><path d="M342 387q9 15 20 20M362 402q9 10 19 12M385 405q9 5 18 3" fill="none" stroke="#9f572f" stroke-width="5" stroke-linecap="round"/></g><path d="M178 418l-2 39c-16 6-24 19-19 29 6 13 39 14 52 3 9-7 6-21-7-29l2-42zM308 418l2 42c-13 8-16 22-7 29 13 11 46 10 52-3 5-10-3-23-19-29l-2-39z" fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8"/><path d="M162 477q22-9 45 0M305 477q23-9 45 0M176 462q-3 10 0 19M196 461q-2 10 1 19M315 461q-3 10-1 19M336 462q3 10 0 19" fill="none" stroke="#b66c38" stroke-width="3" stroke-linecap="round"/><path d="M171 301c-27 7-48 29-49 53-1 20 13 34 30 28 20-7 30-42 33-74zM341 301c27 7 48 29 49 53 1 20-13 34-30 28-20-7-30-42-33-74z" fill="url(#bk-fur)" stroke="#80643a" stroke-width="2.8"/><path d="M143 330q16 3 32 12M139 347q15 4 30 13M370 331q-16 3-32 12M374 348q-15 4-30 13" fill="none" stroke="#b96832" stroke-width="4" stroke-linecap="round"/><path d="M139 361q8 10 18 7M373 362q-8 10-18 7" fill="none" stroke="#ffe1b2" stroke-width="4" stroke-linecap="round"/></g>';
    }



    function _bananaShell(string memory shade) private pure returns (string memory) {
        return string.concat('<g id="banana-shell"><path d="M239 76c-9-18-10-38-5-56 10-7 24-9 34-4 4 18 2 40-4 58 44 19 73 64 85 119 15 73 15 158-6 216-9 26-22 43-39 57-22 10-51 11-76 4-34-8-60-27-70-58-21-58-21-143-6-216 12-58 38-102 82-126z" fill="url(#bk-peel)" stroke="#80643a" stroke-width="2.8" stroke-linejoin="round"/><path d="M264 74c44 19 73 64 85 119 15 73 15 158-6 216-9 26-22 43-39 57-10 4-20 6-31 7 26-39 39-97 36-176-3-90-16-165-45-223z" fill="', shade, '" opacity=".2"/><path d="M234 20c10-7 24-9 34-4l1 15c-10 8-25 10-36 5z" fill="#79512f" stroke="#65503a" stroke-width="2.4"/><path d="M239 22q12-5 25-3" fill="none" stroke="#c39b71" stroke-width="1.8" stroke-linecap="round"/><path d="M165 194c17-42 49-64 91-64s76 22 91 64c6 53-26 91-91 94-65-3-97-41-91-94z" fill="url(#bk-opening)" stroke="#80643a" stroke-width="2.4"/><path d="M181 122c-20 71-24 157-10 226 12 59 45 101 96 118" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" opacity=".16"/><path d="M242 104c-14 91-12 181-2 253 8 57 18 91 30 108" fill="none" stroke="#fff8a6" stroke-width="1.8" stroke-linecap="round" opacity=".5"/><path d="M322 115c25 71 31 155 21 226-9 62-33 104-70 124" fill="none" stroke="', shade, '" stroke-width="2.2" stroke-linecap="round" opacity=".48"/></g>');
    }


    // Paint the opening rim behind the cat so it cannot cut across moving ears.
    function _faceRim() private pure returns (string memory) {
        return '<g id="face-rim"><path d="M165 194c17-42 49-64 91-64s76 22 91 64c6 53-26 91-91 94-65-3-97-41-91-94z" fill="none" stroke="#62462b" stroke-width="3.5" opacity=".58"/><path class="king-rim-light" d="M170 238c12 32 42 50 86 52 43-2 74-20 86-52" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".38"/></g>';
    }

    function _cat() private pure returns (string memory) {
        return '<g id="cat"><path d="M171 198c9-39 40-63 85-64 45 1 76 25 85 64 8 51-23 86-85 89-62-3-93-38-85-89z" fill="url(#bk-fur)"/><g id="smil-king-ear-left" class="king-ear king-ear-left"><g class="king-ear-shape" transform="translate(205 153) scale(.85 .82) translate(-205 -153)"><path d="M180 160Q180 123 193 94Q218 112 230 151Z" fill="url(#bk-fur)" stroke="#87502d" stroke-width="3" stroke-linejoin="round"/><path d="M189 145L195 109L219 145Z" fill="#f4b16c"/><path d="M195 119l8 23" stroke="#ffd5a0" stroke-width="3" stroke-linecap="round"/></g></g><g id="smil-king-ear-right" class="king-ear king-ear-right"><g class="king-ear-shape" transform="translate(307 153) scale(.85 .82) translate(-307 -153)"><path d="M332 160Q332 123 319 94Q294 112 282 151Z" fill="url(#bk-fur)" stroke="#87502d" stroke-width="3" stroke-linejoin="round"/><path d="M323 145L317 109L293 145Z" fill="#f4b16c"/><path d="M317 119l-8 23" stroke="#ffd5a0" stroke-width="3" stroke-linecap="round"/></g></g><path d="M216 143q13 17 16 42M256 135v48M296 143q-13 17-16 42" fill="none" stroke="#a95d31" stroke-width="6" stroke-linecap="round"/><path d="M179 230q19 9 37 5M333 230q-19 9-37 5" fill="none" stroke="#c3733d" stroke-width="4" stroke-linecap="round"/><ellipse cx="236" cy="258" rx="27" ry="20" fill="url(#bk-muzzle)"/><ellipse cx="276" cy="258" rx="27" ry="20" fill="url(#bk-muzzle)"/></g>';
    }

    function _costumeDetails() private pure returns (string memory) {
        return '<g id="costume-details"><path d="M158 412c10 31 36 50 70 58 15 4 30 5 44 3-31-12-55-34-69-65z" fill="#fff37a" opacity=".28"/><path d="M258 462c7 5 19 7 28 1-2 8-7 15-15 17-7-2-12-9-13-18z" fill="#79512f"/><path d="M258 462c1 9 6 16 13 18 8-2 13-9 15-17" fill="none" stroke="#65503a" stroke-width="1.8" stroke-linecap="round"/><path d="M264 468q7 4 15 1" fill="none" stroke="#c39b71" stroke-width="1.5" stroke-linecap="round"/></g>';
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
