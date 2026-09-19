// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @notice Stable cosmetic code selection; not security-sensitive randomness.
library BanmaoKingLaptopCode {
    function render(uint256 tokenId) internal pure returns (string memory) {
        uint256 variant = uint256(keccak256(abi.encodePacked("developer-laptop-v1", tokenId))) % 4;
        string memory call_ = variant == 0 ? "const nft=mint(id);" : variant == 1 ? "const ok=verify(id);" : variant == 2 ? "const app=deploy(id);" : "const pkg=build(id);";
        string memory end = variant == 0 ? "show(nft);" : variant == 1 ? "assert(ok);" : variant == 2 ? "run(app);" : "ship(pkg);";
        return string.concat(
            '<g data-laptop-screen="code" font-family="monospace" font-size="5.5" font-weight="500">',
            _line(string.concat('const id=', Strings.toString(tokenId), ';'), 0),
            _line(call_, 1), _line(end, 2), '</g>'
        );
    }

    function _line(string memory code, uint8 row) private pure returns (string memory) {
        return string.concat(
            '<text data-laptop-code="true" x="226" y="', row == 0 ? '353' : row == 1 ? '363' : '373',
            '" fill="', row == 0 ? '#b9a3e8' : row == 1 ? '#67dceb' : '#60efc4',
            '" opacity=".85"', bytes(code).length > 25 ? ' textLength="84" lengthAdjust="spacingAndGlyphs"' : '', '>', code,
            '<animate attributeName="opacity" values="', row == 0 ? '.2;.95;.95;.2' : '.2;.2;.95;.95;.2',
            '" keyTimes="', row == 0 ? '0;.12;.9;1' : row == 1 ? '0;.12;.28;.9;1' : '0;.28;.44;.9;1',
            '" dur="6s" repeatCount="indefinite"/></text>'
        );
    }
}
