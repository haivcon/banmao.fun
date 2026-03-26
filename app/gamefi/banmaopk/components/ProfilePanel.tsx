/**
 * Profile Panel Content
 * Used inside DraggablePanel on the main PK page
 */
"use client";

import React, { useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { BANMAOPK_ADDRESS } from "../lib/constants";
import { BANMAOPK_ABI } from "../lib/abis";

export default function ProfilePanel() {
    const { address, isConnected } = useAccount();

    const { data: pendingWinnings, refetch: refetchWinnings } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "pendingWinnings",
        args: address ? [address] : undefined,
    });

    const { writeContract: withdraw, data: withdrawHash, isPending: isWithdrawing } = useWriteContract();
    const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });

    useEffect(() => {
        if (isWithdrawSuccess) refetchWinnings();
    }, [isWithdrawSuccess, refetchWinnings]);

    const handleWithdraw = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (withdraw as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "withdrawWinnings",
        });
    };

    if (!isConnected) {
        return (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
                <p>Vui lòng kết nối ví</p>
            </div>
        );
    }

    return (
        <div style={{ color: '#fff' }}>
            {/* Address */}
            <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
            }}>
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>Địa chỉ ví</div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {address}
                </div>
            </div>

            {/* Pending Winnings */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(234,179,8,0.1), rgba(249,115,22,0.1))',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '16px',
                border: '1px solid rgba(234,179,8,0.2)'
            }}>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Số dư chờ rút</div>
                <div style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    color: '#fbbf24',
                    marginBottom: '8px'
                }}>
                    {pendingWinnings
                        ? Number(formatUnits(pendingWinnings, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })
                        : "0"
                    } BANMAO
                </div>
                <button
                    onClick={handleWithdraw}
                    disabled={!pendingWinnings || pendingWinnings === 0n || isWithdrawing || isWithdrawConfirming}
                    style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: pendingWinnings && pendingWinnings > 0n
                            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                            : 'rgba(255,255,255,0.1)',
                        color: pendingWinnings && pendingWinnings > 0n ? '#fff' : '#6b7280',
                        fontWeight: 700,
                        cursor: pendingWinnings && pendingWinnings > 0n ? 'pointer' : 'not-allowed'
                    }}
                >
                    {isWithdrawing || isWithdrawConfirming ? "Đang rút..." : "💸 Rút Tiền"}
                </button>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>🎮</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Lịch sử Vote</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af' }}>Coming Soon</div>
                </div>
                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>🏆</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Thống kê</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af' }}>Coming Soon</div>
                </div>
            </div>

            {isWithdrawSuccess && (
                <div style={{
                    marginTop: '12px',
                    textAlign: 'center',
                    color: '#22c55e',
                    fontWeight: 600
                }}>
                    ✅ Rút tiền thành công!
                </div>
            )}
        </div>
    );
}
