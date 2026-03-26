/**
 * DualCountdownTimer Component
 * Displays two timers: Soft (Nian Timer) + Hard (Global Doom)
 * Premium VFX with Framer Motion - Dual Timer Edition
 */
"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedSprite from "./AnimatedSprite";
import { LocaleStrings } from "../lib/i18n/types";
import { URGENCY_THRESHOLDS } from "../lib/constants";
import type { UrgencyLevel } from "../lib/types";
import { startTickTock, stopTickTock } from "../lib/sounds";

// Sprite paths
const HOURGLASS_SPRITE = "/gamefi/banmaofomo/sprites/banmao_hourglass.png";
const PORTAL_SPRITE = "/gamefi/banmaofomo/sprites/banmao_portal.png";

// Time decrease per attack (from contract)
const TIME_DECREASE_STEP = 30; // 30 seconds per attack

// Floating Time Decrease Component - shows "-30s" flying up
function FloatingTimeDecrease({
    attackCount,
    decreaseAmount = TIME_DECREASE_STEP
}: {
    attackCount: number;
    decreaseAmount?: number;
}) {
    const [floaters, setFloaters] = React.useState<{ id: number; count: number }[]>([]);
    const lastCountRef = React.useRef(attackCount);

    React.useEffect(() => {
        if (attackCount > lastCountRef.current) {
            const attacksDelta = attackCount - lastCountRef.current;
            const totalDecrease = attacksDelta * decreaseAmount;

            // Add new floater
            const newFloater = {
                id: Date.now(),
                count: totalDecrease,
            };
            setFloaters(prev => [...prev, newFloater]);

            // Remove after animation completes
            setTimeout(() => {
                setFloaters(prev => prev.filter(f => f.id !== newFloater.id));
            }, 1500);
        }
        lastCountRef.current = attackCount;
    }, [attackCount, decreaseAmount]);

    return (
        <AnimatePresence>
            {floaters.map(floater => (
                <motion.div
                    key={floater.id}
                    initial={{ opacity: 1, y: 0, scale: 1 }}
                    animate={{
                        opacity: 0,
                        y: -60,
                        scale: 1.3,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        fontSize: "24px",
                        fontWeight: 800,
                        color: "#ef4444",
                        textShadow: "0 0 10px rgba(239, 68, 68, 0.8), 0 0 20px rgba(239, 68, 68, 0.5)",
                        zIndex: 100,
                        pointerEvents: "none",
                        whiteSpace: "nowrap",
                    }}
                >
                    -{floater.count}s ⏱️
                </motion.div>
            ))}
        </AnimatePresence>
    );
}

interface CountdownTimerProps {
    softTimeLeft: bigint;
    hardTimeLeft: bigint;
    isEnded: boolean;
    t: LocaleStrings;
    onTimeUp?: () => void;
    /** Total attacks count - used to trigger time decrease animation */
    attackCount?: number;
    /** V11: Claim expiration time in seconds */
    claimExpirationTime?: number;
    /** V11: Whether we're in timeout danger zone */
    isInTimeoutDanger?: boolean;
    /** V11: Seconds remaining until timeout */
    timeoutCountdown?: number;
}

