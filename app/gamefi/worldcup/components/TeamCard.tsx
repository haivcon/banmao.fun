"use client";
import React from "react";
import { formatEther } from "viem";
import type { TeamPoolData, UserTeamInfo } from "../hooks/useWorldCup";
import TeamCrest from "./TeamCrest";
import { cleanLabel } from "../lib/labels";

interface Props {
    team: TeamPoolData;
    userStake: UserTeamInfo;
    totalStakedAll: bigint;
    onClick: () => void;
    t: Record<string,any>;
}

export default function TeamCard({ team, userStake, totalStakedAll, onClick, t }: Props) {
    const statusClass = `wc-status-${team.status}`;
    const hasStake = userStake.amount > BigInt(0);
    const share = totalStakedAll > BigInt(0) ? Number((team.totalStaked * BigInt(10000)) / totalStakedAll) / 100 : 0;
    const shareLabel = `${share.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
    const userStakeLabel = Number(formatEther(userStake.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const userWeightLabel = Number(formatEther(userStake.weight)).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const pendingLabel = Number(formatEther(userStake.pendingRewards)).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const disabled = team.status === 'locked' || team.status === 'eliminated';
    const actionLabel = team.status === 'locked'
        ? cleanLabel(t.locked, 'Locked')
        : team.status === 'eliminated'
            ? cleanLabel(t.withdraw, 'Withdraw')
            : hasStake
                ? cleanLabel(t.manage, 'Manage')
                : cleanLabel(t.stake, 'Stake');
    const statusLabel = cleanLabel(t[team.status], team.status);
    const emptyPool = team.totalStaked === BigInt(0);

    return (
        <button className={`wc-team-card ${statusClass} ${hasStake ? 'wc-has-stake' : ''}`} onClick={onClick}
            style={{ '--team-color': team.color, '--team-color-secondary': team.colorSecondary || team.color } as React.CSSProperties}>
            <div className="wc-card-topline">
                <span className={`wc-team-status-badge ${statusClass}`}>{statusLabel}</span>
                <span className="wc-team-group">{t.group} {team.group}</span>
            </div>
            <div className="wc-team-hero">
                <TeamCrest code={team.code} name={team.name} color={team.color} colorSecondary={team.colorSecondary} size="md" />
                <div>
                    <div className="wc-team-name">{team.name}</div>
                    <div className="wc-team-code">{team.code}</div>
                    <div className="wc-team-caption">{emptyPool ? t.openForStaking : t.liquidityActive}</div>
                </div>
            </div>
            <div className="wc-team-meter">
                <div className="wc-team-meter-head">
                    <span>{t.poolShare}</span>
                    <strong>{shareLabel}</strong>
                </div>
                <div className="wc-team-progress"><span style={{ width: `${Math.max(share, team.totalStaked > BigInt(0) ? 4 : 0)}%` }} /></div>
            </div>
            <div className="wc-team-stats">
                <div className="wc-stat" title={t.totalInPoolHelp || "Total BANMAO currently held by this pool"}><span className="wc-stat-label">{t.totalInPool || 'Total in pool'}</span><span className="wc-stat-value">{team.tvlFormatted}</span></div>
                <div className="wc-stat" title={t.yourStakeHelp || "Your current principal in this team pool"}><span className="wc-stat-label">{t.yourStake || 'Your Stake'}</span><span className="wc-stat-value">{userStakeLabel}</span></div>
                <div className="wc-stat" title={t.rewardShareHelp || "Your time-weighted reward share"}><span className="wc-stat-label">{t.rewardShare || 'Reward share'}</span><span className="wc-stat-value">{userWeightLabel}</span></div>
                <div className="wc-stat wc-share-stat" title={t.yourRewardHelp || "Rewards available to claim from this team"}><span className="wc-stat-label">{t.yourReward || 'Your reward'}</span><span className="wc-stat-value">{pendingLabel}</span></div>
            </div>
            <div className="wc-card-footer">
                <span className={hasStake ? 'wc-position-chip is-active' : 'wc-position-chip'}>{hasStake ? cleanLabel(t.staked, 'Staked') : (t.noPosition || 'No position')}</span>
                <span className={disabled ? 'wc-card-action is-disabled' : 'wc-card-action'}>{actionLabel}</span>
            </div>
        </button>
    );
}
