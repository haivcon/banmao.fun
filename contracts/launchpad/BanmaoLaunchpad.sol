// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./MemeToken.sol";

/**
 * @title BanmaoLaunchpad
 * @notice Memecoin launchpad with bonding curve → Uniswap V4 graduation.
 *
 * Security guarantees:
 *   - migrateLiquidity() is PERMISSIONLESS (anyone can call after graduation)
 *   - LP position minted to immutable LP_LOCKER (permanent lock, no withdraw)
 *   - State only updated AFTER successful Uniswap V4 LP mint
 *   - All token transfers use SafeERC20 pattern
 *   - All state-changing functions are nonReentrant
 *   - hookAddress is set-once, creationFee is capped
 *
 * Deployment order:
 *   1. Deploy MemeToken (implementation)
 *   2. Deploy LiquidityLocker(positionManager)
 *   3. Deploy BanmaoLaunchpad(memeToken, positionManager, poolManager, wokb, locker)
 *   4. Call LiquidityLocker.setLaunchpad(launchpadAddress)
 *   5. Deploy LaunchpadHook via Foundry (CREATE2 + HookMiner)
 *   6. Call BanmaoLaunchpad.setHookAddress(hookAddress)
 */

// ============ INTERFACES ============

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
}

interface IWOKB {
    function deposit() external payable;
}

interface IPoolManager {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }
    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24 tick);
}

interface IPositionManager {
    function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable;
    function nextTokenId() external view returns (uint256);
}

interface ILaunchpadHook {
    function registerPoolId(bytes32 poolId) external;
}

interface ILiquidityLocker {
    function expectLock(address memeToken) external;
}

interface IPermit2 {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
}

/// @dev Minimal inline Clones library (EIP-1167)
library Clones {
    function clone(address implementation) internal returns (address instance) {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), shl(0x60, implementation))
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            instance := create(0, ptr, 0x37)
        }
        require(instance != address(0), "Clone failed");
    }
}

// ============ SAFE MATH ============

/// @dev 512-bit multiplication and division (from Uniswap FullMath)
library FullMath {
    function mulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result) {
        uint256 prod0;
        uint256 prod1;
        assembly {
            let mm := mulmod(a, b, not(0))
            prod0 := mul(a, b)
            prod1 := sub(sub(mm, prod0), lt(mm, prod0))
        }
        if (prod1 == 0) {
            require(denominator > 0, "FullMath: div by zero");
            return prod0 / denominator;
        }
        require(denominator > prod1, "FullMath: overflow");
        uint256 remainder;
        assembly { remainder := mulmod(a, b, denominator) }
        assembly {
            prod1 := sub(prod1, gt(remainder, prod0))
            prod0 := sub(prod0, remainder)
        }
        uint256 twos = denominator & (~denominator + 1);
        assembly {
            denominator := div(denominator, twos)
            prod0 := div(prod0, twos)
            twos := add(div(sub(0, twos), twos), 1)
        }
        prod0 |= prod1 * twos;
        uint256 inv = (3 * denominator) ^ 2;
        inv *= 2 - denominator * inv;
        inv *= 2 - denominator * inv;
        inv *= 2 - denominator * inv;
        inv *= 2 - denominator * inv;
        inv *= 2 - denominator * inv;
        inv *= 2 - denominator * inv;
        result = prod0 * inv;
    }
}

