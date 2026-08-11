"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import "./gamefi-hub.css";
import {
    Language,
    translations,
    getBrowserLanguage,
    LANGUAGES,
    type LandingTranslations
} from "../web3d/locals";
import { registerServiceWorker, initInstallPrompt } from "./lib/registerSW";
import PWAInstallBanner from "./components/PWAInstallBanner";
import { GameCard, GameInfoModal, type GameInfo, WalletBalanceWidget } from "./components";
import { BrowserNotice } from "./components/BrowserNotice";
import { ConnectButton } from "../components/wallet/WalletConnection";
import F1RacingBackground from "./components/F1RacingBackground";
import { getGameVisitStats, type GameVisitStats } from "../../lib/gameVisitTracker";

// Sound effects - using Web Audio API for better compatibility
const SOUNDS = {
    hover: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdX19b2BfZ3N6fm5ka2tqY2Bpd4GFfHd2c3Frbm92dnN0eXt6dXBxcXRybm1sbHF5fXlzbGdlaXB5fnd0cW9rbWxobXV5fHdwbWloaGhqdH2CgXpzbmloZmlsc3l+fXhxbWlnZ2dpbXJ3e3x4c25qZ2ZlZWhscXZ6e3ZwaWdkZWVmaW9ydnl5dXBsaWdmZmdobnN3enl1cG1qZ2ZmZmdpcHR4e3lzbmtpZ2ZmZ2hrcXd7fXlzbWpnZmVlZ2lscnl/fndwbGhnZmZmZ2txd3x+eXJtaWdmZWVmam91e398d3FsaWdmZWVnaW90e399d3BramhnZ2dnam91e399d3FraGdmZmZnam51fH59dnBramhnZmZoam90fH99dnFqaWdnZmdoam51fH99dnBramhnZmZnam51fH99d3FqamhnZmdoam91fH99d3BramhnZmZnam51fH99dnFraGdmZmZnam51fH99d3BramhnZmZoam91fH99d3BramhnZmZnam51fH99dnBramhnZmZoam91fH99d3FraWdnZmdoam91fH99d3BqamhnZmdoam91fH99dnFraWdnZ2hpam91fH99d3FqamhnZ2doam91fH99d3BqamhnZmZoam91fH99d3BramhnZmZnam51fH99d3BramhnZmZoam91fH99d3FqamhnZmdobm91fH99d3Bqamhnmqkk',
    click: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgICAgICAgICAgICAgH9/f4B/f39+f3+Af3+Af39/gH9/f4B/gH+Af4CAgIGBgIGBgYGBgYKBgYGBgYGBgYGBgIGAgYCAgICAgH9/f39/f39/f39/f39/f39/f39/gH9/gH+Af4B/gICAgICAgICAgYGBgYGBgoKCgoKCgoKCgoKCgoKCgYGBgYGBgIGAgICAgIB/gH+Af39/f35/fn9+fn5+fn5+fn5+f35/fn9+f39/f3+Af4B/gICAgICAgYGBgYKCgoKCg4ODg4ODg4ODg4ODg4KCgoKCgoGBgYCAgICAf39/f35+fn59fX19fX19fX19fX19fX5+fn5/f39/gICAgIGBgYKCgoODg4SDhISEhISEhISEhISEg4ODg4KCgoGBgYCAgH9/fn5+fX19fHx8fHx8fHx8fHx8fH19fX5+fn9/gICBgYGCgoODhISEhYWFhYWFhYWFhYWFhISEg4OCgoGBgIB/f35+fX18fHt7e3t7e3t7e3t7e3x8fH19fn5/gICBgYKCg4OEhIWFhoaG',
    success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/gH+Af4CAgICAgYGBgYGBgoKCgoKDg4ODg4ODg4ODg4ODg4OCgoKCgoGBgYGAgICAgH9/f39+fn5+fX5+fn5+fn5/f39/gICAgIGBgYKCgoODg4SEhISFhYWFhYWFhYWFhYSEhIODg4KCgYGAgH9/fn59fX18fHx7e3t7e3t7e3t7fHx8fX1+fn9/gICBgYKCg4OEhIWFhoaGhoaGhoaGhoaGhYWEhIODgoKBgH9/fn59fHx7e3p6enp6enp6enp6e3t8fH1+f3+AgYGCg4OEhYWGh4eHh4iIiIiHh4eHhoaFhYSEg4KBgH9+fX18e3p6eXl5eXl5eXl5eXl6ent8fX5/gIGCg4SFhoeHiIiJiYmJiYmJiYiIh4eGhYSEgoGA',
    whoosh: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgH5+fHx6enl5eXp7fX+BgoSFhoeHiIiIh4eFg4F+fHp4d3Z2d3l7foGEhomLjI2Oj46OjYyKiIWCf3x5dnRzc3R2eX2BhYmMj5GSkpKSkZCOi4eDf3t3dHJxcXJ0d3uAhIiMj5KUlZWVlJORjoqGgn14dXJwcHF0eH2ChouPkpWXl5eXlpSRjoqFgXx4dXFvcHJ2e4CGio6RlZeYmJiXlpORjYmFgHt3dHFwcXR4fYKHi46SlZeYmJeWk5GNiYV/e3d0cXBxdHl+g4iMj5OWl5iYl5WTj4yHg353dHFwcXR5foOIjI+TlpeYmJeWk5CL',
};

