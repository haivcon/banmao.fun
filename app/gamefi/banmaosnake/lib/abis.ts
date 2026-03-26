// app/game/banmaosnake/lib/abis.ts

export const SNAKE_ABI = [
    {
        inputs: [
            { internalType: "uint256", name: "amount", type: "uint256" },
            { internalType: "uint256", name: "nonce", type: "uint256" },
            { internalType: "uint256", name: "deadline", type: "uint256" },
            { internalType: "bytes", name: "signature", type: "bytes" },
        ],
        name: "claimReward",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "nonces",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "userWithdrawals",
        outputs: [
            { internalType: "uint128", name: "dailyAmount", type: "uint128" },
            { internalType: "uint128", name: "lastUpdateDay", type: "uint128" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "dailyPlayerCap",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "hourlySignedAmount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "hourlySignerCap",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "minClaimAmount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "banmaoToken",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "player", type: "address" },
            { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "nonce", type: "uint256" },
        ],
        name: "RewardClaimed",
        type: "event",
    },
    // Owner functions for admin dashboard
    {
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "signerAddress",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_minAmount", type: "uint256" }],
        name: "setMinClaim",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint256", name: "_dailyPlayer", type: "uint256" },
            { internalType: "uint256", name: "_hourlySigner", type: "uint256" }
        ],
        name: "updateCaps",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "_newSigner", type: "address" }],
        name: "setSigner",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // 🔒 V6: Pause / Unpause
    {
        inputs: [],
        name: "pause",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "unpause",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "paused",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    // 🔒 V6: Emergency Withdraw
    {
        inputs: [
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
        ],
        name: "emergencyWithdraw",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Max claim per game
    {
        inputs: [],
        name: "maxClaimPerGame",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_maxClaim", type: "uint256" }],
        name: "setMaxClaimPerGame",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Min donation for listing
    {
        inputs: [],
        name: "minDonationForListing",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "_minDonation", type: "uint256" }],
        name: "setMinDonationForListing",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // 🎁 V6: Donate
    {
        inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
        name: "donate",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "donatedAmount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "totalDonatedAmount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getTotalDonors",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "uint256", name: "offset", type: "uint256" },
            { internalType: "uint256", name: "limit", type: "uint256" },
        ],
        name: "getDonorsPage",
        outputs: [
            { internalType: "address[]", name: "addrs", type: "address[]" },
            { internalType: "uint256[]", name: "amounts", type: "uint256[]" },
        ],
        stateMutability: "view",
        type: "function",
    },
    // Current hour tracker
    {
        inputs: [],
        name: "currentHour",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

export const ERC20_ABI = [
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
    {
        inputs: [],
        name: "symbol",
        outputs: [{ type: "string" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
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
] as const;
