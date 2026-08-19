// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title LiquidityLocker
 * @notice Permanently locks Uniswap V4 LP position NFTs.
 *         There is NO withdraw function — LP is locked forever (anti-rug guarantee).
 *
 * @dev Deployment:
 *      1. Deploy LiquidityLocker(positionManager)
 *      2. Deploy BanmaoLaunchpad(..., liquidityLocker)
 *      3. Call liquidityLocker.setLaunchpad(launchpadAddress)
 *      This solves the circular dependency (both need each other's address).
 */
contract LiquidityLocker {
    /// @notice The Uniswap V4 PositionManager (only accepted NFT contract)
    address public immutable positionManager;

    /// @notice Deployer — only address that can call setLaunchpad()
    address public immutable deployer;

    /// @notice The BanmaoLaunchpad contract (set-once to solve circular deploy)
    address public launchpad;

    /// @notice Maps LP position NFT tokenId → the graduated meme token address
    mapping(uint256 => address) public positionToToken;

    /// @notice Tokens expected to be locked (whitelist set by launchpad before migration)
    mapping(address => bool) public expectedToken;

    /// @notice All locked position IDs (for UI enumeration)
    uint256[] public lockedPositions;

    // ============ EVENTS ============

    event LaunchpadSet(address indexed launchpad);
    event LiquidityLocked(
        address indexed tokenAddress,
        uint256 indexed positionTokenId,
        uint256 timestamp
    );

    // ============ CONSTRUCTOR ============

    /// @param _positionManager Uniswap V4 PositionManager address
    constructor(address _positionManager) {
        require(_positionManager != address(0), "Invalid positionManager");
        positionManager = _positionManager;
        deployer = msg.sender;
    }

    // ============ SET-ONCE LAUNCHPAD ============

    /**
     * @notice Set the launchpad address (one-time only).
     *         Solves the circular dependency: Locker needs Launchpad, Launchpad needs Locker.
     * @param _launchpad The BanmaoLaunchpad contract address
     */
    function setLaunchpad(address _launchpad) external {
        require(msg.sender == deployer, "Only deployer");
        require(launchpad == address(0), "Launchpad already set");
        require(_launchpad != address(0), "Invalid address");
        require(_launchpad.code.length > 0, "Not a contract");
        launchpad = _launchpad;
        emit LaunchpadSet(_launchpad);
    }

    // ============ WHITELIST (called by launchpad before migration) ============

    /**
     * @notice Register a meme token as expected for LP locking.
     *         Called by launchpad right before migration to prevent spam.
     */
    function expectLock(address memeToken) external {
        require(msg.sender == launchpad, "Only launchpad");
        require(memeToken != address(0), "Invalid token");
        expectedToken[memeToken] = true;
    }

    // ============ ERC721 RECEIVER ============

    /**
     * @notice Called when an ERC721 token is transferred to this contract.
     *         Accepts NFTs from PositionManager via direct mint (from=address(0))
     *         or transfer from launchpad (from=launchpad).
     * @param from address(0) for mints, launchpad for transfers
     * @param tokenId The NFT token ID (Uniswap V4 position)
     * @param data ABI-encoded meme token address: abi.encode(memeTokenAddress)
     */
    function onERC721Received(
        address, /* operator */
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        require(msg.sender == positionManager, "Only PositionManager NFTs");
        // Accept direct mints (from=0) or transfers from launchpad
        require(from == address(0) || from == launchpad, "Invalid NFT source");

        // Require valid meme token data — reject unmapped NFTs
        require(data.length >= 32, "Missing meme token data");
        address memeToken = abi.decode(data, (address));
        require(expectedToken[memeToken], "Token not expected");
        require(positionToToken[tokenId] == address(0), "Position already locked");

        positionToToken[tokenId] = memeToken;
        expectedToken[memeToken] = false; // one-time use
        lockedPositions.push(tokenId);

        emit LiquidityLocked(memeToken, tokenId, block.timestamp);
        return this.onERC721Received.selector;
    }

    // ============ VIEW FUNCTIONS ============

    /// @notice Total number of locked LP positions
    function totalLockedPositions() external view returns (uint256) {
        return lockedPositions.length;
    }

    // ============================================================
    // NO WITHDRAW FUNCTION — LP IS PERMANENTLY LOCKED
    // This is the core anti-rug guarantee for graduated tokens.
    // ============================================================
}
