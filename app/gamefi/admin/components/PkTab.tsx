/**
 * PkTab Component
 * Admin panel for BanMaoPK game
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { BANMAOPK_ADDRESS, BANMAO_ADDRESS } from "../../banmaopk/lib/constants";
import { BANMAOPK_ABI } from "../../banmaofomo/lib/abis";
import ContractInfoCard from './ContractInfoCard';
import { en } from "../i18n/en";

type AdminLocale = typeof en;

interface PkTabProps {
    t: AdminLocale;
    isAdmin: boolean;
}

export default function PkTab({ t, isAdmin }: PkTabProps) {
    const { address } = useAccount();

    // === READ CONTRACT DATA ===
    const { data: contractOwner } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "owner",
    });

    const isOwner = contractOwner?.toLowerCase() === address?.toLowerCase();

    const { data: minDeposit, refetch: refetchMinDeposit } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "minChallengeDeposit",
    });

    const { data: overtimeDuration, refetch: refetchOvertime } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "overtimeDuration",
    });

    const { data: currentMatchId, refetch: refetchMatchId } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "currentMatchId",
    });

    // Share percentages
    const { data: winnerShare, refetch: refetchShares } = useReadContract({ address: BANMAOPK_ADDRESS, abi: BANMAOPK_ABI, functionName: "winnerShare" });
    const { data: loserShare } = useReadContract({ address: BANMAOPK_ADDRESS, abi: BANMAOPK_ABI, functionName: "loserShare" });
    const { data: votersShare } = useReadContract({ address: BANMAOPK_ADDRESS, abi: BANMAOPK_ABI, functionName: "votersShare" });
    const { data: burnShare } = useReadContract({ address: BANMAOPK_ADDRESS, abi: BANMAOPK_ABI, functionName: "burnShare" });
    const { data: treasuryShare } = useReadContract({ address: BANMAOPK_ADDRESS, abi: BANMAOPK_ABI, functionName: "treasuryShare" });

    const refetchAll = useCallback(() => {
        refetchMinDeposit();
        refetchOvertime();
        refetchMatchId();
        refetchShares();
    }, [refetchMinDeposit, refetchOvertime, refetchMatchId, refetchShares]);

    // === FORM STATES ===
    const [newMinDeposit, setNewMinDeposit] = useState("");
    const [newOvertime, setNewOvertime] = useState("");

    // Shares
    const [shares, setShares] = useState({ winner: "", loser: "", voters: "", burn: "", treasury: "" });

    // Match Mgmt
    const [p1, setP1] = useState("");
    const [p2, setP2] = useState("");
    const [durationHours, setDurationHours] = useState("24");
    const [cancelMatchId, setCancelMatchId] = useState("");

    // Recover
    const [recoverToken, setRecoverToken] = useState("");
    const [recoverAmount, setRecoverAmount] = useState("");

    // === WRITE HOOKS ===
    const { writeContract: writeConfig, data: configHash, isPending: isConfigPending } = useWriteContract();
    const { isSuccess: isConfigSuccess } = useWaitForTransactionReceipt({ hash: configHash });

    const { writeContract: writeMatch, data: matchHash, isPending: isMatchPending } = useWriteContract();
    const { isSuccess: isMatchSuccess } = useWaitForTransactionReceipt({ hash: matchHash });

    const { writeContract: writeRecover, data: recoverHash, isPending: isRecoverPending } = useWriteContract();
    const { isSuccess: isRecoverSuccess, isError: isRecoverError, error: recoverError } = useWaitForTransactionReceipt({ hash: recoverHash });

    // === EFFECTS ===
    useEffect(() => {
        if (isConfigSuccess) {
            refetchAll();
            setNewMinDeposit("");
            setNewOvertime("");
            setShares({ winner: "", loser: "", voters: "", burn: "", treasury: "" });
        }
    }, [isConfigSuccess, refetchAll]);

    useEffect(() => {
        if (isMatchSuccess) {
            refetchMatchId();
            setP1("");
            setP2("");
            setDurationHours("24");
            setCancelMatchId("");
        }
    }, [isMatchSuccess, refetchMatchId]);

    useEffect(() => {
        if (isRecoverSuccess) {
            setRecoverToken("");
            setRecoverAmount("");
        }
    }, [isRecoverSuccess]);

    // === HANDLERS ===
    const handleSetMinDeposit = () => {
        if (!newMinDeposit) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (writeConfig as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "setMinChallengeDeposit",
            args: [parseUnits(newMinDeposit, 18)],
        });
    };

    const handleSetOvertime = () => {
        if (!newOvertime) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (writeConfig as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "setOvertimeDuration",
            args: [BigInt(newOvertime)],
        });
    };

    const handleUpdateShares = () => {
        const { winner, loser, voters, burn, treasury } = shares;
        if (!winner || !loser || !voters || !burn || !treasury) return;
        const total = Number(winner) + Number(loser) + Number(voters) + Number(burn) + Number(treasury);
        if (total !== 100) {
            alert("Shares must sum to 100%");
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (writeConfig as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "setDistributionShares",
            args: [BigInt(winner), BigInt(loser), BigInt(voters), BigInt(burn), BigInt(treasury)],
        });
    };

    const handleCreateMatch = () => {
        if (!p1 || !p2 || !durationHours) return;
        const durationSec = BigInt(Number(durationHours) * 3600);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (writeMatch as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "createMatch",
            args: [p1, p2, durationSec],
        });
    };

    const handleForceCancel = () => {
        if (!cancelMatchId) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (writeMatch as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "forceCancelStaleMatch",
            args: [BigInt(cancelMatchId)],
        });
    };

    const handleRecover = () => {
        if (!recoverToken || !recoverAmount) return;
        if (recoverToken.toLowerCase() === BANMAO_ADDRESS.toLowerCase()) {
            alert("Cannot recover BANMAO token");
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (writeRecover as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "recoverStuckToken",
            args: [recoverToken, parseUnits(recoverAmount, 18)],
        });
    };

    if (!isOwner) {
        return (
            <div className="admin-panel">
                <div className="admin-alert admin-alert-error">
                    ⛔ {t.contractOwnerOnly}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-panel">
            <h2 className="admin-panel-title">🛡️ {t.pk?.title}</h2>
            <p className="admin-panel-desc">{t.pk?.desc}</p>

            <ContractInfoCard
                title="PK Contract"
                address={BANMAOPK_ADDRESS}
                chainId={196}
                networkName="X Layer Mainnet"
                explorerBaseUrl="https://web3.okx.com/explorer/x-layer/address"
            />

            {/* === STATUS SECTION === */}
            <div className="admin-section-card">
                <h3 className="admin-section-title">📊 Status</h3>
                <div className="admin-stats-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                    <div className="admin-stat-card">
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{currentMatchId?.toString() || "0"}</span>
                            <span className="admin-stat-label">{t.pk?.status?.currentMatchId}</span>
                        </div>
                    </div>
                    <div className="admin-stat-card">
                        <div className="admin-stat-info">
                            <span className="admin-stat-value">{BANMAOPK_ADDRESS.slice(0, 6)}...{BANMAOPK_ADDRESS.slice(-4)}</span>
                            <span className="admin-stat-label">Contract Address</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* === CONFIG SECTION === */}
            <div className="admin-section-card" style={{ marginTop: "20px" }}>
                <h3 className="admin-section-title">⚙️ {t.pk?.config?.title}</h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                    {/* Min Deposit */}
                    <div className="admin-form-group">
                        <label className="admin-label">
                            {t.pk?.config?.minDeposit}
                            <span style={{ float: 'right', color: '#fbbf24' }}>
                                Curr: {minDeposit ? formatUnits(minDeposit, 18) : "0"}
                            </span>
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="number"
                                className="admin-input"
                                value={newMinDeposit}
                                onChange={(e) => setNewMinDeposit(e.target.value)}
                                placeholder="New Amount"
                            />
                            <button
                                className="admin-btn-primary"
                                onClick={handleSetMinDeposit}
                                disabled={isConfigPending}
                                style={{ width: 'auto' }}
                            >
                                {t.pk?.config?.setBtn}
                            </button>
                        </div>
                    </div>

                    {/* Overtime */}
                    <div className="admin-form-group">
                        <label className="admin-label">
                            {t.pk?.config?.overtime}
                            <span style={{ float: 'right', color: '#fbbf24' }}>
                                Curr: {overtimeDuration?.toString() || "0"}s
                            </span>
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="number"
                                className="admin-input"
                                value={newOvertime}
                                onChange={(e) => setNewOvertime(e.target.value)}
                                placeholder="New Duration"
                            />
                            <button
                                className="admin-btn-primary"
                                onClick={handleSetOvertime}
                                disabled={isConfigPending}
                                style={{ width: 'auto' }}
                            >
                                {t.pk?.config?.setBtn}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Shares */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}>
                    <label className="admin-label" style={{ marginBottom: '12px', display: 'block' }}>
                        {t.pk?.config?.shares}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '8px', textAlign: 'center', fontSize: '11px', color: '#888' }}>
                        <div>{t.pk?.config?.winner} ({winnerShare?.toString()}%)</div>
                        <div>{t.pk?.config?.loser} ({loserShare?.toString()}%)</div>
                        <div>{t.pk?.config?.voters} ({votersShare?.toString()}%)</div>
                        <div>{t.pk?.config?.burn} ({burnShare?.toString()}%)</div>
                        <div>{t.pk?.config?.treasury} ({treasuryShare?.toString()}%)</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                        <input type="number" className="admin-input" placeholder="Win %" value={shares.winner} onChange={e => setShares({ ...shares, winner: e.target.value })} style={{ textAlign: 'center' }} />
                        <input type="number" className="admin-input" placeholder="Lose %" value={shares.loser} onChange={e => setShares({ ...shares, loser: e.target.value })} style={{ textAlign: 'center' }} />
                        <input type="number" className="admin-input" placeholder="Vote %" value={shares.voters} onChange={e => setShares({ ...shares, voters: e.target.value })} style={{ textAlign: 'center' }} />
                        <input type="number" className="admin-input" placeholder="Burn %" value={shares.burn} onChange={e => setShares({ ...shares, burn: e.target.value })} style={{ textAlign: 'center' }} />
                        <input type="number" className="admin-input" placeholder="Treas %" value={shares.treasury} onChange={e => setShares({ ...shares, treasury: e.target.value })} style={{ textAlign: 'center' }} />
                    </div>
                    <button
                        className="admin-btn-primary"
                        onClick={handleUpdateShares}
                        disabled={isConfigPending}
                        style={{ marginTop: '12px', width: '100%' }}
                    >
                        {isConfigPending ? t.processing : t.pk?.config?.updateBtn}
                    </button>
                </div>
            </div>

            {/* === MATCH MANAGEMENT === */}
            <div className="admin-section-card" style={{ marginTop: "20px", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                <h3 className="admin-section-title">⚔️ {t.pk?.matches?.title}</h3>

                {/* Create Match */}
                <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#3b82f6' }}>{t.pk?.matches?.create}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        <div className="admin-form-group">
                            <label className="admin-label">{t.pk?.matches?.player1}</label>
                            <input className="admin-input" value={p1} onChange={e => setP1(e.target.value)} placeholder="0x..." />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-label">{t.pk?.matches?.player2}</label>
                            <input className="admin-input" value={p2} onChange={e => setP2(e.target.value)} placeholder="0x..." />
                        </div>
                        <div className="admin-form-group">
                            <label className="admin-label">{t.pk?.matches?.duration}</label>
                            <input type="number" className="admin-input" value={durationHours} onChange={e => setDurationHours(e.target.value)} placeholder="24" />
                        </div>
                    </div>
                    <button className="admin-btn-primary" onClick={handleCreateMatch} disabled={isMatchPending} style={{ background: '#3b82f6' }}>
                        {isMatchPending ? t.processing : t.pk?.matches?.createBtn}
                    </button>
                </div>

                {/* Force Cancel */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#ef4444' }}>{t.pk?.matches?.forceCancel}</h4>
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>{t.pk?.matches?.cancelHint}</p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                            className="admin-input"
                            style={{ flex: 1 }}
                            value={cancelMatchId}
                            onChange={e => setCancelMatchId(e.target.value)}
                            placeholder={t.pk?.matches?.matchId}
                        />
                        <button className="admin-btn-danger" onClick={handleForceCancel} disabled={isMatchPending} style={{ width: 'auto' }}>
                            {isMatchPending ? t.processing : t.pk?.matches?.cancelBtn}
                        </button>
                    </div>
                </div>
            </div>

            {/* === RECOVERY === */}
            <div className="admin-section-card" style={{ marginTop: "20px", border: "1px solid rgba(234, 179, 8, 0.3)" }}>
                <h3 className="admin-section-title" style={{ color: '#eab308' }}>🔧 {t.pk?.recover?.title}</h3>
                <p className="admin-section-desc">{t.pk?.recover?.desc}</p>
                <div className="admin-alert admin-alert-warning" style={{ fontSize: '11px', marginBottom: '16px' }}>
                    {t.pk?.recover?.warning}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div className="admin-form-group">
                        <label className="admin-label">{t.pk?.recover?.token}</label>
                        <input className="admin-input" value={recoverToken} onChange={e => setRecoverToken(e.target.value)} placeholder="0x..." />
                    </div>
                    <div className="admin-form-group">
                        <label className="admin-label">{t.pk?.recover?.amount}</label>
                        <input type="number" className="admin-input" value={recoverAmount} onChange={e => setRecoverAmount(e.target.value)} placeholder="18 decimals" />
                    </div>
                </div>
                <button className="admin-btn-primary" onClick={handleRecover} disabled={isRecoverPending} style={{ background: '#eab308', color: '#000' }}>
                    {isRecoverPending ? t.processing : t.pk?.recover?.recoverBtn}
                </button>
                {isRecoverSuccess && <div className="admin-alert admin-alert-success" style={{ marginTop: '12px' }}>{t.success}</div>}
                {isRecoverError && <div className="admin-alert admin-alert-error" style={{ marginTop: '12px' }}>{recoverError?.message}</div>}
            </div>
        </div>
    );
}
