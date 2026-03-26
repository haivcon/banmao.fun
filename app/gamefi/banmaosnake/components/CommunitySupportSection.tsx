// ===== COMMUNITY SUPPORT SECTION COMPONENT =====
// In-game donate UI with approve → donate flow, pool stats, and donor leaderboard

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { SNAKE_ABI, ERC20_ABI } from '../lib/abis';
import { SNAKE_CONTRACT_ADDRESS, BANMAO_TOKEN_ADDRESS } from '../lib/constants';
import { sounds } from '../lib/sounds';
import { SnakeStrings } from '../lib/i18n';

interface CommunitySupportSectionProps {
    t: SnakeStrings;
    donateAddress: string;
    onCopyAddress: (address: string, message: string) => void;
    onShowInfo: () => void;
    onDonateSuccess?: () => void;
}

// Format number with commas
function formatInputNumber(value: string): string {
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

function parseInputNumber(value: string): string {
    return value.replace(/,/g, '');
}

function shortenAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatCompact(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toFixed(0);
}

/**
 * Community Support Section - in-game donate UI with approve → donate flow
 */
export function CommunitySupportSection({
    t,
    donateAddress,
    onCopyAddress,
    onShowInfo,
    onDonateSuccess
}: CommunitySupportSectionProps) {
    const { address, isConnected } = useAccount();
    const [donateAmount, setDonateAmount] = useState('');
    const [showDonors, setShowDonors] = useState(false);

    const XLAYER_CHAIN_ID = 196;

    // ========== CONTRACT READS ==========

    // Pool balance (tokens available for rewards)
    const { data: poolBalance, refetch: refetchPoolBalance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS,
        abi: [{
            inputs: [{ name: "account", type: "address" }],
            name: "balanceOf",
            outputs: [{ type: "uint256" }],
            stateMutability: "view",
            type: "function",
        }] as const,
        functionName: 'balanceOf',
        args: [SNAKE_CONTRACT_ADDRESS],
        chainId: XLAYER_CHAIN_ID,
    } as any);

    // Total donated
    const { data: totalDonated, refetch: refetchTotalDonated } = useReadContract({
        address: SNAKE_CONTRACT_ADDRESS,
        abi: SNAKE_ABI,
        functionName: 'totalDonatedAmount',
        chainId: XLAYER_CHAIN_ID,
    } as any);

    // Total donors count
    const { data: totalDonors, refetch: refetchTotalDonors } = useReadContract({
        address: SNAKE_CONTRACT_ADDRESS,
        abi: SNAKE_ABI,
        functionName: 'getTotalDonors',
        chainId: XLAYER_CHAIN_ID,
    } as any);

    // Get donors page (top 20)
    const { data: donorsData, refetch: refetchDonors } = useReadContract({
        address: SNAKE_CONTRACT_ADDRESS,
        abi: SNAKE_ABI,
        functionName: 'getDonorsPage',
        args: [BigInt(0), BigInt(20)],
        chainId: XLAYER_CHAIN_ID,
    } as any);

    // Check allowance for donate
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, SNAKE_CONTRACT_ADDRESS] : undefined,
        chainId: XLAYER_CHAIN_ID,
    } as any);

    // User balance
    const { data: userBalance, refetch: refetchUserBalance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        chainId: XLAYER_CHAIN_ID,
    } as any);

    // ========== CONTRACT WRITES ==========

    const { writeContract: writeDonate, data: donateTx, isPending: isDonating } = useWriteContract();
    const { writeContract: writeApprove, data: approveTx, isPending: isApproving } = useWriteContract();

    const { isLoading: isWaitingDonate, isSuccess: isDonateSuccess } = useWaitForTransactionReceipt({ hash: donateTx });
    const { isLoading: isWaitingApprove, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveTx });

    // ========== SORTED DONORS ==========

    const sortedDonors = useMemo(() => {
        const donorList: Array<{ address: string; amount: bigint }> = [];
        if (donorsData) {
            const data = donorsData as { addrs?: string[]; amounts?: bigint[] } | [string[], bigint[]];
            let addrs: string[], amounts: bigint[];
            if (Array.isArray(data)) {
                [addrs, amounts] = data;
            } else {
                addrs = data.addrs || [];
                amounts = data.amounts || [];
            }
            for (let i = 0; i < addrs.length; i++) {
                if (amounts[i] > BigInt(0)) {
                    donorList.push({ address: addrs[i], amount: amounts[i] });
                }
            }
        }
        return donorList.sort((a, b) => Number(b.amount - a.amount));
    }, [donorsData]);

    // ========== HANDLERS ==========

    const handleDonate = async () => {
        if (!donateAmount || !address) return;
        sounds.click();

        const plainAmount = parseInputNumber(donateAmount);
        const amountWei = parseEther(plainAmount);
        const currentAllowance = (allowance as bigint) || BigInt(0);

        if (currentAllowance < amountWei) {
            // Need to approve first
            writeApprove({
                address: BANMAO_TOKEN_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [SNAKE_CONTRACT_ADDRESS, amountWei],
            } as any);
        } else {
            // Already approved, donate directly
            writeDonate({
                address: SNAKE_CONTRACT_ADDRESS,
                abi: SNAKE_ABI,
                functionName: 'donate',
                args: [amountWei],
            } as any);
        }
    };

    // After approve success → auto-donate
    useEffect(() => {
        if (isApproveSuccess && donateAmount) {
            refetchAllowance();
            const plainAmount = parseInputNumber(donateAmount);
            const amountWei = parseEther(plainAmount);
            writeDonate({
                address: SNAKE_CONTRACT_ADDRESS,
                abi: SNAKE_ABI,
                functionName: 'donate',
                args: [amountWei],
            } as any);
        }
    }, [isApproveSuccess]);

    // After donate success → verify tx, sync DB, refetch all data
    useEffect(() => {
        if (isDonateSuccess && donateTx) {
            setDonateAmount('');
            // Refetch on-chain data immediately
            refetchPoolBalance();
            refetchTotalDonated();
            refetchTotalDonors();
            refetchDonors();
            refetchAllowance();
            refetchUserBalance();

            // Auto-verify tx hash to sync donor DB, then refetch leaderboard
            (async () => {
                try {
                    await fetch('/api/donors/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ txHash: donateTx, walletAddress: address })
                    });
                } catch (e) {
                    console.error('Auto-verify failed:', e);
                }
                // Refetch donor leaderboard from DB (page.tsx fetchDonors)
                onDonateSuccess?.();
            })();
        }
    }, [isDonateSuccess]);

    const isProcessing = isDonating || isApproving || isWaitingDonate || isWaitingApprove;

    const getMedalEmoji = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    return (
        <div style={{ marginTop: 12, padding: 14, background: 'linear-gradient(145deg, rgba(251,191,36,0.12), rgba(251,191,36,0.04))', borderRadius: 14, border: '1px solid rgba(251,191,36,0.25)', boxShadow: '0 4px 20px rgba(251,191,36,0.1)' }}>
            {/* Title with Icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18, filter: 'drop-shadow(0 2px 4px rgba(251,191,36,0.5))' }}>🐳</span>
                <div style={{ fontSize: 12, fontWeight: 800, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.communityTitle}</div>
            </div>

            {/* Pool Stats */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10,
                background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '8px 6px',
                border: '1px solid rgba(251,191,36,0.15)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>💰 {t.donatePoolLabel || 'Pool'}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>
                        {poolBalance ? formatCompact(Number(formatEther(poolBalance as bigint))) : '0'}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>🎁 {t.donateDonatedLabel || 'Donated'}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>
                        {totalDonated ? formatCompact(Number(formatEther(totalDonated as bigint))) : '0'}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>👥 {t.donateDonorsLabel || 'Donors'}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa' }}>
                        {totalDonors ? Number(totalDonors).toString() : '0'}
                    </div>
                </div>
            </div>

            {/* Donate Input Section */}
            {isConnected && (
                <div style={{
                    marginBottom: 10, padding: 10, background: 'rgba(0,0,0,0.3)',
                    borderRadius: 10, border: '1px solid rgba(251,191,36,0.2)',
                }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', marginBottom: 6, textAlign: 'center' }}>
                        🎁 {t.donateToPool || 'Donate $BANMAO to Game Pool'}
                    </div>
                    {userBalance && (
                        <div style={{ fontSize: 9, color: '#64748b', textAlign: 'center', marginBottom: 6 }}>
                            {t.donateBalanceLabel || 'Balance'}: {formatCompact(Number(formatEther(userBalance as bigint)))} $BANMAO
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, overflow: 'hidden' }}>
                        <input
                            type="text"
                            placeholder={t.donateAmountPlaceholder || 'Amount'}
                            value={donateAmount}
                            onChange={(e) => setDonateAmount(formatInputNumber(e.target.value))}
                            disabled={isProcessing}
                            style={{
                                flex: 1, minWidth: 0, padding: '8px 12px',
                                background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(251,191,36,0.3)',
                                borderRadius: 8, color: '#fff', fontSize: 12,
                                outline: 'none',
                            }}
                        />
                        <button
                            onClick={handleDonate}
                            disabled={isProcessing || !donateAmount}
                            onMouseEnter={() => sounds.hover()}
                            style={{
                                padding: '8px 16px', borderRadius: 8,
                                border: 'none', cursor: isProcessing || !donateAmount ? 'not-allowed' : 'pointer',
                                background: isProcessing
                                    ? 'rgba(251,191,36,0.2)'
                                    : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                color: isProcessing ? '#94a3b8' : '#1a1a2e',
                                fontSize: 11, fontWeight: 800,
                                opacity: isProcessing || !donateAmount ? 0.5 : 1,
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap' as const,
                                flexShrink: 0,
                            }}
                            className="hover-btn"
                        >
                            {isWaitingApprove ? '⏳...' :
                                isApproving ? '📝...' :
                                    isWaitingDonate ? '⏳...' :
                                        isDonating ? '📝...' :
                                            isDonateSuccess ? '✅' : '🎁 Donate'}
                        </button>
                    </div>
                    {isDonateSuccess && (
                        <div style={{
                            marginTop: 6, padding: '6px 8px', borderRadius: 8,
                            background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
                            fontSize: 10, color: '#4ade80', textAlign: 'center',
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            {t.donateThankYou || '✅ Thank you for your donation! 🎉'}
                        </div>
                    )}
                </div>
            )}

            {!isConnected && (
                <div style={{
                    marginBottom: 10, padding: 10, background: 'rgba(0,0,0,0.3)',
                    borderRadius: 10, border: '1px dashed rgba(251,191,36,0.2)',
                    textAlign: 'center', fontSize: 10, color: '#94a3b8'
                }}>
                    {t.donateConnectWallet || '🔗 Connect wallet to donate directly'}
                </div>
            )}

            {/* Incentive Message */}
            <div
                className="whale-incentive-hover"
                style={{
                    padding: 8, marginBottom: 8,
                    background: 'rgba(0,0,0,0.25)', borderRadius: 8,
                    border: '1px solid rgba(251,191,36,0.15)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    cursor: 'pointer', transition: 'transform 0.3s ease'
                }}
            >
                <p style={{ fontSize: 10, color: '#e2e8f0', margin: 0, textAlign: 'center', lineHeight: 1.4, fontWeight: 500 }}>
                    {t.communityWhaleIncentive || '💎 $BANMAO Holders: Help grow our GameFi ecosystem!'}
                </p>
            </div>

            {/* Benefits - Compact & Centered */}
            <div
                className="whale-incentive-hover"
                style={{
                    display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8,
                    alignItems: 'center',
                    cursor: 'pointer', transition: 'transform 0.3s ease'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#4ade80' }}>
                    <span>✓</span> {t.communityBenefit1 || 'Pool grows = More players'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#4ade80' }}>
                    <span>✓</span> {t.communityBenefit2 || 'Community = Token value'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#4ade80' }}>
                    <span>✓</span> {t.communityBenefit3 || '100% transparent'}
                </div>
            </div>

            {/* Donor Leaderboard Toggle */}
            {sortedDonors.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                    <button
                        onClick={() => { setShowDonors(!showDonors); sounds.click(); }}
                        onMouseEnter={() => sounds.hover()}
                        style={{
                            width: '100%', padding: '6px 10px',
                            background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(251,191,36,0.2)',
                            borderRadius: 8, color: '#fbbf24', fontSize: 10, fontWeight: 600,
                            cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                        }}
                        className="hover-btn"
                    >
                        {showDonors ? `▾ ${t.donateHideDonors || 'Hide Donor Leaderboard'}` : `▸ ${t.donateTopDonors || 'Top Donors'} (${sortedDonors.length})`}
                    </button>
                    {showDonors && (
                        <div style={{
                            marginTop: 6, maxHeight: 200, overflowY: 'auto',
                            scrollbarWidth: 'none',
                        }}>
                            {sortedDonors.map((donor, idx) => {
                                const isMe = address && donor.address.toLowerCase() === address.toLowerCase();
                                return (
                                    <div key={donor.address} style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '5px 8px', borderRadius: 6,
                                        background: isMe ? 'rgba(251,191,36,0.15)' : 'transparent',
                                        border: isMe ? '1px solid rgba(251,191,36,0.25)' : '1px solid transparent',
                                        marginBottom: 2,
                                    }}>
                                        <span style={{ fontSize: 10, color: '#fbbf24', minWidth: 28, textAlign: 'center', fontWeight: 700 }}>
                                            {getMedalEmoji(idx + 1)}
                                        </span>
                                        <span style={{
                                            flex: 1, fontSize: 10, fontFamily: 'monospace',
                                            color: isMe ? '#fbbf24' : '#94a3b8',
                                        }}>
                                            {shortenAddress(donor.address)}
                                            {isMe && <span style={{ color: '#4ade80', marginLeft: 4 }}>⭐</span>}
                                        </span>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: '#4ade80' }}>
                                            {formatCompact(Number(formatEther(donor.amount)))}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Pool Address Section - Fallback manual transfer */}
            <div style={{ marginBottom: 8, padding: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px dashed rgba(34,211,238,0.4)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', marginBottom: 6, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span>💰</span> {t.donateOrSendDirectly || t.communityPoolInstructions || 'Or send $BANMAO directly:'}
                </div>
                <a
                    href={`https://www.okx.com/web3/explorer/xlayer/address/${donateAddress}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                        display: 'block', padding: '6px 8px', marginBottom: 6,
                        background: 'linear-gradient(145deg, rgba(34,211,238,0.15), rgba(34,211,238,0.05))',
                        borderRadius: 8, border: '1px solid rgba(34,211,238,0.3)',
                        textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    className="hover-btn"
                >
                    <div style={{ fontSize: 9, color: '#22d3ee', fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center' }}>
                        {donateAddress}
                    </div>
                    <div style={{ fontSize: 8, color: '#64748b', textAlign: 'center', marginTop: 2 }}>
                        {t.communityClickToView || '🔗 View on Explorer'}
                    </div>
                </a>
                <button
                    onClick={() => onCopyAddress(donateAddress, t.communityAddressCopied || '✅ Pool address copied!')}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%', padding: '6px 8px',
                        borderRadius: 8, border: '1px solid rgba(251,191,36,0.4)',
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.1))',
                        color: '#fbbf24', fontSize: 10, fontWeight: 700, cursor: 'pointer'
                    }}
                    className="hover-btn"
                >
                    📋 {t.communityCopyPool || 'Copy Pool Address'}
                </button>
            </div>

            {/* Security Info Button */}
            <button
                onClick={() => { sounds.click(); onShowInfo(); }}
                onMouseEnter={() => sounds.hover()}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%', padding: '6px 10px',
                    borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)',
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))',
                    color: '#a855f7', fontSize: 10, fontWeight: 600, cursor: 'pointer'
                }}
                className="hover-btn"
            >
                <span>🔐</span> {t.communitySecurityTitle}
            </button>
        </div>
    );
}

export default CommunitySupportSection;
