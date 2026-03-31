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

// Community Wallet Address
const COMMUNITY_WALLET = "0x92809f2837f708163d375960063c8a3156fceacb";

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

// DeFi Services configuration - uses i18n keys
const DEFI_SERVICES = [
    {
        id: "staking",
        nameKey: "defiStakingName",
        Icon: StakingIcon,
        descKey: "defiStakingDesc",
        href: "/defi/staking",
        stats: { apy: "Up to 75%", tvl: "125M+" },
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

            {/* Hero Section */}
            <div className="defi-hero">
                <h2 className="glitch-text" data-text={t('defiExploreTitle')}>{t('defiExploreTitle')}</h2>
                <p>{t('defiExploreSubtitle')}</p>
            </div>



            {/* DeFi Services Grid */}
            <div className="defi-services-grid">
                {DEFI_SERVICES.map(service => (
                    <SpotlightCard
                        key={service.id}
                        onClick={() => setSelectedService({
                            id: service.id,
                            name: t(service.nameKey),
                            desc: t((service as any).detailsKey || service.descKey), // Use detailed description if available
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
                        className={`defi-service-card ${service.status === 'coming' ? 'coming-soon' : ''}`}
                        spotlightColor={service.color}
                        style={{ '--service-color': service.color } as React.CSSProperties}
                    >
                        <div className="service-header">
                            <span className="service-icon-wrapper" style={{ color: service.color }}>
                                <service.Icon className="w-10 h-10" />
                            </span>
                            <span className="service-name">{t(service.nameKey)}</span>
                            {service.status === 'coming' && (
                                <span className="coming-badge">{t('defiComingSoon')}</span>
                            )}
                            {service.status === 'live' && (
                                <span className="live-badge">{t('defiLive')}</span>
                            )}
                        </div>
                        <p className="service-description">{t(service.descKey)}</p>
                        <div className="service-stats">
                            <div className="service-stat">
                                <span className="stat-label">{t('stakingAPY')}</span>
                                <span className="stat-value">{service.stats.apy || t(service.stats.apyKey || 'defiComingSoon')}</span>
                            </div>
                            <div className="service-stat">
                                <span className="stat-label">TVL</span>
                                <span className="stat-value">{service.stats.tvl}</span>
                            </div>
                        </div>
                        {service.status === 'live' && (
                            <Link
                                href={service.href}
                                className="service-cta"
                                onClick={(e) => e.stopPropagation()} /* Stop propagation to prevent modal open */
                            >
                                {t('defiEnter')} {t(service.nameKey)} →
                            </Link>
                        )}
                    </SpotlightCard>
                ))}
            </div>

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
