// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {BanmaoKingMotionPart0, BanmaoKingMotionPart1} from "../Lib/BanmaoKingMotionLib.sol";
import {BanmaoKingBadgeLib} from "../Lib/BanmaoKingBadgeLib.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ERC165Checker} from "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {
    BanmaoKingTraits,
    IBanmaoKingBodyLib,
    IBanmaoKingExpressionLib,
    IBanmaoKingAccessoryLib,
    IBanmaoKingRenderer
} from "../IBanmaoKingRenderer.sol";

/// @notice Fully on-chain compositor whose three artwork dependencies are immutable.
contract BanmaoKingRenderer is IBanmaoKingRenderer {
    using Strings for uint256;
    using ERC165Checker for address;

    error InvalidLayer(address layer);
    error InvalidBackground(uint8 traitId);

    // Created once with the renderer; no setters or externally supplied CSS.
    BanmaoKingMotionPart0 public immutable motionPart0;
    BanmaoKingMotionPart1 public immutable motionPart1;
    IBanmaoKingBodyLib public immutable bodyLib;
    IBanmaoKingExpressionLib public immutable expressionLib;
    IBanmaoKingAccessoryLib public immutable accessoryLib;

    constructor(address bodyLib_, address expressionLib_, address accessoryLib_) {
        if (!bodyLib_.supportsInterface(type(IBanmaoKingBodyLib).interfaceId)) revert InvalidLayer(bodyLib_);
        if (!expressionLib_.supportsInterface(type(IBanmaoKingExpressionLib).interfaceId)) revert InvalidLayer(expressionLib_);
        if (!accessoryLib_.supportsInterface(type(IBanmaoKingAccessoryLib).interfaceId)) revert InvalidLayer(accessoryLib_);
        motionPart0 = new BanmaoKingMotionPart0();
        motionPart1 = new BanmaoKingMotionPart1();
        bodyLib = IBanmaoKingBodyLib(bodyLib_);
        expressionLib = IBanmaoKingExpressionLib(expressionLib_);
        accessoryLib = IBanmaoKingAccessoryLib(accessoryLib_);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId || interfaceId == type(IBanmaoKingRenderer).interfaceId;
    }

    function tokenURI(uint256 tokenId, BanmaoKingTraits calldata traits_) external view returns (string memory) {
        string memory image = Base64.encode(bytes(renderSVG(tokenId, traits_)));
        return string.concat(
            "data:application/json;base64,",
            Base64.encode(bytes(string.concat(
                '{"name":"Banmao King #', tokenId.toString(),
                '","description":"A fully on-chain Banmao composed from immutable SVG layers.",',
                '"image":"data:image/svg+xml;base64,', image, '",',
                '"attributes":', renderAttributes(tokenId, traits_), "}"
            )))
        );
    }

    function renderSVG(uint256 tokenId, BanmaoKingTraits calldata traits_) public view returns (string memory) {
        string memory shadow = traits_.background == 0 ? ''
            : '<defs><filter id="king-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#12100d" flood-opacity=".28"/></filter></defs>';
        string memory group = traits_.background == 0 ? '<g>' : '<g filter="url(#king-shadow)">';
        string memory character = string.concat(
            '<g transform="', _actionTransform(tokenId), '" data-action="', _actionName(tokenId), '">',
            '<g class="king-character-motion">', accessoryLib.renderRear(traits_.accessory),
            bodyLib.render(traits_.body, tokenId), expressionLib.render(traits_.expression),
            accessoryLib.render(traits_.accessory), '</g></g>'
        );
        string memory scene = string.concat(_background(traits_.background), _particles(traits_.background),
            '<g class="king-ground-motion">', _actionShadow(tokenId), '</g>', shadow);
        return string.concat(_svgOpen(tokenId, traits_), _motionStyle(), scene, group, character, '</g>', BanmaoKingBadgeLib.render(tokenId, traits_.background), '</svg>');
    }

    function _svgOpen(uint256 tokenId, BanmaoKingTraits calldata traits_) private pure returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Banmao King #',
            tokenId.toString(), '" class="king-art" data-animated="true" data-expression="', uint256(traits_.expression).toString(),
            '" data-accessory="', uint256(traits_.accessory).toString(), '">'
        );
    }

    function renderAttributes(uint256 tokenId, BanmaoKingTraits calldata traits_) public view returns (string memory) {
        return string.concat(
            '[{"trait_type":"Body","value":"', bodyLib.traitName(traits_.body),
            '"},{"trait_type":"Expression","value":"', expressionLib.traitName(traits_.expression),
            '"},{"trait_type":"Accessory","value":"', accessoryLib.traitName(traits_.accessory),
            '"},{"trait_type":"Background","value":"', _backgroundName(traits_.background),
            '"},{"trait_type":"Action","value":"', _actionName(tokenId), '"}]'
        );
    }

    function _actionName(uint256 tokenId) private pure returns (string memory) {
        uint256 pose = tokenId % 6;
        if (pose == 0) return "Royal Stand";
        if (pose == 1) return "Banana Wave";
        if (pose == 2) return "King's March";
        if (pose == 3) return "Big Welcome";
        if (pose == 4) return "Tiptoe";
        return "Mischief";
    }

    function _actionTransform(uint256 tokenId) private pure returns (string memory) {
        uint256 pose = tokenId % 6;
        if (pose == 0) return "translate(0 0) rotate(0 256 330)";
        if (pose == 1) return "translate(-3 1) rotate(-2 256 330)";
        if (pose == 2) return "translate(5 1) rotate(2.5 256 330)";
        if (pose == 3) return "translate(0 2) rotate(0 256 330)";
        if (pose == 4) return "translate(0 -5) rotate(-1 256 330)";
        return "translate(-5 2) rotate(-3 256 330)";
    }

    function _actionShadow(uint256 tokenId) private pure returns (string memory) {
        uint256 pose = tokenId % 6;
        if (pose == 0) return '<ellipse id="action-shadow" cx="256" cy="477" rx="101" ry="13" fill="#625b52" opacity=".18"/>';
        if (pose == 1) return '<ellipse id="action-shadow" cx="251" cy="477" rx="98" ry="12" fill="#625b52" opacity=".17"/>';
        if (pose == 2) return '<ellipse id="action-shadow" cx="263" cy="479" rx="108" ry="11" fill="#625b52" opacity=".16"/>';
        if (pose == 3) return '<ellipse id="action-shadow" cx="256" cy="478" rx="116" ry="13" fill="#625b52" opacity=".17"/>';
        if (pose == 4) return '<ellipse id="action-shadow" cx="256" cy="482" rx="78" ry="8" fill="#625b52" opacity=".12"/>';
        return '<ellipse id="action-shadow" cx="247" cy="479" rx="91" ry="11" fill="#625b52" opacity=".16"/>';
    }

    function _motionStyle() private view returns (string memory) {
        return string.concat(motionPart0.content(), motionPart1.content());
    }

    function _particles(uint8 id) private pure returns (string memory) {
        string[8] memory accents = ['#ffe76a', '#fff1e8', '#eafffa', '#493b9b', '#5ed3ff', '#ff7f50', '#ffffff', '#e9f4ff'];
        if (id > 7) revert InvalidBackground(id);
        return string.concat(
            '<g class="king-particles" aria-hidden="true" fill="', accents[id], '">',
            '<circle cx="66" cy="180" r="3"/><circle cx="442" cy="260" r="4"/><circle cx="82" cy="376" r="2.5"/>',
            '<path d="M415 160v12m-6-6h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="110" cy="100" r="3"/></g>'
        );
    }

    function _background(uint8 id) private pure returns (string memory) {
        if (id == 0) return '<rect width="512" height="512" fill="#f4efe7"/><ellipse cx="256" cy="260" rx="210" ry="225" fill="#fffaf0" opacity=".45"/><path d="M48 444q208 35 416 0" fill="none" stroke="#dbcdb7" stroke-width="2" opacity=".4"/>';
        if (id == 1) return '<rect width="512" height="512" fill="#ff9f9f"/><path d="M0 80h512M0 160h512M0 240h512M0 320h512M0 400h512" stroke="#fff" opacity=".16" stroke-width="20"/><path d="M0 120h512M0 280h512M0 440h512" stroke="#fff1e8" opacity=".12" stroke-width="8"/>';
        if (id == 2) return '<rect width="512" height="512" fill="#75d7c3"/><circle cx="64" cy="64" r="14" fill="#fff" opacity=".3"/><circle cx="448" cy="135" r="24" fill="#fff" opacity=".25"/><g class="king-bg-drift" fill="#eafffa" fill-opacity=".18" stroke="#eafffa" stroke-opacity=".45" stroke-width="2"><circle cx="86" cy="324" r="17"/><circle cx="423" cy="392" r="25"/><circle cx="124" cy="177" r="8"/><circle cx="376" cy="65" r="10"/><path d="M411 383q2-7 9-8" fill="none" stroke-opacity=".8" stroke-linecap="round"/></g>';
        if (id == 3) return '<rect width="512" height="512" fill="#7766cc"/><path d="M0 512L512 0v512z" fill="#493b9b"/><circle cx="75" cy="84" r="8" fill="#fff2a8"/><circle cx="430" cy="72" r="5" fill="#fff2a8"/><path d="M0 504L504 0" stroke="#c5b5fa" stroke-width="2" opacity=".4"/><path class="king-jewel" d="M414 420v16m-8-8h16M93 338v10m-5-5h10" stroke="#fff2a8" stroke-width="2" stroke-linecap="round"/>';
        if (id == 4) return '<rect width="512" height="512" fill="#17233d"/><path d="M256 0v512M0 256h512" stroke="#5ed3ff" opacity=".16"/><circle cx="84" cy="80" r="3" fill="white"/><circle cx="425" cy="122" r="4" fill="white"/><path d="M64 0v512M128 0v512M192 0v512M320 0v512M384 0v512M448 0v512M0 64h512M0 128h512M0 192h512M0 320h512M0 384h512M0 448h512" stroke="#5ed3ff" opacity=".08"/><g class="king-jewel" fill="#d2f3ff"><circle cx="70" cy="410" r="2"/><circle cx="400" cy="330" r="2"/><circle cx="360" cy="48" r="1.5"/></g>';
        if (id == 5) return '<rect width="512" height="512" fill="#ffcf61"/><path d="M0 0l512 512M512 0L0 512" stroke="#ff7f50" opacity=".18" stroke-width="60"/><path d="M256 256L0 180v45zM256 256L512 287v45zM256 256L195 0h35zM256 256L285 512h35z" fill="#ff7f50" opacity=".15"/><circle cx="256" cy="256" r="188" fill="#ffe8a1" opacity=".12"/>';
        if (id == 6) return '<rect width="512" height="512" fill="#ffb8dc"/><circle cx="256" cy="256" r="220" fill="none" stroke="#fff" opacity=".2" stroke-width="35"/><g fill="none" stroke="#fff" opacity=".25"><circle cx="256" cy="256" r="177" stroke-width="5"/><circle cx="256" cy="256" r="145" stroke-width="2"/></g><g class="king-jewel" fill="#fff1fa"><circle cx="66" cy="160" r="5"/><circle cx="444" cy="352" r="4"/></g>';
        if (id == 7) return '<rect width="512" height="512" fill="#b9d8ff"/><path d="M0 390q128-90 256 0t256 0v122H0z" fill="#e9f4ff"/><g class="king-bg-drift" fill="#e9f4ff" opacity=".55"><path d="M30 134q-8-22 14-28 8-30 34-15 26-5 30 22 25 1 23 21zM377 211q-6-20 12-25 10-26 32-13 26-4 27 20 22 0 24 18z"/></g>';
        revert InvalidBackground(id);
    }

    function _backgroundName(uint8 id) private pure returns (string memory) {
        if (id == 0) return "Banana Cream";
        if (id == 1) return "Coral Stripes";
        if (id == 2) return "Mint Bubbles";
        if (id == 3) return "Royal Split";
        if (id == 4) return "Midnight Grid";
        if (id == 5) return "Mango Burst";
        if (id == 6) return "Candy Ring";
        if (id == 7) return "Cloud Blue";
        revert InvalidBackground(id);
    }
}
