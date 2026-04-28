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
    const dayLabels = [
        t.mon || 'Mon', t.tue || 'Tue', t.wed || 'Wed', 
        t.thu || 'Thu', t.fri || 'Fri', t.sat || 'Sat', t.sun || 'Sun'
    ];

    return (
        <div className="analytics-dashboard">
            <div className="analytics-header">
                <h3 className="analytics-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#a855f7'}}><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                    {t.creatorAnalytics || t.analytics || 'Creator Analytics'}
                </h3>
                <div className="analytics-period">
                    {(['7d', '30d', 'all'] as const).map(p => (
                        <button key={p} className={`analytics-period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
                            {p === '7d' ? (t.sevenDays || '7D') : p === '30d' ? (t.thirtyDays || '30D') : (t.all || 'All')}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="analytics-loading">
                    <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line></svg>
                </div>
            ) : data ? (
                <>
                    {/* Stat cards */}
                    <div className="analytics-stats">
                        <div className="analytics-stat">
                            <span className="analytics-stat-value">{data.totalPosts}</span>
                            <span className="analytics-stat-label">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                                {t.posts || 'Posts'}
                            </span>
                        </div>
                        <div className="analytics-stat">
                            <span className="analytics-stat-value">{data.totalLikes}</span>
                            <span className="analytics-stat-label" style={{color: '#ec4899'}}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                {t.likes || 'Likes'}
                            </span>
                        </div>
                        <div className="analytics-stat">
                            <span className="analytics-stat-value">{data.totalComments}</span>
                            <span className="analytics-stat-label">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                {t.comments || 'Comments'}
                            </span>
                        </div>
                        <div className="analytics-stat">
                            <span className="analytics-stat-value">{data.followerCount}</span>
                            <span className="analytics-stat-label">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                {t.followers || 'Followers'}
                            </span>
                        </div>
                    </div>

                    {/* Mini bar chart */}
                    <div className="analytics-chart">
                        <h4 className="analytics-chart-title">{t.activityThisWeek || t.activityChart || 'Activity This Week'}</h4>
                        <div className="analytics-bars">
                            {data.weeklyActivity.map((val, i) => (
                                <div key={i} className="analytics-bar-col">
                                    <div className="analytics-bar-track" title={`${dayLabels[i]}: ${val}`}>
                                        <div className="analytics-bar-fill" style={{ height: `${(val / maxActivity) * 100}%` }} />
                                    </div>
                                    <span className="analytics-bar-label">{dayLabels[i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Engagement rate */}
                    <div className="analytics-engagement">
                        <span className="analytics-eng-label" style={{color: '#ec4899'}}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
                            {t.engagementRate || 'Engagement Rate'}
                        </span>
                        <span className="analytics-eng-value" style={{color: '#10b981'}}>{data.engagementRate.toFixed(1)}%</span>
                    </div>

                    {/* Tips earned */}
                    <div className="analytics-tips">
                        <span className="analytics-tips-label" style={{color: '#f59e0b'}}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            {t.tipsEarned || 'Tips Earned'}
                        </span>
                        <span className="analytics-tips-value">
                            {(Number(data.totalTips) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} {t.banmao || 'BANMAO'}
                        </span>
                    </div>
                </>
            ) : null}
        </div>
    );
});

export default CreatorAnalytics;
