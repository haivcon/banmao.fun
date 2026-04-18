"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther } from 'viem';
import "./defi.css";
import {
    Language,
    translations,
    getBrowserLanguage,
    LANGUAGES,
} from "../web3d/locals";
import { numberToWords, SupportLanguage } from "../web3d/locals/numberToWords";
import { LanguageSelector } from "./LanguageSelector";
import { SpotlightCard, StakingIcon, PoolIcon, FarmIcon, LendingIcon, BurnIcon, AirdropIcon, ServiceDetailModal } from "./components";

// Community Wallet Address (receives donated tokens)
const COMMUNITY_WALLET = "0x92809f2837f708163d375960063c8a3156fceacb";
// Dead Wallet — tokens sent here are permanently burned
const DEAD_WALLET = "0x000000000000000000000000000000000000dead";

// BANMAO Token Address on XLayer
const BANMAO_TOKEN_ADDRESS = '0x16d91d1615fc55b76d5f92365bd60c069b46ef78';
const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

// Staking contract — for TVL & staker count on stats bar
const STAKING_CONTRACT_ADDRESS = '0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172';
const STAKING_STATS_ABI = [
    {
        name: 'totalStaked',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'getTotalStakers',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

// Format large numbers compactly: 1234567 → "1.23M", 12345 → "12.3K"
const formatCompact = (value: bigint): string => {
    const num = Number(value) / 1e18;
    if (num === 0) return '0';
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return num.toFixed(2);
};

// DeFi Services configuration - uses i18n keys
const DEFI_SERVICES = [
    {
        id: "staking",
        nameKey: "defiStakingName",
        Icon: StakingIcon,
        descKey: "defiStakingDesc",
        href: "/defi/staking",
        stats: { apy: "Up to 75%", tvl: "" }, // TVL filled dynamically from on-chain
        color: "#a855f7",
        status: "live" as const,
        contractAddress: "0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172", // Staking Contract
        detailsKey: "defiStakingDetails" // Contract details explanation
    },
    {
        id: "burn",
        nameKey: "defiBurnName",
        Icon: BurnIcon,
        descKey: "defiBurnDesc",
        href: "/defi/burn",
        stats: { apy: "🔥", tvl: "—" },
        color: "#ef4444",
        status: "live" as const,
        contractAddress: COMMUNITY_WALLET,
        detailsKey: "defiBurnDetails"
    },
    {
        id: "airdrop",
        nameKey: "defiAirdropName",
        Icon: AirdropIcon,
        descKey: "defiAirdropDesc",
        href: "/defi/airdrop",
        stats: { apy: "🪂", tvl: "—" },
        color: "#f97316",
        status: "live" as const,
        contractAddress: "0xf2d471711D24646b2C50E1F74a063caA7a6863a0",
        detailsKey: "defiAirdropDetails"
    },
    {
        id: "pools",
        nameKey: "defiPoolsName",
        Icon: PoolIcon,
        descKey: "defiPoolsDesc",
        href: "#",
        stats: { apyKey: "defiComingSoon", tvl: "—" },
        color: "#06b6d4",
        status: "coming" as const,
        contractAddress: undefined,
    },
    {
        id: "farming",
        nameKey: "defiFarmingName",
        Icon: FarmIcon,
        descKey: "defiFarmingDesc",
        href: "#",
        stats: { apyKey: "defiComingSoon", tvl: "—" },
        color: "#22c55e",
        status: "coming" as const,
        contractAddress: undefined,
    },
    {
        id: "lending",
        nameKey: "defiLendingName",
        Icon: LendingIcon,
        descKey: "defiLendingDesc",
        href: "#",
        stats: { apyKey: "defiComingSoon", tvl: "—" },
        color: "#f59e0b",
        status: "coming" as const,
        contractAddress: undefined,
    },
];

// Format token amount for display
const formatTokenAmount = (value: bigint): string => {
    const num = Number(value) / 1e18;
    if (num === 0) return '0';
    if (num >= 1_000_000) return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
};

// Main DeFi Hub page
export default function DeFiPage() {
    const [lang, setLang] = useState<Language>("en");
    const { address, isConnected } = useAccount();

    // Feature toggle check
    const [defiEnabled, setDefiEnabled] = useState(true);
    const [checkingAccess, setCheckingAccess] = useState(true);

    // Auto-detect browser language on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Check for saved language preference first
            const savedLang = localStorage.getItem('banmao_language') as Language | null;
            if (savedLang && ['en', 'vi', 'zh', 'ko', 'ru', 'id'].includes(savedLang)) {
                setLang(savedLang);
            } else {
                // Fallback to browser language detection
                setLang(getBrowserLanguage());
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('DEFI_ENABLED');
            setDefiEnabled(saved !== 'false');
        }
        setCheckingAccess(false);
    }, []);

    // OKB native balance
    const { data: okbBalance, refetch: refetchOkb } = useBalance({
        address: address,
    });

    // BANMAO token balance
    const { data: banmaoBalance, refetch: refetchBanmao } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // Previous balances for animation
    const prevBanmaoRef = useRef<bigint>(BigInt(0));
    const [banmaoFlash, setBanmaoFlash] = useState<'up' | 'down' | null>(null);

    // Detect balance changes
    useEffect(() => {
        if (banmaoBalance !== undefined) {
            const current = banmaoBalance as bigint;
            const prev = prevBanmaoRef.current;
            if (prev > BigInt(0) && current !== prev) {
                setBanmaoFlash(current > prev ? 'up' : 'down');
                setTimeout(() => setBanmaoFlash(null), 1500);
            }
            prevBanmaoRef.current = current;
        }
    }, [banmaoBalance]);

    // Auto-refresh balances
    useEffect(() => {
        const interval = setInterval(() => {
            refetchBanmao();
            refetchOkb();
        }, 10000);
        return () => clearInterval(interval);
    }, [refetchBanmao, refetchOkb]);

    // ===== On-chain stats for Stats Overview Bar =====
    // TVL — total tokens staked in staking contract
    const { data: totalStakedRaw, refetch: refetchTotalStaked } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
        abi: STAKING_STATS_ABI,
        functionName: 'totalStaked',
    });

    // Total staker count
    const { data: totalStakersRaw, refetch: refetchTotalStakers } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS as `0x${string}`,
        abi: STAKING_STATS_ABI,
        functionName: 'getTotalStakers',
    });

    // Burned tokens = BANMAO balance sent to dead wallet (permanently destroyed)
    const { data: burnedBalanceRaw, refetch: refetchBurned } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [DEAD_WALLET as `0x${string}`],
    });

    // Airdrop Stats from API (Total Sent & Total Recipients)
    const [airdropStats, setAirdropStats] = useState<any>(null);

    useEffect(() => {
        const fetchAirdropStats = async () => {
            try {
                const res = await fetch('/api/airdrop-records?type=stats');
                const json = await res.json();
                if (json.success) setAirdropStats(json.data);
            } catch (e) {}
        };
        fetchAirdropStats();
        const interval = setInterval(fetchAirdropStats, 15000); // refresh every 15s along with others
        return () => clearInterval(interval);
    }, []);

    // Auto-refresh stats every 15s
    useEffect(() => {
        const interval = setInterval(() => {
            refetchTotalStaked();
            refetchTotalStakers();
            refetchBurned();
        }, 15000);
        return () => clearInterval(interval);
    }, [refetchTotalStaked, refetchTotalStakers, refetchBurned]);

    // Derived formatted values
    const tvlDisplay = totalStakedRaw ? formatCompact(totalStakedRaw as bigint) : '—';
    const stakersDisplay = totalStakersRaw ? Number(totalStakersRaw).toLocaleString() : '—';
    const burnedDisplay = burnedBalanceRaw ? formatCompact(burnedBalanceRaw as bigint) : '—';
    
    // Airdrop derived formatters
    const formatAirdropVal = (val: number) => {
        if (!val) return '0';
        if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B';
        if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + 'M';
        if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
        return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
    };
    const airdropSentDisplay = airdropStats ? formatAirdropVal(airdropStats.total_distributed) : '—';
    const airdropRecipientsDisplay = airdropStats ? Number(airdropStats.total_recipients).toLocaleString() : '—';

    // Modal state
    const [selectedService, setSelectedService] = useState<any>(null);

    // Translation function
    const t = useCallback((key: string): string => {
        return translations[lang]?.[key as keyof typeof translations[typeof lang]] ||
            translations.en[key as keyof typeof translations.en] ||
            key;
    }, [lang]);

    // Load language from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedLang = localStorage.getItem("banmao_language") as Language | null;
            if (savedLang && ["en", "vi", "zh", "ko", "ru", "id"].includes(savedLang)) {
                setLang(savedLang);
            } else {
                setLang(getBrowserLanguage());
            }
        }
    }, []);

    // Handle language change
    const handleChangeLang = useCallback((newLang: Language) => {
        setLang(newLang);
        localStorage.setItem("banmao_language", newLang);
    }, []);

    // Format OKB
    const formatOkb = (value: bigint | undefined) => {
        if (!value) return '0';
        const num = Number(formatEther(value));
        if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
        if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
        return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
    };

    // Show loading while checking access
    if (checkingAccess) {
        return (
            <div className="defi-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div style={{ color: '#fff', fontSize: '18px' }}>Loading...</div>
            </div>
        );
    }

    // Show disabled screen if DeFi is turned off
    if (!defiEnabled) {
        return (
            <div className="defi-page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '20px' }}>
                <div style={{ fontSize: '80px' }}>🚫</div>
                <h1 style={{ color: '#fff', fontSize: '28px', margin: 0 }}>
                    {t('defiDisabled')}
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '16px', textAlign: 'center', maxWidth: '400px' }}>
                    {t('defiDisabledDesc')}
                </p>
                <Link href="/" style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                    color: '#fff',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontWeight: 600
                }}>
                    ← {t('defiBackHome')}
                </Link>
            </div>
        );
    }

    return (
        <div className="defi-page">
            {/* Header */}
            <header className="defi-header">
                <div className="defi-title">
                    <span className="logo-emoji">💎</span>
                    <h1>{t('defiHub')}</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Wallet Balances */}
                    {isConnected && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div className={`balance-pill ${banmaoFlash ? `flash-${banmaoFlash}` : ''}`}>
                                <span className="balance-icon">🐱🍌</span>
                                <div className="balance-info-compact">
                                    <span className="balance-label">$banmao</span>
                                    <span className="balance-value">
                                        {formatTokenAmount(banmaoBalance as bigint || BigInt(0))}
                                    </span>
                                </div>
                            </div>
                            <div className="balance-pill">
                                <span className="balance-icon">💎</span>
                                <div className="balance-info-compact">
                                    <span className="balance-label">OKB</span>
                                    <span className="balance-value">
                                        {formatOkb(okbBalance?.value)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <ConnectButton
                        showBalance={false}
                        chainStatus="icon"
                        accountStatus="avatar"
                    />

                    {/* Language Selector - Portal-based */}
                    <LanguageSelector
                        currentLang={lang}
                        onChangeLang={handleChangeLang}
                    />

                    <Link href="/" className="back-button">
                        ← {t("gamefiBack")}
                    </Link>
                </div>
            </header>

            {/* Top Board: Inline Hero & Stats */}
            <div className="defi-top-board">
                <div className="defi-hero-inline">
                    <h2 className="shimmer-text">{t('defiExploreTitle')}</h2>
                    <p>{t('defiExploreSubtitle')}</p>
                </div>

                <div className="defi-stats-inline">
                    <div className="defi-stat-item">
                        <span className="defi-stat-item__label">TVL ({t('defiStakingName')})</span>
                        <span className="defi-stat-item__value">{tvlDisplay}</span>
                    </div>
                    <div className="defi-stat-item">
                        <span className="defi-stat-item__label">Stakers</span>
                        <span className="defi-stat-item__value">{stakersDisplay}</span>
                    </div>
                    <div className="defi-stat-item">
                        <span className="defi-stat-item__label">{t('stakingAPY')}</span>
                        <span className="defi-stat-item__value" style={{ color: '#4ade80' }}>Up to 75%</span>
                    </div>
                    <div className="defi-stat-item">
                        <span className="defi-stat-item__label">🔥 {t('defiBurnName')}</span>
                        <span className="defi-stat-item__value" style={{ color: '#ef4444' }}>{burnedDisplay}</span>
                    </div>
                </div>
            </div>



            {/* Live DeFi Services Grid (Bento) */}
            <div className="defi-services-grid">
                {DEFI_SERVICES.filter(s => s.status === 'live').map(service => (
                    <SpotlightCard
                        key={service.id}
                        onClick={() => setSelectedService({
                            id: service.id,
                            name: t(service.nameKey),
                            desc: t((service as any).detailsKey || service.descKey),
                            contractAddress: service.contractAddress,
                            stats: service.id === 'staking' ? [
                                { label: 'APY', value: service.stats.apy || t(service.stats.apyKey || 'defiComingSoon') },
                                { label: 'TVL', value: tvlDisplay }
                            ] : service.id === 'burn' ? [
                                { label: 'APY', value: '🔥' },
                                { label: 'BURNED', value: burnedDisplay }
                            ] : service.id === 'airdrop' ? [
                                { label: 'SENT', value: airdropSentDisplay },
                                { label: 'WALLETS', value: airdropRecipientsDisplay }
                            ] : [
                                { label: 'APY', value: service.stats.apy || t(service.stats.apyKey || 'defiComingSoon') },
                                { label: 'TVL', value: service.stats.tvl || '\u2014' }
                            ],
                            color: service.color,
                            Icon: service.Icon,
                            status: service.status,
                            href: service.href
                        })}
                        className={`defi-service-card ${service.id === 'staking' ? 'card-bento-featured' : ''}`}
                        spotlightColor={service.color}
                        style={{ '--service-color': service.color } as React.CSSProperties}
                    >
                        <div className="service-header">
                            <span className="service-icon-wrapper" style={{ color: service.color }}>
                                <service.Icon className="w-10 h-10" />
                            </span>
                            <span className="service-name">{t(service.nameKey)}</span>
                            <span className="live-badge">{t('defiLive')}</span>
                        </div>
                        <p className="service-description">{t(service.descKey)}</p>
                        <div className="service-stats">
                            <div className="service-stat">
                                <span className="stat-label">{service.id === 'airdrop' ? 'Sent' : t('stakingAPY')}</span>
                                <span className="stat-value">{service.id === 'airdrop' ? airdropSentDisplay : (service.stats.apy || t(service.stats.apyKey || 'defiComingSoon'))}</span>
                            </div>
                            <div className="service-stat">
                                <span className="stat-label">
                                    {service.id === 'burn' ? 'Burned' : service.id === 'airdrop' ? 'Wallets' : 'TVL'}
                                </span>
                                <span className="stat-value">
                                    {service.id === 'staking' ? tvlDisplay
                                        : service.id === 'burn' ? burnedDisplay
                                        : service.id === 'airdrop' ? airdropRecipientsDisplay
                                        : service.stats.tvl || '—'}
                                </span>
                            </div>
                        </div>
                        <Link
                            href={service.href}
                            className="service-cta"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {t('defiEnter')} {t(service.nameKey)} →
                        </Link>
                    </SpotlightCard>
                ))}
            </div>

            {/* Coming Soon DeFi Services Strip */}
            <div className="coming-soon-strip">
                {DEFI_SERVICES.filter(s => s.status === 'coming').map(service => (
                    <SpotlightCard
                        key={service.id}
                        onClick={() => setSelectedService({
                            id: service.id,
                            name: t(service.nameKey),
                            desc: t((service as any).detailsKey || service.descKey),
                            contractAddress: service.contractAddress,
                            stats: {
                                apy: service.stats.apy || t(service.stats.apyKey || 'defiComingSoon'),
                                tvl: service.stats.tvl
                            },
                            color: service.color,
                            Icon: service.Icon,
                            status: service.status,
                            href: service.href
                        })}
                        className="defi-service-card coming-soon"
                        spotlightColor={service.color}
                        style={{ '--service-color': service.color } as React.CSSProperties}
                    >
                        <div className="service-header">
                            <span className="service-icon-wrapper" style={{ color: service.color }}>
                                <service.Icon className="w-10 h-10" />
                            </span>
                            <span className="service-name">{t(service.nameKey)}</span>
                            <span className="coming-badge">{t('defiComingSoon')}</span>
                        </div>
                        <p className="service-description">{t(service.descKey)}</p>
                        <div className="service-stats">
                            <div className="service-stat">
                                <span className="stat-label">{t('stakingAPY')}</span>
                                <span className="stat-value">{t('defiComingSoon')}</span>
                            </div>
                            <div className="service-stat">
                                <span className="stat-label">TVL</span>
                                <span className="stat-value">—</span>
                            </div>
                        </div>
                    </SpotlightCard>
                ))}
            </div>

            {/* Footer */}
            <footer className="defi-footer">
                <div className="defi-footer__links">
                    <a href="https://t.me/banmao_X" target="_blank" rel="noopener noreferrer" className="footer-pill">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                        Telegram
                    </a>
                    <a href="https://x.com/banmao_X" target="_blank" rel="noopener noreferrer" className="footer-pill">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/></svg>
                        Twitter/X
                    </a>
                    <a href="https://web3.okx.com/token/x-layer/0x16d91d1615fc55b76d5f92365bd60c069b46ef78" target="_blank" rel="noopener noreferrer" className="footer-pill">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                        Buy $BANMAO
                    </a>
                    <Link href="/gamefi" className="footer-pill">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>
                        GameFi Hub
                    </Link>
                </div>
                <div className="defi-footer__divider" />
                <p>BANMAO DeFi — Powered by XLayer 🐱</p>
            </footer>

            {/* Service Detail Modal */}
            <ServiceDetailModal
                isOpen={!!selectedService}
                onClose={() => setSelectedService(null)}
                service={selectedService}
                enterAppLabel={t('defiEnter')}
                comingSoonLabel={t('defiComingSoon')}
            />

            {/* Scanlines effect */}
            <div className="scanlines" />
        </div>
    );
}
