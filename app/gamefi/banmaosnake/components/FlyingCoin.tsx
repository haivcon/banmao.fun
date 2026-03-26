// ===== FLYING COIN ANIMATION COMPONENT =====
// Cinematic coin animation when claiming rewards

import React, { useEffect, useState } from 'react';

interface FlyingCoinProps {
    onComplete: () => void;
}

/**
 * Cinematic Flying Coin animation component
 * Animates a coin from center screen to the balance chip
 */
export function FlyingCoin({ onComplete }: FlyingCoinProps) {
    const [style, setStyle] = useState<React.CSSProperties>({
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%) scale(1)',
        fontSize: 64,
        zIndex: 9999,
        transition: 'all 1.5s cubic-bezier(0.25, 1, 0.5, 1)',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 0 30px #fbbf24)'
    });

    useEffect(() => {
        // Find target (balance chip element)
        const target = document.getElementById('balance-chip');
        if (target) {
            const rect = target.getBoundingClientRect();
            // Trigger animation next frame
            requestAnimationFrame(() => {
                setStyle(prev => ({
                    ...prev,
                    top: rect.top + rect.height / 2,
                    left: rect.left + rect.width / 2,
                    transform: 'translate(-50%, -50%) scale(0.2)',
                    opacity: 0
                }));
            });
        }
        const t = setTimeout(onComplete, 1500);
        return () => clearTimeout(t);
    }, [onComplete]);

    return <div style={style}>🪙</div>;
}

export default FlyingCoin;
