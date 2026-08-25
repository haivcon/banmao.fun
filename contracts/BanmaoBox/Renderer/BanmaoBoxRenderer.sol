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
    address creator;
    uint256 amount;
    uint128 timestamps;
    uint8 tokenDecimals;
    uint8 assetCount;
    bytes16 tokenSymbol;
    bytes renderAssets;
}

/// @notice Required SVG capability inherited by the full renderer interface.
interface IBanmaoBoxSVGRenderer is IERC165 {
    function renderSVG(uint256 tokenId, BanmaoBoxRenderData calldata data) external view returns (string memory);
}

/// @notice Full replaceable BanmaoBox metadata renderer interface.
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
    uint256 private constant SYMBOL_CALL_GAS = 50_000;
    uint256 private constant MAX_SYMBOL_INPUT_BYTES = 64;
    uint256 private constant MAX_SYMBOL_DISPLAY_BYTES = 32;

    error UnsupportedTokenDecimals(uint8 decimals);
    error InvalidRenderAssetCount();
    error InvalidRenderTimestamps();

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
            '","description":"A transferable time-sealed treasury backed by up to five ERC-20 assets on X Layer. Ledger amounts are compact display values; on-chain balances remain exact.",'
        );
        bytes memory tail = abi.encodePacked(
            '"image":"data:image/svg+xml;base64,', image,
            '","external_url":"https://banmao.fun/defi/box",',
            '"background_color":"08090D","attributes":', _renderAttributes(data),
            ',"properties":{"type":"banmaobox","metadataMode":"fully-onchain",',
            '"renderer":"solidity-full-renderer","chain":"X Layer","chainId":',
            block.chainid.toString(), '}}'
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
        if (_unlockTime(data) < _createdAt(data)) revert InvalidRenderTimestamps();

        for (uint256 i; i < data.assetCount; ++i) {
            (, , uint8 decimals, ) = _renderAssetAt(data.renderAssets, i);
            if (decimals > MAX_SUPPORTED_DECIMALS) revert UnsupportedTokenDecimals(decimals);
        }
    }

    function _renderSVG(uint256 tokenId, BanmaoBoxRenderData calldata data) internal view returns (string memory) {
        uint256 tier = _tier(data.amount, data.tokenDecimals);
        string memory gold = _tierGold(tier);
        bytes memory hero = abi.encodePacked(
            _header(tokenId, gold),
            _assetSummary(data, gold)
        );
        bytes memory details = abi.encodePacked(
            _timeline(data, gold),
            _ledger(data)
        );
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">',
            '<defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#17140D"/><stop offset=".48" stop-color="#090A0D"/><stop offset="1" stop-color="#040509"/></linearGradient><linearGradient id="shine"><stop stop-color="#F4EEDC"/><stop offset=".5" stop-color="#F2D98D"/><stop offset="1" stop-color="#F4EEDC"/></linearGradient></defs><style>.brand{font-family:Arial,sans-serif;font-weight:900;letter-spacing:4px}.label{font-family:Arial,sans-serif;font-weight:700;letter-spacing:2px}.mono{font-family:monospace}.gold{fill:#D8B565}.muted{fill:#817967}.white{fill:#F4EEDC}</style>',
            '<g transform="scale(0.75)"><rect width="800" height="800" fill="url(#bg)"/>',
            _logo(gold), _frame(gold), hero, details, "</g></svg>"
        ));
    }

    function _frame(string memory gold) internal pure returns (string memory) {
        string memory s = 'dur="10s" repeatCount="indefinite"';
        return string(abi.encodePacked(
            '<g fill="none" stroke="', gold, '">',
            '<rect x="18" y="18" width="764" height="764" opacity=".25"><animate attributeName="opacity" values=".25;.9;.25" ', s, '/></rect>',
            '<path d="M29 29H771V771H29Z"/>',
            '<path d="M18 88V18H88m624 0h70v70m0 624v70h-70M88 782H18v-70" stroke-width="3"/>',
            '<path d="M42 112H758M42 386H758M42 466H758M42 580H758" opacity=".35" stroke-dasharray="6 4"><animate attributeName="stroke-dashoffset" values="0;-20" dur="4s" repeatCount="indefinite"/></path></g>',
            '<rect x="29" y="29" width="742" height="90" fill="', gold, '" opacity="0"><animate attributeName="opacity" values="0;.14;0" ', s, '/><animateTransform attributeName="transform" type="translate" values="0 0;0 700;0 0" ', s, '/></rect>'
        ));
    }

    function _logo(string memory gold) internal pure returns (string memory) {
        bytes memory upper = abi.encodePacked(
            _logoCluster(256, 142, '-168 -104', '3 2', '0;.22;.78;1'),
            _logoCluster(424, 142, '148 -116', '-3 2', '0;.24;.76;1'),
            _logoBlade('M512 142h16v80h-16zM512 158h16M512 174h16M512 190h16M512 206h16', '132 -72', '-150;-82;-7;0;0;-7;-82;-150'),
            _logoBlade('M532 142h8v80h-8zM532 150h8M532 158h8M532 166h8M532 174h8M532 182h8M532 190h8M532 198h8M532 206h8M532 214h8', '184 -26', '170;94;9;0;0;9;94;170')
        );
        bytes memory lower = abi.encodePacked(
            _logoCluster(256, 310, '-164 132', '3 -2', '0;.24;.76;1'),
            _logoCluster(424, 310, '156 126', '-3 -2', '0;.22;.78;1'),
            _logoBlade('M512 310h16v80h-16zM512 326h16M512 342h16M512 358h16M512 374h16', '140 78', '150;78;7;0;0;7;78;150'),
            _logoBlade('M532 310h8v80h-8zM532 318h8M532 326h8M532 334h8M532 342h8M532 350h8M532 358h8M532 366h8M532 374h8M532 382h8', '190 28', '-170;-92;-9;0;0;-9;-92;-170')
        );
        return string(abi.encodePacked(
            '<g fill="', gold, '" opacity="0" transform="matrix(.92 0 0 .92 31.84 21.28)">',
            '<animate attributeName="opacity" values="0;.1;.1;0" keyTimes="0;.15;.85;1" dur="10s" repeatCount="indefinite"/>',
            '<g transform="translate(400 266)"><g><animateTransform attributeName="transform" type="scale" values=".94;.94;1.03;1;1;1.03;.94;.94" ', _logoTiming(), '/><g transform="translate(-400 -266)">',
            upper, _logoCluster(340, 226, '0 -188', '0 3', '0;.2;.8;1'),
            lower, '</g></g></g></g>'
        ));
    }

    function _logoCluster(uint256 x, uint256 y, string memory travel, string memory lock, string memory morphTimes) internal pure returns (string memory) {
        string memory grid = 'M0 0h20v20h-20zM20 0h20v20h-20zM40 0h20v20h-20zM60 0h20v20h-20zM0 20h20v20h-20zM20 20h20v20h-20zM40 20h20v20h-20zM60 20h20v20h-20zM0 40h20v20h-20zM20 40h20v20h-20zM40 40h20v20h-20zM60 40h20v20h-20zM0 60h20v20h-20zM20 60h20v20h-20zM40 60h20v20h-20zM60 60h20v20h-20z';
        bytes memory inward = abi.encodePacked(travel, ';', travel, ';', lock, ';0 0');
        bytes memory outward = abi.encodePacked('0 0;', lock, ';', travel, ';', travel);
        return string(abi.encodePacked(
            '<g transform="translate(', x.toString(), ' ', y.toString(), ')"><path d="', grid, '">',
            _clusterMorph(grid, morphTimes),
            '<animateTransform attributeName="transform" type="translate" values="', inward, ';', outward, '" ',
            _logoTiming(), '/></path></g>'
        ));
    }

    function _clusterMorph(string memory grid, string memory morphTimes) internal pure returns (string memory) {
        string memory scatter = 'M-54 -36h20v20h-20zM34 -52h20v20h-20zM92 -18h20v20h-20zM-88 22h20v20h-20zM12 4h20v20h-20zM70 34h20v20h-20zM128 12h20v20h-20zM-46 66h20v20h-20zM40 56h20v20h-20zM104 78h20v20h-20zM-74 112h20v20h-20zM0 98h20v20h-20zM58 126h20v20h-20zM118 116h20v20h-20zM26 154h20v20h-20zM82 168h20v20h-20z';
        return string(abi.encodePacked(
            '<animate attributeName="d" values="', scatter, ';', grid, ';', grid, ';', scatter,
            '" keyTimes="', morphTimes, '" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1" dur="10s" repeatCount="indefinite"/>'
        ));
    }

    function _logoBlade(string memory path, string memory travel, string memory turns) internal pure returns (string memory) {
        string memory t = _logoTiming();
        bytes memory inward = abi.encodePacked(travel, ';', travel, ';3 -2;0 0');
        bytes memory outward = abi.encodePacked('0 0;3 -2;', travel, ';', travel);
        return string(abi.encodePacked(
            '<g transform="translate(400 266)"><g><animateTransform attributeName="transform" type="rotate" values="',
            turns, '" ', t, '/><g transform="translate(-400 -266)"><path d="', path,
            '" fill-rule="evenodd"><animateTransform attributeName="transform" type="translate" values="', inward, ';', outward, '" ',
            t, '/></path></g></g></g>'
        ));
    }

    function _logoTiming() internal pure returns (string memory) {
        return 'keyTimes="0;.2;.38;.42;.58;.62;.8;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1;.4 0 .6 1" dur="10s" repeatCount="indefinite"';
    }

    function _header(uint256 tokenId, string memory gold) internal pure returns (string memory) {
        bytes memory title = abi.encodePacked(
            '<text class="brand" x="50" y="68" font-size="34" fill="url(#shine)">BANMAOBOX<animate attributeName="opacity" values="1;.35;1" dur="5s" repeatCount="indefinite"/></text>',
            '<text class="label muted" x="50" y="96" font-size="13">SEALED TREASURY  /  SEALED</text>'
        );
        return string(abi.encodePacked(
            title,
            '<text class="label muted" x="750" y="48" text-anchor="end" font-size="11">NFT TOKEN ID</text>',
            '<text class="mono" x="750" y="84" text-anchor="end" fill="', gold,
            '" font-size="30" font-weight="700">#', _abbreviate(tokenId.toString(), 7, 7), '</text>'
        ));
    }

    function _assetSummary(BanmaoBoxRenderData calldata data, string memory gold) internal view returns (string memory) {
        bytes memory rows;
        for (uint256 i; i < data.assetCount; ++i) {
            rows = abi.encodePacked(rows, _summaryRow(data.renderAssets, i, gold));
        }
        bytes memory heading = abi.encodePacked(
            '<g transform="translate(48 146)"><text class="label gold" font-size="19">ASSET PORTFOLIO / ',
            uint256(data.assetCount).toString(), '</text>',
            '<text class="label muted" x="704" text-anchor="end" font-size="12">AVAILABLE AMOUNT</text>'
        );
        return string(abi.encodePacked(
            heading,
            rows,
            data.amount == 0 && data.assetCount != 0 ? '<text class="label gold" x="704" y="224" text-anchor="end" font-size="13">PRIMARY ASSET RELEASED</text>' : "",
            '</g>'
        ));
    }

    function _summaryRow(bytes calldata packed, uint256 index, string memory gold) internal view returns (string memory) {
        (address token, uint256 amount, uint8 decimals, bytes16 symbol) = _renderAssetAt(packed, index);
        string memory sym = _xmlEscapeString(_displaySymbol(token, symbol));
        bytes memory top = abi.encodePacked(
            '<g><text class="mono white" y="', (43 + index * 40).toString(),
            '" font-size="', bytes(sym).length > 14 ? "20" : "24", '" font-weight="700"',
            '>', sym, '</text>'
        );
        return string(abi.encodePacked(
            top, '<text class="mono" x="704" y="', (43 + index * 40).toString(),
            '" text-anchor="end" fill="', gold, '" font-size="22" font-weight="700">',
            _formatDisplayAmount(amount, decimals), '</text><path d="M0 ', (51 + index * 40).toString(),
            'H704" stroke="', gold, '" stroke-opacity=".1"/></g>'
        ));
    }

    function _timeline(BanmaoBoxRenderData calldata data, string memory gold) internal pure returns (string memory) {
        bytes memory unlock = abi.encodePacked(
            '<g transform="translate(48 414)"><text class="label gold" font-size="15">',
            'UNLOCK TIME',
            '</text><text class="mono white" x="704" text-anchor="end" font-size="20" font-weight="700">',
            _formatDateTime(_unlockTime(data)), '</text></g>'
        );
        bytes memory identity = abi.encodePacked(
            '<g transform="translate(48 492)"><text class="label gold" font-size="14">MINTED BY</text>',
            '<text class="mono white" y="27" font-size="18" font-weight="700">', data.creator.toHexString(), '</text>'
        );
        bytes memory dates = abi.encodePacked(
            '<text class="label muted" y="60" font-size="12">CREATED</text>',
            '<text class="mono white" x="92" y="60" font-size="16">',
            _formatDateTime(_createdAt(data)), '</text>'
        );
        return string(abi.encodePacked(
            unlock, identity, dates,
            '<text class="label muted" x="472" y="60" font-size="12">TIME SEAL</text>',
            '<text class="mono" x="704" y="60" text-anchor="end" fill="', gold,
            '" font-size="17" font-weight="700">', _duration(data), '</text></g>'
        ));
    }

    function _ledger(BanmaoBoxRenderData calldata data) internal view returns (string memory) {
        bytes memory rows;
        for (uint256 i; i < data.assetCount; ++i) {
            rows = abi.encodePacked(rows, _ledgerRow(data.renderAssets, i));
        }
        return string(abi.encodePacked(
            '<text class="label gold" x="48" y="608" font-size="19">ASSET LEDGER</text>',
            '<text class="label muted" x="48" y="632" font-size="12">TOKEN CONTRACT</text>',
            '<text class="label muted" x="560" y="632" text-anchor="end" font-size="12">AMOUNT</text>',
            '<text class="label muted" x="752" y="632" text-anchor="end" font-size="12">SYMBOL / DECIMALS</text>',
            rows
        ));
    }

    function _ledgerRow(bytes calldata packed, uint256 index) internal view returns (string memory) {
        (address token, uint256 amount, uint8 decimals, bytes16 symbol) = _renderAssetAt(packed, index);
        string memory yPos = (654 + index * 25).toString();
        string memory divY = (662 + index * 25).toString();
        bytes memory addr = abi.encodePacked(
            '<g><text class="mono white" x="48" y="', yPos,
            '" font-size="12" font-weight="700">',
            token.toHexString(), '</text>'
        );
        return string(abi.encodePacked(
            addr,
            '<text class="mono white" x="560" y="', yPos,
            '" text-anchor="end" font-size="14" font-weight="700">',
            _formatDisplayAmount(amount, decimals), '</text><text class="mono white" x="752" y="', yPos,
            '" text-anchor="end" font-size="13">', _xmlEscapeString(_displaySymbol(token, symbol)), ' / d',
            uint256(decimals).toString(), '</text><path d="M48 ', divY,
            'H752" stroke="#D8B565" stroke-opacity=".12"/></g>'
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
        bytes memory identity = abi.encodePacked(
            '[{"trait_type":"Status","value":"',
            'Sealed',
            '"},{"trait_type":"Token Symbol","value":"', _jsonEscape(_displaySymbol(data.token, data.tokenSymbol)),
            '"},{"display_type":"number","trait_type":"Asset Count","value":',
            uint256(data.assetCount).toString()
        );
        bytes memory provenance = abi.encodePacked(
            '},{"trait_type":"Token Contract","value":"', data.token.toHexString(),
            '"},{"trait_type":"Minting Wallet","value":"', data.creator.toHexString(), '"'
        );
        return string(abi.encodePacked(
            identity,
            provenance,
            '},{"display_type":"date","trait_type":"Created Time","value":',
            uint256(_createdAt(data)).toString(),
            '},{"display_type":"date","trait_type":"Unlock Time","value":',
            uint256(_unlockTime(data)).toString(),
            '},{"display_type":"number","trait_type":"Lock Duration Seconds","value":',
            (uint256(_unlockTime(data)) - uint256(_createdAt(data))).toString(),
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
        for (uint256 i; i < length; ++i) {
            bytes1 char = value[i];
            bool allowed =
                (char >= 0x30 && char <= 0x39) ||
                (char >= 0x41 && char <= 0x5A) ||
                (char >= 0x61 && char <= 0x7A) ||
                char == 0x20 ||
                char == 0x2D ||
                char == 0x2E ||
                char == 0x5F;
            if (!allowed) return "TOKEN";
            out[i] = char;
        }
        return string(out);
    }

    function _displaySymbol(address token, bytes16 snapshot) internal view returns (string memory) {
        if (snapshot != bytes16("TOKEN")) return _symbol(snapshot);
        (bool ok, bytes memory raw) = _readLiveSymbol(token);
        if (!ok) return _symbolFallback(token);
        uint256 displayLength;
        (ok, displayLength) = _validUtf8Length(raw);
        if (!ok) return _symbolFallback(token);
        bytes memory bounded = new bytes(displayLength);
        for (uint256 i; i < displayLength; ++i) bounded[i] = raw[i];
        return string(bounded);
    }

    function _readLiveSymbol(address token) internal view returns (bool ok, bytes memory raw) {
        bytes4 selector = 0x95d89b41;
        uint256 returnSize;
        bytes memory encoded = new bytes(128);
        assembly ("memory-safe") {
            mstore(0, selector)
            ok := staticcall(SYMBOL_CALL_GAS, token, 0, 4, add(encoded, 0x20), 128)
            returnSize := returndatasize()
        }
        if (!ok || returnSize < 96 || returnSize > 128) return (false, raw);

        uint256 offset;
        uint256 length;
        assembly ("memory-safe") {
            offset := mload(add(encoded, 0x20))
            length := mload(add(encoded, 0x40))
        }
        if (
            offset != 32 ||
            length == 0 ||
            length > MAX_SYMBOL_INPUT_BYTES
        ) return (false, raw);
        uint256 paddedLength = (length + 31) & ~uint256(31);
        if (returnSize != 64 + paddedLength) return (false, raw);

        raw = new bytes(length);
        for (uint256 i; i < length; ++i) raw[i] = encoded[64 + i];
        for (uint256 i = length; i < paddedLength; ++i) {
            if (encoded[64 + i] != 0) return (false, raw);
        }
        return (true, raw);
    }

    function _validUtf8Length(bytes memory raw) internal pure returns (bool, uint256 displayLength) {
        uint256 i;
        while (i < raw.length) {
            uint256 first = uint8(raw[i]);
            uint256 width;
            uint256 codepoint;
            if (first <= 0x7f) {
                width = 1;
                codepoint = first;
            } else if (first >= 0xc2 && first <= 0xdf) {
                width = 2;
                codepoint = first & 0x1f;
            } else if (first >= 0xe0 && first <= 0xef) {
                width = 3;
                codepoint = first & 0x0f;
            } else if (first >= 0xf0 && first <= 0xf4) {
                width = 4;
                codepoint = first & 0x07;
            } else {
                return (false, 0);
            }
            if (i + width > raw.length) return (false, 0);
            for (uint256 j = 1; j < width; ++j) {
                uint256 continuation = uint8(raw[i + j]);
                if (continuation < 0x80 || continuation > 0xbf) return (false, 0);
                codepoint = (codepoint << 6) | (continuation & 0x3f);
            }
            if (
                (width == 3 && codepoint < 0x800) ||
                (width == 4 && codepoint < 0x10000) ||
                codepoint > 0x10ffff ||
                (codepoint >= 0xd800 && codepoint <= 0xdfff) ||
                _unsafeCodepoint(codepoint)
            ) return (false, 0);
            if (i + width <= MAX_SYMBOL_DISPLAY_BYTES) displayLength = i + width;
            i += width;
        }
        return (displayLength != 0, displayLength);
    }

    function _unsafeCodepoint(uint256 codepoint) internal pure returns (bool) {
        return
            codepoint <= 0x1f ||
            (codepoint >= 0x7f && codepoint <= 0x9f) ||
            codepoint == 0xfffe ||
            codepoint == 0xffff ||
            codepoint == 0x2028 ||
            codepoint == 0x2029 ||
            (codepoint >= 0x202a && codepoint <= 0x202e) ||
            (codepoint >= 0x2066 && codepoint <= 0x2069) ||
            codepoint == 0x061c ||
            codepoint == 0x200e ||
            codepoint == 0x200f;
    }

    function _xmlEscape(bytes memory raw, uint256 length) internal pure returns (bytes memory out) {
        uint256 escapedLength;
        for (uint256 i; i < length; ++i) {
            bytes1 char = raw[i];
            escapedLength += char == "&" ? 5 : char == "<" || char == ">" ? 4 : char == '"' || char == "'" ? 6 : 1;
        }
        out = new bytes(escapedLength);
        uint256 cursor;
        for (uint256 i; i < length; ++i) {
            bytes memory replacement;
            bytes1 char = raw[i];
            if (char == "&") replacement = bytes("&amp;");
            else if (char == "<") replacement = bytes("&lt;");
            else if (char == ">") replacement = bytes("&gt;");
            else if (char == '"') replacement = bytes("&quot;");
            else if (char == "'") replacement = bytes("&apos;");
            else out[cursor++] = char;
            for (uint256 j; j < replacement.length; ++j) out[cursor++] = replacement[j];
        }
    }

    function _xmlEscapeString(string memory value) internal pure returns (string memory) {
        bytes memory raw = bytes(value);
        return string(_xmlEscape(raw, raw.length));
    }

    function _jsonEscape(string memory value) internal pure returns (string memory) {
        bytes memory raw = bytes(value);
        uint256 extra;
        for (uint256 i; i < raw.length; ++i) if (raw[i] == '"' || raw[i] == "\\") ++extra;
        bytes memory out = new bytes(raw.length + extra);
        uint256 cursor;
        for (uint256 i; i < raw.length; ++i) {
            if (raw[i] == '"' || raw[i] == "\\") out[cursor++] = "\\";
            out[cursor++] = raw[i];
        }
        return string(out);
    }

    function _symbolFallback(address token) internal pure returns (string memory) {
        return string(abi.encodePacked("TOKEN ", _abbreviate(token.toHexString(), 8, 4)));
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
                ? string(abi.encodePacked("&lt;0.01"))
                : string(abi.encodePacked(_withCommas(whole), " + &lt;0.01"));
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

    function _abbreviate(string memory value, uint256 head, uint256 tail) internal pure returns (string memory) {
        bytes memory source = bytes(value);
        if (source.length <= head + tail + 3) return value;
        bytes memory out = new bytes(head + tail + 3);
        for (uint256 i; i < head; ++i) out[i] = source[i];
        out[head] = "."; out[head + 1] = "."; out[head + 2] = ".";
        for (uint256 i; i < tail; ++i) out[head + 3 + i] = source[source.length - tail + i];
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
