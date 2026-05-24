"use client";
import React from "react";
import { formatEther } from "viem";
import type { TeamPoolData, UserTeamInfo } from "../hooks/useWorldCup";
import TeamCrest from "./TeamCrest";
import { cleanLabel } from "../lib/labels";
import { BriefcaseBusiness, Wallet } from "lucide-react";

interface Props {
    userStakes: UserTeamInfo[];
    teams: TeamPoolData[];
    tokenBalance: bigint;
    tokenBalanceLoading?: boolean;
    tokenBalanceError?: Error | null;
    nativeBalance?: { formatted: string; symbol: string };
    tournamentStarted: boolean;
    tournamentEnded: boolean;
    onTeamClick: (id: number) => void;
    t: Record<string,any>;
}

export default function UserPortfolio({ userStakes, teams, tokenBalance, tokenBalanceLoading, tokenBalanceError, nativeBalance, tournamentStarted, tournamentEnded, onTeamClick, t }: Props) {
    const positions = teams.map((team, i) => ({
        ...team,
        amount: userStakes[i]?.amount || BigInt(0),
        weight: userStakes[i]?.weight || BigInt(0),
        pendingRewards: userStakes[i]?.pendingRewards || BigInt(0),
    })).filter(p => p.amount > BigInt(0) || p.pendingRewards > BigInt(0));
    const total = positions.reduce((s, p) => s + p.amount, BigInt(0));
    const pendingTotal = positions.reduce((s, p) => s + p.pendingRewards, BigInt(0));
    const lockedTotal = positions.filter(p => p.locked).reduce((s, p) => s + p.amount, BigInt(0));
    const affectedTotal = positions.filter(p => p.status === 'eliminated' || p.principalIndex < BigInt("1000000000000000000")).reduce((s, p) => s + p.amount, BigInt(0));
    const totalLabel = Number(formatEther(total)).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const walletLabel = tokenBalanceError
        ? 'Unavailable'
        : tokenBalanceLoading
            ? '--'
            : Number(formatEther(tokenBalance)).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const walletUnit = tokenBalanceError ? 'balanceOf reverted' : '$BANMAO';
    const statusText = cleanLabel(tournamentEnded ? t.finished : tournamentStarted ? t.live : t.pending);

    return (
        <div className="wc-portfolio">
            <div className="wc-portfolio-head">
                <div>
                    <span className="wc-eyebrow">{t.walletPanel}</span>
                    <h3><BriefcaseBusiness size={17} strokeWidth={2.4} />{cleanLabel(t.portfolio, 'Portfolio')}</h3>
                </div>
                <span className="wc-mini-status">{statusText}</span>
            </div>
            <div className="wc-portfolio-metrics">
                <div>
                    <span><Wallet size={13} strokeWidth={2.4} />{cleanLabel(t.wallet, 'Wallet')}</span>
                    <strong>{walletLabel}</strong>
                    <small>{walletUnit}</small>
                </div>
                {nativeBalance && (
                <div>
                    <span>Native Balance</span>
                    <strong>{Number(nativeBalance.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 })}</strong>
                    <small>{nativeBalance.symbol}</small>
                </div>
                )}
                <div>
                    <span>{t.totalStaked}</span>
                    <strong>{totalLabel}</strong>
                    <small>$BANMAO</small>
                </div>
                <div>
                    <span>{t.pendingRewards || 'Pending Rewards'}</span>
                    <strong>{Number(formatEther(pendingTotal)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                    <small>$BANMAO</small>
                </div>
                <div>
                    <span>{t.lockedPrincipal || 'Locked principal'}</span>
                    <strong>{Number(formatEther(lockedTotal)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                    <small>$BANMAO</small>
                </div>
                <div>
                    <span>{t.lossAdjusted || 'Loss adjusted'}</span>
                    <strong>{Number(formatEther(affectedTotal)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                    <small>$BANMAO</small>
                </div>
            </div>
            {positions.length === 0 ? (
                <div className="wc-portfolio-empty">
                    <strong>{t.noActivePools}</strong>
                    <span>{t.noPositions}</span>
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
