// ===== BACK BUTTON COMPONENT =====
// Navigation button to return to GameFi hub

import React from 'react';

interface BackButtonProps {
    onClick: () => void;
    onHover?: () => void;
    label?: string;
}

/**
 * Back to GameFi button with hover effects
 */
export function BackButton({ onClick, onHover, label = '← GameFi' }: BackButtonProps) {
    return (
        <button
            style={{
                padding: '14px 22px',
                borderRadius: 99,
                border: '1px solid rgba(34,211,238,0.3)',
                background: 'linear-gradient(145deg, rgba(34,211,238,0.15), rgba(34,211,238,0.05))',
                color: '#22d3ee',
                fontSize: 18,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s'
            }}
            className="hover-btn"
            onMouseEnter={onHover}
            onClick={onClick}
        >
            {label}
        </button>
    );
}

export default BackButton;
