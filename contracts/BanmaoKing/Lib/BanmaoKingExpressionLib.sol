// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IBanmaoKingExpressionLib} from "../IBanmaoKingRenderer.sol";

/// @notice Stateless, permanently deployed face-expression catalogue.
contract BanmaoKingExpressionLib is IBanmaoKingExpressionLib {
    error InvalidExpression(uint8 traitId);

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId || interfaceId == type(IBanmaoKingExpressionLib).interfaceId;
    }

    function traitName(uint8 id) external pure returns (string memory) {
        if (id == 0) return "Happy Smile";
        if (id == 1) return "Joy";
        if (id == 2) return "Wink";
        if (id == 3) return "Love Eyes";
        if (id == 4) return "Sleepy";
        if (id == 5) return "Surprised";
        if (id == 6) return "Determined";
        if (id == 7) return "Teary";
        if (id == 8) return "Silly";
        if (id == 9) return "Cool Gaze";
        if (id == 10) return "Starstruck";
        if (id == 11) return "Zen";
        revert InvalidExpression(id);
    }

    function render(uint8 id) external pure returns (string memory) {
        string memory eyes = _eyes(id);
        string memory mouth = _mouth(id);
        string memory whiskers = '<path class="king-whiskers-left" d="M211 253Q189 247 169 243M211 260Q187 260 164 260M211 267Q189 273 169 277" fill="none" stroke="#784727" stroke-width="2.5" stroke-linecap="round" opacity=".78"/><path class="king-whiskers-right" d="M301 253Q323 247 343 243M301 260Q325 260 348 260M301 267Q323 273 343 277" fill="none" stroke="#784727" stroke-width="2.5" stroke-linecap="round" opacity=".78"/>';
        string memory nose = '<path d="M256 240l-9 7 9 8 9-8z" fill="#df7e82" stroke="#784727" stroke-width="2"/>';
        string memory blush = id == 0 || id == 1 || id == 3
            ? '<ellipse cx="190" cy="248" rx="14" ry="7" fill="#ef8b8b" opacity=".3"/><ellipse cx="322" cy="248" rx="14" ry="7" fill="#ef8b8b" opacity=".3"/>' : '';
        return string.concat('<g id="expression"><g class="', id == 4 || id == 11 ? 'king-eyes-rest' : 'king-eyes-blink', '">', eyes, '</g>', _emotionDetails(id), nose, '<g class="king-mouth">', mouth, '</g><g class="king-whiskers">', whiskers, '</g>', blush, '</g>');
    }

    function _eyes(uint8 id) private pure returns (string memory) {
        if (id == 11) return '<path d="M199 216q21 9 42 0M271 216q21 9 42 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/><path d="M205 190q15-5 30 0M277 190q15-5 30 0" fill="none" stroke="#a56a42" stroke-width="2" stroke-linecap="round"/>';
        if (id == 5) return '<ellipse cx="218" cy="213" rx="23" ry="28" fill="#fff8df" stroke="#784727" stroke-width="3"/><ellipse cx="294" cy="213" rx="23" ry="28" fill="#fff8df" stroke="#784727" stroke-width="3"/><ellipse cx="218" cy="215" rx="12" ry="18" fill="#211d19"/><ellipse cx="294" cy="215" rx="12" ry="18" fill="#211d19"/><path d="M200 179q18-9 34 0M278 179q18-9 34 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/><circle cx="214" cy="209" r="4" fill="white"/><circle cx="290" cy="209" r="4" fill="white"/>';
        if (id == 9) return '<path d="M198 210q20-12 40 0v8q-20 23-40 0zM274 210q20-12 40 0v8q-20 23-40 0z" fill="#292825" stroke="#784727" stroke-width="3"/><path d="M199 210h38M275 210h38" stroke="#633c25" stroke-width="4" stroke-linecap="round"/><path d="M207 217h9M283 217h9" stroke="#cce8ff" stroke-width="3" stroke-linecap="round"/>';
        if (id == 0) return '<ellipse cx="224" cy="211" rx="20" ry="24" fill="#211d19" stroke="#80643a" stroke-width="2.5"/><ellipse cx="288" cy="211" rx="20" ry="24" fill="#211d19" stroke="#80643a" stroke-width="2.5"/><ellipse cx="217" cy="202" rx="6.5" ry="8.5" fill="white"/><ellipse cx="281" cy="202" rx="6.5" ry="8.5" fill="white"/><circle cx="230" cy="218" r="3" fill="white" opacity=".78"/><circle cx="294" cy="218" r="3" fill="white" opacity=".78"/>';
        if (id == 2) return '<path d="M199 219q21-16 41 0" fill="none" stroke="#633c25" stroke-width="4" stroke-linecap="round"/><ellipse cx="292" cy="216" rx="19" ry="23" fill="#292825" stroke="#784727" stroke-width="2.5"/><ellipse cx="286" cy="208" rx="6" ry="8" fill="white"/><circle cx="298" cy="225" r="3" fill="white" opacity=".8"/>';
        if (id == 3) return '<path d="M220 235l-18-17q-10-12 1-21 11-7 17 7 7-14 19-6 11 9 0 22zM292 235l-18-17q-10-12 1-21 11-7 17 7 7-14 19-6 11 9 0 22z" fill="#f05272" stroke="#784727" stroke-width="3"/><path d="M205 205q4-6 9 0M277 205q4-6 9 0" fill="none" stroke="#ffb6c7" stroke-width="4" stroke-linecap="round"/>';
        if (id == 4 || id == 11) return '<path d="M199 218q21 16 42 0M271 218q21 16 42 0" fill="none" stroke="#633c25" stroke-width="4" stroke-linecap="round"/>';
        if (id == 10) return '<path d="M220 194l6 14 16 2-12 10 4 16-14-9-14 9 5-16-13-10 16-2zM292 194l6 14 16 2-12 10 4 16-14-9-14 9 5-16-13-10 16-2z" fill="#ffd84e" stroke="#6b5320" stroke-width="3"/><path d="M215 210l5-8 4 9M287 210l5-8 4 9" fill="none" stroke="#fff8ce" stroke-width="3" stroke-linecap="round"/>';
        if (id > 11) revert InvalidExpression(id);
        return '<ellipse cx="218" cy="215" rx="21" ry="25" fill="#211d19" stroke="#784727" stroke-width="3"/><ellipse cx="294" cy="215" rx="21" ry="25" fill="#211d19" stroke="#784727" stroke-width="3"/><ellipse cx="211" cy="206" rx="7" ry="9" fill="white"/><ellipse cx="287" cy="206" rx="7" ry="9" fill="white"/>';
    }

    function _emotionDetails(uint8 id) private pure returns (string memory) {
        string memory brow = id == 6 ? '<path d="M198 191l38 10M314 191l-38 10" stroke="#633c25" stroke-width="4" stroke-linecap="round"/>' : '';
        string memory tears = id == 7 ? '<g class="king-tears"><path d="M207 237q-8 18 4 22 12-6 3-22M305 237q8 18-4 22-12-6-3-22" fill="#71d9ff" stroke="#3c9dc9" stroke-width="1.5"/><path d="M209 243l-1 7M303 243l1 7" stroke="#e0faff" stroke-width="2" stroke-linecap="round"/></g>' : '';
        return string.concat(brow, tears);
    }

    function _mouth(uint8 id) private pure returns (string memory) {
        if (id == 7) return '<path d="M241 274q15-11 30 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>';
        if (id == 11) return '<path d="M246 268q10 3 20 0" fill="none" stroke="#633c25" stroke-width="2.5" stroke-linecap="round"/>';
        if (id == 9) return '<path d="M240 268q14 5 29-4" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>';
        if (id == 0) return '<path d="M241 255q15 13 30 0" fill="none" stroke="#6f4930" stroke-width="2.8" stroke-linecap="round"/>';
        if (id == 1) return '<path d="M256 255v5" fill="none" stroke="#784727" stroke-width="2.2" stroke-linecap="round"/><path d="M241 259Q256 265 271 259C269 280 243 280 241 259Z" fill="#663b3b" stroke="#784727" stroke-width="2" stroke-linejoin="round"/><path d="M248 271Q256 266 264 271Q256 277 248 271Z" fill="#f58b91" stroke="#ba626c" stroke-width="1"/>';
        if (id == 4 || id == 11) return '<path d="M243 271q13 7 26 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>';
        if (id == 5) return '<ellipse cx="256" cy="271" rx="10" ry="13" fill="#482b32" stroke="#784727" stroke-width="2"/><ellipse cx="256" cy="278" rx="5" ry="3" fill="#f58b91" stroke="#ba626c" stroke-width="1"/>';
        if (id == 6) return '<path d="M239 278q17-16 34 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>';
        if (id == 8) return '<path d="M237 261q19 18 38 0" fill="#663b3b"/><path d="M249 274q8 16 15 0" fill="#f58b91" stroke="#633c25" stroke-width="2"/>';
        if (id > 11) revert InvalidExpression(id);
        return '<path d="M256 257v7q-9 12-23 2M256 264q9 12 23 2" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    }
}
