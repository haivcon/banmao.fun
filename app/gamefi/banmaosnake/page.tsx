"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatUnits } from 'viem';
import { SNAKE_ABI, ERC20_ABI } from './lib/abis';
import { SNAKE_CONTRACT_ADDRESS, BANMAO_TOKEN_ADDRESS, SNAKE_SIGN_ENDPOINT } from './lib/constants';
import { langs, flags, getBrowserLang, LangKey, SnakeStrings } from './lib/i18n';
import { sounds } from './lib/sounds';
import { AVATARS, getAvatarColor, AvatarIndex } from './lib/avatars';
import { PlayerProfile, getProfile, saveProfile, createDefaultProfile, updateHighScore, getLeaderboard, getPlayerRank, getAvatarEmoji } from './lib/profiles';
import { OnchainPlayer, fetchOnchainLeaderboard, getOnchainPlayerRank, formatClaimedAmount, updateLeaderboardAfterClaim, updateProfileOnLeaderboard } from './lib/onchainLeaderboard';
import { registerServiceWorker, initInstallPrompt } from './lib/registerSW';
import PWAInstallBanner from './components/PWAInstallBanner';
import { recordGameVisit } from '../../../lib/gameVisitTracker';
import HelpModal from './components/HelpModal';
import Toast, { ToastData } from './components/Toast';
import { MenuOverlay, PauseOverlay } from './components/GameOverlay';
import FlyingCoin from './components/FlyingCoin';
import DPad, { Direction } from './components/DPad';
import BackButton from './components/BackButton';
import GameHUD from './components/GameHUD';
import ScorePopups, { ScorePopup } from './components/ScorePopups';
import Particles, { Particle } from './components/Particles';
import MilestoneNotification, { MilestoneData } from './components/MilestoneNotification';
import ComboCounter from './components/ComboCounter';
import SuperModeBadge from './components/SuperModeBadge';
import SocialLinksRow from './components/SocialLinksRow';
import ExplorerLink from './components/ExplorerLink';
import MyProfileCard from './components/MyProfileCard';
import LeaderboardPanel from './components/LeaderboardPanel';
import DonorLeaderboardList from './components/DonorLeaderboardList';
import CommunitySupportSection from './components/CommunitySupportSection';
import InfoPanelModal from './components/InfoPanelModal';
import PlayerInfoModal, { ViewPlayerData } from './components/PlayerInfoModal';
import FloatingSettingsSection from './components/FloatingSettingsSection';
import { OfflineBanner, DifficultyBadge, ClaimCooldownOverlay, ClaimHistoryPanel, LoadMoreButton } from './components/GameEnhancements';
import GameDisabled from '../components/GameDisabled';

// Import game configuration from dedicated module
import {
    GRID, COLS, ROWS, W, H,
    INIT_SPEED, GAS_MAX, GAS_DECAY, MIN_CLAIM,
    TEST_MODE,
    Pos, GameState
} from './lib/gameConfig';

// Import game engine functions
import { getPlayerLevel } from './lib/gameEngine';

// Import inline styles
import { S } from './lib/styles';
import { useClaimCooldown, useClaimHistory, useGameReplay, getDifficultyForScore, useOfflineDetection } from './lib/useGameEnhancements';

// Import utility functions
import { formatCompact, getPlayerBadges, getLevelBorderStyle, avatarCategories, isPremiumAvatar, canUsePremiumAvatar, Badge } from './lib/utils';

// CSS styles now imported from external files
import './styles/index.css';

// Use GameState type from gameConfig
type State = GameState;


