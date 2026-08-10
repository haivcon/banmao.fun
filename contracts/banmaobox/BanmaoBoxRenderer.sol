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
/// @dev The countdown is calculated whenever tokenURI/renderSVG is queried.
///      Marketplaces may cache metadata, so their displayed countdown advances
///      only when they refresh the token metadata.
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

        bytes memory upperArtwork = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Dynamic Banmao time-locked gift box NFT">',
            _renderDefsAndStyle(accent),
            _renderBackground(tier, accent),
            _renderHeader(tokenId, ready, accent),
            _renderBanmaoCharacter()
        );
        bytes memory lowerArtwork = abi.encodePacked(
            _renderGiftBox(tier, ready, accent),
            _renderSparkles(tier, accent),
            _renderCountdown(unlockTime, ready, accent),
            _renderFooter(data, tier),
            "</svg>"
        );

        return string(abi.encodePacked(upperArtwork, lowerArtwork));
    }

    function _renderDefsAndStyle(
        string memory accent
    ) internal pure returns (string memory) {
        bytes memory gradients = abi.encodePacked(
            "<defs>",
            '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#151A31"/><stop offset=".55" stop-color="#0A0E1D"/><stop offset="1" stop-color="#05070E"/></linearGradient>',
            '<radialGradient id="halo"><stop stop-color="',
            accent,
            '" stop-opacity=".28"/><stop offset="1" stop-color="',
            accent,
            '" stop-opacity="0"/></radialGradient>'
        );
        bytes memory materials = abi.encodePacked(
            '<linearGradient id="banana" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFF36A"/><stop offset=".5" stop-color="#F7D72D"/><stop offset="1" stop-color="#D9A817"/></linearGradient>',
            '<linearGradient id="fur" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#F8B45F"/><stop offset="1" stop-color="#C9732E"/></linearGradient>',
            '<linearGradient id="gift" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFE274"/><stop offset="1" stop-color="#E99B16"/></linearGradient>',
            '<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
            '<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#000" flood-opacity=".38"/></filter>',
            "</defs>"
        );
        bytes memory styles = abi.encodePacked(
            "<style>",
            ".title{font-family:Arial,sans-serif;font-weight:900;letter-spacing:.08em}.mono{font-family:Consolas,'Courier New',monospace}.label{font-family:Arial,sans-serif;letter-spacing:.12em}.mascot{transform-origin:245px 360px;animation:float 4s ease-in-out infinite}.lid{transform-origin:585px 300px;animation:lid 2.8s ease-in-out infinite}.spark{transform-box:fill-box;transform-origin:center;animation:twinkle 2.4s ease-in-out infinite}.readyPulse{animation:pulse 1.8s ease-in-out infinite}@keyframes float{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-8px) rotate(1deg)}}@keyframes lid{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes twinkle{0%,100%{opacity:.2;transform:scale(.65) rotate(0)}50%{opacity:1;transform:scale(1.15) rotate(45deg)}}@keyframes pulse{0%,100%{opacity:.72}50%{opacity:1}}",
            "</style>"
        );

        return string(abi.encodePacked(gradients, materials, styles));
    }

    function _renderBackground(
        uint256 tier,
        string memory accent
    ) internal pure returns (string memory) {
        uint256 ringCount = tier + 2;
        bytes memory rings = '<g fill="none" stroke-width="1">';
        for (uint256 i; i < ringCount; ++i) {
            rings = abi.encodePacked(
                rings,
                '<circle cx="585" cy="335" r="',
                (118 + i * 27).toString(),
                '" stroke="',
                accent,
                '" stroke-opacity=".',
                _pad2(8 + i * 3),
                '" stroke-dasharray="8 16"/>'
            );
        }

        return
            string(
                abi.encodePacked(
                    '<rect width="800" height="800" rx="48" fill="url(#bg)"/>',
                    '<circle cx="585" cy="335" r="300" fill="url(#halo)"/>',
                    '<path d="M0 610C165 548 274 674 430 621s245-13 370 45V800H0Z" fill="#11182B" opacity=".76"/>',
                    rings,
                    "</g>",
                    '<g opacity=".12" stroke="#fff"><path d="M0 176h800M0 622h800"/><path d="M126 0v800M674 0v800"/></g>'
                )
            );
    }

    function _renderHeader(
        uint256 tokenId,
        bool ready,
        string memory accent
    ) internal pure returns (string memory) {
        bytes memory title = abi.encodePacked(
            '<text class="title" x="56" y="73" fill="#F9FAFB" font-size="34">BANMAOBOX</text>',
            '<text class="mono" x="744" y="70" text-anchor="end" fill="#AAB1C5" font-size="18">#',
            tokenId.toString(),
            "</text>",
            '<rect x="56" y="91" width="688" height="2" rx="1" fill="',
            accent,
            '" opacity=".55"/>'
        );
        bytes memory status = abi.encodePacked(
            '<circle class="',
            ready ? "readyPulse" : "",
            '" cx="63" cy="122" r="6" fill="',
            accent,
            '"/><text class="label" x="79" y="128" fill="',
            accent,
            '" font-size="16" font-weight="700">'
        );
        bytes memory statusText = abi.encodePacked(
            ready ? "READY TO OPEN" : "TIME LOCK ACTIVE",
            "</text>"
        );

        return string(abi.encodePacked(title, status, statusText));
    }

    /// @dev Vector interpretation of Happy Smile.png: an orange cat wearing a
    ///      bright yellow banana costume.
    function _renderBanmaoCharacter() internal pure returns (string memory) {
        bytes memory body = abi.encodePacked(
            '<g class="mascot" filter="url(#soft)">',
            '<path d="M184 437c-46 8-58-44-24-66 13-9 26-4 30 8-20 8-20 28 1 31Z" fill="url(#fur)"/>',
            '<path d="M298 430c52-12 77 32 48 61-11 11-26 9-31-2 18-12 14-31-8-32Z" fill="none" stroke="#D47A31" stroke-width="17" stroke-linecap="round"/>',
            '<path d="M217 538c-3 28-2 47-20 52-21 6-30-11-20-28l13-30m83 3c4 28 3 47 21 52 21 6 30-12 19-29l-13-30" fill="url(#fur)" stroke="#AF5B25" stroke-width="3"/>',
            '<path d="M237 153c-8-29 7-58 25-72l11-34 23-2-3 38c30 21 47 58 42 97l-24 284c-5 61-42 92-83 84-42-8-67-47-57-106l43-259c3-17 11-25 23-30Z" fill="url(#banana)" stroke="#C99716" stroke-width="4"/>',
            '<path d="M273 47l23-2 1-19-25 1Z" fill="#86502D" stroke="#65381F" stroke-width="3"/>',
            '<path d="M198 435c24 28 78 32 111 6-8 69-38 111-81 107-40-4-61-48-57-106Z" fill="#F5C925" opacity=".65"/>'
        );
        bytes memory faceShape = abi.encodePacked(
            '<ellipse cx="255" cy="244" rx="78" ry="72" fill="url(#fur)" stroke="#9E5828" stroke-width="4"/>',
            '<path d="M196 207l19-42 25 32m71 11-14-43-27 31" fill="#D47A31"/>',
            '<path d="M208 207l10-24 14 18m67 7-8-25-15 18" fill="#F6B6A0"/>',
            '<path d="M211 211c13-14 25-20 39-23m48 24c-13-15-25-21-39-24" fill="none" stroke="#A95625" stroke-width="7" stroke-linecap="round"/>',
            '<ellipse cx="226" cy="237" rx="14" ry="18" fill="#171923"/><ellipse cx="282" cy="237" rx="14" ry="18" fill="#171923"/>',
            '<circle cx="222" cy="231" r="5" fill="#fff"/><circle cx="278" cy="231" r="5" fill="#fff"/>'
        );
        bytes memory smile = abi.encodePacked(
            '<ellipse cx="254" cy="267" rx="38" ry="27" fill="#FFE2B8" opacity=".96"/>',
            '<path d="M247 256q7-8 15 0l-7 7Z" fill="#D95F62"/>',
            '<path d="M255 263c-2 16-25 17-28 5m28-5c2 16 25 17 29 5" fill="none" stroke="#653B31" stroke-width="3" stroke-linecap="round"/>',
            '<g stroke="#FFF4DA" stroke-width="2" opacity=".9"><path d="M225 261l-47-8m49 17-51 7m106-16 48-10m-46 19 50 5"/></g>',
            '<path d="M201 305c13 11 26 16 41 17m42-17c-12 10-25 15-39 17" fill="none" stroke="#B36529" stroke-width="5" stroke-linecap="round" opacity=".7"/>',
            '<path d="M323 379c36-29 56 25 24 50-13 10-27 4-30-8 21-7 22-27 6-31Z" fill="url(#fur)"/>',
            "</g>"
        );

        return string(abi.encodePacked(body, faceShape, smile));
    }

    function _renderGiftBox(
        uint256 tier,
        bool ready,
        string memory accent
    ) internal pure returns (string memory) {
        string memory scale;
        string memory translate;
        if (tier == 0) {
            scale = ".78";
            translate = "translate(128 99)";
        } else if (tier == 1) {
            scale = ".88";
            translate = "translate(72 57)";
        } else if (tier == 2) {
            scale = "1";
            translate = "translate(0 0)";
        } else {
            scale = "1.08";
            translate = "translate(-46 -28)";
        }

        return
            string(
                abi.encodePacked(
                    '<g transform="',
                    translate,
                    ' scale(',
                    scale,
                    ')" filter="url(#soft)">',
                    _renderGiftBoxLid(ready),
                    _renderGiftBoxBody(ready, accent),
                    "</g>"
                )
            );
    }

    function _renderGiftBoxLid(
        bool ready
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '<g class="',
                    ready ? "lid readyPulse" : "",
                    '">',
                    '<path d="M463 273h245a20 20 0 0 1 20 20v44H443v-44a20 20 0 0 1 20-20Z" fill="url(#gift)" stroke="#FFF0A6" stroke-width="5"/>',
                    '<path d="M585 274c-43-55-91-52-92-16 0 28 45 22 92 16Zm0 0c43-55 91-52 92-16 0 28-45 22-92 16Z" fill="none" stroke="#F6BC27" stroke-width="18" stroke-linecap="round"/>',
                    "</g>"
                )
            );
    }

    function _renderGiftBoxBody(
        bool ready,
        string memory accent
    ) internal pure returns (string memory) {
        bytes memory shell = abi.encodePacked(
            '<rect x="463" y="337" width="245" height="183" rx="18" fill="url(#gift)" stroke="#FFF0A6" stroke-width="5"/>',
            '<path d="M559 273h53v247h-53Z" fill="#E56F23"/>',
            '<rect x="509" y="382" width="153" height="81" rx="18" fill="#101526" stroke="',
            accent,
            '" stroke-width="4"/>'
        );
        bytes memory lock = abi.encodePacked(
            '<path d="M574 410v-9a12 12 0 0 1 24 0v9" fill="none" stroke="',
            accent,
            '" stroke-width="5"/><rect x="565" y="409" width="42" height="34" rx="7" fill="',
            accent,
            '"/><circle cx="586" cy="424" r="5" fill="#101526"/>'
        );
        bytes memory label = abi.encodePacked(
            '<text class="label" x="585" y="489" text-anchor="middle" fill="#6F4218" font-size="14" font-weight="900">',
            ready ? "UNLOCKED" : "BANMAO LOCKED",
            "</text>"
        );

        return string(abi.encodePacked(shell, lock, label));
    }

    function _renderSparkles(
        uint256 tier,
        string memory accent
    ) internal pure returns (string memory) {
        uint256 count = 3 + tier * 3;
        bytes memory output = '<g filter="url(#glow)">';

        for (uint256 i; i < count; ++i) {
            output = abi.encodePacked(
                output,
                _renderSingleSparkle(tier, accent, i)
            );
        }

        return string(abi.encodePacked(output, "</g>"));
    }

    function _renderSingleSparkle(
        uint256 tier,
        string memory accent,
        uint256 index
    ) internal pure returns (string memory) {
        uint256 x = 420 + ((index * 67 + tier * 29) % 337);
        uint256 y = 167 + ((index * 91 + tier * 17) % 360);
        uint256 size = 5 + (index % 4) * 2;

        bytes memory head = abi.encodePacked(
            '<path class="spark" style="animation-delay:-',
            index.toString(),
            ".",
            tier.toString(),
            's" d="M',
            x.toString(),
            " ",
            (y - size).toString(),
            "L",
            (x + size).toString(),
            " ",
            y.toString()
        );
        bytes memory tail = abi.encodePacked(
            " ",
            x.toString(),
            " ",
            (y + size).toString(),
            " ",
            (x - size).toString(),
            " ",
            y.toString(),
            'Z" fill="',
            accent,
            '"/>'
        );

        return string(abi.encodePacked(head, tail));
    }

    function _renderCountdown(
        uint64 unlockTime,
        bool ready,
        string memory accent
    ) internal view returns (string memory) {
        (uint256 daysLeft, uint256 hoursLeft, uint256 minutesLeft, uint256 secondsLeft) = _countdown(
                unlockTime
            );

        bytes memory panel = abi.encodePacked(
            '<g transform="translate(56 548)">',
            '<rect width="688" height="98" rx="22" fill="#0B1020" stroke="',
            accent,
            '" stroke-opacity=".72" stroke-width="2"/>',
            '<text class="label" x="24" y="29" fill="#929BB2" font-size="12">',
            ready ? "LOCK EXPIRED" : "TIME UNTIL UNLOCK",
            "</text>"
        );
        bytes memory firstHalf = abi.encodePacked(
            _countdownCell(24, _pad2(daysLeft), "DAYS", accent),
            _countdownCell(190, _pad2(hoursLeft), "HOURS", accent)
        );
        bytes memory secondHalf = abi.encodePacked(
            _countdownCell(356, _pad2(minutesLeft), "MIN", accent),
            _countdownCell(522, _pad2(secondsLeft), "SEC", accent)
        );

        return
            string(
                abi.encodePacked(panel, firstHalf, secondHalf, "</g>")
            );
    }

    function _countdownCell(
        uint256 x,
        string memory value,
        string memory label,
        string memory accent
    ) internal pure returns (string memory) {
        bytes memory number = abi.encodePacked(
            '<text class="mono" x="',
            x.toString(),
            '" y="72" fill="',
            accent,
            '" font-size="38" font-weight="900">',
            value,
            "</text>"
        );
        bytes memory unit = abi.encodePacked(
            '<text class="label" x="',
            (x + 75).toString(),
            '" y="71" fill="#737D96" font-size="11">',
            label,
            "</text>"
        );

        return string(abi.encodePacked(number, unit));
    }

    function _renderFooter(
        BanmaoBoxRenderData calldata data,
        uint256 tier
    ) internal pure returns (string memory) {
        bytes memory panel = abi.encodePacked(
            '<g transform="translate(56 660)"><rect width="688" height="126" rx="22" fill="#0B1020" stroke="#FFFFFF" stroke-opacity=".10"/>',
            '<text class="label" x="22" y="24" fill="#747E96" font-size="10">',
            _tierName(tier),
            data.assetCount > 1 ? " BASKET" : " GIFT",
            '</text><text class="mono" x="666" y="25" text-anchor="end" fill="#F5F7FB" font-size="15">',
            _formatTokenAmount(data.amount, data.tokenDecimals),
            " ",
            data.tokenSymbol,
            "</text>"
        );
        bytes memory dates = abi.encodePacked(
            '<text class="label" x="22" y="50" fill="#747E96" font-size="9">START DATE</text>',
            '<text class="mono" x="22" y="70" fill="#F5F7FB" font-size="13">',
            _formatDateTime(_createdAt(data)),
            '</text><text class="label" x="356" y="50" fill="#747E96" font-size="9">UNLOCK DATE</text>',
            '<text class="mono" x="356" y="70" fill="#F5F7FB" font-size="13">',
            _formatDateTime(_unlockTime(data)),
            "</text>"
        );
        bytes memory creator = abi.encodePacked(
            '<path d="M22 82H666" stroke="#FFFFFF" stroke-opacity=".08"/>',
            '<text class="label" x="22" y="101" fill="#747E96" font-size="9">CREATOR WALLET</text>',
            '<text class="mono" x="666" y="105" text-anchor="end" fill="#AAB1C5" font-size="13">',
            data.creator.toHexString(),
            "</text></g>"
        );

        return string(abi.encodePacked(panel, dates, creator));
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

    function _countdown(
        uint64 unlockTime
    )
        internal
        view
        returns (
            uint256 daysLeft,
            uint256 hoursLeft,
            uint256 minutesLeft,
            uint256 secondsLeft
        )
    {
        if (block.timestamp >= uint256(unlockTime)) {
            return (0, 0, 0, 0);
        }

        uint256 remaining = uint256(unlockTime) - block.timestamp;
        daysLeft = remaining / 1 days;
        remaining %= 1 days;
        hoursLeft = remaining / 1 hours;
        remaining %= 1 hours;
        minutesLeft = remaining / 1 minutes;
        secondsLeft = remaining % 1 minutes;
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