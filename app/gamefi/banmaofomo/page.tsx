/**
 * BanMaoFomo - FOMO3D Style Game (V11 Smart Settle Edition)
 * Main page component with dual timers and smart settle functionality
 */
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAccount, usePublicClient, useReadContract, useReadContracts, useWatchContractEvent, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { motion } from "framer-motion";
import { formatUnits } from "viem";
import { FaTelegram, FaXTwitter } from "react-icons/fa6";
import SharedProviders from "../../providers";
import {
    GameHeader,
    JackpotDisplay,
    CountdownTimer,
    AttackPanel,
    RulesModal,
    WinPredictionBar,
    GameArena,
    PlayerDashboard,
    RoundInfoPanel,
} from "./components";
import AnimatedBanMao from "./components/AnimatedBanMao";
import WinnerModal from "./components/WinnerModal";
import { GameToaster } from "./components/GameToast";
import gameToast from "./components/GameToast";
import { GameSettingsProvider, SoundToggle, SettingsButton, SettingsPanel, useGameSettings } from "./components/GameSettings";
import OnboardingTour, { shouldShowOnboarding } from "./components/OnboardingTour";
import { ThemeProvider } from "./components/ThemeProvider";
import { langs, getBrowserLanguage, type LangKey, type LocaleStrings } from "./lib/i18n";
import { BANMAOFOMO_ADDRESS, BANMAO_ADDRESS, STORAGE_KEYS, CHAIN_ID, V11_DISTRIBUTION } from "./lib/constants";
import { BANMAOFOMO_V11_ABI, ERC20_ABI } from "./lib/abis-v11";
import { BANMAOFOMO_ABI } from "./lib/abis";
import type { GameStatus, AttackHistoryEntry, GameConfigV11, TopAttacker } from "./lib/types";
import { playAttackSound, playCriticalSound, playVictorySound } from "./lib/sounds";
import { fireJackpotConfetti, fireLucky900Confetti, fireLucky777Confetti, fireNewKingConfetti } from "./components/Confetti";
import { AchievementToast, useAchievements } from "./components/AchievementToast";
import { checkAchievements } from "./lib/achievements";
import PlayerProfile from "./components/PlayerProfile";
import SpectatorBanner from "./components/SpectatorBanner";
import { SeedFundDisplay } from "./components/VIPTierPanel";
import BottomSheet from "./components/BottomSheet";
import GiftSimulator from "./components/GiftSimulator";
import NextRoundPanel from "./components/NextRoundPanel";
import CountdownWidget from "./components/CountdownWidget";
import { useFomoWebSocket } from "./hooks/useFomoWebSocket";
import type { WsAttackEvent, WsRoundFinalizedEvent } from "./hooks/useFomoWebSocket";
import DistributionAnimation from "./components/DistributionAnimation";
import FloatingEmojis from "./components/FloatingEmojis";
import NotificationManager from "./components/NotificationManager";
import { recordGameVisit } from '../../../lib/gameVisitTracker';
import "./globals.css";

export default function BanMaoFomoPage() {
    return (
        <SharedProviders>
            <ThemeProvider>
                <GameSettingsProvider>
                    <BanMaoFomoGame />
                </GameSettingsProvider>
            </ThemeProvider>
        </SharedProviders>
    );
}