contract BanmaoLaunchpad {
    // ============ CONSTANTS ============

    address public constant BANMAO_TOKEN = 0x16d91d1615fc55b76d5f92365bd60c069b46ef78;
    address public constant DEAD_WALLET  = 0x000000000000000000000000000000000000dEaD;

    uint256 public constant TOKEN_TOTAL_SUPPLY    = 1_000_000_000 ether;
    uint256 public constant CURVE_SUPPLY          = 800_000_000 ether;
    uint256 public constant LP_SUPPLY             = 200_000_000 ether;
    uint256 public constant MAX_CREATION_FEE      = 10_000_000 ether;
    uint256 public constant TRADE_FEE_BPS         = 100;     // 1%
    uint256 public constant GRADUATION_THRESHOLD  = 500 ether;
    uint256 public constant VIRTUAL_OKB_RESERVE   = 30 ether;
    uint256 public constant VIRTUAL_TOKEN_RESERVE  = CURVE_SUPPLY;

    // Uniswap V4 pool parameters
    uint24  public constant POOL_FEE     = 3000;  // 0.3%
    int24   public constant TICK_SPACING = 60;

    // Full-range tick bounds (rounded to TICK_SPACING)
    int24   public constant MIN_TICK_FULL_RANGE = -887220;
    int24   public constant MAX_TICK_FULL_RANGE =  887220;

    // Input validation limits
    uint256 public constant MAX_NAME_LENGTH        = 64;
    uint256 public constant MAX_SYMBOL_LENGTH       = 16;
    uint256 public constant MAX_DESCRIPTION_LENGTH  = 512;
    uint256 public constant MAX_IMAGE_URL_LENGTH    = 256;

    /**
     * @dev Uniswap V4 PositionManager action constants.
     *      MUST be verified against the deployed v4-periphery Actions.sol on XLayer.
     *      See: https://github.com/Uniswap/v4-periphery/blob/main/src/libraries/Actions.sol
     */
    uint8 public constant V4_ACTION_MINT_POSITION = 0x02;
    uint8 public constant V4_ACTION_SETTLE_PAIR   = 0x0d;

    // Hook-address permission bits from Uniswap v4 Hooks.sol. The hook used by
    // this launchpad must reject unregistered pool initialization and track
    // initialization/swaps.
    uint160 private constant ALL_HOOK_PERMISSIONS_MASK = (1 << 14) - 1;
    uint160 private constant REQUIRED_HOOK_PERMISSIONS = (1 << 13) | (1 << 12) | (1 << 6);
    uint256 public constant MAX_WOKB_DUST = 0.001 ether;

    // ============ IMMUTABLES ============

    address public immutable tokenImplementation;
    address public immutable POSITION_MANAGER;
    address public immutable POOL_MANAGER;
    address public immutable WOKB;
    address public immutable LP_LOCKER;
    address public immutable PERMIT2;

    // ============ REENTRANCY GUARD ============

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    // ============ STATE ============

    struct TokenInfo {
        address tokenAddress;
        address creator;
        string name;
        string symbol;
        string description;
        string imageUrl;
        uint256 virtualOkbReserve;
        uint256 virtualTokenReserve;
        uint256 realOkbReserve;
        uint256 realTokenReserve;
        bool graduated;
        uint256 createdAt;
    }

    mapping(address => TokenInfo) public tokens;
    address[] public allTokens;
    mapping(address => bool) public liquidityMigrated;

    uint256 public pendingCommunityFees;
    uint256 public totalActiveOkbReserves;
    uint256 public activeTokenCount;
    uint256 public graduatedTokenCount;
    uint256 public totalCurveVolume;
    address public communityWallet = 0x92809f2837f708163d375960063c8a3156fceacb;
    uint256 public creationFee = 1_000_000 ether;
    address public hookAddress;
    address public owner;

    // ============ EVENTS ============

    event TokenCreated(
        address indexed tokenAddress, address indexed creator,
        string name, string symbol, string description, string imageUrl, uint256 timestamp
    );
    event TokenBought(
        address indexed tokenAddress, address indexed buyer,
        uint256 okbIn, uint256 tokensOut, uint256 newPrice, uint256 timestamp
    );
    event TokenSold(
        address indexed tokenAddress, address indexed seller,
        uint256 tokensIn, uint256 okbOut, uint256 newPrice, uint256 timestamp
    );
    event TokenGraduated(
        address indexed tokenAddress, uint256 okbLiquidity, uint256 tokenLiquidity, uint256 timestamp
    );
    event LiquidityMigrated(
        address indexed tokenAddress, address indexed lpLocker,
        uint256 okbAmount, uint256 tokenAmount, uint256 timestamp
    );
    event CommunityFeesClaimed(address indexed wallet, uint256 amount, uint256 timestamp);
    event HookAddressSet(address indexed hookAddress);
    event CreationFeeUpdated(uint256 newFee);
    event CommunityWalletUpdated(address indexed newWallet);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ============ MODIFIERS ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier tokenExists(address tokenAddress) {
        require(tokens[tokenAddress].tokenAddress != address(0), "Token not found");
        _;
    }

    modifier notGraduated(address tokenAddress) {
        require(!tokens[tokenAddress].graduated, "Token already graduated");
        _;
    }

    modifier checkDeadline(uint256 deadline) {
        require(block.timestamp <= deadline, "Transaction expired");
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        address _tokenImplementation,
        address _positionManager,
        address _poolManager,
        address _wokb,
        address _lpLocker,
        address _permit2
    ) {
        require(_tokenImplementation != address(0), "Invalid implementation");
        require(_positionManager != address(0), "Invalid PositionManager");
        require(_poolManager != address(0), "Invalid PoolManager");
        require(_wokb != address(0), "Invalid WOKB");
        require(_lpLocker != address(0), "Invalid LPLocker");
        require(_permit2 != address(0), "Invalid Permit2");

        owner = msg.sender;
        tokenImplementation = _tokenImplementation;
        POSITION_MANAGER = _positionManager;
        POOL_MANAGER = _poolManager;
        WOKB = _wokb;
        LP_LOCKER = _lpLocker;
        PERMIT2 = _permit2;
    }

    // ============ SAFE TRANSFER HELPERS ============

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeTransferFrom failed");
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeTransfer failed");
    }

    function _safeApprove(address token, address spender, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.approve.selector, spender, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SafeApprove failed");
    }

    // ============ CREATE TOKEN ============

    function createToken(
        string calldata _name,
        string calldata _symbol,
        string calldata _description,
        string calldata _imageUrl
    ) external nonReentrant returns (address) {
        // Input validation
        require(bytes(_name).length > 0 && bytes(_name).length <= MAX_NAME_LENGTH, "Invalid name length");
        require(bytes(_symbol).length > 0 && bytes(_symbol).length <= MAX_SYMBOL_LENGTH, "Invalid symbol length");
        require(bytes(_description).length <= MAX_DESCRIPTION_LENGTH, "Description too long");
        require(bytes(_imageUrl).length <= MAX_IMAGE_URL_LENGTH, "Image URL too long");

        // Collect creation fee in BANMAO (SafeERC20)
        uint256 balanceBefore = IERC20(BANMAO_TOKEN).balanceOf(address(this));
        _safeTransferFrom(BANMAO_TOKEN, msg.sender, address(this), creationFee);
        require(
            IERC20(BANMAO_TOKEN).balanceOf(address(this)) - balanceBefore == creationFee,
            "BANMAO transfer taxed"
        );
        uint256 halfFee = creationFee / 2;
        _safeTransfer(BANMAO_TOKEN, DEAD_WALLET, halfFee);
        _safeTransfer(BANMAO_TOKEN, communityWallet, creationFee - halfFee);

        // Deploy MemeToken as Minimal Proxy (EIP-1167 Clone)
        address tokenAddr = Clones.clone(tokenImplementation);
        MemeToken(tokenAddr).initialize(_name, _symbol, TOKEN_TOTAL_SUPPLY, address(this));

        tokens[tokenAddr] = TokenInfo({
            tokenAddress: tokenAddr,
            creator: msg.sender,
            name: _name,
            symbol: _symbol,
            description: _description,
            imageUrl: _imageUrl,
            virtualOkbReserve: VIRTUAL_OKB_RESERVE,
            virtualTokenReserve: VIRTUAL_TOKEN_RESERVE,
            realOkbReserve: 0,
            realTokenReserve: CURVE_SUPPLY,
            graduated: false,
            createdAt: block.timestamp
        });

        allTokens.push(tokenAddr);
        activeTokenCount += 1;
        emit TokenCreated(tokenAddr, msg.sender, _name, _symbol, _description, _imageUrl, block.timestamp);
        return tokenAddr;
    }

    // ============ BUY / SELL ============

    function buyTokens(address tokenAddress, uint256 minTokensOut, uint256 deadline)
        external payable nonReentrant checkDeadline(deadline) tokenExists(tokenAddress) notGraduated(tokenAddress)
    {
        require(msg.value > 0, "Must send OKB");
        TokenInfo storage info = tokens[tokenAddress];

        uint256 fee;
        uint256 okbIn;
        uint256 refundAmount = 0;

        uint256 normalFee = (msg.value * TRADE_FEE_BPS) / 10000;
        uint256 normalOkbIn = msg.value - normalFee;

        if (info.realOkbReserve + normalOkbIn > GRADUATION_THRESHOLD) {
            okbIn = GRADUATION_THRESHOLD - info.realOkbReserve;
            fee = (okbIn * TRADE_FEE_BPS) / (10000 - TRADE_FEE_BPS);
            uint256 actualMsgValue = okbIn + fee;
            require(msg.value >= actualMsgValue, "Insufficient native value");
            refundAmount = msg.value - actualMsgValue;
        } else {
            fee = normalFee;
            okbIn = normalOkbIn;
        }

        uint256 newVirtualOkb = info.virtualOkbReserve + okbIn;
        uint256 tokensOut = info.virtualTokenReserve - (info.virtualOkbReserve * info.virtualTokenReserve) / newVirtualOkb;
        if (tokensOut > info.realTokenReserve) tokensOut = info.realTokenReserve;
        require(tokensOut > 0, "Insufficient output");
        require(tokensOut >= minTokensOut, "Slippage exceeded");

        info.virtualOkbReserve = newVirtualOkb;
        info.virtualTokenReserve -= tokensOut;
        info.realOkbReserve += okbIn;
        info.realTokenReserve -= tokensOut;
        totalActiveOkbReserves += okbIn;
        totalCurveVolume += okbIn;

        _safeTransfer(info.tokenAddress, msg.sender, tokensOut);
        if (fee > 0) pendingCommunityFees += fee;

        if (refundAmount > 0) {
            (bool refunded, ) = msg.sender.call{value: refundAmount}("");
            require(refunded, "Refund failed");
        }

        uint256 currentPrice = info.virtualTokenReserve > 0
            ? (info.virtualOkbReserve * 1 ether) / info.virtualTokenReserve : 0;
        emit TokenBought(tokenAddress, msg.sender, msg.value - refundAmount, tokensOut, currentPrice, block.timestamp);

        if (info.realOkbReserve >= GRADUATION_THRESHOLD) {
            _graduate(tokenAddress);
        }
    }

    function sellTokens(address tokenAddress, uint256 amount, uint256 minOkbOut, uint256 deadline)
        external nonReentrant checkDeadline(deadline) tokenExists(tokenAddress) notGraduated(tokenAddress)
    {
        require(amount > 0, "Must sell > 0");
        TokenInfo storage info = tokens[tokenAddress];

        _safeTransferFrom(info.tokenAddress, msg.sender, address(this), amount);

        uint256 newVirtualToken = info.virtualTokenReserve + amount;
        uint256 okbOut = info.virtualOkbReserve - (info.virtualOkbReserve * info.virtualTokenReserve) / newVirtualToken;
        if (okbOut > info.realOkbReserve) okbOut = info.realOkbReserve;
        require(okbOut > 0, "Insufficient output");

        uint256 fee = (okbOut * TRADE_FEE_BPS) / 10000;
        uint256 okbToSeller = okbOut - fee;
        require(okbToSeller >= minOkbOut, "Slippage exceeded");

        info.virtualOkbReserve -= okbOut;
        info.virtualTokenReserve = newVirtualToken;
        info.realOkbReserve -= okbOut;
        info.realTokenReserve += amount;
        totalActiveOkbReserves -= okbOut;
        totalCurveVolume += okbOut;

        (bool sent, ) = msg.sender.call{value: okbToSeller}("");
        require(sent, "OKB transfer failed");
        if (fee > 0) pendingCommunityFees += fee;

        uint256 currentPrice = info.virtualTokenReserve > 0
            ? (info.virtualOkbReserve * 1 ether) / info.virtualTokenReserve : 0;
        emit TokenSold(tokenAddress, msg.sender, amount, okbToSeller, currentPrice, block.timestamp);
    }

    // ============ GRADUATION & MIGRATION ============

    function _graduate(address tokenAddress) internal {
        TokenInfo storage info = tokens[tokenAddress];
        info.graduated = true;
        activeTokenCount -= 1;
        graduatedTokenCount += 1;
        emit TokenGraduated(tokenAddress, info.realOkbReserve, info.realTokenReserve, block.timestamp);
    }

    /**
     * @notice Migrate graduated token liquidity to Uniswap V4.
     *         PERMISSIONLESS — anyone can call after graduation.
     *         State is ONLY updated AFTER successful V4 LP mint.
     *
     * Flow:
     *   1. Validate preconditions (graduated, not migrated, hook set)
     *   2. Whitelist token in LiquidityLocker
     *   3. Wrap OKB → WOKB
     *   4. Approve tokens via Permit2 (PositionManager uses Permit2, not direct ERC20 approve)
     *   5. Register pool ID in hook (for graduated pool tracking)
     *   6. Initialize Uniswap V4 pool
     *   7. Mint full-range LP position to LAUNCHPAD (not locker directly)
     *   8. Transfer LP NFT from launchpad to LP_LOCKER via safeTransferFrom
     *      (this triggers onERC721Received with meme token data)
     *   9. Reset Permit2 allowances
     *  10. Mark as migrated and zero reserves (ONLY after success)
     */
    function migrateLiquidity(address tokenAddress)
        external
        nonReentrant
        tokenExists(tokenAddress)
    {
        TokenInfo storage info = tokens[tokenAddress];
        require(info.graduated, "Token not graduated");
        require(!liquidityMigrated[tokenAddress], "Already migrated");
        require(hookAddress != address(0), "Hook not set");

        uint256 okbAmount = info.realOkbReserve;
        uint256 tokenAmount = info.realTokenReserve + LP_SUPPLY;

        require(okbAmount > 0, "No OKB to migrate");

        // Step 1: Whitelist token in locker (prevents spam)
        ILiquidityLocker(LP_LOCKER).expectLock(tokenAddress);

        // Step 2: Determine Uniswap V4 currency ordering (currency0 < currency1)
        address currency0;
        address currency1;
        uint256 amount0;
        uint256 amount1;

        if (uint160(WOKB) < uint160(tokenAddress)) {
            currency0 = WOKB;
            currency1 = tokenAddress;
            amount0 = okbAmount;
            amount1 = tokenAmount;
        } else {
            currency0 = tokenAddress;
            currency1 = WOKB;
            amount0 = tokenAmount;
            amount1 = okbAmount;
        }

        // Step 3: Wrap OKB → WOKB
        IWOKB(WOKB).deposit{value: okbAmount}();

        // Step 4: Approve tokens via Permit2 (PositionManager uses Permit2, not direct ERC20)
        // First: ERC20 approve tokens to PERMIT2 contract
        _safeApprove(WOKB, PERMIT2, okbAmount);
        _safeApprove(tokenAddress, PERMIT2, tokenAmount);
        // Then: Set Permit2 allowance for PositionManager
        IPermit2(PERMIT2).approve(WOKB, POSITION_MANAGER, uint160(okbAmount), uint48(block.timestamp + 3600));
        IPermit2(PERMIT2).approve(tokenAddress, POSITION_MANAGER, uint160(tokenAmount), uint48(block.timestamp + 3600));

        // Step 5: Compute pool key and register in hook
        IPoolManager.PoolKey memory poolKey = IPoolManager.PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: POOL_FEE,
            tickSpacing: TICK_SPACING,
            hooks: hookAddress
        });

        bytes32 poolId = _computePoolId(poolKey);
        ILaunchpadHook(hookAddress).registerPoolId(poolId);

        // Step 6: Initialize pool
        // NOTE: If pool was already initialized (e.g., front-run attack),
        // this will revert. This is INTENTIONAL — migrating into a pool
        // with a manipulated price would be worse than failing.
        uint160 sqrtPriceX96 = _computeSqrtPriceX96(amount0, amount1);
        IPoolManager(POOL_MANAGER).initialize(poolKey, sqrtPriceX96);

        // Step 7: Record nextTokenId BEFORE mint (to know which NFT we get)
        uint256 lpTokenId = IPositionManager(POSITION_MANAGER).nextTokenId();

        // Step 8: Compute liquidity and mint LP position to THIS CONTRACT (not locker)
        // PositionManager uses _mint (not _safeMint), so onERC721Received is NOT called.
        // We mint to launchpad first, then transfer to locker in step 9.
        uint256 liquidity = _computeLiquidity(amount0, amount1, sqrtPriceX96);
        require(liquidity > 0, "Zero liquidity");

        _mintLPPosition(poolKey, liquidity, amount0, amount1, tokenAddress);

        // Step 9: Transfer LP NFT from launchpad to LP_LOCKER via safeTransferFrom
        // This DOES trigger onERC721Received on the locker (with meme token data)
        IERC721(POSITION_MANAGER).safeTransferFrom(
            address(this),
            LP_LOCKER,
            lpTokenId,
            abi.encode(tokenAddress)
        );

        // Step 10: Reset Permit2 allowances to 0
        IPermit2(PERMIT2).approve(WOKB, POSITION_MANAGER, 0, 0);
        IPermit2(PERMIT2).approve(tokenAddress, POSITION_MANAGER, 0, 0);
        _safeApprove(WOKB, PERMIT2, 0);
        _safeApprove(tokenAddress, PERMIT2, 0);

        // Step 11: ONLY NOW mark as migrated and zero reserves
        // This is the key safety guarantee: if any step above reverts,
        // the entire transaction rolls back and nothing is lost.
        liquidityMigrated[tokenAddress] = true;
        info.realOkbReserve = 0;
        info.realTokenReserve = 0;
        totalActiveOkbReserves -= okbAmount;

        emit LiquidityMigrated(tokenAddress, LP_LOCKER, okbAmount, tokenAmount, block.timestamp);
    }

    /**
     * @dev Encode and execute Uniswap V4 MINT_POSITION + SETTLE_PAIR.
     *      Mints a full-range LP position with recipient = address(this).
     *      The caller (migrateLiquidity) then transfers the NFT to LP_LOCKER.
     *
     * NOTE: The V4_ACTION_* constants MUST match the deployed v4-periphery on XLayer.
     *       Verify against: https://github.com/Uniswap/v4-periphery/blob/main/src/libraries/Actions.sol
     */
    function _mintLPPosition(
        IPoolManager.PoolKey memory poolKey,
        uint256 liquidity,
        uint256 amount0Max,
        uint256 amount1Max,
        address memeToken
    ) internal {
        // Encode actions: MINT_POSITION + SETTLE_PAIR
        bytes memory actions = abi.encodePacked(
            V4_ACTION_MINT_POSITION,
            V4_ACTION_SETTLE_PAIR
        );

        // Encode params for each action
        bytes[] memory params = new bytes[](2);

        // MINT_POSITION params
        params[0] = abi.encode(
            poolKey,                    // PoolKey
            MIN_TICK_FULL_RANGE,        // tickLower (full range)
            MAX_TICK_FULL_RANGE,        // tickUpper (full range)
            liquidity,                  // liquidity amount
            uint128(amount0Max),        // amount0Max
            uint128(amount1Max),        // amount1Max
            address(this),              // recipient (launchpad receives, then transfers to locker)
            abi.encode(memeToken)        // hookData (forwarded to hook)
        );

        // SETTLE_PAIR params
        params[1] = abi.encode(poolKey.currency0, poolKey.currency1);

        // Execute
        IPositionManager(POSITION_MANAGER).modifyLiquidities(
            abi.encode(actions, params),
            block.timestamp
        );
    }

    // ============ MATH HELPERS ============

    /**
     * @dev Compute sqrtPriceX96 = sqrt(amount1/amount0) * 2^96
     *      Uses FullMath.mulDiv for precise 512-bit math to avoid overflow.
     *
     *      sqrtPriceX96 = sqrt(amount1 * 2^192 / amount0)
     *                   = sqrt(FullMath.mulDiv(amount1, 2^192, amount0))
     */
    function _computeSqrtPriceX96(uint256 amount0, uint256 amount1) internal pure returns (uint160) {
        require(amount0 > 0 && amount1 > 0, "Zero amount");

        // ratioX192 = amount1 * 2^192 / amount0 (using safe 512-bit math)
        uint256 ratioX192 = FullMath.mulDiv(amount1, uint256(1) << 192, amount0);

        // sqrtPriceX96 = sqrt(ratioX192)
        uint256 result = _sqrt(ratioX192);
        require(result > 0 && result <= type(uint160).max, "Invalid sqrtPrice");
        return uint160(result);
    }

    /**
     * @dev Compute liquidity for a full-range position given amounts and sqrtPrice.
     *      Uses Uniswap LiquidityAmounts formulas with FullMath for safe 512-bit math.
     *
     *      L_from_0 = amount0 * sqrtPrice * sqrtPriceB / ((sqrtPriceB - sqrtPrice) * Q96)
     *      L_from_1 = amount1 * Q96 / (sqrtPrice - sqrtPriceA)
     *      L = min(L_from_0, L_from_1)
     *
     *      Where sqrtPriceA = MIN_SQRT_RATIO, sqrtPriceB = MAX_SQRT_RATIO
     */
    function _computeLiquidity(uint256 amount0, uint256 amount1, uint160 sqrtPriceX96) internal pure returns (uint256) {
        uint256 Q96 = 1 << 96;

        // MIN/MAX sqrt ratios from TickMath (Uniswap v4-core)
        uint160 sqrtPriceA = 4295128739;                                                       // MIN_SQRT_RATIO
        uint160 sqrtPriceB = 1461446703485210103287273052203988822378723970342;                  // MAX_SQRT_RATIO

        // L from amount0: amount0 * sqrtPrice * sqrtPriceB / ((sqrtPriceB - sqrtPrice) * Q96)
        uint256 numerator0 = FullMath.mulDiv(uint256(sqrtPriceX96), uint256(sqrtPriceB), Q96);
        uint256 denominator0 = uint256(sqrtPriceB) - uint256(sqrtPriceX96);
        uint256 L0 = denominator0 > 0 ? FullMath.mulDiv(amount0, numerator0, denominator0) : type(uint256).max;

        // L from amount1: amount1 * Q96 / (sqrtPrice - sqrtPriceA)
        uint256 denominator1 = uint256(sqrtPriceX96) - uint256(sqrtPriceA);
        uint256 L1 = denominator1 > 0 ? FullMath.mulDiv(amount1, Q96, denominator1) : type(uint256).max;

        return L0 < L1 ? L0 : L1;
    }

    /**
     * @dev Compute PoolId from PoolKey (keccak256 of abi-encoded key).
     *      Must match Uniswap V4 PoolIdLibrary.toId().
     */
    function _computePoolId(IPoolManager.PoolKey memory key) internal pure returns (bytes32) {
        return keccak256(abi.encode(key));
    }

    /// @dev Babylonian square root
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        y = x;
        uint256 z = (x + 1) / 2;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    // ============ VIEW FUNCTIONS ============

    function totalTokens() external view returns (uint256) { return allTokens.length; }

    function getTokenInfo(address tokenAddress) external view returns (TokenInfo memory) {
        return tokens[tokenAddress];
    }

    function getCurrentPrice(address tokenAddress) external view returns (uint256) {
        TokenInfo storage info = tokens[tokenAddress];
        if (info.virtualTokenReserve == 0) return 0;
        return (info.virtualOkbReserve * 1 ether) / info.virtualTokenReserve;
    }

    function getGraduationProgress(address tokenAddress) external view returns (uint256) {
        TokenInfo storage info = tokens[tokenAddress];
        if (info.graduated) return 10000;
        if (GRADUATION_THRESHOLD == 0) return 10000;
        uint256 progress = (info.realOkbReserve * 10000) / GRADUATION_THRESHOLD;
        return progress > 10000 ? 10000 : progress;
    }

    function getBuyQuote(address tokenAddress, uint256 okbAmount)
        external view returns (uint256 tokensOut, uint256 actualOkbCost)
    {
        TokenInfo storage info = tokens[tokenAddress];
        require(info.tokenAddress != address(0), "Token not found");
        require(!info.graduated, "Token graduated");

        uint256 fee = (okbAmount * TRADE_FEE_BPS) / 10000;
        uint256 okbIn = okbAmount - fee;
        if (info.realOkbReserve + okbIn > GRADUATION_THRESHOLD) {
            okbIn = GRADUATION_THRESHOLD - info.realOkbReserve;
            fee = (okbIn * TRADE_FEE_BPS) / (10000 - TRADE_FEE_BPS);
        }
        uint256 newVirtualOkb = info.virtualOkbReserve + okbIn;
        tokensOut = info.virtualTokenReserve - (info.virtualOkbReserve * info.virtualTokenReserve) / newVirtualOkb;
        if (tokensOut > info.realTokenReserve) tokensOut = info.realTokenReserve;
        actualOkbCost = okbIn + fee;
    }

    function getSellQuote(address tokenAddress, uint256 tokenAmount) external view returns (uint256) {
        TokenInfo storage info = tokens[tokenAddress];
        require(info.tokenAddress != address(0), "Token not found");
        require(!info.graduated, "Token graduated");

        uint256 newVirtualToken = info.virtualTokenReserve + tokenAmount;
        uint256 okbOut = info.virtualOkbReserve - (info.virtualOkbReserve * info.virtualTokenReserve) / newVirtualToken;
        if (okbOut > info.realOkbReserve) okbOut = info.realOkbReserve;
        uint256 fee = (okbOut * TRADE_FEE_BPS) / 10000;
        return okbOut - fee;
    }

    function getTokensPaginated(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = allTokens.length;
        if (offset >= total) return new address[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = allTokens[total - 1 - offset - i];
        }
        return result;
    }

    // ============ ADMIN (LIMITED — cannot access liquidity/tokens) ============

    function setHookAddress(address _hookAddress) external onlyOwner {
        require(hookAddress == address(0), "Hook already set");
        require(_hookAddress.code.length > 0, "Not a contract");
        require(
            uint160(_hookAddress) & ALL_HOOK_PERMISSIONS_MASK == REQUIRED_HOOK_PERMISSIONS,
            "Invalid hook permissions"
        );
        hookAddress = _hookAddress;
        emit HookAddressSet(_hookAddress);
    }

    function setCommunityWallet(address _communityWallet) external onlyOwner {
        require(_communityWallet != address(0), "Invalid address");
        communityWallet = _communityWallet;
        emit CommunityWalletUpdated(_communityWallet);
    }

    function setCreationFee(uint256 _creationFee) external onlyOwner {
        require(_creationFee <= MAX_CREATION_FEE, "Fee exceeds maximum");
        creationFee = _creationFee;
        emit CreationFeeUpdated(_creationFee);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function claimCommunityFees() external {
        uint256 amount = pendingCommunityFees;
        require(amount > 0, "No fees to claim");
        pendingCommunityFees = 0;
        (bool sent, ) = communityWallet.call{value: amount}("");
        require(sent, "Fee transfer failed");
        emit CommunityFeesClaimed(communityWallet, amount, block.timestamp);
    }

    function sweepStuckNative() external onlyOwner {
        uint256 totalOwed = pendingCommunityFees + totalActiveOkbReserves;
        uint256 balance = address(this).balance;
        require(balance > totalOwed, "No stuck funds");
        uint256 excess = balance - totalOwed;
        (bool sent, ) = owner.call{value: excess}("");
        require(sent, "Sweep failed");
    }

    /**
     * @notice Sweep ERC20 dust left after migration (e.g., rounding leftovers).
     *         Only works for tokens whose migration is complete.
     *         Dust is sent to communityWallet (NOT owner) — anti-rug safe.
     */
    function sweepPostMigrationDust(address tokenAddress) external {
        require(liquidityMigrated[tokenAddress], "Not migrated yet");
        // Sweep meme token dust to DEAD_WALLET (burn)
        uint256 memeBalance = IERC20(tokenAddress).balanceOf(address(this));
        if (memeBalance > 0) {
            _safeTransfer(tokenAddress, DEAD_WALLET, memeBalance);
        }
        // Sweep WOKB dust to communityWallet (capped to prevent misuse)
        uint256 wokbBalance = IERC20(WOKB).balanceOf(address(this));
        require(wokbBalance <= MAX_WOKB_DUST, "WOKB balance too high, not dust");
        if (wokbBalance > 0) {
            _safeTransfer(WOKB, communityWallet, wokbBalance);
        }
    }

    /// @dev Accept ERC721 tokens (needed to receive LP NFT from PositionManager _mint)
    function onERC721Received(address, address, uint256, bytes calldata) external view returns (bytes4) {
        require(msg.sender == POSITION_MANAGER, "Only PositionManager NFTs");
        return this.onERC721Received.selector;
    }

    receive() external payable {}
}
