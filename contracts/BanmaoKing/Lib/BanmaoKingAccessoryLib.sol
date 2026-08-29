// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IBanmaoKingAccessoryLib} from "../IBanmaoKingRenderer.sol";

/// @notice Stateless, permanently deployed accessory-layer catalogue.
contract BanmaoKingAccessoryLib is IBanmaoKingAccessoryLib {
    error InvalidAccessory(uint8 traitId);

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId || interfaceId == type(IBanmaoKingAccessoryLib).interfaceId;
    }

    function traitName(uint8 id) external pure returns (string memory) {
        if (id == 0) return "None";
        if (id == 1) return "King Crown";
        if (id == 2) return "Red Bow";
        if (id == 3) return "Round Glasses";
        if (id == 4) return "Pixel Shades";
        if (id == 5) return "Party Hat";
        if (id == 6) return "Gold Chain";
        if (id == 7) return "Leaf Pin";
        if (id == 8) return "Headphones";
        if (id == 9) return "Wizard Hat";
        if (id == 10) return "Halo";
        if (id == 11) return "Tiny Cape";
        revert InvalidAccessory(id);
    }

    function render(uint8 id) external pure returns (string memory) {
        if (id == 0) return '<g id="accessory"/>';
        if (id == 1) return '<g id="accessory"><path d="M190 116l12-39 29 25 25-37 25 37 30-25 11 42z" fill="#ffd84e" stroke="#7d4d16" stroke-width="6"/><circle cx="203" cy="81" r="7" fill="#ef5376"/><circle cx="256" cy="69" r="7" fill="#56c9ff"/><circle cx="309" cy="81" r="7" fill="#ef5376"/></g>';
        if (id == 2) return '<g id="accessory"><path d="M185 292q-38-24-40 12 4 35 44 8l17 11 15-29-19 4zM327 292q38-24 40 12-4 35-44 8l-17 11-15-29 19 4z" fill="#ed4d4d" stroke="#762a2a" stroke-width="5"/></g>';
        if (id == 3) return '<g id="accessory" fill="none" stroke="#5b3825" stroke-width="6"><circle cx="220" cy="212" r="25"/><circle cx="292" cy="212" r="25"/><path d="M245 210h22M195 206l-18-6M317 206l18-6"/></g>';
        if (id == 4) return '<g id="accessory"><path d="M194 197h53v27h-13v13h-21v-13h-19zM265 197h53v27h-19v13h-21v-13h-13zM247 203h18" fill="#1c2033" stroke="#070912" stroke-width="5"/></g>';
        if (id == 5) return '<g id="accessory"><path d="M205 151l48-105 54 107z" fill="#ff6d8d" stroke="#713d24" stroke-width="6"/><path d="M221 116l70-30M238 78l44-19" stroke="#ffe35e" stroke-width="9"/><circle cx="253" cy="43" r="13" fill="#57d6d0"/></g>';
        if (id == 6) return '<g id="accessory"><path d="M196 302q60 66 120-1" fill="none" stroke="#f6c944" stroke-width="12" stroke-dasharray="12 5"/><circle cx="256" cy="345" r="18" fill="#f6c944" stroke="#9d641d" stroke-width="5"/><path d="M250 334v23M263 334v23" stroke="#9d641d" stroke-width="4"/></g>';
        if (id == 7) return '<g id="accessory"><path d="M327 338q43-32 57 11-35 26-57-11z" fill="#5bcf69" stroke="#236b31" stroke-width="5"/><path d="M332 338l40 9" stroke="#236b31" stroke-width="4"/></g>';
        if (id == 8) return '<g id="accessory"><path d="M187 218q-3-69 69-72 72 3 69 72" fill="none" stroke="#33384f" stroke-width="13"/><rect x="174" y="207" width="29" height="58" rx="12" fill="#56c9ff" stroke="#33384f" stroke-width="6"/><rect x="309" y="207" width="29" height="58" rx="12" fill="#56c9ff" stroke="#33384f" stroke-width="6"/></g>';
        if (id == 9) return '<g id="accessory"><path d="M182 150q73-23 148 0l-42-47 7-60-48 42-45-25 18 58z" fill="#694aa8" stroke="#35255d" stroke-width="7"/><path d="M197 137q59 18 119 0" fill="none" stroke="#ffd84e" stroke-width="10"/></g>';
        if (id == 10) return '<g id="accessory"><ellipse cx="256" cy="91" rx="75" ry="18" fill="none" stroke="#ffe56d" stroke-width="10"/><ellipse cx="256" cy="91" rx="67" ry="11" fill="none" stroke="white" stroke-width="3" opacity=".8"/></g>';
        if (id == 11) return '<g id="accessory"><path d="M174 283q-31 75-4 126l45-62zM338 283q31 75 4 126l-45-62z" fill="#d84960" stroke="#702535" stroke-width="6"/></g>';
        revert InvalidAccessory(id);
    }
}
