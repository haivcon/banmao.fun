// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor() ERC20("BANMAO Test", "BANMAO") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract FeeOnTransferToken is ERC20 {
    uint256 public feeBp;
    uint256 private constant BP = 10000;

    constructor(uint256 _feeBp) ERC20("Fee BANMAO Test", "fBANMAO") {
        require(_feeBp <= 2000, "Fee too high");
        feeBp = _feeBp;
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && feeBp > 0) {
            uint256 fee = (value * feeBp) / BP;
            uint256 net = value - fee;
            if (fee > 0) super._update(from, address(0), fee);
            super._update(from, to, net);
            return;
        }

        super._update(from, to, value);
    }
}
