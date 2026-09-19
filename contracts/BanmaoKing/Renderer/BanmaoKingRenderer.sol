// SPDX-License-Identifier: MIT
// Author: haivcon
// Telegram: t.me/haivcon | X: x.com/haivcon | GitHub: github.com/haivcon
// All for the advancement of Web3.
pragma solidity ^0.8.30;
import "../Lib/BanmaoKingRoyalLib.sol";
import {BanmaoKingBitcoinMedallion} from "../Lib/BanmaoKingBitcoinMedallion.sol";
import {BanmaoKingLaptopCode} from "../Lib/BanmaoKingLaptopCode.sol";
import {BanmaoKingGrowthProps} from "../Lib/BanmaoKingGrowthProps.sol";
import {BanmaoKingCyborg, BanmaoKingCyborgEyes} from "../Lib/BanmaoKingCyborg.sol";
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

    BanmaoKingBitcoinMedallion public immutable bitcoinMedallion = new BanmaoKingBitcoinMedallion();
    BanmaoKingCyborgEyes public immutable cyborgEyes = new BanmaoKingCyborgEyes();
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
        t.accessory = uint8((seed >> 128) % 22) + 1;
        if (t.accessory >= 22) t.accessory += 1; // Allow None; exclude only recursive mini Banmao.
    }

    function _minis(uint256 tokenId) private view returns (string memory result) {
        for (uint8 slot; slot < 2; slot++) {
            string memory image = Base64.encode(bytes(_renderSVG(tokenId, miniTraits(tokenId, slot), true)));
            result = string.concat(result, '<image data-mini="', uint256(slot).toString(), '" x="', slot == 0 ? '24' : '348', '" y="334" width="140" height="140" href="data:image/svg+xml;base64,', image, '"/>');
        }
    }

    function _renderSVG(uint256 tokenId, BanmaoKingTraits memory traits_, bool mini) private view returns (string memory) {
        string memory shadow = traits_.background == 0 ? '<defs><filter id="king-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#554638" flood-opacity=".24"/></filter></defs>'
            : '<defs><filter id="king-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#12100d" flood-opacity=".28"/></filter></defs>';
        string memory group = mini ? '<g>' : '<g filter="url(#king-shadow)">';
        string memory character = _character(tokenId, traits_);
        string memory scene = mini ? '' : string.concat(_background(traits_.background), _particles(traits_.background), traits_.background == 0 ? '' : backgroundEffects.render(traits_.background),
            _sceneUpgrade(traits_), '<g class="king-ground-motion">', _actionShadow(), '</g>', shadow);
        string memory artwork = string.concat(_svgOpen(tokenId, traits_), _motionStyle(traits_), motionPart1.choreography(traits_.expression), scene, secondaryMotion.render(traits_.expression), traits_.accessory == 8 ? accessoryLib.renderRear(8) : '', group, character, '</g>', traits_.accessory == 8 ? _accessory(8, tokenId) : '');
        return string.concat(artwork, traits_.accessory == 17 ? _accessory(17, tokenId) : '', _worldEffects(traits_), !mini && traits_.background == 16 ? BanmaoKingRoyalLib.THRONE_LIGHT : '', mini ? '' : _badges(tokenId, traits_), traits_.accessory == 22 ? _minis(tokenId) : '', '</svg>');
    }

    function _character(uint256 tokenId, BanmaoKingTraits memory traits_) private view returns (string memory) {
        return string.concat(
            '<g id="king-action-root" transform="translate(0 0)" data-action="', motionPart1.actionName(traits_.expression), '">',
            '<g transform="translate(256 490)"><g id="king-volume-motion"><g transform="translate(-256 -490)"><g id="king-full-turn"><g id="smil-king-character-motion" class="king-character-motion" data-accessory="', uint256(traits_.accessory <= 23 ? traits_.accessory - 1 : traits_.accessory).toString(), '">', traits_.accessory == 8 ? '' : accessoryLib.renderRear(traits_.accessory),
            bodyLib.render(traits_.body, tokenId), (traits_.expression == 13 ? string.concat(diamondRays.render(uint8((tokenId % 36 * 7 + 3) % 6)), diamondRays.render(uint8(6 + (tokenId / 6 % 6 * 5 + 1) % 6))) : ""), traits_.body == 4 ? cyborgEyes.render(expressionLib.render(traits_.expression), traits_.expression, tokenId) : expressionLib.render(traits_.expression),
            traits_.accessory == 14 ? bitcoinMedallion.render(traits_.expression) : traits_.accessory == 8 || traits_.accessory == 22 || traits_.accessory == 17 ? '' : _accessory(traits_.accessory, tokenId), '</g></g></g></g></g></g>'
        );
    }

    function _badges(uint256 tokenId, BanmaoKingTraits memory traits_) private pure returns (string memory) {
        return string.concat(BanmaoKingBadgeLib.render(tokenId, traits_.background), BanmaoKingBadgeLib.watermark(traits_));
    }

    function _worldEffects(BanmaoKingTraits memory traits_) private view returns (string memory) {
        if (traits_.accessory == 24) return BanmaoKingGrowthProps.world();
        if (traits_.accessory == 20) return artUpgrade.bubbles(traits_.expression);
        if (traits_.accessory == 6) return BanmaoKingBirthdayLib.render();
        return '';
    }

    function _accessory(uint8 id, uint256 tokenId) private view returns (string memory) {
        if (id == 17) return string.concat('<g data-laptop-float="independent" transform="translate(0 0)"><animateTransform attributeName="transform" type="translate" values="0 0;2 -8;0 0;-2 5;0 0" keyTimes="0;.25;.5;.75;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" dur="4.8s" repeatCount="indefinite"/>', accessoryLib.render(id), BanmaoKingLaptopCode.render(tokenId), '</g>');
        if (id == 20) return artUpgrade.render(39);
        return string.concat(accessoryLib.render(id), id == 13 || id == 19 ? artUpgrade.render(id + 19) : '');
    }

    function _sceneUpgrade(BanmaoKingTraits memory t) private view returns (string memory) {
        return string.concat(t.background == 5 ? artUpgrade.render(t.background) : '',
            t.body >= 5 && t.body <= 13 && t.body + 3 == t.background ? artUpgrade.render(48) : '');
    }

    function _svgOpen(uint256 tokenId, BanmaoKingTraits memory traits_) private pure returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Banmao King #',
            tokenId.toString(), '" class="king-art" data-animated="true" data-expression="', uint256(traits_.expression).toString(), '">'
        );
    }

    function renderAttributes(uint256 tokenId, BanmaoKingTraits calldata traits_) public view returns (string memory) {
        return string.concat(
            '[{"trait_type":"Body","value":"', bodyLib.traitName(traits_.body),
            '"},{"trait_type":"Expression","value":"', expressionLib.traitName(traits_.expression),
            '"},{"trait_type":"Accessory","value":"', accessoryLib.traitName(traits_.accessory),
            '"},{"trait_type":"Background","value":"', _backgroundName(traits_.background),
            '"},{"trait_type":"Action","value":"', motionPart1.actionName(traits_.expression), '"}',
            traits_.body == 4 ? string.concat(',{"trait_type":"Cyborg Form","value":"', BanmaoKingCyborg.name(tokenId), '"}') : '', ']'

        );
    }

    function _actionShadow() private pure returns (string memory) {
        return '<ellipse id="action-shadow" cx="256" cy="477" rx="101" ry="13" fill="#625b52" opacity=".18"/>';
    }

    function _motionStyle(BanmaoKingTraits memory traits_) private view returns (string memory) {
        return string.concat(motionPart0.contentFor(traits_.expression), motionPart1.contentFor(traits_.expression), motionPart0.accessory(traits_.accessory > 0 && traits_.accessory <= 12 ? traits_.accessory - 1 : 0), motionPart0.background(traits_.background < 8 ? traits_.background : 0));
    }

    function _particles(uint8 id) private pure returns (string memory) {
        string[8] memory accents = ['#ffe76a', '#75f7ec', '#eafffa', '#493b9b', '#5ed3ff', '#ff7f50', '#ffffff', '#e9f4ff'];
        if (id >= 17) revert InvalidBackground(id);
        if (id == 0 || id == 3 || id >= 8) return "";
        return string.concat(
            '<g id="smil-king-particles" class="king-particles" aria-hidden="true" fill="', accents[id], '">',
            '<circle cx="66" cy="180" r="3"/><circle cx="442" cy="260" r="4"/><circle cx="82" cy="376" r="2.5"/>',
            '<path d="M415 160v12m-6-6h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="110" cy="100" r="3"/></g>'
        );
    }

    function _background(uint8 id) private view returns (string memory) {
        if (id >= 8) return expansion.render(id);
        if (id == 0) return '<rect width="512" height="512" fill="#D8CDBD"/><defs><radialGradient id="king-cream-gold"><stop stop-color="#F4CF70" stop-opacity=".24"/><stop offset="1" stop-color="#F4CF70" stop-opacity="0"/></radialGradient></defs><g class="king-cream-glow" fill="url(#king-cream-gold)"><ellipse cx="76" cy="154" rx="140" ry="170"/><ellipse cx="440" cy="346" rx="150" ry="180"/></g><g class="king-cream-sparkles" fill="#D5A43B" opacity=".55"><circle cx="66" cy="180" r="3"/><circle cx="442" cy="260" r="3"/><circle cx="82" cy="376" r="2.5"/><circle cx="110" cy="100" r="2"/><path d="M415 150v10m-5-5h10M104 302v8m-4-4h8" fill="none" stroke="#E8BB51" stroke-width="1.5" stroke-linecap="round"/><animate attributeName="opacity" values=".35;.65;.35" dur="7s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0 0;3 -10;0 0" dur="11s" repeatCount="indefinite"/></g>';
        if (id == 1) return '<rect width="512" height="512" fill="#101329"/><g class="king-cyber-city-far" fill="#17203a" stroke="#735dca" stroke-width="1.5" opacity=".72"><g><path d="M0 330V244H34V205H68V258H98V190H132V230H168V164H205V252H239V211H276V268H310V184H346V238H381V202H416V255H450V176H484V222H512V330Z"/><path d="M18 263h10m20-34h10m53-14h10m63-27h10m61 48h10m47-29h10m58 18h10m55-25h10" stroke="#9c73e8"/></g><g transform="translate(512 0)"><path d="M0 330V244H34V205H68V258H98V190H132V230H168V164H205V252H239V211H276V268H310V184H346V238H381V202H416V255H450V176H484V222H512V330Z"/><path d="M18 263h10m20-34h10m53-14h10m63-27h10m61 48h10m47-29h10m58 18h10m55-25h10" stroke="#9c73e8"/></g><animateTransform attributeName="transform" type="translate" values="0 0;-512 0" dur="36s" calcMode="linear" repeatCount="indefinite"/></g><g class="king-cyber-city-near" fill="#1c2844" stroke="#5bf4e8" stroke-width="2"><g><path d="M0 330V278H24V214H58V266H88V178H124V246H154V220H188V155H226V264H258V204H294V250H326V170H364V232H398V196H432V258H462V188H496V236H512V330Z"/><path d="M12 294h9m14-58h12m54-34h11m58 39h11m20-62h12m59 49h11m56-34h12m60 26h11m55-10h10" stroke="#e08bff" stroke-width="3"/></g><g transform="translate(512 0)"><path d="M0 330V278H24V214H58V266H88V178H124V246H154V220H188V155H226V264H258V204H294V250H326V170H364V232H398V196H432V258H462V188H496V236H512V330Z"/><path d="M12 294h9m14-58h12m54-34h11m58 39h11m20-62h12m59 49h11m56-34h12m60 26h11m55-10h10" stroke="#e08bff" stroke-width="3"/></g><animateTransform attributeName="transform" type="translate" values="0 0;-512 0" dur="22s" calcMode="linear" repeatCount="indefinite"/></g><path d="M0 330H512V512H0Z" fill="#161f38"/><path d="M0 370H512M0 426H512M0 500H512M256 330L0 512M256 330L96 512M256 330L416 512M256 330L512 512" fill="none" stroke="#4cdfeb" opacity=".4"/><g fill="none" stroke="#75f7ec" opacity=".7"><path d="M40 115l22-13 22 13v26l-22 13-22-13Z M428 71l18-10 18 10v22l-18 10-18-10Z"/><path d="M62 154v28h-35M446 103v25h36"/></g>';
        if (id == 2) return '<rect width="512" height="512" fill="#75d7c3"><animate attributeName="fill" values="#75d7c3;#83cfd7;#91d6c5;#75d7c3" dur="30s" repeatCount="indefinite"/></rect><g class="king-mint-waves" fill="#eafffa" opacity=".12"><path d="M0 140Q128 100 256 140T512 140V260Q384 220 256 260T0 260Z"><animate attributeName="d" values="M0 140Q128 100 256 140T512 140V260Q384 220 256 260T0 260Z;M0 140Q128 180 256 140T512 140V260Q384 300 256 260T0 260Z;M0 140Q128 100 256 140T512 140V260Q384 220 256 260T0 260Z" dur="16s" repeatCount="indefinite"/></path><path fill="#c4b9ec" d="M0 340Q128 380 256 340T512 340V512H0Z"><animate attributeName="d" values="M0 340Q128 380 256 340T512 340V512H0Z;M0 340Q128 300 256 340T512 340V512H0Z;M0 340Q128 380 256 340T512 340V512H0Z" dur="21s" repeatCount="indefinite"/></path></g><g id="smil-king-bg-drift" class="king-mint-bubbles king-bg-drift" fill-opacity=".23" stroke-opacity=".55" stroke-width="2"><g fill="#ffe1ee" stroke="#ffe1ee"><circle cx="64" cy="64" r="14"/><circle cx="423" cy="392" r="25"/><animateTransform attributeName="transform" type="translate" values="0 0;6 -12;0 0" dur="11s" repeatCount="indefinite"/></g><g fill="#e3ddff" stroke="#e3ddff"><circle cx="448" cy="135" r="24"/><circle cx="124" cy="177" r="8"/><animateTransform attributeName="transform" type="translate" values="0 0;-8 -10;0 0" dur="13s" repeatCount="indefinite"/></g><g fill="#fff0bc" stroke="#fff0bc"><circle cx="86" cy="324" r="17"/><circle cx="376" cy="65" r="10"/><animateTransform attributeName="transform" type="translate" values="0 0;7 -14;0 0" dur="15s" repeatCount="indefinite"/></g></g>';
        if (id == 3) return '<rect width="512" height="512" fill="#7766cc"/><path d="M0 512L512 0v512z" fill="#493b9b"/><g class="king-royal-filigree" fill="none" stroke="#e6cf91" stroke-width="1.5" opacity=".45"><path d="M28 122V44Q28 28 44 28H122M40 106V52Q40 40 52 40H106M390 484H468Q484 484 484 468V390M406 472H460Q472 472 472 460V406"/><path d="M34 136q32-8 30-36q-18 6-16 20M376 478q8-32 36-30q-6 18-20 16"/></g><path d="M0 512L512 0" stroke="#e6cf91" stroke-width="2" opacity=".45"/><path class="king-royal-seam" d="M0 512L512 0" fill="none" stroke="#fff1c2" stroke-width="3" pathLength="100" stroke-dasharray="8 92" opacity=".55"><animate attributeName="stroke-dashoffset" values="100;0" dur="14s" repeatCount="indefinite"/></path><g class="king-royal-gems" stroke="#efdcab" stroke-width="1.5" stroke-linejoin="round"><g id="smil-king-bg-jewel" class="king-jewel"><g data-royal-drift="0"><animateTransform attributeName="transform" type="translate" values="0 0;8 -14;-4 -6;0 0" keyTimes="0;.33;.67;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1" dur="8s" begin="-0s" repeatCount="indefinite"/><path d="M76 72L89 88 76 109 63 88Z" fill="#ad98e7"/><path d="M76 72V109L63 88Z" fill="#dfd0fa"/><path d="M63 88H89" fill="none"/><path data-royal-glint="0" d="M76 75L79 86 76 83 73 86Z" fill="#fff1c2" stroke="none"><animate attributeName="opacity" values=".45;1;.45" dur="3s" repeatCount="indefinite"/></path></g><g data-royal-drift="1"><animateTransform attributeName="transform" type="translate" values="0 0;-10 12;4 5;0 0" keyTimes="0;.33;.67;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1" dur="10s" begin="-1s" repeatCount="indefinite"/><path d="M432 386L447 405 432 430 417 405Z" fill="#ad98e7"/><path d="M432 386V430L417 405Z" fill="#dfd0fa"/><path d="M417 405H447" fill="none"/><path data-royal-glint="1" d="M432 389L436 402 432 398 428 402Z" fill="#fff1c2" stroke="none"><animate attributeName="opacity" values=".45;1;.45" dur="4s" repeatCount="indefinite"/></path></g><g data-royal-drift="2"><animateTransform attributeName="transform" type="translate" values="0 0;-12 10;5 16;0 0" keyTimes="0;.33;.67;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1" dur="12s" begin="-2s" repeatCount="indefinite"/><path d="M431 58L438 68 431 80 424 68Z" fill="#ad98e7"/><path data-royal-glint="2" d="M431 60L433 67 429 67Z" fill="#fff1c2" stroke="none"><animate attributeName="opacity" values=".45;1;.45" dur="5s" repeatCount="indefinite"/></path></g><g data-royal-drift="3"><animateTransform attributeName="transform" type="translate" values="0 0;12 -16;-5 -8;0 0" keyTimes="0;.33;.67;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1" dur="14s" begin="-3s" repeatCount="indefinite"/><path d="M80 354L88 365 80 378 72 365Z" fill="#ad98e7"/><path data-royal-glint="3" d="M80 357L83 364 77 364Z" fill="#fff1c2" stroke="none"><animate attributeName="opacity" values=".45;1;.45" dur="6s" repeatCount="indefinite"/></path></g></g></g>';
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
