/**
 * RoundInfoPanel - Unified component combining LeaderBoard + RoundHistory
 * Master section: Current round hero card (leader, top attackers, jackpot)
 * Tab section: "Activity" (live feed) + "History" (past rounds)
 */
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import { BANMAOFOMO_ADDRESS, V11_FUND_DISTRIBUTION, CHAIN_ID, DEFAULT_ATTACK_COST, STORAGE_KEYS } from "../lib/constants";
import { BANMAOFOMO_ABI } from "../lib/abis";
import { BANMAOFOMO_V11_ABI } from "../lib/abis-v11";
import { LocaleStrings } from "../lib/i18n/types";
import type { AttackHistoryEntry, TopAttacker } from "../lib/types";
import AnimatedSprite from "./AnimatedSprite";
import AnimatedFrameSprite from "./AnimatedFrameSprite";

// Sprite paths
const KING_SPRITE = "/gamefi/banmaofomo/sprites/banmao_king.png";
const LEADER_IDLE_SPRITE = "/gamefi/banmaofomo/sprites/banmao_idle_wave.png";
const LEADER_CHANGE_SPRITE = "/gamefi/banmaofomo/sprites/banmao_heart_burst.png";

// Mobile fallback copy
const copyToClipboard = async (text: string) => {
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (e) {
        console.warn("Clipboard API failed, using fallback", e);
    }
    // Fallback for mobile and unsupported environments
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        return successful;
    } catch (e) {
        console.error("Fallback copy failed", e);
        return false;
    }
};

// === Interfaces ===

interface RoundInfoPanelProps {
    // From LeaderBoard
    currentLeader: `0x${string}`;
    totalAttacks: bigint;
    roundId: bigint;
    attackHistory: AttackHistoryEntry[];
    isLoadingHistory?: boolean;
    t: LocaleStrings;
    topAttackers?: TopAttacker[];
    jackpotPool?: bigint;
    userAddress?: `0x${string}`;
    // From RoundHistory
    currentRound: bigint;
    compact?: boolean;
    attackCost?: bigint;
}

interface TopAttackerData {
    addr: string;
    attacks: number;
}

interface RoundData {
    roundId: number;
    lastAttacker: string;
    totalAttacks: number;
    ended: boolean;
    softDeadline: number;
    hardDeadline: number;
    winner?: string;
    prize?: string;
    winType?: string;
    txHash?: string;
    topAttackers?: TopAttackerData[];
    claimed?: boolean;
    claimAmount?: string;
    rolloverAmount?: string;
    rolloverReason?: string;
    isTimeout?: boolean;
    // Actual jackpot data from events
    jackpotStart?: number;    // From RoundStarted event (includes seed + rollover)
    // Per-round attack cost (from activeConfig at time of fetch)
    attackCostHuman?: number; // e.g. 2000, 5000 etc.
}


interface RoundFinalizedLog {
    args: {
        roundId: bigint;
        winner: string;
        amount: bigint;
        winType: string;
    };
    transactionHash: string;
}

// === Main Component ===

