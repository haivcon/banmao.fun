"use client";
import React from "react";
import { formatEther } from "viem";
import type { TeamPoolData, UserTeamInfo } from "../hooks/useWorldCup";
import TeamCrest from "./TeamCrest";
import { cleanLabel } from "../lib/labels";
import { BriefcaseBusiness, Wallet } from "lucide-react";
import WalletBalanceWidget from "./WalletBalanceWidget";

interface Props {
    userStakes: UserTeamInfo[];
    teams: TeamPoolData[];
    tokenBalance: bigint;
    tokenBalanceLoading?: boolean;
    tokenBalanceError?: Error | null;
    nativeBalance?: { formatted: string; symbol: string };
    walletAddress?: string;
    tournamentStarted: boolean;
    tournamentEnded: boolean;
    onTeamClick: (id: number) => void;
    t: Record<string,any>;
}

export default function UserPortfolio({ userStakes, teams, tokenBalance, tokenBalanceLoading, tokenBalanceError, nativeBalance, walletAddress, tournamentStarted, tournamentEnded, onTeamClick, t }: Props) {
    const positions = teams.map((team, i) => ({
        ...team,
        amount: userStakes[i]?.amount || BigInt(0),
        weight: userStakes[i]?.weight || BigInt(0),
        pendingRewards: userStakes[i]?.pendingRewards || BigInt(0),
    })).filter(p => p.amount > BigInt(0) || p.pendingRewards > BigInt(0));
    const total = positions.reduce((s, p) => s + p.amount, BigInt(0));
    const pendingTotal = positions.reduce((s, p) => s + p.pendingRewards, BigInt(0));
    const lockedTotal = positions.filter(p => p.locked).reduce((s, p) => s + p.amount, BigInt(0));
    const totalLabel = Number(formatEther(total)).toLocaleString(undefined, { maximumFractionDigits: 2 });

    const statusText = cleanLabel(tournamentEnded ? t.finished : tournamentStarted ? t.live : t.pending);

    // Net worth: use on-chain if available, otherwise just staked total
    const netWorth = (!tokenBalanceError && !tokenBalanceLoading && tokenBalance !== undefined) ? tokenBalance + total : total;
    const netWorthLabel = Number(formatEther(netWorth)).toLocaleString(undefined, { maximumFractionDigits: 2 });

    return (
        <div className="wc-portfolio">
            <div className="wc-portfolio-head">
                <div>
                    <span className="wc-eyebrow">{t.walletPanel}</span>
                    <h3><BriefcaseBusiness size={17} strokeWidth={2.4} />{cleanLabel(t.portfolio, 'Portfolio')}</h3>
                </div>
                <span className="wc-mini-status">{statusText}</span>
            </div>
            
            <div className="wc-portfolio-networth">
                <span className="wc-networth-title">{cleanLabel(t.totalValue || 'Total Portfolio Value')}</span>
                <strong className="wc-networth-amount">{netWorthLabel} <small>$BANMAO</small></strong>
            </div>

            <div style={{ padding: '0 20px', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                <WalletBalanceWidget primaryColor="#00f5ff" />
            </div>

            <div className="wc-portfolio-metrics">
                <div>
                    <span>
                        {t.totalStaked}
                        <div className="wc-tooltip-wrapper">
                            <span className="wc-tooltip-icon">i</span>
                            <div className="wc-tooltip-content">Total principal currently staked across all teams.</div>
                        </div>
                    </span>
                    <strong>{totalLabel}</strong>
                    <small>$BANMAO</small>
                </div>
                <div>
                    <span>
                        {t.pendingRewards || 'Rewards'}
                        <div className="wc-tooltip-wrapper">
                            <span className="wc-tooltip-icon">i</span>
                            <div className="wc-tooltip-content">Accrued rewards from winning past matches.</div>
                        </div>
                    </span>
                    <strong>{Number(formatEther(pendingTotal)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                    <small>$BANMAO</small>
                </div>
                {lockedTotal > BigInt(0) && (
                <div>
                    <span>
                        {t.lockedPrincipal || 'Locked'}
                        <div className="wc-tooltip-wrapper">
                            <span className="wc-tooltip-icon">i</span>
                            <div className="wc-tooltip-content">Tokens in active matches (cannot be unstaked).</div>
                        </div>
                    </span>
                    <strong>{Number(formatEther(lockedTotal)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                    <small>$BANMAO</small>
                </div>
                )}
            </div>
            {positions.length === 0 ? (
                <div className="wc-portfolio-empty">
                    <div className="wc-portfolio-empty-glow" />
                    <strong>{t.noActivePools}</strong>
                    <span>{t.noPositions}</span>
                    <button className="wc-portfolio-cta-btn" onClick={() => {
                        const el = document.querySelector('.wc-view-toggle') || document.querySelector('.wc-team-grid');
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}>{cleanLabel(t.stakeNow || 'Stake Now →')}</button>
                </div>
            ) : (<>
                <div className="wc-portfolio-list">
                    {positions.map(p => (
                        <div key={p.id} className="wc-portfolio-item" onClick={() => onTeamClick(p.id)}
                            style={{ '--team-color': p.color } as React.CSSProperties}>
                            <TeamCrest code={p.code} name={p.name} color={p.color} colorSecondary={p.colorSecondary} size="sm" />
                            <span className="wc-portfolio-name">{p.name}</span>
                            <span className="wc-portfolio-amount">{Number(formatEther(p.amount)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            {p.pendingRewards > BigInt(0) && <small className="wc-portfolio-reward">+{Number(formatEther(p.pendingRewards)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</small>}
                        </div>
                    ))}
                </div>
            </>)}
            <div className="wc-portfolio-hint">
                <span>{t.claimHint}</span>
            </div>
        </div>
    );
}
