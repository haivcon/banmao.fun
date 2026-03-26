/**
 * Create Challenge Panel Content
 * Used inside DraggablePanel on the main PK page
 */
"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { BANMAOPK_ADDRESS, BANMAO_ADDRESS, DURATION_PRESETS } from "../lib/constants";
import { BANMAOPK_ABI, ERC20_ABI } from "../lib/abis";

interface CreateChallengePanelProps {
    onSuccess?: () => void;
}

export default function CreateChallengePanel({ onSuccess }: CreateChallengePanelProps) {
    const { address } = useAccount();
    const [targetAddress, setTargetAddress] = useState("");
    const [depositAmount, setDepositAmount] = useState("");
    const [duration, setDuration] = useState(DURATION_PRESETS[2].value);

    const { data: minDeposit } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "minChallengeDeposit",
    });

    const { data: userBalance } = useReadContract({
        address: BANMAO_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: BANMAO_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, BANMAOPK_ADDRESS] : undefined,
    });

    const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

    const { writeContract: createChallenge, data: createHash, isPending: isCreating } = useWriteContract();
    const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createHash });

    useEffect(() => {
        if (isApproveSuccess) refetchAllowance();
    }, [isApproveSuccess, refetchAllowance]);

    useEffect(() => {
        if (isCreateSuccess) onSuccess?.();
    }, [isCreateSuccess, onSuccess]);

    const depositBigInt = depositAmount ? parseUnits(depositAmount, 18) : 0n;
    const needsApproval = allowance !== undefined && depositBigInt > allowance;
    const isValid = depositBigInt >= (minDeposit || 0n) && depositBigInt <= (userBalance || 0n);

    const handleApprove = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (approve as any)({
            address: BANMAO_ADDRESS,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [BANMAOPK_ADDRESS, depositBigInt * 2n],
        });
    };

    const handleCreate = () => {
        const target = targetAddress.trim() || "0x0000000000000000000000000000000000000000";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (createChallenge as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "createChallenge",
            args: [BigInt(duration), depositBigInt, target],
        });
    };

    if (isCreateSuccess) {
        return (
            <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>Kèo Đã Được Tạo!</div>
                <p style={{ color: '#9ca3af', marginTop: '8px' }}>Chờ đối thủ nhận kèo.</p>
            </div>
        );
    }

    return (
        <div style={{ color: '#fff' }}>
            {/* Tax Warning */}
            <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                display: 'flex',
                gap: '10px'
            }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div style={{ fontSize: '12px', color: '#fca5a5' }}>
                    <strong>Lưu ý:</strong> Token có thuế giao dịch, số điểm thực tế sẽ thấp hơn.
                </div>
            </div>

            {/* Target Address */}
            <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
                    Địa chỉ Đối thủ (Để trống = Ai cũng vào được)
                </label>
                <input
                    type="text"
                    placeholder="0x... (optional)"
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        color: '#fff',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                    }}
                />
            </div>

            {/* Deposit Amount */}
            <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
                    Số Tiền Cọc (BANMAO)
                </label>
                <input
                    type="number"
                    placeholder={`Min: ${minDeposit ? Number(formatUnits(minDeposit, 18)).toLocaleString() : "..."}`}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        color: '#fff',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>
                    <span>Min: {minDeposit ? Number(formatUnits(minDeposit, 18)).toLocaleString() : "..."}</span>
                    <span>Balance: {userBalance ? Number(formatUnits(userBalance, 18)).toLocaleString() : "..."}</span>
                </div>
            </div>

            {/* Duration */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
                    Thời gian đấu
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {DURATION_PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            onClick={() => setDuration(preset.value)}
                            style={{
                                padding: '8px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: duration === preset.value
                                    ? 'linear-gradient(135deg, #f97316, #eab308)'
                                    : 'rgba(255,255,255,0.05)',
                                color: duration === preset.value ? '#000' : '#9ca3af'
                            }}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Action Button */}
            {needsApproval ? (
                <button
                    onClick={handleApprove}
                    disabled={isApproving || isApproveConfirming}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    {isApproving || isApproveConfirming ? "Đang Approve..." : "1️⃣ Approve Token"}
                </button>
            ) : (
                <button
                    onClick={handleCreate}
                    disabled={!isValid || isCreating || isCreateConfirming}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isValid
                            ? 'linear-gradient(135deg, #f97316, #eab308)'
                            : 'rgba(255,255,255,0.1)',
                        color: isValid ? '#000' : '#6b7280',
                        fontWeight: 700,
                        cursor: isValid ? 'pointer' : 'not-allowed'
                    }}
                >
                    {isCreating || isCreateConfirming ? "Đang tạo..." : "⚔️ Tạo Kèo"}
                </button>
            )}
        </div>
    );
}
