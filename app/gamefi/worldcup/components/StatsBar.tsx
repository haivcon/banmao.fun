"use client";
import React from "react";
import { formatEther } from "viem";
import { cleanLabel } from "../lib/labels";
import { Activity, CircleDot, Coins, Goal, Trophy, UsersRound } from "lucide-react";

interface Props { totalStakedAll?: bigint; rewardPool?: bigint; matchCount: number; tournamentStarted: boolean; tournamentEnded: boolean; activeTeams: number; maxTeams: number; t: Record<string,any>; }

export default function StatsBar({ totalStakedAll, rewardPool, matchCount, tournamentStarted, tournamentEnded, activeTeams, maxTeams, t }: Props) {
    const tvl = totalStakedAll ? Number(formatEther(totalStakedAll)).toLocaleString(undefined,{maximumFractionDigits:0}) : '0';
    const pool = rewardPool ? Number(formatEther(rewardPool)).toLocaleString(undefined,{maximumFractionDigits:0}) : '0';
    const statusText = cleanLabel(tournamentEnded ? t.finished : tournamentStarted ? t.live : t.pending);
    const statusClass = tournamentEnded ? 'is-ended' : tournamentStarted ? 'is-live' : 'is-pending';
    const cards = [
        { label: t.totalTvl, value: tvl, unit: '$BANMAO', icon: Coins, tone: 'teal' },
        { label: t.rewardPool, value: pool, unit: '$BANMAO', icon: Trophy, tone: 'gold' },
        { label: t.matches, value: matchCount.toLocaleString(), unit: t.played, icon: Goal, tone: 'orange' },
        { label: t.activeTeams, value: `${activeTeams.toLocaleString()} / ${maxTeams.toLocaleString()}`, unit: t.teams || 'teams', icon: UsersRound, tone: 'blue' },
        { label: t.status, value: statusText, unit: tournamentStarted ? t.tournament : t.waitingRoom, icon: tournamentStarted ? Activity : CircleDot, tone: 'status' },
    ];

    return (
        <div className="wc-stats-bar">
            {cards.map(({ label, value, unit, icon: Icon, tone }) => (
                <div key={label} className={`wc-stat-card wc-stat-${tone} ${tone === 'status' ? statusClass : ''}`}>
                    <span className="wc-stat-icon"><Icon size={18} strokeWidth={2.4} /></span>
                    <span className="wc-stat-label">{label}</span>
                    <span className="wc-stat-value">{value}</span>
                    <span className="wc-stat-unit">{unit}</span>
                </div>
            ))}
        </div>
    );
}
