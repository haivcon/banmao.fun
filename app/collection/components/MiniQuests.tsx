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
                    { id: 'post_today', title: 'Share a Post', icon: '📸', description: 'Create a post today', target: 1, progress: 0, reward: 20, completed: false, type: 'daily' },
                    { id: 'like_3', title: 'Show Love', icon: '❤️', description: 'Like 3 posts', target: 3, progress: 0, reward: 10, completed: false, type: 'daily' },
                    { id: 'comment_1', title: 'Join the Chat', icon: '💬', description: 'Leave a comment', target: 1, progress: 0, reward: 15, completed: false, type: 'daily' },
                    { id: 'checkin', title: 'Daily Check-in', icon: '📅', description: 'Complete daily check-in', target: 1, progress: 0, reward: 10, completed: false, type: 'daily' },
                    { id: 'post_5_week', title: 'Weekly Creator', icon: '🌟', description: 'Create 5 posts this week', target: 5, progress: 0, reward: 100, completed: false, type: 'weekly' },
                    { id: 'like_20_week', title: 'Community Champion', icon: '🏅', description: 'Like 20 posts this week', target: 20, progress: 0, reward: 50, completed: false, type: 'weekly' },
                    { id: 'tip_1_week', title: 'Generous Tipper', icon: '💰', description: 'Send a tip this week', target: 1, progress: 0, reward: 75, completed: false, type: 'weekly' },
                    { id: 'streak_7', title: '7-Day Streak', icon: '🔥', description: 'Maintain a 7-day check-in streak', target: 7, progress: 0, reward: 200, completed: false, type: 'weekly' },
                ]);
            })
            .finally(() => setLoading(false));
    }, [address]);

    const filtered = quests.filter(q => q.type === activeTab);
    const completedCount = filtered.filter(q => q.completed).length;

    if (!address) return null;

    return (
        <div className="quests-card">
            <div className="quests-header">
                <h3 className="quests-title">⚔️ {t.quests || 'Quests'}</h3>
                <span className="quests-progress">{completedCount}/{filtered.length}</span>
            </div>

            <div className="quests-tabs">
                <button className={`quests-tab ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>
                    📅 {t.daily || 'Daily'}
                </button>
                <button className={`quests-tab ${activeTab === 'weekly' ? 'active' : ''}`} onClick={() => setActiveTab('weekly')}>
                    📆 {t.weekly || 'Weekly'}
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
                            <span className="quest-icon">{quest.icon}</span>
                            <div className="quest-info">
                                <span className="quest-name">{quest.title}</span>
                                <span className="quest-desc">{quest.description}</span>
                                <div className="quest-progress-bar">
                                    <div
                                        className="quest-progress-fill"
                                        style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }}
                                    />
                                </div>
                                <span className="quest-progress-text">{quest.progress}/{quest.target}</span>
                            </div>
                            <div className="quest-reward">
                                {quest.completed ? '✅' : `+${quest.reward} XP`}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

export default MiniQuests;
