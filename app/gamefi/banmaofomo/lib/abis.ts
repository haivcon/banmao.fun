// lib/abis.ts - BanMaoFomo Pure Edition Contract ABIs

export const ERC20_ABI = [
    {
        inputs: [
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ type: "bool" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
        ],
        name: "allowance",
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [{ type: "uint8" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

export const BANMAOFOMO_ABI = [
    // Constructor
    {
        inputs: [
            { internalType: "address", name: "_token", type: "address" },
            { internalType: "address", name: "_stakingAddress", type: "address" },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },

    // Events - Pure Edition
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "jackpotStart", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "hardDeadline", type: "uint256" },
        ],
        name: "RoundStarted",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
            { indexed: true, internalType: "address", name: "player", type: "address" },
            { indexed: false, internalType: "uint256", name: "count", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "jackpot", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "newHardDeadline", type: "uint256" },
        ],
        name: "AttackPerformed",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
            { indexed: true, internalType: "address", name: "winner", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
            { indexed: false, internalType: "string", name: "winType", type: "string" },
        ],
        name: "RoundFinalized",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "user", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "Claimed",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "DistributedToStaking",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: "uint256", name: "roundEffective", type: "uint256" },
        ],
        name: "ConfigScheduled",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "user", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
            { indexed: false, internalType: "bool", name: "fullPrize", type: "bool" },
        ],
        name: "WinnerPrizePaid",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
            { indexed: true, internalType: "address", name: "user", type: "address" },
            { indexed: false, internalType: "uint256", name: "rank", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "TopAttackerRewarded",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
            { indexed: false, internalType: "string", name: "reason", type: "string" },
        ],
        name: "PrizeRolledOver",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: "uint256[4]", name: "thresholds", type: "uint256[4]" },
        ],
        name: "TierThresholdsUpdated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: "uint256[4]", name: "reductions", type: "uint256[4]" },
        ],
        name: "TierCooldownReductionUpdated",
        type: "event",
    },

    // Main Functions - Pure Edition (attack only takes 1 param now)
    {
        inputs: [
            { internalType: "uint256", name: "_count", type: "uint256" },
        ],
        name: "attack",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "settleGame",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },

    // Admin Functions - V11 Edition
    // scheduleConfigChange takes a GameConfig struct tuple
    {
        inputs: [
            {
                components: [
                    { internalType: "uint256", name: "attackCost", type: "uint256" },
                    { internalType: "uint256", name: "softDuration", type: "uint256" },
                    { internalType: "uint256", name: "initialHardDuration", type: "uint256" },
                    { internalType: "uint256", name: "timeDecreaseStep", type: "uint256" },
                    { internalType: "uint256", name: "maxAttacksPerRound", type: "uint256" },
                    { internalType: "uint256", name: "winnerPercent", type: "uint256" },
                    { internalType: "uint256", name: "topAttackersPercent", type: "uint256" },
                    { internalType: "uint256", name: "minAttacksForReward", type: "uint256" },
                    { internalType: "uint256", name: "claimExpirationTime", type: "uint256" },
                ],
                internalType: "struct BanMaoFomoV11.GameConfig",
                name: "_newConfig",
                type: "tuple",
            },
        ],
        name: "scheduleConfigChange",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // activeConfig returns current GameConfig struct
    {
        inputs: [],
        name: "activeConfig",
        outputs: [
            { internalType: "uint256", name: "attackCost", type: "uint256" },
            { internalType: "uint256", name: "softDuration", type: "uint256" },
            { internalType: "uint256", name: "initialHardDuration", type: "uint256" },
            { internalType: "uint256", name: "timeDecreaseStep", type: "uint256" },
            { internalType: "uint256", name: "maxAttacksPerRound", type: "uint256" },
            { internalType: "uint256", name: "winnerPercent", type: "uint256" },
            { internalType: "uint256", name: "topAttackersPercent", type: "uint256" },
            { internalType: "uint256", name: "minAttacksForReward", type: "uint256" },
            { internalType: "uint256", name: "claimExpirationTime", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    // nextConfig returns scheduled GameConfig for next round
    {
        inputs: [],
        name: "nextConfig",
        outputs: [
            { internalType: "uint256", name: "attackCost", type: "uint256" },
            { internalType: "uint256", name: "softDuration", type: "uint256" },
            { internalType: "uint256", name: "initialHardDuration", type: "uint256" },
            { internalType: "uint256", name: "timeDecreaseStep", type: "uint256" },
            { internalType: "uint256", name: "maxAttacksPerRound", type: "uint256" },
            { internalType: "uint256", name: "winnerPercent", type: "uint256" },
            { internalType: "uint256", name: "topAttackersPercent", type: "uint256" },
            { internalType: "uint256", name: "minAttacksForReward", type: "uint256" },
            { internalType: "uint256", name: "claimExpirationTime", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "distributeDust",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "bool", name: "_s", type: "bool" }],
        name: "setPaused",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // VIP Tier Admin Functions
    {
        inputs: [{ internalType: "uint256[4]", name: "_thresholds", type: "uint256[4]" }],
        name: "setTierThresholds",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256[4]", name: "_reductions", type: "uint256[4]" }],
        name: "setTierCooldownReduction",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "getTierThresholds",
        outputs: [{ internalType: "uint256[4]", name: "", type: "uint256[4]" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getTierCooldownReduction",
        outputs: [{ internalType: "uint256[4]", name: "", type: "uint256[4]" }],
        stateMutability: "view",
        type: "function",
    },
    // View Functions - Pure Edition
    // Note: getUserStats returns (attacks, vault, cooldown, tier) - 4 values
    {
        inputs: [{ internalType: "address", name: "_user", type: "address" }],
        name: "getUserStats",
        outputs: [
            { internalType: "uint256", name: "attacks", type: "uint256" },
            { internalType: "uint256", name: "vault", type: "uint256" },
            { internalType: "uint256", name: "cooldown", type: "uint256" },
            { internalType: "uint8", name: "tier", type: "uint8" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "_user", type: "address" }],
        name: "getPlayerTier",
        outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
        stateMutability: "view",
        type: "function",
    },

    // VIP Tier System getters
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "totalLifetimeAttacks",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        name: "tierThresholds",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        name: "tierCooldownReduction",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        name: "rounds",
        outputs: [
            // V11 struct order: softDeadline, hardDeadline, ended, lastAttacker, totalAttacks, accRewardPerAttack
            { internalType: "uint40", name: "softDeadline", type: "uint40" },
            { internalType: "uint40", name: "hardDeadline", type: "uint40" },
            { internalType: "bool", name: "ended", type: "bool" },
            { internalType: "address", name: "lastAttacker", type: "address" },
            { internalType: "uint256", name: "totalAttacks", type: "uint256" },
            { internalType: "uint256", name: "accRewardPerAttack", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },

    // State Variables (public getters) — V11
    {
        inputs: [],
        name: "banMaoToken",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "currentRound",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "jackpotPool",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "seedFundNextRound",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "totalVaultBalance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
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
    {
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "stakingAddress",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "COOLDOWN_TIME",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "MAX_CLAIM_BATCH",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "MAX_TOP_ATTACKERS",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },

    // Mappings
    {
        inputs: [
            { internalType: "uint256", name: "", type: "uint256" },
            { internalType: "address", name: "", type: "address" },
        ],
        name: "userAttacks",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint256", name: "", type: "uint256" },
            { internalType: "address", name: "", type: "address" },
        ],
        name: "rewardDebt",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "personalVault",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "lastAttackTimestamp",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "totalLifetimeAttacks",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },

    // Constants
    {
        inputs: [],
        name: "PRECISION",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "BURN_ADDRESS",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

export const BANMAOPK_ABI = [
    // === CONSTRUCTOR ===
    {
        inputs: [
            { internalType: "address", name: "_token", type: "address" },
            { internalType: "address", name: "_treasury", type: "address" },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },

    // === EVENTS ===
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "challengeId", type: "uint256" },
            { indexed: true, internalType: "address", name: "host", type: "address" },
            { indexed: true, internalType: "address", name: "target", type: "address" },
            { indexed: false, internalType: "uint256", name: "deposit", type: "uint256" },
        ],
        name: "ChallengeCreated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "challengeId", type: "uint256" },
            { indexed: true, internalType: "address", name: "challenger", type: "address" },
            { indexed: false, internalType: "uint256", name: "matchId", type: "uint256" },
        ],
        name: "ChallengeAccepted",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [{ indexed: true, internalType: "uint256", name: "challengeId", type: "uint256" }],
        name: "ChallengeCancelled",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "matchId", type: "uint256" },
            { indexed: true, internalType: "address", name: "p1", type: "address" },
            { indexed: true, internalType: "address", name: "p2", type: "address" },
            { indexed: false, internalType: "uint256", name: "endTime", type: "uint256" },
        ],
        name: "MatchCreated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "matchId", type: "uint256" },
            { indexed: true, internalType: "address", name: "voter", type: "address" },
            { indexed: true, internalType: "address", name: "candidate", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "Voted",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "matchId", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "newEndTime", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "currentScore", type: "uint256" },
        ],
        name: "MatchExtended",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "matchId", type: "uint256" },
            { indexed: false, internalType: "address", name: "winner", type: "address" },
            { indexed: false, internalType: "uint256", name: "totalPool", type: "uint256" },
        ],
        name: "MatchFinalized",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "matchId", type: "uint256" },
            { indexed: false, internalType: "address", name: "potentialWinner", type: "address" },
            { indexed: false, internalType: "uint256", name: "totalPool", type: "uint256" },
        ],
        name: "MatchRefunded",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [{ indexed: true, internalType: "uint256", name: "matchId", type: "uint256" }],
        name: "MatchForceCancelled",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "matchId", type: "uint256" },
            { indexed: true, internalType: "address", name: "voter", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "RewardClaimed",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "matchId", type: "uint256" },
            { indexed: true, internalType: "address", name: "voter", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "RefundClaimed",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "receiver", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "WinningsWithdrawn",
        type: "event",
    },

    // === STATE VARIABLES (READ) ===
    { inputs: [], name: "currentChallengeId", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "currentMatchId", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "minChallengeDeposit", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "overtimeDuration", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "votersShare", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "winnerShare", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "loserShare", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "burnShare", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [], name: "treasuryShare", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
    { inputs: [{ type: "address" }], name: "pendingWinnings", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },

    // === CHALLENGE STRUCT GETTER ===
    {
        inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        name: "challenges",
        outputs: [
            { internalType: "address", name: "host", type: "address" },
            { internalType: "address", name: "target", type: "address" },
            { internalType: "uint256", name: "deposit", type: "uint256" },
            { internalType: "uint256", name: "duration", type: "uint256" },
            { internalType: "bool", name: "isActive", type: "bool" },
        ],
        stateMutability: "view",
        type: "function",
    },

    // === MATCH STRUCT GETTER (Partial - mappings excluded) ===
    {
        inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        name: "matches",
        outputs: [
            { internalType: "address", name: "player1", type: "address" },
            { internalType: "address", name: "player2", type: "address" },
            { internalType: "uint256", name: "score1", type: "uint256" },
            { internalType: "uint256", name: "score2", type: "uint256" },
            { internalType: "uint256", name: "startTime", type: "uint256" },
            { internalType: "uint256", name: "endTime", type: "uint256" },
            { internalType: "bool", name: "finalized", type: "bool" },
            { internalType: "bool", name: "isRefunded", type: "bool" },
            { internalType: "uint256", name: "overtimeCount", type: "uint256" },
            { internalType: "uint256", name: "totalPool", type: "uint256" },
            { internalType: "uint256", name: "totalVotes1", type: "uint256" },
            { internalType: "uint256", name: "totalVotes2", type: "uint256" },
            { internalType: "uint256", name: "finalizedVotersShare", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },

    // === WRITE FUNCTIONS ===
    {
        inputs: [
            { internalType: "uint256", name: "_duration", type: "uint256" },
            { internalType: "uint256", name: "_depositAmount", type: "uint256" },
            { internalType: "address", name: "_target", type: "address" },
        ],
        name: "createChallenge",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_challengeId", type: "uint256" }],
        name: "acceptChallenge",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_challengeId", type: "uint256" }],
        name: "cancelChallenge",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint256", name: "_matchId", type: "uint256" },
            { internalType: "address", name: "_candidate", type: "address" },
            { internalType: "uint256", name: "_amount", type: "uint256" },
        ],
        name: "vote",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_matchId", type: "uint256" }],
        name: "finalizeMatch",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_matchId", type: "uint256" }],
        name: "claimReward",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "withdrawWinnings",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_matchId", type: "uint256" }, { internalType: "address", name: "_user", type: "address" }],
        name: "hasClaimedReward",
        outputs: [{ type: "bool" }],
        stateMutability: "view",
        type: "function",
    },

    // === ADMIN FUNCTIONS ===
    {
        inputs: [
            { internalType: "address", name: "_p1", type: "address" },
            { internalType: "address", name: "_p2", type: "address" },
            { internalType: "uint256", name: "_duration", type: "uint256" },
        ],
        name: "createMatch",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
        name: "setMinChallengeDeposit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_seconds", type: "uint256" }],
        name: "setOvertimeDuration",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint256", name: "_w", type: "uint256" },
            { internalType: "uint256", name: "_l", type: "uint256" },
            { internalType: "uint256", name: "_v", type: "uint256" },
            { internalType: "uint256", name: "_b", type: "uint256" },
            { internalType: "uint256", name: "_t", type: "uint256" },
        ],
        name: "setDistributionShares",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_matchId", type: "uint256" }],
        name: "forceCancelStaleMatch",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "_token", type: "address" },
            { internalType: "uint256", name: "_amount", type: "uint256" },
        ],
        name: "recoverStuckToken",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