function BanMaoFomoGame() {
    // Language state
    const [lang, setLang] = useState<LangKey>("en");
    const t: LocaleStrings = langs[lang];

    // UI state
    const [showRules, setShowRules] = useState(false);
    const [attackHistory, setAttackHistory] = useState<AttackHistoryEntry[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const historyFetchedForRound = useRef<number | null>(null);
    // Winner info when round ends
    const [winnerInfo, setWinnerInfo] = useState<{ winner: string; amount: string; winType: string; txHash?: string } | null>(null);
    // Track ANY attack event for animation (not just current user)
    const [latestAnyAttack, setLatestAnyAttack] = useState<{ luckyNumber: number; isOwnAttack: boolean } | null>(null);
    // Idle animation showcase cycling (when no user activity)
    const [idleAnimationIndex, setIdleAnimationIndex] = useState(0);
    const SHOWCASE_ANIMATIONS = ["idle", "sleeping", "love_eyes", "excited", "dance", "feed", "winner"] as const;
    // Winner celebration modal
    const [showWinnerModal, setShowWinnerModal] = useState(false);
    // Settings panel state
    const [showSettings, setShowSettings] = useState(false);
    // Onboarding Tour state
    const [showTour, setShowTour] = useState(false);
    // Cooldown timer state
    const [cooldownLeft, setCooldownLeft] = useState(0);
    // Kill Zone state
    const [killZoneActive, setKillZoneActive] = useState(false);
    const killZoneVibratedRef = useRef(false);
    // Time tick: forces parsedStatus to recalculate when deadlines pass
    const [timeTick, setTimeTick] = useState(0);
    // Combo tracking state
    const [comboCount, setComboCount] = useState(0);
    const [comboVisible, setComboVisible] = useState(false);
    const lastGiftTimeRef = useRef(0);
    const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Distribution animation state (lifted from GameArena)
    const [showDistribution, setShowDistribution] = useState(false);
    const [distAmount, setDistAmount] = useState(0);
    const [distCount, setDistCount] = useState(1);
    const lastDistHashRef = useRef<string | null>(null);

    // Record visit for GameFi page stats & ranking
    useEffect(() => {
        recordGameVisit('banmaofomo');
    }, []);

    // Auto-show tour on first visit
    useEffect(() => {
        // use a small timeout to ensure DOM is ready for targeting
        const timer = setTimeout(() => {
            if (shouldShowOnboarding()) {
                setShowTour(true);
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, []);
    // Issue #8: Track which round has already been handled by event-based detection
    // to prevent duplicate modal fire from polling path
    const winnerHandledForRoundRef = useRef<bigint | null>(null);
    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    // Gift Simulator state
    const [showSimulator, setShowSimulator] = useState(false);
    const [showNextRound, setShowNextRound] = useState(false);
    // Ref for IntersectionObserver — CountdownWidget shows when this scrolls out
    const arenaTimerRef = useRef<HTMLDivElement>(null);
    // WebSocket connection status for settings panel
    const [wsConnected, setWsConnected] = useState(false);
    // Get settings context
    const { particlesEnabled, soundEnabled } = useGameSettings();
    // Achievements system
    const { pendingAchievement, showAchievement, clearAchievement } = useAchievements();

    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient({ chainId: CHAIN_ID });

    // Initialize language from browser/storage
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
        if (stored && stored in langs) {
            setLang(stored as LangKey);
        } else {
            setLang(getBrowserLanguage());
        }

        // Enable scrolling by overriding global landing.css restrictions
        document.documentElement.classList.add('fomo-page');
        document.body.classList.add('fomo-page');

        return () => {
            document.documentElement.classList.remove('fomo-page');
            document.body.classList.remove('fomo-page');
        };
    }, []);

    const handleChangeLang = useCallback((newLang: LangKey) => {
        setLang(newLang);
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, newLang);
    }, []);

    // Cycle through showcase animations when idle (every 8 seconds)
    useEffect(() => {
        // Only cycle when no active game events
        const shouldCycle = winnerInfo === null && latestAnyAttack === null;
        if (!shouldCycle) return;

        const interval = setInterval(() => {
            setIdleAnimationIndex(prev => (prev + 1) % SHOWCASE_ANIMATIONS.length);
        }, 8000);

        return () => clearInterval(interval);
    }, [winnerInfo, latestAnyAttack, SHOWCASE_ANIMATIONS.length]);

    // Contract reads - Pure Edition: Use rounds() + jackpotPool instead of getGameStatus
    // chainId: 196 = XLayer Mainnet - allows reading even without wallet connected!
    const { data: jackpotPool, refetch: refetchJackpot, isError: isJackpotError, error: jackpotError } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "jackpotPool",
        chainId: CHAIN_ID,
        query: {
            refetchInterval: 15000, // Reduced from 5s to 15s for Vercel optimization
        },
    });

    // Debug logging for Vercel
    useEffect(() => {
        console.log("🔍 Contract Read Debug:", {
            BANMAOFOMO_ADDRESS,
            jackpotPool,
            isJackpotError,
            jackpotError: jackpotError?.message,
        });
    }, [jackpotPool, isJackpotError, jackpotError]);

    const { data: currentRound, refetch: refetchRound } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "currentRound",
        chainId: CHAIN_ID,
        query: {
            refetchInterval: 15000,
        },
    });

    // Fetch AttackPerformed logs for current round — chunked for XLayer RPC (100 block max)
    useEffect(() => {
        if (!publicClient || !currentRound) return;

        const roundNum = Number(currentRound);
        const CHUNK_SIZE = 100n;
        const MAX_BLOCKS_BACK = 5000n;
        const PARALLEL_BATCH = 10;
        let lastBlockFetched = 0n;
        let isCancelled = false;

        // Helper: fetch logs in small chunks to respect RPC limits
        const fetchLogsChunked = async (from: bigint, to: bigint) => {
            const chunks: { from: bigint; to: bigint }[] = [];
            let chunkEnd = to;
            while (chunkEnd >= from) {
                const chunkStart = chunkEnd - CHUNK_SIZE + 1n < from ? from : chunkEnd - CHUNK_SIZE + 1n;
                chunks.push({ from: chunkStart, to: chunkEnd });
                chunkEnd = chunkStart - 1n;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const allLogs: any[] = [];
            for (let i = 0; i < chunks.length; i += PARALLEL_BATCH) {
                if (isCancelled) break;
                const batch = chunks.slice(i, i + PARALLEL_BATCH);
                const results = await Promise.allSettled(
                    batch.map(chunk =>
                        publicClient.getContractEvents({
                            address: BANMAOFOMO_ADDRESS,
                            abi: BANMAOFOMO_ABI,
                            eventName: 'AttackPerformed',
                            fromBlock: chunk.from,
                            toBlock: chunk.to,
                        })
                    )
                );
                for (const result of results) {
                    if (result.status === 'fulfilled') {
                        allLogs.push(...result.value);
                    }
                }
            }
            return allLogs;
        };

        const fetchAttacks = async (isInitial: boolean) => {
            if (isCancelled) return;
            try {
                if (isInitial) setIsLoadingHistory(true);

                const currentBlock = await publicClient.getBlockNumber();
                const fromBlock = isInitial
                    ? (currentBlock > MAX_BLOCKS_BACK ? currentBlock - MAX_BLOCKS_BACK : 0n)
                    : (lastBlockFetched > 0n ? lastBlockFetched + 1n : currentBlock);

                if (!isInitial && fromBlock > currentBlock) return;

                console.log(`📡 Fetching attacks: round=${roundNum}, from=${fromBlock}, to=${currentBlock}, initial=${isInitial}`);

                const logs = await fetchLogsChunked(fromBlock, currentBlock);

                // Filter to current round
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const roundLogs = logs.filter((log: any) => Number(log.args?.roundId ?? 0) === roundNum);

                console.log(`📡 Got ${logs.length} raw → ${roundLogs.length} for round #${roundNum}`);
                if (roundLogs.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const sample = roundLogs[0] as any;
                    console.log('📡 Sample log keys:', Object.keys(sample));
                    console.log('📡 Sample txHash:', sample.transactionHash);
                }
                lastBlockFetched = currentBlock;

                if (roundLogs.length === 0 && !isInitial) return;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newEntries: AttackHistoryEntry[] = roundLogs.map((log: any) => ({
                    player: (log.args?.player || '0x0') as `0x${string}`,
                    count: Number(log.args?.count || 0),
                    timestamp: Math.floor(Date.now() / 1000),
                    luckyNumber: 0,
                    txHash: log.transactionHash || undefined,
                }));

                if (isInitial) {
                    newEntries.reverse();
                    setAttackHistory(newEntries);
                    historyFetchedForRound.current = roundNum;
                    console.log(`📜 Loaded ${newEntries.length} historical attacks for round #${roundNum}`);
                    console.log('📜 First 3 entries:', newEntries.slice(0, 3).map(e => ({ player: e.player.slice(0, 10), count: e.count, txHash: e.txHash })));
                } else if (newEntries.length > 0) {
                    newEntries.reverse();
                    setAttackHistory(prev => [...newEntries, ...prev].slice(0, 500));
                    console.log(`🔔 ${newEntries.length} new attack(s) via polling`);
                }
            } catch (error) {
                // Silence RPC rate-limit errors (expected on public XLayer RPC)
                const errMsg = String(error);
                if (!errMsg.includes('UnknownRpcError') && !errMsg.includes('Failed to fetch') && !errMsg.includes('rate limit')) {
                    console.error('❌ Error fetching attack logs:', error);
                }
            } finally {
                if (isInitial) setIsLoadingHistory(false);
            }
        };

        fetchAttacks(true);
        const interval = setInterval(() => fetchAttacks(false), 10000);

        return () => {
            isCancelled = true;
            clearInterval(interval);
        };
    }, [publicClient, currentRound]);



    // Fetch current round data (softDeadline, hardDeadline, lastAttacker, totalAttacks, accReward, ended)
    const { data: roundData, refetch: refetchRoundData } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "rounds",
        args: currentRound ? [currentRound] : undefined,
        chainId: CHAIN_ID,
        query: {
            enabled: !!currentRound,
            refetchInterval: 15000, // Reduced from 5s to 15s for Vercel optimization
        },
    });

    // V11: attackCost is now in activeConfig struct, not a standalone getter
    // Removed: attackCost useReadContract - use parsedConfig.attackCost instead

    const { data: isPaused, refetch: refetchPaused } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "paused",
        chainId: CHAIN_ID,
        query: {
            refetchInterval: 30000, // Reduced from 10s to 30s
        },
    });

    const { data: tokenAddress, refetch: refetchToken } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "banMaoToken",
        chainId: CHAIN_ID,
    });

    // User-specific reads
    const { data: userBalance, refetch: refetchBalance } = useReadContract({
        address: tokenAddress || BANMAO_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        chainId: CHAIN_ID,
        query: {
            enabled: !!address && !!tokenAddress,
            refetchInterval: 15000, // Reduced from 5s to 15s for Vercel optimization
        },
    });

    const { data: userAllowance, refetch: refetchAllowance } = useReadContract({
        address: tokenAddress || BANMAO_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, BANMAOFOMO_ADDRESS] : undefined,
        chainId: CHAIN_ID,
        query: {
            enabled: !!address && !!tokenAddress,
            refetchInterval: 15000, // Reduced from 5s to 15s
        },
    });

    const { data: personalVault, refetch: refetchVault } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "personalVault",
        args: address ? [address] : undefined,
        chainId: CHAIN_ID,
        query: {
            enabled: !!address,
            refetchInterval: 15000, // Reduced from 5s to 15s
        },
    });

    const { data: lastAttackTime, refetch: refetchLastAttack } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "lastAttackTimestamp",
        args: address ? [address] : undefined,
        chainId: CHAIN_ID,
        query: {
            enabled: !!address,
            refetchInterval: 15000, // Reduced from 5s to 15s
        },
    });

    // User attacks this round
    const { data: userAttacksThisRound, refetch: refetchUserAttacks } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "userAttacks",
        args: address && currentRound ? [currentRound, address] : undefined,
        chainId: CHAIN_ID,
        query: {
            enabled: !!address && !!currentRound,
            refetchInterval: 15000, // Reduced from 5s to 15s for Vercel optimization
        },
    });

    // Reward debt for current round (needed for pending dividend calculation)
    const { data: userRewardDebt } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "rewardDebt",
        args: address && currentRound ? [currentRound, address] : undefined,
        chainId: CHAIN_ID,
        query: {
            enabled: !!address && !!currentRound,
            refetchInterval: 15000, // Reduced from 5s to 15s
        },
    });

    // PRECISION constant for reward calculation
    const { data: precisionData } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "PRECISION",
        chainId: CHAIN_ID,
    });
    const PRECISION = precisionData ? BigInt(precisionData as bigint) : BigInt(1e18);

    // V11: maxAttacksPerRound is now in activeConfig struct
    // Removed: maxAttacksPerRound useReadContract - use parsedConfig.maxAttacksPerRound instead

    // V11: Read COOLDOWN_TIME from contract (constant, but read live for accuracy)
    const { data: contractCooldownTime } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "COOLDOWN_TIME",
        chainId: CHAIN_ID,
    });
    const cooldownTime = contractCooldownTime ? BigInt(contractCooldownTime as bigint) : BigInt(5);


    // === NEW V2 FEATURES ===
    // getUserStats returns: [attacks, vault, cooldown, tier] - 4 values
    const { data: userStats, refetch: refetchUserStats } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "getUserStats",
        args: address ? [address] : undefined,
        chainId: CHAIN_ID,
        query: { enabled: !!address, refetchInterval: 30000 } // Reduced from 10s to 30s
    });

    // V11: No dynamic cost feature - removed getEffectiveAttackCost
    // effectiveCost = attackCost from activeConfig

    // V11: No dynamic cost feature - dynamicCostEnabled doesn't exist
    const dynamicCostEnabled = false; // V11 doesn't have dynamic cost

    // SeedFund for next round display
    const { data: seedFundNextRound, refetch: refetchSeedFund } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "seedFundNextRound",
        chainId: CHAIN_ID,
        query: {
            refetchInterval: 30000, // Reduced from 10s to 30s
        },
    });

    // Lifetime attacks for VIP tier progress
    const { data: totalLifetimeAttacks, refetch: refetchLifetimeAttacks } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_V11_ABI,
        functionName: "totalLifetimeAttacks",
        args: address ? [address] : undefined,
        chainId: CHAIN_ID,
        query: { enabled: !!address, refetchInterval: 30000 } // Reduced from 10s to 30s
    });

    // Read VIP tier thresholds and cooldown reductions from contract (owner-changeable)
    const tierContracts = useMemo(() => {
        const calls = [];
        for (let i = 0; i < 4; i++) {
            calls.push({
                address: BANMAOFOMO_ADDRESS,
                abi: BANMAOFOMO_ABI,
                functionName: "tierThresholds" as const,
                args: [BigInt(i)],
                chainId: CHAIN_ID,
            });
            calls.push({
                address: BANMAOFOMO_ADDRESS,
                abi: BANMAOFOMO_ABI,
                functionName: "tierCooldownReduction" as const,
                args: [BigInt(i)],
                chainId: CHAIN_ID,
            });
        }
        return calls;
    }, []);

    // @ts-ignore - wagmi useReadContracts deep type instantiation with dynamic arrays
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tierRawData } = useReadContracts({
        contracts: tierContracts as any,
        query: { refetchInterval: 60000 }, // Reduced from 30s to 60s (rarely changes)
    });

    // Parse tier data into structured array for RulesModal
    const tierData = useMemo(() => {
        if (!tierRawData || tierRawData.length < 8) return undefined;
        const tiers = [];
        for (let i = 0; i < 4; i++) {
            const thresholdResult = tierRawData[i * 2];
            const reductionResult = tierRawData[i * 2 + 1];
            tiers.push({
                threshold: thresholdResult?.result ? Number(thresholdResult.result as bigint) : [10, 100, 500, 1000][i],
                cooldownReduction: reductionResult?.result ? Number(reductionResult.result as bigint) : [0, 10, 20, 40][i],
            });
        }
        return tiers;
    }, [tierRawData]);

    // Get user's VIP tier for cooldown reduction
    // getUserStats returns [attacks, vault, cooldown, tier]
    const userTier = useMemo(() => {
        if (!userStats) return 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stats = userStats as any;
        return Number(stats[3] || 0); // tier is the 4th element (index 3)
    }, [userStats]);

    // Calculate effective cooldown with VIP tier reduction from contract
    const effectiveCooldownTime = useMemo(() => {
        const baseCooldown = Number(cooldownTime);
        // Get tier cooldown reduction percentage from contract (e.g., 0%, 10%, 20%, 40%)
        const reduction = tierData?.[userTier]?.cooldownReduction || 0;
        const effective = Math.max(1, Math.floor(baseCooldown * (100 - reduction) / 100));
        console.log(`⏱️ Cooldown: base=${baseCooldown}s, tier=${userTier}, reduction=${reduction}%, effective=${effective}s`);
        return effective;
    }, [cooldownTime, userTier, tierData]);

    // Cooldown timer - calculate remaining seconds using effective (VIP-adjusted) cooldown
    useEffect(() => {
        const checkCooldown = () => {
            const now = Math.floor(Date.now() / 1000);
            const lastAttack = Number(lastAttackTime || 0);
            const remaining = Math.max(0, lastAttack + effectiveCooldownTime - now);
            setCooldownLeft(remaining);
        };

        checkCooldown();
        const interval = setInterval(checkCooldown, 1000);
        return () => clearInterval(interval);
    }, [lastAttackTime, effectiveCooldownTime]);

    // === V11 SPECIFIC READS ===
    // activeConfig returns the GameConfig struct
    const { data: activeConfig, refetch: refetchActiveConfig } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_V11_ABI,
        functionName: "activeConfig",
        chainId: CHAIN_ID,
        query: {
            refetchInterval: 30000, // Reduced from 10s to 30s for Vercel optimization
        },
    });

    // getTopAttackers for current round
    const { data: topAttackersData, refetch: refetchTopAttackers } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_V11_ABI,
        functionName: "getTopAttackers",
        args: currentRound ? [currentRound] : undefined,
        chainId: CHAIN_ID,
        query: { enabled: !!currentRound, refetchInterval: 15000 } // Reduced from 5s to 15s
    });

    // === SETTLE GAME HOOK (for GameArena claim button) ===
    const {
        writeContract: settleGame,
        isPending: isSettling,
    } = useWriteContract();

    const handleClaimAll = useCallback(() => {
        if (!address || !isConnected) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (settleGame as any)({
            address: BANMAOFOMO_ADDRESS,
            abi: BANMAOFOMO_V11_ABI,
            functionName: "settleGame",
        });
    }, [address, isConnected, settleGame]);

    // Parse activeConfig if available
    const parsedConfig = useMemo((): GameConfigV11 | null => {
        if (!activeConfig) return null;
        const [
            attackCost,
            softDuration,
            initialHardDuration,
            timeDecreaseStep,
            maxAttacksPerRound,
            winnerPercent,
            topAttackersPercent,
            minAttacksForReward,
            claimExpirationTime,
        ] = activeConfig as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
        return {
            attackCost,
            softDuration,
            initialHardDuration,
            timeDecreaseStep,
            maxAttacksPerRound,
            winnerPercent,
            topAttackersPercent,
            minAttacksForReward,
            claimExpirationTime,
        };
    }, [activeConfig]);

    // Debug log for activeConfig - verify contract values
    useEffect(() => {
        if (parsedConfig) {
            console.log("📋 [FOMO] activeConfig from contract:", {
                attackCost: parsedConfig.attackCost.toString(),
                maxAttacksPerRound: parsedConfig.maxAttacksPerRound.toString(),
                winnerPercent: parsedConfig.winnerPercent.toString(),
                topAttackersPercent: parsedConfig.topAttackersPercent.toString(),
            });
        }
    }, [parsedConfig]);

    // Snapshot config to DB when round changes (for accurate historical display)
    useEffect(() => {
        if (!currentRound || !parsedConfig) return;
        const roundNum = Number(currentRound);
        if (roundNum < 1) return;

        fetch('/api/fomo/round-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roundId: roundNum,
                config: {
                    attackCost: parsedConfig.attackCost.toString(),
                    softDuration: Number(parsedConfig.softDuration),
                    initialHardDuration: Number(parsedConfig.initialHardDuration),
                    timeDecreaseStep: Number(parsedConfig.timeDecreaseStep),
                    maxAttacksPerRound: Number(parsedConfig.maxAttacksPerRound),
                    winnerPercent: Number(parsedConfig.winnerPercent),
                    topAttackersPercent: Number(parsedConfig.topAttackersPercent),
                    minAttacksForReward: Number(parsedConfig.minAttacksForReward),
                    claimExpirationTime: Number(parsedConfig.claimExpirationTime),
                },
            }),
        }).then(r => r.json())
            .then(r => console.log('📸 [FOMO] Config snapshot for round', roundNum, '→', r))
            .catch(() => { /* silent fail — non-critical */ });
    }, [currentRound, parsedConfig]);

    // Derived helper values for mini rules panel (from contract config)
    const softDurationHours = parsedConfig?.softDuration ? Number(parsedConfig.softDuration) / 3600 : 6;
    const claimHours = parsedConfig?.claimExpirationTime ? Number(parsedConfig.claimExpirationTime) / 3600 : 2;
    const winnerPercent = parsedConfig?.winnerPercent ? Number(parsedConfig.winnerPercent) : 75;
    const topAttackersPercent = parsedConfig?.topAttackersPercent ? Number(parsedConfig.topAttackersPercent) : 25;
    const minAttacks = parsedConfig?.minAttacksForReward ? Number(parsedConfig.minAttacksForReward) : 10;

    // Parse top attackers
    const topAttackers = useMemo((): TopAttacker[] => {
        if (!topAttackersData) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attackersArray = Array.from(topAttackersData as unknown as any[]);
        return attackersArray
            .filter(a => a.addr !== "0x0000000000000000000000000000000000000000" && a.attacks > 0n)
            .map(a => ({ addr: a.addr as `0x${string}`, attacks: a.attacks as bigint }));
    }, [topAttackersData]);

    // REFETCH ALL DATA - comprehensive refresh function (Moved up)
    const refetchAllData = useCallback(() => {
        refetchJackpot();
        refetchRound();
        refetchRoundData();
        refetchPaused();
        refetchToken();
        refetchBalance();
        refetchAllowance();
        refetchVault();
        refetchLastAttack();
        refetchUserAttacks();
        refetchUserStats();
        refetchSeedFund();
        refetchLifetimeAttacks();
        refetchActiveConfig();
        refetchTopAttackers();
    }, [refetchJackpot, refetchRound, refetchRoundData, refetchPaused, refetchToken, refetchBalance, refetchAllowance, refetchVault, refetchLastAttack, refetchUserAttacks, refetchUserStats, refetchSeedFund, refetchLifetimeAttacks, refetchActiveConfig, refetchTopAttackers]);

    // Watch for attack events - Pure Edition (no luckyNumber in event)
    useWatchContractEvent({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        eventName: "AttackPerformed",
        onLogs(logs) {
            // Pure Edition: AttackPerformed(roundId, player, count, jackpot, newHardDeadline)
            const newEntries: AttackHistoryEntry[] = logs.map((log) => ({
                player: log.args.player as `0x${string}`,
                count: Number(log.args.count),
                timestamp: Math.floor(Date.now() / 1000),
                luckyNumber: 0,
                txHash: log.transactionHash || undefined,
            }));

            setAttackHistory((prev) => [...newEntries, ...prev].slice(0, 500));
            refetchJackpot();
            refetchRoundData();
            refetchUserAttacks();

            // Get latest attack for animation (ANY player's attack)
            if (logs.length > 0) {
                const latestLog = logs[logs.length - 1];
                const isOwnAttack = address
                    ? (latestLog.args.player as string)?.toLowerCase() === address.toLowerCase()
                    : false;

                setLatestAnyAttack({ luckyNumber: 0, isOwnAttack });

                // 🔊 Play attack sound effect (Pure Edition - always normal sound)
                if (soundEnabled) {
                    playAttackSound();
                }

                // 📢 Show toast notification for own attacks
                if (isOwnAttack) {
                    gameToast.attack(t.toastAttackSuccess, 0);

                    // 🔥 Combo streak tracking
                    handleComboTick();
                    // 🏆 Check for achievements
                    const achievement = checkAchievements({
                        type: "attack",
                        luckyNumber: 0
                    });
                    if (achievement) {
                        showAchievement(achievement);
                    }
                }

                // Clear after 3 seconds (short animation burst)
                setTimeout(() => setLatestAnyAttack(null), 3000);
            }
        },
    });

    // Issue #7: Browser notification for winner/timeout announcements
    const sendWinnerNotification = useCallback((winType: string, amount: string, winner: string) => {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        try {
            if (winType === 'TIMEOUT') {
                new Notification((t as any).notifPrizeRolledOver || '🔄 Prize Rolled Over!', {
                    body: (t as any).notifPrizeRolledOverBody ? (t as any).notifPrizeRolledOverBody(amount) : `Round ended — no claim was made. ${amount} $BANMAO rolled to next round.`,
                    icon: '/favicon.ico',
                    tag: 'banmaofomo-winner',
                });
            } else {
                new Notification('🏆 Round Won!', {
                    body: `${winner} won ${amount} $BANMAO! (${winType === 'SOFT_WIN' ? '⏳ Soft Win' : '⚡ Hard Win'})`,
                    icon: '/favicon.ico',
                    tag: 'banmaofomo-winner',
                });
            }
        } catch { /* Notification API not available */ }
    }, []);

    // NEW: Watch for RoundFinalized events (winner announcement)
    useWatchContractEvent({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        eventName: "RoundFinalized",
        onLogs(logs) {
            console.log("🏆 RoundFinalized event received:", logs.length, "logs");
            if (logs.length > 0) {
                const log = logs[logs.length - 1]; // Get latest
                const roundId = log.args.roundId as bigint;
                const winner = log.args.winner as string;
                const amount = log.args.amount as bigint;
                const rawWinType = log.args.winType as string || 'WIN';
                // For TIMEOUT: contract emits winner=address(0), amount=0
                const zeroAddr = '0x0000000000000000000000000000000000000000';
                const isZeroWinner = !winner || winner === zeroAddr;
                // Fix: Contract may emit SOFT_WIN/HARD_WIN even when claim expired
                // Detect by checking: winner=0x0 AND amount=0 → override to TIMEOUT
                const isClaimExpired = isZeroWinner && (!amount || amount === 0n);
                const winType = isClaimExpired ? 'TIMEOUT' : rawWinType;
                const isTimeout = winType === 'TIMEOUT';

                console.log("🏆 RoundFinalized:", { winner, amount: amount?.toString(), rawWinType, winType, isTimeout, isClaimExpired });

                // Issue #8: Mark this round as handled so polling won't duplicate
                winnerHandledForRoundRef.current = roundId;

                const formattedAmount = Number(amount / BigInt(10 ** 18)).toLocaleString();

                // Clear any attack animation to prioritize winner
                setLatestAnyAttack(null);

                setWinnerInfo({
                    winner: isZeroWinner ? '' : `${winner.slice(0, 6)}...${winner.slice(-4)}`,
                    amount: formattedAmount,
                    winType: winType,
                    txHash: (log as any).transactionHash || undefined,
                });

                // Show the modal (WinnerModal has its own TIMEOUT theme)
                setShowWinnerModal(true);

                // Only play sounds/confetti for real wins (not TIMEOUT)
                if (!isTimeout) {
                    if (soundEnabled) {
                        playVictorySound();
                    }
                    fireJackpotConfetti();
                }

                // Issue #7: Send browser notification
                const shortWinner = isZeroWinner ? '' : `${winner.slice(0, 6)}...${winner.slice(-4)}`;
                sendWinnerNotification(winType, formattedAmount, shortWinner || 'N/A');

                // In-app toast — different for timeout vs normal win
                if (isTimeout) {
                    gameToast.warning((t as any).toastClaimExpired || '🔄 Claim expired! Jackpot rolled to next round.');
                } else {
                    gameToast.winner(shortWinner, formattedAmount, t);
                }

                // Clear after 30 seconds
                setTimeout(() => setWinnerInfo(null), 30000);

                // CRITICAL: Refetch currentRound FIRST, then wait before refetching userAttacks
                // This ensures userAttacks queries the NEW round (not old round)
                refetchRound().then(() => {
                    // Small delay to ensure React state updates before next refetch
                    setTimeout(() => {
                        refetchUserAttacks();
                        refetchRoundData();
                        refetchJackpot();
                        refetchVault();
                    }, 500);
                });
            }
        },
    });

    // WebSocket real-time event subscription (runs alongside useWatchContractEvent as fallback)
    const { isConnected: wssConnected } = useFomoWebSocket({
        enabled: true,
        onAttack: useCallback((evt: WsAttackEvent) => {
            // Add to attack history
            setAttackHistory(prev => [{
                player: evt.player,
                count: Number(evt.count),
                timestamp: Math.floor(Date.now() / 1000),
                luckyNumber: 0,
                txHash: evt.txHash || undefined,
            }, ...prev].slice(0, 500));

            // Refetch data
            refetchJackpot();
            refetchRoundData();
            refetchUserAttacks();

            // Animation
            const isOwnAttack = address ? evt.player.toLowerCase() === address.toLowerCase() : false;
            setLatestAnyAttack({ luckyNumber: 0, isOwnAttack });

            if (soundEnabled) playAttackSound();
        }, [address, soundEnabled, refetchJackpot, refetchRoundData, refetchUserAttacks]),

        onRoundFinalized: useCallback((evt: WsRoundFinalizedEvent) => {
            // Refetch all data
            refetchRound();
            refetchRoundData();
            refetchJackpot();
            refetchVault();
            refetchUserAttacks();
        }, [refetchRound, refetchRoundData, refetchJackpot, refetchVault, refetchUserAttacks]),
    });

    // Sync WSS status
    useEffect(() => { setWsConnected(wssConnected); }, [wssConnected]);

    // Auto-refresh every 5 seconds for more responsive UI
    useEffect(() => {
        const interval = setInterval(() => {
            refetchJackpot();
            refetchRoundData();
            refetchVault();
            refetchRound();
            refetchUserAttacks(); // IMPORTANT: Refresh attacks remaining
            refetchLastAttack();
        }, 5000);

        return () => clearInterval(interval);
    }, [refetchJackpot, refetchRoundData, refetchVault, refetchRound, refetchUserAttacks, refetchLastAttack]);

    const handleAttackSuccess = useCallback(() => {
        // Refetch all data immediately after attack
        refetchAllData();
    }, [refetchAllData]);

    const handleClaimSuccess = useCallback(() => {
        // Refetch all data immediately after claim
        refetchAllData();

        // Retry refetching to handle RPC indexing latency
        setTimeout(() => {
            console.log("Refetching vault data (retry 1)...");
            refetchVault();
        }, 2000);

        setTimeout(() => {
            console.log("Refetching vault data (retry 2)...");
            refetchVault();
            refetchBalance(); // Also refresh wallet balance
        }, 5000);
    }, [refetchAllData, refetchVault, refetchBalance]);

    // Parse game status - V11 format only (ABI updated to match contract struct order)
    const parsedStatus = useMemo((): GameStatus | null => {
        if (!roundData || !currentRound) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rd = roundData as any;

        // V11 ABI order: [softDeadline, hardDeadline, ended, lastAttacker, totalAttacks, accRewardPerAttack]
        // Note: uint40 returns as number, need to convert to BigInt
        const softDeadline = BigInt(rd[0]);
        const hardDeadline = BigInt(rd[1]);
        const ended = rd[2] as boolean;
        const lastAttacker = rd[3] as `0x${string}`;
        const totalAttacks = rd[4] as bigint;

        // Calculate time left from deadlines
        const now = BigInt(Math.floor(Date.now() / 1000));
        const softTimeLeft = softDeadline > now ? softDeadline - now : BigInt(0);
        const hardTimeLeft = hardDeadline > now ? hardDeadline - now : BigInt(0);

        // Use cost from activeConfig (V11 only has config struct, no standalone getter)
        const cost = parsedConfig?.attackCost || BigInt(2000n * 10n ** 18n);

        return {
            roundId: currentRound,
            softTimeLeft,
            hardTimeLeft,
            pool: jackpotPool || BigInt(0),
            leader: lastAttacker,
            totalAtks: totalAttacks,
            cost,
            isPaused: isPaused || false,
            // Round ends when EITHER timer hits 0 (SOFT WIN or HARD WIN) OR round marked as ended
            isEnded: ended || softTimeLeft === BigInt(0) || hardTimeLeft === BigInt(0),
        };
    }, [roundData, currentRound, jackpotPool, isPaused, parsedConfig, timeTick]);

    // Tick once per second to ensure parsedStatus detects deadline crossing
    useEffect(() => {
        const interval = setInterval(() => setTimeTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    // V11: Calculate timeout danger state
    const timeoutState = useMemo(() => {
        if (!roundData || !parsedConfig) return { isInDanger: false, countdown: 0, deadline: BigInt(0) };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rd = roundData as any;
        // V11 ABI order: [softDeadline, hardDeadline, ended, lastAttacker, totalAttacks, accRewardPerAttack]
        // Note: uint40 returns as number, need to convert to BigInt
        const softDeadline = BigInt(rd[0]);
        const hardDeadline = BigInt(rd[1]);
        const ended = rd[2] as boolean;
        const now = BigInt(Math.floor(Date.now() / 1000));
        const claimExp = parsedConfig.claimExpirationTime;

        // Check if round has ended but we're in the grace period
        const effectiveEnd = softDeadline < hardDeadline ? softDeadline : hardDeadline;
        const isRoundTimerEnded = effectiveEnd <= now;

        if (!isRoundTimerEnded || ended) {
            return { isInDanger: false, countdown: 0, deadline: BigInt(0) };
        }

        // Calculate timeout deadline
        const timeoutDeadline = effectiveEnd + claimExp;
        const secondsLeft = timeoutDeadline > now ? Number(timeoutDeadline - now) : 0;
        const isInDanger = secondsLeft > 0 && secondsLeft < Number(claimExp);

        return {
            isInDanger,
            countdown: secondsLeft,
            deadline: timeoutDeadline,
        };
    }, [roundData, parsedConfig, timeTick]);

    // V11: Check if current user is the winner
    const isCurrentUserWinner = useMemo(() => {
        if (!parsedStatus || !address) return false;
        return parsedStatus.leader.toLowerCase() === address.toLowerCase() && parsedStatus.isEnded;
    }, [parsedStatus, address]);

    // Kill Zone detection: when Hard Timer drops below threshold
    useEffect(() => {
        if (!parsedStatus || parsedStatus.isEnded) {
            setKillZoneActive(false);
            killZoneVibratedRef.current = false;
            return;
        }
        const hardSeconds = Number(parsedStatus.hardTimeLeft);
        const isKillZone = hardSeconds > 0 && hardSeconds < 1800; // 30 minutes — matches GameArena banner threshold
        setKillZoneActive(isKillZone);

        // Vibrate mobile device once when entering kill zone
        if (isKillZone && !killZoneVibratedRef.current) {
            killZoneVibratedRef.current = true;
            if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate([200, 100, 200]); // short-pause-short pattern
            }
        }
        if (!isKillZone) {
            killZoneVibratedRef.current = false;
        }
    }, [parsedStatus]);

    // Timer expired: immediately refetch all round data to transition UI
    const handleTimerExpired = useCallback(() => {
        console.log('[BanMaoFomo] Timer expired — force refetching round data');
        refetchRoundData();
    }, [refetchRoundData]);

    // Claim timeout expired: notify user + refetch
    const handleClaimTimeoutExpired = useCallback(() => {
        console.log('[BanMaoFomo] Claim timeout expired — rewards rolling over');
        gameToast.warning((t as any).toastClaimTimeoutExpired || '⏰ Claim expired! Jackpot will be rolled to the next round.');
        refetchRoundData();
    }, [refetchRoundData]);

    // Combo handler: called when own attack succeeds
    const handleComboTick = useCallback(() => {
        const now = Date.now();
        const elapsed = now - lastGiftTimeRef.current;
        lastGiftTimeRef.current = now;

        // Clear existing timeout
        if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);

        if (elapsed < 10000) { // within 10 seconds
            setComboCount(prev => prev + 1);
        } else {
            setComboCount(1);
        }
        setComboVisible(true);

        // Hide combo after 3 seconds of inactivity
        comboTimeoutRef.current = setTimeout(() => {
            setComboVisible(false);
            // Reset after fade out
            setTimeout(() => setComboCount(0), 500);
        }, 3000);
    }, []);

    // 🏆 Polling-based winner detection via currentRound increment
    // When settleGame() is called, the contract atomically ends round N and starts N+1.
    // We detect this by tracking when currentRound increases, then fetch round N data for winner info.
    const prevRoundRef = React.useRef<bigint | null>(null);
    useEffect(() => {
        if (!currentRound || !publicClient) return;

        const prevRound = prevRoundRef.current;
        prevRoundRef.current = currentRound;

        // Skip initial load (no previous round to compare)
        if (prevRound === null) return;

        // Detect round increment: N → N+1
        if (currentRound > prevRound) {
            console.log(`🏆 [ROUND CHANGE] Round advanced from ${prevRound.toString()} to ${currentRound.toString()}`);

            // Issue #8: Skip if event-based detection already handled this round
            if (winnerHandledForRoundRef.current === prevRound) {
                console.log("🏆 [POLL] Skipping — already handled by RoundFinalized event");
                // Still refetch data
                refetchRoundData();
                refetchJackpot();
                refetchVault();
                refetchUserAttacks();
                return;
            }

            // Fetch the PREVIOUS round's data to get winner info
            const fetchPrevRoundWinner = async () => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const prevRoundData = await (publicClient as any).readContract({
                        address: BANMAOFOMO_ADDRESS,
                        abi: BANMAOFOMO_ABI,
                        functionName: "rounds",
                        args: [prevRound],
                    }) as any[];

                    // V11 struct: [softDeadline, hardDeadline, ended, lastAttacker, totalAttacks, accRewardPerAttack]
                    const ended = prevRoundData[2] as boolean;
                    const lastAttacker = prevRoundData[3] as string;

                    if (!ended) {
                        console.log("🏆 Previous round not marked as ended, skipping winner modal");
                        return;
                    }

                    console.log("🏆 Winner:", lastAttacker);

                    // Issue #1: Properly detect TIMEOUT win type
                    const softDeadline = BigInt(prevRoundData[0] as number | bigint);
                    const hardDeadline = BigInt(prevRoundData[1] as number | bigint);
                    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
                    const totalAttacks = Number(prevRoundData[4] as bigint);

                    let winType = "SOFT_WIN";
                    if (totalAttacks === 0) {
                        // No attacks — timeout with no participants
                        winType = "TIMEOUT";
                    } else if (hardDeadline > 0n && hardDeadline <= nowSeconds && softDeadline > hardDeadline) {
                        // Hard deadline expired first — hard win
                        winType = "HARD_WIN";
                    } else if (softDeadline > 0n && softDeadline <= nowSeconds && hardDeadline > softDeadline) {
                        // Soft deadline expired first — soft win
                        winType = "SOFT_WIN";
                    } else if (hardDeadline <= softDeadline) {
                        winType = "HARD_WIN";
                    }

                    // Issue #2: Fetch actual prize from RoundFinalized event instead of stale pool
                    let formattedAmount = '0';
                    try {
                        const currentBlock = await publicClient.getBlockNumber();
                        const fromBlockNum = currentBlock > 200n ? currentBlock - 200n : 0n;
                        const roundFinalizedLogs = await publicClient.getLogs({
                            address: BANMAOFOMO_ADDRESS,
                            event: {
                                type: 'event',
                                name: 'RoundFinalized',
                                inputs: [
                                    { type: 'uint256', name: 'roundId', indexed: true },
                                    { type: 'address', name: 'winner', indexed: true },
                                    { type: 'uint256', name: 'amount', indexed: false },
                                    { type: 'string', name: 'winType', indexed: false },
                                ],
                            },
                            fromBlock: fromBlockNum,
                            toBlock: 'latest',
                        });
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const matchingLog = roundFinalizedLogs.find((log: any) => {
                            return Number(log.args.roundId) === Number(prevRound);
                        }) as any;
                        if (matchingLog) {
                            formattedAmount = Number(BigInt(matchingLog.args.amount) / BigInt(10 ** 18)).toLocaleString();
                            // Also use event's winType if available (most accurate)
                            if (matchingLog.args.winType) {
                                winType = matchingLog.args.winType;
                            }
                            // Fix: Override to TIMEOUT if claim expired (winner=0x0, amount=0)
                            const zeroAddr = '0x0000000000000000000000000000000000000000';
                            const matchWinner = matchingLog.args.winner as string;
                            if ((!matchWinner || matchWinner === zeroAddr) && BigInt(matchingLog.args.amount) === 0n) {
                                winType = 'TIMEOUT';
                            }
                        }
                    } catch (e) {
                        console.warn("⚠️ Could not fetch RoundFinalized event for amount, using pool fallback", e);
                        const jackpot = jackpotPool || BigInt(0);
                        formattedAmount = Number(jackpot / BigInt(10 ** 18)).toLocaleString();
                    }

                    // Set winner info
                    setWinnerInfo({
                        winner: lastAttacker ? `${lastAttacker.slice(0, 6)}...${lastAttacker.slice(-4)}` : 'Unknown',
                        amount: formattedAmount,
                        winType,
                    });

                    // Show the celebration modal!
                    setShowWinnerModal(true);

                    // Only play sounds/confetti for real wins (not TIMEOUT)
                    if (winType !== 'TIMEOUT') {
                        if (soundEnabled) {
                            playVictorySound();
                        }
                        fireJackpotConfetti();
                    }

                    // Issue #7: Send browser notification
                    sendWinnerNotification(winType, formattedAmount, lastAttacker ? `${lastAttacker.slice(0, 6)}...${lastAttacker.slice(-4)}` : 'Unknown');

                    // Clear after 30 seconds
                    setTimeout(() => setWinnerInfo(null), 30000);

                    // Refetch all data
                    refetchRoundData();
                    refetchJackpot();
                    refetchVault();
                    refetchUserAttacks();

                } catch (error) {
                    console.error("❌ Error fetching previous round winner:", error);
                }
            };

            fetchPrevRoundWinner();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentRound]);

    // Leader change detection - show toast when leader changes
    const prevLeaderRef = React.useRef<string | null>(null);
    useEffect(() => {
        if (parsedStatus?.leader && parsedStatus.leader !== prevLeaderRef.current) {
            // Only show toast if there was a previous leader (not initial load)
            if (prevLeaderRef.current && prevLeaderRef.current !== parsedStatus.leader) {
                const isYou = address?.toLowerCase() === parsedStatus.leader.toLowerCase();
                gameToast.leaderChange(parsedStatus.leader, isYou);
                if (isYou) {
                    fireNewKingConfetti();
                    // Check for King Slayer achievement
                    const achievement = checkAchievements({ type: "becameLeader" });
                    if (achievement) {
                        showAchievement(achievement);
                    }
                }
            }
            prevLeaderRef.current = parsedStatus.leader;
        }
    }, [parsedStatus?.leader, address]);

    // Combo streak detection - track consecutive attacks by user
    const [comboStreak, setComboStreak] = React.useState(0);
    const lastAttackTimeRef = React.useRef<number>(0);

    useEffect(() => {
        // If user made an attack recently (within 30 seconds), increment combo
        const now = Date.now();
        if (userAttacksThisRound && Number(userAttacksThisRound) > 0) {
            const timeSinceLastAttack = now - lastAttackTimeRef.current;
            if (timeSinceLastAttack < 30000 && timeSinceLastAttack > 0) {
                setComboStreak(prev => {
                    const newStreak = prev + 1;
                    if (newStreak >= 2) {
                        gameToast.combo(newStreak);
                    }
                    return newStreak;
                });
            } else if (timeSinceLastAttack > 60000) {
                // Reset combo if more than 60 seconds since last attack
                setComboStreak(0);
            }
            lastAttackTimeRef.current = now;
        }
    }, [userAttacksThisRound]);

    // Show error if contract read failed
    if (isJackpotError) {
        return (
            <div className="fomo-loading" style={{ flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '48px' }}>⚠️</div>
                <span style={{ color: '#ef4444', fontSize: '18px', fontWeight: 600 }}>
                    Failed to connect to contract
                </span>
                <span style={{ color: '#888', fontSize: '14px', maxWidth: '300px', textAlign: 'center' }}>
                    {jackpotError?.message || 'Unable to read game status. Please check your network connection.'}
                </span>
                <button
                    onClick={() => {
                        refetchAllData();
                    }}
                    style={{
                        marginTop: '16px',
                        padding: '12px 32px',
                        background: 'linear-gradient(135deg, #ff6b35, #ffd700)',
                        border: 'none',
                        borderRadius: '24px',
                        color: '#000',
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    🔄 Retry
                </button>
            </div>
        );
    }

    if (!parsedStatus) {
        return (
            <div className="fomo-loading" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'radial-gradient(ellipse at center, rgba(30, 20, 50, 0.95) 0%, rgba(10, 10, 15, 1) 80%)',
                gap: '24px',
            }}>
                <motion.img
                    src="/gamefi/banmaofomo/sprites/banmao_dancing.png"
                    alt="Loading..."
                    style={{
                        width: isMobile ? 250 : 400,
                        height: isMobile ? 250 : 400,
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.3))',
                    }}
                    animate={{
                        y: [0, -30, 0],
                        rotate: [0, -3, 3, 0],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
                <motion.div
                    style={{
                        color: '#ffd700',
                        fontSize: isMobile ? '16px' : '20px',
                        fontWeight: 700,
                        textAlign: 'center',
                        textShadow: '0 0 10px rgba(255, 215, 0, 0.3)',
                    }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    🐱 {t.loading}...
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fomo-container">
            {/* Toast Notifications */}
            <GameToaster />

            {/* Kill Zone Warning — handled inside GameArena component */}

            {/* Achievement Unlock Toast */}
            <AchievementToast
                achievement={pendingAchievement}
                onClose={clearAchievement}
            />

            {/* Onboarding Tour */}
            <OnboardingTour
                isOpen={showTour}
                onClose={() => setShowTour(false)}
                t={t}
            />

            {/* Settings Panel */}
            <SettingsPanel
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                t={t}
                hardTimeLeft={Number(parsedStatus.hardTimeLeft)}
                softTimeLeft={Number(parsedStatus.softTimeLeft)}
                jackpotValue={Number(formatUnits(parsedStatus.pool, 18))}
                isEnded={parsedStatus.isEnded}
            />

            <GameHeader
                currentLang={lang}
                onChangeLang={handleChangeLang}
                t={t}
                onOpenSettings={() => setShowSettings(true)}
                onOpenTour={() => setShowTour(true)}
            />

            <main className="fomo-main">



                {/* === 3-COLUMN MAIN LAYOUT === */}
                <div className="fomo-main-grid">

                    {/* LEFT COLUMN - Unified Player Dashboard */}
                    <div className="fomo-column left" data-tour="fomo-dashboard">
                        <PlayerDashboard
                            personalVault={(() => {
                                // Compute pending dividend = (userAttacks * accRewardPerAttack / PRECISION) - rewardDebt
                                // This ensures the vault display updates in real-time as other players attack
                                const vault = personalVault || BigInt(0);
                                try {
                                    const attacks = userAttacksThisRound ? BigInt(userAttacksThisRound as bigint) : BigInt(0);
                                    const debt = userRewardDebt ? BigInt(userRewardDebt as bigint) : BigInt(0);
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const accReward = roundData ? BigInt((roundData as any)[5]) : BigInt(0);
                                    if (attacks > 0n && accReward > 0n) {
                                        const pending = (attacks * accReward / PRECISION) - debt;
                                        if (pending > 0n) return vault + pending;
                                    }
                                } catch { /* fallback to stored vault */ }
                                return vault;
                            })()}
                            currentRound={parsedStatus.roundId}
                            isRoundEnded={parsedStatus.isEnded}
                            isWinner={isCurrentUserWinner}
                            isInTimeoutDanger={timeoutState.isInDanger}
                            timeoutCountdown={timeoutState.countdown}
                            onSettleSuccess={handleClaimSuccess}
                            currentTier={userStats ? Number(userStats[3]) : 0}
                            lifetimeAttacks={totalLifetimeAttacks || BigInt(0)}
                            baseCooldown={cooldownTime || BigInt(5)}
                            seedFund={seedFundNextRound}
                            tierData={tierData}
                            t={t}
                        />

                    </div>

                    {/* CENTER COLUMN - Unified Game Arena (Slot Machine Style) */}
                    <div className="fomo-column center">

                        {/* Unified Game Arena - Slot Machine Style PRO */}
                        <div ref={arenaTimerRef}>
                            <GameArena
                                pool={parsedStatus.pool}
                                seedFund={seedFundNextRound}
                                softTimeLeft={parsedStatus.softTimeLeft}
                                hardTimeLeft={parsedStatus.hardTimeLeft}
                                isEnded={parsedStatus.isEnded}
                                isPaused={parsedStatus.isPaused}
                                latestAttack={latestAnyAttack}
                                winnerInfo={winnerInfo}
                                idleAnimationIndex={idleAnimationIndex}
                                t={t}
                                lang={lang} // Pass current language
                                // Attack controls

                                showAttackControls={true}
                                attackCost={parsedStatus.cost}
                                userBalance={userBalance || BigInt(0)}
                                userAttacksThisRound={userAttacksThisRound || BigInt(0)}
                                maxAttacksPerRound={parsedConfig?.maxAttacksPerRound || BigInt(100)}
                                minAttacksForReward={parsedConfig?.minAttacksForReward || BigInt(3)}
                                // Contract interaction props
                                allowance={userAllowance as bigint || BigInt(0)}
                                tokenAddress={tokenAddress || BANMAO_ADDRESS}
                                cooldownLeft={cooldownLeft}
                                onAttackSuccess={() => {
                                    refetchBalance();
                                    refetchAllowance();
                                    refetchUserAttacks();
                                    refetchLastAttack();
                                }}
                                onApproveSuccess={() => {
                                    refetchAllowance();
                                }}
                                onClaimAll={handleClaimAll}
                                canAttack={isConnected && !parsedStatus.isPaused && !parsedStatus.isEnded}
                                // Realtime Timer Config
                                softDuration={parsedConfig?.softDuration ? Number(parsedConfig.softDuration) : undefined}
                                timeDecreaseStep={parsedConfig?.timeDecreaseStep ? Number(parsedConfig.timeDecreaseStep) : undefined}
                                // Phase 1: Visual Effects
                                comboCount={comboCount}
                                comboVisible={comboVisible}
                                killZoneActive={killZoneActive}
                                // Dynamic contract config values
                                initialHardDuration={parsedConfig?.initialHardDuration ? Number(parsedConfig.initialHardDuration) : undefined}
                                winnerPercent={parsedConfig?.winnerPercent ? Number(parsedConfig.winnerPercent) : undefined}
                                topAttackersPercent={parsedConfig?.topAttackersPercent ? Number(parsedConfig.topAttackersPercent) : undefined}
                                // Distribution animation callback
                                onDistributionShow={(amount, count) => {
                                    setDistAmount(amount);
                                    setDistCount(count);
                                    setShowDistribution(true);
                                }}
                                timeoutCountdown={timeoutState.countdown}
                                lastAttacker={parsedStatus.leader}
                                onTimerExpired={handleTimerExpired}
                                onClaimTimeoutExpired={handleClaimTimeoutExpired}
                                // Timer Prize Detail Panel data
                                totalAttacks={parsedStatus.totalAtks}
                                topAttackers={topAttackers}
                                jackpotPool={parsedStatus.pool}
                            />
                        </div>

                        {/* Simulator Button — below GameArena, centered */}
                        <style>{`
                            .sim-open-btn { transition: all 0.25s ease !important; }
                            .sim-open-btn:hover {
                                background: rgba(255, 215, 0, 0.12) !important;
                                border-color: rgba(255, 215, 0, 0.35) !important;
                                color: #ffd700 !important;
                                transform: scale(1.03);
                                box-shadow: 0 0 12px rgba(255, 215, 0, 0.15);
                            }
                            .sim-open-btn:active { transform: scale(0.97); }
                        `}</style>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '8px 0 4px',
                        }}>
                            <button
                                className="sim-open-btn btn-3d-ghost"
                                onClick={() => setShowSimulator(true)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: '999px',
                                    padding: '6px 16px',
                                    cursor: 'pointer',
                                    color: '#a0a0b0',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                                title={t.simTitle || 'Gift Simulator'}
                            >
                                🧮 {t.simTitle || 'Simulator'}
                            </button>
                            <button
                                className="sim-open-btn btn-3d-ghost"
                                onClick={() => setShowNextRound(true)}
                                style={{
                                    background: 'rgba(139,92,246,0.05)',
                                    border: '1px solid rgba(139,92,246,0.2)',
                                    borderRadius: '999px',
                                    padding: '6px 16px',
                                    cursor: 'pointer',
                                    color: '#a78bfa',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                                title={t.nrTitle || 'Next Round Config'}
                            >
                                🔮 {t.nrBtnLabel || 'Next Round'}
                            </button>
                        </div>

                        {/* Gift Simulator Modal */}
                        <GiftSimulator
                            attackCost={parsedStatus.cost}
                            currentPool={parsedStatus.pool}
                            hardTimeLeft={parsedStatus.hardTimeLeft}
                            softTimeLeft={parsedStatus.softTimeLeft}
                            timeDecreaseStep={parsedConfig?.timeDecreaseStep ? Number(parsedConfig.timeDecreaseStep) : 30}
                            totalAttacks={parsedStatus.totalAtks}
                            userAttacks={userAttacksThisRound || BigInt(0)}
                            isOpen={showSimulator}
                            onClose={() => setShowSimulator(false)}
                            t={t}
                        />

                        {/* Next Round Config Panel */}
                        <NextRoundPanel
                            isOpen={showNextRound}
                            onClose={() => setShowNextRound(false)}
                            currentConfig={parsedConfig}
                            t={t}
                        />
                    </div>

                    {/* Countdown Floating Widget — shows when main timers scroll out */}
                    <CountdownWidget
                        softTimeLeft={parsedStatus.softTimeLeft}
                        hardTimeLeft={parsedStatus.hardTimeLeft}
                        pool={parsedStatus.pool}
                        isEnded={parsedStatus.isEnded}
                        observeRef={arenaTimerRef}
                        bottomOffset={0}
                    />

                    {/* RIGHT COLUMN - Desktop only */}
                    {!isMobile && (
                        <div className="fomo-column right" data-tour="fomo-rounds">
                            {/* Distribution Animation — desktop: above RoundInfoPanel */}
                            <DistributionAnimation
                                show={showDistribution}
                                attackAmount={distAmount}
                                attackCount={distCount}
                                t={t}
                                isMobile={false}
                                isFirstAttack={Number(parsedStatus.totalAtks) <= 1}
                                onComplete={() => setShowDistribution(false)}
                                softResetDuration={parsedConfig?.softDuration ? Number(parsedConfig.softDuration) : undefined}
                                hardDeductionPerKey={parsedConfig?.timeDecreaseStep ? Number(parsedConfig.timeDecreaseStep) : undefined}
                            />
                            <RoundInfoPanel
                                currentLeader={parsedStatus.leader}
                                totalAttacks={parsedStatus.totalAtks}
                                roundId={parsedStatus.roundId}
                                attackHistory={attackHistory}
                                isLoadingHistory={isLoadingHistory}
                                t={t}
                                topAttackers={topAttackers}
                                jackpotPool={parsedStatus.pool}
                                userAddress={address}
                                currentRound={parsedStatus.roundId}
                                attackCost={parsedStatus.cost}
                            />
                        </div>
                    )}
                </div>

                {/* Mobile Bottom Sheet for Round Info */}
                {isMobile && (
                    <BottomSheet
                        title={t.bsRoundInfo || "📊 Round Info"}
                        swipeUpText={t.bsSwipeUp || "↑ Swipe up"}
                        swipeDownText={t.bsSwipeDown || "↓ Swipe down"}
                        data-tour="fomo-rounds"
                    >
                        <RoundInfoPanel
                            currentLeader={parsedStatus.leader}
                            totalAttacks={parsedStatus.totalAtks}
                            roundId={parsedStatus.roundId}
                            attackHistory={attackHistory}
                            isLoadingHistory={isLoadingHistory}
                            t={t}
                            topAttackers={topAttackers}
                            jackpotPool={parsedStatus.pool}
                            userAddress={address}
                            currentRound={parsedStatus.roundId}
                            compact
                            attackCost={parsedStatus.cost}
                        />
                    </BottomSheet>
                )}

                {/* Distribution Animation — mobile: fixed overlay */}
                {isMobile && (
                    <DistributionAnimation
                        show={showDistribution}
                        attackAmount={distAmount}
                        attackCount={distCount}
                        t={t}
                        isMobile={true}
                        isFirstAttack={Number(parsedStatus.totalAtks) <= 1}
                        onComplete={() => setShowDistribution(false)}
                        softResetDuration={parsedConfig?.softDuration ? Number(parsedConfig.softDuration) : undefined}
                        hardDeductionPerKey={parsedConfig?.timeDecreaseStep ? Number(parsedConfig.timeDecreaseStep) : undefined}
                    />
                )}

                {/* Mini Rules Panel - Inline with Grid max-width */}
                <div className="fomo-full-width-row" style={{ marginTop: '24px' }}>
                    <div
                        className="mini-rules-panel-v2"
                        data-tour="fomo-rules"
                        onClick={() => setShowRules(true)}
                        title={t.miniRulesViewMore}
                        style={{ margin: '0' }}
                    >
                        <div className="mini-rules-header-v2">
                            <span>📜</span>
                            <span className="title">{t.miniRulesTitle}</span>
                            <span className="cta">{t.miniRulesViewDetails}</span>
                        </div>

                        <div className="mini-rules-grid">
                            {/* Key Rule - spans full width */}
                            <div className="mini-row gold hover-mini-row" style={{
                                gridColumn: '1 / -1',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '13px',
                                background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.15))',
                                border: '1px solid rgba(255,215,0,0.3)',
                            }}>
                                <span>🎯</span>
                                <span>{t.miniRulesLastGifterWins}</span>
                            </div>

                            <div className="mini-col">
                                <div className="mini-row info hover-mini-row"><span>💰</span><span>{t.miniRulesCost(parsedConfig?.attackCost ? Number(parsedConfig.attackCost) / 1e18 : 2000)}</span></div>
                                <div className="mini-row info hover-mini-row"><span>🔢</span><span>{t.miniRulesMaxPerPlayer(parsedConfig?.maxAttacksPerRound ? Number(parsedConfig.maxAttacksPerRound) : 100)}</span></div>
                                <div className="mini-row soft hover-mini-row"><span>🐱</span><span>{t.miniRulesSoftRule(softDurationHours)}</span></div>
                                <div className="mini-row hard hover-mini-row"><span>⚡</span><span>{t.miniRulesHardRule}</span></div>
                            </div>

                            <div className="mini-col">
                                <div className="mini-row gold hover-mini-row"><span>👑</span><span>{t.miniRulesWinnerPct(winnerPercent)}</span></div>
                                <div className="mini-row purple hover-mini-row"><span>🏆</span><span>{t.miniRulesTop10Pct(topAttackersPercent)}</span></div>
                                <div className="mini-row warning hover-mini-row"><span>⚠️</span><span>{t.miniRulesMinGifts(minAttacks)}</span></div>
                                <div className="mini-row timeout hover-mini-row"><span>⏰</span><span>{t.miniRulesClaimWarn(claimHours)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>



            {/* Rules Modal */}
            <RulesModal
                isOpen={showRules}
                onClose={() => setShowRules(false)}
                t={t}
                config={parsedConfig}
                tierData={tierData}
                baseCooldown={Number(cooldownTime)}
            />

            {/* Winner Celebration Modal */}
            <WinnerModal
                isVisible={showWinnerModal}
                winnerInfo={winnerInfo}
                onClose={() => setShowWinnerModal(false)}
                t={t}
            />

            {/* Ambient floating cat & banana emojis */}
            <FloatingEmojis />
            {/* Footer */}
            {/* Footer */}
            {/* Footer */}
            <footer className="fomo-footer" style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: '16px',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 0',
                paddingBottom: isMobile ? '70px' : '12px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                marginTop: '16px'
            }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <a
                        href="https://t.me/banmao_X"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover-icon-gold"
                        style={{
                            color: '#ffd700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            background: 'rgba(255, 215, 0, 0.05)',
                            borderRadius: '50%',
                            transition: 'all 0.3s ease'
                        }}
                        aria-label="Telegram"
                    >
                        <FaTelegram size={18} />
                    </a>
                    <a
                        href="https://x.com/banmao_X"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover-icon-gold"
                        style={{
                            color: '#ffd700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            background: 'rgba(255, 215, 0, 0.05)',
                            borderRadius: '50%',
                            transition: 'all 0.3s ease'
                        }}
                        aria-label="X (Twitter)"
                    >
                        <FaXTwitter size={18} />
                    </a>
                </div>

                <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} className="footer-divider-desktop"></div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '11px', color: '#ffffff60' }}>
                    <span>Idea: <strong style={{ color: '#ffffff90' }}>玄</strong> (@tg_xuan)</span>
                    <span>Dev: <strong style={{ color: '#ffffff90' }}>ＤＯＲＥＭＯＮ</strong> (<a href="https://x.com/haivcon" target="_blank" rel="noopener noreferrer" style={{ color: '#ffffff60', textDecoration: 'none' }}>@haivcon</a>)</span>
                </div>

                <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} className="footer-divider-desktop"></div>

                <div>
                    <a
                        href={`https://www.okx.com/web3/explorer/x-layer/address/${BANMAOFOMO_ADDRESS}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contract-link"
                        style={{ fontSize: '11px', opacity: 0.7 }}
                    >
                        📜 Contract
                    </a>
                </div>
            </footer>
        </div>
    );
}
