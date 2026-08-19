// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Custom errors for gas optimization (reduces bytecode significantly)
error InvalidToken();
error InvalidName();
error DepositTooLow();
error InvalidBetRange();
error MaxBetTooHigh();
error JackpotTooHigh();
error MaxPoolsReached();
error TransferFailed();
error PoolNotExist();
error NotPoolOwner();
error InvalidAmount();
error ProtectedFunds();
error PoolInactive();
error PoolActive();
error InsufficientBalance();
error HasPendingBets();
error InvalidAddress();
error AlreadyOwner();
error BetTooLow();
error BetTooHigh();
error PendingCommit();
error PoolCapacity();
error RateLimitExceeded();
error NoCommit();
error AlreadyRevealed();
error WaitBlock();
error CommitHasExpired();
error BlockhashExpired();
error InvalidSeed();
error NotExpired();
error WrongPool();
error PayoutFailed();
error InvalidCount();
error InvalidBatch();

/**
 * @title BanmaoSlotsMultiPool
 * @notice Multi-pool slot machine where anyone can become a House owner
 * @dev Provably fair using commit-reveal randomness
 * @dev Each pool has its own balance, settings, and owner who can withdraw profits
 */
contract BanmaoSlotsMultiPool is Ownable, ReentrancyGuard, Pausable {
    
    // ============ State Variables ============
    
    IERC20 public immutable banmaoToken;
    
    // Platform configuration (set by contract owner)
    uint256 public constant PLATFORM_FEE_PERCENT = 200;  // 2% = 200 basis points (FIXED, cannot change)
    uint256 public minPoolDeposit = 1_000_000 * 10**18;  // 1M $BANMAO to create pool
    uint256 public maxPoolsPerUser = 3;            // Max pools per user
    uint256 public globalRTP = 9500;               // 95% RTP (fixed for fairness)
    
    // Rate limiting
    uint256 public maxSpinsPerMinute = 10;
    uint256 public commitExpiryBlocks = 256;
    
    // Platform earnings (stays in contract, collected via withdrawPlatformFees)
    uint256 public platformEarnings;
    
    // Pool counter
    uint256 public nextPoolId = 1;
    uint256 public activePoolCount;
    
    // Designated Platform Pool ID
    uint256 public platformPoolId;
    
    // ============ Pool Structure ============
    
    struct Pool {
        uint256 id;
        address owner;
        string name;
        uint256 balance;              // Pool liquidity
        uint256 minBet;               // Min bet (owner configurable)
        uint256 maxBet;               // Max bet (owner configurable)
        uint256 jackpotPercent;       // % of bet to jackpot (0-10%)
        uint256 jackpotPool;          // Accumulated jackpot
        uint256 totalSpins;           // Total spins on this pool
        uint256 totalBetsVolume;      // Total bets volume
        uint256 totalPayoutsVolume;   // Total payouts
        uint256 totalPendingBets;     // Pending bets protection
        bool isActive;                // Pool active status
        uint256 createdAt;            // Creation timestamp
    }
    
    // Commit structure (per player per pool)
    struct Commit {
        uint256 poolId;
        bytes32 hashedSeed;
        uint256 betAmount;        // Bet per spin
        uint256 spinCount;        // Number of spins (1-10 for multi-spin)
        uint256 blockNumber;
        bool revealed;
    }
    
    // Rate limiting
    struct RateLimit {
        uint256 spinCount;
        uint256 minuteStart;
    }
    
    // Stack workaround struct
    struct RevealVars {
        uint256 poolId;
        uint256 betAmount;
        uint256 payout;
        bool isJackpot;
        uint8[5] result;
    }
    
    // Stack workaround struct for multi-reveal
    struct MultiRevealVars {
        uint256 poolId;
        uint256 betAmountPerSpin;
        uint256 spinCount;
        uint256 totalBet;
        uint256 totalPayout;
        bool hasJackpot;
        uint256 blockNum;
    }
    
    // Player stats per pool
    struct PlayerPoolStats {
        uint256 totalBets;
        uint256 totalWins;
        uint256 totalPayout;
        uint256 biggestWin;
        uint256 jackpotsWon;
        uint256 spins;
    }
    
    // ============ Pool Protection Settings ============
    
    // Protection settings per pool (configurable by Pool Owner)
    struct PoolProtection {
        // Dynamic Max Bet Protection
        bool dynamicMaxBetEnabled;        // Enable/disable dynamic max bet
        uint256 lowBalanceThreshold;      // % threshold for reduced max bet (default 50%)
        uint256 criticalBalanceThreshold; // % threshold for minimal max bet (default 30%)
        uint256 initialDeposit;           // Track initial deposit for health calculation
        
        // Streak Protection
        bool streakProtectionEnabled;     // Enable/disable streak protection
        uint256 hourlyPayoutLimit;        // Max payout per hour as % of balance (default 30%)
        uint256 currentHourStart;         // Timestamp when current hour started
        uint256 currentHourPayout;        // Total payout in current hour
    }
    
    // Emergency withdraw state per pool
    struct PoolEmergency {
        bool isTriggered;                 // Emergency mode active
        uint256 triggeredAt;              // When emergency was triggered
        uint256 cooldownDuration;         // Cooldown in seconds (default 30 min)
    }
    
    // ============ Mappings ============
    
    mapping(uint256 => Pool) public pools;                  // poolId => Pool
    mapping(address => uint256[]) public userPools;         // owner => poolIds they own
    mapping(address => Commit) public commits;              // player => current commit
    mapping(address => RateLimit) public rateLimits;        // player => rate limit
    mapping(address => uint256) public nonces;              // player => nonce
    mapping(uint256 => mapping(address => PlayerPoolStats)) public playerPoolStats; // poolId => player => stats
    
    // Active pool IDs for enumeration
    uint256[] public activePoolIds;
    
    // Per-pool pending players tracking (for batch settle)
    mapping(uint256 => address[]) public poolPendingPlayers;           // poolId => pending player addresses
    mapping(uint256 => mapping(address => uint256)) internal poolPendingPlayerIndex; // poolId => player => index+1 (0 means not in list)
    
    // Pool protection settings
    mapping(uint256 => PoolProtection) public poolProtection;  // poolId => protection settings
    mapping(uint256 => PoolEmergency) public poolEmergency;    // poolId => emergency state
    
    // ============ Symbol Configuration ============
    
    // Symbol probabilities (out of 1000)
    // 0: Banmao (🐱) - 50/1000 = 5%
    // 1: Banana (🍌) - 80/1000 = 8%
    // 2: Diamond (💎) - 150/1000 = 15%
    // 3: Star (🌟) - 200/1000 = 20%
    // 4: Clover (🍀) - 250/1000 = 25%
    // 5: Seven (7️⃣) - 270/1000 = 27%
    uint16[6] public symbolProbabilities = [50, 80, 150, 200, 250, 270];
    
    // Payout multipliers (in basis points, 100 = 1x)
    uint16[3][6] public payoutMultipliers = [
        [1000, 5000, 20000],  // Banmao: 10x, 50x, 200x
        [800, 4000, 15000],   // Banana: 8x, 40x, 150x
        [500, 2000, 8000],    // Diamond: 5x, 20x, 80x
        [300, 1500, 5000],    // Star: 3x, 15x, 50x
        [200, 800, 2500],     // Clover: 2x, 8x, 25x
        [150, 500, 1500]      // Seven: 1.5x, 5x, 15x
    ];
    
    uint16 public jackpotMultiplier = 50000; // 500x for jackpot
    
    // ============ Events ============
    
    event PoolCreated(uint256 indexed poolId, address indexed owner, string name, uint256 initialDeposit);
    event PoolDeposit(uint256 indexed poolId, address indexed owner, uint256 amount);
    event PoolWithdraw(uint256 indexed poolId, address indexed owner, uint256 amount);
    event PoolSettingsUpdated(uint256 indexed poolId, uint256 minBet, uint256 maxBet, uint256 jackpotPercent);
    event PoolDeactivated(uint256 indexed poolId);
    event PoolReactivated(uint256 indexed poolId);
    
    event SpinCommitted(uint256 indexed poolId, address indexed player, bytes32 hashedSeed, uint256 betAmount);
    event SpinRevealed(uint256 indexed poolId, address indexed player, uint8[5] result, uint256 payout, bool isJackpot);
    event MultiSpinRevealed(uint256 indexed poolId, address indexed player, uint256 spinCount, uint256 totalPayout, bool hasJackpot);
    event JackpotWon(uint256 indexed poolId, address indexed player, uint256 amount);
    event CommitExpired(uint256 indexed poolId, address indexed player, uint256 refundAmount);
    
    event PlatformFeeCollected(uint256 amount);
    event MinPoolDepositUpdated(uint256 newAmount);
    event PoolOwnershipTransferred(uint256 indexed poolId, address indexed previousOwner, address indexed newOwner);
    event PoolClosed(uint256 indexed poolId, address indexed owner, uint256 finalBalance);
    
    // Protection Events
    event ProtectionSettingsUpdated(uint256 indexed poolId, bool dynamicMaxBetEnabled, bool streakProtectionEnabled);
    event StreakProtectionTriggered(uint256 indexed poolId, uint256 hourlyPayout, uint256 limit);
    event EmergencyTriggered(uint256 indexed poolId, uint256 cooldownEndsAt);
    event EmergencyWithdrawExecuted(uint256 indexed poolId, uint256 amount);
    
    // ============ Constructor ============
    
    constructor(address _token) Ownable(msg.sender) {
        if (_token == address(0)) revert InvalidToken();
        banmaoToken = IERC20(_token);
    }
    
    // Prevent accidental ETH transfers
    receive() external payable {
        revert InvalidToken();
    }
    
    // ============ Pool Management Functions ============
    
    /**
     * @notice Create a new pool and become a House owner
     * @param name Display name for the pool
     * @param initialDeposit Amount to deposit (must be >= minPoolDeposit)
     * @param minBet Minimum bet amount for this pool
     * @param maxBet Maximum bet amount for this pool
     * @param jackpotPercent Jackpot contribution percentage (0-10)
     */
    function createPool(
        string calldata name,
        uint256 initialDeposit,
        uint256 minBet,
        uint256 maxBet,
        uint256 jackpotPercent
    ) external nonReentrant whenNotPaused returns (uint256 poolId) {
        poolId = _createPool(msg.sender, name, initialDeposit, minBet, maxBet, jackpotPercent, false);
    }
    
    /**
     * @notice Create the official Platform Pool (onlyOwner)
     */
    function createPlatformPool(
        string calldata name,
        uint256 initialDeposit,
        uint256 minBet,
        uint256 maxBet,
        uint256 jackpotPercent
    ) external onlyOwner returns (uint256 poolId) {
        poolId = _createPool(msg.sender, name, initialDeposit, minBet, maxBet, jackpotPercent, true);
        platformPoolId = poolId;
    }
    
    function _createPool(
        address _owner,
        string memory _name,
        uint256 _deposit,
        uint256 _minBet,
        uint256 _maxBet,
        uint256 _jackpotPercent,
        bool _isPlatform
    ) internal returns (uint256 poolId) {
        if (bytes(_name).length == 0 || bytes(_name).length > 50) revert InvalidName();
        if (_deposit < minPoolDeposit) revert DepositTooLow();
        if (_minBet == 0 || _minBet > _maxBet) revert InvalidBetRange();
        if (_maxBet > _deposit / 10) revert MaxBetTooHigh();
        if (_jackpotPercent > 10) revert JackpotTooHigh();
        
        if (!_isPlatform) {
            if (userPools[_owner].length >= maxPoolsPerUser) revert MaxPoolsReached();
        }
        
        // Transfer tokens
        if (!banmaoToken.transferFrom(_owner, address(this), _deposit)) revert TransferFailed();
        
        // Create pool
        poolId = nextPoolId++;
        pools[poolId] = Pool({
            id: poolId,
            owner: _owner,
            name: _name,
            balance: _deposit,
            minBet: _minBet,
            maxBet: _maxBet,
            jackpotPercent: _jackpotPercent,
            jackpotPool: 0,
            totalSpins: 0,
            totalBetsVolume: 0,
            totalPayoutsVolume: 0,
            totalPendingBets: 0,
            isActive: true,
            createdAt: block.timestamp
        });
        
        userPools[_owner].push(poolId);
        activePoolIds.push(poolId);
        activePoolCount++;
        
        emit PoolCreated(poolId, _owner, _name, _deposit);
    }
    
    /**
     * @notice Deposit more funds to your pool
     */
    function depositToPool(uint256 poolId, uint256 amount) external nonReentrant {
        Pool storage pool = pools[poolId];
        if (pool.id == 0) revert PoolNotExist();
        if (pool.owner != msg.sender) revert NotPoolOwner();
        if (amount == 0) revert InvalidAmount();
        
        if (!banmaoToken.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        pool.balance += amount;
        
        emit PoolDeposit(poolId, msg.sender, amount);
    }
    
    /**
     * @notice Withdraw funds from your pool (only owner, respects pending bets)
     */
    function withdrawFromPool(uint256 poolId, uint256 amount) external nonReentrant {
        Pool storage pool = pools[poolId];
        if (pool.id == 0) revert PoolNotExist();
        if (pool.owner != msg.sender) revert NotPoolOwner();
        
        // Protected funds = pending bets + jackpot
        uint256 protectedFunds = pool.totalPendingBets + pool.jackpotPool;
        uint256 withdrawable = pool.balance > protectedFunds ? pool.balance - protectedFunds : 0;
        if (amount > withdrawable) revert ProtectedFunds();
        
        pool.balance -= amount;
        if (!banmaoToken.transfer(msg.sender, amount)) revert TransferFailed();
        
        emit PoolWithdraw(poolId, msg.sender, amount);
    }
    
    /**
     * @notice Update pool settings (owner only)
     */
    function updatePoolSettings(
        uint256 poolId,
        uint256 minBet,
        uint256 maxBet,
        uint256 jackpotPercent
    ) external {
        Pool storage pool = pools[poolId];
        if (pool.id == 0) revert PoolNotExist();
        if (pool.owner != msg.sender) revert NotPoolOwner();
        if (minBet == 0 || minBet > maxBet) revert InvalidBetRange();
        if (maxBet > pool.balance / 10) revert MaxBetTooHigh();
        if (jackpotPercent > 10) revert JackpotTooHigh();
        
        pool.minBet = minBet;
        pool.maxBet = maxBet;
        pool.jackpotPercent = jackpotPercent;
        
        emit PoolSettingsUpdated(poolId, minBet, maxBet, jackpotPercent);
    }
    
    /**
     * @notice Deactivate pool (stops new spins)
     */
    function deactivatePool(uint256 poolId) external {
        Pool storage pool = pools[poolId];
        if (pool.id == 0) revert PoolNotExist();
        if (pool.owner != msg.sender) revert NotPoolOwner();
        if (!pool.isActive) revert PoolInactive();
        
        pool.isActive = false;
        activePoolCount--;
        
        emit PoolDeactivated(poolId);
    }
    
    /**
     * @notice Reactivate pool
     */
    function reactivatePool(uint256 poolId) external {
        Pool storage pool = pools[poolId];
        if (pool.owner != msg.sender) revert NotPoolOwner();
        if (pool.isActive) revert PoolActive();
        if (pool.balance < minPoolDeposit / 10) revert InsufficientBalance();
        
        pool.isActive = true;
        activePoolCount++;
        
        emit PoolReactivated(poolId);
    }
    
    /**
     * @notice Transfer pool ownership to another address (only pool owner)
     * @param poolId The pool to transfer
     * @param newOwner The new owner address
     */
    function transferPoolOwnership(uint256 poolId, address newOwner) external {
        Pool storage pool = pools[poolId];
        if (pool.id == 0) revert PoolNotExist();
        if (pool.owner != msg.sender) revert NotPoolOwner();
        if (newOwner == address(0)) revert InvalidAddress();
        if (newOwner == msg.sender) revert AlreadyOwner();
        
        address previousOwner = pool.owner;
        pool.owner = newOwner;
        
        // Update userPools mappings
        // Remove from previous owner
        uint256[] storage prevOwnerPools = userPools[previousOwner];
        for (uint256 i = 0; i < prevOwnerPools.length; i++) {
            if (prevOwnerPools[i] == poolId) {
                prevOwnerPools[i] = prevOwnerPools[prevOwnerPools.length - 1];
                prevOwnerPools.pop();
                break;
            }
        }
        // Add to new owner
        userPools[newOwner].push(poolId);
        
        emit PoolOwnershipTransferred(poolId, previousOwner, newOwner);
    }
    
    /**
     * @notice Close pool permanently and withdraw all funds (only pool owner)
     * @dev Can only close when no pending bets
     * @param poolId The pool to close
     */
    function closePool(uint256 poolId) external nonReentrant {
        Pool storage pool = pools[poolId];
        if (pool.id == 0) revert PoolNotExist();
        if (pool.owner != msg.sender) revert NotPoolOwner();
        if (pool.totalPendingBets != 0) revert HasPendingBets();
        
        uint256 finalBalance = pool.balance + pool.jackpotPool;
        
        // Deactivate pool
        if (pool.isActive) {
            pool.isActive = false;
            activePoolCount--;
        }
        
        // Clear pool balance
        pool.balance = 0;
        pool.jackpotPool = 0;
        
        // Remove from activePoolIds
        for (uint256 i = 0; i < activePoolIds.length; i++) {
            if (activePoolIds[i] == poolId) {
                activePoolIds[i] = activePoolIds[activePoolIds.length - 1];
                activePoolIds.pop();
                break;
            }
        }
        
        // Transfer all funds to owner
        if (finalBalance > 0) {
            if (!banmaoToken.transfer(msg.sender, finalBalance)) revert TransferFailed();
        }
        
        emit PoolClosed(poolId, msg.sender, finalBalance);
    }
    
    // ============ Core Game Functions ============
    
    /**
     * @notice Commit a single spin on a specific pool (backward compatible)
     */
    function commitSpin(uint256 poolId, bytes32 hashedSeed, uint256 betAmount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        _commitSpin(poolId, hashedSeed, betAmount, 1);
    }
    
    /**
     * @notice Commit multiple spins at once (1-10 spins)
     * @param poolId Pool to spin on
     * @param hashedSeed Hashed seed for randomness
     * @param betAmountPerSpin Bet amount for each spin
     * @param spinCount Number of spins (1-10)
     */
    function commitMultiSpin(
        uint256 poolId, 
        bytes32 hashedSeed, 
        uint256 betAmountPerSpin,
        uint256 spinCount
    ) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        if (spinCount < 1 || spinCount > 10) revert InvalidCount();
        _commitSpin(poolId, hashedSeed, betAmountPerSpin, spinCount);
    }
    
    /**
     * @dev Internal commit logic for both single and multi-spin
     */
    function _commitSpin(
        uint256 poolId, 
        bytes32 hashedSeed, 
        uint256 betAmountPerSpin,
        uint256 spinCount
    ) internal {
        Pool storage pool = pools[poolId];
        if (!pool.isActive) revert PoolInactive();
        if (betAmountPerSpin < pool.minBet) revert BetTooLow();
        if (betAmountPerSpin > pool.maxBet) revert BetTooHigh();
        if (commits[msg.sender].blockNumber != 0 && !commits[msg.sender].revealed) revert PendingCommit();
        
        uint256 totalBet = betAmountPerSpin * spinCount;
        
        // Check pool can cover potential max payout for ALL spins
        // Worst case: every spin wins jackpot (extremely unlikely but safe)
        uint256 maxPotentialPayout = ((betAmountPerSpin * jackpotMultiplier) / 100) * spinCount + pool.jackpotPool;
        if (pool.balance + totalBet < maxPotentialPayout + pool.totalPendingBets) revert PoolCapacity();
        
        // Rate limiting - multi-spin counts as multiple spins
        uint256 currentMinute = block.timestamp / 60;
        RateLimit storage rl = rateLimits[msg.sender];
        if (rl.minuteStart != currentMinute) {
            rl.spinCount = 0;
            rl.minuteStart = currentMinute;
        }
        if (rl.spinCount + spinCount > maxSpinsPerMinute) revert RateLimitExceeded();
        rl.spinCount += spinCount;
        
        // Transfer total tokens from player
        if (!banmaoToken.transferFrom(msg.sender, address(this), totalBet)) revert TransferFailed();
        
        // Update pool stats
        pool.balance += totalBet;
        pool.totalPendingBets += totalBet;
        pool.totalBetsVolume += totalBet;
        pool.totalSpins += spinCount;
        
        // Player stats
        playerPoolStats[poolId][msg.sender].totalBets += totalBet;
        playerPoolStats[poolId][msg.sender].spins += spinCount;
        
        // Store commit with spin count
        commits[msg.sender] = Commit({
            poolId: poolId,
            hashedSeed: hashedSeed,
            betAmount: betAmountPerSpin,
            spinCount: spinCount,
            blockNumber: block.number,
            revealed: false
        });
        
        // Track player in pending list for batch settlement
        _addToPendingPlayers(poolId, msg.sender);
        
        emit SpinCommitted(poolId, msg.sender, hashedSeed, totalBet);
    }
    
    /**
     * @notice Reveal the spin and get result (works for both single and multi-spin)
     */
    function revealSpin(bytes32 seed) external nonReentrant whenNotPaused {
        Commit storage commit = commits[msg.sender];
        
        if (commit.blockNumber == 0) revert NoCommit();
        if (commit.revealed) revert AlreadyRevealed();
        if (block.number <= commit.blockNumber) revert WaitBlock();
        if (block.number > commit.blockNumber + commitExpiryBlocks) revert CommitHasExpired();
        
        bytes32 blockHashValue = blockhash(commit.blockNumber);
        if (blockHashValue == bytes32(0)) revert BlockhashExpired();
        
        // Verify seed
        if (keccak256(abi.encodePacked(seed, msg.sender, nonces[msg.sender])) != commit.hashedSeed) revert InvalidSeed();
        
        // Check if multi-spin or single spin
        if (commit.spinCount > 1) {
            _performMultiReveal(msg.sender, seed);
        } else {
            _performReveal(msg.sender, seed);
        }
    }

    function _performReveal(
        address player, 
        bytes32 seed
    ) internal {
        RevealVars memory vars;
        Commit storage commit = commits[player];
        vars.poolId = commit.poolId;
        vars.betAmount = commit.betAmount;
        
        Pool storage pool = pools[vars.poolId];
        
        // Post-Reveal Accounting: Collect Fees & Jackpot now
        {
            uint256 platformFee = (vars.betAmount * PLATFORM_FEE_PERCENT) / 10000;
            uint256 jackpotContribution = (vars.betAmount * pool.jackpotPercent) / 100;
            
            platformEarnings += platformFee;
            pool.jackpotPool += jackpotContribution;
            pool.balance -= (platformFee + jackpotContribution);
        }
        
        // Generate result
        vars.result = _generateResult(seed, commit.blockNumber, player, vars.poolId);
        
        // Calculate payout
        (vars.payout, vars.isJackpot) = calculatePayout(vars.result, vars.betAmount, pool.jackpotPool);
        
        // Update state
        commit.revealed = true;
        nonces[player]++;
        
        // Remove from pending players list
        _removeFromPendingPlayers(vars.poolId, player);
        
        pool.totalPendingBets = pool.totalPendingBets > vars.betAmount ? pool.totalPendingBets - vars.betAmount : 0;
        
        if (vars.payout > 0) {
            _processPayout(vars.poolId, player, vars.payout, vars.isJackpot);
        }
        
        emit SpinRevealed(vars.poolId, player, vars.result, vars.payout, vars.isJackpot);
    }
    
    /**
     * @dev Internal function to reveal multi-spin commits
     * @param player The player address
     * @param seed The revealed seed
     */
    function _performMultiReveal(
        address player, 
        bytes32 seed
    ) internal {
        MultiRevealVars memory v;
        
        // Load commit data into struct
        {
            Commit storage commit = commits[player];
            v.poolId = commit.poolId;
            v.betAmountPerSpin = commit.betAmount;
            v.spinCount = commit.spinCount;
            v.blockNum = commit.blockNumber;
            v.totalBet = v.betAmountPerSpin * v.spinCount;
        }
        
        Pool storage pool = pools[v.poolId];
        
        // Process each spin inline (avoid memory struct pass-by-value issue)
        for (uint256 i = 0; i < v.spinCount; i++) {
            // Block scope to limit stack usage
            {
                // Derive unique seed for this spin
                bytes32 spinSeed = keccak256(abi.encodePacked(seed, i));
                
                // Collect Fees & Jackpot
                uint256 platformFee = (v.betAmountPerSpin * PLATFORM_FEE_PERCENT) / 10000;
                uint256 jackpotContribution = (v.betAmountPerSpin * pool.jackpotPercent) / 100;
                
                platformEarnings += platformFee;
                pool.jackpotPool += jackpotContribution;
                pool.balance -= (platformFee + jackpotContribution);
                
                // Generate result and calculate payout in nested scope
                uint8[5] memory result = _generateResult(spinSeed, v.blockNum, player, v.poolId);
                (uint256 spinPayout, bool isJackpot) = calculatePayout(result, v.betAmountPerSpin, pool.jackpotPool);
                
                v.totalPayout += spinPayout;
                if (isJackpot) v.hasJackpot = true;
                
                // Process payout and emit event
                if (spinPayout > 0) {
                    _processMultiSpinPayout(v.poolId, player, spinPayout, isJackpot);
                }
                emit SpinRevealed(v.poolId, player, result, spinPayout, isJackpot);
            }
        }
        
        // Update commit state
        commits[player].revealed = true;
        nonces[player]++;
        
        // Remove from pending players list
        _removeFromPendingPlayers(v.poolId, player);
        
        // Update pending bets (total bet amount)
        pool.totalPendingBets = pool.totalPendingBets > v.totalBet ? pool.totalPendingBets - v.totalBet : 0;
        
        // Emit summary event for multi-spin
        emit MultiSpinRevealed(v.poolId, player, v.spinCount, v.totalPayout, v.hasJackpot);
    }
    
    /**
     * @dev Process payout for individual multi-spin result (no stat updates per spin)
     */
    function _processMultiSpinPayout(uint256 poolId, address player, uint256 payout, bool isJackpot) internal {
        Pool storage pool = pools[poolId];
        uint256 actualPayout = payout > pool.balance ? pool.balance : payout;
            
        pool.balance -= actualPayout;
        pool.totalPayoutsVolume += actualPayout;
        
        // Update player stats
        playerPoolStats[poolId][player].totalWins++;
        playerPoolStats[poolId][player].totalPayout += actualPayout;
        if (actualPayout > playerPoolStats[poolId][player].biggestWin) {
            playerPoolStats[poolId][player].biggestWin = actualPayout;
        }
        
        if (!banmaoToken.transfer(player, actualPayout)) revert PayoutFailed();
        
        if (isJackpot) {
            playerPoolStats[poolId][player].jackpotsWon++;
            emit JackpotWon(poolId, player, pool.jackpotPool);
            pool.jackpotPool = 0;
        }
        
        // Track payout for streak protection
        _updateStreakTracking(poolId, actualPayout);
    }
    
    
    function _processPayout(uint256 poolId, address player, uint256 payout, bool isJackpot) internal {
        Pool storage pool = pools[poolId];
        uint256 actualPayout = payout > pool.balance ? pool.balance : payout;
            
        pool.balance -= actualPayout;
        pool.totalPayoutsVolume += actualPayout;
        
        // Update player stats
        playerPoolStats[poolId][player].totalWins++;
        playerPoolStats[poolId][player].totalPayout += actualPayout;
        if (actualPayout > playerPoolStats[poolId][player].biggestWin) {
            playerPoolStats[poolId][player].biggestWin = actualPayout;
        }
        
        if (!banmaoToken.transfer(player, actualPayout)) revert PayoutFailed();
        
        if (isJackpot) {
            playerPoolStats[poolId][player].jackpotsWon++;
            emit JackpotWon(poolId, player, pool.jackpotPool);
            pool.jackpotPool = 0;
        }
        
        // Track payout for streak protection
        _updateStreakTracking(poolId, actualPayout);
    }
    
    /**
     * @notice Settle expired commits - treated as LOSS for player
     * @dev Player forfeits their bet if they don't reveal in time
     * @dev Platform fee and jackpot contribution are still taken
     * @dev Remaining bet stays in pool as profit
     */
    function settleExpiredCommit() external nonReentrant {
        Commit storage commit = commits[msg.sender];
        
        if (commit.blockNumber == 0) revert NoCommit();
        if (commit.revealed) revert AlreadyRevealed();
        if (block.number <= commit.blockNumber + commitExpiryBlocks) revert NotExpired();
        
        Pool storage pool = pools[commit.poolId];
        uint256 betAmountPerSpin = commit.betAmount;
        uint256 spinCount = commit.spinCount > 0 ? commit.spinCount : 1; // Backward compat
        uint256 totalBet = betAmountPerSpin * spinCount;
        
        // Process as a LOSS for each spin - take fees just like normal losing spins
        for (uint256 i = 0; i < spinCount; i++) {
            uint256 platformFee = (betAmountPerSpin * PLATFORM_FEE_PERCENT) / 10000;
            uint256 jackpotContribution = (betAmountPerSpin * pool.jackpotPercent) / 100;
            
            platformEarnings += platformFee;
            pool.jackpotPool += jackpotContribution;
            pool.balance -= (platformFee + jackpotContribution);
        }
        
        // Update pending bets
        pool.totalPendingBets = pool.totalPendingBets > totalBet 
            ? pool.totalPendingBets - totalBet : 0;
        
        // Mark as revealed (settled)
        commit.revealed = true;
        nonces[msg.sender]++;
        
        // Remove from pending players list
        _removeFromPendingPlayers(commit.poolId, msg.sender);
        
        // NO TRANSFER TO PLAYER - they forfeited by not revealing
        
        emit CommitExpired(commit.poolId, msg.sender, totalBet);
    }
    
    /**
     * @notice settleExpiredCommitByOwner allows Pool Owner to settle stuck bets
     * @dev Same as settleExpiredCommit but callable by Pool Owner for any player
     * @dev Necessary to free up 'totalPendingBets' enabling closePool
     * @dev Player gets NOTHING - they forfeited by not revealing
     */
    function settleExpiredCommitByOwner(uint256 poolId, address player) external nonReentrant {
        Pool storage pool = pools[poolId];
        if (pool.id == 0) revert PoolNotExist();
        if (pool.owner != msg.sender) revert NotPoolOwner();
        
        Commit storage commit = commits[player];
        if (commit.poolId != poolId) revert WrongPool();
        if (commit.blockNumber == 0) revert NoCommit();
        if (commit.revealed) revert AlreadyRevealed();
        if (block.number <= commit.blockNumber + commitExpiryBlocks) revert NotExpired();
        
        uint256 betAmountPerSpin = commit.betAmount;
        uint256 spinCount = commit.spinCount > 0 ? commit.spinCount : 1; // Backward compat
        uint256 totalBet = betAmountPerSpin * spinCount;
        
        // Process as a LOSS for each spin - take fees
        for (uint256 i = 0; i < spinCount; i++) {
            uint256 platformFee = (betAmountPerSpin * PLATFORM_FEE_PERCENT) / 10000;
            uint256 jackpotContribution = (betAmountPerSpin * pool.jackpotPercent) / 100;
            
            platformEarnings += platformFee;
            pool.jackpotPool += jackpotContribution;
            pool.balance -= (platformFee + jackpotContribution);
        }
        
        // Update pending bets
        pool.totalPendingBets = pool.totalPendingBets > totalBet 
            ? pool.totalPendingBets - totalBet : 0;
        
        // Mark as settled
        commit.revealed = true;
        nonces[player]++;
        
        // Remove from pending players list
        _removeFromPendingPlayers(poolId, player);
        
        // NO TRANSFER TO PLAYER - they forfeited
        
        emit CommitExpired(poolId, player, totalBet);
    }
    
    /**
     * @notice Batch settle all expired commits for a pool
     * @param poolId Pool to settle expired commits for
     * @param maxCount Maximum number of expired commits to process (limit actual settlements)
     * @param startIndex Index in pending array to start checking (for skipping active bets)
     * @param maxIterations Maximum number of items to check (gas protection)
     * @return settled Number of commits successfully settled
     */
    function batchSettleExpiredCommits(
        uint256 poolId, 
        uint256 maxCount,
        uint256 startIndex,
        uint256 maxIterations
    ) external nonReentrant returns (uint256 settled) {
        Pool storage pool = pools[poolId];
        if (pool.id == 0) revert PoolNotExist();
        if (pool.owner != msg.sender) revert NotPoolOwner();
        if (maxCount == 0 || maxCount > 50) revert InvalidBatch();
        if (maxIterations == 0 || maxIterations > 500) revert InvalidBatch();
        
        settled = 0;
        uint256 i = startIndex;
        uint256 iterations = 0;
        
        // Loop until we hit settlement limit, iteration limit, or end of array
        while (i < poolPendingPlayers[poolId].length && settled < maxCount && iterations < maxIterations) {
            iterations++;
            address player = poolPendingPlayers[poolId][i];
            Commit storage commit = commits[player];
            
            // Check if this commit is for this pool and expired
            if (commit.poolId == poolId && !commit.revealed && 
                block.number > commit.blockNumber + commitExpiryBlocks) {
                
                // Process settlement - handle multi-spin correctly
                uint256 betAmountPerSpin = commit.betAmount;
                uint256 spinCount = commit.spinCount > 0 ? commit.spinCount : 1; // Backward compat
                uint256 totalBet = betAmountPerSpin * spinCount;
                
                // Process fees for EACH spin (same as settleExpiredCommit)
                for (uint256 j = 0; j < spinCount; j++) {
                    uint256 platformFee = (betAmountPerSpin * PLATFORM_FEE_PERCENT) / 10000;
                    uint256 jackpotContribution = (betAmountPerSpin * pool.jackpotPercent) / 100;
                    
                    platformEarnings += platformFee;
                    pool.jackpotPool += jackpotContribution;
                    pool.balance -= (platformFee + jackpotContribution);
                }
                
                // Update pending bets with TOTAL bet amount
                pool.totalPendingBets = pool.totalPendingBets > totalBet ? pool.totalPendingBets - totalBet : 0;
                
                commit.revealed = true;
                nonces[player]++;
                
                // Remove from pending list (shifts array, don't increment i)
                _removeFromPendingPlayers(poolId, player);
                
                emit CommitExpired(poolId, player, totalBet);
                settled++;
                // Don't increment i - current i is now replaced with a new item (or we are at end)
                // Next iteration will check this index again
            } else {
                // Not expired or wrong pool (shouldn't happen for poolId but safe to check)
                i++;
            }
        }
        
        return settled;
    }
    
    /**
     * @notice Get pending players with expired commits for a pool (paginated)
     * @param poolId Pool to check
     * @param offset Starting index in pending array
     * @param limit Maximum number of items to scan
     * @return expiredPlayers Array of player addresses with expired commits
     * @return expiredBets Array of corresponding bet amounts
     * @return totalPending Total number of pending players in pool
     */
    function getExpiredPendingPlayers(
        uint256 poolId,
        uint256 offset,
        uint256 limit
    ) external view returns (
        address[] memory expiredPlayers,
        uint256[] memory expiredBets,
        uint256 totalPending
    ) {
        totalPending = poolPendingPlayers[poolId].length;
        if (offset >= totalPending) {
            return (new address[](0), new uint256[](0), totalPending);
        }
        
        uint256 actualLimit = limit;
        if (offset + limit > totalPending) {
            actualLimit = totalPending - offset;
        }
        
        // Count expired in range
        uint256 expiredCount = 0;
        for (uint256 i = 0; i < actualLimit; i++) {
            address player = poolPendingPlayers[poolId][offset + i];
            Commit storage commit = commits[player];
            if (commit.poolId == poolId && !commit.revealed && 
                block.number > commit.blockNumber + commitExpiryBlocks) {
                expiredCount++;
            }
        }
        
        // Build arrays
        expiredPlayers = new address[](expiredCount);
        expiredBets = new uint256[](expiredCount);
        uint256 idx = 0;
        
        for (uint256 i = 0; i < actualLimit; i++) {
            address player = poolPendingPlayers[poolId][offset + i];
            Commit storage commit = commits[player];
            if (commit.poolId == poolId && !commit.revealed && 
                block.number > commit.blockNumber + commitExpiryBlocks) {
                expiredPlayers[idx] = player;
                // Return total bet (betAmount * spinCount) for multi-spin
                uint256 spinCount = commit.spinCount > 0 ? commit.spinCount : 1;
                expiredBets[idx] = commit.betAmount * spinCount;
                idx++;
            }
        }
    }
    
    /**
     * @notice Get total pending players count for a pool
     */
    function getPendingPlayersCount(uint256 poolId) external view returns (uint256) {
        return poolPendingPlayers[poolId].length;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Add player to pool's pending players list
     * @dev Uses index+1 to distinguish from "not in list" (0)
     */
    function _addToPendingPlayers(uint256 poolId, address player) internal {
        // Only add if not already in list
        if (poolPendingPlayerIndex[poolId][player] == 0) {
            poolPendingPlayers[poolId].push(player);
            poolPendingPlayerIndex[poolId][player] = poolPendingPlayers[poolId].length;
        }
    }
    
    /**
     * @notice Remove player from pool's pending players list
     * @dev Uses swap-and-pop for O(1) removal
     */
    function _removeFromPendingPlayers(uint256 poolId, address player) internal {
        uint256 index = poolPendingPlayerIndex[poolId][player];
        if (index == 0) return; // Not in list
        
        uint256 lastIndex = poolPendingPlayers[poolId].length;
        if (index != lastIndex) {
            // Swap with last element
            address lastPlayer = poolPendingPlayers[poolId][lastIndex - 1];
            poolPendingPlayers[poolId][index - 1] = lastPlayer;
            poolPendingPlayerIndex[poolId][lastPlayer] = index;
        }
        poolPendingPlayers[poolId].pop();
        poolPendingPlayerIndex[poolId][player] = 0;
    }
    
    function _generateResult(
        bytes32 seed, 
        uint256 blockNumber, 
        address player, 
        uint256 poolId
    ) internal view returns (uint8[5] memory result) {
        bytes32 blockHashValue = blockhash(blockNumber);
        if (blockHashValue == bytes32(0)) revert BlockhashExpired();
        
        bytes32 entropy = keccak256(abi.encodePacked(
            seed,
            blockHashValue,
            player,
            nonces[player],
            poolId
        ));
        
        for (uint256 i = 0; i < 5; i++) {
            uint256 rand = uint256(keccak256(abi.encodePacked(entropy, i))) % 1000;
            result[i] = getSymbolFromRandom(rand);
        }
    }

    function getSymbolFromRandom(uint256 rand) internal view returns (uint8) {
        uint256 cumulative = 0;
        for (uint8 i = 0; i < 6; i++) {
            cumulative += symbolProbabilities[i];
            if (rand < cumulative) {
                return i;
            }
        }
        return 5;
    }
    
    function calculatePayout(uint8[5] memory result, uint256 betAmount, uint256 poolJackpot) 
        internal 
        view 
        returns (uint256 payout, bool isJackpot) 
    {
        // Count occurrences of each symbol (6 possible symbols: 0-5)
        uint8[6] memory symbolCounts;
        for (uint256 i = 0; i < 5; i++) {
            symbolCounts[result[i]]++;
        }
        
        // Find the symbol with the most occurrences
        uint8 bestSymbol = 0;
        uint8 bestCount = symbolCounts[0];
        for (uint8 i = 1; i < 6; i++) {
            if (symbolCounts[i] > bestCount) {
                bestCount = symbolCounts[i];
                bestSymbol = i;
            }
        }
        
        // Jackpot: 5x Banmao (symbol 0)
        if (bestCount == 5 && bestSymbol == 0) {
            isJackpot = true;
            payout = (betAmount * jackpotMultiplier) / 100 + poolJackpot;
            return (payout, isJackpot);
        }
        
        // Regular payout: 3+ matching symbols anywhere on reels
        if (bestCount >= 3) {
            uint8 payoutIndex = bestCount - 3; // 0 for 3-match, 1 for 4-match, 2 for 5-match
            uint16 multiplier = payoutMultipliers[bestSymbol][payoutIndex];
            payout = (betAmount * multiplier) / 100;
        }
        
        return (payout, false);
    }
    
    // ============ View Functions ============
    
    function getPool(uint256 poolId) external view returns (Pool memory) {
        return pools[poolId];
    }
    
    /**
     * @notice Get pool statistics (RTP, profit/loss)
     */
    function getPoolStats(uint256 poolId) external view returns (
        uint256 totalBetsVolume,
        uint256 totalPayoutsVolume,
        uint256 totalSpins,
        uint256 profitLoss,      // Positive = house profit, includes platform fees taken
        uint256 poolRtpBps       // RTP in basis points (10000 = 100%)
    ) {
        Pool storage pool = pools[poolId];
        totalBetsVolume = pool.totalBetsVolume;
        totalPayoutsVolume = pool.totalPayoutsVolume;
        totalSpins = pool.totalSpins;
        
        // Calculate profit (bets - payouts - platform fees)
        uint256 platformFeesTaken = (pool.totalBetsVolume * PLATFORM_FEE_PERCENT) / 10000;
        if (pool.totalBetsVolume > pool.totalPayoutsVolume + platformFeesTaken) {
            profitLoss = pool.totalBetsVolume - pool.totalPayoutsVolume - platformFeesTaken;
        } else {
            profitLoss = 0; // Loss case (returned as 0, check payouts > bets)
        }
        
        // Calculate RTP = (payouts / bets) * 10000
        if (pool.totalBetsVolume > 0) {
            poolRtpBps = (pool.totalPayoutsVolume * 10000) / pool.totalBetsVolume;
        } else {
            poolRtpBps = 0;
        }
    }
    
    /**
     * @notice Get active pools with pagination
     * @param offset Start index
     * @param limit Max number of pools to return
     */
    function getActivePoolsPaginated(uint256 offset, uint256 limit) external view returns (Pool[] memory, uint256 total) {
        total = activePoolCount;
        if (offset >= total || limit == 0) {
            return (new Pool[](0), total);
        }
        
        uint256 actualLimit = limit;
        if (offset + limit > total) {
            actualLimit = total - offset;
        }
        
        Pool[] memory result = new Pool[](actualLimit);
        uint256 found = 0;
        uint256 idx = 0;
        
        for (uint256 i = 0; i < activePoolIds.length && found < offset + actualLimit; i++) {
            if (pools[activePoolIds[i]].isActive) {
                if (found >= offset) {
                    result[idx] = pools[activePoolIds[i]];
                    idx++;
                }
                found++;
            }
        }
        return (result, total);
    }
    
    /**
     * @notice Get all active pools (legacy, may run out of gas with many pools)
     */
    function getActivePools() external view returns (Pool[] memory) {
        Pool[] memory result = new Pool[](activePoolCount);
        uint256 idx = 0;
        for (uint256 i = 0; i < activePoolIds.length && idx < activePoolCount; i++) {
            if (pools[activePoolIds[i]].isActive) {
                result[idx] = pools[activePoolIds[i]];
                idx++;
            }
        }
        return result;
    }
    
    function getUserPools(address user) external view returns (uint256[] memory) {
        return userPools[user];
    }
    
    function getPlayerPoolStats(uint256 poolId, address player) external view returns (PlayerPoolStats memory) {
        return playerPoolStats[poolId][player];
    }
    
    function getPendingCommit(address player) external view returns (
        uint256 poolId,
        bytes32 hashedSeed,
        uint256 betAmount,
        uint256 blockNumber,
        bool revealed,
        bool expired
    ) {
        Commit storage commit = commits[player];
        return (
            commit.poolId,
            commit.hashedSeed,
            commit.betAmount,
            commit.blockNumber,
            commit.revealed,
            block.number > commit.blockNumber + commitExpiryBlocks
        );
    }
    
    function getNonce(address player) external view returns (uint256) {
        return nonces[player];
    }
    
    // ============ Admin Functions ============
    
    // Platform fee is FIXED at 2% (PLATFORM_FEE_PERCENT = 200) - cannot be changed
    
    function setMinPoolDeposit(uint256 _minDeposit) external onlyOwner {
        minPoolDeposit = _minDeposit;
        emit MinPoolDepositUpdated(_minDeposit);
    }
    
    /**
     * @notice Withdraw accumulated platform fees to contract owner
     * @dev Platform fees stay in contract until withdrawn
     */
    function withdrawPlatformFees() external onlyOwner {
        uint256 amount = platformEarnings;
        if (amount == 0) revert InvalidAmount();
        platformEarnings = 0;
        if (!banmaoToken.transfer(owner(), amount)) revert TransferFailed();
        emit PlatformFeeCollected(amount);
    }
    
    function setMaxSpinsPerMinute(uint256 _maxSpins) external onlyOwner {
        if (_maxSpins == 0 || _maxSpins > 60) revert InvalidCount();
        maxSpinsPerMinute = _maxSpins;
    }
    
    function setCommitExpiryBlocks(uint256 _blocks) external onlyOwner {
        if (_blocks < 10 || _blocks > 256) revert InvalidCount();
        commitExpiryBlocks = _blocks;
    }
    
    function setMaxPoolsPerUser(uint256 _max) external onlyOwner {
        maxPoolsPerUser = _max;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ Pool Protection Functions ============
    
    /**
     * @notice Update protection settings for a pool (Pool Owner only)
     * @dev All thresholds are in basis points (100 = 1%)
     * @param poolId Pool to configure
     * @param dynamicMaxBetEnabled Enable dynamic max bet adjustment
     * @param lowBalanceThreshold % of initial deposit (triggers 50% max bet reduction)
     * @param criticalBalanceThreshold % of initial deposit (triggers 80% max bet reduction)
     * @param streakProtectionEnabled Enable streak protection
     * @param hourlyPayoutLimit Max hourly payout as % of current balance
     * @param emergencyCooldown Cooldown duration in seconds for emergency withdraw
     */
    function updateProtectionSettings(
        uint256 poolId,
        bool dynamicMaxBetEnabled,
        uint256 lowBalanceThreshold,
        uint256 criticalBalanceThreshold,
        bool streakProtectionEnabled,
        uint256 hourlyPayoutLimit,
        uint256 emergencyCooldown
    ) external {
        Pool storage pool = pools[poolId];
        if (pool.id == 0) revert PoolNotExist();
        if (pool.owner != msg.sender) revert NotPoolOwner();
        
        // Validate thresholds
        if (lowBalanceThreshold < 3000 || lowBalanceThreshold > 7000) revert InvalidBetRange();
        if (criticalBalanceThreshold < 1000 || criticalBalanceThreshold > 4000) revert InvalidBetRange();
        if (criticalBalanceThreshold >= lowBalanceThreshold) revert InvalidBetRange();
        if (hourlyPayoutLimit < 1000 || hourlyPayoutLimit > 5000) revert InvalidBetRange();
        if (emergencyCooldown < 600 || emergencyCooldown > 86400) revert InvalidCount();
        
        PoolProtection storage protection = poolProtection[poolId];
        protection.dynamicMaxBetEnabled = dynamicMaxBetEnabled;
        protection.lowBalanceThreshold = lowBalanceThreshold;
        protection.criticalBalanceThreshold = criticalBalanceThreshold;
        protection.streakProtectionEnabled = streakProtectionEnabled;
        protection.hourlyPayoutLimit = hourlyPayoutLimit;
        
        // Set initial deposit if not already set
        if (protection.initialDeposit == 0) {
            protection.initialDeposit = pool.balance;
        }
        
        // Update emergency cooldown
        PoolEmergency storage emergency = poolEmergency[poolId];
        emergency.cooldownDuration = emergencyCooldown;
        
        emit ProtectionSettingsUpdated(poolId, dynamicMaxBetEnabled, streakProtectionEnabled);
    }
    
    /**
     * @notice Get effective max bet considering dynamic protection
     * @dev Returns reduced max bet if pool balance is below thresholds
     * @param poolId Pool to check
     * @return effectiveMaxBet The actual max bet players can use
     */
    function getEffectiveMaxBet(uint256 poolId) public view returns (uint256 effectiveMaxBet) {
        Pool storage pool = pools[poolId];
        PoolProtection storage protection = poolProtection[poolId];
        
        effectiveMaxBet = pool.maxBet;
        
        if (!protection.dynamicMaxBetEnabled || protection.initialDeposit == 0) {
            return effectiveMaxBet;
        }
        
        // Calculate health ratio (current balance / initial deposit) in basis points
        uint256 healthRatio = (pool.balance * 10000) / protection.initialDeposit;
        
        if (healthRatio < protection.criticalBalanceThreshold) {
            // Critical: 20% of normal max bet
            effectiveMaxBet = pool.maxBet * 20 / 100;
        } else if (healthRatio < protection.lowBalanceThreshold) {
            // Low: 50% of normal max bet
            effectiveMaxBet = pool.maxBet * 50 / 100;
        }
        
        // Ensure minimum bet is still possible
        if (effectiveMaxBet < pool.minBet) {
            effectiveMaxBet = pool.minBet;
        }
        
        return effectiveMaxBet;
    }
    
    /**
     * @notice Trigger emergency mode - starts cooldown timer
     * @dev Pool Owner can trigger when they detect abnormal activity
     * @param poolId Pool to trigger emergency on
     */
    function triggerEmergencyWithdraw(uint256 poolId) external {
        Pool storage pool = pools[poolId];
        if (pool.id == 0) revert PoolNotExist();
        if (pool.owner != msg.sender) revert NotPoolOwner();
        
        PoolEmergency storage emergency = poolEmergency[poolId];
        if (emergency.isTriggered) revert PoolActive();
        
        // Set cooldown if not configured
        if (emergency.cooldownDuration == 0) {
            emergency.cooldownDuration = 1800; // Default 30 minutes
        }
        
        emergency.isTriggered = true;
        emergency.triggeredAt = block.timestamp;
        
        // Deactivate pool immediately to stop new spins
        if (pool.isActive) {
            pool.isActive = false;
            activePoolCount--;
            emit PoolDeactivated(poolId);
        }
        
        emit EmergencyTriggered(poolId, block.timestamp + emergency.cooldownDuration);
    }
    
    /**
     * @notice Execute emergency withdraw after cooldown
     * @dev Withdraws all available funds (respects pending bets)
     * @param poolId Pool to withdraw from
     */
    function executeEmergencyWithdraw(uint256 poolId) external nonReentrant {
        Pool storage pool = pools[poolId];
        if (pool.id == 0) revert PoolNotExist();
        if (pool.owner != msg.sender) revert NotPoolOwner();
        
        PoolEmergency storage emergency = poolEmergency[poolId];
        if (!emergency.isTriggered) revert PoolInactive();
        if (block.timestamp < emergency.triggeredAt + emergency.cooldownDuration) revert NotExpired();
        
        // Calculate withdrawable (respects pending bets)
        uint256 protectedFunds = pool.totalPendingBets + pool.jackpotPool;
        uint256 withdrawable = pool.balance > protectedFunds ? pool.balance - protectedFunds : 0;
        
        if (withdrawable == 0) revert InvalidAmount();
        
        // Reset emergency state
        emergency.isTriggered = false;
        emergency.triggeredAt = 0;
        
        // Withdraw
        pool.balance -= withdrawable;
        if (!banmaoToken.transfer(msg.sender, withdrawable)) revert TransferFailed();
        
        emit EmergencyWithdrawExecuted(poolId, withdrawable);
    }
    
    /**
     * @notice Cancel emergency mode (if owner changes their mind during cooldown)
     * @param poolId Pool to cancel emergency on
     */
    function cancelEmergency(uint256 poolId) external {
        Pool storage pool = pools[poolId];
        if (pool.id == 0) revert PoolNotExist();
        if (pool.owner != msg.sender) revert NotPoolOwner();
        
        PoolEmergency storage emergency = poolEmergency[poolId];
        if (!emergency.isTriggered) revert PoolInactive();
        
        emergency.isTriggered = false;
        emergency.triggeredAt = 0;
    }
    
    /**
     * @notice Get pool health metrics for frontend display
     * @param poolId Pool to check
     * @return healthRatio Current balance / initial deposit (basis points)
     * @return effectiveMaxBet Current effective max bet
     * @return hourlyPayoutUsed Payout used in current hour
     * @return hourlyPayoutLimit Configured hourly limit
     * @return emergencyActive Is emergency mode active
     * @return emergencyCooldownEnds Timestamp when emergency cooldown ends (0 if not active)
     */
    function getPoolHealth(uint256 poolId) external view returns (
        uint256 healthRatio,
        uint256 effectiveMaxBet,
        uint256 hourlyPayoutUsed,
        uint256 hourlyPayoutLimit,
        bool emergencyActive,
        uint256 emergencyCooldownEnds
    ) {
        Pool storage pool = pools[poolId];
        PoolProtection storage protection = poolProtection[poolId];
        PoolEmergency storage emergency = poolEmergency[poolId];
        
        // Calculate health ratio
        if (protection.initialDeposit > 0) {
            healthRatio = (pool.balance * 10000) / protection.initialDeposit;
        }
        
        effectiveMaxBet = getEffectiveMaxBet(poolId);
        
        // Streak protection stats
        if (protection.streakProtectionEnabled && 
            block.timestamp < protection.currentHourStart + 1 hours) {
            hourlyPayoutUsed = protection.currentHourPayout;
        }
        hourlyPayoutLimit = protection.hourlyPayoutLimit;
        
        // Emergency status
        emergencyActive = emergency.isTriggered;
        if (emergencyActive) {
            emergencyCooldownEnds = emergency.triggeredAt + emergency.cooldownDuration;
        }
    }
    
    /**
     * @notice Get full protection settings for a pool
     * @param poolId Pool to query
     */
    function getProtectionSettings(uint256 poolId) external view returns (
        bool dynamicMaxBetEnabled,
        uint256 lowBalanceThreshold,
        uint256 criticalBalanceThreshold,
        bool streakProtectionEnabled,
        uint256 hourlyPayoutLimit,
        uint256 emergencyCooldown,
        uint256 initialDeposit
    ) {
        PoolProtection storage protection = poolProtection[poolId];
        PoolEmergency storage emergency = poolEmergency[poolId];
        
        return (
            protection.dynamicMaxBetEnabled,
            protection.lowBalanceThreshold,
            protection.criticalBalanceThreshold,
            protection.streakProtectionEnabled,
            protection.hourlyPayoutLimit,
            emergency.cooldownDuration,
            protection.initialDeposit
        );
    }
    
    /**
     * @notice Internal function to track hourly payouts for streak protection
     * @dev Called after each payout in _processPayout
     */
    function _updateStreakTracking(uint256 poolId, uint256 payoutAmount) internal {
        PoolProtection storage protection = poolProtection[poolId];
        
        if (!protection.streakProtectionEnabled) {
            return;
        }
        
        // Reset hour if needed
        if (block.timestamp >= protection.currentHourStart + 1 hours) {
            protection.currentHourStart = block.timestamp;
            protection.currentHourPayout = 0;
        }
        
        protection.currentHourPayout += payoutAmount;
        
        // Check if limit exceeded
        Pool storage pool = pools[poolId];
        uint256 limit = (pool.balance * protection.hourlyPayoutLimit) / 10000;
        
        if (protection.currentHourPayout > limit && pool.isActive) {
            pool.isActive = false;
            activePoolCount--;
            emit StreakProtectionTriggered(poolId, protection.currentHourPayout, limit);
            emit PoolDeactivated(poolId);
        }
    }
}
