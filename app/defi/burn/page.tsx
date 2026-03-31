"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { parseUnits } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BurnLanguageSelector } from "./BurnLanguageSelector";
import { translations, Language, LANGUAGES } from "./i18n";
import { AnimatedNumbers } from "./AnimatedNumbers";
import { useSound } from "./hooks/useSound";
import confetti from "canvas-confetti";

import "./burn.css";


// Contributor interface
interface DonationEntry {
    txHash: string;
    amount: string;
    timestamp: number;
}

interface Contributor {
    address: string;
    name: string;
    avatar: number;
    totalBurned: string;
    burnCount: number;
    donations: DonationEntry[];
    telegram?: string;
    twitter?: string;
}

interface LeaderboardContributor extends Contributor {
    totalBurnedFormatted: string;
    rank: number;
}

// Avatar emojis
const AVATARS = ["🐱", "🍌", "🎮", "🔥", "💎", "⚡", "🌟", "🚀"];

// Community wallet address
const COMMUNITY_WALLET = "0x92809f2837f708163d375960063c8a3156fceacb";

// BANMAO Token address on X Layer
const BANMAO_TOKEN = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78" as `0x${string}`;

// ERC20 Transfer ABI
const ERC20_ABI = [
    {
        name: "transfer",
        type: "function",
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" }
        ],
        outputs: [{ type: "bool" }]
    }
] as const;


