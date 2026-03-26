'use client';
import React, { useState, useCallback, memo } from 'react';

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '😮', '🐱', '👏'];

interface ReactionPickerProps {
    postId: number;
    currentReaction?: string | null;
    reactionCounts?: Record<string, number>;
    address?: string;
    onReaction?: (postId: number, emoji: string, reacted: boolean, counts: Record<string, number>) => void;
}

const ReactionPicker = memo(function ReactionPicker({
    postId,
    currentReaction,
    reactionCounts = {},
    address,
    onReaction
}: ReactionPickerProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

    const handleReaction = useCallback(async (emoji: string) => {
        if (!address || loading) return;
        setLoading(true);
        setShowPicker(false);
        try {
            const res = await fetch('/api/hub/reactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, address, emoji })
            });
            const data = await res.json();
            if (data.success) {
                onReaction?.(postId, emoji, data.reacted, data.counts);
            }
        } catch { } finally {
            setLoading(false);
        }
    }, [postId, address, loading, onReaction]);

    // Top 3 reactions to display inline
    const topReactions = Object.entries(reactionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    return (
        <div className="reaction-wrap" onMouseLeave={() => setShowPicker(false)}>
            {/* Main button — show top reactions or heart */}
            <button
                className={`hub-action reaction-btn ${currentReaction ? 'reaction-active' : ''}`}
                onClick={() => {
                    // On mobile, toggle picker. On desktop, act on current reaction.
                    if ('ontouchstart' in window) {
                        setShowPicker(prev => !prev);
                    } else {
                        currentReaction ? handleReaction(currentReaction) : handleReaction('❤️');
                    }
                }}
                onMouseEnter={() => setShowPicker(true)}
            >
                {topReactions.length > 0 ? (
                    <span className="reaction-inline-emojis">
                        {topReactions.map(([emoji]) => (
                            <span key={emoji} className="reaction-inline-emoji">{emoji}</span>
                        ))}
                    </span>
                ) : (
                    currentReaction || '❤️'
                )}
                <span className="hub-action-count">{totalReactions || 0}</span>
            </button>

            {/* Picker popup */}
            {showPicker && (
                <div className="reaction-picker" onMouseLeave={() => setShowPicker(false)}>
                    {REACTION_EMOJIS.map(emoji => (
                        <button
                            key={emoji}
                            className={`reaction-picker-btn ${currentReaction === emoji ? 'reaction-picker-active' : ''}`}
                            onClick={() => handleReaction(emoji)}
                            title={emoji}
                        >
                            {emoji}
                            {reactionCounts[emoji] ? (
                                <span className="reaction-picker-count">{reactionCounts[emoji]}</span>
                            ) : null}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
});

export default ReactionPicker;
