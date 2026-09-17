// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {BanmaoKingTitanSuit} from "../Lib/BanmaoKingBodyEffects.sol";
import {BanmaoKingSecondaryMotion} from "../Lib/BanmaoKingSecondaryMotion.sol";
import {BanmaoKingArtUpgrade} from "../Lib/BanmaoKingArtUpgrade.sol";
import {BanmaoKingDiamondRays} from "../Lib/BanmaoKingDiamondRays.sol";

import {BanmaoKingMotionPart0, BanmaoKingMotionPart1} from "../Lib/BanmaoKingMotionLib.sol";
import {BanmaoKingBirthdayLib} from "../Lib/BanmaoKingBirthdayLib.sol";
import {BanmaoKingBadgeLib} from "../Lib/BanmaoKingBadgeLib.sol";
import {BanmaoKingBackgroundExpansion} from "../Lib/BanmaoKingBackgroundExpansion.sol";
import {BanmaoKingBackgroundEffects} from "../Lib/BanmaoKingBackgroundEffects.sol";
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

    BanmaoKingSecondaryMotion public immutable secondaryMotion;
    BanmaoKingArtUpgrade public immutable artUpgrade;
    BanmaoKingBackgroundExpansion public immutable expansion;
    BanmaoKingBackgroundEffects public immutable backgroundEffects;
    error InvalidLayer(address layer);
    error InvalidBackground(uint8 traitId);

    // Created once with the renderer; no setters or externally supplied CSS.
    BanmaoKingMotionPart0 public immutable motionPart0;
    BanmaoKingMotionPart1 public immutable motionPart1;
    IBanmaoKingBodyLib public immutable bodyLib;
    IBanmaoKingExpressionLib public immutable expressionLib;
    BanmaoKingDiamondRays public immutable diamondRays;
    IBanmaoKingAccessoryLib public immutable accessoryLib;

    constructor(address bodyLib_, address expressionLib_, address accessoryLib_, address backgroundExpansion_, address motionPart0_, address motionPart1_, address secondaryMotion_, address artUpgrade_, address backgroundEffects_, address diamondRays_) {
        if (backgroundEffects_.code.length == 0) revert InvalidLayer(backgroundEffects_);
        if (diamondRays_.code.length == 0) revert InvalidLayer(diamondRays_);
        backgroundEffects = BanmaoKingBackgroundEffects(backgroundEffects_);
        diamondRays = BanmaoKingDiamondRays(diamondRays_);
        if (artUpgrade_.code.length == 0) revert InvalidLayer(artUpgrade_);
        artUpgrade = BanmaoKingArtUpgrade(artUpgrade_);
        if (secondaryMotion_.code.length == 0) revert InvalidLayer(secondaryMotion_);
        secondaryMotion = BanmaoKingSecondaryMotion(secondaryMotion_);
        if (backgroundExpansion_.code.length == 0) revert InvalidLayer(backgroundExpansion_);
        expansion = BanmaoKingBackgroundExpansion(backgroundExpansion_);
        if (!bodyLib_.supportsInterface(type(IBanmaoKingBodyLib).interfaceId)) revert InvalidLayer(bodyLib_);
        if (!expressionLib_.supportsInterface(type(IBanmaoKingExpressionLib).interfaceId)) revert InvalidLayer(expressionLib_);
        if (!accessoryLib_.supportsInterface(type(IBanmaoKingAccessoryLib).interfaceId)) revert InvalidLayer(accessoryLib_);
        if (motionPart0_.code.length == 0) revert InvalidLayer(motionPart0_);
        if (motionPart1_.code.length == 0) revert InvalidLayer(motionPart1_);
        motionPart0 = BanmaoKingMotionPart0(motionPart0_);
        motionPart1 = BanmaoKingMotionPart1(motionPart1_);
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
        return _renderSVG(tokenId, traits_, false);
    }

    function miniTraits(uint256 tokenId, uint8 slot) public pure returns (BanmaoKingTraits memory t) {
        require(slot < 2, "Invalid mini slot");
        uint256 seed = uint256(keccak256(abi.encode("banmao-mini-v1", tokenId, slot)));
        t.body = uint8(seed % 15);
        t.expression = uint8((seed >> 64) % 21);
        t.accessory = uint8((seed >> 128) % 22);
        if (t.accessory >= 21) t.accessory += 1; // Allow None; exclude only recursive mini companions.
    }

    function _minis(uint256 tokenId) private view returns (string memory result) {
        for (uint8 slot; slot < 2; slot++) {
            string memory image = Base64.encode(bytes(_renderSVG(tokenId, miniTraits(tokenId, slot), true)));
            result = string.concat(result, '<image data-mini="', uint256(slot).toString(), '" x="', slot == 0 ? '24' : '348', '" y="334" width="140" height="140" href="data:image/svg+xml;base64,', image, '"/>');
        }
    }

    function _renderSVG(uint256 tokenId, BanmaoKingTraits memory traits_, bool mini) private view returns (string memory) {
        string memory shadow = traits_.background == 0 ? ''
            : '<defs><filter id="king-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#12100d" flood-opacity=".28"/></filter></defs>';
        string memory group = traits_.background == 0 ? '<g>' : '<g filter="url(#king-shadow)">';
        string memory character = _character(tokenId, traits_);
        string memory scene = mini ? '' : string.concat(_background(traits_.background), _particles(traits_.background), backgroundEffects.render(traits_.background),
            _sceneUpgrade(traits_), '<g class="king-ground-motion">', _actionShadow(), '</g>', shadow);
        string memory artwork = string.concat(_svgOpen(tokenId, traits_), _motionStyle(traits_), motionPart1.choreography(traits_.expression), scene, secondaryMotion.render(traits_.expression), group, character, '</g>');
        return string.concat(artwork, _worldEffects(traits_), mini ? '' : _badges(tokenId, traits_), traits_.accessory == 21 ? _minis(tokenId) : '', '</svg>');
    }

    function _character(uint256 tokenId, BanmaoKingTraits memory traits_) private view returns (string memory) {
        return string.concat(
            '<g id="king-action-root" transform="translate(0 0)" data-action="', motionPart1.actionName(traits_.expression), '">',
            '<g transform="translate(256 490)"><g id="king-volume-motion"><g transform="translate(-256 -490)"><g id="king-full-turn"><g id="smil-king-character-motion" class="king-character-motion" data-accessory="', uint256(traits_.accessory).toString(), '">', accessoryLib.renderRear(traits_.accessory),
            bodyLib.render(traits_.body, tokenId), (traits_.expression == 13 ? string.concat(diamondRays.render(uint8((tokenId % 36 * 7 + 3) % 6)), diamondRays.render(uint8(6 + (tokenId / 6 % 6 * 5 + 1) % 6))) : ""), expressionLib.render(traits_.expression), traits_.body == 4 ? BanmaoKingTitanSuit.eye() : '',
            traits_.accessory == 21 ? '' : _accessory(traits_.accessory), '</g></g></g></g></g></g>'
        );
    }

    function _badges(uint256 tokenId, BanmaoKingTraits memory traits_) private pure returns (string memory) {
        return string.concat(BanmaoKingBadgeLib.render(tokenId, traits_.background), BanmaoKingBadgeLib.watermark(traits_));
    }

    function _worldEffects(BanmaoKingTraits memory traits_) private view returns (string memory) {
        if (traits_.accessory == 19) return artUpgrade.bubbles(traits_.expression);
        if (traits_.accessory == 5) return BanmaoKingBirthdayLib.render();
        return '';
    }

    function _accessory(uint8 id) private view returns (string memory) {
        if (id == 19) return artUpgrade.render(39);
        return string.concat(accessoryLib.render(id), id == 12 || id == 18 ? artUpgrade.render(id + 20) : '');
    }

    function _sceneUpgrade(BanmaoKingTraits memory t) private view returns (string memory) {
        return string.concat(t.background == 0 || t.background == 5 ? artUpgrade.render(t.background) : '',
            t.body >= 5 && t.body <= 13 && t.body + 3 == t.background ? artUpgrade.render(48) : '');
    }

    function _svgOpen(uint256 tokenId, BanmaoKingTraits memory traits_) private pure returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Banmao King #',
            tokenId.toString(), '" class="king-art" data-animated="true" data-expression="', uint256(traits_.expression).toString(), '">'
        );
    }

    function renderAttributes(uint256 /* tokenId */, BanmaoKingTraits calldata traits_) public view returns (string memory) {
        return string.concat(
            '[{"trait_type":"Body","value":"', bodyLib.traitName(traits_.body),
            '"},{"trait_type":"Expression","value":"', expressionLib.traitName(traits_.expression),
            '"},{"trait_type":"Accessory","value":"', accessoryLib.traitName(traits_.accessory),
            '"},{"trait_type":"Background","value":"', _backgroundName(traits_.background),
            '"},{"trait_type":"Action","value":"', motionPart1.actionName(traits_.expression), '"}]'
        );
    }

    function _actionShadow() private pure returns (string memory) {
        return '<ellipse id="action-shadow" cx="256" cy="477" rx="101" ry="13" fill="#625b52" opacity=".18"/>';
    }

    function _motionStyle(BanmaoKingTraits memory traits_) private view returns (string memory) {
        return string.concat(motionPart0.contentFor(traits_.expression), motionPart1.contentFor(traits_.expression), motionPart0.accessory(traits_.accessory < 12 ? traits_.accessory : 0), motionPart0.background(traits_.background < 8 ? traits_.background : 0));
    }

    function _particles(uint8 id) private pure returns (string memory) {
        string[8] memory accents = ['#ffe76a', '#75f7ec', '#eafffa', '#493b9b', '#5ed3ff', '#ff7f50', '#ffffff', '#e9f4ff'];
        if (id >= 17) revert InvalidBackground(id);
        if (id >= 8) return "";
        return string.concat(
            '<g id="smil-king-particles" class="king-particles" aria-hidden="true" fill="', accents[id], '">',
            '<circle cx="66" cy="180" r="3"/><circle cx="442" cy="260" r="4"/><circle cx="82" cy="376" r="2.5"/>',
            '<path d="M415 160v12m-6-6h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="110" cy="100" r="3"/></g>'
        );
    }

    function _background(uint8 id) private view returns (string memory) {
        if (id >= 8) return expansion.render(id);
        if (id == 0) return '<rect width="512" height="512" fill="#f4efe7"/><ellipse cx="256" cy="260" rx="210" ry="225" fill="#fffaf0" opacity=".45"/><path d="M48 444q208 35 416 0" fill="none" stroke="#dbcdb7" stroke-width="2" opacity=".4"/>';
        if (id == 1) return "<rect width=\"512\" height=\"512\" fill=\"#101329\"/><circle cx=\"256\" cy=\"165\" r=\"115\" fill=\"#312059\"/><circle cx=\"256\" cy=\"165\" r=\"103\" fill=\"none\" stroke=\"#cf66ff\" stroke-width=\"2\"/><path d=\"M0 330H512V512H0Z\" fill=\"#161f38\"/><path d=\"M0 370H512M0 426H512M0 500H512M256 330L0 512M256 330L96 512M256 330L416 512M256 330L512 512\" fill=\"none\" stroke=\"#4cdfeb\" opacity=\".4\"/><path d=\"M15 330V202H62V250H92V165H128V330M384 330V186H418V242H447V149H486V330\" fill=\"#1c2844\" stroke=\"#5bf4e8\" stroke-width=\"2\"/><path d=\"M28 225h19m-19 18h19M102 187h14m-14 18h14M459 174h14m-14 18h14M395 211h12\" stroke=\"#e08bff\" stroke-width=\"3\"/><g fill=\"none\" stroke=\"#75f7ec\" opacity=\".7\"><path d=\"M40 115l22-13 22 13v26l-22 13-22-13Z M428 71l18-10 18 10v22l-18 10-18-10Z\"/><path d=\"M62 154v28h-35M446 103v25h36\"/></g>";
        if (id == 2) return '<rect width="512" height="512" fill="#75d7c3"/><circle cx="64" cy="64" r="14" fill="#fff" opacity=".3"/><circle cx="448" cy="135" r="24" fill="#fff" opacity=".25"/><g id="smil-king-bg-drift" class="king-bg-drift" fill="#eafffa" fill-opacity=".18" stroke="#eafffa" stroke-opacity=".45" stroke-width="2"><circle cx="86" cy="324" r="17"/><circle cx="423" cy="392" r="25"/><circle cx="124" cy="177" r="8"/><circle cx="376" cy="65" r="10"/><path d="M411 383q2-7 9-8" fill="none" stroke-opacity=".8" stroke-linecap="round"/></g>';
        if (id == 3) return '<rect width="512" height="512" fill="#7766cc"/><path d="M0 512L512 0v512z" fill="#493b9b"/><circle cx="75" cy="84" r="8" fill="#fff2a8"/><circle cx="430" cy="72" r="5" fill="#fff2a8"/><path d="M0 504L504 0" stroke="#c5b5fa" stroke-width="2" opacity=".4"/><path id="smil-king-bg-jewel" class="king-jewel" d="M414 420v16m-8-8h16M93 338v10m-5-5h10" stroke="#fff2a8" stroke-width="2" stroke-linecap="round"/>';
        if (id == 4) return '<rect width="512" height="512" fill="#17233d"/><path d="M256 0v512M0 256h512" stroke="#5ed3ff" opacity=".16"/><circle cx="84" cy="80" r="3" fill="white"/><circle cx="425" cy="122" r="4" fill="white"/><path d="M64 0v512M128 0v512M192 0v512M320 0v512M384 0v512M448 0v512M0 64h512M0 128h512M0 192h512M0 320h512M0 384h512M0 448h512" stroke="#5ed3ff" opacity=".08"/><g id="smil-king-bg-jewel" class="king-jewel" fill="#d2f3ff"><circle cx="70" cy="410" r="2"/><circle cx="400" cy="330" r="2"/><circle cx="360" cy="48" r="1.5"/></g>';
        if (id == 5) return '<rect width="512" height="512" fill="#ffcf61"/><path d="M0 0l512 512M512 0L0 512" stroke="#ff7f50" opacity=".18" stroke-width="60"/><path d="M256 256L0 180v45zM256 256L512 287v45zM256 256L195 0h35zM256 256L285 512h35z" fill="#ff7f50" opacity=".15"/><circle cx="256" cy="256" r="188" fill="#ffe8a1" opacity=".12"/>';
        if (id == 6) return '<rect width="512" height="512" fill="#ffb8dc"/><circle cx="256" cy="256" r="220" fill="none" stroke="#fff" opacity=".2" stroke-width="35"/><g fill="none" stroke="#fff" opacity=".25"><circle cx="256" cy="256" r="177" stroke-width="5"/><circle cx="256" cy="256" r="145" stroke-width="2"/></g><g id="smil-king-bg-jewel" class="king-jewel" fill="#fff1fa"><circle cx="66" cy="160" r="5"/><circle cx="444" cy="352" r="4"/></g>';
        if (id == 7) return '<rect width="512" height="512" fill="#b9d8ff"/><path d="M0 390q128-90 256 0t256 0v122H0z" fill="#e9f4ff"/><g id="smil-king-bg-drift" class="king-bg-drift" fill="#e9f4ff" opacity=".55"><path d="M30 134q-8-22 14-28 8-30 34-15 26-5 30 22 25 1 23 21zM377 211q-6-20 12-25 10-26 32-13 26-4 27 20 22 0 24 18z"/></g>';
        revert InvalidBackground(id);
    }

    function _backgroundName(uint8 id) private view returns (string memory) {
        if (id >= 8) return expansion.traitName(id);
        if (id == 0) return "Banana Cream";
        if (id == 1) return "Cyberpunk Nexus";
        if (id == 2) return "Mint Bubbles";
        if (id == 3) return "Royal Split";
        if (id == 4) return "Midnight Grid";
        if (id == 5) return "Mango Burst";
        if (id == 6) return "Candy Ring";
        if (id == 7) return "Cloud Blue";
        revert InvalidBackground(id);
    }
}
