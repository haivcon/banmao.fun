// ===== DONOR PROFILE SECTION COMPONENT =====
// Displays donor profile with txHash verification

import React, { useState } from 'react';
import { SlotsTranslations } from '../lib/i18n';
import { JackpotDonor, getDonorBadge } from './JackpotDonorsPanel';
import { SLOTS_AVATARS } from '../lib/slotsAvatars';

interface DonorProfileSectionProps {
    address: string;
    myDonorProfile: JackpotDonor | null;
    t: SlotsTranslations;
    onVerifySuccess?: () => void;
    onEditProfile?: (donor: JackpotDonor) => void;
    onDonate: (amount: string) => void;
    onDonatePool: (amount: string) => void;
    isDonating: boolean;
    lastDonation?: { hash: string; amount: string; type: 'jackpot' | 'pool' } | null;
}

/**
 * Donor Profile Section - displays current donor status and txHash verification
 */
export function DonorProfileSection({
    address,
    myDonorProfile,
    t,
    onVerifySuccess,
    onEditProfile,
    onDonate,
    onDonatePool,
    isDonating,
    lastDonation
}: DonorProfileSectionProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [donateAmount, setDonateAmount] = useState('');
    const [donationType, setDonationType] = useState<'jackpot' | 'pool'>('jackpot');
    const [txHash, setTxHash] = useState('');

    // Auto-fill txHash when donation completes
    React.useEffect(() => {
        if (lastDonation?.hash) {
            setTxHash(lastDonation.hash);
        }
    }, [lastDonation]);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleVerify = async () => {
        if (!txHash || isVerifying || !address) return;

        setIsVerifying(true);
        setVerifyResult(null);

        try {
            const res = await fetch('/api/slots/donors/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ txHash, walletAddress: address })
            });
            const data = await res.json();
            setVerifyResult({ success: data.success, message: data.message || data.error });

            if (data.success) {
                setTxHash('');
                onVerifySuccess?.();
            }
        } catch (err) {
            setVerifyResult({ success: false, message: t.noDonorsYet || t.networkError });
        }
        setIsVerifying(false);
    };

    const badge = myDonorProfile ? getDonorBadge(myDonorProfile.totalDonated) : null;

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(168,85,247,0.1), rgba(0,0,0,0.2))',
            clipPath: 'polygon(0 14px, 14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px))',
            border: '1px solid rgba(168,85,247,0.3)',
            overflow: 'hidden'
        }}>
            {/* Toggle Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', border: 'none', cursor: 'pointer',
                    background: 'rgba(168,85,247,0.15)',
                    color: '#c084fc', fontSize: 13, fontWeight: 600
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>👤</span>
                    {t.donateToJackpot ? 'Donor Profile' : 'Hồ sơ Nhà tài trợ'}
                </span>
                <span style={{ fontSize: 10, color: '#a855f7' }}>
                    {isExpanded ? '▲' : '▼'}
                </span>
            </button>

            {/* Collapsible Content */}
            {isExpanded && (
                <div style={{ padding: 14 }}>
                    {/* Current Donor Profile */}
                    {myDonorProfile && badge ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(0,0,0,0.3)',
                                clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))',
                                boxShadow: `0 0 12px ${badge.color}40`
                            }}>
                                {badge.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: badge.color }}>
                                    {myDonorProfile.name || badge.tier}
                                </div>
                                <div style={{ fontSize: 10, color: '#e2e8f0' }}>
                                    {(Number(myDonorProfile.totalDonated) / 1e18).toLocaleString()} $BANMAO
                                </div>
                                <div style={{ fontSize: 9, color: '#94a3b8' }}>
                                    {myDonorProfile.donationCount} {t.donationCount}
                                </div>
                            </div>
                            {onEditProfile && (
                                <button
                                    onClick={() => onEditProfile(myDonorProfile)}
                                    style={{
                                        padding: '6px 10px',
                                        clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))',
                                        border: 'none',
                                        background: 'rgba(168,85,247,0.3)', cursor: 'pointer',
                                        color: '#c084fc', fontSize: 12
                                    }}
                                    title="Chỉnh sửa hồ sơ"
                                >✏️</button>
                            )}
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
                            {t.beFirstDonor || 'Bạn chưa là nhà tài trợ. Donate để nhận badge!'}
                        </div>
                    )}

                    {/* Donate CTA */}
                    {/* Integrated Donation Form */}
                    <div style={{ marginBottom: 16 }}>
                        {/* Type Toggle */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <button
                                onClick={() => setDonationType('jackpot')}
                                style={{
                                    flex: 1, padding: '6px',
                                    clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))',
                                    background: donationType === 'jackpot' ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(0,0,0,0.3)',
                                    border: donationType === 'jackpot' ? 'none' : '1px solid rgba(168,85,247,0.3)',
                                    color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {t.donateJackpotBtn}
                            </button>
                            <button
                                onClick={() => setDonationType('pool')}
                                style={{
                                    flex: 1, padding: '6px',
                                    clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))',
                                    background: donationType === 'pool' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(0,0,0,0.3)',
                                    border: donationType === 'pool' ? 'none' : '1px solid rgba(59,130,246,0.3)',
                                    color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {t.donatePoolBtn}
                            </button>
                        </div>

                        {donationType === 'pool' && (
                            <div style={{ fontSize: 10, color: '#93c5fd', marginBottom: 8, textAlign: 'center' }}>
                                {t.donatePoolDesc}
                            </div>
                        )}

                        <div style={{
                            display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8,
                            padding: 8,
                            background: donationType === 'jackpot' ? 'rgba(168,85,247,0.1)' : 'rgba(59,130,246,0.1)',
                            clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))'
                        }}>
                            <input
                                type="number"
                                placeholder={t.amountPlaceholder}
                                value={donateAmount}
                                onChange={(e) => setDonateAmount(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: 13,
                                    outline: 'none',
                                    padding: '0 4px'
                                }}
                            />
                            <div style={{ fontSize: 11, color: donationType === 'jackpot' ? '#a855f7' : '#60a5fa', fontWeight: 700 }}>$BANMAO</div>
                        </div>

                        <button
                            onClick={() => {
                                if (donateAmount) {
                                    if (donationType === 'jackpot') {
                                        onDonate(donateAmount);
                                    } else {
                                        onDonatePool(donateAmount);
                                    }
                                    setDonateAmount(''); // Clear after send
                                }
                            }}
                            disabled={isDonating || !donateAmount}
                            style={{
                                width: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '10px 14px',
                                clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))',
                                background: isDonating
                                    ? 'rgba(71, 85, 105, 0.5)'
                                    : donationType === 'jackpot'
                                        ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                                        : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                color: isDonating ? '#94a3b8' : '#fff',
                                fontSize: 13, fontWeight: 700,
                                border: 'none', cursor: isDonating ? 'wait' : 'pointer',
                                boxShadow: isDonating
                                    ? 'none'
                                    : donationType === 'jackpot'
                                        ? '0 4px 15px rgba(168,85,247,0.4)'
                                        : '0 4px 15px rgba(59,130,246,0.4)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {isDonating ? t.processing : (donationType === 'jackpot' ? `💜 ${t.donateToJackpot}` : `💧 ${t.donatePoolTitle}`)}
                        </button>
                    </div>

                    {/* TxHash Verification */}
                    <div style={{
                        padding: 12,
                        clipPath: 'polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))',
                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(168,85,247,0.2)'
                    }}>
                        <div style={{ fontSize: 10, color: '#a855f7', fontWeight: 600, marginBottom: 8 }}>
                            {t.verifyDonationTitle}
                        </div>
                        <input
                            type="text"
                            placeholder={t.txPlaceholder}
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            style={{
                                width: '100%', padding: '8px 10px', clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))',
                                border: '1px solid rgba(168,85,247,0.3)',
                                background: 'rgba(0,0,0,0.4)', color: '#e2e8f0', fontSize: 11,
                                marginBottom: 8, outline: 'none', boxSizing: 'border-box'
                            }}
                        />
                        <button
                            onClick={handleVerify}
                            disabled={isVerifying || !txHash}
                            style={{
                                width: '100%', padding: '8px', clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))', border: 'none',
                                background: isVerifying ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.6)',
                                color: '#fff', fontSize: 11, fontWeight: 600,
                                cursor: isVerifying ? 'wait' : 'pointer'
                            }}
                        >
                            {isVerifying ? t.verifying : t.verifyBtn}
                        </button>
                        {verifyResult && (
                            <div style={{
                                marginTop: 8, padding: '6px 10px',
                                clipPath: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))',
                                fontSize: 10,
                                background: verifyResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                                color: verifyResult.success ? '#4ade80' : '#f87171',
                                border: `1px solid ${verifyResult.success ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`
                            }}>
                                {verifyResult.success ? '✓ ' : '✗ '}{verifyResult.message}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DonorProfileSection;
