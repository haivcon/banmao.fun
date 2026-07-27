"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useStakingTranslations, StakingTranslations } from '../i18n';

interface TourStep {
    targetSelector: string;
    title: string;
    description: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    handAnimation: 'point' | 'click' | 'swipe';
    contractLink?: string;
}

interface StakingOnboardingTourProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenPanel?: (panel: string) => void;
}

// Build tour steps from translations
function buildTourSteps(t: (key: keyof StakingTranslations) => string): TourStep[] {
    return [
        {
            targetSelector: '[data-tour="defi-wallet-connect"]',
            title: t('tourConnectTitle'),
            description: t('tourConnectDesc'),
            position: 'bottom',
            handAnimation: 'click'
        },
        {
            targetSelector: '.balance-pills-container',
            title: t('tourTokenInfoTitle'),
            description: t('tourTokenInfoDesc'),
            position: 'bottom',
            handAnimation: 'point'
        },
        {
            targetSelector: '.energy-sphere-container',
            title: t('tourOrbStatsTitle'),
            description: t('tourOrbStatsDesc'),
            position: 'right',
            handAnimation: 'point'
        },
        {
            targetSelector: '.floating-orb.orb-stats',
            title: t('tourStatsOrbTitle'),
            description: t('tourSmallPanelDesc').split('\n')[0],
            position: 'right',
            handAnimation: 'click'
        },
        {
            targetSelector: '.circular-panel-component',
            title: t('tourSmallPanelTitle'),
            description: t('tourSmallPanelDesc'),
            position: 'right',
            handAnimation: 'click'
        },
        {
            targetSelector: '.expanded-panel-overlay .circular-panel-component',
            title: t('tourExpandedPanelTitle'),
            description: t('tourExpandedPanelDesc'),
            position: 'right',
            handAnimation: 'point'
        },
        {
            targetSelector: '.floating-orb.orb-stake',
            title: t('tourStakeOrbTitle'),
            description: t('tourStakeOrbDesc'),
            position: 'bottom',
            handAnimation: 'click'
        },
        {
            targetSelector: '.floating-orb.orb-claim',
            title: t('tourClaimOrbTitle'),
            description: t('tourClaimOrbDesc'),
            position: 'bottom',
            handAnimation: 'click'
        },
        {
            targetSelector: '.floating-orb.orb-unstake',
            title: t('tourUnstakeOrbTitle'),
            description: t('tourUnstakeOrbDesc'),
            position: 'bottom',
            handAnimation: 'click'
        },
        {
            targetSelector: '.floating-orb.orb-compound',
            title: t('tourCompoundOrbTitle'),
            description: t('tourCompoundOrbDesc'),
            position: 'bottom',
            handAnimation: 'click'
        },
        {
            targetSelector: '.leaderboard-panel',
            title: t('tourLeaderboardTitle'),
            description: t('tourLeaderboardDesc'),
            position: 'right',
            handAnimation: 'point'
        },
        {
            targetSelector: '.supporter-panel',
            title: t('tourSupportPoolTitle'),
            description: t('tourSupportPoolDesc'),
            position: 'left',
            handAnimation: 'point',
            contractLink: 'https://web3.okx.com/explorer/x-layer/address/0xa553f61f2a4fa61f6ddc8bf2b0b66f65c7eaa172/contract'
        },
        {
            targetSelector: '.energy-sphere-container',
            title: t('tourEnergyCenterTitle'),
            description: t('tourEnergyCenterDesc'),
            position: 'right',
            handAnimation: 'point'
        }
    ];
}

// LocalStorage key
const ONBOARDING_KEY = 'banmao_staking_tour_dismissed';

export function shouldShowStakingOnboarding(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(ONBOARDING_KEY) !== 'true';
}

function dismissStakingOnboarding(): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(ONBOARDING_KEY, 'true');
    }
}

export function resetStakingOnboarding(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(ONBOARDING_KEY);
    }
}

