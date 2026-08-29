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
        return string.concat('<g id="expression">', eyes,
            '<path d="M256 226l-10 9 11 8 11-8z" fill="#d95c56" stroke="#713d24" stroke-width="3"/>',
            '<path d="M252 243q-10 10-25 4M261 243q10 10 25 4" fill="none" stroke="#713d24" stroke-width="3" stroke-linecap="round"/>',
            mouth,
            '<path d="M214 239l-47-7M215 246l-52 8M300 239l47-7M299 246l52 8" stroke="#713d24" stroke-width="2" opacity=".45"/></g>');
    }

    function _eyes(uint8 id) private pure returns (string memory) {
        if (id == 2) return '<path d="M209 216q15-14 29 0" fill="none" stroke="#4a2a1b" stroke-width="7" stroke-linecap="round"/><ellipse cx="289" cy="211" rx="15" ry="18" fill="#322218"/><circle cx="284" cy="205" r="5" fill="white"/>';
        if (id == 3) return '<path d="M220 224l-15-14q-9-11 1-18 10-6 16 5 7-11 17-4 10 8 0 18zM290 224l-15-14q-9-11 1-18 10-6 16 5 7-11 17-4 10 8 0 18z" fill="#f05272"/>';
        if (id == 4 || id == 11) return '<path d="M204 214q17 14 34 0M273 214q17 14 34 0" fill="none" stroke="#4a2a1b" stroke-width="7" stroke-linecap="round"/>';
        if (id == 6) return '<path d="M202 198l37 9M309 198l-37 9" stroke="#713d24" stroke-width="7" stroke-linecap="round"/><ellipse cx="222" cy="216" rx="13" ry="16" fill="#322218"/><ellipse cx="290" cy="216" rx="13" ry="16" fill="#322218"/>';
        if (id == 10) return '<path d="M220 190l6 14 15 1-12 10 4 15-13-8-13 8 4-15-12-10 15-1zM290 190l6 14 15 1-12 10 4 15-13-8-13 8 4-15-12-10 15-1z" fill="#ffd84e" stroke="#713d24" stroke-width="3"/>';
        if (id > 11) revert InvalidExpression(id);
        string memory extra = id == 7 ? '<path d="M208 225q-6 13 4 17 10-5 3-18M297 225q6 13-4 17-10-5-3-18" fill="#71d9ff"/>' : '';
        return string.concat('<ellipse cx="222" cy="211" rx="16" ry="19" fill="#322218"/><ellipse cx="290" cy="211" rx="16" ry="19" fill="#322218"/><circle cx="216" cy="204" r="6" fill="white"/><circle cx="284" cy="204" r="6" fill="white"/>', extra);
    }

    function _mouth(uint8 id) private pure returns (string memory) {
        if (id == 0) return '<path d="M233 251q23 22 47 0-4 27-24 28-20-1-23-28z" fill="#fff" stroke="#713d24" stroke-width="3"/>';
        if (id == 1) return '<path d="M229 250q27 36 55 0-4 37-28 38-23-2-27-38z" fill="#7e302d"/><path d="M241 278q15-9 30 0" stroke="#f58b91" stroke-width="7"/>';
        if (id == 4 || id == 11) return '<path d="M241 258q15 8 30 0" fill="none" stroke="#713d24" stroke-width="4" stroke-linecap="round"/>';
        if (id == 5) return '<ellipse cx="256" cy="263" rx="12" ry="16" fill="#7e302d"/>';
        if (id == 6) return '<path d="M237 269q19-20 38 0" fill="none" stroke="#713d24" stroke-width="5"/>';
        if (id == 8) return '<path d="M234 253q22 20 44 0" fill="#7e302d"/><path d="M251 268q10 15 20-1" fill="#f58b91" stroke="#713d24" stroke-width="2"/>';
        if (id > 11) revert InvalidExpression(id);
        return '<path d="M235 254q21 20 43 0" fill="none" stroke="#713d24" stroke-width="5" stroke-linecap="round"/>';
    }
}
