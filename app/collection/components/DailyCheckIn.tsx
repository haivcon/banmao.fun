'use client';
import React, { useState, useEffect, useCallback, memo } from 'react';

interface DailyCheckInProps {
    t: Record<string, string>;
    address?: string;
}

/* ── SVG Icons ── */
const IconCalendar = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);
const IconFlame = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-4.97 0-9-3.58-9-8 0-3.07 2.17-5.86 4-7.55V5a1 1 0 011.6-.8l1.55 1.16A8.81 8.81 0 0112 2a8.81 8.81 0 011.85 3.36L15.4 4.2A1 1 0 0117 5v2.45c1.83 1.69 4 4.48 4 7.55 0 4.42-4.03 8-9 8zm0-18a6.89 6.89 0 00-1 2.4A1 1 0 019.4 8L8 6.85C6.53 8.4 5 10.65 5 15c0 3.31 3.13 6 7 6s7-2.69 7-6c0-4.35-1.53-6.6-3-8.15L14.6 8A1 1 0 0113 7.4 6.89 6.89 0 0012 5z"/></svg>
);
const IconCheck = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const IconPaw = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35C7 17.5 3 13.4 3 9.5 3 6.42 5.42 4 8.5 4c1.74 0 3.41.81 4.5 2.09C14.09 4.81 15.76 4 17.5 4 20.58 4 23 6.42 23 9.5c0 3.9-4 8-11 11.85z" opacity="0.8"/><ellipse cx="8" cy="6" rx="2" ry="2.5" fill="currentColor"/><ellipse cx="16" cy="6" rx="2" ry="2.5" fill="currentColor"/><ellipse cx="5" cy="10" rx="1.8" ry="2.2" fill="currentColor"/><ellipse cx="19" cy="10" rx="1.8" ry="2.2" fill="currentColor"/><ellipse cx="12" cy="14" rx="3.5" ry="3" fill="currentColor"/></svg>
);

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

    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
        <div className="checkin-card">
            <div className="checkin-header">
                <h3 className="checkin-title"><IconCalendar /> {t.dailyCheckIn}</h3>
                {streak > 0 && (
                    <span className="checkin-streak">
                        <IconFlame /> {streak} {t.dayStreak}
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
                            <span className={`checkin-day-circle ${isChecked ? 'checkin-day-circle-done' : ''}`}>
                                {isChecked && <IconCheck />}
                            </span>
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
                    ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> {t.checkedIn}</>
                    : loading
                        ? <><svg className="checkin-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 019.95 9"/></svg> ...</>
                        : <><IconPaw /> {t.checkInNow}</>
                }
            </button>

            {/* Reward animation */}
            {showReward && (
                <div className="checkin-reward">
                    <span className="checkin-reward-text">+{streak * 10} XP</span>
                </div>
            )}
        </div>
    );
});

export default DailyCheckIn;
