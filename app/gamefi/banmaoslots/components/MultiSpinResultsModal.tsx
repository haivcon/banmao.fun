'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SpinResultCard from './SpinResultCard';
import { keccak256, encodePacked } from 'viem';

export interface SpinResultData {
    symbols: number[];
    payout: bigint;
    isJackpot: boolean;
    spinSeed?: string;
    txHash?: string;
    blockNumber?: number;
    betAmount?: number;
    seed?: string;
}

interface MultiSpinResultsModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: SpinResultData[];
    spinCount: number;
    betPerSpin: number;
    totalBet: number;
    mainSeed: string;
    t: any;
    onSelectResult?: (result: any) => void;
    zIndex?: number;
    onFocus?: () => void;
}

export default function MultiSpinResultsModal({
    isOpen,
    onClose,
    results,
    spinCount,
    betPerSpin,
    totalBet,
    mainSeed,
    t,
    onSelectResult,
    zIndex = 10000,
    onFocus,
}: MultiSpinResultsModalProps) {
    // Mobile detection using screen.width (not affected by viewport scale)
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            // Use screen.width which is the actual device width, not the scaled viewport
            const screenWidth = typeof window !== 'undefined' ? window.screen.width : 1920;
            setIsMobile(screenWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Panel States
    const [position, setPosition] = useState(() => {
        if (typeof window !== 'undefined') {
            const w = Math.min(1150, window.innerWidth * 0.92);
            return {
                x: (window.innerWidth - w) / 2,
                y: 40
            };
        }
        return { x: 100, y: 100 };
    });

    const [size, setSize] = useState({ width: 1150, height: 620 });
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [preMaximizeState, setPreMaximizeState] = useState({ position, size });

    // Dragging logic
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Resizing logic
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

    const panelRef = useRef<HTMLDivElement>(null);

    // Handle drag start
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isMaximized) return;
        const target = e.target as HTMLElement;
        if (target.closest('.close-btn, .action-btn, .play-again-btn, .spin-result-card, .resize-handle')) return;

        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
        onFocus?.();
    }, [position, isMaximized, onFocus]);

    // Handle resize start
    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            w: size.width,
            h: size.height
        });
    }, [size]);

    // Global Mouse Handlers
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x));
                const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y));
                setPosition({ x: newX, y: newY });
            }
            if (isResizing) {
                const deltaX = e.clientX - resizeStart.x;
                const deltaY = e.clientY - resizeStart.y;
                const newW = Math.max(600, Math.min(window.innerWidth - position.x, resizeStart.w + deltaX));
                const newH = Math.max(400, Math.min(window.innerHeight - position.y, resizeStart.h + deltaY));
                setSize({ width: newW, height: newH });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragOffset, resizeStart, position]);

    const toggleMinimize = () => setIsMinimized(!isMinimized);
    const toggleMaximize = () => {
        if (isMaximized) {
            setPosition(preMaximizeState.position);
            setSize(preMaximizeState.size);
        } else {
            setPreMaximizeState({ position, size });
        }
        setIsMaximized(!isMaximized);
    };

    // Calculate totals
    const totalPayout = results.reduce((sum, r) => sum + r.payout, BigInt(0));
    const totalPayoutNum = Number(totalPayout) / 1e18;
    const netProfit = totalPayoutNum - totalBet;
    const hasJackpot = results.some(r => r.isJackpot);
    const winCount = results.filter(r => r.payout > BigInt(0)).length;
    const winRate = spinCount > 0 ? (winCount / spinCount) * 100 : 0;

    // Determine grid columns based on spin count
    const getGridColumns = () => {
        if (spinCount <= 3) return 3;
        if (spinCount <= 5) return Math.min(spinCount, 5);
        return 5;
    };

    if (!isOpen) return null;

    // Panel content - no backdrop so clicking outside doesn't close
    const modalContent = (
        <>
            <div
                ref={panelRef}
                className={`draggable-panel modal-panel ${isMinimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''} ${isMobile ? 'is-mobile' : ''}`}
                style={{
                    position: 'fixed',
                    ...(isMobile ? {
                        // Mobile: centered, scrollable, high z-index
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '95%',
                        height: '60vh',
                        zIndex: 999999,
                    } : {
                        // Desktop: draggable
                        left: isMaximized ? 0 : position.x,
                        top: isMaximized ? 0 : position.y,
                        width: isMaximized ? '100vw' : size.width,
                        height: (isMinimized || isMaximized) ? (isMinimized ? 'auto' : '100vh') : size.height,
                        zIndex: zIndex,
                    }),
                    cursor: isDragging ? 'grabbing' : 'default',
                    background: 'linear-gradient(135deg, #0a0a1a 0%, #12122a 50%, #0a0a1a 100%)',
                    border: '2px solid #00f5ff',
                    borderRadius: 16,
                    boxShadow: '0 0 40px rgba(0, 245, 255, 0.15), 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column' as const,
                    overflow: 'hidden',
                }}
                onMouseDown={isMobile ? undefined : handleMouseDown}
                onClick={onFocus}
            >
                {/* Enhanced Header with Gradient Border */}
                <div className="modal-header">
                    <div className="header-left">
                        <div className={`header-icon ${winCount > 0 ? 'has-wins' : ''}`}>🎰</div>
                        <div className="header-text">
                            <h2>{t.multiSpinResults || 'Multi-Spin Results'}</h2>
                            <span className="spin-count-badge">{spinCount}x {t.spins || 'Spins'}</span>
                        </div>
                    </div>

                    <div className="header-stats">
                        {hasJackpot && (
                            <div className="stat-badge jackpot">
                                <span>🎉 JACKPOT!</span>
                            </div>
                        )}
                    </div>

                    <div className="header-actions">
                        <button className="action-btn min" onClick={toggleMinimize} title="Minimize">─</button>
                        <button className="action-btn max" onClick={toggleMaximize} title="Maximize">
                            {isMaximized ? '❐' : '□'}
                        </button>
                        <button className="action-btn close-btn" onClick={onClose} title="Close">✕</button>
                    </div>
                </div>

                {!isMinimized && (
                    <>
                        {/* Results Grid */}
                        <div className="results-container">
                            <div className="results-grid">
                                {results.map((result, index) => {
                                    // Derive the seed for this specific spin index - MATCHING CONTRACT LOGIC
                                    // contract: keccak256(abi.encodePacked(seed, i))
                                    let derivedSeed: string | undefined = undefined;
                                    if (mainSeed && mainSeed.startsWith('0x')) {
                                        try {
                                            derivedSeed = keccak256(encodePacked(
                                                ['bytes32', 'uint256'],
                                                [mainSeed as `0x${string}`, BigInt(index)]
                                            ));
                                        } catch (e) {
                                            console.error("Error deriving seed:", e);
                                        }
                                    }

                                    return (
                                        <SpinResultCard
                                            key={index}
                                            index={index}
                                            symbols={result.symbols}
                                            payout={result.payout}
                                            isJackpot={result.isJackpot}
                                            betAmount={betPerSpin}
                                            // Use derived seed first! result.spinSeed may contain old/main seed
                                            spinSeed={derivedSeed || result.spinSeed || (mainSeed ? `${mainSeed}-spin${index}` : undefined)}
                                            txHash={result.txHash}
                                            blockNumber={result.blockNumber}
                                            t={t}
                                            animationDelay={index * 80}
                                            onSelect={() => onSelectResult?.({
                                                ...result,
                                                betAmount: result.betAmount || betPerSpin,
                                                // IMPORTANT: Use derivedSeed first! result.seed contains the MAIN seed, not per-spin seed
                                                seed: derivedSeed || result.spinSeed || result.seed || (mainSeed ? `${mainSeed}-spin${index}` : undefined)
                                            })}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Professional Footer - Redesigned */}
                        <div className={`summary-footer ${netProfit >= 0 ? 'is-profit' : 'is-loss'}`}>
                            <div className="footer-content">
                                {/* Left: Trophy & Win Stats */}
                                <div className={`footer-trophy ${winCount > 0 ? 'trophy-animate' : ''}`}>
                                    <span className="trophy-icon">🏆</span>
                                    <div className="trophy-stats">
                                        <span className="trophy-count">{winCount}/{spinCount}</span>
                                        <div className="win-rate-bar">
                                            <div className="bar-bg">
                                                <div className="bar-fill" style={{ width: `${winRate}%` }} />
                                            </div>
                                            <span className="bar-label">{winRate.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Total Bet & Net Profit Grouped */}
                                <div className="footer-financials">
                                    <div className="financial-item">
                                        <span className="fin-label">{t.totalBet || 'Total Bet'}</span>
                                        <span className="fin-value">{totalBet.toLocaleString()} <small>$BANMAO</small></span>
                                    </div>
                                    <div className="financial-divider">→</div>
                                    <div className="financial-item">
                                        <span className="fin-label">{t.totalPayout || 'Total Payout'}</span>
                                        <span className="fin-value" style={{ color: totalPayoutNum > 0 ? '#22c55e' : '#888' }}>
                                            {totalPayoutNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} <small>$BANMAO</small>
                                        </span>
                                    </div>
                                    <div className="financial-divider">=</div>
                                    <div className={`financial-item profit-section ${netProfit >= 0 ? 'is-profit-glow' : ''}`}>
                                        <span className="fin-label">{t.netProfit || 'Net Profit'}</span>
                                        <span className={`fin-value ${netProfit >= 0 ? 'profit' : 'loss'}`}>
                                            {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            <small>$BANMAO</small>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Resize Handle */}
                        {!isMaximized && (
                            <div className="resize-handle" onMouseDown={handleResizeMouseDown} />
                        )}
                    </>
                )}
            </div>

            <style jsx global>{`
                .backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    z-index: 99998;
                }
                
                .modal-panel {
                    position: fixed;
                    background: linear-gradient(135deg, #0a0a1a 0%, #12122a 50%, #0a0a1a 100%);
                    border: 2px solid #00f5ff;
                    border-radius: 16px;
                    /* z-index removed - using inline style for reactivity */
                    box-shadow: 
                        0 0 40px rgba(0, 245, 255, 0.15),
                        0 20px 60px rgba(0, 0, 0, 0.5),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: modalAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                @keyframes modalAppear {
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
                
                .modal-panel.maximized {
                    border-radius: 0;
                    border: none;
                }
                
                /* Enhanced Header */
                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 20px;
                    background: linear-gradient(180deg, rgba(0, 245, 255, 0.1) 0%, transparent 100%);
                    border-bottom: 1px solid rgba(0, 245, 255, 0.2);
                    user-select: none;
                    flex-shrink: 0;
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .header-icon {
                    font-size: 28px;
                    animation: iconBounce 2s ease-in-out infinite;
                }

                @keyframes iconBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }

                .header-text h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 800;
                    color: #00f5ff;
                    text-shadow: 0 0 20px rgba(0, 245, 255, 0.5);
                    letter-spacing: 0.5px;
                }

                .spin-count-badge {
                    font-size: 12px;
                    color: #888;
                    font-weight: 600;
                }

                .header-stats {
                    display: flex;
                    gap: 10px;
                }

                .stat-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 700;
                    font-family: 'Space Mono', monospace;
                }

                .stat-badge.wins {
                    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    color: #22c55e;
                }

                .stat-badge.no-wins {
                    background: rgba(100, 100, 100, 0.1);
                    border: 1px solid rgba(100, 100, 100, 0.2);
                    color: #888;
                }

                .stat-badge.jackpot {
                    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 165, 0, 0.2) 100%);
                    border: 1px solid rgba(255, 215, 0, 0.4);
                    color: #ffd700;
                    animation: jackpotBadgePulse 1s ease-in-out infinite;
                }

                @keyframes jackpotBadgePulse {
                    0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); }
                    50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
                }
                
                .header-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .action-btn {
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #aaa;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    transition: all 0.2s;
                }
                
                .action-btn:hover {
                    background: rgba(255, 255, 255, 0.15);
                    color: #fff;
                    transform: scale(1.05);
                }
                
                .action-btn.close-btn:hover {
                    background: #ef4444;
                    border-color: #ef4444;
                }
                
                /* Results Container */
                .results-container {
                    flex: 1;
                    padding: 55px 15px;
                    overflow-y: auto;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(0, 245, 255, 0.3) transparent;
                }
                
                .results-container::-webkit-scrollbar {
                    width: 6px;
                }
                
                .results-container::-webkit-scrollbar-thumb {
                    background: rgba(0, 245, 255, 0.3);
                    border-radius: 3px;
                }
                
                .results-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(195px, 1fr));
                    gap: 7px;
                    width: 100%;
                }
                
                /* Professional Footer */
                .summary-footer {
                    padding: 16px 28px;
                    background: linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.6) 100%);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    flex-shrink: 0;
                }

                .summary-footer.is-profit {
                    border-top-color: rgba(34, 197, 94, 0.3);
                }

                .summary-footer.is-loss {
                    border-top-color: rgba(239, 68, 68, 0.3);
                }

                .footer-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 24px;
                }

                /* Trophy Section */
                .footer-trophy {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .footer-trophy .trophy-icon {
                    font-size: 28px;
                }

                .footer-trophy.trophy-animate .trophy-icon {
                    animation: trophyBounce 0.8s ease-in-out infinite;
                }

                .trophy-stats {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .trophy-count {
                    font-size: 18px;
                    font-weight: 800;
                    color: #ffd700;
                    font-family: 'Space Mono', monospace;
                    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
                }

                /* Financials Section */
                .footer-financials {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .financial-item {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    padding: 8px 12px;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 8px;
                }

                .fin-label {
                    font-size: 10px;
                    color: #666;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .fin-value {
                    font-size: 16px;
                    font-weight: 800;
                    color: #fff;
                    font-family: 'Space Mono', monospace;
                }

                .fin-value small {
                    font-size: 10px;
                    color: #888;
                    margin-left: 4px;
                }

                .financial-divider {
                    font-size: 16px;
                    color: #444;
                }

                .profit-section.is-profit-glow {
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    animation: profitGlow 2s ease-in-out infinite;
                }

                @keyframes profitGlow {
                    0%, 100% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.3); }
                    50% { box-shadow: 0 0 25px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.3); }
                }

                .fin-value.profit {
                    color: #22c55e;
                    text-shadow: 0 0 15px rgba(34, 197, 94, 0.6);
                }

                .fin-value.loss {
                    color: #ef4444;
                    text-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
                }

                /* Win Rate Bar (inside trophy) */
                .win-rate-bar {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .bar-bg {
                    width: 60px;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    overflow: hidden;
                }

                .bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #22c55e, #4ade80);
                    border-radius: 3px;
                    transition: width 0.5s ease;
                }

                .bar-label {
                    font-size: 11px;
                    color: #22c55e;
                    font-weight: 700;
                    font-family: 'Space Mono', monospace;
                }

                .net-profit-display {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                }

                .net-label {
                    font-size: 10px;
                    color: #666;
                    text-transform: uppercase;
                }

                .net-value {
                    font-size: 28px;
                    font-weight: 900;
                    font-family: 'Space Mono', monospace;
                    line-height: 1;
                }

                .net-value.profit {
                    color: #22c55e;
                    text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
                }

                .net-value.loss {
                    color: #ef4444;
                    text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
                }

                .net-currency {
                    font-size: 11px;
                    color: #888;
                    font-weight: 600;
                }
                
                .play-again-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
                }

                .play-again-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 25px rgba(34, 197, 94, 0.4);
                }

                .btn-icon {
                    font-size: 16px;
                }
                
                .resize-handle {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 20px;
                    height: 20px;
                    cursor: nwse-resize;
                    background: linear-gradient(135deg, transparent 50%, #00f5ff 50%);
                    opacity: 0.3;
                    border-radius: 0 0 14px 0;
                    transition: opacity 0.2s;
                }
                
                .resize-handle:hover {
                    opacity: 0.8;
                }

                /* === ENHANCED UI ANIMATIONS === */
                
                /* Trophy Animation for Wins */
                .trophy-animate .trophy-icon {
                    animation: trophyBounce 0.8s ease-in-out infinite;
                    display: inline-block;
                }

                @keyframes trophyBounce {
                    0%, 100% { transform: scale(1) rotate(0deg); }
                    25% { transform: scale(1.15) rotate(-5deg); }
                    50% { transform: scale(1) rotate(0deg); }
                    75% { transform: scale(1.15) rotate(5deg); }
                }

                /* Header Icon Glow for Wins */
                .header-icon.has-wins {
                    animation: iconPulse 2s ease-in-out infinite;
                    filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
                }

                @keyframes iconPulse {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6)); }
                    50% { transform: scale(1.1); filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.9)); }
                }

                /* Win Percent Badge */
                .win-percent {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.6);
                    margin-left: 4px;
                    font-weight: 400;
                }

                .stat-badge.wins .win-percent {
                    color: rgba(34, 197, 94, 0.8);
                }

                /* Card Stagger Animation */
                .spin-result-card {
                    animation: cardSlideIn 0.4s ease-out backwards;
                }

                .spin-result-card:nth-child(1) { animation-delay: 0.05s; }
                .spin-result-card:nth-child(2) { animation-delay: 0.1s; }
                .spin-result-card:nth-child(3) { animation-delay: 0.15s; }
                .spin-result-card:nth-child(4) { animation-delay: 0.2s; }
                .spin-result-card:nth-child(5) { animation-delay: 0.25s; }
                .spin-result-card:nth-child(6) { animation-delay: 0.3s; }
                .spin-result-card:nth-child(7) { animation-delay: 0.35s; }
                .spin-result-card:nth-child(8) { animation-delay: 0.4s; }
                .spin-result-card:nth-child(9) { animation-delay: 0.45s; }
                .spin-result-card:nth-child(10) { animation-delay: 0.5s; }

                @keyframes cardSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                /* Hover Enhancement for Cards */
                .spin-result-card:hover {
                    transform: translateY(-4px) scale(1.02);
                    box-shadow: 0 8px 30px rgba(0, 245, 255, 0.15);
                    transition: all 0.2s ease;
                }

                /* Enhanced Progress Bar Animation */
                .bar-fill {
                    animation: barGrow 1s ease-out forwards;
                    background: linear-gradient(90deg, #22c55e 0%, #4ade80 50%, #22c55e 100%);
                    background-size: 200% 100%;
                    animation: barGrow 1s ease-out forwards, shimmer 2s ease-in-out infinite 1s;
                }

                @keyframes barGrow {
                    from { width: 0%; }
                }

                @keyframes shimmer {
                    0%, 100% { background-position: 200% center; }
                    50% { background-position: 0% center; }
                }

                /* Net Profit Enhancement with Icon */
                .net-profit-display {
                    position: relative;
                }

                .net-profit-display::before {
                    content: '📊';
                    position: absolute;
                    left: -24px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 16px;
                    opacity: 0.7;
                }

                .net-value.profit {
                    text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
                }

                @media (max-width: 768px) {
                    .modal-panel {
                        position: fixed !important;
                        width: 95% !important;
                        height: 60vh !important;
                        max-height: none !important;
                        left: 50% !important;
                        top: 50% !important;
                        transform: translate(-50%, -50%) !important;
                        border-radius: 16px !important;
                        display: flex !important;
                        flex-direction: column !important;
                        overflow: hidden !important;
                        z-index: 999999 !important;
                    }

                    .results-container {
                        flex: 1 1 auto !important;
                        min-height: 0 !important;
                        padding: 1px 10px !important;
                        overflow-y: auto !important;
                        -webkit-overflow-scrolling: touch;
                    }

                    .results-grid {
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 6px !important;
                    }

                    .modal-header {
                        flex: 0 0 auto !important;
                        padding: 10px 15px !important;
                    }

                    .summary-footer {
                        flex: 0 0 auto !important;
                        padding: 12px 15px !important;
                        flex-direction: column;
                        gap: 12px;
                    }

                    .footer-content {
                        flex-direction: column;
                        gap: 12px;
                        width: 100%;
                    }

                    .footer-financials {
                        width: 100%;
                        justify-content: space-between;
                        font-size: 0.9em;
                    }

                    .financial-item {
                        padding: 6px 8px;
                    }

                    .resize-handle {
                        display: none !important;
                    }
                }

                .net-value.loss {
                    text-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
                }

                /* Header Gradient Border Effect */
                .modal-header {
                    position: relative;
                    overflow: hidden;
                }

                .modal-header::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #00f5ff, #ff00ff, #00f5ff, transparent);
                    background-size: 200% 100%;
                    animation: gradientMove 3s linear infinite;
                }

                @keyframes gradientMove {
                    0% { background-position: 200% center; }
                    100% { background-position: -200% center; }
                }

                @media (max-width: 800px) {
                    .results-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                    .footer-content {
                        flex-wrap: wrap;
                        gap: 16px;
                    }
                    .footer-stats {
                        flex-wrap: wrap;
                    }
                }
            `}</style>
        </>
    );

    // Return directly - modal is rendered at page.tsx level
    return modalContent;
}
