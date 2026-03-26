/**
 * RecoverTokenPanel - Recover stuck ERC20 tokens (not BANMAO)
 */
"use client";

import React, { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { BANMAOPK_ADDRESS, BANMAO_ADDRESS } from "../../lib/constants";
import { BANMAOPK_ABI } from "../../lib/abis";

export default function RecoverTokenPanel() {
    const [tokenAddress, setTokenAddress] = useState("");
    const [amount, setAmount] = useState("");

    const { writeContract: recover, data: recoverHash, isPending: isRecovering } = useWriteContract();
    const { isLoading: isRecoverConfirming, isSuccess: isRecoverSuccess, isError, error } = useWaitForTransactionReceipt({ hash: recoverHash });

    useEffect(() => {
        if (isRecoverSuccess) {
            setTokenAddress("");
            setAmount("");
        }
    }, [isRecoverSuccess]);

    const handleRecover = () => {
        if (!tokenAddress || !amount) return;

        // Check if trying to recover BANMAO (not allowed)
        if (tokenAddress.toLowerCase() === BANMAO_ADDRESS.toLowerCase()) {
            alert("Cannot recover BANMAO token - this is the staking token");
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (recover as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "recoverStuckToken",
            args: [tokenAddress, parseUnits(amount, 18)],
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

    return (
        <div style={{ color: '#fff' }}>
            {/* Warning */}
            <div style={{
                background: 'rgba(234,179,8,0.1)',
                border: '1px solid rgba(234,179,8,0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    <div style={{ fontSize: '11px', color: '#fbbf24' }}>
                        <strong>Important:</strong> This function can only recover tokens that are NOT BANMAO.
                        Use this to recover accidentally sent ERC20 tokens.
                    </div>
                </div>
            </div>

            {/* Form */}
            <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                    Token Contract Address
                </label>
                <input
                    type="text"
                    placeholder="0x..."
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    style={inputStyle}
                />
            </div>

            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                    Amount (18 decimals)
                </label>
                <input
                    type="number"
                    placeholder="Amount to recover"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={inputStyle}
                />
            </div>

            <button
                onClick={handleRecover}
                disabled={isRecovering || isRecoverConfirming || !tokenAddress || !amount}
                style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer'
                }}
            >
                {isRecovering || isRecoverConfirming ? 'Recovering...' : '🔧 Recover Tokens'}
            </button>

            {isRecoverSuccess && (
                <div style={{ textAlign: 'center', color: '#22c55e', fontSize: '12px', marginTop: '12px' }}>
                    ✅ Tokens recovered successfully!
                </div>
            )}

            {isError && (
                <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '11px', marginTop: '12px' }}>
                    ❌ Error: {error?.message || 'Transaction failed'}
                </div>
            )}
        </div>
    );
}
