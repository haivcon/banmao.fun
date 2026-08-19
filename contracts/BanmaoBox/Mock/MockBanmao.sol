// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockBanmao
 * @notice Test-only ERC-20 for X Layer testnet BanmaoBox deployments.
 * @dev The complete fixed supply is minted to the deployer. Do not use as a
 *      production token or imply that it is the canonical BANMAO token.
 */
contract MockBanmao is ERC20 {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 ether;

    constructor() ERC20("Mock BANMAO", "BANMAO") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
