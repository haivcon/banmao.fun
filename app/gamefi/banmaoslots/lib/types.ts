// lib/types.ts
// Proper TypeScript types for Banmao Slots

// ============ Spin & Game Types ============

export interface SpinResult {
    symbols: number[];
    payout: bigint;
    isJackpot: boolean;
    txHash: string;
    poolId?: bigint;
    logIndex?: number;
    seed?: string;
    betAmount?: bigint;
}

export interface MultiSpinResult extends SpinResult {
    spinIndex: number;
    totalSpins: number;
}

export interface PendingCommit {
    poolId: bigint;
    hashedSeed: string;
    betAmount: bigint;
    blockNumber: bigint;
    revealed: boolean;
    expired: boolean;
    spinCount?: number;
}

// ============ Pool Types ============

export type PoolTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface Pool {
    id: bigint;
    poolId: bigint; // alias for compatibility
    owner: string;
    name: string;
    balance: bigint;
    minBet: bigint;
    maxBet: bigint;
    jackpotPercent: bigint;
    jackpotPool: bigint;
    totalSpins: bigint;
    totalBetsVolume: bigint;
    totalPayoutsVolume: bigint;
    totalPendingBets: bigint;
    isActive: boolean;
    createdAt: bigint;
    tier?: PoolTier;
}

export interface PoolData {
    poolId: bigint;
    name: string;
    owner: string;
    balance: bigint;
    minBet: bigint;
    maxBet: bigint;
    jackpot: bigint;
    isActive: boolean;
    tier?: PoolTier;
    totalSpins?: bigint;
}

export interface PoolStats {
    totalBetsVolume: bigint;
    totalPayoutsVolume: bigint;
    totalSpins: bigint;
    profitLoss: bigint;
    poolRtpBps: bigint;
}

export interface PoolProtection {
    dynamicMaxBetEnabled: boolean;
    lowBalanceThreshold: bigint;
    criticalBalanceThreshold: bigint;
    streakProtectionEnabled: boolean;
    hourlyPayoutLimit: bigint;
    emergencyCooldown: bigint;
    initialDeposit: bigint;
}

export interface PoolHealth {
    healthRatio: bigint;
    effectiveMaxBet: bigint;
    hourlyPayoutUsed: bigint;
    hourlyPayoutLimit: bigint;
    emergencyActive: boolean;
    emergencyCooldownEnds: bigint;
}

// ============ Verification Types ============

export interface VerifyResult {
    result: number[];
    payout: bigint;
    isJackpot: boolean;
    player: string;
    seed?: string;
    poolId?: bigint;
    totalSpins?: number;
    spinIndex?: number;
}

// ============ Profile Types ============

export interface SlotProfile {
    address: string;
    nickname?: string;
    avatar?: string;
    bio?: string;
    totalSpins: number;
    totalWins: number;
    biggestWin: bigint;
    jackpotsWon: number;
    favoritePool?: bigint;
}

export interface PlayerPoolStats {
    totalBets: bigint;
    totalWins: bigint;
    totalPayout: bigint;
    biggestWin: bigint;
    jackpotsWon: bigint;
    spins: bigint;
}

// ============ History Types ============

export interface HistoryEntry {
    txHash: string;
    poolId: bigint;
    player: string;
    symbols: number[];
    payout: bigint;
    isJackpot: boolean;
    timestamp: number;
    seed?: string;
    betAmount?: bigint;
    blockNumber?: bigint;
}

export interface SpinHistoryItem {
    // Core fields from contract events
    player: string;
    result: number[];
    payout: bigint;
    isJackpot: boolean;

    // Optional fields for history/display
    txHash?: string;
    timestamp?: number;
    seed?: string;

    // Additional fields for page.tsx compatibility
    poolId?: bigint | number;
    symbols?: number[] | string; // Can be array or comma-separated string
    logIndex?: number;
    betAmount?: bigint | string;
    poolName?: string;
    playerAddress?: string; // Alias for player
}

// ============ Leaderboard Types ============

export interface LeaderboardEntry {
    address: string;
    totalWins: bigint;
    biggestWin: bigint;
    spins: bigint;
    jackpotsWon: number;
    nickname?: string;
    avatar?: string;
}

export type LeaderboardSortBy = 'totalWins' | 'biggestWin' | 'spins' | 'jackpots';

// ============ UI Types ============

export type GameStatus = 'idle' | 'committing' | 'waitingReveal' | 'revealing' | 'result' | 'error';

export type PanelId =
    | 'profile'
    | 'leaderboard'
    | 'history'
    | 'myHistory'
    | 'donors'
    | 'payout'
    | 'verify'
    | 'house'
    | 'viewPlayer'
    | 'multiSpin'
    | 'createPool';

export interface DockItem {
    id: PanelId;
    icon: string;
    image?: string;
    label: string;
    isActive: boolean;
    isMinimized?: boolean;
    onClick: () => void;
}

// ============ Event Types ============

export interface SpinCommittedEvent {
    poolId: bigint;
    player: string;
    hashedSeed: string;
    betAmount: bigint;
}

export interface SpinRevealedEvent {
    poolId: bigint;
    player: string;
    result: number[];
    payout: bigint;
    isJackpot: boolean;
    seed: string;
}

export interface JackpotWonEvent {
    poolId: bigint;
    player: string;
    amount: bigint;
}

// ============ Utility Types ============

export type Address = `0x${string}`;

export interface TransactionResult {
    hash: string;
    success: boolean;
    error?: string;
}

// ============ API Response Types ============

// Raw API data types (before parsing to bigint)
export interface LeaderboardApiEntry {
    address: string;
    name?: string;
    avatar?: number;
    // Win amounts (various API formats)
    totalWon?: string | number;
    total_won?: string | number;
    todayWon?: string | number;
    today_won?: string | number;
    biggestWin?: string | number;
    biggest_win?: string | number;
    // Spin/wins counts
    totalSpins?: string | number;
    total_spins?: string | number;
    todaySpins?: string | number;
    today_spins?: string | number;
    totalWins?: string | number;
    total_wins?: string | number;
    totalWagered?: string | number;
    total_wagered?: string | number;
    // Jackpots
    jackpotWins?: number;
    jackpot_wins?: number;
    // Social links
    telegram?: string;
    twitter?: string;
    // Timestamps
    lastSpinTime?: number;
    last_spin_time?: number;
}

export interface JackpotDonorApiEntry {
    address: string;
    name?: string;
    totalDonated: string | number;
    donationCount?: number;
}

export interface ApiResponse<T> {
    success: boolean;
    error?: string;
    data?: T;
}

export interface LeaderboardApiResponse {
    success: boolean;
    leaderboard?: LeaderboardApiEntry[];
    error?: string;
}

export interface HistoryApiResponse {
    success: boolean;
    history?: SpinHistoryItem[];
    error?: string;
}

