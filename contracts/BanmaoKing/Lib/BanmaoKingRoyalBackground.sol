// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {BanmaoKingRoyalLib} from "./BanmaoKingRoyalLib.sol";

// Separate runtime keeps the expanded background catalogue below EIP-170.
contract BanmaoKingRoyalBackground {
    function render() external pure returns (string memory) {
        return BanmaoKingRoyalLib.THRONE;
    }
}