// Audio cache
const audioCache: Map<string, HTMLAudioElement> = new Map();

// Track if user has interacted (browsers require user gesture for audio)
let hasUserInteracted = false;

function playSound(soundKey: keyof typeof SOUNDS) {
    if (typeof window === "undefined") return;

    // Mark user interaction
    hasUserInteracted = true;

    // Check if sounds are enabled (default to NOT muted)
    const isMuted = localStorage.getItem("banmao_sound_muted") === "true";
    if (isMuted) {
        console.log('[Sound] Muted, skipping:', soundKey);
        return;
    }

    // Higher default volume
    const volume = parseFloat(localStorage.getItem("banmao_sound_volume") || "0.5");

    try {
        // Create new audio each time for reliable playback
        const audio = new Audio(SOUNDS[soundKey]);
        audio.volume = volume;
        audio.play().catch((err) => {
            console.log('[Sound] Play failed:', soundKey, err.message);
        });
        console.log('[Sound] Playing:', soundKey, 'volume:', volume);
    } catch (err) {
        console.log('[Sound] Error:', err);
    }
}

// Back Arrow Icon
const BackArrowIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
    </svg>
);

// Play Icon
const PlayIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
    </svg>
);

// Language Selector Component
function LanguageSelector({
    currentLang,
    onChangeLang
}: {
    currentLang: Language;
    onChangeLang: (lang: Language) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const currentLangInfo = LANGUAGES.find(l => l.code === currentLang);

    return (
        <div className="gamefi-lang-selector">
            <button
                className="gamefi-lang-btn"
                onClick={() => {
                    playSound('click');
                    setIsOpen(!isOpen);
                }}
                onMouseEnter={() => playSound('hover')}
            >
                <span className="gamefi-lang-flag">{currentLangInfo?.flag}</span>
                <span className="gamefi-lang-name">{currentLangInfo?.name}</span>
                <span className="gamefi-lang-arrow">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
                <div className="gamefi-lang-dropdown">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            className={`gamefi-lang-option ${lang.code === currentLang ? 'active' : ''}`}
                            onClick={() => {
                                playSound('success');
                                onChangeLang(lang.code);
                                setIsOpen(false);
                            }}
                            onMouseEnter={() => playSound('hover')}
                        >
                            <span className="gamefi-lang-flag">{lang.flag}</span>
                            <span className="gamefi-lang-name">{lang.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Donor interface for ticker
interface DonorTickerItem {
    name: string;
    amount: number;
    rank: number;
    address: string;
    badge?: { icon: string; color: string; tier: string; name: string; emoji?: string };
    twitter?: string;
    telegram?: string;
    totalDonated: string;
    donationCount?: number;
    avatar?: number;
}

// Badge tier name helper
function getBadgeTierName(tier: string): string {
    const tierNames: Record<string, string> = {
        'diamond': '💎 Diamond',
        'gold': '🥇 Gold',
        'silver': '🥈 Silver',
        'bronze': '🥉 Bronze',
        'supporter': '💜 Supporter',
        'donor': '❤️ Donor'
    };
    return tierNames[tier] || '❤️ Donor';
}

// Stats Widget Component
function StatsWidget() {
    const [stats, setStats] = useState({
        totalPlayers: 1247,
        totalClaimed: 856420,
        gamesPlayed: 4589
    });

    // Animate counter effect
    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                totalPlayers: prev.totalPlayers + Math.floor(Math.random() * 3),
                totalClaimed: prev.totalClaimed + Math.floor(Math.random() * 100),
                gamesPlayed: prev.gamesPlayed + Math.floor(Math.random() * 5)
            }));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="stats-widget">
            <div className="stats-widget__item">
                <span className="stats-widget__icon">👥</span>
                <div className="stats-widget__data">
                    <span className="stats-widget__value">{stats.totalPlayers.toLocaleString()}</span>
                    <span className="stats-widget__label">Players</span>
                </div>
            </div>
            <div className="stats-widget__divider" />
            <div className="stats-widget__item">
                <span className="stats-widget__icon">🪙</span>
                <div className="stats-widget__data">
                    <span className="stats-widget__value">{stats.totalClaimed.toLocaleString()}</span>
                    <span className="stats-widget__label">$BANMAO Claimed</span>
                </div>
            </div>
            <div className="stats-widget__divider" />
            <div className="stats-widget__item">
                <span className="stats-widget__icon">🎮</span>
                <div className="stats-widget__data">
                    <span className="stats-widget__value">{stats.gamesPlayed.toLocaleString()}</span>
                    <span className="stats-widget__label">Games Played</span>
                </div>
            </div>
        </div>
    );
}

