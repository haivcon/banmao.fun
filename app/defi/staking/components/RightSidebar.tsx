'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { STAKING_CONTRACT_ADDRESS, STAKING_ABI, XLAYER_CHAIN_ID, BANMAO_TOKEN_ADDRESS, ERC20_ABI } from '../contracts';
import { useStakingTranslations } from '../i18n';
import { useSound } from '../hooks/useSound';
import { STAKING_AVATARS, getAvatarEmoji, AvatarIndex } from '../lib/avatars';
import { CopyableKeyword, ExplorerButton } from './CopyableKeyword';

interface RightSidebarProps {
    isConnected: boolean;
    formatNumber: (value: number | bigint | undefined) => string;
    address?: `0x${string}`;
    globalStats?: { rewardBucket?: bigint };
    onRefresh?: () => void;
}


interface DonationLog {
    txHash: string;
    amount: bigint;
    blockNumber: bigint;
}

function shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortenTxHash(hash: string): string {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

// Format number input with thousand separators
function formatInputNumber(value: string): string {
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

// Parse formatted number back to plain number
function parseInputNumber(value: string): string {
    return value.replace(/,/g, '');
}

export function RightSidebar({
    isConnected, formatNumber, address, globalStats, onRefresh
}: RightSidebarProps) {
    const { t } = useStakingTranslations();
    const { playClick, playHover } = useSound();
    const [donateAmount, setDonateAmount] = useState('');
    const [selectedDonator, setSelectedDonator] = useState<{ address: string; amount: bigint } | null>(null);
    const [copied, setCopied] = useState(false);
    const [donationHistory, setDonationHistory] = useState<DonationLog[]>([]);

    // Virtual scroll state for supporter list
    const [scrollTop, setScrollTop] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [visibleItems, setVisibleItems] = useState(15);
    const ITEM_HEIGHT = 32;
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingTooLong, setIsLoadingTooLong] = useState(false);

    // Responsive visible items
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setVisibleItems(25);
            } else {
                setVisibleItems(15);
            }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Profile editing state for supporters
    const [supporterProfile, setSupporterProfile] = useState<{
        name: string;
        avatar: number;
        telegram: string;
        twitter: string;
        editCount: number;
    } | null>(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileEditName, setProfileEditName] = useState('');
    const [profileEditAvatar, setProfileEditAvatar] = useState(0);
    const [profileEditTelegram, setProfileEditTelegram] = useState('');
    const [profileEditTwitter, setProfileEditTwitter] = useState('');

    const publicClient = usePublicClient();

    // Get donators page (unsorted - we sort in frontend)
    const { data: donatorsData, isLoading: isLoadingDonators, refetch: refetchDonators } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getDonatorsPage',
        args: [BigInt(0), BigInt(50)],
        chainId: XLAYER_CHAIN_ID,
        query: { refetchInterval: 15000 }, // Reduced from 5s to 15s
    });

    // Get total donators
    const { data: totalDonators, refetch: refetchTotalDonators } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getTotalDonators',
        chainId: XLAYER_CHAIN_ID,
        query: { refetchInterval: 15000 }, // Reduced from 5s to 15s
    });

    // Check allowance for donate
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, STAKING_CONTRACT_ADDRESS] : undefined,
        chainId: XLAYER_CHAIN_ID,
    });

    // Write contracts
    const { writeContract: writeDonate, data: donateTx, isPending: isDonating } = useWriteContract();
    const { writeContract: writeApprove, data: approveTx, isPending: isApproving } = useWriteContract();

    const { isLoading: isWaitingDonate, isSuccess: isDonateSuccess } = useWaitForTransactionReceipt({ hash: donateTx });
    const { isLoading: isWaitingApprove, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveTx });

    // Parse and sort donators data in frontend
    const sortedDonators = useMemo(() => {
        const donatorList: Array<{ address: string; amount: bigint }> = [];

        if (donatorsData) {
            const data = donatorsData as { donators: string[]; amounts: bigint[] } | [string[], bigint[]];

            let donators: string[], amounts: bigint[];
            if (Array.isArray(data)) {
                [donators, amounts] = data;
            } else {
                donators = data.donators;
                amounts = data.amounts;
            }

            for (let i = 0; i < donators.length; i++) {
                if (amounts[i] > BigInt(0)) {
                    donatorList.push({
                        address: donators[i],
                        amount: amounts[i],
                    });
                }
            }
        }

        return donatorList.sort((a, b) => Number(b.amount - a.amount));
    }, [donatorsData]);

    // Add ranks after sorting
    const rankedDonators = sortedDonators.map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
    }));

    // Find user rank
    const userRank = address
        ? rankedDonators.findIndex(d => d.address.toLowerCase() === address.toLowerCase()) + 1
        : 0;

    const getMedalEmoji = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    // Handle donate
    const handleDonate = async () => {
        if (!donateAmount || !address) return;

        const plainAmount = parseInputNumber(donateAmount);
        const amountWei = parseEther(plainAmount);
        const currentAllowance = (allowance as bigint) || BigInt(0);

        if (currentAllowance < amountWei) {
            writeApprove({
                address: BANMAO_TOKEN_ADDRESS,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [STAKING_CONTRACT_ADDRESS, amountWei],
            } as any);
        } else {
            writeDonate({
                address: STAKING_CONTRACT_ADDRESS,
                abi: STAKING_ABI,
                functionName: 'donate',
                args: [amountWei],
            } as any);
        }
    };

    // After approve success, do donate
    React.useEffect(() => {
        if (isApproveSuccess && donateAmount) {
            refetchAllowance();
            const plainAmount = parseInputNumber(donateAmount);
            const amountWei = parseEther(plainAmount);
            writeDonate({
                address: STAKING_CONTRACT_ADDRESS,
                abi: STAKING_ABI,
                functionName: 'donate',
                args: [amountWei],
            } as any);
        }
    }, [isApproveSuccess]);

    // Refetch after successful donation and save to database
    React.useEffect(() => {
        const saveDonationToDb = async () => {
            if (isDonateSuccess && donateTx && address && donateAmount) {
                try {
                    const plainAmount = parseInputNumber(donateAmount);
                    const amountWei = parseEther(plainAmount);

                    await fetch('/api/banmaostaking', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            address: address,
                            txHash: donateTx,
                            amount: amountWei.toString(),
                        }),
                    });
                } catch (err) {
                    console.error('Failed to save donation to DB:', err);
                }

                refetchDonators();
                setDonateAmount('');
                onRefresh?.();
            }
        };
        saveDonationToDb();
    }, [isDonateSuccess]);

    // Handle copy address
    const handleCopyAddress = (addr: string) => {
        navigator.clipboard.writeText(addr);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Fetch donation history from blockchain when a donator is selected
    useEffect(() => {
        const fetchDonationHistory = async () => {
            if (!selectedDonator) return;

            setIsLoadingHistory(true);
            setIsLoadingTooLong(false);

            // Set timeout to show explorer link after 5 seconds
            const timeoutId = setTimeout(() => {
                setIsLoadingTooLong(true);
            }, 5000);

            try {
                const response = await fetch(`/api/banmaostaking?address=${selectedDonator.address}`);
                const data = await response.json();

                if (data.success && data.donations) {
                    const history: DonationLog[] = data.donations.map((d: any) => ({
                        txHash: d.txHash,
                        amount: BigInt(d.amount),
                        blockNumber: BigInt(d.blockNumber || 0), // From blockchain
                    }));
                    setDonationHistory(history);
                } else {
                    setDonationHistory([]);
                }
            } catch (err) {
                console.error('Failed to fetch donation history:', err);
                setDonationHistory([]);
            } finally {
                clearTimeout(timeoutId);
                setIsLoadingHistory(false);
                setIsLoadingTooLong(false);
            }
        };

        fetchDonationHistory();
    }, [selectedDonator]);

    // Fetch supporter profile when modal opens
    useEffect(() => {
        const fetchProfile = async () => {
            if (!selectedDonator) {
                setSupporterProfile(null);
                setIsEditingProfile(false);
                return;
            }

            try {
                const response = await fetch(`/api/staking-profiles?address=${selectedDonator.address}`);
                const data = await response.json();

                if (data.success && data.profile) {
                    setSupporterProfile(data.profile);
                    setProfileEditName(data.profile.name);
                    setProfileEditAvatar(data.profile.avatar);
                    setProfileEditTelegram(data.profile.telegram || '');
                    setProfileEditTwitter(data.profile.twitter || '');
                } else if (data.default) {
                    setSupporterProfile({
                        name: data.default.name,
                        avatar: data.default.avatar,
                        telegram: '',
                        twitter: '',
                        editCount: 0
                    });
                    setProfileEditName(data.default.name);
                    setProfileEditAvatar(data.default.avatar);
                    setProfileEditTelegram('');
                    setProfileEditTwitter('');
                }
            } catch (err) {
                console.error('Failed to fetch supporter profile:', err);
            }
        };

        fetchProfile();
    }, [selectedDonator]);

    // Save profile function
    const handleSaveProfile = async () => {
        if (!selectedDonator || !address) return;

        setIsSavingProfile(true);
        try {
            const response = await fetch('/api/staking-profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: selectedDonator.address,
                    name: profileEditName,
                    avatar: profileEditAvatar,
                    telegram: profileEditTelegram,
                    twitter: profileEditTwitter
                })
            });
            const data = await response.json();

            if (data.success) {
                setSupporterProfile(data.profile);
                setIsEditingProfile(false);
            } else {
                alert(data.error || 'Failed to save profile');
            }
        } catch (err) {
            console.error('Failed to save profile:', err);
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Check if viewing own profile
    const isOwnProfile = selectedDonator && address &&
        selectedDonator.address.toLowerCase() === address.toLowerCase();

    const isProcessing = isDonating || isApproving || isWaitingDonate || isWaitingApprove;

    return (
        <div className="right-sidebar-container">
            <div
                className="sidebar-panel supporter-panel"
                onMouseEnter={playHover}
                onClick={playClick}
            >
                <div className="panel-header">
                    <div className="panel-title"><span className="heartbeat">💜</span> {t('supportPoolTitle')}</div>
                </div>

                {/* Pool Stats */}
                <div className="panel-content">
                    <div className="pool-stats">
                        <div className="stat">
                            <div className="stat-label">{t('rewardPool')}</div>
                            <div className="stat-value">
                                {globalStats?.rewardBucket
                                    ? formatNumber(globalStats.rewardBucket)
                                    : '0'
                                }
                            </div>
                        </div>
                        <div className="stat">
                            <div className="stat-label">{t('supporters')}</div>
                            <div className="stat-value">
                                {totalDonators ? Number(totalDonators) : 0}
                            </div>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="stats-row">
                        <span>{t('topSupporters')}</span>
                        {userRank > 0 && <span className="highlight">{t('yourRank')} #{userRank}</span>}
                    </div>

                    {/* Supporter Rankings - Show 15 with virtual scroll */}
                    <div
                        className="supporter-list-container"
                        ref={scrollContainerRef}
                        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
                        style={{
                            maxHeight: rankedDonators.length > visibleItems ? `${visibleItems * ITEM_HEIGHT}px` : 'auto',
                            overflowY: rankedDonators.length > visibleItems ? 'auto' : 'hidden',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        }}
                    >
                        {isLoadingDonators ? (
                            <div className="loading-state">{t('loading')}</div>
                        ) : rankedDonators.length === 0 ? (
                            <div className="empty-state">{t('noSupporters')}</div>
                        ) : (
                            <div style={{
                                height: rankedDonators.length > visibleItems ? `${rankedDonators.length * ITEM_HEIGHT}px` : 'auto',
                                position: 'relative'
                            }}>
                                {(() => {
                                    const startIndex = rankedDonators.length > visibleItems
                                        ? Math.floor(scrollTop / ITEM_HEIGHT)
                                        : 0;
                                    const endIndex = rankedDonators.length > visibleItems
                                        ? Math.min(startIndex + visibleItems + 2, rankedDonators.length)
                                        : rankedDonators.length;
                                    const visibleList = rankedDonators.slice(startIndex, endIndex);

                                    return visibleList.map((entry, idx) => {
                                        const isCurrentUser = address && entry.address.toLowerCase() === address.toLowerCase();
                                        const actualIndex = startIndex + idx;

                                        return (
                                            <div
                                                key={entry.address}
                                                className={`ranking-row clickable ${isCurrentUser ? 'current-user' : ''} ${entry.rank <= 3 ? 'top-3' : ''}`}
                                                onClick={() => setSelectedDonator(entry)}
                                                style={rankedDonators.length > visibleItems ? {
                                                    position: 'absolute',
                                                    top: `${actualIndex * ITEM_HEIGHT}px`,
                                                    left: 0,
                                                    right: 0,
                                                    height: `${ITEM_HEIGHT}px`,
                                                } : undefined}
                                            >
                                                <span className="rank">{getMedalEmoji(entry.rank)}</span>
                                                <span className="addr" title={entry.address}>
                                                    {shortenAddress(entry.address)}
                                                </span>
                                                <span className="value">{formatNumber(entry.amount)}</span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Explorer Guide - Enhanced with Copyable Keyword */}
                    <div style={{
                        margin: '8px 12px',
                        padding: '12px 14px',
                        background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(168, 85, 247, 0.08))',
                        border: '1px solid rgba(100, 150, 220, 0.2)',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                    }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                            🔎 {t('donateExplorerGuide')}
                        </div>

                        {/* Copyable Keyword */}
                        <div style={{
                            padding: '10px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '12px',
                        }}>
                            <div style={{
                                fontSize: '10px',
                                color: '#64748b',
                                marginBottom: '8px',
                            }}>
                                💡 {t('donateSearchTip')}
                            </div>
                            <CopyableKeyword keyword="donate" />
                        </div>

                        {/* Explorer Button */}
                        <ExplorerButton
                            href={`https://www.okx.com/web3/explorer/xlayer/address/${STAKING_CONTRACT_ADDRESS}?tab=Transactions`}
                            label={t('searchOnExplorer')}
                        />
                    </div>
                </div>

                {/* Donate Section */}
                {isConnected && (
                    <div className="donate-section">
                        <div className="donate-label">{t('addToPool')}</div>
                        <div className="donate-input-group">
                            <input
                                type="text"
                                className="donate-input"
                                placeholder={t('amountPlaceholder')}
                                value={donateAmount}
                                onChange={(e) => setDonateAmount(formatInputNumber(e.target.value))}
                                disabled={isProcessing}
                            />
                            <button
                                className="donate-btn"
                                onClick={handleDonate}
                                disabled={isProcessing || !donateAmount}
                            >
                                {isProcessing ? '...' : t('send')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Contract Note - Always Visible at Bottom */}
                <div className="contract-note-fixed" style={{
                    margin: '12px',
                    padding: '10px 12px',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    borderRadius: '12px',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    fontSize: '10px',
                    lineHeight: '1.5',
                    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.2)'
                }}>
                    <div style={{
                        color: '#f59e0b',
                        marginBottom: '6px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        ⚠️ {t('contractNote')}
                    </div>
                    <a
                        href="https://web3.okx.com/explorer/x-layer/address/0xa553f61f2a4fa61f6ddc8bf2b0b66f65c7eaa172/contract"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: '#a855f7',
                            fontSize: '9px',
                            wordBreak: 'break-all',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        🔗 {t('contractLink')}: 0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172
                    </a>
                </div>
            </div>

            {/* Donate Detail Modal - Rendered via Portal to escape stacking context */}
            {selectedDonator && typeof document !== 'undefined' && createPortal(
                <div className="donate-detail-modal" onClick={() => setSelectedDonator(null)}>
                    <div className="donate-detail-content" onClick={(e) => e.stopPropagation()}>
                        <div className="donate-detail-header">
                            <div className="donate-detail-title">{t('supportDetail')}</div>
                            <button className="donate-detail-close" onClick={() => setSelectedDonator(null)}>✕</button>
                        </div>

                        <div className="donate-detail-address">
                            <a
                                href={`https://www.okx.com/web3/explorer/xlayer/address/${selectedDonator.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ flex: 1, color: '#a855f7', textDecoration: 'none', wordBreak: 'break-all' }}
                                title={t('viewOnExplorer')}
                            >
                                {selectedDonator.address} 🔗
                            </a>
                            <button className="copy-btn" onClick={() => handleCopyAddress(selectedDonator.address)}>
                                {copied ? t('copied') : t('copy')}
                            </button>
                        </div>

                        {/* Supporter Profile Section */}
                        {supporterProfile && (
                            <div style={{
                                background: 'rgba(168, 85, 247, 0.1)',
                                borderRadius: '20px',
                                padding: '12px',
                                marginBottom: '12px',
                                border: '1px solid rgba(168, 85, 247, 0.3)'
                            }}>
                                {!isEditingProfile ? (
                                    /* Profile View Mode */
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ fontSize: '32px' }}>
                                            {getAvatarEmoji(supporterProfile.avatar)}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px', marginBottom: '2px' }}>
                                                {supporterProfile.name}
                                            </div>
                                            {/* Show social links for visitors, edit count for owner */}
                                            {!isOwnProfile ? (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {supporterProfile.twitter && (
                                                        <a
                                                            href={`https://x.com/${supporterProfile.twitter.replace('@', '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                fontSize: '10px',
                                                                color: '#60a5fa',
                                                                textDecoration: 'none',
                                                                background: 'rgba(96, 165, 250, 0.15)',
                                                                padding: '2px 8px',
                                                                borderRadius: '12px'
                                                            }}
                                                        >
                                                            𝕏 {supporterProfile.twitter}
                                                        </a>
                                                    )}
                                                    {supporterProfile.telegram && (
                                                        <a
                                                            href={`https://t.me/${supporterProfile.telegram.replace('@', '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                fontSize: '10px',
                                                                color: '#22d3ee',
                                                                textDecoration: 'none',
                                                                background: 'rgba(34, 211, 238, 0.15)',
                                                                padding: '2px 8px',
                                                                borderRadius: '12px'
                                                            }}
                                                        >
                                                            📱 {supporterProfile.telegram}
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                                                    ✏️ {supporterProfile.editCount}/3 {t('editsUsed') || 'edits used'}
                                                </div>
                                            )}
                                        </div>
                                        {isOwnProfile && supporterProfile.editCount < 3 && (
                                            <button
                                                onClick={() => setIsEditingProfile(true)}
                                                style={{
                                                    padding: '6px 14px',
                                                    background: 'rgba(168, 85, 247, 0.3)',
                                                    border: '1px solid rgba(168, 85, 247, 0.5)',
                                                    borderRadius: '20px',
                                                    color: '#a855f7',
                                                    fontSize: '10px',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                ✏️ {t('editProfile') || 'Edit'}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    /* Profile Edit Mode - Compact */
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#a855f7', fontWeight: 700, marginBottom: '8px' }}>
                                            ✏️ {t('editYourProfile') || 'Edit Your Profile'}
                                        </div>

                                        {/* Avatar Picker - Compact */}
                                        <div style={{ marginBottom: '8px' }}>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                                                {t('selectAvatar') || 'Select Avatar'}:
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                                {STAKING_AVATARS.map((emoji, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setProfileEditAvatar(idx)}
                                                        style={{
                                                            width: '24px',
                                                            height: '24px',
                                                            fontSize: '14px',
                                                            background: profileEditAvatar === idx
                                                                ? 'rgba(168, 85, 247, 0.4)'
                                                                : 'rgba(255,255,255,0.08)',
                                                            border: profileEditAvatar === idx
                                                                ? '2px solid #a855f7'
                                                                : '1px solid rgba(255,255,255,0.15)',
                                                            borderRadius: '50%',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            padding: 0
                                                        }}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Compact inputs with pill shape */}
                                        <input
                                            type="text"
                                            value={profileEditName}
                                            onChange={(e) => setProfileEditName(e.target.value.slice(0, 20))}
                                            placeholder={t('displayName') || 'Display Name'}
                                            maxLength={20}
                                            style={{
                                                width: '100%',
                                                padding: '6px 12px',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(168, 85, 247, 0.4)',
                                                borderRadius: '20px',
                                                color: '#fff',
                                                fontSize: '11px',
                                                marginBottom: '6px',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <input
                                            type="text"
                                            value={profileEditTelegram}
                                            onChange={(e) => setProfileEditTelegram(e.target.value.slice(0, 50))}
                                            placeholder="Telegram @username"
                                            style={{
                                                width: '100%',
                                                padding: '6px 12px',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(34, 211, 238, 0.4)',
                                                borderRadius: '20px',
                                                color: '#fff',
                                                fontSize: '11px',
                                                marginBottom: '6px',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <input
                                            type="text"
                                            value={profileEditTwitter}
                                            onChange={(e) => setProfileEditTwitter(e.target.value.slice(0, 50))}
                                            placeholder="X (Twitter) @username"
                                            style={{
                                                width: '100%',
                                                padding: '6px 12px',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(96, 165, 250, 0.4)',
                                                borderRadius: '20px',
                                                color: '#fff',
                                                fontSize: '11px',
                                                marginBottom: '8px',
                                                boxSizing: 'border-box'
                                            }}
                                        />

                                        {/* Action Buttons - Pill shape */}
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => setIsEditingProfile(false)}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    borderRadius: '20px',
                                                    color: 'rgba(255,255,255,0.7)',
                                                    fontSize: '10px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {t('cancelBtn') || 'Cancel'}
                                            </button>
                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={isSavingProfile}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px',
                                                    background: 'linear-gradient(135deg, #a855f7, #8b5cf6)',
                                                    border: 'none',
                                                    borderRadius: '20px',
                                                    color: '#fff',
                                                    fontSize: '10px',
                                                    cursor: isSavingProfile ? 'wait' : 'pointer',
                                                    fontWeight: 600,
                                                    opacity: isSavingProfile ? 0.7 : 1
                                                }}
                                            >
                                                {isSavingProfile ? '⏳...' : `💾 ${t('saveProfile') || 'Save'}`}
                                            </button>
                                        </div>

                                        <div style={{
                                            fontSize: '8px',
                                            color: 'rgba(255,255,255,0.35)',
                                            marginTop: '6px',
                                            textAlign: 'center'
                                        }}>
                                            ⚠️ {3 - supporterProfile.editCount} {t('editsRemaining') || 'edits remaining'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="donate-tx-list">
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', fontWeight: 600 }}>
                                {t('transactionHistory')}:
                            </div>
                            {isLoadingHistory ? (
                                <div style={{ textAlign: 'center', padding: '10px', color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>
                                    <div>{t('loading')}</div>
                                    {isLoadingTooLong && (
                                        <div style={{ marginTop: '8px', fontSize: '9px', color: 'rgba(168, 85, 247, 0.8)' }}>
                                            ⏳ Đang tải từ blockchain...
                                            <br />
                                            <a
                                                href={`https://www.okx.com/web3/explorer/xlayer/address/0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#a855f7', textDecoration: 'underline' }}
                                            >
                                                🔗 Xem trực tiếp trên Explorer
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ) : donationHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                                    {t('noTransactions')}
                                </div>
                            ) : (
                                donationHistory.map((tx, idx) => (
                                    <div key={idx} className="donate-tx-item">
                                        <a
                                            href={`https://www.okx.com/web3/explorer/xlayer/tx/${tx.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="donate-tx-hash"
                                            style={{ color: '#a855f7', textDecoration: 'none' }}
                                            title={t('viewOnExplorer')}
                                        >
                                            {shortenTxHash(tx.txHash)} 🔗
                                        </a>
                                        <span className="donate-tx-amount">
                                            {Number(formatEther(tx.amount)).toLocaleString()} BANMAO
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Explorer Guide - Enhanced with Copyable Keyword */}
                        <div style={{
                            margin: '8px 0',
                            padding: '12px',
                            background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(168, 85, 247, 0.08))',
                            border: '1px solid rgba(100, 150, 220, 0.2)',
                            borderRadius: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                        }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                                🔎 {t('donateExplorerGuide')}
                            </div>

                            {/* Copyable Keyword */}
                            <div style={{
                                padding: '10px',
                                background: 'rgba(0, 0, 0, 0.2)',
                                borderRadius: '12px',
                            }}>
                                <div style={{
                                    fontSize: '10px',
                                    color: '#64748b',
                                    marginBottom: '8px',
                                }}>
                                    💡 {t('donateSearchTip')}
                                </div>
                                <CopyableKeyword keyword="donate" />
                            </div>

                            {/* Explorer Button */}
                            <ExplorerButton
                                href={`https://www.okx.com/web3/explorer/xlayer/address/${STAKING_CONTRACT_ADDRESS}?tab=Transactions`}
                                label={t('searchOnExplorer')}
                            />
                        </div>

                        <div className="donate-total">
                            {t('total')} {formatNumber(selectedDonator.amount)} BANMAO | {t('rank')} #{rankedDonators.findIndex(d => d.address === selectedDonator.address) + 1}
                        </div>
                    </div>
                </div>
                , document.body)
            }
        </div >
    );
}
