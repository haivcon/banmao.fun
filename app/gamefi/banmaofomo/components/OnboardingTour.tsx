"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LocaleStrings } from '../lib/i18n';

interface TourStep {
    targetSelector: string; // empty string = center (no target)
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    handAnimation: 'point' | 'click' | 'swipe' | 'none';
}

interface OnboardingTourProps {
    isOpen: boolean;
    onClose: () => void;
    t: LocaleStrings;
}

// Build tour steps using i18n
const getTourSteps = (t: LocaleStrings, isMobile: boolean): TourStep[] => [
    {
        targetSelector: '',
        title: t.tourWelcomeTitle,
        description: t.tourWelcomeDesc,
        position: 'center',
        handAnimation: 'none'
    },
    {
        targetSelector: '[data-tour="fomo-wallet"]',
        title: t.tourWalletTitle,
        description: t.tourWalletDesc,
        position: 'bottom',
        handAnimation: 'click'
    },
    {
        targetSelector: '[data-tour="fomo-lang"]',
        title: t.tourLangTitle,
        description: t.tourLangDesc,
        position: 'bottom',
        handAnimation: 'click'
    },
    {
        targetSelector: '[data-tour="fomo-jackpot"]',
        title: t.tourJackpotTitle,
        description: t.tourJackpotDesc,
        position: 'bottom',
        handAnimation: 'point'
    },
    {
        targetSelector: '[data-tour="fomo-timers"]',
        title: t.tourTimersTitle,
        description: t.tourTimersDesc,
        position: 'bottom',
        handAnimation: 'point'
    },
    {
        targetSelector: '[data-tour="fomo-attack"]',
        title: t.tourAttackTitle,
        description: t.tourAttackDesc,
        position: 'top',
        handAnimation: 'click'
    },
    {
        targetSelector: '[data-tour="fomo-claim"]',
        title: t.tourClaimTitle,
        description: t.tourClaimDesc,
        position: 'top',
        handAnimation: 'point'
    },
    {
        targetSelector: '[data-tour="fomo-dashboard"]',
        title: t.tourDashboardTitle,
        description: t.tourDashboardDesc,
        position: isMobile ? 'bottom' : 'right',
        handAnimation: 'point'
    },
    {
        targetSelector: '[data-tour="fomo-rounds"]',
        title: t.tourRoundsTitle,
        description: t.tourRoundsDesc,
        position: isMobile ? 'top' : 'left',
        handAnimation: 'point'
    },
    {
        targetSelector: '[data-tour="fomo-rules"]',
        title: t.tourRulesTitle,
        description: t.tourRulesDesc,
        position: 'top',
        handAnimation: 'click'
    },
];

// LocalStorage key
const ONBOARDING_DISMISSED_KEY = 'banmao_fomo_onboarding_dismissed';

export function shouldShowOnboarding(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(ONBOARDING_DISMISSED_KEY) !== 'true';
}

function dismissOnboarding(): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
    }
}

export function resetOnboarding(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    }
}

