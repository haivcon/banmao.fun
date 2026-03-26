/**
 * CountdownWidget — Sticky floating mini-timer
 * Appears at bottom when user scrolls past the main game timers
 */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatUnits } from "viem";

interface CountdownWidgetProps {
    softTimeLeft: bigint;
    hardTimeLeft: bigint;
    pool: bigint;
    isEnded: boolean;
    /** The element to observe — widget shows when this scrolls out of view */
    observeRef: React.RefObject<HTMLDivElement | null>;
    /** Offset from bottom for mobile bottom sheet */
    bottomOffset?: number;
}

function formatTime(seconds: number): string {
    if (seconds <= 0) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CountdownWidget({
    softTimeLeft,
    hardTimeLeft,
    pool,
    isEnded,
    observeRef,
    bottomOffset = 0,
}: CountdownWidgetProps) {
    const [visible, setVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Mobile detection
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    // IntersectionObserver — show widget when target is NOT visible
    useEffect(() => {
        const el = observeRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                // Show widget when the arena timers are scrolled out of view
                setVisible(!entry.isIntersecting);
            },
            { threshold: 0.1 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [observeRef]);

    // Scroll back to timers
    const scrollToTimers = useCallback(() => {
        observeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [observeRef]);

    const softSec = Number(softTimeLeft);
    const hardSec = Number(hardTimeLeft);
    const poolFormatted = Number(formatUnits(pool, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 });

    // Urgency colors
    const softColor = softSec <= 0 ? "#ef4444" : softSec < 300 ? "#f59e0b" : "#4ade80";
    const hardColor = hardSec <= 0 ? "#ef4444" : hardSec < 1800 ? "#f59e0b" : "#38bdf8";

    if (isEnded) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    onClick={scrollToTimers}
                    style={{
                        position: "fixed",
                        bottom: isMobile ? `${60 + bottomOffset}px` : `${16 + bottomOffset}px`,
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 9990,
                        display: "flex",
                        alignItems: "center",
                        gap: isMobile ? "8px" : "14px",
                        padding: isMobile ? "6px 12px" : "8px 20px",
                        background: "rgba(10, 10, 25, 0.92)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(255, 215, 0, 0.2)",
                        borderRadius: "999px",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 12px rgba(255,215,0,0.1)",
                        cursor: "pointer",
                        userSelect: "none",
                        whiteSpace: "nowrap",
                    }}
                >
                    {/* Soft timer */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                    }}>
                        <span style={{ fontSize: isMobile ? "11px" : "13px" }}>🐱</span>
                        <span style={{
                            fontSize: isMobile ? "11px" : "13px",
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: softColor,
                            minWidth: isMobile ? "42px" : "52px",
                        }}>
                            {formatTime(softSec)}
                        </span>
                    </div>

                    {/* Divider */}
                    <div style={{
                        width: "1px",
                        height: "16px",
                        background: "rgba(255,255,255,0.15)",
                    }} />

                    {/* Hard timer */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                    }}>
                        <span style={{ fontSize: isMobile ? "11px" : "13px" }}>⚡</span>
                        <span style={{
                            fontSize: isMobile ? "11px" : "13px",
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: hardColor,
                            minWidth: isMobile ? "42px" : "52px",
                        }}>
                            {formatTime(hardSec)}
                        </span>
                    </div>

                    {/* Divider */}
                    <div style={{
                        width: "1px",
                        height: "16px",
                        background: "rgba(255,255,255,0.15)",
                    }} />

                    {/* Jackpot */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                    }}>
                        <span style={{ fontSize: isMobile ? "11px" : "13px" }}>🍌</span>
                        <span style={{
                            fontSize: isMobile ? "10px" : "12px",
                            fontWeight: 700,
                            color: "#ffd700",
                        }}>
                            {poolFormatted}
                        </span>
                    </div>

                    {/* Scroll hint */}
                    <span style={{
                        fontSize: "9px",
                        color: "rgba(255,255,255,0.3)",
                        marginLeft: "2px",
                    }}>
                        ↑
                    </span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
