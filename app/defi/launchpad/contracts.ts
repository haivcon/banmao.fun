// Launchpad contract ABI and addresses for XLayer (Chain 196)

// ============ ADDRESSES ============

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Set this after deployment. Keeping it in the environment prevents a source
// change and accidental use of an outdated deployment address.
export const LAUNCHPAD_ADDRESS = (process.env.NEXT_PUBLIC_LAUNCHPAD_ADDRESS ?? ZERO_ADDRESS) as `0x${string}`;
export const IS_LAUNCHPAD_CONFIGURED = LAUNCHPAD_ADDRESS.toLowerCase() !== ZERO_ADDRESS;
export const LAUNCHPAD_DEPLOYMENT_BLOCK = (() => {
    const value = Number(process.env.NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENT_BLOCK);
    return Number.isSafeInteger(value) && value > 0 ? BigInt(value) : undefined;
})();

// BANMAO token
export const BANMAO_TOKEN_ADDRESS = '0x16d91d1615fc55b76d5f92365bd60c069b46ef78';
export const WOKB_ADDRESS = '0xe538905cf8410324e03a5a23c1c177a474d59b2b';

// Uniswap V4 on XLayer
export const UNISWAP_V4 = {
    poolManager: '0x360e68faccca8ca495c1b759fd9eee466db9fb32',
    positionManager: '0xcf1eafc6928dc385a342e7c6491d371d2871458b',
    universalRouter: '0xda00ae15d3a71466517129255255db7c0c0956d3',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
} as const;

// Constants matching the contract
export const CREATION_FEE = BigInt('1000000000000000000000000'); // 1,000,000 BANMAO (18 decimals)
export const GRADUATION_THRESHOLD = BigInt('500000000000000000000'); // 500 OKB
export const TOKEN_TOTAL_SUPPLY = BigInt('1000000000000000000000000000'); // 1 billion
export const TRADE_FEE_BPS = 100; // 1%

// ============ ABIs ============

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
        name: 'symbol',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'string' }],
    },
    {
        name: 'name',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'string' }],
    },
    {
        name: 'totalSupply',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

export const LAUNCHPAD_ABI = [
    // ===== Read Functions =====
    {
        name: 'totalTokens',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'getTokenInfo',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'tokenAddress', type: 'address' }],
        outputs: [{
            name: '',
            type: 'tuple',
            components: [
                { name: 'tokenAddress', type: 'address' },
                { name: 'creator', type: 'address' },
                { name: 'name', type: 'string' },
                { name: 'symbol', type: 'string' },
                { name: 'description', type: 'string' },
                { name: 'imageUrl', type: 'string' },
                { name: 'virtualOkbReserve', type: 'uint256' },
                { name: 'virtualTokenReserve', type: 'uint256' },
                { name: 'realOkbReserve', type: 'uint256' },
                { name: 'realTokenReserve', type: 'uint256' },
                { name: 'graduated', type: 'bool' },
                { name: 'createdAt', type: 'uint256' },
            ],
        }],
    },
    {
        name: 'getCurrentPrice',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'tokenAddress', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'getGraduationProgress',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'tokenAddress', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'getBuyQuote',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'tokenAddress', type: 'address' },
            { name: 'okbAmount', type: 'uint256' },
        ],
        outputs: [
            { name: 'tokensOut', type: 'uint256' },
            { name: 'actualOkbCost', type: 'uint256' },
        ],
    },
    {
        name: 'getSellQuote',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'tokenAddress', type: 'address' },
            { name: 'tokenAmount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'getTokensPaginated',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'offset', type: 'uint256' },
            { name: 'limit', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'address[]' }],
    },
    {
        name: 'allTokens',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '', type: 'uint256' }],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        name: 'activeTokenCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'graduatedTokenCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'totalCurveVolume',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },

    // ===== Write Functions =====
    {
        name: 'createToken',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_name', type: 'string' },
            { name: '_symbol', type: 'string' },
            { name: '_description', type: 'string' },
            { name: '_imageUrl', type: 'string' },
        ],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        name: 'buyTokens',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
            { name: 'tokenAddress', type: 'address' },
            { name: 'minTokensOut', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'sellTokens',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'tokenAddress', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'minOkbOut', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
        outputs: [],
    },

    // ===== Events =====
    {
        name: 'TokenCreated',
        type: 'event',
        inputs: [
            { name: 'tokenAddress', type: 'address', indexed: true },
            { name: 'creator', type: 'address', indexed: true },
            { name: 'name', type: 'string', indexed: false },
            { name: 'symbol', type: 'string', indexed: false },
            { name: 'description', type: 'string', indexed: false },
            { name: 'imageUrl', type: 'string', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },
    {
        name: 'TokenBought',
        type: 'event',
        inputs: [
            { name: 'tokenAddress', type: 'address', indexed: true },
            { name: 'buyer', type: 'address', indexed: true },
            { name: 'okbIn', type: 'uint256', indexed: false },
            { name: 'tokensOut', type: 'uint256', indexed: false },
            { name: 'newPrice', type: 'uint256', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },
    {
        name: 'TokenSold',
        type: 'event',
        inputs: [
            { name: 'tokenAddress', type: 'address', indexed: true },
            { name: 'seller', type: 'address', indexed: true },
            { name: 'tokensIn', type: 'uint256', indexed: false },
            { name: 'okbOut', type: 'uint256', indexed: false },
            { name: 'newPrice', type: 'uint256', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },
    {
        name: 'TokenGraduated',
        type: 'event',
        inputs: [
            { name: 'tokenAddress', type: 'address', indexed: true },
            { name: 'okbLiquidity', type: 'uint256', indexed: false },
            { name: 'tokenLiquidity', type: 'uint256', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },
    {
        name: 'LiquidityMigrated',
        type: 'event',
        inputs: [
            { name: 'tokenAddress', type: 'address', indexed: true },
            { name: 'lpLocker', type: 'address', indexed: true },
            { name: 'okbAmount', type: 'uint256', indexed: false },
            { name: 'tokenAmount', type: 'uint256', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },

    // ===== Admin Read =====
    {
        name: 'owner',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        name: 'hookAddress',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        name: 'communityWallet',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        name: 'creationFee',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'pendingCommunityFees',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'LP_LOCKER',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }],
    },
    {
        name: 'liquidityMigrated',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'tokenAddress', type: 'address' }],
        outputs: [{ name: '', type: 'bool' }],
    },

    // ===== Admin Write =====
    {
        name: 'migrateLiquidity',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'tokenAddress', type: 'address' },
        ],
        outputs: [],
    },
    {
        name: 'setHookAddress',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_hookAddress', type: 'address' }],
        outputs: [],
    },
    {
        name: 'setCommunityWallet',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_communityWallet', type: 'address' }],
        outputs: [],
    },
    {
        name: 'setCreationFee',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_creationFee', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'claimCommunityFees',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'sweepStuckNative',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'transferOwnership',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'newOwner', type: 'address' }],
        outputs: [],
    },
] as const;
