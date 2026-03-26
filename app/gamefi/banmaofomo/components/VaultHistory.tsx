"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAccount, usePublicClient, useWatchContractEvent } from 'wagmi';
import { formatUnits, hexToBigInt } from 'viem';
import { BANMAOFOMO_ADDRESS, CHAIN_ID, V11_FUND_DISTRIBUTION } from '../lib/constants';
import { BANMAOFOMO_V11_ABI } from '../lib/abis-v11';
import type { LocaleStrings } from '../lib/i18n';

// ============================================================
// VaultHistory — Professional Personal Round History
//
// Shows per-round participation with expandable details showing
// distribution breakdown, similar to the RoundHistory panel.
//
// NEW: Vault Deposits tab showing $BANMAO credited to vault
// with reasons (dividends, jackpot, top attacker rewards).
//
// Data Process:
// 1. Load localStorage history (fast init)
// 2. Fetch recent blocks (chunked to respect RPC limits)
// 3. Merge & Deduplicate
// 4. Save to localStorage
// ============================================================

interface VaultTransaction {
    id: string;
    type: 'attack' | 'claim' | 'vault_deposit';
    amount: string;
    timestamp: number;
    txHash: string;
    roundId?: number;
    attackCount?: number;
    reason?: VaultReason;
}

type VaultReason = 'dividend' | 'jackpot' | 'top_attacker';
type FilterType = 'all' | 'deposits' | 'withdrawals' | 'vault';

interface VaultHistoryProps {
    t: LocaleStrings;
    currentVault: bigint;
}

const MAX_HISTORY_ITEMS = 200;
const DEFAULT_ATTACK_COST = 2000;
const STORAGE_KEY = `banmaofomo_vault_history_v2_${CHAIN_ID}`;
const VAULT_DEPOSITS_KEY = `banmaofomo_vault_deposits_v1_${CHAIN_ID}`;
const RPC_CHUNK_SIZE = 5000;
const MAX_SCAN_BLOCKS = 200000;

