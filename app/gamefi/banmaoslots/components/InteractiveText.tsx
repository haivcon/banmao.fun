'use client';

import React, { useState } from 'react';

// Robust component for interactive text effects
export function InteractiveText({ children, style, className, onClick }: { children: React.ReactNode; style?: React.CSSProperties; className?: string; onClick?: () => void }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className={className}
            onClick={onClick}
            style={{
                transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                display: 'inline-block',
                cursor: onClick ? 'pointer' : 'default',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                textShadow: isHovered ? '0 0 10px currentColor' : 'none',
                filter: isHovered ? 'brightness(1.3)' : 'none',
                zIndex: isHovered ? 10 : 'auto',
                position: 'relative',
                ...style
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}
        </div>
    );
}
