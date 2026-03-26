/**
 * ConfigPanel - Admin configuration for BanMaoPK contract
 */
"use client";

import React, { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { BANMAOPK_ADDRESS } from "../../lib/constants";
import { BANMAOPK_ABI } from "../../lib/abis";

export default function ConfigPanel() {
    // Read current values
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

    const { data: winnerShare } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "winnerShare",
    });

    const { data: loserShare } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "loserShare",
    });

    const { data: votersShare } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "votersShare",
    });

    const { data: burnShare } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "burnShare",
    });

    const { data: treasuryShare, refetch: refetchShares } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "treasuryShare",
    });

    // Form states
    const [newMinDeposit, setNewMinDeposit] = useState("");
    const [newOvertimeMinutes, setNewOvertimeMinutes] = useState("");
    const [shares, setShares] = useState({ winner: "", loser: "", voters: "", burn: "", treasury: "" });

    // Write contracts
    const { writeContract: setMinDepositFn, data: minDepHash, isPending: isSettingDeposit } = useWriteContract();
    const { isLoading: isDepConfirming, isSuccess: isDepSuccess } = useWaitForTransactionReceipt({ hash: minDepHash });

    const { writeContract: setOvertimeFn, data: overtimeHash, isPending: isSettingOvertime } = useWriteContract();
    const { isLoading: isOtConfirming, isSuccess: isOtSuccess } = useWaitForTransactionReceipt({ hash: overtimeHash });

    const { writeContract: setSharesFn, data: sharesHash, isPending: isSettingShares } = useWriteContract();
    const { isLoading: isSharesConfirming, isSuccess: isSharesSuccess } = useWaitForTransactionReceipt({ hash: sharesHash });

    // Refetch on success
    useEffect(() => {
        if (isDepSuccess) { refetchMinDeposit(); setNewMinDeposit(""); }
    }, [isDepSuccess, refetchMinDeposit]);

    useEffect(() => {
        if (isOtSuccess) { refetchOvertime(); setNewOvertimeMinutes(""); }
    }, [isOtSuccess, refetchOvertime]);

    useEffect(() => {
        if (isSharesSuccess) {
            refetchShares();
            setShares({ winner: "", loser: "", voters: "", burn: "", treasury: "" });
        }
    }, [isSharesSuccess, refetchShares]);

    // Handlers
    const handleSetMinDeposit = () => {
        if (!newMinDeposit) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (setMinDepositFn as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "setMinChallengeDeposit",
            args: [parseUnits(newMinDeposit, 18)],
        });
    };

    const handleSetOvertime = () => {
        if (!newOvertimeMinutes) return;
        const seconds = BigInt(Number(newOvertimeMinutes) * 60);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (setOvertimeFn as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "setOvertimeDuration",
            args: [seconds],
        });
    };

    const handleSetShares = () => {
        const total = Number(shares.winner) + Number(shares.loser) + Number(shares.voters) + Number(shares.burn) + Number(shares.treasury);
        if (total !== 100) {
            alert("Total must be 100%");
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (setSharesFn as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "setDistributionShares",
            args: [
                BigInt(shares.winner),
                BigInt(shares.loser),
                BigInt(shares.voters),
                BigInt(shares.burn),
                BigInt(shares.treasury),
            ],
        });
    };

    const inputStyle = {
        width: '100%',
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        padding: '10px',
        color: '#fff',
        fontSize: '13px',
        boxSizing: 'border-box' as const
    };

    const labelStyle = {
        display: 'block',
        fontSize: '11px',
        color: '#9ca3af',
        marginBottom: '4px'
    };

    const sectionStyle = {
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        padding: '14px',
        marginBottom: '12px'
    };

    return (
        <div style={{ color: '#fff' }}>
            {/* Min Deposit Section */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>Min Challenge Deposit</span>
                    <span style={{ fontSize: '12px', color: '#fbbf24' }}>
                        {minDeposit ? Number(formatUnits(minDeposit, 18)).toLocaleString() : "..."} BANMAO
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="number"
                        placeholder="New amount"
                        value={newMinDeposit}
                        onChange={(e) => setNewMinDeposit(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                        onClick={handleSetMinDeposit}
                        disabled={isSettingDeposit || isDepConfirming || !newMinDeposit}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        {isSettingDeposit || isDepConfirming ? '...' : 'Set'}
                    </button>
                </div>
            </div>

            {/* Overtime Duration Section */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>Overtime Duration</span>
                    <span style={{ fontSize: '12px', color: '#22c55e' }}>
                        {overtimeDuration ? `${Number(overtimeDuration) / 60} minutes` : "..."}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="number"
                        placeholder="Minutes (min 5)"
                        value={newOvertimeMinutes}
                        onChange={(e) => setNewOvertimeMinutes(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                        onClick={handleSetOvertime}
                        disabled={isSettingOvertime || isOtConfirming || !newOvertimeMinutes}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        {isSettingOvertime || isOtConfirming ? '...' : 'Set'}
                    </button>
                </div>
            </div>

            {/* Distribution Shares */}
            <div style={sectionStyle}>
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>Distribution Shares (Total = 100%)</div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '6px',
                    marginBottom: '8px',
                    fontSize: '10px',
                    color: '#6b7280',
                    textAlign: 'center'
                }}>
                    <span>Winner</span>
                    <span>Loser</span>
                    <span>Voters</span>
                    <span>Burn</span>
                    <span>Treasury</span>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '6px',
                    marginBottom: '8px',
                    fontSize: '11px',
                    textAlign: 'center',
                    color: '#fbbf24'
                }}>
                    <span>{winnerShare?.toString() || '-'}%</span>
                    <span>{loserShare?.toString() || '-'}%</span>
                    <span>{votersShare?.toString() || '-'}%</span>
                    <span>{burnShare?.toString() || '-'}%</span>
                    <span>{treasuryShare?.toString() || '-'}%</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
                    <input
                        type="number"
                        placeholder="%"
                        value={shares.winner}
                        onChange={(e) => setShares(p => ({ ...p, winner: e.target.value }))}
                        style={{ ...inputStyle, padding: '8px', textAlign: 'center' }}
                    />
                    <input
                        type="number"
                        placeholder="%"
                        value={shares.loser}
                        onChange={(e) => setShares(p => ({ ...p, loser: e.target.value }))}
                        style={{ ...inputStyle, padding: '8px', textAlign: 'center' }}
                    />
                    <input
                        type="number"
                        placeholder="%"
                        value={shares.voters}
                        onChange={(e) => setShares(p => ({ ...p, voters: e.target.value }))}
                        style={{ ...inputStyle, padding: '8px', textAlign: 'center' }}
                    />
                    <input
                        type="number"
                        placeholder="%"
                        value={shares.burn}
                        onChange={(e) => setShares(p => ({ ...p, burn: e.target.value }))}
                        style={{ ...inputStyle, padding: '8px', textAlign: 'center' }}
                    />
                    <input
                        type="number"
                        placeholder="%"
                        value={shares.treasury}
                        onChange={(e) => setShares(p => ({ ...p, treasury: e.target.value }))}
                        style={{ ...inputStyle, padding: '8px', textAlign: 'center' }}
                    />
                </div>
                <button
                    onClick={handleSetShares}
                    disabled={isSettingShares || isSharesConfirming}
                    style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #f97316, #eab308)',
                        color: '#000',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    {isSettingShares || isSharesConfirming ? 'Updating...' : 'Update Shares'}
                </button>
            </div>

            {/* Success messages */}
            {(isDepSuccess || isOtSuccess || isSharesSuccess) && (
                <div style={{ textAlign: 'center', color: '#22c55e', fontSize: '12px', marginTop: '8px' }}>
                    ✅ Updated successfully!
                </div>
            )}
        </div>
    );
}
