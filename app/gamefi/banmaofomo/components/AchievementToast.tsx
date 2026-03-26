/**
 * AchievementToast - Notification for unlocked achievements
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Achievement, getRarityColor } from "../lib/achievements";
import { fireAchievementConfetti } from "./Confetti";

interface AchievementToastProps {
    achievement: Achievement | null;
    onClose: () => void;
}

export function AchievementToast({ achievement, onClose }: AchievementToastProps) {
    useEffect(() => {
        if (achievement) {
            // Fire confetti
            fireAchievementConfetti();

            // Auto close after 5 seconds
            const timer = setTimeout(onClose, 5000);
            return () => clearTimeout(timer);
        }
    }, [achievement, onClose]);

    return (
        <AnimatePresence>
            {achievement && (
                <motion.div
                    initial={{ opacity: 0, y: -100, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -50, scale: 0.8 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="achievement-toast"
                    style={{
                        borderColor: getRarityColor(achievement.rarity),
                    }}
                    onClick={onClose}
                >
                    <div className="achievement-icon">
                        {achievement.icon}
                    </div>
                    <div className="achievement-content">
                        <div className="achievement-header">
                            <span className="achievement-unlocked">🏆 Achievement Unlocked!</span>
                            <span
                                className="achievement-rarity"
                                style={{ color: getRarityColor(achievement.rarity) }}
                            >
                                {achievement.rarity.toUpperCase()}
                            </span>
                        </div>
                        <div className="achievement-name">{achievement.name}</div>
                        <div className="achievement-desc">{achievement.description}</div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Hook for achievement management
export function useAchievements() {
    const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);

    const showAchievement = useCallback((achievement: Achievement) => {
        setPendingAchievement(achievement);
    }, []);

    const clearAchievement = useCallback(() => {
        setPendingAchievement(null);
    }, []);

    return {
        pendingAchievement,
        showAchievement,
        clearAchievement,
    };
}

export default AchievementToast;
