// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @notice Compact data required to render one live BanmaoBox NFT.
struct BanmaoBoxRenderData {
    address token;
    address creator;
    uint256 amount;
    uint128 timestamps;
    uint8 tokenDecimals;
    uint8 assetCount;
    string tokenSymbol;
}

/// @notice Stateless interface used by BanmaoBox for fully on-chain metadata.
interface IBanmaoBoxRenderer is IERC165 {
    function tokenURI(
        uint256 tokenId,
        BanmaoBoxRenderData calldata data
    ) external view returns (string memory);

    function renderSVG(
        uint256 tokenId,
        BanmaoBoxRenderData calldata data
    ) external view returns (string memory);

    function renderAttributes(
        BanmaoBoxRenderData calldata data
    ) external view returns (string memory);
}

/// @title BanmaoBoxRenderer
/// @notice Fully on-chain dynamic SVG and metadata renderer for BanmaoBox.
/// @dev Lock status is recalculated whenever tokenURI/renderSVG is queried.
contract BanmaoBoxRenderer is IBanmaoBoxRenderer {
    using Strings for uint256;
    using Strings for address;

    uint256 private constant MAX_SUPPORTED_DECIMALS = 69;

    error UnsupportedTokenDecimals(uint8 decimals);

    /// @inheritdoc IERC165
    function supportsInterface(
        bytes4 interfaceId
    ) external pure override returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IBanmaoBoxRenderer).interfaceId;
    }

    function tokenURI(
        uint256 tokenId,
        BanmaoBoxRenderData calldata data
    ) external view override returns (string memory) {
        _validateDecimals(data.tokenDecimals);

        string memory encodedSvg = Base64.encode(
            bytes(_renderSVG(tokenId, data))
        );
        bytes memory metadataHead = abi.encodePacked(
            '{"name":"BanmaoBox #',
            tokenId.toString(),
            '","description":"A transferable, time-locked NFT gift box backed by up to five ERC-20 assets on X Layer. Verify every token contract before interacting.",',
            '"image":"data:image/svg+xml;base64,',
            encodedSvg
        );
        bytes memory metadataTail = abi.encodePacked(
            '","animation_url":"data:image/svg+xml;base64,',
            encodedSvg,
            '","external_url":"https://banmao.fun/defi/box",',
            '"background_color":"080B16","attributes":',
            _renderAttributes(data),
            "}"
        );
        string memory json = string(
            abi.encodePacked(metadataHead, metadataTail)
        );

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(bytes(json))
                )
            );
    }

    function renderSVG(
        uint256 tokenId,
        BanmaoBoxRenderData calldata data
    ) external view override returns (string memory) {
        _validateDecimals(data.tokenDecimals);
        return _renderSVG(tokenId, data);
    }

    function renderAttributes(
        BanmaoBoxRenderData calldata data
    ) external view override returns (string memory) {
        _validateDecimals(data.tokenDecimals);
        return _renderAttributes(data);
    }

    function _renderSVG(
        uint256 tokenId,
        BanmaoBoxRenderData calldata data
    ) internal view returns (string memory) {
        uint64 unlockTime = _unlockTime(data);
        bool ready = block.timestamp >= uint256(unlockTime);
        uint256 tier = _tier(data.amount, data.tokenDecimals);
        string memory accent = ready ? "#64F5A5" : _tierAccent(tier);

        return
            string(
                abi.encodePacked(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" role="img" aria-label="Banmao Box time-locked NFT">',
                    _renderDefsAndStyle(accent),
                    _renderBackground(accent),
                    _renderHeader(tokenId, ready, accent),
                    _renderVault(ready, accent),
                    _renderDetails(data, ready, accent),
                    "</svg>"
                )
            );
    }

    function _renderDefsAndStyle(
        string memory accent
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '<defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="#171B2D"/><stop offset=".55" stop-color="#090D18"/><stop offset="1" stop-color="#04060B"/></linearGradient><linearGradient id="v" x2="0" y2="1"><stop stop-color="#283142"/><stop offset="1" stop-color="#0D121D"/></linearGradient><radialGradient id="h"><stop stop-color="',
                    accent,
                    '" stop-opacity=".25"/><stop offset="1" stop-color="',
                    accent,
                    '" stop-opacity="0"/></radialGradient></defs><style>.t{font-family:Arial,sans-serif;font-weight:900}.l{font-family:Arial,sans-serif;font-weight:700;letter-spacing:.15em}.n{font-family:Consolas,monospace}</style>'
                )
            );
    }

    function _renderBackground(
        string memory accent
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '<rect width="800" height="800" rx="48" fill="url(#b)"/><circle cx="400" cy="305" r="285" fill="url(#h)"/><path d="M56 112H744" stroke="',
                    accent,
                    '" stroke-opacity=".45"/>'
                )
            );
    }

    function _renderHeader(
        uint256 tokenId,
        bool ready,
        string memory accent
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '<text class="t" x="400" y="78" text-anchor="middle" fill="#F8FAFC" font-size="38" letter-spacing="3">BANMAO BOX</text><text class="n" x="744" y="76" text-anchor="end" fill="#9CA6BB" font-size="20">#',
                    tokenId.toString(),
                    "</text>",
                    _renderStatus(ready, accent)
                )
            );
    }

    function _renderStatus(
        bool ready,
        string memory accent
    ) internal pure returns (string memory) {
        bytes memory pill = abi.encodePacked(
            '<g transform="translate(',
            ready ? "285" : "312",
            ' 137)"><rect width="',
            ready ? "230" : "176",
            '" height="40" rx="20" fill="',
            accent,
            '" fill-opacity=".1" stroke="',
            accent,
            '" stroke-opacity=".5"/>'
        );
        bytes memory text = abi.encodePacked(
            '<circle cx="',
            ready ? "25" : "26",
            '" cy="20" r="6" fill="',
            accent,
            '"/><text class="l" x="',
            ready ? "125" : "100",
            '" y="26" text-anchor="middle" fill="',
            accent,
            '" font-size="14">',
            ready ? "READY TO OPEN" : "LOCKED",
            "</text></g>"
        );
        return string(abi.encodePacked(pill, text));
    }

    function _renderVault(
        bool ready,
        string memory accent
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    _renderVaultShell(accent),
                    _renderVaultLock(ready, accent)
                )
            );
    }

    function _renderVaultShell(
        string memory accent
    ) internal pure returns (string memory) {
        bytes memory outer = abi.encodePacked(
            '<g transform="translate(250 178)"><rect width="300" height="270" rx="54" fill="url(#v)" stroke="',
            accent,
            '" stroke-opacity=".7" stroke-width="3"/><path d="M44 65H256M44 205H256" stroke="#fff" stroke-opacity=".08"/><circle cx="150" cy="135" r="79" fill="#080C14" stroke="',
            accent,
            '" stroke-opacity=".3" stroke-width="2"/>'
        );
        bytes memory inner = abi.encodePacked(
            '<circle cx="150" cy="135" r="58" fill="#111827" stroke="',
            accent,
            '" stroke-width="3"/><g stroke="',
            accent,
            '" stroke-width="5" stroke-linecap="round"><path d="M150 77v15M150 178v15M92 135h15M193 135h15"/></g>'
        );
        return string(abi.encodePacked(outer, inner));
    }

    function _renderVaultLock(
        bool ready,
        string memory accent
    ) internal pure returns (string memory) {
        bytes memory shackle = abi.encodePacked(
            '<path d="',
            ready
                ? "M130 132v-15a20 20 0 0 1 37-10"
                : "M130 132v-15a20 20 0 0 1 40 0v15",
            '" fill="none" stroke="',
            accent,
            '" stroke-width="9" stroke-linecap="round"/>'
        );
        bytes memory body = abi.encodePacked(
            '<rect x="123" y="130" width="54" height="46" rx="10" fill="',
            accent,
            '"/><circle cx="150" cy="149" r="5" fill="#101522"/><path d="M147 153h6v11h-6Z" fill="#101522"/></g>'
        );
        return string(abi.encodePacked(shackle, body));
    }

    function _renderDetails(
        BanmaoBoxRenderData calldata data,
        bool ready,
        string memory accent
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    _renderAmount(data),
                    _renderIdentity(data),
                    _renderTimeline(data, ready, accent)
                )
            );
    }

    function _renderAmount(
        BanmaoBoxRenderData calldata data
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '<g transform="translate(56 474)"><rect width="688" height="92" rx="20" fill="#0C111D" stroke="#fff" stroke-opacity=".1"/><text class="l" x="344" y="27" text-anchor="middle" fill="#78839A" font-size="12">AMOUNT</text><text class="n" x="344" y="68" text-anchor="middle" fill="#F8FAFC" font-size="30" font-weight="700">',
                    _formatTokenAmount(data.amount, data.tokenDecimals),
                    " ",
                    data.tokenSymbol,
                    "</text></g>"
                )
            );
    }

    function _renderIdentity(
        BanmaoBoxRenderData calldata data
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '<g transform="translate(56 582)"><rect width="688" height="162" rx="20" fill="#0C111D" stroke="#fff" stroke-opacity=".1"/><text class="l" x="344" y="24" text-anchor="middle" fill="#78839A" font-size="12">MINT WALLET</text><text class="n" x="344" y="48" text-anchor="middle" fill="#D1D6E0" font-size="16">',
                    data.creator.toHexString(),
                    '</text><path d="M22 65H666" stroke="#fff" stroke-opacity=".08"/><text class="l" x="172" y="94" text-anchor="middle" fill="#78839A" font-size="12">CREATED</text><text class="n" x="172" y="121" text-anchor="middle" fill="#D1D6E0" font-size="16">',
                    _formatDateTime(_createdAt(data)),
                    "</text>"
                )
            );
    }

    function _renderTimeline(
        BanmaoBoxRenderData calldata data,
        bool ready,
        string memory accent
    ) internal pure returns (string memory) {
        bytes memory label = abi.encodePacked(
            '<text class="l" x="516" y="94" text-anchor="middle" fill="',
            accent,
            '" font-size="12">',
            ready ? "UNLOCKED AT" : "UNLOCKS",
            "</text>"
        );
        bytes memory value = abi.encodePacked(
            '<text class="n" x="516" y="121" text-anchor="middle" fill="',
            accent,
            '" font-size="16" font-weight="700">',
            _formatDateTime(_unlockTime(data)),
            "</text></g>"
        );
        return string(abi.encodePacked(label, value));
    }

    function _renderAttributes(
        BanmaoBoxRenderData calldata data
    ) internal view returns (string memory) {
        bool ready = block.timestamp >= uint256(_unlockTime(data));
        uint256 tier = _tier(data.amount, data.tokenDecimals);

        bytes memory identityHead = abi.encodePacked(
            '[{"trait_type":"Status","value":"',
            ready ? "Ready to open" : "Locked",
            '"},{"trait_type":"Gift Tier","value":"',
            _tierName(tier),
            '"},{"trait_type":"Token Symbol","value":"',
            data.tokenSymbol,
            '"},{"display_type":"number","trait_type":"Asset Count","value":',
            uint256(data.assetCount).toString(),
            "}"
        );
        bytes memory identityTail = abi.encodePacked(
            ',{"trait_type":"Token Contract","value":"',
            data.token.toHexString(),
            '"},{"trait_type":"Creator Wallet","value":"',
            data.creator.toHexString(),
            '"},{"trait_type":"Token Amount","value":"',
            _formatTokenAmount(data.amount, data.tokenDecimals),
            '"}'
        );
        bytes memory numericTraits = abi.encodePacked(
            ',{"display_type":"number","trait_type":"Token Amount (base units)","value":',
            data.amount.toString(),
            '},{"display_type":"date","trait_type":"Unlock Time","value":',
            uint256(_unlockTime(data)).toString(),
            '},{"display_type":"date","trait_type":"Created At","value":',
            uint256(_createdAt(data)).toString(),
            "}"
        );
        bytes memory staticTraits = abi.encodePacked(
            ',{"trait_type":"Metadata Mode","value":"Fully On-Chain"},',
            '{"trait_type":"Chain","value":"X Layer"}]'
        );

        return
            string(
                abi.encodePacked(
                    identityHead,
                    identityTail,
                    numericTraits,
                    staticTraits
                )
            );
    }

    function _tier(
        uint256 amount,
        uint8 decimals
    ) internal pure returns (uint256) {
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

    function _tierAccent(
        uint256 tier
    ) internal pure returns (string memory) {
        if (tier == 3) return "#FF78E1";
        if (tier == 2) return "#FFD75E";
        if (tier == 1) return "#66D9FF";
        return "#FFB84D";
    }

    function _formatTokenAmount(
        uint256 amount,
        uint8 decimals
    ) internal pure returns (string memory) {
        if (decimals == 0) return _withCommas(amount);

        uint256 unit = 10 ** uint256(decimals);
        uint256 whole = amount / unit;
        uint256 remainder = amount % unit;
        uint256 fraction;

        if (decimals == 1) {
            fraction = remainder * 10;
        } else {
            fraction = remainder / (10 ** uint256(decimals - 2));
        }

        if (fraction == 0) return _withCommas(whole);
        return
            string(
                abi.encodePacked(
                    _withCommas(whole),
                    ".",
                    fraction < 10 ? "0" : "",
                    fraction.toString()
                )
            );
    }

    function _withCommas(
        uint256 value
    ) internal pure returns (string memory) {
        bytes memory source = bytes(value.toString());
        if (source.length <= 3) return string(source);

        uint256 commaCount = (source.length - 1) / 3;
        bytes memory output = new bytes(source.length + commaCount);
        uint256 sourceIndex = source.length;
        uint256 outputIndex = output.length;
        uint256 digits;

        while (sourceIndex > 0) {
            output[--outputIndex] = source[--sourceIndex];
            unchecked {
                ++digits;
            }
            if (digits == 3 && sourceIndex > 0) {
                output[--outputIndex] = ",";
                digits = 0;
            }
        }

        return string(output);
    }

    function _pad2(uint256 value) internal pure returns (string memory) {
        if (value < 10) {
            return string(abi.encodePacked("0", value.toString()));
        }
        return value.toString();
    }

    function _createdAt(
        BanmaoBoxRenderData calldata data
    ) internal pure returns (uint64) {
        return uint64(data.timestamps >> 64);
    }

    function _unlockTime(
        BanmaoBoxRenderData calldata data
    ) internal pure returns (uint64) {
        return uint64(data.timestamps);
    }

    function _formatDateTime(
        uint64 timestamp
    ) internal pure returns (string memory) {
        (uint256 year, uint256 month, uint256 day) = _dateFromDays(
            uint256(timestamp) / 1 days
        );
        uint256 secondsInDay = uint256(timestamp) % 1 days;
        uint256 hour = secondsInDay / 1 hours;
        uint256 minute = (secondsInDay % 1 hours) / 1 minutes;

        return
            string(
                abi.encodePacked(
                    year.toString(),
                    "-",
                    _pad2(month),
                    "-",
                    _pad2(day),
                    " ",
                    _pad2(hour),
                    ":",
                    _pad2(minute),
                    " UTC"
                )
            );
    }

    /// @dev Gregorian date conversion adapted from the public-domain
    ///      BokkyPooBah DateTime Library algorithm.
    function _dateFromDays(
        uint256 daysSinceEpoch
    ) internal pure returns (uint256 year, uint256 month, uint256 day) {
        int256 __days = int256(daysSinceEpoch);
        int256 l = __days + 68_569 + 2_440_588;
        int256 n = (4 * l) / 146_097;
        l = l - (146_097 * n + 3) / 4;
        int256 _year = (4_000 * (l + 1)) / 1_461_001;
        l = l - (1_461 * _year) / 4 + 31;
        int256 _month = (80 * l) / 2_447;
        int256 _day = l - (2_447 * _month) / 80;
        l = _month / 11;
        _month = _month + 2 - 12 * l;
        _year = 100 * (n - 49) + _year + l;

        return (uint256(_year), uint256(_month), uint256(_day));
    }

    function _validateDecimals(uint8 decimals) internal pure {
        if (uint256(decimals) > MAX_SUPPORTED_DECIMALS) {
            revert UnsupportedTokenDecimals(decimals);
        }
    }
}