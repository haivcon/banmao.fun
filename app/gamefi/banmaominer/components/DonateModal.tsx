'use client';

import React, { useState, useEffect } from 'react';
import { useMinerContract, formatTokenAmount } from '../hooks/useContract';
import { parseEther } from 'viem';

interface DonateModalProps {
    isOpen: boolean;
    onClose: () => void;
    translations: {
        donate: string;
        donateTitle: string;
        donateDesc: string;
        topDonors: string;
        loading: string;
        back: string;
        connectWallet: string;
    };
}

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

export default function DonateModal({ isOpen, onClose, translations: t }: DonateModalProps) {
    const {
        isConnected,
        isPending,
        isSuccess,
        error,
        tokenBalance,
        allowance,
        topDonors,
        userDonated,
        approve,
        donate,
        refetchAllowance,
        refetchTopDonors,
    } = useMinerContract();

    const [amount, setAmount] = useState<string>('100');
    const [status, setStatus] = useState<'idle' | 'approving' | 'donating' | 'success' | 'error'>('idle');

    const amountBigInt = parseEther(amount || '0');
    const needsApproval = (allowance || BigInt(0)) < amountBigInt;
    const hasBalance = (tokenBalance || BigInt(0)) >= amountBigInt;

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStatus('idle');
            refetchTopDonors();
        }
    }, [isOpen, refetchTopDonors]);

    // Handle success
    useEffect(() => {
        if (isSuccess) {
            if (status === 'approving') {
                refetchAllowance();
                setStatus('idle');
            } else if (status === 'donating') {
                setStatus('success');
                refetchTopDonors();
            }
        }
    }, [isSuccess, status, refetchAllowance, refetchTopDonors]);

    // Handle error
    useEffect(() => {
        if (error) {
            setStatus('error');
        }
    }, [error]);

    const handleApprove = async () => {
        setStatus('approving');
        await approve(amountBigInt);
    };

    const handleDonate = async () => {
        if (needsApproval) {
            handleApprove();
        } else {
            setStatus('donating');
            await donate(amountBigInt);
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
                minWidth: 360,
                maxWidth: 440,
                border: '2px solid rgba(168, 85, 247, 0.5)',
                boxShadow: '0 0 40px rgba(168, 85, 247, 0.3)',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                }}>
                    <h2 style={{ color: '#a855f7', margin: 0, fontSize: 24 }}>
                        💜 {t.donateTitle}
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

                <p style={{ color: '#888', marginBottom: 20, fontSize: 14 }}>
                    {t.donateDesc}
                </p>

                {/* Amount input */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{
                        display: 'flex',
                        gap: 8,
                        marginBottom: 12,
                    }}>
                        {PRESET_AMOUNTS.map(preset => (
                            <button
                                key={preset}
                                onClick={() => setAmount(preset.toString())}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    border: amount === preset.toString()
                                        ? '2px solid #a855f7'
                                        : '1px solid rgba(255, 255, 255, 0.2)',
                                    background: amount === preset.toString()
                                        ? 'rgba(168, 85, 247, 0.2)'
                                        : 'transparent',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                }}
                            >
                                {preset}
                            </button>
                        ))}
                    </div>

                    <div style={{ position: 'relative' }}>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: 12,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: 'rgba(0, 0, 0, 0.3)',
                                color: '#fff',
                                fontSize: 18,
                                fontFamily: "'Space Mono', monospace",
                            }}
                            placeholder="Amount"
                        />
                        <span style={{
                            position: 'absolute',
                            right: 16,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#888',
                        }}>
                            $BANMAO
                        </span>
                    </div>

                    {tokenBalance && (
                        <div style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
                            Balance: {formatTokenAmount(tokenBalance)} $BANMAO
                        </div>
                    )}
                </div>

                {/* Status */}
                {status === 'success' && (
                    <div style={{
                        background: 'rgba(74, 222, 128, 0.2)',
                        border: '1px solid #4ade80',
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 16,
                        color: '#4ade80',
                    }}>
                        ✅ Thank you for your donation!
                    </div>
                )}

                {/* Top donors */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                    maxHeight: 200,
                    overflowY: 'auto',
                }}>
                    <div style={{ color: '#a855f7', fontSize: 14, marginBottom: 12 }}>
                        🏆 {t.topDonors}
                    </div>
                    {topDonors.length > 0 ? (
                        topDonors.slice(0, 5).map((donor, i) => (
                            <div key={donor.address} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '6px 0',
                                borderBottom: i < 4 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                            }}>
                                <span style={{ color: '#888' }}>
                                    {i + 1}. {donor.displayAddress}
                                </span>
                                <span style={{ color: '#ffd700' }}>
                                    {formatTokenAmount(donor.amount)}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div style={{ color: '#666', textAlign: 'center' }}>
                            No donors yet. Be the first!
                        </div>
                    )}
                </div>

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
                            onClick={handleDonate}
                            disabled={!hasBalance || isPending || Number(amount) <= 0}
                            style={{
                                flex: 2,
                                padding: '14px 20px',
                                borderRadius: 12,
                                border: 'none',
                                background: hasBalance && Number(amount) > 0
                                    ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                                    : 'rgba(168, 85, 247, 0.3)',
                                color: '#fff',
                                fontSize: 16,
                                fontWeight: 'bold',
                                cursor: hasBalance ? 'pointer' : 'not-allowed',
                                opacity: isPending ? 0.7 : 1,
                            }}
                        >
                            {isPending
                                ? (status === 'approving' ? 'Approving...' : 'Donating...')
                                : (needsApproval ? 'Approve & Donate' : `${t.donate} ${amount}`)}
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