export default function CountdownTimer({
    softTimeLeft: softTimeBigInt,
    hardTimeLeft: hardTimeBigInt,
    isEnded,
    t,
    onTimeUp,
    attackCount = 0,
}: CountdownTimerProps) {
    const [softTime, setSoftTime] = useState<number>(Number(softTimeBigInt));
    const [hardTime, setHardTime] = useState<number>(Number(hardTimeBigInt));
    const tickingRef = useRef(false);

    useEffect(() => {
        setSoftTime(Number(softTimeBigInt));
        setHardTime(Number(hardTimeBigInt));
    }, [softTimeBigInt, hardTimeBigInt]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSoftTime(prev => Math.max(0, prev - 1));
            setHardTime(prev => Math.max(0, prev - 1));

            // Start tick-tock sound when soft timer < 60 seconds
            const minTime = Math.min(softTime, hardTime);
            if (minTime <= 60 && minTime > 0 && !tickingRef.current) {
                startTickTock();
                tickingRef.current = true;
            } else if ((minTime > 60 || minTime === 0) && tickingRef.current) {
                stopTickTock();
                tickingRef.current = false;
            }

            if (minTime === 0 && !isEnded) {
                onTimeUp?.();
            }
        }, 1000);

        return () => {
            clearInterval(interval);
            stopTickTock();
            tickingRef.current = false;
        };
    }, [isEnded, onTimeUp, softTime, hardTime]);

    const softUrgency = useMemo((): UrgencyLevel => {
        if (isEnded || softTime === 0) return "ended";
        if (softTime > URGENCY_THRESHOLDS.SAFE) return "safe";
        if (softTime > URGENCY_THRESHOLDS.WARNING) return "warning";
        return "danger";
    }, [softTime, isEnded]);

    const hardUrgency = useMemo((): UrgencyLevel => {
        if (isEnded || hardTime === 0) return "ended";
        if (hardTime > URGENCY_THRESHOLDS.SAFE * 4) return "safe"; // Hard timer is much longer
        if (hardTime > URGENCY_THRESHOLDS.WARNING * 4) return "warning";
        return "danger";
    }, [hardTime, isEnded]);

    // Which timer is more urgent determines the win type
    const primaryTimer = softTime <= hardTime ? "soft" : "hard";

    const formatTime = (seconds: number): { h: number; m: number; s: number } => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return { h, m, s };
    };

    const softFormatted = formatTime(softTime);
    const hardFormatted = formatTime(hardTime);

    // Progress circles
    const softMaxTime = 6 * 60 * 60; // 6 hours
    const hardMaxTime = 120 * 60 * 60; // 120 hours
    const softProgress = Math.min(softTime / softMaxTime, 1);
    const hardProgress = Math.min(hardTime / hardMaxTime, 1);
    const circumference = 2 * Math.PI * 45;
    const softStrokeDashoffset = circumference * (1 - softProgress);
    const hardStrokeDashoffset = circumference * (1 - hardProgress);

    const TimerDisplay = ({ time, label, urgency, strokeOffset, color, timerType }: {
        time: { h: number; m: number; s: number };
        label: string;
        urgency: UrgencyLevel;
        strokeOffset: number;
        color: string;
        timerType: 'soft' | 'hard';
    }) => {
        // Calculate dot position at the end of the progress arc
        const progress = 1 - (strokeOffset / circumference);
        const angle = (progress * 2 * Math.PI) - (Math.PI / 2); // Start from top (-90°)
        const dotX = 50 + 45 * Math.cos(angle);
        const dotY = 50 + 45 * Math.sin(angle);

        return (
            <div className={`dual-timer-card urgency-${urgency}`}>
                <svg className="countdown-circle mini" viewBox="0 0 100 100" style={{ position: 'relative' }}>
                    <circle className="countdown-bg" cx="50" cy="50" r="45" fill="none" strokeWidth="4" />
                    <motion.circle
                        className="countdown-progress"
                        cx="50" cy="50" r="45" fill="none" strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeOffset}
                        transform="rotate(-90 50 50)"
                        style={{ stroke: color }}
                        animate={urgency === "danger" ? {
                            stroke: [color, "#ff0000", color],
                            filter: [`drop-shadow(0 0 5px ${color})`, "drop-shadow(0 0 10px #ff0000)", `drop-shadow(0 0 5px ${color})`]
                        } : {}}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                    />
                    {/* Trail dot at arc tip */}
                    {progress > 0.01 && (
                        <motion.circle
                            cx={dotX}
                            cy={dotY}
                            r={urgency === "danger" ? 4 : 3}
                            fill={urgency === "danger" ? "#ff0000" : color}
                            animate={urgency === "danger" ? {
                                r: [3, 5, 3],
                                opacity: [0.8, 1, 0.8],
                            } : {}}
                            transition={{ repeat: Infinity, duration: 0.6 }}
                            style={{
                                filter: `drop-shadow(0 0 ${urgency === "danger" ? 8 : 4}px ${urgency === "danger" ? "#ff0000" : color})`,
                            }}
                        />
                    )}
                </svg>
                <div className="timer-values">
                    <motion.div
                        className="countdown-time compact"
                        animate={urgency === "danger" ? { color: ["#ef4444", "#ff8888", "#ef4444"] } : {}}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                        {time.h > 0 && <span>{time.h.toString().padStart(2, "0")}:</span>}
                        <span>{time.m.toString().padStart(2, "0")}:</span>
                        <span className="time-seconds">{time.s.toString().padStart(2, "0")}</span>
                    </motion.div>
                    <div className="timer-label">{label}</div>
                </div>
            </div>
        );
    };

    const isCritical = softUrgency === "danger" || hardUrgency === "danger";

    return (
        <motion.div
            className={`dual-countdown-wrapper ${primaryTimer === "soft" ? "soft-primary" : "hard-primary"} ${isCritical ? "is-critical" : ""}`}
            data-tour="fomo-timers"
            animate={isCritical ? { scale: [1, 1.01, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
        >
            <AnimatePresence mode="wait">
                {isEnded ? (
                    <motion.div
                        className="countdown-ended dual"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <span className="countdown-ended-text">{t.roundEnded}</span>
                    </motion.div>
                ) : softTime === 0 || hardTime === 0 ? (
                    <motion.div
                        className="countdown-finalize dual"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>
                            {softTime === 0 ? "🎯 SOFT WIN!" : "⚡ HARD WIN!"}
                        </motion.span>
                    </motion.div>
                ) : (
                    <div className="dual-timers">
                        {/* Soft Timer - Mood Timer */}
                        <div className={`timer-section soft urgency-${softUrgency}`}>
                            <div className="timer-header">
                                <AnimatedSprite
                                    src={HOURGLASS_SPRITE}
                                    alt="Timer"
                                    width={40}
                                    height={40}
                                    preset={["swing", "glow"]}
                                    glowColor="cyan"
                                />
                                <span className="timer-title">{t.softTimer || "Mood Timer"}</span>
                            </div>
                            <TimerDisplay
                                time={softFormatted}
                                label={t.softTimerHint || "Reset on each attack"}
                                urgency={softUrgency}
                                strokeOffset={softStrokeDashoffset}
                                color="#fbbf24"
                                timerType="soft"
                            />
                            <div className="win-type">
                                {t.softWin || "SOFT WIN"}: <span className="highlight">80%</span> {t.toWinner || "to winner"}
                            </div>
                        </div>

                        <div className="timer-separator">
                            <span className="vs-badge">VS</span>
                        </div>

                        {/* Hard Timer - Departure Timer */}
                        <div className={`timer-section hard urgency-${hardUrgency}`} style={{ position: "relative" }}>
                            {/* Floating Time Decrease Effect */}
                            <FloatingTimeDecrease attackCount={attackCount} />

                            <div className="timer-header">
                                <AnimatedSprite
                                    src={PORTAL_SPRITE}
                                    alt="Portal"
                                    width={40}
                                    height={40}
                                    preset={["pulse", "glow"]}
                                    glowColor="purple"
                                />
                                <span className="timer-title">{t.hardTimer || "Departure Timer"}</span>
                            </div>
                            <TimerDisplay
                                time={hardFormatted}
                                label={t.hardTimerHint || "Shrinks with each attack"}
                                urgency={hardUrgency}
                                strokeOffset={hardStrokeDashoffset}
                                color="#ef4444"
                                timerType="hard"
                            />
                            <div className="win-type">
                                {t.hardWin || "HARD WIN"}: <span className="highlight">40%</span> {t.toWinner || "to winner"}
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Danger pulse overlay */}
            <AnimatePresence>
                {(softUrgency === "danger" || hardUrgency === "danger") && !isEnded && (
                    <motion.div
                        className="countdown-pulse dual"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.05, 1] }}
                        exit={{ opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
