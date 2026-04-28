'use client';
import React, { useState, useEffect, memo } from 'react';

interface Quest {
    id: string;
    title: string;
    icon: string;
    description: string;
    target: number;
    progress: number;
    reward: number;
    completed: boolean;
    type: 'daily' | 'weekly';
}

interface MiniQuestsProps {
    t: Record<string, string>;
    address?: string;
}

/* ── SVG Icons ── */
const IconTarget = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);
const IconSun = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
);
const IconCalendarWeek = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="18"/><line x1="16" y1="14" x2="16" y2="18"/></svg>
);
const IconCheckCircle = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

// Map quest IDs to professional SVG icons
const questIconMap: Record<string, React.ReactNode> = {
    post_today: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
    like_3: <svg width="20" height="20" viewBox="0 0 24 24" fill="#f43f5e" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>,
    comment_1: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    checkin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>,
    post_5_week: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    like_20_week: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 9 7 12 7s5-3 7.5-3a2.5 2.5 0 010 5H18"/><path d="M6 9v10a2 2 0 002 2h8a2 2 0 002-2V9"/><path d="M6 9h12"/></svg>,
    tip_1_week: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    streak_7: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>,
};

const MiniQuests = memo(function MiniQuests({ t, address }: MiniQuestsProps) {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

    useEffect(() => {
        if (!address) return;
        setLoading(true);
        fetch(`/api/hub/quests?address=${address}`)
            .then(r => r.json())
            .then(data => setQuests(data.quests || []))
            .catch(() => {
                // Fallback: show default quests
                setQuests([
                    { id: 'post_today', title: 'Share a Post', icon: '', description: 'Create a post today', target: 1, progress: 0, reward: 20, completed: false, type: 'daily' },
                    { id: 'like_3', title: 'Show Love', icon: '', description: 'Like 3 posts', target: 3, progress: 0, reward: 10, completed: false, type: 'daily' },
                    { id: 'comment_1', title: 'Join the Chat', icon: '', description: 'Leave a comment', target: 1, progress: 0, reward: 15, completed: false, type: 'daily' },
                    { id: 'checkin', title: 'Daily Check-in', icon: '', description: 'Complete daily check-in', target: 1, progress: 0, reward: 10, completed: false, type: 'daily' },
                    { id: 'post_5_week', title: 'Weekly Creator', icon: '', description: 'Create 5 posts this week', target: 5, progress: 0, reward: 100, completed: false, type: 'weekly' },
                    { id: 'like_20_week', title: 'Community Champion', icon: '', description: 'Like 20 posts this week', target: 20, progress: 0, reward: 50, completed: false, type: 'weekly' },
                    { id: 'tip_1_week', title: 'Generous Tipper', icon: '', description: 'Send a tip this week', target: 1, progress: 0, reward: 75, completed: false, type: 'weekly' },
                    { id: 'streak_7', title: '7-Day Streak', icon: '', description: 'Maintain a 7-day check-in streak', target: 7, progress: 0, reward: 200, completed: false, type: 'weekly' },
                ]);
            })
            .finally(() => setLoading(false));
    }, [address]);

    // Translation map: quest id -> { title key, desc key }
    const questI18n: Record<string, { title: string; desc: string }> = {
        post_today: { title: t.questSharePost, desc: t.questSharePostDesc },
        like_3: { title: t.questShowLove, desc: t.questShowLoveDesc },
        comment_1: { title: t.questJoinChat, desc: t.questJoinChatDesc },
        checkin: { title: t.questDailyCheckin, desc: t.questDailyCheckinDesc },
        post_5_week: { title: t.questWeeklyCreator, desc: t.questWeeklyCreatorDesc },
        like_20_week: { title: t.questCommunityChampion, desc: t.questCommunityChampionDesc },
        tip_1_week: { title: t.questGenerousTipper, desc: t.questGenerousTipperDesc },
        streak_7: { title: t.quest7DayStreak, desc: t.quest7DayStreakDesc },
    };

    const filtered = quests.filter(q => q.type === activeTab);
    const completedCount = filtered.filter(q => q.completed).length;

    if (!address) return null;

    return (
        <div className="quests-card">
            <div className="quests-header">
                <h3 className="quests-title"><IconTarget /> {t.quests || 'Quests'}</h3>
                <span className="quests-progress">{completedCount}/{filtered.length}</span>
            </div>

            <div className="quests-tabs">
                <button className={`quests-tab ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>
                    <IconSun /> {t.daily || 'Daily'}
                </button>
                <button className={`quests-tab ${activeTab === 'weekly' ? 'active' : ''}`} onClick={() => setActiveTab('weekly')}>
                    <IconCalendarWeek /> {t.weekly || 'Weekly'}
                </button>
            </div>

            <div className="quests-list">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="quest-item quest-skeleton" />
                    ))
                ) : (
                    filtered.map(quest => (
                        <div key={quest.id} className={`quest-item ${quest.completed ? 'quest-completed' : ''}`}>
                            <span className="quest-icon">{questIconMap[quest.id] || quest.icon}</span>
                            <div className="quest-info">
                                <span className="quest-name">{questI18n[quest.id]?.title || quest.title}</span>
                                <span className="quest-desc">{questI18n[quest.id]?.desc || quest.description}</span>
                                <div className="quest-progress-bar">
                                    <div
                                        className="quest-progress-fill"
                                        style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }}
                                    />
                                </div>
                                <span className="quest-progress-text">{quest.progress}/{quest.target}</span>
                            </div>
                            <div className="quest-reward">
                                {quest.completed ? <IconCheckCircle /> : `+${quest.reward} XP`}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

export default MiniQuests;
