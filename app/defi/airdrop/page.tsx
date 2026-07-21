"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { translations, Language, LANGUAGES } from "./i18n";
import dynamic from "next/dynamic";
import "./airdrop.css";

const AirdropPanel = dynamic(() => import("./components/AirdropPanel"), {
    ssr: false,
    loading: () => (
        <div className="airdrop-skeleton">
            <div className="airdrop-skeleton-line w60" />
            <div className="airdrop-skeleton-line w80" />
            <div className="airdrop-skeleton-line h40" />
            <div className="airdrop-skeleton-line w40" />
            <div className="airdrop-skeleton-line h40" />
            <div className="airdrop-skeleton-line w60" />
        </div>
    ),
});

// ===================== SPOTLIGHT TOUR (same pattern as /defi/burn) =====================
type TourPosition = "top" | "bottom" | "left" | "right";
interface TourStep {
    selector: string;
    title: string;
    desc: string;
    position: TourPosition;
}

function AirdropTourModal({ t, theme, onClose, onDismissForever }: { t: (key: string) => string; theme: "dark" | "light"; onClose: () => void; onDismissForever: () => void }) {
    const [step, setStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const steps: TourStep[] = [
        { selector: ".airdrop-panel-header-v2", title: t("tourAirdropStep1Title"), desc: t("tourAirdropStep1Desc"), position: "bottom" },
        { selector: ".airdrop-data-tabs", title: t("tourAirdropStep2Title"), desc: t("tourAirdropStep2Desc"), position: "bottom" },
        { selector: ".airdrop-tab[data-tab='manual']", title: t("tourManualTitle"), desc: t("tourManualDesc"), position: "bottom" },
        { selector: ".airdrop-tab[data-tab='scan']", title: t("tourScanTitle"), desc: t("tourScanDesc"), position: "bottom" },
        { selector: ".airdrop-tab[data-tab='csv']", title: t("tourCsvTitle"), desc: t("tourCsvDesc"), position: "bottom" },
        { selector: ".airdrop-token-selector", title: t("tourAirdropStep4Title"), desc: t("tourAirdropStep4Desc"), position: "bottom" },
        { selector: ".airdrop-amount-section", title: t("tourAirdropStep5Title"), desc: t("tourAirdropStep5Desc"), position: "top" },
        { selector: ".airdrop-balance-gas-row", title: t("tourAirdropStep6Title"), desc: t("tourAirdropStep6Desc"), position: "top" },
        { selector: ".airdrop-speed-mode", title: t("tourSpeedTitle"), desc: t("tourSpeedDesc"), position: "top" },
        { selector: ".airdrop-execute-btn", title: t("tourAirdropStep7Title"), desc: t("tourAirdropStep7Desc"), position: "top" },
    ];

    useEffect(() => {
        const currentStep = steps[step];
        if (!currentStep) return;

        // Some steps require switching to "manual" tab to make elements visible
        if (step === 2 || step === 5 || step === 6 || step === 7 || step === 8 || step === 9) {
            const manualBtn = document.querySelector<HTMLElement>(".airdrop-tab[data-tab='manual']");
            const activeTab = document.querySelector(".airdrop-tab.active");
            if (manualBtn && activeTab && !activeTab.matches("[data-tab='manual']")) {
                manualBtn.click();
            }
        }

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

        // Small delay to allow tab switch DOM updates
        const initTimer = setTimeout(updatePosition, 150);
        const retryTimer = setTimeout(updatePosition, 400);
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition);

        return () => {
            clearTimeout(initTimer);
            clearTimeout(retryTimer);
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition);
        };
    }, [step]);

    const getTooltipStyle = (): React.CSSProperties => {
        const tooltipWidth = 340;
        const tooltipHeight = 220;
        const padding = 16;
        const safeMargin = 10;

        if (!targetRect) {
            return { top: "50%", left: "50%", transform: "translate(-50%, -50%)", maxWidth: `calc(100vw - ${safeMargin * 2}px)` };
        }

        const position = steps[step]?.position || "bottom";
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        let top: number | undefined, left: number | undefined, bottom: number | undefined, right: number | undefined;

        switch (position) {
            case "bottom": top = targetRect.bottom + padding; left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2; break;
            case "top": bottom = vh - targetRect.top + padding; left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2; break;
            case "left": top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2; right = vw - targetRect.left + padding; break;
            case "right": top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2; left = targetRect.right + padding; break;
        }

        const actualWidth = Math.min(tooltipWidth, vw - safeMargin * 2);
        if (left !== undefined) left = Math.max(safeMargin, Math.min(left, vw - actualWidth - safeMargin));
        if (right !== undefined) right = Math.max(safeMargin, Math.min(right, vw - actualWidth - safeMargin));
        if (top !== undefined) top = Math.max(safeMargin, Math.min(top, vh - tooltipHeight - safeMargin));
        if (bottom !== undefined) bottom = Math.max(safeMargin, Math.min(bottom, vh - tooltipHeight - safeMargin));

        const style: React.CSSProperties = { maxWidth: `calc(100vw - ${safeMargin * 2}px)`, width: Math.min(tooltipWidth, vw - safeMargin * 2) };
        if (top !== undefined) style.top = top;
        if (left !== undefined) style.left = left;
        if (right !== undefined) style.right = right;
        if (bottom !== undefined) style.bottom = bottom;
        return style;
    };

    return createPortal(
        <>
            <style>{`
                @keyframes airdrop-spotlight-pulse {
                    0%, 100% { box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.6), 0 0 20px rgba(249, 115, 22, 0.4); }
                    50% { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.6); }
                }
                @keyframes airdrop-hand-bounce {
                    0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(-15deg); }
                    50% { transform: translate(-50%, -50%) translateY(-12px) rotate(-15deg); }
                }
                @keyframes airdrop-tooltip-slide {
                    0% { opacity: 0; transform: translateY(20px) scale(0.95); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>

            {/* Dark overlay with spotlight cutout */}
            <div style={{ position: "fixed", inset: 0, zIndex: 99990, pointerEvents: "none" }}>
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "auto" }} onClick={onClose}>
                    <defs>
                        <mask id="airdrop-spotlight-mask">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {targetRect && (
                                <rect
                                    x={targetRect.left - 12}
                                    y={targetRect.top - 12}
                                    width={targetRect.width + 24}
                                    height={targetRect.height + 24}
                                    rx="14" fill="black"
                                />
                            )}
                        </mask>
                    </defs>
                    <rect x="0" y="0" width="100%" height="100%" fill="rgba(0, 0, 0, 0.8)" mask="url(#airdrop-spotlight-mask)" />
                </svg>

                {/* Spotlight border */}
                {targetRect && (
                    <div style={{
                        position: "fixed", left: targetRect.left - 12, top: targetRect.top - 12,
                        width: targetRect.width + 24, height: targetRect.height + 24,
                        borderRadius: "14px", border: "3px solid #f97316",
                        pointerEvents: "none", zIndex: 99995,
                        animation: "airdrop-spotlight-pulse 2s ease-in-out infinite",
                        transition: "all 0.4s ease-out",
                    }} />
                )}

                {/* Pointing hand */}
                {targetRect && (
                    <div style={{
                        position: "fixed", left: targetRect.right + 10, top: targetRect.bottom + 10,
                        fontSize: "36px", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))",
                        animation: "airdrop-hand-bounce 0.8s ease-in-out infinite",
                        pointerEvents: "none", zIndex: 99996, transition: "all 0.4s ease-out",
                    }}>👆</div>
                )}

                {/* Tooltip */}
                <div
                    key={step}
                    style={{
                        position: "fixed", ...getTooltipStyle(),
                        background: theme === "light" ? "linear-gradient(145deg, #f7f2ed, #efe8e0)" : "linear-gradient(145deg, rgba(35, 25, 60, 0.98), rgba(20, 12, 45, 0.98))",
                        backdropFilter: "blur(24px)", borderRadius: "20px",
                        border: theme === "light" ? "2px solid rgba(234, 88, 12, 0.3)" : "2px solid rgba(249, 115, 22, 0.5)",
                        boxShadow: theme === "light" ? "0 20px 60px rgba(0, 0, 0, 0.15), 0 0 40px rgba(249, 115, 22, 0.1)" : "0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(249, 115, 22, 0.25)",
                        padding: "16px", zIndex: 99997, pointerEvents: "auto",
                        animation: "airdrop-tooltip-slide 0.4s ease-out forwards",
                        boxSizing: "border-box",
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Progress dots */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div style={{ display: "flex", gap: "4px" }}>
                            {steps.map((_, idx) => (
                                <div key={idx} style={{
                                    width: idx === step ? "20px" : "8px", height: "8px", borderRadius: "4px",
                                    background: idx === step ? "linear-gradient(90deg, #f97316, #fbbf24)" : idx < step ? "#22c55e" : theme === "light" ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.2)",
                                    transition: "all 0.3s", cursor: "pointer",
                                }} onClick={() => setStep(idx)} />
                            ))}
                        </div>
                        <span style={{ fontSize: "12px", color: "#f97316" }}>{step + 1}/{steps.length}</span>
                    </div>

                    {/* Title */}
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 700, color: "#ea580c", textShadow: theme === "light" ? "none" : "0 0 10px rgba(249, 115, 22, 0.5)" }}>
                        {steps[step].title}
                    </h3>

                    {/* Description */}
                    <p style={{ margin: "0 0 16px 0", fontSize: "13px", lineHeight: 1.6, color: theme === "light" ? "#4a4555" : "#e2e8f0" }}>
                        {steps[step].desc}
                    </p>

                    {/* Navigation + Don't show again */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <button onClick={() => { if (dontShowAgain) onDismissForever(); onClose(); }} style={{ padding: "8px 16px", background: "transparent", border: theme === "light" ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", color: theme === "light" ? "#8a8595" : "rgba(255,255,255,0.6)", fontSize: "12px", cursor: "pointer" }}>
                                ✕ Skip
                            </button>
                            <div style={{ display: "flex", gap: "8px" }}>
                                {step > 0 && (
                                    <button onClick={() => setStep(s => s - 1)} style={{ padding: "8px 16px", background: theme === "light" ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.1)", border: theme === "light" ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", color: theme === "light" ? "#1a1a2e" : "#e2e8f0", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                        ← {t("guidePrev")}
                                    </button>
                                )}
                                <button onClick={() => { if (step < steps.length - 1) setStep(s => s + 1); else { if (dontShowAgain) onDismissForever(); onClose(); } }} style={{
                                    padding: "8px 20px",
                                    background: step === steps.length - 1 ? "linear-gradient(135deg, #22c55e, #16a34a)" : "linear-gradient(135deg, #f97316, #ea580c)",
                                    border: "none", borderRadius: "20px", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                                    boxShadow: "0 0 15px rgba(249, 115, 22, 0.4)",
                                }}>
                                    {step === steps.length - 1 ? `${t("guideStart")} ✅` : `${t("guideNext")} →`}
                                </button>
                            </div>
                        </div>
                        {/* Don't show again checkbox */}
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "11px", color: theme === "light" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.4)", justifyContent: "center" }}>
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={e => setDontShowAgain(e.target.checked)}
                                style={{ accentColor: "#f97316", width: "14px", height: "14px", cursor: "pointer" }}
                            />
                            {t("tourDontShowAgain")}
                        </label>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}

// ===================== MAIN PAGE =====================
export default function AirdropPage() {
    const [lang, setLang] = useState<Language>("en");
    const [showTour, setShowTour] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light">("dark");
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [footerStats, setFooterStats] = useState<any>(null);
    const [footerCopied, setFooterCopied] = useState<string | null>(null);

    // #6 Fetch footer stats
    useEffect(() => {
        fetch("/api/airdrop-records?type=stats").then(r => r.json()).then(d => { if (d.success) setFooterStats(d.data); }).catch(() => {});
    }, []);

    const copyAddr = (addr: string) => {
        navigator.clipboard.writeText(addr);
        setFooterCopied(addr);
        setTimeout(() => setFooterCopied(null), 2000);
    };

    useEffect(() => {
        // Auto-detect browser language on first visit
        const saved = localStorage.getItem("banmao_language") as Language;
        if (saved && LANGUAGES.some(l => l.code === saved)) {
            setLang(saved);
        } else {
            // Map browser language to closest supported
            const browserLang = (navigator.language || "en").toLowerCase();
            const langMap: Record<string, Language> = {
                "vi": "vi", "zh": "zh", "ko": "ko", "ru": "ru", "id": "id",
                "ms": "id", // Malay → Indonesian
            };
            const prefix = browserLang.split("-")[0];
            const detected = langMap[prefix] || "en";
            setLang(detected);
            localStorage.setItem("banmao_language", detected);
        }
        // Theme: default dark, only override if user explicitly saved
        const savedTheme = localStorage.getItem("banmao_theme") as "dark" | "light";
        if (savedTheme) setTheme(savedTheme);
    }, []);

    // Show tour on every visit, unless user opted out
    useEffect(() => {
        const dismissed = localStorage.getItem("banmao_airdrop_tour_dismissed");
        if (!dismissed) {
            setTimeout(() => setShowTour(true), 800);
        }
    }, []);

    // Apply theme
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    const t = useCallback((key: string) =>
        (translations[lang] as any)?.[key] || (translations.en as any)?.[key] || key
    , [lang]);

    const changeLang = (code: Language) => {
        setLang(code);
        localStorage.setItem("banmao_language", code);
        setShowLangMenu(false);
    };

    const toggleTheme = () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem("banmao_theme", next);
    };

    // Sound effects (#8) - Web Audio API synthesized sounds
    const audioCtxRef = React.useRef<AudioContext | null>(null);
    const getAudioCtx = () => {
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return audioCtxRef.current;
    };
    const playTone = (freq: number, duration: number, vol = 0.1, type: OscillatorType = "sine") => {
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.value = vol;
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch {}
    };
    const playClick = () => playTone(800, 0.08, 0.06);
    const playHover = () => playTone(600, 0.04, 0.03);
    const playSuccess = () => { playTone(523, 0.15, 0.08); setTimeout(() => playTone(659, 0.15, 0.08), 100); setTimeout(() => playTone(784, 0.25, 0.1), 200); };
    const playError = () => { playTone(400, 0.15, 0.08, "sawtooth"); setTimeout(() => playTone(300, 0.2, 0.08, "sawtooth"), 120); };

    return (
        <div className={`defi-airdrop-page ${theme}`}>
            {/* Header */}
            <header className="defi-airdrop-header">
                <div className="defi-airdrop-nav">
                    <Link href="/defi" className="defi-airdrop-back" aria-label={t("backToDeFi") || "Back to DeFi Hub"}>
                        ← {t("backToDeFi") || "DeFi Hub"}
                    </Link>
                    <div className="defi-airdrop-brand">
                        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2C7.03 2 3 6.03 3 11h18c0-4.97-4.03-9-9-9z" />
                            <path d="M3 11l9 11 9-11" />
                            <line x1="12" y1="22" x2="12" y2="15" />
                            <path d="M8 11c0-3 1-6 4-9" />
                            <path d="M16 11c0-3-1-6-4-9" />
                        </svg>
                        <span>{t("headerBrand") || "Token Airdrop"}</span>
                    </div>
                </div>
                <div className="defi-airdrop-actions">
                    {/* Help Button */}
                    <button className="defi-airdrop-help-btn" onClick={() => setShowTour(true)} title={t("guideHelpBtn")} aria-label={t("guideHelpBtn") || "Help & Guide"}>
                        ?
                    </button>
                    {/* Theme Toggle */}
                    <button className="defi-airdrop-theme-btn" onClick={toggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                        {theme === "dark" ? "☀️" : "🌙"}
                    </button>
                    {/* Language Dropdown */}
                    <div className="defi-lang-dropdown">
                        <button className="defi-lang-trigger" onClick={() => setShowLangMenu(!showLangMenu)} title={LANGUAGES.find(l => l.code === lang)?.name}>
                            <span className="lang-flag">{LANGUAGES.find(l => l.code === lang)?.flag}</span>
                            <span className="lang-code">{lang.toUpperCase()}</span>
                            <span className="lang-arrow">{showLangMenu ? "▲" : "▼"}</span>
                        </button>
                        {showLangMenu && (
                            <>
                                <div className="defi-lang-backdrop" onClick={() => setShowLangMenu(false)} />
                                <div className="defi-lang-menu">
                                    {LANGUAGES.map(l => (
                                        <button
                                            key={l.code}
                                            className={`defi-lang-option ${lang === l.code ? "active" : ""}`}
                                            onClick={() => changeLang(l.code as Language)}
                                        >
                                            <span className="lang-flag">{l.flag}</span>
                                            <span className="lang-name">{l.name}</span>
                                            <span className="lang-code">{l.code.toUpperCase()}</span>
                                            {lang === l.code && <span className="lang-check">✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <ConnectButton
                        showBalance={false}
                        chainStatus="icon"
                        accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="defi-airdrop-main">
                <AirdropPanel
                    t={t}
                    lang={lang}
                    playClick={playClick}
                    playHover={playHover}
                    playSuccess={playSuccess}
                    playError={playError}
                />
            </main>

            {/* Footer - Contract & Tech Info */}
            <footer className="airdrop-footer">
                <div className="airdrop-footer-inner">
                    {/* #6 Live Stats */}
                    {footerStats && (
                        <div className="airdrop-footer-section airdrop-footer-stats">
                            <div className="footer-stat-card">
                                <span className="footer-stat-value">{Number(footerStats.total_airdrops || 0).toLocaleString()}</span>
                                <span className="footer-stat-label">{lang === "vi" ? "Lượt Airdrop" : "Total Airdrops"}</span>
                            </div>
                            <div className="footer-stat-card">
                                <span className="footer-stat-value">{Number(footerStats.total_recipients || 0).toLocaleString()}</span>
                                <span className="footer-stat-label">{lang === "vi" ? "Ví Đã Nhận" : "Wallets Reached"}</span>
                            </div>
                            <div className="footer-stat-card">
                                <span className="footer-stat-value">{Number(footerStats.unique_senders || 0).toLocaleString()}</span>
                                <span className="footer-stat-label">{lang === "vi" ? "Người Gửi" : "Unique Senders"}</span>
                            </div>
                        </div>
                    )}

                    {/* Contract Info */}
                    <div className="airdrop-footer-section">
                        <h4 className="airdrop-footer-heading">📜 {lang === "vi" ? "Hợp Đồng Thông Minh" : lang === "zh" ? "智能合约" : lang === "ko" ? "스마트 컨트랙트" : lang === "ru" ? "Смарт-контракты" : lang === "id" ? "Smart Contract" : "Smart Contracts"}</h4>
                        <div className="airdrop-footer-contract">
                            <div className="airdrop-footer-contract-item">
                                <span className="airdrop-footer-label">{lang === "vi" ? "Token Mặc Định" : lang === "zh" ? "默认代币" : lang === "ko" ? "기본 토큰" : lang === "ru" ? "Токен по умолчанию" : lang === "id" ? "Token Default" : "Default Token"} — $BANMAO (ERC-20)</span>
                                <div className="airdrop-footer-addr-row">
                                    <a href="https://web3.okx.com/explorer/x-layer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78" target="_blank" rel="noopener noreferrer" className="airdrop-footer-address">
                                        0x16d91d1615fc55b76d5f92365bd60c069b46ef78
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                    </a>
                                    <button className="footer-copy-btn" onClick={() => copyAddr("0x16d91d1615fc55b76d5f92365bd60c069b46ef78")}>{footerCopied === "0x16d91d1615fc55b76d5f92365bd60c069b46ef78" ? "✓" : "📋"}</button>
                                </div>
                            </div>
                            <div className="airdrop-footer-contract-item">
                                <span className="airdrop-footer-label">Batch Airdrop Contract</span>
                                <div className="airdrop-footer-addr-row">
                                    <a href="https://web3.okx.com/explorer/x-layer/address/0xf2d471711D24646b2C50E1F74a063caA7a6863a0" target="_blank" rel="noopener noreferrer" className="airdrop-footer-address">
                                        0xf2d471711D24646b2C50E1F74a063caA7a6863a0
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                    </a>
                                    <button className="footer-copy-btn" onClick={() => copyAddr("0xf2d471711D24646b2C50E1F74a063caA7a6863a0")}>{footerCopied === "0xf2d471711D24646b2C50E1F74a063caA7a6863a0" ? "✓" : "📋"}</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contract Functions */}
                    <div className="airdrop-footer-section">
                        <h4 className="airdrop-footer-heading">⚡ {lang === "vi" ? "Chức Năng Hợp Đồng" : lang === "zh" ? "合约功能" : lang === "ko" ? "컨트랙트 기능" : lang === "ru" ? "Функции контракта" : lang === "id" ? "Fungsi Kontrak" : "Contract Functions"}</h4>
                        <div className="airdrop-footer-funcs">
                            <div className="airdrop-footer-func"><code>batchTransferEqual(token, recipients[], amount)</code><span className="airdrop-footer-func-desc">{lang === "vi" ? "Gửi số lượng bằng nhau cho nhiều ví" : "Send equal amount to multiple wallets"}</span></div>
                            <div className="airdrop-footer-func"><code>batchTransfer(token, recipients[], amounts[])</code><span className="airdrop-footer-func-desc">{lang === "vi" ? "Gửi số lượng tùy chỉnh cho mỗi ví" : "Send custom amount per wallet"}</span></div>
                            <div className="airdrop-footer-func"><code>approve(spender, amount)</code><span className="airdrop-footer-func-desc">{lang === "vi" ? "Phê duyệt token cho hợp đồng" : "Approve token spending"}</span></div>
                            <div className="airdrop-footer-func"><code>transfer(to, amount)</code><span className="airdrop-footer-func-desc">{lang === "vi" ? "Chuyển token trực tiếp" : "Direct token transfer"}</span></div>
                        </div>
                    </div>

                    {/* Tech Stack */}
                    <div className="airdrop-footer-section">
                        <h4 className="airdrop-footer-heading">🛠 {lang === "vi" ? "Công Nghệ Sử Dụng" : lang === "zh" ? "技术栈" : lang === "ko" ? "기술 스택" : lang === "ru" ? "Технологии" : lang === "id" ? "Teknologi" : "Tech Stack"}</h4>
                        <div className="airdrop-footer-techs">
                            <span className="airdrop-footer-tech">Next.js 14</span>
                            <span className="airdrop-footer-tech">React 18</span>
                            <span className="airdrop-footer-tech">TypeScript</span>
                            <span className="airdrop-footer-tech">Wagmi v2</span>
                            <span className="airdrop-footer-tech">Viem</span>
                            <span className="airdrop-footer-tech">RainbowKit</span>
                            <span className="airdrop-footer-tech">Solidity</span>
                            <span className="airdrop-footer-tech">ERC-20</span>
                            <span className="airdrop-footer-tech">XLayer (L2)</span>
                            <span className="airdrop-footer-tech">OKX Web3 API</span>
                            <span className="airdrop-footer-tech">Ethers.js</span>
                            <span className="airdrop-footer-tech">Canvas Confetti</span>
                        </div>
                    </div>

                    {/* Links */}
                    <div className="airdrop-footer-bottom">
                        <span className="airdrop-footer-copy">© 2025-2026 Banmao.Fun — {lang === "vi" ? "Nền tảng Airdrop phi tập trung" : "Decentralized Airdrop Platform"}</span>
                        <div className="airdrop-footer-links">
                            <a href="https://web3.okx.com/explorer/x-layer" target="_blank" rel="noopener noreferrer">XLayer Explorer</a>
                            <span className="airdrop-footer-dot">·</span>
                            <a href="/" rel="noopener noreferrer">Banmao.Fun</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Spotlight Tour Modal */}
            {showTour && (
                <AirdropTourModal
                    t={t}
                    theme={theme}
                    onClose={() => setShowTour(false)}
                    onDismissForever={() => {
                        localStorage.setItem("banmao_airdrop_tour_dismissed", "1");
                    }}
                />
            )}
        </div>
    );
}