export default function OnboardingTour({ isOpen, onClose, t }: OnboardingTourProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const overlayRef = useRef<HTMLDivElement>(null);
    const prevRectRef = useRef<DOMRect | null>(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const steps = useMemo(() => getTourSteps(t, isMobile), [t, isMobile]);
    const currentStepData = steps[currentStep];

    // Find and highlight target element
    const updateTargetPosition = useCallback(() => {
        if (!currentStepData || !currentStepData.targetSelector) {
            prevRectRef.current = null;
            setTargetRect(null);
            return;
        }

        const target = document.querySelector(currentStepData.targetSelector);
        if (target) {
            const rect = target.getBoundingClientRect();
            const prevRect = prevRectRef.current;
            if (!prevRect ||
                Math.abs(prevRect.left - rect.left) > 1 ||
                Math.abs(prevRect.top - rect.top) > 1 ||
                Math.abs(prevRect.width - rect.width) > 1 ||
                Math.abs(prevRect.height - rect.height) > 1) {
                prevRectRef.current = rect;
                setTargetRect(rect);
            }
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
            updateTargetPosition();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Re-find element when step changes
    useEffect(() => {
        prevRectRef.current = null;
        updateTargetPosition();

        const retryTimeouts: NodeJS.Timeout[] = [];
        // Aggressive retry strategy for dynamic elements/animations
        const retries = [100, 300, 600, 1000, 1500, 2000];

        retries.forEach(delay => {
            retryTimeouts.push(setTimeout(updateTargetPosition, delay));
        });

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
            handleComplete();
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
        if (dontShowAgain) dismissOnboarding();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        onClose();
    };

    const handleComplete = () => {
        if (dontShowAgain) dismissOnboarding();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        onClose();
    };

    if (!isOpen) return null;

    const isCenter = currentStepData.position === 'center' || !targetRect;

    // Tooltip positioning
    const getTooltipStyle = (): React.CSSProperties => {
        if (isMobile) {
            return {
                bottom: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '90vw'
            };
        }

        if (isCenter || !targetRect) {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            };
        }

        const padding = 20;

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

    // Hand position
    const getHandStyle = (): React.CSSProperties => {
        if (!targetRect) return { display: 'none' };
        return {
            position: 'fixed',
            left: targetRect.right + 10,
            top: targetRect.bottom + 10,
            transform: 'translate(-50%, -50%) rotate(-30deg)',
            zIndex: 999003
        };
    };

    return (
        <>
            <style jsx global>{`
                @keyframes fomo-hand-bounce {
                    0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(-15deg); }
                    50% { transform: translate(-50%, -50%) translateY(-10px) rotate(-15deg); }
                }
                @keyframes fomo-hand-click {
                    0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(-15deg); }
                    50% { transform: translate(-50%, -50%) scale(0.9) rotate(-15deg); }
                }
                @keyframes fomo-spotlight-pulse {
                    0%, 100% { box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.5), 0 0 20px rgba(255, 215, 0, 0.3); }
                    50% { box-shadow: 0 0 0 8px rgba(255, 215, 0, 0.3), 0 0 40px rgba(255, 215, 0, 0.5); }
                }
                @keyframes fomo-tooltip-appear {
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
                        <mask id="fomo-spotlight-mask">
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
                        fill="rgba(0, 0, 0, 0.7)"
                        mask="url(#fomo-spotlight-mask)"
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
                            border: '3px solid #ffd700',
                            animation: 'fomo-spotlight-pulse 2s ease-in-out infinite',
                            pointerEvents: 'none',
                            zIndex: 999001
                        }}
                    />
                )}

                {/* Pointing Hand */}
                {targetRect && currentStepData.handAnimation !== 'none' && (
                    <div
                        style={{
                            ...getHandStyle(),
                            fontSize: '48px',
                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                            animation: currentStepData.handAnimation === 'click'
                                ? 'fomo-hand-click 1s ease-in-out infinite'
                                : 'fomo-hand-bounce 1s ease-in-out infinite',
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
                        width: isMobile ? 280 : 340,
                        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(15, 15, 25, 0.98) 100%)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: isMobile ? 14 : 20,
                        border: '2px solid rgba(255, 215, 0, 0.5)',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 215, 0, 0.15)',
                        padding: isMobile ? 14 : 20,
                        zIndex: 999002,
                        pointerEvents: 'auto',
                        animation: isAnimating ? 'none' : 'fomo-tooltip-appear 0.3s ease-out',
                        opacity: isAnimating ? 0 : 1
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Progress dots */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12
                    }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {steps.map((_, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        width: idx === currentStep ? 20 : 8,
                                        height: 8,
                                        borderRadius: 4,
                                        background: idx === currentStep
                                            ? 'linear-gradient(90deg, #ffd700, #ff6b35)'
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
                            color: '#ffd700',
                            fontFamily: "'Space Mono', monospace"
                        }}>
                            {currentStep + 1}/{steps.length}
                        </span>
                    </div>

                    {/* Title */}
                    <h3 style={{
                        margin: '0 0 8px 0',
                        fontSize: isMobile ? 14 : 18,
                        fontWeight: 700,
                        color: '#ffd700',
                        textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
                    }}>
                        {currentStepData.title}
                    </h3>

                    {/* Description */}
                    <div style={{
                        margin: '0 0 16px 0',
                        fontSize: isMobile ? 11 : 13,
                        lineHeight: isMobile ? 1.5 : 1.7,
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
                        {/* Don't show again */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: isMobile ? 10 : 11,
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
                                    accentColor: '#ffd700',
                                    cursor: 'pointer'
                                }}
                            />
                            {t.tourDontShow}
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
                                        : 'linear-gradient(135deg, #ff6b35, #ffd700)',
                                    border: 'none',
                                    borderRadius: 9999,
                                    color: currentStep === steps.length - 1 ? 'white' : '#000',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
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