export default function BurnPage() {
    const { address, isConnected } = useAccount();
    const [lang, setLang] = useState<Language>("en");
    const [contributors, setContributors] = useState<LeaderboardContributor[]>([]);
    const [totalDonated, setTotalDonated] = useState("0");
    const [totalDonatedFormatted, setTotalDonatedFormatted] = useState("0");
    const [totalBurned, setTotalBurned] = useState("0");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [txHash, setTxHash] = useState("");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [myContributor, setMyContributor] = useState<LeaderboardContributor | null>(null);
    const [showMyDonations, setShowMyDonations] = useState(false);
    const [selectedContributor, setSelectedContributor] = useState<LeaderboardContributor | null>(null);
    const [copied, setCopied] = useState(false);
    const [showTour, setShowTour] = useState(false);

    // Direct transfer states
    const [donationAmount, setDonationAmount] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Wagmi write contract hook
    const { writeContract, data: sendTxHash, isPending: isTxPending } = useWriteContract();
    const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: sendTxHash });

    // Sound effects hook
    const { playClick, playHover, playSuccess, playError, soundEnabled, toggleSound } = useSound();

    // Balance hooks
    const { data: banmaoBalance } = useBalance({
        address: address,
        token: BANMAO_TOKEN,
    });
    const { data: okbBalance } = useBalance({
        address: address,
    });

    // Confetti celebration function
    const triggerConfetti = useCallback(() => {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 99999 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) {
                clearInterval(interval);
                return;
            }
            const particleCount = 50 * (timeLeft / duration);

            // Fire from two sides
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                colors: ['#f97316', '#fbbf24', '#ef4444', '#22c55e'],
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                colors: ['#f97316', '#fbbf24', '#ef4444', '#22c55e'],
            });
        }, 250);
    }, []);

    // Format balance for display
    const formatBalance = (balance?: { formatted: string; symbol: string }) => {
        if (!balance) return "0";
        const num = parseFloat(balance.formatted);
        if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
        if (num >= 1000) return (num / 1000).toFixed(2) + "K";
        return num.toFixed(2);
    };

    // Handle send donation
    const handleSendDonation = async () => {
        if (!donationAmount || !isConnected) return;

        try {
            setIsSending(true);
            const amountInWei = parseUnits(donationAmount, 18);

            writeContract({
                address: BANMAO_TOKEN,
                abi: ERC20_ABI,
                functionName: "transfer",
                args: [COMMUNITY_WALLET as `0x${string}`, amountInWei]
            } as any);
        } catch (err) {
            console.error("Send donation error:", err);
            setMessage({ type: "error", text: t("msgSendFailed") });
            setIsSending(false);
        }
    };

    // When tx confirmed, auto-verify donation
    useEffect(() => {
        const autoVerifyDonation = async (hash: string) => {
            try {
                setSubmitting(true);
                const res = await fetch("/api/burn-contributors", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ txHash: hash }),
                });
                const data = await res.json();

                if (data.success) {
                    setMessage({
                        type: "success",
                        text: `🎉 Successfully recorded donation of ${data.burnedAmountFormatted} $BANMAO!`,
                    });
                    fetchLeaderboard();
                    // Trigger celebration modal with confetti and sound
                    setSuccessDonationAmount(data.burnedAmountFormatted);
                    setShowDonationSuccess(true);
                    triggerConfetti();
                    playSuccess();
                } else {
                    // If verification fails immediately, try again after a short delay
                    // (transaction might not be indexed yet)
                    setTimeout(async () => {
                        const retryRes = await fetch("/api/burn-contributors", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ txHash: hash }),
                        });
                        const retryData = await retryRes.json();
                        if (retryData.success) {
                            setMessage({
                                type: "success",
                                text: `🎉 Successfully recorded donation of ${retryData.burnedAmountFormatted} $BANMAO!`,
                            });
                            fetchLeaderboard();
                            // Trigger celebration modal with confetti and sound
                            setSuccessDonationAmount(retryData.burnedAmountFormatted);
                            setShowDonationSuccess(true);
                            triggerConfetti();
                            playSuccess();
                        } else {
                            setMessage({ type: "error", text: retryData.error || t("msgVerifyPending") });
                            setTxHash(hash); // Set hash for manual verify
                        }
                    }, 5000);
                }
            } catch (err) {
                console.error("Auto verify error:", err);
                setMessage({ type: "error", text: t("msgAutoVerifyFailed") });
                setTxHash(hash);
            } finally {
                setSubmitting(false);
            }
        };

        if (isTxConfirmed && sendTxHash) {
            setDonationAmount("");
            setIsSending(false);
            setMessage({ type: "success", text: `✅ ${t("msgTxConfirmed")}` });
            autoVerifyDonation(sendTxHash);
        }
    }, [isTxConfirmed, sendTxHash]);


    // Profile editing states
    const [donorProfile, setDonorProfile] = useState<{
        name: string;
        avatar: number;
        telegram: string;
        twitter: string;
        editCount: number;
    } | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileEditName, setProfileEditName] = useState("");
    const [profileEditAvatar, setProfileEditAvatar] = useState(0);
    const [profileEditTelegram, setProfileEditTelegram] = useState("");
    const [profileEditTwitter, setProfileEditTwitter] = useState("");

    const t = (key: string) => translations[lang]?.[key] || translations.en[key] || key;

    // Bento detail modal state (must be after t function because bentoCellData uses t)
    type BentoCellType = "donated" | "burned" | "contributors" | "burn" | "games" | "airdrops" | "dev" | null;
    const [selectedBentoCell, setSelectedBentoCell] = useState<BentoCellType>(null);

    // Burn History Modal state
    const [showBurnHistoryModal, setShowBurnHistoryModal] = useState(false);
    const [burnHistoryTab, setBurnHistoryTab] = useState<"history" | "verify">("history");
    const [verifyTxHash, setVerifyTxHash] = useState("");
    const [isVerifyingTx, setIsVerifyingTx] = useState(false);
    const [verifyMessage, setVerifyMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Bento cell data mapping (must be after t function)
    const bentoCellData: Record<Exclude<BentoCellType, null>, { title: string; detailKey: string; image: string }> = {
        donated: { title: t("totalDonated"), detailKey: "detailDonated", image: "/images/burn-3d/stats-donated.png" },
        burned: { title: t("totalBurned"), detailKey: "detailBurned", image: "/images/burn-3d/stats-burned.png" },
        contributors: { title: t("contributors"), detailKey: "detailContributors", image: "/images/burn-3d/stats-contributors.png" },
        burn: { title: t("tokenBurn"), detailKey: "detailBurn", image: "/images/burn-3d/burn-torch.png" },
        games: { title: t("gamePools"), detailKey: "detailGames", image: "/images/burn-3d/game-controller.png" },
        airdrops: { title: t("airdrops"), detailKey: "detailAirdrops", image: "/images/burn-3d/airdrop-gift.png" },
        dev: { title: t("development"), detailKey: "detailDev", image: "/images/burn-3d/dev-coding.png" },
    };

    // Bento Detail Modal Component
    const BentoDetailModal = () => {
        if (!selectedBentoCell) return null;
        const cellData = bentoCellData[selectedBentoCell];
        return (
            <div className="burn-bento-modal-overlay" onClick={() => setSelectedBentoCell(null)}>
                <div className="burn-bento-modal" onClick={(e) => e.stopPropagation()}>
                    <button className="burn-bento-modal-close" onClick={() => setSelectedBentoCell(null)}>✕</button>
                    <Image src={cellData.image} alt={cellData.title} width={120} height={120} className="burn-bento-modal-image animate-float" />
                    <h3 className="burn-bento-modal-title">{cellData.title}</h3>
                    <p className="burn-bento-modal-description">{t(cellData.detailKey)}</p>
                </div>
            </div>
        );
    };

    // Burn History Modal Component - shows ONLY dead wallet burn transactions
    const BurnHistoryModal = () => {
        if (!showBurnHistoryModal) return null;

        // State for burn history from dedicated API (dead wallet only)
        const [burnTxs, setBurnTxs] = React.useState<Array<{
            txHash: string;
            from: string;
            amount: string;
            amountFormatted: string;
            timestamp: number;
            fromShort: string;
        }>>([]);
        const [loadingBurnHistory, setLoadingBurnHistory] = React.useState(true);

        // Fetch burn history from dedicated API (dead wallet only)
        React.useEffect(() => {
            const fetchBurnHistory = async () => {
                setLoadingBurnHistory(true);
                try {
                    const res = await fetch("/api/burn-history");
                    const data = await res.json();
                    if (data.success) {
                        setBurnTxs(data.transactions || []);
                    }
                } catch (err) {
                    console.error("Failed to fetch burn history:", err);
                } finally {
                    setLoadingBurnHistory(false);
                }
            };
            fetchBurnHistory();
        }, []);

        const handleVerifyTx = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!verifyTxHash.trim()) return;

            setIsVerifyingTx(true);
            setVerifyMessage(null);

            try {
                // Use burn-history API for dead wallet burns only
                const res = await fetch("/api/burn-history", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ txHash: verifyTxHash.trim() }),
                });
                const data = await res.json();

                if (data.success) {
                    setVerifyMessage({
                        type: "success",
                        text: `${t("txVerifiedSuccess")} ${data.transaction.amountFormatted} $BANMAO`,
                    });
                    setVerifyTxHash("");
                    // Refresh burn history list
                    const refreshRes = await fetch("/api/burn-history");
                    const refreshData = await refreshRes.json();
                    if (refreshData.success) {
                        setBurnTxs(refreshData.transactions || []);
                    }
                    playSuccess();
                } else {
                    setVerifyMessage({
                        type: "error",
                        text: data.error === "This burn transaction has already been recorded"
                            ? t("txAlreadyRecorded")
                            : (data.error || t("txNotFound")),
                    });
                    playError();
                }
            } catch {
                setVerifyMessage({ type: "error", text: t("txNotFound") });
                playError();
            } finally {
                setIsVerifyingTx(false);
            }
        };

        return (
            <div className="burn-bento-modal-overlay" onClick={() => { setShowBurnHistoryModal(false); setVerifyMessage(null); }}>
                <div
                    className="burn-bento-modal"
                    onClick={(e) => e.stopPropagation()}
                    style={{ maxWidth: "520px", width: "95%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
                >
                    <button className="burn-bento-modal-close" onClick={() => { setShowBurnHistoryModal(false); setVerifyMessage(null); }}>✕</button>

                    {/* Title */}
                    <h3 className="burn-bento-modal-title" style={{ marginBottom: "16px" }}>
                        {t("burnHistoryTitle")}
                    </h3>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>
                        {t("burnHistoryDesc")}
                    </p>

                    {/* Tabs */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                        <button
                            onClick={() => { playClick(); setBurnHistoryTab("history"); }}
                            style={{
                                flex: 1,
                                padding: "10px 20px",
                                borderRadius: "50px",
                                border: "none",
                                background: burnHistoryTab === "history"
                                    ? "linear-gradient(135deg, #f97316, #ea580c)"
                                    : "rgba(255,255,255,0.1)",
                                color: burnHistoryTab === "history" ? "#fff" : "rgba(255,255,255,0.6)",
                                fontWeight: 600,
                                fontSize: "13px",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => { playHover(); e.currentTarget.style.transform = "scale(1.02)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                        >
                            📜 {t("tabHistory")}
                        </button>
                        <button
                            onClick={() => { playClick(); setBurnHistoryTab("verify"); }}
                            style={{
                                flex: 1,
                                padding: "10px 20px",
                                borderRadius: "50px",
                                border: "none",
                                background: burnHistoryTab === "verify"
                                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                                    : "rgba(255,255,255,0.1)",
                                color: burnHistoryTab === "verify" ? "#fff" : "rgba(255,255,255,0.6)",
                                fontWeight: 600,
                                fontSize: "13px",
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => { playHover(); e.currentTarget.style.transform = "scale(1.02)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                        >
                            ✅ {t("tabVerify")}
                        </button>
                    </div>

                    {/* Content */}
                    {burnHistoryTab === "history" ? (
                        <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                            {loadingBurnHistory ? (
                                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", padding: "40px 20px" }}>
                                    {t("loading")}
                                </div>
                            ) : burnTxs.length === 0 ? (
                                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", padding: "40px 20px" }}>
                                    {t("noTransactions")}
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {burnTxs.slice(0, 50).map((tx) => (
                                        <div
                                            key={tx.txHash}
                                            style={{
                                                padding: "12px",
                                                background: "rgba(0,0,0,0.3)",
                                                borderRadius: "12px",
                                                border: "1px solid rgba(249, 115, 22, 0.1)",
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                                <span style={{ color: "#f97316", fontWeight: 700, fontSize: "14px" }}>
                                                    {tx.amountFormatted} $BANMAO
                                                </span>
                                                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                                                    {formatDate(tx.timestamp)}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginBottom: "6px" }}>
                                                {t("fromAddress")}: {tx.fromShort}
                                            </div>
                                            <a
                                                href={`https://web3.okx.com/explorer/x-layer/tx/${tx.txHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    fontSize: "11px",
                                                    color: "#60a5fa",
                                                    textDecoration: "none",
                                                    padding: "4px 8px",
                                                    background: "rgba(96, 165, 250, 0.1)",
                                                    borderRadius: "8px",
                                                }}
                                                className="burn-social-link"
                                            >
                                                🔗 {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)} → {t("viewOnExplorer")}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: "16px 0" }}>
                            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", marginBottom: "16px" }}>
                                {t("verifyNewTx")}
                            </p>
                            <form onSubmit={handleVerifyTx}>
                                <div style={{ position: "relative", marginBottom: "12px" }}>
                                    <input
                                        type="text"
                                        value={verifyTxHash}
                                        onChange={(e) => setVerifyTxHash(e.target.value)}
                                        placeholder={t("enterTxHashPlaceholder")}
                                        style={{
                                            width: "100%",
                                            boxSizing: "border-box",
                                            padding: "14px 24px",
                                            background: "rgba(0,0,0,0.3)",
                                            border: "1px solid rgba(255,255,255,0.15)",
                                            borderRadius: "50px",
                                            color: "#fff",
                                            fontSize: "13px",
                                            fontFamily: "monospace",
                                            outline: "none",
                                        }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isVerifyingTx || !verifyTxHash.trim()}
                                    style={{
                                        width: "100%",
                                        padding: "14px 24px",
                                        background: isVerifyingTx
                                            ? "rgba(255,255,255,0.1)"
                                            : "linear-gradient(135deg, #22c55e, #16a34a)",
                                        border: "none",
                                        borderRadius: "50px",
                                        color: "#fff",
                                        fontWeight: 700,
                                        fontSize: "14px",
                                        cursor: isVerifyingTx ? "not-allowed" : "pointer",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseEnter={(e) => { if (!isVerifyingTx) { playHover(); e.currentTarget.style.transform = "scale(1.02)"; } }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                                >
                                    {isVerifyingTx ? t("verifying") : `✅ ${t("verifyTx")}`}
                                </button>
                            </form>

                            {verifyMessage && (
                                <div style={{
                                    marginTop: "16px",
                                    padding: "12px 16px",
                                    borderRadius: "12px",
                                    background: verifyMessage.type === "success"
                                        ? "rgba(34, 197, 94, 0.15)"
                                        : "rgba(239, 68, 68, 0.15)",
                                    border: `1px solid ${verifyMessage.type === "success" ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                                    color: verifyMessage.type === "success" ? "#22c55e" : "#ef4444",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                }}>
                                    {verifyMessage.type === "success" ? "✅" : "❌"} {verifyMessage.text}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Load saved language or detect from browser
    useEffect(() => {
        const saved = localStorage.getItem("banmao_language") as Language;
        if (saved && LANGUAGES.some(l => l.code === saved)) {
            setLang(saved);
        } else {
            // Auto detect
            const browserLang = navigator.language.split("-")[0] as Language;
            if (LANGUAGES.some(l => l.code === browserLang)) {
                setLang(browserLang);
            }
        }
    }, []);

    // Fetch leaderboard
    const fetchLeaderboard = useCallback(async () => {
        try {
            const res = await fetch("/api/burn-contributors");
            const data = await res.json();
            if (data.success) {
                setContributors(data.leaderboard || []);
                setTotalDonated(data.totalBurned || "0");
                setTotalDonatedFormatted(data.totalBurnedFormatted || "0");
            }

            // Fetch actual burn stats
            const burnRes = await fetch("/api/burn-stats");
            const burnData = await burnRes.json();
            if (burnData.burnedAmount) {
                setTotalBurned(burnData.burnedAmount);
            }
        } catch (err) {
            console.error("Failed to fetch leaderboard:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard();
        const interval = setInterval(fetchLeaderboard, 30000);
        return () => clearInterval(interval);
    }, [fetchLeaderboard]);

    // Find my contribution
    useEffect(() => {
        if (address && contributors.length > 0) {
            const me = contributors.find(
                (c) => c.address.toLowerCase() === address.toLowerCase()
            );
            setMyContributor(me || null);
        } else {
            setMyContributor(null);
        }
    }, [address, contributors]);

    // Submit donation
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!txHash.trim()) {
            setMessage({ type: "error", text: t("msgEnterHash") });
            return;
        }

        setSubmitting(true);
        setMessage(null);

        try {
            const res = await fetch("/api/burn-contributors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ txHash: txHash.trim() }),
            });
            const data = await res.json();

            if (data.success) {
                setMessage({
                    type: "success",
                    text: `🎉 Successfully recorded donation of ${data.burnedAmountFormatted} $BANMAO!`,
                });
                setTxHash("");
                fetchLeaderboard();
            } else {
                setMessage({ type: "error", text: data.error || t("msgDonationFailed") });
            }
        } catch (err) {
            setMessage({ type: "error", text: t("msgNetworkError") });
        } finally {
            setSubmitting(false);
        }
    };

    // Format timestamp with locale based on user language
    const formatDate = (ts: number) => {
        const localeMap: Record<string, string> = {
            en: 'en-US',
            vi: 'vi-VN',
            zh: 'zh-CN',
            ko: 'ko-KR',
            ru: 'ru-RU',
            id: 'id-ID'
        };
        const locale = localeMap[lang] || 'en-US';
        return new Date(ts).toLocaleDateString(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    // Format amount
    const formatAmount = (amount: string) => {
        const num = Number(BigInt(amount)) / 1e18;
        return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    };

    // Shorten address
    const shortenAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    // Copy to clipboard with mobile fallback
    const copyToClipboard = async (text: string, msgKey: string = "msgAddressCopied") => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for mobile browsers
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
            }
            setMessage({ type: "success", text: `✅ ${t(msgKey)}` });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: "error", text: "❌ Copy failed" });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    // Open explorer
    const openExplorer = (hash: string, type: "address" | "tx") => {
        const baseUrl = "https://web3.okx.com/explorer/x-layer";
        window.open(`${baseUrl}/${type}/${hash}`, "_blank");
    };

    // Tour Modal Component with Spotlight Effect
    const BurnTourModal = ({ t, onClose }: { t: (key: string) => string; onClose: () => void }) => {
        const [step, setStep] = useState(0);
        const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

        // Define tour steps with element selectors
        type TourPosition = "top" | "bottom" | "left" | "right";
        const steps: Array<{ selector: string; title: string; desc: string; position: TourPosition }> = [
            { selector: ".burn-bento-stat", title: t("tourStep1Title"), desc: t("tourStep1Desc"), position: "bottom" },
            { selector: ".burn-wallet-box", title: t("tourStep2Title"), desc: t("tourStep2Desc"), position: "bottom" },
            { selector: ".burn-transfer-section", title: t("tourStep3Title"), desc: t("tourStep3Desc"), position: "left" },
            { selector: ".burn-form-section", title: t("tourStep4Title"), desc: t("tourStep4Desc"), position: "left" },
            { selector: ".burn-leaderboard-section", title: t("tourStep5Title"), desc: t("tourStep5Desc"), position: "top" },
        ];

        // Find and highlight target element
        useEffect(() => {
            const currentStep = steps[step];
            if (!currentStep) return;

            const updatePosition = () => {
                const element = document.querySelector(currentStep.selector);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    setTargetRect(rect);
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                } else {
                    setTargetRect(null);
                }
            };

            updatePosition();
            const timer = setTimeout(updatePosition, 300);
            window.addEventListener("resize", updatePosition);
            window.addEventListener("scroll", updatePosition);

            return () => {
                clearTimeout(timer);
                window.removeEventListener("resize", updatePosition);
                window.removeEventListener("scroll", updatePosition);
            };
        }, [step]);

        // Get tooltip position based on target and step position - keeps within viewport
        const getTooltipStyle = (): React.CSSProperties => {
            const tooltipWidth = 340;
            const tooltipHeight = 220; // Approximate height
            const padding = 16;
            const safeMargin = 10; // Margin from screen edges

            // If no target, center in viewport
            if (!targetRect) {
                return {
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    maxWidth: `calc(100vw - ${safeMargin * 2}px)`
                };
            }

            const position = steps[step]?.position || "bottom";
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // Calculate initial position based on preferred side
            let top: number | undefined;
            let left: number | undefined;
            let bottom: number | undefined;
            let right: number | undefined;

            switch (position) {
                case "bottom":
                    top = targetRect.bottom + padding;
                    left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
                    break;
                case "top":
                    bottom = vh - targetRect.top + padding;
                    left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
                    break;
                case "left":
                    top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
                    right = vw - targetRect.left + padding;
                    break;
                case "right":
                    top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
                    left = targetRect.right + padding;
                    break;
            }

            // Clamp to viewport bounds
            const actualWidth = Math.min(tooltipWidth, vw - safeMargin * 2);

            // Horizontal clamping for left-based positioning
            if (left !== undefined) {
                left = Math.max(safeMargin, Math.min(left, vw - actualWidth - safeMargin));
            }

            // Horizontal clamping for right-based positioning
            if (right !== undefined) {
                right = Math.max(safeMargin, Math.min(right, vw - actualWidth - safeMargin));
            }

            // Vertical clamping for top-based positioning
            if (top !== undefined) {
                top = Math.max(safeMargin, Math.min(top, vh - tooltipHeight - safeMargin));
            }

            // Vertical clamping for bottom-based positioning
            if (bottom !== undefined) {
                bottom = Math.max(safeMargin, Math.min(bottom, vh - tooltipHeight - safeMargin));
            }

            // Build style object
            const style: React.CSSProperties = {
                maxWidth: `calc(100vw - ${safeMargin * 2}px)`,
                width: Math.min(tooltipWidth, vw - safeMargin * 2)
            };

            if (top !== undefined) style.top = top;
            if (left !== undefined) style.left = left;
            if (right !== undefined) style.right = right;
            if (bottom !== undefined) style.bottom = bottom;

            return style;
        };

        return createPortal(
            <>
                {/* CSS Animations */}
                <style>{`
                    @keyframes burn-spotlight-pulse {
                        0%, 100% { box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.6), 0 0 20px rgba(249, 115, 22, 0.4); }
                        50% { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.6); }
                    }
                    @keyframes burn-hand-bounce {
                        0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(-15deg); }
                        50% { transform: translate(-50%, -50%) translateY(-12px) rotate(-15deg); }
                    }
                    @keyframes burn-tooltip-slide {
                        0% { opacity: 0; transform: translateY(20px) scale(0.95); }
                        100% { opacity: 1; transform: translateY(0) scale(1); }
                    }
                `}</style>

                {/* Dark overlay */}
                <div style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 99990,
                    pointerEvents: "none"
                }}>
                    {/* SVG mask for spotlight effect */}
                    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "auto" }} onClick={onClose}>
                        <defs>
                            <mask id="burn-spotlight-mask">
                                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                {targetRect && (
                                    <rect
                                        x={targetRect.left - 15}
                                        y={targetRect.top - 15}
                                        width={targetRect.width + 30}
                                        height={targetRect.height + 30}
                                        rx="16"
                                        fill="black"
                                    />
                                )}
                            </mask>
                        </defs>
                        <rect
                            x="0" y="0" width="100%" height="100%"
                            fill="rgba(0, 0, 0, 0.8)"
                            mask="url(#burn-spotlight-mask)"
                        />
                    </svg>

                    {/* Spotlight border */}
                    {targetRect && (
                        <div style={{
                            position: "fixed",
                            left: targetRect.left - 15,
                            top: targetRect.top - 15,
                            width: targetRect.width + 30,
                            height: targetRect.height + 30,
                            borderRadius: "16px",
                            border: "3px solid #f97316",
                            pointerEvents: "none",
                            zIndex: 99995,
                            animation: "burn-spotlight-pulse 2s ease-in-out infinite",
                            transition: "all 0.4s ease-out"
                        }} />
                    )}

                    {/* Pointing hand */}
                    {targetRect && (
                        <div style={{
                            position: "fixed",
                            left: targetRect.right + 15,
                            top: targetRect.bottom + 15,
                            fontSize: "40px",
                            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))",
                            animation: "burn-hand-bounce 0.8s ease-in-out infinite",
                            pointerEvents: "none",
                            zIndex: 99996,
                            transition: "all 0.4s ease-out"
                        }}>
                            👆
                        </div>
                    )}

                    {/* Tooltip */}
                    <div
                        key={step}
                        style={{
                            position: "fixed",
                            ...getTooltipStyle(),
                            background: "linear-gradient(145deg, rgba(35, 25, 60, 0.98), rgba(20, 12, 45, 0.98))",
                            backdropFilter: "blur(24px)",
                            borderRadius: "20px",
                            border: "2px solid rgba(249, 115, 22, 0.5)",
                            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(249, 115, 22, 0.25)",
                            padding: "16px",
                            zIndex: 99997,
                            pointerEvents: "auto",
                            animation: "burn-tooltip-slide 0.4s ease-out forwards",
                            boxSizing: "border-box"
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Progress dots */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                            <div style={{ display: "flex", gap: "4px" }}>
                                {steps.map((_, idx) => (
                                    <div key={idx} style={{
                                        width: idx === step ? "20px" : "8px",
                                        height: "8px",
                                        borderRadius: "4px",
                                        background: idx === step
                                            ? "linear-gradient(90deg, #f97316, #fbbf24)"
                                            : idx < step ? "#22c55e" : "rgba(255,255,255,0.2)",
                                        transition: "all 0.3s",
                                        cursor: "pointer"
                                    }} onClick={() => setStep(idx)} />
                                ))}
                            </div>
                            <span style={{ fontSize: "12px", color: "#f97316" }}>{step + 1}/{steps.length}</span>
                        </div>

                        {/* Title */}
                        <h3 style={{
                            margin: "0 0 8px 0",
                            fontSize: "16px",
                            fontWeight: 700,
                            color: "#f97316",
                            textShadow: "0 0 10px rgba(249, 115, 22, 0.5)"
                        }}>
                            {steps[step].title}
                        </h3>

                        {/* Description */}
                        <p style={{
                            margin: "0 0 16px 0",
                            fontSize: "13px",
                            lineHeight: 1.6,
                            color: "#e2e8f0"
                        }}>
                            {steps[step].desc}
                        </p>

                        {/* Navigation */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <button onClick={onClose} style={{
                                padding: "8px 16px",
                                background: "transparent",
                                border: "1px solid rgba(255,255,255,0.2)",
                                borderRadius: "20px",
                                color: "rgba(255,255,255,0.6)",
                                fontSize: "12px",
                                cursor: "pointer"
                            }}>
                                ✕ Skip
                            </button>
                            <div style={{ display: "flex", gap: "8px" }}>
                                {step > 0 && (
                                    <button onClick={() => setStep(s => s - 1)} style={{
                                        padding: "8px 16px",
                                        background: "rgba(255,255,255,0.1)",
                                        border: "1px solid rgba(255,255,255,0.2)",
                                        borderRadius: "20px",
                                        color: "#e2e8f0",
                                        fontSize: "12px",
                                        fontWeight: 600,
                                        cursor: "pointer"
                                    }}>
                                        {t("tourPrev")}
                                    </button>
                                )}
                                <button onClick={() => {
                                    if (step < steps.length - 1) {
                                        setStep(s => s + 1);
                                    } else {
                                        onClose();
                                    }
                                }} style={{
                                    padding: "8px 20px",
                                    background: step === steps.length - 1
                                        ? "linear-gradient(135deg, #22c55e, #16a34a)"
                                        : "linear-gradient(135deg, #f97316, #ea580c)",
                                    border: "none",
                                    borderRadius: "20px",
                                    color: "white",
                                    fontSize: "12px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: "0 0 15px rgba(249, 115, 22, 0.4)"
                                }}>
                                    {step === steps.length - 1 ? t("tourClose") : t("tourNext")} →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </>,
            document.body
        );
    };


    // Burn Chart - Simple SVG bar chart showing daily activity
    const BurnChart = () => {
        if (loading || contributors.length === 0) return null;

        // Aggregate donations by day for last 7 days
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const days = Array.from({ length: 7 }, (_, i) => {
            const dayStart = now - (6 - i) * dayMs;
            const dayEnd = dayStart + dayMs;
            const dayDonations = contributors.flatMap(c => c.donations)
                .filter(d => d.timestamp >= dayStart && d.timestamp < dayEnd);
            const total = dayDonations.reduce((sum, d) => sum + Number(d.amount), 0);
            return {
                label: new Date(dayStart).toLocaleDateString('en', { weekday: 'short' }),
                value: total
            };
        });

        const maxValue = Math.max(...days.map(d => d.value), 1);
        const chartHeight = 120;
        const barWidth = 30;
        const gap = 10;
        const chartWidth = days.length * (barWidth + gap);

        return (
            <div style={{
                background: "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(10px)",
                borderRadius: "16px",
                padding: "16px",
                marginTop: "16px",
                border: "1px solid rgba(249, 115, 22, 0.15)"
            }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#f97316", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    📊 7-Day Donation Activity
                </div>
                <svg width="100%" height={chartHeight + 30} viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} preserveAspectRatio="xMidYMid meet">
                    {days.map((day, i) => {
                        const barHeight = (day.value / maxValue) * chartHeight || 4;
                        const x = i * (barWidth + gap);
                        const y = chartHeight - barHeight;
                        return (
                            <g key={i}>
                                {/* Bar */}
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    fill="url(#burnGradient)"
                                    rx="4"
                                />
                                {/* Label */}
                                <text
                                    x={x + barWidth / 2}
                                    y={chartHeight + 18}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fill="rgba(255,255,255,0.5)"
                                >
                                    {day.label}
                                </text>
                                {/* Value on hover (always visible for non-zero) */}
                                {day.value > 0 && (
                                    <text
                                        x={x + barWidth / 2}
                                        y={y - 5}
                                        textAnchor="middle"
                                        fontSize="8"
                                        fill="#f97316"
                                        fontWeight="600"
                                    >
                                        {(day.value / 1000000).toFixed(1)}M
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    {/* Gradient definition */}
                    <defs>
                        <linearGradient id="burnGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#ea580c" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        );
    };

    // Share Modal for post-donation sharing
    const [showShareModal, setShowShareModal] = useState(false);
    const [lastDonationAmount, setLastDonationAmount] = useState("");

    const ShareModal = () => {
        if (!showShareModal) return null;

        const shareText = `🔥 I just donated ${Number(lastDonationAmount).toLocaleString()} $BANMAO to the Banmao Community Burn Fund! Join me at banmao.fun/defi/burn #Banmao #DeFi`;
        const shareUrl = "https://banmao.fun/defi/burn";

        const shareToX = () => {
            const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
            window.open(url, "_blank");
        };

        const shareToTelegram = () => {
            const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
            window.open(url, "_blank");
        };

        const copyLink = () => {
            navigator.clipboard.writeText(shareUrl);
            setMessage({ type: "success", text: "✅ Link copied!" });
            setTimeout(() => setMessage(null), 3000);
        };

        return createPortal(
            <div
                style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.8)",
                    zIndex: 99998,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
                onClick={() => setShowShareModal(false)}
            >
                <div
                    style={{
                        background: "linear-gradient(145deg, #1e1b4b, #0f172a)",
                        borderRadius: "24px",
                        padding: "32px",
                        maxWidth: "400px",
                        width: "90%",
                        border: "2px solid rgba(249, 115, 22, 0.3)",
                        textAlign: "center"
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
                    <h3 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
                        Donation Successful!
                    </h3>
                    <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "24px" }}>
                        You donated <strong style={{ color: "#f97316" }}>{Number(lastDonationAmount).toLocaleString()}</strong> $BANMAO
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <button
                            onClick={shareToX}
                            style={{
                                background: "#000",
                                color: "#fff",
                                padding: "14px",
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.2)",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px"
                            }}
                        >
                            𝕏 Share to X
                        </button>
                        <button
                            onClick={shareToTelegram}
                            style={{
                                background: "#0088cc",
                                color: "#fff",
                                padding: "14px",
                                borderRadius: "12px",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px"
                            }}
                        >
                            ✈️ Share to Telegram
                        </button>
                        <button
                            onClick={copyLink}
                            style={{
                                background: "rgba(255,255,255,0.1)",
                                color: "#fff",
                                padding: "14px",
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.2)",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: 600
                            }}
                        >
                            📋 Copy Link
                        </button>
                    </div>
                    <button
                        onClick={() => setShowShareModal(false)}
                        style={{
                            marginTop: "16px",
                            background: "none",
                            border: "none",
                            color: "rgba(255,255,255,0.5)",
                            cursor: "pointer",
                            fontSize: "12px"
                        }}
                    >
                        Skip sharing
                    </button>
                </div>
            </div>,
            document.body
        );
    };

    // Verifying Modal - shows during transaction verification
    const VerifyingModal = () => {
        if (!submitting && !isSending && !isTxPending) return null;

        return createPortal(
            <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.9)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 99999,
                backdropFilter: "blur(10px)"
            }}>
                {/* Spinning Banmao Logo */}
                <div style={{
                    width: "100px",
                    height: "100px",
                    marginBottom: "24px",
                    animation: "spin 2s linear infinite"
                }}>
                    <Image
                        src="/images/burn-3d/burn-torch.png"
                        width={100}
                        height={100}
                        alt="Verifying"
                        style={{ width: "100%", height: "100%" }}
                    />
                </div>

                {/* Loading Text */}
                <div style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#f97316",
                    marginBottom: "8px"
                }}>
                    {isSending || isTxPending ? t("sending") : t("verifying")}
                </div>

                {/* Subtitle */}
                <div style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.5)",
                    textAlign: "center",
                    maxWidth: "280px"
                }}>
                    {isSending || isTxPending
                        ? "Processing transaction on blockchain..."
                        : "Verifying your donation on the blockchain..."}
                </div>

                {/* Animated dots */}
                <div style={{
                    marginTop: "16px",
                    display: "flex",
                    gap: "8px"
                }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: "#f97316",
                            animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                        }} />
                    ))}
                </div>
            </div>,
            document.body
        );
    };

    // Donation Success Modal - shows after successful verification
    const [showDonationSuccess, setShowDonationSuccess] = useState(false);
    const [successDonationAmount, setSuccessDonationAmount] = useState("");

    const DonationSuccessModal = () => {
        if (!showDonationSuccess) return null;

        const handleGoToProfile = () => {
            playClick();
            setShowDonationSuccess(false);
            // Find user's contributor entry and open their profile
            const userContributor = contributors.find(c =>
                c.address.toLowerCase() === address?.toLowerCase()
            );
            if (userContributor) {
                setSelectedContributor({
                    ...userContributor,
                    totalBurnedFormatted: formatAmount(userContributor.totalBurned),
                    rank: contributors.findIndex(c => c.address === userContributor.address) + 1
                });
            }
        };

        const handleContinue = () => {
            playClick();
            setShowDonationSuccess(false);
        };

        return createPortal(
            <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 99999,
                backdropFilter: "blur(10px)"
            }}>
                <div style={{
                    background: "linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))",
                    borderRadius: "24px",
                    padding: "77px",
                    maxWidth: "404px",
                    width: "90%",
                    textAlign: "center",
                    border: "2px solid rgba(249, 115, 22, 0.4)",
                    boxShadow: "0 0 60px rgba(249, 115, 22, 0.3)",
                    position: "relative",
                    overflow: "hidden"
                }}>
                    {/* Background Banmao Image with Breathing Effect */}
                    <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        opacity: 0.35,
                        zIndex: 0
                    }}>
                        <div style={{ animation: "breathe 2s ease-in-out infinite" }}>
                            <Image
                                src="/images/burn-3d/donate-heart.png"
                                width={400}
                                height={400}
                                alt="Background"
                                style={{ filter: "brightness(1.2) saturate(1.3)" }}
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <h2 style={{
                        fontSize: "24px",
                        fontWeight: 700,
                        background: "linear-gradient(135deg, #f97316, #fbbf24)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        marginBottom: "16px",
                        position: "relative",
                        zIndex: 1
                    }}>
                        {t("donationSuccessTitle")}
                    </h2>

                    {/* Donation Amount Display */}
                    <div style={{
                        fontSize: "32px",
                        fontWeight: 800,
                        color: "#f97316",
                        marginBottom: "12px",
                        position: "relative",
                        zIndex: 1,
                        textShadow: "0 2px 10px rgba(249, 115, 22, 0.3)"
                    }}>
                        {successDonationAmount} $BANMAO
                    </div>

                    {/* Message */}
                    <p style={{
                        fontSize: "14px",
                        color: "#fff",
                        marginBottom: "8px",
                        fontWeight: 600,
                        position: "relative",
                        zIndex: 1
                    }}>
                        {t("donationThanks")}
                    </p>

                    {/* History Saved Message */}
                    <p style={{
                        fontSize: "12px",
                        color: "rgba(255,255,255,0.85)",
                        marginBottom: "24px",
                        lineHeight: 1.6,
                        position: "relative",
                        zIndex: 1
                    }}>
                        {t("donationHistorySaved")}
                    </p>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", position: "relative", zIndex: 10 }}>
                        <button
                            onClick={handleGoToProfile}
                            onMouseEnter={(e) => { playHover(); e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(249, 115, 22, 0.4)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                            onMouseDown={(e) => { playClick(); e.currentTarget.style.transform = 'scale(0.95)'; }}
                            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                            style={{
                                background: "linear-gradient(135deg, #f97316, #ea580c)",
                                border: "none",
                                borderRadius: "50px",
                                padding: "14px 24px",
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: "14px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                transition: "all 0.2s ease"
                            }}
                        >
                            👤 {t("goToProfile")}
                        </button>
                        <button
                            onClick={handleContinue}
                            onMouseEnter={(e) => { playHover(); e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                            onMouseDown={(e) => { playClick(); e.currentTarget.style.transform = 'scale(0.95)'; }}
                            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                            style={{
                                background: "rgba(255,255,255,0.1)",
                                border: "1px solid rgba(255,255,255,0.2)",
                                borderRadius: "50px",
                                padding: "14px 24px",
                                color: "rgba(255,255,255,0.8)",
                                fontWeight: 600,
                                fontSize: "14px",
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            {t("continueDonating")}
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    return (
        <div className="burn-page">
            {/* Fixed Toast Notification */}
            {message && (
                <div className={`burn-toast ${message.type}`}>
                    {message.text}
                    <button className="burn-toast-close" onClick={() => setMessage(null)}>✕</button>
                </div>
            )}

            {/* Bento Detail Modal */}
            {selectedBentoCell && <BentoDetailModal />}

            {/* Burn History Modal */}
            {showBurnHistoryModal && <BurnHistoryModal />}

            {/* Share Modal - After successful donation */}
            <ShareModal />

            {/* Donation Success Modal - After verification */}
            <DonationSuccessModal />

            {/* Verifying Modal - During verification */}
            <VerifyingModal />

            <div className="burn-page-content">
                {/* Header */}
                <header className="burn-header">
                    {/* Left: Logo + Title */}
                    {/* Left: Empty for balance */}
                    <div className="burn-header-left">
                    </div>

                    {/* Center: Balances */}
                    {isConnected && (
                        <div className="burn-header-center">
                            <div className="burn-balance-pill banmao">
                                <span className="burn-balance-icon">🐱</span>
                                <span className="burn-balance-value">{formatBalance(banmaoBalance)}</span>
                                <span className="burn-balance-label">$BANMAO</span>
                            </div>
                            <div className="burn-balance-pill okb">
                                <span className="burn-balance-icon">⚡</span>
                                <span className="burn-balance-value">{formatBalance(okbBalance)}</span>
                                <span className="burn-balance-label">OKB</span>
                            </div>
                        </div>
                    )}

                    {/* Right: Help, Language, Wallet, Back */}
                    <div className="burn-header-right">
                        <button
                            onClick={() => { playClick(); setShowTour(true); }}
                            className="burn-help-btn"
                            title={t("tourTitle")}
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: "rgba(249, 115, 22, 0.2)",
                                border: "1px solid rgba(249, 115, 22, 0.3)",
                                color: "#f97316",
                                fontSize: "18px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                playHover();
                                e.currentTarget.style.background = "rgba(249, 115, 22, 0.4)";
                                e.currentTarget.style.transform = "scale(1.1)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(249, 115, 22, 0.2)";
                                e.currentTarget.style.transform = "scale(1)";
                            }}
                        >
                            ?
                        </button>
                        {/* Sound Toggle Button */}
                        <button
                            onClick={() => { playClick(); toggleSound(); }}
                            className="burn-sound-btn"
                            title={soundEnabled ? "Mute sounds" : "Enable sounds"}
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: soundEnabled ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                border: `1px solid ${soundEnabled ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                                color: soundEnabled ? "#22c55e" : "#ef4444",
                                fontSize: "16px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                                playHover();
                                e.currentTarget.style.transform = "scale(1.1)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                            }}
                        >
                            {soundEnabled ? "🔊" : "🔇"}
                        </button>
                        <BurnLanguageSelector currentLang={lang} onChangeLang={setLang} />
                        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
                        <Link href="/defi" className="burn-back-btn">
                            {t("backToDeFi")}
                        </Link>
                    </div>
                </header>

                {/* ===================== BENTO BOX DASHBOARD ===================== */}
                <div className="burn-bento-container animate-fade-up">
                    {/* Stats Row - 3 stat cells + 1 info cell */}
                    <div className="burn-bento-cell burn-bento-stat" onClick={() => { playClick(); setSelectedBentoCell("donated"); }}>
                        <div className="burn-bg-watermark bg-stats-donated"></div>
                        <div className="stat-label">{t("totalDonated")}</div>
                        <div className="stat-value">
                            {loading ? <div className="skeleton skeleton-stat" /> : <AnimatedNumbers value={Number(totalDonatedFormatted.replace(/[^0-9.-]+/g, ""))} />}
                        </div>
                        <div className="stat-unit">$BANMAO</div>
                    </div>

                    <div className="burn-bento-cell burn-bento-stat" onClick={() => { playClick(); setShowBurnHistoryModal(true); }} style={{ cursor: "pointer" }} title={t("clickToViewHistory")}>
                        <div className="burn-bg-watermark bg-stats-burned"></div>
                        <div className="stat-label">{t("totalBurned")} 📜</div>
                        <div className="stat-value red">
                            {loading ? <div className="skeleton skeleton-stat" /> : <AnimatedNumbers value={Number(totalBurned.replace(/[^0-9.-]+/g, ""))} />}
                        </div>
                        <div className="stat-unit">$BANMAO (Dead Wallet)</div>
                    </div>

                    <div className="burn-bento-cell burn-bento-stat" onClick={() => { playClick(); setSelectedBentoCell("contributors"); }}>
                        <div className="burn-bg-watermark bg-stats-contributors"></div>
                        <div className="stat-label">{t("contributors")}</div>
                        <div className="stat-value green">
                            {loading ? <div className="skeleton skeleton-stat" /> : <AnimatedNumbers value={contributors.length} />}
                        </div>
                        <div className="stat-unit">Community Members</div>
                    </div>

                    {/* Info Cell - Title & Description */}
                    <div className="burn-bento-cell burn-bento-info">
                        <Image src="/images/burn-3d/burn-torch.png" width={56} height={56} alt="Burn" className="animate-float burn-3d-icon" style={{ marginBottom: "8px" }} />
                        <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #f97316, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            {t("title")}
                        </h3>
                        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: "6px 0 0", lineHeight: 1.4 }}>
                            {t("subtitle")}
                        </p>
                    </div>

                    {/* Allocation Row - 4 cells */}
                    <div className="burn-bento-cell burn-bento-allocation burn" onClick={() => { playClick(); setSelectedBentoCell("burn"); }}>
                        <div className="burn-bg-watermark bg-torch"></div>
                        <div className="alloc-icon">
                            <Image src="/images/burn-3d/burn-torch.png" width={56} height={56} alt="Burn" className="burn-3d-icon" />
                        </div>
                        <div className="alloc-title">{t("tokenBurn")}</div>
                        <div className="alloc-desc">{t("reduceSupply")}</div>
                    </div>

                    <div className="burn-bento-cell burn-bento-allocation games" onClick={() => { playClick(); setSelectedBentoCell("games"); }}>
                        <div className="burn-bg-watermark bg-controller"></div>
                        <div className="alloc-icon">
                            <Image src="/images/burn-3d/game-controller.png" width={56} height={56} alt="Games" className="burn-3d-icon" />
                        </div>
                        <div className="alloc-title">{t("gamePools")}</div>
                        <div className="alloc-desc">{t("slotsRpsSnake")}</div>
                    </div>

                    <div className="burn-bento-cell burn-bento-allocation airdrops" onClick={() => { playClick(); setSelectedBentoCell("airdrops"); }}>
                        <div className="burn-bg-watermark bg-gift"></div>
                        <div className="alloc-icon">
                            <Image src="/images/burn-3d/airdrop-gift.png" width={56} height={56} alt="Airdrop" className="burn-3d-icon" />
                        </div>
                        <div className="alloc-title">{t("airdrops")}</div>
                        <div className="alloc-desc">{t("communityRewards")}</div>
                    </div>

                    <div className="burn-bento-cell burn-bento-allocation dev" onClick={() => { playClick(); setSelectedBentoCell("dev"); }}>
                        <div className="burn-bg-watermark bg-dev"></div>
                        <div className="alloc-icon">
                            <Image src="/images/burn-3d/dev-coding.png" width={56} height={56} alt="Dev" className="burn-3d-icon" />
                        </div>
                        <div className="alloc-title">{t("development")}</div>
                        <div className="alloc-desc">{t("newFeatures")}</div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="burn-main-grid animate-fade-up delay-200">
                    <div className="burn-card">
                        <div className="burn-bg-watermark bg-heart"></div>
                        <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Image src="/images/burn-3d/donate-heart.png" width={36} height={36} alt="Donate" className="animate-float burn-3d-icon" />
                            {t("submitDonation")}
                        </h3>
                        <p className="burn-form-description">{t("submitDesc")}</p>

                        <div className="burn-wallet-box">
                            <div className="burn-wallet-label">{t("communityWallet")}</div>
                            <div
                                className="burn-wallet-address-container"
                                onClick={() => copyToClipboard(COMMUNITY_WALLET, "msgWalletCopied")}
                                title="Click to copy"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "8px",
                                    cursor: "pointer",
                                    padding: "12px 16px",
                                    background: "rgba(249, 115, 22, 0.1)",
                                    border: "1px solid rgba(249, 115, 22, 0.2)",
                                    borderRadius: "50px",
                                    transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "rgba(249, 115, 22, 0.2)";
                                    e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.4)";
                                    e.currentTarget.style.transform = "scale(1.02)";
                                    e.currentTarget.style.boxShadow = "0 0 20px rgba(249, 115, 22, 0.3)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "rgba(249, 115, 22, 0.1)";
                                    e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.2)";
                                    e.currentTarget.style.transform = "scale(1)";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                                onMouseDown={(e) => {
                                    e.currentTarget.style.transform = "scale(0.98)";
                                }}
                                onMouseUp={(e) => {
                                    e.currentTarget.style.transform = "scale(1.02)";
                                }}
                            >
                                <code
                                    className="burn-wallet-address"
                                    style={{ fontSize: "14px", wordBreak: "break-all", fontWeight: 600 }}
                                >
                                    {COMMUNITY_WALLET}
                                </code>
                                <button
                                    onClick={(e) => { e.stopPropagation(); openExplorer(COMMUNITY_WALLET, "address"); }}
                                    className="burn-icon-btn"
                                    title="View on Explorer"
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", opacity: 0.7 }}
                                >
                                    🔗
                                </button>
                            </div>
                        </div>

                        {isConnected ? (
                            <>
                                {/* Section 1: Direct Transfer */}
                                <div className="burn-section burn-transfer-section" style={{
                                    background: "rgba(249, 115, 22, 0.08)",
                                    borderRadius: "28px",
                                    padding: "18px 22px",
                                    marginTop: "12px",
                                    border: "1px solid rgba(249, 115, 22, 0.2)"
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: "6px", color: "#f97316", fontSize: "13px" }}>
                                        🚀 {t("directTransfer")}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginBottom: "10px" }}>
                                        {t("directTransferDesc")}
                                    </div>
                                    <div className="burn-form-group">
                                        <label>{t("amount")} ($BANMAO)</label>
                                        <input
                                            type="text"
                                            value={donationAmount ? Number(donationAmount).toLocaleString() : ""}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/,/g, '');
                                                if (/^\d*$/.test(val)) {
                                                    setDonationAmount(val);
                                                }
                                            }}
                                            placeholder="100,000"
                                            className="burn-form-input"
                                        />
                                        <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                                            {[50000, 100000, 200000, 500000, 1000000, 2000000, 5000000, 10000000].map((amt) => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setDonationAmount(amt.toString())}
                                                    style={{
                                                        background: "rgba(255,255,255,0.1)",
                                                        border: "1px solid rgba(255,255,255,0.1)",
                                                        borderRadius: "20px",
                                                        padding: "4px 10px",
                                                        color: "#fff",
                                                        fontSize: "10px",
                                                        cursor: "pointer",
                                                        transition: "all 0.2s"
                                                    }}
                                                    className="burn-amount-pill"
                                                >
                                                    {amt.toLocaleString()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSendDonation}
                                        disabled={isSending || isTxPending || !donationAmount}
                                        className="burn-submit-btn"
                                        style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                                    >
                                        {isSending || isTxPending ? t("sending") : `🚀 ${t("sendDonation")}`}
                                    </button>
                                </div>

                                {/* Divider */}
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    margin: "14px 0",
                                    color: "rgba(255,255,255,0.4)"
                                }}>
                                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.15)" }} />
                                    <span style={{ fontSize: "10px", textTransform: "uppercase" }}>{t("orDivider")}</span>
                                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.15)" }} />
                                </div>

                                {/* Section 2: Verify Hash */}
                                <div className="burn-section burn-form-section" style={{
                                    background: "rgba(34, 197, 94, 0.08)",
                                    borderRadius: "28px",
                                    padding: "18px 22px",
                                    border: "1px solid rgba(34, 197, 94, 0.2)"
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: "6px", color: "#22c55e", fontSize: "13px" }}>
                                        ✅ {t("verifyDonation")}
                                    </div>
                                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginBottom: "10px" }}>
                                        {t("verifyDesc")}
                                    </div>
                                    <form onSubmit={handleSubmit}>
                                        <div className="burn-form-group">
                                            <label>{t("txHash")}</label>
                                            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                                <input
                                                    type="text"
                                                    value={txHash}
                                                    onChange={(e) => setTxHash(e.target.value)}
                                                    placeholder="0x..."
                                                    className="burn-form-input"
                                                    style={{ paddingRight: "70px" }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            const text = await navigator.clipboard.readText();
                                                            setTxHash(text);
                                                        } catch (err) {
                                                            setMessage({ type: "error", text: "❌ Paste failed" });
                                                        }
                                                    }}
                                                    style={{
                                                        position: "absolute",
                                                        right: "8px",
                                                        background: "rgba(249, 115, 22, 0.2)",
                                                        border: "1px solid rgba(249, 115, 22, 0.3)",
                                                        borderRadius: "20px",
                                                        padding: "6px 12px",
                                                        color: "#f97316",
                                                        fontSize: "11px",
                                                        cursor: "pointer",
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    📋 {t("paste")}
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="burn-submit-btn"
                                            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                                        >
                                            {submitting ? t("verifying") : `✅ ${t("submit")}`}
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="burn-connect-box">
                                <p>{t("connectWallet")}</p>
                                <ConnectButton />
                            </div>
                        )}


                        {/* My Contribution */}
                        {myContributor && (
                            <div className="burn-my-contribution">
                                <div className="burn-my-header">
                                    <span className="burn-my-title">{t("yourDonations")}</span>
                                    <span className="burn-my-rank">Rank #{myContributor.rank}</span>
                                </div>
                                <div className="burn-my-total">
                                    {myContributor.totalBurnedFormatted} $BANMAO
                                </div>
                                <div className="burn-my-count">
                                    {myContributor.burnCount} {t("donations")}
                                </div>
                                <button
                                    onClick={() => setShowMyDonations(!showMyDonations)}
                                    className="burn-history-btn"
                                >
                                    {showMyDonations ? t("hideHistory") : t("showHistory")}
                                </button>
                                {showMyDonations && (
                                    <div className="burn-modal-history-list" style={{ marginTop: "10px", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
                                        {myContributor.donations.length === 0 ? (
                                            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "12px", padding: "10px" }}>
                                                {t("noDonations")}
                                            </div>
                                        ) : (
                                            myContributor.donations.map((d, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        padding: "10px",
                                                        background: "rgba(0, 0, 0, 0.2)",
                                                        borderRadius: "10px",
                                                        marginTop: "6px",
                                                        fontSize: "12px",
                                                        border: "1px solid rgba(255,255,255,0.05)"
                                                    }}
                                                >
                                                    <div style={{ color: "var(--burn-primary)", fontWeight: "600", marginBottom: "4px" }}>
                                                        {formatAmount(d.amount)} $BANMAO
                                                    </div>
                                                    <a
                                                        href={`https://web3.okx.com/explorer/x-layer/tx/${d.txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: "#60a5fa", wordBreak: "break-all", display: "block", marginBottom: "4px", fontSize: "11px", textDecoration: "none" }}
                                                        className="burn-social-link"
                                                    >
                                                        {d.txHash.slice(0, 10)}...{d.txHash.slice(-8)}
                                                    </a>
                                                    <div style={{ color: "#94a3b8", fontSize: "11px" }}>
                                                        {formatDate(d.timestamp)}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Leaderboard */}
                    <div className="burn-card burn-leaderboard-section">
                        <div className="burn-bg-watermark bg-trophy"></div>
                        <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Image src="/images/burn-3d/leaderboard-win.png" width={36} height={36} alt="Leaderboard" className="animate-float burn-3d-icon" />
                            {t("topDonors")}
                        </h3>

                        {loading ? (
                            <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px" }}>
                                {t("loading")}
                            </div>
                        ) : contributors.length === 0 ? (
                            <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px" }}>
                                {t("noDonations")}
                            </div>
                        ) : (
                            <div className="burn-leaderboard">
                                {contributors.map((c) => (
                                    <div
                                        key={c.address}
                                        className={`burn-leaderboard-item clickable ${c.rank === 1 ? "top1" :
                                            c.rank === 2 ? "top2" :
                                                c.rank === 3 ? "top3" : "normal"
                                            } ${address?.toLowerCase() === c.address.toLowerCase() ? "me" : ""}`}
                                        onClick={() => setSelectedContributor(c)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <div className={`burn-rank ${c.rank === 1 ? "gold" :
                                            c.rank === 2 ? "silver" :
                                                c.rank === 3 ? "bronze" : "normal"
                                            }`}>
                                            {c.rank === 1 ? "🥇" :
                                                c.rank === 2 ? "🥈" :
                                                    c.rank === 3 ? "🥉" : c.rank}
                                        </div>
                                        <div className="burn-avatar">
                                            {AVATARS[c.avatar] || "🔥"}
                                        </div>
                                        <div className="burn-user-info">
                                            <div className="burn-user-name">{c.name}</div>
                                            <div className="burn-user-address" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                                                    <span
                                                        onClick={(e) => { e.stopPropagation(); copyToClipboard(c.address, "msgAddressCopied"); }}
                                                        title="Click to copy"
                                                        className="burn-short-address"
                                                        style={{ cursor: "pointer", borderBottom: "1px dashed rgba(255,255,255,0.3)", fontSize: "11px", whiteSpace: "nowrap" }}
                                                    >
                                                        {c.address.slice(0, 6)}...{c.address.slice(-4)}
                                                    </span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openExplorer(c.address, "address"); }}
                                                        title="View on Explorer"
                                                        style={{
                                                            background: "none",
                                                            border: "none",
                                                            cursor: "pointer",
                                                            fontSize: "12px",
                                                            opacity: 0.6,
                                                            padding: 0
                                                        }}
                                                    >
                                                        🔗
                                                    </button>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                                    {c.twitter && (
                                                        <a
                                                            href={`https://x.com/${c.twitter.replace('@', '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="burn-social-link"
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ fontSize: "11px", color: "#60a5fa", display: "flex", alignItems: "center", gap: "2px", textDecoration: "none", whiteSpace: "nowrap" }}
                                                        >
                                                            𝕏 {c.twitter}
                                                        </a>
                                                    )}
                                                    {c.telegram && (
                                                        <a
                                                            href={`https://t.me/${c.telegram.replace('@', '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="burn-social-link"
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ fontSize: "11px", color: "#38bdf8", display: "flex", alignItems: "center", gap: "2px", textDecoration: "none", whiteSpace: "nowrap" }}
                                                        >
                                                            ✈️ {c.telegram}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="burn-user-stats">
                                            <div className="burn-user-amount">{c.totalBurnedFormatted}</div>
                                            <div className="burn-user-count">{c.burnCount} {t("donations")}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>



                {/* How It Works */}
                <div className="burn-info-section animate-fade-up delay-400">
                    <h3 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Image src="/images/burn-3d/airdrop-gift.png" width={36} height={36} alt="How it works" className="animate-float burn-3d-icon" />
                        {t("howItWorks")}
                    </h3>
                    <div className="burn-bg-watermark bg-gift"></div>
                    <ol>
                        <li>
                            {t("step1")}:{" "}
                            <code style={{
                                background: "rgba(0, 0, 0, 0.3)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "11px",
                            }}>
                                {COMMUNITY_WALLET}
                            </code>
                        </li>
                        <li>{t("step2")}</li>
                        <li>{t("step3")}</li>
                        <li>{t("step4")}</li>
                    </ol>
                </div>
            </div>

            {/* Contributor Detail Modal */}
            {
                selectedContributor && typeof document !== "undefined" && createPortal(
                    <ContributorModal
                        contributor={selectedContributor}
                        userAddress={address}
                        onClose={() => setSelectedContributor(null)}
                        copied={copied}
                        setCopied={setCopied}
                        donorProfile={donorProfile}
                        setDonorProfile={setDonorProfile}
                        isEditingProfile={isEditingProfile}
                        setIsEditingProfile={setIsEditingProfile}
                        isSavingProfile={isSavingProfile}
                        setIsSavingProfile={setIsSavingProfile}
                        profileEditName={profileEditName}
                        setProfileEditName={setProfileEditName}
                        profileEditAvatar={profileEditAvatar}
                        setProfileEditAvatar={setProfileEditAvatar}
                        profileEditTelegram={profileEditTelegram}
                        setProfileEditTelegram={setProfileEditTelegram}
                        profileEditTwitter={profileEditTwitter}
                        setProfileEditTwitter={setProfileEditTwitter}
                        formatAmount={formatAmount}
                        formatDate={formatDate}
                        t={t}
                    />,
                    document.body
                )
            }

            {/* Help Tour Modal */}
            {showTour && (
                <BurnTourModal
                    t={t}
                    onClose={() => setShowTour(false)}
                />
            )}
        </div >
    );
}

// Contributor Modal Component
function ContributorModal({
    contributor,
    userAddress,
    onClose,
    copied,
    setCopied,
    donorProfile,
    setDonorProfile,
    isEditingProfile,
    setIsEditingProfile,
    isSavingProfile,
    setIsSavingProfile,
    profileEditName,
    setProfileEditName,
    profileEditAvatar,
    setProfileEditAvatar,
    profileEditTelegram,
    setProfileEditTelegram,
    profileEditTwitter,
    setProfileEditTwitter,
    formatAmount,
    formatDate,
    t,
}: {
    contributor: LeaderboardContributor;
    userAddress?: `0x${string}`;
    onClose: () => void;
    copied: boolean;
    setCopied: (v: boolean) => void;
    donorProfile: { name: string; avatar: number; telegram: string; twitter: string; editCount: number } | null;
    setDonorProfile: (v: { name: string; avatar: number; telegram: string; twitter: string; editCount: number } | null) => void;
    isEditingProfile: boolean;
    setIsEditingProfile: (v: boolean) => void;
    isSavingProfile: boolean;
    setIsSavingProfile: (v: boolean) => void;
    profileEditName: string;
    setProfileEditName: (v: string) => void;
    profileEditAvatar: number;
    setProfileEditAvatar: (v: number) => void;
    profileEditTelegram: string;
    setProfileEditTelegram: (v: string) => void;
    profileEditTwitter: string;
    setProfileEditTwitter: (v: string) => void;
    formatAmount: (amount: string) => string;
    formatDate: (ts: number) => string;
    t: (key: string) => string;
}) {
    const isOwnProfile = userAddress && contributor.address.toLowerCase() === userAddress.toLowerCase();

    // Fetch profile when modal opens
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`/api/burn-profiles?address=${contributor.address}`);
                const data = await res.json();
                if (data.success && data.profile) {
                    setDonorProfile(data.profile);
                    setProfileEditName(data.profile.name);
                    setProfileEditAvatar(data.profile.avatar);
                    setProfileEditTelegram(data.profile.telegram || "");
                    setProfileEditTwitter(data.profile.twitter || "");
                } else if (data.default) {
                    setDonorProfile({
                        name: data.default.name,
                        avatar: data.default.avatar,
                        telegram: "",
                        twitter: "",
                        editCount: 0
                    });
                    setProfileEditName(data.default.name);
                    setProfileEditAvatar(data.default.avatar);
                    setProfileEditTelegram("");
                    setProfileEditTwitter("");
                }
            } catch (err) {
                console.error("Failed to fetch profile:", err);
            }
        };
        fetchProfile();
        return () => {
            setDonorProfile(null);
            setIsEditingProfile(false);
        };
    }, [contributor.address]);

    // Save profile
    const handleSaveProfile = async () => {
        if (!userAddress) return;
        setIsSavingProfile(true);
        try {
            const res = await fetch("/api/burn-profiles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    address: contributor.address,
                    name: profileEditName,
                    avatar: profileEditAvatar,
                    telegram: profileEditTelegram,
                    twitter: profileEditTwitter
                })
            });
            const data = await res.json();
            if (data.success) {
                setDonorProfile(data.profile);
                setIsEditingProfile(false);
            } else {
                alert(data.error || "Failed to save profile");
            }
        } catch (err) {
            console.error("Failed to save profile:", err);
        } finally {
            setIsSavingProfile(false);
        }
    };

    return (
        <div className="burn-modal-overlay" onClick={onClose}>
            <div className="burn-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="burn-modal-header">
                    <h3>🔥 {t("donorDetails")}</h3>
                    <button className="burn-modal-close" onClick={onClose}>✕</button>
                </div>

                {/* Profile Section */}
                <div className="burn-modal-profile">
                    <div className="burn-modal-avatar">
                        {donorProfile ? AVATARS[donorProfile.avatar] : AVATARS[contributor.avatar] || "🔥"}
                    </div>
                    <div className="burn-modal-info">
                        <div className="burn-modal-name">
                            {donorProfile?.name || contributor.name}
                        </div>
                        <div className="burn-modal-rank">
                            {contributor.rank === 1 ? "🥇" :
                                contributor.rank === 2 ? "🥈" :
                                    contributor.rank === 3 ? "🥉" : `#${contributor.rank}`}
                            {" "}{t("rank")}
                        </div>
                        {/* Show social links for visitors */}
                        {!isOwnProfile && donorProfile && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                                {donorProfile.twitter && (
                                    <a
                                        href={`https://x.com/${donorProfile.twitter.replace('@', '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            fontSize: "10px",
                                            color: "#60a5fa",
                                            textDecoration: "none",
                                            background: "rgba(96, 165, 250, 0.15)",
                                            padding: "2px 8px",
                                            borderRadius: "12px"
                                        }}
                                    >
                                        𝕏 {donorProfile.twitter}
                                    </a>
                                )}
                                {donorProfile.telegram && (
                                    <a
                                        href={`https://t.me/${donorProfile.telegram.replace('@', '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            fontSize: "10px",
                                            color: "#22d3ee",
                                            textDecoration: "none",
                                            background: "rgba(34, 211, 238, 0.15)",
                                            padding: "2px 8px",
                                            borderRadius: "12px"
                                        }}
                                    >
                                        📱 {donorProfile.telegram}
                                    </a>
                                )}
                            </div>
                        )}
                        {/* Show edit count for owner */}
                        {isOwnProfile && donorProfile && (
                            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                                ✏️ {donorProfile.editCount}/3 {t("editsUsed")}
                            </div>
                        )}
                    </div>
                    {/* Edit button for own profile */}
                    {isOwnProfile && donorProfile && donorProfile.editCount < 3 && !isEditingProfile && (
                        <button
                            onClick={() => setIsEditingProfile(true)}
                            style={{
                                padding: "6px 14px",
                                background: "rgba(249, 115, 22, 0.3)",
                                border: "1px solid rgba(249, 115, 22, 0.5)",
                                borderRadius: "20px",
                                color: "#f97316",
                                fontSize: "10px",
                                cursor: "pointer",
                                fontWeight: 600,
                                whiteSpace: "nowrap"
                            }}
                        >
                            ✏️ {t("editProfile")}
                        </button>
                    )}
                </div>

                {/* Profile Edit Mode */}
                {isEditingProfile && donorProfile && (
                    <div style={{
                        padding: "16px 24px",
                        background: "rgba(249, 115, 22, 0.1)",
                        borderTop: "1px solid rgba(249, 115, 22, 0.2)"
                    }}>
                        {/* Avatar Picker */}
                        <div style={{ marginBottom: "12px" }}>
                            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginBottom: "6px" }}>
                                {t("selectAvatar")}:
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {AVATARS.map((emoji, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setProfileEditAvatar(idx)}
                                        style={{
                                            width: "32px",
                                            height: "32px",
                                            fontSize: "18px",
                                            background: profileEditAvatar === idx
                                                ? "rgba(249, 115, 22, 0.4)"
                                                : "rgba(255,255,255,0.08)",
                                            border: profileEditAvatar === idx
                                                ? "2px solid #f97316"
                                                : "1px solid rgba(255,255,255,0.15)",
                                            borderRadius: "50%",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: 0
                                        }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name Input */}
                        <input
                            type="text"
                            value={profileEditName}
                            onChange={(e) => setProfileEditName(e.target.value.slice(0, 20))}
                            placeholder={t("displayName")}
                            maxLength={20}
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(249, 115, 22, 0.4)",
                                borderRadius: "12px",
                                color: "#fff",
                                fontSize: "13px",
                                marginBottom: "8px",
                                boxSizing: "border-box"
                            }}
                        />
                        <input
                            type="text"
                            value={profileEditTelegram}
                            onChange={(e) => setProfileEditTelegram(e.target.value.slice(0, 50))}
                            placeholder="Telegram @username"
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(34, 211, 238, 0.4)",
                                borderRadius: "12px",
                                color: "#fff",
                                fontSize: "13px",
                                marginBottom: "8px",
                                boxSizing: "border-box"
                            }}
                        />
                        <input
                            type="text"
                            value={profileEditTwitter}
                            onChange={(e) => setProfileEditTwitter(e.target.value.slice(0, 50))}
                            placeholder="X (Twitter) @username"
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(96, 165, 250, 0.4)",
                                borderRadius: "12px",
                                color: "#fff",
                                fontSize: "13px",
                                marginBottom: "12px",
                                boxSizing: "border-box"
                            }}
                        />

                        {/* Buttons */}
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                onClick={() => setIsEditingProfile(false)}
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    background: "rgba(255,255,255,0.1)",
                                    border: "1px solid rgba(255,255,255,0.2)",
                                    borderRadius: "12px",
                                    color: "rgba(255,255,255,0.7)",
                                    fontSize: "12px",
                                    cursor: "pointer"
                                }}
                            >
                                {t("cancel")}
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSavingProfile}
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                                    border: "none",
                                    borderRadius: "12px",
                                    color: "#fff",
                                    fontSize: "12px",
                                    cursor: isSavingProfile ? "wait" : "pointer",
                                    fontWeight: 600,
                                    opacity: isSavingProfile ? 0.7 : 1
                                }}
                            >
                                {isSavingProfile ? "⏳..." : `💾 ${t("save")}`}
                            </button>
                        </div>

                        <div style={{
                            fontSize: "10px",
                            color: "rgba(255,255,255,0.35)",
                            marginTop: "8px",
                            textAlign: "center"
                        }}>
                            ⚠️ {3 - donorProfile.editCount} {t("editsRemaining")}
                        </div>
                    </div>
                )}

                {/* Address with copy */}
                <div className="burn-modal-address">
                    <a
                        href={`https://web3.okx.com/explorer/x-layer/address/${contributor.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="burn-modal-address-link"
                    >
                        {contributor.address}
                    </a>
                    <button
                        className="burn-modal-copy-btn"
                        onClick={() => {
                            navigator.clipboard.writeText(contributor.address);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                    >
                        {copied ? t("copied") : t("copy")}
                    </button>
                </div>

                {/* Stats */}
                <div className="burn-modal-stats">
                    <div className="burn-modal-stat">
                        <div className="burn-modal-stat-label">{t("totalDonated")}</div>
                        <div className="burn-modal-stat-value orange">{contributor.totalBurnedFormatted}</div>
                        <div className="burn-modal-stat-unit">$BANMAO</div>
                    </div>
                    <div className="burn-modal-stat">
                        <div className="burn-modal-stat-label">{t("donations")}</div>
                        <div className="burn-modal-stat-value">{contributor.burnCount}</div>
                        <div className="burn-modal-stat-unit">{t("times")}</div>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="burn-modal-history">
                    <div className="burn-modal-history-title">📜 {t("txHistory")}</div>
                    <div className="burn-modal-history-list">
                        {contributor.donations.length === 0 ? (
                            <div className="burn-modal-empty">{t("noTxRecorded")}</div>
                        ) : (
                            contributor.donations.map((d, i) => (
                                <div key={i} className="burn-modal-tx">
                                    <div className="burn-modal-tx-amount">
                                        {formatAmount(d.amount)} $BANMAO
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <a
                                            href={`https://web3.okx.com/explorer/x-layer/tx/${d.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="burn-modal-tx-hash"
                                            title="View on Explorer"
                                        >
                                            {d.txHash.slice(0, 10)}...{d.txHash.slice(-6)} ↗️
                                        </a>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(d.txHash);
                                                // Minimal feedback since we are in modal and don't have message toast easily accessible
                                                // Could be improved but icon change is subtle enough usually
                                            }}
                                            title="Copy Hash"
                                            style={{
                                                background: "rgba(255,255,255,0.1)",
                                                border: "none",
                                                borderRadius: "4px",
                                                cursor: "pointer",
                                                fontSize: "10px",
                                                padding: "2px 4px",
                                                color: "rgba(255,255,255,0.7)"
                                            }}
                                        >
                                            📋
                                        </button>
                                    </div>
                                    <div className="burn-modal-tx-date">
                                        {formatDate(d.timestamp)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
