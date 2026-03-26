'use client';

import React, { useState, useEffect } from 'react';
import { useMinerContract, formatTokenAmount } from '../hooks/useContract';

interface ClaimModalProps {
    isOpen: boolean;
    onClose: () => void;
    totalScore: number;
    translations: {
        claimTitle: string;
        totalEarned: string;
        claimNow: string;
        claiming: string;
        claimSuccess: string;
        claimFailed: string;
        minClaimRequired: string;
        connectWallet: string;
        back: string;
    };
}

const MIN_POINTS_TO_CLAIM = 1000;
const POINTS_TO_TOKEN_RATIO = 10; // 10 points = 1 token

export default function ClaimModal({ isOpen, onClose, totalScore, translations: t }: ClaimModalProps) {
    const {
        isConnected,
        isPending,
        isSuccess,
        error,
        nonce,
        claimReward,
        refetchNonce,
    } = useMinerContract();

    const [status, setStatus] = useState<'idle' | 'claiming' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState<string>('');

    const tokenAmount = Math.floor(totalScore / POINTS_TO_TOKEN_RATIO);
    const canClaim = totalScore >= MIN_POINTS_TO_CLAIM && isConnected;

    // Reset status when modal opens
    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            setErrorMsg('');
        }
    }, [isOpen]);

    // Handle success
    useEffect(() => {
        if (isSuccess && status === 'claiming') {
            setStatus('success');
        }
    }, [isSuccess, status]);

    // Handle error
    useEffect(() => {
        if (error && status === 'claiming') {
            setStatus('error');
            setErrorMsg(error);
        }
    }, [error, status]);

    const handleClaim = async () => {
        if (!canClaim || nonce === undefined) return;

        setStatus('claiming');
        setErrorMsg('');

        try {
            // Call backend API to get signature + deadline
            const response = await fetch('/api/miner/sign-claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: BigInt(tokenAmount) * BigInt(10 ** 18),
                    nonce: nonce.toString(),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get signature');
            }

            const { signature, deadline } = await response.json();
            // Call V2 claimReward with deadline
            await claimReward(
                BigInt(tokenAmount) * BigInt(10 ** 18),
                nonce,
                BigInt(deadline),
                signature
            );
        } catch (e) {
            setStatus('error');
            setErrorMsg(e instanceof Error ? e.message : 'Claim failed');
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%)',
                borderRadius: 16,
                padding: 24,
                minWidth: 320,
                maxWidth: 400,
                border: '2px solid rgba(255, 215, 0, 0.5)',
                boxShadow: '0 0 40px rgba(255, 215, 0, 0.3)',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                }}>
                    <h2 style={{ color: '#ffd700', margin: 0, fontSize: 24 }}>
                        💰 {t.claimTitle}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            fontSize: 24,
                            cursor: 'pointer',
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* Stats */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                }}>
                    <div style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>
                        {t.totalEarned}
                    </div>
                    <div style={{
                        color: '#ffd700',
                        fontSize: 32,
                        fontWeight: 'bold',
                        fontFamily: "'Space Mono', monospace",
                    }}>
                        {totalScore.toLocaleString()} pts
                    </div>
                    <div style={{ color: '#4ade80', fontSize: 14, marginTop: 8 }}>
                        = {tokenAmount.toLocaleString()} $BANMAO
                    </div>
                </div>

                {/* Status messages */}
                {status === 'success' && (
                    <div style={{
                        background: 'rgba(74, 222, 128, 0.2)',
                        border: '1px solid #4ade80',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 16,
                        color: '#4ade80',
                    }}>
                        ✅ {t.claimSuccess}
                    </div>
                )}

                {status === 'error' && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid #ef4444',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 16,
                        color: '#ef4444',
                    }}>
                        ❌ {errorMsg || t.claimFailed}
                    </div>
                )}

                {!canClaim && totalScore < MIN_POINTS_TO_CLAIM && (
                    <div style={{
                        background: 'rgba(255, 215, 0, 0.1)',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 16,
                        color: '#ffd700',
                        fontSize: 14,
                    }}>
                        ⚠️ {t.minClaimRequired} ({MIN_POINTS_TO_CLAIM - totalScore} more)
                    </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '14px 20px',
                            borderRadius: 12,
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: 'transparent',
                            color: '#fff',
                            fontSize: 16,
                            cursor: 'pointer',
                        }}
                    >
                        {t.back}
                    </button>

                    {isConnected ? (
                        <button
                            onClick={handleClaim}
                            disabled={!canClaim || isPending || status === 'claiming'}
                            style={{
                                flex: 2,
                                padding: '14px 20px',
                                borderRadius: 12,
                                border: 'none',
                                background: canClaim
                                    ? 'linear-gradient(135deg, #ffd700, #ffb700)'
                                    : 'rgba(255, 215, 0, 0.3)',
                                color: canClaim ? '#000' : '#666',
                                fontSize: 16,
                                fontWeight: 'bold',
                                cursor: canClaim ? 'pointer' : 'not-allowed',
                                opacity: (isPending || status === 'claiming') ? 0.7 : 1,
                            }}
                        >
                            {status === 'claiming' || isPending ? t.claiming : t.claimNow}
                        </button>
                    ) : (
                        <button
                            style={{
                                flex: 2,
                                padding: '14px 20px',
                                borderRadius: 12,
                                border: 'none',
                                background: 'linear-gradient(135deg, #00f5ff, #0088ff)',
                                color: '#000',
                                fontSize: 16,
                                fontWeight: 'bold',
                                cursor: 'pointer',
                            }}
                        >
                            {t.connectWallet}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
