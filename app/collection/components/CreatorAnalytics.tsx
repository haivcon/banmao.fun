'use client';
import React, { useState, useEffect, memo } from 'react';

interface AnalyticsData {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalTips: string;
    topPost: { id: number; caption: string; likes: number } | null;
    weeklyActivity: number[];
    followerCount: number;
    engagementRate: number;
}

interface CreatorAnalyticsProps {
    t: Record<string, string>;
    address?: string;
}

const CreatorAnalytics = memo(function CreatorAnalytics({ t, address }: CreatorAnalyticsProps) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d');

    useEffect(() => {
        if (!address) return;
        setLoading(true);
        fetch(`/api/hub/analytics?address=${address}&period=${period}`)
            .then(r => r.json())
            .then(d => setData(d))
            .catch(() => {
                // Fallback data
                setData({
                    totalPosts: 0, totalLikes: 0, totalComments: 0,
                    totalTips: '0', topPost: null,
                    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
                    followerCount: 0, engagementRate: 0,
                });
            })
            .finally(() => setLoading(false));
    }, [address, period]);

    if (!address) return null;

    const maxActivity = Math.max(...(data?.weeklyActivity || [1]), 1);
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="analytics-dashboard">
            <div className="analytics-header">
                <h3 className="analytics-title">📊 {t.analytics || 'Creator Analytics'}</h3>
                <div className="analytics-period">
                    {(['7d', '30d', 'all'] as const).map(p => (
                        <button key={p} className={`analytics-period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
                            {p === '7d' ? '7D' : p === '30d' ? '30D' : 'All'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="analytics-loading">⏳</div>
            ) : data ? (
                <>
                    {/* Stat cards */}
                    <div className="analytics-stats">
                        <div className="analytics-stat">
                            <span className="analytics-stat-value">{data.totalPosts}</span>
                            <span className="analytics-stat-label">📸 Posts</span>
                        </div>
                        <div className="analytics-stat">
                            <span className="analytics-stat-value">{data.totalLikes}</span>
                            <span className="analytics-stat-label">❤️ Likes</span>
                        </div>
                        <div className="analytics-stat">
                            <span className="analytics-stat-value">{data.totalComments}</span>
                            <span className="analytics-stat-label">💬 Comments</span>
                        </div>
                        <div className="analytics-stat">
                            <span className="analytics-stat-value">{data.followerCount}</span>
                            <span className="analytics-stat-label">👥 Followers</span>
                        </div>
                    </div>

                    {/* Mini bar chart */}
                    <div className="analytics-chart">
                        <h4 className="analytics-chart-title">{t.activityChart || 'Activity This Week'}</h4>
                        <div className="analytics-bars">
                            {data.weeklyActivity.map((val, i) => (
                                <div key={i} className="analytics-bar-col">
                                    <div className="analytics-bar-track">
                                        <div className="analytics-bar-fill" style={{ height: `${(val / maxActivity) * 100}%` }} />
                                    </div>
                                    <span className="analytics-bar-label">{dayLabels[i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Engagement rate */}
                    <div className="analytics-engagement">
                        <span className="analytics-eng-label">🎯 {t.engagementRate || 'Engagement Rate'}</span>
                        <span className="analytics-eng-value">{data.engagementRate.toFixed(1)}%</span>
                    </div>

                    {/* Tips earned */}
                    <div className="analytics-tips">
                        <span className="analytics-tips-label">💰 {t.tipsEarned || 'Tips Earned'}</span>
                        <span className="analytics-tips-value">
                            {(Number(data.totalTips) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} BANMAO
                        </span>
                    </div>
                </>
            ) : null}
        </div>
    );
});

export default CreatorAnalytics;
