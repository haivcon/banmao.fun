"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther, formatEther } from "viem";
import { Rocket, GraduationCap, Flame, BarChart3, Search, Activity, Sun, Moon, Globe, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, UploadCloud, X } from "lucide-react";
import "./launchpad.css";
import { useTranslation } from "./i18n/I18nContext";
import { useTheme } from "./theme/ThemeContext";
import {
    LAUNCHPAD_ADDRESS,
    LAUNCHPAD_ABI,
    BANMAO_TOKEN_ADDRESS,
    ERC20_ABI,
    CREATION_FEE,
    GRADUATION_THRESHOLD,
    IS_LAUNCHPAD_CONFIGURED,
} from "./contracts";

// ============ Types ============
interface TokenInfo {
    tokenAddress: string;
    creator: string;
    name: string;
    symbol: string;
    description: string;
    imageUrl: string;
    virtualOkbReserve: bigint;
    virtualTokenReserve: bigint;
    realOkbReserve: bigint;
    realTokenReserve: bigint;
    graduated: boolean;
    createdAt: bigint;
}

// ============ Helpers ============
const formatOkb = (wei: bigint): string => {
    const num = Number(formatEther(wei));
    if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
    if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 3 });
    if (num >= 0.001) return num.toLocaleString(undefined, { maximumFractionDigits: 5 });
    return num.toExponential(2);
};

const formatTokenAmount = (wei: bigint): string => {
    const num = Number(formatEther(wei));
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const timeAgo = (timestamp: bigint): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - Number(timestamp);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
};

const getGradPercent = (realOkb: bigint): number => {
    const pct = (Number(realOkb) / Number(GRADUATION_THRESHOLD)) * 100;
    return Math.min(pct, 100);
};

// ============ Header Components ============
function TopNav() {
    const { t, language, setLanguage } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const [langMenuOpen, setLangMenuOpen] = useState(false);

    const languages = [
        { code: "en", label: "English" },
        { code: "vi", label: "Tiếng Việt" },
        { code: "zh", label: "中文" },
        { code: "ko", label: "한국어" },
        { code: "ja", label: "日本語" },
    ] as const;

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (langMenuOpen && !(e.target as Element).closest('.lang-dropdown')) {
                setLangMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [langMenuOpen]);

    return (
        <header className="launchpad-header">
            <Link href="/defi/launchpad" className="launchpad-title">
                <Rocket size={24} className="text-orange-500" />
                <h1>{t("launchpadTitle")}</h1>
            </Link>
            
            <div className="header-actions">
                <div className="dropdown-container lang-dropdown">
                    <button 
                        className="icon-button"
                        onClick={() => setLangMenuOpen(!langMenuOpen)}
                        title="Switch language"
                    >
                        <Globe size={18} />
                        <span style={{ fontSize: '12px', marginLeft: '4px', fontWeight: 600 }}>
                            {language.toUpperCase()}
                        </span>
                    </button>
                    
                    <div className={`dropdown-menu ${langMenuOpen ? 'open' : ''}`}>
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                className={`dropdown-item ${language === lang.code ? 'active' : ''}`}
                                onClick={() => {
                                    setLanguage(lang.code);
                                    setLangMenuOpen(false);
                                }}
                            >
                                <span>{lang.label}</span>
                                {language === lang.code && <CheckCircle2 size={16} />}
                            </button>
                        ))}
                    </div>
                </div>
                
                <button className="icon-button" onClick={toggleTheme}>
                    {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
                
                <Link href="/defi" className="icon-button" title="Back to DeFi Hub">
                    <ArrowLeft size={18} />
                </Link>
            </div>
        </header>
    );
}

