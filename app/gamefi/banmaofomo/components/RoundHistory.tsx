/**
 * RoundHistory Component - Enhanced with Expandable Details & Live Activity
 * Displays past rounds with winners, top attackers, and real-time attack feed
 */
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { BANMAOFOMO_ADDRESS, V11_FUND_DISTRIBUTION, V11_DISTRIBUTION, DEFAULT_ATTACK_COST } from "../lib/constants";
import { BANMAOFOMO_ABI } from "../lib/abis";
import { BANMAOFOMO_V11_ABI } from "../lib/abis-v11";
import { LocaleStrings } from "../lib/i18n/types";
import AnimatedFrameSprite from "./AnimatedFrameSprite";

/** Gift cost in human-readable units (e.g. 2000). Derived from the contract default. */
const HISTORY_GIFT_COST = Number(DEFAULT_ATTACK_COST) / 1e18;

interface RoundHistoryProps {
    currentRound: bigint;
    t: LocaleStrings;
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
    // Enhanced tracking
    claimed?: boolean;
    claimAmount?: string;
    rolloverAmount?: string;
    rolloverReason?: string;
    isTimeout?: boolean;
    // Actual jackpot data from events
    jackpotStart?: number;    // From RoundStarted event
    actualJackpot?: number;   // From RoundFinalized event (amount)
}

