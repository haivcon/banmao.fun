// ===== SUPER MODE BADGE COMPONENT =====
// Displays super mode indicator during gameplay

import React from 'react';
import { S } from '../lib/styles';

interface SuperModeBadgeProps {
    superMode: boolean;
    isPlaying: boolean;
    label?: string;
}

/**
 * Super Mode Badge component - shows when X Layer power-up is active
 */
export function SuperModeBadge({ superMode, isPlaying, label = 'X LAYER' }: SuperModeBadgeProps) {
    if (!superMode || !isPlaying) return null;

    return (
        <div style={S.superBadge}>
            <span>⚡</span> {label} <span>⚡</span>
        </div>
    );
}

export default SuperModeBadge;