// ============ Token Card Component ============
function TokenCard({ token }: { token: TokenInfo }) {
    const { t } = useTranslation();
    const gradPct = getGradPercent(token.realOkbReserve);
    const price = token.virtualTokenReserve > 0n
        ? Number(token.virtualOkbReserve) / Number(token.virtualTokenReserve)
        : 0;

    return (
        <Link href={`/defi/launchpad/${token.tokenAddress}`} style={{ textDecoration: "none" }}>
            <div className="token-card">
                <div className="token-card-header">
                    <div className="token-avatar">
                        {token.imageUrl ? (
                            <Image
                                src={token.imageUrl}
                                alt={token.symbol}
                                width={56}
                                height={56}
                                unoptimized
                            />
                        ) : (
                            token.symbol.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="token-info">
                        <div className="token-name">{token.name}</div>
                        <div className="token-symbol">${token.symbol}</div>
                    </div>
                    <div className="token-age">{timeAgo(token.createdAt)}</div>
                </div>

                {token.description && (
                    <div className="token-card-desc">{token.description}</div>
                )}

                <div className="token-card-stats">
                    <div className="token-stat">
                        <span className="token-stat-label">{t("price")}</span>
                        <span className="token-stat-value">
                            {price > 0 ? price.toExponential(2) : "0"} OKB
                        </span>
                    </div>
                    <div className="token-stat">
                        <span className="token-stat-label">{t("marketCap")}</span>
                        <span className="token-stat-value">
                            {formatOkb(token.realOkbReserve)} OKB
                        </span>
                    </div>
                </div>

                {token.graduated ? (
                    <div className="graduated-badge">
                        <GraduationCap size={16} />
                        {t("graduatedBadge")}
                    </div>
                ) : (
                    <>
                        <div className="graduation-bar">
                            <div
                                className="graduation-fill"
                                style={{ width: `${gradPct}%` }}
                            />
                        </div>
                        <div className="graduation-text">
                            <span>{t("graduation")}</span>
                            <span className="grad-pct">{gradPct.toFixed(1)}%</span>
                        </div>
                    </>
                )}
            </div>
        </Link>
    );
}

// ============ Create Token Form ============
function CreateTokenForm({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
    const { t } = useTranslation();
    const { address, isConnected } = useAccount();
    const [name, setName] = useState("");
    const [symbol, setSymbol] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [step, setStep] = useState<"idle" | "approving" | "creating" | "done">("idle");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imageError, setImageError] = useState("");

    const { data: creationFee } = useReadContract({
        address: LAUNCHPAD_ADDRESS,
        abi: LAUNCHPAD_ABI,
        functionName: "creationFee",
        query: { enabled: IS_LAUNCHPAD_CONFIGURED },
    });
    const requiredCreationFee = (creationFee as bigint | undefined) ?? CREATION_FEE;

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, LAUNCHPAD_ADDRESS as `0x${string}`] : undefined,
    });

    const { data: banmaoBalance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });

    const { writeContract: approve, data: approveTxHash } = useWriteContract();
    const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });

    const { writeContract: createToken, data: createTxHash } = useWriteContract();
    const { isSuccess: createConfirmed } = useWaitForTransactionReceipt({ hash: createTxHash });

    useEffect(() => {
        if (approveConfirmed && step === "approving") {
            refetchAllowance();
            setStep("idle");
        }
    }, [approveConfirmed, step, refetchAllowance]);

    useEffect(() => {
        if (createConfirmed && step === "creating") {
            setStep("done");
            setName("");
            setSymbol("");
            setDescription("");
            setImageUrl("");
            onSuccess();
            setTimeout(() => {
                setStep("idle");
                onCancel();
            }, 3000);
        }
    }, [createConfirmed, step, onSuccess, onCancel]);

    const needsApproval = !allowance || (allowance as bigint) < requiredCreationFee;
    const hasBalance = banmaoBalance && (banmaoBalance as bigint) >= requiredCreationFee;
    const canCreate = name.trim() && symbol.trim() && isConnected && hasBalance && !uploadingImage && IS_LAUNCHPAD_CONFIGURED;

    const handleSubmit = () => {
        if (!canCreate || imageUrl.length > 256 || imageUrl.startsWith("data:")) return;

        if (needsApproval) {
            setStep("approving");
            approve({
                address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [LAUNCHPAD_ADDRESS, requiredCreationFee],
            } as any);
            return;
        }

        setStep("creating");
        createToken({
            address: LAUNCHPAD_ADDRESS as `0x${string}`,
            abi: LAUNCHPAD_ABI,
            functionName: "createToken",
            args: [name, symbol.toUpperCase(), description, imageUrl],
        } as any);
    };

    // Handle File Upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImageError("");
        setUploadingImage(true);
        try {
            const body = new FormData();
            body.append("file", file);
            const response = await fetch("/api/launchpad/upload", { method: "POST", body });
            const result = await response.json();
            if (!response.ok || !result.imageUrl) throw new Error(result.error ?? "Upload failed");
            setImageUrl(result.imageUrl);
        } catch (error) {
            setImageError(error instanceof Error ? error.message : "Image upload failed");
        } finally {
            setUploadingImage(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--lp-border)' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '20px' }}>
                        <Rocket size={24} className="text-orange-500" />
                        {t("createTokenTitle")}
                    </h2>
                    <button onClick={onCancel} className="icon-button">✕</button>
                </div>
                
                <div className="modal-body">
                    <div className="form-grid">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>{t("tokenName")}</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="e.g., Pepe 2.0"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={32}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>{t("tokenSymbol")}</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="e.g., PEPE2"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                maxLength={10}
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
                            <label>{t("description")}</label>
                            <textarea
                                className="form-textarea"
                                placeholder="What makes this coin special?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={200}
                                style={{ minHeight: '80px' }}
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: "1 / -1", marginBottom: 0 }}>
                            <label>{t("imageUrl")} / Upload</label>
                            {imageUrl ? (
                                <div className="file-upload-area has-image">
                                    <Image
                                        src={imageUrl}
                                        alt="Preview"
                                        className="file-preview"
                                        width={720}
                                        height={120}
                                        unoptimized
                                    />
                                    <button 
                                        className="file-remove" 
                                        onClick={(e) => { e.stopPropagation(); setImageUrl(""); }}
                                        title="Remove image"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <label className="file-upload-area">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleImageUpload} 
                                        style={{ display: 'none' }} 
                                    />
                                    <UploadCloud size={32} className="text-orange-500" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
                                    <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600 }}>{t("uploadImage")}</p>
                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--lp-text-tertiary)' }}>{t("orPasteUrl")}</p>
                                </label>
                            )}
                            
                            {!imageUrl && (
                                <input
                                    className="form-input"
                                    style={{ marginTop: '8px' }}
                                    type="text"
                                    placeholder="https://... or IPFS link"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                />
                            )}
                        </div>
                        {imageError && <p style={{ color: "var(--lp-danger)", fontSize: "12px", margin: "8px 0 0" }}>{imageError}</p>}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--lp-border)' }}>
                        <div style={{ fontSize: '14px', color: 'var(--lp-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Globe size={16} />
                            {t("feeInfo")}: {formatEther(requiredCreationFee)} $BANMAO
                        </div>
                        
                        {!isConnected ? (
                            <ConnectButton />
                        ) : (
                            <button
                                className="action-btn"
                                style={{ width: 'auto', padding: '12px 24px', margin: 0 }}
                                onClick={handleSubmit}
                                disabled={!canCreate || step === "approving" || step === "creating"}
                            >
                                {step === "approving" ? <><Loader2 size={18} className="animate-spin" /> {t("approving")}</> :
                                 step === "creating" ? <><Loader2 size={18} className="animate-spin" /> {t("creating")}</> :
                                 step === "done" ? <><CheckCircle2 size={18} /> {t("done")}</> :
                                 needsApproval ? <><CheckCircle2 size={18} /> {t("approveFee")}</> :
                                 <><Rocket size={18} /> {t("createAndBuy")}</>}
                            </button>
                        )}
                    </div>
                    
                    {!hasBalance && isConnected && (
                        <div style={{ color: "var(--lp-danger)", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px", marginTop: "12px" }}>
                            <AlertTriangle size={16} /> {t("insufficientBalance")}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============ Main Page ============
export default function LaunchpadPage() {
    const { t } = useTranslation();
    const [showCreate, setShowCreate] = useState(false);
    const [filter, setFilter] = useState<"all" | "trending" | "graduating" | "graduated">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [pageSize, setPageSize] = useState(20);

    const { data: totalTokens, refetch: refetchTotal } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`,
        abi: LAUNCHPAD_ABI,
        functionName: "totalTokens",
        query: { enabled: IS_LAUNCHPAD_CONFIGURED },
    });

    const { data: tokenAddresses, refetch: refetchAddresses } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`,
        abi: LAUNCHPAD_ABI,
        functionName: "getTokensPaginated",
        args: [BigInt(0), BigInt(pageSize)],
        query: { enabled: IS_LAUNCHPAD_CONFIGURED },
    });

    const statisticsContracts = [
        {
            address: LAUNCHPAD_ADDRESS as `0x${string}`,
            abi: LAUNCHPAD_ABI,
            functionName: "activeTokenCount",
        },
        {
            address: LAUNCHPAD_ADDRESS as `0x${string}`,
            abi: LAUNCHPAD_ABI,
            functionName: "graduatedTokenCount",
        },
        {
            address: LAUNCHPAD_ADDRESS as `0x${string}`,
            abi: LAUNCHPAD_ABI,
            functionName: "totalCurveVolume",
        },
    ] as const;

    const { data: statistics, refetch: refetchStatistics } = useReadContracts({
        contracts: statisticsContracts,
        query: { enabled: IS_LAUNCHPAD_CONFIGURED },
    } as any);

    // Build multicall contracts array for fetching all token infos
    const tokenInfoContracts = useMemo(() => {
        const addrs = tokenAddresses as string[] | undefined;
        if (!addrs || addrs.length === 0) return [];
        return addrs.map((addr) => ({
            address: LAUNCHPAD_ADDRESS as `0x${string}`,
            abi: LAUNCHPAD_ABI,
            functionName: "getTokenInfo" as const,
            args: [addr as `0x${string}`],
        }));
    }, [tokenAddresses]);

    const { data: tokenInfoResults, isLoading: loading } = useReadContracts({
        contracts: tokenInfoContracts,
        query: { enabled: tokenInfoContracts.length > 0 },
    } as any);

    // Parse multicall results into TokenInfo[]
    const tokens: TokenInfo[] = useMemo(() => {
        if (!tokenInfoResults) return [];
        return tokenInfoResults
            .filter((r) => r.status === "success" && r.result)
            .map((r) => {
                const d = r.result as any;
                return {
                    tokenAddress: d.tokenAddress,
                    creator: d.creator,
                    name: d.name,
                    symbol: d.symbol,
                    description: d.description,
                    imageUrl: d.imageUrl,
                    virtualOkbReserve: d.virtualOkbReserve,
                    virtualTokenReserve: d.virtualTokenReserve,
                    realOkbReserve: d.realOkbReserve,
                    realTokenReserve: d.realTokenReserve,
                    graduated: d.graduated,
                    createdAt: d.createdAt,
                } as TokenInfo;
            });
    }, [tokenInfoResults]);

    // Auto-refresh
    useEffect(() => {
        const interval = setInterval(() => {
            refetchTotal();
            refetchAddresses();
            refetchStatistics();
        }, 10000);
        return () => clearInterval(interval);
    }, [refetchTotal, refetchAddresses, refetchStatistics]);

    const handleCreateSuccess = () => {
        refetchTotal();
        refetchAddresses();
        refetchStatistics();
    };

    // Filter + Search
    const filteredTokens = tokens.filter((tk) => {
        // Filter by category
        if (filter === "graduated" && !tk.graduated) return false;
        if (filter === "graduating" && (tk.graduated || getGradPercent(tk.realOkbReserve) <= 50)) return false;
        if (filter === "trending" && tk.graduated) return false;

        // Search by name, symbol, or address
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return (
                tk.name.toLowerCase().includes(q) ||
                tk.symbol.toLowerCase().includes(q) ||
                tk.tokenAddress.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const totalCount = totalTokens ? Number(totalTokens) : 0;
    const activeCount = Number((statistics?.[0]?.result as bigint | undefined) ?? 0n);
    const graduatedCount = Number((statistics?.[1]?.result as bigint | undefined) ?? 0n);
    const totalVolume = Number(formatEther((statistics?.[2]?.result as bigint | undefined) ?? 0n));

    return (
        <div className="launchpad-page">
            <TopNav />

            {/* Stats Bar */}
            <div className="launchpad-stats-bar">
                <div className="stat-item">
                    <div className="stat-icon"><BarChart3 size={20} /></div>
                    <div className="stat-content">
                        <span className="stat-label">{t("totalTokens")}</span>
                        <span className="stat-value">{totalCount}</span>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon"><Flame size={20} /></div>
                    <div className="stat-content">
                        <span className="stat-label">{t("activeTokens")}</span>
                        <span className="stat-value">{activeCount}</span>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon"><GraduationCap size={20} /></div>
                    <div className="stat-content">
                        <span className="stat-label">{t("graduated")}</span>
                        <span className="stat-value">{graduatedCount}</span>
                    </div>
                </div>
                <div className="stat-item">
                    <div className="stat-icon"><Activity size={20} /></div>
                    <div className="stat-content">
                        <span className="stat-label">{t("totalVolume")}</span>
                        <span className="stat-value">{totalVolume.toFixed(1)} OKB</span>
                    </div>
                </div>
            </div>

            <div className="launchpad-content" style={{ gridTemplateColumns: '1fr', maxWidth: '1200px' }}>
                {!IS_LAUNCHPAD_CONFIGURED && (
                    <div style={{ padding: "12px 16px", border: "1px solid var(--lp-danger)", color: "var(--lp-danger)", borderRadius: "6px", marginBottom: "20px" }}>
                        Launchpad is not configured for this environment.
                    </div>
                )}
                
                {/* Search & Action Bar */}
                <div className="search-filter-bar">
                    <div className="search-input-wrapper">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            className="search-input"
                            placeholder={t("searchPlaceholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button 
                        className="action-btn"
                        style={{ width: 'auto', margin: 0, padding: '0 24px' }}
                        onClick={() => setShowCreate(!showCreate)}
                    >
                        {showCreate ? t("cancel") : <><Rocket size={18} /> {t("startToken")}</>}
                    </button>
                </div>

                {/* Filters */}
                <div className="filter-group" style={{ marginBottom: '24px', display: 'inline-flex' }}>
                    {(["all", "trending", "graduating", "graduated"] as const).map((f) => (
                        <button
                            key={f}
                            className={`filter-btn ${filter === f ? "active" : ""}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === "all" ? t("sortNewest") :
                             f === "trending" ? <><Flame size={16} /> {t("activeTokens")}</> :
                             f === "graduating" ? <><Activity size={16} /> {t("sortGraduation")}</> :
                             <><GraduationCap size={16} /> {t("graduated")}</>}
                        </button>
                    ))}
                </div>

                {/* Create Form */}
                {showCreate && <CreateTokenForm onSuccess={handleCreateSuccess} onCancel={() => setShowCreate(false)} />}

                {/* Token Grid */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0', color: 'var(--lp-brand-primary)' }}>
                        <Loader2 size={32} className="animate-spin" />
                    </div>
                ) : filteredTokens.length > 0 ? (
                    <div className="token-grid">
                        {filteredTokens.map((token) => (
                            <TokenCard key={token.tokenAddress} token={token} />
                        ))}
                    </div>
                ) : (
                    <div className="glass-panel" style={{ padding: '64px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Search size={48} style={{ color: 'var(--lp-text-tertiary)', marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>
                            {totalCount === 0 ? t("noTokensYet") : t("noMatch")}
                        </h3>
                        <p style={{ color: 'var(--lp-text-secondary)' }}>
                            {totalCount === 0 ? t("beTheFirst") : t("tryDifferent")}
                        </p>
                    </div>
                )}

                {/* Load More */}
                {!loading && totalCount > 0 && (tokenAddresses as string[] | undefined)?.length === pageSize && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                        <button
                            className="action-btn"
                            style={{ width: 'auto', padding: '12px 32px', margin: 0, background: 'var(--lp-btn-bg)', color: 'var(--lp-text-primary)', boxShadow: 'none', border: '1px solid var(--lp-border)' }}
                            onClick={() => setPageSize((prev) => prev + 20)}
                        >
                            Load More...
                        </button>
                    </div>
                )}
            </div>
            
            <footer style={{ textAlign: "center", padding: "40px 24px", color: "var(--lp-text-tertiary)", fontSize: "12px" }}>
                <p>BANMAO Launchpad — Powered by Uniswap V4 on XLayer</p>
                <p style={{ marginTop: "4px" }}>Bonding curve trading • Auto-graduation to Uniswap V4 Pool</p>
            </footer>
        </div>
    );
}
