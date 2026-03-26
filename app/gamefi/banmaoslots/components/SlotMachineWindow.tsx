'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameStatus, PoolData, PoolTier } from '../hooks/useSlotsGame';

import StatusDashboard from './StatusDashboard';
import BetBar from './BetBar';
import SpinCountSelector from './SpinCountSelector';
import MultiSpinResultsModal from './MultiSpinResultsModal';
import { slotsSounds } from '../lib/sounds';

import { groupHistoryByTx, GroupedSpinHistory } from '../lib/historyUtils';
import { parseTokenAmount } from '../lib/abis';

type SymbolIndex = 0 | 1 | 2 | 3 | 4 | 5;

interface SlotMachineWindowProps {
    pool: PoolData;
    isOpen: boolean;
    onClose: () => void;
    onMinimize: () => void;
    zIndex: number;
    onFocus: () => void;
    defaultPosition: { x: number; y: number };
    // Shared game state (from useSlotsGame hook - only 1 active at a time on blockchain)
    activePoolId: bigint | null; // Which pool is currently spinning on blockchain
    sharedGameState: GameStatus;
    sharedResult: { symbols: number[]; payout: bigint; isJackpot: boolean; poolId?: bigint } | null;
    isPending: boolean;
    hasPendingCommit: boolean; // Whether there's a pending commit on blockchain
    lastTxHash: string | null; // Last transaction hash for verify
    lastSeed: string | null; // Last seed used for verify
    // Approval
    allowance?: bigint; // Current token allowance
    onApproveClick?: (amount: string) => void; // Approval callback
    // Functions
    onSpinClick: (poolId: bigint, betAmount: string, customSeed: string) => void;
    onRevealClick: () => void;
    onRefundClick: () => void;
    setActivePool: (poolId: bigint) => void;
    SLOT_SYMBOLS: readonly string[];
    formatTokenAmount: (amount: bigint) => string;
    getButtonText: (gameState: GameStatus, isActive: boolean) => string;
    // i18n
    t: any; // Using any for simplicity as SlotsTranslations is large
    language: string;
    // Expiry handling
    currentBlock?: bigint;
    commitExpiryBlocks?: bigint;
    commitBlock?: bigint;
    pendingCommitPoolId?: bigint;
    // Spin Details callback
    onSelectSpin?: (spin: any) => void;
    onOpenVerify?: () => void;
    // Multi-spin
    spinCount?: number;
    setSpinCount?: (count: number) => void;
    multiResults?: { symbols: number[]; payout: bigint; isJackpot: boolean }[];
    isMultiSpinning?: boolean;
    lastBetAmount?: string;
    clearMultiResults?: () => void;
    // Z-index management for window-like stacking
    multiResultsZIndex?: number;
    onMultiResultsFocus?: () => void;
    // Onboarding tour
    dataTour?: string;
    // State refresh for next spin (prevents wallet simulation errors from stale nonce)
    onPrepareNextSpin?: () => Promise<boolean>;
    // Rate limit from contract (optional, defaults to 10 if not provided)
    maxSpinsPerMinute?: number;
}

// Tier-specific styling
const TierStyles: Record<PoolTier, { primary: string; glow: string; gradient: string; frameGradient: string }> = {
    cyberpunk: {
        primary: '#ff00ff',
        glow: 'rgba(255, 0, 255, 0.7)',
        gradient: 'linear-gradient(180deg, #2d0033 0%, #1a0020 100%)',
        frameGradient: 'linear-gradient(135deg, #ff00ff 0%, #00ffff 25%, #ff00ff 50%, #00ffff 75%, #ff00ff 100%)'
    },
    diamond: {
        primary: '#00f5ff',
        glow: 'rgba(0, 245, 255, 0.6)',
        gradient: 'linear-gradient(180deg, #0c4a6e 0%, #083344 100%)',
        frameGradient: 'linear-gradient(135deg, #164e63 0%, #0e7490 30%, #155e75 70%, #083344 100%)'
    },
    platinum: {
        primary: '#e2e8f0',
        glow: 'rgba(226, 232, 240, 0.5)',
        gradient: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)',
        frameGradient: 'linear-gradient(135deg, #4b5563 0%, #6b7280 30%, #374151 70%, #1f2937 100%)'
    },
    gold: {
        primary: '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.6)',
        gradient: 'linear-gradient(180deg, #92400e 0%, #451a03 100%)',
        frameGradient: 'linear-gradient(135deg, #b45309 0%, #d97706 30%, #92400e 70%, #451a03 100%)'
    },
    silver: {
        primary: '#9ca3af',
        glow: 'rgba(156, 163, 175, 0.5)',
        gradient: 'linear-gradient(180deg, #4b5563 0%, #1f2937 100%)',
        frameGradient: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 30%, #4b5563 70%, #1f2937 100%)'
    },
    bronze: {
        primary: '#d97706',
        glow: 'rgba(217, 119, 6, 0.5)',
        gradient: 'linear-gradient(180deg, #78350f 0%, #292524 100%)',
        frameGradient: 'linear-gradient(135deg, #92400e 0%, #b45309 30%, #78350f 70%, #292524 100%)'
    },
};

import { InteractiveText } from './InteractiveText';

