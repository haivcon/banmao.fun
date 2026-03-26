"use client";

import React, { useState, useEffect, useRef } from 'react';

interface SafetyButtonProps {
    onConfirm: () => void;
    label: string;
    confirmLabel?: string;
    className?: string;
    disabled?: boolean;
    duration?: number; // ms to hold
}

export const SafetyButton: React.FC<SafetyButtonProps> = ({
    onConfirm,
    label,
    confirmLabel = "Release to Confirm",
    className = "",
    disabled = false,
    duration = 2000
}) => {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    const startHolding = () => {
        if (disabled) return;
        setIsHolding(true);
        startTimeRef.current = Date.now();
        setProgress(0);

        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const newProgress = Math.min((elapsed / duration) * 100, 100);
            setProgress(newProgress);

            if (newProgress >= 100) {
                if (intervalRef.current) clearInterval(intervalRef.current);
            }
        }, 50); // check frequent enough for smooth animation
    };

    const stopHolding = () => {
        if (!isHolding) return;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed >= duration && !disabled) {
            onConfirm();
            // Reset after confirm
            setProgress(0);
        } else {
            // Cancelled
            setProgress(0);
        }
        setIsHolding(false);
    };

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <button
            className={`admin-safety-btn ${className} ${disabled ? 'disabled' : ''}`}
            onMouseDown={startHolding}
            onMouseUp={stopHolding}
            onMouseLeave={stopHolding}
            onTouchStart={startHolding}
            onTouchEnd={stopHolding}
            disabled={disabled}
            style={{ position: 'relative', overflow: 'hidden' }} // Ensure overflow hidden for fill
        >
            {/* Background Fill */}
            <div
                className="safety-fill"
                style={{
                    width: `${progress}%`,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    transition: isHolding ? 'width 0.05s linear' : 'width 0.2s ease-out'
                }}
            />

            <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                {isHolding && progress < 100 && <span className="admin-spinner-xs"></span>}
                {isHolding ? (progress >= 100 ? "✅ Ready!" : `Hold ${((duration - (Date.now() - startTimeRef.current)) / 1000).toFixed(1)}s`) : label}
            </span>
        </button>
    );
};
