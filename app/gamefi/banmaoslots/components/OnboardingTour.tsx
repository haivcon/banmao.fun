"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SlotsTranslations } from '../lib/i18n';

interface TourStep {
    targetSelector: string;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    handAnimation: 'point' | 'click' | 'swipe';
}

interface OnboardingTourProps {
    isOpen: boolean;
    onClose: () => void;
    t: SlotsTranslations;
    onOpenPool1?: () => void; // Callback to open Pool #1 slot machine
}

// Get tour steps using i18n
const getTourSteps = (t: SlotsTranslations): TourStep[] => [
    {
        targetSelector: '[data-tour="wallet-connect"]',
        title: t.tourWalletConnectTitle,
        description: t.tourWalletConnectDesc,
        position: 'bottom',
        handAnimation: 'click'
    },
    {
        targetSelector: '[data-tour="language-selector"]',
        title: t.tourLanguageTitle,
        description: t.tourLanguageDesc,
        position: 'bottom',
        handAnimation: 'click'
    },
    {
        targetSelector: '[data-tour="balance-display"]',
        title: t.tourBalanceTitle,
        description: t.tourBalanceDesc,
        position: 'bottom',
        handAnimation: 'point'
    },
    {
        targetSelector: '[data-tour="pool-search"]',
        title: t.tourSearchTitle,
        description: t.tourSearchDesc,
        position: 'bottom',
        handAnimation: 'click'
    },
    {
        targetSelector: '[data-tour="slot-machines-area"]',
        title: t.tourAreaTitle,
        description: t.tourAreaDesc,
        position: 'bottom',
        handAnimation: 'point'
    },
    {
        targetSelector: '[data-tour="slot-machine-window"]',
        title: t.tourWindowTitle,
        description: t.tourWindowDesc,
        position: 'left',
        handAnimation: 'point'
    },
    {
        targetSelector: '[data-tour="pool-info"]',
        title: t.tourPoolInfoTitle,
        description: t.tourPoolInfoDesc,
        position: 'left',
        handAnimation: 'point'
    },
    {
        targetSelector: '[data-tour="reels-area"]',
        title: t.tourReelsTitle,
        description: t.tourReelsDesc,
        position: 'left',
        handAnimation: 'point'
    },
    {
        targetSelector: '[data-tour="spin-count"]',
        title: t.tourSpinCountTitle,
        description: t.tourSpinCountDesc,
        position: 'left',
        handAnimation: 'click'
    },
    {
        targetSelector: '[data-tour="bet-input"]',
        title: t.tourBetTitle,
        description: t.tourBetDesc,
        position: 'left',
        handAnimation: 'click'
    },
    {
        targetSelector: '[data-tour="spin-button"]',
        title: t.tourSpinBtnTitle,
        description: t.tourSpinBtnDesc,
        position: 'left',
        handAnimation: 'click'
    },
    {
        targetSelector: '[data-tour="seed-input"]',
        title: t.tourSeedTitle,
        description: t.tourSeedDesc,
        position: 'left',
        handAnimation: 'point'
    },
    {
        targetSelector: '[data-tour="history-section"]',
        title: t.tourHistoryTitle,
        description: t.tourHistoryDesc,
        position: 'left',
        handAnimation: 'point'
    },
    {
        targetSelector: '[data-tour="dock-trigger"]',
        title: t.tourDockTitle,
        description: t.tourDockDesc,
        position: 'top',
        handAnimation: 'click'
    }
];

// LocalStorage key for tour preference
const ONBOARDING_DISMISSED_KEY = 'banmao_slots_onboarding_dismissed';

// Check if onboarding should be shown (exported for page.tsx to use)
export function shouldShowOnboarding(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(ONBOARDING_DISMISSED_KEY) !== 'true';
}

// Mark onboarding as dismissed
function dismissOnboarding(): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
    }
}

// Reset onboarding (for testing)
export function resetOnboarding(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    }
}

