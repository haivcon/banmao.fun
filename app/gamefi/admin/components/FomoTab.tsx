/**
 * FomoTab Component - V11 Edition
 * Admin panel for BanMaoFomo V11 contract
 * Compatible with scheduleConfigChange and GameConfig struct
 * Full i18n support
 */
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { BANMAOFOMO_ADDRESS, CHAIN_ID } from "../../banmaofomo/lib/constants";
import { BANMAOFOMO_ABI } from "../../banmaofomo/lib/abis";
import ContractInfoCard from './ContractInfoCard';
import { en } from "../i18n/en";
import { useToast } from "./ToastProvider";
import { SafetyButton } from "./SafetyButton";

type AdminLocale = typeof en;

// V11 GameConfig struct type
interface GameConfig {
    attackCost: bigint;
    softDuration: bigint;
    initialHardDuration: bigint;
    timeDecreaseStep: bigint;
    maxAttacksPerRound: bigint;
    winnerPercent: bigint;
    topAttackersPercent: bigint;
    minAttacksForReward: bigint;
    claimExpirationTime: bigint;
}

// Helper: Convert seconds to readable format
const formatSecondsToReadable = (seconds: number | string): string => {
    const s = Number(seconds);
    if (isNaN(s) || s <= 0) return "0s";
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
};

interface FomoTabProps {
    t: AdminLocale;
    isAdmin: boolean;
}