export default function StakingOnboardingTour({ isOpen, onClose, onOpenPanel }: StakingOnboardingTourProps) {
    const { t } = useStakingTranslations();
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const prevRectRef = useRef<DOMRect | null>(null);

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Build steps dynamically based on current language
    const steps = useMemo(() => buildTourSteps(t), [t]);
    const currentStepData = steps[currentStep];

    // Measure only visible, connected targets. Scrolling is handled separately
    // so the spotlight never receives coordinates from before the viewport move.
    const updateTargetPosition = useCallback(() => {
        if (!currentStepData) return false;

        const candidates = Array.from(document.querySelectorAll(currentStepData.targetSelector));
        const target = candidates.find((candidate) => {
            const rect = candidate.getBoundingClientRect();
            const style = window.getComputedStyle(candidate);
            return candidate.isConnected &&
                rect.width > 0 &&
                rect.height > 0 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden';
        });

        if (!target) {
            prevRectRef.current = null;
            setTargetRect(null);
            return false;
        }

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
        return true;
    }, [currentStepData]);

    // Reset step only when tour opens
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
        }
    }, [isOpen]);

    // NOTE: Removed auto-open panel logic - tour only guides, doesn't auto-click

    // Wait for panel transitions/React commits, reveal the target without an
    // animated race, then measure on the following frame.
    useEffect(() => {
        if (!isOpen || !currentStepData) return;

        let cancelled = false;
        let frame = 0;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let attempts = 0;
        let activeHeaderTarget: HTMLElement | null = null;

        const findVisibleTarget = () => {
            const candidates = Array.from(document.querySelectorAll(currentStepData.targetSelector));
            return candidates.find((candidate) => {
                const rect = candidate.getBoundingClientRect();
                const style = window.getComputedStyle(candidate);
                return candidate.isConnected &&
                    rect.width > 0 &&
                    rect.height > 0 &&
                    style.display !== 'none' &&
                    style.visibility !== 'hidden';
            }) as HTMLElement | undefined;
        };

        const revealAndMeasure = () => {
            if (cancelled) return;
            const target = findVisibleTarget();
            if (!target) {
                setTargetRect(null);
                if (attempts++ < 20) timer = setTimeout(revealAndMeasure, 80);
                return;
            }

            if (currentStep === 0) {
                activeHeaderTarget = target;
                target.classList.add('staking-tour-header-target-active');
            }

            const targetPosition = window.getComputedStyle(target).position;
            if (targetPosition !== 'fixed' && targetPosition !== 'sticky') {
                target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
            }
            frame = requestAnimationFrame(() => {
                frame = requestAnimationFrame(() => updateTargetPosition());
            });
        };

        const scheduleMeasure = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => updateTargetPosition());
        };

        prevRectRef.current = null;
        setTargetRect(null);
        frame = requestAnimationFrame(revealAndMeasure);

        const resizeObserver = new ResizeObserver(scheduleMeasure);
        const observedTargets = Array.from(document.querySelectorAll(currentStepData.targetSelector));
        observedTargets.forEach((target) => resizeObserver.observe(target));

        window.addEventListener('resize', scheduleMeasure);
        window.addEventListener('scroll', scheduleMeasure, { passive: true });

        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            if (timer) clearTimeout(timer);
            resizeObserver.disconnect();
            activeHeaderTarget?.classList.remove('staking-tour-header-target-active');
            window.removeEventListener('resize', scheduleMeasure);
            window.removeEventListener('scroll', scheduleMeasure);
        };
    }, [currentStep, currentStepData, isOpen, updateTargetPosition]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            // When leaving step 2 (energy sphere intro), click the sphere to open orbs menu
            if (currentStep === 2) {
                const sphere = document.querySelector('.energy-sphere-clickable') as HTMLElement;
                if (sphere) sphere.click();
            }

            // When leaving step 3 (orb-stats), click the orb to open panel
            if (currentStep === 3) {
                const orbStats = document.querySelector('.floating-orb.orb-stats') as HTMLElement;
                if (orbStats) orbStats.click();
            }

            // When leaving step 4 (small panel), click the panel to expand it - DESKTOP ONLY
            if (currentStep === 4 && !isMobile) {
                const panel = document.querySelector('.circular-panel-component') as HTMLElement;
                if (panel) panel.click();
            }

            // When leaving step 5 (expanded panel), close it by clicking close button
            if (currentStep === 5) {
                const closeBtn = document.querySelector('.expanded-panel-close, .panel-close-btn, [class*="close"]') as HTMLElement;
                if (closeBtn) closeBtn.click();
                // Also close by clicking orb again to toggle off
                const orbStats = document.querySelector('.floating-orb.orb-stats') as HTMLElement;
                if (orbStats) orbStats.click();
            }

            setIsAnimating(true);
            setTimeout(() => {
                // On mobile: skip step 4 (small panel) because it doesn't exist on mobile
                // Step indices: 0-wallet, 1-balance, 2-sphere, 3-orb-stats, 4-small panel, 5-expanded panel
                // On mobile when at step 3, skip to step 5 (expanded panel)
                if (isMobile && currentStep === 3) {
                    setCurrentStep(5); // Skip small panel, go directly to expanded panel
                } else if (isMobile && currentStep === 4) {
                    // If somehow at step 4 on mobile, skip to step 5
                    setCurrentStep(5);
                } else {
                    setCurrentStep(prev => prev + 1);
                }
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
                // On mobile: skip step 4 (small panel) when going back too
                if (isMobile && currentStep === 5) {
                    setCurrentStep(3); // Skip small panel, go back to orb-stats
                } else {
                    setCurrentStep(prev => prev - 1);
                }
                setIsAnimating(false);
            }, 200);
        }
    };

    const handleSkip = () => {
        if (dontShowAgain) dismissStakingOnboarding();
        onClose();
    };

    const handleComplete = () => {
        if (dontShowAgain) dismissStakingOnboarding();
        onClose();
    };

    if (!isOpen) return null;

    // Tooltip position
    const getTooltipStyle = (): React.CSSProperties => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const safeMargin = 12;
        const tooltipWidth = Math.min(340, viewportWidth - safeMargin * 2);
        const estimatedTooltipHeight = Math.min(360, viewportHeight - safeMargin * 2);

        if (!targetRect) {
            return {
                top: Math.max(safeMargin, (viewportHeight - estimatedTooltipHeight) / 2),
                left: Math.max(safeMargin, (viewportWidth - tooltipWidth) / 2),
                transform: 'none'
            };
        }

        // Larger padding for panels to avoid overlap with spotlight border.
        const isPanelStep = currentStepData.targetSelector.includes('leaderboard') ||
            currentStepData.targetSelector.includes('supporter');
        const padding = isPanelStep ? 50 : 24;
        const centeredLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        const centeredTop = targetRect.top + targetRect.height / 2 - estimatedTooltipHeight / 2;
        const clampLeft = (value: number) =>
            Math.max(safeMargin, Math.min(value, viewportWidth - tooltipWidth - safeMargin));
        const clampTop = (value: number) =>
            Math.max(safeMargin, Math.min(value, viewportHeight - estimatedTooltipHeight - safeMargin));

        switch (currentStepData.position) {
            case 'top': {
                const preferredTop = targetRect.top - estimatedTooltipHeight - padding;
                const fallbackTop = targetRect.bottom + padding;
                return {
                    top: clampTop(preferredTop >= safeMargin ? preferredTop : fallbackTop),
                    left: clampLeft(centeredLeft),
                    transform: 'none'
                };
            }
            case 'bottom': {
                const preferredTop = targetRect.bottom + padding;
                const fallbackTop = targetRect.top - estimatedTooltipHeight - padding;
                return {
                    top: clampTop(
                        preferredTop + estimatedTooltipHeight <= viewportHeight - safeMargin
                            ? preferredTop
                            : fallbackTop
                    ),
                    left: clampLeft(centeredLeft),
                    transform: 'none'
                };
            }
            case 'left': {
                const preferredLeft = targetRect.left - tooltipWidth - padding;
                const fallbackLeft = targetRect.right + padding;
                return {
                    top: clampTop(centeredTop),
                    left: clampLeft(preferredLeft >= safeMargin ? preferredLeft : fallbackLeft),
                    transform: 'none'
                };
            }
            case 'right': {
                const preferredLeft = targetRect.right + padding;
                const fallbackLeft = targetRect.left - tooltipWidth - padding;
                return {
                    top: clampTop(centeredTop),
                    left: clampLeft(
                        preferredLeft + tooltipWidth <= viewportWidth - safeMargin
                            ? preferredLeft
                            : fallbackLeft
                    ),
                    transform: 'none'
                };
            }
            default:
                return {
                    top: clampTop(centeredTop),
                    left: clampLeft(centeredLeft),
                    transform: 'none'
                };
        }
    };

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
                @keyframes staking-hand-bounce {
                    0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(-15deg); }
                    50% { transform: translate(-50%, -50%) translateY(-12px) rotate(-15deg); }
                }
                @keyframes staking-hand-click {
                    0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(-15deg); }
                    50% { transform: translate(-50%, -50%) scale(0.85) rotate(-15deg); }
                }
                @keyframes staking-spotlight-pulse {
                    0%, 100% { 
                        box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.6), 
                                    0 0 20px rgba(168, 85, 247, 0.4),
                                    0 0 40px rgba(168, 85, 247, 0.2); 
                    }
                    50% { 
                        box-shadow: 0 0 0 8px rgba(168, 85, 247, 0.4), 
                                    0 0 35px rgba(168, 85, 247, 0.6),
                                    0 0 60px rgba(168, 85, 247, 0.3); 
                    }
                }
                @keyframes staking-tooltip-slideIn {
                    0% { 
                        opacity: 0; 
                        transform: translateY(20px) scale(0.95);
                        filter: blur(4px);
                    }
                    100% { 
                        opacity: 1; 
                        transform: translateY(0) scale(1);
                        filter: blur(0);
                    }
                }
                @keyframes staking-spotlight-appear {
                    0% { 
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    100% { 
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes staking-hand-fadeIn {
                    0% { 
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.5) rotate(-15deg);
                    }
                    100% { 
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1) rotate(-15deg);
                    }
                }
                @keyframes staking-glow-ring {
                    0% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.05); }
                    100% { opacity: 0.5; transform: scale(1); }
                }
                @keyframes staking-header-target-pulse {
                    0%, 100% {
                        outline-color: rgba(168, 85, 247, 0.95);
                        box-shadow:
                            0 0 0 5px rgba(168, 85, 247, 0.45),
                            0 0 24px rgba(168, 85, 247, 0.75);
                    }
                    50% {
                        outline-color: rgba(196, 125, 255, 1);
                        box-shadow:
                            0 0 0 9px rgba(168, 85, 247, 0.28),
                            0 0 38px rgba(168, 85, 247, 0.95);
                    }
                }
                .staking-tour-header-target-active {
                    position: relative !important;
                    z-index: 1 !important;
                    border-radius: 9999px;
                    outline: 3px solid rgba(168, 85, 247, 0.95);
                    outline-offset: 5px;
                    animation: staking-header-target-pulse 1.8s ease-in-out infinite;
                }
            `}</style>

            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999000,
                pointerEvents: 'none'
            }}>
                {/* Dark overlay with spotlight */}
                <svg style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'auto'
                }} onClick={handleSkip}>
                    <defs>
                        <mask id="staking-spotlight-mask">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {targetRect && (() => {
                                const isOrbOrSphere = currentStepData.targetSelector.includes('energy-sphere') ||
                                    currentStepData.targetSelector.includes('floating-orb');
                                const isPanelElement = currentStepData.targetSelector.includes('circular-panel') ||
                                    currentStepData.targetSelector.includes('expanded-panel') ||
                                    currentStepData.targetSelector.includes('draggable-window');
                                const isCircular = isOrbOrSphere || (!isMobile && isPanelElement);
                                const padding = isMobile ? (isCircular ? 12 : 10) : (isCircular ? 25 : 15);

                                if (isCircular) {
                                    // Perfect circle using max dimension
                                    const circleRadius = Math.max(targetRect.width, targetRect.height) / 2 + padding;
                                    return (
                                        <circle
                                            cx={targetRect.left + targetRect.width / 2}
                                            cy={targetRect.top + targetRect.height / 2}
                                            r={circleRadius}
                                            fill="black"
                                        />
                                    );
                                } else {
                                    return (
                                        <rect
                                            x={targetRect.left - padding}
                                            y={targetRect.top - padding}
                                            width={targetRect.width + padding * 2}
                                            height={targetRect.height + padding * 2}
                                            rx={isMobile ? 12 : 16}
                                            fill="black"
                                        />
                                    );
                                }
                            })()}
                        </mask>
                    </defs>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(0, 0, 0, 0.75)"
                        mask="url(#staking-spotlight-mask)"
                    />
                </svg>

                {/* Spotlight border */}
                {targetRect && currentStep !== 0 && (() => {
                    // Orbs and energy sphere are always circular
                    // Panels are rectangular on mobile, circular on desktop
                    const isOrbOrSphere = currentStepData.targetSelector.includes('energy-sphere') ||
                        currentStepData.targetSelector.includes('floating-orb');
                    const isPanelElement = currentStepData.targetSelector.includes('circular-panel') ||
                        currentStepData.targetSelector.includes('expanded-panel') ||
                        currentStepData.targetSelector.includes('draggable-window');

                    // Orbs: always circular. Panels: circular on desktop, rectangular on mobile
                    const isCircular = isOrbOrSphere || (!isMobile && isPanelElement);
                    const padding = isMobile ? (isCircular ? 8 : 6) : (isCircular ? 20 : 10);

                    // For circular elements, use the larger dimension to make a perfect circle
                    const circleSize = isCircular
                        ? Math.max(targetRect.width, targetRect.height) + padding * 2
                        : 0;
                    const circleOffset = isCircular
                        ? (circleSize - targetRect.width - padding * 2) / 2
                        : 0;
                    const circleOffsetY = isCircular
                        ? (circleSize - targetRect.height - padding * 2) / 2
                        : 0;

                    return (
                        <div
                            key={currentStep}
                            style={{
                                position: 'fixed',
                                left: isCircular
                                    ? targetRect.left - padding - circleOffset
                                    : targetRect.left - padding,
                                top: isCircular
                                    ? targetRect.top - padding - circleOffsetY
                                    : targetRect.top - padding,
                                width: isCircular ? circleSize : targetRect.width + padding * 2,
                                height: isCircular ? circleSize : targetRect.height + padding * 2,
                                borderRadius: isCircular ? '50%' : (isMobile ? 8 : 12),
                                border: isMobile ? '2px solid #a855f7' : '3px solid #a855f7',
                                background: 'transparent',
                                animation: 'staking-spotlight-appear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, staking-spotlight-pulse 2s ease-in-out 0.4s infinite',
                                pointerEvents: 'none',
                                zIndex: 999005,
                                transition: 'left 0.4s ease-out, top 0.4s ease-out, width 0.4s ease-out, height 0.4s ease-out'
                            }} />
                    );
                })()}

                {/* Pointing Hand */}
                {targetRect && (
                    <div
                        key={`hand-${currentStep}`}
                        style={{
                            ...getHandStyle(),
                            fontSize: isMobile ? '28px' : '48px',
                            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
                            animation: `staking-hand-fadeIn 0.3s ease-out forwards, ${currentStepData.handAnimation === 'click'
                                ? 'staking-hand-click 0.8s ease-in-out 0.3s infinite'
                                : 'staking-hand-bounce 0.8s ease-in-out 0.3s infinite'}`,
                            pointerEvents: 'none',
                            transition: 'left 0.4s ease-out, top 0.4s ease-out',
                            zIndex: 999004
                        }}>
                        👆
                    </div>
                )}

                {/* Tooltip */}
                {(() => {
                    // Calculate smart mobile position to avoid spotlight overlap
                    let mobileStyle: React.CSSProperties = {};

                    // Check if this is the expanded panel step (step 5 - index based on buildTourSteps)
                    const isExpandedPanelStep = currentStepData?.targetSelector.includes('expanded-panel');

                    if (isMobile && targetRect) {
                        // Special case: Expanded panel step - put tooltip INSIDE the spotlight
                        if (isExpandedPanelStep) {
                            mobileStyle = {
                                top: targetRect.top + 30,
                                bottom: 'auto',
                                left: targetRect.left + 10,
                                right: 'auto',
                                width: targetRect.width - 20,
                                transform: 'none',
                                maxHeight: targetRect.height - 60,
                                zIndex: 999003 // Higher than spotlight border
                            };
                        } else {
                            const spotlightBottom = targetRect.bottom + 20;
                            const spotlightTop = targetRect.top - 20;
                            const screenHeight = window.innerHeight;
                            const tooltipHeight = 200;
                            const safeMargin = 15;

                            const spaceBelow = screenHeight - spotlightBottom - safeMargin;
                            const spaceAbove = spotlightTop - safeMargin;

                            if (spaceBelow >= tooltipHeight || spaceBelow >= spaceAbove) {
                                mobileStyle = {
                                    top: spotlightBottom + safeMargin,
                                    bottom: 'auto',
                                    left: 10,
                                    right: 10,
                                    transform: 'none',
                                    maxHeight: Math.min(spaceBelow - safeMargin, screenHeight * 0.4)
                                };
                            } else {
                                mobileStyle = {
                                    top: 'auto',
                                    bottom: screenHeight - spotlightTop + safeMargin,
                                    left: 10,
                                    right: 10,
                                    transform: 'none',
                                    maxHeight: Math.min(spaceAbove - safeMargin, screenHeight * 0.4)
                                };
                            }
                        }
                    } else if (isMobile) {
                        // Fallback if no targetRect
                        mobileStyle = {
                            bottom: 20,
                            left: 10,
                            right: 10,
                            transform: 'none',
                            top: 'auto',
                            maxHeight: '40vh'
                        };
                    }

                    return (
                        <div
                            key={`tooltip-${currentStep}`}
                            style={{
                                position: 'fixed',
                                ...(isMobile ? mobileStyle : getTooltipStyle()),
                                width: isMobile ? 'auto' : 340,
                                maxWidth: isMobile ? 'calc(100vw - 20px)' : 340,
                                boxSizing: 'border-box',
                                overflowY: isMobile ? 'auto' : 'visible',
                                background: 'linear-gradient(145deg, rgba(35, 25, 60, 0.98) 0%, rgba(20, 12, 45, 0.98) 100%)',
                                backdropFilter: 'blur(24px)',
                                borderRadius: isMobile ? 12 : 24,
                                border: isMobile ? '1px solid rgba(168, 85, 247, 0.6)' : '2px solid rgba(168, 85, 247, 0.6)',
                                boxShadow: isMobile
                                    ? '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(168, 85, 247, 0.2)'
                                    : '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(168, 85, 247, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
                                padding: isMobile ? '8px 10px' : '24px',
                                zIndex: 999002,
                                pointerEvents: 'auto',
                                animation: isAnimating ? 'none' : 'staking-tooltip-slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                                opacity: isAnimating ? 0 : 1,
                                transition: 'opacity 0.3s ease-out'
                            }} onClick={e => e.stopPropagation()}>

                            {/* Progress dots */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 6 : 12 }}>
                                <div style={{ display: 'flex', gap: isMobile ? 2 : 4, flexWrap: 'wrap', maxWidth: isMobile ? '65%' : 'auto' }}>
                                    {steps.map((_, idx) => (
                                        <div key={idx} style={{
                                            width: idx === currentStep ? (isMobile ? 12 : 20) : (isMobile ? 5 : 8),
                                            height: isMobile ? 5 : 8,
                                            borderRadius: isMobile ? 2.5 : 4,
                                            background: idx === currentStep
                                                ? 'linear-gradient(90deg, #a855f7, #6366f1)'
                                                : idx < currentStep
                                                    ? '#22c55e'
                                                    : 'rgba(255,255,255,0.2)',
                                            transition: 'all 0.3s'
                                        }} />
                                    ))}
                                </div>
                                <span style={{ fontSize: 12, color: '#a855f7', fontFamily: "'Space Mono', monospace" }}>
                                    {currentStep + 1}/{steps.length}
                                </span>
                            </div>

                            {/* Title */}
                            <h3 style={{
                                margin: isMobile ? '0 0 4px 0' : '0 0 8px 0',
                                fontSize: isMobile ? 13 : 18,
                                fontWeight: 700,
                                color: '#a855f7',
                                textShadow: '0 0 10px rgba(168, 85, 247, 0.5)'
                            }}>
                                {currentStepData.title}
                            </h3>

                            {/* Description */}
                            <div style={{
                                margin: isMobile ? '0 0 8px 0' : '0 0 16px 0',
                                fontSize: isMobile ? 11 : 13,
                                lineHeight: isMobile ? 1.4 : 1.7,
                                color: '#e2e8f0'
                            }}>
                                {currentStepData.description.split('\n').map((line, idx) => {
                                    // Check if line contains contract address
                                    const isContractAddress = line.startsWith('0x') && line.length > 30;
                                    if (isContractAddress && currentStepData.contractLink) {
                                        return (
                                            <div key={idx} style={{ marginBottom: 8 }}>
                                                <a
                                                    href={currentStepData.contractLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        color: '#a855f7',
                                                        textDecoration: 'underline',
                                                        wordBreak: 'break-all',
                                                        fontSize: 11
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {line}
                                                </a>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={idx} style={{
                                            marginBottom: line.startsWith('•') ? 4 : 8,
                                            paddingLeft: line.startsWith('•') ? 8 : 0
                                        }}>
                                            {line}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Navigation */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: isMobile ? 6 : 10, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: isMobile ? 4 : 6,
                                    fontSize: isMobile ? 10 : 11,
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={dontShowAgain}
                                        onChange={e => setDontShowAgain(e.target.checked)}
                                        style={{ width: isMobile ? 12 : 14, height: isMobile ? 12 : 14, accentColor: '#a855f7' }}
                                    />
                                    {t('tourDontShow')}
                                </label>

                                <div style={{ display: 'flex', gap: isMobile ? 6 : 8 }}>
                                    {currentStep > 0 && (
                                        <button onClick={handlePrev} style={{
                                            padding: isMobile ? '8px 14px' : '10px 20px',
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: 9999,
                                            color: '#e2e8f0',
                                            fontSize: isMobile ? 11 : 13,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}>
                                            {t('tourBack')}
                                        </button>
                                    )}
                                    <button onClick={handleNext} style={{
                                        padding: isMobile ? '8px 16px' : '10px 24px',
                                        background: currentStep === steps.length - 1
                                            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                            : 'linear-gradient(135deg, #a855f7, #6366f1)',
                                        border: 'none',
                                        borderRadius: 9999,
                                        color: 'white',
                                        fontSize: isMobile ? 11 : 13,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)'
                                    }}>
                                        {currentStep === steps.length - 1 ? t('tourComplete') : t('tourNext')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </>
    );
}