export function SlotMachineWindow({
    pool,
    isOpen,
    onClose,
    onMinimize,
    zIndex,
    onFocus,
    defaultPosition,
    activePoolId,
    sharedGameState,
    sharedResult,
    isPending,
    hasPendingCommit,
    lastTxHash,
    lastSeed,
    allowance,
    onApproveClick,
    onSpinClick,
    onRevealClick,
    onRefundClick,
    setActivePool,
    onOpenVerify,
    SLOT_SYMBOLS,
    formatTokenAmount,
    getButtonText,
    t,
    language,
    onSelectSpin,
    // Expiry props
    currentBlock,
    commitExpiryBlocks,
    commitBlock,
    pendingCommitPoolId,
    // Multi-spin
    spinCount = 1,
    setSpinCount,
    multiResults = [],
    isMultiSpinning = false,
    lastBetAmount = '0',
    clearMultiResults,
    multiResultsZIndex,
    onMultiResultsFocus,
    dataTour,
    onPrepareNextSpin,
    maxSpinsPerMinute = 10,
}: SlotMachineWindowProps) {
    // Window position/size state
    const [size, setSize] = useState({ width: 420, height: 567 });
    // Center on mount, ignoring defaultPosition
    const [position, setPosition] = useState(() => {
        if (typeof window !== 'undefined') {
            return {
                x: (window.innerWidth - 420) / 2,
                y: (window.innerHeight - 567) / 2
            };
        }
        return defaultPosition;
    });

    // Recalculate center on mount to be precise (fixes SSR mismatch potential)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPosition({
                x: (window.innerWidth - 420) / 2,
                y: (window.innerHeight - 567) / 2
            });
        }
    }, [isOpen]); // Reset to center when reopened

    const [isClosing, setIsClosing] = useState(false);
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 400); // Wait for animation
    };

    const [isMaximized, setIsMaximized] = useState(false);
    const [preMaxSize, setPreMaxSize] = useState({ width: 420, height: 567, x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    // Tooltip and modal states
    const [showRateLimitTooltip, setShowRateLimitTooltip] = useState(false);
    const [showPoolDetails, setShowPoolDetails] = useState(false);

    // ============== INDEPENDENT LOCAL STATE ==============
    // Each window has its own bet amount, custom seed, and local reels
    const [localBetAmount, setLocalBetAmount] = useState('100');
    const [localCustomSeed, setLocalCustomSeed] = useState('');
    // Initialize with RANDOM symbols using the prop
    const [localReels, setLocalReels] = useState<SymbolIndex[]>(() => {
        // Safe check for SSR or empty symbols
        if (!SLOT_SYMBOLS || Object.keys(SLOT_SYMBOLS).length === 0) return [0, 1, 2, 3, 4];
        const count = Object.keys(SLOT_SYMBOLS).length;
        return Array.from({ length: 5 }, () => Math.floor(Math.random() * count) as SymbolIndex);
    });
    const [localResult, setLocalResult] = useState<{ symbols: number[]; payout: bigint; isJackpot: boolean; poolId?: bigint } | null>(null);

    // Reset local state when switching pools to prevent stale data from previous pool
    useEffect(() => {
        setLocalResult(null);
        setWindowNotification(null);
        // Randomize reels on pool switch too
        if (SLOT_SYMBOLS && Object.keys(SLOT_SYMBOLS).length > 0) {
            const count = Object.keys(SLOT_SYMBOLS).length;
            setLocalReels(Array.from({ length: 5 }, () => Math.floor(Math.random() * count) as SymbolIndex));
        }
    }, [pool.poolId, SLOT_SYMBOLS]);

    // ... (unchanged lines) ...

    // Determine button text
    const getLocalButtonText = (): string => {
        // Debug log to see state values
        console.log('[ButtonText] States:', { isPreparingNextSpin, localResult: !!localResult, playAgainCooldown, isOtherPoolSpinning });

        // Show "Preparing..." while refreshing blockchain state for next spin
        if (isPreparingNextSpin) {
            console.log('[ButtonText] → Showing Preparing...');
            return `⏳ ${t.processing || 'Preparing'}...`;
        }

        // If this machine has a result displayed and cooldown is active, show countdown
        if (localResult && playAgainCooldown > 0) {
            return `⏳ ${t.waitSeconds || 'Chờ'} ${playAgainCooldown}s`;
        }

        // After cooldown or no result, show normal button states
        if (isOtherPoolSpinning) {
            return `⏳ ${t.otherMachineActive || 'Other Machine Active'}`;
        }

        // If no local result, treat 'result' global state as 'idle' for this specific machine
        // so it shows 'SPIN' (or Connect Wallet etc) instead of 'Play Again' from another machine's game
        const effectiveState = (isThisPoolActive && sharedGameState === 'result' && !localResult)
            ? 'idle'
            : (isThisPoolActive ? sharedGameState : 'idle');

        // Check if approval needed (only when idle or result state)
        if (effectiveState === 'idle' || (effectiveState === 'result' && !localResult)) {
            try {
                const betParsed = parseTokenAmount(localBetAmount);
                const totalBet = betParsed * BigInt(spinCount || 1);
                if (allowance !== undefined && allowance < totalBet) {
                    return `✅ ${t.approve || 'Approve'} $BANMAO`;
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        return getButtonText(effectiveState, isThisPoolActive);
    };

    // Check if approval is needed (for button onClick logic)
    const needsApproval = (): boolean => {
        try {
            const betParsed = parseTokenAmount(localBetAmount);
            const totalBet = betParsed * BigInt(spinCount || 1);
            return allowance !== undefined && allowance < totalBet;
        } catch (e) {
            return false;
        }
    };

    // Seed history (stored per pool in localStorage)
    const seedHistoryKey = `banmao_seed_history_${pool.poolId}`;
    const [seedHistory, setSeedHistory] = useState<string[]>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(seedHistoryKey);
            return stored ? JSON.parse(stored) : [];
        }
        return [];
    });
    const [showSeedHistory, setShowSeedHistory] = useState(false);
    const [showVerifyInfo, setShowVerifyInfo] = useState(false);
    const [copiedText, setCopiedText] = useState<string | null>(null);

    // Pool-specific spin history
    const [poolHistory, setPoolHistory] = useState<any[]>([]);
    const [showPoolHistory, setShowPoolHistory] = useState(false);

    // In-window notification (replaces global toast)
    const [windowNotification, setWindowNotification] = useState<{ message: string; type: 'win' | 'lose' | 'info' } | null>(null);

    // Cooldown timer for "Play Again" to prevent RPC rate limiting
    const [playAgainCooldown, setPlayAgainCooldown] = useState(0);
    // State-based readiness check (refreshing blockchain data before next spin)
    const [isPreparingNextSpin, setIsPreparingNextSpin] = useState(false);

    // Rate Limit Display - track spins per minute (uses prop from contract)
    const [spinsThisMinute, setSpinsThisMinute] = useState(0);
    const [currentMinute, setCurrentMinute] = useState(() => Math.floor(Date.now() / 60000));

    // Reset spin counter every minute
    useEffect(() => {
        const interval = setInterval(() => {
            const newMinute = Math.floor(Date.now() / 60000);
            if (newMinute !== currentMinute) {
                setSpinsThisMinute(0);
                setCurrentMinute(newMinute);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [currentMinute]);


    // Check if THIS pool is the active one on blockchain
    // IMPORTANT: precise check for ready_to_reveal to avoid cross-pool contamination
    const isReadyToReveal = sharedGameState === 'ready_to_reveal';
    const isThisPoolPendingCommit = pendingCommitPoolId !== undefined && pendingCommitPoolId === pool.poolId;
    const isOtherPoolPendingCommit = pendingCommitPoolId !== undefined && pendingCommitPoolId !== pool.poolId;

    // Normal active check, BUT refined for reveal state
    const isThisPoolActive = (activePoolId !== null && activePoolId === pool.poolId) &&
        (!isReadyToReveal || isThisPoolPendingCommit); // If revealing, MUST match pending commit ID

    const isThisPoolSpinning = isThisPoolActive && ['committing', 'waiting', 'revealing', 'ready_to_reveal'].includes(sharedGameState);

    // Check if other pool is spinning OR if there is a pending commit for another pool
    const isOtherPoolSpinning = (activePoolId !== null && activePoolId !== pool.poolId && ['committing', 'waiting', 'revealing', 'ready_to_reveal'].includes(sharedGameState))
        || (isReadyToReveal && isOtherPoolPendingCommit);

    // Determine local game state for this window
    const getLocalGameState = (): GameStatus | 'other_spinning' => {
        if (isThisPoolActive) {
            return sharedGameState as GameStatus;
        }
        if (isOtherPoolSpinning) {
            return 'other_spinning'; // Another pool is active
        }
        return 'idle';
    };
    const localGameState = getLocalGameState();

    // Spinning animation for this window only
    useEffect(() => {
        let spinInterval: NodeJS.Timeout;
        if (isThisPoolSpinning) {
            slotsSounds.startSpinning();
            spinInterval = setInterval(() => {
                // For legacy shuffle effect if needed
            }, 100);
        } else {
            slotsSounds.stopSpinning();
        }
        return () => {
            clearInterval(spinInterval);
            slotsSounds.stopSpinning(); // Cleanup on unmount/change
        };
    }, [isThisPoolSpinning]);

    // Sync result when this pool's spin completes
    useEffect(() => {
        // Only sync if this is the active pool AND the result is for THIS pool (or poolId not available)
        const resultPoolId = sharedResult?.poolId;
        // If poolId is undefined, allow sync for backward compatibility
        // If poolId exists, check it matches this pool
        const isResultForThisPool = resultPoolId === undefined || resultPoolId === pool.poolId;

        // Debug log for sync issue
        console.log('[SyncEffect] Check:', {
            isThisPoolActive,
            sharedGameState,
            hasResult: !!sharedResult,
            resultPoolId: resultPoolId?.toString(),
            thisPoolId: pool.poolId.toString(),
            isResultForThisPool,
            willSync: isThisPoolActive && sharedGameState === 'result' && sharedResult && isResultForThisPool
        });

        if (isThisPoolActive && sharedGameState === 'result' && sharedResult && isResultForThisPool) {
            console.log('[SyncEffect] ✅ Syncing result to local state:', sharedResult);
            setLocalReels(sharedResult.symbols.map(s => s as SymbolIndex));
            setLocalResult(sharedResult);
            // Auto-show verify info for transparency so user sees the seed
            if (lastSeed) setShowVerifyInfo(true);
        }
    }, [isThisPoolActive, sharedGameState, sharedResult, lastSeed, pool.poolId]);

    // Show in-window notifications for game state changes
    useEffect(() => {
        if (!isThisPoolActive) return;

        if (sharedGameState === 'committing') {
            setLocalResult(null);
            setWindowNotification({ message: t.betPlaced || '📤 Bet placed!', type: 'info' });
            setTimeout(() => setWindowNotification(null), 3000);
        } else if (sharedGameState === 'waiting') {
            setWindowNotification({ message: t.waitingForBlock || '⏳ Waiting for block...', type: 'info' });
            setTimeout(() => setWindowNotification(null), 4000);
        } else if (sharedGameState === 'ready_to_reveal') {
            setWindowNotification({ message: t.readyToReveal || '🎲 Ready! Click to reveal!', type: 'info' });
            // Don't auto-hide - user needs to see this
        } else if (sharedGameState === 'revealing') {
            setWindowNotification({ message: t.revealing || '🎰 Revealing...', type: 'info' });
        } else if (sharedGameState === 'approving') {
            setWindowNotification({ message: t.approving || '✅ Approving tokens...', type: 'info' });
        }
    }, [isThisPoolActive, sharedGameState, t]);

    // Show in-window notification when result is received
    useEffect(() => {
        if (localResult) {
            const payout = localResult.payout;
            if (localResult.isJackpot) {
                setWindowNotification({ message: `🎉🎰 ${t.jackpot || 'JACKPOT'}!!!`, type: 'win' });
            } else if (payout > BigInt(0)) {
                const payoutNum = Number(payout) / 1e18;
                setWindowNotification({ message: `🎉 +${payoutNum.toLocaleString(undefined, { maximumFractionDigits: 0 })} $BANMAO!`, type: 'win' });
            } else {
                setWindowNotification({ message: `🍀 ${t.betterLuck || 'Better luck next time!'}`, type: 'lose' });
            }
            // Auto-hide after 5 seconds
            const timeout = setTimeout(() => setWindowNotification(null), 5000);
            return () => clearTimeout(timeout);
        }
    }, [localResult, t]);

    // Simple cooldown: Show result for 10 seconds to allow RPC sync
    // RPC delay warning will display during this time
    useEffect(() => {
        if (localResult) {
            // Show result for 10 seconds for RPC to sync (warning displays during this time)
            setPlayAgainCooldown(10);

            const countdownInterval = setInterval(() => {
                setPlayAgainCooldown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownInterval);
                        setLocalResult(null); // Enable SPIN button immediately
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Background: refresh blockchain data (non-blocking)
            if (onPrepareNextSpin) {
                onPrepareNextSpin().then(success => {
                    console.log('[SlotMachine] Background state refresh:', success ? 'success' : 'failed');
                }).catch(() => { });
            }

            return () => clearInterval(countdownInterval);
        } else {
            setPlayAgainCooldown(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localResult]); // Note: onPrepareNextSpin intentionally excluded to prevent infinite loop
    // Auto-refresh pool history when a spin result is recorded (real-time update)
    useEffect(() => {
        if (localResult && showPoolHistory) {
            // Delay slightly to ensure DB has recorded the spin
            const timeout = setTimeout(() => {
                fetch(`/api/slots/history-chain?poolId=${pool.poolId}&limit=20`)
                    .then(r => r.json())
                    .then(d => { if (d.success) setPoolHistory(d.history || []); })
                    .catch(console.error);
            }, 1500); // 1.5 second delay for DB write + retry
            return () => clearTimeout(timeout);
        }
    }, [localResult, pool.poolId, showPoolHistory]);

    // Polling: Refresh pool history every 15 seconds when panel is open (sync with all players)
    useEffect(() => {
        if (!showPoolHistory) return;

        const fetchHistory = () => {
            fetch(`/api/slots/history-chain?poolId=${pool.poolId}&limit=20`)
                .then(r => r.json())
                .then(d => { if (d.success) setPoolHistory(d.history || []); })
                .catch(console.error);
        };

        // Initial fetch
        fetchHistory();

        // Poll every 60 seconds (reduced from 15s - WebSocket handles real-time updates)
        const interval = setInterval(fetchHistory, 60000);
        return () => clearInterval(interval);
    }, [showPoolHistory, pool.poolId]);

    // Expiry Check - Only show expired UI when actually waiting/ready (not after settlement)
    const blocksRemaining = (currentBlock && commitBlock && commitExpiryBlocks && hasPendingCommit)
        ? Number((commitBlock + commitExpiryBlocks) - currentBlock)
        : null;
    // Only consider expired if in an active waiting state, not during/after settlement
    const isInActiveWaitingState = localGameState === 'waiting' || localGameState === 'ready_to_reveal';
    const isCommitExpired = blocksRemaining !== null && blocksRemaining < 0 && isInActiveWaitingState;

    const tier = pool.tier || 'bronze';
    const style = TierStyles[tier];
    const tierIcon = tier === 'cyberpunk' ? '🌆' : tier === 'diamond' ? '💎' : tier === 'platinum' ? '⚪' : tier === 'gold' ? '🏆' : tier === 'silver' ? '🥈' : '🥉';
    const poolBalance = (Number(pool.balance) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 });

    // Calculate max bet per spin considering spinCount
    // For multi-spin, the total bet = betPerSpin * spinCount
    // Pool reserve ratio: pool.balance / 500 is the max total payout the pool can handle
    // So max bet per spin = min(pool.maxBet, pool.balance / 500 / spinCount)
    const poolMaxBet = Number(pool.maxBet) / 1e18;
    const poolReserveLimit = Number(pool.balance) / 1e18 / 500;
    // Floor to integer and subtract 1 for safety margin (whole number display)
    // This ensures we NEVER exceed contract limit and shows clean whole numbers
    const rawMax = Math.min(poolMaxBet, poolReserveLimit / spinCount);
    const effectiveMax = Math.floor(rawMax) - 1; // 805.02 → 805 → 804
    const minBetValue = Number(pool.minBet) / 1e18;

    // Auto-cap bet amount to not exceed effectiveMax (which already accounts for spinCount)
    useEffect(() => {
        const currentBet = Number(localBetAmount) || 0;
        if (effectiveMax > 0 && currentBet > effectiveMax) {
            // Use floor to be safe
            setLocalBetAmount((Math.floor(effectiveMax * 100) / 100).toFixed(2));
        }
        // Also ensure bet is at least minBet
        if (minBetValue > 0 && currentBet < minBetValue && currentBet > 0) {
            setLocalBetAmount(minBetValue.toString());
        }
    }, [effectiveMax, minBetValue, spinCount, localBetAmount]);

    // Handle drag start
    const handleDragStart = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.panel-controls')) return;
        e.preventDefault();
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
        onFocus?.();
    };

    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        onFocus?.();
    };

    // Global mouse move handler
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x));
                const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.y));
                setPosition({ x: newX, y: newY });
            }
            if (isResizing && panelRef.current) {
                const rect = panelRef.current.getBoundingClientRect();
                const newWidth = Math.max(350, e.clientX - rect.left);
                const newHeight = Math.max(500, e.clientY - rect.top);
                setSize({ width: newWidth, height: newHeight });
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
    }, [isDragging, isResizing, dragOffset, size]);

    // Handle spin button click
    const handleLocalSpinClick = useCallback(() => {
        // Expiry check
        if (isCommitExpired) {
            onRefundClick(); // Call settleExpiredCommit
            return;
        }

        // Check if approval is needed first
        if (needsApproval() && onApproveClick) {
            onApproveClick(localBetAmount);
            return;
        }

        // Set this pool as active and trigger spin
        setActivePool(pool.poolId);

        let finalSeed = localCustomSeed;
        // Auto-generate seed if empty so user can see what verification code is used
        if (!finalSeed || finalSeed.trim() === '') {
            finalSeed = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
            setLocalCustomSeed(finalSeed);
        }

        // Note: localResult is cleared by the cooldown effect after preparation completes
        // This ensures blockchain state (nonce) is refreshed before next spin
        if (localGameState === 'ready_to_reveal' || (isThisPoolActive && sharedGameState === 'ready_to_reveal')) {
            // Reveal
            onRevealClick();
        } else if (localGameState === 'idle' || localGameState === 'other_spinning' || !localResult) {
            // Save seed to history before spinning
            saveSeedToHistory(finalSeed);
            // Start new spin (if other pool was spinning, player will need to wait or this will fail)
            onSpinClick(pool.poolId, localBetAmount, finalSeed);
            // Increment spin counter for rate limit display
            setSpinsThisMinute(prev => prev + (spinCount || 1));
        }
        // If localResult exists and we're not in reveal state, the cooldown/prepare is still running
        // Button should be disabled so this shouldn't happen, but if it does, we don't proceed
    }, [pool.poolId, localBetAmount, localCustomSeed, localGameState, isThisPoolActive, sharedGameState, onSpinClick, onRevealClick, setActivePool, isCommitExpired, onRefundClick, localResult, needsApproval, onApproveClick]);

    // Min/Max bet helpers
    const minBetAmount = Math.max(1, Number(pool.minBet) / 1e18);
    const maxBetAmount = effectiveMax;

    const setMinBet = () => setLocalBetAmount(minBetAmount.toString());
    // Use Math.floor to round DOWN and prevent exceeding contract limit
    // toFixed(2) can round UP (79.745 -> 79.75) which may exceed max
    const setMaxBet = () => setLocalBetAmount((Math.floor(maxBetAmount * 100) / 100).toFixed(2));
    const setHalfBet = () => setLocalBetAmount(Math.floor(maxBetAmount / 2).toString());
    const setDoubleBet = () => {
        const current = parseFloat(localBetAmount) || 0;
        const doubled = Math.min(current * 2, maxBetAmount);
        setLocalBetAmount(Math.floor(doubled).toString());
    };

    // Copy to clipboard helper
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedText(label);
            setTimeout(() => setCopiedText(null), 2000);
        });
    };

    // Save seed to history
    const saveSeedToHistory = (seed: string) => {
        if (!seed || seed.trim() === '') return;
        const updated = [seed, ...seedHistory.filter(s => s !== seed)].slice(0, 10); // Keep last 10
        setSeedHistory(updated);
        localStorage.setItem(seedHistoryKey, JSON.stringify(updated));
    };

    // Helper to explain the result - now fully internationalized
    const getResultExplanation = () => {
        if (!localResult) return null;

        const { symbols, payout, isJackpot } = localResult;
        if (payout === BigInt(0)) {
            return t.noMatch || "😿 No matching combinations.";
        }

        // Calculate best streak (matching contract logic)
        let bestSymbol = symbols[0];
        let bestCount = 1;
        let currentSymbol = symbols[0];
        let currentCount = 1;

        for (let i = 1; i < symbols.length; i++) {
            if (symbols[i] === currentSymbol) {
                currentCount++;
                if (currentCount > bestCount) {
                    bestCount = currentCount;
                    bestSymbol = currentSymbol;
                }
            } else {
                currentSymbol = symbols[i];
                currentCount = 1;
            }
        }

        const emoji = SLOT_SYMBOLS[bestSymbol] || "❓";
        const symbolKey = [`symbolBanmao`, `symbolBanana`, `symbolDiamond`, `symbolStar`, `symbolClover`, `symbolSeven`][bestSymbol] || "symbol";
        const name = (t as any)[symbolKey] || "symbol";

        if (isJackpot) {
            return (t.resultJackpot || "🎉 JACKPOT MATCH!")
                .replace('{name}', name)
                .replace('{emoji}', emoji);
        }

        // Multipliers from contract
        const multipliers: Record<number, number[]> = {
            0: [10, 50, 200], 1: [8, 40, 150], 2: [5, 20, 80],
            3: [3, 15, 50], 4: [2, 8, 25], 5: [1.5, 5, 15]
        };
        const multArr = multipliers[bestSymbol] || [0, 0, 0];
        const multiplier = multArr[Math.max(0, Math.min(2, bestCount - 3))];

        return (t.resultMatch || "✨ WIN!")
            .replace('{count}', bestCount.toString())
            .replace('{name}', name)
            .replace('{emoji}', emoji)
            .replace('{multiplier}', multiplier.toString());
    };

    // Use seed from history
    const useSeedFromHistory = (seed: string) => {
        setLocalCustomSeed(seed);
        setShowSeedHistory(false);
    };

    // Generate random seed
    const generateRandomSeed = () => {
        const seed = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        setLocalCustomSeed(seed);
    };





    // Is button disabled? Also disable during cooldown after result
    // Is button disabled? Also disable during cooldown and state refresh preparation
    const isSpinDisabled = isPending || isOtherPoolSpinning || (isThisPoolSpinning && !['ready_to_reveal', 'result'].includes(sharedGameState)) || (localResult && playAgainCooldown > 0) || isPreparingNextSpin;

    // Calculate winning indices for visual effects
    const winningIndices = React.useMemo(() => {
        if (isThisPoolSpinning || !localResult || localResult.payout === BigInt(0)) return [];

        const counts: Record<number, number> = {};
        localReels.forEach(s => { counts[s] = (counts[s] || 0) + 1; });

        let maxSymbol = -1;
        let maxCount = 0;

        for (const [s, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                maxSymbol = Number(s);
            }
        }

        if (maxCount >= 3) {
            return localReels.map((s, i) => s === maxSymbol ? i : -1).filter(i => i !== -1);
        }
        return [];
    }, [localReels, isThisPoolSpinning, localResult]);

    // Play win/lose sounds when result appears
    useEffect(() => {
        if (!isThisPoolSpinning && localResult && winningIndices.length > 0) {
            // We have a win - play win sound based on match count
            const matchCount = winningIndices.length;
            setTimeout(() => slotsSounds.win(matchCount), 300);
        } else if (!isThisPoolSpinning && localResult && localResult.payout === BigInt(0)) {
            // No win - play lose/no match sound
            setTimeout(() => slotsSounds.noMatch(), 300);
        }
    }, [isThisPoolSpinning, localResult, winningIndices]);

    if (!isOpen) return null;

    return (
        <div
            ref={panelRef}
            className="draggable-panel"
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                zIndex,
                display: 'flex',
                flexDirection: 'column',
                background: style.frameGradient,
                borderRadius: 16,
                border: `3px solid ${isThisPoolSpinning ? '#00ff88' : style.primary}`,
                boxShadow: isThisPoolSpinning
                    ? `0 0 80px rgba(0, 255, 136, 0.6), 0 0 120px rgba(0, 255, 136, 0.4)`
                    : `0 0 60px ${style.glow}, 0 0 100px ${style.glow}, 0 20px 50px rgba(0, 0, 0, 0.5)`,
                overflow: 'hidden',
                userSelect: isDragging ? 'none' : 'auto',
                animation: isClosing ? 'popOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            onClick={onFocus}
            data-tour={dataTour}
        >
            <style jsx global>{`
                @keyframes popIn {
                    0% { transform: scale(0.4) translateY(50px); opacity: 0; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                /* ... other existing keyframes ... */
                
                /* Mobile Window Controls Customization */
                @media (max-width: 768px) {
                    .window-minimize-btn {
                        display: none !important;
                    }
                    .panel-controls {
                        gap: 36px !important; /* Increased spacing further to prevent accidental clicks */
                    }
                }
                
                @keyframes popOut {
                    0% { transform: scale(1) translateY(0); opacity: 1; }
                    100% { transform: scale(0.8) translateY(20px); opacity: 0; }
                }
                @keyframes breathe {
                    0% { transform: scale(1); filter: brightness(1); }
                    50% { transform: scale(1.03); filter: brightness(1.2) drop-shadow(0 0 5px ${style.primary}40); }
                    100% { transform: scale(1); filter: brightness(1); }
                }
                @keyframes sparkle-border {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                @keyframes sparkle-rotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes breathe-text {
                    0%, 100% { opacity: 1; transform: scale(1); text-shadow: 0 0 0 transparent; }
                    50% { opacity: 0.9; transform: scale(1.02); text-shadow: 0 0 15px currentColor; }
                }
                @keyframes breathe-text-fast {
                    0%, 100% { opacity: 1; transform: scale(1); text-shadow: 0 0 0 transparent; }
                    50% { opacity: 0.85; transform: scale(1.05); text-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
                }
                @keyframes shimmer {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }
                .interactive-text {
                    transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
                    display: inline-block;
                }
                .interactive-text:hover {
                    transform: scale(1.1);
                    text-shadow: 0 0 10px currentColor;
                    filter: brightness(1.3);
                    z-index: 10;
                    position: relative;
                }
                .spin-button-text {
                    animation: breathe-text 2s ease-in-out infinite;
                }
                .spin-button-text-waiting {
                    animation: breathe-text-fast 1s ease-in-out infinite;
                }
                .spin-button-text-spinning {
                    animation: breathe-text-fast 0.5s ease-in-out infinite;
                }
            `}</style>

            {/* Title Bar - Tier Header */}
            <div
                onMouseDown={handleDragStart}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: isThisPoolSpinning
                        ? 'linear-gradient(180deg, rgba(0, 255, 136, 0.4) 0%, transparent 100%)'
                        : `linear-gradient(180deg, ${style.primary}50 0%, transparent 100%)`,
                    borderBottom: `2px solid ${isThisPoolSpinning ? 'rgba(0, 255, 136, 0.4)' : `${style.primary}40`}`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    {/* Tier Badge with dark background for visibility */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(0, 0, 0, 0.7)',
                        padding: '4px 10px',
                        borderRadius: 20,
                        border: `1px solid ${style.primary}60`,
                    }}>
                        <InteractiveText style={{ fontSize: 18 }}>{tierIcon}</InteractiveText>
                        <InteractiveText style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 12,
                            fontWeight: 800,
                            color: '#fff',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            textShadow: `0 0 8px ${style.primary}`,
                        }}>
                            {(t as any)[`tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`] || tier}
                        </InteractiveText>
                    </div>
                    {/* Clickable Pool ID */}
                    <div
                        onClick={(e) => { e.stopPropagation(); setShowPoolDetails(true); }}
                        style={{
                            cursor: 'pointer',
                            padding: '2px 8px',
                            borderRadius: 8,
                            transition: 'all 0.2s',
                            background: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 191, 255, 0.2)';
                            e.currentTarget.style.color = '#00BFFF';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                        }}
                        title={t.clickForPoolDetails || "Click for pool details"}
                    >
                        <InteractiveText style={{ fontSize: 11, color: 'inherit' }}>
                            Pool #{pool.poolId.toString()}
                        </InteractiveText>
                    </div>
                    {/* Status dot */}
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: isThisPoolSpinning ? '#00ff88' : (pool.isActive ? '#22c55e' : '#ef4444'),
                        boxShadow: isThisPoolSpinning ? '0 0 12px #00ff88' : `0 0 8px ${pool.isActive ? '#22c55e' : '#ef4444'}`,
                        animation: isThisPoolSpinning ? 'pulse 1s infinite' : 'none',
                    }} />
                    {isThisPoolSpinning && (
                        <span style={{ fontSize: 10, color: '#00ff88' }}>{t.spinningActivity || "SPINNING..."}</span>
                    )}
                </div>
                {/* Rate Limit Indicator with Tooltip */}
                <div
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setShowRateLimitTooltip(true)}
                    onMouseLeave={() => setShowRateLimitTooltip(false)}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 10,
                        padding: '3px 10px',
                        background: 'rgba(0,0,0,0.5)',
                        borderRadius: 12,
                        border: `1px solid ${spinsThisMinute >= maxSpinsPerMinute - 2 ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`,
                        color: spinsThisMinute >= maxSpinsPerMinute ? '#ef4444' :
                            spinsThisMinute >= maxSpinsPerMinute - 2 ? '#f59e0b' : '#94a3b8',
                        cursor: 'help'
                    }}>
                        <span>⏱️</span>
                        <span style={{ fontWeight: 600 }}>
                            {maxSpinsPerMinute - spinsThisMinute}/{maxSpinsPerMinute}
                        </span>
                    </div>
                    {/* Rate Limit Tooltip */}
                    {showRateLimitTooltip && (
                        <div style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            right: 0,
                            width: 220,
                            padding: 12,
                            background: 'rgba(15, 23, 42, 0.98)',
                            border: '1px solid rgba(0, 191, 255, 0.4)',
                            borderRadius: 12,
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(0, 191, 255, 0.2)',
                            zIndex: 1000,
                            fontSize: 11,
                            color: '#e2e8f0',
                            lineHeight: 1.5
                        }}>
                            <div style={{ fontWeight: 700, color: '#00BFFF', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>⏱️</span> {t.rateLimitTitle || 'Speed Limit'}
                            </div>
                            <div style={{ marginBottom: 8 }}>
                                {t.rateLimitDesc || 'To ensure fair play and prevent abuse, each player is limited to a maximum number of spins per minute.'}
                            </div>
                            <div style={{
                                padding: '6px 10px',
                                background: 'rgba(0, 191, 255, 0.1)',
                                borderRadius: 8,
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <span>{t.remaining || 'Remaining'}:</span>
                                <span style={{ fontWeight: 700, color: spinsThisMinute >= maxSpinsPerMinute - 2 ? '#f59e0b' : '#22c55e' }}>
                                    {maxSpinsPerMinute - spinsThisMinute} / {maxSpinsPerMinute}
                                </span>
                            </div>
                            <div style={{ marginTop: 6, fontSize: 9, color: '#94a3b8' }}>
                                {t.rateLimitResetNote || 'Resets every minute automatically'}
                            </div>
                        </div>
                    )}
                </div>
                <div className="panel-controls" style={{ display: 'flex', gap: 6 }}>

                    <button
                        className="window-minimize-btn"
                        onClick={onMinimize}
                        style={{
                            width: 26, height: 26, border: `1px solid ${style.primary}50`,
                            borderRadius: 8, background: 'rgba(250, 204, 21, 0.3)',
                            color: '#facc15', cursor: 'pointer', fontSize: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title={t.minimize || "Minimize"}
                    >─</button>
                    <button
                        onClick={() => {
                            if (isMaximized) {
                                // Restore from maximize
                                setSize({ width: preMaxSize.width, height: preMaxSize.height });
                                setPosition({ x: preMaxSize.x, y: preMaxSize.y });
                                setIsMaximized(false);
                            } else {
                                // Enlarge panel with zoomed content
                                setPreMaxSize({ width: size.width, height: size.height, x: position.x, y: position.y });
                                setSize({ width: 650, height: 850 });
                                setPosition({ x: Math.max(20, position.x - 100), y: Math.max(20, position.y - 100) });
                                setIsMaximized(true);
                            }
                        }}
                        style={{
                            width: 26, height: 26, border: `1px solid ${style.primary}50`,
                            borderRadius: 8, background: 'rgba(34, 197, 94, 0.3)',
                            color: '#22c55e', cursor: 'pointer', fontSize: 10,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title={isMaximized ? (t.restore || "Restore") : (t.enlarge || "Enlarge")}
                    >{isMaximized ? '◻' : '□'}</button>
                    <button
                        onClick={handleClose}
                        style={{
                            width: 26, height: 26, border: `1px solid ${style.primary}50`,
                            borderRadius: 8, background: 'rgba(239, 68, 68, 0.3)',
                            color: '#ef4444', cursor: 'pointer', fontSize: 14, fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title={t.close || "Close"}
                    >×</button>
                </div>
            </div>

            {/* In-Window Notification Banner */}
            {windowNotification && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        width: '100%',
                        padding: '12px 20px',
                        background: 'linear-gradient(180deg, rgba(15, 15, 25, 0.95) 0%, rgba(10, 10, 20, 0.98) 100%)',
                        borderRadius: '12px 12px 0 0', // Rounded top, square bottom
                        borderBottom: `2px solid ${windowNotification.type === 'win' ? '#22c55e'
                            : windowNotification.type === 'lose' ? '#ef4444'
                                : style.primary
                            }`,
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 700,
                        textAlign: 'center',
                        zIndex: 100,
                        boxShadow: `
                            0 4px 15px ${windowNotification.type === 'win' ? 'rgba(34, 197, 94, 0.4)'
                                : windowNotification.type === 'lose' ? 'rgba(239, 68, 68, 0.3)'
                                    : style.glow},
                            inset 0 1px 0 rgba(255,255,255,0.1)
                        `,
                        animation: 'slideDown 0.3s ease-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(8px)',
                    }}
                    onClick={() => setWindowNotification(null)}
                >
                    <InteractiveText style={{
                        color: windowNotification.type === 'win' ? '#22c55e'
                            : windowNotification.type === 'lose' ? '#ef4444'
                                : style.primary,
                        filter: 'drop-shadow(0 0 6px currentColor)',
                    }}>
                        {windowNotification.message}
                    </InteractiveText>
                    <button
                        style={{
                            position: 'absolute',
                            right: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            fontSize: 18,
                            padding: 4,
                            lineHeight: 1,
                        }}
                    >×</button>
                </div>
            )}

            {/* Main Content Area */}
            <div style={{
                flex: 1,
                background: 'linear-gradient(180deg, #0a0a15 0%, #12122a 50%, #0a0a15 100%)',
                margin: 6,
                borderRadius: 12,
                padding: isMaximized ? 20 : 14,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE/Edge
                border: `1px solid ${style.primary}30`,
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9)',
                // Use CSS zoom for content scaling when maximized
                zoom: isMaximized ? 1.12 : 1,
            }} className="hide-scrollbar">
                {/* Main Game Area */}
                <div style={{
                    display: 'flex',
                    gap: 12,
                    flex: 1,
                }}>
                    {/* Left: Main Game Content */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* Status Dashboard (Consolidated Top Section) */}
                        <div data-tour="pool-info">
                            <StatusDashboard
                                pool={pool}
                                poolBalance={poolBalance}
                                formatTokenAmount={formatTokenAmount}
                                t={t}
                                style={style}
                                minBetValue={minBetValue}
                                effectiveMax={effectiveMax}
                            />
                        </div>

                        {/* Payout Table Popup */}


                        {/* Reels + Result Overlay Container */}
                        <div data-tour="reels-area" style={{ position: 'relative', marginBottom: 8 }}>
                            {/* 5 Reels Display - Premium Neon Style */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'stretch',
                                gap: 4,
                                padding: '6px',
                                background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(10,10,30,0.95) 50%, rgba(0,0,0,0.9) 100%)',
                                borderRadius: 16, // Less rounded as requested
                                border: `2px solid ${isThisPoolSpinning ? '#00ff88' : style.primary}40`,
                                position: 'relative',
                                boxShadow: isThisPoolSpinning
                                    ? `inset 0 0 30px rgba(0, 255, 136, 0.3), 0 0 20px rgba(0, 255, 136, 0.2)`
                                    : `inset 0 0 40px rgba(0,0,0,0.8), 0 0 15px ${style.glow}`,
                            }}>
                                {/* Scan line overlay */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
                                    pointerEvents: 'none',
                                    zIndex: 5,
                                }} />

                                {/* Animated gradient overlay when spinning */}
                                {isThisPoolSpinning && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'linear-gradient(180deg, rgba(0,255,136,0.1) 0%, transparent 30%, transparent 70%, rgba(0,255,136,0.1) 100%)',
                                        animation: 'pulse 0.5s ease-in-out infinite',
                                        pointerEvents: 'none',
                                        zIndex: 4,
                                    }} />
                                )}

                                {localReels.map((symbol, i) => {
                                    const isWinning = winningIndices.includes(i);
                                    const glowColor = isWinning ? SYMBOL_COLORS[symbol] : 'transparent';

                                    return (
                                        <div key={i}
                                            className={`reel-container ${isThisPoolSpinning ? 'spinning' : ''} ${isWinning ? 'winning-symbol' : ''}`}
                                            style={{
                                                flex: 1,
                                                height: 60,
                                                maxWidth: 65,
                                                position: 'relative',
                                                overflow: 'hidden',
                                                background: 'linear-gradient(180deg, #0a0a1a 0%, #141428 50%, #0a0a1a 100%)',
                                                borderRadius: 10,
                                                border: `2px solid ${isThisPoolSpinning ? '#00ff88' : isWinning ? glowColor : 'rgba(255,255,255,0.15)'}`,
                                                boxShadow: isThisPoolSpinning
                                                    ? `0 0 15px rgba(0, 255, 136, 0.5), inset 0 0 8px rgba(0, 255, 136, 0.2)`
                                                    : isWinning
                                                        ? `0 0 25px ${glowColor}, inset 0 0 12px ${glowColor}50`
                                                        : `0 0 8px ${style.primary}20, inset 0 0 10px rgba(0,0,0,0.5)`, // Light passive glow
                                                transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
                                                '--glow-color': glowColor,
                                                animation: isThisPoolSpinning ? 'none' : isWinning ? 'none' : 'breathe 4s ease-in-out infinite',
                                                animationDelay: `${i * 0.5}s`, // Staggered breathing
                                            } as React.CSSProperties}
                                        >
                                            {/* Inner glow for winning symbols */}
                                            {isWinning && (
                                                <div style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    background: `radial-gradient(circle at center, ${glowColor}30 0%, transparent 70%)`,
                                                    animation: 'pulse 0.8s ease-in-out infinite',
                                                    pointerEvents: 'none',
                                                }} />
                                            )}

                                            <div className="reel-strip" style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                position: 'absolute',
                                                width: '100%',
                                                top: 0,
                                                transform: isThisPoolSpinning
                                                    ? 'none'
                                                    : `translateY(-${symbol * 60}px)`,
                                                transition: isThisPoolSpinning ? 'none' : `transform ${0.5 + i * 0.12}s cubic-bezier(0.33, 1, 0.68, 1)`,
                                                animationName: isThisPoolSpinning ? 'reel-spin' : 'none',
                                                animationDuration: isThisPoolSpinning ? '0.4s' : '0s',
                                                animationTimingFunction: 'linear',
                                                animationIterationCount: isThisPoolSpinning ? 'infinite' : '1',
                                                animationDelay: `${i * 0.06}s`,
                                            }}>
                                                {/* Multi-symbol strip for animation */}
                                                {[...SLOT_SYMBOLS, ...SLOT_SYMBOLS, ...SLOT_SYMBOLS].map((s, idx) => (
                                                    <div key={idx} style={{
                                                        height: 60,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 30,
                                                        filter: isWinning && idx % SLOT_SYMBOLS.length === symbol ? 'drop-shadow(0 0 6px currentColor)' : 'none',
                                                    }}>
                                                        {s}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Corner decorations */}
                                <div style={{
                                    position: 'absolute',
                                    top: 4, left: 4,
                                    width: 8, height: 8,
                                    borderTop: `2px solid ${style.primary}60`,
                                    borderLeft: `2px solid ${style.primary}60`,
                                    pointerEvents: 'none',
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    top: 4, right: 4,
                                    width: 8, height: 8,
                                    borderTop: `2px solid ${style.primary}60`,
                                    borderRight: `2px solid ${style.primary}60`,
                                    pointerEvents: 'none',
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    bottom: 4, left: 4,
                                    width: 8, height: 8,
                                    borderBottom: `2px solid ${style.primary}60`,
                                    borderLeft: `2px solid ${style.primary}60`,
                                    pointerEvents: 'none',
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    bottom: 4, right: 4,
                                    width: 8, height: 8,
                                    borderBottom: `2px solid ${style.primary}60`,
                                    borderRight: `2px solid ${style.primary}60`,
                                    pointerEvents: 'none',
                                }} />
                            </div>

                            {/* Result Overlay - Shows BELOW the reels as a banner */}
                            {localResult && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    padding: '6px 12px',
                                    marginTop: 6,
                                    borderRadius: 99, // Pill shape
                                    background: localResult.payout > BigInt(0)
                                        ? localResult.isJackpot
                                            ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.9), rgba(245, 158, 11, 0.85))'
                                            : 'linear-gradient(135deg, rgba(34, 197, 94, 0.85), rgba(16, 185, 129, 0.8))'
                                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.85), rgba(220, 38, 38, 0.8))',
                                    border: `1px solid ${localResult.isJackpot ? '#fbbf24' : localResult.payout > BigInt(0) ? '#22c55e' : '#ef4444'}`,
                                    boxShadow: `0 0 15px ${localResult.isJackpot ? 'rgba(251, 191, 36, 0.4)' : localResult.payout > BigInt(0) ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                }}>
                                    {/* Result Icon */}
                                    <span style={{ fontSize: 16 }}>
                                        {localResult.isJackpot ? '🎉' : localResult.payout > BigInt(0) ? '✨' : '😿'}
                                    </span>
                                    {/* Result Text */}
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: '#fff',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                                    }}>
                                        {localResult.isJackpot ? (t.jackpotTitle || 'JACKPOT!') : localResult.payout > BigInt(0) ? (t.youWinTitle || 'YOU WIN!') : (t.noMatchTitle || 'No Match')}
                                    </div>
                                    {/* Payout Amount */}
                                    {localResult.payout > BigInt(0) && (
                                        <div style={{
                                            fontSize: 14,
                                            fontWeight: 800,
                                            color: '#fff',
                                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                                        }}>
                                            +{(Number(localResult.payout) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            {(() => {
                                                // Calculate multiplier based on CONTRACT LOGIC (symbol counts), not payout/bet ratio
                                                // This avoids layout issues when localBetAmount doesn't match the historical bet
                                                const counts = new Array(6).fill(0);
                                                localResult.symbols.forEach(s => counts[s]++);
                                                let bestS = -1;
                                                let maxC = 0;
                                                counts.forEach((c, s) => {
                                                    if (c >= 3) {
                                                        // Priority to higher paying symbols (lower index) if multiple wins?
                                                        // or just highest count. Simplified:
                                                        if (c > maxC || (c === maxC && s < bestS)) {
                                                            maxC = c;
                                                            bestS = s;
                                                        }
                                                    }
                                                });

                                                // Multipliers table (Contract Logic)
                                                // 0:Banmao, 1:Banana, 2:Diamond, 3:Star, 4:Clover, 5:Seven
                                                const mTable: Record<number, number[]> = {
                                                    0: [10, 50, 200],
                                                    1: [8, 40, 150],
                                                    2: [5, 20, 80],
                                                    3: [3, 15, 50],
                                                    4: [2, 8, 25],
                                                    5: [1.5, 5, 15]
                                                };

                                                let multiplier = 0;
                                                if (bestS !== -1 && maxC >= 3) {
                                                    const tierIdx = Math.min(2, maxC - 3);
                                                    multiplier = mTable[bestS][tierIdx];
                                                } else if (localResult.isJackpot) {
                                                    multiplier = 500; // Jackpot base
                                                }

                                                if (multiplier > 0) {
                                                    return (
                                                        <span className="interactive-text" style={{
                                                            fontSize: 10,
                                                            background: 'rgba(0,0,0,0.2)',
                                                            padding: '2px 6px',
                                                            borderRadius: 4,
                                                            marginLeft: 6,
                                                            color: '#fbbf24',
                                                            fontWeight: 800,
                                                            border: '1px solid rgba(251, 191, 36, 0.3)',
                                                            display: 'inline-block'
                                                        }}>
                                                            x{multiplier}
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}

                                        </div>
                                    )}
                                    {/* Seed Copy Button - allows player to verify their spin */}
                                    {lastSeed && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(lastSeed);
                                                copyToClipboard(lastSeed, 'Seed');
                                            }}
                                            title={t.copySeed || 'Copy Seed'}
                                            style={{
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: 4,
                                                padding: '2px 6px',
                                                cursor: 'pointer',
                                                fontSize: 11,
                                                color: '#fff',
                                                marginLeft: 6,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 3,
                                                transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(0,0,0,0.5)';
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                            }}
                                        >
                                            🧬
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>


                        {/* Multi-Spin Selector */}
                        {setSpinCount && (
                            <div data-tour="spin-count">
                                <SpinCountSelector
                                    spinCount={spinCount}
                                    setSpinCount={setSpinCount}
                                    betPerSpin={Number(localBetAmount) || 0}
                                    isSpinning={isThisPoolSpinning}
                                    style={style}
                                    onSetMaxBet={setMaxBet}
                                    t={{
                                        multiSpin: t.multiSpin || 'MULTI-SPIN',
                                        spins: t.spins || 'Spins',
                                        totalBet: t.totalBet || 'Total',
                                        spinHelpMulti: t.spinHelpMulti || '💡 {count} spins × {bet} = {total} total bet, ~{gas}% gas savings',
                                        spinHelpSingle: t.spinHelpSingle || '💡 Select multiple spins to save on gas fees!'
                                    }}
                                />
                            </div>
                        )}

                        {/* Multi-Spin Results Modal - MOVED TO page.tsx for proper z-index handling */}
                        {/* Modal now rendered at page level to avoid stacking context issues */}

                        {/* Bet Bar (Consolidated Input & Buttons) */}
                        <div data-tour="bet-input">
                            <BetBar
                                localBetAmount={localBetAmount}
                                setLocalBetAmount={setLocalBetAmount}
                                minBetValue={minBetValue}
                                maxBetValue={effectiveMax}
                                walletBalance={Number(poolBalance)} // Simplified passing, ideally pass balance directly
                                isSpinning={isThisPoolSpinning}
                                t={t}
                                style={style}
                                onSetMin={setMinBet}
                                onSetHalf={setHalfBet}
                                onSetDouble={setDoubleBet}
                                onSetMax={setMaxBet}
                            />
                        </div>

                        {/* Premium Spin Button with Effects */}
                        <button
                            data-tour="spin-button"
                            className={`spin-button ${isThisPoolSpinning ? 'spinning' : ''}`}
                            onClick={handleLocalSpinClick}
                            disabled={isSpinDisabled}
                            style={{
                                width: '100%',
                                height: 65,
                                background: isThisPoolSpinning
                                    ? 'linear-gradient(180deg, #00ff88 0%, #00d4aa 50%, #00a896 100%)'
                                    : isOtherPoolSpinning
                                        ? 'linear-gradient(180deg, #555 0%, #333 100%)'
                                        : `linear-gradient(180deg, ${style.primary} 0%, ${style.primary}cc 40%, ${style.primary}88 100%)`,
                                border: 'none',
                                borderRadius: 999, // Pill shape button
                                color: tier === 'platinum' || tier === 'silver' ? '#1a1a2e' : '#fff',
                                fontFamily: "'Space Mono', monospace",
                                fontSize: 20,
                                fontWeight: 900,
                                letterSpacing: 4,
                                textTransform: 'uppercase',
                                cursor: isSpinDisabled ? 'not-allowed' : 'pointer',
                                marginBottom: 16,
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 12,
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: isThisPoolSpinning
                                    ? '0 0 30px rgba(0, 255, 136, 0.6), 0 8px 25px rgba(0, 0, 0, 0.4), inset 0 -4px 0 rgba(0,0,0,0.2)'
                                    : isSpinDisabled
                                        ? '0 4px 15px rgba(0,0,0,0.3)'
                                        : `0 0 25px ${style.glow}, 0 8px 25px rgba(0, 0, 0, 0.4), inset 0 -4px 0 rgba(0,0,0,0.2)`,
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: 'translateY(0)',
                            }}
                            onMouseEnter={(e) => {
                                if (!isSpinDisabled) {
                                    slotsSounds.hover();
                                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = `0 0 40px ${style.glow}, 0 15px 35px rgba(0, 0, 0, 0.5), inset 0 -4px 0 rgba(0,0,0,0.2)`;
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = isThisPoolSpinning
                                    ? '0 0 30px rgba(0, 255, 136, 0.6), 0 8px 25px rgba(0, 0, 0, 0.4), inset 0 -4px 0 rgba(0,0,0,0.2)'
                                    : `0 0 25px ${style.glow}, 0 8px 25px rgba(0, 0, 0, 0.4), inset 0 -4px 0 rgba(0,0,0,0.2)`;
                            }}
                            onMouseDown={(e) => {
                                if (!isSpinDisabled) {
                                    e.currentTarget.style.transform = 'translateY(2px) scale(0.98)';
                                    e.currentTarget.style.boxShadow = `0 0 15px ${style.glow}, 0 4px 10px rgba(0, 0, 0, 0.4), inset 0 -2px 0 rgba(0,0,0,0.2)`;
                                }
                            }}
                            onMouseUp={(e) => {
                                if (!isSpinDisabled) {
                                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                                    e.currentTarget.style.boxShadow = `0 0 40px ${style.glow}, 0 15px 35px rgba(0, 0, 0, 0.5), inset 0 -4px 0 rgba(0,0,0,0.2)`;
                                }
                            }}
                        >
                            {/* Sparkle Border Effect - rotating gradient creates particle illusion */}
                            <div style={{
                                position: 'absolute',
                                inset: -2,
                                borderRadius: 999,
                                background: isThisPoolSpinning
                                    ? 'conic-gradient(from var(--sparkle-angle, 0deg), transparent 0deg, #00ff88 30deg, #00ffff 60deg, transparent 90deg, transparent 180deg, #00ff88 210deg, #00ffff 240deg, transparent 270deg)'
                                    : playAgainCooldown > 0
                                        ? 'conic-gradient(from var(--sparkle-angle, 0deg), transparent 0deg, #ff6600 40deg, #ffaa00 80deg, transparent 120deg, transparent 240deg, #ff6600 280deg, #ffaa00 320deg, transparent 360deg)'
                                        : isSpinDisabled
                                            ? 'none'
                                            : `conic-gradient(from var(--sparkle-angle, 0deg), transparent 0deg, ${style.primary} 45deg, ${style.glow} 90deg, transparent 135deg, transparent 225deg, ${style.primary} 270deg, ${style.glow} 315deg, transparent 360deg)`,
                                animation: isThisPoolSpinning
                                    ? 'sparkle-rotate 0.8s linear infinite'
                                    : playAgainCooldown > 0
                                        ? 'sparkle-rotate 1.5s linear infinite'
                                        : isSpinDisabled
                                            ? 'none'
                                            : 'sparkle-rotate 3s linear infinite',
                                zIndex: 0,
                                pointerEvents: 'none',
                                filter: isThisPoolSpinning ? 'blur(1px)' : 'blur(0.5px)',
                                opacity: isSpinDisabled ? 0 : 1,
                            }} />
                            {/* Animated Shimmer Effect */}
                            {!isSpinDisabled && !isThisPoolSpinning && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: '-100%',
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                                    animation: 'shimmer 2.5s infinite',
                                    pointerEvents: 'none',
                                }} />
                            )}

                            {/* Spinning Particles */}
                            {isThisPoolSpinning && (
                                <>
                                    <div style={{
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                                        animation: 'pulse 1s infinite',
                                    }} />
                                </>
                            )}

                            {isCommitExpired ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2, zIndex: 1 }}>
                                    <span style={{ fontSize: 16 }}>⚠️ {t.settleExpired || 'SETTLE EXPIRED'}</span>
                                    <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>{t.forfeitBet || 'Forfeit bet & reset'}</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2, zIndex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {isThisPoolSpinning && (
                                            <span style={{
                                                animation: 'spin 0.8s linear infinite',
                                                display: 'inline-block',
                                                fontSize: 20
                                            }}>⚡</span>
                                        )}
                                        <span className={
                                            isThisPoolSpinning ? 'spin-button-text-spinning'
                                                : (playAgainCooldown > 0 ? 'spin-button-text-waiting'
                                                    : 'spin-button-text')
                                        }>{getLocalButtonText()}</span>
                                        {isThisPoolSpinning && (
                                            <span style={{
                                                animation: 'spin 0.8s linear infinite reverse',
                                                display: 'inline-block',
                                                fontSize: 20
                                            }}>⚡</span>
                                        )}
                                    </div>
                                    {/* Visual Countdown Timer */}
                                    {blocksRemaining !== null && blocksRemaining > 0 && (localGameState === 'waiting' || localGameState === 'ready_to_reveal') && (() => {
                                        const secondsRemaining = Math.floor(blocksRemaining * 2);
                                        const minutes = Math.floor(secondsRemaining / 60);
                                        const seconds = secondsRemaining % 60;
                                        const isUrgent = secondsRemaining < 60;
                                        const isCritical = secondsRemaining < 30;

                                        return (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                marginTop: 4,
                                                padding: '3px 10px',
                                                borderRadius: 12,
                                                background: isCritical ? 'rgba(239, 68, 68, 0.3)' : isUrgent ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.1)',
                                                border: `1px solid ${isCritical ? '#ef4444' : isUrgent ? '#fbbf24' : 'rgba(255,255,255,0.2)'}`,
                                                animation: isCritical ? 'pulse 0.5s infinite' : 'none',
                                            }}>
                                                <span style={{ fontSize: 12 }}>⏱️</span>
                                                <span style={{
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    fontFamily: "'Space Mono', monospace",
                                                    color: isCritical ? '#fca5a5' : isUrgent ? '#fcd34d' : 'rgba(255,255,255,0.9)'
                                                }}>
                                                    {minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`}
                                                </span>
                                                <span style={{ fontSize: 9, opacity: 0.7, color: isCritical ? '#fca5a5' : 'inherit' }}>
                                                    {t.expiresIn || 'left'}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </button>

                        {/* REFUND BUTTON DISABLED - Security Note:
                    The refund function in contract allows players to refund expired commits.
                    However, players could potentially calculate their result off-chain before revealing,
                    and choose to refund if they would lose. This creates a positive expected value exploit.
                    
                    Solution: Add refund penalty in contract (e.g., 10-20% fee) to make refunding
                    unprofitable compared to expected loss.
                    
                    Hiding this button doesn't prevent the exploit (players can call contract directly),
                    but reduces casual exploitation.
                */}


                        {/* Seed Section - Always Visible */}
                        <div data-tour="seed-input" style={{ marginTop: 12, marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, padding: '0 4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 11, color: style.primary, fontWeight: 600 }}>🎲 {t.clientSeed || t.secretSeed || "Client Seed"}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button
                                        onClick={generateRandomSeed}
                                        disabled={isThisPoolSpinning}
                                        style={{ background: 'none', border: 'none', color: style.primary, fontSize: 10, cursor: 'pointer', opacity: 0.8 }}
                                        title={t.generateSeed || "Generate random seed"}
                                    >
                                        🔄 {t.random || "Random"}
                                    </button>
                                    {seedHistory.length > 0 && (
                                        <button
                                            onClick={() => setShowSeedHistory(!showSeedHistory)}
                                            style={{ background: 'none', border: 'none', color: style.primary, fontSize: 10, cursor: 'pointer', opacity: 0.8 }}
                                            title={t.recentSeeds || "Recent Seeds"}
                                        >
                                            📜 {t.history || "History"}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onOpenVerify?.()}
                                        style={{ background: 'none', border: 'none', fontSize: 10, color: '#22c55e', cursor: 'pointer', opacity: 0.9 }}
                                        title={t.provablyFair || "Provably Fair Verification"}
                                    >
                                        ✅ {t.verify || "Verify"}
                                    </button>
                                </div>
                            </div>

                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    display: 'flex', gap: 6,
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: 6,
                                    borderRadius: 99, // Pill shape input container
                                    border: `1px solid ${style.primary}20`
                                }}>
                                    <input
                                        type="text"
                                        value={localCustomSeed}
                                        onChange={(e) => setLocalCustomSeed(e.target.value)}
                                        disabled={isThisPoolSpinning}
                                        placeholder={t.enterSeedPlaceholder || "Enter or auto-generate seed..."}
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'rgba(255,255,255,0.9)',
                                            fontSize: 11,
                                            fontFamily: "'Roboto Mono', monospace",
                                            letterSpacing: '0.5px'
                                        }}
                                    />
                                    {localCustomSeed && (
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(localCustomSeed); }}
                                            style={{
                                                background: 'rgba(255,255,255,0.1)',
                                                border: 'none',
                                                borderRadius: 4,
                                                width: 24,
                                                height: 24,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: style.primary
                                            }}
                                            title={t.copy || "Copy Seed"}
                                        >
                                            📋
                                        </button>
                                    )}
                                </div>

                                {/* Inline Seed History Dropdown */}
                                {showSeedHistory && seedHistory.length > 0 && (
                                    <div className="hide-scrollbar" style={{
                                        position: 'absolute',
                                        top: '100%', left: 0, right: 0,
                                        marginTop: 4,
                                        maxHeight: 150,
                                        overflowY: 'auto',
                                        background: '#0f172a',
                                        borderRadius: 8,
                                        padding: 4,
                                        border: `1px solid ${style.primary}30`,
                                        zIndex: 100,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                    }}>
                                        {seedHistory.map((seed, i) => (
                                            <div key={i}
                                                onClick={() => useSeedFromHistory(seed)}
                                                style={{
                                                    padding: '8px',
                                                    fontSize: 10,
                                                    fontFamily: 'monospace',
                                                    color: 'rgba(200,180,255,0.8)',
                                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                                    cursor: 'pointer',
                                                    display: 'flex', justifyContent: 'space-between'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <span>{seed.slice(0, 24)}...</span>
                                                <span style={{ color: '#22c55e' }}>Use</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RPC Delay Warning - Always show as permanent info notice */}
                        <div style={{
                            marginTop: 8,
                            padding: '10px 12px',
                            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.05))',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            borderRadius: 10,
                            fontSize: 11,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <span style={{ fontSize: 14 }}>⚠️</span>
                                <span style={{ fontWeight: 700, color: '#fbbf24' }}>
                                    {t.rpcDelayTitle || 'Please Wait Before Next Spin'}
                                </span>
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                                {t.rpcDelayMessage || 'Public RPC has sync delay. Please wait 5-10 seconds before spinning again for wallet to confirm transaction.'}
                            </div>
                            <div style={{ marginTop: 6, color: '#22c55e', fontSize: 10 }}>
                                {t.rpcDelayTip || '💡 Tip: If wallet shows error, wait a few seconds and try again.'}
                            </div>
                        </div>

                        {/* Pool History Accordion - Professional Layout */}
                        <div data-tour="history-section" style={{ marginTop: 8 }}>
                            <button
                                onClick={() => {
                                    setShowPoolHistory(!showPoolHistory);
                                    if (!showPoolHistory && poolHistory.length === 0) {
                                        // Fetch history when opening
                                        fetch(`/api/slots/history-chain?poolId=${pool.poolId}&limit=20`)
                                            .then(r => r.json())
                                            .then(d => { if (d.success) setPoolHistory(d.history || []); })
                                            .catch(console.error);
                                    }
                                }}
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                    border: `1px solid ${style.primary}20`,
                                    borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    color: style.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                }}
                            >
                                <span>📜 {t.history || 'Pool History'}</span>
                                <span style={{ transform: showPoolHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                            </button>

                            {showPoolHistory && (
                                <div className="hide-scrollbar" style={{
                                    marginTop: 8, maxHeight: 240, overflowY: 'auto',
                                    background: 'rgba(5, 5, 10, 0.4)', borderRadius: 12, padding: '10px 0',
                                    border: `1px solid ${style.primary}10`,
                                }}>
                                    {/* History Header */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '0.8fr 1.5fr 1fr 1fr',
                                        padding: '0 12px 8px',
                                        fontSize: 10,
                                        color: '#94a3b8',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        marginBottom: 4,
                                        textTransform: 'uppercase',
                                        fontWeight: 700
                                    }}>
                                        <div>{t.timeLabel || "Time"}</div>
                                        <div style={{ textAlign: 'center' }}>{t.resultLabel || "Result"}</div>
                                        <div style={{ textAlign: 'right' }}>{t.betLabelShort || "Bet"}</div>
                                        <div style={{ textAlign: 'right' }}>{t.payoutLabel || "Payout"}</div>
                                    </div>

                                    {poolHistory.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: 'rgba(200,180,255,0.5)', padding: 16, fontSize: 11 }}>
                                            {t.loading || 'Loading...'}
                                        </div>
                                    ) : (
                                        groupHistoryByTx(poolHistory).map((group, idx) => {
                                            const isMulti = group.isMulti;
                                            const count = group.count;

                                            const betAmount = isMulti ? group.totalBet : group.items[0].betAmount;
                                            const payoutAmount = isMulti ? group.totalPayout : group.items[0].payout;

                                            const betNum = Number(betAmount) > 1e15 ? Number(betAmount) / 1e18 : Number(betAmount);
                                            const payoutNum = Number(payoutAmount) > 1e15 ? Number(payoutAmount) / 1e18 : Number(payoutAmount);

                                            const isWin = payoutNum > 0;

                                            return (
                                                <div
                                                    key={group.id || idx}
                                                    onClick={() => onSelectSpin?.(isMulti ? group.items : group.items[0])}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '0.8fr 1.5fr 1fr 1fr',
                                                        alignItems: 'center',
                                                        padding: '8px 12px',
                                                        borderBottom: idx < poolHistory.length - 1 ? '1px solid rgba(255,255,255,0.02)' : 'none',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.1s',
                                                        fontSize: 11,
                                                        position: 'relative',
                                                        overflow: 'hidden'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    {isMulti && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '2px',
                                                            height: '100%',
                                                            background: 'linear-gradient(180deg, #a855f7, #3b82f6)'
                                                        }} />
                                                    )}

                                                    {/* Time */}
                                                    <div style={{ color: '#64748b', fontSize: 10 }}>
                                                        {group.timestamp ? new Date(group.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </div>

                                                    {/* Symbols or Multi-Label */}
                                                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                                                        {isMulti ? (
                                                            <div style={{
                                                                color: '#a855f7',
                                                                fontWeight: 700,
                                                                fontSize: 10,
                                                                padding: '2px 6px',
                                                                background: 'rgba(168, 85, 247, 0.1)',
                                                                borderRadius: 4,
                                                                border: '1px solid rgba(168, 85, 247, 0.2)'
                                                            }}>
                                                                ⚡ {t.multiSpin || 'Multi-Spin'} x{count}
                                                            </div>
                                                        ) : (
                                                            (() => {
                                                                const spin = group.items[0];
                                                                const result = spin.result || (spin.symbols ? String(spin.symbols).split(',').map(Number) : []);
                                                                return result.slice(0, 5).map((s: number, j: number) => (
                                                                    <span key={j} style={{ fontSize: 12, opacity: isWin ? 1 : 0.6 }}>
                                                                        {SLOT_SYMBOLS[s] || '❓'}
                                                                    </span>
                                                                ));
                                                            })()
                                                        )}
                                                    </div>

                                                    {/* Bet */}
                                                    <div style={{ textAlign: 'right', color: '#e2e8f0', fontFamily: 'monospace' }}>
                                                        {betNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    </div>

                                                    {/* Payout */}
                                                    <div style={{
                                                        textAlign: 'right',
                                                        color: isWin ? '#22c55e' : '#ef4444',
                                                        fontWeight: 600,
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        {isWin ? `+${payoutNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : (t.lostLabel || 'Lost')}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                    {/* End Left Content */}

                </div>
                {/* End Main Game Area */}

            </div>


            {/* Bottom accent bar removed - 3 colored dots deleted */}

            {/* Resize Handle */}
            <div
                onMouseDown={handleResizeStart}
                style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 20,
                    height: 20,
                    cursor: 'nwse-resize',
                    background: `linear-gradient(135deg, transparent 50%, ${style.primary}60 50%)`,
                    borderRadius: '0 0 12px 0',
                }}
            />



            {/* CSS Animations */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.2); }
                }
                @keyframes reel-spin {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-360px); } /* 6 symbols * 60px */
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                    width: 0;
                    height: 0;
                }
                .reel-container.spinning {
                    filter: blur(2px);
                }
                .seed-history-dropdown::-webkit-scrollbar {
                    display: none;
                }

                /* Spin Button 3D Effects */
                .spin-button {
                    box-shadow: 0 8px 0 ${style.primary}60, 0 15px 20px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.3);
                    transform: translateY(0);
                }
                .spin-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 0 ${style.primary}60, 0 20px 30px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.4);
                    filter: brightness(1.1);
                }
                .spin-button:active:not(:disabled), .spin-button.spinning {
                    transform: translateY(6px);
                    box-shadow: 0 2px 0 ${style.primary}60, 0 0 30px ${style.glow}, inset 0 2px 10px rgba(255,255,255,0.2);
                    margin-bottom: 10px !important; /* Adjust layout shift handled by margin */
                }
                .spin-button:disabled {
                    opacity: 0.6;
                    box-shadow: none;
                    transform: translateY(4px);
                    cursor: not-allowed;
                }

                /* Winning Symbol Effects */
                @keyframes breathing-glow {
                    0% { 
                        box-shadow: 0 0 5px var(--glow-color); 
                        transform: scale(1); 
                        border-color: var(--glow-color); 
                    }
                    50% { 
                        box-shadow: 0 0 25px var(--glow-color), inset 0 0 15px var(--glow-color); 
                        transform: scale(1.08); 
                        border-color: var(--glow-color); 
                        z-index: 10;
                    }
                    100% { 
                        box-shadow: 0 0 5px var(--glow-color); 
                        transform: scale(1); 
                        border-color: var(--glow-color); 
                    }
                }
                .winning-symbol {
                    animation: breathing-glow 2s infinite ease-in-out;
                    z-index: 5;
                    border-width: 2px !important;
                }
            `}</style>

            {/* Pool Details Modal */}
            {showPoolDetails && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setShowPoolDetails(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.6)',
                            zIndex: 9998
                        }}
                    />
                    {/* Modal */}
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 340,
                        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
                        border: `2px solid ${style.primary}`,
                        borderRadius: 16,
                        padding: 20,
                        zIndex: 9999,
                        boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${style.glow}`
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 24 }}>{tierIcon}</span>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                                        Pool #{pool.poolId.toString()}
                                    </div>
                                    <div style={{ fontSize: 11, color: style.primary, textTransform: 'uppercase', fontWeight: 600 }}>
                                        {(t as any)[`tier${tier.charAt(0).toUpperCase() + tier.slice(1)}`] || tier}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPoolDetails(false)}
                                style={{
                                    width: 28, height: 28, borderRadius: 8,
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    color: '#ef4444', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 14
                                }}
                            >✕</button>
                        </div>

                        {/* Pool Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                            {/* Balance */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 10 }}>
                                <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4 }}>{t.poolBalance || 'Pool Balance'}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>
                                    {poolBalance}
                                </div>
                            </div>
                            {/* Jackpot */}
                            <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: 12, borderRadius: 10, border: '1px solid rgba(251, 191, 36, 0.2)' }}>
                                <div style={{ fontSize: 9, color: '#fbbf24', marginBottom: 4 }}>{t.jackpot || 'Jackpot'}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>
                                    {(Number(pool.jackpot) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                            {/* Min Bet */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 10 }}>
                                <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4 }}>{t.minBet || 'Min Bet'}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                    {(Number(pool.minBet) / 1e18).toLocaleString()}
                                </div>
                            </div>
                            {/* Max Bet */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 10 }}>
                                <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 4 }}>{t.maxBet || 'Max Bet'}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                    {(Number(pool.maxBet) / 1e18).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                            {/* Owner */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11 }}>
                                <span style={{ color: '#94a3b8' }}>{t.owner || 'Owner'}:</span>
                                <span style={{ color: '#a855f7', fontFamily: 'monospace' }}>
                                    {pool.owner.slice(0, 8)}...{pool.owner.slice(-6)}
                                </span>
                            </div>
                            {/* Status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11 }}>
                                <span style={{ color: '#94a3b8' }}>{t.status || 'Status'}:</span>
                                <span style={{ color: pool.isActive ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                                    {pool.isActive ? (t.active || 'Active') : (t.inactive || 'Inactive')}
                                </span>
                            </div>
                            {/* Created At - using pool data if available */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                <span style={{ color: '#94a3b8' }}>{t.createdAt || 'Created'}:</span>
                                <span style={{ color: '#64748b' }}>
                                    {(pool as any).createdAt
                                        ? new Date(Number((pool as any).createdAt) * 1000).toLocaleDateString(language, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })
                                        : t.unknown || 'Unknown'}
                                </span>
                            </div>
                        </div>

                        {/* Rate Limit Info */}
                        <div style={{
                            marginTop: 12,
                            padding: 10,
                            background: 'rgba(0, 191, 255, 0.1)',
                            borderRadius: 8,
                            border: '1px solid rgba(0, 191, 255, 0.2)',
                            fontSize: 10,
                            color: '#94a3b8',
                            display: 'flex',
                            justifyContent: 'space-between'
                        }}>
                            <span>⏱️ {t.rateLimitTitle || 'Speed Limit'}:</span>
                            <span style={{ color: '#00BFFF', fontWeight: 600 }}>{maxSpinsPerMinute} {t.spinsPerMin || 'spins/min'}</span>
                        </div>
                    </div>
                </>
            )}
        </div >
    );
}

// Symbol Colors for winning effects - matched to emoji colors
const SYMBOL_COLORS: Record<number, string> = {
    0: '#ffa500', // 🐱 Banmao Cat: Orange
    1: '#fde047', // 🍌 Banana: Yellow
    2: '#00bfff', // 💎 Diamond: Light Blue/Cyan
    3: '#ffd700', // 🌟 Star: Gold
    4: '#22c55e', // 🍀 Clover: Green
    5: '#1d4ed8', // 7️⃣ Seven: Blue (keycap blue)
};

export default SlotMachineWindow;
