/**
 * OnboardingTooltips - First-time user tutorial with step-by-step highlights
 * Addresses: Onboarding/tutorial for new users
 */
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    targetSelector?: string;
    position: "top" | "bottom" | "left" | "right" | "center";
}

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: "welcome",
        title: "🎮 Welcome to BanMaoFomo!",
        description: "This is a FOMO3D-style game where the last attacker wins the jackpot! Let me show you around.",
        position: "center",
    },
    {
        id: "jackpot",
        title: "💰 The Jackpot",
        description: "This is the prize pool. It grows with every attack and goes to the winner!",
        targetSelector: ".jackpot-display",
        position: "bottom",
    },
    {
        id: "timers",
        title: "⏱️ Dual Timers",
        description: "SOFT timer resets with each attack. HARD timer is the absolute deadline. When either hits 0, the last attacker wins!",
        targetSelector: ".dual-countdown-wrapper",
        position: "bottom",
    },
    {
        id: "attack",
        title: "⚔️ Attack Panel",
        description: "Spend $BANMAO tokens to attack. More attacks = more chances. You also get a Lucky Number that can unlock bonuses!",
        targetSelector: ".attack-panel",
        position: "right",
    },
    {
        id: "claim",
        title: "🎁 Claim Rewards",
        description: "If you win or earn referral bonuses, claim them here!",
        targetSelector: ".claim-panel",
        position: "left",
    },
    {
        id: "complete",
        title: "🚀 You're Ready!",
        description: "Connect your wallet, get some $BANMAO, and start attacking! Good luck! 🍀",
        position: "center",
    },
];

const STORAGE_KEY = "fomo_onboarding_complete";

export function OnboardingTooltips() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    // Check if onboarding should show
    useEffect(() => {
        const completed = localStorage.getItem(STORAGE_KEY);
        if (!completed) {
            // Small delay to let page render first
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    // Update target element rect
    useEffect(() => {
        if (!isVisible) return;

        const step = ONBOARDING_STEPS[currentStep];
        if (step.targetSelector) {
            const el = document.querySelector(step.targetSelector);
            if (el) {
                setTargetRect(el.getBoundingClientRect());
            } else {
                setTargetRect(null);
            }
        } else {
            setTargetRect(null);
        }
    }, [currentStep, isVisible]);

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleSkip = () => {
        handleComplete();
    };

    const handleComplete = () => {
        localStorage.setItem(STORAGE_KEY, "true");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    const step = ONBOARDING_STEPS[currentStep];
    const isCenter = step.position === "center" || !targetRect;

    // Calculate tooltip position
    const getTooltipStyle = (): React.CSSProperties => {
        if (isCenter || !targetRect) {
            return {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            };
        }

        const padding = 20;
        const tooltipWidth = 320;
        const tooltipHeight = 200;

        switch (step.position) {
            case "bottom":
                return {
                    position: "fixed",
                    top: targetRect.bottom + padding,
                    left: Math.max(padding, Math.min(
                        targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
                        window.innerWidth - tooltipWidth - padding
                    )),
                };
            case "top":
                return {
                    position: "fixed",
                    top: targetRect.top - tooltipHeight - padding,
                    left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
                };
            case "left":
                return {
                    position: "fixed",
                    top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
                    left: targetRect.left - tooltipWidth - padding,
                };
            case "right":
                return {
                    position: "fixed",
                    top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
                    left: targetRect.right + padding,
                };
            default:
                return {};
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0, 0, 0, 0.75)",
                            zIndex: 9990,
                        }}
                    />

                    {/* Highlight target element */}
                    {targetRect && !isCenter && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                position: "fixed",
                                top: targetRect.top - 8,
                                left: targetRect.left - 8,
                                width: targetRect.width + 16,
                                height: targetRect.height + 16,
                                border: "3px solid #ffd700",
                                borderRadius: "20px",
                                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 30px rgba(255, 215, 0, 0.5)",
                                zIndex: 9991,
                                pointerEvents: "none",
                            }}
                        />
                    )}

                    {/* Tooltip */}
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ type: "spring", damping: 20 }}
                        style={{
                            ...getTooltipStyle(),
                            width: "320px",
                            background: "linear-gradient(135deg, rgba(255, 107, 53, 0.1), rgba(20, 20, 30, 0.98))",
                            border: "2px solid rgba(255, 215, 0, 0.5)",
                            borderRadius: "20px",
                            padding: "24px",
                            zIndex: 9992,
                            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
                        }}
                    >
                        {/* Title */}
                        <h3 style={{
                            margin: "0 0 12px 0",
                            fontSize: "18px",
                            fontWeight: 700,
                            color: "#ffd700",
                        }}>
                            {step.title}
                        </h3>

                        {/* Description */}
                        <p style={{
                            margin: "0 0 20px 0",
                            fontSize: "14px",
                            color: "#ccc",
                            lineHeight: 1.6,
                        }}>
                            {step.description}
                        </p>

                        {/* Progress dots */}
                        <div style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "8px",
                            marginBottom: "16px",
                        }}>
                            {ONBOARDING_STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: i === currentStep ? "24px" : "8px",
                                        height: "8px",
                                        borderRadius: "4px",
                                        background: i === currentStep ? "#ffd700" : "rgba(255, 255, 255, 0.2)",
                                        transition: "all 0.3s ease",
                                    }}
                                />
                            ))}
                        </div>

                        {/* Buttons */}
                        <div style={{
                            display: "flex",
                            gap: "12px",
                        }}>
                            <button
                                onClick={handleSkip}
                                style={{
                                    flex: 1,
                                    padding: "12px 16px",
                                    background: "transparent",
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                    borderRadius: "12px",
                                    color: "#888",
                                    fontSize: "14px",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                Skip
                            </button>
                            <button
                                onClick={handleNext}
                                style={{
                                    flex: 2,
                                    padding: "12px 16px",
                                    background: "linear-gradient(135deg, #ff6b35, #ffd700)",
                                    border: "none",
                                    borderRadius: "12px",
                                    color: "#000",
                                    fontSize: "14px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                            >
                                {currentStep < ONBOARDING_STEPS.length - 1 ? "Next →" : "Let's Go! 🚀"}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Reset onboarding (for testing or settings)
export function resetOnboarding() {
    localStorage.removeItem(STORAGE_KEY);
}

export default OnboardingTooltips;
