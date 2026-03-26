// ===== COMBO COUNTER COMPONENT =====
// Displays combo multiplier during gameplay

import React from 'react';

interface ComboCounterProps {
    combo: number;
    isPlaying: boolean;
}

/**
 * Combo counter component that shows combo multiplier
 */
export function ComboCounter({ combo, isPlaying }: ComboCounterProps) {
    if (combo <= 1 || !isPlaying) return null;

    return (
        <div className={`combo-counter ${combo >= 5 ? 'combo-counter--high' : ''}`}>
            🔥 {combo}x COMBO!
        </div>
    );
}

export default ComboCounter;
