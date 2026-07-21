"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "../../../components/wallet/WalletConnection";
import { parseEther, formatEther } from "viem";
import { Rocket, ArrowLeft, Loader2, Target, CheckCircle2, AlertTriangle, ExternalLink, Activity, Briefcase, GraduationCap, ClipboardList } from "lucide-react";
import "../launchpad.css";
import { useTranslation } from "../i18n/I18nContext";
import { PriceChart, TradeHistory, useTokenTrades } from "../components";
import {
    LAUNCHPAD_ADDRESS,
    LAUNCHPAD_ABI,
    BANMAO_TOKEN_ADDRESS,
    ERC20_ABI,
    GRADUATION_THRESHOLD,
    IS_LAUNCHPAD_CONFIGURED,
    WOKB_ADDRESS,
} from "../contracts";

// ============ Helpers ============
const formatPrice = (virtualOkb: bigint, virtualToken: bigint): string => {
    if (virtualToken === 0n) return "0";
    const price = Number(virtualOkb) / Number(virtualToken);
    if (price >= 0.01) return price.toFixed(4);
    return price.toExponential(3);
};

const formatOkb = (wei: bigint): string => {
    const num = Number(formatEther(wei));
    if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
    if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
    return num.toFixed(6);
};

const formatTokens = (wei: bigint): string => {
    const num = Number(formatEther(wei));
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const shortenAddr = (addr: string): string => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const parseAmount = (value: string): bigint => {
    try {
        return value ? parseEther(value) : 0n;
    } catch {
        return 0n;
    }
};

const timeAgo = (ts: number): string => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

export default function TokenDetailPage() {
    const { t } = useTranslation();
    const params = useParams();
    const tokenAddress = params?.address as string;
    const { address: userAddress, isConnected } = useAccount();

    const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
    const [buyAmount, setBuyAmount] = useState("");
    const [sellAmount, setSellAmount] = useState("");
    const [txStep, setTxStep] = useState<"idle" | "pending" | "done" | "error">("idle");

    // Trade history + live feed
    const trades = useTokenTrades(tokenAddress);

    // ===== On-chain reads =====
    const { data: tokenInfoRaw, refetch: refetchInfo } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`,
        abi: LAUNCHPAD_ABI,
        functionName: "getTokenInfo",
        args: [tokenAddress as `0x${string}`],
    });

    const { data: currentPrice, refetch: refetchPrice } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`,
        abi: LAUNCHPAD_ABI,
        functionName: "getCurrentPrice",
        args: [tokenAddress as `0x${string}`],
    });

    const { data: gradProgress, refetch: refetchProgress } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`,
        abi: LAUNCHPAD_ABI,
        functionName: "getGraduationProgress",
        args: [tokenAddress as `0x${string}`],
    });

    const { data: liquidityMigrated, refetch: refetchMigration } = useReadContract({
        address: LAUNCHPAD_ADDRESS,
        abi: LAUNCHPAD_ABI,
        functionName: "liquidityMigrated",
        args: [tokenAddress as `0x${string}`],
        query: { enabled: IS_LAUNCHPAD_CONFIGURED && Boolean(tokenAddress) },
    });

    // Buy quote
    const buyAmountWei = parseAmount(buyAmount);
    const { data: buyQuote } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`,
        abi: LAUNCHPAD_ABI,
        functionName: "getBuyQuote",
        args: [tokenAddress as `0x${string}`, buyAmountWei],
        query: { enabled: buyAmountWei > 0n },
    });

    // Sell quote
    const sellAmountWei = parseAmount(sellAmount);
    const { data: sellQuote } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`,
        abi: LAUNCHPAD_ABI,
        functionName: "getSellQuote",
        args: [tokenAddress as `0x${string}`, sellAmountWei],
        query: { enabled: sellAmountWei > 0n },
    });

    // User's OKB balance
    const { data: okbBalance } = useBalance({ address: userAddress });

    // User's token balance
    const { data: userTokenBalance, refetch: refetchTokenBalance } = useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: userAddress ? [userAddress] : undefined,
    });

    // Token allowance for sell
    const { data: tokenAllowance, refetch: refetchAllowance } = useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: userAddress ? [userAddress, LAUNCHPAD_ADDRESS as `0x${string}`] : undefined,
    });

    // ===== Write contracts =====
    const { writeContract: buyTokens, data: buyTxHash } = useWriteContract();
    const { isSuccess: buyConfirmed, isError: buyFailed } = useWaitForTransactionReceipt({ hash: buyTxHash });

    const { writeContract: sellTokens, data: sellTxHash } = useWriteContract();
    const { isSuccess: sellConfirmed, isError: sellFailed } = useWaitForTransactionReceipt({ hash: sellTxHash });

    const { writeContract: approveToken, data: approveTxHash } = useWriteContract();
    const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTxHash });

    const { writeContract: migrateLiquidity, data: migrateTxHash } = useWriteContract();
    const { isSuccess: migrateConfirmed, isError: migrateFailed } = useWaitForTransactionReceipt({ hash: migrateTxHash });

    // Handle tx confirmations
    useEffect(() => {
        if (buyConfirmed || sellConfirmed || migrateConfirmed) {
            setTxStep("done");
            setBuyAmount("");
            setSellAmount("");
            refetchInfo();
            refetchPrice();
            refetchProgress();
            refetchTokenBalance();
            refetchMigration();
            setTimeout(() => setTxStep("idle"), 3000);
        }
        if (buyFailed || sellFailed || migrateFailed) {
            setTxStep("error");
            setTimeout(() => setTxStep("idle"), 3000);
        }
    }, [buyConfirmed, sellConfirmed, migrateConfirmed, buyFailed, sellFailed, migrateFailed, refetchInfo, refetchPrice, refetchProgress, refetchTokenBalance, refetchMigration]);

    useEffect(() => {
        if (approveConfirmed) refetchAllowance();
    }, [approveConfirmed, refetchAllowance]);

    // Auto-refresh
    useEffect(() => {
        const interval = setInterval(() => {
            refetchInfo();
            refetchPrice();
            refetchProgress();
            refetchTokenBalance();
            refetchMigration();
        }, 8000);
        return () => clearInterval(interval);
    }, [refetchInfo, refetchPrice, refetchProgress, refetchTokenBalance, refetchMigration]);

    // Parse token info
    const tokenInfo = tokenInfoRaw as any;
    const isLoaded = tokenInfo && tokenInfo.tokenAddress !== "0x0000000000000000000000000000000000000000";
    const isMigrated = Boolean(liquidityMigrated);
    const gradPct = gradProgress ? Number(gradProgress) / 100 : 0;

    // Sell needs approval
    const needsSellApproval = sellAmountWei > 0n && tokenAllowance != null && (tokenAllowance as bigint) < sellAmountWei;

    const handleBuy = () => {
        if (!buyAmount || buyAmountWei === 0n) return;
        const buyQuoteData = buyQuote as [bigint, bigint] | undefined;
        const minOut = buyQuoteData ? (buyQuoteData[0] * 98n) / 100n : 0n;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
        setTxStep("pending");
        buyTokens({
            address: LAUNCHPAD_ADDRESS as `0x${string}`,
            abi: LAUNCHPAD_ABI,
            functionName: "buyTokens",
            args: [tokenAddress as `0x${string}`, minOut, deadline],
            value: buyAmountWei,
        } as any);
    };

    const handleSell = () => {
        if (!sellAmount || sellAmountWei === 0n) return;

        if (needsSellApproval) {
            setTxStep("pending");
            // Approve max so user doesn't need to re-approve for different amounts
            const maxUint256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            approveToken({
                address: tokenAddress as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [LAUNCHPAD_ADDRESS as `0x${string}`, maxUint256],
            } as any);
            return;
        }

        const minOut = sellQuote ? ((sellQuote as bigint) * 98n) / 100n : 0n;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
        setTxStep("pending");
        sellTokens({
            address: LAUNCHPAD_ADDRESS as `0x${string}`,
            abi: LAUNCHPAD_ABI,
            functionName: "sellTokens",
            args: [tokenAddress as `0x${string}`, sellAmountWei, minOut, deadline],
        } as any);
    };

    const handleMigrate = () => {
        if (!tokenInfo?.graduated || isMigrated) return;
        setTxStep("pending");
        migrateLiquidity({
            address: LAUNCHPAD_ADDRESS,
            abi: LAUNCHPAD_ABI,
            functionName: "migrateLiquidity",
            args: [tokenAddress as `0x${string}`],
        } as any);
    };

    if (!isLoaded) {
        return (
            <div className="launchpad-page">
                <header className="launchpad-header">
                    <div className="launchpad-title">
                        <Rocket size={24} className="text-orange-500" />
                        <h1>{t("tokenDetail")}</h1>
                    </div>
                    <div className="header-actions">
                        <Link href="/defi/launchpad" className="back-button">
                            <ArrowLeft size={16} /> {t("goBack")}
                        </Link>
                    </div>
                </header>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--lp-brand-primary)' }}>
                    <Loader2 size={48} className="animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="launchpad-page">
            {/* Header */}
            <header className="launchpad-header">
                <div className="launchpad-title">
                    <Rocket size={24} className="text-orange-500" />
                    <h1>{t("tokenDetail")}</h1>
                </div>
                <div className="header-actions">
                    <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
                    <Link href="/defi/launchpad" className="back-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowLeft size={16} /> {t("goBack")}
                    </Link>
                </div>
            </header>

            <div className="launchpad-content" style={{ maxWidth: '1100px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '32px' }} className="token-detail-grid">
                    {/* Left: Token Info + Chart */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Hero */}
                        <div className="glass-panel" style={{ padding: '32px', display: 'flex', gap: '24px', alignItems: 'center' }}>
                            <div className="token-avatar" style={{ width: '80px', height: '80px', fontSize: '32px' }}>
                                {tokenInfo.imageUrl ? (
                                    <img src={tokenInfo.imageUrl} alt={tokenInfo.symbol} />
                                ) : (
                                    tokenInfo.symbol?.charAt(0) || "?"
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h1 style={{ margin: '0 0 4px', fontSize: '28px', color: 'var(--lp-text-primary)' }}>
                                    {tokenInfo.name}
                                </h1>
                                <span style={{ color: 'var(--lp-brand-primary)', fontWeight: 600, fontSize: '18px' }}>
                                    ${tokenInfo.symbol}
                                </span>
                                {tokenInfo.graduated && (
                                    <div className="graduated-badge" style={{ marginTop: "12px", width: "max-content", padding: "6px 12px" }}>
                                        <CheckCircle2 size={16} /> {t("graduatedBadge")}
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', color: 'var(--lp-text-secondary)', marginBottom: '4px' }}>{t("price")}</div>
                                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--lp-text-primary)' }}>
                                    {isMigrated ? "DEX" : <>{formatPrice(tokenInfo.virtualOkbReserve, tokenInfo.virtualTokenReserve)} <span style={{ fontSize: '16px', color: 'var(--lp-text-tertiary)' }}>OKB</span></>}
                                </div>
                            </div>
                        </div>

                        {/* Graduation Progress */}
                        {!tokenInfo.graduated && (
                            <div className="glass-panel" style={{ padding: '24px' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px', fontSize: '18px' }}>
                                    <Target size={20} className="text-orange-500" /> {t("graduation")}
                                </h3>
                                <div className="graduation-bar" style={{ height: "12px", marginBottom: "12px", borderRadius: "6px" }}>
                                    <div className="graduation-fill" style={{ width: `${gradPct}%`, borderRadius: "6px" }} />
                                </div>
                                <div className="graduation-text" style={{ fontSize: "14px" }}>
                                    <span>{formatOkb(tokenInfo.realOkbReserve)} / {formatOkb(GRADUATION_THRESHOLD)} OKB</span>
                                    <span className="grad-pct" style={{ fontSize: "16px" }}>{gradPct.toFixed(1)}%</span>
                                </div>
                                <p style={{ fontSize: "13px", color: "var(--lp-text-tertiary)", margin: "12px 0 0" }}>
                                    {t("graduationDesc", { threshold: formatOkb(GRADUATION_THRESHOLD) })}
                                </p>
                            </div>
                        )}

                        {/* Price Chart */}
                        <PriceChart tokenAddress={tokenAddress} trades={trades} />

                        {/* Token Info */}
                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <h3 style={{ margin: '0 0 20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={20} className="text-orange-500" /> {t("tokenInfo")}</h3>
                            {tokenInfo.description && (
                                <p style={{ fontSize: "14px", color: "var(--lp-text-secondary)", marginBottom: "20px", lineHeight: 1.6 }}>
                                    {tokenInfo.description}
                                </p>
                            )}
                            <div style={{ display: 'grid', gap: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--lp-border)', paddingBottom: '12px' }}>
                                    <span style={{ color: 'var(--lp-text-tertiary)' }}>{t("contract")}</span>
                                    <a
                                        href={`https://web3.okx.com/explorer/x-layer/address/${tokenAddress}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: "var(--lp-brand-primary)", textDecoration: "none", display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        {shortenAddr(tokenAddress)} <ExternalLink size={14} />
                                    </a>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--lp-border)', paddingBottom: '12px' }}>
                                    <span style={{ color: 'var(--lp-text-tertiary)' }}>{t("creator")}</span>
                                    <span style={{ color: 'var(--lp-text-primary)' }}>{shortenAddr(tokenInfo.creator)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--lp-border)', paddingBottom: '12px' }}>
                                    <span style={{ color: 'var(--lp-text-tertiary)' }}>{t("totalSupply")}</span>
                                    <span style={{ color: 'var(--lp-text-primary)' }}>1,000,000,000</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--lp-border)', paddingBottom: '12px' }}>
                                    <span style={{ color: 'var(--lp-text-tertiary)' }}>{isMigrated ? "Migration" : t("liquidity")}</span>
                                    <span style={{ color: 'var(--lp-text-primary)' }}>{isMigrated ? "LP locked" : `${formatOkb(tokenInfo.realOkbReserve)} OKB`}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--lp-border)', paddingBottom: '12px' }}>
                                    <span style={{ color: 'var(--lp-text-tertiary)' }}>{t("tokensInCurve")}</span>
                                    <span style={{ color: 'var(--lp-text-primary)' }}>{formatTokens(tokenInfo.realTokenReserve)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--lp-text-tertiary)' }}>{t("created")}</span>
                                    <span style={{ color: 'var(--lp-text-primary)' }}>{timeAgo(Number(tokenInfo.createdAt))}</span>
                                </div>
                            </div>
                        </div>

                        {/* Trade History */}
                        <TradeHistory trades={trades} />
                    </div>
                    {/* Right: Trading Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {tokenInfo.graduated ? (
                            <div className="trade-panel glass-panel">
                                <h3 style={{ margin: "0 0 12px", fontSize: "18px", display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <GraduationCap size={20} className="text-green-500" />
                                    {t("tokenGraduatedTitle")}
                                </h3>
                                {!isMigrated ? (
                                    <>
                                        <p style={{ color: "var(--lp-text-secondary)", fontSize: "14px", lineHeight: 1.5 }}>
                                            Graduation is complete. Anyone can migrate the locked launchpad liquidity to Uniswap V4.
                                        </p>
                                        <button
                                            className="trade-btn buy-btn"
                                            onClick={handleMigrate}
                                            disabled={txStep === "pending"}
                                            style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "24px" }}
                                        >
                                            {txStep === "pending" ? <Loader2 size={18} className="animate-spin" /> : <GraduationCap size={18} />} Migrate liquidity
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p style={{ color: "var(--lp-text-secondary)", fontSize: "14px", lineHeight: 1.5 }}>
                                            Liquidity has migrated to Uniswap V4 and its LP position is permanently locked.
                                        </p>
                                        <a
                                            href={`https://app.uniswap.org/swap?chain=xlayer&inputCurrency=${WOKB_ADDRESS}&outputCurrency=${tokenAddress}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="trade-btn buy-btn"
                                            style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "24px", textDecoration: "none" }}
                                        >
                                            {t("tradeOnUniswap")} <ExternalLink size={18} />
                                        </a>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="trade-panel glass-panel">
                                {/* Buy/Sell Tabs */}
                                <div className="trade-tabs">
                                    <button
                                        className={`trade-tab ${tradeMode === "buy" ? "active-buy" : ""}`}
                                        onClick={() => setTradeMode("buy")}
                                    >
                                        {t("buy")}
                                    </button>
                                    <button
                                        className={`trade-tab ${tradeMode === "sell" ? "active-sell" : ""}`}
                                        onClick={() => setTradeMode("sell")}
                                    >
                                        {t("sell")}
                                    </button>
                                </div>

                                {tradeMode === "buy" ? (
                                    <>
                                        {/* Buy Mode */}
                                        <div className="form-group">
                                            <label>{t("youPay")} (OKB)</label>
                                            <div className="trade-input-wrapper">
                                                <input
                                                    className="form-input"
                                                    type="number"
                                                    placeholder="0.0"
                                                    value={buyAmount}
                                                    onChange={(e) => setBuyAmount(e.target.value)}
                                                    min="0"
                                                    step="0.01"
                                                />
                                                <span className="input-suffix">OKB</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                                            {["0.1", "0.5", "1", "5", "10"].map((amt) => (
                                                <button
                                                    key={amt}
                                                    style={{ flex: 1, padding: '6px 0', background: 'var(--lp-btn-bg)', border: '1px solid var(--lp-border)', borderRadius: '6px', color: 'var(--lp-text-secondary)', cursor: 'pointer' }}
                                                    onClick={() => setBuyAmount(amt)}
                                                >
                                                    {amt}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="trade-output">
                                            <div className="trade-output-label">{t("youReceive")}</div>
                                            <div className="trade-output-value">
                                                {buyQuote ? formatTokens((buyQuote as [bigint, bigint])[0]) : "—"} {tokenInfo.symbol}
                                            </div>
                                            {buyAmountWei > 0n && (
                                                <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--lp-text-tertiary)", display: "flex", justifyContent: "space-between" }}>
                                                    <span>Fee (1%)</span>
                                                    <span>{formatOkb(buyAmountWei / 100n)} OKB</span>
                                                </div>
                                            )}
                                            {buyQuote && buyAmountWei > 0n && (buyQuote as [bigint, bigint])[1] < buyAmountWei && (
                                                <div style={{ color: "var(--lp-warning)", display: 'flex', alignItems: 'center', gap: '4px', marginTop: "8px", fontSize: "12px" }}>
                                                    <AlertTriangle size={14} /> 
                                                    {t("overshootWarning", { amount: formatEther((buyQuote as [bigint, bigint])[1]) })}
                                                </div>
                                            )}
                                        </div>

                                        {isConnected ? (
                                            <button
                                                className="trade-btn buy-btn"
                                                onClick={handleBuy}
                                                disabled={!buyAmount || buyAmountWei === 0n || txStep === "pending"}
                                                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                            >
                                                {txStep === "pending" ? <><Loader2 size={18} className="animate-spin" /> {t("confirming")}</> :
                                                 txStep === "done" ? <><CheckCircle2 size={18} /> {t("tradeSuccess")}</> :
                                                 <>{t("buy")} {tokenInfo.symbol}</>}
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <ConnectButton />
                                            </div>
                                        )}

                                        {okbBalance && (
                                            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--lp-text-tertiary)' }}>
                                                {t("balance")}: {formatOkb(okbBalance.value)} OKB • {t("tradingFee")}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {/* Sell Mode */}
                                        <div className="form-group">
                                            <label>{t("youPay")} ({tokenInfo.symbol})</label>
                                            <div className="trade-input-wrapper">
                                                <input
                                                    className="form-input"
                                                    type="number"
                                                    placeholder="0.0"
                                                    value={sellAmount}
                                                    onChange={(e) => setSellAmount(e.target.value)}
                                                    min="0"
                                                />
                                                <span className="input-suffix">{tokenInfo.symbol}</span>
                                            </div>
                                        </div>

                                        {userTokenBalance && (userTokenBalance as bigint) > 0n && (
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                                                {[25, 50, 75, 100].map((pct) => (
                                                    <button
                                                        key={pct}
                                                        style={{ flex: 1, padding: '6px 0', background: 'var(--lp-btn-bg)', border: '1px solid var(--lp-border)', borderRadius: '6px', color: 'var(--lp-text-secondary)', cursor: 'pointer' }}
                                                        onClick={() => {
                                                            const amt = ((userTokenBalance as bigint) * BigInt(pct)) / 100n;
                                                            setSellAmount(formatEther(amt));
                                                        }}
                                                    >
                                                        {pct}%
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="trade-output">
                                            <div className="trade-output-label">{t("youReceive")}</div>
                                            <div className="trade-output-value">
                                                {sellQuote ? formatOkb(sellQuote as bigint) : "—"} OKB
                                            </div>
                                            {sellQuote && sellAmountWei > 0n && (
                                                <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--lp-text-tertiary)", display: "flex", justifyContent: "space-between" }}>
                                                    <span>Fee (1%)</span>
                                                    <span>~{formatOkb((sellQuote as bigint) / 99n)} OKB</span>
                                                </div>
                                            )}
                                        </div>

                                        {isConnected ? (
                                            <button
                                                className="trade-btn sell-btn"
                                                onClick={handleSell}
                                                disabled={!sellAmount || sellAmountWei === 0n || txStep === "pending"}
                                                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                            >
                                                {txStep === "pending" ? <><Loader2 size={18} className="animate-spin" /> {t("confirming")}</> :
                                                 txStep === "done" ? <><CheckCircle2 size={18} /> {t("tradeSuccess")}</> :
                                                 needsSellApproval ? <><CheckCircle2 size={18} /> {t("approveFee")}</> :
                                                 <>{t("sell")} {tokenInfo.symbol}</>}
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <ConnectButton />
                                            </div>
                                        )}

                                        {userTokenBalance && (
                                            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--lp-text-tertiary)' }}>
                                                {t("balance")}: {formatTokens(userTokenBalance as bigint)} {tokenInfo.symbol} • {t("tradingFee")}
                                            </div>
                                        )}
                                    </>
                                )}

                                {txStep === "error" && (
                                    <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--lp-danger)', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertTriangle size={16} /> {t("txFailed")}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Your Position */}
                        {isConnected && userTokenBalance && (userTokenBalance as bigint) > 0n && (
                            <div className="glass-panel" style={{ padding: '24px' }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Briefcase size={18} className="text-orange-500" /> {t("yourPosition")}
                                </h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--lp-border)', paddingBottom: '12px', marginBottom: '12px' }}>
                                    <span style={{ color: 'var(--lp-text-tertiary)', fontSize: '14px' }}>{t("holdings")}</span>
                                    <span style={{ color: 'var(--lp-text-primary)', fontWeight: 600 }}>
                                        {formatTokens(userTokenBalance as bigint)} {tokenInfo.symbol}
                                    </span>
                                </div>
                                {!tokenInfo.graduated && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--lp-text-tertiary)', fontSize: '14px' }}>{t("estValue")}</span>
                                    <span style={{ color: 'var(--lp-brand-primary)', fontWeight: 600 }}>
                                        {tokenInfo.virtualTokenReserve > 0n
                                            ? formatOkb(
                                                ((userTokenBalance as bigint) * tokenInfo.virtualOkbReserve) /
                                                tokenInfo.virtualTokenReserve
                                            )
                                            : "—"
                                        } OKB
                                    </span>
                                </div>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