interface LiveAttack {
    id: string;
    player: string;
    count: number;
    jackpot: bigint;
    newHardDeadline: bigint;
    timestamp: number;
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

export default function RoundHistory({ currentRound, t }: RoundHistoryProps) {
    const [roundsData, setRoundsData] = useState<RoundData[]>([]);
    const [expandedRound, setExpandedRound] = useState<number | null>(null);
    const [liveAttacks, setLiveAttacks] = useState<LiveAttack[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [roundSearch, setRoundSearch] = useState('');
    const publicClient = usePublicClient();

    // i18n fallbacks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tAny = t as any;
    const roundHistoryLabel = tAny.roundHistory || "Round History";
    const topAttackersLabel = tAny.topAttackers || "Top Attackers";
    const liveActivityLabel = tAny.liveActivity || "Live Activity";
    const noActivityLabel = tAny.noActivity || "No attacks yet";
    const roundDetailsLabel = tAny.roundDetails || "Round Details";
    const attackedWithLabel = tAny.attackedWith || "attacked with";
    const prizeDistributionLabel = tAny.prizeDistribution || "Prize Distribution";

    // Watch for live attacks on current round
    useWatchContractEvent({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        eventName: 'AttackPerformed',
        onLogs(logs) {
            logs.forEach((log) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const args = log.args as any;
                if (args && Number(args.roundId) === Number(currentRound)) {
                    const newAttack: LiveAttack = {
                        id: `${log.transactionHash}-${Date.now()}`,
                        player: args.player,
                        count: Number(args.count),
                        jackpot: args.jackpot,
                        newHardDeadline: args.newHardDeadline,
                        timestamp: Date.now(),
                    };
                    setLiveAttacks(prev => [newAttack, ...prev.slice(0, 9)]);
                }
            });
        },
    });

    // Fetch last 10 rounds data
    const roundIds = useMemo(() => {
        const current = Number(currentRound);
        const ids: number[] = [];
        for (let i = current; i >= Math.max(1, current - 9); i--) {
            ids.push(i);
        }
        return ids;
    }, [currentRound]);

    // Fetch top attackers for a specific round
    const fetchTopAttackers = useCallback(async (roundId: number): Promise<TopAttackerData[]> => {
        if (!publicClient) return [];
        const attackers: TopAttackerData[] = [];

        try {
            for (let i = 0; i < 10; i++) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data = await (publicClient as any).readContract({
                        address: BANMAOFOMO_ADDRESS,
                        abi: BANMAOFOMO_ABI,
                        functionName: "topAttackers",
                        args: [BigInt(roundId), BigInt(i)],
                    }) as [string, bigint];

                    if (data[0] !== "0x0000000000000000000000000000000000000000" && Number(data[1]) > 0) {
                        attackers.push({
                            addr: data[0],
                            attacks: Number(data[1]),
                        });
                    }
                } catch {
                    break; // No more top attackers
                }
            }
        } catch (error) {
            console.error("Error fetching top attackers:", error);
        }

        return attackers.sort((a, b) => b.attacks - a.attacks);
    }, [publicClient]);

    // Fetch round data for display
    useEffect(() => {
        const fetchRounds = async () => {
            if (!publicClient || roundIds.length === 0) return;

            const roundPromises = roundIds.map(async (roundId) => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const roundData = await (publicClient as any).readContract({
                        address: BANMAOFOMO_ADDRESS,
                        abi: BANMAOFOMO_ABI,
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

            // Fetch RoundFinalized events for winners
            try {
                const currentBlock = await publicClient.getBlockNumber();
                const fromBlockNum = currentBlock > 10000n ? currentBlock - 10000n : 0n;

                // Fetch RoundFinalized events
                const roundFinalizedLogs = await publicClient.getLogs({
                    address: BANMAOFOMO_ADDRESS,
                    event: {
                        type: 'event',
                        name: 'RoundFinalized',
                        inputs: [
                            { type: 'uint256', name: 'roundId', indexed: true },
                            { type: 'address', name: 'winner', indexed: true },
                            { type: 'uint256', name: 'amount', indexed: false },
                            { type: 'string', name: 'winType', indexed: false },
                        ],
                    },
                    fromBlock: fromBlockNum,
                    toBlock: 'latest',
                });

                // Fetch PrizeRolledOver events (for timeout/unclaimed tracking)
                const rolloverLogs = await publicClient.getLogs({
                    address: BANMAOFOMO_ADDRESS,
                    event: {
                        type: 'event',
                        name: 'PrizeRolledOver',
                        inputs: [
                            { type: 'uint256', name: 'roundId', indexed: true },
                            { type: 'uint256', name: 'amount', indexed: false },
                            { type: 'string', name: 'reason', indexed: false },
                        ],
                    },
                    fromBlock: fromBlockNum,
                    toBlock: 'latest',
                });

                // Fetch RoundStarted events to get actual starting jackpot
                const roundStartedLogs = await publicClient.getLogs({
                    address: BANMAOFOMO_ADDRESS,
                    event: {
                        type: 'event',
                        name: 'RoundStarted',
                        inputs: [
                            { type: 'uint256', name: 'roundId', indexed: true },
                            { type: 'uint256', name: 'jackpotStart', indexed: false },
                            { type: 'uint256', name: 'hardDeadline', indexed: false },
                        ],
                    },
                    fromBlock: fromBlockNum,
                    toBlock: 'latest',
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const jackpotStartMap = new Map<number, number>();
                roundStartedLogs.forEach((log: any) => {
                    const roundId = Number(log.args.roundId);
                    jackpotStartMap.set(roundId, Number(log.args.jackpotStart) / 1e18);
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rolloverMap = new Map<number, { amount: string; reason: string }>();
                rolloverLogs.forEach((log: any) => {
                    const roundId = Number(log.args.roundId);
                    rolloverMap.set(roundId, {
                        amount: (Number(log.args.amount) / 1e18).toLocaleString(),
                        reason: log.args.reason,
                    });
                });

                const roundsWithWinners = validRounds.map(round => {
                    const winLog = roundFinalizedLogs.find(
                        (log) => Number((log as unknown as RoundFinalizedLog).args.roundId) === round.roundId
                    ) as unknown as RoundFinalizedLog | undefined;

                    const rolloverInfo = rolloverMap.get(round.roundId);
                    // Contract distributes prize instantly at _finalizeRound
                    // TIMEOUT => rolled over, SOFT_WIN/HARD_WIN => claimed
                    const isTimeout = winLog?.args.winType === 'TIMEOUT' || !!rolloverInfo;

                    if (winLog) {
                        return {
                            ...round,
                            winner: winLog.args.winner,
                            prize: (Number(winLog.args.amount) / 1e18).toLocaleString(),
                            winType: winLog.args.winType,
                            txHash: winLog.transactionHash,
                            isTimeout,
                            rolloverAmount: rolloverInfo?.amount,
                            rolloverReason: rolloverInfo?.reason,
                            claimed: !isTimeout,
                            jackpotStart: jackpotStartMap.get(round.roundId),
                            actualJackpot: Number(winLog.args.amount) / 1e18,
                        };
                    }

                    // Round ended but no winner event - check for rollover
                    if (round.ended && rolloverInfo) {
                        return {
                            ...round,
                            isTimeout: true,
                            rolloverAmount: rolloverInfo.amount,
                            rolloverReason: rolloverInfo.reason,
                            claimed: false,
                            jackpotStart: jackpotStartMap.get(round.roundId),
                        };
                    }

                    // Fallback: if the round ended with attacks but no event found,
                    // check if claim period has expired using deadline timestamps
                    if (round.ended && round.lastAttacker && round.lastAttacker !== "0x0000000000000000000000000000000000000000" && round.totalAttacks > 0) {
                        const softDL = Number(round.softDeadline);
                        const hardDL = Number(round.hardDeadline);
                        const nowSec = Math.floor(Date.now() / 1000);
                        const CLAIM_TIMEOUT = 86400; // 24 hours
                        const maxDL = Math.max(softDL, hardDL);
                        const derivedWinType = (softDL > 0 && hardDL > 0 && softDL <= hardDL) ? 'SOFT_WIN' : 'HARD_WIN';
                        const GIFT_COST = Number(DEFAULT_ATTACK_COST) / 1e18; // from constants
                        const estimatedPrize = (round.totalAttacks * GIFT_COST * 75) / 100; // JACKPOT = 75%

                        if (maxDL > 0 && nowSec > maxDL + CLAIM_TIMEOUT) {
                            // Claim period expired — treat as timeout
                            return {
                                ...round,
                                winner: round.lastAttacker,
                                winType: derivedWinType,
                                prize: estimatedPrize.toLocaleString(),
                                isTimeout: true,
                                claimed: false,
                                jackpotStart: jackpotStartMap.get(round.roundId),
                            };
                        }

                        // Still within claim window — show as normal win
                        return {
                            ...round,
                            winner: round.lastAttacker,
                            winType: derivedWinType,
                            prize: estimatedPrize.toLocaleString(),
                            claimed: true,
                            jackpotStart: jackpotStartMap.get(round.roundId),
                        };
                    }

                    return { ...round, jackpotStart: jackpotStartMap.get(round.roundId) };
                });

                setRoundsData(roundsWithWinners);
            } catch (error) {
                // Silence RPC rate-limit errors (expected on public XLayer RPC)
                const errMsg = String(error);
                if (!errMsg.includes('UnknownRpcError') && !errMsg.includes('Failed to fetch') && !errMsg.includes('rate limit')) {
                    console.error("Error fetching RoundFinalized events:", error);
                }
                setRoundsData(validRounds);
            }
        };

        fetchRounds();
    }, [publicClient, roundIds]);

    // Load top attackers when a round is expanded
    useEffect(() => {
        const loadTopAttackers = async () => {
            if (expandedRound === null) return;

            const attackers = await fetchTopAttackers(expandedRound);
            setRoundsData(prev => prev.map(r =>
                r.roundId === expandedRound ? { ...r, topAttackers: attackers } : r
            ));
        };

        loadTopAttackers();
    }, [expandedRound, fetchTopAttackers]);

    const formatAddress = (addr: string) => {
        if (!addr || addr === "0x0000000000000000000000000000000000000000") return "---";
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    // Render clickable address link to OKX X Layer explorer
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

    const displayRounds = useMemo(() => {
        let rounds = isExpanded ? roundsData : roundsData.slice(0, 5);
        if (roundSearch.trim()) {
            const searchNum = parseInt(roundSearch.trim(), 10);
            if (!isNaN(searchNum)) {
                rounds = roundsData.filter(r => r.roundId === searchNum);
            }
        }
        return rounds;
    }, [isExpanded, roundsData, roundSearch]);

    return (
        <motion.div
            className="round-history-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '24px',
                marginTop: '24px',
            }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
            }}>
                <h3 style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    background: 'linear-gradient(90deg, #ffd700, #ff6b35)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>
                    📜 {roundHistoryLabel}
                </h3>
                <span style={{ color: '#888', fontSize: '0.875rem' }}>
                    {roundsData.length} rounds
                </span>
            </div>

            {/* Live Activity Feed - Current Round Only */}
            {liveAttacks.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(0, 0, 0, 0.3))',
                        border: '1px solid rgba(255, 107, 53, 0.3)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                    }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            background: '#ff6b35',
                            borderRadius: '50%',
                            animation: 'pulse 1s infinite',
                        }} />
                        <span style={{ color: '#ff6b35', fontWeight: 600, fontSize: '0.875rem' }}>
                            ⚡ {liveActivityLabel}
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                        <AnimatePresence>
                            {liveAttacks.slice(0, 5).map((attack, index) => (
                                <motion.div
                                    key={attack.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.05 }}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 12px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                    }}
                                >
                                    <span style={{ color: '#ffd700' }}>
                                        🔥 {renderAddressLink(attack.player, { color: '#ffd700', fontWeight: 400 })} {attackedWithLabel} <strong>{attack.count}x</strong>
                                    </span>
                                    <span style={{ color: '#666' }}>{formatTimeAgo(attack.timestamp)}</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}

            {/* Round Search */}
            <style>{`
                .rh-round-search::-webkit-outer-spin-button,
                .rh-round-search::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                .rh-round-search[type=number] { -moz-appearance: textbox; }
            `}</style>
            <div style={{ marginBottom: '12px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#6b7280', pointerEvents: 'none' }}>🔍</div>
                <input
                    type="number"
                    className="rh-round-search"
                    value={roundSearch}
                    onChange={(e) => setRoundSearch(e.target.value)}
                    placeholder={tAny.vhSearchRound || 'Tìm theo số vòng...'}
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

            {/* Rounds List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <AnimatePresence>
                    {displayRounds.map((round, index) => (
                        <motion.div
                            key={round.roundId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="round-item"
                            style={{
                                background: round.ended
                                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(0, 0, 0, 0.3))'
                                    : 'rgba(255, 255, 255, 0.03)',
                                border: `1px solid ${round.ended ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                borderRadius: '12px',
                                overflow: 'hidden',
                                cursor: 'pointer',
                            }}
                            onClick={() => setExpandedRound(expandedRound === round.roundId ? null : round.roundId)}
                        >
                            {/* Round Header - Always visible */}
                            <div style={{
                                padding: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{
                                        background: round.roundId === Number(currentRound)
                                            ? 'linear-gradient(135deg, #ff6b35, #ffd700)'
                                            : 'rgba(255, 255, 255, 0.1)',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        fontWeight: 700,
                                    }}>
                                        #{round.roundId}
                                    </span>
                                    <span style={{
                                        color: round.ended
                                            ? (round.totalAttacks === 0 ? '#888'
                                                : (round.isTimeout || round.rolloverAmount) ? '#ef4444'
                                                    : round.claimed === false ? '#f59e0b'
                                                        : '#22c55e')
                                            : '#fbbf24',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                    }}>
                                        {round.ended
                                            ? (round.totalAttacks === 0
                                                ? '⭕ No Participants'
                                                : (round.isTimeout || round.rolloverAmount)
                                                    ? '🔄 Rolled Over'
                                                    : round.claimed === false
                                                        ? `⏳ ${t.endedLabel}`
                                                        : `✅ ${t.claimedLabel}`)
                                            : `🎮 ${t.activeLabel}`}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ color: '#888', fontSize: '0.875rem' }}>
                                        {round.totalAttacks} {t.attacksLabel}
                                    </span>
                                    <span style={{
                                        color: '#666',
                                        fontSize: '0.75rem',
                                        transform: expandedRound === round.roundId ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s',
                                    }}>
                                        ▼
                                    </span>
                                </div>
                            </div>

                            {/* Last Attacker / Winner - Quick view for ALL rounds */}
                            {round.lastAttacker && round.lastAttacker !== "0x0000000000000000000000000000000000000000" && (
                                <div style={{
                                    padding: '0 16px 16px',
                                    fontSize: '0.75rem',
                                    color: round.ended ? '#ffd700' : '#888',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    {round.ended ? '🏆' : '🎯'}
                                    <span style={{ color: '#888' }}>
                                        {round.ended ? `${t.winnerLabel}:` : `${t.lastAttackLabel}:`}
                                    </span>
                                    {renderAddressLink(round.lastAttacker, {
                                        color: round.ended ? '#ffd700' : '#fff',
                                        fontWeight: round.ended ? 600 : 400,
                                    })}
                                    {round.ended && round.claimed === false && (
                                        <span style={{
                                            background: (round.isTimeout || round.rolloverAmount)
                                                ? 'rgba(239, 68, 68, 0.2)'
                                                : 'rgba(245, 158, 11, 0.2)',
                                            color: (round.isTimeout || round.rolloverAmount) ? '#ef4444' : '#f59e0b',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '0.65rem',
                                        }}>
                                            {(round.isTimeout || round.rolloverAmount)
                                                ? '🔄 Rolled Over'
                                                : '⏳ Pending Claim'}
                                        </span>
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
                                            padding: '16px',
                                            background: 'rgba(0, 0, 0, 0.2)',
                                        }}
                                    >
                                        {/* Round Details Section */}
                                        <div style={{ marginBottom: '16px' }}>
                                            <h4 style={{
                                                color: '#888',
                                                fontSize: '0.75rem',
                                                marginBottom: '12px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                            }}>
                                                📊 {roundDetailsLabel}
                                            </h4>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, 1fr)',
                                                gap: '8px',
                                                fontSize: '0.75rem',
                                            }}>
                                                <div style={{ color: '#666' }}>{t.softDeadlineLabel}:</div>
                                                <div style={{ color: '#fff' }}>{formatTimestamp(round.softDeadline)}</div>
                                                <div style={{ color: '#666' }}>{t.hardDeadlineLabel}:</div>
                                                <div style={{ color: '#fff' }}>{formatTimestamp(round.hardDeadline)}</div>
                                                <div style={{ color: '#666' }}>{t.totalAttacksLabel}:</div>
                                                <div style={{ color: '#ffd700' }}>{round.totalAttacks}</div>
                                            </div>
                                        </div>

                                        {/* Winner Info */}
                                        {round.winner && (
                                            <div style={{
                                                background: (round.isTimeout || round.rolloverAmount)
                                                    ? 'rgba(239, 68, 68, 0.1)'
                                                    : 'rgba(255, 215, 0, 0.1)',
                                                border: `1px solid ${(round.isTimeout || round.rolloverAmount)
                                                    ? 'rgba(239, 68, 68, 0.3)'
                                                    : 'rgba(255, 215, 0, 0.3)'}`,
                                                borderRadius: '10px',
                                                padding: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                marginBottom: '16px',
                                            }}>
                                                <div style={{ flexShrink: 0 }}>
                                                    <AnimatedFrameSprite
                                                        type="winner"
                                                        width={50}
                                                        height={50}
                                                        glowColor={(round.isTimeout || round.rolloverAmount) ? 'red' : 'gold'}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        marginBottom: '6px',
                                                    }}>
                                                        <span style={{ color: '#ffd700', fontWeight: 600, fontSize: '0.875rem' }}>
                                                            🏆 {renderAddressLink(round.winner || '', { color: '#ffd700', fontWeight: 600, fontSize: '0.875rem' })}
                                                        </span>
                                                        <span style={{
                                                            background: round.winType === 'SOFT_WIN'
                                                                ? 'rgba(34, 211, 238, 0.2)'
                                                                : (round.winType === 'TIMEOUT' || round.isTimeout || round.rolloverAmount)
                                                                    ? 'rgba(239, 68, 68, 0.2)'
                                                                    : 'rgba(168, 85, 247, 0.2)',
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.65rem',
                                                            color: round.winType === 'SOFT_WIN'
                                                                ? '#22d3ee'
                                                                : (round.winType === 'TIMEOUT' || round.isTimeout || round.rolloverAmount)
                                                                    ? '#ef4444'
                                                                    : '#a855f7',
                                                        }}>
                                                            {(round.isTimeout || round.rolloverAmount)
                                                                ? '🔄 ROLLED OVER'
                                                                : round.winType}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                    }}>
                                                        <span style={{
                                                            color: (round.isTimeout || round.rolloverAmount) ? '#ef4444' : '#22c55e',
                                                            fontSize: '1rem',
                                                            fontWeight: 700,
                                                        }}>
                                                            {(round.isTimeout || round.rolloverAmount)
                                                                ? `🔄 ${round.rolloverAmount || round.prize} $BANMAO → Next Round`
                                                                : `💰 ${round.prize} $BANMAO`
                                                            }
                                                        </span>
                                                        {round.txHash && (
                                                            <a
                                                                href={`https://web3.okx.com/explorer/x-layer/tx/${round.txHash}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
                                                                    color: '#22d3ee',
                                                                    fontSize: '0.7rem',
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

                                        {/* Attack Fund Distribution - How each attack contributes */}
                                        {round.totalAttacks > 0 && (
                                            <div style={{
                                                background: 'rgba(34, 211, 238, 0.05)',
                                                border: '1px solid rgba(34, 211, 238, 0.2)',
                                                borderRadius: '8px',
                                                padding: '12px',
                                                marginBottom: '16px',
                                            }}>
                                                <div style={{
                                                    fontSize: '0.7rem',
                                                    color: '#22d3ee',
                                                    marginBottom: '10px',
                                                    fontWeight: 600,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                }}>
                                                    {tAny.allocOnAttackTitle || '📊 Gift Distribution'} ({round.totalAttacks} attacks × {HISTORY_GIFT_COST.toLocaleString()} = {(round.totalAttacks * HISTORY_GIFT_COST).toLocaleString()} $BANMAO)
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                                    gap: '8px',
                                                    fontSize: '0.7rem',
                                                }}>
                                                    {/* Jackpot 75% */}
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '6px 10px',
                                                        background: 'rgba(255, 215, 0, 0.1)',
                                                        borderRadius: '6px',
                                                    }}>
                                                        <span>🏆 {tAny.distJackpotLabel || 'Jackpot'} ({V11_FUND_DISTRIBUTION.JACKPOT}%)</span>
                                                        <span style={{ color: '#ffd700', fontWeight: 600 }}>
                                                            +{((round.totalAttacks * HISTORY_GIFT_COST * V11_FUND_DISTRIBUTION.JACKPOT) / 100).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {/* Dividends 17% */}
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '6px 10px',
                                                        background: 'rgba(34, 211, 238, 0.1)',
                                                        borderRadius: '6px',
                                                    }}>
                                                        <span>👥 {tAny.distDividendLabel || 'Dividends'} ({V11_FUND_DISTRIBUTION.DIVIDENDS}%)</span>
                                                        <span style={{ color: '#22d3ee', fontWeight: 600 }}>
                                                            +{((round.totalAttacks * HISTORY_GIFT_COST * V11_FUND_DISTRIBUTION.DIVIDENDS) / 100).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {/* Seed Fund 5% */}
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '6px 10px',
                                                        background: 'rgba(74, 222, 128, 0.1)',
                                                        borderRadius: '6px',
                                                    }}>
                                                        <span>🌱 {tAny.distSeedLabel || 'Next Round'} ({V11_FUND_DISTRIBUTION.SEED_FUND}%)</span>
                                                        <span style={{ color: '#4ade80', fontWeight: 600 }}>
                                                            +{((round.totalAttacks * HISTORY_GIFT_COST * V11_FUND_DISTRIBUTION.SEED_FUND) / 100).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {/* Staking 2% */}
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '6px 10px',
                                                        background: 'rgba(168, 85, 247, 0.1)',
                                                        borderRadius: '6px',
                                                    }}>
                                                        <span>💎 {tAny.distStakingLabel || 'Staking'} ({V11_FUND_DISTRIBUTION.STAKING}%)</span>
                                                        <span style={{ color: '#a855f7', fontWeight: 600 }}>
                                                            +{((round.totalAttacks * HISTORY_GIFT_COST * V11_FUND_DISTRIBUTION.STAKING) / 100).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {/* Burn 1% */}
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '6px 10px',
                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                        borderRadius: '6px',
                                                        gridColumn: 'span 2',
                                                    }}>
                                                        <span>🔥 {tAny.distBurnLabel || 'Burn'} ({V11_FUND_DISTRIBUTION.BURN}%)</span>
                                                        <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                                            +{((round.totalAttacks * HISTORY_GIFT_COST * V11_FUND_DISTRIBUTION.BURN) / 100).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Prize Distribution — only for normally claimed rounds */}
                                        {round.ended && !round.isTimeout && !round.rolloverAmount && round.prize && (() => {
                                            // Contract logic: RoundFinalized.amount = distributable pool
                                            // For HARD_WIN: 30% seed already deducted from jackpotPool before emission
                                            // So event amount = jackpotPool after seed deduction = 70% of original
                                            // Winner = amount * 75%, Top10 = amount * 25%
                                            const prizeNum = Number(String(round.prize).replace(/,/g, ''));
                                            const isHardWin = round.winType === 'HARD_WIN';
                                            // Reverse-calculate seed that was deducted before event
                                            const seedToNext = isHardWin ? Math.round(prizeNum * 30 / 70) : 0;
                                            const winnerShare = Math.round(prizeNum * V11_DISTRIBUTION.WINNER / 100);
                                            const top10Share = Math.round(prizeNum * V11_DISTRIBUTION.TOP_ATTACKERS / 100);

                                            return (
                                                <div style={{
                                                    background: 'rgba(168, 85, 247, 0.1)',
                                                    border: '1px solid rgba(168, 85, 247, 0.2)',
                                                    borderRadius: '8px',
                                                    padding: '12px',
                                                    marginBottom: '16px',
                                                }}>
                                                    <div style={{
                                                        fontSize: '0.7rem',
                                                        color: '#a855f7',
                                                        marginBottom: '10px',
                                                        fontWeight: 600,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                    }}>
                                                        💎 {prizeDistributionLabel} ({isHardWin ? '⚡' : '⏳'} {round.winType?.replace('_', ' ')})
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.7rem' }}>
                                                        {/* Seed to next round (HARD_WIN only) */}
                                                        {isHardWin && (
                                                            <div style={{
                                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                padding: '6px 10px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '6px',
                                                            }}>
                                                                <span>🌱 Seed → {tAny.distSeedLabel || 'Next Round'} (30%)</span>
                                                                <span style={{ color: '#4ade80', fontWeight: 600 }}>{seedToNext.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {/* Winner Share */}
                                                        <div style={{
                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                            padding: '6px 10px', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '6px',
                                                        }}>
                                                            <span>🏆 {t.winner} (75%)</span>
                                                            <span style={{ color: '#ffd700', fontWeight: 600 }}>{winnerShare.toLocaleString()}</span>
                                                        </div>
                                                        {/* Top 10 Share */}
                                                        <div style={{
                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                            padding: '6px 10px', background: 'rgba(34, 211, 238, 0.1)', borderRadius: '6px',
                                                        }}>
                                                            <span>🏅 Top 10 (25%)</span>
                                                            <span style={{ color: '#22d3ee', fontWeight: 600 }}>{top10Share.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                    {/* Note about min attacks */}
                                                    <div style={{ marginTop: '8px', fontSize: '0.6rem', color: '#888', fontStyle: 'italic' }}>
                                                        ⚠ {tAny.rulesMinGiftsForPrize?.(V11_DISTRIBUTION.MIN_ATTACKS_FOR_REWARD) || `Need ≥ ${V11_DISTRIBUTION.MIN_ATTACKS_FOR_REWARD} gifts for full prize. Below ${V11_DISTRIBUTION.MIN_ATTACKS_FOR_REWARD} → only 50%`}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Rollover/No Winner Info - Show when:
                                            1. rolloverAmount exists from PrizeRolledOver event
                                            2. Round ended with 0 attacks (NO_WINNER)
                                            3. Round ended with winType === 'NO_WINNER'
                                        */}
                                        {(round.rolloverAmount ||
                                            (round.ended && round.totalAttacks === 0) ||
                                            (round.ended && round.winType === 'NO_WINNER')) && (
                                                <div style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: '8px',
                                                    padding: '12px',
                                                    marginBottom: '16px',
                                                }}>
                                                    <div style={{
                                                        fontSize: '0.7rem',
                                                        color: '#ef4444',
                                                        marginBottom: '8px',
                                                        fontWeight: 600,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                    }}>
                                                        ⚠️ {round.totalAttacks === 0 ? 'No Participants' : 'Prizes Rolled Over'}
                                                    </div>
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '6px',
                                                        fontSize: '0.7rem',
                                                    }}>
                                                        {round.rolloverAmount && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ color: '#888' }}>Amount:</span>
                                                                <span style={{ color: '#fbbf24', fontWeight: 600 }}>{round.rolloverAmount} $BANMAO</span>
                                                            </div>
                                                        )}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <span style={{ color: '#888' }}>Status:</span>
                                                            <span style={{ color: '#ef4444' }}>
                                                                {round.totalAttacks === 0
                                                                    ? 'No attacks in this round'
                                                                    : (round.rolloverReason || round.winType || 'Unclaimed / Timeout')}
                                                            </span>
                                                        </div>
                                                        <div style={{
                                                            marginTop: '8px',
                                                            padding: '8px',
                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                            borderRadius: '6px',
                                                            color: '#888',
                                                            fontSize: '0.65rem',
                                                            lineHeight: 1.4,
                                                        }}>
                                                            💡 {round.totalAttacks === 0
                                                                ? 'Jackpot was preserved for the next round'
                                                                : 'This amount has been added to the next round\'s jackpot pool'}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        {/* Top Attackers Leaderboard */}
                                        {round.topAttackers && round.topAttackers.length > 0 && (
                                            <div>
                                                <h4 style={{
                                                    color: '#888',
                                                    fontSize: '0.75rem',
                                                    marginBottom: '12px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                }}>
                                                    🏅 {topAttackersLabel}
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {round.topAttackers.map((attacker, idx) => (
                                                        <div
                                                            key={attacker.addr}
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '8px 12px',
                                                                background: idx === 0
                                                                    ? 'rgba(255, 215, 0, 0.1)'
                                                                    : idx === 1
                                                                        ? 'rgba(192, 192, 192, 0.1)'
                                                                        : idx === 2
                                                                            ? 'rgba(205, 127, 50, 0.1)'
                                                                            : 'rgba(255, 255, 255, 0.02)',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{
                                                                    width: '20px',
                                                                    textAlign: 'center',
                                                                    color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#666',
                                                                }}>
                                                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                                                </span>
                                                                <span style={{ color: '#fff' }}>{renderAddressLink(attacker.addr, { color: '#fff', fontWeight: 400 })}</span>
                                                            </div>
                                                            <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                                                                {attacker.attacks} {t.attacksLabel}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Loading state for top attackers */}
                                        {!round.topAttackers && round.ended && (
                                            <div style={{
                                                textAlign: 'center',
                                                padding: '16px',
                                                color: '#666',
                                                fontSize: '0.75rem',
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
            </div>

            {/* Show More/Less Button */}
            {roundsData.length > 5 && (
                <motion.button
                    onClick={() => setIsExpanded(!isExpanded)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                        width: '100%',
                        marginTop: '16px',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        color: '#888',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {isExpanded ? '▲ Show Less' : `▼ Show More (${roundsData.length - 5} more)`}
                </motion.button>
            )}

            {/* Empty State */}
            {roundsData.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#666',
                }}>
                    {noActivityLabel}
                </div>
            )}
        </motion.div>
    );
}
