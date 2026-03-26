/**
 * MatchManagementPanel - Admin match creation and force cancel
 */
"use client";

import React, { useState, useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { BANMAOPK_ADDRESS } from "../../lib/constants";
import { BANMAOPK_ABI } from "../../lib/abis";

export default function MatchManagementPanel() {
    // Form states
    const [player1, setPlayer1] = useState("");
    const [player2, setPlayer2] = useState("");
    const [durationHours, setDurationHours] = useState("24");
    const [matchIdToCancel, setMatchIdToCancel] = useState("");

    // Read current match count
    const { data: currentMatchId, refetch: refetchMatchId } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "currentMatchId",
    });

    // Write contracts
    const { writeContract: createMatch, data: createHash, isPending: isCreating } = useWriteContract();
    const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createHash });

    const { writeContract: forceCancel, data: cancelHash, isPending: isCancelling } = useWriteContract();
    const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ hash: cancelHash });

    useEffect(() => {
        if (isCreateSuccess) {
            refetchMatchId();
            setPlayer1("");
            setPlayer2("");
        }
    }, [isCreateSuccess, refetchMatchId]);

    useEffect(() => {
        if (isCancelSuccess) {
            setMatchIdToCancel("");
        }
    }, [isCancelSuccess]);

    const handleCreateMatch = () => {
        if (!player1 || !player2 || !durationHours) return;
        const durationSeconds = BigInt(Number(durationHours) * 3600);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (createMatch as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "createMatch",
            args: [player1, player2, durationSeconds],
        });
    };

    const handleForceCancel = () => {
        if (!matchIdToCancel) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (forceCancel as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "forceCancelStaleMatch",
            args: [BigInt(matchIdToCancel)],
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

    const sectionStyle = {
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        padding: '14px',
        marginBottom: '12px'
    };

    return (
        <div style={{ color: '#fff' }}>
            {/* Stats */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '20px',
                marginBottom: '16px',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#fbbf24' }}>
                        {currentMatchId?.toString() || '0'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>Total Matches</div>
                </div>
            </div>

            {/* Create Match Section */}
            <div style={sectionStyle}>
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>
                    🎯 Create Match (Admin Bypass)
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                        Player 1 Address
                    </label>
                    <input
                        type="text"
                        placeholder="0x..."
                        value={player1}
                        onChange={(e) => setPlayer1(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                        Player 2 Address
                    </label>
                    <input
                        type="text"
                        placeholder="0x..."
                        value={player2}
                        onChange={(e) => setPlayer2(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                        Duration (hours)
                    </label>
                    <input
                        type="number"
                        placeholder="24"
                        value={durationHours}
                        onChange={(e) => setDurationHours(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <button
                    onClick={handleCreateMatch}
                    disabled={isCreating || isCreateConfirming || !player1 || !player2}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer'
                    }}
                >
                    {isCreating || isCreateConfirming ? 'Creating...' : '⚔️ Create Match'}
                </button>
                {isCreateSuccess && (
                    <div style={{ textAlign: 'center', color: '#22c55e', fontSize: '12px', marginTop: '8px' }}>
                        ✅ Match created!
                    </div>
                )}
            </div>

            {/* Force Cancel Section */}
            <div style={{
                ...sectionStyle,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)'
            }}>
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px', color: '#fca5a5' }}>
                    ⚠️ Force Cancel Stale Match
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '12px' }}>
                    Only works for matches older than 3 days. This will refund all participants.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="number"
                        placeholder="Match ID"
                        value={matchIdToCancel}
                        onChange={(e) => setMatchIdToCancel(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                        onClick={handleForceCancel}
                        disabled={isCancelling || isCancelConfirming || !matchIdToCancel}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        {isCancelling || isCancelConfirming ? '...' : 'Cancel'}
                    </button>
                </div>
                {isCancelSuccess && (
                    <div style={{ textAlign: 'center', color: '#fbbf24', fontSize: '12px', marginTop: '8px' }}>
                        ✅ Match cancelled and refunded!
                    </div>
                )}
            </div>
        </div>
    );
}
