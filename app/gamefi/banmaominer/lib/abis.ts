// lib/abis.ts - Smart Contract ABIs for Banmao Miner V2

// BANMAO Token Address on XLayer
export const BANMAO_TOKEN_ADDRESS = '0x16d91d1615fc55b76d5f92365bd60c069b46ef78';

// BanMaoMinerV2 Contract Address (will be set after deployment)
export const BANMAO_MINER_ADDRESS = '0x0000000000000000000000000000000000000000'; // TODO: Update after deployment

// ERC20 ABI (for token interactions)
export const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

// BanMaoMinerV2 Contract ABI
export const BANMAO_MINER_ABI = [
    // ============ Read Functions ============
    {
        name: 'getNonce',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'getUserInfo',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
            { name: 'dailyAmount', type: 'uint256' },
            { name: 'lastClaimTime', type: 'uint256' },
            { name: 'nextClaimTime', type: 'uint256' }
        ],
    },
    {
        name: 'getDonorInfo',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'donor', type: 'address' }],
        outputs: [
            { name: 'donated', type: 'uint256' },
            { name: 'count', type: 'uint256' }
        ],
    },
    {
        name: 'getDonorCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'getDonorsPaginated',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'offset', type: 'uint256' },
            { name: 'limit', type: 'uint256' }
        ],
        outputs: [
            { name: 'addresses', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' }
        ],
    },
    {
        name: 'getContractBalance',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'getContractStats',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [
            { name: 'balance', type: 'uint256' },
            { name: 'donorCount', type: 'uint256' },
            { name: 'totalDonations', type: 'uint256' }
        ],
    },
    {
        name: 'minClaimAmount',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'dailyPlayerCap',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'claimCooldown',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'blacklisted',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'totalDonated',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    // ============ Admin View Functions ============
    {
        name: 'owner',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        name: 'paused',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'hourlySignerCap',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'hourlySignedAmount',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },

    // ============ Write Functions ============
    {
        name: 'claimReward',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'amount', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },  // NEW: deadline parameter
            { name: 'signature', type: 'bytes' }
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
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [],
    },
    // ============ Admin Write Functions ============
    {
        name: 'setMinClaim',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_minAmount', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'updateCaps',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_dailyPlayer', type: 'uint256' },
            { name: '_hourlySigner', type: 'uint256' }
        ],
        outputs: [],
    },
    {
        name: 'setCooldown',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_cooldown', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'setBlacklist',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'user', type: 'address' },
            { name: 'status', type: 'bool' }
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

    // ============ Events ============
    {
        name: 'RewardClaimed',
        type: 'event',
        inputs: [
            { name: 'player', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'nonce', type: 'uint256', indexed: false }
        ],
    },
    {
        name: 'Donation',
        type: 'event',
        inputs: [
            { name: 'donor', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'totalDonated', type: 'uint256', indexed: false }
        ],
    },
    {
        name: 'Deposit',
        type: 'event',
        inputs: [
            { name: 'depositor', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false }
        ],
    },
] as const;

// XLayer Chain ID
export const XLAYER_CHAIN_ID = 196;

// Signature deadline (5 minutes from now)
export const SIGNATURE_EXPIRY_SECONDS = 5 * 60;
