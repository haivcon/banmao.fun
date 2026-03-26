// app/collection/lib/hubContract.ts
// BanmaoHub smart contract ABI and configuration

export const BANMAO_TOKEN_ADDRESS = '0x16d91d1615fc55b76d5f92365bd60c069b46ef78' as const;
export const TREASURY_ADDRESS = '0x92809f2837f708163d375960063c8a3156fceacb' as const;

// NOTE: Update this after deploying BanmaoHub.sol
export const BANMAO_HUB_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// ERC-20 ABI (minimal for approve + allowance)
export const ERC20_ABI = [
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
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
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
] as const;

// BanmaoHub ABI
export const BANMAO_HUB_ABI = [
    {
        name: 'tip',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'creator', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'postId', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'feePercent',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'treasury',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        type: 'event',
        name: 'Tip',
        inputs: [
            { name: 'from', type: 'address', indexed: true },
            { name: 'to', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'fee', type: 'uint256', indexed: false },
            { name: 'postId', type: 'uint256', indexed: false },
        ],
    },
] as const;
