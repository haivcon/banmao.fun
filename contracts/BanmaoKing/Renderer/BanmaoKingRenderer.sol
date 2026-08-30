// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

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

    IBanmaoKingBodyLib public immutable bodyLib;
    IBanmaoKingExpressionLib public immutable expressionLib;
    IBanmaoKingAccessoryLib public immutable accessoryLib;

    constructor(address bodyLib_, address expressionLib_, address accessoryLib_) {
        if (!bodyLib_.supportsInterface(type(IBanmaoKingBodyLib).interfaceId)) revert InvalidLayer(bodyLib_);
        if (!expressionLib_.supportsInterface(type(IBanmaoKingExpressionLib).interfaceId)) revert InvalidLayer(expressionLib_);
        if (!accessoryLib_.supportsInterface(type(IBanmaoKingAccessoryLib).interfaceId)) revert InvalidLayer(accessoryLib_);
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
                '"attributes":', renderAttributes(traits_), "}"
            )))
        );
    }

    function renderSVG(uint256 tokenId, BanmaoKingTraits calldata traits_) public view returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Banmao King #',
            tokenId.toString(), '"><defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-opacity=".2"/></filter></defs>',
            _background(traits_.background), '<g filter="url(#s)">', bodyLib.render(traits_.body),
            '<g transform="rotate(5 256 235)">', expressionLib.render(traits_.expression),
            accessoryLib.render(traits_.accessory), '</g>',
            '</g><text x="486" y="490" text-anchor="end" fill="white" opacity=".55" font-family="sans-serif" font-size="13">BANMAO KING</text></svg>'
        );
    }

    function renderAttributes(BanmaoKingTraits calldata traits_) public view returns (string memory) {
        return string.concat(
            '[{"trait_type":"Body","value":"', bodyLib.traitName(traits_.body),
            '"},{"trait_type":"Expression","value":"', expressionLib.traitName(traits_.expression),
            '"},{"trait_type":"Accessory","value":"', accessoryLib.traitName(traits_.accessory),
            '"},{"trait_type":"Background","value":"', _backgroundName(traits_.background), '"}]'
        );
    }

    function _background(uint8 id) private pure returns (string memory) {
        if (id == 0) return '<rect width="512" height="512" fill="#f4efe7"/><circle cx="92" cy="91" r="90" fill="#ffe76a" opacity=".32"/>';
        if (id == 1) return '<rect width="512" height="512" fill="#ff9f9f"/><path d="M0 80h512M0 160h512M0 240h512M0 320h512M0 400h512" stroke="#fff" opacity=".16" stroke-width="20"/>';
        if (id == 2) return '<rect width="512" height="512" fill="#75d7c3"/><circle cx="64" cy="64" r="14" fill="#fff" opacity=".3"/><circle cx="448" cy="135" r="24" fill="#fff" opacity=".25"/>';
        if (id == 3) return '<rect width="512" height="512" fill="#7766cc"/><path d="M0 512L512 0v512z" fill="#493b9b"/><circle cx="75" cy="84" r="8" fill="#fff2a8"/><circle cx="430" cy="72" r="5" fill="#fff2a8"/>';
        if (id == 4) return '<rect width="512" height="512" fill="#17233d"/><path d="M256 0v512M0 256h512" stroke="#5ed3ff" opacity=".16"/><circle cx="84" cy="80" r="3" fill="white"/><circle cx="425" cy="122" r="4" fill="white"/>';
        if (id == 5) return '<rect width="512" height="512" fill="#ffcf61"/><path d="M0 0l512 512M512 0L0 512" stroke="#ff7f50" opacity=".18" stroke-width="60"/>';
        if (id == 6) return '<rect width="512" height="512" fill="#ffb8dc"/><circle cx="256" cy="256" r="220" fill="none" stroke="#fff" opacity=".2" stroke-width="35"/>';
        if (id == 7) return '<rect width="512" height="512" fill="#b9d8ff"/><path d="M0 390q128-90 256 0t256 0v122H0z" fill="#e9f4ff"/>';
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
