// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title BanmaoAirdrop
 * @notice Gas-efficient batch token transfer contract for $BANMAO airdrops on XLayer
 * @dev Users must approve this contract to spend their tokens before calling batch functions.
 *      No admin functions, no fees, no ownership — pure utility contract.
 *
 * Security features:
 *  - Reentrancy guard on all public functions
 *  - Pre-flight checks: allowance + balance verified before transfer loop
 *  - MAX_BATCH_SIZE prevents block gas limit exhaustion
 *  - Rejects accidental native token (OKB) sends
 */
contract BanmaoAirdrop {
    /// @notice Maximum recipients per single batch call (prevents block gas limit issues)
    uint256 public constant MAX_BATCH_SIZE = 200;

    /// @dev Simple reentrancy lock
    uint256 private _locked = 1;
    modifier nonReentrant() {
        require(_locked == 1, "ReentrancyGuard: reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    /// @notice Emitted for each successful batch airdrop
    event BatchAirdrop(
        address indexed sender,
        address indexed token,
        uint256 recipientCount,
        uint256 totalAmount
    );

    /// @notice Emitted when a single transfer within a batch fails (partial success mode)
    event TransferSkipped(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        string reason
    );

    /// @dev Reject accidental native token (OKB) sends
    receive() external payable {
        revert("No OKB accepted");
    }

    fallback() external payable {
        revert("No OKB accepted");
    }

    /**
     * @notice Transfer different amounts of an ERC20 token to multiple recipients
     * @param token The ERC20 token contract address
     * @param recipients Array of recipient wallet addresses
     * @param amounts Array of token amounts (must match recipients length)
     */
    function batchTransfer(
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external nonReentrant {
        require(recipients.length == amounts.length, "Length mismatch");
        require(recipients.length > 0, "Empty recipients");
        require(recipients.length <= MAX_BATCH_SIZE, "Exceeds max batch size");

        IERC20 erc20 = IERC20(token);

        // Pre-flight: calculate total and verify allowance + balance
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            totalAmount += amounts[i];
        }
        require(erc20.allowance(msg.sender, address(this)) >= totalAmount, "Insufficient allowance");
        require(erc20.balanceOf(msg.sender) >= totalAmount, "Insufficient balance");

        uint256 successCount = 0;
        uint256 actualTotal = 0;

        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0) || amounts[i] == 0) {
                emit TransferSkipped(msg.sender, recipients[i], amounts[i], "Invalid");
                continue;
            }
            bool ok = erc20.transferFrom(msg.sender, recipients[i], amounts[i]);
            if (ok) {
                successCount++;
                actualTotal += amounts[i];
            } else {
                emit TransferSkipped(msg.sender, recipients[i], amounts[i], "Failed");
            }
        }

        require(successCount > 0, "All transfers failed");
        emit BatchAirdrop(msg.sender, token, successCount, actualTotal);
    }

    /**
     * @notice Transfer equal amount of an ERC20 token to multiple recipients (more gas efficient)
     * @param token The ERC20 token contract address
     * @param recipients Array of recipient wallet addresses
     * @param amount Token amount to send to each recipient
     */
    function batchTransferEqual(
        address token,
        address[] calldata recipients,
        uint256 amount
    ) external nonReentrant {
        require(recipients.length > 0, "Empty recipients");
        require(recipients.length <= MAX_BATCH_SIZE, "Exceeds max batch size");
        require(amount > 0, "Zero amount");

        IERC20 erc20 = IERC20(token);
        uint256 totalAmount = amount * recipients.length;

        // Pre-flight: verify allowance + balance
        require(erc20.allowance(msg.sender, address(this)) >= totalAmount, "Insufficient allowance");
        require(erc20.balanceOf(msg.sender) >= totalAmount, "Insufficient balance");

        uint256 successCount = 0;

        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) {
                emit TransferSkipped(msg.sender, recipients[i], amount, "Zero address");
                continue;
            }
            bool ok = erc20.transferFrom(msg.sender, recipients[i], amount);
            if (ok) {
                successCount++;
            } else {
                emit TransferSkipped(msg.sender, recipients[i], amount, "Failed");
            }
        }

        require(successCount > 0, "All transfers failed");
        emit BatchAirdrop(msg.sender, token, successCount, amount * successCount);
    }

    /**
     * @notice Check if caller has sufficient allowance and balance for a batch transfer
     * @param token The ERC20 token address
     * @param sender The sender address to check
     * @param totalAmount Total amount needed
     * @return hasAllowance Whether allowance is sufficient
     * @return hasBalance Whether balance is sufficient
     * @return currentAllowance Current allowance amount
     * @return currentBalance Current balance amount
     */
    function checkReady(
        address token,
        address sender,
        uint256 totalAmount
    ) external view returns (
        bool hasAllowance,
        bool hasBalance,
        uint256 currentAllowance,
        uint256 currentBalance
    ) {
        IERC20 erc20 = IERC20(token);
        currentAllowance = erc20.allowance(sender, address(this));
        currentBalance = erc20.balanceOf(sender);
        hasAllowance = currentAllowance >= totalAmount;
        hasBalance = currentBalance >= totalAmount;
    }
}
