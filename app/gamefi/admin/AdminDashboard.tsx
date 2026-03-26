// app/gamefi/admin/AdminDashboard.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatUnits } from 'viem';
import { SNAKE_ABI } from '../banmaosnake/lib/abis';
import { SNAKE_CONTRACT_ADDRESS } from '../banmaosnake/lib/constants';
import { RPS_ABI } from '../banmaorps/lib/abis';
import { RPS_ADDRESS } from '../banmaorps/lib/constants';
import { BANMAO_MINER_ABI, BANMAO_MINER_ADDRESS } from '../banmaominer/lib/abis';
import SharedProviders from '../../providers';
import './admin.css';

// Components
import SnakeTab from './components/SnakeTab';
import RpsTab from './components/RpsTab';
import SlotsTab from './components/SlotsTab';
import AdminsTab from './components/AdminsTab';
import MinerTab from './components/MinerTab';
import LogsTab from './components/LogsTab';
import SystemTab from './components/SystemTab';
import FomoTab from './components/FomoTab';
import PkTab from './components/PkTab';
import { ToastProvider, useToast } from './components/ToastProvider';

// Localization
// Localization
import { en } from './i18n/en';
import { vi } from './i18n/vi';
import { zh } from './i18n/zh';
import { ru } from './i18n/ru';
import { ko } from './i18n/ko';
import { id } from './i18n/id';

// Tab types
// Tab types
type TabId = 'overview' | 'snake' | 'rps' | 'slots' | 'miner' | 'fomo' | 'pk' | 'admins' | 'logs' | 'system';

interface ClaimStats {
    claimsToday: number;
    claimsThisHour: number;
    uniquePlayers: number;
}

interface AdminWallet {
    address: string;
    name: string | null;
    added_at: number;
}

interface ActivityLog {
    id: number;
    action: string;
    actor: string | null;
    target: string | null;
    details: string | null;
    created_at: number;
}

export default function AdminDashboard() {
    return (
        <SharedProviders>
            <ToastProvider>
                <AdminContent />
            </ToastProvider>
        </SharedProviders>
    );
}

