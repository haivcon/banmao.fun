export const STAKING_CONTRACT_ADDRESS = '0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172' as const;
export const BANMAO_TOKEN_ADDRESS = '0x16d91d1615fc55b76d5f92365bd60c069b46ef78' as const;
export const XLAYER_CHAIN_ID = 196;

// ============ Types ============
export interface StakeEntry {
    id: number;
    amount: bigint;
    shares: bigint;
    lockEndTime: bigint;
    startTime: bigint;
    lockOptionId: number;
    active: boolean;
    isLocked: boolean;
    inGracePeriod: boolean;
    estimatedPenalty: bigint;
}

export interface UserSummary {
    totalAmount: bigint;
    totalShares: bigint;
    rewardDebt: bigint;
    stakeCount: number;
    nextStakeId: number;
    lastStakeBlock: bigint;
}

export const MAX_STAKES_PER_USER = 20;

export const LOCK_OPTIONS_INFO = [
    { id: 0, name: 'Flexible', nameKey: 'lockFlexible', days: 0, daysLocked: 0, multiplier: 1.0, color: '#60a5fa' },
    { id: 1, name: '30 Days', nameKey: 'lock30Days', days: 30, daysLocked: 30, multiplier: 1.2, color: '#4ade80' },
    { id: 2, name: '90 Days', nameKey: 'lock90Days', days: 90, daysLocked: 90, multiplier: 1.5, color: '#f59e0b' },
    { id: 3, name: '180 Days', nameKey: 'lock180Days', days: 180, daysLocked: 180, multiplier: 2.0, color: '#a855f7' },
];

export const VIP_TIERS_INFO = [
    { name: 'BRONZE', minAmount: 0, color: '#cd7f32' },
    { name: 'GOLD', minAmount: 10000, color: '#ffd700' },
    { name: 'DIAMOND', minAmount: 50000, color: '#b9f2ff' },
];

