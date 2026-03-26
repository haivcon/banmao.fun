// ===== MILESTONE NOTIFICATION COMPONENT =====
// Compact professional achievement notifications

import React, { useEffect, useState } from 'react';
import { SnakeStrings } from '../lib/i18n';

export interface MilestoneData {
    id: number;
    type: 'score' | 'highscore' | 'combo' | 'claim' | 'level';
    value: number;
    message?: string;
}

interface MilestoneNotificationProps {
    milestone: MilestoneData | null;
    t: SnakeStrings;
    onDismiss: () => void;
}

// Shorter display durations - quick and non-intrusive
const DISPLAY_DURATIONS: Record<MilestoneData['type'], number> = {
    score: 1500,      // 1.5s for score milestones
    highscore: 2000,  // 2s for new high score
    combo: 1200,      // 1.2s for combo
    claim: 2000,      // 2s for claim success
    level: 1800,      // 1.8s for level up
};

/**
 * Compact milestone notification - appears at top-right corner
 * Quick, non-intrusive, professional
 */
export function MilestoneNotification({ milestone, t, onDismiss }: MilestoneNotificationProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (milestone) {
            setIsVisible(true);
            setIsExiting(false);

            const duration = DISPLAY_DURATIONS[milestone.type] || 1500;

            // Start exit animation before fully dismissing
            const exitTimer = setTimeout(() => {
                setIsExiting(true);
            }, duration - 300);

            // Fully dismiss
            const dismissTimer = setTimeout(() => {
                setIsVisible(false);
                onDismiss();
            }, duration);

            return () => {
                clearTimeout(exitTimer);
                clearTimeout(dismissTimer);
            };
        }
    }, [milestone, onDismiss]);

    if (!milestone || !isVisible) return null;

    // Get icon and colors based on type
    const getTypeStyles = () => {
        switch (milestone.type) {
            case 'highscore':
                return {
                    icon: '🏆',
                    bg: 'rgba(251, 191, 36, 0.9)',
                    border: '#fbbf24',
                    title: t.newHighScore || 'NEW HIGH SCORE!',
                };
            case 'score':
                return {
                    icon: '⭐',
                    bg: 'rgba(168, 85, 247, 0.9)',
                    border: '#a855f7',
                    title: t.scoreMilestone || 'SCORE MILESTONE!',
                };
            case 'combo':
                return {
                    icon: '🔥',
                    bg: 'rgba(249, 115, 22, 0.9)',
                    border: '#f97316',
                    title: t.comboBonus || 'COMBO BONUS!',
                };
            case 'claim':
                return {
                    icon: '💰',
                    bg: 'rgba(74, 222, 128, 0.9)',
                    border: '#4ade80',
                    title: t.claimSuccess || 'CLAIM SUCCESS!',
                };
            case 'level':
                return {
                    icon: '🚀',
                    bg: 'rgba(34, 211, 238, 0.9)',
                    border: '#22d3ee',
                    title: t.levelUp || 'LEVEL UP!',
                };
            default:
                return {
                    icon: '🎉',
                    bg: 'rgba(168, 85, 247, 0.9)',
                    border: '#a855f7',
                    title: 'ACHIEVEMENT!',
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div
            className={`milestone-notification ${isExiting ? 'milestone-notification--exit' : ''}`}
            style={{
                position: 'fixed',
                top: 100,
                right: 1300,
                padding: '8px 14px',
                background: styles.bg,
                borderRadius: 10,
                border: `1px solid ${styles.border}`,
                boxShadow: `0 4px 16px rgba(0,0,0,0.3)`,
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                maxWidth: 200,
                animation: isExiting
                    ? 'milestoneSlideOut 0.3s ease-out forwards'
                    : 'milestoneSlideIn 0.3s ease-out forwards',
            }}
        >
            {/* Icon */}
            <span style={{ fontSize: 18, lineHeight: 1 }}>
                {styles.icon}
            </span>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Title */}
                <span
                    style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.9)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                    }}
                >
                    {styles.title}
                </span>

                {/* Value */}
                <span
                    style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                    }}
                >
                    {milestone.type === 'score' || milestone.type === 'highscore'
                        ? `${milestone.value} ${t.points || 'pts'}`
                        : milestone.type === 'combo'
                            ? `x${milestone.value}`
                            : milestone.value.toLocaleString()
                    }
                </span>
            </div>

            {/* CSS for animations */}
            <style>{`
                @keyframes milestoneSlideIn {
                    0% {
                        opacity: 0;
                        transform: translateX(50px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes milestoneSlideOut {
                    0% {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(50px);
                    }
                }
            `}</style>
        </div>
    );
}

export default MilestoneNotification;