// Custom Language Switcher Component
function LanguageSwitcher({ currentLang, setLang }: { currentLang: string, setLang: (l: any) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    const languages = [
        { code: 'en', flag: '🇺🇸', label: 'English' },
        { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
        { code: 'zh', flag: '🇨🇳', label: '中文' },
        { code: 'ru', flag: '🇷🇺', label: 'Русский' },
        { code: 'ko', flag: '🇰🇷', label: '한국어' },
        { code: 'id', flag: '🇮🇩', label: 'Indonesian' }
    ];

    const current = languages.find(l => l.code === currentLang) || languages[0];

    return (
        <div style={{ position: 'relative', zIndex: 100 }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                }}
                className="lang-btn"
            >
                <span style={{ fontSize: '16px' }}>{current.flag}</span>
                <span>{current.code.toUpperCase()}</span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>▼</span>
            </button>

            {isOpen && (
                <>
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                        onClick={() => setIsOpen(false)}
                    />
                    <div style={{
                        position: 'absolute',
                        top: '120%',
                        right: 0,
                        background: '#1e293b', // Slate-800 for better visibility than transparent glass
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        minWidth: '160px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '4px'
                    }}>
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => {
                                    setLang(lang.code);
                                    setIsOpen(false);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 12px',
                                    background: currentLang === lang.code ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                    border: 'none',
                                    width: '100%',
                                    textAlign: 'left',
                                    color: currentLang === lang.code ? '#60a5fa' : '#cbd5e1',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (currentLang !== lang.code) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }}
                                onMouseLeave={(e) => {
                                    if (currentLang !== lang.code) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                                <span>{lang.label}</span>
                                {currentLang === lang.code && <span style={{ marginLeft: 'auto' }}>✓</span>}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function AdminContent() {
    // Localization Setup
    type LangCode = 'en' | 'vi' | 'zh' | 'ru' | 'ko' | 'id';
    const [lang, setLang] = useState<LangCode>('en');

    const locales: Record<LangCode, typeof en> = { en, vi, zh, ru, ko, id };
    const t = locales[lang];
    const { showToast } = useToast();

    const { address, isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Backend config states
    const [backendConfig, setBackendConfig] = useState<Record<string, string>>({});



    // Maintenance mode
    const [maintenanceMessage, setMaintenanceMessage] = useState('');

    // New dashboard data
    const [stats, setStats] = useState<ClaimStats | null>(null);
    const [adminList, setAdminList] = useState<AdminWallet[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

    // CRITICAL: Enable scrolling by adding class to html/body to override landing.css
    useEffect(() => {
        document.documentElement.classList.add('admin-page');
        document.body.classList.add('admin-page');

        // Also directly override styles to ensure scroll works
        document.body.style.overflow = 'auto';
        document.body.style.overflowY = 'auto';
        document.body.style.position = 'static';
        document.body.style.height = 'auto';
        document.documentElement.style.overflow = 'auto';
        document.documentElement.style.overflowY = 'auto';
        document.documentElement.style.position = 'static';
        document.documentElement.style.height = 'auto';

        return () => {
            document.documentElement.classList.remove('admin-page');
            document.body.classList.remove('admin-page');
            // Reset styles on unmount
            document.body.style.overflow = '';
            document.body.style.overflowY = '';
            document.body.style.position = '';
            document.body.style.height = '';
            document.documentElement.style.overflow = '';
            document.documentElement.style.overflowY = '';
            document.documentElement.style.position = '';
            document.documentElement.style.height = '';
        };
    }, []);

    // Game toggle states
    const [gameToggles, setGameToggles] = useState({
        snake: true,
        rps: true,
        slots: true,
        miner: true,
        fomo: true,
        pk: true
    });

    // Load game toggles from localStorage
    // Load game toggles from backendConfig
    useEffect(() => {
        if (Object.keys(backendConfig).length > 0) {
            setGameToggles({
                snake: backendConfig['GAME_SNAKE_ENABLED'] !== 'false',
                rps: backendConfig['GAME_RPS_ENABLED'] !== 'false',
                slots: backendConfig['GAME_SLOTS_ENABLED'] !== 'false',
                miner: backendConfig['GAME_MINER_ENABLED'] !== 'false',
                fomo: backendConfig['GAME_FOMO_ENABLED'] !== 'false',
                pk: backendConfig['GAME_PK_ENABLED'] !== 'false'
            });
        }
    }, [backendConfig]);

    // Toggle game function
    // Toggle game function
    const toggleGame = async (game: 'snake' | 'rps' | 'slots' | 'miner' | 'fomo' | 'pk', enabled: boolean) => {
        const key = `GAME_${game.toUpperCase()}_ENABLED`;

        // Optimistic update
        setGameToggles(prev => ({ ...prev, [game]: enabled }));

        // Save to backend
        try {
            await saveBackendConfig(key, String(enabled));
            setSuccess(`${game.toUpperCase()} ${enabled ? 'Enabled' : 'Disabled'}`);
        } catch (error) {
            // Revert on error
            setGameToggles(prev => ({ ...prev, [game]: !enabled }));
            console.error('Failed to toggle game:', error);
            setError('Failed to update game status');
        }

        setTimeout(() => setSuccess(null), 2000);
    };

    // Fetch all dashboard data
    const fetchDashboardData = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/config?stats=true&admins=true&logs=true');
            const data = await res.json();
            if (data.success) {
                // Config
                if (data.config) {
                    const cfg: Record<string, string> = {};
                    Object.entries(data.config).forEach(([k, v]) => {
                        cfg[k] = (v as { value: string }).value;
                    });
                    setBackendConfig(cfg);
                }
                // Stats
                if (data.stats) {
                    setStats(data.stats);
                }
                // Admins
                if (data.admins) {
                    setAdminList(data.admins);
                }
                // Logs
                if (data.logs) {
                    setActivityLogs(data.logs);
                }
            }
        } catch (e) {
            console.error('Failed to fetch dashboard data:', e);
        }
    }, []);

    // Save backend config
    const saveBackendConfig = async (key: string, value: string) => {
        if (!address || !value) return;
        setError(null);
        try {
            const message = JSON.stringify({ action: 'admin_action', timestamp: Date.now(), address });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const signature = await signMessageAsync({ message } as any);
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, message, signature, updates: { [key]: value } })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(`Updated ${key} = ${value}`);
                setBackendConfig(prev => ({ ...prev, [key]: value }));
            } else {
                setError(data.error || 'Failed to save');
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save config');
        }
    };

    // Snake contract values
    const { data: contractOwner } = useReadContract({
        address: SNAKE_CONTRACT_ADDRESS,
        abi: SNAKE_ABI,
        functionName: 'owner',
    });



    const { data: minClaimAmount, refetch: refetchMinClaim } = useReadContract({
        address: SNAKE_CONTRACT_ADDRESS,
        abi: SNAKE_ABI,
        functionName: 'minClaimAmount',
    });

    const { data: dailyPlayerCap, refetch: refetchDailyCap } = useReadContract({
        address: SNAKE_CONTRACT_ADDRESS,
        abi: SNAKE_ABI,
        functionName: 'dailyPlayerCap',
    });

    const { data: hourlySignerCap, refetch: refetchHourlyCap } = useReadContract({
        address: SNAKE_CONTRACT_ADDRESS,
        abi: SNAKE_ABI,
        functionName: 'hourlySignerCap',
    });

    const { data: hourlySignedAmount } = useReadContract({
        address: SNAKE_CONTRACT_ADDRESS,
        abi: SNAKE_ABI,
        functionName: 'hourlySignedAmount',
    });

    const { data: signerAddress, refetch: refetchSigner } = useReadContract({
        address: SNAKE_CONTRACT_ADDRESS,
        abi: SNAKE_ABI,
        functionName: 'signerAddress',
    });

    const { data: minerOwner } = useReadContract({
        address: BANMAO_MINER_ADDRESS,
        abi: BANMAO_MINER_ABI,
        functionName: 'owner',
    });



    // Super admin addresses - works on ALL chains (mainnet + testnet)
    // Add your wallet address here to always have admin access
    const SUPER_ADMINS = [
        '0x92809f2837F708163d375960063c8a3156FCEaCB', // Owner wallet (testnet + mainnet)
    ];

    // Check admin status - supports both mainnet and testnet
    const checkAdminStatus = useCallback(async () => {
        if (!address) {
            setIsAdmin(false);
            setLoading(false);
            return;
        }

        const normalizedAddress = address.toLowerCase();

        // Priority 1: Super admins (works on any chain)
        const isSuperAdmin = SUPER_ADMINS.some(a => a.toLowerCase() === normalizedAddress);
        if (isSuperAdmin) {
            setIsAdmin(true);
            setLoading(false);
            return;
        }

        // Priority 2: Contract owners (only works if contracts are deployed on current chain)
        const isSnakeOwner = contractOwner?.toLowerCase() === normalizedAddress;
        const isMinerOwner = minerOwner?.toLowerCase() === normalizedAddress;

        setIsAdmin(isSnakeOwner || isMinerOwner);
        setLoading(false);
    }, [address, contractOwner, minerOwner]);

    useEffect(() => {
        checkAdminStatus();
        fetchDashboardData();
    }, [checkAdminStatus, fetchDashboardData]);

    // Admin management (Keep this here for now or move to own component later)


    const tabs: { id: TabId; icon: string; label: string }[] = [
        { id: 'overview', icon: '📊', label: t.tabs.overview },
        { id: 'snake', icon: '🐍', label: t.tabs.snake },
        { id: 'rps', icon: '✊', label: t.tabs.rps },
        { id: 'slots', icon: '🎰', label: t.tabs.slots },
        { id: 'miner', icon: '⛏️', label: t.tabs.miner || 'Miner' },
        { id: 'miner', icon: '⛏️', label: t.tabs.miner || 'Miner' },
        { id: 'fomo', icon: '🔥', label: t.tabs.fomo || 'FOMO' },
        { id: 'pk', icon: '⚔️', label: t.tabs.pk || 'BanMaoPK' },
        { id: 'admins', icon: '👥', label: t.tabs.admins },
        { id: 'logs', icon: '📋', label: t.tabs.logs },
        { id: 'system', icon: '⚙️', label: t.tabs.system },
    ];

    if (loading) {
        return (
            <div className="admin-container">
                <div className="admin-loading">Loading...</div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 50%, #0f0f23 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <ConnectButton />
            </div>
        );
    }

    return (
        <div className="admin-container">
            {/* Header */}
            <header className="admin-header">
                <div className="admin-header-left">
                    <h1 className="admin-title">{t.title}</h1>
                    <span className="admin-subtitle">{t.subtitle}</span>
                </div>
                <div className="admin-header-right" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>

                    {/* Language Switcher */}
                    <LanguageSwitcher currentLang={lang} setLang={setLang} />

                    <a href="/gamefi" className="admin-back-btn">
                        <span>←</span> {t.backToHub}
                    </a>
                    <ConnectButton />
                </div>
            </header>

            {/* Notifications */}
            {error && <div className="admin-alert admin-alert-error">❌ {error}</div>}
            {success && <div className="admin-alert admin-alert-success">✅ {success}</div>}

            <div className="admin-layout">
                {/* Sidebar */}
                <nav className="admin-sidebar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`admin-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="admin-sidebar-icon">{tab.icon}</span>
                            <span className="admin-sidebar-label">{tab.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <main className="admin-content">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="admin-panel">
                            <h2 className="admin-panel-title">{t.overview.title}</h2>

                            {/* Stats Grid */}
                            <div className="admin-stats-grid">
                                <div className="admin-stat-card">
                                    <span className="admin-stat-icon">📈</span>
                                    <div className="admin-stat-info">
                                        <span className="admin-stat-value">{stats?.claimsToday || 0}</span>
                                        <span className="admin-stat-label">{t.overview.claimsToday}</span>
                                    </div>
                                </div>
                                <div className="admin-stat-card">
                                    <span className="admin-stat-icon">⏰</span>
                                    <div className="admin-stat-info">
                                        <span className="admin-stat-value">{stats?.claimsThisHour || 0}</span>
                                        <span className="admin-stat-label">{t.overview.thisHour}</span>
                                    </div>
                                </div>
                                <div className="admin-stat-card">
                                    <span className="admin-stat-icon">👥</span>
                                    <div className="admin-stat-info">
                                        <span className="admin-stat-value">{stats?.uniquePlayers || 0}</span>
                                        <span className="admin-stat-label">{t.overview.uniquePlayers}</span>
                                    </div>
                                </div>
                                <div className="admin-stat-card">
                                    <span className="admin-stat-icon">{backendConfig['MAINTENANCE_MODE'] === 'true' ? '🔴' : '🟢'}</span>
                                    <div className="admin-stat-info">
                                        <span className="admin-stat-value">{backendConfig['MAINTENANCE_MODE'] === 'true' ? t.overview.maintenance : t.overview.active}</span>
                                        <span className="admin-stat-label">{t.overview.gameStatus}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Game Cards with Toggles */}
                            <h3 style={{ color: '#888', marginTop: '30px', marginBottom: '15px' }}>
                                {lang === 'en' ? 'Game Controls' : 'Điều Khiển Games'}
                            </h3>
                            <div className="admin-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                {/* Snake Card */}
                                <div className="admin-section-card" style={{ marginTop: 0, border: gameToggles.snake ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)' }}>
                                    <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span className="admin-stat-icon" style={{ width: '40px', height: '40px', fontSize: '24px' }}>🐍</span>
                                            <h3 className="admin-section-title" style={{ margin: 0 }}>{t.tabs.snake}</h3>
                                        </div>
                                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: gameToggles.snake ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: gameToggles.snake ? '#22c55e' : '#ef4444' }}>
                                            {gameToggles.snake ? '✅ ON' : '🚫 OFF'}
                                        </span>
                                    </div>
                                    <div className="admin-card-info" style={{ marginBottom: '15px' }}>
                                        <p style={{ color: '#94a3b8', margin: '5px 0' }}>Min Claim: {formatUnits(minClaimAmount || BigInt(0), 18)}</p>
                                        <p style={{ color: '#94a3b8', margin: '5px 0' }}>Daily Cap: {formatUnits(dailyPlayerCap || BigInt(0), 18)}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => setActiveTab('snake')} className="admin-btn-primary" style={{ flex: 1 }}>
                                            ⚙️ {lang === 'en' ? 'Settings' : 'Cài đặt'}
                                        </button>
                                        <button
                                            onClick={() => toggleGame('snake', !gameToggles.snake)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: gameToggles.snake ? '#ef4444' : '#22c55e',
                                                color: '#fff'
                                            }}
                                        >
                                            {gameToggles.snake ? '🚫' : '✅'}
                                        </button>
                                    </div>
                                </div>

                                {/* RPS Card */}
                                <div className="admin-section-card" style={{ marginTop: 0, border: gameToggles.rps ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)' }}>
                                    <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span className="admin-stat-icon" style={{ width: '40px', height: '40px', fontSize: '24px' }}>✊</span>
                                            <h3 className="admin-section-title" style={{ margin: 0 }}>{t.tabs.rps}</h3>
                                        </div>
                                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: gameToggles.rps ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: gameToggles.rps ? '#22c55e' : '#ef4444' }}>
                                            {gameToggles.rps ? '✅ ON' : '🚫 OFF'}
                                        </span>
                                    </div>
                                    <div className="admin-card-info" style={{ marginBottom: '15px' }}>
                                        <p style={{ color: '#94a3b8', margin: '5px 0' }}>On-chain PvP</p>
                                        <p style={{ color: gameToggles.rps ? '#22c55e' : '#ef4444', margin: '5px 0' }}>{gameToggles.rps ? t.overview.active : 'Disabled'}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => setActiveTab('rps')} className="admin-btn-primary" style={{ flex: 1 }}>
                                            ⚙️ {lang === 'en' ? 'Settings' : 'Cài đặt'}
                                        </button>
                                        <button
                                            onClick={() => toggleGame('rps', !gameToggles.rps)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: gameToggles.rps ? '#ef4444' : '#22c55e',
                                                color: '#fff'
                                            }}
                                        >
                                            {gameToggles.rps ? '🚫' : '✅'}
                                        </button>
                                    </div>
                                </div>

                                {/* Slots Card */}
                                <div className="admin-section-card" style={{ marginTop: 0, border: gameToggles.slots ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)' }}>
                                    <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span className="admin-stat-icon" style={{ width: '40px', height: '40px', fontSize: '24px' }}>🎰</span>
                                            <h3 className="admin-section-title" style={{ margin: 0 }}>{t.tabs.slots || 'Slots'}</h3>
                                        </div>
                                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: gameToggles.slots ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: gameToggles.slots ? '#22c55e' : '#ef4444' }}>
                                            {gameToggles.slots ? '✅ ON' : '🚫 OFF'}
                                        </span>
                                    </div>
                                    <div className="admin-card-info" style={{ marginBottom: '15px' }}>
                                        <p style={{ color: '#94a3b8', margin: '5px 0' }}>Spin & Win</p>
                                        <p style={{ color: gameToggles.slots ? '#22c55e' : '#ef4444', margin: '5px 0' }}>{gameToggles.slots ? t.overview.active : 'Disabled'}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => setActiveTab('slots')} className="admin-btn-primary" style={{ flex: 1 }}>
                                            ⚙️ {lang === 'en' ? 'Settings' : 'Cài đặt'}
                                        </button>
                                        <button
                                            onClick={() => toggleGame('slots', !gameToggles.slots)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: gameToggles.slots ? '#ef4444' : '#22c55e',
                                                color: '#fff'
                                            }}
                                        >
                                            {gameToggles.slots ? '🚫' : '✅'}
                                        </button>
                                    </div>
                                </div>

                                {/* Miner Card */}
                                <div className="admin-section-card" style={{ marginTop: 0, border: gameToggles.miner ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)' }}>
                                    <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span className="admin-stat-icon" style={{ width: '40px', height: '40px', fontSize: '24px' }}>⛏️</span>
                                            <h3 className="admin-section-title" style={{ margin: 0 }}>{t.tabs.miner || 'Miner'}</h3>
                                        </div>
                                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: gameToggles.miner ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: gameToggles.miner ? '#22c55e' : '#ef4444' }}>
                                            {gameToggles.miner ? '✅ ON' : '🚫 OFF'}
                                        </span>
                                    </div>
                                    <div className="admin-card-info" style={{ marginBottom: '15px' }}>
                                        <p style={{ color: '#94a3b8', margin: '5px 0' }}>Gold Miner Game</p>
                                        <p style={{ color: gameToggles.miner ? '#22c55e' : '#ef4444', margin: '5px 0' }}>{gameToggles.miner ? t.overview.active : 'Disabled'}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => setActiveTab('miner')} className="admin-btn-primary" style={{ flex: 1 }}>
                                            ⚙️ {lang === 'en' ? 'Settings' : 'Cài đặt'}
                                        </button>
                                        <button
                                            onClick={() => toggleGame('miner', !gameToggles.miner)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: gameToggles.miner ? '#ef4444' : '#22c55e',
                                                color: '#fff'
                                            }}
                                        >
                                            {gameToggles.miner ? '🚫' : '✅'}
                                        </button>
                                    </div>
                                </div>

                                {/* PK Card */}
                                <div className="admin-section-card" style={{ marginTop: 0, border: gameToggles.pk ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)' }}>
                                    <div className="admin-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span className="admin-stat-icon" style={{ width: '40px', height: '40px', fontSize: '24px' }}>⚔️</span>
                                            <h3 className="admin-section-title" style={{ margin: 0 }}>{t.tabs.pk || 'BanMaoPK'}</h3>
                                        </div>
                                        <span style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', background: gameToggles.pk ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: gameToggles.pk ? '#22c55e' : '#ef4444' }}>
                                            {gameToggles.pk ? '✅ ON' : '🚫 OFF'}
                                        </span>
                                    </div>
                                    <div className="admin-card-info" style={{ marginBottom: '15px' }}>
                                        <p style={{ color: '#94a3b8', margin: '5px 0' }}>Battle Arena</p>
                                        <p style={{ color: gameToggles.pk ? '#22c55e' : '#ef4444', margin: '5px 0' }}>{gameToggles.pk ? t.overview.active : 'Disabled'}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => setActiveTab('pk')} className="admin-btn-primary" style={{ flex: 1 }}>
                                            ⚙️ {lang === 'en' ? 'Settings' : 'Cài đặt'}
                                        </button>
                                        <button
                                            onClick={() => toggleGame('pk', !gameToggles.pk)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: gameToggles.pk ? '#ef4444' : '#22c55e',
                                                color: '#fff'
                                            }}
                                        >
                                            {gameToggles.pk ? '🚫' : '✅'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Contract Stats */}
                            <div className="admin-stats-grid" style={{ marginTop: '20px' }}>
                                <div className="admin-stat-card" style={{ padding: '16px' }}>
                                    <div className="admin-stat-info">
                                        <span className="admin-stat-label">{t.overview.hourlySigned}</span>
                                        <span className="admin-stat-value" style={{ fontSize: '20px' }}>{formatUnits(hourlySignedAmount || BigInt(0), 18)}</span>
                                    </div>
                                </div>
                                <div className="admin-stat-card" style={{ padding: '16px' }}>
                                    <div className="admin-stat-info">
                                        <span className="admin-stat-label">{t.overview.hourlyCap}</span>
                                        <span className="admin-stat-value" style={{ fontSize: '20px' }}>{formatUnits(hourlySignerCap || BigInt(0), 18)}</span>
                                    </div>
                                </div>
                                <div className="admin-stat-card" style={{ padding: '16px' }}>
                                    <div className="admin-stat-info">
                                        <span className="admin-stat-label">{t.overview.totalAdmins}</span>
                                        <span className="admin-stat-value" style={{ fontSize: '20px' }}>{adminList.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                    }

                    {/* Snake Tab */}
                    {
                        activeTab === 'snake' && (
                            <SnakeTab
                                backendConfig={backendConfig}
                                saveBackendConfig={saveBackendConfig}
                                t={t}
                                isOwner={contractOwner?.toLowerCase() === address?.toLowerCase()}
                                isAdmin={isAdmin}
                            />
                        )
                    }

                    {/* RPS Tab */}
                    {activeTab === 'rps' && <RpsTab t={t} isAdmin={isAdmin} />}

                    {/* Slots Tab */}
                    {activeTab === 'slots' && <SlotsTab t={t} isAdmin={isAdmin} />}

                    {/* Miner Tab */}
                    {
                        activeTab === 'miner' && (
                            <MinerTab
                                backendConfig={backendConfig}
                                saveBackendConfig={saveBackendConfig}
                                t={t}
                                isOwner={minerOwner?.toLowerCase() === address?.toLowerCase()}
                                isAdmin={isAdmin}
                            />
                        )
                    }

                    {/* Admins Tab */}
                    {
                        activeTab === 'admins' && (
                            <AdminsTab
                                t={t}
                                adminList={adminList}
                                fetchDashboardData={fetchDashboardData}
                                setError={setError}
                                setSuccess={setSuccess}
                            />
                        )
                    }

                    {/* FOMO Tab */}
                    {activeTab === 'fomo' && <FomoTab t={t} isAdmin={isAdmin} />}

                    {/* PK Tab */}
                    {activeTab === 'pk' && <PkTab t={t} isAdmin={isAdmin} />}

                    {/* Logs Tab */}
                    {activeTab === 'logs' && <LogsTab t={t} activityLogs={activityLogs} />}

                    {/* System Tab */}
                    {
                        activeTab === 'system' && (
                            <SystemTab
                                t={t}
                                backendConfig={backendConfig}
                                saveBackendConfig={saveBackendConfig}
                            />
                        )
                    }

                </main >
            </div >
        </div >
    );
}

