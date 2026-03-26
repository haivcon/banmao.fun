// ===== SCORE POPUPS COMPONENT =====
// Floating score popup animations when collecting items

import React from 'react';

export interface ScorePopup {
    id: number;
    x: number;
    y: number;
    value: number;
    type: 'coin' | 'power' | 'combo' | 'gas';
}

interface ScorePopupsProps {
    popups: ScorePopup[];
}

/**
 * Score popups component for displaying floating score animations
 */
export function ScorePopups({ popups }: ScorePopupsProps) {
    return (
        <>
            {popups.map(popup => (
                <div
                    key={popup.id}
                    className={`score-popup score-popup--${popup.type}`}
                    style={{ left: popup.x, top: popup.y }}
                >
                    +{popup.value}
                </div>
            ))}
        </>
    );
}

export default ScorePopups;
