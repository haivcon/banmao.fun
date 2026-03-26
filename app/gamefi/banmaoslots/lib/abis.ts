// app/gamefi/banmaoslots/lib/abis.ts
// Contract ABIs for BanmaoSlots v2.1

export const SLOTS_ABI = [
    // ============ Ownable / Pausable Functions ============
    {
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "paused",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    // ============ Core Functions ============
    // Commit spin (single)
    {
        inputs: [
            { internalType: "uint256", name: "poolId", type: "uint256" },
            { internalType: "bytes32", name: "hashedSeed", type: "bytes32" },
            { internalType: "uint256", name: "betAmount", type: "uint256" },
        ],
        name: "commitSpin",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Commit multi-spin (1-10 spins)
    {
        inputs: [
            { internalType: "uint256", name: "poolId", type: "uint256" },
            { internalType: "bytes32", name: "hashedSeed", type: "bytes32" },
            { internalType: "uint256", name: "betAmountPerSpin", type: "uint256" },
            { internalType: "uint256", name: "spinCount", type: "uint256" },
        ],
        name: "commitMultiSpin",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Reveal spin
    {
        inputs: [{ internalType: "bytes32", name: "seed", type: "bytes32" }],
        name: "revealSpin",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Settle expired commit - player forfeits bet (treated as loss)
    {
        inputs: [],
        name: "settleExpiredCommit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },

    // ============ View Functions ============
    {
        inputs: [{ internalType: "address", name: "player", type: "address" }],
        name: "getPendingCommit",
        outputs: [
            { internalType: "uint256", name: "poolId", type: "uint256" },
            { internalType: "bytes32", name: "hashedSeed", type: "bytes32" },
            { internalType: "uint256", name: "betAmount", type: "uint256" },
            { internalType: "uint256", name: "blockNumber", type: "uint256" },
            { internalType: "bool", name: "revealed", type: "bool" },
            { internalType: "bool", name: "expired", type: "bool" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        name: "getPool",
        outputs: [
            {
                components: [
                    { internalType: "uint256", name: "id", type: "uint256" },
                    { internalType: "address", name: "owner", type: "address" },
                    { internalType: "string", name: "name", type: "string" },
                    { internalType: "uint256", name: "balance", type: "uint256" },
                    { internalType: "uint256", name: "minBet", type: "uint256" },
                    { internalType: "uint256", name: "maxBet", type: "uint256" },
                    { internalType: "uint256", name: "jackpotPercent", type: "uint256" },
                    { internalType: "uint256", name: "jackpotPool", type: "uint256" },
                    { internalType: "uint256", name: "totalSpins", type: "uint256" },
                    { internalType: "uint256", name: "totalBetsVolume", type: "uint256" },
                    { internalType: "uint256", name: "totalPayoutsVolume", type: "uint256" },
                    { internalType: "uint256", name: "totalPendingBets", type: "uint256" },
                    { internalType: "bool", name: "isActive", type: "bool" },
                    { internalType: "uint256", name: "createdAt", type: "uint256" },
                ],
                internalType: "struct BanmaoSlotsMultiPool.Pool",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "nonces",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // Pool stats (replaces House stats)
    {
        inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        name: "getPoolStats",
        outputs: [
            { internalType: "uint256", name: "totalBetsVolume", type: "uint256" },
            { internalType: "uint256", name: "totalPayoutsVolume", type: "uint256" },
            { internalType: "uint256", name: "totalSpins", type: "uint256" },
            { internalType: "uint256", name: "profitLoss", type: "uint256" },
            { internalType: "uint256", name: "poolRtpBps", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    // Player stats per pool
    {
        inputs: [
            { internalType: "uint256", name: "poolId", type: "uint256" },
            { internalType: "address", name: "player", type: "address" },
        ],
        name: "getPlayerPoolStats",
        outputs: [
            {
                components: [
                    { internalType: "uint256", name: "totalBets", type: "uint256" },
                    { internalType: "uint256", name: "totalWins", type: "uint256" },
                    { internalType: "uint256", name: "totalPayout", type: "uint256" },
                    { internalType: "uint256", name: "biggestWin", type: "uint256" },
                    { internalType: "uint256", name: "jackpotsWon", type: "uint256" },
                    { internalType: "uint256", name: "spins", type: "uint256" },
                ],
                internalType: "struct BanmaoSlotsMultiPool.PlayerPoolStats",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    // State variables
    {
        inputs: [],
        name: "banmaoToken",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "commitExpiryBlocks",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "maxSpinsPerMinute",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "platformPoolId",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // ============ Pool Management Functions ============
    // Create Pool
    {
        inputs: [
            { internalType: "string", name: "name", type: "string" },
            { internalType: "uint256", name: "initialDeposit", type: "uint256" },
            { internalType: "uint256", name: "minBet", type: "uint256" },
            { internalType: "uint256", name: "maxBet", type: "uint256" },
            { internalType: "uint256", name: "jackpotPercent", type: "uint256" },
        ],
        name: "createPool",
        outputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Pools mapping (get single pool by ID)
    {
        inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        name: "pools",
        outputs: [
            { internalType: "uint256", name: "id", type: "uint256" },
            { internalType: "address", name: "owner", type: "address" },
            { internalType: "string", name: "name", type: "string" },
            { internalType: "uint256", name: "balance", type: "uint256" },
            { internalType: "uint256", name: "minBet", type: "uint256" },
            { internalType: "uint256", name: "maxBet", type: "uint256" },
            { internalType: "uint256", name: "jackpotPercent", type: "uint256" },
            { internalType: "uint256", name: "jackpotPool", type: "uint256" },
            { internalType: "uint256", name: "totalSpins", type: "uint256" },
            { internalType: "uint256", name: "totalBetsVolume", type: "uint256" },
            { internalType: "uint256", name: "totalPayoutsVolume", type: "uint256" },
            { internalType: "uint256", name: "totalPendingBets", type: "uint256" },
            { internalType: "bool", name: "isActive", type: "bool" },
            { internalType: "uint256", name: "createdAt", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    // Deposit to Pool
    {
        inputs: [
            { internalType: "uint256", name: "poolId", type: "uint256" },
            { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "depositToPool",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Withdraw from Pool
    {
        inputs: [
            { internalType: "uint256", name: "poolId", type: "uint256" },
            { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "withdrawFromPool",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Update Pool Settings
    {
        inputs: [
            { internalType: "uint256", name: "poolId", type: "uint256" },
            { internalType: "uint256", name: "minBet", type: "uint256" },
            { internalType: "uint256", name: "maxBet", type: "uint256" },
            { internalType: "uint256", name: "jackpotPercent", type: "uint256" },
        ],
        name: "updatePoolSettings",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Deactivate Pool
    {
        inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        name: "deactivatePool",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Reactivate Pool
    {
        inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        name: "reactivatePool",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Close Pool
    {
        inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        name: "closePool",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Transfer Pool Ownership
    {
        inputs: [
            { internalType: "uint256", name: "poolId", type: "uint256" },
            { internalType: "address", name: "newOwner", type: "address" },
        ],
        name: "transferPoolOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Get User Pools (returns full array of pool IDs owned by user)
    {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "getUserPools",
        outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
        stateMutability: "view",
        type: "function",
    },
    // Min Pool Deposit
    {
        inputs: [],
        name: "minPoolDeposit",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // Max Pools Per User
    {
        inputs: [],
        name: "maxPoolsPerUser",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // Active Pool Count
    {
        inputs: [],
        name: "activePoolCount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // Platform Pool ID
    {
        inputs: [],
        name: "platformPoolId",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // Max Spins Per Minute
    {
        inputs: [],
        name: "maxSpinsPerMinute",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // Commit Expiry Blocks
    {
        inputs: [],
        name: "commitExpiryBlocks",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // Get Active Pools Paginated
    {
        inputs: [
            { internalType: "uint256", name: "offset", type: "uint256" },
            { internalType: "uint256", name: "limit", type: "uint256" },
        ],
        name: "getActivePoolsPaginated",
        outputs: [
            {
                components: [
                    { internalType: "uint256", name: "id", type: "uint256" },
                    { internalType: "address", name: "owner", type: "address" },
                    { internalType: "string", name: "name", type: "string" },
                    { internalType: "uint256", name: "balance", type: "uint256" },
                    { internalType: "uint256", name: "minBet", type: "uint256" },
                    { internalType: "uint256", name: "maxBet", type: "uint256" },
                    { internalType: "uint256", name: "jackpotPercent", type: "uint256" },
                    { internalType: "uint256", name: "jackpotPool", type: "uint256" },
                    { internalType: "uint256", name: "totalSpins", type: "uint256" },
                    { internalType: "uint256", name: "totalBetsVolume", type: "uint256" },
                    { internalType: "uint256", name: "totalPayoutsVolume", type: "uint256" },
                    { internalType: "uint256", name: "totalPendingBets", type: "uint256" },
                    { internalType: "bool", name: "isActive", type: "bool" },
                    { internalType: "uint256", name: "createdAt", type: "uint256" },
                ],
                internalType: "struct BanmaoSlotsMultiPool.Pool[]",
                name: "",
                type: "tuple[]",
            },
            { internalType: "uint256", name: "total", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    // ============ Admin Functions (onlyOwner) ============
    // Set Min Pool Deposit
    {
        inputs: [{ internalType: "uint256", name: "_minDeposit", type: "uint256" }],
        name: "setMinPoolDeposit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Set Max Pools Per User
    {
        inputs: [{ internalType: "uint256", name: "_max", type: "uint256" }],
        name: "setMaxPoolsPerUser",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Set Max Spins Per Minute
    {
        inputs: [{ internalType: "uint256", name: "_maxSpins", type: "uint256" }],
        name: "setMaxSpinsPerMinute",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Set Commit Expiry Blocks
    {
        inputs: [{ internalType: "uint256", name: "_blocks", type: "uint256" }],
        name: "setCommitExpiryBlocks",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Pause
    {
        inputs: [],
        name: "pause",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Unpause
    {
        inputs: [],
        name: "unpause",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Withdraw Platform Fees
    {
        inputs: [],
        name: "withdrawPlatformFees",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Platform Earnings (view)
    {
        inputs: [],
        name: "platformEarnings",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // Create Platform Pool
    {
        inputs: [
            { internalType: "string", name: "name", type: "string" },
            { internalType: "uint256", name: "initialDeposit", type: "uint256" },
            { internalType: "uint256", name: "minBet", type: "uint256" },
            { internalType: "uint256", name: "maxBet", type: "uint256" },
            { internalType: "uint256", name: "jackpotPercent", type: "uint256" },
        ],
        name: "createPlatformPool",
        outputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    // ============ Events ============
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "poolId", type: "uint256" },
            { indexed: true, internalType: "address", name: "player", type: "address" },
            { indexed: false, internalType: "bytes32", name: "hashedSeed", type: "bytes32" },
            { indexed: false, internalType: "uint256", name: "betAmount", type: "uint256" },
        ],
        name: "SpinCommitted",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "poolId", type: "uint256" },
            { indexed: true, internalType: "address", name: "player", type: "address" },
            { indexed: false, internalType: "uint8[5]", name: "result", type: "uint8[5]" },
            { indexed: false, internalType: "uint256", name: "payout", type: "uint256" },
            { indexed: false, internalType: "bool", name: "isJackpot", type: "bool" },
            { indexed: false, internalType: "bytes32", name: "seed", type: "bytes32" },
        ],
        name: "SpinRevealed",
        type: "event",
    },
    // Multi-spin summary event
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "poolId", type: "uint256" },
            { indexed: true, internalType: "address", name: "player", type: "address" },
            { indexed: false, internalType: "uint256", name: "spinCount", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "totalPayout", type: "uint256" },
            { indexed: false, internalType: "bool", name: "hasJackpot", type: "bool" },
        ],
        name: "MultiSpinRevealed",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "poolId", type: "uint256" },
            { indexed: true, internalType: "address", name: "player", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "JackpotWon",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "poolId", type: "uint256" },
            { indexed: true, internalType: "address", name: "player", type: "address" },
            { indexed: false, internalType: "uint256", name: "refundAmount", type: "uint256" },
        ],
        name: "CommitExpired",
        type: "event",
    },
    // ============ Management Functions (Partial) ============
    {
        inputs: [
            { internalType: "string", name: "name", type: "string" },
            { internalType: "uint256", name: "initialDeposit", type: "uint256" },
            { internalType: "uint256", name: "minBet", type: "uint256" },
            { internalType: "uint256", name: "maxBet", type: "uint256" },
            { internalType: "uint256", name: "jackpotPercent", type: "uint256" },
        ],
        name: "createPool",
        outputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "string", name: "name", type: "string" },
            { internalType: "uint256", name: "initialDeposit", type: "uint256" },
            { internalType: "uint256", name: "minBet", type: "uint256" },
            { internalType: "uint256", name: "maxBet", type: "uint256" },
            { internalType: "uint256", name: "jackpotPercent", type: "uint256" },
        ],
        name: "createPlatformPool",
        outputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    // ============ Batch Settle Functions (New in V2) ============
    // Settle expired commit by pool owner (for specific player)
    {
        inputs: [
            { internalType: "uint256", name: "poolId", type: "uint256" },
            { internalType: "address", name: "player", type: "address" },
        ],
        name: "settleExpiredCommitByOwner",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Batch settle expired commits (for multiple players at once)
    {
        inputs: [
            { internalType: "uint256", name: "poolId", type: "uint256" },
            { internalType: "uint256", name: "maxCount", type: "uint256" },
            { internalType: "uint256", name: "startIndex", type: "uint256" },
            { internalType: "uint256", name: "maxIterations", type: "uint256" },
        ],
        name: "batchSettleExpiredCommits",
        outputs: [{ internalType: "uint256", name: "settled", type: "uint256" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Get expired pending players (paginated view)
    {
        inputs: [
            { internalType: "uint256", name: "poolId", type: "uint256" },
            { internalType: "uint256", name: "offset", type: "uint256" },
            { internalType: "uint256", name: "limit", type: "uint256" },
        ],
        name: "getExpiredPendingPlayers",
        outputs: [
            { internalType: "address[]", name: "expiredPlayers", type: "address[]" },
            { internalType: "uint256[]", name: "expiredBets", type: "uint256[]" },
            { internalType: "uint256", name: "totalPending", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    // Get pending players count for a pool
    {
        inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        name: "getPendingPlayersCount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // ============ Pool Protection Functions ============
    // Update protection settings
    {
        inputs: [
            { internalType: "uint256", name: "poolId", type: "uint256" },
            { internalType: "bool", name: "dynamicMaxBetEnabled", type: "bool" },
            { internalType: "uint256", name: "lowBalanceThreshold", type: "uint256" },
            { internalType: "uint256", name: "criticalBalanceThreshold", type: "uint256" },
            { internalType: "bool", name: "streakProtectionEnabled", type: "bool" },
            { internalType: "uint256", name: "hourlyPayoutLimit", type: "uint256" },
            { internalType: "uint256", name: "emergencyCooldown", type: "uint256" },
        ],
        name: "updateProtectionSettings",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Get protection settings
    {
        inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        name: "getProtectionSettings",
        outputs: [
            { internalType: "bool", name: "dynamicMaxBetEnabled", type: "bool" },
            { internalType: "uint256", name: "lowBalanceThreshold", type: "uint256" },
            { internalType: "uint256", name: "criticalBalanceThreshold", type: "uint256" },
            { internalType: "bool", name: "streakProtectionEnabled", type: "bool" },
            { internalType: "uint256", name: "hourlyPayoutLimit", type: "uint256" },
            { internalType: "uint256", name: "emergencyCooldown", type: "uint256" },
            { internalType: "uint256", name: "initialDeposit", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    // Get pool health metrics
    {
        inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        name: "getPoolHealth",
        outputs: [
            { internalType: "uint256", name: "healthRatio", type: "uint256" },
            { internalType: "uint256", name: "effectiveMaxBet", type: "uint256" },
            { internalType: "uint256", name: "hourlyPayoutUsed", type: "uint256" },
            { internalType: "uint256", name: "hourlyPayoutLimit", type: "uint256" },
            { internalType: "bool", name: "emergencyActive", type: "bool" },
            { internalType: "uint256", name: "emergencyCooldownEnds", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    // Get effective max bet
    {
        inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        name: "getEffectiveMaxBet",
        outputs: [{ internalType: "uint256", name: "effectiveMaxBet", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // Trigger emergency withdraw
    {
        inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        name: "triggerEmergencyWithdraw",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Execute emergency withdraw
    {
        inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        name: "executeEmergencyWithdraw",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Cancel emergency
    {
        inputs: [{ internalType: "uint256", name: "poolId", type: "uint256" }],
        name: "cancelEmergency",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // ============ Verification Function (V2) ============
    // Verify spin result off-chain
    {
        inputs: [
            { internalType: "bytes32", name: "seed", type: "bytes32" },
            { internalType: "uint256", name: "blockNumber", type: "uint256" },
            { internalType: "address", name: "player", type: "address" },
            { internalType: "uint256", name: "poolId", type: "uint256" },
        ],
        name: "verifySpinResult",
        outputs: [{ internalType: "uint8[5]", name: "result", type: "uint8[5]" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

// ERC20 Token ABI
export const ERC20_ABI = [
    {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "value", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "owner", type: "address" },
            { internalType: "address", name: "spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

// Contract addresses - Update after deployment
export const SLOTS_CONTRACT_ADDRESS = "0x9c64c18D792Eab435d1d921efaC978F6A62da2d2";
export const BANMAO_TOKEN_ADDRESS = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";

// Slot symbols
export const SLOT_SYMBOLS = ["🐱", "🍌", "💎", "🌟", "🍀", "7️⃣"] as const;

export const SYMBOL_NAMES = {
    0: "Banmao",
    1: "Banana",
    2: "Diamond",
    3: "Star",
    4: "Clover",
    5: "Seven",
} as const;

// Symbol probabilities
export const SYMBOL_PROBABILITIES = {
    0: 5,    // Banmao: 5%
    1: 8,    // Banana: 8%
    2: 15,   // Diamond: 15%
    3: 20,   // Star: 20%
    4: 25,   // Clover: 25%
    5: 27,   // Seven: 27%
} as const;

// Payout table (in x multiplier) - V2 values for ~95% RTP
export const PAYOUT_TABLE = {
    0: { 3: 9, 4: 45, 5: 175 },      // Banmao (+ jackpot for 5-match)
    1: { 3: 7, 4: 35, 5: 125 },      // Banana
    2: { 3: 4.5, 4: 17, 5: 70 },     // Diamond
    3: { 3: 2.5, 4: 13, 5: 45 },     // Star
    4: { 3: 1.8, 4: 7, 5: 22 },      // Clover
    5: { 3: 1.3, 4: 4.5, 5: 13 },    // Seven
} as const;

// Game configuration defaults
export const GAME_CONFIG = {
    MIN_BET: 100,           // 100 $BANMAO
    MAX_BET: 10000,         // 10,000 $BANMAO
    JACKPOT_MULTIPLIER: 450, // 450x for jackpot (V2)
    JACKPOT_PERCENTAGE: 2,   // 2% of bets go to jackpot
    COMMIT_EXPIRY_BLOCKS: 256,
    MAX_SPINS_PER_MINUTE: 10,
} as const;

// Helper to format token amount
export function formatTokenAmount(amount: bigint | undefined | null, decimals: number = 18): string {
    if (amount === undefined || amount === null) return "0";
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const frac = amount % divisor;
    const fracStr = frac.toString().padStart(decimals, '0').slice(0, 2);
    return `${whole.toLocaleString()}.${fracStr}`;
}

// Helper to parse token amount
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
    const [whole, frac = ''] = amount.split('.');
    const fracPadded = frac.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(whole + fracPadded);
}