// Helper: Load from storage
function loadStoredHistory(address: string): VaultTransaction[] {
    try {
        const raw = localStorage.getItem(`${STORAGE_KEY}_${address.toLowerCase()}`);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

// Helper: Save to storage
function saveHistory(address: string, txs: VaultTransaction[]) {
    try {
        localStorage.setItem(`${STORAGE_KEY}_${address.toLowerCase()}`, JSON.stringify(txs.slice(0, MAX_HISTORY_ITEMS)));
    } catch { /* ignore */ }
}

// Helper: Load vault deposits
function loadVaultDeposits(address: string): VaultTransaction[] {
    try {
        const raw = localStorage.getItem(`${VAULT_DEPOSITS_KEY}_${address.toLowerCase()}`);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

// Helper: Save vault deposits
function saveVaultDeposits(address: string, txs: VaultTransaction[]) {
    try {
        localStorage.setItem(`${VAULT_DEPOSITS_KEY}_${address.toLowerCase()}`, JSON.stringify(txs.slice(0, MAX_HISTORY_ITEMS)));
    } catch { /* ignore */ }
}

// Reason styling
function getReasonStyle(reason: VaultReason | undefined) {
    switch (reason) {
        case 'dividend': return { emoji: '📊', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' };
        case 'jackpot': return { emoji: '🏆', color: '#ffd700', bg: 'rgba(255,215,0,0.12)' };
        case 'top_attacker': return { emoji: '⭐', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' };
        default: return { emoji: '💎', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
    }
}

export default function VaultHistory({ t, currentVault }: VaultHistoryProps) {
    const { address } = useAccount();
    const publicClient = usePublicClient({ chainId: CHAIN_ID });
    const [transactions, setTransactions] = useState<VaultTransaction[]>([]);
    const [vaultDeposits, setVaultDeposits] = useState<VaultTransaction[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const [showAll, setShowAll] = useState(false);
    const [roundSearch, setRoundSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // VaultHistory Pro state
    type DateRange = 'all' | 'today' | '7d' | '30d';
    const [dateRange, setDateRange] = useState<DateRange>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // Contract state
    const [totalLifetimeAttacks, setTotalLifetimeAttacks] = useState<number>(0);
    const [currentRoundAttacks, setCurrentRoundAttacks] = useState<number>(0);
    const [currentRoundId, setCurrentRoundId] = useState<number>(0);
    const [personalVaultAmount, setPersonalVaultAmount] = useState<string>('0');

    // Vault diff tracking for dividend detection
    const prevVaultRef = useRef<bigint>(0n);
    const lastVaultCheckRef = useRef<number>(0);

    const fetchedRef = useRef(false);
    const prevAddressRef = useRef<string | undefined>(undefined);
    const lastBlockRef = useRef<bigint>(0n);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tAny = t as any;

    // Add live transaction with dedup + persist
    const addTransaction = useCallback((tx: Omit<VaultTransaction, 'id' | 'timestamp'>) => {
        if (!address) return;
        const newTx: VaultTransaction = {
            ...tx,
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            timestamp: Date.now(),
        };
        setTransactions(prev => {
            if (tx.txHash && prev.some(p => p.txHash === tx.txHash && p.type === tx.type)) return prev;
            const updated = [newTx, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_HISTORY_ITEMS);
            saveHistory(address, updated);
            return updated;
        });
    }, [address]);

    // Add vault deposit — dividends are grouped by roundId (accumulated)
    const addVaultDeposit = useCallback((deposit: Omit<VaultTransaction, 'id' | 'timestamp' | 'type'>) => {
        if (!address) return;
        setVaultDeposits(prev => {
            // For jackpot/top_attacker with txHash, dedup by txHash
            if (deposit.txHash && prev.some(p => p.txHash === deposit.txHash && p.reason === deposit.reason)) return prev;

            // For dividends, group by roundId — accumulate into existing entry
            if (deposit.reason === 'dividend' && deposit.roundId && deposit.roundId > 0) {
                const existingIdx = prev.findIndex(p => p.reason === 'dividend' && p.roundId === deposit.roundId);
                if (existingIdx >= 0) {
                    // Accumulate into existing dividend entry for this round
                    const updated = [...prev];
                    const existing = updated[existingIdx];
                    const newAmount = parseFloat(existing.amount) + parseFloat(deposit.amount);
                    updated[existingIdx] = {
                        ...existing,
                        amount: newAmount.toFixed(2),
                        timestamp: Date.now(), // Update to latest
                    };
                    const sorted = updated.sort((a, b) => b.timestamp - a.timestamp);
                    saveVaultDeposits(address, sorted);
                    return sorted;
                }
            }

            // For dividends without roundId, group into a single "current session" entry
            if (deposit.reason === 'dividend' && (!deposit.roundId || deposit.roundId === 0)) {
                const existingIdx = prev.findIndex(p => p.reason === 'dividend' && (!p.roundId || p.roundId === 0) && (Date.now() - p.timestamp < 60000));
                if (existingIdx >= 0) {
                    const updated = [...prev];
                    const existing = updated[existingIdx];
                    const newAmount = parseFloat(existing.amount) + parseFloat(deposit.amount);
                    updated[existingIdx] = {
                        ...existing,
                        amount: newAmount.toFixed(2),
                        timestamp: Date.now(),
                    };
                    const sorted = updated.sort((a, b) => b.timestamp - a.timestamp);
                    saveVaultDeposits(address, sorted);
                    return sorted;
                }
            }

            // New entry
            const newDeposit: VaultTransaction = {
                ...deposit,
                type: 'vault_deposit',
                id: `vd_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                timestamp: Date.now(),
            };
            const updated = [newDeposit, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_HISTORY_ITEMS);
            saveVaultDeposits(address, updated);
            return updated;
        });
    }, [address]);

    // Init: load storage + fetch chunks
    useEffect(() => {
        if (!address || !publicClient) return;

        // Reset fetchedRef when address changes
        if (prevAddressRef.current !== address) {
            fetchedRef.current = false;
            prevAddressRef.current = address;
        }

        if (fetchedRef.current) return;
        fetchedRef.current = true;

        const init = async () => {
            setIsLoading(true);

            // 1. Load Storage Immediate
            const stored = loadStoredHistory(address);
            if (stored.length > 0) setTransactions(stored);
            const storedDeposits = loadVaultDeposits(address);
            if (storedDeposits.length > 0) setVaultDeposits(storedDeposits);

            try {
                // 2. Read contract summary
                const [roundResult, lifetimeResult, vaultResult] = await Promise.all([
                    (publicClient as any).readContract({
                        address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                        functionName: 'currentRound',
                    }),
                    (publicClient as any).readContract({
                        address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                        functionName: 'totalLifetimeAttacks', args: [address],
                    }),
                    (publicClient as any).readContract({
                        address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                        functionName: 'personalVault', args: [address],
                    }),
                ]);

                const round = Number(roundResult || 0);
                setCurrentRoundId(round);
                setTotalLifetimeAttacks(Number(lifetimeResult || 0));
                setPersonalVaultAmount(formatUnits(vaultResult || 0n, 18));
                prevVaultRef.current = vaultResult || 0n;

                if (round > 0) {
                    const currentAttacks = await (publicClient as any).readContract({
                        address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                        functionName: 'userAttacks', args: [BigInt(round), address],
                    });
                    setCurrentRoundAttacks(Number(currentAttacks || 0));
                }

                // 3. Robust History Fetching (Chunked)
                const latestBlock = await publicClient.getBlockNumber();
                lastBlockRef.current = latestBlock;
                const startBlock = latestBlock - BigInt(MAX_SCAN_BLOCKS) > 0n ? latestBlock - BigInt(MAX_SCAN_BLOCKS) : 0n;

                const chunks: { from: bigint, to: bigint }[] = [];
                let current = latestBlock;
                while (current > startBlock) {
                    const from = current - BigInt(RPC_CHUNK_SIZE) > startBlock ? current - BigInt(RPC_CHUNK_SIZE) : startBlock;
                    chunks.push({ from, to: current });
                    current = from - 1n;
                }

                const BATCH_SIZE = 5;
                let allLogs: any[] = [];
                let allVaultLogs: any[] = [];

                for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
                    const batch = chunks.slice(i, i + BATCH_SIZE);
                    const results = await Promise.all(batch.map(chunk =>
                        Promise.all([
                            publicClient.getLogs({
                                address: BANMAOFOMO_ADDRESS,
                                event: { type: 'event', name: 'Claimed', inputs: [{ type: 'address', name: 'user', indexed: true }, { type: 'uint256', name: 'amount' }] },
                                args: { user: address },
                                fromBlock: chunk.from, toBlock: chunk.to
                            }),
                            publicClient.getLogs({
                                address: BANMAOFOMO_ADDRESS,
                                event: { type: 'event', name: 'AttackPerformed', inputs: [{ type: 'uint256', name: 'roundId', indexed: true }, { type: 'address', name: 'player', indexed: true }, { type: 'uint256', name: 'count' }, { type: 'uint256', name: 'jackpot' }, { type: 'uint256', name: 'newHardDeadline' }] },
                                args: { player: address },
                                fromBlock: chunk.from, toBlock: chunk.to
                            }),
                            // NEW: Fetch WinnerPrizePaid events
                            publicClient.getLogs({
                                address: BANMAOFOMO_ADDRESS,
                                event: { type: 'event', name: 'WinnerPrizePaid', inputs: [{ type: 'address', name: 'user', indexed: true }, { type: 'uint256', name: 'amount' }, { type: 'bool', name: 'fullPrize' }] },
                                args: { user: address },
                                fromBlock: chunk.from, toBlock: chunk.to
                            }),
                            // NEW: Fetch TopAttackerRewarded events
                            publicClient.getLogs({
                                address: BANMAOFOMO_ADDRESS,
                                event: { type: 'event', name: 'TopAttackerRewarded', inputs: [{ type: 'uint256', name: 'roundId', indexed: true }, { type: 'address', name: 'user', indexed: true }, { type: 'uint256', name: 'rank' }, { type: 'uint256', name: 'amount' }] },
                                args: { user: address },
                                fromBlock: chunk.from, toBlock: chunk.to
                            }),
                        ])
                    ));
                    results.forEach(([claims, attacks, winnerPrize, topAttacker]) => {
                        allLogs.push(...claims, ...attacks);
                        allVaultLogs.push(...winnerPrize, ...topAttacker);
                    });
                }

                console.log('[VaultHistory] Fetched logs:', allLogs.length, 'vault logs:', allVaultLogs.length, 'chunks:', chunks.length);

                // Fetch timestamps for unique blocks (top 50)
                const allCombined = [...allLogs, ...allVaultLogs];
                const uniqueBlocks = Array.from(new Set(allCombined.map(l => l.blockNumber))).slice(0, 50);
                const blockTimestamps = new Map<string, number>();
                const blocks = await Promise.all(uniqueBlocks.map(bn => publicClient.getBlock({ blockNumber: bn })));
                blocks.forEach(b => { if (b.number) blockTimestamps.set(b.number.toString(), Number(b.timestamp) * 1000); });

                // Read current round explicitly to ensure we have value even if state is delayed
                const currentRoundBn = await (publicClient as any).readContract({
                    address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                    functionName: 'currentRound',
                });
                const currentRound = Number(currentRoundBn || 0n);

                // Process attack/claim logs
                const fetchedHistory: VaultTransaction[] = allLogs.map(log => {
                    const isClaim = (log as any).eventName === 'Claimed';
                    const args = (log as any).args || {};
                    const ts = blockTimestamps.get(log.blockNumber?.toString() || '') || Date.now();

                    if (isClaim) {
                        // Amount parsing: args.amount (standard) or args[1] (array fallback) or log.data (raw)
                        let rawAmount = args.amount;
                        if (rawAmount === undefined && Array.isArray(args)) rawAmount = args[1];
                        if (rawAmount === undefined && (log as any).data && (log as any).data !== '0x') {
                            try { rawAmount = hexToBigInt((log as any).data); } catch (e) { console.error('Hex decode error', e); }
                        }
                        if (rawAmount === undefined) rawAmount = 0n;

                        // Infer roundId: try to match with a vault event in the same tx, else use currentRound-1 (if claim is recent)
                        const matchingVault = allVaultLogs.find((vl: any) => vl.transactionHash === log.transactionHash);
                        const inferredRoundId = matchingVault
                            ? Number((matchingVault as any).args.roundId || 0) || (currentRound > 0 ? (currentRound > 1 ? currentRound - 1 : 1) : undefined)
                            : (currentRound > 0 ? (currentRound > 1 ? currentRound - 1 : 1) : undefined);

                        return {
                            id: `${log.transactionHash}_${log.logIndex}`, type: 'claim' as const,
                            amount: formatUnits(rawAmount, 18), timestamp: ts,
                            txHash: log.transactionHash || '',
                            roundId: inferredRoundId !== undefined ? inferredRoundId : undefined,
                        };
                    } else {
                        return {
                            id: `${log.transactionHash}_${log.logIndex}`, type: 'attack' as const,
                            amount: (Number(args.count || 1) * DEFAULT_ATTACK_COST).toString(),
                            timestamp: ts, txHash: log.transactionHash || '',
                            roundId: Number(args.roundId || 0), attackCount: Number(args.count || 1)
                        };
                    }
                });

                // Process vault deposit logs
                const fetchedVaultDeposits: VaultTransaction[] = allVaultLogs.map(log => {
                    const args = (log as any).args || {};
                    const ts = blockTimestamps.get(log.blockNumber?.toString() || '') || Date.now();
                    const eventName = (log as any).eventName;

                    if (eventName === 'WinnerPrizePaid') {
                        // WinnerPrizePaid doesn't include roundId in its event args
                        // Try to find the matching RoundFinalized in the same tx to get roundId
                        const matchingFinalized = allVaultLogs.find((other: any) =>
                            other.transactionHash === log.transactionHash && (other as any).eventName === 'TopAttackerRewarded'
                        );
                        // Use local currentRound for fallback
                        const inferredRoundId = matchingFinalized ? Number((matchingFinalized as any).args.roundId || 0) : (currentRound > 0 ? currentRound - 1 : undefined);
                        return {
                            id: `vd_${log.transactionHash}_${log.logIndex}`, type: 'vault_deposit' as const,
                            amount: formatUnits(args.amount || 0n, 18), timestamp: ts,
                            txHash: log.transactionHash || '', reason: 'jackpot' as VaultReason,
                            roundId: inferredRoundId && inferredRoundId > 0 ? inferredRoundId : undefined,
                        };
                    } else {
                        const eventRoundId = Number(args.roundId || 0);
                        return {
                            id: `vd_${log.transactionHash}_${log.logIndex}`, type: 'vault_deposit' as const,
                            amount: formatUnits(args.amount || 0n, 18), timestamp: ts,
                            txHash: log.transactionHash || '', reason: 'top_attacker' as VaultReason,
                            // Use local currentRound for fallback
                            roundId: eventRoundId > 0 ? eventRoundId : (currentRound > 0 ? currentRound - 1 : undefined),
                        };
                    }
                });

                // ====== HISTORICAL DIVIDEND CALCULATION ======
                // Collect roundIds that ALREADY have event-based vault deposits (TopAttackerRewarded/WinnerPrizePaid)
                // to avoid creating duplicate calculated dividends for the same round
                const eventVaultRoundIds = new Set(
                    fetchedVaultDeposits
                        .filter(vd => vd.roundId && vd.roundId > 0)
                        .map(vd => vd.roundId!)
                );

                // Extract unique round IDs the user participated in from attack events
                const userRoundIds = Array.from(new Set(
                    allLogs
                        .filter((log: any) => (log as any).eventName === 'AttackPerformed')
                        .map((log: any) => Number((log as any).args.roundId || 0))
                        .filter((id: number) => id > 0 && id < round) // Only past rounds (not current)
                )).filter(rid => !eventVaultRoundIds.has(rid)); // Skip rounds that already have event-based deposits

                if (userRoundIds.length > 0) {
                    try {
                        // Read PRECISION constant once
                        const precisionResult = await (publicClient as any).readContract({
                            address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                            functionName: 'PRECISION',
                        });
                        const PRECISION = BigInt(precisionResult || 1e18);

                        // Batch read contract data for all rounds (max 10 rounds to avoid overload)
                        const roundsToCheck = userRoundIds.slice(0, 10);
                        const dividendResults = await Promise.all(
                            roundsToCheck.map(async (roundId) => {
                                try {
                                    const [attacks, debt, roundData] = await Promise.all([
                                        (publicClient as any).readContract({
                                            address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                                            functionName: 'userAttacks', args: [BigInt(roundId), address],
                                        }),
                                        (publicClient as any).readContract({
                                            address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                                            functionName: 'rewardDebt', args: [BigInt(roundId), address],
                                        }),
                                        (publicClient as any).readContract({
                                            address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                                            functionName: 'rounds', args: [BigInt(roundId)],
                                        }),
                                    ]);

                                    const userAtk = BigInt(attacks || 0n);
                                    const rewardDebtVal = BigInt(debt || 0n);
                                    // Round struct: [softDeadline, hardDeadline, ended, lastAttacker, totalAttacks, accRewardPerAttack]
                                    const accReward = BigInt(roundData[5] || 0n);
                                    const ended = roundData[2] as boolean;

                                    if (!ended || userAtk === 0n || accReward === 0n) return null;

                                    const totalReward = (userAtk * accReward) / PRECISION;
                                    const dividend = totalReward - rewardDebtVal;

                                    if (dividend <= 0n) return null;

                                    // Find the earliest attack event in this round for timestamp
                                    const roundAttackLog = allLogs.find((log: any) =>
                                        (log as any).eventName === 'AttackPerformed' && Number((log as any).args.roundId) === roundId
                                    );
                                    const ts = roundAttackLog
                                        ? (blockTimestamps.get(roundAttackLog.blockNumber?.toString() || '') || Date.now())
                                        : Date.now();

                                    return {
                                        id: `div_round_${roundId}_${address}`,
                                        type: 'vault_deposit' as const,
                                        amount: formatUnits(dividend, 18),
                                        timestamp: ts,
                                        txHash: '', // No specific tx for accumulated dividends
                                        reason: 'dividend' as VaultReason,
                                        roundId: roundId,
                                    };
                                } catch (err) {
                                    console.warn(`[VaultHistory] Dividend calc error for round ${roundId}:`, err);
                                    return null;
                                }
                            })
                        );

                        const dividendDeposits = dividendResults.filter(Boolean) as VaultTransaction[];
                        if (dividendDeposits.length > 0) {
                            fetchedVaultDeposits.push(...dividendDeposits);
                        }
                    } catch (err) {
                        console.warn('[VaultHistory] Dividend batch calc error:', err);
                    }
                }

                setTransactions(prev => {
                    const combined = [...fetchedHistory];
                    const existingIds = new Set(combined.map(t => t.txHash + t.type));
                    prev.forEach(p => {
                        if (p.txHash && !existingIds.has(p.txHash + p.type)) {
                            combined.push(p);
                        }
                    });
                    const finalSort = combined.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_HISTORY_ITEMS);
                    saveHistory(address, finalSort);
                    return finalSort;
                });

                setVaultDeposits(prev => {
                    const combined = [...fetchedVaultDeposits];
                    const existingIds = new Set(combined.map(t => t.id));
                    prev.forEach(p => {
                        if (!existingIds.has(p.id)) {
                            combined.push(p);
                            existingIds.add(p.id);
                        }
                    });
                    const finalSort = combined.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_HISTORY_ITEMS);
                    saveVaultDeposits(address, finalSort);
                    return finalSort;
                });

            } catch (error) {
                // Silence RPC rate-limit errors (expected on public XLayer RPC)
                const errMsg = String(error);
                if (!errMsg.includes('UnknownRpcError') && !errMsg.includes('Failed to fetch') && !errMsg.includes('rate limit')) {
                    console.error('[VaultHistory] Init error:', error);
                }
                // Even if init fails, show stored data
                const stored = loadStoredHistory(address);
                if (stored.length > 0) setTransactions(stored);
                const storedDeposits = loadVaultDeposits(address);
                if (storedDeposits.length > 0) setVaultDeposits(storedDeposits);
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, [address, publicClient]);

    // === Direct attack injection from AttackPanel via custom event ===
    useEffect(() => {
        const attackHandler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail) return;
            console.log('[VaultHistory] Direct attack injection:', detail);
            addTransaction({
                type: 'attack',
                amount: detail.amount.toString(),
                txHash: detail.txHash || '',
                roundId: detail.roundId || 0,
                attackCount: detail.count || 1,
            });
            setTotalLifetimeAttacks(p => p + (detail.count || 1));
            setCurrentRoundAttacks(p => p + (detail.count || 1));
        };

        const claimHandler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail) return;
            console.log('[VaultHistory] Direct claim injection:', detail);
            addTransaction({
                type: 'claim',
                amount: detail.amount.toString(),
                txHash: detail.txHash || '',
            });
        };

        window.addEventListener('banmao-attack-success', attackHandler);
        window.addEventListener('banmao-claim-success', claimHandler);
        return () => {
            window.removeEventListener('banmao-attack-success', attackHandler);
            window.removeEventListener('banmao-claim-success', claimHandler);
        };
    }, [addTransaction]);

    // Live events monitoring...
    // Track known vault increases from events to avoid double-counting as dividends
    const pendingKnownIncreasesRef = useRef<number>(0);

    // Watch ALL AttackPerformed events — both for user's own history AND dividend detection
    useWatchContractEvent({
        address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
        eventName: 'AttackPerformed', chainId: CHAIN_ID,
        poll: true,
        pollingInterval: 30_000, // Reduced from 12s to 30s
        enabled: !!address,
        onLogs(logs) {
            let hasOtherPlayerAttack = false;

            logs.forEach((log: any) => {
                const isOwnAttack = log.args.player?.toLowerCase() === address?.toLowerCase();

                if (isOwnAttack) {
                    // User's own attack → log as transaction
                    const count = Number(log.args.count || 1);
                    addTransaction({
                        type: 'attack', amount: (count * DEFAULT_ATTACK_COST).toString(),
                        txHash: log.transactionHash || '', roundId: Number(log.args.roundId || 0), attackCount: count,
                    });
                    console.log('[VaultHistory] Live attack captured:', count, 'attacks, round:', Number(log.args.roundId || 0));
                    setCurrentRoundAttacks(p => p + count);
                    setTotalLifetimeAttacks(p => p + count);
                } else {
                    // Other player attacked → dividends may have been added to our vault
                    hasOtherPlayerAttack = true;
                }
            });

            // When other players attack, check if our vault increased (= dividend)
            if (hasOtherPlayerAttack && address && publicClient) {
                // Small delay to let blockchain state settle
                setTimeout(async () => {
                    try {
                        const vaultResult = await (publicClient as any).readContract({
                            address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                            functionName: 'personalVault', args: [address],
                        });
                        const newVault = vaultResult || 0n;

                        if (prevVaultRef.current > 0n && newVault > prevVaultRef.current) {
                            const diff = newVault - prevVaultRef.current;
                            const diffAmount = parseFloat(formatUnits(diff, 18));

                            // Subtract any known increases from jackpot/top_attacker events
                            const knownIncrease = pendingKnownIncreasesRef.current;
                            const dividendAmount = diffAmount - knownIncrease;
                            pendingKnownIncreasesRef.current = 0; // Reset

                            if (dividendAmount > 0.01) {
                                addVaultDeposit({
                                    amount: dividendAmount.toFixed(2),
                                    txHash: '', // No specific tx for dividends
                                    reason: 'dividend',
                                    roundId: currentRoundId,
                                });
                            }
                        }

                        prevVaultRef.current = newVault;
                        setPersonalVaultAmount(formatUnits(newVault, 18));
                    } catch (err) {
                        console.error('[VaultHistory] Dividend check error:', err);
                    }
                }, 2000); // 2s delay for state settlement
            }
        },
    });

    useWatchContractEvent({
        address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
        eventName: 'Claimed', chainId: CHAIN_ID,
        poll: true,
        pollingInterval: 30_000, // Reduced from 12s to 30s
        enabled: !!address,
        onLogs(logs) {
            logs.forEach((log: any) => {
                if (log.args.user?.toLowerCase() === address?.toLowerCase()) {
                    addTransaction({
                        type: 'claim', amount: formatUnits(log.args.amount || 0n, 18),
                        txHash: log.transactionHash || '',
                        roundId: currentRoundId > 0 ? currentRoundId - 1 : undefined,
                    });
                    setPersonalVaultAmount(p => {
                        const val = parseFloat(p) - parseFloat(formatUnits(log.args.amount || 0n, 18));
                        return val > 0 ? val.toString() : '0';
                    });
                }
            });
        },
    });

    useWatchContractEvent({
        address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
        eventName: 'WinnerPrizePaid', chainId: CHAIN_ID,
        poll: true,
        pollingInterval: 30_000, // Reduced from 12s to 30s
        enabled: !!address,
        onLogs(logs) {
            logs.forEach((log: any) => {
                if (log.args.user?.toLowerCase() === address?.toLowerCase()) {
                    const amount = parseFloat(formatUnits(log.args.amount || 0n, 18));
                    pendingKnownIncreasesRef.current += amount;
                    // WinnerPrizePaid is emitted when the previous round finalizes
                    const jackpotRoundId = currentRoundId > 1 ? currentRoundId - 1 : undefined;
                    addVaultDeposit({
                        amount: formatUnits(log.args.amount || 0n, 18),
                        txHash: log.transactionHash || '',
                        reason: 'jackpot',
                        roundId: jackpotRoundId,
                    });
                }
            });
        },
    });

    useWatchContractEvent({
        address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
        eventName: 'TopAttackerRewarded', chainId: CHAIN_ID,
        poll: true,
        pollingInterval: 30_000, // Reduced from 12s to 30s
        enabled: !!address,
        onLogs(logs) {
            logs.forEach((log: any) => {
                if (log.args.user?.toLowerCase() === address?.toLowerCase()) {
                    const amount = parseFloat(formatUnits(log.args.amount || 0n, 18));
                    pendingKnownIncreasesRef.current += amount;
                    addVaultDeposit({
                        amount: formatUnits(log.args.amount || 0n, 18),
                        txHash: log.transactionHash || '',
                        reason: 'top_attacker',
                        roundId: Number(log.args.roundId || 0),
                    });
                }
            });
        },
    });

    // POLLING: Refresh stats only (dividend detection now handled by AttackPerformed watcher)
    useEffect(() => {
        if (!address || !publicClient) return;

        const poll = async () => {
            try {
                // Refresh Stats
                const [vaultResult, lifetimeResult] = await Promise.all([
                    (publicClient as any).readContract({
                        address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                        functionName: 'personalVault', args: [address],
                    }),
                    (publicClient as any).readContract({
                        address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                        functionName: 'totalLifetimeAttacks', args: [address],
                    })
                ]);

                const newVaultBigInt = vaultResult || 0n;
                setPersonalVaultAmount(formatUnits(newVaultBigInt, 18));
                setTotalLifetimeAttacks(Number(lifetimeResult || 0));

                // Also do a vault diff check here as fallback (in case we missed events)
                if (prevVaultRef.current > 0n && newVaultBigInt > prevVaultRef.current) {
                    const diff = newVaultBigInt - prevVaultRef.current;
                    const diffAmount = parseFloat(formatUnits(diff, 18));
                    const knownIncrease = pendingKnownIncreasesRef.current;
                    const dividendAmount = diffAmount - knownIncrease;
                    pendingKnownIncreasesRef.current = 0;

                    if (dividendAmount > 0.01 && Date.now() - lastVaultCheckRef.current > 8000) {
                        addVaultDeposit({
                            amount: dividendAmount.toFixed(2),
                            txHash: '',
                            reason: 'dividend',
                            roundId: currentRoundId,
                        });
                        lastVaultCheckRef.current = Date.now();
                    }
                }
                prevVaultRef.current = newVaultBigInt;

                if (currentRoundId > 0) {
                    const currentAttacks = await (publicClient as any).readContract({
                        address: BANMAOFOMO_ADDRESS, abi: BANMAOFOMO_V11_ABI,
                        functionName: 'userAttacks', args: [BigInt(currentRoundId), address],
                    });
                    setCurrentRoundAttacks(Number(currentAttacks || 0));
                }

            } catch (err) {
                console.error("Polling error", err);
            }
        };

        const intervalId = setInterval(poll, 15000);
        return () => clearInterval(intervalId);
    }, [address, publicClient, currentRoundId, addTransaction, addVaultDeposit]);

    // Filtering & Render

    const formatRelativeTime = (timestamp: number) => {
        if (!timestamp) return '—';
        const diff = Date.now() - timestamp;
        const s = Math.floor(diff / 1000);
        if (s < 0) return tAny.justNow || 'just now';
        if (s < 60) return `${s}s`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h`;
        return new Date(timestamp).toLocaleDateString();
    };

    const formatAmount = (val: number) => {
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
        return val.toLocaleString('en-US');
    };

    const getReasonLabel = (reason?: VaultReason) => {
        switch (reason) {
            case 'dividend': return tAny.vhReasonDividend || 'Dividend';
            case 'jackpot': return tAny.vhReasonJackpot || 'Jackpot Win';
            case 'top_attacker': return tAny.vhReasonTopAttacker || 'Top Attacker Reward';
            default: return tAny.vhVaultDeposit || 'Vault Deposit';
        }
    };

    if (!address) {
        return <div className="vault-history-empty"><p>{t.connectWallet}</p></div>;
    }

    const totalSpent = totalLifetimeAttacks * DEFAULT_ATTACK_COST;

    // === ROI CALCULATIONS ===
    const totalReceived = useMemo(() => {
        return vaultDeposits.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    }, [vaultDeposits]);
    const netPnL = totalReceived - totalSpent;
    const roiPercent = totalSpent > 0 ? ((netPnL / totalSpent) * 100) : 0;
    const isProfit = netPnL >= 0;

    // === EXPORT CSV ===
    const exportCSV = useCallback(() => {
        const allTxs = [...transactions, ...vaultDeposits].sort((a, b) => b.timestamp - a.timestamp);
        const rows = [['Date', 'Round', 'Type', 'Amount', 'TxHash']];
        allTxs.forEach(tx => {
            const date = new Date(tx.timestamp).toISOString();
            const round = tx.roundId ? `#${tx.roundId}` : '-';
            const type = tx.type === 'attack' ? 'Deposit' : tx.type === 'claim' ? 'Withdraw' : (tx.reason || 'Vault');
            const amount = (tx.type === 'claim' ? '-' : '+') + parseFloat(tx.amount).toFixed(2);
            rows.push([date, round, type, amount, tx.txHash || '-']);
        });
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `banmao_history_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [transactions, vaultDeposits]);

    // === GROUPED BY ROUND ===
    interface RoundGroup {
        roundId: number;
        attacks: VaultTransaction[];
        claims: VaultTransaction[];
        vaultDeposits: VaultTransaction[];
        totalAttackCount: number;
        totalSpent: number;
        totalClaimed: number;
        totalVaultReceived: number;
        latestTimestamp: number;
    }

    const groupedByRound = useMemo(() => {
        // Start with ALL transactions (no type filter yet — we need full data for P&L)
        let allTxs = [...transactions, ...vaultDeposits];

        // Apply date range filter (applies to everything)
        if (dateRange !== 'all') {
            const now = Date.now();
            const cutoff = dateRange === 'today' ? now - 86400000
                : dateRange === '7d' ? now - 7 * 86400000
                    : now - 30 * 86400000;
            allTxs = allTxs.filter(tx => tx.timestamp >= cutoff);
        }

        // Apply round search (applies to everything)
        if (roundSearch.trim()) {
            const searchNum = parseInt(roundSearch.trim(), 10);
            if (!isNaN(searchNum)) {
                allTxs = allTxs.filter(tx => tx.roundId === searchNum);
            }
        }

        // Group by roundId — ALL types included for accurate stats
        const map = new Map<number, RoundGroup>();
        const noRound: VaultTransaction[] = [];

        allTxs.forEach(tx => {
            const rid = tx.roundId || 0;
            if (rid === 0) {
                noRound.push(tx);
                return;
            }
            if (!map.has(rid)) {
                map.set(rid, {
                    roundId: rid,
                    attacks: [],
                    claims: [],
                    vaultDeposits: [],
                    totalAttackCount: 0,
                    totalSpent: 0,
                    totalClaimed: 0,
                    totalVaultReceived: 0,
                    latestTimestamp: 0,
                });
            }
            const g = map.get(rid)!;
            if (tx.type === 'attack') {
                g.attacks.push(tx);
                g.totalAttackCount += (tx.attackCount || 1);
                g.totalSpent += parseFloat(tx.amount);
            } else if (tx.type === 'claim') {
                g.claims.push(tx);
                g.totalClaimed += parseFloat(tx.amount);
            } else if (tx.type === 'vault_deposit') {
                g.vaultDeposits.push(tx);
                g.totalVaultReceived += parseFloat(tx.amount);
            }
            if (tx.timestamp > g.latestTimestamp) g.latestTimestamp = tx.timestamp;
        });

        // Now apply type filter — only filter which GROUPS are shown
        // A group is shown if it has at least one tx matching the filter
        let groups = Array.from(map.values());
        if (filter !== 'all') {
            groups = groups.filter(g => {
                if (filter === 'deposits') return g.attacks.length > 0;
                if (filter === 'withdrawals') return g.claims.length > 0;
                if (filter === 'vault') return g.vaultDeposits.length > 0;
                return true;
            });
        }

        // Filter noRound items by type
        const filteredNoRound = filter === 'all' ? noRound
            : noRound.filter(tx =>
                filter === 'deposits' ? tx.type === 'attack'
                    : filter === 'withdrawals' ? tx.type === 'claim'
                        : filter === 'vault' ? tx.type === 'vault_deposit'
                            : true
            );

        // Sort groups
        const sortMul = sortOrder === 'newest' ? -1 : 1;
        groups.sort((a, b) => sortMul * (a.latestTimestamp - b.latestTimestamp));
        return { groups: showAll ? groups : groups.slice(0, 20), noRound: filteredNoRound, totalGroups: groups.length };
    }, [transactions, vaultDeposits, filter, showAll, roundSearch, dateRange, sortOrder]);

    const [expandedRound, setExpandedRound] = useState<number | null>(null);
    const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

    // Format exact time for detail panel
    const formatExactTime = (timestamp: number) => {
        if (!timestamp) return '—';
        const d = new Date(timestamp);
        return d.toLocaleString(undefined, {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    };

    // Reusable detail panel for a transaction
    const renderTxDetail = (tx: VaultTransaction) => (
        <div style={{
            background: 'rgba(0,0,0,0.4)', borderRadius: '0 0 6px 6px', marginTop: '-1px',
            padding: '8px 10px', fontSize: '0.58rem', borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '4px 8px' }}>
                <span style={{ color: '#6b7280' }}>⏰ {tAny.vhTimeLabel}:</span>
                <span style={{ color: '#e5e7eb' }}>{formatExactTime(tx.timestamp)}</span>

                {tx.roundId != null && tx.roundId > 0 && (
                    <><span style={{ color: '#6b7280' }}>🎯 {tAny.vhRoundLabel}:</span>
                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>#{tx.roundId}</span></>
                )}

                <span style={{ color: '#6b7280' }}>💰 {tAny.vhAmountLabel}:</span>
                <span style={{ color: tx.type === 'claim' ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                    {tx.type === 'claim' ? '-' : '+'}{formatAmount(parseFloat(tx.amount))} $BANMAO
                </span>

                {tx.type === 'attack' && tx.attackCount && (
                    <><span style={{ color: '#6b7280' }}>🎁 {tAny.vhGiftCountLabel}:</span>
                        <span style={{ color: '#fbbf24' }}>{tx.attackCount}x</span></>
                )}

                {tx.type === 'vault_deposit' && tx.reason && (
                    <><span style={{ color: '#6b7280' }}>📋 {tAny.vhTypeLabel}:</span>
                        <span style={{ color: getReasonStyle(tx.reason).color }}>{getReasonLabel(tx.reason)}</span></>
                )}

                {tx.txHash && (
                    <><span style={{ color: '#6b7280' }}>🔗 {tAny.vhTxHashLabel}:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: '#9ca3af' }}>
                                {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                            </span>
                            <a
                                href={`https://web3.okx.com/explorer/x-layer/tx/${tx.txHash}`}
                                target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                style={{ color: '#22d3ee', textDecoration: 'none', fontSize: '0.55rem', fontWeight: 600 }}
                            > {tAny.vhViewExplorer}</a>
                        </div></>
                )}
            </div>
        </div>
    );

    return (
        <div className="vault-history-container">
            <style>{`
                .vault-row { transition: all 0.2s; border-left: 2px solid transparent; }
                .vault-row:hover { background: rgba(255,255,255,0.08) !important; border-left: 2px solid rgba(255,255,255,0.3); padding-left: 10px !important; }
                .vault-row:active { transform: scale(0.99); }
                .vault-round-header:hover { border-color: rgba(255,191,0,0.3) !important; background: rgba(255,255,255,0.08) !important; }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                @keyframes countIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
                .vh-timeline-node { animation: fadeInUp 0.35s ease-out both; }
                .vh-skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; }
                .vh-stat-value { animation: countIn 0.5s ease-out both; }
                .vh-expand { overflow: hidden; transition: max-height 0.3s ease-out, opacity 0.3s ease-out; }
                .vault-round-search::-webkit-outer-spin-button,
                .vault-round-search::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                .vault-round-search[type=number] { -moz-appearance: textbox; }
            `}</style>

            {/* Summary — 2 Cards Only */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
                <StatsCard label={tAny.vhTotalGifts || 'Total Gifts'} value={totalLifetimeAttacks.toLocaleString()} sub={`≈ ${formatAmount(totalSpent)} $BANMAO`} color="#fbbf24" icon="🎁" />
                <StatsCard label={tAny.vhTotalReceived || 'Total Received'} value={formatAmount(totalReceived)} sub="$BANMAO" color="#a855f7" icon="💎" />
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '8px', padding: '4px', background: 'rgba(0,0,0,0.25)', borderRadius: '999px' }}>
                {(['all', 'deposits', 'withdrawals', 'vault'] as FilterType[]).map((f) => {
                    const isActive = filter === f;
                    const label = f === 'all' ? t.allFilter
                        : f === 'deposits' ? `🎁 ${t.depositsFilter}`
                            : f === 'withdrawals' ? `💰 ${t.withdrawalsFilter}`
                                : `💎 ${tAny.vhVaultTab || 'Vault'}`;
                    return (
                        <button key={f} onClick={() => { setFilter(f); setShowAll(false); }} style={{
                            flex: 1, padding: '6px 8px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                            fontSize: '0.65rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#000' : '#9ca3af',
                            background: isActive
                                ? (f === 'vault' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'linear-gradient(135deg, #fbbf24, #f59e0b)')
                                : 'transparent',
                            transition: 'all 0.2s', whiteSpace: 'nowrap'
                        }}>{label}</button>
                    );
                })}
            </div>



            {/* Round Search */}
            <div style={{ marginBottom: '10px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#6b7280', pointerEvents: 'none' }}>🔍</div>
                <input
                    type="number"
                    className="vault-round-search"
                    value={roundSearch}
                    onChange={(e) => { setRoundSearch(e.target.value); setShowAll(false); }}
                    placeholder={tAny.vhSearchRound || 'Search by round number...'}
                    style={{
                        width: '100%', padding: '7px 32px 7px 32px', borderRadius: '999px',
                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                        color: '#e5e7eb', fontSize: '0.7rem', outline: 'none',
                        boxSizing: 'border-box', transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                {roundSearch && (
                    <button
                        onClick={() => setRoundSearch('')}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', color: '#9ca3af', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    >✕</button>
                )}
            </div>

            {/* Timeline List */}
            <div className="vault-transaction-list" style={{ position: 'relative' }}>
                {isLoading && groupedByRound.groups.length === 0 ? (
                    /* Skeleton Loading */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="vh-skeleton" style={{ height: '52px', borderRadius: '10px' }} />
                        ))}
                    </div>
                ) : groupedByRound.groups.length === 0 && groupedByRound.noRound.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '30px 20px',
                        background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                        border: '1px dashed rgba(255,255,255,0.1)',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📜</div>
                        <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '0 0 4px' }}>{t.noTransactionsYet}</p>
                        <small style={{ color: '#6b7280', fontSize: '0.65rem' }}>{t.vaultHistoryHint}</small>
                    </div>
                ) : roundSearch.trim() && groupedByRound.groups.length > 0 ? (
                    /* ===== ROUND SEARCH: DETAILED OVERVIEW CARD ===== */
                    (() => {
                        const group = groupedByRound.groups[0];
                        const hasAttacks = group.attacks.length > 0;
                        const hasClaims = group.claims.length > 0;
                        const hasVault = group.vaultDeposits.length > 0;
                        const roundPnL = group.totalVaultReceived - group.totalSpent;
                        const roundProfit = roundPnL >= 0;
                        return (
                            <div style={{
                                background: 'linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
                                borderRadius: '14px', overflow: 'hidden',
                                border: `1px solid ${roundProfit ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            }}>
                                {/* Round Header Banner */}
                                <div style={{
                                    padding: '16px', textAlign: 'center',
                                    background: `linear-gradient(135deg, ${roundProfit ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'}, rgba(0,0,0,0.3))`,
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <div style={{ fontSize: '0.6rem', color: '#9ca3af', marginBottom: '4px' }}>📊 {tAny.vhRoundOverview || 'Round Overview'}</div>
                                    <div style={{
                                        fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24',
                                        textShadow: '0 0 20px rgba(251,191,36,0.3)',
                                    }}>#{group.roundId}</div>
                                    <div style={{ fontSize: '0.55rem', color: '#6b7280', marginTop: '2px' }}>
                                        {formatExactTime(group.latestTimestamp)}
                                    </div>
                                </div>

                                {/* P&L Summary Banner */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    padding: '12px 16px',
                                    background: `linear-gradient(135deg, ${roundProfit ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'}, rgba(0,0,0,0.2))`,
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <span style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{tAny.vhNetPnL || 'Net P&L'}:</span>
                                    <span style={{
                                        fontSize: '1.2rem', fontWeight: 800,
                                        color: roundProfit ? '#22c55e' : '#ef4444',
                                    }}>
                                        {roundProfit ? '▲ +' : '▼ '}{formatAmount(roundPnL)} $BANMAO
                                    </span>
                                </div>

                                {/* Stats Cards */}
                                <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px' }}>
                                    {/* Attacks Card */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(251,191,36,0.02))',
                                        borderRadius: '10px', padding: '12px', textAlign: 'center',
                                        border: '1px solid rgba(251,191,36,0.15)',
                                    }}>
                                        <div style={{ fontSize: '1.4rem', marginBottom: '2px' }}>🎁</div>
                                        <div style={{ fontSize: '0.5rem', color: '#9ca3af', marginBottom: '4px' }}>{tAny.vhTotalGiftsInRound || 'Gifts'}</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fbbf24' }}>{group.totalAttackCount}</div>
                                        <div style={{ fontSize: '0.5rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>-{formatAmount(group.totalSpent)}</div>
                                    </div>
                                    {/* Vault Card */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.02))',
                                        borderRadius: '10px', padding: '12px', textAlign: 'center',
                                        border: '1px solid rgba(168,85,247,0.15)',
                                    }}>
                                        <div style={{ fontSize: '1.4rem', marginBottom: '2px' }}>💎</div>
                                        <div style={{ fontSize: '0.5rem', color: '#9ca3af', marginBottom: '4px' }}>{tAny.vhVaultReceived || 'Vault Received'}</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a855f7' }}>{formatAmount(group.totalVaultReceived)}</div>
                                        <div style={{ fontSize: '0.5rem', color: '#22c55e', fontWeight: 600, marginTop: '2px' }}>+{formatAmount(group.totalVaultReceived)}</div>
                                    </div>
                                    {/* Claims Card */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.02))',
                                        borderRadius: '10px', padding: '12px', textAlign: 'center',
                                        border: '1px solid rgba(239,68,68,0.15)',
                                    }}>
                                        <div style={{ fontSize: '1.4rem', marginBottom: '2px' }}>💰</div>
                                        <div style={{ fontSize: '0.5rem', color: '#9ca3af', marginBottom: '4px' }}>{t.claimedLabel}</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{formatAmount(group.totalClaimed)}</div>
                                        <div style={{ fontSize: '0.5rem', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>-{formatAmount(group.totalClaimed)}</div>
                                    </div>
                                </div>

                                {/* Detailed Transaction List */}
                                <div style={{ padding: '0 12px 12px' }}>
                                    <div style={{ fontSize: '0.55rem', color: '#6b7280', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                                        <span>📋 {tAny.vhTransactionDetails || 'Transaction Details'}</span>
                                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {/* Attacks */}
                                        {group.attacks.map(tx => {
                                            const isExpTx = expandedTxId === tx.id;
                                            return (
                                                <div key={tx.id}>
                                                    <div className="vault-row" onClick={() => setExpandedTxId(isExpTx ? null : tx.id)} style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '8px 10px', background: 'rgba(251,191,36,0.06)',
                                                        borderRadius: isExpTx ? '6px 6px 0 0' : '6px',
                                                        borderLeft: '2px solid #fbbf24',
                                                        fontSize: '0.65rem', cursor: 'pointer', transition: 'all 0.15s',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span>🎁</span>
                                                            <span style={{ color: '#fbbf24', fontWeight: 600 }}>{t.attackLabel}</span>
                                                            {tx.attackCount && tx.attackCount > 1 && (
                                                                <span style={{ fontSize: '0.55rem', background: 'rgba(251,191,36,0.15)', padding: '1px 5px', borderRadius: '4px', color: '#fbbf24', fontWeight: 600 }}>×{tx.attackCount}</span>
                                                            )}
                                                            <span style={{ color: '#6b7280', fontSize: '0.55rem' }}>{formatRelativeTime(tx.timestamp)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ color: '#ef4444', fontWeight: 600 }}>-{formatAmount(parseFloat(tx.amount))}</span>
                                                            <span style={{ fontSize: '0.5rem', color: '#666', transform: isExpTx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                                                        </div>
                                                    </div>
                                                    {isExpTx && renderTxDetail(tx)}
                                                </div>
                                            );
                                        })}
                                        {/* Vault Deposits */}
                                        {group.vaultDeposits.map(tx => {
                                            const rs = getReasonStyle(tx.reason);
                                            const isExpTx = expandedTxId === tx.id;
                                            return (
                                                <div key={tx.id}>
                                                    <div className="vault-row" onClick={() => setExpandedTxId(isExpTx ? null : tx.id)} style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '8px 10px', background: rs.bg,
                                                        borderRadius: isExpTx ? '6px 6px 0 0' : '6px',
                                                        borderLeft: `2px solid ${rs.color}`,
                                                        fontSize: '0.65rem', cursor: 'pointer', transition: 'all 0.15s',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span>{rs.emoji}</span>
                                                            <span style={{ color: rs.color, fontWeight: 600 }}>{getReasonLabel(tx.reason)}</span>
                                                            <span style={{ color: '#6b7280', fontSize: '0.55rem' }}>{formatRelativeTime(tx.timestamp)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ color: '#22c55e', fontWeight: 600 }}>+{formatAmount(parseFloat(tx.amount))}</span>
                                                            <span style={{ fontSize: '0.5rem', color: '#666', transform: isExpTx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                                                        </div>
                                                    </div>
                                                    {isExpTx && renderTxDetail(tx)}
                                                </div>
                                            );
                                        })}
                                        {/* Claims */}
                                        {group.claims.map(tx => {
                                            const isExpTx = expandedTxId === tx.id;
                                            return (
                                                <div key={tx.id}>
                                                    <div className="vault-row" onClick={() => setExpandedTxId(isExpTx ? null : tx.id)} style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '8px 10px', background: 'rgba(239,68,68,0.06)',
                                                        borderRadius: isExpTx ? '6px 6px 0 0' : '6px',
                                                        borderLeft: '2px solid #ef4444',
                                                        fontSize: '0.65rem', cursor: 'pointer', transition: 'all 0.15s',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span>💰</span>
                                                            <span style={{ color: '#ef4444', fontWeight: 600 }}>{t.claimedLabel}</span>
                                                            <span style={{ color: '#6b7280', fontSize: '0.55rem' }}>{formatRelativeTime(tx.timestamp)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ color: '#ef4444', fontWeight: 600 }}>-{formatAmount(parseFloat(tx.amount))}</span>
                                                            <span style={{ fontSize: '0.5rem', color: '#666', transform: isExpTx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                                                        </div>
                                                    </div>
                                                    {isExpTx && renderTxDetail(tx)}
                                                </div>
                                            );
                                        })}
                                        {/* No transactions message */}
                                        {!hasAttacks && !hasVault && !hasClaims && (
                                            <div style={{ textAlign: 'center', padding: '16px', color: '#6b7280', fontSize: '0.7rem' }}>
                                                {t.noTransactionsYet}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    /* ===== FLAT TRANSACTION LIST ===== */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {(() => {
                            // Flatten all transactions from all groups + noRound into a single sorted list
                            const allItems: VaultTransaction[] = [];
                            const showAttacks = filter === 'all' || filter === 'deposits';
                            const showVault = filter === 'all' || filter === 'vault';
                            const showClaims = filter === 'all' || filter === 'withdrawals';

                            groupedByRound.groups.forEach(g => {
                                if (showAttacks) allItems.push(...g.attacks);
                                if (showVault) allItems.push(...g.vaultDeposits);
                                if (showClaims) allItems.push(...g.claims);
                            });
                            allItems.push(...groupedByRound.noRound.filter(tx => {
                                if (tx.type === 'attack') return showAttacks;
                                if (tx.type === 'vault_deposit') return showVault;
                                if (tx.type === 'claim') return showClaims;
                                return filter === 'all';
                            }));
                            allItems.sort((a, b) => b.timestamp - a.timestamp);

                            const displayed = showAll ? allItems : allItems.slice(0, 30);
                            return (
                                <>
                                    {displayed.map(tx => {
                                        const isExpTx = expandedTxId === tx.id;
                                        const isAttack = tx.type === 'attack';
                                        const isClaim = tx.type === 'claim';
                                        const isVault = tx.type === 'vault_deposit';
                                        const icon = isAttack ? '🎁' : isClaim ? '💰' : (isVault ? (getReasonStyle(tx.reason).emoji) : '📦');
                                        const label = isAttack ? t.attackLabel : isClaim ? t.claimedLabel : getReasonLabel(tx.reason);
                                        const labelColor = isAttack ? '#fbbf24' : isClaim ? '#ef4444' : getReasonStyle(tx.reason).color;
                                        const amountColor = (isAttack || isClaim) ? '#ef4444' : '#22c55e';
                                        const amountPrefix = (isAttack || isClaim) ? '-' : '+';

                                        return (
                                            <div key={tx.id} style={{ marginBottom: '1px' }}>
                                                <div
                                                    className="vault-row"
                                                    onClick={() => setExpandedTxId(isExpTx ? null : tx.id)}
                                                    style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '8px 10px',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        borderRadius: isExpTx ? '8px 8px 0 0' : '8px',
                                                        // Removed left border color as requested
                                                        fontSize: '0.65rem', cursor: 'pointer', transition: 'all 0.15s',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                                                        <span style={{ flexShrink: 0 }}>{icon}</span>
                                                        <span style={{ color: labelColor, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
                                                        {isAttack && tx.attackCount && tx.attackCount > 1 && (
                                                            <span style={{ fontSize: '0.5rem', background: 'rgba(251,191,36,0.15)', padding: '1px 4px', borderRadius: '4px', color: '#fbbf24', fontWeight: 600, flexShrink: 0 }}>×{tx.attackCount}</span>
                                                        )}
                                                        {tx.roundId !== undefined && tx.roundId > 0 && (
                                                            <span style={{ fontSize: '0.5rem', background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: '4px', color: '#fbbf24', fontWeight: 600, flexShrink: 0 }}>#{tx.roundId}</span>
                                                        )}
                                                        <span style={{ color: '#6b7280', fontSize: '0.5rem', flexShrink: 0 }}>{formatRelativeTime(tx.timestamp)}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                        <span style={{ color: amountColor, fontWeight: 600 }}>
                                                            {amountPrefix}{formatAmount(parseFloat(tx.amount))}
                                                        </span>
                                                        <span style={{ fontSize: '0.5rem', color: '#555', transform: isExpTx ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                                                    </div>
                                                </div>
                                                {isExpTx && renderTxDetail(tx)}
                                            </div>
                                        );
                                    })}
                                    {allItems.length > 30 && !showAll && (
                                        <button className="vault-history-load-more" onClick={() => setShowAll(true)}>
                                            {t.loadMore(allItems.length - 30)}
                                        </button>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Explorer Helper */}
            <ExplorerHelper t={t} address={address} />
        </div>
    );
}



// Sub-components
function StatsCard({ label, value, sub, color, icon }: any) {
    return (
        <div style={{ background: `linear-gradient(135deg, ${color}15, rgba(0,0,0,0.3))`, border: `1px solid ${color}40`, borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase' }}>{icon} {label}</div>
            <div className="vh-stat-value" style={{ fontSize: '1.1rem', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '0.55rem', color: '#6b7280' }}>{sub}</div>
        </div>
    );
}

function AttackDetails({ tx, cost, t, tAny }: any) {
    return (
        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0 0 10px 10px', padding: '14px', marginTop: '-2px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ background: 'linear-gradient(135deg, #ff6b35, #ffd700)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>🎁 {t.roundLabel(tx.roundId)}</span>
                <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>{tAny.vhYourContribution}</span>
            </div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div style={{ background: 'rgba(251,191,36,0.08)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: '#9ca3af' }}>🎁 {tAny.vhTotalGiftsInRound}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>{tx.attackCount}</div>
                </div>
                <div style={{ background: 'rgba(34,211,238,0.08)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: '#9ca3af' }}>💰 {tAny.vhTotalSpent}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#22d3ee' }}>{(cost / 1000).toFixed(1)}K</div>
                </div>
            </div>
            {/* Bars */}
            <div style={{ fontSize: '0.7rem', color: '#22d3ee', marginBottom: '8px', fontWeight: 600 }}>📊 {cost.toLocaleString()} $BANMAO <span style={{ color: '#6b7280', fontWeight: 400 }}>({tAny.vhDistNote})</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <DistBar icon="🏆" label={tAny.distJackpotLabel} pct={V11_FUND_DISTRIBUTION.JACKPOT} value={cost * V11_FUND_DISTRIBUTION.JACKPOT / 100} color="#ffd700" />
                <DistBar icon="👥" label={tAny.distDividendLabel} pct={V11_FUND_DISTRIBUTION.DIVIDENDS} value={cost * V11_FUND_DISTRIBUTION.DIVIDENDS / 100} color="#22d3ee" />
                <DistBar icon="🌱" label={tAny.distSeedLabel} pct={V11_FUND_DISTRIBUTION.SEED_FUND} value={cost * V11_FUND_DISTRIBUTION.SEED_FUND / 100} color="#4ade80" />
                <DistBar icon="💎" label={tAny.distStakingLabel} pct={V11_FUND_DISTRIBUTION.STAKING} value={cost * V11_FUND_DISTRIBUTION.STAKING / 100} color="#a855f7" />
                <DistBar icon="🔥" label={tAny.distBurnLabel} pct={V11_FUND_DISTRIBUTION.BURN} value={cost * V11_FUND_DISTRIBUTION.BURN / 100} color="#ef4444" />
            </div>
        </div>
    );
}

function DistBar({ icon, label, pct, value, color }: any) {
    const fmt = (v: number) => v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: `${color}15`, borderRadius: '6px' }}>
            <span style={{ fontSize: '0.75rem', width: '20px' }}>{icon}</span>
            <span style={{ flex: 1, fontSize: '0.7rem', color: '#d1d5db' }}>{label}</span>
            <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color }} />
            </div>
            <span style={{ fontSize: '0.6rem', color: '#9ca3af', width: '28px', textAlign: 'right' }}>{pct}%</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color, minWidth: '50px', textAlign: 'right' }}>+{fmt(value)}</span>
        </div>
    )
}

function ExplorerHelper({ t, address }: { t: any, address: string }) {
    const [copied, setCopied] = useState('');
    const explorerUrl = `https://web3.okx.com/explorer/x-layer/address/${address}`;

    const handleCopy = async (text: string, key: string) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                setCopied(key);
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(key);
            } catch (e) {
                console.error('Copy failed', e);
            }
            document.body.removeChild(textArea);
        }
        setTimeout(() => setCopied(''), 2000);
    };

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(20,20,40,0.95), rgba(30,30,60,0.95))',
            borderRadius: '12px', padding: '10px 12px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            marginTop: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: '#a855f7' }}>
                <span style={{ fontSize: '0.8rem' }}>🔍</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                    {t.explorerSearchTitle}
                </span>
            </div>

            <div style={{ fontSize: '0.6rem', color: '#9ca3af', marginBottom: '8px', display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.6rem' }}>💡</span>
                <span style={{ fontStyle: 'italic', lineHeight: 1.3 }}>
                    {t.explorerSearchTip}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                <CopyRow label="attack" desc="(Deposit)" text="attack" onCopy={handleCopy} copied={copied === 'attack'} t={t} />
                <CopyRow label="settleGame" desc="(Withdraw)" text="settleGame" onCopy={handleCopy} copied={copied === 'settleGame'} t={t} />
            </div>

            <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
                className="explorer-btn"
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    width: '100%', padding: '8px', borderRadius: '999px',
                    background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.4)',
                    color: '#d8b4fe', fontSize: '0.7rem', fontWeight: 600, textDecoration: 'none',
                    transition: 'all 0.2s', boxSizing: 'border-box'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)';
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                🌐 {t.searchOnExplorer}
            </a>
        </div>
    );
}

function CopyRow({ label, desc, text, onCopy, copied, t }: any) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.3)', padding: '5px 10px', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.7rem' }}>📄</span>
                <span style={{ fontFamily: 'monospace', color: '#fca5a5', fontWeight: 600, fontSize: '0.75rem' }}>{label}</span>
                <span style={{ fontSize: '0.6rem', color: '#6b7280' }}>{desc}</span>
            </div>
            <button
                onClick={() => onCopy(text, label)}
                onMouseEnter={(e) => !copied && (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                onMouseLeave={(e) => !copied && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                style={{
                    background: copied ? '#22c55e' : 'rgba(255,255,255,0.1)',
                    border: 'none', borderRadius: '999px', padding: '4px 12px', minWidth: '50px',
                    fontSize: '0.6rem', color: copied ? '#fff' : '#d1d5db', cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s'
                }}
            >
                {copied ? (t.copied || 'Copied') : (t.copy || 'Copy')}
            </button>
        </div>
    )
}
