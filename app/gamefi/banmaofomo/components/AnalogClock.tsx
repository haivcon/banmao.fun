/**
 * CountdownClock - Premium Progress Ring + Digital Display
 * Multi-layer SVG ring with gradient glow + clean digital countdown
 */
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

interface CountdownClockProps {
    contractSeconds: number;
    maxSeconds: number;
    label: string;
    subLabel: string;
    color: string;
    colorEnd?: string; // gradient end color
    urgency: "normal" | "warning" | "critical";
    id: string; // Unique ID for SVG definitions
    ghostSeconds?: number; // Preview position (semi-transparent ghost)
    ghostColor?: string; // Ghost ring color
    onTimeUp?: () => void; // Called once when timer reaches 0
}

function formatTime(seconds: number): { h: number; m: number; s: number } {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return { h, m, s };
}

export default function CountdownClock({
    contractSeconds,
    maxSeconds,
    label,
    subLabel,
    color,
    colorEnd,
    urgency,
    id,
    ghostSeconds,
    ghostColor,
    onTimeUp,
}: CountdownClockProps) {
    const [displaySeconds, setDisplaySeconds] = useState(Math.max(0, contractSeconds));
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const firedTimeUpRef = useRef(false);
    const endColor = colorEnd || color;

    // Sync to contract state
    useEffect(() => {
        const newVal = Math.max(0, contractSeconds);
        setDisplaySeconds(newVal);
        // Reset the fired flag when contract pushes new positive time
        if (newVal > 0) firedTimeUpRef.current = false;
    }, [contractSeconds]);

    // Local 1s countdown
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setDisplaySeconds((prev) => {
                const next = Math.max(0, prev - 1);
                if (next === 0 && prev > 0 && !firedTimeUpRef.current) {
                    firedTimeUpRef.current = true;
                    onTimeUp?.();
                }
                return next;
            });
        }, 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [onTimeUp]);

    const time = useMemo(() => formatTime(displaySeconds), [displaySeconds]);
    const progress = maxSeconds > 0 ? Math.min(1, displaySeconds / maxSeconds) : 0;

    // SVG ring params — responsive size
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    const size = isMobile ? 110 : 140;
    const cx = size / 2;
    const R = isMobile ? 46 : 60;
    const circumference = 2 * Math.PI * R;
    const offset = circumference * (1 - progress);

    // Unique ID for SVG definitions (prevents collision)
    const uid = id;
    const glowColor = urgency === "critical" ? "#ef4444" : color;

    // Marker dot position
    const angle = 2 * Math.PI * progress - Math.PI / 2;
    const mx = cx + R * Math.cos(angle);
    const my = cx + R * Math.sin(angle);

    const pulseClass =
        urgency === "critical" ? "cd-critical" : urgency === "warning" ? "cd-warning" : "";

    const digital = `${String(time.h).padStart(2, "0")}:${String(time.m).padStart(2, "0")}:${String(time.s).padStart(2, "0")}`;

    return (
        <div className={`cd-wrapper ${pulseClass}`}>
            {/* Label */}
            <div className="cd-label" style={{ color }}>{label}</div>

            {/* Ring + Digital */}
            <div className="cd-container" style={{ width: size, height: size }}>
                <svg viewBox={`0 0 ${size} ${size}`} className="cd-svg">
                    <defs>
                        {/* Progress gradient */}
                        <linearGradient id={`pg-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={color} />
                            <stop offset="100%" stopColor={endColor} />
                        </linearGradient>

                        {/* Glow filter */}
                        <filter id={`gl-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                            <feGaussianBlur stdDeviation="3.5" result="b" />
                            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>

                        {/* Heavy glow for outer aura */}
                        <filter id={`og-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
                            <feGaussianBlur stdDeviation="8" result="b" />
                            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    </defs>

                    {/* Dark backdrop */}
                    <circle cx={cx} cy={cx} r={R + 6} fill="rgba(8,8,18,0.5)" />

                    {/* Track ring */}
                    <circle cx={cx} cy={cx} r={R} fill="none"
                        stroke="rgba(255,255,255,0.04)" strokeWidth="6" />

                    {/* Outer aura (wide, faint) */}
                    <circle cx={cx} cy={cx} r={R} fill="none"
                        stroke={glowColor} strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        transform={`rotate(-90 ${cx} ${cx})`} opacity="0.08"
                        filter={`url(#og-${uid})`}
                        style={{ transition: "stroke-dashoffset 1s linear" }}
                    />

                    {/* Mid glow layer */}
                    <circle cx={cx} cy={cx} r={R} fill="none"
                        stroke={color} strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        transform={`rotate(-90 ${cx} ${cx})`} opacity="0.15"
                        filter={`url(#gl-${uid})`}
                        style={{ transition: "stroke-dashoffset 1s linear" }}
                    />

                    {/* Main progress ring */}
                    <circle cx={cx} cy={cx} r={R} fill="none"
                        stroke={`url(#pg-${uid})`} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        transform={`rotate(-90 ${cx} ${cx})`}
                        filter={`url(#gl-${uid})`}
                        style={{ transition: "stroke-dashoffset 1s linear" }}
                    />

                    {/* Bright tip cap */}
                    <circle cx={cx} cy={cx} r={R} fill="none"
                        stroke="#fff" strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={`2 ${circumference - 2}`}
                        strokeDashoffset={offset}
                        transform={`rotate(-90 ${cx} ${cx})`} opacity="0.5"
                        style={{ transition: "stroke-dashoffset 1s linear" }}
                    />

                    {/* Marker dot */}
                    {progress > 0.005 && (
                        <>
                            <circle cx={mx} cy={my} r="7" fill={glowColor} opacity="0.2"
                                filter={`url(#og-${uid})`}
                                style={{ transition: "cx 1s linear, cy 1s linear" }} />
                            <circle cx={mx} cy={my} r="4" fill={glowColor} opacity="0.8"
                                style={{ transition: "cx 1s linear, cy 1s linear" }} />
                            <circle cx={mx} cy={my} r="2" fill="#fff" opacity="0.9"
                                style={{ transition: "cx 1s linear, cy 1s linear" }} />
                        </>
                    )}

                    {/* Inner decorative ring */}
                    <circle cx={cx} cy={cx} r={R - 8} fill="none"
                        stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                </svg>

                {/* Digital Display */}
                <div className="cd-digital" style={{
                    color: glowColor,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div style={{ fontSize: isMobile ? '13px' : '18px', fontWeight: 800, lineHeight: 1.1, marginBottom: '1px', letterSpacing: '-0.5px' }}>
                        {digital}
                    </div>
                    <div style={{ fontSize: isMobile ? '8px' : '11px', opacity: 0.8, fontWeight: 700 }}>
                        {displaySeconds.toLocaleString()}s
                    </div>
                    {/* Predicted time after gift */}
                    {ghostSeconds !== undefined && (() => {
                        const gs = Math.max(0, ghostSeconds);
                        const gh = Math.floor(gs / 3600);
                        const gm = Math.floor((gs % 3600) / 60);
                        const gss = gs % 60;
                        const ghostDigital = `${String(gh).padStart(2, '0')}:${String(gm).padStart(2, '0')}:${String(gss).padStart(2, '0')}`;
                        const gColor = ghostColor || '#22c55e';
                        const isIncrease = gs > displaySeconds;
                        return (
                            <div style={{
                                fontSize: isMobile ? '7.5px' : '10px',
                                fontWeight: 700,
                                color: gColor,
                                marginTop: '1px',
                                opacity: 0.9,
                                letterSpacing: '-0.3px',
                            }}>
                                → {ghostDigital} {isIncrease ? '▲' : '▼'}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Sub label */}
            <div className="cd-sublabel">{subLabel}</div>
        </div>
    );
}
