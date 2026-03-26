// lib/abis-v11.ts - BanMaoFomo V11 Contract ABI
// Ultimate Edition with Smart Settle, Timeout mechanism, and Top Attackers rewards

export const BANMAOFOMO_V11_ABI = [
    // ========== CONSTRUCTOR ==========
    {
        inputs: [
            { internalType: "address", name: "_token", type: "address" },
            { internalType: "address", name: "_stakingAddress", type: "address" },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },

    // ========== EVENTS ==========
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

    // ========== MAIN FUNCTIONS ==========
    // V11 Smart Settle - auto-claims all history
    {
        inputs: [],
        name: "settleGame",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Attack function
    {
        inputs: [
            { internalType: "uint256", name: "_count", type: "uint256" },
        ],
        name: "attack",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },

    // ========== ADMIN FUNCTIONS ==========
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

    // ========== VIEW FUNCTIONS ==========
    // getUserStats returns (attacks, vault, cooldown, tier)
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
    // Get top attackers for a round
    {
        inputs: [{ internalType: "uint256", name: "_roundId", type: "uint256" }],
        name: "getTopAttackers",
        outputs: [
            {
                components: [
                    { internalType: "address", name: "addr", type: "address" },
                    { internalType: "uint256", name: "attacks", type: "uint256" },
                ],
                internalType: "struct BanMaoFomoV11.TopAttacker[10]",
                name: "",
                type: "tuple[10]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },

    // ========== STRUCTS & STATE GETTERS ==========
    // activeConfig returns GameConfig struct
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
    // nextConfig for scheduled changes
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
    // Round struct getter (V11 packed struct with uint40 timestamps)
    {
        inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        name: "rounds",
        outputs: [
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

    // ========== STATE VARIABLES ==========
    {
        inputs: [],
        name: "banMaoToken",
        outputs: [{ internalType: "address", name: "", type: "address" }],
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
        name: "PRECISION",
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
        name: "COOLDOWN_TIME",
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

    // ========== MAPPINGS ==========
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
        name: "topAttackersCount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

// Re-export ERC20 ABI
export { ERC20_ABI } from "./abis";
