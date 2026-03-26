// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BanmaoHub
 * @notice Tipping contract for BanmaoHub social platform.
 * Users tip $banmao tokens to content creators with a configurable fee going to treasury.
 */
contract BanmaoHub is Ownable {
    IERC20 public banmaoToken;
    uint256 public feePercent = 200; // 2% = 200/10000 basis points
    address public treasury;

    event Tip(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 fee,
        uint256 postId
    );
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);

    constructor(address _token, address _treasury) Ownable(msg.sender) {
        banmaoToken = IERC20(_token);
        treasury = _treasury;
    }

    /**
     * @notice Tip a creator. Caller must have approved this contract for `amount` tokens.
     * @param creator Address of the content creator
     * @param amount Total amount of $banmao tokens (fee will be deducted)
     * @param postId ID of the post being tipped
     */
    function tip(address creator, uint256 amount, uint256 postId) external {
        require(amount > 0, "Amount must be > 0");
        require(creator != address(0), "Invalid creator");
        require(creator != msg.sender, "Cannot tip yourself");

        uint256 fee = (amount * feePercent) / 10000;
        uint256 creatorAmount = amount - fee;

        // Transfer to creator
        require(
            banmaoToken.transferFrom(msg.sender, creator, creatorAmount),
            "Transfer to creator failed"
        );

        // Transfer fee to treasury
        if (fee > 0) {
            require(
                banmaoToken.transferFrom(msg.sender, treasury, fee),
                "Fee transfer failed"
            );
        }

        emit Tip(msg.sender, creator, creatorAmount, fee, postId);
    }

    /**
     * @notice Update the fee percentage (in basis points, max 10%)
     */
    function setFeePercent(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Max 10%");
        emit FeeUpdated(feePercent, _fee);
        feePercent = _fee;
    }

    /**
     * @notice Update the treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }
}
