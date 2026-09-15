// SPDX-License-Identifier: MIT
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