// Donor Ticker Component
function DonorsTicker({ donors }: { donors: DonorTickerItem[] }) {
    const displayDonors = donors.length > 0 ? [...donors, ...donors] : [];

    return (
        <div className="winners-ticker">
            <div className="winners-ticker__label">
                <span>🏆</span> Top Donors
            </div>
            <div className="winners-ticker__track">
                <div className="winners-ticker__content">
                    {displayDonors.length > 0 ? displayDonors.map((donor, i) => (
                        <div key={i} className="winners-ticker__item">
                            <span className="winners-ticker__rank">{donor.rank <= 3 ? ['🥇', '🥈', '🥉'][donor.rank - 1] : `#${donor.rank}`}</span>
                            <span className="winners-ticker__name">{donor.name}</span>
                            <span className="winners-ticker__amount">+{donor.amount.toLocaleString()}</span>
                        </div>
                    )) : (
                        <span style={{ opacity: 0.5 }}>Loading donors...</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// Social Proof Bar
function SocialProofBar() {
    const [onlineCount] = useState(Math.floor(Math.random() * 200) + 100);

    return (
        <div className="social-proof-bar">
            <div className="social-proof-bar__online">
                <span className="social-proof-bar__dot" />
                <span>{onlineCount} players online</span>
            </div>
            <div className="social-proof-bar__activity">
                <span>🔥 24 games played in the last hour</span>
            </div>
        </div>
    );
}

// Enhanced Footer with hover effects
function EnhancedFooter() {
    return (
        <footer className="enhanced-footer">
            <div className="enhanced-footer__links">
                <a
                    href="https://t.me/banmao_X"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="enhanced-footer__social enhanced-footer__social--telegram"
                    onMouseEnter={() => playSound('hover')}
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.1-.002.321.023.465.14.12.099.153.228.171.325.016.093.036.306.02.472z" />
                    </svg>
                    Telegram
                </a>
                <a
                    href="https://twitter.com/banmao_X"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="enhanced-footer__social enhanced-footer__social--twitter"
                    onMouseEnter={() => playSound('hover')}
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Twitter
                </a>
                <a
                    href="/"
                    className="enhanced-footer__social enhanced-footer__social--home"
                    onMouseEnter={() => playSound('hover')}
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                    </svg>
                    Home
                </a>
                <a
                    href="/defi"
                    className="enhanced-footer__social enhanced-footer__social--home"
                    onMouseEnter={() => playSound('hover')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                    DeFi HUB
                </a>
                <a
                    href="https://web3.okx.com/token/x-layer/0x16d91d1615fc55b76d5f92365bd60c069b46ef78"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="enhanced-footer__social enhanced-footer__social--home"
                    onMouseEnter={() => playSound('hover')}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                        <circle cx="8" cy="21" r="1"></circle>
                        <circle cx="19" cy="21" r="1"></circle>
                        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
                    </svg>
                    Buy $BANMAO
                </a>
            </div>
            <div className="enhanced-footer__partners">
                <span>Developed by</span>
                <span className="enhanced-footer__partner">ＤＯＲＥＭＯＮ</span>
            </div>
            <p className="enhanced-footer__copyright">
                © 2025 banmao🐱🍌
            </p>
        </footer>
    );
}

// Game Search Bar Component
function GameSearchBar({
    searchQuery,
    onSearchChange,
    gameCount
}: {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    gameCount: number;
}) {
    return (
        <div className="game-search-bar">
            <div className="game-search-bar__input-wrapper">
                <span className="game-search-bar__icon">🔍</span>
                <input
                    type="text"
                    data-banmao-ai-id="gamefi.search"
                    data-banmao-ai-label="Search GameFi games"
                    data-banmao-ai-action="fill"
                    data-banmao-ai-risk="reversible"
                    className="game-search-bar__input"
                    placeholder="Search games..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                {searchQuery && (
                    <button
                        className="game-search-bar__clear"
                        onClick={() => onSearchChange('')}
                    >
                        ✕
                    </button>
                )}
            </div>
            <div className="game-search-bar__count">
                {gameCount} games available
            </div>
        </div>
    );
}


// GameInfo type is now imported from './components'

// GameCard and GameInfoModal are now imported from './components'

export default function GameFiHubPage() {
    const [lang, setLang] = useState<Language>("en");
    const [mounted, setMounted] = useState(false);
    const [showLoading, setShowLoading] = useState(true);
    const [isNavigating, setIsNavigating] = useState(false);
    const [donors, setDonors] = useState<DonorTickerItem[]>([]);
    const [selectedDonor, setSelectedDonor] = useState<DonorTickerItem | null>(null);

    // Note: Edit functionality requires wallet connection - available in banmaosnake game
    const connectedAddress: string | undefined = undefined;

    // Donor edit modal states
    const [showDonorEditModal, setShowDonorEditModal] = useState(false);
    const [editDonorName, setEditDonorName] = useState('');
    const [editDonorTelegram, setEditDonorTelegram] = useState('');
    const [editDonorTwitter, setEditDonorTwitter] = useState('');
    const [donorEditSaving, setDonorEditSaving] = useState(false);

    // Donation history states
    const [showDonationList, setShowDonationList] = useState(false);
    const [donationHistory, setDonationHistory] = useState<{ txHash: string; amount: string }[]>([]);
    const [loadingDonationHistory, setLoadingDonationHistory] = useState(false);

    // Global Config State
    const [globalConfig, setGlobalConfig] = useState<Record<string, string>>({});

    // Fetch Global Config
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/admin/config');
                const data = await res.json();
                if (data.success && data.config) {
                    const cfg: Record<string, string> = {};
                    Object.entries(data.config).forEach(([k, v]) => {
                        cfg[k] = (v as { value: string }).value;
                    });
                    setGlobalConfig(cfg);
                }
            } catch (err) {
                console.error('Failed to fetch global config:', err);
            }
        };
        fetchConfig();
    }, []);

    // Format number with commas
    const formatAmount = (num: number) => {
        return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    };

    // Rank colors
    const getRankColor = (rank: number) => {
        const colors = [
            '#FFD700', // Top 1 - Gold
            '#C0C0C0', // Top 2 - Silver  
            '#CD7F32', // Top 3 - Bronze
            '#FF6B6B', // Top 4 - Red
            '#4ECDC4', // Top 5 - Teal
            '#45B7D1', // Top 6 - Blue
            '#96CEB4', // Top 7 - Green
            '#FFEAA7', // Top 8 - Yellow
            '#DDA0DD', // Top 9 - Plum
            '#98D8C8', // Top 10 - Mint
        ];
        return colors[rank - 1] || '#94a3b8';
    };

    // Fetch donor leaderboard
    useEffect(() => {
        async function fetchDonors() {
            try {
                const res = await fetch('/api/donors');
                if (res.ok) {
                    const data = await res.json();
                    if (data.leaderboard && Array.isArray(data.leaderboard)) {
                        const topDonors = data.leaderboard.slice(0, 10).map((d: any, i: number) => ({
                            name: d.twitter || d.name || d.address?.slice(0, 8) || 'Anonymous',
                            amount: Math.round(Number(d.totalDonated) / 1e18 * 100) / 100,
                            rank: i + 1,
                            address: d.address,
                            badge: d.badge,
                            twitter: d.twitter,
                            telegram: d.telegram,
                            totalDonated: d.totalDonated,
                            donationCount: d.donationCount || 0,
                            avatar: d.avatar || 0
                        }));
                        setDonors(topDonors);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch donors:', err);
            }
        }
        fetchDonors();
    }, []);
    // Get translation function
    const t = useCallback((key: keyof LandingTranslations): string => {
        return translations[lang][key] || translations.en[key] || key;
    }, [lang]);

    // Initialize language from localStorage or browser
    useEffect(() => {
        setMounted(true);

        // Minimum loading time for professional effect (1.2 seconds)
        const loadingTimer = setTimeout(() => {
            setShowLoading(false);
        }, 1200);

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

        // Adjust viewport for mobile - force desktop-like view with fixed width
        const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
        const isMobile = window.innerWidth < 768;
        if (viewport && isMobile) {
            // Force desktop-like layout: fixed 1024px width (zoomed in slightly from 1200)
            viewport.setAttribute('content', 'width=777, user-scalable=yes');
        }

        // Initialize PWA
        registerServiceWorker();
        initInstallPrompt();

        const storedLang = localStorage.getItem("banmao_language") as Language | null;
        if (storedLang && translations[storedLang]) {
            setLang(storedLang);
        } else {
            setLang(getBrowserLanguage());
        }

        // Cleanup - restore original styles when leaving page
        return () => {
            clearTimeout(loadingTimer);
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
            // Restore viewport
            if (viewport) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes');
            }
        };
    }, []);

    // Save language preference
    const handleChangeLang = useCallback((newLang: Language) => {
        setLang(newLang);
        localStorage.setItem("banmao_language", newLang);
    }, []);

    // Game search state
    const [searchQuery, setSearchQuery] = useState('');

    // Game data - using translation keys
    // Assets located in: public/games/<game-id>/ (see public/games/README.md)
    const baseGames: GameInfo[] = [
        {
            id: "banmaorps",
            nameKey: "gamefiRpsName" as keyof LandingTranslations,
            descKey: "gamefiRpsDesc" as keyof LandingTranslations,
            icon: "rps-img",
            thumbnailIcon: "rps-img",
            href: "/gamefi/banmaorps",
            status: "live" as const,
            contractAddress: "0x2Ae44e728106a826616aA8CFec062F22bE255aCB",
            detailsKey: "gamefiRpsDetails" as keyof LandingTranslations,
            videoPreview: "/games/rps/preview.mp4",
        },
        {
            id: "banmaosnake",
            nameKey: "gamefiSnakeName" as keyof LandingTranslations,
            descKey: "gamefiSnakeDesc" as keyof LandingTranslations,
            icon: "snake-img",
            thumbnailIcon: "snake-img",
            href: "/gamefi/banmaosnake",
            status: "live" as const,
            contractAddress: "0x986dE458302005890d708B3930ce57cD1E1E3BaF",
            detailsKey: "gamefiSnakeDetails" as keyof LandingTranslations,
            videoPreview: "/games/snake/preview.mp4",
        },
        {
            id: "banmaoslots",
            nameKey: "gamefiSlotsName" as keyof LandingTranslations,
            descKey: "gamefiSlotsDesc" as keyof LandingTranslations,
            icon: "slots-img",
            thumbnailIcon: "slots-img",
            href: "/gamefi/banmaoslots",
            status: "live" as const,
            contractAddress: "0x9c64c18D792Eab435d1d921efaC978F6A62da2d2",
            detailsKey: "gamefiSlotsDetails" as keyof LandingTranslations,
            videoPreview: "/games/slots/slots-preview.mp4",
            iconImage: "/games/slots/slots-icon.jpg",
        },
        {
            id: "banmaofomo",
            nameKey: "gamefiFomoName" as keyof LandingTranslations,
            descKey: "gamefiFomoDesc" as keyof LandingTranslations,
            icon: "fomo-img",
            thumbnailIcon: "fomo-img",
            href: "/gamefi/banmaofomo",
            status: "live" as const,
            contractAddress: "0xf77195f556Aee264Cc0Edc387d758018ad7b3E21",
            detailsKey: "gamefiFomoDetails" as keyof LandingTranslations,
            videoPreview: "/games/fomo/fomo-preview.mp4",
            iconImage: "/games/fomo/fomo-icon.jpg",
        },
    ];

    // Visit stats state
    const [visitStats, setVisitStats] = useState<Record<string, GameVisitStats>>({});
    const [visitStatsLoading, setVisitStatsLoading] = useState(true);

    // Load visit stats on mount (async - calls API) with retry and refresh
    useEffect(() => {
        let isMounted = true;
        let refreshInterval: NodeJS.Timeout | null = null;

        async function loadVisitStats(isRetry = false) {
            try {
                const gameIds = baseGames.map(g => g.id);
                const stats = await getGameVisitStats(gameIds);
                if (isMounted) {
                    setVisitStats(stats);
                    setVisitStatsLoading(false);
                }
            } catch (error) {
                console.error('Failed to load visit stats:', error);
                // Retry after 2 seconds if first attempt fails
                if (!isRetry && isMounted) {
                    setTimeout(() => loadVisitStats(true), 2000);
                } else if (isMounted) {
                    setVisitStatsLoading(false);
                }
            }
        }

        // Initial load
        loadVisitStats();

        // Refresh every 30 seconds for real-time updates
        refreshInterval = setInterval(() => {
            loadVisitStats();
        }, 30000);

        return () => {
            isMounted = false;
            if (refreshInterval) clearInterval(refreshInterval);
        };
    }, []);

    // Games with visit stats and badges, sorted by 24h visits
    const games = useMemo(() => {
        const gameIds = baseGames.map(g => g.id);

        // Check enabled status from localStorage
        // Check enabled status from globalConfig (fallback to true if not set)
        const enabledStatus: Record<string, boolean> = {};

        // Map game IDs to config keys
        const configKeys: Record<string, string> = {
            'banmaorps': 'GAME_RPS_ENABLED',
            'banmaosnake': 'GAME_SNAKE_ENABLED',
            'banmaoslots': 'GAME_SLOTS_ENABLED',
            'banmaofomo': 'GAME_FOMO_ENABLED',
        };

        // If config is loaded, use it. Otherwise default to true (or previous behavior)
        // Note: globalConfig keys are strings like "true" or "false"
        Object.keys(configKeys).forEach(gameId => {
            const key = configKeys[gameId];
            if (globalConfig[key] !== undefined) {
                enabledStatus[gameId] = globalConfig[key] !== 'false';
            } else {
                // Flash fallback validation (optional, can default to true)
                enabledStatus[gameId] = true;
            }
        });

        // Add visit stats and dynamic badges
        const enrichedGames = baseGames.map(game => {
            const stats = visitStats[game.id];
            const visitCount = stats?.visits24h || 0;
            const rank = stats?.rank || gameIds.indexOf(game.id) + 1;
            const isEnabled = enabledStatus[game.id] ?? true;

            // Determine badge based on rank and visits
            let badge: GameInfo['badge'] = undefined;
            if (visitCount > 0) {
                if (rank === 1 && visitCount >= 5) badge = 'hot';  // Most visited + 5+ visits = HOT
                else if (rank === 1) badge = 'top1';
                else if (rank === 2) badge = 'top2';
                else if (rank === 3) badge = 'top3';
            }

            return {
                ...game,
                visitCount,
                rank,
                badge,
                status: (isEnabled ? 'live' : 'maintenance') as GameInfo['status'], // Override status if disabled
            };
        });

        // Sort by visit count (most visited first)
        return enrichedGames.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
    }, [visitStats, lang, globalConfig]); // Add globalConfig dependency

    // Filter games by search query and hide hidden games
    const filteredGames = games.filter(game => {
        // Hide games marked as hidden (still accessible via direct link)
        if (game.hidden) return false;

        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const gameName = t(game.nameKey).toLowerCase();
        return gameName.includes(query) || game.id.toLowerCase().includes(query);
    });

    // Info modal state
    const [infoModalGame, setInfoModalGame] = useState<GameInfo | null>(null);

    const handleShowInfo = useCallback((game: GameInfo) => {
        setInfoModalGame(game);
    }, []);

    const handleCloseInfo = useCallback(() => {
        setInfoModalGame(null);
    }, []);

    const handlePlayFromModal = useCallback(() => {
        if (infoModalGame) {
            playSound('success');
            setIsNavigating(true);
            setInfoModalGame(null);
            setTimeout(() => {
                window.location.href = infoModalGame.href;
            }, 600);
        }
    }, [infoModalGame]);


    // Show loading screen
    if (!mounted || showLoading) {
        return (
            <div className="gamefi-hub">
                <div className="gamefi-hub__stars" />
                <div className="gamefi-hub__loading">
                    {/* Animated logo */}
                    <div className="gamefi-loading__icon">🎮</div>

                    {/* Loading text */}
                    <div className="gamefi-loading__text">GameFi Zone</div>

                    {/* Progress bar */}
                    <div className="gamefi-loading__bar">
                        <div className="gamefi-loading__bar-inner" />
                    </div>

                    {/* Loading dots */}
                    <div className="gamefi-loading__dots">
                        <span>•</span><span>•</span><span>•</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="gamefi-hub">
            {/* Navigating overlay */}
            {isNavigating && (
                <div className="gamefi-hub__loading gamefi-hub__loading--navigating">
                    <div className="gamefi-loading__icon">🚀</div>
                    <div className="gamefi-loading__text">{t('gamefiLoadingGame')}</div>
                    <div className="gamefi-loading__bar">
                        <div className="gamefi-loading__bar-inner" />
                    </div>
                </div>
            )}

            {/* Animated stars background */}
            <div className="gamefi-hub__stars" />

            {/* F1 Racing Cars Background Effect */}
            <F1RacingBackground />

            {/* Scanlines overlay */}
            <div className="gamefi-hub__scanlines" />

            {/* Main container */}
            <div className="gamefi-hub__container">
                {/* Top bar with back button and language selector */}
                <div className="gamefi-hub__topbar">
                    <Link
                        href="/"
                        className="gamefi-hub__back-btn"
                        onClick={() => playSound('click')}
                        onMouseEnter={() => playSound('hover')}
                    >
                        <BackArrowIcon />
                        {t('gamefiBack')}
                    </Link>

                    {/* Wallet Balance Display + Connect Button */}
                    <div className="gamefi-hub__connect" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <WalletBalanceWidget />
                        <ConnectButton
                            showBalance={false}
                            chainStatus="icon"
                            accountStatus="avatar"
                        />
                    </div>

                    <LanguageSelector
                        currentLang={lang}
                        onChangeLang={handleChangeLang}
                    />
                </div>

                {/* Chrome Browser Notice */}
                <BrowserNotice t={t} />

                {/* Power Row Header - 2 Compact Rows */}
                <div className="power-header">
                    {/* Row 1: Title + Search + Buttons */}
                    <div className="power-header__row power-header__row--main">
                        <div className="power-header__title">
                            <span className="power-header__icon">🎮</span>
                            <h1>{t('gamefiZone')}</h1>
                        </div>

                        <div className="power-header__search">
                            <span className="power-header__search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Search games..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')}>✕</button>
                            )}
                        </div>

                        <div className="power-header__actions">
                            <a
                                href="https://web3.okx.com/token/x-layer/0x16d91d1615fc55b76d5f92365bd60c069b46ef78"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="power-header__btn power-header__btn--gold"
                                onClick={() => playSound('click')}
                                onMouseEnter={() => playSound('hover')}
                            >
                                🪙 {t('buyToken')}
                            </a>
                            <a
                                href="https://t.me/banmao_X"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="power-header__btn power-header__btn--cyan"
                                onClick={() => playSound('click')}
                                onMouseEnter={() => playSound('hover')}
                            >
                                🚀 {t('joinMission')}
                            </a>
                        </div>
                    </div>

                    {/* Row 2: Donor Ticker Full Width */}
                    <div className="power-header__row power-header__row--ticker-only">
                        <div className="power-header__ticker power-header__ticker--full">
                            <span className="power-header__ticker-label">🏆 {t('topDonors')}</span>
                            <div className="power-header__ticker-track">
                                <div className="power-header__ticker-content">
                                    {donors.length > 0 ? [...donors, ...donors].map((donor, i) => (
                                        <React.Fragment key={i}>
                                            {i === donors.length && (
                                                <span className="power-header__ticker-separator">|</span>
                                            )}
                                            <span
                                                className="power-header__ticker-item power-header__ticker-item--large power-header__ticker-item--clickable"
                                                onClick={() => setSelectedDonor(donor)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <span
                                                    className="power-header__ticker-rank"
                                                    style={{
                                                        backgroundColor: `${getRankColor(donor.rank)}22`,
                                                        color: getRankColor(donor.rank),
                                                        borderColor: getRankColor(donor.rank)
                                                    }}
                                                >Top {donor.rank}</span>
                                                <strong>{donor.name}</strong> +{formatAmount(donor.amount)} $banmao
                                            </span>
                                        </React.Fragment>
                                    )) : (
                                        <span style={{ opacity: 0.5, fontSize: 14 }}>Loading...</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Games Grid */}
                <div className="gamefi-hub__grid">
                    {filteredGames.length > 0 ? (
                        filteredGames.map((game, index) => (
                            <GameCard
                                key={game.id}
                                game={game}
                                t={t}
                                index={index}
                                onNavigate={() => setIsNavigating(true)}
                                onShowInfo={handleShowInfo}
                            />
                        ))
                    ) : (
                        <div className="gamefi-hub__no-results">
                            <span>🎮</span>
                            <p>No games found for "{searchQuery}"</p>
                        </div>
                    )}
                </div>

                {/* Coming Soon Banner */}
                <div className="gamefi-hub__coming-soon">
                    <span className="gamefi-hub__coming-soon-icon">🚀</span>
                    <span className="gamefi-hub__coming-soon-text">{t('gamefiMoreGames')}</span>
                </div>

                {/* Enhanced Footer */}
                <EnhancedFooter />
            </div>

            {/* Game Info Modal */}
            {infoModalGame && (
                <GameInfoModal
                    game={infoModalGame}
                    t={t}
                    onClose={handleCloseInfo}
                    onPlay={handlePlayFromModal}
                />
            )}

            {/* Donor Profile Modal - Matching Banmaosnake Design */}
            {selectedDonor && (
                <div
                    className="donor-modal-overlay"
                    onClick={() => { playSound('click'); setSelectedDonor(null); setShowDonorEditModal(false); }}
                >
                    <div
                        className="donor-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            className="donor-modal__close"
                            onClick={() => { playSound('click'); setSelectedDonor(null); setShowDonorEditModal(false); }}
                        >✕</button>

                        {/* Header with animated badge */}
                        <div className="donor-modal__header">
                            {selectedDonor.badge?.icon && (
                                <div className="donor-modal__badge-icon heart-beat">
                                    {selectedDonor.badge.icon}
                                </div>
                            )}
                            <div className="donor-modal__donor-name" style={{ color: selectedDonor.badge?.color || '#a855f7' }}>
                                {selectedDonor.name || 'Ẩn danh'}
                            </div>
                            <div className="donor-modal__address-full">
                                {selectedDonor.address}
                            </div>
                        </div>

                        {/* View Mode */}
                        {!showDonorEditModal && (
                            <>
                                <div className="donor-modal__info-section">
                                    <div className="donor-modal__info-row hover-row">
                                        <span className="donor-modal__label">{t('totalDonated') || 'Total Donated'}</span>
                                        <span className="donor-modal__value" style={{ color: '#a855f7' }}>{formatAmount(selectedDonor.amount)} $banmao</span>
                                    </div>
                                    <div
                                        className="donor-modal__info-row hover-row donor-modal__info-row--clickable"
                                        onClick={async () => {
                                            if ((selectedDonor.donationCount || 0) === 0) return;
                                            if (showDonationList) {
                                                setShowDonationList(false);
                                                return;
                                            }
                                            playSound('click');
                                            setLoadingDonationHistory(true);
                                            try {
                                                const res = await fetch(`/api/donors/history?address=${selectedDonor.address}`);
                                                if (res.ok) {
                                                    const data = await res.json();
                                                    if (data.success) setDonationHistory(data.donations || []);
                                                }
                                            } catch (e) { console.error(e); }
                                            setLoadingDonationHistory(false);
                                            setShowDonationList(true);
                                        }}
                                        style={{ cursor: (selectedDonor.donationCount || 0) > 0 ? 'pointer' : 'default' }}
                                    >
                                        <span className="donor-modal__label">{t('donationCount') || 'Donations'}</span>
                                        <span className="donor-modal__value" style={{ color: '#22d3ee', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {selectedDonor.donationCount || 0} {t('times') || 'times'}
                                            {(selectedDonor.donationCount || 0) > 0 && <span style={{ fontSize: 10 }}>{showDonationList ? '▲' : '▼'}</span>}
                                        </span>
                                    </div>

                                    {/* Donation History List */}
                                    {showDonationList && (
                                        <div className="donor-modal__history-list">
                                            {loadingDonationHistory ? (
                                                <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: 12 }}>⏳ {t('loading') || 'Loading...'}</div>
                                            ) : donationHistory.length === 0 ? (
                                                <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: 12 }}>{t('noData') || 'No data'}</div>
                                            ) : (
                                                donationHistory.map((d, idx) => (
                                                    <a
                                                        key={d.txHash}
                                                        href={`https://web3.okx.com/explorer/x-layer/tx/${d.txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={() => playSound('click')}
                                                        className="donor-modal__history-item"
                                                    >
                                                        <span className="donor-modal__history-hash">
                                                            {d.txHash.slice(0, 8)}...{d.txHash.slice(-6)}
                                                        </span>
                                                        <span className="donor-modal__history-amount">
                                                            {formatAmount(Number(d.amount) / 1e18)} $banmao
                                                        </span>
                                                    </a>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>

                                {(selectedDonor.telegram || selectedDonor.twitter) && (
                                    <div className="donor-modal__social-links">
                                        {selectedDonor.telegram && (
                                            <a href={`https://t.me/${selectedDonor.telegram}`} target="_blank" rel="noopener noreferrer" className="donor-modal__social-btn donor-modal__social-btn--telegram">
                                                ✈️ @{selectedDonor.telegram}
                                            </a>
                                        )}
                                        {selectedDonor.twitter && (
                                            <a href={`https://x.com/${selectedDonor.twitter}`} target="_blank" rel="noopener noreferrer" className="donor-modal__social-btn donor-modal__social-btn--twitter">
                                                𝕏 @{selectedDonor.twitter}
                                            </a>
                                        )}
                                    </div>
                                )}

                                {connectedAddress && connectedAddress.toLowerCase() === selectedDonor.address?.toLowerCase() && (
                                    <button className="donor-modal__edit-btn" onClick={() => { setEditDonorName(selectedDonor.name || ''); setEditDonorTelegram(selectedDonor.telegram || ''); setEditDonorTwitter(selectedDonor.twitter || ''); setShowDonorEditModal(true); }}>
                                        ✏️ {t('editProfile') || 'Edit Profile'}
                                    </button>
                                )}

                                <a href={`https://web3.okx.com/explorer/x-layer/address/${selectedDonor.address}`} target="_blank" rel="noopener noreferrer" className="donor-modal__explorer-btn">
                                    🔍 {t('gamefiViewExplorer')}
                                </a>
                            </>
                        )}

                        {/* Edit Mode */}
                        {showDonorEditModal && (
                            <div className="donor-modal__edit-form">
                                <div className="donor-modal__input-group">
                                    <label>Tên hiển thị</label>
                                    <input type="text" placeholder="Nhập tên..." value={editDonorName} onChange={(e) => setEditDonorName(e.target.value)} maxLength={20} />
                                </div>
                                <div className="donor-modal__input-group">
                                    <label>Telegram</label>
                                    <input type="text" placeholder="username" value={editDonorTelegram} onChange={(e) => setEditDonorTelegram(e.target.value.replace('@', ''))} maxLength={32} />
                                </div>
                                <div className="donor-modal__input-group">
                                    <label>Twitter/X</label>
                                    <input type="text" placeholder="username" value={editDonorTwitter} onChange={(e) => setEditDonorTwitter(e.target.value.replace('@', ''))} maxLength={15} />
                                </div>
                                <div className="donor-modal__edit-actions">
                                    <button className="donor-modal__cancel-btn" onClick={() => setShowDonorEditModal(false)}>Hủy</button>
                                    <button className="donor-modal__save-btn" disabled={donorEditSaving} onClick={async () => {
                                        if (donorEditSaving) return;
                                        setDonorEditSaving(true);
                                        try {
                                            const res = await fetch('/api/donors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: selectedDonor.address, name: editDonorName, telegram: editDonorTelegram, twitter: editDonorTwitter }) });
                                            const data = await res.json();
                                            if (data.success) {
                                                const lbRes = await fetch('/api/donors');
                                                if (lbRes.ok) {
                                                    const lbData = await lbRes.json();
                                                    if (lbData.leaderboard) setDonors(lbData.leaderboard.slice(0, 10).map((d: any, i: number) => ({ name: d.twitter || d.name || d.address?.slice(0, 8) || 'Anonymous', amount: Math.round(Number(d.totalDonated) / 1e18 * 100) / 100, rank: i + 1, address: d.address, badge: d.badge, twitter: d.twitter, telegram: d.telegram, totalDonated: d.totalDonated, donationCount: d.donationCount || 0, avatar: d.avatar || 0 })));
                                                }
                                                setShowDonorEditModal(false);
                                                setSelectedDonor(null);
                                            }
                                        } catch (err) { console.error(err); }
                                        setDonorEditSaving(false);
                                    }}>{donorEditSaving ? '⏳ Đang lưu...' : '💾 Lưu'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PWA Install Banner */}
            <PWAInstallBanner />
        </div>
    );
}