export default function RoundInfoPanel({
    currentLeader,
    totalAttacks,
    roundId,
    attackHistory,
    isLoadingHistory = false,
    t,
    topAttackers = [],
    jackpotPool = BigInt(0),
    userAddress,
    currentRound,
    compact = false,
    attackCost = BigInt(2000000000000000000), // Default 2 BANMAO
}: RoundInfoPanelProps) {
    // === State ===
    const [activeTab, setActiveTab] = useState<0 | 1>(0); // 0 = Activity, 1 = History
    const [roundsData, setRoundsData] = useState<RoundData[]>([]);
    const [expandedRound, setExpandedRound] = useState<number | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [roundSearch, setRoundSearch] = useState('');
    const [searchedRound, setSearchedRound] = useState<RoundData | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [refreshCounter, setRefreshCounter] = useState(0); // auto-refresh trigger
    const [activityPage, setActivityPage] = useState(0); // pagination for activity tab
    const [expandedAttack, setExpandedAttack] = useState<number | null>(null); // which attack row is expanded
    const [keywordCopied, setKeywordCopied] = useState(false); // for explorer copy button
    const [showDistribution, setShowDistribution] = useState(false); // distribution modal visibility
    const ITEMS_PER_PAGE = 20;
    const publicClient = usePublicClient({ chainId: CHAIN_ID });
    const listRef = useRef<HTMLDivElement>(null);
    const prevLeaderRef = useRef<string>("");
    const attackCostRef = useRef<number>(Number(attackCost) / 1e18); // Real-time cost from contract
    const claimExpTimeRef = useRef<number>(7200); // Bug5 fix: store fetched claimExpirationTime

    // === Cache version busting: clear stale round cache on deploy ===
    useEffect(() => {
        const CACHE_VER_KEY = 'banmaofomo_cache_ver';
        const currentVer = STORAGE_KEYS.ROUND_CACHE_VERSION;
        const storedVer = localStorage.getItem(CACHE_VER_KEY);
        if (storedVer !== currentVer) {
            // Wipe all old round cache keys
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('banmaofomo_rounds_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            localStorage.setItem(CACHE_VER_KEY, currentVer);
            console.log(`🗑️ [CacheBust] Cleared ${keysToRemove.length} stale round cache keys (v${storedVer} → v${currentVer})`);
        }
    }, []);

    // Auto-refresh round history every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshCounter(prev => prev + 1);
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // i18n fallbacks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tAny = t as any;
    const topAttackersLabel = tAny.topAttackers || "Top Attackers";
    const noActivityLabel = tAny.noActivity || "No attacks yet";
    const roundDetailsLabel = tAny.roundDetails || "Round Details";
    const prizeDistributionLabel = tAny.prizeDistribution || "Prize Distribution";
    const roundHistoryLabel = tAny.roundHistory || "Round History";

    // === LeaderBoard Logic ===
    const leaderChanged = prevLeaderRef.current !== currentLeader &&
        prevLeaderRef.current !== "" &&
        currentLeader !== "0x0000000000000000000000000000000000000000";

    useEffect(() => {
        prevLeaderRef.current = currentLeader;
    }, [currentLeader]);

    const isZeroAddress = currentLeader === "0x0000000000000000000000000000000000000000";

    const userRank = userAddress
        ? topAttackers.findIndex(a => a.addr.toLowerCase() === userAddress.toLowerCase()) + 1
        : 0;
    const isUserInTop10 = userRank > 0;

    const totalTopAttacks = topAttackers.reduce((sum, a) => sum + Number(a.attacks), 0);
    const topAttackersRewardPool = Number(formatUnits(jackpotPool, 18)) * 0.25;

    // === RoundHistory Logic ===

    // Reset page when new attacks come in
    useEffect(() => {
        setActivityPage(0);
    }, [attackHistory.length]);

    // Fetch last 10 rounds data
    const roundIds = useMemo(() => {
        const current = Number(currentRound);
        const ids: number[] = [];
        for (let i = current; i >= Math.max(1, current - 9); i--) {
            ids.push(i);
        }
        return ids;
    }, [currentRound]);

    // Fetch top attackers for a specific round using V11 getTopAttackers view function
    const fetchTopAttackersForRound = useCallback(async (roundId: number): Promise<TopAttackerData[]> => {
        if (!publicClient) return [];

        try {
            // Single call to getTopAttackers returns TopAttacker[10] struct array
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = await (publicClient as any).readContract({
                address: BANMAOFOMO_ADDRESS,
                abi: BANMAOFOMO_V11_ABI,
                functionName: "getTopAttackers",
                args: [BigInt(roundId)],
            });

            // data is an array of { addr, attacks } structs
            const attackersArray = Array.from(data as unknown as any[]);
            const attackers: TopAttackerData[] = attackersArray
                .filter((a: any) => a.addr !== "0x0000000000000000000000000000000000000000" && Number(a.attacks) > 0)
                .map((a: any) => ({
                    addr: a.addr as string,
                    attacks: Number(a.attacks),
                }))
                .sort((a: TopAttackerData, b: TopAttackerData) => b.attacks - a.attacks);

            return attackers;
        } catch (error) {
            console.error("Error fetching top attackers for round", roundId, ":", error);
            return [];
        }
    }, [publicClient]);

    // Fetch round data for display
    useEffect(() => {
        const fetchRounds = async () => {
            if (!publicClient || roundIds.length === 0) return;

            // Read config values for settlement time derivation
            let claimExpTime = 7200; // fallback: 2 hours
            let initialHardDuration = 432000; // fallback: 120 hours
            let timeDecreaseStep = 30; // fallback: 30 seconds
            let configAttackCostHuman = Number(attackCost) / 1e18; // fallback from prop
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const configData = await (publicClient as any).readContract({
                    address: BANMAOFOMO_ADDRESS,
                    abi: BANMAOFOMO_V11_ABI,
                    functionName: "activeConfig",
                });
                // Viem may return as array OR named struct — handle both
                // GameConfig struct: [0]=attackCost, [1]=softDuration, [2]=initialHardDuration,
                //   [3]=timeDecreaseStep, [4]=maxAttacks, [5]=winnerPct, [6]=topPct,
                //   [7]=minAttacksForReward, [8]=claimExpirationTime
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawAttackCost = (configData as any).attackCost ?? (configData as any)[0];
                configAttackCostHuman = Number(rawAttackCost) / 1e18 || configAttackCostHuman;
                attackCostRef.current = configAttackCostHuman;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawClaimExp = (configData as any).claimExpirationTime ?? (configData as any)[8];
                claimExpTime = Number(rawClaimExp) || 7200;
                claimExpTimeRef.current = claimExpTime;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawHardDur = (configData as any).initialHardDuration ?? (configData as any)[2];
                initialHardDuration = Number(rawHardDur) || 432000;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawDecStep = (configData as any).timeDecreaseStep ?? (configData as any)[3];
                timeDecreaseStep = Number(rawDecStep) || 30;
                console.log('📊 [RoundHistory] activeConfig → attackCost =', configAttackCostHuman, ', claimExpTime =', claimExpTime, ', initialHardDuration =', initialHardDuration, ', timeDecreaseStep =', timeDecreaseStep);
            } catch (e) {
                console.warn('⚠️ Could not read activeConfig, using defaults', e);
            }

            const roundPromises = roundIds.map(async (roundId) => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const roundData = await (publicClient as any).readContract({
                        address: BANMAOFOMO_ADDRESS,
                        abi: BANMAOFOMO_V11_ABI,
                        functionName: "rounds",
                        args: [BigInt(roundId)],
                    }) as [number, number, boolean, string, bigint, bigint];

                    return {
                        roundId,
                        softDeadline: roundData[0],
                        hardDeadline: roundData[1],
                        ended: roundData[2],
                        lastAttacker: roundData[3],
                        totalAttacks: Number(roundData[4]),
                    };
                } catch {
                    return null;
                }
            });

            const results = await Promise.all(roundPromises);
            const validRounds = results.filter((r): r is RoundData => r !== null);

            // === Fetch per-round configs from DB ===
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let dbRoundConfigs: Record<number, any> = {};
            try {
                const roundIds = validRounds.map(r => r.roundId);
                if (roundIds.length > 0) {
                    const res = await fetch(`/api/fomo/round-config?rounds=${roundIds.join(',')}`);
                    if (res.ok) {
                        const data = await res.json();
                        dbRoundConfigs = data.configs || {};
                        console.log('📦 [RoundHistory] DB configs for rounds:', Object.keys(dbRoundConfigs));
                    }
                }
            } catch (e) {
                console.warn('⚠️ Could not fetch per-round configs from DB, using activeConfig fallback', e);
            }

            // Helper: get attack cost for a specific round (DB → activeConfig fallback)
            const getAttackCostForRound = (roundId: number): number => {
                const dbCfg = dbRoundConfigs[roundId];
                if (dbCfg && dbCfg.attackCost) {
                    return Number(dbCfg.attackCost) / 1e18;
                }
                return configAttackCostHuman;
            };

            // === localStorage Cache for finished rounds ===
            const CACHE_KEY = `banmaofomo_rounds_v${STORAGE_KEYS.ROUND_CACHE_VERSION}_${BANMAOFOMO_ADDRESS}`;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let cachedRounds: Record<string, any> = {};
            try {
                const raw = localStorage.getItem(CACHE_KEY);
                if (raw) cachedRounds = JSON.parse(raw);
            } catch { /* ignore parse errors */ }

            // Build round map for quick lookups (needed for next-round derivation)
            const roundMap = new Map<number, RoundData>();
            for (const r of validRounds) roundMap.set(r.roundId, r);

            // Derive win type from settlement time (no event scanning needed)
            // Logic: when round N ends, _startNewRound() creates round N+1 with:
            //   hardDeadline = block.timestamp + initialHardDuration
            //   Each attack decreases hardDeadline by timeDecreaseStep
            //   So: settlementTime = nextRound.hardDeadline + nextRound.totalAttacks * timeDecreaseStep - initialHardDuration
            // Then mirror contract: if settlementTime > deadline + claimExpTime → TIMEOUT
            const roundsWithWinners = validRounds.map(round => {
                // For ended rounds, check localStorage cache first
                const cached = cachedRounds[round.roundId];
                if (cached && round.ended) {
                    return { ...round, ...cached, topAttackers: undefined };
                }

                if (!round.ended) return round;

                // No participants → no winner possible
                if (!round.lastAttacker || round.lastAttacker === "0x0000000000000000000000000000000000000000" || round.totalAttacks === 0) {
                    return round;
                }

                // Get next round to derive settlement time via hardDeadline
                // (softDeadline resets on every attack so can't be used!)
                const nextRound = roundMap.get(round.roundId + 1);
                if (!nextRound || Number(nextRound.hardDeadline) === 0) {
                    // Can't derive win type — show estimated values
                    const roundCost = getAttackCostForRound(round.roundId);
                    const estimatedPool = (round.totalAttacks * roundCost * V11_FUND_DISTRIBUTION.JACKPOT) / 100;
                    return {
                        ...round,
                        winner: round.lastAttacker,
                        winType: 'UNKNOWN',
                        prize: `~${estimatedPool.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                        attackCostHuman: roundCost,
                    };
                }

                // Derive settlement time from hardDeadline (deterministic):
                // _startNewRound() sets: r.hardDeadline = block.timestamp + initialHardDuration
                // Each attack: r.hardDeadline -= timeDecreaseStep
                // So: currentHardDeadline = settlementTime + initialHardDuration - totalAttacks * timeDecreaseStep
                // => settlementTime = currentHardDeadline - initialHardDuration + totalAttacks * timeDecreaseStep
                const settlementTime = Number(nextRound.hardDeadline) - initialHardDuration + (nextRound.totalAttacks * timeDecreaseStep);
                const softDL = Number(round.softDeadline);
                const hardDL = Number(round.hardDeadline);

                let winType = 'UNKNOWN';
                let isTimeout = false;

                // Mirror contract logic: check hard deadline FIRST, then soft
                if (hardDL > 0 && settlementTime >= hardDL) {
                    if (settlementTime > hardDL + claimExpTime) {
                        winType = 'TIMEOUT'; isTimeout = true;
                    } else {
                        winType = 'HARD_WIN';
                    }
                } else if (softDL > 0 && settlementTime >= softDL) {
                    if (settlementTime > softDL + claimExpTime) {
                        winType = 'TIMEOUT'; isTimeout = true;
                    } else {
                        winType = 'SOFT_WIN';
                    }
                }

                // Estimate jackpot from this round's attacks (doesn't include seed from prev)
                const roundCost = getAttackCostForRound(round.roundId);
                const estimatedPool = (round.totalAttacks * roundCost * V11_FUND_DISTRIBUTION.JACKPOT) / 100;

                if (isTimeout) {
                    const result: RoundData = {
                        ...round,
                        winType,
                        isTimeout: true,
                        rolloverAmount: `~${estimatedPool.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                        attackCostHuman: roundCost,
                    };
                    // Cache
                    cachedRounds[round.roundId] = {
                        winType: result.winType,
                        isTimeout: result.isTimeout,
                        rolloverAmount: result.rolloverAmount,
                        attackCostHuman: roundCost,
                    };
                    return result;
                }

                // For HARD_WIN: contract deducts 30% for seed before distribution
                const distribPool = winType === 'HARD_WIN'
                    ? Math.round(estimatedPool * 0.7)
                    : estimatedPool;

                const result: RoundData = {
                    ...round,
                    winner: round.lastAttacker,
                    winType,
                    prize: `~${distribPool.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                    attackCostHuman: roundCost,
                };
                // Cache
                cachedRounds[round.roundId] = {
                    winner: result.winner,
                    winType: result.winType,
                    prize: result.prize,
                    attackCostHuman: roundCost,
                };
                return result;
            });

            // Save cache (keep last 50 rounds max)
            try {
                const keys = Object.keys(cachedRounds).map(Number).sort((a, b) => b - a);
                if (keys.length > 50) {
                    for (const k of keys.slice(50)) delete cachedRounds[k];
                }
                localStorage.setItem(CACHE_KEY, JSON.stringify(cachedRounds));
            } catch { /* ignore storage errors */ }

            // Preserve topAttackers from previous state when auto-refreshing
            setRoundsData(prev => {
                if (prev.length === 0) return roundsWithWinners;
                return roundsWithWinners.map(newRound => {
                    const oldRound = prev.find(r => r.roundId === newRound.roundId);
                    if (oldRound?.topAttackers) {
                        return { ...newRound, topAttackers: oldRound.topAttackers };
                    }
                    return newRound;
                });
            });
        };

        fetchRounds();
    }, [publicClient, roundIds, refreshCounter]);

    // Load top attackers when a round is expanded
    useEffect(() => {
        const loadTopAttackers = async () => {
            if (expandedRound === null) return;

            const attackers = await fetchTopAttackersForRound(expandedRound);
            setRoundsData(prev => prev.map(r =>
                r.roundId === expandedRound ? { ...r, topAttackers: attackers } : r
            ));
        };

        loadTopAttackers();
    }, [expandedRound, fetchTopAttackersForRound]);

    // === On-demand round search from contract ===
    const handleSearchRound = useCallback(async () => {
        const searchNum = parseInt(roundSearch.trim(), 10);
        if (isNaN(searchNum) || searchNum < 1 || searchNum > Number(currentRound)) {
            setSearchError(tAny.vhInvalidRound || `Invalid round (1-${Number(currentRound)})`);
            setSearchedRound(null);
            return;
        }

        // Check if already in roundsData
        const existing = roundsData.find(r => r.roundId === searchNum);
        if (existing) {
            setSearchedRound(existing);
            setExpandedRound(searchNum);
            setSearchError('');
            return;
        }

        if (!publicClient) return;
        setIsSearching(true);
        setSearchError('');
        setSearchedRound(null);

        try {
            // Fetch round struct
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const roundData = await (publicClient as any).readContract({
                address: BANMAOFOMO_ADDRESS,
                abi: BANMAOFOMO_V11_ABI,
                functionName: "rounds",
                args: [BigInt(searchNum)],
            }) as [number, number, boolean, string, bigint, bigint];

            const round: RoundData = {
                roundId: searchNum,
                softDeadline: roundData[0],
                hardDeadline: roundData[1],
                ended: roundData[2],
                lastAttacker: roundData[3],
                totalAttacks: Number(roundData[4]),
            };

            // Derive win type from settlement time (same approach as fetchRounds)
            if (round.ended && round.lastAttacker && round.lastAttacker !== "0x0000000000000000000000000000000000000000" && round.totalAttacks > 0) {
                try {
                    // Fetch next round to derive settlement time
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const nextRoundData = await (publicClient as any).readContract({
                        address: BANMAOFOMO_ADDRESS,
                        abi: BANMAOFOMO_V11_ABI,
                        functionName: "rounds",
                        args: [BigInt(searchNum + 1)],
                    }) as [number, number, boolean, string, bigint, bigint];

                    const nextHardDeadline = Number(nextRoundData[1]);
                    const nextTotalAttacks = Number(nextRoundData[4]);

                    // Read config values for derivation
                    let searchInitialHardDur = 432000;
                    let searchTimeDecStep = 30;
                    let searchClaimExpTime = claimExpTimeRef.current || 7200;
                    let searchAttackCostHuman = attackCostRef.current || (Number(attackCost) / 1e18);
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const cfgData = await (publicClient as any).readContract({
                            address: BANMAOFOMO_ADDRESS,
                            abi: BANMAOFOMO_V11_ABI,
                            functionName: "activeConfig",
                        });
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const rawCost = (cfgData as any).attackCost ?? (cfgData as any)[0];
                        searchAttackCostHuman = Number(rawCost) / 1e18 || searchAttackCostHuman;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        searchInitialHardDur = Number((cfgData as any).initialHardDuration ?? (cfgData as any)[2]) || 432000;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        searchTimeDecStep = Number((cfgData as any).timeDecreaseStep ?? (cfgData as any)[3]) || 30;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        searchClaimExpTime = Number((cfgData as any).claimExpirationTime ?? (cfgData as any)[8]) || 7200;
                    } catch { /* use defaults */ }

                    if (nextHardDeadline > 0) {
                        // Derive settlement time from hardDeadline (deterministic)
                        const settlementTime = nextHardDeadline - searchInitialHardDur + (nextTotalAttacks * searchTimeDecStep);
                        const softDL = Number(round.softDeadline);
                        const hardDL = Number(round.hardDeadline);

                        let winType = 'UNKNOWN';
                        let isTimeout = false;

                        // Mirror contract: check hard deadline first
                        if (hardDL > 0 && settlementTime >= hardDL) {
                            if (settlementTime > hardDL + searchClaimExpTime) {
                                winType = 'TIMEOUT'; isTimeout = true;
                            } else {
                                winType = 'HARD_WIN';
                            }
                        } else if (softDL > 0 && settlementTime >= softDL) {
                            if (settlementTime > softDL + searchClaimExpTime) {
                                winType = 'TIMEOUT'; isTimeout = true;
                            } else {
                                winType = 'SOFT_WIN';
                            }
                        }

                        round.winType = winType;
                        round.isTimeout = isTimeout;

                        const estimatedPool = (round.totalAttacks * searchAttackCostHuman * V11_FUND_DISTRIBUTION.JACKPOT) / 100;
                        if (isTimeout) {
                            round.rolloverAmount = `~${estimatedPool.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
                        } else {
                            round.winner = round.lastAttacker;
                            const distribPool = winType === 'HARD_WIN' ? Math.round(estimatedPool * 0.7) : estimatedPool;
                            round.prize = `~${distribPool.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
                        }
                        round.attackCostHuman = searchAttackCostHuman;
                    } else {
                        // Next round has no deadline yet — show estimated
                        round.winner = round.lastAttacker;
                        round.winType = 'UNKNOWN';
                        const estimatedPool = (round.totalAttacks * searchAttackCostHuman * V11_FUND_DISTRIBUTION.JACKPOT) / 100;
                        round.prize = `~${estimatedPool.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
                        round.attackCostHuman = searchAttackCostHuman;
                    }
                } catch (e) {
                    console.warn('⚠️ Could not derive win type for searched round:', e);
                    round.winner = round.lastAttacker;
                    round.winType = 'UNKNOWN';
                    const searchCost = attackCostRef.current || (Number(attackCost) / 1e18);
                    const estimatedPool = (round.totalAttacks * searchCost * V11_FUND_DISTRIBUTION.JACKPOT) / 100;
                    round.prize = `~${estimatedPool.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
                    round.attackCostHuman = searchCost;
                }
            }

            // Fetch top attackers
            const attackers = await fetchTopAttackersForRound(searchNum);
            round.topAttackers = attackers;

            setSearchedRound(round);
            setExpandedRound(searchNum);
        } catch (error) {
            console.error('Error searching round:', error);
            setSearchError(tAny.vhRoundNotFound || 'Round not found');
            setSearchedRound(null);
        } finally {
            setIsSearching(false);
        }
    }, [roundSearch, currentRound, publicClient, roundsData, fetchTopAttackersForRound, tAny]);

    // === Helper Functions ===
    const formatAddress = (addr: string): string => {
        if (!addr || addr === "0x0000000000000000000000000000000000000000") return "—";
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatTime = (timestamp: number): string => {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - timestamp;
        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        return `${Math.floor(diff / 3600)}h`;
    };

    const formatNumber = (num: number): string => {
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
        return num.toLocaleString('en-US');
    };

    const formatTimestamp = (ts: number) => {
        if (!ts || ts === 0) return "---";
        const date = new Date(ts * 1000);
        return date.toLocaleString();
    };

    const formatTimeAgo = (ts: number) => {
        const seconds = Math.floor((Date.now() - ts) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        return `${Math.floor(minutes / 60)}h ago`;
    };

    const renderAddressLink = (addr: string, style?: React.CSSProperties) => {
        if (!addr || addr === "0x0000000000000000000000000000000000000000") return <span>---</span>;
        const explorerUrl = `https://web3.okx.com/explorer/x-layer/address/${addr}`;
        return (
            <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                    color: '#ffd700',
                    textDecoration: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    ...style,
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                    e.currentTarget.style.color = '#22d3ee';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                    e.currentTarget.style.color = style?.color || '#ffd700';
                }}
            >
                {formatAddress(addr)} ↗
            </a>
        );
    };

    // Filter past rounds (exclude active round for History tab)
    const pastRounds = useMemo(() => roundsData.filter(r => r.roundId !== Number(currentRound)), [roundsData, currentRound]);
    const displayPastRounds = useMemo(() => {
        // If we have a searched round, don't filter main list — searched round shows separately
        const rounds = isExpanded ? pastRounds : pastRounds.slice(0, 5);
        // Prepend searched round if not already in the list
        if (searchedRound && !rounds.find(r => r.roundId === searchedRound.roundId)) {
            return [searchedRound, ...rounds];
        }
        return rounds;
    }, [isExpanded, pastRounds, searchedRound]);

    // ==========================
    // ===       RENDER       ===
    // ==========================

    return (
        <motion.div
            className={`round-info-panel${compact ? ' compact' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: compact ? '4px' : '20px',
            }}
        >
            {/* ========== MASTER SECTION: Current Round ========== */}
            <div className="leaderboard-panel" style={{ background: 'none', padding: 0, border: 'none', margin: 0 }}>
                <h3 className="leaderboard-title">
                    <span className="round-icon">🎮</span>
                    {t.currentRound}
                    <motion.span
                        className="round-number"
                        key={roundId.toString()}
                        initial={{ scale: 1.3, color: "#ffd700" }}
                        animate={{ scale: 1, color: "#ffffff" }}
                    >
                        #{roundId.toString()}
                    </motion.span>
                </h3>

                {/* Unified Hero Header Card */}
                <motion.div
                    className="hero-header-card"
                    style={{
                        position: 'relative',
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px',
                        padding: compact ? '6px' : '24px',
                        marginBottom: compact ? '4px' : '20px',
                        marginTop: compact ? '0px' : '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        overflow: 'visible', // Allow Banana King to overflow
                    }}
                    animate={leaderChanged ? {
                        boxShadow: [
                            "0 0 10px rgba(255, 215, 0, 0.1)",
                            "0 0 30px rgba(255, 215, 0, 0.4)",
                            "0 0 10px rgba(255, 215, 0, 0.1)",
                        ],
                    } : {
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    }}
                    transition={{ duration: 1 }}
                >
                    {/* Banana King as background watermark */}
                    {!isZeroAddress && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            opacity: 0.55,
                            pointerEvents: 'none',
                            zIndex: 0,
                            filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.3))',
                        }}>
                            <AnimatedSprite
                                src={KING_SPRITE}
                                alt="Top Donor"
                                width={compact ? 80 : 160}
                                height={compact ? 80 : 160}
                                preset={["wave", "glow"]}
                                glowColor="gold"
                            />
                        </div>
                    )}

                    {/* Leader Focus */}
                    <div style={{ textAlign: 'center', width: '100%', marginBottom: compact ? '4px' : '20px', position: 'relative', zIndex: 1 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginBottom: '4px'
                        }}>
                            <motion.span
                                style={{ fontSize: compact ? '0.65rem' : '1.5rem' }}
                                animate={{
                                    rotate: [0, -10, 10, -10, 0],
                                    scale: [1, 1.1, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatDelay: 3,
                                }}
                            >
                                👑
                            </motion.span>
                            <span style={{
                                fontSize: '0.75rem',
                                color: '#888',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                fontWeight: 700
                            }}>
                                {t.currentLeader}
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: compact ? '6px' : '12px' }}>
                            {/* Leader Cat Avatar */}
                            {!isZeroAddress && (
                                <motion.img
                                    key={leaderChanged ? 'changed' : 'idle'}
                                    src={leaderChanged ? LEADER_CHANGE_SPRITE : LEADER_IDLE_SPRITE}
                                    alt="Leader Cat"
                                    style={{
                                        width: compact ? 32 : 56,
                                        height: compact ? 32 : 56,
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid rgba(255, 215, 0, 0.3)',
                                        flexShrink: 0,
                                    }}
                                    initial={{ scale: 0, rotate: -30 }}
                                    animate={leaderChanged ? {
                                        scale: [0, 1.3, 1],
                                        rotate: [-30, 10, -10, 0],
                                    } : {
                                        scale: 1,
                                        rotate: 0,
                                        y: [0, -3, 0],
                                    }}
                                    transition={leaderChanged ? {
                                        duration: 0.6,
                                    } : {
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                    }}
                                />
                            )}
                            <motion.div
                                key={currentLeader}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    fontSize: compact ? '0.7rem' : '1.4rem',
                                    fontWeight: 800,
                                    fontFamily: "'Fira Code', monospace",
                                    color: '#ffd700',
                                    textShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
                                    wordBreak: 'break-all'
                                }}
                            >
                                {isZeroAddress ? "—" : renderAddressLink(currentLeader)}
                            </motion.div>
                        </div>
                    </div>

                    {/* Stats Row - Clickable */}
                    <div style={{
                        display: 'flex',
                        width: '100%',
                        justifyContent: 'center',
                        gap: compact ? '10px' : '40px',
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative',
                        zIndex: 1,
                    }}
                        onClick={() => setShowDistribution(prev => !prev)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02)';
                            e.currentTarget.style.filter = 'brightness(1.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.filter = 'brightness(1)';
                        }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', marginBottom: '2px' }}>
                                🎁 {t.totalAttacks}
                            </div>
                            <motion.div
                                key={totalAttacks.toString()}
                                initial={{ scale: 1.2, color: "#ff6b35" }}
                                animate={{ scale: 1, color: "#ffffff" }}
                                style={{ fontSize: compact ? '0.6rem' : '1.2rem', fontWeight: 700 }}
                            >
                                {Number(totalAttacks).toLocaleString()}
                            </motion.div>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', marginBottom: '2px' }}>
                                💸 {t.totalBanmaoLabel}
                            </div>
                            <div style={{ fontSize: compact ? '0.6rem' : '1.2rem', fontWeight: 700, color: '#22c55e' }}>
                                {formatNumber(Number(totalAttacks) * Number(formatUnits(attackCost, 18)))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Distribution Breakdown - Inline Collapsible */}
                <AnimatePresence>
                    {showDistribution && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden', marginTop: '8px' }}
                        >
                            <div style={{
                                background: 'rgba(0, 0, 0, 0.4)',
                                border: '1px solid rgba(255, 215, 0, 0.15)',
                                borderRadius: '12px',
                                padding: '12px',
                            }}>
                                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                                    <div style={{ color: '#f59e0b', fontSize: '0.9rem', fontWeight: 700, fontFamily: "'Fira Code', monospace" }}>
                                        {formatNumber(Number(formatUnits(jackpotPool, 18)) + (Number(totalAttacks) * Number(formatUnits(attackCost, 18)) * 0.25))} $BANMAO
                                    </div>
                                    <div style={{ color: '#888', fontSize: '0.6rem', marginTop: '2px', fontStyle: 'italic' }}>
                                        📢 {tAny.distCollectiveNote}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {[
                                        { icon: '🏆', label: tAny.distJackpotLabel || 'Jackpot', pct: 75, color: '#ffd700', bg: 'rgba(255, 215, 0, 0.06)' },
                                        { icon: '💰', label: tAny.distDividendLabel || 'Dividends', pct: 17, color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.06)' },
                                        { icon: '🌱', label: tAny.distSeedLabel || 'Next Round', pct: 5, color: '#4ade80', bg: 'rgba(34, 197, 94, 0.06)' },
                                        { icon: '💎', label: tAny.distStakingLabel || 'Staking', pct: 2, color: '#c084fc', bg: 'rgba(168, 85, 247, 0.06)' },
                                        { icon: '🔥', label: tAny.distBurnLabel || 'Burn', pct: 1, color: '#f87171', bg: 'rgba(239, 68, 68, 0.06)' },
                                    ].map((item) => (
                                        <div key={item.label} style={{
                                            background: item.bg,
                                            borderRadius: '8px',
                                            padding: '6px 10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            fontSize: '0.75rem',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '12px' }}>{item.icon}</span>
                                                <span style={{ fontWeight: 600, color: '#ccc' }}>{item.label}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <span style={{ color: item.color, fontWeight: 700, fontSize: '0.75rem' }}>
                                                        {item.label.includes(tAny.distJackpotLabel || 'Jackpot') ? (
                                                            // For Jackpot: Use Actual Pool
                                                            `+${formatNumber(Number(formatUnits(jackpotPool, 18)))}`
                                                        ) : (
                                                            // For Others: Use Revenue Share
                                                            `+${formatNumber(Number(totalAttacks) * Number(formatUnits(attackCost, 18)) * item.pct / 100)}`
                                                        )}
                                                    </span>
                                                    {item.label.includes(tAny.distJackpotLabel || 'Jackpot') && (function () {
                                                        const totalPool = Number(formatUnits(jackpotPool, 18));
                                                        const attackRevenue = Number(totalAttacks) * Number(formatUnits(attackCost, 18));
                                                        // Seed = Actual Jackpot - (Revenue * 75%)
                                                        const jackpotRevenue = attackRevenue * 0.75;
                                                        const seedShare = Math.max(0, totalPool - jackpotRevenue);

                                                        if (seedShare > 0.1) {
                                                            return (
                                                                <span style={{ fontSize: '0.6rem', color: '#888', fontStyle: 'italic' }}>
                                                                    (Quỹ tích lũy vòng trước: +{formatNumber(seedShare)})
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                                <span style={{
                                                    background: 'rgba(255,255,255,0.06)',
                                                    color: item.color,
                                                    padding: '1px 4px',
                                                    borderRadius: '3px',
                                                    fontSize: '0.55rem',
                                                    fontWeight: 700,
                                                }}>{item.pct}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{
                                    marginTop: '6px',
                                    borderTop: '1px dashed rgba(255,255,255,0.06)',
                                    paddingTop: '6px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.75rem',
                                    color: '#ffd700'
                                }}>
                                    <span>📊 {tAny.distTotalLabel}:</span>
                                    <b>{formatNumber(Number(formatUnits(jackpotPool, 18)) + (Number(totalAttacks) * Number(formatUnits(attackCost, 18)) * 0.25))} $BANMAO</b>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* Top 10 Attackers with reward share */}
                {topAttackers.length > 0 && (
                    <div className="top-attackers-section" style={compact ? { padding: '6px', marginTop: '4px' } : {}}>
                        <h4 className="top-attackers-title" style={compact ? { fontSize: '0.7rem', marginBottom: '4px' } : {}}>
                            <span className="top-attackers-icon">🏆</span>
                            {t.leaderboardTopTitle}
                            <span className="reward-badge" style={compact ? { fontSize: '0.55rem', padding: '1px 5px' } : {}}>{t.leaderboardPotShare}</span>
                        </h4>

                        {isUserInTop10 && (
                            <div style={{
                                background: 'rgba(34, 197, 94, 0.15)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: '9999px',
                                padding: compact ? '3px 8px' : '6px 10px',
                                marginBottom: compact ? '4px' : '8px',
                                fontSize: compact ? '0.65rem' : '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}>
                                <span>⭐</span>
                                <span style={{ color: '#22c55e' }}>
                                    {t.yourRank ? t.yourRank(userRank) : `You are #${userRank} in Top 10!`}
                                </span>
                            </div>
                        )}

                        <div className="top-attackers-list top-attackers-scroll">
                            {topAttackers.slice(0, 10).map((attacker, index) => {
                                const isCurrentUser = userAddress && attacker.addr.toLowerCase() === userAddress.toLowerCase();
                                const attackerShare = totalTopAttacks > 0
                                    ? (Number(attacker.attacks) / totalTopAttacks) * topAttackersRewardPool
                                    : 0;
                                return (
                                    <motion.div
                                        key={attacker.addr}
                                        className={`top-attacker-item top-attacker-compact rank-${index + 1} leaderboard-item`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        style={isCurrentUser ? {
                                            background: 'rgba(34, 197, 94, 0.1)',
                                            border: '1px solid rgba(34, 197, 94, 0.3)',
                                            borderRadius: '9999px',
                                        } : {}}
                                    >
                                        <span className="rank-badge">
                                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                                        </span>
                                        <a
                                            href={`https://web3.okx.com/explorer/x-layer/address/${attacker.addr}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="attacker-address"
                                            style={{
                                                textDecoration: 'none',
                                                ...(isCurrentUser ? { color: '#22c55e', fontWeight: 600 } : {})
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {isCurrentUser ? t.youLabel : formatAddress(attacker.addr)}
                                            {!isCurrentUser && <span style={{ marginLeft: '4px', opacity: 0.5, fontSize: '0.8em' }}>↗</span>}
                                        </a>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px', marginLeft: 'auto' }}>
                                            <span className="attacker-attacks">
                                                {Number(attacker.attacks).toLocaleString()} {t.attacksShort}
                                            </span>
                                            {attackerShare > 0 ? (
                                                <span style={{ fontSize: '0.6rem', color: '#22c55e', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                                    ~{formatNumber(attackerShare)} $BANMAO 🎁
                                                </span>
                                            ) : Number(attacker.attacks) < 10 ? (
                                                <span style={{ fontSize: '0.55rem', color: '#ef4444', whiteSpace: 'nowrap' }}>
                                                    {tAny.notQualified || '< 10 gifts ❌'}
                                                </span>
                                            ) : null}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ========== TAB SWITCHER ========== */}
            <div style={{
                display: 'flex',
                gap: '4px',
                marginTop: compact ? '4px' : '20px',
                marginBottom: compact ? '4px' : '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '9999px',
                padding: compact ? '2px' : '4px',
            }}>
                {[
                    { label: `🎁 ${t.recentAttacks || 'Activity'}`, value: 0 as const },
                    { label: `📜 ${roundHistoryLabel}`, value: 1 as const },
                ].map((tab) => (
                    <motion.button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            flex: 1,
                            padding: compact ? '5px 8px' : '10px 12px',
                            border: 'none',
                            borderRadius: '9999px',
                            fontSize: compact ? '0.68rem' : '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.25s ease',
                            background: activeTab === tab.value
                                ? 'linear-gradient(135deg, rgba(255, 107, 53, 0.3), rgba(255, 215, 0, 0.2))'
                                : 'transparent',
                            color: activeTab === tab.value ? '#ffd700' : '#666',
                            boxShadow: activeTab === tab.value
                                ? '0 2px 8px rgba(255, 107, 53, 0.2)'
                                : 'none',
                        }}
                    >
                        {tab.label}
                    </motion.button>
                ))}
            </div>

            {/* ========== TAB CONTENT ========== */}
            <AnimatePresence mode="wait">
                {activeTab === 0 ? (
                    /* ===== TAB 0: Activity Feed ===== */
                    <motion.div
                        key="activity"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                    >

                        {/* Explorer Transparency Box */}
                        <div style={{
                            padding: '12px',
                            background: 'rgba(34, 211, 238, 0.05)',
                            borderRadius: '12px',
                            border: '1px solid rgba(34, 211, 238, 0.15)',
                            marginBottom: '16px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ fontSize: '1.2rem' }}>🔍</span>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginBottom: '8px', lineHeight: 1.4 }}>
                                        {t.explorerVerifyDesc || "Verify on Explorer. Filter by the keyword below to see all feed history."}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <a
                                            href={`https://web3.okx.com/explorer/x-layer/address/${BANMAOFOMO_ADDRESS}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: '6px 14px',
                                                background: 'rgba(34, 211, 238, 0.1)',
                                                border: '1px solid rgba(34, 211, 238, 0.3)',
                                                borderRadius: '9999px',
                                                color: '#22d3ee',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                textDecoration: 'none',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(34, 211, 238, 0.2)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)'}
                                        >
                                            Contract ↗
                                        </a>
                                        <button
                                            onClick={async () => {
                                                const success = await copyToClipboard('attack');
                                                if (success) {
                                                    setKeywordCopied(true);
                                                    setTimeout(() => setKeywordCopied(false), 2000);
                                                }
                                            }}
                                            style={{
                                                padding: '6px 14px',
                                                background: keywordCopied ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                border: keywordCopied ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '9999px',
                                                color: keywordCopied ? '#4ade80' : '#fff',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => !keywordCopied && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                                            onMouseLeave={e => !keywordCopied && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                                        >
                                            {keywordCopied ? '✅ ' + (t.explorerCopied || 'Copied!') : '📋 ' + (t.explorerCopyBtn || "Copy 'attack'")}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Loading Skeleton */}
                        {isLoadingHistory ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 12px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: '8px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '32px', height: '18px',
                                                background: 'rgba(255,255,255,0.08)',
                                                borderRadius: '4px',
                                                animation: 'pulse 1.5s ease-in-out infinite',
                                            }} />
                                            <div style={{
                                                width: `${80 + i * 10}px`, height: '14px',
                                                background: 'rgba(255,255,255,0.06)',
                                                borderRadius: '4px',
                                                animation: 'pulse 1.5s ease-in-out infinite',
                                                animationDelay: `${i * 0.1}s`,
                                            }} />
                                        </div>
                                        <div style={{
                                            width: '40px', height: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '4px',
                                            animation: 'pulse 1.5s ease-in-out infinite',
                                        }} />
                                    </div>
                                ))}
                            </div>
                        ) : attackHistory.length === 0 ? (
                            <motion.div
                                className="no-history"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{
                                    textAlign: 'center',
                                    padding: '32px',
                                    color: '#666',
                                    fontSize: '0.85rem',
                                }}
                            >
                                {t.noHistory}
                            </motion.div>
                        ) : (
                            <>
                                {/* Total count header */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '10px',
                                    padding: '0 4px',
                                }}>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        color: '#888',
                                    }}>
                                        {attackHistory.length} {t.attacksLabel} {t.attacksTotal}
                                    </span>
                                    {attackHistory.length > ITEMS_PER_PAGE && (
                                        <span style={{
                                            fontSize: '0.65rem',
                                            color: '#555',
                                        }}>
                                            Page {activityPage + 1} / {Math.ceil(attackHistory.length / ITEMS_PER_PAGE)}
                                        </span>
                                    )}
                                </div>

                                {/* Attack list with windowed rendering */}
                                <div
                                    className="activity-scroll-list"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: compact ? '2px' : '4px',
                                        maxHeight: compact ? '300px' : '420px',
                                        overflowY: 'auto',
                                    }}>
                                    {attackHistory
                                        .slice(activityPage * ITEMS_PER_PAGE, (activityPage + 1) * ITEMS_PER_PAGE)
                                        .map((entry, index) => {
                                            const globalIndex = activityPage * ITEMS_PER_PAGE + index;
                                            const isUser = userAddress && entry.player.toLowerCase() === userAddress.toLowerCase();
                                            const isNewest = globalIndex === 0 && activityPage === 0;
                                            const isRowExpanded = expandedAttack === globalIndex;

                                            return (
                                                <motion.div
                                                    key={`${entry.player}-${entry.timestamp}-${globalIndex}`}
                                                    initial={isNewest ? { opacity: 0, y: -20, scale: 0.95 } : { opacity: 0 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    transition={{
                                                        duration: 0.2,
                                                        delay: index * 0.02,
                                                    }}
                                                    onClick={() => setExpandedAttack(isRowExpanded ? null : globalIndex)}
                                                    style={{
                                                        padding: compact ? '5px 10px' : '8px 18px',
                                                        background: isRowExpanded
                                                            ? 'rgba(255, 107, 53, 0.12)'
                                                            : isUser
                                                                ? 'rgba(34, 197, 94, 0.1)'
                                                                : isNewest
                                                                    ? 'rgba(255, 107, 53, 0.08)'
                                                                    : 'rgba(255, 255, 255, 0.02)',
                                                        border: isRowExpanded
                                                            ? '1px solid rgba(255, 107, 53, 0.35)'
                                                            : isUser
                                                                ? '1px solid rgba(34, 197, 94, 0.25)'
                                                                : isNewest
                                                                    ? '1px solid rgba(255, 107, 53, 0.2)'
                                                                    : '1px solid transparent',
                                                        borderRadius: isRowExpanded ? '16px' : '9999px',
                                                        fontSize: compact ? '0.68rem' : '0.78rem',
                                                        transition: 'all 0.2s',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    {/* Main row */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                                            {/* Count badge */}
                                                            <span style={{
                                                                background: entry.count >= 5
                                                                    ? 'linear-gradient(135deg, #ff6b35, #ffd700)'
                                                                    : 'rgba(255, 107, 53, 0.2)',
                                                                color: entry.count >= 5 ? '#000' : '#ff6b35',
                                                                padding: '2px 8px',
                                                                borderRadius: '9999px',
                                                                fontWeight: 700,
                                                                fontSize: '0.72rem',
                                                                whiteSpace: 'nowrap',
                                                                minWidth: '36px',
                                                                textAlign: 'center',
                                                            }}>
                                                                x{entry.count}
                                                            </span>

                                                            {/* Player address */}
                                                            {isUser ? (
                                                                <span style={{
                                                                    color: '#22c55e',
                                                                    fontWeight: 600,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                }}>
                                                                    ★ {t.youLabel || 'BẠN'}
                                                                </span>
                                                            ) : (
                                                                renderAddressLink(entry.player, {
                                                                    color: '#ccc',
                                                                    fontWeight: 500,
                                                                    fontSize: '0.76rem',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                })
                                                            )}
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{
                                                                color: '#555',
                                                                fontSize: '0.68rem',
                                                                whiteSpace: 'nowrap',
                                                            }}>
                                                                {formatTime(entry.timestamp)}
                                                            </span>
                                                            <span style={{
                                                                color: '#555',
                                                                fontSize: '0.65rem',
                                                                transition: 'transform 0.2s',
                                                                transform: isRowExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                            }}>
                                                                ▼
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* RPG Narrative */}
                                                    <div style={{
                                                        fontSize: compact ? '0.58rem' : '0.68rem',
                                                        color: entry.count >= 10 ? '#ff4444'
                                                            : entry.count >= 5 ? '#ff8c00'
                                                                : entry.count >= 3 ? '#fbbf24'
                                                                    : '#7a7a95',
                                                        fontStyle: 'italic',
                                                        marginTop: '2px',
                                                        paddingLeft: compact ? '44px' : '52px',
                                                        lineHeight: 1.3,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {(() => {
                                                            const name = isUser ? (t.battleYou || 'YOU') : `${entry.player.slice(0, 6)}…${entry.player.slice(-4)}`;
                                                            if (entry.count >= 10) return t.battleSuperCombo?.(name, entry.count) || `💥 ${name} SUPER COMBO x${entry.count}!`;
                                                            if (entry.count >= 5) return t.battleCombo?.(name, entry.count) || `🔥 ${name} COMBO x${entry.count}!`;
                                                            if (entry.count >= 3) return t.battleTriple?.(name, entry.count) || `⚡ ${name} x${entry.count}!`;
                                                            if (entry.count === 2) return t.battleDouble?.(name) || `🗡️ ${name} x2!`;
                                                            return t.battleSingle?.(name, Math.abs(entry.timestamp) % 4) || `🍌 ${name}!`;
                                                        })()}
                                                    </div>

                                                    {/* Expanded detail panel */}
                                                    <AnimatePresence>
                                                        {isRowExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.2 }}
                                                                style={{ overflow: 'hidden' }}
                                                            >
                                                                <div style={{
                                                                    marginTop: compact ? '4px' : '8px',
                                                                    padding: compact ? '6px 8px' : '10px 12px',
                                                                    background: 'rgba(0, 0, 0, 0.25)',
                                                                    borderRadius: compact ? '8px' : '12px',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: compact ? '3px' : '6px',
                                                                    fontSize: compact ? '0.62rem' : '0.72rem',
                                                                }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <span style={{ color: '#888' }}>👤 {t.recentGiftPlayer}</span>
                                                                        <a
                                                                            href={`https://web3.okx.com/explorer/x-layer/address/${entry.player}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            style={{ color: '#ff6b35', textDecoration: 'none' }}
                                                                        >
                                                                            {entry.player.slice(0, 8)}...{entry.player.slice(-6)}
                                                                        </a>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <span style={{ color: '#888' }}>🎁 {t.recentGiftCount}</span>
                                                                        <span style={{ color: '#ffd700', fontWeight: 600 }}>{entry.count}x</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                        <span style={{ color: '#888' }}>⏰ {t.recentGiftTime}</span>
                                                                        <span style={{ color: '#aaa' }}>{new Date(entry.timestamp * 1000).toLocaleString()}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <span style={{ color: '#888' }}>📝 {t.recentGiftTx}</span>
                                                                        {entry.txHash ? (
                                                                            <a
                                                                                href={`https://web3.okx.com/explorer/x-layer/tx/${entry.txHash}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                style={{
                                                                                    color: '#22c55e',
                                                                                    textDecoration: 'none',
                                                                                    fontSize: '0.7rem',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '4px',
                                                                                }}
                                                                            >
                                                                                {entry.txHash.slice(0, 10)}...{entry.txHash.slice(-8)} ↗
                                                                            </a>
                                                                        ) : (
                                                                            <span style={{ color: '#555', fontSize: '0.7rem', fontStyle: 'italic' }}>
                                                                                Đang cập nhật...
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            );
                                        })}
                                </div>

                                {/* Pagination Controls */}
                                {attackHistory.length > ITEMS_PER_PAGE && (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginTop: '12px',
                                        padding: '8px 0',
                                    }}>
                                        <button
                                            onClick={() => setActivityPage(p => Math.max(0, p - 1))}
                                            disabled={activityPage === 0}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '9999px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: activityPage === 0 ? 'transparent' : 'rgba(255, 107, 53, 0.15)',
                                                color: activityPage === 0 ? '#444' : '#ff6b35',
                                                cursor: activityPage === 0 ? 'not-allowed' : 'pointer',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            ← Prev
                                        </button>

                                        <span style={{
                                            fontSize: '0.72rem',
                                            color: '#888',
                                            fontWeight: 500,
                                        }}>
                                            {activityPage + 1} / {Math.ceil(attackHistory.length / ITEMS_PER_PAGE)}
                                        </span>

                                        <button
                                            onClick={() => setActivityPage(p => Math.min(Math.ceil(attackHistory.length / ITEMS_PER_PAGE) - 1, p + 1))}
                                            disabled={(activityPage + 1) * ITEMS_PER_PAGE >= attackHistory.length}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '9999px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: (activityPage + 1) * ITEMS_PER_PAGE >= attackHistory.length ? 'transparent' : 'rgba(255, 107, 53, 0.15)',
                                                color: (activityPage + 1) * ITEMS_PER_PAGE >= attackHistory.length ? '#444' : '#ff6b35',
                                                cursor: (activityPage + 1) * ITEMS_PER_PAGE >= attackHistory.length ? 'not-allowed' : 'pointer',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            Next →
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                ) : (
                    /* ===== TAB 1: Round History ===== */
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Round Search */}
                        <style>{`
                            .rip-round-search::-webkit-outer-spin-button,
                            .rip-round-search::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                            .rip-round-search[type=number] { -moz-appearance: textbox; }
                        `}</style>
                        <div style={{ marginBottom: '12px', position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#6b7280', pointerEvents: 'none' }}>🔍</div>
                            <input
                                type="number"
                                className="rip-round-search"
                                value={roundSearch}
                                onChange={(e) => {
                                    setRoundSearch(e.target.value);
                                    if (!e.target.value.trim()) {
                                        setSearchedRound(null);
                                        setSearchError('');
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSearchRound();
                                    }
                                }}
                                placeholder={tAny.vhSearchRound || 'Enter round number, press Enter'}
                                style={{
                                    width: '100%', padding: '7px 60px 7px 32px', borderRadius: '999px',
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#e5e7eb', fontSize: '0.7rem', outline: 'none',
                                    boxSizing: 'border-box', transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                            />
                            {/* Search / Clear buttons */}
                            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                                {roundSearch && (
                                    <button
                                        onClick={() => { setRoundSearch(''); setSearchedRound(null); setSearchError(''); }}
                                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', color: '#9ca3af', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                    >✕</button>
                                )}
                                <button
                                    onClick={handleSearchRound}
                                    disabled={isSearching || !roundSearch.trim()}
                                    style={{
                                        background: roundSearch.trim() ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(251,191,36,0.3)',
                                        borderRadius: '999px', padding: '2px 8px', cursor: roundSearch.trim() ? 'pointer' : 'default',
                                        color: roundSearch.trim() ? '#fbbf24' : '#6b7280', fontSize: '10px', fontWeight: 600,
                                        transition: 'all 0.2s',
                                    }}
                                >{isSearching ? '⏳' : 'OK'}</button>
                            </div>
                        </div>

                        {/* Search Error Message */}
                        {searchError && (
                            <div style={{
                                textAlign: 'center', padding: '8px 12px', marginBottom: '8px',
                                borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.75rem'
                            }}>
                                ⚠️ {searchError}
                            </div>
                        )}

                        {/* Searched Round Result label */}
                        {searchedRound && (
                            <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🔍 {tAny.vhSearchResult || 'Search Result'} — {t.roundLabel ? t.roundLabel(searchedRound.roundId) : `Round #${searchedRound.roundId}`}
                            </div>
                        )}

                        {/* Past Rounds List */}
                        {pastRounds.length === 0 && !searchedRound ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '32px',
                                color: '#666',
                                fontSize: '0.85rem',
                            }}>
                                {noActivityLabel}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '6px' : '10px' }}>
                                <AnimatePresence>
                                    {displayPastRounds.map((round, index) => (
                                        <motion.div
                                            key={round.roundId}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="round-item"
                                            style={{
                                                background: round.ended
                                                    ? (round.isTimeout || round.rolloverAmount)
                                                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(0, 0, 0, 0.3))'
                                                        : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(0, 0, 0, 0.3))'
                                                    : 'rgba(255, 255, 255, 0.03)',
                                                border: searchedRound && round.roundId === searchedRound.roundId
                                                    ? '1.5px solid rgba(251, 191, 36, 0.5)'
                                                    : `1px solid ${round.ended
                                                        ? (round.isTimeout || round.rolloverAmount)
                                                            ? 'rgba(239, 68, 68, 0.3)'
                                                            : 'rgba(34, 197, 94, 0.3)'
                                                        : 'rgba(255, 255, 255, 0.1)'}`,
                                                borderRadius: compact ? '8px' : '12px',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => setExpandedRound(expandedRound === round.roundId ? null : round.roundId)}
                                        >
                                            {/* Round Header */}
                                            <div style={{
                                                padding: compact ? '8px 10px' : '12px 14px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '6px' : '10px' }}>
                                                    <span style={{
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        padding: compact ? '2px 6px' : '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: compact ? '0.68rem' : '0.8rem',
                                                        fontWeight: 700,
                                                    }}>
                                                        #{round.roundId}
                                                    </span>
                                                    <span style={{
                                                        color: round.ended
                                                            ? (round.totalAttacks === 0 ? '#888'
                                                                : (round.isTimeout || round.rolloverAmount) ? '#ef4444'
                                                                    : '#22c55e')
                                                            : '#fbbf24',
                                                        fontSize: compact ? '0.6rem' : '0.7rem',
                                                        fontWeight: 600,
                                                    }}>
                                                        {round.ended
                                                            ? (round.totalAttacks === 0
                                                                ? `⭕ ${tAny.noParticipants || 'No Participants'}`
                                                                : (round.isTimeout || round.rolloverAmount)
                                                                    ? `🔄 ${tAny.rolledOverLabel || 'Rolled Over'}`
                                                                    : `✅ ${t.endedLabel}`)
                                                            : `🎮 ${t.activeLabel}`}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ color: '#888', fontSize: compact ? '0.65rem' : '0.8rem' }}>
                                                        {round.totalAttacks} {t.attacksLabel}
                                                    </span>
                                                    <span style={{
                                                        color: '#666',
                                                        fontSize: '0.7rem',
                                                        transform: expandedRound === round.roundId ? 'rotate(180deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.2s',
                                                    }}>
                                                        ▼
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Last Attacker / Winner / Timeout quick view */}
                                            {round.ended && (round.isTimeout || round.rolloverAmount) ? (
                                                <div style={{
                                                    padding: compact ? '0 10px 8px' : '0 14px 12px',
                                                    fontSize: compact ? '0.6rem' : '0.7rem',
                                                    color: '#ef4444',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: compact ? '4px' : '6px',
                                                }}>
                                                    🔄
                                                    <span>{tAny.noWinnerRollover || 'No winner — Jackpot rolled to next round'}</span>
                                                </div>
                                            ) : round.lastAttacker && round.lastAttacker !== "0x0000000000000000000000000000000000000000" && (
                                                <div style={{
                                                    padding: compact ? '0 10px 8px' : '0 14px 12px',
                                                    fontSize: compact ? '0.6rem' : '0.7rem',
                                                    color: round.ended ? '#ffd700' : '#888',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: compact ? '4px' : '6px',
                                                }}>
                                                    {round.ended ? '🏆' : '🎯'}
                                                    <span style={{ color: '#888' }}>
                                                        {round.ended ? `${t.winnerLabel}:` : `${t.lastAttackLabel}:`}
                                                    </span>
                                                    {renderAddressLink(round.lastAttacker, {
                                                        color: round.ended ? '#ffd700' : '#fff',
                                                        fontWeight: round.ended ? 600 : 400,
                                                    })}
                                                    {round.ended && round.txHash && (
                                                        <a
                                                            href={`https://web3.okx.com/explorer/x-layer/tx/${round.txHash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                background: 'rgba(34, 211, 238, 0.15)',
                                                                color: '#22d3ee',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.6rem',
                                                                textDecoration: 'none',
                                                                marginLeft: '4px',
                                                            }}
                                                        >
                                                            TX ↗
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {/* Expanded Details */}
                                            <AnimatePresence>
                                                {expandedRound === round.roundId && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        style={{
                                                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                                            padding: compact ? '8px' : '14px',
                                                            background: 'rgba(0, 0, 0, 0.2)',
                                                        }}
                                                    >
                                                        {/* Round Details */}
                                                        <div style={{ marginBottom: compact ? '8px' : '14px' }}>
                                                            <h4 style={{
                                                                color: '#888',
                                                                fontSize: compact ? '0.6rem' : '0.7rem',
                                                                marginBottom: compact ? '6px' : '10px',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.5px',
                                                            }}>
                                                                📊 {roundDetailsLabel}
                                                            </h4>
                                                            <div style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: 'repeat(2, 1fr)',
                                                                gap: compact ? '3px' : '6px',
                                                                fontSize: compact ? '0.6rem' : '0.7rem',
                                                            }}>
                                                                <div style={{ color: '#666' }}>{t.softDeadlineLabel}:</div>
                                                                <div style={{ color: '#fff' }}>{formatTimestamp(round.softDeadline)}</div>
                                                                <div style={{ color: '#666' }}>{t.hardDeadlineLabel}:</div>
                                                                <div style={{ color: '#fff' }}>{formatTimestamp(round.hardDeadline)}</div>
                                                                <div style={{ color: '#666' }}>{t.totalAttacksLabel}:</div>
                                                                <div style={{ color: '#ffd700' }}>{round.totalAttacks}</div>
                                                            </div>
                                                        </div>

                                                        {/* Winner Info / Timeout Rollover */}
                                                        {(round.isTimeout || round.rolloverAmount) ? (
                                                            <div style={{
                                                                background: 'rgba(239, 68, 68, 0.1)',
                                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                borderRadius: compact ? '8px' : '10px',
                                                                padding: compact ? '10px' : '14px',
                                                                textAlign: 'center',
                                                                marginBottom: compact ? '8px' : '14px',
                                                            }}>
                                                                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏰</div>
                                                                <div style={{ color: '#ef4444', fontWeight: 700, fontSize: compact ? '0.75rem' : '0.9rem', marginBottom: '4px' }}>
                                                                    {tAny.claimExpiredTitle || 'Claim Expired'}
                                                                </div>
                                                                <div style={{ color: '#888', fontSize: compact ? '0.6rem' : '0.7rem' }}>
                                                                    {tAny.jackpotRolledToNextRound ? tAny.jackpotRolledToNextRound(round.rolloverAmount || round.prize || '?') : `🔄 Entire Jackpot (${round.rolloverAmount || round.prize || '?'} $BANMAO) rolled to next round`}
                                                                </div>
                                                            </div>
                                                        ) : round.winner && round.winner !== "0x0000000000000000000000000000000000000000" && (
                                                            <div style={{
                                                                background: 'rgba(255, 215, 0, 0.1)',
                                                                border: '1px solid rgba(255, 215, 0, 0.3)',
                                                                borderRadius: compact ? '8px' : '10px',
                                                                padding: compact ? '6px' : '10px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: compact ? '6px' : '10px',
                                                                marginBottom: compact ? '8px' : '14px',
                                                            }}>
                                                                <div style={{ flexShrink: 0 }}>
                                                                    <AnimatedFrameSprite
                                                                        type="winner"
                                                                        width={compact ? 30 : 45}
                                                                        height={compact ? 30 : 45}
                                                                        glowColor="gold"
                                                                    />
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                        marginBottom: '4px',
                                                                    }}>
                                                                        <span style={{ color: '#ffd700', fontWeight: 600, fontSize: compact ? '0.65rem' : '0.8rem' }}>
                                                                            🏆 {renderAddressLink(round.winner || '', { color: '#ffd700', fontWeight: 600, fontSize: compact ? '0.65rem' : '0.8rem' })}
                                                                        </span>
                                                                        <span style={{
                                                                            background: round.winType === 'SOFT_WIN'
                                                                                ? 'rgba(34, 211, 238, 0.2)'
                                                                                : 'rgba(168, 85, 247, 0.2)',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '6px',
                                                                            fontSize: '0.65rem',
                                                                            fontWeight: 600,
                                                                            color: round.winType === 'SOFT_WIN'
                                                                                ? '#22d3ee'
                                                                                : '#a855f7',
                                                                        }}>
                                                                            {round.winType === 'SOFT_WIN'
                                                                                ? tAny.softWinLabel
                                                                                : round.winType === 'HARD_WIN'
                                                                                    ? tAny.hardWinLabel
                                                                                    : round.winType}
                                                                        </span>
                                                                    </div>
                                                                    {/* Prize amount */}
                                                                    {round.prize && (() => {
                                                                        const prizeNum = Number(String(round.prize).replace(/[^0-9.]/g, ''));
                                                                        const isHardWin = round.winType === 'HARD_WIN';
                                                                        // RoundFinalized.amount = distributable pool (already post-30% seed deduction for HARD_WIN)
                                                                        // Contract: winner = pool * 75%, top10 = pool * 25%
                                                                        const actualWinnerPayout = prizeNum * 0.75;
                                                                        return (
                                                                            <div style={{ marginBottom: '4px' }}>
                                                                                <div style={{
                                                                                    color: '#22c55e',
                                                                                    fontSize: compact ? '0.7rem' : '0.85rem',
                                                                                    fontWeight: 700,
                                                                                }}>
                                                                                    {tAny.prizeWonAmount ? tAny.prizeWonAmount(actualWinnerPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })) : `🏆 Won ${actualWinnerPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })} $BANMAO`}
                                                                                </div>
                                                                                <div style={{
                                                                                    color: '#888',
                                                                                    fontSize: '0.6rem',
                                                                                }}>
                                                                                    {tAny.jackpotPoolTotal || 'Jackpot Pool'}: {prizeNum.toLocaleString()} · {isHardWin ? (tAny.winnerSharePct || 'Winner') + ' 75%' : (tAny.winnerSharePct || 'Winner') + ' 75%'}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center',
                                                                    }}>
                                                                        <span style={{ color: '#888', fontSize: '0.65rem' }}>
                                                                            {round.txHash ? '' : ''}
                                                                        </span>
                                                                        {round.txHash && (
                                                                            <a
                                                                                href={`https://web3.okx.com/explorer/x-layer/tx/${round.txHash}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                style={{
                                                                                    color: '#22d3ee',
                                                                                    fontSize: '0.65rem',
                                                                                    textDecoration: 'none',
                                                                                }}
                                                                            >
                                                                                View TX ↗
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Timeout / Rollover Explanation */}
                                                        {round.ended && round.isTimeout && (
                                                            <div style={{
                                                                background: 'rgba(239, 68, 68, 0.08)',
                                                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                                                borderRadius: '10px',
                                                                padding: '10px 12px',
                                                                marginBottom: '14px',
                                                            }}>
                                                                <div style={{
                                                                    color: '#ef4444',
                                                                    fontWeight: 600,
                                                                    fontSize: '0.75rem',
                                                                    marginBottom: '6px',
                                                                }}>
                                                                    {tAny.timeoutWinLabel || '⏰ Timeout'}
                                                                </div>
                                                                <div style={{
                                                                    color: '#999',
                                                                    fontSize: '0.7rem',
                                                                    lineHeight: '1.5',
                                                                }}>
                                                                    {tAny.noWinnerTimeout || 'No one claimed the prize within the time limit. The prize pool has been rolled over to the next round.'}
                                                                </div>
                                                                {round.rolloverAmount && (
                                                                    <div style={{
                                                                        color: '#fbbf24',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        marginTop: '6px',
                                                                    }}>
                                                                        {tAny.rolloverExplanation ? tAny.rolloverExplanation(round.rolloverAmount) : `💸 ${round.rolloverAmount} $BANMAO rolled over to next round`}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Rollover Info for non-timeout but with rollover */}
                                                        {round.ended && !round.isTimeout && round.rolloverAmount && (
                                                            <div style={{
                                                                background: 'rgba(251, 191, 36, 0.08)',
                                                                border: '1px solid rgba(251, 191, 36, 0.25)',
                                                                borderRadius: '10px',
                                                                padding: '8px 12px',
                                                                marginBottom: '14px',
                                                            }}>
                                                                <div style={{
                                                                    color: '#fbbf24',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                }}>
                                                                    {tAny.rolloverExplanation ? tAny.rolloverExplanation(round.rolloverAmount) : `💸 ${round.rolloverAmount} $BANMAO rolled over to next round`}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* === UNIFIED PRIZE INFO SECTION === */}
                                                        {round.totalAttacks > 0 && (() => {
                                                            const historyGiftCost = round.attackCostHuman || attackCostRef.current || (Number(DEFAULT_ATTACK_COST) / 1e18);
                                                            const giftTotal = round.totalAttacks * historyGiftCost;
                                                            const jackpotFromGifts = Math.round(giftTotal * V11_FUND_DISTRIBUTION.JACKPOT / 100);
                                                            const dividendsFromGifts = Math.round(giftTotal * V11_FUND_DISTRIBUTION.DIVIDENDS / 100);
                                                            const seedFromGifts = Math.round(giftTotal * V11_FUND_DISTRIBUTION.SEED_FUND / 100);
                                                            const stakingFromGifts = Math.round(giftTotal * V11_FUND_DISTRIBUTION.STAKING / 100);
                                                            const burnFromGifts = Math.round(giftTotal * V11_FUND_DISTRIBUTION.BURN / 100);
                                                            const inheritedPool = round.jackpotStart != null && round.jackpotStart > 0 ? Math.round(round.jackpotStart) : 0;
                                                            const totalPool = inheritedPool + jackpotFromGifts;

                                                            return (
                                                                <div style={{
                                                                    background: 'rgba(34, 211, 238, 0.04)',
                                                                    border: '1px solid rgba(34, 211, 238, 0.15)',
                                                                    borderRadius: '10px',
                                                                    padding: '12px',
                                                                    marginBottom: '14px',
                                                                }}>
                                                                    {/* Section Title */}
                                                                    <div style={{
                                                                        fontSize: '0.7rem',
                                                                        color: '#22d3ee',
                                                                        marginBottom: '10px',
                                                                        fontWeight: 700,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                    }}>
                                                                        📊 {tAny.giftAllocationTitle || 'Gift Allocation'}
                                                                    </div>

                                                                    {/* Total Pool Summary */}
                                                                    {inheritedPool > 0 && (
                                                                        <div style={{
                                                                            background: 'rgba(255, 215, 0, 0.08)',
                                                                            border: '1px solid rgba(255, 215, 0, 0.2)',
                                                                            borderRadius: '8px',
                                                                            padding: '8px 10px',
                                                                            marginBottom: '10px',
                                                                            fontSize: '0.62rem',
                                                                        }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                                <span style={{ color: '#fbbf24' }}>💰 {tAny.inheritedPoolLabel || 'Inherited Pool'}</span>
                                                                                <span style={{ color: '#fbbf24', fontWeight: 600 }}>{inheritedPool.toLocaleString()}</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                                <span style={{ color: '#94a3b8' }}>🎁 {tAny.giftContribLabel || 'Gift Contributions'} ({round.totalAttacks} × {historyGiftCost.toLocaleString()} × {V11_FUND_DISTRIBUTION.JACKPOT}%)</span>
                                                                                <span style={{ color: '#94a3b8', fontWeight: 600 }}>+{jackpotFromGifts.toLocaleString()}</span>
                                                                            </div>
                                                                            <div style={{ borderTop: '1px solid rgba(255, 215, 0, 0.2)', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                                                                <span style={{ color: '#ffd700', fontWeight: 700 }}>🏆 {tAny.totalJackpotLabel || 'Total Jackpot Pool'}</span>
                                                                                <span style={{ color: '#ffd700', fontWeight: 700 }}>{totalPool.toLocaleString()} $BANMAO</span>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Gift Distribution Grid */}
                                                                    <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginBottom: '6px' }}>
                                                                        {tAny.perGiftBreakdown || 'Per-gift breakdown'}: {round.totalAttacks} × {historyGiftCost.toLocaleString()} = {giftTotal.toLocaleString()} $BANMAO
                                                                    </div>
                                                                    <div style={{
                                                                        display: 'grid',
                                                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                                                        gap: '4px',
                                                                        fontSize: '0.6rem',
                                                                    }}>
                                                                        {/* Jackpot — includes inherited pool */}
                                                                        <div style={{
                                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                            padding: '5px 8px', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '5px',
                                                                        }}>
                                                                            <div>
                                                                                <span>🏆 {tAny.distJackpotLabel || 'Jackpot'} ({V11_FUND_DISTRIBUTION.JACKPOT}%)</span>
                                                                                {inheritedPool > 0 && (
                                                                                    <div style={{ fontSize: '0.5rem', color: '#fbbf24', marginTop: '1px' }}>
                                                                                        💰 {tAny.inheritedPoolLabel || 'Inherited Pool'}: +{inheritedPool.toLocaleString()}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div style={{ textAlign: 'right' }}>
                                                                                <span style={{ color: '#ffd700', fontWeight: 700 }}>{totalPool.toLocaleString()}</span>
                                                                                {inheritedPool > 0 && (
                                                                                    <div style={{ fontSize: '0.48rem', color: '#94a3b8' }}>
                                                                                        {tAny.giftContribLabel || 'Gifts'}: +{jackpotFromGifts.toLocaleString()}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {/* Other distribution items */}
                                                                        {[
                                                                            { icon: '👥', label: tAny.distDividendLabel || 'Dividends', pct: V11_FUND_DISTRIBUTION.DIVIDENDS, amount: dividendsFromGifts, color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.08)' },
                                                                            { icon: '🌱', label: tAny.distSeedLabel || 'Next Round', pct: V11_FUND_DISTRIBUTION.SEED_FUND, amount: seedFromGifts, color: '#4ade80', bg: 'rgba(74, 222, 128, 0.08)' },
                                                                            { icon: '💎', label: tAny.distStakingLabel || 'Staking', pct: V11_FUND_DISTRIBUTION.STAKING, amount: stakingFromGifts, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.08)' },
                                                                            { icon: '🔥', label: tAny.distBurnLabel || 'Burn', pct: V11_FUND_DISTRIBUTION.BURN, amount: burnFromGifts, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)' },
                                                                        ].map((item, i) => (
                                                                            <div key={i} style={{
                                                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                                padding: '4px 8px', background: item.bg, borderRadius: '5px',
                                                                                ...(i === 3 ? { gridColumn: 'span 2' } : {}),
                                                                            }}>
                                                                                <span>{item.icon} {item.label} ({item.pct}%)</span>
                                                                                <span style={{ color: item.color, fontWeight: 600 }}>+{item.amount.toLocaleString()}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* === PRIZE DISTRIBUTION (Won rounds only) === */}
                                                        {round.ended && round.prize && !round.isTimeout && (() => {
                                                            const prizeNum = Number(String(round.prize).replace(/[^0-9.]/g, ''));
                                                            const isHardWin = round.winType === 'HARD_WIN';
                                                            // Contract: RoundFinalized.amount = distributable pool (post-30% deduction for HARD_WIN)
                                                            const seedToNext = isHardWin ? Math.round(prizeNum * 30 / 70) : 0;
                                                            const fullPool = isHardWin ? prizeNum + seedToNext : prizeNum;
                                                            const winnerAmount = Math.round(prizeNum * 0.75);
                                                            const top10Amount = Math.round(prizeNum * 0.25);

                                                            return (
                                                                <div style={{
                                                                    background: isHardWin ? 'rgba(239, 68, 68, 0.06)' : 'rgba(168, 85, 247, 0.06)',
                                                                    border: `1px solid ${isHardWin ? 'rgba(239, 68, 68, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`,
                                                                    borderRadius: '10px',
                                                                    padding: '12px',
                                                                    marginBottom: '14px',
                                                                }}>
                                                                    {/* Section Title */}
                                                                    <div style={{
                                                                        fontSize: '0.7rem',
                                                                        color: isHardWin ? '#ef4444' : '#a855f7',
                                                                        marginBottom: '10px',
                                                                        fontWeight: 700,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                    }}>
                                                                        💎 {prizeDistributionLabel} ({isHardWin
                                                                            ? tAny.hardWinLabel || '⚡ Hard Win'
                                                                            : tAny.softWinLabel || '⏳ Soft Win'})
                                                                    </div>

                                                                    {/* Full Pool + Seed Deduction (HARD_WIN only) */}
                                                                    {isHardWin && (
                                                                        <div style={{
                                                                            background: 'rgba(74, 222, 128, 0.08)',
                                                                            border: '1px solid rgba(74, 222, 128, 0.15)',
                                                                            borderRadius: '6px',
                                                                            padding: '8px 10px',
                                                                            marginBottom: '8px',
                                                                            fontSize: '0.62rem',
                                                                        }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                                                <span style={{ color: '#94a3b8' }}>{tAny.totalJackpotLabel || 'Total Jackpot Pool'}</span>
                                                                                <span style={{ color: '#94a3b8' }}>{fullPool.toLocaleString()}</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                                                <span style={{ color: '#4ade80' }}>🌱 {tAny.seedToNextRound || 'Seed → Next Round (30%)'}</span>
                                                                                <span style={{ color: '#4ade80', fontWeight: 600 }}>−{seedToNext.toLocaleString()}</span>
                                                                            </div>
                                                                            <div style={{ borderTop: '1px solid rgba(74, 222, 128, 0.2)', paddingTop: '3px', display: 'flex', justifyContent: 'space-between' }}>
                                                                                <span style={{ color: '#ffd700', fontWeight: 600 }}>→ {tAny.distribPoolLabel || 'Distributable'}</span>
                                                                                <span style={{ color: '#ffd700', fontWeight: 600 }}>{prizeNum.toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Winner + Top 10 rows */}
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.65rem' }}>
                                                                        {/* Winner */}
                                                                        <div style={{
                                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                            padding: '6px 10px', background: 'rgba(255, 215, 0, 0.1)',
                                                                            borderRadius: '6px', border: '1px solid rgba(255, 215, 0, 0.15)',
                                                                        }}>
                                                                            <span style={{ fontWeight: 600 }}>👑 {t.winner} (75%)</span>
                                                                            <span style={{ color: '#ffd700', fontWeight: 700, fontSize: '0.72rem' }}>
                                                                                {winnerAmount.toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                        {/* Top 10 */}
                                                                        <div style={{
                                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                            padding: '6px 10px', background: 'rgba(34, 211, 238, 0.08)',
                                                                            borderRadius: '6px', border: '1px solid rgba(34, 211, 238, 0.12)',
                                                                        }}>
                                                                            <span style={{ fontWeight: 600 }}>🏆 Top 10 (25%)</span>
                                                                            <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: '0.72rem' }}>
                                                                                {top10Amount.toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Min gifts warning */}
                                                                    <div style={{
                                                                        color: '#888',
                                                                        fontSize: '0.55rem',
                                                                        marginTop: '8px',
                                                                        fontStyle: 'italic',
                                                                        lineHeight: 1.4,
                                                                    }}>
                                                                        {tAny.minGiftsWarning || '⚠ Need ≥ 10 gifts for full reward. Under 10 → only 50%'}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Rollover Info */}
                                                        {(round.rolloverAmount ||
                                                            (round.ended && round.totalAttacks === 0) ||
                                                            (round.ended && round.winType === 'NO_WINNER')) && (
                                                                <div style={{
                                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                    borderRadius: '8px',
                                                                    padding: '10px',
                                                                    marginBottom: '14px',
                                                                }}>
                                                                    <div style={{
                                                                        fontSize: '0.65rem',
                                                                        color: '#ef4444',
                                                                        marginBottom: '6px',
                                                                        fontWeight: 600,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                    }}>
                                                                        ⚠️ {round.totalAttacks === 0 ? (tAny.noParticipants || 'No Participants') : (tAny.prizesRolledOver || 'Prizes Rolled Over')}
                                                                    </div>
                                                                    <div style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        gap: '4px',
                                                                        fontSize: '0.65rem',
                                                                    }}>
                                                                        {round.rolloverAmount && (
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                <span style={{ color: '#888' }}>{tAny.amountLabel || 'Amount'}:</span>
                                                                                <span style={{ color: '#fbbf24', fontWeight: 600 }}>{round.rolloverAmount} $BANMAO</span>
                                                                            </div>
                                                                        )}
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                            <span style={{ color: '#888' }}>{tAny.statusLabel || 'Status'}:</span>
                                                                            <span style={{ color: '#ef4444' }}>
                                                                                {round.totalAttacks === 0
                                                                                    ? (tAny.noAttacksInRound || 'No attacks in this round')
                                                                                    : (round.rolloverReason || round.winType || tAny.unclaimedTimeout || 'Unclaimed / Timeout')}
                                                                            </span>
                                                                        </div>
                                                                        <div style={{
                                                                            marginTop: '6px',
                                                                            padding: '6px',
                                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                                            borderRadius: '5px',
                                                                            color: '#888',
                                                                            fontSize: '0.6rem',
                                                                            lineHeight: 1.4,
                                                                        }}>
                                                                            💡 {round.totalAttacks === 0
                                                                                ? (tAny.jackpotPreservedNextRound || 'Jackpot was preserved for the next round')
                                                                                : (tAny.amountAddedToNextRound || 'This amount has been added to the next round\'s jackpot pool')}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                        {/* Top Attackers for this round - with reward amounts */}
                                                        {round.topAttackers && round.topAttackers.length > 0 && (() => {
                                                            // Calculate top attacker reward pool
                                                            // RoundFinalized.amount = distributable pool (already post-30% seed for HARD_WIN)
                                                            const prizeNum = round.prize ? Number(String(round.prize).replace(/[^0-9.]/g, '')) : 0;
                                                            // prizeNum IS the distributable pool, no need to multiply by 0.70 again
                                                            const top10Pool = prizeNum * 0.25;

                                                            // Calculate total qualified attacks (≥10 attacks)
                                                            const qualifiedAttackers = round.topAttackers!.filter(a => Number(a.attacks) >= 10);
                                                            const totalQualifiedAttacks = qualifiedAttackers.reduce((sum, a) => sum + Number(a.attacks), 0);

                                                            return (
                                                                <div>
                                                                    <h4 style={{
                                                                        color: '#888',
                                                                        fontSize: '0.7rem',
                                                                        marginBottom: '4px',
                                                                        textTransform: 'uppercase',
                                                                        letterSpacing: '0.5px',
                                                                    }}>
                                                                        🏅 {topAttackersLabel}
                                                                    </h4>
                                                                    {top10Pool > 0 && (
                                                                        <div style={{
                                                                            fontSize: '0.6rem',
                                                                            color: '#22d3ee',
                                                                            marginBottom: '8px',
                                                                            fontStyle: 'italic',
                                                                        }}>
                                                                            {tAny.top10PoolInfo ? tAny.top10PoolInfo(top10Pool.toLocaleString(undefined, { maximumFractionDigits: 0 })) : `Pool: ${top10Pool.toLocaleString(undefined, { maximumFractionDigits: 0 })} $BANMAO`}
                                                                        </div>
                                                                    )}
                                                                    {/* Collapsible Reward Calculation Detail */}
                                                                    {top10Pool > 0 && (() => {
                                                                        const qualCount = qualifiedAttackers.length;
                                                                        const totalCount = round.topAttackers!.length;
                                                                        return (
                                                                            <details
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                style={{
                                                                                    marginBottom: '8px',
                                                                                    background: 'rgba(34, 211, 238, 0.05)',
                                                                                    borderRadius: '6px',
                                                                                    border: '1px solid rgba(34, 211, 238, 0.15)',
                                                                                    overflow: 'hidden',
                                                                                }}>
                                                                                <summary style={{
                                                                                    cursor: 'pointer',
                                                                                    fontSize: '0.6rem',
                                                                                    color: '#22d3ee',
                                                                                    padding: '6px 10px',
                                                                                    fontWeight: 600,
                                                                                    listStyle: 'none',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '4px',
                                                                                    userSelect: 'none',
                                                                                }}>
                                                                                    <span style={{ transition: 'transform 0.2s' }}>▶</span>
                                                                                    {tAny.top10CalcTitle || '📐 Top 10 Reward Breakdown'}
                                                                                </summary>
                                                                                <div style={{
                                                                                    padding: '6px 10px 10px',
                                                                                    fontSize: '0.58rem',
                                                                                    color: '#aaa',
                                                                                    display: 'flex',
                                                                                    flexDirection: 'column',
                                                                                    gap: '4px',
                                                                                    lineHeight: 1.5,
                                                                                }}>
                                                                                    <div>{tAny.top10CalcPool ? tAny.top10CalcPool(top10Pool.toLocaleString(undefined, { maximumFractionDigits: 0 })) : `🏆 Top 10 Pool: ${top10Pool.toLocaleString(undefined, { maximumFractionDigits: 0 })} $BANMAO`}</div>
                                                                                    <div>{tAny.top10CalcMinAttacks ? tAny.top10CalcMinAttacks(10) : '⚠️ Min 10 feeds to qualify'}</div>
                                                                                    <div>{tAny.top10CalcQualified ? tAny.top10CalcQualified(qualCount, totalCount) : `✅ ${qualCount}/${totalCount} players qualified`}</div>
                                                                                    {totalQualifiedAttacks > 0 && (
                                                                                        <div>{tAny.top10CalcTotalQualified ? tAny.top10CalcTotalQualified(totalQualifiedAttacks.toLocaleString()) : `Total qualified feeds: ${totalQualifiedAttacks.toLocaleString()}`}</div>
                                                                                    )}
                                                                                    <div style={{ color: '#22d3ee', fontWeight: 600, marginTop: '2px' }}>
                                                                                        {tAny.top10CalcFormula || '📊 Formula: (Your feeds ÷ Total qualified) × Top 10 Pool'}
                                                                                    </div>
                                                                                    {/* Per-player reward breakdown */}
                                                                                    {qualifiedAttackers.length > 0 && (
                                                                                        <div style={{
                                                                                            marginTop: '4px',
                                                                                            padding: '4px 6px',
                                                                                            background: 'rgba(34, 197, 94, 0.05)',
                                                                                            borderRadius: '4px',
                                                                                            display: 'flex',
                                                                                            flexDirection: 'column',
                                                                                            gap: '2px',
                                                                                        }}>
                                                                                            {qualifiedAttackers.map((a, i) => {
                                                                                                const aAttacks = Number(a.attacks);
                                                                                                const share = (aAttacks / totalQualifiedAttacks) * top10Pool;
                                                                                                return (
                                                                                                    <div key={a.addr} style={{ color: '#22c55e', fontSize: '0.55rem' }}>
                                                                                                        {tAny.top10CalcYourShare
                                                                                                            ? tAny.top10CalcYourShare(
                                                                                                                aAttacks.toString(),
                                                                                                                totalQualifiedAttacks.toLocaleString(),
                                                                                                                share.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                                                                                            )
                                                                                                            : `${aAttacks} ÷ ${totalQualifiedAttacks.toLocaleString()} × Pool = ~${share.toLocaleString(undefined, { maximumFractionDigits: 0 })} $BANMAO`}
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </details>
                                                                        );
                                                                    })()}
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                                        {round.topAttackers!.map((attacker, idx) => {
                                                                            const attacks = Number(attacker.attacks);
                                                                            const isQualified = attacks >= 10;
                                                                            const rewardShare = isQualified && totalQualifiedAttacks > 0
                                                                                ? (attacks / totalQualifiedAttacks) * top10Pool
                                                                                : 0;
                                                                            return (
                                                                                <div
                                                                                    key={attacker.addr}
                                                                                    style={{
                                                                                        display: 'flex',
                                                                                        justifyContent: 'space-between',
                                                                                        alignItems: 'center',
                                                                                        padding: '6px 10px',
                                                                                        background: idx === 0
                                                                                            ? 'rgba(255, 215, 0, 0.1)'
                                                                                            : idx === 1
                                                                                                ? 'rgba(192, 192, 192, 0.1)'
                                                                                                : idx === 2
                                                                                                    ? 'rgba(205, 127, 50, 0.1)'
                                                                                                    : 'rgba(255, 255, 255, 0.02)',
                                                                                        borderRadius: '5px',
                                                                                        fontSize: '0.7rem',
                                                                                        opacity: isQualified ? 1 : 0.5,
                                                                                    }}
                                                                                >
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                        <span style={{
                                                                                            width: '20px',
                                                                                            textAlign: 'center',
                                                                                            color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#666',
                                                                                        }}>
                                                                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                                                                        </span>
                                                                                        <span style={{ color: '#fff' }}>{renderAddressLink(attacker.addr, { color: '#fff', fontWeight: 400 })}</span>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                                                                                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                                                                                            {attacks} {t.attacksLabel}
                                                                                        </span>
                                                                                        {rewardShare > 0 ? (
                                                                                            <span style={{ color: '#22c55e', fontSize: '0.6rem', fontWeight: 600 }}>
                                                                                                ~{rewardShare.toLocaleString(undefined, { maximumFractionDigits: 0 })} $BANMAO 🎁
                                                                                            </span>
                                                                                        ) : !isQualified ? (
                                                                                            <span style={{ color: '#ef4444', fontSize: '0.55rem' }}>
                                                                                                {tAny.notQualified || '< 10 gifts ❌'}
                                                                                            </span>
                                                                                        ) : null}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Loading state for top attackers */}
                                                        {!round.topAttackers && round.ended && (
                                                            <div style={{
                                                                textAlign: 'center',
                                                                padding: '12px',
                                                                color: '#666',
                                                                fontSize: '0.7rem',
                                                            }}>
                                                                {t.loadingTopAttackers}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {/* Show More/Less */}
                                {pastRounds.length > 5 && (
                                    <motion.button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            width: '100%',
                                            marginTop: '10px',
                                            padding: '10px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '10px',
                                            color: '#888',
                                            fontSize: '0.8rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        {isExpanded ? '▲ Show Less' : `▼ Show More (${pastRounds.length - 5} more)`}
                                    </motion.button>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
