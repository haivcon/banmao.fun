/**
 * StatsTable Component
 * Displays user statistics (balance, win/loss, moves)
 */

"use client";

import React, { useMemo } from "react";
import { FaWallet, FaTrophy, FaHandRock, FaCoins } from "react-icons/fa";
import type { LocaleStrings } from "../lib/i18n";
import type { UserStatsShape } from "../lib/types";
import { formatTokenAmount } from "../lib/utils";

export interface StatsTableProps {
    balance: bigint | null;
    stats: UserStatsShape;
    decimals: number;
    t: LocaleStrings;
    className?: string;
}

export default function StatsTable({
    balance,
    stats,
    decimals,
    t,
    className = "",
}: StatsTableProps) {
    const rows = useMemo(() => {
        const formattedBalance =
            balance != null ? `${formatTokenAmount(balance, decimals)} $BANMAO` : "—";

        const totalMatches = stats.win + stats.loss + stats.draw;
        const winningsFormatted = formatTokenAmount(stats.totalWinnings, decimals);
        const lossesFormatted = formatTokenAmount(stats.totalLosses, decimals);
        const net = stats.totalWinnings - stats.totalLosses;
        const netSign = net >= BigInt(0) ? "+" : "";
        const netFormatted = `${netSign}${formatTokenAmount(net, decimals)}`;

        const moveBreakdown = `✊ ${stats.rock} / 🖐 ${stats.paper} / ✌️ ${stats.scissors}`;

        const moveOptions = [
            { key: "rock", count: stats.rock, icon: "✊", label: t.rock },
            { key: "paper", count: stats.paper, icon: "🖐", label: t.paper },
            { key: "scissors", count: stats.scissors, icon: "✌️", label: t.scissors },
        ];
        const topMove = moveOptions.reduce(
            (acc, curr) => (curr.count > acc.count ? curr : acc),
            moveOptions[0]
        );
        const topMoveDetail = topMove.count > 0 ? `★ ${topMove.icon} ${topMove.label}` : null;

        return [
            {
                key: "balance",
                icon: <FaWallet aria-hidden="true" />,
                label: t.balance,
                value: formattedBalance,
                detail: t.stakePH ?? "$BANMAO",
            },
            {
                key: "performance",
                icon: <FaTrophy aria-hidden="true" />,
                label: t.winLossRatio,
                value: `${stats.win} / ${stats.loss} / ${stats.draw}`,
                detail: totalMatches > 0 ? `Σ ${totalMatches}` : "Σ 0",
            },
            {
                key: "moves",
                icon: <FaHandRock aria-hidden="true" />,
                label: t.rps,
                value: moveBreakdown,
                detail: topMoveDetail,
            },
            {
                key: "winnings",
                icon: <FaCoins aria-hidden="true" />,
                label: t.totalWinningsLosses ?? `${t.totalWinnings} / ${t.totalLosses}`,
                value: `${winningsFormatted} / ${lossesFormatted}`,
                detail: `Δ ${netFormatted}`,
            },
        ];
    }, [balance, decimals, stats, t]);

    return (
        <table className={`stake-section__info-table ${className}`}>
            <tbody>
                {rows.map((row) => (
                    <tr key={row.key}>
                        <td>
                            <span className="stake-section__info-main">
                                <span className="stake-section__info-icon" aria-hidden="true">
                                    {row.icon}
                                </span>
                                <span className="stake-section__info-value">{row.value}</span>
                            </span>
                            <span className="stake-section__info-caption">{row.label}</span>
                            {row.detail ? (
                                <span className="stake-section__info-detail">{row.detail}</span>
                            ) : null}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
