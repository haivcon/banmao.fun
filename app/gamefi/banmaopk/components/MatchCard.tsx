/**
 * MatchCard Component - Displays a single PK Match
 */
"use client";

import React from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { BANMAOPK_ADDRESS } from "../lib/constants";
import { BANMAOPK_ABI } from "../lib/abis";

interface MatchCardProps {
    matchId: bigint;
    onClick?: () => void;
}

export default function MatchCard({ matchId, onClick }: MatchCardProps) {
    const { data: matchData } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "matches",
        args: [matchId],
    });

    if (!matchData) {
        return (
            <div className="pk-card animate-pulse">
                <div className="h-32 bg-gray-700/50 rounded" />
            </div>
        );
    }

    const [p1, p2, score1, score2, startTime, endTime, finalized, isRefunded, overtimeCount, totalPool] = matchData;

    const now = BigInt(Math.floor(Date.now() / 1000));
    const isEnded = now >= endTime;
    const timeLeft = isEnded ? 0n : endTime - now;
    const totalScore = score1 + score2;
    const percent1 = totalScore > 0n ? Number((score1 * 100n) / totalScore) : 50;

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const formatTime = (seconds: bigint) => {
        const s = Number(seconds);
        if (s > 86400) return `${Math.floor(s / 86400)}d`;
        if (s > 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
        if (s > 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
        return `${s}s`;
    };

    return (
        <div onClick={onClick} className="pk-card block cursor-pointer hover:border-orange-500/50 transition-all">
            {/* Status Badge */}
            <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-gray-500">Match #{matchId.toString()}</span>
                {finalized ? (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-700 text-gray-300">
                        {isRefunded ? "🔄 Refunded" : "✅ Ended"}
                    </span>
                ) : overtimeCount > 0n ? (
                    <span className="pk-timer overtime">⚡ OVERTIME x{overtimeCount.toString()}</span>
                ) : isEnded ? (
                    <span className="pk-timer danger">⏳ Finalizing...</span>
                ) : (
                    <span className={`pk-timer ${Number(timeLeft) < 300 ? "danger" : ""}`}>
                        ⏱️ {formatTime(timeLeft)}
                    </span>
                )}
            </div>

            {/* VS Container */}
            <div className="pk-vs-container">
                <div className="pk-player">
                    <div className="pk-player-avatar">🦁</div>
                    <div className="text-sm font-bold text-red-400">{formatAddress(p1)}</div>
                    <div className="text-xl font-black mt-1">
                        {Number(formatUnits(score1, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>

                <div className="pk-vs-text">VS</div>

                <div className="pk-player">
                    <div className="pk-player-avatar p2">🐯</div>
                    <div className="text-sm font-bold text-blue-400">{formatAddress(p2)}</div>
                    <div className="text-xl font-black mt-1">
                        {Number(formatUnits(score2, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>

            {/* Score Bar */}
            <div className="pk-score-bar">
                <div
                    className="pk-score-fill left"
                    style={{ width: `${percent1}%` }}
                />
            </div>

            {/* Pool Info */}
            <div className="flex justify-between items-center mt-4 text-xs text-gray-400">
                <span>💰 Pool: {Number(formatUnits(totalPool, 18)).toLocaleString()} BANMAO</span>
                <span className="text-orange-400 font-semibold">Xem Chi Tiết →</span>
            </div>
        </div>
    );
}
