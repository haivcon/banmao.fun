// DeFi Admin i18n - English
// Detailed hints and annotations for all staking contract admin functions

export const en = {
    title: "DeFi Staking Admin",
    subtitle: "Manage Staking Contract",
    backToHub: "Back to DeFi",
    connectWallet: "Connect your wallet to access admin functions",
    contractOwnerOnly: "Only contract owner can access",
    loading: "Loading...",
    success: "Success",
    error: "Error",
    save: "Save",
    update: "Update",
    processing: "Processing...",
    current: "Current",
    default: "Default",
    confirm: "Confirm",
    cancel: "Cancel",

    tabs: {
        overview: "Overview",
        parameters: "Parameters",
        lockOptions: "Lock Options",
        vipTiers: "VIP Tiers",
        funds: "Funds",
        system: "System"
    },

    overview: {
        title: "Contract Overview",
        desc: "Real-time staking contract statistics",
        totalStaked: "Total Value Locked (TVL)",
        totalStakedHint: "Total tokens currently staked by all users",
        totalShares: "Total Shares",
        totalSharesHint: "Sum of all user shares (amount × multiplier)",
        rewardPool: "Reward Pool",
        rewardPoolHint: "Available tokens for distributing rewards",
        rewardRate: "Reward Rate",
        rewardRateHint: "Tokens distributed per second",
        devFees: "Accumulated Dev Fees",
        devFeesHint: "Fees collected, pending withdrawal",
        healthStatus: "Contract Health",
        healthy: "✅ Healthy",
        unhealthy: "⚠️ Check Required",
        daysLeft: "Reward Days Left",
        daysLeftHint: "Estimated days until reward pool is depleted",
        isPaused: "Contract Status",
        paused: "🔴 Paused",
        active: "🟢 Active"
    },

    parameters: {
        title: "Staking Parameters",
        desc: "Configure core staking settings (requires transaction)",

        rewardRate: {
            label: "Reward Rate (tokens/second)",
            hint: "How many tokens are distributed as rewards per second. Higher = faster reward distribution but depletes pool faster.",
            placeholder: "e.g., 0.01"
        },
        minStake: {
            label: "Minimum Stake Amount",
            hint: "Minimum tokens required to stake. Prevents dust attacks and ensures meaningful participation.",
            placeholder: "e.g., 1"
        },
        maxStake: {
            label: "Maximum Stake Per Wallet",
            hint: "Anti-whale protection. Limits how much a single wallet can stake. Set to 0 for unlimited.",
            placeholder: "e.g., 1000000"
        },
        penalty: {
            label: "Early Unstake Penalty (basis points)",
            hint: "Penalty for unstaking before lock period ends. 1000 = 10%, max 5000 = 50%. Penalty goes to reward pool.",
            placeholder: "e.g., 1000"
        },
        gracePeriod: {
            label: "Grace Period (hours)",
            hint: "Time window after lock ends where user can unstake without penalty and without auto-relock. Max 168 hours (7 days).",
            placeholder: "e.g., 2"
        }
    },

    lockOptions: {
        title: "Lock Options Configuration",
        desc: "Configure lock periods and their reward multipliers",

        optionId: "Option ID",
        days: "Lock Days",
        daysHint: "Number of days tokens are locked. 0 = flexible (no lock)",
        multiplier: "Multiplier (basis points)",
        multiplierHint: "Share multiplier for this lock period. 10000 = 1x, 12000 = 1.2x, 20000 = 2x",

        option0: "Flexible (No Lock)",
        option1: "30 Days Lock",
        option2: "90 Days Lock",
        option3: "180 Days Lock",

        updateBtn: "Update Lock Option"
    },

    vipTiers: {
        title: "VIP Tier Configuration",
        desc: "Configure VIP tiers based on stake amount",

        tierName: "Tier Name",
        tierNameHint: "Display name for this VIP tier (e.g., BRONZE, GOLD, DIAMOND)",
        minAmount: "Minimum Amount",
        minAmountHint: "Minimum stake required to reach this tier",

        addTier: "Add Tier",
        removeTier: "Remove",
        updateBtn: "Save All Tiers",

        warning: "⚠️ This will replace ALL existing VIP tiers!"
    },

    funds: {
        title: "Fund Management",
        desc: "Manage reward pool and accumulated fees",

        donate: {
            label: "Add to Reward Pool",
            hint: "Deposit tokens into the reward pool for distribution to stakers",
            placeholder: "Amount to donate",
            btn: "Donate Tokens"
        },
        withdrawDev: {
            label: "Withdraw Dev Fees",
            hint: "Withdraw accumulated developer fees to dev wallet",
            current: "Accumulated Fees",
            btn: "Withdraw Dev Fees"
        },
        withdrawDust: {
            label: "Withdraw Dust",
            hint: "Withdraw any excess tokens not accounted for (contract balance - TVL - rewards - dev fees)",
            current: "Available Dust",
            btn: "Withdraw Dust"
        }
    },

    system: {
        title: "System Controls",
        desc: "Emergency controls and contract management",

        pause: {
            title: "Emergency Pause",
            desc: "Pause/unpause staking operations",
            status: "Current Status",
            pauseBtn: "🛑 Pause Contract",
            unpauseBtn: "▶️ Resume Contract",
            warning: "⚠️ Pausing will prevent all stake/unstake/compound operations!"
        },

        ownership: {
            title: "Contract Ownership",
            currentOwner: "Current Owner",
            transferHint: "⚠️ DANGER: Transferring ownership is irreversible!",
            transfer: "Transfer Ownership"
        },

        contractInfo: {
            title: "Contract Information",
            address: "Contract Address",
            token: "Staking Token",
            devWallet: "Dev Wallet",
            devFee: "Dev Fee (%)"
        }
    }
};