export default function FomoTab({ t, isAdmin }: FomoTabProps) {
    const { address } = useAccount();
    const { showToast } = useToast();

    // Form states - V11 GameConfig fields
    const [formAttackCost, setFormAttackCost] = useState("");
    const [formSoftDuration, setFormSoftDuration] = useState("");
    const [formHardDuration, setFormHardDuration] = useState("");
    const [formDecreaseStep, setFormDecreaseStep] = useState("");
    const [formMaxAttacks, setFormMaxAttacks] = useState("");
    const [formWinnerPercent, setFormWinnerPercent] = useState("");
    const [formTopPercent, setFormTopPercent] = useState("");
    const [formMinAttacks, setFormMinAttacks] = useState("");
    const [formClaimExpiration, setFormClaimExpiration] = useState("");

    // Contract reads — all with chainId for cross-chain safety
    const { data: currentRound, refetch: refetchRound } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "currentRound",
        chainId: CHAIN_ID,
        query: { refetchInterval: 15000 }, // Reduced from 5s to 15s
    });

    const { data: roundData, refetch: refetchRoundData } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "rounds",
        args: currentRound ? [currentRound] : undefined,
        chainId: CHAIN_ID,
        query: { enabled: !!currentRound, refetchInterval: 15000 }, // Reduced from 5s to 15s
    });

    const { data: contractOwner } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "owner",
        chainId: CHAIN_ID,
    });

    // V11: Read activeConfig struct
    const { data: activeConfig, refetch: refetchConfig } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "activeConfig",
        chainId: CHAIN_ID,
        query: { refetchInterval: 30000 }, // Reduced from 10s to 30s
    });

    // V11: Read nextConfig struct (scheduled for next round)
    const { data: nextConfig, refetch: refetchNextConfig } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "nextConfig",
        chainId: CHAIN_ID,
        query: { refetchInterval: 30000 }, // Reduced from 10s to 30s
    });

    const { data: stakingAddress, refetch: refetchStaking } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "stakingAddress",
        chainId: CHAIN_ID,
    });

    const { data: isPaused, refetch: refetchPaused } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "paused",
        chainId: CHAIN_ID,
        query: { refetchInterval: 30000 }, // Reduced from 10s to 30s
    });

    const { data: seedFund, refetch: refetchSeed } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "seedFundNextRound",
        chainId: CHAIN_ID,
        query: { refetchInterval: 30000 }, // Reduced from 10s to 30s
    });

    const { data: totalVault, refetch: refetchVault } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "totalVaultBalance",
        chainId: CHAIN_ID,
        query: { refetchInterval: 30000 }, // Reduced from 10s to 30s
    });

    const { data: jackpotPool, refetch: refetchJackpot } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "jackpotPool",
        chainId: CHAIN_ID,
        query: { refetchInterval: 15000 }, // Reduced from 5s to 15s
    });

    // Refetch all data
    const refetchAllData = useCallback(() => {
        refetchRound();
        refetchRoundData();
        refetchConfig();
        refetchNextConfig();
        refetchStaking();
        refetchPaused();
        refetchSeed();
        refetchVault();
        refetchJackpot();
    }, [refetchRound, refetchRoundData, refetchConfig, refetchNextConfig, refetchStaking, refetchPaused, refetchSeed, refetchVault, refetchJackpot]);

    // Write functions
    const { writeContract: scheduleConfig, data: configHash, isPending: isScheduling, error: scheduleError } = useWriteContract();
    const { isLoading: isConfigConfirming, isSuccess: isConfigSuccess } = useWaitForTransactionReceipt({ hash: configHash });

    const { writeContract: setPausedFn, data: pauseHash, isPending: isPausePending, error: writePauseError } = useWriteContract();
    const { isLoading: isPauseConfirming, isSuccess: isPauseSuccess, error: txPauseError } = useWaitForTransactionReceipt({ hash: pauseHash });

    const { writeContract: distributeDust, data: distributeHash, isPending: isDistributing, error: writeDistributeError } = useWriteContract();
    const { isLoading: isDistributeConfirming, isSuccess: isDistributeSuccess, error: txDistributeError } = useWaitForTransactionReceipt({ hash: distributeHash });

    // Parse activeConfig to typed object
    const parsedConfig: GameConfig | null = activeConfig ? {
        attackCost: (activeConfig as unknown as bigint[])[0],
        softDuration: (activeConfig as unknown as bigint[])[1],
        initialHardDuration: (activeConfig as unknown as bigint[])[2],
        timeDecreaseStep: (activeConfig as unknown as bigint[])[3],
        maxAttacksPerRound: (activeConfig as unknown as bigint[])[4],
        winnerPercent: (activeConfig as unknown as bigint[])[5],
        topAttackersPercent: (activeConfig as unknown as bigint[])[6],
        minAttacksForReward: (activeConfig as unknown as bigint[])[7],
        claimExpirationTime: (activeConfig as unknown as bigint[])[8],
    } : null;

    // Parse nextConfig (scheduled for next round)
    const parsedNextConfig: GameConfig | null = nextConfig ? {
        attackCost: (nextConfig as unknown as bigint[])[0],
        softDuration: (nextConfig as unknown as bigint[])[1],
        initialHardDuration: (nextConfig as unknown as bigint[])[2],
        timeDecreaseStep: (nextConfig as unknown as bigint[])[3],
        maxAttacksPerRound: (nextConfig as unknown as bigint[])[4],
        winnerPercent: (nextConfig as unknown as bigint[])[5],
        topAttackersPercent: (nextConfig as unknown as bigint[])[6],
        minAttacksForReward: (nextConfig as unknown as bigint[])[7],
        claimExpirationTime: (nextConfig as unknown as bigint[])[8],
    } : null;

    // Initialize form ONCE with config data — prevent overwriting user edits on refetch
    const formInitialized = useRef(false);
    useEffect(() => {
        if (formInitialized.current) return; // Don't overwrite user edits
        const cfg = parsedNextConfig || parsedConfig;
        if (cfg) {
            setFormAttackCost(formatUnits(cfg.attackCost, 18));
            setFormSoftDuration(cfg.softDuration.toString());
            setFormHardDuration(cfg.initialHardDuration.toString());
            setFormDecreaseStep(cfg.timeDecreaseStep.toString());
            setFormMaxAttacks(cfg.maxAttacksPerRound.toString());
            setFormWinnerPercent(cfg.winnerPercent.toString());
            setFormTopPercent(cfg.topAttackersPercent.toString());
            setFormMinAttacks(cfg.minAttacksForReward.toString());
            setFormClaimExpiration(cfg.claimExpirationTime.toString());
            formInitialized.current = true;
        }
    }, [nextConfig, activeConfig]);

    // Handle success callbacks - Auto-refresh after config update
    useEffect(() => {
        if (isConfigSuccess && configHash) {
            showToast(t.success + " - Config scheduled! Auto-refreshing...", "success");
            // Allow form to re-initialize from blockchain after successful update
            formInitialized.current = false;
            refetchNextConfig();
            refetchConfig();

            const timer = setTimeout(async () => {
                await refetchNextConfig();
                await refetchConfig();
                refetchAllData();
                showToast("✅ Data refreshed from blockchain!", "success");
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [isConfigSuccess, configHash]);

    useEffect(() => {
        if (isPauseSuccess) {
            showToast(t.success + " - Pause updated!", "success");
            refetchAllData();
        }
    }, [isPauseSuccess, refetchAllData, showToast, t.success]);

    useEffect(() => {
        if (isDistributeSuccess) {
            showToast(t.success + " - Dust distributed!", "success");
            refetchAllData();
        }
    }, [isDistributeSuccess, refetchAllData, showToast, t.success]);

    // Error handling for all write functions
    useEffect(() => {
        if (writePauseError) {
            showToast(t.error + " - " + (writePauseError.message?.slice(0, 120) || "Pause failed"), "error");
        }
    }, [writePauseError]);

    useEffect(() => {
        if (txPauseError) {
            showToast(t.error + " - TX failed: " + (txPauseError.message?.slice(0, 120) || "Unknown"), "error");
        }
    }, [txPauseError]);

    useEffect(() => {
        if (writeDistributeError) {
            showToast(t.error + " - " + (writeDistributeError.message?.slice(0, 120) || "Distribute failed"), "error");
        }
    }, [writeDistributeError]);

    useEffect(() => {
        if (txDistributeError) {
            showToast(t.error + " - TX failed: " + (txDistributeError.message?.slice(0, 120) || "Unknown"), "error");
        }
    }, [txDistributeError]);

    useEffect(() => {
        if (scheduleError) {
            console.error("Schedule Config Error:", scheduleError);
            showToast(t.error + " - " + (scheduleError.message?.slice(0, 120) || "Schedule failed"), "error");
        }
    }, [scheduleError]);

    // V11: Schedule config change (applies next round)
    const handleScheduleConfig = () => {
        // Validation: winnerPercent + topAttackersPercent must equal 100
        const winner = parseInt(formWinnerPercent);
        const top = parseInt(formTopPercent);
        if (winner + top !== 100) {
            showToast(t.error + ` - ${t.fomo?.schedule?.topPercentHint}`, "error");
            return;
        }

        try {
            const configTuple = [
                parseUnits(formAttackCost, 18),
                BigInt(formSoftDuration),
                BigInt(formHardDuration),
                BigInt(formDecreaseStep),
                BigInt(formMaxAttacks),
                BigInt(formWinnerPercent),
                BigInt(formTopPercent),
                BigInt(formMinAttacks),
                BigInt(formClaimExpiration),
            ];

            console.log("Scheduling config (Tuple):", configTuple);

            if (!address) {
                showToast("Please connect wallet first", "error");
                return;
            }

            (scheduleConfig as any)({
                address: BANMAOFOMO_ADDRESS,
                abi: BANMAOFOMO_ABI,
                functionName: "scheduleConfigChange",
                args: [configTuple],
                account: address,
                chainId: CHAIN_ID,
            });
            showToast(t.processing, "loading", 2000);
        } catch (e) {
            console.error(e);
            showToast(t.error + " - Invalid input", "error");
        }
    };

    const handleSetPaused = (paused: boolean) => {
        if (!address) { showToast("Please connect wallet first", "error"); return; }
        (setPausedFn as any)({
            address: BANMAOFOMO_ADDRESS,
            abi: BANMAOFOMO_ABI,
            functionName: "setPaused",
            args: [paused],
            account: address,
            chainId: CHAIN_ID,
        });
    };

    const handleDistributeDust = () => {
        if (!address) { showToast("Please connect wallet first", "error"); return; }
        (distributeDust as any)({
            address: BANMAOFOMO_ADDRESS,
            abi: BANMAOFOMO_ABI,
            functionName: "distributeDust",
            account: address,
            chainId: CHAIN_ID,
        });
    };

    const isOwner = contractOwner?.toLowerCase() === address?.toLowerCase();

    // Parse round status
    const status = (roundData && currentRound) ? (() => {
        const [softDeadline, hardDeadline, , lastAttacker, totalAttacks] = roundData as [number, number, boolean, `0x${string}`, bigint, bigint];
        const now = BigInt(Math.floor(Date.now() / 1000));
        const softTimeLeft = BigInt(softDeadline) > now ? BigInt(softDeadline) - now : 0n;
        const hardTimeLeft = BigInt(hardDeadline) > now ? BigInt(hardDeadline) - now : 0n;
        return {
            softTimeLeft,
            hardTimeLeft,
            pool: jackpotPool || 0n,
            leader: lastAttacker as string,
            totalAtks: totalAttacks
        };
    })() : null;

    const formatAddress = (addr: string) => {
        if (!addr || addr === "0x0000000000000000000000000000000000000000") return "—";
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatTime = (seconds: bigint) => {
        const s = Number(seconds);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return `${h}h ${m}m`;
    };

    // Time conversion badge component
    const TimeConversionBadge = ({ seconds }: { seconds: string }) => {
        const readable = formatSecondsToReadable(seconds);
        return (
            <span style={{
                marginLeft: "8px",
                padding: "2px 8px",
                background: "rgba(251, 191, 36, 0.2)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#fbbf24"
            }}>
                = {readable}
            </span>
        );
    };

    // Config presets
    const CONFIG_PRESETS: Record<string, { label: string; values: Record<string, string> }> = {
        casual: {
            label: "🎮 Casual Mode",
            values: { attackCost: "1000", softDuration: "43200", hardDuration: "864000", decreaseStep: "10", maxAttacks: "10000000", winnerPercent: "70", topPercent: "30", minAttacks: "5", claimExpiration: "14400" }
        },
        competitive: {
            label: "⚔️ Competitive",
            values: { attackCost: "5000", softDuration: "21600", hardDuration: "432000", decreaseStep: "30", maxAttacks: "1000000", winnerPercent: "75", topPercent: "25", minAttacks: "10", claimExpiration: "7200" }
        },
        speed: {
            label: "⚡ Speed Round",
            values: { attackCost: "2000", softDuration: "7200", hardDuration: "86400", decreaseStep: "60", maxAttacks: "500000", winnerPercent: "80", topPercent: "20", minAttacks: "3", claimExpiration: "3600" }
        },
    };

    const applyPreset = (key: string) => {
        const p = CONFIG_PRESETS[key].values;
        setFormAttackCost(p.attackCost);
        setFormSoftDuration(p.softDuration);
        setFormHardDuration(p.hardDuration);
        setFormDecreaseStep(p.decreaseStep);
        setFormMaxAttacks(p.maxAttacks);
        setFormWinnerPercent(p.winnerPercent);
        setFormTopPercent(p.topPercent);
        setFormMinAttacks(p.minAttacks);
        setFormClaimExpiration(p.claimExpiration);
        showToast(`✅ Đã áp dụng preset "${CONFIG_PRESETS[key].label}"`, "success");
    };

    // Export/Import config
    const exportConfig = () => {
        const cfg = {
            attackCost: formAttackCost, softDuration: formSoftDuration, hardDuration: formHardDuration,
            decreaseStep: formDecreaseStep, maxAttacks: formMaxAttacks, winnerPercent: formWinnerPercent,
            topPercent: formTopPercent, minAttacks: formMinAttacks, claimExpiration: formClaimExpiration,
        };
        navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));
        showToast("📋 Config copied to clipboard!", "success");
    };

    const importConfig = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const cfg = JSON.parse(text);
            if (cfg.attackCost) setFormAttackCost(cfg.attackCost);
            if (cfg.softDuration) setFormSoftDuration(cfg.softDuration);
            if (cfg.hardDuration) setFormHardDuration(cfg.hardDuration);
            if (cfg.decreaseStep) setFormDecreaseStep(cfg.decreaseStep);
            if (cfg.maxAttacks) setFormMaxAttacks(cfg.maxAttacks);
            if (cfg.winnerPercent) setFormWinnerPercent(cfg.winnerPercent);
            if (cfg.topPercent) setFormTopPercent(cfg.topPercent);
            if (cfg.minAttacks) setFormMinAttacks(cfg.minAttacks);
            if (cfg.claimExpiration) setFormClaimExpiration(cfg.claimExpiration);
            showToast("📥 Config imported from clipboard!", "success");
        } catch {
            showToast("❌ Invalid JSON in clipboard", "error");
        }
    };

    // Simulate rewards
    const [simAttacks, setSimAttacks] = useState("500");

    return (
        <div className="admin-panel">
            <h2 className="admin-panel-title">🔥 {t.fomo?.title} {t.fomo?.titleV11}</h2>
            <p className="admin-panel-desc">{t.fomo?.desc}</p>

            <ContractInfoCard
                title="Fomo Contract V11"
                address={BANMAOFOMO_ADDRESS}
                chainId={CHAIN_ID}
                networkName="X Layer Mainnet"
                explorerBaseUrl="https://web3.okx.com/explorer/x-layer/address"
            />

            {/* ========== GAME STATUS ========== */}
            <div className="admin-section-card">
                <h3 className="admin-section-title">📊 {t.fomo?.status?.title}</h3>
                {status ? (
                    <>
                        <div className="admin-stats-grid fomo-grid-3col">
                            <div className="admin-stat-card">
                                <div className="admin-stat-info">
                                    <span className="admin-stat-value">{currentRound?.toString() || "—"}</span>
                                    <span className="admin-stat-label">{t.fomo?.status?.currentRound}</span>
                                </div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-info">
                                    <span className="admin-stat-value">
                                        {Number(formatUnits(status.pool, 18)).toLocaleString()}
                                    </span>
                                    <span className="admin-stat-label">{t.fomo?.status?.jackpotPool}</span>
                                </div>
                            </div>
                            <div className="admin-stat-card">
                                <div className="admin-stat-info">
                                    <span className="admin-stat-value">{status.totalAtks.toString()}</span>
                                    <span className="admin-stat-label">{t.fomo?.status?.totalAttacks}</span>
                                </div>
                            </div>
                        </div>

                        {/* Dual Timers */}
                        <div className="fomo-grid-2col" style={{ marginTop: "16px" }}>
                            <div style={{ padding: "16px", background: "rgba(251, 191, 36, 0.1)", borderRadius: "8px", border: "1px solid rgba(251, 191, 36, 0.3)" }}>
                                <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>🐱 {t.fomo?.status?.softDeadline}</div>
                                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#fbbf24" }}>{formatTime(status.softTimeLeft)}</div>
                            </div>
                            <div style={{ padding: "16px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                                <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>💀 {t.fomo?.status?.hardDeadline}</div>
                                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ef4444" }}>{formatTime(status.hardTimeLeft)}</div>
                                {/* Hard Timer Progress Bar */}
                                {parsedConfig && (() => {
                                    const totalHard = Number(parsedConfig.initialHardDuration);
                                    const remaining = Number(status.hardTimeLeft);
                                    const pct = totalHard > 0 ? Math.max(0, Math.min(100, (remaining / totalHard) * 100)) : 0;
                                    return (
                                        <div className="fomo-progress-bar">
                                            <div className="fomo-progress-fill" style={{ width: `${pct}%`, background: pct > 50 ? "#22c55e" : pct > 20 ? "#fbbf24" : "#ef4444" }} />
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div style={{ marginTop: "16px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
                            <div>
                                <span style={{ color: "#888" }}>{t.fomo?.status?.currentLeader}: </span>
                                <span style={{ fontFamily: "monospace" }}>{formatAddress(status.leader)}</span>
                            </div>
                            <div>
                                <span style={{ color: "#888" }}>{t.fomo?.status?.stakingAddr}: </span>
                                <span style={{ fontFamily: "monospace" }}>{stakingAddress ? formatAddress(stakingAddress) : "—"}</span>
                            </div>
                            <div>
                                <span style={{ color: "#888" }}>{t.fomo?.status?.gameStatus}: </span>
                                <span style={{ color: isPaused ? "#ef4444" : "#22c55e" }}>
                                    {isPaused ? t.fomo?.status?.isPaused : t.fomo?.status?.isActive}
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <p>{t.loading}</p>
                )}
            </div>

            {/* ========== CURRENT CONFIG (V11) ========== */}
            <div className="admin-section-card" style={{ marginTop: "20px" }}>
                <h3 className="admin-section-title">⚙️ {t.fomo?.config?.title}</h3>
                {parsedConfig ? (
                    <div className="fomo-grid-3col">
                        <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "11px", color: "#888" }}>{t.fomo?.config?.attackCost}</div>
                            <div style={{ fontWeight: "bold" }}>{Number(formatUnits(parsedConfig.attackCost, 18)).toLocaleString()}</div>
                        </div>
                        <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "11px", color: "#888" }}>{t.fomo?.config?.softDuration}</div>
                            <div style={{ fontWeight: "bold" }}>{formatSecondsToReadable(Number(parsedConfig.softDuration))}</div>
                        </div>
                        <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "11px", color: "#888" }}>{t.fomo?.config?.hardDuration}</div>
                            <div style={{ fontWeight: "bold" }}>{formatSecondsToReadable(Number(parsedConfig.initialHardDuration))}</div>
                        </div>
                        <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "11px", color: "#888" }}>{t.fomo?.config?.timeDecreaseStep}</div>
                            <div style={{ fontWeight: "bold" }}>{parsedConfig.timeDecreaseStep.toString()}s</div>
                        </div>
                        <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "11px", color: "#888" }}>{t.fomo?.config?.maxAttacksPerRound}</div>
                            <div style={{ fontWeight: "bold" }}>{parsedConfig.maxAttacksPerRound.toString()}</div>
                        </div>
                        <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "11px", color: "#888" }}>{t.fomo?.config?.winnerPercent}</div>
                            <div style={{ fontWeight: "bold", color: "#22c55e" }}>{parsedConfig.winnerPercent.toString()}%</div>
                        </div>
                        <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "11px", color: "#888" }}>{t.fomo?.config?.topAttackersPercent}</div>
                            <div style={{ fontWeight: "bold", color: "#3b82f6" }}>{parsedConfig.topAttackersPercent.toString()}%</div>
                        </div>
                        <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "11px", color: "#888" }}>{t.fomo?.config?.minAttacksForReward}</div>
                            <div style={{ fontWeight: "bold" }}>{parsedConfig.minAttacksForReward.toString()}</div>
                        </div>
                        <div style={{ padding: "12px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
                            <div style={{ fontSize: "11px", color: "#888" }}>{t.fomo?.config?.claimExpiration}</div>
                            <div style={{ fontWeight: "bold" }}>{formatSecondsToReadable(Number(parsedConfig.claimExpirationTime))}</div>
                        </div>
                    </div>
                ) : (
                    <p>{t.loading}</p>
                )}
                <button
                    onClick={refetchAllData}
                    style={{ marginTop: "12px", padding: "8px 16px", background: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(59, 130, 246, 0.5)", borderRadius: "8px", color: "#3b82f6", cursor: "pointer" }}
                >
                    🔄 {t.fomo?.config?.refreshBtn}
                </button>
            </div>

            {/* ========== CONFIG DIFF: Active vs Scheduled + Form Preview ========== */}
            {parsedConfig && (() => {
                const fields: { key: keyof GameConfig; label: string; format: (v: bigint) => string; formValue: string; toRaw: (v: string) => string }[] = [
                    { key: "attackCost", label: "💰 Attack Cost", format: v => Number(formatUnits(v, 18)).toLocaleString(), formValue: formAttackCost, toRaw: v => { try { return parseUnits(v, 18).toString(); } catch { return "0"; } } },
                    { key: "softDuration", label: "🐱 Soft Duration", format: v => formatSecondsToReadable(Number(v)), formValue: formSoftDuration, toRaw: v => v },
                    { key: "initialHardDuration", label: "💀 Hard Duration", format: v => formatSecondsToReadable(Number(v)), formValue: formHardDuration, toRaw: v => v },
                    { key: "timeDecreaseStep", label: "⏱️ Decrease Step", format: v => formatSecondsToReadable(Number(v)), formValue: formDecreaseStep, toRaw: v => v },
                    { key: "maxAttacksPerRound", label: "🎯 Max Attacks", format: v => v.toString(), formValue: formMaxAttacks, toRaw: v => v },
                    { key: "winnerPercent", label: "🏆 Winner %", format: v => v.toString() + "%", formValue: formWinnerPercent, toRaw: v => v },
                    { key: "topAttackersPercent", label: "📊 Top %", format: v => v.toString() + "%", formValue: formTopPercent, toRaw: v => v },
                    { key: "minAttacksForReward", label: "⭐ Min Attacks", format: v => v.toString(), formValue: formMinAttacks, toRaw: v => v },
                    { key: "claimExpirationTime", label: "⏰ Claim Exp", format: v => formatSecondsToReadable(Number(v)), formValue: formClaimExpiration, toRaw: v => v },
                ];

                // Section 1: Blockchain-confirmed diff (Active vs NextConfig on-chain)
                const blockchainDiffs = parsedNextConfig
                    ? fields.filter(f => parsedConfig[f.key].toString() !== parsedNextConfig[f.key].toString())
                    : [];

                // Section 2: Form preview diff (Active vs what the user typed in the form)
                const formDiffs = fields.filter(f => {
                    if (!f.formValue) return false;
                    try {
                        return parsedConfig[f.key].toString() !== f.toRaw(f.formValue);
                    } catch { return false; }
                });

                if (blockchainDiffs.length === 0 && formDiffs.length === 0) return null;

                return (
                    <>
                        {/* Blockchain-confirmed scheduled changes */}
                        {blockchainDiffs.length > 0 && (
                            <div className="admin-section-card" style={{ marginTop: "20px", border: "1px solid rgba(34, 197, 94, 0.4)", background: "rgba(34, 197, 94, 0.05)" }}>
                                <h3 className="admin-section-title" style={{ color: "#22c55e" }}>✅ Đã lên lịch trên Blockchain (Active → Next Round)</h3>
                                <div style={{ display: "grid", gap: "8px" }}>
                                    {blockchainDiffs.map(f => (
                                        <div key={f.key} style={{
                                            display: "flex", justifyContent: "space-between", alignItems: "center",
                                            padding: "10px 14px", background: "rgba(0,0,0,0.3)", borderRadius: "8px",
                                            borderLeft: "3px solid #22c55e"
                                        }}>
                                            <span style={{ color: "#aaa", fontSize: "13px" }}>{f.label}</span>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <span style={{ color: "#ef4444", textDecoration: "line-through", fontSize: "13px" }}>{f.format(parsedConfig[f.key])}</span>
                                                <span style={{ color: "#22c55e" }}>→</span>
                                                <span style={{ color: "#22c55e", fontWeight: "bold", fontSize: "13px" }}>{f.format(parsedNextConfig![f.key])}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: "10px", fontSize: "11px", color: "#888" }}>
                                    ⚡ Tự động áp dụng khi Round #{(Number(currentRound) + 1).toString()} bắt đầu
                                </div>
                            </div>
                        )}

                        {/* Form preview - what will change if user submits */}
                        {formDiffs.length > 0 && (
                            <div className="admin-section-card" style={{ marginTop: "20px", border: "1px solid rgba(251, 191, 36, 0.4)", background: "rgba(251, 191, 36, 0.05)" }}>
                                <h3 className="admin-section-title" style={{ color: "#fbbf24" }}>📝 Xem trước thay đổi (Form hiện tại vs Active)</h3>
                                <div style={{ display: "grid", gap: "8px" }}>
                                    {formDiffs.map(f => (
                                        <div key={f.key} style={{
                                            display: "flex", justifyContent: "space-between", alignItems: "center",
                                            padding: "10px 14px", background: "rgba(0,0,0,0.3)", borderRadius: "8px",
                                            borderLeft: "3px solid #fbbf24"
                                        }}>
                                            <span style={{ color: "#aaa", fontSize: "13px" }}>{f.label}</span>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <span style={{ color: "#ef4444", textDecoration: "line-through", fontSize: "13px" }}>{f.format(parsedConfig[f.key])}</span>
                                                <span style={{ color: "#fbbf24" }}>→</span>
                                                <span style={{ color: "#fbbf24", fontWeight: "bold", fontSize: "13px" }}>{f.format(BigInt(f.toRaw(f.formValue)))}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: "10px", fontSize: "11px", color: "#888" }}>
                                    ⚠️ Chưa gửi — bấm "Lên Lịch" để ghi lên blockchain
                                </div>
                            </div>
                        )}
                    </>
                );
            })()}

            {/* ========== 🚨 EMERGENCY ACTIONS ========== */}
            {isOwner && (
                <div className="admin-section-card fomo-emergency-section" style={{ marginTop: "20px" }}>
                    <h3 className="admin-section-title" style={{ color: "#ef4444" }}>🚨 Emergency Actions</h3>
                    <p style={{ fontSize: "12px", color: "#888", marginBottom: "16px" }}>Hành động khẩn cấp — cân nhắc kỹ trước khi thực hiện</p>

                    {/* Pause / Resume */}
                    <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "13px", color: "#ccc", marginBottom: "8px", fontWeight: 600 }}>⏸️ {t.fomo?.pause?.title}</div>
                        <div className="fomo-flex-actions">
                            <SafetyButton
                                onConfirm={() => handleSetPaused(true)}
                                label={`⏸️ ${t.fomo?.pause?.pauseBtn}`}
                                confirmLabel={t.fomo?.pause?.pauseConfirm || "Release to Pause"}
                                disabled={isPausePending || isPauseConfirming || isPaused}
                                className="admin-btn-danger"
                                duration={2000}
                            />
                            <button
                                className="admin-btn-primary"
                                onClick={() => handleSetPaused(false)}
                                disabled={isPausePending || isPauseConfirming || !isPaused}
                                style={{ background: !isPaused ? "#666" : "#22c55e", flex: 1 }}
                            >
                                {isPausePending || isPauseConfirming ? t.processing : `▶️ ${t.fomo?.pause?.resumeBtn}`}
                            </button>
                        </div>
                    </div>

                    {/* Distribute Dust */}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "16px" }}>
                        <div style={{ fontSize: "13px", color: "#ccc", marginBottom: "8px", fontWeight: 600 }}>🎁 {t.fomo?.rescue?.title}</div>
                        <p style={{ fontSize: "12px", color: "#888", marginBottom: "12px" }}>{t.fomo?.rescue?.desc}</p>
                        <div className="fomo-grid-3col" style={{ marginBottom: "12px" }}>
                            <div>
                                <span style={{ color: "#888", fontSize: "12px" }}>🎰 Jackpot: </span>
                                <span style={{ fontWeight: "bold", fontSize: "13px" }}>{jackpotPool ? Number(formatUnits(jackpotPool, 18)).toLocaleString() : "0"}</span>
                            </div>
                            <div>
                                <span style={{ color: "#888", fontSize: "12px" }}>🌱 Seed: </span>
                                <span style={{ fontWeight: "bold", fontSize: "13px" }}>{seedFund ? Number(formatUnits(seedFund, 18)).toLocaleString() : "0"}</span>
                            </div>
                            <div>
                                <span style={{ color: "#888", fontSize: "12px" }}>🏦 Vault: </span>
                                <span style={{ fontWeight: "bold", fontSize: "13px" }}>{totalVault ? Number(formatUnits(totalVault, 18)).toLocaleString() : "0"}</span>
                            </div>
                        </div>
                        <button
                            className="admin-btn-primary"
                            onClick={handleDistributeDust}
                            disabled={isDistributing || isDistributeConfirming}
                            style={{ background: "#22c55e", width: "100%" }}
                        >
                            {isDistributing || isDistributeConfirming ? t.processing : `🎁 ${t.fomo?.rescue?.rescueBtn}`}
                        </button>
                    </div>
                </div>
            )}

            {/* ========== SCHEDULE CONFIG CHANGE (V11) ========== */}
            {isOwner && (
                <div className="admin-section-card" style={{ marginTop: "20px", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                    <h3 className="admin-section-title">📝 {t.fomo?.schedule?.title}</h3>
                    <div style={{ background: "rgba(251, 191, 36, 0.1)", padding: "12px", borderRadius: "8px", marginBottom: "16px", borderLeft: "4px solid #fbbf24" }}>
                        <strong>⚠️ {t.fomo?.schedule?.note}</strong> {t.fomo?.schedule?.noteDesc}
                    </div>

                    {/* Preset Templates */}
                    <div className="fomo-preset-bar">
                        {Object.entries(CONFIG_PRESETS).map(([key, preset]) => (
                            <button key={key} className="fomo-preset-btn" onClick={() => applyPreset(key)}>
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    {/* Export / Import */}
                    <div className="fomo-export-bar">
                        <button className="fomo-export-btn" onClick={exportConfig}>📋 Copy JSON</button>
                        <button className="fomo-export-btn" onClick={importConfig}>📥 Paste JSON</button>
                    </div>

                    <div className="fomo-grid-3col" style={{ gap: "16px" }}>
                        {/* Attack Cost */}
                        <div className="admin-form-group">
                            <label className="admin-label">💰 {t.fomo?.schedule?.attackCostLabel}</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={formAttackCost}
                                onChange={(e) => setFormAttackCost(e.target.value)}
                                placeholder="2000"
                            />
                            <small style={{ color: "#888", fontSize: "10px", display: "block", marginTop: "4px", lineHeight: "1.4" }}>
                                💡 Số token $BANMAO mỗi lần tấn công.
                                <br />VD: <b>5000</b> = 5,000 $BANMAO/lần.
                                <br /><span style={{ color: "#f59e0b" }}>Cao → ít người chơi, thấp → jackpot tăng chậm</span>
                            </small>
                            {Number(formAttackCost) > 0 && Number(formAttackCost) < 100 && (
                                <small style={{ color: "#f59e0b", fontSize: "10px" }}>⚠️ Quá thấp! Jackpot sẽ tăng rất chậm</small>
                            )}
                        </div>

                        {/* Soft Duration */}
                        <div className="admin-form-group">
                            <label className="admin-label">
                                🐱 {t.fomo?.schedule?.softDurationLabel}
                                {formSoftDuration && <TimeConversionBadge seconds={formSoftDuration} />}
                            </label>
                            <input
                                type="number"
                                className="admin-input"
                                value={formSoftDuration}
                                onChange={(e) => setFormSoftDuration(e.target.value)}
                                placeholder="21600"
                            />
                            <small style={{ color: "#888", fontSize: "10px", display: "block", marginTop: "4px", lineHeight: "1.4" }}>
                                💡 Nếu <b>không ai tấn công</b> trong thời gian này → round kết thúc (soft win).
                                <br />VD: <b>21600</b> = 6 giờ. Mỗi attack reset lại timer này.
                                <br /><span style={{ color: "#f59e0b" }}>Ngắn → round kết thúc nhanh hơn</span>
                            </small>
                        </div>

                        {/* Hard Duration */}
                        <div className="admin-form-group">
                            <label className="admin-label">
                                💀 {t.fomo?.schedule?.hardDurationLabel}
                                {formHardDuration && <TimeConversionBadge seconds={formHardDuration} />}
                            </label>
                            <input
                                type="number"
                                className="admin-input"
                                value={formHardDuration}
                                onChange={(e) => setFormHardDuration(e.target.value)}
                                placeholder="432000"
                            />
                            <small style={{ color: "#888", fontSize: "10px", display: "block", marginTop: "4px", lineHeight: "1.4" }}>
                                💡 Thời gian <b>tối đa</b> của round (hard timer). Giảm dần khi bị tấn công, <b>không thể reset</b>.
                                <br />VD: <b>432000</b> = 5 ngày. Khi về 0 → round kết thúc (hard win).
                                <br /><span style={{ color: "#f59e0b" }}>Dài → round kéo dài hơn, jackpot lớn hơn</span>
                            </small>
                        </div>

                        {/* Time Decrease Step */}
                        <div className="admin-form-group">
                            <label className="admin-label">
                                ⏱️ {t.fomo?.schedule?.decreaseStepLabel}
                                {formDecreaseStep && <TimeConversionBadge seconds={formDecreaseStep} />}
                            </label>
                            <input
                                type="number"
                                className="admin-input"
                                value={formDecreaseStep}
                                onChange={(e) => setFormDecreaseStep(e.target.value)}
                                placeholder="30"
                            />
                            <small style={{ color: "#888", fontSize: "10px", display: "block", marginTop: "4px", lineHeight: "1.4" }}>
                                💡 Mỗi lần tấn công → hard timer bị <b>trừ thêm</b> bấy nhiêu giây.
                                <br />VD: <b>30</b> = mỗi attack trừ 30s khỏi hard timer.
                                <br /><span style={{ color: "#f59e0b" }}>Lớn → round kết thúc nhanh. Nhỏ → round kéo dài</span>
                            </small>
                        </div>

                        {/* Max Attacks */}
                        <div className="admin-form-group">
                            <label className="admin-label">🎯 {t.fomo?.schedule?.maxAttacksLabel}</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={formMaxAttacks}
                                onChange={(e) => setFormMaxAttacks(e.target.value)}
                                placeholder="1000000"
                            />
                            <small style={{ color: "#888", fontSize: "10px", display: "block", marginTop: "4px", lineHeight: "1.4" }}>
                                💡 Tổng lượt attack tối đa trong <b>toàn bộ round</b> (tất cả người chơi cộng lại).
                                <br />VD: <b>1000000</b> = 1 triệu lượt.
                                <br /><span style={{ color: "#f59e0b" }}>Đặt rất lớn nếu không muốn giới hạn</span>
                            </small>
                        </div>

                        {/* Min Attacks for Reward */}
                        <div className="admin-form-group">
                            <label className="admin-label">⭐ {t.fomo?.schedule?.minAttacksLabel}</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={formMinAttacks}
                                onChange={(e) => setFormMinAttacks(e.target.value)}
                                placeholder="10"
                            />
                            <small style={{ color: "#888", fontSize: "10px", display: "block", marginTop: "4px", lineHeight: "1.4" }}>
                                💡 Số attack <b>tối thiểu</b> 1 người cần để được chia phần thưởng dividend.
                                <br />VD: <b>10</b> = cần ≥ 10 attack mới nhận dividend.
                                <br /><span style={{ color: "#f59e0b" }}>Cao → khuyến khích chơi nhiều. Thấp → ai cũng được</span>
                            </small>
                        </div>

                        {/* Winner Percent */}
                        <div className="admin-form-group">
                            <label className="admin-label">🏆 {t.fomo?.schedule?.winnerPercentLabel}</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={formWinnerPercent}
                                onChange={(e) => setFormWinnerPercent(e.target.value)}
                                placeholder="75"
                                min="0"
                                max="100"
                            />
                            <small style={{ color: "#888", fontSize: "10px", display: "block", marginTop: "4px", lineHeight: "1.4" }}>
                                💡 % jackpot dành cho <b>người thắng</b> (người tấn công cuối cùng).
                                <br />VD: <b>75</b> = winner nhận 75% jackpot.
                                <br /><span style={{ color: "#ef4444", fontWeight: "bold" }}>Winner% + Top% phải = 100%</span>
                            </small>
                            {formWinnerPercent && formTopPercent && (parseInt(formWinnerPercent) + parseInt(formTopPercent)) !== 100 && (
                                <small style={{ color: "#ef4444", fontSize: "10px", fontWeight: "bold" }}>
                                    ❌ Tổng = {parseInt(formWinnerPercent || "0") + parseInt(formTopPercent || "0")}% (phải = 100%)
                                </small>
                            )}
                        </div>

                        {/* Top Attackers Percent */}
                        <div className="admin-form-group">
                            <label className="admin-label">📊 {t.fomo?.schedule?.topPercentLabel}</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={formTopPercent}
                                onChange={(e) => setFormTopPercent(e.target.value)}
                                placeholder="25"
                                min="0"
                                max="100"
                            />
                            <small style={{ color: "#888", fontSize: "10px", display: "block", marginTop: "4px", lineHeight: "1.4" }}>
                                💡 % jackpot chia cho <b>top 10 attackers</b> (theo số lượt attack cao nhất).
                                <br />VD: <b>25</b> = top 10 chia nhau 25% jackpot.
                                <br /><span style={{ color: "#ef4444", fontWeight: "bold" }}>Winner% + Top% phải = 100%</span>
                            </small>
                        </div>

                        {/* Claim Expiration */}
                        <div className="admin-form-group">
                            <label className="admin-label">
                                ⏰ {t.fomo?.schedule?.claimExpirationLabel}
                                {formClaimExpiration && <TimeConversionBadge seconds={formClaimExpiration} />}
                            </label>
                            <input
                                type="number"
                                className="admin-input"
                                value={formClaimExpiration}
                                onChange={(e) => setFormClaimExpiration(e.target.value)}
                                placeholder="7200"
                            />
                            <small style={{ color: "#888", fontSize: "10px", display: "block", marginTop: "4px", lineHeight: "1.4" }}>
                                💡 Sau khi round kết thúc, winner có <b>bấy nhiêu giây</b> để claim thưởng.
                                <br />VD: <b>7200</b> = 2 giờ. Nếu quá hạn → jackpot <b>roll sang round tiếp</b>.
                                <br /><span style={{ color: "#f59e0b" }}>Ngắn → áp lực claim nhanh. Dài → thoải mái hơn</span>
                            </small>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="fomo-flex-actions">
                        <button
                            className="admin-btn-primary"
                            onClick={handleScheduleConfig}
                            disabled={isScheduling || isConfigConfirming}
                            style={{ flex: 3 }}
                        >
                            {isScheduling || isConfigConfirming ? t.processing : `📝 ${t.fomo?.schedule?.submitBtn}`}
                        </button>
                        <button
                            onClick={() => {
                                if (parsedConfig) {
                                    setFormAttackCost(formatUnits(parsedConfig.attackCost, 18));
                                    setFormSoftDuration(parsedConfig.softDuration.toString());
                                    setFormHardDuration(parsedConfig.initialHardDuration.toString());
                                    setFormDecreaseStep(parsedConfig.timeDecreaseStep.toString());
                                    setFormMaxAttacks(parsedConfig.maxAttacksPerRound.toString());
                                    setFormWinnerPercent(parsedConfig.winnerPercent.toString());
                                    setFormTopPercent(parsedConfig.topAttackersPercent.toString());
                                    setFormMinAttacks(parsedConfig.minAttacksForReward.toString());
                                    setFormClaimExpiration(parsedConfig.claimExpirationTime.toString());
                                    formInitialized.current = true; // Mark as re-initialized from active config
                                    showToast("🔄 Đã reset về config đang hoạt động!", "success");
                                }
                            }}
                            disabled={!parsedConfig}
                            style={{
                                flex: 1,
                                padding: "12px 16px",
                                background: "rgba(251, 191, 36, 0.15)",
                                border: "1px solid rgba(251, 191, 36, 0.4)",
                                borderRadius: "8px",
                                color: "#fbbf24",
                                cursor: parsedConfig ? "pointer" : "not-allowed",
                                fontSize: "13px",
                                fontWeight: 600,
                            }}
                        >
                            🔄 Reset về Active
                        </button>
                    </div>
                </div>
            )}

            {/* ========== QUICK SIMULATE ========== */}
            {isOwner && parsedConfig && (
                <div className="admin-section-card fomo-simulate-panel" style={{ marginTop: "20px" }}>
                    <h3 className="admin-section-title" style={{ color: "#a855f7" }}>🧮 Quick Simulate</h3>
                    <p style={{ fontSize: "12px", color: "#888", marginBottom: "12px" }}>Nhập số lượng attack giả lập để xem ước tính phần thưởng</p>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
                        <input
                            type="number"
                            className="admin-input"
                            value={simAttacks}
                            onChange={(e) => setSimAttacks(e.target.value)}
                            placeholder="500"
                            style={{ maxWidth: "160px" }}
                        />
                        <span style={{ color: "#888", fontSize: "13px" }}>lượt attack</span>
                    </div>
                    {(() => {
                        const n = parseInt(simAttacks) || 0;
                        const cost = Number(formatUnits(parsedConfig.attackCost, 18));
                        const totalPool = n * cost;
                        const winnerAmt = totalPool * Number(parsedConfig.winnerPercent) / 100;
                        const topAmt = totalPool * Number(parsedConfig.topAttackersPercent) / 100;
                        return (
                            <div className="fomo-simulate-grid">
                                <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", textAlign: "center" }}>
                                    <div style={{ fontSize: "11px", color: "#888" }}>🎰 Tổng Jackpot</div>
                                    <div style={{ fontWeight: "bold", color: "#fbbf24", fontSize: "16px" }}>{totalPool.toLocaleString()}</div>
                                </div>
                                <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", textAlign: "center" }}>
                                    <div style={{ fontSize: "11px", color: "#888" }}>🏆 Winner ({parsedConfig.winnerPercent.toString()}%)</div>
                                    <div style={{ fontWeight: "bold", color: "#22c55e", fontSize: "16px" }}>{winnerAmt.toLocaleString()}</div>
                                </div>
                                <div style={{ padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", textAlign: "center" }}>
                                    <div style={{ fontSize: "11px", color: "#888" }}>📊 Top 10 ({parsedConfig.topAttackersPercent.toString()}%)</div>
                                    <div style={{ fontWeight: "bold", color: "#3b82f6", fontSize: "16px" }}>{topAmt.toLocaleString()}</div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* ========== VIP TIER SETTINGS ========== */}
            {isOwner && (
                <VipTierSection t={t} showToast={showToast} refetchAllData={refetchAllData} />
            )}

            {/* V11 Constants Info */}
            <div className="admin-section-card" style={{ marginTop: "20px", background: "rgba(0,0,0,0.2)" }}>
                <h3 className="admin-section-title" style={{ color: "#888" }}>📌 {t.fomo?.constants?.title}</h3>
                <div className="fomo-grid-4col" style={{ gap: "12px" }}>
                    <div style={{ padding: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", color: "#666" }}>{t.fomo?.constants?.cooldownTime}</div>
                        <div style={{ fontWeight: "bold", color: "#888" }}>5s</div>
                    </div>
                    <div style={{ padding: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", color: "#666" }}>{t.fomo?.constants?.maxClaimBatch}</div>
                        <div style={{ fontWeight: "bold", color: "#888" }}>50</div>
                    </div>
                    <div style={{ padding: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", color: "#666" }}>{t.fomo?.constants?.maxTopAttackers}</div>
                        <div style={{ fontWeight: "bold", color: "#888" }}>10</div>
                    </div>
                    <div style={{ padding: "8px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", color: "#666" }}>{t.fomo?.constants?.precision}</div>
                        <div style={{ fontWeight: "bold", color: "#888" }}>1e18</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// VIP Tier Section Component
function VipTierSection({ t, showToast, refetchAllData }: { t: AdminLocale; showToast: (msg: string, type: string, duration?: number) => void; refetchAllData: () => void }) {
    const { address } = useAccount();
    // States for form inputs
    const [thresholds, setThresholds] = useState<string[]>(["10", "100", "500", "1000"]);
    const [reductions, setReductions] = useState<string[]>(["0", "10", "20", "40"]);

    // Read current tier values
    const { data: tierThresholdsData, refetch: refetchThresholds } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "getTierThresholds",
        chainId: CHAIN_ID,
        query: { refetchInterval: 30000 }, // Reduced from 10s to 30s
    });

    const { data: tierReductionsData, refetch: refetchReductions } = useReadContract({
        address: BANMAOFOMO_ADDRESS,
        abi: BANMAOFOMO_ABI,
        functionName: "getTierCooldownReduction",
        chainId: CHAIN_ID,
        query: { refetchInterval: 30000 }, // Reduced from 10s to 30s
    });

    // Write functions
    const { writeContract: setThresholdsFn, data: thresholdsHash, isPending: isThresholdsPending, error: writeThresholdsError } = useWriteContract();
    const { isLoading: isThresholdsConfirming, isSuccess: isThresholdsSuccess, error: txThresholdsError } = useWaitForTransactionReceipt({ hash: thresholdsHash });

    const { writeContract: setReductionsFn, data: reductionsHash, isPending: isReductionsPending, error: writeReductionsError } = useWriteContract();
    const { isLoading: isReductionsConfirming, isSuccess: isReductionsSuccess, error: txReductionsError } = useWaitForTransactionReceipt({ hash: reductionsHash });

    // Debug logging
    useEffect(() => {
        console.log("[VIP Tier] Contract:", BANMAOFOMO_ADDRESS);
        console.log("[VIP Tier] Thresholds data:", tierThresholdsData);
        console.log("[VIP Tier] Reductions data:", tierReductionsData);
    }, [tierThresholdsData, tierReductionsData]);

    useEffect(() => {
        if (tierThresholdsData) {
            const data = tierThresholdsData as readonly bigint[];
            console.log("[VIP Tier] Setting thresholds from contract:", data);
            setThresholds(Array.from(data).map(v => v.toString()));
        }
    }, [tierThresholdsData]);

    useEffect(() => {
        if (tierReductionsData) {
            const data = tierReductionsData as readonly bigint[];
            console.log("[VIP Tier] Setting reductions from contract:", data);
            setReductions(Array.from(data).map(v => v.toString()));
        }
    }, [tierReductionsData]);

    // Success callbacks
    useEffect(() => {
        if (isThresholdsSuccess) {
            console.log("[VIP Tier] Thresholds TX success! Hash:", thresholdsHash);
            showToast(t.success + " - Tier Thresholds updated!", "success");
            // Delay refetch to allow blockchain to update
            setTimeout(() => {
                refetchThresholds();
                refetchReductions();
                refetchAllData();
            }, 2000);
        }
    }, [isThresholdsSuccess, thresholdsHash]);

    useEffect(() => {
        if (isReductionsSuccess) {
            console.log("[VIP Tier] Reductions TX success! Hash:", reductionsHash);
            showToast(t.success + " - Cooldown Reductions updated!", "success");
            setTimeout(() => {
                refetchThresholds();
                refetchReductions();
                refetchAllData();
            }, 2000);
        }
    }, [isReductionsSuccess, reductionsHash]);

    // Error handling
    useEffect(() => {
        if (writeThresholdsError) {
            console.error("[VIP Tier] Write thresholds error:", writeThresholdsError);
            showToast(t.error + " - " + (writeThresholdsError.message || "Failed to update thresholds"), "error");
        }
    }, [writeThresholdsError]);

    useEffect(() => {
        if (writeReductionsError) {
            console.error("[VIP Tier] Write reductions error:", writeReductionsError);
            showToast(t.error + " - " + (writeReductionsError.message || "Failed to update reductions"), "error");
        }
    }, [writeReductionsError]);

    const handleUpdateThresholds = () => {
        // Validation
        const vals = thresholds.map(v => parseInt(v));
        if (vals.some(isNaN)) {
            showToast(t.error + " - Invalid threshold values", "error");
            return;
        }
        if (!(vals[0] < vals[1] && vals[1] < vals[2] && vals[2] < vals[3])) {
            showToast(t.error + " - Thresholds must be ascending", "error");
            return;
        }

        const bigintVals: [bigint, bigint, bigint, bigint] = [BigInt(vals[0]), BigInt(vals[1]), BigInt(vals[2]), BigInt(vals[3])];
        (setThresholdsFn as any)({
            address: BANMAOFOMO_ADDRESS,
            abi: BANMAOFOMO_ABI,
            functionName: "setTierThresholds",
            args: [bigintVals],
            account: address,
            chainId: CHAIN_ID,
        });
        showToast(t.processing, "loading", 2000);
    };

    const handleUpdateReductions = () => {
        // Validation
        const vals = reductions.map(v => parseInt(v));
        if (vals.some(isNaN)) {
            showToast(t.error + " - Invalid reduction values", "error");
            return;
        }
        if (vals.some(v => v < 0 || v > 100)) {
            showToast(t.error + " - Reductions must be 0-100%", "error");
            return;
        }

        const bigintReductions: [bigint, bigint, bigint, bigint] = [BigInt(vals[0]), BigInt(vals[1]), BigInt(vals[2]), BigInt(vals[3])];
        (setReductionsFn as any)({
            address: BANMAOFOMO_ADDRESS,
            abi: BANMAOFOMO_ABI,
            functionName: "setTierCooldownReduction",
            args: [bigintReductions],
            account: address,
            chainId: CHAIN_ID,
        });
        showToast(t.processing, "loading", 2000);
    };

    const tierNames = ["🥉 Bronze", "🥈 Silver", "🥇 Gold", "💎 Diamond"];
    const tierColors = ["#cd7f32", "#c0c0c0", "#ffd700", "#b9f2ff"];

    return (
        <div className="admin-section-card" style={{ marginTop: "20px", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
            <h3 className="admin-section-title" style={{ color: "#a855f7" }}>💎 VIP Tier Settings</h3>
            <p className="admin-section-desc">Điều chỉnh ngưỡng tier và % giảm cooldown cho hệ thống VIP.</p>

            {/* Current Values Display */}
            <div className="fomo-grid-4col" style={{ marginBottom: "20px" }}>
                {tierNames.map((name, i) => (
                    <div key={i} style={{
                        padding: "12px",
                        background: `rgba(${i === 0 ? '205,127,50' : i === 1 ? '192,192,192' : i === 2 ? '255,215,0' : '185,242,255'},0.1)`,
                        borderRadius: "10px",
                        border: `1px solid ${tierColors[i]}40`,
                        textAlign: "center"
                    }}>
                        <div style={{ fontSize: "20px", marginBottom: "4px" }}>{name.split(' ')[0]}</div>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: tierColors[i] }}>{name.split(' ')[1]}</div>
                        <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                            ≥{thresholds[i]} gifts
                        </div>
                        <div style={{ fontSize: "11px", color: "#22c55e" }}>
                            -{reductions[i]}% cooldown
                        </div>
                    </div>
                ))}
            </div>

            {/* Thresholds Form */}
            <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#a855f7", fontWeight: "bold" }}>
                    🎯 Tier Thresholds (số lượt tặng tối thiểu)
                </label>
                <div className="fomo-grid-4col">
                    {thresholds.map((val, i) => (
                        <div key={i} className="admin-form-group" style={{ marginBottom: 0 }}>
                            <label className="admin-label" style={{ fontSize: "11px", color: tierColors[i] }}>{tierNames[i]}</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={val}
                                onChange={(e) => {
                                    const newThresholds = [...thresholds];
                                    newThresholds[i] = e.target.value;
                                    setThresholds(newThresholds);
                                }}
                                placeholder={["10", "100", "500", "1000"][i]}
                            />
                        </div>
                    ))}
                </div>
                <button
                    className="admin-btn-primary"
                    onClick={handleUpdateThresholds}
                    disabled={isThresholdsPending || isThresholdsConfirming}
                    style={{ marginTop: "12px", background: "#a855f7" }}
                >
                    {isThresholdsPending || isThresholdsConfirming ? t.processing : "📝 Update Thresholds"}
                </button>
            </div>

            {/* Cooldown Reductions Form */}
            <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#22c55e", fontWeight: "bold" }}>
                    ⏱️ Cooldown Reduction % (giảm thời gian chờ)
                </label>
                <div className="fomo-grid-4col">
                    {reductions.map((val, i) => (
                        <div key={i} className="admin-form-group" style={{ marginBottom: 0 }}>
                            <label className="admin-label" style={{ fontSize: "11px", color: tierColors[i] }}>{tierNames[i]}</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={val}
                                onChange={(e) => {
                                    const newReductions = [...reductions];
                                    newReductions[i] = e.target.value;
                                    setReductions(newReductions);
                                }}
                                placeholder={["0", "10", "20", "40"][i]}
                                min="0"
                                max="100"
                            />
                            <small style={{ fontSize: "10px", color: "#888" }}>= {(5 * (100 - parseInt(val || "0")) / 100).toFixed(1)}s</small>
                        </div>
                    ))}
                </div>
                <button
                    className="admin-btn-primary"
                    onClick={handleUpdateReductions}
                    disabled={isReductionsPending || isReductionsConfirming}
                    style={{ marginTop: "12px", background: "#22c55e" }}
                >
                    {isReductionsPending || isReductionsConfirming ? t.processing : "📝 Update Reductions"}
                </button>
            </div>

            <div style={{ background: "rgba(251, 191, 36, 0.1)", padding: "12px", borderRadius: "8px", marginTop: "16px", borderLeft: "4px solid #fbbf24" }}>
                <strong>⚡ Lưu ý:</strong> Thay đổi được áp dụng ngay lập tức cho tất cả người chơi.
            </div>
        </div>
    );
}
