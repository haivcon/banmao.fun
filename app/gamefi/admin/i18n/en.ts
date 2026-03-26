export const en = {
    title: "GameFi Admin",
    subtitle: "Manage your games",
    backToHub: "Back to Hub",
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
    enabled: "Enabled",
    disabled: "Disabled",

    common: {
        backendConfig: "Backend Configuration",
        smartContract: "Smart Contract (Owner Only)",
        contractParams: "Smart Contract Parameters",
        adminView: "🛡️ You are an Admin.",
        ownerView: "👑 You are the Contract Owner.",
        viewOnly: "👁️ View Only Mode.",
        cooldown: "Claim Cooldown",
        cooldownLabel: "Cooldown (seconds)",
        cooldownHint: "Time between claims (default 300s)"
    },

    tabs: {
        overview: "Overview",
        snake: "Snake Game",
        rps: 'Rock Paper Scissors',
        slots: 'Slots',
        miner: 'Gold Miner',
        fomo: 'FOMO Game',
        admins: 'Admins',
        logs: "Logs",
        system: "System",
        pk: "BanMaoPK"
    },

    fomo: {
        title: "FOMO Game Settings",
        titleV11: "(V11)",
        desc: "Manage the BanMaoFomo FOMO3D-style game",
        status: {
            title: "Game Status",
            currentRound: "Current Round",
            jackpotPool: "Jackpot Pool",
            timeRemaining: "Time Remaining",
            softDeadline: "Soft Deadline",
            hardDeadline: "Hard Deadline",
            totalAttacks: "Total Attacks",
            currentLeader: "Leader",
            stakingAddr: "Staking",
            gameStatus: "Status",
            isPaused: "⏸️ PAUSED",
            isActive: "▶️ ACTIVE",
            isEnded: "Ended"
        },
        config: {
            title: "Active Config (V11)",
            attackCost: "Attack Cost",
            softDuration: "Soft Duration",
            hardDuration: "Hard Duration",
            timeDecreaseStep: "Time Decrease Step",
            maxAttacksPerRound: "Max Attacks/Round",
            winnerPercent: "Winner %",
            topAttackersPercent: "Top Attackers %",
            minAttacksForReward: "Min Attacks for Reward",
            claimExpiration: "Claim Expiration",
            refreshBtn: "Refresh Data"
        },
        schedule: {
            title: "Schedule Config Change",
            note: "V11 Note:",
            noteDesc: "Config changes are scheduled and will apply from the next round, not immediately.",
            attackCostLabel: "Attack Cost (BANMAO)",
            softDurationLabel: "Soft Duration (seconds)",
            hardDurationLabel: "Hard Duration (seconds)",
            decreaseStepLabel: "Decrease Step (seconds)",
            maxAttacksLabel: "Max Attacks/Round",
            minAttacksLabel: "Min Attacks for Reward",
            winnerPercentLabel: "Winner % (0-100)",
            topPercentLabel: "Top Attackers % (0-100)",
            topPercentHint: "Winner% + Top% must = 100",
            claimExpirationLabel: "Claim Expiration (seconds)",
            submitBtn: "Schedule Config for Next Round"
        },
        pause: {
            title: "Pause Control",
            desc: "Pause or resume the game. When paused, no attacks or claims can be made.",
            pauseBtn: "Pause Game",
            pauseConfirm: "Release to Pause",
            resumeBtn: "Resume Game"
        },
        rescue: {
            title: "Distribute Dust",
            desc: "Send any excess tokens (not allocated to jackpot, seed, or vaults) to the staking address.",
            jackpotPool: "Jackpot Pool",
            seedFund: "Seed Fund",
            totalVault: "Total Vault",
            rescueBtn: "Distribute Dust to Staking"
        },
        constants: {
            title: "V11 Constants (Read-Only)",
            cooldownTime: "COOLDOWN_TIME",
            maxClaimBatch: "MAX_CLAIM_BATCH",
            maxTopAttackers: "MAX_TOP_ATTACKERS",
            precision: "PRECISION"
        }
    },


    overview: {
        title: "Graphs & Stats",
        claimsToday: "Claims Today",
        thisHour: "This Hour",
        uniquePlayers: "Unique Players",
        gameStatus: "Game Status",
        active: "Active",
        maintenance: "Maintenance",
        hourlySigned: "Hourly Signed",
        hourlyCap: "Hourly Cap",
        totalAdmins: "Total Admins"
    },

    snake: {
        title: "Snake Game Settings",
        desc: "On-chain parameters (requires transaction)",
        stats: {
            title: 'Live Dashboard',
            poolBalance: 'Pool Balance',
            totalDonated: 'Total Donated',
            totalDonors: 'Donors',
            uniqueAddresses: 'addresses',
            hourlyUsage: 'Hourly Signer Usage',
            currentHourLabel: 'Hour',
            currentConfig: 'Active Configuration',
            minClaim: 'Min Claim',
            maxPerGame: 'Max/Game',
            dailyCap: 'Daily Cap',
            hourlyCap: 'Hourly Cap',
            minDonation: 'Min Donation',
            signer: 'Signer',
            refreshBtn: 'Refresh All Data'
        },
        paused: 'Contract PAUSED',
        running: 'Contract RUNNING',
        pauseHint: 'Pause disables claimReward and donate',
        pauseBtn: '⏸ Pause',
        unpauseBtn: '▶ Unpause',
        minClaim: {
            label: "Min Claim Amount ($BANMAO)",
            hint: "Minimum tokens required to claim. Default: 100"
        },
        maxClaimPerGame: {
            label: "Max Claim Per Game ($BANMAO)",
            hint: "Maximum tokens claimable per single game. Default: 2,000"
        },
        minDonation: {
            label: "Min Donation For Listing ($BANMAO)",
            hint: "Minimum donation to appear in donor leaderboard. Default: 10"
        },
        caps: {
            title: "Rate Limiting Caps",
            desc: "Limit the number of tokens that can be claimed. Contract requires updating both together.",
            dailyPlayer: "Daily Player Cap ($BANMAO)",
            dailyHint: "Max tokens a wallet can claim per day. Default: 5,000",
            hourlySigner: "Hourly Signer Cap ($BANMAO)",
            hourlyHint: "Total tokens the system can sign per hour. Default: 50,000",
            updateBtn: "Update Both Caps"
        },
        signer: {
            title: "Signer Settings",
            desc: "Wallet address used to sign claim rewards.",
            current: "Current Signer",
            newAddress: "New Signer Address",
            updateBtn: "Update Signer",
            hint: "⚠️ After changing, update SIGNER_PRIVATE_KEY in .env"
        },
        danger: {
            title: "Danger Zone",
            desc: "WARNING: These actions are irreversible!",
            currentOwner: "Current Owner",
            transferInput: "Transfer Ownership",
            transferBtn: "Transfer",
            hint: "🔴 AFTER TRANSFER, YOU LOSE CONTROL OF THE CONTRACT!",
            emergencyTitle: "Emergency Withdraw",
            emergencyTo: "Recipient Address",
            emergencyAmount: "Amount ($BANMAO)",
            emergencyBtn: "🚨 Withdraw",
            emergencyHint: "Sends $BANMAO from contract to specified address"
        },
        backend: {
            title: "Backend Settings",
            desc: "Server-side parameters (no transaction required)",
            ratio: "Points to Token Ratio",
            ratioHint: "1 point = X tokens",
            ratioExample: "Example",
            points: "points",
            maxClaims: "Max Claims Per Hour",
            maxClaimsHint: "Maximum claim requests per player per hour",
            maxClaimsExample: "Practical",
            claimsWord: "claims",
            cooldownWord: "cooldown",
            possibleWord: "possible",
            rateLimit: "Cooldown Between Claims (seconds)",
            rateLimitHint: "Wait time in seconds between two consecutive claims",
            rateLimitExample: "A player must wait",
            betweenClaims: "between claims"
        }
    },

    rps: {
        title: "RPS Game Settings",
        desc: "Rock Paper Scissors on-chain game",
        controls: "RPS Game Controls",
        info: "RPS is a fully on-chain PvP game. Game parameters are managed through the smart contract.",
        placeholder: "Add RPS contract integration here when needed."
    },

    slots: {
        title: 'Slots Settings',
        desc: 'Manage slot machine win rates, spin costs, and visual settings.',
        // ... (keep usage of slots keys)
    },
    miner: {
        title: 'Gold Miner Settings',
        desc: 'Manage mining rates, caps, and cooldowns.',
        backend: { // Reusing snake backend keys if possible, or add new ones
            title: 'Backend Config',
            desc: 'Configure server-side validation rules.',
            ratio: 'Difficulty Ratio (higher = harder)',
            maxClaims: 'Max Claims Per Hour',
            rateLimit: 'Rate Limit Window (sec)'
        },
        caps: {
            title: 'Global Limits',
            desc: 'Safety caps to prevent contract drainage.',
            dailyPlayer: 'Daily Player Cap (BANMAO)',
            hourlySigner: 'Hourly Global Cap (BANMAO)',
            dailyHint: 'Max amount a single player can claim per day',
            hourlyHint: 'Max amount the signer can authorize per hour',
            updateBtn: 'Update Caps'
        },
        minClaim: {
            label: 'Minimum Claim Amount',
            hint: 'Minimum BANMAO required to claim reward'
        },
        danger: {
            title: 'Danger Zone',
            currentOwner: 'Current Owner',
            transferInput: 'Transfer Ownership To',
            transferBtn: 'Transfer Ownership',
            hint: 'WARNING: This action cannot be undone.'
        },
        signer: {
            title: 'Signer Management',
            current: 'Current Signer',
            newAddress: 'New Signer Address',
            updateBtn: 'Update Signer',
            hint: 'Signer authorizes all clean requests.'
        }
    },
    admins: {
        title: "Admin Management",
        desc: "Manage wallet addresses for backend config access",
        addLabel: "Add Admin Wallet",
        addBtn: "Add Admin",
        currentList: "Current Admins",
        noAdmins: "No admins added yet",
        remove: "Remove",
        you: "(You)",
        infoTitle: "ℹ️ About Admin Wallets",
        infoDesc: "Admin wallets can modify backend configuration. Only contract owner can add/remove admins."
    },

    logs: {
        title: "Activity Logs",
        desc: "Recent admin actions and system events",
        noLogs: "No activity logs yet"
    },

    system: {
        title: "System Settings",
        desc: "Global system configuration",
        maintenance: {
            title: "Maintenance Mode",
            status: "Status",
            on: "🔴 Maintenance ON",
            active: "🟢 Active",
            enable: "Enable Maintenance",
            disable: "Disable Maintenance",
            messageLabel: "Maintenance Message",
            messagePlaceholder: "Server maintenance in progress...",
            warningTitle: "⚠️ Warning",
            warningDesc: "Enabling maintenance mode will block all claim requests."
        }
    },

    pk: {
        title: "BanMaoPK Settings",
        desc: "Manage BanMaoPK Challenge & Match Configuration",
        config: {
            title: "Contract Configuration",
            minDeposit: "Min Challenge Deposit ($BANMAO)",
            overtime: "Overtime Duration (seconds)",
            shares: "Distribution Shares (must sum to 100%)",
            updateBtn: "Update Shares",
            setBtn: "Set",
            winner: "Winner",
            loser: "Loser",
            voters: "Voters",
            burn: "Burn",
            treasury: "Treasury"
        },
        matches: {
            title: "Match Management",
            create: "Create Admin Match",
            player1: "Player 1",
            player2: "Player 2",
            duration: "Duration (hours)",
            createBtn: "Create Match",
            forceCancel: "Force Cancel Stale Match",
            matchId: "Match ID",
            cancelBtn: "Cancel Match",
            cancelHint: "Refunds all participants. Only for matches older than 3 days."
        },
        recover: {
            title: "Recover Tokens",
            desc: "Recover stuck ERC20 tokens (excluding BANMAO)",
            token: "Token Address",
            amount: "Amount",
            recoverBtn: "Recover",
            warning: "Cannot recover BANMAO (staking token)."
        },
        status: {
            currentMatchId: "Current Match ID",
            pendingWinnings: "My Pending Winnings"
        }
    }
};
