/**
 * WinPredictionBar Component
 * Shows visual prediction of which timer wins (SOFT vs HARD)
 * V11 Updated: Correct percentages matching contract logic
 * SOFT WIN: 100% pool → 75% winner + 25% top10
 * HARD WIN: 30% → seed, 70% remaining → 75% winner + 25% top10
 */
"use client";

import React from "react";
import { motion } from "framer-motion";

interface WinPredictionBarProps {
    softTimeLeft: bigint;
    hardTimeLeft: bigint;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t?: any;
}

export default function WinPredictionBar({
    softTimeLeft,
    hardTimeLeft,
    t,
}: WinPredictionBarProps) {
    const softSecs = Number(softTimeLeft);
    const hardSecs = Number(hardTimeLeft);

    // Calculate which timer is winning
    const totalTime = softSecs + hardSecs;
    const softProgress = totalTime > 0 ? (softSecs / totalTime) * 100 : 50;
    const hardProgress = 100 - softProgress;

    // Determine current prediction
    const predictedWin = softSecs <= hardSecs ? "soft" : "hard";

    // Colors
    const softColor = "#22d3ee"; // Cyan
    const hardColor = "#ef4444"; // Red

    if (softSecs === 0 || hardSecs === 0) {
        return null; // Don't show when one timer is done
    }

    return (
        <div className="win-prediction-container">
            <div className="prediction-header">
                <span className="prediction-label">Win Prediction</span>
                <span
                    className="prediction-value"
                    style={{ color: predictedWin === "soft" ? softColor : hardColor }}
                >
                    {predictedWin === "soft"
                        ? (t?.softWinPrediction || "SOFT WIN → 75% Winner + 25% Top 10")
                        : (t?.hardWinPrediction || "HARD WIN → 52.5% Winner + 17.5% Top 10")}
                </span>
            </div>

            <div className="prediction-bar-container">
                {/* Soft Timer Side */}
                <motion.div
                    className="prediction-bar soft"
                    style={{ backgroundColor: softColor }}
                    animate={{ width: `${softProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <span className="bar-label">😸 SOFT</span>
                </motion.div>

                {/* Hard Timer Side */}
                <motion.div
                    className="prediction-bar hard"
                    style={{ backgroundColor: hardColor }}
                    animate={{ width: `${hardProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                >
                    <span className="bar-label">⚡ HARD</span>
                </motion.div>
            </div>

            {/* Explanations */}
            <div className="prediction-footer">
                <span className="timer-hint soft" title={t?.softWinPrediction || 'Soft win: 100% pool split to Winner (75%) + Top 10 (25%)'}>
                    🐱 {t?.softWinFooter || '100% Pool'}
                </span>
                <span className="timer-hint hard" title={t?.hardWinPrediction || 'Hard win: 30% → seed, 70% remaining split to Winner + Top 10'}>
                    ⚡ {t?.hardWinFooter || '70% Pool (30% → Seed)'}
                </span>
            </div>
        </div>
    );
}
