'use client';
import React, { useState, useEffect, useCallback, memo } from 'react';

interface DailyCheckInProps {
    t: Record<string, string>;
    address?: string;
}

const DailyCheckIn = memo(function DailyCheckIn({ t, address }: DailyCheckInProps) {
    const [streak, setStreak] = useState(0);
    const [checkedToday, setCheckedToday] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showReward, setShowReward] = useState(false);
    const [history, setHistory] = useState<number[]>([]); // last 7 days

    useEffect(() => {
        if (!address) return;
        fetch(`/api/hub/checkin?address=${address}`)
            .then(r => r.json())
            .then(data => {
                setStreak(data.streak || 0);
                setCheckedToday(data.checkedToday || false);
                setHistory(data.history || []);
            })
            .catch(() => {});
    }, [address]);

    const handleCheckIn = useCallback(async () => {
        if (!address || checkedToday || loading) return;
        setLoading(true);
        try {
            const res = await fetch('/api/hub/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address })
            });
            const data = await res.json();
            if (data.success) {
                setStreak(data.streak);
                setCheckedToday(true);
                setShowReward(true);
                setTimeout(() => setShowReward(false), 3000);
            }
        } catch { } finally {
            setLoading(false);
        }
    }, [address, checkedToday, loading]);

    if (!address) return null;

    const streakEmojis = ['🔥', '🔥🔥', '🔥🔥🔥', '💎🔥', '💎💎🔥', '⚡💎🔥', '🏆⚡💎'];
    const streakIcon = streak > 0 ? (streakEmojis[Math.min(streak, streakEmojis.length) - 1] || '🔥') : '🔥';
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
        <div className="checkin-card">
            <div className="checkin-header">
                <h3 className="checkin-title">📅 {t.dailyCheckIn || 'Daily Check-in'}</h3>
                {streak > 0 && (
                    <span className="checkin-streak">
                        {streakIcon} {streak} {t.dayStreak || 'day streak'}
                    </span>
                )}
            </div>

            {/* 7-day calendar */}
            <div className="checkin-calendar">
                {days.map((day, i) => {
                    const isChecked = history.includes(i);
                    return (
                        <div key={i} className={`checkin-day ${isChecked ? 'checkin-day-done' : ''}`}>
                            <span className="checkin-day-label">{day}</span>
                            <span className="checkin-day-icon">{isChecked ? '✅' : '⬜'}</span>
                        </div>
                    );
                })}
            </div>

            <button
                className={`checkin-btn ${checkedToday ? 'checkin-btn-done' : ''}`}
                onClick={handleCheckIn}
                disabled={checkedToday || loading}
            >
                {checkedToday
                    ? `✅ ${t.checkedIn || 'Checked In!'}`
                    : loading
                        ? '⏳...'
                        : `🐾 ${t.checkInNow || 'Check In Now'}`
                }
            </button>

            {/* Reward animation */}
            {showReward && (
                <div className="checkin-reward">
                    <span className="checkin-reward-text">+{streak * 10} XP 🎉</span>
                </div>
            )}
        </div>
    );
});

export default DailyCheckIn;