export default function SnakeGame() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const [state, setState] = useState<State>('MENU');
    const [score, setScore] = useState(0);
    const [gas, setGas] = useState(GAS_MAX);
    const [best, setBest] = useState(0);
    const [superMode, setSuperMode] = useState(false);
    const superModeRef = useRef(false); // Ref to avoid closure issue in setInterval
    const [obs, setObs] = useState<Pos[]>([]);
    const [err, setErr] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
    const [isMobile, setIsMobile] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [rejected, setRejected] = useState(false);
    const [lang, setLang] = useState<LangKey>('en');
    const [langOpen, setLangOpen] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [claimedAmount, setClaimedAmount] = useState<number | null>(null);
    const [balanceHighlight, setBalanceHighlight] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [showStatsPanel, setShowStatsPanel] = useState(false);
    const [backendConfig, setBackendConfig] = useState<{ maxClaimsPerHour: number; cooldownSeconds: number } | null>(null);
    const gameSessionId = useRef<string | null>(null);
    const sessionStartTime = useRef<number | null>(null);
    const sessionStartTimeHash = useRef<string | null>(null);
    const sessionChecksumSeed = useRef<string | null>(null);

    // === Enhancement Hooks ===
    const { cooldownLeft, handleRateLimitError, formatCooldown } = useClaimCooldown();
    const { claims, loading: claimsLoading, showHistory, toggleHistory, fetchClaims: refreshClaims } = useClaimHistory(address);
    const { bestReplay, saveReplayIfBest } = useGameReplay();
    const [difficultyLevel, setDifficultyLevel] = useState(getDifficultyForScore(0));
    const [isOnline, setIsOnline] = useState(true);
    const [leaderboardPage, setLeaderboardPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false); // Game help/guide modal
    const [soundEnabled, setSoundEnabled] = useState(true);
    // Settings Panel States
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [uiScale, setUiScale] = useState<'xs' | 'sm' | 'md' | 'lg'>('md'); // UI scale: extra small, small, medium, large
    // Scale multiplier for CSS zoom - affects entire page
    const scaleMultiplier = { xs: 0.7, sm: 0.8, md: 1.0, lg: 1.1 }[uiScale];

    // Upgrade 8: Offline detection - auto-pause when offline
    useEffect(() => {
        const goOffline = () => { setIsOnline(false); if (state === 'PLAY') { setState('PAUSE'); if (loop.current) clearInterval(loop.current); if (obsT.current) clearInterval(obsT.current); } };
        const goOnline = () => setIsOnline(true);
        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);
        if (typeof navigator !== 'undefined' && !navigator.onLine) setIsOnline(false);
        return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
    }, [state]);
    const [profileEditCount, setProfileEditCount] = useState(0); // Track profile edits (max 3)
    const MAX_PROFILE_EDITS = 3;
    // Leaderboard & Profile
    const [leaderboard, setLeaderboard] = useState<PlayerProfile[]>([]);
    const [onchainLeaderboard, setOnchainLeaderboard] = useState<OnchainPlayer[]>([]);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [viewPlayer, setViewPlayer] = useState<PlayerProfile | null>(null);
    const [viewOnchainPlayer, setViewOnchainPlayer] = useState<OnchainPlayer | null>(null);
    const [showFly, setShowFly] = useState(false); // Coin flying animation state
    const [myProfile, setMyProfile] = useState<PlayerProfile | null>(null);
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState(0);
    const [editTelegram, setEditTelegram] = useState('');
    const [editTwitter, setEditTwitter] = useState('');
    const [showLeaderboard, setShowLeaderboard] = useState(true);
    // Donor Leaderboard States
    const [donorLeaderboard, setDonorLeaderboard] = useState<{
        address: string;
        name: string;
        avatar: number;
        totalDonated: string;
        donationCount: number;
        telegram?: string;
        twitter?: string;
        badge: { tier: string; icon: string; color: string };
    }[]>([]);
    const [myDonorProfile, setMyDonorProfile] = useState<{
        address: string;
        name: string;
        avatar: number;
        totalDonated: string;
        donationCount: number;
        telegram?: string;
        twitter?: string;
        badge: { tier: string; icon: string; color: string };
    } | null>(null);
    const [showDonorPanel, setShowDonorPanel] = useState(false);
    const [donorTxHash, setDonorTxHash] = useState('');
    const [donorVerifying, setDonorVerifying] = useState(false);
    const [donorVerifyResult, setDonorVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
    // Donor Profile View/Edit States
    const [viewDonor, setViewDonor] = useState<{
        address: string;
        name: string;
        avatar: number;
        totalDonated: string;
        donationCount: number;
        telegram?: string;
        twitter?: string;
        badge: { tier: string; icon: string; color: string };
    } | null>(null);
    const [showDonorEditModal, setShowDonorEditModal] = useState(false);
    const [editDonorName, setEditDonorName] = useState('');
    const [editDonorAvatar, setEditDonorAvatar] = useState(0);
    const [editDonorTelegram, setEditDonorTelegram] = useState('');
    const [editDonorTwitter, setEditDonorTwitter] = useState('');
    const [donorEditSaving, setDonorEditSaving] = useState(false);
    const [donationHistory, setDonationHistory] = useState<{ txHash: string; amount: string; timestamp: number }[]>([]);
    const [showDonationList, setShowDonationList] = useState(false);
    const [loadingDonationHistory, setLoadingDonationHistory] = useState(false);
    // Visual Enhancement States
    const [combo, setCombo] = useState(0);
    const [comboTimer, setComboTimer] = useState<NodeJS.Timeout | null>(null);
    const [scorePopups, setScorePopups] = useState<{ id: number; x: number; y: number; value: number; type: 'coin' | 'power' | 'combo' | 'gas' }[]>([]);
    const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; vx: number; vy: number }[]>([]);
    const [achievements, setAchievements] = useState<{ id: number; text: string; icon: string }[]>([]);
    const [sessionStats, setSessionStats] = useState({ startTime: 0, endTime: 0, coinsCollected: 0, maxLength: 3, powerUpsUsed: 0 });
    const [playTime, setPlayTime] = useState(0); // Play time in seconds
    const playTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [milestone, setMilestone] = useState<MilestoneData | null>(null);
    const lastMilestoneRef = useRef<number>(0); // Track last shown milestone to avoid duplicates
    const achievementThresholds = useRef([100, 250, 500, 1000, 2500, 5000]);
    const popupIdRef = useRef(0);
    const particleIdRef = useRef(0);
    const achievementIdRef = useRef(0);
    const t: SnakeStrings = langs[lang];

    // ========== PROFILE ENHANCEMENT FUNCTIONS ==========

    // Level System: Calculate player level based on total claimed
    const getPlayerLevel = (totalClaimed: bigint): { level: number; name: string; minPoints: number; maxPoints: number; progress: number } => {
        const points = Number(totalClaimed) / 1e18;
        const levels = [
            { level: 1, name: '🌱 Newbie', min: 0, max: 999 },
            { level: 2, name: '🎮 Gamer', min: 1000, max: 4999 },
            { level: 3, name: '⚡ Pro', min: 5000, max: 19999 },
            { level: 4, name: '💎 Expert', min: 20000, max: 49999 },
            { level: 5, name: '🔥 Master', min: 50000, max: 99999 },
            { level: 6, name: '👑 Legend', min: 100000, max: Infinity },
        ];
        for (let i = levels.length - 1; i >= 0; i--) {
            if (points >= levels[i].min) {
                const range = levels[i].max === Infinity ? 100000 : levels[i].max - levels[i].min;
                const progress = Math.min(100, ((points - levels[i].min) / range) * 100);
                return { level: levels[i].level, name: levels[i].name, minPoints: levels[i].min, maxPoints: levels[i].max, progress };
            }
        }
        return { level: 1, name: '🌱 Newbie', minPoints: 0, maxPoints: 999, progress: 0 };
    };

    // Badge Tier Translation Helper: Translate badge tier names based on current language
    const getBadgeTierName = (tier: string): string => {
        const tierMap: { [key: string]: string } = {
            'Diamond': t.badgeDiamond || 'Diamond',
            'Gold': t.badgeGold || 'Gold',
            'Silver': t.badgeSilver || 'Silver',
            'Bronze': t.badgeBronze || 'Bronze',
            'Supporter': t.badgeSupporter || 'Supporter',
        };
        return tierMap[tier] || tier;
    };

    // ========== END PROFILE ENHANCEMENT FUNCTIONS ==========
    const moves = useRef<{ d: string; t: number }[]>([]);
    const snake = useRef([{ x: 11, y: 8 }]);
    const dir = useRef({ x: 1, y: 0 });
    const nextDir = useRef({ x: 1, y: 0 });
    const item = useRef<{ x: number; y: number; type: string } | null>(null);
    const speed = useRef(INIT_SPEED);
    const scoreRef = useRef(0); // Keep latest score for end() callback
    const canvas = useRef<HTMLCanvasElement>(null);
    const loop = useRef<NodeJS.Timeout | null>(null);
    const superT = useRef<NodeJS.Timeout | null>(null);
    const obsT = useRef<NodeJS.Timeout | null>(null);

    // Detect mobile + set mounted for hydration fix
    // Check both screen width AND touch capability for better detection

    // ========== PWA MANIFEST INJECTION FOR SNAKE GAME ==========
    useEffect(() => {
        // Update document title
        document.title = '$banmao+snake';

        // Remove existing manifest link and add snake-specific one
        const existingManifest = document.querySelector('link[rel="manifest"]');
        if (existingManifest) {
            existingManifest.setAttribute('href', '/manifest-snake.json');
        } else {
            const manifestLink = document.createElement('link');
            manifestLink.rel = 'manifest';
            manifestLink.href = '/manifest-snake.json';
            document.head.appendChild(manifestLink);
        }

        // Update favicon
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (favicon) {
            favicon.href = '/games/snake/snake-icon-192x192.png';
        }

        // Update all icon links to use snake icons
        document.querySelectorAll('link[rel="icon"]').forEach((link) => {
            const href = link.getAttribute('href');
            if (href?.includes('icon-192x192')) {
                link.setAttribute('href', '/games/snake/snake-icon-192x192.png');
            } else if (href?.includes('icon-512x512')) {
                link.setAttribute('href', '/games/snake/snake-icon-512x512.png');
            }
        });

        // Update apple-touch-icon for iOS PWA
        const existingAppleIcon = document.querySelector('link[rel="apple-touch-icon"]');
        if (existingAppleIcon) {
            existingAppleIcon.setAttribute('href', '/games/snake/snake-icon-192x192.png');
        }

        // Update theme-color meta tag
        let themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
            themeColor.setAttribute('content', '#22d3ee');
        }

        // Cleanup on unmount
        return () => {
            document.title = '$banmao — Banana Cat';
            const manifest = document.querySelector('link[rel="manifest"]');
            if (manifest) manifest.setAttribute('href', '/manifest.json');
        };
    }, []);

    useEffect(() => {
        setHasMounted(true);

        // Force enable scroll - override landing.css
        document.documentElement.style.overflow = 'auto';
        document.documentElement.style.overflowX = 'hidden';
        document.documentElement.style.overflowY = 'auto';
        document.documentElement.style.position = 'relative';
        document.documentElement.style.height = 'auto';
        document.body.style.overflow = 'auto';
        document.body.style.overflowX = 'hidden';
        document.body.style.overflowY = 'auto';
        document.body.style.position = 'relative';
        document.body.style.height = 'auto';
        document.body.style.minHeight = '100vh';
        document.body.style.maxHeight = 'none';

        // Initialize PWA
        registerServiceWorker();
        initInstallPrompt();

        // Record game visit for ranking
        recordGameVisit('banmaosnake');

        const checkMobile = () => {
            const isSmallScreen = window.innerWidth < 769;
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
            // Consider mobile if: small screen OR (touch device AND not wide desktop)
            return isSmallScreen || (isTouchDevice && hasCoarsePointer && window.innerWidth < 1200);
        };
        setIsMobile(checkMobile());
        const fn = () => setIsMobile(checkMobile());
        window.addEventListener('resize', fn);

        // Cleanup
        return () => {
            window.removeEventListener('resize', fn);
            // Restore original styles when leaving page
            document.documentElement.style.overflow = '';
            document.documentElement.style.overflowX = '';
            document.documentElement.style.overflowY = '';
            document.documentElement.style.position = '';
            document.documentElement.style.height = '';
            document.body.style.overflow = '';
            document.body.style.overflowX = '';
            document.body.style.overflowY = '';
            document.body.style.position = '';
            document.body.style.height = '';
            document.body.style.minHeight = '';
            document.body.style.maxHeight = '';
        };
    }, []);
    useEffect(() => { const s = localStorage.getItem('snake_best'); if (s) setBest(+s); }, []);
    useEffect(() => { if (best > 0) localStorage.setItem('snake_best', String(best)); }, [best]);
    useEffect(() => { scoreRef.current = score; }, [score]); // Keep scoreRef in sync
    useEffect(() => { superModeRef.current = superMode; }, [superMode]); // Keep superModeRef in sync

    // Load UI scale from localStorage
    useEffect(() => {
        const savedScale = localStorage.getItem('snake_ui_scale') as 'xs' | 'sm' | 'md' | 'lg' | null;
        if (savedScale && ['xs', 'sm', 'md', 'lg'].includes(savedScale)) {
            setUiScale(savedScale);
        }
    }, []);

    // Apply UI scale to root element
    useEffect(() => {
        const scaleMap: Record<string, string> = { xs: '12px', sm: '14px', md: '16px', lg: '18px' };
        document.documentElement.style.fontSize = scaleMap[uiScale];
        localStorage.setItem('snake_ui_scale', uiScale);
    }, [uiScale]);

    // Fetch donor leaderboard - extracted for reuse
    const fetchDonors = useCallback(async () => {
        if (TEST_MODE) return; // Skip API fetch in test mode
        try {
            const res = await fetch('/api/donors');
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.leaderboard) {
                    setDonorLeaderboard(data.leaderboard);
                }
            }
        } catch (err) {
            console.error('Failed to fetch donors:', err);
        }
    }, []);

    // Auto-fetch donor leaderboard on mount + every 2 minutes
    useEffect(() => {
        fetchDonors();
        const interval = setInterval(fetchDonors, 300000); // Reduced from 120s to 300s
        return () => clearInterval(interval);
    }, [fetchDonors]);

    // Check if connected wallet is a donor
    useEffect(() => {
        if (address && donorLeaderboard.length > 0) {
            const myDonor = donorLeaderboard.find(d => d.address.toLowerCase() === address.toLowerCase());
            setMyDonorProfile(myDonor || null);
        } else {
            setMyDonorProfile(null);
        }
    }, [address, donorLeaderboard]);

    // Load profile edit count AND sync profile name/avatar from database (onchainLeaderboard)
    // This ensures profile is restored from database when localStorage is cleared
    useEffect(() => {
        if (!address) return;

        // Find player data in onchain leaderboard (database source)
        const myData = onchainLeaderboard.find(p => p.address.toLowerCase() === address.toLowerCase());

        // Debug: Log sync attempt
        console.log('[Profile Sync] Checking...', {
            address: address?.slice(0, 10),
            hasMyData: !!myData,
            myDataName: myData?.name,
            hasMyProfile: !!myProfile,
            myProfileName: myProfile?.name,
            leaderboardCount: onchainLeaderboard.length
        });

        // Sync edit count from database
        if (myData && myData.editCount !== undefined) {
            setProfileEditCount(myData.editCount);
            localStorage.setItem(`snake_edit_count_${address.toLowerCase()}`, String(myData.editCount));
        } else {
            const key = `snake_edit_count_${address.toLowerCase()}`;
            const count = parseInt(localStorage.getItem(key) || '0', 10);
            setProfileEditCount(count);
        }

        // Sync profile name/avatar from database if local profile has default name
        // This handles case when user clears localStorage but profile exists in database
        if (myData && myProfile) {
            const isDefaultName = myProfile.name.startsWith('Player 0x');
            const dbHasCustomName = myData.name && !myData.name.startsWith('Player 0x');

            console.log('[Profile Sync] Conditions:', { isDefaultName, dbHasCustomName, dbName: myData.name });

            if (isDefaultName && dbHasCustomName) {
                // Update local profile with database values
                const updatedProfile: PlayerProfile = {
                    ...myProfile,
                    name: myData.name,
                    avatar: (myData.avatar || 0) as AvatarIndex,
                    telegram: myData.telegram || myProfile.telegram,
                    twitter: myData.twitter || myProfile.twitter,
                };
                setMyProfile(updatedProfile);
                setEditName(myData.name); // Also update edit form
                setEditAvatar(myData.avatar || 0);
                if (myData.telegram) setEditTelegram(myData.telegram);
                if (myData.twitter) setEditTwitter(myData.twitter);
                saveProfile(updatedProfile); // Persist to localStorage
                console.log('[Profile Sync] ✅ Restored profile from database:', myData.name);
            }
        }
    }, [address, onchainLeaderboard, myProfile]);

    // Keyboard shortcuts: ESC to close modals, Space to pause/resume
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (viewOnchainPlayer) setViewOnchainPlayer(null);
                else if (showProfileModal) setShowProfileModal(false);
            }
            // Space to toggle pause during gameplay
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault(); // Prevent page scroll
                if (state === 'PLAY') {
                    setState('PAUSE');
                } else if (state === 'PAUSE') {
                    setState('PLAY');
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewOnchainPlayer, showProfileModal, state]);

    // ========== TEST MODE: Generate mock data for testing scroll ==========
    // Uses TEST_MODE constant at top of file
    useEffect(() => {
        if (!TEST_MODE) return;

        // Generate 100 mock donors
        const mockDonors = Array.from({ length: 100 }, (_, i) => {
            const tiers = [
                { tier: 'Diamond', icon: '💎', color: '#60a5fa', min: 10000000 },
                { tier: 'Gold', icon: '🥇', color: '#fbbf24', min: 1000000 },
                { tier: 'Silver', icon: '🥈', color: '#94a3b8', min: 100000 },
                { tier: 'Bronze', icon: '🥉', color: '#cd7f32', min: 10000 },
            ];
            const donated = Math.floor(Math.random() * 1000000) + 10;
            const tier = tiers.find(t => donated >= t.min) || tiers[3];
            return {
                address: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
                name: `Donor ${i + 1}`,
                avatar: i % 8,
                totalDonated: String(donated * 1e18),
                donationCount: Math.floor(Math.random() * 10) + 1,
                badge: tier
            };
        }).sort((a, b) => Number(b.totalDonated) - Number(a.totalDonated));
        setDonorLeaderboard(mockDonors);

        // Generate 100 mock players
        const mockPlayers: OnchainPlayer[] = Array.from({ length: 100 }, (_, i) => {
            const totalClaimed = BigInt(Math.floor(Math.random() * 100000) * 1e18);
            const highestClaim = BigInt(Math.floor(Math.random() * 10000) * 1e18);
            return {
                address: `0x${Math.random().toString(16).slice(2, 42)}`,
                name: `Player ${i + 1}`,
                avatar: i % 8,
                totalClaimed,
                highestClaim,
                claimCount: Math.floor(Math.random() * 50) + 1,
                lastClaimTime: Date.now() - Math.floor(Math.random() * 86400000),
                editCount: 0
            };
        }).sort((a, b) => Number(b.totalClaimed) - Number(a.totalClaimed));
        setOnchainLeaderboard(mockPlayers);

        console.log('🧪 TEST MODE: Loaded 100 mock donors and 100 mock players');
    }, []);
    // ========== END TEST MODE ==========

    // Load profile on wallet connect
    useEffect(() => {
        if (address) {
            let profile = getProfile(address);
            if (!profile) {
                // New player - create and SAVE profile immediately
                profile = createDefaultProfile(address);
                saveProfile(profile);
            }
            setMyProfile(profile);
            setEditName(profile.name);
            setEditAvatar(profile.avatar);
            setEditTelegram(profile.telegram || '');
            setEditTwitter(profile.twitter || '');
            // Refresh leaderboard after profile load
            setLeaderboard(getLeaderboard(100));
        } else {
            setMyProfile(null);
        }
    }, [address]);

    // Load leaderboard on mount and refresh periodically
    useEffect(() => {
        // Local leaderboard (for profile data)
        const refreshLocalLeaderboard = () => setLeaderboard(getLeaderboard(100));
        refreshLocalLeaderboard();
        const localInterval = setInterval(refreshLocalLeaderboard, 30000); // Reduced from 5s to 30s

        // On-chain leaderboard (global, from blockchain events)
        const refreshOnchainLeaderboard = async () => {
            if (TEST_MODE) return; // Skip API fetch in test mode
            try {
                const data = await fetchOnchainLeaderboard();
                setOnchainLeaderboard(data);
            } catch (error) {
                console.error('Error fetching on-chain leaderboard:', error);
            }
        };
        refreshOnchainLeaderboard();
        const onchainInterval = setInterval(refreshOnchainLeaderboard, 60000); // Reduced from 30s to 60s

        return () => {
            clearInterval(localInterval);
            clearInterval(onchainInterval);
        };
    }, []);

    // Sync profileEditCount from server data when onchainLeaderboard loads
    useEffect(() => {
        if (address && onchainLeaderboard.length > 0) {
            const myPlayer = onchainLeaderboard.find(
                p => p.address.toLowerCase() === address.toLowerCase()
            );
            if (myPlayer && myPlayer.editCount !== undefined) {
                setProfileEditCount(myPlayer.editCount);
            }
        }
    }, [address, onchainLeaderboard]);

    // Fetch backend config for stats display
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const r = await fetch('/api/snake-config');
                if (r.ok) setBackendConfig(await r.json());
            } catch { /* ignore */ }
        };
        fetchConfig();
        const interval = setInterval(fetchConfig, 120000); // Reduced from 60s to 120s
        return () => clearInterval(interval);
    }, []);

    const { data: balance, refetch: refetchBalance } = useReadContract({ address: BANMAO_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: address ? [address] : undefined, query: { enabled: !!address, refetchInterval: 15000 } }); // Reduced from 5s to 15s
    const { data: nonce, refetch: refetchNonce } = useReadContract({ address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI, functionName: 'nonces', args: address ? [address] : undefined, query: { enabled: !!address && SNAKE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' } });
    const { data: userWithdrawal, refetch: refetchUserWithdrawal } = useReadContract({ address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI, functionName: 'userWithdrawals', args: address ? [address] : undefined, query: { enabled: !!address && SNAKE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000', refetchInterval: 30000 } }); // Reduced from 10s to 30s
    const { data: hourlyAmount, refetch: refetchHourly } = useReadContract({ address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI, functionName: 'hourlySignedAmount', query: { enabled: SNAKE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000', refetchInterval: 30000 } }); // Reduced from 10s to 30s
    const { data: hourlyCap } = useReadContract({ address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI, functionName: 'hourlySignerCap', query: { enabled: SNAKE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' } });
    const { data: dailyCap, refetch: refetchDailyCap } = useReadContract({ address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI, functionName: 'dailyPlayerCap', query: { enabled: SNAKE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' } });
    const { data: minClaimData } = useReadContract({ address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI, functionName: 'minClaimAmount', query: { enabled: SNAKE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' } });
    const { data: maxClaimPerGameData } = useReadContract({ address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI, functionName: 'maxClaimPerGame', query: { enabled: SNAKE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000', refetchInterval: 30000 } });
    const { data: minDonationData } = useReadContract({ address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI, functionName: 'minDonationForListing', query: { enabled: SNAKE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000', refetchInterval: 30000 } });
    const { data: poolBalance } = useReadContract({ address: BANMAO_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: 'balanceOf', args: [SNAKE_CONTRACT_ADDRESS], query: { enabled: SNAKE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000', refetchInterval: 30000 } }); // Reduced from 15s to 30s
    const { writeContract, isPending } = useWriteContract();
    const { isLoading: txLoading, isSuccess: txOk } = useWaitForTransactionReceipt({ hash: txHash });

    const spawn = useCallback(() => {
        let x = 0, y = 0, ok = false, i = 0;
        while (!ok && i++ < 100) { x = ~~(Math.random() * COLS); y = ~~(Math.random() * ROWS); ok = !snake.current.some(s => s.x === x && s.y === y) && !obs.some(o => o.x === x && o.y === y); }
        item.current = { x, y, type: Math.random() < 0.12 ? 'X' : 'T' };
    }, [obs]);

    const spawnObs = useCallback(() => { const x = ~~(Math.random() * COLS), y = ~~(Math.random() * ROWS); if (snake.current[0].x !== x || snake.current[0].y !== y) setObs(p => [...p.slice(-2), { x, y }]); }, []);
    const startLoop = useCallback(() => { if (loop.current) clearInterval(loop.current); loop.current = setInterval(update, speed.current); }, []);

    const superOn = useCallback(() => {
        setSuperMode(true); const old = speed.current; speed.current = 45; startLoop();
        if (superT.current) clearTimeout(superT.current);
        superT.current = setTimeout(() => { setSuperMode(false); speed.current = old; startLoop(); }, 5000);
    }, [startLoop]);

    const end = useCallback(() => {
        const finalScore = scoreRef.current; // Use ref to get latest score
        console.log('[DEBUG end()] finalScore:', finalScore, 'address:', address); // Debug
        setState('OVER');
        if (loop.current) clearInterval(loop.current);
        if (obsT.current) clearInterval(obsT.current);
        // Capture end time so timer stops counting
        setSessionStats(prev => ({ ...prev, endTime: Date.now() }));
        if (finalScore > best) setBest(finalScore);
        // Upgrade 6: Save replay if best score
        saveReplayIfBest(moves.current, finalScore);
        // Update leaderboard with high score
        if (address && finalScore > 0) {
            const updated = updateHighScore(address, finalScore);
            console.log('[DEBUG end()] updateHighScore result:', updated); // Debug
            setLeaderboard(getLeaderboard(100));
        }
    }, [best, address]);

    // Save profile handler
    const handleSaveProfile = useCallback(async () => {
        if (!address || !myProfile) return;

        // Check edit limit
        if (profileEditCount >= MAX_PROFILE_EDITS) {
            setToast({ msg: `${t.editLimitReached || 'Edit limit reached'} (${MAX_PROFILE_EDITS}x)`, type: 'error' });
            setTimeout(() => setToast(null), 3000);
            return;
        }

        const updated: PlayerProfile = {
            ...myProfile,
            name: editName.trim() || `Player ${address.slice(0, 6)}`,
            avatar: editAvatar,
            telegram: editTelegram.trim() || undefined,
            twitter: editTwitter.trim() || undefined,
        };
        saveProfile(updated);
        setMyProfile(updated);
        setShowProfileModal(false);
        setLeaderboard(getLeaderboard(100));

        // Update on shared leaderboard (database) - returns new editCount from server
        const result = await updateProfileOnLeaderboard(
            address,
            updated.name,
            updated.avatar,
            updated.telegram,
            updated.twitter
        );

        if (result.success && result.editCount !== undefined) {
            // Sync edit count from database
            setProfileEditCount(result.editCount);
            localStorage.setItem(`snake_edit_count_${address.toLowerCase()}`, String(result.editCount));

            // Refresh the on-chain leaderboard to show updated profile
            fetchOnchainLeaderboard().then(setOnchainLeaderboard);

            const remaining = MAX_PROFILE_EDITS - result.editCount;
            setToast({ msg: `${t.profileSaved || 'Profile saved!'} (${remaining} ${t.editsRemaining || 'edits remaining'})`, type: 'success' });
        } else if (result.error === 'Edit limit reached') {
            // Server rejected - limit reached
            if (result.editCount !== undefined) {
                setProfileEditCount(result.editCount);
                localStorage.setItem(`snake_edit_count_${address.toLowerCase()}`, String(result.editCount));
            }
            setToast({ msg: `${t.editLimitReached || 'Edit limit reached'} (${MAX_PROFILE_EDITS}x)`, type: 'error' });
        } else if (result.error?.includes('Player not found')) {
            // Player not in database - need to claim first
            setToast({ msg: t.needClaimFirst || 'Play and claim first to create profile', type: 'error' });
        } else if (result.error === 'Rate limit exceeded') {
            // Too many requests
            setToast({ msg: t.tooManyRequests || 'Too many requests. Please wait a moment.', type: 'error' });
        } else {
            // Other errors - show generic message
            setToast({ msg: result.error || 'Failed to save profile', type: 'error' });
        }
        setTimeout(() => setToast(null), 3000);
    }, [address, myProfile, editName, editAvatar, editTelegram, editTwitter, profileEditCount, t]);

    // Visual Effects Helper Functions
    const spawnScorePopup = useCallback((x: number, y: number, value: number, type: 'coin' | 'power' | 'combo' | 'gas') => {
        const id = ++popupIdRef.current;
        setScorePopups(prev => [...prev, { id, x: x * GRID + GRID / 2, y: y * GRID, value, type }]);
        setTimeout(() => setScorePopups(prev => prev.filter(p => p.id !== id)), 800);
    }, []);

    const spawnParticles = useCallback((x: number, y: number, color: string, count: number = 8) => {
        const newParticles = Array.from({ length: count }, () => {
            const id = ++particleIdRef.current;
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            return {
                id,
                x: x * GRID + GRID / 2,
                y: y * GRID + GRID / 2,
                color,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed
            };
        });
        setParticles(prev => [...prev, ...newParticles]);
        setTimeout(() => {
            setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
        }, 600);
    }, []);

    const checkAchievements = useCallback((newScore: number) => {
        // Check for score milestones (100, 250, 500, 1000, 2500, 5000)
        const threshold = achievementThresholds.current.find(t => t === newScore);
        if (threshold && threshold > lastMilestoneRef.current) {
            lastMilestoneRef.current = threshold;
            sounds.success();
            setMilestone({
                id: Date.now(),
                type: 'score',
                value: threshold,
            });
        }

        // Check for new high score
        if (newScore > best && newScore >= 50) {
            // Only show high score notification every 50 points to avoid spam
            const highScoreMilestone = Math.floor(newScore / 50) * 50;
            if (highScoreMilestone > lastMilestoneRef.current && newScore === highScoreMilestone) {
                lastMilestoneRef.current = highScoreMilestone;
                sounds.success();
                setMilestone({
                    id: Date.now(),
                    type: 'highscore',
                    value: newScore,
                });
            }
        }
    }, [best]);

    const updateCombo = useCallback(() => {
        setCombo(prev => {
            const newCombo = prev + 1;
            if (newCombo > 1) {
                sounds.eatPowerUp(); // Play combo sound
            }
            return newCombo;
        });
        // Reset combo timer
        if (comboTimer) clearTimeout(comboTimer);
        const timer = setTimeout(() => setCombo(0), 2000); // Combo breaks after 2s
        setComboTimer(timer);
    }, [comboTimer]);

    const update = useCallback(() => {
        if (dir.current.x !== nextDir.current.x || dir.current.y !== nextDir.current.y) moves.current.push({ d: nextDir.current.x === -1 ? 'L' : nextDir.current.y === -1 ? 'U' : nextDir.current.y === 1 ? 'D' : 'R', t: Date.now() });
        dir.current = nextDir.current;
        const h = snake.current[0];
        let nH = { x: h.x + dir.current.x, y: h.y + dir.current.y };
        let hit = false;
        if (nH.x < 0 || nH.x >= COLS || nH.y < 0 || nH.y >= ROWS) { if (superModeRef.current) { nH.x = (nH.x + COLS) % COLS; nH.y = (nH.y + ROWS) % ROWS; } else hit = true; }
        if (!hit && snake.current.some(s => s.x === nH.x && s.y === nH.y)) hit = true;
        if (!hit && !superModeRef.current && obs.some(o => o.x === nH.x && o.y === nH.y)) hit = true;
        if (hit) { sounds.gameOver(); end(); return; }
        const ns = [nH, ...snake.current];
        const it = item.current;
        if (it && nH.x === it.x && nH.y === it.y) {
            const isPowerUp = it.type === 'X';
            const pointsGained = isPowerUp ? 50 : 10;
            isPowerUp ? sounds.eatPowerUp() : sounds.eatCoin();

            // Visual effects
            spawnScorePopup(it.x, it.y, pointsGained, isPowerUp ? 'power' : 'coin');
            spawnParticles(it.x, it.y, isPowerUp ? '#22d3ee' : '#fbbf24', isPowerUp ? 12 : 8);
            updateCombo();

            // Update session stats
            setSessionStats(prev => ({
                ...prev,
                coinsCollected: prev.coinsCollected + 1,
                maxLength: Math.max(prev.maxLength, ns.length),
                powerUpsUsed: prev.powerUpsUsed + (isPowerUp ? 1 : 0)
            }));

            // Score and bonus combo points
            setScore(s => {
                const comboBonus = combo > 1 ? Math.floor(pointsGained * 0.1 * (combo - 1)) : 0;
                const newScore = s + pointsGained + comboBonus;
                if (comboBonus > 0) {
                    setTimeout(() => spawnScorePopup(it.x, it.y - 1, comboBonus, 'combo'), 200);
                }
                checkAchievements(newScore);
                const newDiff = getDifficultyForScore(newScore);
                if (newDiff.name !== difficultyLevel.name) {
                    setDifficultyLevel(newDiff);
                    // Update obstacle spawn interval
                    if (obsT.current) clearInterval(obsT.current);
                    obsT.current = setInterval(spawnObs, newDiff.obsInterval);
                }
                return newScore;
            });

            // Gas/Energy gain
            const gasGain = isPowerUp ? 40 : 15;
            setGas(g => Math.min(GAS_MAX, g + gasGain));
            // Spawn gas popup to show energy gained (positioned below score popup)
            setTimeout(() => spawnScorePopup(it.x, it.y + 1, gasGain, 'gas'), 300);
            if (isPowerUp) superOn();
            spawn();
            if (speed.current > 35) { speed.current -= 1; startLoop(); }
        }
        else { ns.pop(); if (!superMode) setGas(p => { const n = p - GAS_DECAY; if (n <= 0) { sounds.gameOver(); end(); return 0; } return n; }); }
        snake.current = ns; draw();
    }, [superMode, obs, end, superOn, spawn, startLoop, combo, spawnScorePopup, spawnParticles, updateCombo, checkAchievements]);

    const init = useCallback(() => {
        sounds.start();
        setState('PLAY'); setScore(0); setGas(GAS_MAX); setSuperMode(false); setObs([]); setErr(null); setRejected(false);
        // Reset visual effects
        setCombo(0); setScorePopups([]); setParticles([]); setAchievements([]); setMilestone(null);
        lastMilestoneRef.current = 0; // Reset milestone tracking for new game
        setSessionStats({ startTime: Date.now(), endTime: 0, coinsCollected: 0, maxLength: 3, powerUpsUsed: 0 });
        if (comboTimer) clearTimeout(comboTimer);

        // Create server-side game session for anti-cheat
        gameSessionId.current = null;
        sessionStartTime.current = null;
        sessionStartTimeHash.current = null;
        sessionChecksumSeed.current = null;
        if (address) {
            fetch('/api/snake-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player: address })
            }).then(r => r.json()).then(d => {
                if (d.sessionId) gameSessionId.current = d.sessionId;
                if (d.startTime) sessionStartTime.current = d.startTime;
                if (d.startTimeHash) sessionStartTimeHash.current = d.startTimeHash;
                if (d.checksumSeed) sessionChecksumSeed.current = d.checksumSeed;
            }).catch(() => { /* session creation failed - claim will fail later */ });
        }

        speed.current = INIT_SPEED; moves.current = [];
        // Center snake in grid (COLS/2, ROWS/2)
        const cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2);
        snake.current = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
        dir.current = { x: 1, y: 0 }; nextDir.current = { x: 1, y: 0 };
        spawn();
        startLoop();
        if (obsT.current) clearInterval(obsT.current);
        obsT.current = setInterval(spawnObs, 15000);
    }, [spawn, startLoop, spawnObs, comboTimer]);

    const pause = useCallback(() => { if (state === 'PLAY') { setState('PAUSE'); if (loop.current) clearInterval(loop.current); if (obsT.current) clearInterval(obsT.current); } }, [state]);
    const resume = useCallback(() => { if (state === 'PAUSE') { setState('PLAY'); startLoop(); obsT.current = setInterval(spawnObs, 15000); } }, [state, startLoop, spawnObs]);

    // Play Timer Effect - Increment every second during PLAY state
    useEffect(() => {
        if (state === 'PLAY') {
            // Reset timer on game start
            setPlayTime(0);
            playTimerRef.current = setInterval(() => {
                setPlayTime(prev => prev + 1);
            }, 1000);
        } else {
            // Stop timer on PAUSE or END
            if (playTimerRef.current) {
                clearInterval(playTimerRef.current);
                playTimerRef.current = null;
            }
        }
        return () => {
            if (playTimerRef.current) {
                clearInterval(playTimerRef.current);
                playTimerRef.current = null;
            }
        };
    }, [state]);

    const draw = useCallback(() => {
        const c = canvas.current?.getContext('2d'); if (!c) return;
        const bg = c.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#0a0e1a'); bg.addColorStop(1, '#12182a');
        c.fillStyle = bg; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,255,255,0.03)';
        for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) { c.beginPath(); c.arc(i * GRID + GRID / 2, j * GRID + GRID / 2, 1, 0, Math.PI * 2); c.fill(); }
        if (superMode) { c.strokeStyle = '#0ff'; c.lineWidth = 3; c.shadowBlur = 15; c.shadowColor = '#0ff'; c.strokeRect(1, 1, W - 2, H - 2); c.shadowBlur = 0; }
        obs.forEach(o => { c.shadowBlur = 8; c.shadowColor = '#f43f5e'; c.fillStyle = '#f43f5e'; c.beginPath(); c.roundRect(o.x * GRID + 2, o.y * GRID + 2, GRID - 4, GRID - 4, 3); c.fill(); c.shadowBlur = 0; });
        const it = item.current;
        if (it) {
            const ix = it.x * GRID + GRID / 2, iy = it.y * GRID + GRID / 2;
            if (it.type === 'X') {
                // Power-up: yellow lightning bolt emoji ⚡
                c.shadowBlur = 20; c.shadowColor = '#fbbf24';
                c.fillStyle = '#fbbf24'; // Set fill color for emoji
                c.font = `bold ${GRID}px Arial, sans-serif`;
                c.textAlign = 'center';
                c.textBaseline = 'middle';
                c.fillText('⚡', ix, iy);
                c.shadowBlur = 0;
            } else {
                // Token: golden circle
                c.shadowBlur = 15; c.shadowColor = '#fbbf24';
                const grd = c.createRadialGradient(ix - 2, iy - 2, 1, ix, iy, GRID / 2.5);
                grd.addColorStop(0, '#fef08a'); grd.addColorStop(1, '#f59e0b');
                c.fillStyle = grd;
                c.beginPath(); c.arc(ix, iy, GRID / 2.5, 0, Math.PI * 2); c.fill();
                c.shadowBlur = 0;
            }
        }
        snake.current.forEach((s, i) => {
            const a = 1 - i / snake.current.length * 0.4;
            if (i === 0) {
                const grd = c.createRadialGradient(s.x * GRID + GRID / 2 - 2, s.y * GRID + GRID / 2 - 2, 1, s.x * GRID + GRID / 2, s.y * GRID + GRID / 2, GRID / 2);
                grd.addColorStop(0, superMode ? '#a5f3fc' : '#fef08a'); grd.addColorStop(1, superMode ? '#22d3ee' : '#eab308');
                c.fillStyle = grd; c.shadowBlur = 12; c.shadowColor = superMode ? '#0ff' : '#fbbf24';
                c.beginPath(); c.arc(s.x * GRID + GRID / 2, s.y * GRID + GRID / 2, GRID / 2 - 1, 0, Math.PI * 2); c.fill();
                c.shadowBlur = 0;
                c.fillStyle = '#1e293b';
                const ex = s.x * GRID + GRID / 2 + dir.current.x * 3, ey = s.y * GRID + GRID / 2 + dir.current.y * 3;
                c.beginPath(); c.arc(ex - 3, ey, 2, 0, Math.PI * 2); c.arc(ex + 3, ey, 2, 0, Math.PI * 2); c.fill();
            } else {
                const grd = c.createRadialGradient(s.x * GRID + GRID / 2 - 1, s.y * GRID + GRID / 2 - 1, 0, s.x * GRID + GRID / 2, s.y * GRID + GRID / 2, GRID / 2);
                grd.addColorStop(0, superMode ? `rgba(165,243,252,${a})` : `rgba(254,240,138,${a})`);
                grd.addColorStop(1, superMode ? `rgba(34,211,238,${a})` : `rgba(234,179,8,${a})`);
                c.fillStyle = grd;
                c.beginPath(); c.roundRect(s.x * GRID + 1, s.y * GRID + 1, GRID - 2, GRID - 2, 4); c.fill();
            }
        });
    }, [superMode, obs]);

    const go = useCallback((d: 'U' | 'D' | 'L' | 'R') => {
        if (state !== 'PLAY') return;
        if (d === 'U' && dir.current.y === 0) nextDir.current = { x: 0, y: -1 };
        else if (d === 'D' && dir.current.y === 0) nextDir.current = { x: 0, y: 1 };
        else if (d === 'L' && dir.current.x === 0) nextDir.current = { x: -1, y: 0 };
        else if (d === 'R' && dir.current.x === 0) nextDir.current = { x: 1, y: 0 };
    }, [state]);

    // Keyboard with Space to start
    useEffect(() => {
        const fn = (e: KeyboardEvent) => {
            // Space to start/resume
            if (e.code === 'Space') {
                e.preventDefault();
                if (state === 'MENU' || state === 'OVER') init();
                else if (state === 'PAUSE') resume();
            }
            if (e.key === 'Escape') { state === 'PLAY' ? pause() : state === 'PAUSE' && resume(); return; }
            if (state !== 'PLAY') return;
            if (['ArrowUp', 'w', 'W'].includes(e.key)) go('U');
            else if (['ArrowDown', 's', 'S'].includes(e.key)) go('D');
            else if (['ArrowLeft', 'a', 'A'].includes(e.key)) go('L');
            else if (['ArrowRight', 'd', 'D'].includes(e.key)) go('R');
        };
        window.addEventListener('keydown', fn); return () => window.removeEventListener('keydown', fn);
    }, [state, go, pause, resume, init]);

    const claim = async () => {
        if (!address || score < minClaim) return;
        lastClaimedScore.current = score; // Save for flying animation
        setState('CLAIM'); setErr(null); setRejected(false);
        try {
            // Refetch nonce from chain to avoid stale cache mismatch
            const freshNonce = await refetchNonce();
            const n = freshNonce.data?.toString() ?? nonce?.toString() ?? '0';
            // Score integrity checksum (SHA-256 via Web Crypto)
            let scoreChecksum: string | undefined;
            if (sessionChecksumSeed.current && gameSessionId.current) {
                const payload = sessionChecksumSeed.current + ':' + gameSessionId.current + ':' + score + ':' + moves.current.length;
                const encoded = new TextEncoder().encode(payload);
                const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
                const hashArr = Array.from(new Uint8Array(hashBuf));
                scoreChecksum = hashArr.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
            }
            const r = await fetch(SNAKE_SIGN_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player: address,
                    score,
                    moveHistory: moves.current,
                    nonce: n,
                    gameStartTime: sessionStartTime.current || sessionStats.startTime,
                    gameEndTime: sessionStats.endTime || Date.now(),
                    sessionId: gameSessionId.current,
                    startTimeHash: sessionStartTimeHash.current,
                    scoreChecksum
                })
            });
            if (!r.ok) {
                const errData = await r.json();
                if (r.status === 429) handleRateLimitError(errData.error || '');
                throw new Error(errData.error || 'Lỗi khi lấy chữ ký');
            }
            const { signature, amount, deadline } = await r.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (writeContract as any)(
                { address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI, functionName: 'claimReward', args: [BigInt(amount), BigInt(n), BigInt(deadline), signature as `0x${string}`] } as any,
                {
                    onSuccess: h => setTxHash(h),
                    onError: e => {
                        const msg = e.message || '';
                        if (msg.includes('denied') || msg.includes('rejected') || msg.includes('User denied')) {
                            setErr('Bạn đã hủy giao dịch');
                            setRejected(true); // Hide claim button
                        } else if (msg.includes('insufficient') || msg.includes('gas')) {
                            setErr('⛽ Không đủ OKB để trả phí gas');
                        } else if (msg.includes('minClaimAmount') || msg.includes('Min claim')) {
                            setErr(`📊 Chưa đủ điểm tối thiểu (${minClaim})`);
                        } else if (msg.includes('dailyPlayerCap') || msg.includes('Daily limit')) {
                            setErr('📅 Đã đạt giới hạn rút trong ngày');
                        } else if (msg.includes('hourlySignerCap')) {
                            setErr('⏰ Hệ thống đang quá tải');
                        } else if (msg.includes('Invalid signature')) {
                            setErr('🔐 Chữ ký không hợp lệ');
                        } else {
                            setErr('❌ Giao dịch thất bại');
                        }
                        setState('OVER');
                    }
                }
            );
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error';
            if (msg.includes('denied') || msg.includes('rejected')) {
                setErr('Bạn đã hủy giao dịch');
                setRejected(true);
            } else {
                setErr(msg);
            }
            setState('OVER');
        }
    };

    const lastClaimedScore = useRef(0);

    useEffect(() => {
        if (txOk && txHash) {
            sounds.success();
            // Start flying animation
            setShowFly(true);
            setToast({ msg: t.claimSuccess, type: 'success' });
            setTimeout(() => setToast(null), 4000);

            // Update shared leaderboard with claim amount
            if (address && myProfile && txHash) {
                const claimedScore = lastClaimedScore.current;
                const claimAmountWei = (BigInt(claimedScore) * BigInt(10) ** BigInt(18)).toString();
                updateLeaderboardAfterClaim(
                    address,
                    claimAmountWei,
                    txHash, // Pass txHash for verification
                    myProfile.name,
                    myProfile.avatar,
                    myProfile.telegram,
                    myProfile.twitter
                ).then(() => {
                    // Refresh leaderboard after update
                    fetchOnchainLeaderboard().then(setOnchainLeaderboard);
                });
            }

            // Refetch data immediately just in case
            refetchNonce();
            refetchUserWithdrawal();

            // Wait for animation (1.5s) then update balance visual
            setTimeout(() => {
                setShowFly(false);
                setBalanceHighlight(true);
                // Aggressive balance update after visual impact
                refetchBalance();
                refetchHourly();
                refetchDailyCap();
                setTimeout(() => setBalanceHighlight(false), 1200);
            }, 1500);

            // Reset game state
            setState('MENU');
            setScore(0);
            // Reset txHash so next game can claim properly
            setTxHash(undefined);
        }
    }, [txOk, txHash, t.claimSuccess, refetchBalance, refetchNonce, refetchUserWithdrawal, refetchHourly, refetchDailyCap, address, myProfile]);

    // Safety: Force CLAIM state if pending but state became OVER (user report fix)
    useEffect(() => {
        if ((isPending || txLoading) && state === 'OVER') {
            setState('CLAIM');
        }
    }, [isPending, txLoading, state]);
    useEffect(() => { if (state === 'MENU' && canvas.current) { const c = canvas.current.getContext('2d'); if (c) { c.fillStyle = '#0a0e1a'; c.fillRect(0, 0, W, H); } } }, [state]);
    useEffect(() => { return () => { loop.current && clearInterval(loop.current); obsT.current && clearInterval(obsT.current); superT.current && clearTimeout(superT.current); }; }, []);

    // Initialize language from localStorage or browser
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('banmao_snake_lang') as LangKey | null;
            if (stored && stored in langs) setLang(stored);
            else setLang(getBrowserLang());

            // Adjust viewport for mobile - scale down to fit more content
            const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
            const isMobileDevice = window.innerWidth < 768;
            if (viewport && isMobileDevice) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=0.65, maximum-scale=5, user-scalable=yes');
            }

            // Cleanup: restore viewport on unmount
            return () => {
                if (viewport) {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes');
                }
            };
        }
    }, []);

    const changeLang = (l: LangKey) => {
        sounds.click();
        setLang(l);
        if (typeof window !== 'undefined') localStorage.setItem('banmao_snake_lang', l);
    };

    const bal = balance ? Number(formatUnits(balance as bigint, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0';
    const gPct = Math.max(0, Math.min(100, gas));
    const minClaim = minClaimData ? Number(formatUnits(minClaimData as bigint, 18)) : MIN_CLAIM;
    const poolBalNum = poolBalance ? Number(formatUnits(poolBalance as bigint, 18)) : 0;
    const poolLow = poolBalNum > 0 && poolBalNum < score; // Pool has less than score
    const isCooldown = cooldownLeft > 0;
    const canClaim = !isCooldown && isConnected && score >= minClaim && !poolLow;
    const needMore = Math.max(0, minClaim - score);
    const DONATE_ADDRESS = '0x986dE458302005890d708B3930ce57cD1E1E3BaF';

    // Clipboard helper with fallback for mobile
    const copyToClipboard = async (text: string, successMsg: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for mobile/non-HTTPS
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                textArea.style.top = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                } catch (err) {
                    console.error('Fallback copy failed:', err);
                }
                document.body.removeChild(textArea);
            }
            sounds.click();
            setToast({ msg: successMsg, type: 'success' });
            setTimeout(() => setToast(null), 2500);
        } catch (err) {
            console.error('Copy failed:', err);
            setToast({ msg: 'Copy failed - please copy manually', type: 'error' });
            setTimeout(() => setToast(null), 2000);
        }
    };

    return (
        <div style={{ ...S.wrap, zoom: scaleMultiplier, transformOrigin: 'top center' }}>
            {/* Hexagonal Background Pattern */}
            <div className="hex-background" />
            {/* Upgrade 8: Offline Banner */}
            <OfflineBanner isOnline={isOnline} />

            {/* Achievement Badges */}
            {achievements.map((achievement, idx) => (
                <div
                    key={achievement.id}
                    className="achievement-badge"
                    style={{ top: 80 + idx * 60 }}
                >
                    <span style={{ fontSize: 28 }}>{achievement.icon}</span>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 800 }}>🎉 ACHIEVEMENT!</div>
                        <div style={{ fontSize: 12 }}>{achievement.text}</div>
                    </div>
                </div>
            ))}

            {/* Toast Notification (extracted to component) */}
            <Toast toast={toast} />

            {/* Milestone Notification - Professional localized achievement popups */}
            <MilestoneNotification
                milestone={milestone}
                t={t}
                onDismiss={() => setMilestone(null)}
            />


            {/* Help Modal - Game Guide (extracted to component) */}
            <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} t={t} />

            <header style={{ ...S.header, padding: (hasMounted && isMobile) ? '8px 12px' : '12px 20px' }}>
                <div style={{ ...S.logoWrap, gap: (hasMounted && isMobile) ? 6 : 10, padding: (hasMounted && isMobile) ? '4px 8px' : '6px 12px', cursor: 'default' }} className="hover-scale">
                    <img src="/games/snake/snake-icon-96x96.png" alt="Snake" className="logo-animated" style={{ width: (hasMounted && isMobile) ? 28 : 36, height: (hasMounted && isMobile) ? 28 : 36, objectFit: 'contain', borderRadius: 8 }} />
                    <span style={{ ...S.logoText, fontSize: (hasMounted && isMobile) ? 16 : 20 }}>SNAKE</span>
                </div>
                {/* Back to Home Button - extracted to component */}
                <BackButton
                    onClick={() => { sounds.click(); router.push('/gamefi'); }}
                    onHover={() => sounds.hover()}
                />
                {/* Wallet connect only shows in header when stats panel is hidden (during PLAY) */}
                {state === 'PLAY' && (
                    <ConnectButton.Custom>
                        {({ account, chain, mounted, openConnectModal }) => {
                            if (!mounted || !account || !chain) return <button style={{ ...S.connectBtn, padding: (hasMounted && isMobile) ? '8px 14px' : '10px 20px', fontSize: (hasMounted && isMobile) ? 12 : 14 }} className="hover-btn" onMouseEnter={() => sounds.hover()} onClick={() => { sounds.click(); openConnectModal(); }}>🔗 Kết nối</button>;
                            return null;
                        }}
                    </ConnectButton.Custom>
                )}
            </header>

            {/* Main - PC: 3 columns (Stats | Game | Profile), Mobile: wrapped */}
            <main
                className="main-content"
                style={{
                    ...S.main,
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: (hasMounted && isMobile) ? 'wrap' : 'nowrap',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    gap: (hasMounted && isMobile) ? 20 : 24,
                    padding: (hasMounted && isMobile) ? '16px' : '20px 24px',
                    maxWidth: '100vw',
                    overflowX: 'hidden'
                }}>

                {/* Profile + Leaderboard - order:3 on mobile (after donor), order:2 on desktop */}
                {state !== 'PLAY' && (
                    <div
                        className="side-panel panel-leaderboard"
                        style={{
                            display: 'flex', flexDirection: 'column', gap: 12,
                            width: (hasMounted && isMobile) ? '100%' : 280,
                            minWidth: 240,
                            maxWidth: (hasMounted && isMobile) ? 'min(660px, calc(100vw - 32px))' : 320,
                            flex: '0 0 auto',
                            order: (hasMounted && isMobile) ? 3 : 2,
                            flexShrink: 0
                        }}>
                        {/* Profile Panel - extracted to component */}
                        {address && myProfile && (
                            <MyProfileCard
                                address={address}
                                myProfile={myProfile}
                                onchainLeaderboard={onchainLeaderboard}
                                t={t}
                                onViewProfile={setViewOnchainPlayer}
                                onEditProfile={() => setShowProfileModal(true)}
                            />
                        )}

                        {/* Leaderboard Panel - extracted to component */}
                        <LeaderboardPanel
                            leaderboard={onchainLeaderboard}
                            isMobile={isMobile}
                            hasMounted={hasMounted}
                            t={t}
                            onPlayerClick={setViewOnchainPlayer}
                        />
                    </div>
                )}

                {/* Donor Leaderboard Panel - Works on both Desktop and Mobile */}
                {state !== 'PLAY' && (
                    <div className="panel-donor" style={{
                        width: (hasMounted && isMobile) ? '100%' : 'min(320px, 28vw)',
                        minWidth: (hasMounted && isMobile) ? 'auto' : 280,
                        maxWidth: (hasMounted && isMobile) ? 'min(660px, calc(100vw - 32px))' : 'none',
                        padding: (hasMounted && isMobile) ? 16 : 18,
                        background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))',
                        borderRadius: 16,
                        border: '1px solid rgba(168,85,247,0.3)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 0 20px rgba(168,85,247,0.1)',
                        maxHeight: (hasMounted && isMobile) ? 'none' : 'calc(100vh - 120px)',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: (hasMounted && isMobile) ? 12 : 14,
                        order: (hasMounted && isMobile) ? 2 : 3 // Mobile: after game(1), Desktop: rightmost
                    }}>
                        {/* ===== SECTION 1: MY PROFILE & VERIFICATION (Collapsible) ===== */}
                        {address && (
                            <div>
                                {/* Toggle Header */}
                                <button
                                    onClick={() => { sounds.click(); setShowDonorPanel(!showDonorPanel); }}
                                    onMouseEnter={() => sounds.hover()}
                                    className="hover-btn"
                                    style={{
                                        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                        background: 'rgba(168,85,247,0.15)'
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 18 }}>👤</span>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#c084fc' }}>
                                            {t.donorProfileTitle || 'Donor Profile'}
                                        </span>
                                    </span>
                                    <span style={{ fontSize: 12, color: '#a855f7' }}>
                                        {showDonorPanel ? '▲' : '▼'}
                                    </span>
                                </button>

                                {/* Collapsible Content */}
                                {showDonorPanel && (
                                    <div style={{
                                        marginTop: 10, padding: 14,
                                        background: 'linear-gradient(145deg, rgba(168,85,247,0.12), rgba(124,58,237,0.06))',
                                        borderRadius: 14, border: '1px solid rgba(168,85,247,0.3)'
                                    }}>
                                        {/* My Donor Profile */}
                                        {myDonorProfile ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                <div style={{
                                                    fontSize: 32, width: 50, height: 50,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: 'rgba(0,0,0,0.3)', borderRadius: 12
                                                }}>
                                                    {myDonorProfile.badge.icon}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: myDonorProfile.badge.color }}>
                                                        {myDonorProfile.name || getBadgeTierName(myDonorProfile.badge.tier) + ' ' + (t.donorDonor || 'Donor')}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#e2e8f0' }}>
                                                        {(Number(myDonorProfile.totalDonated) / 1e18).toLocaleString()} $banmao
                                                    </div>
                                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                                        {myDonorProfile.donationCount} {t.donorTimes || 'times'} donate
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        sounds.click();
                                                        setViewDonor(myDonorProfile as any);
                                                        setEditDonorName(myDonorProfile.name || '');
                                                        setEditDonorAvatar(myDonorProfile.avatar || 0);
                                                        setEditDonorTelegram(myDonorProfile.telegram || '');
                                                        setEditDonorTwitter(myDonorProfile.twitter || '');
                                                        setShowDonorEditModal(true);
                                                    }}
                                                    onMouseEnter={() => sounds.hover()}
                                                    className="hover-btn"
                                                    style={{
                                                        padding: '8px 10px', borderRadius: 8, border: 'none',
                                                        background: 'rgba(168,85,247,0.3)', cursor: 'pointer',
                                                        color: '#c084fc', fontSize: 14
                                                    }}
                                                    title="Chỉnh sửa hồ sơ"
                                                >✏️</button>
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                                                {t.donorNotYet || 'You are not a donor yet. Donate to earn a badge!'}
                                            </div>
                                        )}

                                        {/* Donate CTA */}
                                        <a
                                            href="https://web3.okx.com/explorer/x-layer/address/0x986dE458302005890d708B3930ce57cD1E1E3BaF"
                                            target="_blank" rel="noopener noreferrer"
                                            className="hover-btn"
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                padding: '12px 16px', borderRadius: 10, marginBottom: 10,
                                                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                                color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none',
                                                boxShadow: '0 4px 15px rgba(168,85,247,0.4)'
                                            }}
                                        >
                                            💜 {t.donateButton || 'Donate $banmao'}
                                        </a>

                                        {/* Tx Hash Verification */}
                                        <div style={{
                                            padding: 12, borderRadius: 10,
                                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(168,85,247,0.2)'
                                        }}>
                                            <div style={{ fontSize: 11, color: '#a855f7', fontWeight: 600, marginBottom: 8 }}>
                                                📝 {t.verifyYourDonation || 'Verify your Donation'}
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="0x... (Transaction Hash)"
                                                value={donorTxHash}
                                                onChange={(e) => setDonorTxHash(e.target.value)}
                                                style={{
                                                    width: '100%', padding: '10px 12px', borderRadius: 8,
                                                    border: '1px solid rgba(168,85,247,0.3)',
                                                    background: 'rgba(0,0,0,0.4)', color: '#e2e8f0', fontSize: 11,
                                                    marginBottom: 8, outline: 'none', boxSizing: 'border-box'
                                                }}
                                            />
                                            <button
                                                onClick={async () => {
                                                    if (!donorTxHash || donorVerifying) return;
                                                    setDonorVerifying(true);
                                                    setDonorVerifyResult(null);
                                                    try {
                                                        const res = await fetch('/api/donors/verify', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ txHash: donorTxHash, walletAddress: address })
                                                        });
                                                        const data = await res.json();
                                                        setDonorVerifyResult({ success: data.success, message: data.message || data.error });
                                                        if (data.success) {
                                                            const lbRes = await fetch('/api/donors');
                                                            if (lbRes.ok) {
                                                                const lbData = await lbRes.json();
                                                                if (lbData.success) setDonorLeaderboard(lbData.leaderboard);
                                                            }
                                                            setDonorTxHash('');
                                                        }
                                                    } catch (err) {
                                                        setDonorVerifyResult({ success: false, message: t.donorNetworkError || 'Network error' });
                                                    }
                                                    setDonorVerifying(false);
                                                }}
                                                disabled={donorVerifying || !donorTxHash}
                                                className="hover-btn"
                                                style={{
                                                    width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                                                    background: donorVerifying ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.6)',
                                                    color: '#fff', fontSize: 12, fontWeight: 600,
                                                    cursor: donorVerifying ? 'wait' : 'pointer'
                                                }}
                                            >
                                                {donorVerifying ? '⏳ ' + (t.donorVerifying || 'Verifying...') : '✓ ' + (t.donorVerifyBtn || 'Verify & Get Badge')}
                                            </button>
                                            {donorVerifyResult && (
                                                <div style={{
                                                    marginTop: 8, padding: '8px 10px', borderRadius: 8, fontSize: 11,
                                                    background: donorVerifyResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                                                    color: donorVerifyResult.success ? '#4ade80' : '#f87171',
                                                    border: `1px solid ${donorVerifyResult.success ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`
                                                }}>
                                                    {donorVerifyResult.success ? '✓ ' : '✗ '}{donorVerifyResult.message}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ===== SECTION 2: DONOR LEADERBOARD (Always Visible) - extracted to component ===== */}
                        <DonorLeaderboardList
                            donors={donorLeaderboard}
                            t={t}
                            onDonorClick={(donor) => setViewDonor(donor as any)}
                            getBadgeTierName={getBadgeTierName}
                        />
                    </div>
                )
                }

                {/* Game Area */}
                <div
                    className={`panel-game ${state === 'PLAY' ? 'game-border-pulse' : 'hover-glow'}`}
                    style={{
                        ...S.gameCard,
                        boxShadow: '0 0 40px rgba(34,211,238,0.3), 0 0 80px rgba(34,211,238,0.15), inset 0 0 30px rgba(34,211,238,0.05)',
                        maxWidth: 'min(660px, calc(100vw - 32px))',
                        width: 'fit-content',
                        order: 1,
                        flexShrink: 0
                    }}>
                    {/* HUD - extracted to component */}
                    <GameHUD
                        score={score}
                        best={best}
                        gasPercent={gPct}
                        superMode={superMode}
                        isPlaying={state === 'PLAY'}
                        isMobile={isMobile}
                        onPause={pause}
                        t={t}
                        playTime={playTime}
                    />

                    {/* Canvas - responsive for mobile */}
                    <canvas
                        ref={canvas}
                        width={W}
                        height={H}
                        style={{
                            ...S.canvas,
                            maxWidth: '100%',
                            height: 'auto'
                        }}
                    />

                    {/* Score Popups - extracted to component */}
                    <ScorePopups popups={scorePopups} />

                    {/* Particles - extracted to component */}
                    <Particles particles={particles} />

                    {/* Combo Counter - extracted to component */}
                    <ComboCounter combo={combo} isPlaying={state === 'PLAY'} />

                    {/* Overlays */}
                    {state === 'MENU' && (
                        <div style={S.overlay}>
                            <div style={S.menuCard}>
                                <img src="/games/snake/snake-icon-192x192.png" alt="Snake Logo" className="logo-float" style={{ width: 100, height: 100, objectFit: 'contain', borderRadius: 20, marginBottom: 8, cursor: 'pointer' }} />
                                <h1 style={S.menuTitle}>{t.title}</h1>
                                <p style={S.menuSub}>{t.subtitle}</p>
                                <div style={S.legend}>
                                    <div style={S.legendItem} className="stat-card"><span style={S.legendIcon}>🪙</span><span>{t.legendCoin}</span></div>
                                    <div style={S.legendItem} className="stat-card"><span style={S.legendIcon}>⚡</span><span>{t.legendXLayer}</span></div>
                                    <div style={S.legendItem} className="stat-card"><span style={S.legendIcon}>🔴</span><span>{t.legendObstacle}</span></div>
                                </div>
                                {!isConnected && <p style={S.warning}>⚠️ {t.connectToPlay}</p>}
                                <button style={S.primaryBtn} className="hover-btn" onClick={() => { sounds.click(); init(); }}>
                                    <span style={S.btnIcon}>▶️</span> {t.startBtn}
                                    {hasMounted && !isMobile && <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 8 }}>{t.spaceHint}</span>}
                                </button>
                                {/* Help Button */}
                                <button
                                    style={{ ...S.secondaryBtn, marginTop: 12, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)' }}
                                    className="hover-btn"
                                    onClick={() => { sounds.click(); setShowHelpModal(true); }}
                                >
                                    <span style={S.btnIcon}>❓</span> {t.helpBtn || 'Game Guide'}
                                </button>
                            </div>
                        </div>
                    )}

                    {state === 'PAUSE' && (
                        <div style={S.overlay}>
                            <div style={S.pauseCard}>
                                <div style={S.pauseIcon}>⏸️</div>
                                <h2 style={S.pauseTitle}>{t.pauseTitle}</h2>
                                <button style={S.primaryBtn} className="hover-btn" onClick={() => { sounds.click(); resume(); }}>
                                    <span style={S.btnIcon}>▶️</span> {t.continueBtn}
                                    {hasMounted && !isMobile && <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 8 }}>{t.spaceHint}</span>}
                                </button>
                                <button style={S.secondaryBtn} className="hover-btn" onClick={() => { sounds.click(); setState('MENU'); }}><span style={S.btnIcon}>🏠</span> {t.menuBtn}</button>
                            </div>
                        </div>
                    )}

                    {state === 'OVER' && (
                        <div style={{ ...S.overlay, background: 'linear-gradient(180deg, rgba(127,29,29,0.97) 0%, rgba(0,0,0,0.97) 100%)' }}>
                            <div style={S.overCard}>
                                <div style={S.overIcon}>💀</div>
                                <h2 style={S.overTitle}>{t.gameOverTitle}</h2>
                                <div style={S.scoreBox} className="hover-glow">
                                    <span style={S.scoreLabel}><DifficultyBadge level={difficultyLevel} />🏆 {t.scoreLabel}</span>
                                    <span style={S.scoreNum}>{score}</span>
                                    <span style={S.scoreReward}>= {score.toLocaleString()} $BANMAO</span>
                                </div>

                                {/* Session Stats Summary */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                                    marginTop: 10, padding: 10,
                                    background: 'rgba(0,0,0,0.3)', borderRadius: 12,
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 20 }}>⏱️</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#22d3ee' }}>
                                            {sessionStats.startTime && sessionStats.endTime
                                                ? Math.floor((sessionStats.endTime - sessionStats.startTime) / 1000)
                                                : 0}s
                                        </div>
                                        <div style={{ fontSize: 9, color: '#64748b' }}>{t.statsTime || 'Time'}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 20 }}>🪙</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24' }}>
                                            {sessionStats.coinsCollected}
                                        </div>
                                        <div style={{ fontSize: 9, color: '#64748b' }}>{t.statsCoins || 'Coins'}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 20 }}>📏</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#4ade80' }}>
                                            {sessionStats.maxLength}
                                        </div>
                                        <div style={{ fontSize: 9, color: '#64748b' }}>{t.statsMaxLength || 'Max Length'}</div>
                                    </div>
                                </div>

                                {err && <div style={S.errorBox}><span style={S.errorIcon}>❌</span>{err}</div>}

                                {/* Upgrade 2: Cooldown timer */}
                                <ClaimCooldownOverlay cooldownLeft={cooldownLeft} formatCooldown={formatCooldown} />

                                {/* Hide claim button if user rejected, otherwise show based on canClaim */}
                                {!rejected && canClaim ? (
                                    <button style={{ ...S.claimBtn, opacity: isPending || txLoading ? 0.7 : 1 }} className="hover-btn" onClick={() => { sounds.click(); claim(); }} disabled={isPending || txLoading}>
                                        <span style={S.btnIcon}>{isPending || txLoading ? '⏳' : '🪙'}</span>
                                        {isPending || txLoading ? t.processing : `${t.claimBtn} ${score} $BANMAO`}
                                    </button>
                                ) : !rejected && isConnected && poolLow && score > 0 ? (
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', gap: 10,
                                        padding: 14, borderRadius: 14, maxWidth: 280, width: '100%',
                                        background: 'linear-gradient(145deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))',
                                        border: '1px solid rgba(251,191,36,0.2)',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                                    }}>
                                        {/* Header */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 18 }}>🏦</span>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>{t.poolLowTitle}</div>
                                                <div style={{ fontSize: 10, color: '#64748b' }}>Pool: {poolBalNum.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        {/* Message */}
                                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>{t.poolLowMsg}</p>

                                        {/* Address + Copy */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 8 }}>
                                            <span style={{ flex: 1, fontSize: 9, color: '#a5b4fc', fontFamily: 'monospace', wordBreak: 'break-all' }}>{DONATE_ADDRESS}</span>
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(DONATE_ADDRESS); sounds.click(); setToast({ msg: 'Copied!', type: 'success' }); setTimeout(() => setToast(null), 1500); }}
                                                style={{ padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#22d3ee', color: '#000', fontSize: 10, fontWeight: 700 }}
                                                className="hover-btn"
                                            >📋</button>
                                        </div>

                                        {/* Donate Button */}
                                        <a
                                            href={`https://web3.okx.com/explorer/x-layer/address/${DONATE_ADDRESS}`}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                padding: '10px 16px', borderRadius: 10,
                                                background: 'linear-gradient(145deg, #fbbf24, #f59e0b)',
                                                color: '#000', fontWeight: 700, fontSize: 12, textDecoration: 'none'
                                            }}
                                            className="hover-btn"
                                        >
                                            <span>💎</span> {t.donateBtn}
                                        </a>
                                    </div>
                                ) : !rejected && isConnected && score > 0 ? (
                                    <div style={S.warningBox}>
                                        <span style={S.warningIcon}>⚠️</span>
                                        <span>{t.needMorePoints.replace('{0}', needMore.toLocaleString()).replace('{1}', minClaim.toLocaleString())}</span>
                                    </div>
                                ) : null}

                                <button style={S.secondaryBtn} className="hover-btn" onClick={() => { sounds.click(); init(); }}>
                                    <span style={S.btnIcon}>🔄</span> {t.playAgainBtn}
                                    {hasMounted && !isMobile && <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 8 }}>{t.spaceHint}</span>}
                                </button>
                            </div>
                        </div>
                    )}

                    {state === 'CLAIM' && (
                        <div style={{ ...S.overlay, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}>
                            <div style={{
                                padding: 32, borderRadius: 24,
                                background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.95))',
                                border: '1px solid rgba(34,211,238,0.3)',
                                boxShadow: '0 0 50px rgba(34,211,238,0.15)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', width: 280
                            }}>
                                <div style={{ fontSize: 48, marginBottom: 20, filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.4))' }} className="animate-spin-slow">🪙</div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#22d3ee', margin: '0 0 8px 0', textAlign: 'center' }}>{t.processing}</h2>
                                <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                                    Confirming transaction...<br />Please wait a moment
                                </p>
                                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{
                                        width: '40%', height: '100%', background: '#22d3ee', borderRadius: 2,
                                        animation: 'indeterminate 1.5s infinite linear',
                                        transformOrigin: '0% 50%'
                                    }} />
                                </div>
                                <style jsx>{`
                                    @keyframes indeterminate {
                                        0% { transform: translateX(0) scaleX(0); }
                                        40% { transform: translateX(0) scaleX(0.4); }
                                        100% { transform: translateX(100%) scaleX(0.5); }
                                    }
                                `}</style>
                            </div>
                        </div>
                    )}

                    {/* Super Mode Badge - extracted to component */}
                    <SuperModeBadge superMode={superMode} isPlaying={state === 'PLAY'} />
                </div>

                {/* Stats Panel - order:4 on mobile (last), order:0 on desktop (leftmost) */}
                {
                    state !== 'PLAY' && (
                        <div
                            className="side-panel panel-stats"
                            style={{
                                ...S.statsPanel,
                                width: (hasMounted && isMobile) ? '100%' : 280,
                                minWidth: 240,
                                maxWidth: (hasMounted && isMobile) ? 'min(660px, calc(100vw - 32px))' : 320,
                                flex: '0 0 auto',
                                maxHeight: 'none',
                                overflow: 'visible',
                                order: (hasMounted && isMobile) ? 4 : 0
                            }}>
                            {/* Wallet Section - at top */}
                            <ConnectButton.Custom>
                                {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
                                    if (!mounted || !account || !chain) {
                                        return (
                                            <button style={{ ...S.connectBtn, width: '100%', marginBottom: 12 }} className="hover-btn" onClick={() => { sounds.click(); openConnectModal(); }}>
                                                🔗 {t.connectToPlay}
                                            </button>
                                        );
                                    }
                                    return (
                                        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ ...S.statsItem, flexDirection: 'row', justifyContent: 'space-between', padding: '8px 12px' }} className="stat-card">
                                                <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span id="balance-chip" style={{ width: 16, height: 16, borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>$</span>
                                                    {t.balance}
                                                </span>
                                                <span
                                                    style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}
                                                    className={balanceHighlight ? 'balance-highlight' : ''}
                                                >{bal}</span>
                                            </div>
                                            <button style={{ ...S.walletChip, width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 12px' }} className="hover-btn" onMouseEnter={() => sounds.hover()} onClick={() => { sounds.click(); openChainModal(); }}>
                                                <span style={{ width: 18, height: 18, borderRadius: 4, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>⬡</span>
                                                {chain.name}
                                            </button>
                                            <button style={{ ...S.walletChip, width: '100%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 12px' }} className="hover-btn" onMouseEnter={() => sounds.hover()} onClick={() => { sounds.click(); openAccountModal(); }}>
                                                <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg, #22d3ee, #0891b2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>◉</span>
                                                {account.displayName}
                                            </button>
                                        </div>
                                    );
                                }}
                            </ConnectButton.Custom>

                            {/* Stats Toggle Button */}
                            <button
                                onClick={() => { sounds.click(); setShowStatsPanel(!showStatsPanel); }}
                                onMouseEnter={() => sounds.hover()}
                                className="hover-btn"
                                style={{
                                    ...S.statsPanelTitle,
                                    cursor: 'pointer',
                                    width: '100%',
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    borderRadius: 10,
                                    padding: '10px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'rgba(139, 92, 246, 0.08)',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ width: 14, height: 14, borderRadius: 3, background: 'linear-gradient(135deg, #a855f7, #7c3aed)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, marginRight: 6 }}>◈</span>
                                    {t.statsTitle}
                                </span>
                                <span style={{ fontSize: 12, color: '#94a3b8', transition: 'transform 0.3s ease', transform: showStatsPanel ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                            </button>
                            {showStatsPanel && (
                                <div style={{ ...S.statsGrid, gridTemplateColumns: 'repeat(2, 1fr)', position: 'relative', animation: 'fadeSlideDown 0.3s ease' }}>
                                    {/* Pool Balance */}
                                    <div style={{ ...S.statsItem, cursor: 'pointer', position: 'relative' }} className="stat-card"
                                        onClick={() => { sounds.click(); setActiveTooltip(activeTooltip === 'pool' ? null : 'pool'); }}
                                        onMouseEnter={() => { sounds.hover(); !isMobile && setActiveTooltip('pool'); }}
                                        onMouseLeave={() => !isMobile && setActiveTooltip(null)}
                                    >
                                        <span style={{ width: (hasMounted && isMobile) ? 22 : 28, height: (hasMounted && isMobile) ? 22 : 28, borderRadius: 8, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: (hasMounted && isMobile) ? 12 : 18, color: '#fff' }}>◎</span>
                                        <span style={S.statsLabel}>{t.poolBalance}</span>
                                        <span style={S.statsValue}>{poolBalance ? formatCompact(Number(formatUnits(poolBalance as bigint, 18))) : '...'}</span>
                                        {activeTooltip === 'pool' && <div style={S.tooltip}>{t.poolTooltip}</div>}
                                    </div>
                                    {/* Min Claim */}
                                    <div style={{ ...S.statsItem, cursor: 'pointer', position: 'relative' }} className="stat-card"
                                        onClick={() => { sounds.click(); setActiveTooltip(activeTooltip === 'minClaim' ? null : 'minClaim'); }}
                                        onMouseEnter={() => { sounds.hover(); !isMobile && setActiveTooltip('minClaim'); }}
                                        onMouseLeave={() => !isMobile && setActiveTooltip(null)}
                                    >
                                        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>⬡</span>
                                        <span style={S.statsLabel}>{t.minClaim}</span>
                                        <span style={{ ...S.statsValue, color: '#fbbf24' }}>{formatCompact(minClaim)}</span>
                                        {activeTooltip === 'minClaim' && <div style={S.tooltip}>{t.minClaimTooltip}</div>}
                                    </div>
                                    {/* Max Per Game */}
                                    <div style={{ ...S.statsItem, cursor: 'pointer', position: 'relative' }} className="stat-card"
                                        onClick={() => { sounds.click(); setActiveTooltip(activeTooltip === 'maxGame' ? null : 'maxGame'); }}
                                        onMouseEnter={() => { sounds.hover(); !isMobile && setActiveTooltip('maxGame'); }}
                                        onMouseLeave={() => !isMobile && setActiveTooltip(null)}
                                    >
                                        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>⬢</span>
                                        <span style={S.statsLabel}>{t.maxPerGame || 'Tối đa/lượt'}</span>
                                        <span style={{ ...S.statsValue, color: '#a78bfa' }}>{maxClaimPerGameData ? formatCompact(Number(formatUnits(maxClaimPerGameData as bigint, 18))) : '...'}</span>
                                        {activeTooltip === 'maxGame' && <div style={S.tooltip}>{t.maxPerGameTooltip || 'Số token tối đa bạn có thể nhận từ 1 lần chơi.'}</div>}
                                    </div>
                                    {/* Min Donation */}
                                    <div style={{ ...S.statsItem, cursor: 'pointer', position: 'relative' }} className="stat-card"
                                        onClick={() => { sounds.click(); setActiveTooltip(activeTooltip === 'minDonation' ? null : 'minDonation'); }}
                                        onMouseEnter={() => { sounds.hover(); !isMobile && setActiveTooltip('minDonation'); }}
                                        onMouseLeave={() => !isMobile && setActiveTooltip(null)}
                                    >
                                        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #14b8a6, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>♥</span>
                                        <span style={S.statsLabel}>{t.minDonation || 'Tối thiểu donate'}</span>
                                        <span style={{ ...S.statsValue, color: '#2dd4bf' }}>{minDonationData ? formatCompact(Number(formatUnits(minDonationData as bigint, 18))) : '...'}</span>
                                        {activeTooltip === 'minDonation' && <div style={S.tooltip}>{t.minDonationTooltip || 'Số token tối thiểu để xuất hiện trên bảng xếp hạng nhà tài trợ.'}</div>}
                                    </div>
                                    {/* Max Claims Per Hour */}
                                    <div style={{ ...S.statsItem, cursor: 'pointer', position: 'relative' }} className="stat-card"
                                        onClick={() => { sounds.click(); setActiveTooltip(activeTooltip === 'claimFreq' ? null : 'claimFreq'); }}
                                        onMouseEnter={() => { sounds.hover(); !isMobile && setActiveTooltip('claimFreq'); }}
                                        onMouseLeave={() => !isMobile && setActiveTooltip(null)}
                                    >
                                        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>⚡</span>
                                        <span style={S.statsLabel}>{t.claimFrequency || 'Tần suất claim'}</span>
                                        <span style={{ ...S.statsValue, color: '#fb923c' }}>{backendConfig ? `${backendConfig.maxClaimsPerHour}/h` : '...'}</span>
                                        {activeTooltip === 'claimFreq' && <div style={S.tooltip}>{t.claimFrequencyTooltip || 'Số lần claim tối đa mỗi người chơi mỗi giờ.'}</div>}
                                    </div>
                                    {/* Cooldown Between Claims */}
                                    <div style={{ ...S.statsItem, cursor: 'pointer', position: 'relative' }} className="stat-card"
                                        onClick={() => { sounds.click(); setActiveTooltip(activeTooltip === 'cooldown' ? null : 'cooldown'); }}
                                        onMouseEnter={() => { sounds.hover(); !isMobile && setActiveTooltip('cooldown'); }}
                                        onMouseLeave={() => !isMobile && setActiveTooltip(null)}
                                    >
                                        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>⏱</span>
                                        <span style={S.statsLabel}>{t.claimCooldown || 'Thời gian chờ'}</span>
                                        <span style={{ ...S.statsValue, color: '#f87171' }}>{backendConfig ? `${backendConfig.cooldownSeconds}s` : '...'}</span>
                                        {activeTooltip === 'cooldown' && <div style={S.tooltip}>{t.claimCooldownTooltip || 'Thời gian chờ (giây) giữa 2 lần claim liên tiếp.'}</div>}
                                    </div>
                                    {/* System Limit */}
                                    <div style={{ ...S.statsItem, cursor: 'pointer', position: 'relative' }} className="stat-card"
                                        onClick={() => { sounds.click(); setActiveTooltip(activeTooltip === 'systemLimit' ? null : 'systemLimit'); }}
                                        onMouseEnter={() => { sounds.hover(); !isMobile && setActiveTooltip('systemLimit'); }}
                                        onMouseLeave={() => !isMobile && setActiveTooltip(null)}
                                    >
                                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff' }}>◷</span>
                                        <span style={S.statsLabel}>{t.systemLimit}</span>
                                        <span style={S.statsValue}>{formatCompact(hourlyAmount ? Number(formatUnits(hourlyAmount as bigint, 18)) : 0)} / {formatCompact(hourlyCap ? Number(formatUnits(hourlyCap as bigint, 18)) : 50000)}</span>
                                        <span style={{ fontSize: 9, color: '#64748b', textAlign: 'center', lineHeight: 1.2 }}>{t.systemLimitDesc}</span>
                                        {activeTooltip === 'systemLimit' && <div style={S.tooltip}>{t.systemLimitTooltip}</div>}
                                    </div>
                                    {/* Player Limit */}
                                    {isConnected && userWithdrawal && (
                                        <div style={{ ...S.statsItem, cursor: 'pointer', position: 'relative' }} className="stat-card"
                                            onClick={() => { sounds.click(); setActiveTooltip(activeTooltip === 'playerLimit' ? null : 'playerLimit'); }}
                                            onMouseEnter={() => { sounds.hover(); !isMobile && setActiveTooltip('playerLimit'); }}
                                            onMouseLeave={() => !isMobile && setActiveTooltip(null)}
                                        >
                                            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>◉</span>
                                            <span style={S.statsLabel}>{t.playerLimit}</span>
                                            <span style={S.statsValue}>{formatCompact(Number(formatUnits((userWithdrawal as [bigint, bigint])[0], 18)))} / {formatCompact(dailyCap ? Number(formatUnits(dailyCap as bigint, 18)) : 5000)}</span>
                                            <span style={{ fontSize: 9, color: '#64748b', textAlign: 'center', lineHeight: 1.2 }}>{t.playerLimitDesc}</span>
                                            {activeTooltip === 'playerLimit' && <div style={S.tooltip}>{t.playerLimitTooltip}</div>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Community Support Section - extracted to component */}
                            {/* Upgrade 5: Claim History */}
                            <ClaimHistoryPanel claims={claims} loading={claimsLoading} showHistory={showHistory} toggleHistory={toggleHistory} t={t} address={address} />

                            <CommunitySupportSection
                                t={t}
                                donateAddress={DONATE_ADDRESS}
                                onCopyAddress={copyToClipboard}
                                onShowInfo={() => setShowInfoPanel(true)}
                                onDonateSuccess={fetchDonors}
                            />


                            {/* Info Modal Panel - extracted to component */}
                            <InfoPanelModal
                                isOpen={showInfoPanel}
                                onClose={() => setShowInfoPanel(false)}
                                t={t}
                            />
                        </div>
                    )
                }

                {/* D-Pad for mobile - extracted to component */}
                {state === 'PLAY' && (hasMounted && isMobile) && (
                    <DPad onMove={go} windowWidth={window?.innerWidth} />
                )}
            </main >

            {/* Cinematic Flying Coin */}
            {showFly && <FlyingCoin onComplete={() => { }} />}

            {/* Floating Settings Section - extracted to component */}
            <FloatingSettingsSection
                isOpen={showSettingsPanel}
                onToggle={() => setShowSettingsPanel(!showSettingsPanel)}
                isMobile={isMobile}
                lang={lang}
                uiScale={uiScale}
                t={t}
                onChangeLang={changeLang}
                onChangeScale={setUiScale}
            />

            {/* Profile Edit Modal */}
            {
                showProfileModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
                    }} onClick={() => setShowProfileModal(false)}>
                        <div style={{
                            maxWidth: 440, width: '100%',
                            maxHeight: 'calc(100vh - 40px)',
                            overflowY: 'auto',
                            padding: 20,
                            background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(30,41,59,0.92))',
                            border: '1px solid rgba(34,211,238,0.3)', borderRadius: 20,
                            boxShadow: '0 25px 80px rgba(0,0,0,0.4), 0 0 40px rgba(34,211,238,0.1)'
                        }} onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#22d3ee' }}>{t.profileTitle}</span>
                                <button onClick={() => { sounds.click(); setShowProfileModal(false); }} onMouseEnter={() => sounds.hover()} style={{ background: 'none', border: 'none', fontSize: 18, color: '#64748b', cursor: 'pointer' }}>✕</button>
                            </div>

                            {/* Live Preview Panel */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 16,
                                padding: 16, marginBottom: 16,
                                background: 'linear-gradient(135deg, rgba(34,211,238,0.08), rgba(168,85,247,0.08))',
                                borderRadius: 16, border: '1px solid rgba(34,211,238,0.2)'
                            }}>
                                <div style={{
                                    fontSize: 48, width: 70, height: 70,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: `linear-gradient(135deg, ${getAvatarColor(editAvatar)}20, ${getAvatarColor(editAvatar)}10)`,
                                    borderRadius: 16, border: `2px solid ${getAvatarColor(editAvatar)}50`,
                                    transition: 'all 0.3s ease'
                                }}>
                                    {AVATARS[editAvatar]}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                                        {editName || 'Your Name'}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>
                                        {(() => {
                                            const myData = onchainLeaderboard.find(p => p.address.toLowerCase() === address?.toLowerCase());
                                            const level = getPlayerLevel(myData?.totalClaimed ?? BigInt(0));
                                            return `Lv.${level.level} ${level.name}`;
                                        })()}
                                    </div>
                                    {/* Last Claim Time */}
                                    {(() => {
                                        const myData = onchainLeaderboard.find(p => p.address.toLowerCase() === address?.toLowerCase());
                                        if (myData?.lastClaimTime) {
                                            const date = new Date(myData.lastClaimTime * 1000);
                                            return (
                                                <div style={{ fontSize: 10, color: '#22d3ee', marginTop: 4 }}>
                                                    🕐 {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>

                            {/* Avatar Selection */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 11, color: '#64748b', marginBottom: 8, display: 'block' }}>{t.profileAvatar}</label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(8, 1fr)',
                                    gap: 6,
                                    maxHeight: 180,
                                    overflowY: 'auto',
                                    padding: 8,
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: 12,
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    {AVATARS.map((avatar, idx) => (
                                        <button
                                            key={idx}
                                            disabled={profileEditCount >= MAX_PROFILE_EDITS}
                                            onClick={() => {
                                                if (profileEditCount >= MAX_PROFILE_EDITS) return;
                                                sounds.click();
                                                setEditAvatar(idx);
                                            }}
                                            onMouseEnter={(e) => {
                                                if (profileEditCount >= MAX_PROFILE_EDITS) return;
                                                sounds.hover();
                                                if (editAvatar !== idx) {
                                                    e.currentTarget.style.transform = 'scale(1.5) rotate(8deg)';
                                                    e.currentTarget.style.boxShadow = `0 0 25px ${getAvatarColor(idx)}, 0 0 50px ${getAvatarColor(idx)}60`;
                                                    e.currentTarget.style.borderColor = getAvatarColor(idx);
                                                    e.currentTarget.style.background = `rgba(${parseInt(getAvatarColor(idx).slice(1, 3), 16)},${parseInt(getAvatarColor(idx).slice(3, 5), 16)},${parseInt(getAvatarColor(idx).slice(5, 7), 16)},0.3)`;
                                                    e.currentTarget.style.zIndex = '20';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (profileEditCount >= MAX_PROFILE_EDITS) return;
                                                if (editAvatar !== idx) {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                                    e.currentTarget.style.zIndex = '1';
                                                }
                                            }}
                                            style={{
                                                width: 38, height: 38, fontSize: 22,
                                                background: profileEditCount >= MAX_PROFILE_EDITS
                                                    ? 'rgba(100,100,100,0.15)'
                                                    : editAvatar === idx
                                                        ? `linear-gradient(135deg, ${getAvatarColor(idx)}, ${getAvatarColor(idx)}99)`
                                                        : 'rgba(255,255,255,0.06)',
                                                border: editAvatar === idx && profileEditCount < MAX_PROFILE_EDITS
                                                    ? `2px solid ${getAvatarColor(idx)}`
                                                    : '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 10,
                                                cursor: profileEditCount >= MAX_PROFILE_EDITS ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                transform: editAvatar === idx && profileEditCount < MAX_PROFILE_EDITS ? 'scale(1.35)' : 'scale(1)',
                                                boxShadow: editAvatar === idx && profileEditCount < MAX_PROFILE_EDITS ? `0 0 30px ${getAvatarColor(idx)}, 0 0 60px ${getAvatarColor(idx)}50` : 'none',
                                                position: 'relative',
                                                zIndex: editAvatar === idx ? 10 : 1,
                                                opacity: profileEditCount >= MAX_PROFILE_EDITS ? 0.5 : 1,
                                                filter: profileEditCount >= MAX_PROFILE_EDITS ? 'grayscale(0.5)' : 'none'
                                            }}
                                        >
                                            {avatar}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ fontSize: 10, color: '#475569', marginTop: 6, textAlign: 'center' }}>
                                    {AVATARS.length} avatars available
                                </div>
                            </div>

                            {/* Name Input */}
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, color: '#64748b', marginBottom: 4, display: 'block' }}>{t.profileName}</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    maxLength={20}
                                    disabled={profileEditCount >= MAX_PROFILE_EDITS}
                                    style={{
                                        width: '100%', padding: '10px 12px', background: profileEditCount >= MAX_PROFILE_EDITS ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                                        color: profileEditCount >= MAX_PROFILE_EDITS ? '#64748b' : '#fff', fontSize: 13, outline: 'none',
                                        cursor: profileEditCount >= MAX_PROFILE_EDITS ? 'not-allowed' : 'text'
                                    }}
                                    placeholder="Enter your name"
                                />
                            </div>

                            {/* Telegram Input */}
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, color: '#64748b', marginBottom: 4, display: 'block' }}>{t.profileTelegram}</label>
                                <input
                                    type="text"
                                    value={editTelegram}
                                    onChange={e => setEditTelegram(e.target.value)}
                                    maxLength={50}
                                    disabled={profileEditCount >= MAX_PROFILE_EDITS}
                                    style={{
                                        width: '100%', padding: '10px 12px', background: profileEditCount >= MAX_PROFILE_EDITS ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                                        color: profileEditCount >= MAX_PROFILE_EDITS ? '#64748b' : '#fff', fontSize: 13, outline: 'none',
                                        cursor: profileEditCount >= MAX_PROFILE_EDITS ? 'not-allowed' : 'text'
                                    }}
                                    placeholder="@username"
                                />
                            </div>

                            {/* Twitter Input */}
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, color: '#64748b', marginBottom: 4, display: 'block' }}>{t.profileTwitter}</label>
                                <input
                                    type="text"
                                    value={editTwitter}
                                    onChange={e => setEditTwitter(e.target.value)}
                                    maxLength={50}
                                    disabled={profileEditCount >= MAX_PROFILE_EDITS}
                                    style={{
                                        width: '100%', padding: '10px 12px', background: profileEditCount >= MAX_PROFILE_EDITS ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                                        color: profileEditCount >= MAX_PROFILE_EDITS ? '#64748b' : '#fff', fontSize: 13, outline: 'none',
                                        cursor: profileEditCount >= MAX_PROFILE_EDITS ? 'not-allowed' : 'text'
                                    }}
                                    placeholder="@username"
                                />
                            </div>

                            {/* Edit Limit Warning/Status */}
                            <div style={{
                                padding: '12px 14px', marginBottom: 16,
                                background: profileEditCount >= MAX_PROFILE_EDITS
                                    ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))'
                                    : 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.08))',
                                border: `1px solid ${profileEditCount >= MAX_PROFILE_EDITS ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.3)'}`,
                                borderRadius: 10
                            }}>
                                {profileEditCount >= MAX_PROFILE_EDITS ? (
                                    <>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
                                            {t.profileLocked || '🔒 Profile Locked'}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#f87171', lineHeight: 1.4 }}>
                                            {t.editLimitReached || 'Edit limit reached'} ({MAX_PROFILE_EDITS}/{MAX_PROFILE_EDITS})
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: '#fbbf24', marginBottom: 4 }}>
                                            {t.profileLockWarning || '⚠️ You can only edit your profile 3 times. After that, your profile will be permanently locked.'}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#facc15' }}>
                                            {profileEditCount}/{MAX_PROFILE_EDITS} {t.profileEditsUsed || 'edits used'} • {MAX_PROFILE_EDITS - profileEditCount} {t.editsRemaining || 'edits remaining'}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Save Button - Hidden when locked */}
                            {profileEditCount < MAX_PROFILE_EDITS && (
                                <button
                                    onClick={handleSaveProfile}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: 10,
                                        background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
                                        border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                                    }}
                                    className="hover-btn"
                                >
                                    {t.profileSave}
                                </button>
                            )}
                        </div>
                    </div>
                )
            }
            {/* Player Info View Modal - extracted to component */}
            <PlayerInfoModal
                player={viewPlayer}
                t={t}
                getPlayerRank={getPlayerRank}
                onClose={() => setViewPlayer(null)}
                onShowToast={(toast) => { setToast(toast); setTimeout(() => setToast(null), 1500); }}
            />

            {/* On-Chain Player Info View Modal */}
            {
                viewOnchainPlayer && (
                    <div
                        style={{
                            position: 'fixed', inset: 0, zIndex: 1000,
                            background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(16px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                            animation: 'fadeIn 0.3s ease-out'
                        }}
                        onClick={() => { sounds.click(); setViewOnchainPlayer(null); }}
                    >
                        <style>{`
                        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                        @keyframes pulse { 0%, 100% { box-shadow: 0 0 20px ${getAvatarColor(viewOnchainPlayer.avatar ?? 0)}40; } 50% { box-shadow: 0 0 40px ${getAvatarColor(viewOnchainPlayer.avatar ?? 0)}60; } }
                        @keyframes glow { 0%, 100% { filter: drop-shadow(0 0 8px ${getAvatarColor(viewOnchainPlayer.avatar ?? 0)}); } 50% { filter: drop-shadow(0 0 16px ${getAvatarColor(viewOnchainPlayer.avatar ?? 0)}); } }
                    `}</style>
                        <div
                            style={{
                                width: 340, padding: 24,
                                background: 'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))',
                                border: `2px solid ${getAvatarColor(viewOnchainPlayer.avatar ?? 0)}`,
                                borderRadius: 24,
                                boxShadow: `0 25px 80px rgba(0,0,0,0.7), 0 0 60px ${getAvatarColor(viewOnchainPlayer.avatar ?? 0)}30`,
                                textAlign: 'center',
                                position: 'relative',
                                animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => { sounds.click(); setViewOnchainPlayer(null); }}
                                style={{
                                    position: 'absolute', top: -12, right: -12,
                                    background: `linear-gradient(135deg, ${getAvatarColor(viewOnchainPlayer.avatar ?? 0)}, ${getAvatarColor(viewOnchainPlayer.avatar ?? 0)}cc)`,
                                    border: '3px solid rgba(15,23,42,0.9)',
                                    width: 36, height: 36, borderRadius: '50%',
                                    fontSize: 16, color: '#fff', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700,
                                    boxShadow: `0 4px 15px ${getAvatarColor(viewOnchainPlayer.avatar ?? 0)}60`,
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; }}
                            >✕</button>

                            {/* Avatar with glow effect */}
                            <div
                                style={{
                                    fontSize: 64, marginBottom: 12,
                                    animation: 'glow 2s infinite ease-in-out',
                                    transition: 'transform 0.3s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => { sounds.hover(); e.currentTarget.style.transform = 'scale(2)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                {getAvatarEmoji((viewOnchainPlayer.avatar ?? 0) as import('./lib/avatars').AvatarIndex)}
                            </div>

                            {/* Name */}
                            <div style={{
                                fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                                {viewOnchainPlayer.name || `Player ${viewOnchainPlayer.address.slice(0, 6)}`}
                            </div>

                            {/* Level & Progress Bar */}
                            {(() => {
                                const playerLevel = getPlayerLevel(viewOnchainPlayer.totalClaimed);
                                const playerRank = onchainLeaderboard.findIndex(p => p.address.toLowerCase() === viewOnchainPlayer.address.toLowerCase()) + 1;
                                const badges = getPlayerBadges(viewOnchainPlayer, playerRank || undefined);
                                return (
                                    <>
                                        {/* Level Display */}
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                            marginBottom: 8, padding: '6px 12px',
                                            background: 'rgba(0,0,0,0.3)', borderRadius: 20
                                        }}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>
                                                Lv.{playerLevel.level}
                                            </span>
                                            <span style={{ fontSize: 12, color: '#e2e8f0' }}>
                                                {playerLevel.name}
                                            </span>
                                            {playerRank > 0 && (
                                                <span style={{
                                                    fontSize: 10, padding: '2px 6px',
                                                    background: playerRank <= 3 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(34,211,238,0.2)',
                                                    borderRadius: 10, color: playerRank <= 3 ? '#000' : '#22d3ee'
                                                }}>
                                                    #{playerRank}
                                                </span>
                                            )}
                                        </div>

                                        {/* Progress Bar */}
                                        <div style={{ width: '100%', marginBottom: 10 }}>
                                            <div style={{
                                                width: '100%', height: 8, background: 'rgba(255,255,255,0.1)',
                                                borderRadius: 4, overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: `${playerLevel.progress}%`, height: '100%',
                                                    background: 'linear-gradient(90deg, #22d3ee, #a855f7)',
                                                    borderRadius: 4, transition: 'width 0.5s ease'
                                                }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: '#64748b' }}>
                                                <span>{formatCompact(playerLevel.minPoints)}</span>
                                                <span>{playerLevel.maxPoints === Infinity ? '∞' : formatCompact(playerLevel.maxPoints)}</span>
                                            </div>
                                        </div>

                                        {/* Badges */}
                                        {badges.length > 0 && (
                                            <div style={{
                                                display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
                                                marginBottom: 12
                                            }}>
                                                {badges.map((badge, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: 4,
                                                            padding: '3px 8px', borderRadius: 12,
                                                            background: `${badge.color}20`,
                                                            border: `1px solid ${badge.color}50`,
                                                            fontSize: 10, transition: 'transform 0.2s',
                                                            cursor: 'pointer'
                                                        }}
                                                        onMouseEnter={e => { sounds.hover(); e.currentTarget.style.transform = 'scale(1.1)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                                        title={badge.name}
                                                    >
                                                        <span>{badge.icon}</span>
                                                        <span style={{ color: badge.color, fontWeight: 600 }}>{badge.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            {/* Stats */}
                            <div style={{
                                display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16,
                                padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)',
                                width: '100%', flexWrap: 'wrap'
                            }}>
                                <div
                                    style={{ textAlign: 'center', transition: 'transform 0.2s ease', cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}
                                    onMouseEnter={e => { sounds.hover(); e.currentTarget.style.transform = 'scale(3)'; e.currentTarget.style.background = 'rgba(168,85,247,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#a855f7' }}>
                                        🏆 {formatClaimedAmount(viewOnchainPlayer.highestClaim)}
                                    </div>
                                    <div style={{ fontSize: 9, color: '#64748b' }}>{t.playerBestScore || 'Best Score'}</div>
                                </div>
                                <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                                <div
                                    style={{ textAlign: 'center', transition: 'transform 0.2s ease', cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}
                                    onMouseEnter={e => { sounds.hover(); e.currentTarget.style.transform = 'scale(3)'; e.currentTarget.style.background = 'rgba(74,222,128,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80' }}>
                                        💰 {formatClaimedAmount(viewOnchainPlayer.totalClaimed)}
                                    </div>
                                    <div style={{ fontSize: 9, color: '#64748b' }}>{t.playerTotal || 'Total'}</div>
                                </div>
                                <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                                <div
                                    style={{ textAlign: 'center', transition: 'transform 0.2s ease', cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}
                                    onMouseEnter={e => { sounds.hover(); e.currentTarget.style.transform = 'scale(3)'; e.currentTarget.style.background = 'rgba(251,191,36,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>
                                        {viewOnchainPlayer.claimCount}
                                    </div>
                                    <div style={{ fontSize: 9, color: '#64748b' }}>{t.playerClaims || 'Claims'}</div>
                                </div>
                                {/* Last Claim Time */}
                                {viewOnchainPlayer.lastClaimTime > 0 && (
                                    <>
                                        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
                                        <div
                                            style={{ textAlign: 'center', transition: 'transform 0.2s ease', cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}
                                            onMouseEnter={e => { sounds.hover(); e.currentTarget.style.transform = 'scale(1.5)'; e.currentTarget.style.background = 'rgba(34,211,238,0.1)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#22d3ee' }}>
                                                🕐 {new Date(viewOnchainPlayer.lastClaimTime).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                            </div>
                                            <div style={{ fontSize: 9, color: '#22d3ee' }}>
                                                {new Date(viewOnchainPlayer.lastClaimTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div style={{ fontSize: 8, color: '#64748b' }}>{t.playerLastActive || 'Last Active'}</div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Wallet Address */}
                            <div style={{
                                marginBottom: 10, padding: '10px 12px',
                                background: 'rgba(0,0,0,0.4)', borderRadius: 10,
                                display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                <span style={{ fontSize: 10, color: '#64748b', flexShrink: 0 }}>🔗</span>
                                <span style={{
                                    fontSize: 10, color: '#22d3ee', fontFamily: 'monospace',
                                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                    {viewOnchainPlayer.address}
                                </span>
                                <button
                                    onClick={() => copyToClipboard(viewOnchainPlayer.address, 'Copied!')}
                                    className="hover-copy"
                                    style={{
                                        padding: '4px 8px', background: 'rgba(34,211,238,0.2)',
                                        border: '1px solid rgba(34,211,238,0.3)', borderRadius: 6,
                                        fontSize: 9, color: '#22d3ee', cursor: 'pointer', flexShrink: 0
                                    }}
                                >📋</button>
                            </div>

                            {/* Social Links Row - extracted to component */}
                            <SocialLinksRow
                                telegram={viewOnchainPlayer.telegram}
                                twitter={viewOnchainPlayer.twitter}
                            />

                            {/* Explorer Link - extracted to component */}
                            <ExplorerLink address={viewOnchainPlayer.address} />

                            {/* Share Profile Button */}
                            <button
                                onClick={() => {
                                    sounds.click();
                                    const level = getPlayerLevel(viewOnchainPlayer.totalClaimed);
                                    const shareText = `🐍 ${viewOnchainPlayer.name || 'Player'} - BANMAO Snake\n` +
                                        `📊 Level ${level.level} ${level.name}\n` +
                                        `🏆 Best Score: ${formatClaimedAmount(viewOnchainPlayer.highestClaim)}\n` +
                                        `💰 Total: ${formatClaimedAmount(viewOnchainPlayer.totalClaimed)}\n` +
                                        `🎮 ${viewOnchainPlayer.claimCount} claims\n` +
                                        `🔗 ${viewOnchainPlayer.address.slice(0, 10)}...`;
                                    copyToClipboard(shareText, 'Copied profile!');
                                }}
                                className="hover-btn"
                                onMouseEnter={() => sounds.hover()}
                                style={{
                                    width: '100%', padding: '10px',
                                    background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.2))',
                                    borderRadius: 10, border: '1px solid rgba(168,85,247,0.3)',
                                    fontSize: 11, color: '#a855f7', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                📤 Share Profile
                            </button>
                        </div>
                    </div>
                )
            }


            {/* Donor Profile Modal */}
            {
                viewDonor && (
                    <div
                        className="donor-modal-overlay"
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 9999, padding: 20,
                            animation: 'fadeIn 0.3s ease-out'
                        }}
                        onClick={() => { sounds.click(); setViewDonor(null); }}
                    >
                        <div
                            className="donor-modal-content"
                            style={{
                                position: 'relative',
                                background: 'linear-gradient(145deg, rgba(30,41,59,0.98), rgba(15,23,42,0.98))',
                                borderRadius: 20, padding: 24, maxWidth: 380, width: '100%',
                                border: '1px solid rgba(168,85,247,0.4)',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(168,85,247,0.2)',
                                animation: 'slideUp 0.3s ease-out'
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                        >
                            {/* Close Button - Enhanced */}
                            <button
                                onClick={() => { sounds.click(); setViewDonor(null); }}
                                onMouseEnter={() => sounds.hover()}
                                className="hover-btn"
                                style={{
                                    position: 'absolute', top: 12, right: 12,
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: 8, width: 32, height: 32,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: '#94a3b8', fontSize: 16,
                                    transition: 'all 0.2s ease'
                                }}
                            >✕</button>

                            {/* Header */}
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <div
                                    className="heart-beat"
                                    style={{
                                        fontSize: 56, marginBottom: 8,
                                        filter: 'drop-shadow(0 4px 20px rgba(168,85,247,0.5))'
                                    }}>
                                    {viewDonor.badge.icon}
                                </div>
                                {/* Badge tier name - below icon */}
                                <div style={{
                                    display: 'block',
                                    marginBottom: 10
                                }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '4px 12px',
                                        background: `${viewDonor.badge.color}20`,
                                        border: `1px solid ${viewDonor.badge.color}40`,
                                        borderRadius: 20,
                                        fontSize: 10, fontWeight: 600, color: viewDonor.badge.color
                                    }}>
                                        {getBadgeTierName(viewDonor.badge.tier)}
                                    </span>
                                </div>
                                {/* Donor Name */}
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', marginBottom: 6 }}>
                                    {viewDonor.name || t.donorNoName || 'Anonymous'}
                                </div>
                                {/* Wallet address */}
                                <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-all', padding: '0 12px' }}>
                                    {viewDonor.address}
                                </div>
                            </div>

                            {/* View Mode */}
                            {!showDonorEditModal && (
                                <>
                                    {/* Profile Info */}
                                    <div style={{
                                        background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, marginBottom: 16
                                    }}>
                                        <div
                                            className="hover-info-row"
                                            style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12, marginBottom: 12
                                            }}>
                                            <span style={{ color: '#94a3b8', fontSize: 12 }}>{t.donorName || 'Name'}</span>
                                            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>
                                                {viewDonor.name || (t.donorNoName || 'No name set')}
                                            </span>
                                        </div>
                                        <div
                                            className="hover-info-row"
                                            style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 12, marginBottom: 12
                                            }}>
                                            <span style={{ color: '#94a3b8', fontSize: 12 }}>{t.totalDonated || 'Total Donated'}</span>
                                            <span style={{ color: '#a855f7', fontWeight: 700, fontSize: 13 }}>
                                                {(Number(viewDonor.totalDonated) / 1e18).toLocaleString()} $banmao
                                            </span>
                                        </div>
                                        <div
                                            className="hover-info-row"
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                cursor: viewDonor.donationCount > 0 ? 'pointer' : 'default',
                                                padding: '8px 0', borderRadius: 8,
                                                transition: 'all 0.2s ease'
                                            }}
                                            onClick={async () => {
                                                if (viewDonor.donationCount === 0) return;
                                                if (showDonationList) {
                                                    setShowDonationList(false);
                                                    return;
                                                }
                                                sounds.click();
                                                setLoadingDonationHistory(true);
                                                try {
                                                    const res = await fetch(`/api/donors/history?address=${viewDonor.address}`);
                                                    if (res.ok) {
                                                        const data = await res.json();
                                                        if (data.success) setDonationHistory(data.donations);
                                                    }
                                                } catch (e) { console.error(e); }
                                                setLoadingDonationHistory(false);
                                                setShowDonationList(true);
                                            }}
                                            onMouseEnter={() => viewDonor.donationCount > 0 && sounds.hover()}
                                        >
                                            <span style={{ color: '#94a3b8', fontSize: 12 }}>{t.donationCount || 'Donations'}</span>
                                            <span style={{
                                                color: viewDonor.donationCount > 0 ? '#22d3ee' : '#e2e8f0',
                                                fontWeight: 600, fontSize: 13,
                                                display: 'flex', alignItems: 'center', gap: 4
                                            }}>
                                                {viewDonor.donationCount} {t.donorTimes || 'times'}
                                                {viewDonor.donationCount > 0 && <span style={{ fontSize: 10 }}>{showDonationList ? '▲' : '▼'}</span>}
                                            </span>
                                        </div>

                                        {/* Donation History List */}
                                        {showDonationList && (
                                            <div style={{
                                                marginTop: 8, padding: 12,
                                                background: 'rgba(34,211,238,0.05)', borderRadius: 10,
                                                border: '1px solid rgba(34,211,238,0.2)',
                                                maxHeight: 200, overflowY: 'auto'
                                            }}>
                                                {loadingDonationHistory ? (
                                                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11 }}>⏳ Loading...</div>
                                                ) : donationHistory.length === 0 ? (
                                                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11 }}>No records found</div>
                                                ) : (
                                                    donationHistory.map((d, idx) => (
                                                        <a
                                                            key={d.txHash}
                                                            href={`https://web3.okx.com/explorer/x-layer/tx/${d.txHash}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            onClick={() => sounds.click()}
                                                            onMouseEnter={() => sounds.hover()}
                                                            style={{
                                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                padding: '8px 10px', marginBottom: idx < donationHistory.length - 1 ? 6 : 0,
                                                                background: 'rgba(0,0,0,0.3)', borderRadius: 8,
                                                                textDecoration: 'none', fontSize: 11, color: '#e2e8f0',
                                                                border: '1px solid rgba(255,255,255,0.05)',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            className="hover-btn"
                                                        >
                                                            <span style={{ color: '#64748b', fontFamily: 'monospace' }}>
                                                                {d.txHash.slice(0, 8)}...{d.txHash.slice(-6)}
                                                            </span>
                                                            <span style={{ color: '#a855f7', fontWeight: 600 }}>
                                                                {(Number(d.amount) / 1e18).toLocaleString()} $banmao
                                                            </span>
                                                        </a>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Social Links */}
                                    {(viewDonor.telegram || viewDonor.twitter) && (
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                            {viewDonor.telegram && (
                                                <a href={`https://t.me/${viewDonor.telegram}`} target="_blank" rel="noopener noreferrer"
                                                    onClick={() => sounds.click()}
                                                    onMouseEnter={() => sounds.hover()}
                                                    className="hover-modal-btn"
                                                    style={{
                                                        flex: 1, padding: '10px', borderRadius: 10,
                                                        background: 'rgba(0,136,204,0.2)', border: '1px solid rgba(0,136,204,0.4)',
                                                        color: '#0088cc', textDecoration: 'none', textAlign: 'center', fontSize: 12,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                                    }}
                                                ><span style={{ fontSize: 14 }}>✈️</span> @{viewDonor.telegram}</a>
                                            )}
                                            {viewDonor.twitter && (
                                                <a href={`https://x.com/${viewDonor.twitter}`} target="_blank" rel="noopener noreferrer"
                                                    onClick={() => sounds.click()}
                                                    onMouseEnter={() => sounds.hover()}
                                                    className="hover-modal-btn"
                                                    style={{
                                                        flex: 1, padding: '10px', borderRadius: 10,
                                                        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)',
                                                        color: '#e2e8f0', textDecoration: 'none', textAlign: 'center', fontSize: 12,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                                    }}
                                                ><span style={{ fontWeight: 900, fontSize: 14 }}>𝕏</span> @{viewDonor.twitter}</a>
                                            )}
                                        </div>
                                    )}

                                    {/* Edit Button - Only for own profile */}
                                    {address && address.toLowerCase() === viewDonor.address.toLowerCase() && (
                                        <button
                                            onClick={() => {
                                                setEditDonorName(viewDonor.name || '');
                                                setEditDonorAvatar(viewDonor.avatar || 0);
                                                setEditDonorTelegram(viewDonor.telegram || '');
                                                setEditDonorTwitter(viewDonor.twitter || '');
                                                setShowDonorEditModal(true);
                                            }}
                                            className="hover-modal-btn"
                                            style={{
                                                width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                                                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                                color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', marginBottom: 8
                                            }}
                                        >✏️ {t.donorEditProfile || 'Edit Profile'}</button>
                                    )}

                                    {/* View on Explorer Button */}
                                    <a
                                        href={`https://www.okx.com/web3/explorer/xlayer/address/${viewDonor.address}`}
                                        target="_blank" rel="noopener noreferrer"
                                        onClick={() => sounds.click()}
                                        onMouseEnter={() => sounds.hover()}
                                        className="hover-modal-btn"
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            width: '100%', padding: '14px', borderRadius: 14,
                                            background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(168,85,247,0.1))',
                                            border: '1px solid rgba(34,211,238,0.4)',
                                            color: '#22d3ee', textDecoration: 'none', fontWeight: 600, fontSize: 13
                                        }}
                                    >🔍 {t.gamefiViewExplorer || 'View on Explorer'}</a>
                                </>
                            )}

                            {/* Edit Mode */}
                            {showDonorEditModal && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                                    {/* Name Input */}
                                    <div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{t.profileName || 'Display Name'}</div>
                                        <input
                                            type="text"
                                            placeholder={t.donorNoAtPlaceholder || 'Enter your name...'}
                                            value={editDonorName}
                                            onChange={(e) => setEditDonorName(e.target.value)}
                                            onTouchEnd={(e) => e.stopPropagation()}
                                            maxLength={20}
                                            style={{
                                                width: '100%', padding: '10px 12px', borderRadius: 10,
                                                border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(0,0,0,0.4)',
                                                color: '#e2e8f0', fontSize: 16, outline: 'none', boxSizing: 'border-box',
                                                touchAction: 'auto', WebkitAppearance: 'none'
                                            }}
                                        />
                                    </div>

                                    {/* Telegram Input */}
                                    <div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{t.profileTelegram || 'Telegram'}</div>
                                        <input
                                            type="text"
                                            placeholder={t.donorNoAtPlaceholder || 'username (no @)'}
                                            value={editDonorTelegram}
                                            onChange={(e) => setEditDonorTelegram(e.target.value.replace('@', ''))}
                                            onTouchEnd={(e) => e.stopPropagation()}
                                            maxLength={32}
                                            style={{
                                                width: '100%', padding: '10px 12px', borderRadius: 10,
                                                border: '1px solid rgba(0,136,204,0.3)', background: 'rgba(0,0,0,0.4)',
                                                color: '#e2e8f0', fontSize: 16, outline: 'none', boxSizing: 'border-box',
                                                touchAction: 'auto', WebkitAppearance: 'none'
                                            }}
                                        />
                                    </div>

                                    {/* Twitter Input */}
                                    <div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{t.profileTwitter || 'Twitter/X'}</div>
                                        <input
                                            type="text"
                                            placeholder={t.donorNoAtPlaceholder || 'username (no @)'}
                                            value={editDonorTwitter}
                                            onChange={(e) => setEditDonorTwitter(e.target.value.replace('@', ''))}
                                            onTouchEnd={(e) => e.stopPropagation()}
                                            maxLength={15}
                                            style={{
                                                width: '100%', padding: '10px 12px', borderRadius: 10,
                                                border: '1px solid rgba(29,161,242,0.3)', background: 'rgba(0,0,0,0.4)',
                                                color: '#e2e8f0', fontSize: 16, outline: 'none', boxSizing: 'border-box',
                                                touchAction: 'auto', WebkitAppearance: 'none'
                                            }}
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                        <button
                                            onClick={() => setShowDonorEditModal(false)}
                                            style={{
                                                flex: 1, padding: '12px', borderRadius: 10,
                                                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                                color: '#fff', fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >{t.donorCancelBtn || 'Cancel'}</button>
                                        <button
                                            onClick={async () => {
                                                if (donorEditSaving) return;
                                                if (!address) {
                                                    alert('Please connect your wallet first');
                                                    return;
                                                }

                                                // Security check: only allow editing own profile
                                                if (viewDonor.address.toLowerCase() !== address.toLowerCase()) {
                                                    alert('You can only edit your own profile');
                                                    return;
                                                }

                                                setDonorEditSaving(true);
                                                try {
                                                    // Create message with timestamp for security
                                                    const timestamp = Date.now();
                                                    const messageObj = {
                                                        action: 'update_profile',
                                                        address: address.toLowerCase(),
                                                        timestamp: timestamp,
                                                        name: editDonorName,
                                                        avatar: editDonorAvatar
                                                    };
                                                    const message = JSON.stringify(messageObj);

                                                    // Request wallet signature
                                                    const ethereum = (window as any).ethereum;
                                                    if (!ethereum) {
                                                        alert('Wallet not found. Please install MetaMask.');
                                                        setDonorEditSaving(false);
                                                        return;
                                                    }

                                                    let signature: string;
                                                    try {
                                                        signature = await ethereum.request({
                                                            method: 'personal_sign',
                                                            params: [message, address],
                                                        });
                                                    } catch (signError: any) {
                                                        if (signError.code === 4001) {
                                                            // User rejected
                                                            setDonorEditSaving(false);
                                                            return;
                                                        }
                                                        throw signError;
                                                    }

                                                    // Send to API with signature
                                                    const res = await fetch('/api/donors', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            address: viewDonor.address,
                                                            name: editDonorName,
                                                            avatar: editDonorAvatar,
                                                            telegram: editDonorTelegram,
                                                            twitter: editDonorTwitter,
                                                            message: message,
                                                            signature: signature
                                                        })
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        // Refresh donor leaderboard
                                                        const lbRes = await fetch('/api/donors');
                                                        if (lbRes.ok) {
                                                            const lbData = await lbRes.json();
                                                            if (lbData.success) setDonorLeaderboard(lbData.leaderboard);
                                                        }
                                                        setShowDonorEditModal(false);
                                                        setViewDonor(null);
                                                    } else {
                                                        alert(data.error || 'Failed to update profile');
                                                    }
                                                } catch (err) {
                                                    console.error('Save error:', err);
                                                    alert('Failed to update profile. Please try again.');
                                                }
                                                setDonorEditSaving(false);
                                            }}
                                            disabled={donorEditSaving}
                                            className="hover-btn"
                                            style={{
                                                flex: 1, padding: '12px', borderRadius: 10, border: 'none',
                                                background: donorEditSaving ? 'rgba(168,85,247,0.3)' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                                color: '#fff', fontWeight: 700, cursor: donorEditSaving ? 'wait' : 'pointer'
                                            }}
                                        >{donorEditSaving ? (t.donorSaving || '⏳ Signing...') : (t.donorSaveBtn || '💾 Sign & Save')}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* PWA Install Banner */}
            <PWAInstallBanner lang={lang} />
        </div >
    );
}
