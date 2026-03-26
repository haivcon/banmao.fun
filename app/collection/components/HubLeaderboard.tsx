"use client";
import React, { useState, useEffect } from "react";
import "./HubLeaderboard.css";

interface LeaderboardData {
    address: string;
    username: string;
    avatar_url: string;
    total_posts: number;
    total_likes_recv: number;
    total_comments_recv: number;
    total_tips_recv: number;
    total_tips_sent: number;
    total_points: number;
}

interface HubLeaderboardProps {
    t: Record<string, string>;
    onProfileClick: (address: string) => void;
}

const shortAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

export default function HubLeaderboard({ t, onProfileClick }: HubLeaderboardProps) {
    const [players, setPlayers] = useState<LeaderboardData[]>([]);
    const [rewardPool, setRewardPool] = useState<string>("0");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/hub/leaderboard");
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setPlayers(data.leaderboard || []);
                        setRewardPool(data.rewardPool || "0");
                    }
                }
            } catch (err) {
                console.error("Failed to fetch leaderboard", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Pause polling when tab is hidden to save bandwidth
        const interval = setInterval(() => {
            if (!document.hidden) fetchData();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatPool = (val: string) => {
        const num = Number(val) / 1e18;
        return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    };

    if (loading) {
        return (
            <div className="hub-leaderboard-container">
                <div className="hub-lb-skeleton-header"></div>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="hub-lb-skeleton-row"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="hub-leaderboard-container animate-fade-in">
            {/* Reward Pool Banner */}
            <div className="hub-lb-reward-banner">
                <div className="hub-lb-reward-content">
                    <span className="hub-lb-reward-label">🔥 {t.rewardPool || 'Community Reward Pool'}</span>
                    <span className="hub-lb-reward-value glow-text-gold">{formatPool(rewardPool)} $BANMAO</span>
                    <p className="hub-lb-reward-desc">{t.rewardPoolDesc || '* 100% tipping fees are redistributed to top social miners'}</p>
                </div>
            </div>

            {/* Leaderboard Header */}
            <div className="hub-lb-header">
                <h2 className="hub-lb-title">🏆 {t.socialMining || 'Social Mining Leaderboard'}</h2>
            </div>

            {/* Leaderboard List */}
            <div className="hub-lb-list">
                {players.length === 0 ? (
                    <div className="hub-lb-empty">{t.noMiners || 'No miners found yet! Start posting to earn points.'}</div>
                ) : (
                    players.map((p, index) => {
                        let rankIcon = '';
                        let rankClass = '';
                        if (index === 0) { rankIcon = '🥇'; rankClass = 'rank-1'; }
                        else if (index === 1) { rankIcon = '🥈'; rankClass = 'rank-2'; }
                        else if (index === 2) { rankIcon = '🥉'; rankClass = 'rank-3'; }
                        else { rankIcon = `#${index + 1}`; rankClass = 'rank-other'; }

                        const avatarContent = p.avatar_url
                            ? <img src={p.avatar_url} alt="avatar" />
                            : (p.username || '?')[0].toUpperCase();

                        return (
                            <div key={p.address} className="hub-lb-row" onClick={() => onProfileClick(p.address)}>
                                <div className={`hub-lb-rank ${rankClass}`}>{rankIcon}</div>

                                <div className="hub-lb-user">
                                    <div className="hub-lb-avatar">{avatarContent}</div>
                                    <div className="hub-lb-user-info">
                                        <span className="hub-lb-username">{p.username || shortAddr(p.address)}</span>
                                        <span className="hub-lb-address">{shortAddr(p.address)}</span>
                                    </div>
                                </div>

                                <div className="hub-lb-stats">
                                    <div className="hub-lb-stat-badge">📝 {p.total_posts}</div>
                                    <div className="hub-lb-stat-badge">❤️ {p.total_likes_recv}</div>
                                    <div className="hub-lb-stat-badge">💬 {p.total_comments_recv}</div>
                                    <div className="hub-lb-stat-badge">💰 {p.total_tips_recv}</div>
                                </div>

                                <div className="hub-lb-points">
                                    <span className="hub-lb-points-value">{p.total_points.toLocaleString()}</span>
                                    <span className="hub-lb-points-label">PTS</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
