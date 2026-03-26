/**
 * GiftSimulator - Gift Calculator/Simulator
 * Predicts hard timer reduction and estimates ROI for different attack counts
 * Data is synced with real-time contract values (jackpotPool, totalAttacks, etc.)
 */
"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatUnits } from "viem";
import { V11_FUND_DISTRIBUTION } from "../lib/constants";

function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, [breakpoint]);
    return isMobile;
}

interface GiftSimulatorProps {
    attackCost: bigint;
    currentPool: bigint;
    hardTimeLeft: bigint;
    softTimeLeft: bigint;
    timeDecreaseStep: number;
    totalAttacks: bigint;
    userAttacks: bigint;
    isOpen: boolean;
    onClose: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t?: any;
}

const QUICK_PICKS = [5, 10, 50, 100, 200, 500, 600, 900, 1000];

export default function GiftSimulator({
    attackCost,
    currentPool,
    hardTimeLeft,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    softTimeLeft,
    timeDecreaseStep,
    totalAttacks,
    userAttacks,
    isOpen,
    onClose,
    t,
}: GiftSimulatorProps) {
    const [simCount, setSimCount] = useState(5);
    const [inputValue, setInputValue] = useState("5");
    const [prevSimCount, setPrevSimCount] = useState(5);
    const inputRef = useRef<HTMLInputElement>(null);
    const mob = useIsMobile();

    // Track changes for animation
    useEffect(() => {
        setPrevSimCount(simCount);
    }, [simCount]);

    const handleInputChange = (val: string) => {
        setInputValue(val);
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 1) {
            setSimCount(num);
        }
    };

    const handleQuickPick = (n: number) => {
        setSimCount(n);
        setInputValue(String(n));
    };

    // i18n labels with fallbacks
    const L = {
        title: t?.simTitle || 'Gift Simulator',
        numGifts: t?.simNumGifts || 'Number of Gifts',
        totalCost: t?.simTotalCost || 'Total Cost',
        addedToPool: t?.simAddedToPool || 'Added to Pool',
        attackShare: t?.simAttackShare || 'Your Gift Share',
        hardTimerImpact: t?.simHardTimerImpact || 'Hard Timer Impact',
        reduction: t?.simReduction || 'Reduction',
        remaining: t?.simRemaining || 'Remaining',
        softWin: t?.simSoftWin || 'SOFT WIN',
        hardWin: t?.simHardWin || 'HARD WIN',
        softPoolLabel: t?.simSoftPoolLabel || '100% Pool',
        hardPoolLabel: t?.simHardPoolLabel || '70% Pool (30% → next round)',
        winner: t?.simWinner || 'Winner',
        splitByAttacks: t?.simSplitByAttacks || 'split by attacks',
        seed: t?.simSeedLabel || 'Seed',
        disclaimer: t?.simDisclaimer || 'Estimates only. Actual results depend on other players\' actions.',
    };

    const simulation = useMemo(() => {
        const costPerAttack = Number(formatUnits(attackCost, 18));
        const totalCost = costPerAttack * simCount;
        const pool = Number(formatUnits(currentPool, 18));

        // Hard timer reduction (contract: cfg.timeDecreaseStep * _count)
        const hardReduction = simCount * timeDecreaseStep;
        const currentHard = Number(hardTimeLeft);
        const newHardTime = Math.max(0, currentHard - hardReduction);
        const wouldKillHard = newHardTime <= 0;

        // Pool contribution: 75% of cost goes to jackpot (from _distributeFunds)
        const addedToPool = totalCost * (V11_FUND_DISTRIBUTION.JACKPOT / 100);
        const estimatedPool = pool + addedToPool;

        // SOFT WIN: 100% of jackpotPool → 75% winner + 25% top10
        const softWinnerPayout = estimatedPool * 0.75;
        const softTop10Pool = estimatedPool * 0.25;

        // HARD WIN: 30% → seedFundNextRound, 70% remains → 75% winner + 25% top10
        const hardRemaining = estimatedPool * 0.70;
        const hardSeedRollover = estimatedPool * 0.30;
        const hardWinnerPayout = hardRemaining * 0.75;
        const hardTop10Pool = hardRemaining * 0.25;

        // ROI
        const softWinROI = totalCost > 0 ? ((softWinnerPayout - totalCost) / totalCost) * 100 : 0;
        const hardWinROI = totalCost > 0 ? ((hardWinnerPayout - totalCost) / totalCost) * 100 : 0;

        // Share
        const newTotalAttacks = Number(totalAttacks) + simCount;
        const newUserAttacks = Number(userAttacks) + simCount;
        const sharePercent = newTotalAttacks > 0 ? (newUserAttacks / newTotalAttacks) * 100 : 0;

        return {
            totalCost, hardReduction, newHardTime, wouldKillHard,
            estimatedPool, softWinnerPayout, softTop10Pool,
            hardWinnerPayout, hardTop10Pool, hardSeedRollover,
            softWinROI, hardWinROI, sharePercent, addedToPool,
        };
    }, [simCount, attackCost, currentPool, hardTimeLeft, timeDecreaseStep, totalAttacks, userAttacks]);

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const hasChanged = simCount !== prevSimCount;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0,
                    background: "rgba(0,0,0,0.6)", zIndex: 10000,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "16px",
                }}
            >
                {/* Hide spinner buttons */}
                <style>{`
                    .sim-gift-input::-webkit-outer-spin-button,
                    .sim-gift-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                    .sim-gift-input[type=number] { -moz-appearance: textbox; }
                    .sim-quick-btn { transition: all 0.2s ease !important; }
                    .sim-quick-btn:hover {
                        transform: scale(1.08) !important;
                        box-shadow: 0 0 12px rgba(255, 215, 0, 0.35) !important;
                    }
                    .sim-quick-btn:active { transform: scale(0.95) !important; }
                `}</style>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: "linear-gradient(180deg, #14141e 0%, #0a0a14 100%)",
                        border: "1px solid rgba(255, 215, 0, 0.2)",
                        borderRadius: mob ? "14px" : "20px", padding: mob ? "14px" : "24px",
                        maxWidth: mob ? "360px" : "440px", width: "100%",
                        maxHeight: "85vh", overflow: "auto",
                    }}
                >
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mob ? "12px" : "20px" }}>
                        <h3 style={{ color: "#ffd700", margin: 0, fontSize: mob ? "13px" : "16px", fontWeight: 800 }}>
                            🧮 {L.title}
                        </h3>
                        <button
                            onClick={onClose}
                            style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "20px", padding: "4px" }}
                        >✕</button>
                    </div>

                    {/* Gift Count Input + Quick Picks */}
                    <div style={{ marginBottom: mob ? "12px" : "20px" }}>
                        <label style={{ color: "#a0a0b0", fontSize: mob ? "11px" : "12px", display: "block", marginBottom: mob ? "6px" : "10px" }}>
                            {L.numGifts}
                        </label>

                        {/* Number Input — pill shaped */}
                        <div style={{ position: "relative", marginBottom: "12px" }}>
                            <div style={{
                                position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)",
                                fontSize: "14px", color: "#6b7280", pointerEvents: "none",
                            }}>🎁</div>
                            <input
                                ref={inputRef}
                                type="number"
                                className="sim-gift-input"
                                value={inputValue}
                                onChange={(e) => handleInputChange(e.target.value)}
                                min={1}
                                style={{
                                    width: "100%", padding: mob ? "8px 40px 8px 36px" : "12px 50px 12px 44px",
                                    borderRadius: "999px",
                                    background: "rgba(255, 215, 0, 0.06)",
                                    border: "2px solid rgba(255, 215, 0, 0.25)",
                                    color: "#ffd700", fontSize: mob ? "14px" : "18px", fontWeight: 800,
                                    textAlign: "center", outline: "none",
                                    boxSizing: "border-box",
                                    transition: "border-color 0.3s, box-shadow 0.3s",
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(255, 215, 0, 0.6)";
                                    e.currentTarget.style.boxShadow = "0 0 20px rgba(255, 215, 0, 0.15)";
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = "rgba(255, 215, 0, 0.25)";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                            />
                            {inputValue && (
                                <button
                                    onClick={() => { setInputValue(""); setSimCount(1); }}
                                    style={{
                                        position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                                        background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
                                        width: "22px", height: "22px", cursor: "pointer", color: "#9ca3af",
                                        fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center",
                                    }}
                                >✕</button>
                            )}
                        </div>

                        {/* Quick Pick Buttons — pill shaped with hover effect */}
                        <div style={{
                            display: "flex", flexWrap: "wrap", gap: "6px",
                            justifyContent: "center",
                        }}>
                            {QUICK_PICKS.map((n) => (
                                <button
                                    key={n}
                                    className="sim-quick-btn"
                                    onClick={() => handleQuickPick(n)}
                                    style={{
                                        padding: mob ? "4px 10px" : "6px 14px",
                                        borderRadius: "999px",
                                        border: simCount === n
                                            ? "2px solid #ffd700"
                                            : "1px solid rgba(255,255,255,0.12)",
                                        background: simCount === n
                                            ? "linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 107, 53, 0.15))"
                                            : "rgba(255,255,255,0.04)",
                                        color: simCount === n ? "#ffd700" : "#a0a0b0",
                                        cursor: "pointer",
                                        fontWeight: 700,
                                        fontSize: mob ? "11px" : "12px",
                                        boxShadow: simCount === n
                                            ? "0 0 10px rgba(255, 215, 0, 0.2)"
                                            : "none",
                                    }}
                                >{n}</button>
                            ))}
                        </div>
                    </div>

                    {/* Cost Summary — animated on change */}
                    <motion.div
                        key={`cost-${simCount}`}
                        initial={hasChanged ? { opacity: 0, y: 8 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        style={{
                            background: "rgba(255,255,255,0.03)", borderRadius: mob ? "10px" : "12px",
                            padding: mob ? "10px" : "16px", marginBottom: mob ? "10px" : "16px",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: mob ? "5px" : "8px" }}>
                            <span style={{ color: "#a0a0b0", fontSize: mob ? "11px" : "12px" }}>{L.totalCost}</span>
                            <motion.span
                                key={`tc-${simulation.totalCost}`}
                                initial={{ scale: 1.15, color: "#ffd700" }}
                                animate={{ scale: 1, color: "#ffffff" }}
                                transition={{ duration: 0.4 }}
                                style={{ fontWeight: 700 }}
                            >{simulation.totalCost.toLocaleString()} 🐱</motion.span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: mob ? "5px" : "8px" }}>
                            <span style={{ color: "#a0a0b0", fontSize: mob ? "11px" : "12px" }}>{L.addedToPool}</span>
                            <motion.span
                                key={`ap-${simulation.addedToPool}`}
                                initial={{ scale: 1.15, color: "#4ade80" }}
                                animate={{ scale: 1, color: "#22c55e" }}
                                transition={{ duration: 0.4 }}
                                style={{ fontWeight: 700 }}
                            >+{simulation.addedToPool.toLocaleString()} 🐱</motion.span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#a0a0b0", fontSize: mob ? "11px" : "12px" }}>{L.attackShare}</span>
                            <motion.span
                                key={`sh-${simulation.sharePercent.toFixed(1)}`}
                                initial={{ scale: 1.1 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                                style={{ color: "#fbbf24", fontWeight: 700 }}
                            >{simulation.sharePercent.toFixed(1)}%</motion.span>
                        </div>
                    </motion.div>

                    {/* Timer Impact — animated */}
                    <motion.div
                        key={`timer-${simCount}`}
                        initial={hasChanged ? { opacity: 0, y: 8 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
                        style={{
                            background: "rgba(239, 68, 68, 0.08)", borderRadius: mob ? "10px" : "12px",
                            padding: mob ? "10px" : "16px", marginBottom: mob ? "10px" : "16px",
                            border: simulation.wouldKillHard ? "1px solid rgba(239, 68, 68, 0.3)" : "none",
                        }}
                    >
                        <div style={{ color: "#ef4444", fontSize: mob ? "11px" : "13px", fontWeight: 700, marginBottom: mob ? "5px" : "8px" }}>
                            ⏰ {L.hardTimerImpact}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ color: "#a0a0b0", fontSize: "12px" }}>{L.reduction}</span>
                            <span style={{ color: "#ef4444", fontWeight: 700 }}>-{formatTime(simulation.hardReduction)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#a0a0b0", fontSize: "12px" }}>{L.remaining}</span>
                            <span style={{ color: simulation.wouldKillHard ? "#ef4444" : "#fff", fontWeight: 700 }}>
                                {simulation.wouldKillHard ? `⚡ ${L.hardWin}!` : formatTime(simulation.newHardTime)}
                            </span>
                        </div>
                    </motion.div>

                    {/* Win Scenarios — animated cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: mob ? "8px" : "12px" }}>
                        {/* SOFT WIN */}
                        <motion.div
                            key={`soft-${simCount}`}
                            initial={hasChanged ? { opacity: 0, scale: 0.95 } : false}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.35, delay: 0.1 }}
                            style={{
                                background: "rgba(251, 191, 36, 0.08)", borderRadius: mob ? "10px" : "12px",
                                padding: mob ? "8px" : "14px", textAlign: "center",
                            }}
                        >
                            <div style={{ color: "#fbbf24", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>
                                🎯 {L.softWin}
                            </div>
                            <div style={{ color: "#888", fontSize: "9px", marginBottom: "4px" }}>{L.softPoolLabel}</div>
                            <motion.div
                                key={`sw-${simulation.softWinnerPayout}`}
                                initial={{ scale: 1.2, color: "#ffd700" }}
                                animate={{ scale: 1, color: "#ffffff" }}
                                transition={{ duration: 0.5, type: "spring" }}
                                style={{ fontSize: "14px", fontWeight: 800 }}
                            >
                                👑 {simulation.softWinnerPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </motion.div>
                            <div style={{ color: "#a0a0b0", fontSize: "9px", marginTop: "2px" }}>75% {L.winner}</div>
                            <div style={{ color: "#a855f7", fontSize: "11px", fontWeight: 600, marginTop: "4px" }}>
                                🏆 Top 10: {simulation.softTop10Pool.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div style={{ color: "#a0a0b0", fontSize: "9px" }}>25% {L.splitByAttacks}</div>
                            <motion.div
                                key={`sr-${simulation.softWinROI.toFixed(0)}`}
                                initial={{ scale: 1.15 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    color: simulation.softWinROI > 0 ? "#22c55e" : "#ef4444",
                                    fontSize: "12px", fontWeight: 700, marginTop: "6px",
                                }}
                            >
                                ROI: {simulation.softWinROI > 0 ? "+" : ""}{simulation.softWinROI.toFixed(0)}%
                            </motion.div>
                        </motion.div>

                        {/* HARD WIN */}
                        <motion.div
                            key={`hard-${simCount}`}
                            initial={hasChanged ? { opacity: 0, scale: 0.95 } : false}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.35, delay: 0.15 }}
                            style={{
                                background: "rgba(239, 68, 68, 0.08)", borderRadius: mob ? "10px" : "12px",
                                padding: mob ? "8px" : "14px", textAlign: "center",
                            }}
                        >
                            <div style={{ color: "#ef4444", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>
                                ⚡ {L.hardWin}
                            </div>
                            <div style={{ color: "#888", fontSize: "9px", marginBottom: "4px" }}>{L.hardPoolLabel}</div>
                            <motion.div
                                key={`hw-${simulation.hardWinnerPayout}`}
                                initial={{ scale: 1.2, color: "#ffd700" }}
                                animate={{ scale: 1, color: "#ffffff" }}
                                transition={{ duration: 0.5, type: "spring" }}
                                style={{ fontSize: "14px", fontWeight: 800 }}
                            >
                                👑 {simulation.hardWinnerPayout.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </motion.div>
                            <div style={{ color: "#a0a0b0", fontSize: "9px", marginTop: "2px" }}>52.5% {L.winner}</div>
                            <div style={{ color: "#a855f7", fontSize: "11px", fontWeight: 600, marginTop: "4px" }}>
                                🏆 Top 10: {simulation.hardTop10Pool.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div style={{ color: "#a0a0b0", fontSize: "9px" }}>17.5% {L.splitByAttacks}</div>
                            <div style={{ color: "#4ade80", fontSize: "10px", fontWeight: 600, marginTop: "4px" }}>
                                🌱 {L.seed}: {simulation.hardSeedRollover.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <motion.div
                                key={`hr-${simulation.hardWinROI.toFixed(0)}`}
                                initial={{ scale: 1.15 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    color: simulation.hardWinROI > 0 ? "#22c55e" : "#ef4444",
                                    fontSize: "12px", fontWeight: 700, marginTop: "4px",
                                }}
                            >
                                ROI: {simulation.hardWinROI > 0 ? "+" : ""}{simulation.hardWinROI.toFixed(0)}%
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* Disclaimer */}
                    <p style={{ color: "#606070", fontSize: "10px", textAlign: "center", marginTop: "16px", marginBottom: 0 }}>
                        ⚠ {L.disclaimer}
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
