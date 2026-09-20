// SPDX-License-Identifier: MIT
// Author: haivcon
// Telegram: t.me/haivcon | X: x.com/haivcon | GitHub: github.com/haivcon
// All for the advancement of Web3.
pragma solidity ^0.8.30;
import {BanmaoKingAccessoryLib} from "../Lib/Accessory/BanmaoKingAccessorySources.sol";
import {BanmaoKingBackgroundLib} from "../Lib/Background/BanmaoKingBackgroundSources.sol";
import {BanmaoKingBodyArtwork6, BanmaoKingBodyArtwork8} from "../Lib/Body/BanmaoKingBodySources.sol";
import {BanmaoKingExpressionPart9} from "../Lib/Expression/BanmaoKingExpressionSources.sol";
import {BanmaoKingIdentityPart1, BanmaoKingIdentityPart2, BanmaoKingIdentityPart3} from "../Lib/Identity/BanmaoKingIdentitySources.sol";
import {BanmaoKingMotionPart1, BanmaoKingMotionPart2, BanmaoKingMotionPart24} from "../Lib/Motion/BanmaoKingMotionSources.sol";









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

/// @notice Fully on-chain compositor with immutable artwork and motion dependencies.
/// @author haivcon
/// @custom:telegram https://t.me/haivcon
/// @custom:x https://x.com/haivcon
/// @custom:github https://github.com/haivcon
/// @custom:mission Dedicated to advancing Web3.
contract BanmaoKingRenderer is IBanmaoKingRenderer {
    using Strings for uint256;
    using ERC165Checker for address;

    BanmaoKingIdentityPart1 public immutable bitcoinMedallion;
    BanmaoKingExpressionPart9 public immutable cyborgEyes;
    BanmaoKingMotionPart24 public immutable secondaryMotion;
    BanmaoKingBackgroundLib public immutable background;
    BanmaoKingIdentityPart3 public immutable identityPart;
    error InvalidLayer(address layer);
    error InvalidBackground(uint8 traitId);

    // Independently deployed and injected once; no setters or externally supplied CSS.
    BanmaoKingMotionPart1 public immutable motionPart0;
    BanmaoKingMotionPart2 public immutable motionPart1;
    IBanmaoKingBodyLib public immutable bodyLib;
    IBanmaoKingExpressionLib public immutable expressionLib;
    BanmaoKingIdentityPart2 public immutable diamondRays;
    BanmaoKingAccessoryLib public immutable accessoryLib;

    constructor(address bodyLib_,address expressionLib_,address accessoryLib_,address background_,address motionPart0_,address motionPart1_,address secondaryMotion_,address diamondRays_,address bitcoin_,address eyes_,address identity_) {
 if(!bodyLib_.supportsInterface(type(IBanmaoKingBodyLib).interfaceId))revert InvalidLayer(bodyLib_);if(!expressionLib_.supportsInterface(type(IBanmaoKingExpressionLib).interfaceId))revert InvalidLayer(expressionLib_);if(!accessoryLib_.supportsInterface(type(IBanmaoKingAccessoryLib).interfaceId))revert InvalidLayer(accessoryLib_);
 address[8] memory dependencies=[background_,motionPart0_,motionPart1_,secondaryMotion_,diamondRays_,bitcoin_,eyes_,identity_];for(uint i;i<8;i++)if(dependencies[i].code.length==0)revert InvalidLayer(dependencies[i]);
 bodyLib=IBanmaoKingBodyLib(bodyLib_);expressionLib=IBanmaoKingExpressionLib(expressionLib_);accessoryLib=BanmaoKingAccessoryLib(accessoryLib_);background=BanmaoKingBackgroundLib(background_);motionPart0=BanmaoKingMotionPart1(motionPart0_);motionPart1=BanmaoKingMotionPart2(motionPart1_);secondaryMotion=BanmaoKingMotionPart24(secondaryMotion_);diamondRays=BanmaoKingIdentityPart2(diamondRays_);bitcoinMedallion=BanmaoKingIdentityPart1(bitcoin_);cyborgEyes=BanmaoKingExpressionPart9(eyes_);identityPart=BanmaoKingIdentityPart3(identity_);
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
        string memory scene = mini ? '' : string.concat(_background(traits_.background), background.atmosphere(traits_.background,traits_.body), '<g class="king-ground-motion">', _actionShadow(), '</g>', shadow);
        string memory artwork = string.concat(_svgOpen(tokenId, traits_), _motionStyle(traits_), motionPart1.choreography(traits_.expression), scene);
        artwork = string.concat(artwork, secondaryMotion.render(traits_.expression), traits_.accessory == 8 ? accessoryLib.renderRear(8) : '', group, character, '</g>');
        artwork = string.concat(artwork, traits_.accessory == 8 ? accessoryLib.composed(8, tokenId) : '');
        return string.concat(artwork, traits_.accessory == 17 ? accessoryLib.composed(17, tokenId) : '', accessoryLib.world(traits_.accessory,traits_.expression), !mini && traits_.background == 16 ? background.throneLight() : '', mini ? '' : identityPart.render(tokenId, traits_), traits_.accessory == 22 ? _minis(tokenId) : '', '</svg>');
    }

    function _character(uint256 tokenId, BanmaoKingTraits memory traits_) private view returns (string memory) {
        return string.concat(
            '<g id="king-action-root" transform="translate(0 0)" data-action="', motionPart1.actionName(traits_.expression), '">',
            '<g transform="translate(256 490)"><g id="king-volume-motion"><g transform="translate(-256 -490)"><g id="king-full-turn"><g id="smil-king-character-motion" class="king-character-motion" data-accessory="', uint256(traits_.accessory <= 23 ? traits_.accessory - 1 : traits_.accessory).toString(), '">', traits_.accessory == 8 ? '' : accessoryLib.renderRear(traits_.accessory),
            BanmaoKingBodyArtwork8.synchronize(bodyLib.render(traits_.body, tokenId), traits_.expression), (traits_.expression == 13 ? string.concat(diamondRays.render(uint8((tokenId % 36 * 7 + 3) % 6)), diamondRays.render(uint8(6 + (tokenId / 6 % 6 * 5 + 1) % 6))) : ""), traits_.body == 4 ? cyborgEyes.render(expressionLib.render(traits_.expression), traits_.expression, tokenId) : expressionLib.render(traits_.expression),
            traits_.accessory == 14 ? bitcoinMedallion.render(traits_.expression) : traits_.accessory == 8 || traits_.accessory == 22 || traits_.accessory == 17 ? '' : accessoryLib.composed(traits_.accessory, tokenId), '</g></g></g></g></g></g>'
        );
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
            traits_.body == 4 ? string.concat(',{"trait_type":"Cyborg Form","value":"', BanmaoKingBodyArtwork6.name(tokenId), '"}') : '', ']'

        );
    }

    function _actionShadow() private pure returns (string memory) {
        return '<ellipse id="action-shadow" cx="256" cy="477" rx="101" ry="13" fill="#625b52" opacity=".18"/>';
    }

    function _motionStyle(BanmaoKingTraits memory traits_) private view returns (string memory) {
        return string.concat(motionPart0.contentFor(traits_.expression), motionPart0.accessory(traits_.accessory > 0 && traits_.accessory <= 12 ? traits_.accessory - 1 : 0), motionPart0.background(traits_.background < 8 ? traits_.background : 0));
    }



    function _background(uint8 id) private view returns (string memory) {
        return background.render(id);
    }

    function _backgroundName(uint8 id) private view returns (string memory) {
        return background.traitName(id);
    }
}
