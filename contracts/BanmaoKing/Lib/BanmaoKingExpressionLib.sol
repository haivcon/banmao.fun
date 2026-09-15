// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {BanmaoKingExpressionExpansion} from "./BanmaoKingExpressionExpansion.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IBanmaoKingExpressionLib} from "../IBanmaoKingRenderer.sol";

import {BanmaoKingExpressionPart0, BanmaoKingExpressionPart1, BanmaoKingExpressionPart2} from "./BanmaoKingExpressionParts.sol";
/// @notice Stateless, permanently deployed face-expression catalogue.
contract BanmaoKingExpressionLib is IBanmaoKingExpressionLib {
    BanmaoKingExpressionExpansion public immutable expansion = new BanmaoKingExpressionExpansion();
    error InvalidExpression(uint8 traitId);

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId || interfaceId == type(IBanmaoKingExpressionLib).interfaceId;
    }

    function traitName(uint8 id) external view returns (string memory) {
        if (id >= 12) return expansion.traitName(id);
        if (id == 0) return "Happy Smile";
        if (id == 1) return "Joy";
        if (id == 2) return "Wink";
        if (id == 3) return "Love Eyes";
        if (id == 4) return "Sleepy";
        if (id == 5) return "Surprised";
        if (id == 6) return "Determined";
        if (id == 7) return "Teary";
        if (id == 8) return "Silly";
        if (id == 9) return "Cool Gaze";
        if (id == 10) return "Starstruck";
        if (id == 11) return "Zen";
        revert InvalidExpression(id);
    }

    BanmaoKingExpressionPart0 public immutable part0;
    BanmaoKingExpressionPart1 public immutable part1;
    BanmaoKingExpressionPart2 public immutable part2;
    error InvalidPart(address part);
    constructor(address p0, address p1, address p2) {
        if (p0.code.length == 0) revert InvalidPart(p0);
        part0 = BanmaoKingExpressionPart0(p0);
        if (p1.code.length == 0) revert InvalidPart(p1);
        part1 = BanmaoKingExpressionPart1(p1);
        if (p2.code.length == 0) revert InvalidPart(p2);
        part2 = BanmaoKingExpressionPart2(p2);
    }
    function render(uint8 id) external view returns(string memory) {
        if (id >= 12) return expansion.render(id);
        if (id < 4) return part0.render(id);
        if (id < 8) return part1.render(id);
        if (id < 12) return part2.render(id);
        revert InvalidExpression(id);
    }
}
