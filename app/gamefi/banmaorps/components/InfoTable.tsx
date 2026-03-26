import React, { useMemo } from "react";
import { FaCoins, FaHandRock, FaTrophy, FaWallet } from "react-icons/fa";
import { formatTokenAmount, formatTokenAmountSigned, ZERO_BIGINT } from "../lib/gameUtils";
import { InfoRow, InfoTableProps } from "../lib/types";

export default function InfoTable({ balance, decimals, stats, strings }: InfoTableProps) {
    const rows = useMemo<InfoRow[]>(() => {
        const formattedBalance = typeof balance === "bigint" ? formatTokenAmount(balance, decimals) : "-";
        const totalMatches = stats.win + stats.loss + stats.draw;
        const winningsFormatted = formatTokenAmount(stats.totalWinnings, decimals);
        const lossesFormatted = formatTokenAmount(stats.totalLosses, decimals);
        const net = stats.totalWinnings - stats.totalLosses;
        const netFormatted = net === ZERO_BIGINT ? "0" : formatTokenAmountSigned(net, decimals);
        const moveBreakdown = `✊ ${stats.rock} / 🖐 ${stats.paper} / ✌️ ${stats.scissors}`;

        const moveOptions = [
            { key: "rock", count: stats.rock, icon: "✊", label: strings.rock },
            { key: "paper", count: stats.paper, icon: "🖐", label: strings.paper },
            { key: "scissors", count: stats.scissors, icon: "✌️", label: strings.scissors },
        ];
        const topMove = moveOptions.reduce((acc, curr) => (curr.count > acc.count ? curr : acc), moveOptions[0]);
        const topMoveDetail = topMove.count > 0 ? `★ ${topMove.icon} ${topMove.label}` : null;

        return [
            {
                key: "balance",
                icon: <FaWallet aria-hidden="true" />,
                label: strings.balance,
                value: formattedBalance,
                detail: strings.stakePH ?? "$BANMAO",
            },
            {
                key: "performance",
                icon: <FaTrophy aria-hidden="true" />,
                label: strings.winLossRatio,
                value: `${stats.win} / ${stats.loss} / ${stats.draw}`,
                detail: totalMatches > 0 ? `Σ ${totalMatches}` : "Σ 0",
            },
            {
                key: "moves",
                icon: <FaHandRock aria-hidden="true" />,
                label: strings.rps,
                value: moveBreakdown,
                detail: topMoveDetail,
            },
            {
                key: "winnings",
                icon: <FaCoins aria-hidden="true" />,
                label: strings.totalWinningsLosses ?? `${strings.totalWinnings} / ${strings.totalLosses}`,
                value: `${winningsFormatted} / ${lossesFormatted}`,
                detail: `Δ ${netFormatted}`,
            },
        ];
    }, [balance, decimals, stats, strings]);

    return (
        <table className="stake-section__info-table">
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
                            {row.detail ? <span className="stake-section__info-detail">{row.detail}</span> : null}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
