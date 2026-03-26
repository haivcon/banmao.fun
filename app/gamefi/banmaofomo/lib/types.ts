/**
 * BanMaoFomo TypeScript Types - DualTimer v2
 */

// ===================== Game Status =====================

export interface GameStatus {
    roundId: bigint;
    softTimeLeft: bigint;
    hardTimeLeft: bigint;
    pool: bigint;
    leader: `0x${string}`;
    totalAtks: bigint;
    cost: bigint;
    isPaused: boolean;
    isEnded: boolean;
}

// ===================== Round Data =====================

export interface Round {
    softDeadline: bigint;
    hardDeadline: bigint;
    lastAttacker: `0x${string}`;
    totalAttacks: bigint;
    accRewardPerAttack: bigint;
    ended: boolean;
}

// ===================== User Data =====================

export interface UserStats {
    attacks: bigint;
    rewardDebt: bigint;
    personalVault: bigint;
    lastAttackTimestamp: bigint;
}

// ===================== Attack Event =====================

export interface AttackEvent {
    roundId: bigint;
    player: `0x${string}`;
    count: bigint;
    softDeadline: bigint;
    hardDeadline: bigint;
    jackpot: bigint;
    luckyNumber: bigint;
    timestamp: number;
    txHash: string;
}

// ===================== Round Finalized Event =====================

export interface RoundFinalizedEvent {
    roundId: bigint;
    winner: `0x${string}`;
    amount: bigint;
    winType: string; // "SOFT_WIN" or "HARD_WIN"
    timestamp: number;
    txHash: string;
}

// ===================== Claim Event =====================

export interface ClaimEvent {
    user: `0x${string}`;
    amount: bigint;
    timestamp: number;
    txHash: string;
}

// ===================== UI State =====================

export type UrgencyLevel = 'safe' | 'warning' | 'danger' | 'ended';
export type WinType = 'SOFT_WIN' | 'HARD_WIN';

export interface AttackFormState {
    count: number;
    userSeed: string;
    isLoading: boolean;
    error: string | null;
}

// ===================== History Entry =====================

export interface AttackHistoryEntry {
    player: `0x${string}`;
    count: number;
    timestamp: number;
    luckyNumber: number;
    txHash?: string;
}

export interface RoundHistoryEntry {
    roundId: number;
    winner: `0x${string}`;
    winAmount: bigint;
    winType: WinType;
    totalAttacks: number;
    endTime: number;
}

// ===================== Pending Rewards =====================

export interface PendingReward {
    roundId: number;
    amount: bigint;
    claimed: boolean;
}

// ===================== V11 Specific Types =====================

/** V11 Game Config from activeConfig() struct */
export interface GameConfigV11 {
    attackCost: bigint;
    softDuration: bigint;
    initialHardDuration: bigint;
    timeDecreaseStep: bigint;
    maxAttacksPerRound: bigint;
    winnerPercent: bigint;
    topAttackersPercent: bigint;
    minAttacksForReward: bigint;
    claimExpirationTime: bigint;
}

/** V11 Top Attacker from getTopAttackers() */
export interface TopAttacker {
    addr: `0x${string}`;
    attacks: bigint;
}

/** V11 Round struct (packed with uint40 timestamps) */
export interface RoundV11 {
    softDeadline: bigint;
    hardDeadline: bigint;
    ended: boolean;
    lastAttacker: `0x${string}`;
    totalAttacks: bigint;
    accRewardPerAttack: bigint;
}

/** V11 Game Status (enhanced with timeout info) */
export interface GameStatusV11 extends GameStatus {
    claimExpirationTime: bigint;
    isInTimeoutDanger: boolean;
    timeoutDeadline: bigint;
}

/** Win types for V11 */
export type WinTypeV11 = 'SOFT_WIN' | 'HARD_WIN' | 'TIMEOUT';