// ============================
// BANMAOFOMO V3 - JACKPOT TIER SYSTEM ABI
// ============================
export const BANMAOFOMO_V3_ABI = [
    // Inherits all base events from BANMAOFOMO_ABI plus new tier events:

    // NEW V3 Events
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
            { indexed: true, internalType: "address", name: "user", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
            { indexed: false, internalType: "string", name: "reason", type: "string" },
        ],
        name: "RewardForfeited",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
            { indexed: true, internalType: "address", name: "user", type: "address" },
            { indexed: false, internalType: "uint256", name: "rank", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "TopAttackerRewarded",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "uint256", name: "roundId", type: "uint256" },
            { indexed: true, internalType: "address", name: "user", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "LuckyDrawWinner",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: "uint256", name: "winnerPercent", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "topPercent", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "luckyPercent", type: "uint256" },
        ],
        name: "TierConfigUpdated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: false, internalType: "uint256", name: "newMin", type: "uint256" },
        ],
        name: "MinAttacksUpdated",
        type: "event",
    },

    // V3 Admin Functions
    {
        inputs: [
            { internalType: "uint256", name: "_winnerPercent", type: "uint256" },
            { internalType: "uint256", name: "_topPercent", type: "uint256" },
            { internalType: "uint256", name: "_luckyPercent", type: "uint256" },
        ],
        name: "setTierConfig",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_min", type: "uint256" }],
        name: "setMinAttacksForReward",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },

    // V3 View Functions
    {
        inputs: [{ internalType: "address", name: "_user", type: "address" }],
        name: "getUserStats",
        outputs: [
            { internalType: "uint256", name: "attacks", type: "uint256" },
            { internalType: "uint256", name: "vault", type: "uint256" },
            { internalType: "uint256", name: "cooldown", type: "uint256" },
            { internalType: "uint8", name: "tier", type: "uint8" },
            { internalType: "uint256", name: "lifetimeAttacks", type: "uint256" },
            { internalType: "bool", name: "qualifiesForReward", type: "bool" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getTierConfig",
        outputs: [
            { internalType: "uint256", name: "winner", type: "uint256" },
            { internalType: "uint256", name: "top", type: "uint256" },
            { internalType: "uint256", name: "lucky", type: "uint256" },
            { internalType: "uint256", name: "minAttacks", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_roundId", type: "uint256" }],
        name: "getTopAttackers",
        outputs: [
            {
                components: [
                    { internalType: "address", name: "addr", type: "address" },
                    { internalType: "uint256", name: "attacks", type: "uint256" },
                ],
                internalType: "struct BanMaoFomoV3.TopAttacker[10]",
                name: "",
                type: "tuple[10]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "_user", type: "address" }],
        name: "qualifiesForReward",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_roundId", type: "uint256" }],
        name: "getRoundParticipantCount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },

    // State Variables
    {
        inputs: [],
        name: "winnerPercent",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "topAttackersPercent",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "luckyDrawPercent",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "minAttacksForReward",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
] as const;
