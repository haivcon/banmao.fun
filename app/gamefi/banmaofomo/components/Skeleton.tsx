/**
 * Skeleton Loading Components
 * Provides visual placeholders while data is loading
 */
"use client";

import React from "react";
import { motion } from "framer-motion";

// Base skeleton with shimmer animation
export function Skeleton({
    width = "100%",
    height = "20px",
    borderRadius = "8px",
    className = ""
}: {
    width?: string | number;
    height?: string | number;
    borderRadius?: string;
    className?: string;
}) {
    return (
        <motion.div
            className={`skeleton ${className}`}
            style={{
                width,
                height,
                borderRadius,
                background: "linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)",
                backgroundSize: "200% 100%",
            }}
            animate={{
                backgroundPosition: ["200% 0", "-200% 0"],
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
            }}
        />
    );
}

// Skeleton for jackpot display
export function JackpotSkeleton() {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            padding: "48px 64px",
            background: "rgba(20, 20, 30, 0.85)",
            borderRadius: "24px",
            border: "1px solid rgba(255, 215, 0, 0.2)",
        }}>
            <Skeleton width="120px" height="16px" />
            <Skeleton width="280px" height="64px" />
            <Skeleton width="100px" height="20px" />
        </div>
    );
}

// Skeleton for panel (Attack, Claim, etc.)
export function PanelSkeleton({ lines = 4 }: { lines?: number }) {
    return (
        <div style={{
            padding: "24px",
            background: "rgba(20, 20, 30, 0.85)",
            borderRadius: "24px",
            border: "1px solid rgba(255, 215, 0, 0.2)",
        }}>
            {/* Title */}
            <Skeleton width="150px" height="24px" borderRadius="12px" />

            {/* Content lines */}
            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {Array.from({ length: lines }).map((_, i) => (
                    <Skeleton
                        key={i}
                        width={`${70 + Math.random() * 30}%`}
                        height="40px"
                        borderRadius="20px"
                    />
                ))}
            </div>

            {/* Button */}
            <div style={{ marginTop: "24px" }}>
                <Skeleton width="100%" height="52px" borderRadius="26px" />
            </div>
        </div>
    );
}

// Skeleton for countdown timer
export function CountdownSkeleton() {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
            padding: "20px",
            background: "rgba(20, 20, 30, 0.85)",
            borderRadius: "24px",
            border: "1px solid rgba(255, 215, 0, 0.2)",
        }}>
            <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Skeleton width="60px" height="60px" borderRadius="50%" />
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <Skeleton width="80px" height="24px" />
                        <Skeleton width="60px" height="16px" />
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Skeleton width="60px" height="60px" borderRadius="50%" />
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <Skeleton width="80px" height="24px" />
                        <Skeleton width="60px" height="16px" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Skeleton for leaderboard row
export function LeaderboardRowSkeleton() {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 16px",
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: "12px",
        }}>
            <Skeleton width="24px" height="24px" borderRadius="50%" />
            <Skeleton width="120px" height="16px" />
            <div style={{ marginLeft: "auto" }}>
                <Skeleton width="60px" height="16px" />
            </div>
        </div>
    );
}

// Skeleton for attack history row
export function AttackHistoryRowSkeleton() {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 14px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
        }}>
            <Skeleton width="32px" height="32px" borderRadius="50%" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <Skeleton width="100px" height="14px" />
                <Skeleton width="60px" height="12px" />
            </div>
            <Skeleton width="40px" height="20px" borderRadius="10px" />
        </div>
    );
}

// Full page loading skeleton
export function GamePageSkeleton() {
    return (
        <div style={{
            minHeight: "100vh",
            background: "#0a0a0f",
            padding: "24px",
        }}>
            {/* Header skeleton */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 24px",
                marginBottom: "24px",
            }}>
                <Skeleton width="200px" height="32px" />
                <div style={{ display: "flex", gap: "16px" }}>
                    <Skeleton width="100px" height="36px" borderRadius="18px" />
                    <Skeleton width="140px" height="36px" borderRadius="18px" />
                </div>
            </div>

            {/* Hero section */}
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "32px",
                marginBottom: "32px",
            }}>
                <JackpotSkeleton />
                <Skeleton width="280px" height="280px" borderRadius="24px" />
                <CountdownSkeleton />
            </div>

            {/* Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
                maxWidth: "1400px",
                margin: "0 auto",
            }}>
                <PanelSkeleton lines={4} />
                <PanelSkeleton lines={3} />
                <PanelSkeleton lines={5} />
                <PanelSkeleton lines={4} />
            </div>
        </div>
    );
}

export default Skeleton;