export const STAKING_ABI = [
    // ============ View Functions ============
    {
        name: 'owner',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        name: 'devWallet',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        name: 'accumulatedDevFees',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'devFee',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'vipTiers',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'index', type: 'uint256' }],
        outputs: [
            { name: 'name', type: 'string' },
            { name: 'minAmount', type: 'uint256' },
        ],
    },
    {
        name: 'lockOptions',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'index', type: 'uint256' }],
        outputs: [
            { name: 'daysLocked', type: 'uint256' },
            { name: 'multiplierBP', type: 'uint256' },
        ],
    },
    {
        name: 'userSummary',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
            { name: 'totalAmount', type: 'uint256' },
            { name: 'totalShares', type: 'uint256' },
            { name: 'rewardDebt', type: 'uint256' },
            { name: 'stakeCount', type: 'uint32' },
            { name: 'nextStakeId', type: 'uint32' },
            { name: 'lastStakeBlock', type: 'uint64' },
        ],
    },
    {
        name: 'getUserStakeIds',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: '', type: 'uint256[]' }],
    },
    {
        name: 'getStakeEntry',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'user', type: 'address' },
            { name: 'stakeId', type: 'uint256' },
        ],
        outputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'shares', type: 'uint256' },
            { name: 'lockEndTime', type: 'uint64' },
            { name: 'startTime', type: 'uint64' },
            { name: 'lockOptionId', type: 'uint8' },
            { name: 'active', type: 'bool' },
            { name: 'isLocked', type: 'bool' },
            { name: 'inGracePeriod', type: 'bool' },
            { name: 'estimatedPenalty', type: 'uint256' },
        ],
    },
    {
        name: 'pendingRewards',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'getVIPTier',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: 'tier', type: 'string' }],
    },
    {
        name: 'getGlobalHealthCheck',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            { name: 'rewardsLeft', type: 'uint256' },
            { name: 'daysLeft', type: 'uint256' },
            { name: 'isHealthy', type: 'bool' },
            { name: 'dust', type: 'uint256' },
        ],
    },
    {
        name: 'totalStaked',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'totalShares',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'rewardBucket',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'rewardRatePerSecond',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'minStakeAmount',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'maxStakePerWallet',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'earlyUnstakePenalty',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'gracePeriodDuration',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'paused',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
    },
    // Leaderboard functions (frontend sorts)
    {
        name: 'getTotalStakers',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'getStakersPage',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'offset', type: 'uint256' },
            { name: 'limit', type: 'uint256' },
        ],
        outputs: [
            { name: 'stakers', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' },
            { name: 'maxLockOptionIds', type: 'uint8[]' },
        ],
    },
    // Donator/Supporter leaderboard functions
    {
        name: 'getTotalDonators',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'getDonatorsPage',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'offset', type: 'uint256' },
            { name: 'limit', type: 'uint256' },
        ],
        outputs: [
            { name: 'donators', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' },
        ],
    },
    {
        name: 'donationAmount',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'donor', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'accRewardPerShare',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'stakingToken',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        name: 'lockOptions',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'index', type: 'uint256' }],
        outputs: [
            { name: 'daysLocked', type: 'uint256' },
            { name: 'multiplierBP', type: 'uint256' },
        ],
    },

    // ============ Write Functions ============
    {
        name: 'stake',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'lockOptionId', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'unstakeById',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'stakeId', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'unstakePartial',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'stakeId', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'claimReward',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'autoCompound',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'emergencyWithdraw',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'relock',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'stakeId', type: 'uint256' },
            { name: 'newLockOptionId', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'donate',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [],
    },

    // ============ Admin Functions ============
    {
        name: 'setRewardRate',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_rate', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'setEarlyUnstakePenalty',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_penalty', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'setMaxStakeLimit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_limit', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'setMinStakeAmount',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_amount', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'setGracePeriod',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_duration', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'setVIPTiers',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'names', type: 'string[]' },
            { name: 'minAmounts', type: 'uint256[]' },
        ],
        outputs: [],
    },
    {
        name: 'updateLockOption',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_id', type: 'uint256' },
            { name: '_days', type: 'uint256' },
            { name: '_multiplier', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'pause',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'unpause',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'withdrawDevFees',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'setDevFee',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_fee', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'setDevWallet',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_dev', type: 'address' }],
        outputs: [],
    },
    {
        name: 'withdrawDust',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },

    // ============ Events ============
    {
        name: 'Staked',
        type: 'event',
        inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: true, name: 'stakeId', type: 'uint256' },
            { indexed: false, name: 'amount', type: 'uint256' },
            { indexed: false, name: 'shares', type: 'uint256' },
            { indexed: false, name: 'lockDays', type: 'uint256' },
        ],
    },
    {
        name: 'Unstaked',
        type: 'event',
        inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: true, name: 'stakeId', type: 'uint256' },
            { indexed: false, name: 'amount', type: 'uint256' },
            { indexed: false, name: 'penalty', type: 'uint256' },
        ],
    },
    {
        name: 'PartialUnstaked',
        type: 'event',
        inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: true, name: 'stakeId', type: 'uint256' },
            { indexed: false, name: 'amount', type: 'uint256' },
            { indexed: false, name: 'remaining', type: 'uint256' },
            { indexed: false, name: 'penalty', type: 'uint256' },
        ],
    },
    {
        name: 'Compounded',
        type: 'event',
        inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
            { indexed: false, name: 'newStakeId', type: 'uint256' },
        ],
    },
    {
        name: 'RewardClaimed',
        type: 'event',
        inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
        ],
    },
    {
        name: 'Donated',
        type: 'event',
        inputs: [
            { indexed: true, name: 'donor', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
        ],
    },
    {
        name: 'Relocked',
        type: 'event',
        inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: true, name: 'stakeId', type: 'uint256' },
            { indexed: false, name: 'newLockEndTime', type: 'uint256' },
        ],
    },
] as const;

// ============ ERC20 ABI ============
export const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'totalSupply',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;
