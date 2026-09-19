// SPDX-License-Identifier: MIT
// Author: haivcon
// Telegram: t.me/haivcon | X: x.com/haivcon | GitHub: github.com/haivcon
// All for the advancement of Web3.
pragma solidity ^0.8.30;
import {BanmaoKingRoyalLib} from "./BanmaoKingRoyalLib.sol";

contract BanmaoKingRoyalAccessory {
    function renderRear() external pure returns (string memory) {
        return BanmaoKingRoyalLib.REAR;
    }
    function render() external pure returns (string memory) {
        return BanmaoKingRoyalLib.REGALIA;
    }
}
