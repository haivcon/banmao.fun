// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @notice Bounded live data required to render one BanmaoBox NFT.
/// @dev renderAssets contains assetCount packed 69-byte records:
///      address(20) | amount base units(32) | decimals(1) | symbol(16).
struct BanmaoBoxRenderData {
    address token;
    uint256 amount;
    uint128 timestamps;
    uint8 tokenDecimals;
    uint8 assetCount;
    bytes16 tokenSymbol;
    bytes renderAssets;
}

/// @notice Minimal interface for replaceable BanmaoBox SVG renderers.
/// @dev Implementations cannot control collection metadata or attributes.
interface IBanmaoBoxSVGRenderer is IERC165 {
    function renderSVG(uint256 tokenId, BanmaoBoxRenderData calldata data) external view returns (string memory);
}

/// @notice Full renderer interface retained for the immutable metadata renderer.
interface IBanmaoBoxRenderer is IBanmaoBoxSVGRenderer {
    function tokenURI(uint256 tokenId, BanmaoBoxRenderData calldata data) external view returns (string memory);
    function renderAttributes(BanmaoBoxRenderData calldata data) external view returns (string memory);
}

/// @title BanmaoBoxRenderer
/// @notice Static, fully on-chain "Sealed Treasury" SVG and metadata renderer.
contract BanmaoBoxRenderer is IBanmaoBoxRenderer {
    using Strings for uint256;
    using Strings for address;

    uint256 private constant MAX_SUPPORTED_DECIMALS = 69;
    uint256 private constant MAX_ASSETS = 5;

    error UnsupportedTokenDecimals(uint8 decimals);
    error InvalidRenderAssetCount();

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IBanmaoBoxSVGRenderer).interfaceId ||
            interfaceId == type(IBanmaoBoxRenderer).interfaceId;
    }

    function tokenURI(uint256 tokenId, BanmaoBoxRenderData calldata data) external view override returns (string memory) {
        _validate(data);
        string memory image = Base64.encode(bytes(_renderSVG(tokenId, data)));
        bytes memory head = abi.encodePacked(
            '{"name":"BanmaoBox #', tokenId.toString(),
            '","description":"A transferable time-sealed treasury backed by up to five ERC-20 assets on X Layer. Ledger amounts are exact base units.",'
        );
        bytes memory tail = abi.encodePacked(
            '"image":"data:image/svg+xml;base64,', image,
            '","animation_url":"data:image/svg+xml;base64,', image,
            '","external_url":"https://banmao.fun/defi/box",',
            '"background_color":"08090D","attributes":', _renderAttributes(data),
            ',"properties":{"type":"banmaobox","metadataMode":"fully-onchain",',
            '"renderer":"solidity-svg-split-contract","chain":"X Layer","chainId":196}}'
        );
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(abi.encodePacked(head, tail))
            )
        );
    }

    function renderSVG(uint256 tokenId, BanmaoBoxRenderData calldata data) external view override returns (string memory) {
        _validate(data);
        return _renderSVG(tokenId, data);
    }

    function renderAttributes(BanmaoBoxRenderData calldata data) external view override returns (string memory) {
        _validate(data);
        return _renderAttributes(data);
    }

    function _validate(BanmaoBoxRenderData calldata data) internal pure {
        if (data.tokenDecimals > MAX_SUPPORTED_DECIMALS) revert UnsupportedTokenDecimals(data.tokenDecimals);
        if (
            data.assetCount > MAX_ASSETS ||
            data.renderAssets.length != uint256(data.assetCount) * 69
        ) revert InvalidRenderAssetCount();
    }

    function _renderSVG(uint256 tokenId, BanmaoBoxRenderData calldata data) internal view returns (string memory) {
        bool ready = block.timestamp >= uint256(_unlockTime(data));
        string memory gold = _tierGold(_tier(data.amount, data.tokenDecimals));
        bytes memory hero = abi.encodePacked(
            _header(tokenId, ready, gold),
            _treasury(ready, gold, data)
        );
        bytes memory details = abi.encodePacked(
            _assetSummary(data, gold),
            _timeline(data, ready, gold)
        );
        return string(
            abi.encodePacked(
                _svgHead(data.assetCount, ready, gold),
                hero,
                details,
                _ledger(data),
                "</svg>"
            )
        );
    }

    function _svgHead(
        uint8 assetCount,
        bool ready,
        string memory gold
    ) internal pure returns (string memory) {
        bytes memory accessible = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" role="img" aria-labelledby="title description">',
            '<title id="title">BanmaoBox sealed treasury</title><desc id="description">',
            ready ? "Ready" : "Locked", " time-sealed treasury containing ",
            uint256(assetCount).toString(), " assets.</desc>"
        );
        return string(abi.encodePacked(accessible, _defs(), _background(gold)));
    }

    function _defs() internal pure returns (string memory) {
        return '<defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#15130E"/><stop offset=".55" stop-color="#090A0D"/><stop offset="1" stop-color="#050609"/></linearGradient><linearGradient id="metal" x2="0" y2="1"><stop stop-color="#29251A"/><stop offset=".48" stop-color="#121216"/><stop offset="1" stop-color="#08090C"/></linearGradient><linearGradient id="shine" x1="0" x2="1"><stop stop-color="#F4EEDC"/><stop offset=".45" stop-color="#F4EEDC"/><stop offset=".5" stop-color="#F2D98D"/><stop offset=".55" stop-color="#F4EEDC"/><stop offset="1" stop-color="#F4EEDC"/><animateTransform attributeName="gradientTransform" type="translate" values="-1 0;1 0;-1 0" keyTimes="0;.45;1" dur="8s" repeatCount="indefinite"/></linearGradient></defs><style>.brand{font-family:Arial,sans-serif;font-weight:900;letter-spacing:4px}.label{font-family:Arial,sans-serif;font-weight:700;letter-spacing:2px}.mono{font-family:monospace}.gold{fill:#D8B565}.muted{fill:#817967}.white{fill:#F4EEDC}</style>';
    }

    function _background(string memory gold) internal pure returns (string memory) {
        return string(abi.encodePacked('<rect width="800" height="800" fill="url(#bg)"/><rect x="18" y="18" width="764" height="764" rx="34" fill="none" stroke="', gold, '" stroke-opacity=".38"/><path d="M42 112H758M42 552H758" stroke="#D8B565" stroke-opacity=".22"/>'));
    }

    function _header(uint256 tokenId, bool ready, string memory gold) internal pure returns (string memory) {
        bytes memory out = abi.encodePacked(
            '<text class="brand" x="50" y="68" font-size="32" fill="url(#shine)">BANMAOBOX</text>',
            '<text class="mono muted" x="50" y="92" font-size="7">SEALED TREASURY / #', tokenId.toString(), '</text>'
        );
        out = abi.encodePacked(
            out,
            '<g transform="translate(610 42)"><path d="M0 0H140L154 14V50H14L0 36Z" fill="#111116" stroke="', gold,
            '"/><circle cx="24" cy="25" r="7" fill="none" stroke="', gold, '" stroke-width="3"/>'
        );
        out = abi.encodePacked(
            out,
            '<path d="M21 25h6v10h-6Z" fill="', gold,
            '"/><text class="label" x="88" y="31" text-anchor="middle" fill="', gold,
            '" font-size="14">', ready ? "READY" : "LOCKED", '</text></g>'
        );
        return string(out);
    }

    function _treasury(bool ready, string memory gold, BanmaoBoxRenderData calldata data) internal pure returns (string memory) {
        bytes memory pills;
        bytes memory notches;
        for (uint256 i; i < MAX_ASSETS; ++i) {
            notches = abi.encodePacked(notches, '<rect x="', (244 + i * 30).toString(), '" y="496" width="18" height="7" rx="2" fill="', gold, '" fill-opacity="', i < data.assetCount ? "1" : ".14", '"/>');
            if (i < data.assetCount) pills = abi.encodePacked(pills, _assetPill(data.renderAssets, i, gold));
        }
        return string(abi.encodePacked(_vaultShell(gold), _vaultLock(ready, gold), pills, notches, '</g>'));
    }

    function _vaultShell(string memory gold) internal pure returns (string memory) {
        bytes memory shell = abi.encodePacked(
            '<g><path d="M90 205L190 138H414L514 205V461L476 512H128L90 461Z" fill="url(#metal)" stroke="', gold, '" stroke-width="3"/>',
            '<path d="M118 217L204 163H400L486 217M118 443L148 479H456L486 443" fill="none" stroke="', gold, '" stroke-opacity=".45"/>'
        );
        bytes memory rings = abi.encodePacked(
            '<path d="M230 151V490M106 327H498" stroke="', gold, '" stroke-opacity=".18"/>',
            '<circle cx="230" cy="327" r="63" fill="#090A0D" stroke="', gold, '" stroke-opacity=".35"><animate attributeName="r" values="63;66;63" dur="5s" repeatCount="indefinite"/></circle>'
        );
        return string(abi.encodePacked(shell, rings, '<circle cx="230" cy="327" r="49" fill="none" stroke="', gold, '" stroke-width="2"/><circle cx="230" cy="327" r="37" fill="none" stroke="', gold, '" stroke-dasharray="4 7"/>'));
    }

    function _vaultLock(bool ready, string memory gold) internal pure returns (string memory) {
        bytes memory shackle = abi.encodePacked(
            '<g><path d="M216 325v-15a14 14 0 0 1 ', ready ? "26-9" : "28 0", 'v15" fill="none" stroke="', gold, '" stroke-width="6" stroke-linecap="round"/>',
            ready ? '<animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="3s" repeatCount="indefinite"/>' : "", '</g>'
        );
        bytes memory body = abi.encodePacked('<path d="M209 323H251V359H209Z" fill="#15130E" stroke="', gold, '" stroke-width="2"/>');
        return string(abi.encodePacked(shackle, body, '<circle cx="230" cy="337" r="4" fill="', gold, '"><animate attributeName="opacity" values="1;.55;1" dur="2.8s" repeatCount="indefinite"/></circle><path d="M228 341H232V351H228Z" fill="', gold, '"/>'));
    }

    function _assetPill(bytes calldata packed, uint256 index, string memory gold) internal pure returns (string memory) {
        (,,, bytes16 symbol) = _renderAssetAt(packed, index);
        uint256 y = 232 + index * 40;
        string memory baseline = (y + 19).toString();
        bytes memory pill = abi.encodePacked('<g><rect x="322" y="', y.toString(), '" width="154" height="30" rx="15" fill="#090A0D" stroke="', gold, '" stroke-opacity=".4"/>');
        pill = abi.encodePacked(pill, '<circle cx="338" cy="', (y + 15).toString(), '" r="4" fill="', gold, '"/><text class="label white" x="350" y="', baseline, '" font-size="10">');
        return string(abi.encodePacked(pill, _symbol(symbol), '</text></g>'));
    }

    function _assetSummary(BanmaoBoxRenderData calldata data, string memory gold) internal pure returns (string memory) {
        bytes memory rows;
        for (uint256 i; i < data.assetCount; ++i) {
            rows = abi.encodePacked(rows, _summaryRow(data.renderAssets, i, gold));
        }
        return string(abi.encodePacked(
            '<g transform="translate(548 168)"><text class="label muted" font-size="12">ASSET SUMMARY / ', uint256(data.assetCount).toString(), '</text>', rows,
            data.amount == 0 && data.assetCount != 0 ? '<text class="label gold" y="174" font-size="9">PRIMARY ASSET RELEASED</text>' : "", '</g>'
        ));
    }

    function _summaryRow(bytes calldata packed, uint256 index, string memory gold) internal pure returns (string memory) {
        (, uint256 amount, uint8 decimals, bytes16 symbol) = _renderAssetAt(packed, index);
        string memory y = (31 + index * 29).toString();
        bytes memory symbolText = abi.encodePacked(
            '<g><text class="label white" y="', y, '" font-size="10">', _symbol(symbol), _pulse(index), '</text>'
        );
        bytes memory amountText = abi.encodePacked(symbolText, '<text class="mono" x="202" y="', y, '" text-anchor="end" fill="', gold, '" font-size="10">');
        return string(abi.encodePacked(amountText, _formatDisplayAmount(amount, decimals), _pulse(index), '</text></g>'));
    }

    function _pulse(uint256 index) internal pure returns (string memory) {
        return string(abi.encodePacked('<animate attributeName="opacity" values="1;.72;1" dur="5s" begin="', (index * 400).toString(), 'ms" repeatCount="indefinite"/>'));
    }

    function _timeline(BanmaoBoxRenderData calldata data, bool ready, string memory gold) internal pure returns (string memory) {
        bytes memory out = abi.encodePacked(
            '<g transform="translate(548 350)"><text class="label muted" font-size="10">',
            ready ? "UNLOCKED AT" : "UNLOCKS",
            '</text><text class="mono white" y="27" font-size="14">',
            _formatDateTime(_unlockTime(data)), '</text>'
        );
        out = abi.encodePacked(
            out,
            '<text class="label muted" y="64" font-size="10">CREATED</text>',
            '<text class="mono white" y="91" font-size="14">',
            _formatDateTime(_createdAt(data)), '</text>'
        );
        out = abi.encodePacked(
            out,
            '<path d="M0 116H202" stroke="', gold,
            '" stroke-opacity=".35"/><text class="label muted" y="143" font-size="10">TIME SEAL</text>',
            '<text class="mono" y="169" fill="', gold, '" font-size="13">',
            _duration(data), '</text></g>'
        );
        return string(out);
    }

    function _ledger(BanmaoBoxRenderData calldata data) internal pure returns (string memory) {
        bytes memory rows;
        for (uint256 i; i < data.assetCount; ++i) {
            rows = abi.encodePacked(rows, _ledgerRow(data.renderAssets, i));
        }
        return string(abi.encodePacked(
            '<text class="label gold" x="58" y="571" font-size="11">ASSET LEDGER</text>',
            '<text class="label muted" x="742" y="571" text-anchor="end" font-size="9">FULL CONTRACT / HUMAN AMOUNT / DECIMALS</text>',
            rows
        ));
    }

    function _ledgerRow(bytes calldata packed, uint256 index) internal pure returns (string memory) {
        (address token, uint256 amount, uint8 decimals, bytes16 symbol) = _renderAssetAt(packed, index);
        uint256 y = 594 + index * 38;
        bytes memory row = abi.encodePacked(
            '<g><text class="mono muted" x="58" y="', y.toString(), '" font-size="11">',
            token.toHexString(), _pulse(index), '</text>'
        );
        row = abi.encodePacked(
            row,
            '<text class="mono white" x="742" y="', (y + 17).toString(),
            '" text-anchor="end" font-size="10">', _formatExactAmount(amount, decimals),
            ' ', _symbol(symbol), ' / ', uint256(decimals).toString(), ' decimals', _pulse(index), '</text>'
        );
        return string(abi.encodePacked(
            row,
            '<path d="M58 ', (y + 25).toString(),
            'H742" stroke="#D8B565" stroke-opacity=".12"/></g>'
        ));
    }

    function _renderAssetAt(
        bytes calldata packed,
        uint256 index
    ) internal pure returns (address token, uint256 amount, uint8 decimals, bytes16 symbol) {
        assembly ("memory-safe") {
            let offset := add(packed.offset, mul(index, 69))
            token := shr(96, calldataload(offset))
            amount := calldataload(add(offset, 20))
            decimals := byte(0, calldataload(add(offset, 52)))
            symbol := calldataload(add(offset, 53))
        }
    }

    function _renderAttributes(BanmaoBoxRenderData calldata data) internal view returns (string memory) {
        return string(abi.encodePacked(
            '[{"trait_type":"Status","value":"',
            block.timestamp >= uint256(_unlockTime(data)) ? "Ready to open" : "Locked",
            '"},{"trait_type":"Token Symbol","value":"', _symbol(data.tokenSymbol),
            '"},{"display_type":"number","trait_type":"Asset Count","value":',
            uint256(data.assetCount).toString(),
            '},{"trait_type":"Token Contract","value":"', data.token.toHexString(), '"',
            '},{"display_type":"date","trait_type":"Unlock Time","value":',
            uint256(_unlockTime(data)).toString(),
            '},{"trait_type":"Metadata Mode","value":"Fully On-Chain"}]'
        ));
    }

    function _tier(uint256 amount, uint8 decimals) internal pure returns (uint256) {
        uint256 unit = 10 ** uint256(decimals);
        if (amount >= 100_000_000 * unit) return 3;
        if (amount >= 10_000_000 * unit) return 2;
        if (amount >= 1_000_000 * unit) return 1;
        return 0;
    }

    function _tierName(uint256 tier) internal pure returns (string memory) {
        if (tier == 3) return "LEGENDARY";
        if (tier == 2) return "GOLD";
        if (tier == 1) return "DELUXE";
        return "CLASSIC";
    }

    function _tierGold(uint256 tier) internal pure returns (string memory) {
        if (tier == 3) return "#F2D98D";
        if (tier == 2) return "#E6C66E";
        if (tier == 1) return "#D8B565";
        return "#B8954F";
    }

    function _symbol(bytes16 value) internal pure returns (string memory) {
        uint256 length;
        while (length < 16 && value[length] != 0) ++length;
        if (length == 0) return "TOKEN";
        bytes memory out = new bytes(length);
        for (uint256 i; i < length; ++i) out[i] = value[i];
        return string(out);
    }

    function _formatExactAmount(uint256 amount, uint8 decimals) internal pure returns (string memory) {
        if (decimals == 0) return amount.toString();
        uint256 unit = 10 ** uint256(decimals);
        uint256 whole = amount / unit;
        uint256 remainder = amount % unit;
        if (remainder == 0) return whole.toString();

        bytes memory fraction = bytes(_leftPad(remainder.toString(), decimals));
        uint256 length = fraction.length;
        while (length != 0 && fraction[length - 1] == "0") --length;
        bytes memory trimmed = new bytes(length);
        for (uint256 i; i < length; ++i) trimmed[i] = fraction[i];
        return string(abi.encodePacked(whole.toString(), ".", trimmed));
    }

    function _leftPad(string memory value, uint256 length) internal pure returns (string memory) {
        bytes memory source = bytes(value);
        if (source.length >= length) return value;
        bytes memory out = new bytes(length);
        uint256 offset = length - source.length;
        for (uint256 i; i < offset; ++i) out[i] = "0";
        for (uint256 i; i < source.length; ++i) out[offset + i] = source[i];
        return string(out);
    }

    function _formatDisplayAmount(uint256 amount, uint8 decimals) internal pure returns (string memory) {
        uint256 unit = 10 ** uint256(decimals);
        uint256 whole = amount / unit;
        if (whole >= 1e18) return string(abi.encodePacked(_leading(whole), "e", (_digits(whole) - 1).toString()));
        if (decimals == 0) return _withCommas(whole);
        uint256 remainder = amount % unit;
        if (remainder == 0) return _withCommas(whole);
        if (decimals == 1) {
            return string(
                abi.encodePacked(
                    _withCommas(whole),
                    ".",
                    remainder.toString()
                )
            );
        }
        uint256 fraction = remainder / (10 ** uint256(decimals - 2));
        if (fraction == 0) {
            return whole == 0
                ? string(abi.encodePacked("<0.01"))
                : string(abi.encodePacked(_withCommas(whole), " + <0.01"));
        }
        return string(abi.encodePacked(_withCommas(whole), ".", fraction < 10 ? "0" : "", fraction.toString()));
    }

    function _leading(uint256 value) internal pure returns (string memory) {
        uint256 digits = _digits(value);
        while (digits > 5) { value /= 10; --digits; }
        string memory s = value.toString();
        return string(abi.encodePacked(bytes(s)[0], ".", _slice(s, 1)));
    }

    function _slice(string memory value, uint256 start) internal pure returns (string memory) {
        bytes memory source = bytes(value);
        bytes memory out = new bytes(source.length - start);
        for (uint256 i; i < out.length; ++i) out[i] = source[i + start];
        return string(out);
    }

    function _digits(uint256 value) internal pure returns (uint256 count) {
        do { ++count; value /= 10; } while (value != 0);
    }

    function _withCommas(uint256 value) internal pure returns (string memory) {
        bytes memory source = bytes(value.toString());
        if (source.length <= 3) return string(source);
        bytes memory out = new bytes(source.length + (source.length - 1) / 3);
        uint256 a = source.length; uint256 b = out.length; uint256 digits;
        while (a > 0) {
            out[--b] = source[--a]; ++digits;
            if (digits == 3 && a > 0) { out[--b] = ","; digits = 0; }
        }
        return string(out);
    }

    function _duration(BanmaoBoxRenderData calldata data) internal pure returns (string memory) {
        uint256 secondsLocked = uint256(_unlockTime(data)) - uint256(_createdAt(data));
        uint256 daysLocked = secondsLocked / 1 days;
        if (daysLocked != 0) return string(abi.encodePacked(daysLocked.toString(), " DAYS"));
        return string(abi.encodePacked((secondsLocked / 1 minutes).toString(), " MINUTES"));
    }

    function _createdAt(BanmaoBoxRenderData calldata data) internal pure returns (uint64) { return uint64(data.timestamps >> 64); }
    function _unlockTime(BanmaoBoxRenderData calldata data) internal pure returns (uint64) { return uint64(data.timestamps); }

    function _formatDateTime(uint64 timestamp) internal pure returns (string memory) {
        (uint256 year, uint256 month, uint256 day) = _dateFromDays(uint256(timestamp) / 1 days);
        uint256 secondsInDay = uint256(timestamp) % 1 days;
        return string(abi.encodePacked(year.toString(), "-", _pad2(month), "-", _pad2(day), " ", _pad2(secondsInDay / 1 hours), ":", _pad2((secondsInDay % 1 hours) / 1 minutes), " UTC"));
    }

    function _pad2(uint256 value) internal pure returns (string memory) { return value < 10 ? string(abi.encodePacked("0", value.toString())) : value.toString(); }

    function _dateFromDays(uint256 daysSinceEpoch) internal pure returns (uint256 year, uint256 month, uint256 day) {
        int256 l = int256(daysSinceEpoch) + 68_569 + 2_440_588;
        int256 n = (4 * l) / 146_097; l = l - (146_097 * n + 3) / 4;
        int256 y = (4_000 * (l + 1)) / 1_461_001; l = l - (1_461 * y) / 4 + 31;
        int256 m = (80 * l) / 2_447; int256 d = l - (2_447 * m) / 80; l = m / 11;
        m = m + 2 - 12 * l; y = 100 * (n - 49) + y + l;
        return (uint256(y), uint256(m), uint256(d));
    }
}
