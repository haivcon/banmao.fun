/**
 * TimerExplanation - Tooltips explaining Soft/Hard timers
 * Shows realtime impact of gifts on timers
 */
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TimerTooltipProps {
    type: "soft" | "hard";
    currentTime: number; // seconds remaining
    giftCount?: number;
}

// Format seconds to h:m:s
function formatTime(seconds: number): string {
    if (seconds <= 0) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export function TimerTooltip({ type, currentTime, giftCount = 1 }: TimerTooltipProps) {
    const [isOpen, setIsOpen] = useState(false);

    const isSoft = type === "soft";
    const timeReduction = 30 * giftCount; // 30s per gift
    const newHardTime = Math.max(0, currentTime - timeReduction);

    return (
        <div className="timer-tooltip-container">
            <button
                className="timer-info-btn"
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                onClick={() => setIsOpen(!isOpen)}
            >
                ❓
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={`timer-tooltip ${type}`}
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    >
                        {isSoft ? (
                            <>
                                <div className="tooltip-header soft">
                                    <span className="tooltip-icon">🐱</span>
                                    <span className="tooltip-title">Mood Timer (Soft)</span>
                                </div>
                                <div className="tooltip-body">
                                    <p><strong>Cách hoạt động:</strong></p>
                                    <ul>
                                        <li>Mỗi lần tặng quà → Timer reset về <strong>6 giờ</strong></li>
                                        <li>Không ai tặng trong 6h → Timer về 0</li>
                                    </ul>
                                    <p><strong>Khi Timer = 0:</strong></p>
                                    <div className="tooltip-win-info soft-win">
                                        🎉 SOFT WIN! Giải thưởng <strong>100%</strong>
                                        <br />👑 75% cho Đại Gia (người cuối cùng)
                                        <br />🏆 25% chia cho Top 10
                                    </div>
                                    <p className="tooltip-example">
                                        💡 <em>Ví dụ: Jackpot 100K → Đại Gia: 75K, Top 10 chia 25K</em>
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="tooltip-header hard">
                                    <span className="tooltip-icon">⚡</span>
                                    <span className="tooltip-title">Departure Timer (Hard)</span>
                                </div>
                                <div className="tooltip-body">
                                    <p><strong>Cách hoạt động:</strong></p>
                                    <ul>
                                        <li>Bắt đầu: <strong>120 giờ</strong> (5 ngày)</li>
                                        <li>Mỗi quà GIẢM: <strong>30 giây</strong></li>
                                        <li>Không thể reset, chỉ giảm!</li>
                                    </ul>

                                    {/* Live Impact Preview */}
                                    <div className="timer-impact-preview">
                                        <p><strong>📊 Tác động khi tặng {giftCount} quà:</strong></p>
                                        <div className="impact-row">
                                            <span>⚡ Hiện tại:</span>
                                            <span>{formatTime(currentTime)}</span>
                                        </div>
                                        <div className="impact-row reduction">
                                            <span>➖ Giảm:</span>
                                            <span className="reduction-text">−{formatTime(timeReduction)}</span>
                                        </div>
                                        <div className="impact-row result">
                                            <span>➡️ Còn lại:</span>
                                            <span className="result-text">{formatTime(newHardTime)}</span>
                                        </div>
                                    </div>

                                    <p><strong>Khi Timer = 0:</strong></p>
                                    <div className="tooltip-win-info hard-win">
                                        ⚡ HARD WIN! Giải thưởng <strong>70%</strong>
                                        <br />👑 52.5% cho Đại Gia | 🏆 17.5% Top 10
                                        <br />🔄 30% chuyển vòng sau
                                    </div>
                                    <p className="tooltip-example">
                                        💡 <em>Ví dụ: Jackpot 100K → Đại Gia: 52.5K, Top 10: 17.5K, Vòng sau: 30K</em>
                                    </p>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Inline Impact Display (next to gift count slider)
export function GiftImpactPreview({
    giftCount,
    hardTimeRemaining,
    attackCost = 2000
}: {
    giftCount: number;
    hardTimeRemaining: number;
    attackCost?: number;
}) {
    const totalCost = giftCount * attackCost;
    const timeReduction = 30 * giftCount;
    const newTime = Math.max(0, hardTimeRemaining - timeReduction);

    return (
        <div className="gift-impact-preview">
            <div className="impact-item">
                <span className="impact-label">💰 Chi phí:</span>
                <span className="impact-value">{totalCost.toLocaleString()} $BANMAO</span>
            </div>
            <div className="impact-item">
                <span className="impact-label">⚡ Hard Timer giảm:</span>
                <span className="impact-value reduction">−{formatTime(timeReduction)}</span>
            </div>
            <div className="impact-item">
                <span className="impact-label">📍 Soft Timer reset:</span>
                <span className="impact-value">6 giờ</span>
            </div>
            {newTime === 0 && (
                <div className="impact-item win-alert">
                    <span className="impact-label">🎯 Kết quả:</span>
                    <span className="impact-value win">THẮNG NGAY! ⚡</span>
                </div>
            )}
        </div>
    );
}

export default TimerTooltip;
