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
        string memory whiskers = id == 0
            ? '<path d="M211 251q-24-10-46-6M211 258q-27 0-50 12M211 264q-23 9-40 24M301 251q24-10 46-6M301 258q27 0 50 12M301 264q23 9 40 24" fill="none" stroke="#fff8df" stroke-width="1.8" stroke-linecap="round" opacity=".9"/>'
            : '<path d="M211 257l-43-8M211 266l-47 7M301 257l43-8M301 266l47 7" fill="none" stroke="#784727" stroke-width="3" stroke-linecap="round" opacity=".78"/>';
        string memory nose = id == 0
            ? '<path d="M256 235l-8 6 8 7 8-7z" fill="#df7e82" stroke="#80643a" stroke-width="1.7"/>'
            : '<path d="M256 240l-9 7 9 8 9-8z" fill="#df7e82" stroke="#784727" stroke-width="2"/>';
        string memory blush = id == 0 || id == 1 || id == 3
            ? '<ellipse cx="190" cy="248" rx="14" ry="7" fill="#ef8b8b" opacity=".3"/><ellipse cx="322" cy="248" rx="14" ry="7" fill="#ef8b8b" opacity=".3"/>' : '';
        return string.concat('<g id="expression">', eyes, nose, mouth, whiskers, blush, '</g>');
    }

    function _eyes(uint8 id) private pure returns (string memory) {
        if (id == 0) return '<ellipse cx="224" cy="211" rx="18.8" ry="22.56" fill="#211d19" stroke="#80643a" stroke-width="2.35"/><ellipse cx="288" cy="211" rx="18.8" ry="22.56" fill="#211d19" stroke="#80643a" stroke-width="2.35"/><ellipse cx="217.42" cy="202.54" rx="6.11" ry="7.99" fill="white" opacity="0.9"/><ellipse cx="281.42" cy="202.54" rx="6.11" ry="7.99" fill="white" opacity="0.9"/><circle cx="229.64" cy="217.58" r="2.82" fill="white" opacity="0.7"/><circle cx="293.64" cy="217.58" r="2.82" fill="white" opacity="0.7"/>';
        if (id == 2) return '<path d="M199 219q21-16 41 0" fill="none" stroke="#633c25" stroke-width="4" stroke-linecap="round"/><ellipse cx="292" cy="216" rx="19" ry="23" fill="#292825"/><ellipse cx="286" cy="208" rx="6" ry="8" fill="white"/><circle cx="298" cy="225" r="3" fill="white" opacity=".8"/>';
        if (id == 3) return '<path d="M220 235l-18-17q-10-12 1-21 11-7 17 7 7-14 19-6 11 9 0 22zM292 235l-18-17q-10-12 1-21 11-7 17 7 7-14 19-6 11 9 0 22z" fill="#f05272" stroke="#784727" stroke-width="3"/>';
        if (id == 4 || id == 11) return '<path d="M199 218q21 16 42 0M271 218q21 16 42 0" fill="none" stroke="#633c25" stroke-width="4" stroke-linecap="round"/>';
        if (id == 10) return '<path d="M220 194l6 14 16 2-12 10 4 16-14-9-14 9 5-16-13-10 16-2zM292 194l6 14 16 2-12 10 4 16-14-9-14 9 5-16-13-10 16-2z" fill="#ffd84e" stroke="#6b5320" stroke-width="3"/>';
        if (id > 11) revert InvalidExpression(id);
        string memory brow = id == 6 ? '<path d="M198 191l38 10M314 191l-38 10" stroke="#633c25" stroke-width="4" stroke-linecap="round"/>' : '';
        string memory tears = id == 7 ? '<path d="M207 237q-8 18 4 22 12-6 3-22M305 237q8 18-4 22-12-6-3-22" fill="#71d9ff"/>' : '';
        return string.concat(brow, '<ellipse cx="218" cy="215" rx="21" ry="25" fill="#211d19" stroke="#784727" stroke-width="3"/><ellipse cx="294" cy="215" rx="21" ry="25" fill="#211d19" stroke="#784727" stroke-width="3"/><ellipse cx="211" cy="206" rx="7" ry="9" fill="white"/><ellipse cx="287" cy="206" rx="7" ry="9" fill="white"/>', tears);
    }

    function _mouth(uint8 id) private pure returns (string memory) {
        if (id == 0) return '<path d="M241 255q15 13 30 0" fill="none" stroke="#6f4930" stroke-width="3.2" stroke-linecap="round"/>';
        if (id == 1) return '<path d="M234 263q22 29 44 0-3 29-22 31-19-2-22-31z" fill="#663b3b"/><path d="M245 286q11-8 23 0" stroke="#f58b91" stroke-width="4" stroke-linecap="round"/>';
        if (id == 4 || id == 11) return '<path d="M243 271q13 7 26 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>';
        if (id == 5) return '<ellipse cx="256" cy="271" rx="10" ry="13" fill="#663b3b"/>';
        if (id == 6) return '<path d="M239 278q17-16 34 0" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round"/>';
        if (id == 8) return '<path d="M237 261q19 18 38 0" fill="#663b3b"/><path d="M249 274q8 16 15 0" fill="#f58b91" stroke="#633c25" stroke-width="2"/>';
        if (id > 11) revert InvalidExpression(id);
        return '<path d="M256 257v7q-9 12-23 2M256 264q9 12 23 2" fill="none" stroke="#633c25" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    }
}