export default function OnboardingTour({ isOpen, onClose, t, onOpenPool1 }: OnboardingTourProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);
    const hasOpenedPool1 = useRef(false);

    // Mobile detection using screen.width (not affected by viewport scaling)
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const screenWidth = typeof window !== 'undefined' ? window.screen.width : 1920;
            setIsMobile(screenWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const steps = getTourSteps(t);
    const currentStepData = steps[currentStep];

    // Find and highlight target element
    const prevRectRef = useRef<DOMRect | null>(null);

    const updateTargetPosition = useCallback(() => {
        if (!currentStepData) return;

        const target = document.querySelector(currentStepData.targetSelector);
        if (target) {
            const rect = target.getBoundingClientRect();

            // Only update if rect actually changed (prevents infinite loop)
            const prevRect = prevRectRef.current;
            if (!prevRect ||
                Math.abs(prevRect.left - rect.left) > 1 ||
                Math.abs(prevRect.top - rect.top) > 1 ||
                Math.abs(prevRect.width - rect.width) > 1 ||
                Math.abs(prevRect.height - rect.height) > 1) {
                prevRectRef.current = rect;
                setTargetRect(rect);
            }

            // Scroll element into view if needed (only on first detect)
            if (!prevRect) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            prevRectRef.current = null;
            setTargetRect(null);
        }
    }, [currentStepData]);

    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
            hasOpenedPool1.current = false;
            updateTargetPosition();
        }
    }, [isOpen]);

    // Open Pool #1 slot machine when reaching the slot machine window step (index 5)
    useEffect(() => {
        if (isOpen && currentStep === 5 && onOpenPool1 && !hasOpenedPool1.current) {
            hasOpenedPool1.current = true;
            // Small delay to let the step transition complete
            setTimeout(() => {
                onOpenPool1();
                // Wait for the window to appear, then update position
                setTimeout(updateTargetPosition, 500);
            }, 100);
        }
    }, [isOpen, currentStep, onOpenPool1, updateTargetPosition]);

    // Re-find element with retry for nested elements (inside slot machine window)
    useEffect(() => {
        // Reset prevRectRef when step changes so scrollIntoView works for each step
        prevRectRef.current = null;

        updateTargetPosition();

        // Add multiple retries with delays for elements inside slot machine window
        const retryTimeouts: NodeJS.Timeout[] = [];

        // Steps 6-13 are inside the slot machine window, need extra time to find
        if (currentStep >= 6 && currentStep <= 13) {
            retryTimeouts.push(setTimeout(updateTargetPosition, 100));
            retryTimeouts.push(setTimeout(updateTargetPosition, 300));
            retryTimeouts.push(setTimeout(updateTargetPosition, 500));
            retryTimeouts.push(setTimeout(updateTargetPosition, 800)); // Extra retry for history section at bottom
        }

        // Add resize listener
        window.addEventListener('resize', updateTargetPosition);
        window.addEventListener('scroll', updateTargetPosition);

        return () => {
            retryTimeouts.forEach(clearTimeout);
            window.removeEventListener('resize', updateTargetPosition);
            window.removeEventListener('scroll', updateTargetPosition);
        };
    }, [currentStep, updateTargetPosition]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentStep(prev => prev + 1);
                setIsAnimating(false);
            }, 200);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentStep(prev => prev - 1);
                setIsAnimating(false);
            }, 200);
        }
    };

    const handleSkip = () => {
        if (dontShowAgain) {
            dismissOnboarding();
        }
        onClose();
    };

    const handleComplete = () => {
        if (dontShowAgain) {
            dismissOnboarding();
        }
        onClose();
    };

    if (!isOpen) return null;

    // Calculate tooltip position
    const getTooltipStyle = (): React.CSSProperties => {
        // On mobile, always center the tooltip at bottom of screen
        if (isMobile) {
            return {
                bottom: 195, // Above the dock
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '90vw'
            };
        }

        if (!targetRect) {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            };
        }

        const padding = 20;
        const tooltipWidth = 320;
        const tooltipHeight = 200;

        switch (currentStepData.position) {
            case 'top':
                return {
                    bottom: window.innerHeight - targetRect.top + padding,
                    left: targetRect.left + targetRect.width / 2,
                    transform: 'translateX(-50%)'
                };
            case 'bottom':
                return {
                    top: targetRect.bottom + padding,
                    left: targetRect.left + targetRect.width / 2,
                    transform: 'translateX(-50%)'
                };
            case 'left':
                return {
                    top: targetRect.top + targetRect.height / 2,
                    right: window.innerWidth - targetRect.left + padding,
                    transform: 'translateY(-50%)'
                };
            case 'right':
                return {
                    top: targetRect.top + targetRect.height / 2,
                    left: targetRect.right + padding,
                    transform: 'translateY(-50%)'
                };
            default:
                return {};
        }
    };

    // Calculate hand position - position hand OUTSIDE the element (bottom-right corner)
    const getHandStyle = (): React.CSSProperties => {
        if (!targetRect) return { display: 'none' };

        return {
            position: 'fixed',
            left: targetRect.right + 10, // To the right of the element
            top: targetRect.bottom + 10, // Below the element
            transform: 'translate(-50%, -50%) rotate(-30deg)',
            zIndex: 999003
        };
    };

    return (
        <>
            <style jsx global>{`
                @keyframes hand-bounce {
                    0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(-15deg); }
                    50% { transform: translate(-50%, -50%) translateY(-10px) rotate(-15deg); }
                }
                @keyframes hand-click {
                    0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(-15deg); }
                    50% { transform: translate(-50%, -50%) scale(0.9) rotate(-15deg); }
                }
                @keyframes hand-swipe {
                    0%, 100% { transform: translate(-50%, -50%) translateX(0) rotate(-15deg); }
                    50% { transform: translate(-50%, -50%) translateX(20px) rotate(-15deg); }
                }
                @keyframes spotlight-pulse {
                    0%, 100% { box-shadow: 0 0 0 4px rgba(0, 191, 255, 0.5), 0 0 20px rgba(0, 191, 255, 0.3); }
                    50% { box-shadow: 0 0 0 8px rgba(0, 191, 255, 0.3), 0 0 40px rgba(0, 191, 255, 0.5); }
                }
                @keyframes tooltip-appear {
                    0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                    100% { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>

            {/* Overlay */}
            <div
                ref={overlayRef}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 999000,
                    pointerEvents: 'none'
                }}
            >
                {/* Dark overlay with spotlight cutout */}
                <svg
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'auto'
                    }}
                    onClick={handleSkip}
                >
                    <defs>
                        <mask id="spotlight-mask">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {targetRect && (
                                <rect
                                    x={targetRect.left - 10}
                                    y={targetRect.top - 10}
                                    width={targetRect.width + 20}
                                    height={targetRect.height + 20}
                                    rx="12"
                                    fill="black"
                                />
                            )}
                        </mask>
                    </defs>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(0, 0, 0, 0.44)"
                        mask="url(#spotlight-mask)"
                    />
                </svg>

                {/* Spotlight border glow */}
                {targetRect && (
                    <div
                        style={{
                            position: 'fixed',
                            left: targetRect.left - 10,
                            top: targetRect.top - 10,
                            width: targetRect.width + 20,
                            height: targetRect.height + 20,
                            borderRadius: 12,
                            border: '3px solid #00BFFF',
                            animation: 'spotlight-pulse 2s ease-in-out infinite',
                            pointerEvents: 'none',
                            zIndex: 999001
                        }}
                    />
                )}

                {/* Pointing Hand */}
                {targetRect && (
                    <div
                        style={{
                            ...getHandStyle(),
                            fontSize: '48px',
                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                            animation: currentStepData.handAnimation === 'click'
                                ? 'hand-click 1s ease-in-out infinite'
                                : currentStepData.handAnimation === 'swipe'
                                    ? 'hand-swipe 1.5s ease-in-out infinite'
                                    : 'hand-bounce 1s ease-in-out infinite',
                            pointerEvents: 'none'
                        }}
                    >
                        👆
                    </div>
                )}

                {/* Tooltip */}
                <div
                    style={{
                        position: 'fixed',
                        ...getTooltipStyle(),
                        width: 320,
                        background: 'linear-gradient(135deg, rgba(0, 30, 50, 0.03) 0%, rgba(0, 20, 40, 0.98) 100%)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 20,
                        border: '2px solid rgba(0, 191, 255, 0.5)',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 191, 255, 0.2)',
                        padding: 20,
                        zIndex: 999002,
                        pointerEvents: 'auto',
                        animation: isAnimating ? 'none' : 'tooltip-appear 0.3s ease-out',
                        opacity: isAnimating ? 0 : 1
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Progress */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: 4
                        }}>
                            {steps.map((_, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        width: idx === currentStep ? 20 : 8,
                                        height: 8,
                                        borderRadius: 4,
                                        background: idx === currentStep
                                            ? 'linear-gradient(90deg, #00BFFF, #00FF88)'
                                            : idx < currentStep
                                                ? '#22c55e'
                                                : 'rgba(255,255,255,0.2)',
                                        transition: 'all 0.3s'
                                    }}
                                />
                            ))}
                        </div>
                        <span style={{
                            fontSize: 12,
                            color: '#00BFFF',
                            fontFamily: "'Space Mono', monospace"
                        }}>
                            {currentStep + 1}/{steps.length}
                        </span>
                    </div>

                    {/* Title */}
                    <h3 style={{
                        margin: '0 0 8px 0',
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#00BFFF',
                        fontFamily: "'Space Mono', monospace",
                        textTransform: 'uppercase',
                        textShadow: '0 0 10px rgba(0, 191, 255, 0.5)'
                    }}>
                        {currentStepData.title}
                    </h3>

                    {/* Description */}
                    <div style={{
                        margin: '0 0 16px 0',
                        fontSize: 13,
                        lineHeight: 1.7,
                        color: '#e2e8f0'
                    }}>
                        {currentStepData.description.split('\n').map((line, idx) => (
                            <div key={idx} style={{
                                marginBottom: line.startsWith('•') ? 4 : 8,
                                paddingLeft: line.startsWith('•') ? 8 : 0
                            }}>
                                {line}
                            </div>
                        ))}
                    </div>

                    {/* Navigation */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10
                    }}>
                        {/* Don't show again checkbox */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            color: '#94a3b8',
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}>
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                style={{
                                    width: 14,
                                    height: 14,
                                    accentColor: '#00BFFF',
                                    cursor: 'pointer'
                                }}
                            />
                            {t.tourDontShowAgain}
                        </label>

                        <div style={{ display: 'flex', gap: 8 }}>
                            {currentStep > 0 && (
                                <button
                                    onClick={handlePrev}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: 9999,
                                        color: '#e2e8f0',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    ← {t.tourBack}
                                </button>
                            )}
                            <button
                                onClick={currentStep === steps.length - 1 ? handleComplete : handleNext}
                                style={{
                                    padding: '10px 24px',
                                    background: currentStep === steps.length - 1
                                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                        : 'linear-gradient(135deg, #00BFFF, #0099CC)',
                                    border: 'none',
                                    borderRadius: 9999,
                                    color: 'white',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 0 20px rgba(0, 191, 255, 0.4)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {currentStep === steps.length - 1
                                    ? t.tourComplete
                                    : t.tourNext}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
