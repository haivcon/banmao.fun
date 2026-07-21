// app/defi/admin/AdminDashboard.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '../../components/wallet/WalletConnection';
import { formatEther, parseEther } from 'viem';
import SharedProviders from '../../providers';
import { STAKING_CONTRACT_ADDRESS, STAKING_ABI, BANMAO_TOKEN_ADDRESS, ERC20_ABI, LOCK_OPTIONS_INFO } from '../staking/contracts';
import { usePublicClient } from 'wagmi';
import './admin.css';

// Localization
import { en } from './i18n/en';
import { vi } from './i18n/vi';

// Tab types for top-level apps
type AppTabId = 'staking' | 'pools' | 'farming' | 'lending';

// Tab types for staking sub-sections
type TabId = 'overview' | 'parameters' | 'lockOptions' | 'vipTiers' | 'funds' | 'system' | 'stakers';

// Format number with commas
const formatNumber = (value: bigint | undefined, decimals = 2): string => {
    if (!value) return '0';
    const num = Number(formatEther(value));
    return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
};

// --- Staker Detail Component ---
function StakerDetail({ address, lang, t }: { address: string, lang: 'en' | 'vi', t: any }) {
    const [expanded, setExpanded] = useState(false);

    // User summary
    const { data: summary } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'userSummary',
        args: [address as `0x${string}`],
        chainId: 196,
    });

    // User stake IDs
    const { data: stakeIds } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getUserStakeIds',
        args: [address as `0x${string}`],
        chainId: 196,
    });

    if (!summary) return null;

    const [totalAmount, totalShares, weight, vipPoints, activeStakes, vipTier] = summary as any;

    return (
        <div className="admin-log-item" style={{
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '10px',
            padding: '20px',
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ padding: '10px 15px', background: 'rgba(34, 211, 238, 0.1)', borderRadius: '99px', fontSize: '14px', fontWeight: 600, color: '#22d3ee' }}>
                        {vipTier}
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace' }}>{address}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {formatNumber(totalAmount)} tokens • {stakeIds ? (stakeIds as any).length : 0} positions
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '99px', fontSize: '12px' }}
                >
                    {expanded ? 'Collapse' : 'View Details'}
                </button>
            </div>

            {expanded && stakeIds && (
                <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', display: 'grid', gap: '10px' }}>
                    {(stakeIds as any).map((id: bigint) => (
                        <StakeEntryDetail key={id.toString()} user={address} stakeId={id} />
                    ))}
                </div>
            )}
        </div>
    );
}

function StakeEntryDetail({ user, stakeId }: { user: string, stakeId: bigint }) {
    const { data: entry } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getStakeEntry',
        args: [user as `0x${string}`, stakeId],
        chainId: 196,
    });

    if (!entry) return null;
    const [id, amount, shares, startTime, endTime, lastRewardTime, isActive] = entry as any;

    const isLocked = BigInt(Math.floor(Date.now() / 1000)) < endTime;
    const lockDurationDays = Number(endTime - startTime) / 86400;

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', fontSize: '12px' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
                <span style={{ color: '#64748b' }}>ID: {id.toString()}</span>
                <span style={{ fontWeight: 600 }}>{formatNumber(amount)} BANMAO</span>
                <span style={{ color: isLocked ? '#f59e0b' : '#22c55e' }}>
                    {isLocked ? `🔒 Locked (~${Math.round(lockDurationDays)} days)` : '🔓 Unlocked'}
                </span>
            </div>
            <div style={{ color: '#64748b' }}>
                Ends: {new Date(Number(endTime) * 1000).toLocaleDateString()}
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <SharedProviders>
            <AdminContent />
        </SharedProviders>
    );
}

function AdminContent() {
    // Localization
    const [lang, setLang] = useState<'en' | 'vi'>('en');
    const t = lang === 'en' ? en : vi;

    const { address, isConnected } = useAccount();
    const [activeAppTab, setActiveAppTab] = useState<AppTabId>('staking');
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Feature toggle state
    const [defiEnabled, setDefiEnabled] = useState(true);

    // Zoom controls state
    const [zoomLevel, setZoomLevel] = useState(100);

    // Load zoom level from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedZoom = localStorage.getItem('admin_zoom_level');
            if (savedZoom) {
                setZoomLevel(Number(savedZoom));
            }
        }
    }, []);

    // Save zoom level
    const handleZoom = (level: number) => {
        const clampedLevel = Math.max(70, Math.min(130, level));
        setZoomLevel(clampedLevel);
        if (typeof window !== 'undefined') {
            localStorage.setItem('admin_zoom_level', String(clampedLevel));
        }
    };

    // Load toggle state from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('DEFI_ENABLED');
            if (saved !== null) {
                setDefiEnabled(saved !== 'false');
            }
        }
    }, []);

    // Save toggle state
    const toggleDefi = (enabled: boolean) => {
        setDefiEnabled(enabled);
        if (typeof window !== 'undefined') {
            localStorage.setItem('DEFI_ENABLED', String(enabled));
        }
        setSuccess(enabled ? 'DeFi Enabled' : 'DeFi Disabled');
        setTimeout(() => setSuccess(null), 2000);
    };

    // Form states
    const [rewardRateInput, setRewardRateInput] = useState('');
    const [minStakeInput, setMinStakeInput] = useState('');
    const [maxStakeInput, setMaxStakeInput] = useState('');
    const [penaltyInput, setPenaltyInput] = useState('');
    const [gracePeriodInput, setGracePeriodInput] = useState('');
    const [donateAmount, setDonateAmount] = useState('');
    const [devFeeInput, setDevFeeInput] = useState('');
    const [devWalletInput, setDevWalletInput] = useState('');

    // Lock option form
    const [lockOptionId, setLockOptionId] = useState(0);
    const [lockDays, setLockDays] = useState('');
    const [lockMultiplier, setLockMultiplier] = useState('');

    // Batch edit mode state (Feature 1)
    const [batchEditMode, setBatchEditMode] = useState(false);
    const [batchOptions, setBatchOptions] = useState([
        { id: 0, days: '0', multiplier: '10000' },
        { id: 1, days: '30', multiplier: '12000' },
        { id: 2, days: '90', multiplier: '15000' },
        { id: 3, days: '180', multiplier: '20000' },
    ]);

    // Preset mode state (Feature 6)
    type PresetMode = 'conservative' | 'balanced' | 'aggressive' | 'custom';
    const [presetMode, setPresetMode] = useState<PresetMode>('balanced');

    // Confirmation modal state (Feature 8)
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    // VIP Tiers form
    const [vipTiers, setVipTiers] = useState([
        { name: 'BRONZE', minAmount: '0' },
        { name: 'GOLD', minAmount: '10000' },
        { name: 'DIAMOND', minAmount: '50000' },
    ]);

    const addVipTier = () => {
        setVipTiers([...vipTiers, { name: '', minAmount: '' }]);
    };

    const removeVipTier = (index: number) => {
        setVipTiers(vipTiers.filter((_, i) => i !== index));
    };

    const updateVipTier = (index: number, field: 'name' | 'minAmount', value: string) => {
        const updated = [...vipTiers];
        updated[index][field] = value;
        setVipTiers(updated);
    };

    // Contract write
    const { writeContract, data: writeHash, isPending: isWritePending, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: writeHash });

    // Contract reads
    const { data: owner } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'owner' as any,
        chainId: 196, // XLayer Testnet
    });

    // Fallback owner for testnet (known owner from deployment)
    const TESTNET_OWNER = '0x92809f2837F708163d375960063c8a3156FCEaCB';
    const effectiveOwner = owner || TESTNET_OWNER;

    const { data: totalStaked, refetch: refetchStaked } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'totalStaked',
        chainId: 196,
    });

    const publicClient = usePublicClient();

    // Total users count from logs discovery
    const [stakerAddresses, setStakerAddresses] = useState<string[]>([]);
    const [stakersLoading, setStakersLoading] = useState(false);

    const { data: totalShares, refetch: refetchShares } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'totalShares',
        chainId: 196,
    });

    const { data: rewardBucket, refetch: refetchReward } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'rewardBucket',
        chainId: 196,
    });

    const { data: rewardRate, refetch: refetchRate } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'rewardRatePerSecond',
        chainId: 196,
    });

    const { data: accumulatedDevFees, refetch: refetchDevFees } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'accumulatedDevFees',
        chainId: 196,
    });

    const { data: minStakeAmount, refetch: refetchMinStake } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'minStakeAmount',
        chainId: 196,
    });

    const { data: maxStakePerWallet, refetch: refetchMaxStake } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'maxStakePerWallet',
        chainId: 196,
    });

    const { data: earlyUnstakePenalty, refetch: refetchPenalty } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'earlyUnstakePenalty',
        chainId: 196,
    });

    const { data: gracePeriodDuration, refetch: refetchGrace } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'gracePeriodDuration',
        chainId: 196,
    });

    const { data: isPaused, refetch: refetchPaused } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'paused',
        chainId: 196,
    });

    const { data: healthCheck, refetch: refetchHealth } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getGlobalHealthCheck',
        chainId: 196,
    });

    // Read current VIP tiers from contract
    const { data: contractTier0, refetch: refetchTier0 } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'vipTiers',
        args: [BigInt(0)],
        chainId: 196,
    });

    const { data: contractTier1, refetch: refetchTier1 } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'vipTiers',
        args: [BigInt(1)],
        chainId: 196,
    });

    const { data: contractTier2, refetch: refetchTier2 } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'vipTiers',
        args: [BigInt(2)],
        chainId: 196,
    });

    const { data: devFee } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'devFee',
        chainId: 196,
    });

    const { data: devWalletAddress, refetch: refetchDevWallet } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'devWallet',
        chainId: 196,
    });

    // Read current lock options from contract
    const { data: lockOption0, refetch: refetchLockOption0 } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'lockOptions',
        args: [BigInt(0)],
        chainId: 196,
    });

    const { data: lockOption1, refetch: refetchLockOption1 } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'lockOptions',
        args: [BigInt(1)],
        chainId: 196,
    });

    const { data: lockOption2, refetch: refetchLockOption2 } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'lockOptions',
        args: [BigInt(2)],
        chainId: 196,
    });

    const { data: lockOption3, refetch: refetchLockOption3 } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'lockOptions',
        args: [BigInt(3)],
        chainId: 196,
    });

    // ============ Read Token Supply & Burn Data for Suggestions ============
    const DEAD_WALLETS = [
        '0x000000000000000000000000000000000000dEaD',
        '0x0000000000000000000000000000000000000000',
    ];

    const { data: totalSupply } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
        chainId: 196,
    });

    const { data: burnedBalance1 } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [DEAD_WALLETS[0] as `0x${string}`],
        chainId: 196,
    });

    const { data: burnedBalance2 } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [DEAD_WALLETS[1] as `0x${string}`],
        chainId: 196,
    });

    // Calculate circulating supply
    const totalSupplyNum = totalSupply ? Number(formatEther(totalSupply as bigint)) : 0;
    const burned1 = burnedBalance1 ? Number(formatEther(burnedBalance1 as bigint)) : 0;
    const burned2 = burnedBalance2 ? Number(formatEther(burnedBalance2 as bigint)) : 0;
    const totalBurned = burned1 + burned2;
    const circulatingSupply = totalSupplyNum - totalBurned;

    // Get reward pool and total staked for calculations
    const rewardPoolNum = rewardBucket ? Number(formatEther(rewardBucket as bigint)) : 0;
    const totalStakedNum = totalStaked ? Number(formatEther(totalStaked as bigint)) : 0;
    const rewardRateNum = rewardRate ? Number(formatEther(rewardRate as bigint)) : 0; // tokens per second

    // Calculate reward rate metrics
    const rewardRatePerDay = rewardRateNum * 86400; // tokens per day
    const rewardRatePerYear = rewardRateNum * 86400 * 365; // tokens per year
    const daysUntilPoolEmpty = rewardRateNum > 0 ? rewardPoolNum / (rewardRateNum * 86400) : 0;

    // Calculate APY based on reward rate and total staked
    const estimatedAPY = totalStakedNum > 0 ? (rewardRatePerYear / totalStakedNum) * 100 : 0;

    // Calculate key metrics
    const circulatingPercent = totalSupplyNum > 0 ? (circulatingSupply / totalSupplyNum) * 100 : 100;
    const stakedPercent = circulatingSupply > 0 ? (totalStakedNum / circulatingSupply) * 100 : 0;
    const poolHealthRatio = totalStakedNum > 0 ? rewardPoolNum / totalStakedNum : 0; // Reward per staked token

    /**
     * FAIR MULTIPLIER FORMULA - Based on Compound Interest + Reward Rate
     * 
     * Formula: multiplier = 1 + (annualBonusRate * (days/365)) * adjustmentFactor
     * 
     * Where:
     * - annualBonusRate: Base 100% bonus for full year lock (1.0)
     * - adjustmentFactor: Combined from pool health + circulation rate + reward rate
     * 
     * This ensures:
     * 1. Proportional reward to lock time (fair)
     * 2. Higher rewards when pool is healthy (sustainable)
     * 3. Higher rewards when circulation is low (incentivize staking)
     * 4. Adjusted by reward rate sustainability
     */
    const getSuggestedMultiplier = (days: number): number => {
        // Base: 100% annual bonus rate (lock 365 days = 2x multiplier)
        const ANNUAL_BONUS_RATE = 1.0;

        // Calculate time factor (proportional to days, 0-1 scale for full year)
        const timeFactor = days / 365;

        // Pool Health Factor (0.8 - 1.2)
        // If pool has good rewards per staked token, can offer higher multipliers
        let poolFactor = 1.0;
        if (poolHealthRatio > 0.1) poolFactor = 1.2; // Very healthy pool
        else if (poolHealthRatio > 0.05) poolFactor = 1.1;
        else if (poolHealthRatio > 0.01) poolFactor = 1.0;
        else if (poolHealthRatio > 0) poolFactor = 0.9;
        else poolFactor = 0.8; // No rewards in pool

        // Circulation Factor (0.9 - 1.3)
        // Lower circulation = higher incentive to stake
        let circulationFactor = 1.0;
        if (circulatingPercent < 30) circulationFactor = 1.3;
        else if (circulatingPercent < 50) circulationFactor = 1.15;
        else if (circulatingPercent < 70) circulationFactor = 1.05;
        else circulationFactor = 0.95; // High circulation, less need for high rewards

        // Staking Participation Factor (0.9 - 1.2)
        // Lower staking participation = higher incentive
        let stakingFactor = 1.0;
        if (stakedPercent < 10) stakingFactor = 1.2; // Very low participation
        else if (stakedPercent < 25) stakingFactor = 1.1;
        else if (stakedPercent < 50) stakingFactor = 1.0;
        else stakingFactor = 0.9; // High participation, reduce rewards

        // Reward Rate Factor (0.7 - 1.3) - NEW
        // Higher reward rate = can afford higher multipliers
        // Based on days until pool empty (sustainability)
        let rewardRateFactor = 1.0;
        if (daysUntilPoolEmpty > 365) rewardRateFactor = 1.3; // Very sustainable (>1 year)
        else if (daysUntilPoolEmpty > 180) rewardRateFactor = 1.2;
        else if (daysUntilPoolEmpty > 90) rewardRateFactor = 1.1;
        else if (daysUntilPoolEmpty > 30) rewardRateFactor = 1.0;
        else if (daysUntilPoolEmpty > 7) rewardRateFactor = 0.85;
        else rewardRateFactor = 0.7; // Very low sustainability

        // Combined adjustment factor
        const adjustmentFactor = poolFactor * circulationFactor * stakingFactor * rewardRateFactor;

        // Final multiplier calculation
        // Base 1.0x + time-proportional bonus * adjustment
        const multiplier = 1.0 + (ANNUAL_BONUS_RATE * timeFactor * adjustmentFactor);

        // Convert to basis points (10000 = 1.0x)
        return Math.round(multiplier * 10000);
    };

    // Generate suggested options with fair formula
    const suggestedOptions = [
        { id: 0, name: 'Flexible', days: 0, multiplier: getSuggestedMultiplier(0) },
        { id: 1, name: '30 Days', days: 30, multiplier: getSuggestedMultiplier(30) },
        { id: 2, name: '90 Days', days: 90, multiplier: getSuggestedMultiplier(90) },
        { id: 3, name: '180 Days', days: 180, multiplier: getSuggestedMultiplier(180) },
    ];

    // Preset configurations (Feature 6)
    const presetConfigs = {
        conservative: [
            { id: 0, days: '0', multiplier: '10000' },   // 1.0x
            { id: 1, days: '30', multiplier: '11000' },  // 1.1x
            { id: 2, days: '90', multiplier: '12500' },  // 1.25x
            { id: 3, days: '180', multiplier: '14000' }, // 1.4x
        ],
        balanced: suggestedOptions.map(opt => ({
            id: opt.id,
            days: String(opt.days),
            multiplier: String(opt.multiplier),
        })),
        aggressive: [
            { id: 0, days: '0', multiplier: '10000' },   // 1.0x
            { id: 1, days: '30', multiplier: '13000' },  // 1.3x
            { id: 2, days: '90', multiplier: '17000' },  // 1.7x
            { id: 3, days: '180', multiplier: '22000' }, // 2.2x
        ],
    };

    // Apply preset (Feature 6)
    const applyPreset = (mode: 'conservative' | 'balanced' | 'aggressive') => {
        setPresetMode(mode);
        const preset = presetConfigs[mode];
        setBatchOptions(preset);
        // Also update single edit mode if applicable
        if (!batchEditMode && preset[lockOptionId]) {
            setLockDays(preset[lockOptionId].days);
            setLockMultiplier(preset[lockOptionId].multiplier);
        }
    };

    // Apply all suggestions (Feature 2)
    const applyAllSuggestions = () => {
        setPresetMode('balanced');
        const suggested = suggestedOptions.map(opt => ({
            id: opt.id,
            days: String(opt.days),
            multiplier: String(opt.multiplier),
        }));
        setBatchOptions(suggested);
    };

    // Load current contract values into batch options
    const loadCurrentValues = () => {
        const contractData = [lockOption0, lockOption1, lockOption2, lockOption3];
        const current = contractData.map((opt, idx) => ({
            id: idx,
            days: opt ? String(Number((opt as any)[0])) : String(idx === 0 ? 0 : idx * 30),
            multiplier: opt ? String(Number((opt as any)[1])) : '10000',
        }));
        setBatchOptions(current);
        setPresetMode('custom');
    };

    // Update batch option (Feature 1)
    const updateBatchOption = (index: number, field: 'days' | 'multiplier', value: string) => {
        const updated = [...batchOptions];
        updated[index][field] = value;
        setBatchOptions(updated);
        setPresetMode('custom');
    };

    // Validation warnings (Feature 5)
    const getValidationWarnings = () => {
        const warnings: string[] = [];
        const opts = batchEditMode ? batchOptions : [{ id: lockOptionId, days: lockDays, multiplier: lockMultiplier }];

        for (const opt of opts) {
            const mult = Number(opt.multiplier);
            const days = Number(opt.days);

            // Check multiplier too high
            if (mult > 25000) {
                warnings.push(`⚠️ Option ${opt.id}: Multiplier ${(mult / 10000).toFixed(2)}x có thể không bền vững (>2.5x)`);
            }
            // Check multiplier too low (except flexible)
            if (days > 0 && mult < 10500) {
                warnings.push(`⚠️ Option ${opt.id}: Multiplier ${(mult / 10000).toFixed(2)}x quá thấp, không hấp dẫn (<1.05x)`);
            }
        }

        // Check multiplier consistency (longer lock should have higher multiplier)
        if (batchEditMode) {
            const sorted = [...batchOptions].sort((a, b) => Number(a.days) - Number(b.days));
            for (let i = 1; i < sorted.length; i++) {
                if (Number(sorted[i].multiplier) < Number(sorted[i - 1].multiplier)) {
                    warnings.push(`🔴 Multiplier ngược: ${sorted[i - 1].days}d (${(Number(sorted[i - 1].multiplier) / 10000).toFixed(2)}x) > ${sorted[i].days}d (${(Number(sorted[i].multiplier) / 10000).toFixed(2)}x)`);
                }
            }
        }

        return warnings;
    };

    // Preview impact calculation (Feature 7)
    const calculatePreviewImpact = (days: number, currentMult: number, newMult: number, stakeAmount = 10000) => {
        const currentShares = Math.floor((stakeAmount * currentMult) / 10000);
        const newShares = Math.floor((stakeAmount * newMult) / 10000);
        const change = currentMult > 0 ? ((newMult - currentMult) / currentMult * 100) : 0;
        return { currentShares, newShares, change };
    };

    // Confirm and execute action (Feature 8)
    const confirmAction = (action: () => void) => {
        setPendingAction(() => action);
        setShowConfirmModal(true);
    };

    const executeConfirmedAction = () => {
        if (pendingAction) {
            pendingAction();
        }
        setShowConfirmModal(false);
        setPendingAction(null);
    };

    // Check if user is owner
    const isOwner = address && (effectiveOwner as string).toLowerCase() === address.toLowerCase();

    // Centralized refetch function
    const refetchAll = useCallback(() => {
        refetchStaked();
        refetchShares();
        refetchReward();
        refetchRate();
        refetchDevFees();
        refetchMinStake();
        refetchMaxStake();
        refetchPenalty();
        refetchGrace();
        refetchPaused();
        refetchHealth();
        refetchTier0();
        refetchTier1();
        refetchTier2();
        refetchDevWallet();
        refetchLockOption0();
        refetchLockOption1();
        refetchLockOption2();
        refetchLockOption3();
    }, [
        refetchStaked, refetchShares, refetchReward, refetchRate,
        refetchDevFees, refetchMinStake, refetchMaxStake, refetchPenalty,
        refetchGrace, refetchPaused, refetchHealth, refetchTier0,
        refetchTier1, refetchTier2, refetchDevWallet,
        refetchLockOption0, refetchLockOption1, refetchLockOption2, refetchLockOption3
    ]);

    // Fetch unique staker addresses from logs
    const fetchStakers = useCallback(async () => {
        if (!publicClient) return;
        setStakersLoading(true);
        try {
            const logs = await publicClient.getLogs({
                address: STAKING_CONTRACT_ADDRESS,
                event: {
                    type: 'event',
                    name: 'Staked',
                    inputs: [
                        { indexed: true, name: 'user', type: 'address' },
                        { indexed: true, name: 'stakeId', type: 'uint256' },
                        { indexed: false, name: 'amount', type: 'uint256' },
                        { indexed: false, name: 'shares', type: 'uint256' },
                        { indexed: false, name: 'lockDays', type: 'uint256' },
                    ],
                } as any,
                fromBlock: 'earliest' as any,
                toBlock: 'latest',
            });

            const uniqueAddresses = Array.from(new Set(logs.map(log => (log as any).args.user as string)));
            setStakerAddresses(uniqueAddresses);
        } catch (err) {
            console.error('Failed to fetch staker logs:', err);
            setError('Failed to fetch staker list from logs');
        } finally {
            setStakersLoading(false);
        }
    }, [publicClient]);

    useEffect(() => {
        if (activeTab === 'stakers' && stakerAddresses.length === 0) {
            fetchStakers();
        }
    }, [activeTab, stakerAddresses.length, fetchStakers]);

    useEffect(() => {
        setLoading(false);
    }, []);

    // Handle transaction results
    useEffect(() => {
        if (isConfirmed) {
            setSuccess(t.success);
            refetchAll();
            setTimeout(() => setSuccess(null), 3000);
        }
        if (writeError) {
            setError(writeError.message.slice(0, 100));
            setTimeout(() => setError(null), 5000);
        }
    }, [isConfirmed, writeError, t.success, refetchAll]);

    // Write functions
    const handleSetRewardRate = () => {
        if (!rewardRateInput) return;
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'setRewardRate',
            args: [parseEther(rewardRateInput)],
            chainId: 196,
        } as any);
    };

    const handleSetMinStake = () => {
        if (!minStakeInput) return;
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'setMinStakeAmount',
            args: [parseEther(minStakeInput)],
            chainId: 196,
        } as any);
    };

    const handleSetMaxStake = () => {
        if (!maxStakeInput) return;
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'setMaxStakeLimit',
            args: [parseEther(maxStakeInput)],
            chainId: 196,
        } as any);
    };

    const handleSetPenalty = () => {
        if (!penaltyInput) return;
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'setEarlyUnstakePenalty',
            args: [BigInt(penaltyInput)],
            chainId: 196,
        } as any);
    };

    const handleSetGracePeriod = () => {
        if (!gracePeriodInput) return;
        // Input is already in seconds (e.g. 7200 = 2 hours)
        const seconds = BigInt(parseInt(gracePeriodInput));
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'setGracePeriod',
            args: [seconds],
            chainId: 196,
        } as any);
    };

    const handleSetDevFee = () => {
        if (!devFeeInput) return;
        // Input is already in Basis Points (e.g. 200 = 2%)
        const feeBP = BigInt(parseInt(devFeeInput));
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'setDevFee',
            args: [feeBP],
            chainId: 196,
        } as any);
    };

    const handleSetDevWallet = () => {
        if (!devWalletInput) return;
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'setDevWallet',
            args: [devWalletInput],
            chainId: 196,
        } as any);
    };

    const handleUpdateLockOption = () => {
        if (!lockDays || !lockMultiplier) return;
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'updateLockOption',
            args: [BigInt(lockOptionId), BigInt(lockDays), BigInt(lockMultiplier)],
            chainId: 196,
        } as any);
    };

    const handleSetVIPTiers = () => {
        if (vipTiers.length === 0) return;
        const names = vipTiers.map(t => t.name);
        const minAmounts = vipTiers.map(t => parseEther(t.minAmount || '0'));
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'setVIPTiers',
            args: [names, minAmounts],
            chainId: 196,
        } as any);
    };

    const handleDonate = () => {
        if (!donateAmount) return;
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'donate',
            args: [parseEther(donateAmount)],
            chainId: 196,
        } as any);
    };

    const handleWithdrawDevFees = () => {
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'withdrawDevFees',
            chainId: 196,
        } as any);
    };

    const handleWithdrawDust = () => {
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'withdrawDust',
            chainId: 196,
        } as any);
    };

    const handlePause = () => {
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'pause',
            chainId: 196,
        } as any);
    };

    const handleUnpause = () => {
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'unpause',
            chainId: 196,
        } as any);
    };

    const tabs: { id: TabId; icon: string; label: string }[] = [
        { id: 'overview', icon: '📊', label: t.tabs.overview },
        { id: 'parameters', icon: '⚙️', label: t.tabs.parameters },
        { id: 'lockOptions', icon: '🔒', label: t.tabs.lockOptions },
        { id: 'vipTiers', icon: '👑', label: t.tabs.vipTiers },
        { id: 'funds', icon: '💰', label: t.tabs.funds },
        { id: 'stakers', icon: '👥', label: lang === 'en' ? 'Stakers' : 'Người Stake' },
        { id: 'system', icon: '🛡️', label: t.tabs.system },
    ];

    if (loading) {
        return (
            <div className="admin-container">
                <div className="admin-loading">{t.loading}</div>
            </div>
        );
    }

    if (!isConnected || !isOwner) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 50%, #0f0f23 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
                color: '#fff',
            }}>
                <h2>{t.contractOwnerOnly}</h2>
                <p style={{ color: '#888', fontSize: '14px' }}>
                    Owner: {`${(effectiveOwner as string).slice(0, 8)}...${(effectiveOwner as string).slice(-6)}`}
                </p>
                <ConnectButton />
            </div>
        );
    }

    return (
        <div className="admin-container">
            {/* Header */}
            <header className="admin-header">
                <div className="admin-header-left">
                    <h1 className="admin-title">{t.title}</h1>
                    <span className="admin-subtitle">{t.subtitle}</span>
                </div>
                <div className="admin-header-right" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    {/* Language Switcher */}
                    <button
                        onClick={() => setLang(lang === 'en' ? 'vi' : 'en')}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600
                        }}
                    >
                        {lang === 'en' ? '🇺🇸 EN' : '🇻🇳 VI'}
                    </button>

                    {/* Zoom Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px 8px' }}>
                        <button
                            onClick={() => handleZoom(zoomLevel - 10)}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}
                            title="Zoom Out"
                        >
                            −
                        </button>
                        <span style={{ color: '#94a3b8', fontSize: '11px', minWidth: '35px', textAlign: 'center' }}>
                            🔍 {zoomLevel}%
                        </span>
                        <button
                            onClick={() => handleZoom(zoomLevel + 10)}
                            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}
                            title="Zoom In"
                        >
                            +
                        </button>
                    </div>

                    <a href="/defi" className="admin-back-btn">
                        <span>←</span> {t.backToHub}
                    </a>
                    <ConnectButton />
                </div>
            </header>

            {/* Top-level App Tabs */}
            <nav style={{
                display: 'flex',
                gap: '8px',
                padding: '16px 24px',
                background: 'rgba(0,0,0,0.3)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                marginBottom: '0',
            }}>
                {[
                    { id: 'staking' as AppTabId, icon: '💎', label: lang === 'vi' ? 'Staking' : 'Staking', color: '#a855f7' },
                    { id: 'pools' as AppTabId, icon: '💧', label: lang === 'vi' ? 'Pools' : 'Pools', color: '#06b6d4' },
                    { id: 'farming' as AppTabId, icon: '🌾', label: lang === 'vi' ? 'Farming' : 'Farming', color: '#22c55e' },
                    { id: 'lending' as AppTabId, icon: '🏦', label: lang === 'vi' ? 'Lending' : 'Lending', color: '#f59e0b' },
                ].map(app => (
                    <button
                        key={app.id}
                        onClick={() => setActiveAppTab(app.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            background: activeAppTab === app.id
                                ? `linear-gradient(135deg, ${app.color}30, ${app.color}10)`
                                : 'rgba(255,255,255,0.03)',
                            border: activeAppTab === app.id
                                ? `2px solid ${app.color}`
                                : '2px solid transparent',
                            borderRadius: '12px',
                            color: activeAppTab === app.id ? app.color : '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>{app.icon}</span>
                        {app.label}
                        {app.id !== 'staking' && (
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '4px',
                                color: '#64748b',
                            }}>
                                Soon
                            </span>
                        )}
                    </button>
                ))}
            </nav>


            {/* Notifications */}
            {error && <div className="admin-alert admin-alert-error">❌ {error}</div>}
            {success && <div className="admin-alert admin-alert-success">✅ {success}</div>}
            {(isWritePending || isConfirming) && (
                <div className="admin-alert" style={{ background: 'rgba(59, 130, 246, 0.2)', borderColor: '#3b82f6' }}>
                    🔄 {t.processing}
                </div>
            )}

            {/* Coming Soon Content for non-staking tabs */}
            {activeAppTab !== 'staking' && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    gap: '24px',
                    textAlign: 'center',
                    padding: '40px',
                }}>
                    <div style={{
                        fontSize: '64px',
                        marginBottom: '10px',
                    }}>
                        {activeAppTab === 'pools' ? '💧' : activeAppTab === 'farming' ? '🌾' : '🏦'}
                    </div>
                    <h2 style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        color: '#fff',
                        margin: 0,
                    }}>
                        {activeAppTab.charAt(0).toUpperCase() + activeAppTab.slice(1)} Admin
                    </h2>
                    <p style={{
                        color: '#64748b',
                        fontSize: '16px',
                        maxWidth: '400px',
                    }}>
                        {lang === 'vi'
                            ? 'Tính năng quản trị này sẽ sớm được triển khai khi hợp đồng được phát hành.'
                            : 'This admin feature will be available soon when the contract is deployed.'
                        }
                    </p>
                    <div style={{
                        padding: '12px 24px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: '12px',
                        color: '#a855f7',
                        fontSize: '14px',
                        fontWeight: 600,
                    }}>
                        🚀 {lang === 'vi' ? 'Sắp Ra Mắt' : 'Coming Soon'}
                    </div>
                </div>
            )}

            {/* Staking Admin Content */}
            {activeAppTab === 'staking' && (
                <div className="admin-layout">
                    {/* Sidebar */}
                    <nav className="admin-sidebar">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`admin-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className="admin-sidebar-icon">{tab.icon}</span>
                                <span className="admin-sidebar-label">{tab.label}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Content */}
                    <main className="admin-content" style={{ zoom: zoomLevel / 100 }}>
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="admin-panel">
                                <h2 className="admin-panel-title">{t.overview.title}</h2>
                                <p style={{ color: '#888', marginBottom: '10px' }}>{t.overview.desc}</p>

                                {/* Technical Architecture Detail */}
                                <div className="admin-section-card" style={{ marginTop: '0', marginBottom: '30px', padding: '20px', background: 'rgba(34, 211, 238, 0.05)', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
                                    <h3 style={{ color: '#22d3ee', fontSize: '16px', marginBottom: '10px' }}>⚙️ Technical Architecture (V28)</h3>
                                    <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>
                                        <p>• <b>Share-Based Rewards</b>: Rewards are distributed via an <code>accRewardPerShare</code> mechanism. Users earn relative to their total weight in the pool.</p>
                                        <p>• <b>Multi-Stake Tracking</b>: Each deposit is tracked independently (with its own <code>stakeId</code>), allowing users to manage multiple locking strategies simultaneously.</p>
                                        <p>• <b>Lock Multipliers</b>: Multipliers (Basis Points) increase share weight without increasing the actual token count, ensuring long-term stakers capture more value.</p>
                                        <p>• <b>Grace Period</b>: A safety duration after locking ends during which users can withdraw without penalty before rewarding resumes normally.</p>
                                    </div>
                                </div>

                                {/* Contract Addresses */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                                    <div className="admin-stat-card" style={{ padding: '15px', borderRadius: '20px' }}>
                                        <div className="admin-stat-info" style={{ width: '100%' }}>
                                            <span className="admin-stat-label">Staking Contract</span>
                                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#22d3ee', overflow: 'hidden', textOverflow: 'ellipsis' }}>{STAKING_CONTRACT_ADDRESS}</span>
                                        </div>
                                    </div>
                                    <div className="admin-stat-card" style={{ padding: '15px', borderRadius: '20px' }}>
                                        <div className="admin-stat-info" style={{ width: '100%' }}>
                                            <span className="admin-stat-label">Dev Wallet</span>
                                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#a855f7', overflow: 'hidden', textOverflow: 'ellipsis' }}>{devWalletAddress as string || 'Loading...'}</span>
                                        </div>
                                    </div>
                                    <div className="admin-stat-card" style={{ padding: '15px', borderRadius: '20px' }}>
                                        <div className="admin-stat-info" style={{ width: '100%' }}>
                                            <span className="admin-stat-label">Token Address</span>
                                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#f59e0b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{BANMAO_TOKEN_ADDRESS}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="admin-stats-grid">
                                    <div className="admin-stat-card">
                                        <span className="admin-stat-icon">💎</span>
                                        <div className="admin-stat-info">
                                            <span className="admin-stat-value">{formatNumber(totalStaked as bigint)}</span>
                                            <span className="admin-stat-label">{t.overview.totalStaked}</span>
                                        </div>
                                    </div>
                                    <div className="admin-stat-card">
                                        <span className="admin-stat-icon">📊</span>
                                        <div className="admin-stat-info">
                                            <span className="admin-stat-value">{formatNumber(totalShares as bigint)}</span>
                                            <span className="admin-stat-label">{t.overview.totalShares}</span>
                                        </div>
                                    </div>
                                    <div className="admin-stat-card">
                                        <span className="admin-stat-icon">🎁</span>
                                        <div className="admin-stat-info">
                                            <span className="admin-stat-value">{formatNumber(rewardBucket as bigint)}</span>
                                            <span className="admin-stat-label">{t.overview.rewardPool}</span>
                                        </div>
                                    </div>
                                    <div className="admin-stat-card">
                                        <span className="admin-stat-icon">{isPaused ? '🔴' : '🟢'}</span>
                                        <div className="admin-stat-info">
                                            <span className="admin-stat-value">{isPaused ? t.overview.paused : t.overview.active}</span>
                                            <span className="admin-stat-label">{t.overview.isPaused}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="admin-stats-grid" style={{ marginTop: '20px' }}>
                                    <div className="admin-stat-card" style={{ padding: '16px' }}>
                                        <div className="admin-stat-info">
                                            <span className="admin-stat-label">{t.overview.rewardRate}</span>
                                            <span className="admin-stat-value" style={{ fontSize: '20px' }}>
                                                {formatNumber(rewardRate as bigint, 6)} /s
                                            </span>
                                        </div>
                                    </div>
                                    <div className="admin-stat-card" style={{ padding: '16px' }}>
                                        <div className="admin-stat-info">
                                            <span className="admin-stat-label">{t.overview.devFees}</span>
                                            <span className="admin-stat-value" style={{ fontSize: '20px' }}>
                                                {formatNumber(accumulatedDevFees as bigint)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="admin-stat-card" style={{ padding: '16px' }}>
                                        <div className="admin-stat-info">
                                            <span className="admin-stat-label">{t.overview.healthStatus}</span>
                                            <span className="admin-stat-value" style={{ fontSize: '20px' }}>
                                                {healthCheck && (healthCheck as any)[2] ? t.overview.healthy : t.overview.unhealthy}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="admin-stat-card" style={{ padding: '16px' }}>
                                        <div className="admin-stat-info">
                                            <span className="admin-stat-label">{t.overview.daysLeft}</span>
                                            <span className="admin-stat-value" style={{ fontSize: '20px' }}>
                                                {healthCheck ? Number((healthCheck as any)[1]).toString() : '0'} days
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Parameters Tab */}
                        {activeTab === 'parameters' && (
                            <div className="admin-panel">
                                <h2 className="admin-panel-title">{t.parameters.title}</h2>
                                <p style={{ color: '#888', marginBottom: '20px' }}>{t.parameters.desc}</p>

                                <div className="admin-section-card">
                                    <h3 className="admin-section-title">{t.parameters.rewardRate.label}</h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>{t.parameters.rewardRate.hint}</p>

                                    {/* Enhanced Annotations */}
                                    <div style={{ padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
                                        <div style={{ color: '#60a5fa', marginBottom: '4px' }}>{(t.parameters.rewardRate as any).example || '📊 0.01 token/s = 864 token/ngày'}</div>
                                        <div style={{ color: '#4ade80', marginBottom: '4px' }}>{(t.parameters.rewardRate as any).recommend || '💡 Gợi ý: 0.005 - 0.05'}</div>
                                        <div style={{ color: '#f59e0b' }}>{(t.parameters.rewardRate as any).impact || '⚠️ Ảnh hưởng: hết quỹ nhanh/chậm'}</div>
                                    </div>

                                    <p style={{ color: '#22c55e', fontSize: '14px', marginBottom: '10px' }}>
                                        {t.current}: {formatNumber(rewardRate as bigint, 8)} tokens/s
                                        <span style={{ color: '#94a3b8', marginLeft: '8px' }}>
                                            (= {(Number(rewardRate || 0) / 1e18 * 86400).toLocaleString()} /ngày)
                                        </span>
                                    </p>

                                    {/* Live Calculation */}
                                    {rewardRateInput && (
                                        <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.15)', borderRadius: '6px', marginBottom: '10px', fontSize: '13px', color: '#22c55e' }}>
                                            📊 Preview: {rewardRateInput} token/s = {(Number(rewardRateInput) * 86400).toLocaleString()} token/ngày = {(Number(rewardRateInput) * 86400 * 30).toLocaleString()} token/tháng
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            value={rewardRateInput}
                                            onChange={(e) => setRewardRateInput(e.target.value)}
                                            placeholder={t.parameters.rewardRate.placeholder}
                                        />
                                        <button className="admin-btn-primary" onClick={handleSetRewardRate} disabled={isWritePending}>
                                            {t.update}
                                        </button>
                                    </div>
                                </div>


                                <div className="admin-section-card">
                                    <h3 className="admin-section-title">{t.parameters.minStake.label}</h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>{t.parameters.minStake.hint}</p>

                                    {/* Enhanced Annotations */}
                                    <div style={{ padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
                                        <div style={{ color: '#60a5fa', marginBottom: '4px' }}>{(t.parameters.minStake as any).example || '📊 VD: 100 tokens = tối thiểu stake 100'}</div>
                                        <div style={{ color: '#4ade80', marginBottom: '4px' }}>{(t.parameters.minStake as any).recommend || '💡 Gợi ý: 1 - 100 tokens'}</div>
                                        <div style={{ color: '#f59e0b' }}>{(t.parameters.minStake as any).impact || '⚠️ Cao quá = ít người tham gia'}</div>
                                    </div>

                                    <p style={{ color: '#22c55e', fontSize: '14px', marginBottom: '10px' }}>
                                        {t.current}: {formatNumber(minStakeAmount as bigint)} tokens
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            value={minStakeInput}
                                            onChange={(e) => setMinStakeInput(e.target.value)}
                                            placeholder={t.parameters.minStake.placeholder}
                                        />
                                        <button className="admin-btn-primary" onClick={handleSetMinStake} disabled={isWritePending}>
                                            {t.update}
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-section-card">
                                    <h3 className="admin-section-title">{t.parameters.maxStake.label}</h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>{t.parameters.maxStake.hint}</p>

                                    {/* Enhanced Annotations */}
                                    <div style={{ padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
                                        <div style={{ color: '#60a5fa', marginBottom: '4px' }}>{(t.parameters.maxStake as any).example || '📊 VD: 1,000,000 = max stake 1M tokens/ví'}</div>
                                        <div style={{ color: '#4ade80', marginBottom: '4px' }}>{(t.parameters.maxStake as any).recommend || '💡 Gợi ý: 5-10% tổng cung'}</div>
                                        <div style={{ color: '#f59e0b' }}>{(t.parameters.maxStake as any).impact || '⚠️ Thấp = giới hạn whales, Cao = rủi ro thao túng'}</div>
                                    </div>

                                    <p style={{ color: '#22c55e', fontSize: '14px', marginBottom: '10px' }}>
                                        {t.current}: {formatNumber(maxStakePerWallet as bigint)} tokens
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            value={maxStakeInput}
                                            onChange={(e) => setMaxStakeInput(e.target.value)}
                                            placeholder={t.parameters.maxStake.placeholder}
                                        />
                                        <button className="admin-btn-primary" onClick={handleSetMaxStake} disabled={isWritePending}>
                                            {t.update}
                                        </button>
                                    </div>
                                </div>


                                <div className="admin-section-card">
                                    <h3 className="admin-section-title">{t.parameters.penalty.label}</h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>{t.parameters.penalty.hint}</p>

                                    {/* Enhanced Annotations */}
                                    <div style={{ padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
                                        <div style={{ color: '#60a5fa', marginBottom: '4px' }}>{(t.parameters.penalty as any).example || '📊 VD: 1000 = 10% phí → Rút 10K = mất 1K'}</div>
                                        <div style={{ color: '#4ade80', marginBottom: '4px' }}>{(t.parameters.penalty as any).recommend || '💡 Gợi ý: 500-1500 (5%-15%)'}</div>
                                        <div style={{ color: '#f59e0b', marginBottom: '4px' }}>{(t.parameters.penalty as any).impact || '⚠️ Cao = ít người stake, Thấp = không khuyến khích lock'}</div>
                                        <div style={{ color: '#a855f7' }}>{(t.parameters.penalty as any).conversion || '📐 100=1%, 500=5%, 1000=10%, 2500=25%, 5000=50%(max)'}</div>
                                    </div>

                                    <p style={{ color: '#22c55e', fontSize: '14px', marginBottom: '10px' }}>
                                        {t.current}: {Number(earlyUnstakePenalty || 0) / 100}%
                                        <span style={{ color: '#94a3b8', marginLeft: '8px' }}>({Number(earlyUnstakePenalty || 0)} BP)</span>
                                    </p>

                                    {/* Live Calculation */}
                                    {penaltyInput && (
                                        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.15)', borderRadius: '6px', marginBottom: '10px', fontSize: '13px', color: '#f87171' }}>
                                            📊 Preview: {penaltyInput} BP = {(Number(penaltyInput) / 100).toFixed(2)}% phí → Rút 10,000 tokens = mất {(10000 * Number(penaltyInput) / 10000).toLocaleString()} tokens
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            value={penaltyInput}
                                            onChange={(e) => setPenaltyInput(e.target.value)}
                                            placeholder={t.parameters.penalty.placeholder}
                                        />
                                        <button className="admin-btn-primary" onClick={handleSetPenalty} disabled={isWritePending}>
                                            {t.update}
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-section-card">
                                    <h3 className="admin-section-title">{t.parameters.gracePeriod.label}</h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>{t.parameters.gracePeriod.hint}</p>

                                    {/* Enhanced Annotations */}
                                    <div style={{ padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
                                        <div style={{ color: '#60a5fa', marginBottom: '4px' }}>{(t.parameters.gracePeriod as any).example || '📊 VD: 7200 = 2 giờ đổi ý không phí'}</div>
                                        <div style={{ color: '#4ade80', marginBottom: '4px' }}>{(t.parameters.gracePeriod as any).recommend || '💡 Gợi ý: 3600-7200 (1-2 giờ)'}</div>
                                        <div style={{ color: '#f59e0b', marginBottom: '4px' }}>{(t.parameters.gracePeriod as any).impact || '⚠️ Dài = lợi dụng, Ngắn = không thân thiện'}</div>
                                        <div style={{ color: '#a855f7' }}>{(t.parameters.gracePeriod as any).conversion || '📐 3600=1h, 7200=2h, 86400=1d'}</div>
                                    </div>

                                    <p style={{ color: '#22c55e', fontSize: '14px', marginBottom: '10px' }}>
                                        {t.current}: {Number(gracePeriodDuration || 0)} giây
                                        <span style={{ color: '#94a3b8', marginLeft: '8px' }}>
                                            (= {(Number(gracePeriodDuration || 0) / 3600).toFixed(1)} giờ = {(Number(gracePeriodDuration || 0) / 86400).toFixed(2)} ngày)
                                        </span>
                                    </p>

                                    {/* Live Calculation */}
                                    {gracePeriodInput && (
                                        <div style={{ padding: '8px 12px', background: 'rgba(34,197,94,0.15)', borderRadius: '6px', marginBottom: '10px', fontSize: '13px', color: '#22c55e' }}>
                                            📊 Preview: {gracePeriodInput} giây = {(Number(gracePeriodInput) / 3600).toFixed(2)} giờ = {(Number(gracePeriodInput) / 86400).toFixed(3)} ngày
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            value={gracePeriodInput}
                                            onChange={(e) => setGracePeriodInput(e.target.value)}
                                            placeholder={t.parameters.gracePeriod.placeholder}
                                        />
                                        <button className="admin-btn-primary" onClick={handleSetGracePeriod} disabled={isWritePending}>
                                            {t.update}
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-section-card">
                                    <h3 className="admin-section-title">{lang === 'vi' ? 'Phí Dev (%)' : 'Dev Fee (%)'}</h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '10px' }}>
                                        {lang === 'vi' ? 'Phí trích từ phần thưởng (Tối đa 10%)' : 'Fee taken from rewards (Max 10%)'}. {t.current}: {Number(devFee || 0) / 100}%
                                    </p>

                                    {/* Enhanced Annotations */}
                                    <div style={{ padding: '12px', background: 'rgba(59,130,246,0.1)', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
                                        <div style={{ color: '#60a5fa', marginBottom: '4px' }}>📊 {lang === 'vi' ? 'VD: 200 = 2% phí → Thưởng 1000 = Dev nhận 20' : 'E.g.: 200 = 2% → Reward 1000 = Dev gets 20'}</div>
                                        <div style={{ color: '#4ade80', marginBottom: '4px' }}>💡 {lang === 'vi' ? 'Gợi ý: 100-300 (1%-3%)' : 'Recommend: 100-300 (1%-3%)'}</div>
                                        <div style={{ color: '#f59e0b' }}>⚠️ {lang === 'vi' ? 'Tối đa 1000 (10%), cao quá = ít hấp dẫn stakers' : 'Max 1000 (10%), too high = less attractive'}</div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            value={devFeeInput}
                                            onChange={(e) => setDevFeeInput(e.target.value)}
                                            placeholder={lang === 'vi' ? 'VD: 200 = 2%' : 'e.g. 200 = 2%'}
                                        />
                                        <button className="admin-btn-primary" onClick={handleSetDevFee} disabled={isWritePending}>
                                            {t.update}
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-section-card">
                                    <h3 className="admin-section-title">{lang === 'vi' ? 'Ví Dev' : 'Dev Wallet'}</h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '10px' }}>
                                        {lang === 'vi' ? 'Ví nhận phí Dev. Hiện tại' : 'Wallet receiving dev fees. Current'}:
                                        <span style={{ color: '#a855f7', marginLeft: '6px', fontFamily: 'monospace', fontSize: '11px' }}>{devWalletAddress as string}</span>
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            value={devWalletInput}
                                            onChange={(e) => setDevWalletInput(e.target.value)}
                                            placeholder="0x..."
                                        />
                                        <button className="admin-btn-primary" onClick={handleSetDevWallet} disabled={isWritePending}>
                                            {t.update}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Lock Options Tab - Enhanced */}
                        {activeTab === 'lockOptions' && (
                            <div className="admin-panel">
                                <h2 className="admin-panel-title">{t.lockOptions.title}</h2>
                                <p style={{ color: '#888', marginBottom: '20px' }}>{t.lockOptions.desc}</p>

                                {/* Pool Health Calculator */}
                                <div className="admin-section-card" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1))', borderColor: 'rgba(16,185,129,0.3)' }}>
                                    <h3 style={{ color: '#10b981', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        📊 {lang === 'vi' ? 'Tính Toán Sức Khỏe Pool' : 'Pool Health Calculator'}
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '15px' }}>
                                        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                            <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>{lang === 'vi' ? 'Tổng Đã Stake' : 'Total Staked'}</div>
                                            <div style={{ color: '#fff', fontSize: '16px', fontWeight: 600 }}>{formatNumber(totalStaked as bigint)}</div>
                                        </div>
                                        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                            <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>{lang === 'vi' ? 'Quỹ Thưởng' : 'Reward Bucket'}</div>
                                            <div style={{ color: '#22c55e', fontSize: '16px', fontWeight: 600 }}>{formatNumber(rewardBucket as bigint)}</div>
                                        </div>
                                        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                            <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>{lang === 'vi' ? 'Thưởng/Ngày' : 'Reward/Day'}</div>
                                            <div style={{ color: '#3b82f6', fontSize: '16px', fontWeight: 600 }}>
                                                {formatNumber(BigInt(Number(rewardRate || 0) * 86400))}
                                            </div>
                                        </div>
                                        <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                            <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>{lang === 'vi' ? 'Còn Lại' : 'Days Left'}</div>
                                            <div style={{
                                                color: Number(rewardBucket || 0) / (Number(rewardRate || 1) * 86400) < 30 ? '#ef4444' : '#22c55e',
                                                fontSize: '16px', fontWeight: 600
                                            }}>
                                                {rewardRate && Number(rewardRate) > 0
                                                    ? Math.floor(Number(rewardBucket || 0) / (Number(rewardRate) * 86400))
                                                    : '∞'
                                                } {lang === 'vi' ? 'ngày' : 'days'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pool Status Alert */}
                                    {rewardRate && Number(rewardRate) > 0 && (
                                        Number(rewardBucket || 0) / (Number(rewardRate) * 86400) < 30 ? (
                                            <div style={{ padding: '12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px' }}>
                                                <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: '4px' }}>⚠️ {lang === 'vi' ? 'Pool sắp hết!' : 'Pool running low!'}</div>
                                                <div style={{ color: '#f87171', fontSize: '13px' }}>
                                                    {lang === 'vi' ? 'Nên donate thêm' : 'Should donate'}: {formatNumber(BigInt(Number(rewardRate || 0) * 86400 * 90))} tokens ({lang === 'vi' ? 'cho 90 ngày' : 'for 90 days'})
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ padding: '12px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px' }}>
                                                <div style={{ color: '#22c55e', fontWeight: 600 }}>✅ {lang === 'vi' ? 'Pool khỏe mạnh' : 'Pool is healthy'}</div>
                                            </div>
                                        )
                                    )}
                                </div>

                                {/* Current Lock Options Cards - Dynamic from contract */}
                                <div className="admin-section-card" style={{ marginTop: '20px' }}>
                                    <h3 style={{ color: '#94a3b8', marginBottom: '15px' }}>🔒 {lang === 'vi' ? 'Các Gói Khóa Hiện Tại' : 'Current Lock Options'}</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                        {/* Option 0 - Flexible */}
                                        <div style={{ padding: '16px', background: 'rgba(96,165,250,0.1)', border: '2px solid rgba(96,165,250,0.3)', borderRadius: '12px' }}>
                                            <div style={{ color: '#60a5fa', fontWeight: 600, marginBottom: '8px' }}>0: {lockOption0 ? (Number((lockOption0 as any)[0]) === 0 ? 'Flexible' : `${Number((lockOption0 as any)[0])} Days`) : 'Loading...'}</div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Days: <span style={{ color: '#fff' }}>{lockOption0 ? Number((lockOption0 as any)[0]) : '?'}</span></div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Multiplier: <span style={{ color: '#60a5fa' }}>{lockOption0 ? (Number((lockOption0 as any)[1]) / 10000).toFixed(2) : '?'}x</span> ({lockOption0 ? Number((lockOption0 as any)[1]) : '?'} BP)</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                                                📌 Stake 1000 → {lockOption0 ? Math.floor((1000 * Number((lockOption0 as any)[1])) / 10000) : '?'} shares
                                            </div>
                                        </div>
                                        {/* Option 1 - 30 Days */}
                                        <div style={{ padding: '16px', background: 'rgba(74,222,128,0.1)', border: '2px solid rgba(74,222,128,0.3)', borderRadius: '12px' }}>
                                            <div style={{ color: '#4ade80', fontWeight: 600, marginBottom: '8px' }}>1: {lockOption1 ? `${Number((lockOption1 as any)[0])} Days` : 'Loading...'}</div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Days: <span style={{ color: '#fff' }}>{lockOption1 ? Number((lockOption1 as any)[0]) : '?'}</span></div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Multiplier: <span style={{ color: '#4ade80' }}>{lockOption1 ? (Number((lockOption1 as any)[1]) / 10000).toFixed(2) : '?'}x</span> ({lockOption1 ? Number((lockOption1 as any)[1]) : '?'} BP)</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                                                📌 Stake 1000 → {lockOption1 ? Math.floor((1000 * Number((lockOption1 as any)[1])) / 10000) : '?'} shares
                                            </div>
                                        </div>
                                        {/* Option 2 - 90 Days */}
                                        <div style={{ padding: '16px', background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)', borderRadius: '12px' }}>
                                            <div style={{ color: '#f59e0b', fontWeight: 600, marginBottom: '8px' }}>2: {lockOption2 ? `${Number((lockOption2 as any)[0])} Days` : 'Loading...'}</div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Days: <span style={{ color: '#fff' }}>{lockOption2 ? Number((lockOption2 as any)[0]) : '?'}</span></div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Multiplier: <span style={{ color: '#f59e0b' }}>{lockOption2 ? (Number((lockOption2 as any)[1]) / 10000).toFixed(2) : '?'}x</span> ({lockOption2 ? Number((lockOption2 as any)[1]) : '?'} BP)</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                                                📌 Stake 1000 → {lockOption2 ? Math.floor((1000 * Number((lockOption2 as any)[1])) / 10000) : '?'} shares
                                            </div>
                                        </div>
                                        {/* Option 3 - 180 Days */}
                                        <div style={{ padding: '16px', background: 'rgba(168,85,247,0.1)', border: '2px solid rgba(168,85,247,0.3)', borderRadius: '12px' }}>
                                            <div style={{ color: '#a855f7', fontWeight: 600, marginBottom: '8px' }}>3: {lockOption3 ? `${Number((lockOption3 as any)[0])} Days` : 'Loading...'}</div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Days: <span style={{ color: '#fff' }}>{lockOption3 ? Number((lockOption3 as any)[0]) : '?'}</span></div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Multiplier: <span style={{ color: '#a855f7' }}>{lockOption3 ? (Number((lockOption3 as any)[1]) / 10000).toFixed(2) : '?'}x</span> ({lockOption3 ? Number((lockOption3 as any)[1]) : '?'} BP)</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                                                📌 Stake 1000 → {lockOption3 ? Math.floor((1000 * Number((lockOption3 as any)[1])) / 10000) : '?'} shares
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Edit Lock Option Form */}
                                <div className="admin-section-card" style={{ marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h3 style={{ color: '#f59e0b', margin: 0 }}>✏️ Edit Lock Option</h3>
                                        {/* Feature 1: Batch/Single Toggle */}
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{lang === 'vi' ? 'Chế độ:' : 'Mode:'}</span>
                                            <button
                                                onClick={() => setBatchEditMode(false)}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: !batchEditMode ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                                                    border: 'none',
                                                    borderRadius: '6px 0 0 6px',
                                                    color: '#fff',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                {lang === 'vi' ? 'Đơn lẻ' : 'Single'}
                                            </button>
                                            <button
                                                onClick={() => { setBatchEditMode(true); loadCurrentValues(); }}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: batchEditMode ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                                                    border: 'none',
                                                    borderRadius: '0 6px 6px 0',
                                                    color: '#fff',
                                                    cursor: 'pointer',
                                                    fontSize: '12px'
                                                }}
                                            >
                                                {lang === 'vi' ? 'Hàng loạt' : 'Batch'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Feature 6: Preset Buttons */}
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>🎯 {lang === 'vi' ? 'Preset:' : 'Presets:'}</span>
                                        <button
                                            onClick={() => applyPreset('conservative')}
                                            style={{
                                                padding: '8px 16px',
                                                background: presetMode === 'conservative' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)',
                                                border: presetMode === 'conservative' ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: '8px',
                                                color: '#22c55e',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            🛡️ Conservative
                                        </button>
                                        <button
                                            onClick={() => applyPreset('balanced')}
                                            style={{
                                                padding: '8px 16px',
                                                background: presetMode === 'balanced' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)',
                                                border: presetMode === 'balanced' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: '8px',
                                                color: '#3b82f6',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            ⚖️ Balanced (AI)
                                        </button>
                                        <button
                                            onClick={() => applyPreset('aggressive')}
                                            style={{
                                                padding: '8px 16px',
                                                background: presetMode === 'aggressive' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
                                                border: presetMode === 'aggressive' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: '8px',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            🚀 Aggressive
                                        </button>
                                        <button
                                            onClick={loadCurrentValues}
                                            style={{
                                                padding: '8px 16px',
                                                background: 'rgba(255,255,255,0.1)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: '8px',
                                                color: '#94a3b8',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            🔄 {lang === 'vi' ? 'Tải từ Contract' : 'Load from Contract'}
                                        </button>
                                    </div>

                                    {/* Feature 3: Comparison Table */}
                                    <div style={{ marginBottom: '20px', overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                                                    <th style={{ padding: '10px', textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Option</th>
                                                    <th style={{ padding: '10px', textAlign: 'center', color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{lang === 'vi' ? 'Days Hiện tại' : 'Current Days'}</th>
                                                    <th style={{ padding: '10px', textAlign: 'center', color: '#a855f7', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{lang === 'vi' ? 'Days Đề xuất' : 'Suggested Days'}</th>
                                                    <th style={{ padding: '10px', textAlign: 'center', color: '#64748b', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{lang === 'vi' ? 'Mult Hiện tại' : 'Current Mult'}</th>
                                                    <th style={{ padding: '10px', textAlign: 'center', color: '#a855f7', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{lang === 'vi' ? 'Mult Đề xuất' : 'Suggested Mult'}</th>
                                                    <th style={{ padding: '10px', textAlign: 'center', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Δ%</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[lockOption0, lockOption1, lockOption2, lockOption3].map((opt, idx) => {
                                                    const currentDays = opt ? Number((opt as any)[0]) : 0;
                                                    const currentMult = opt ? Number((opt as any)[1]) : 10000;
                                                    const suggestedMult = suggestedOptions[idx]?.multiplier || 10000;
                                                    const change = currentMult > 0 ? ((suggestedMult - currentMult) / currentMult * 100) : 0;
                                                    const colors = ['#60a5fa', '#4ade80', '#f59e0b', '#a855f7'];
                                                    return (
                                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <td style={{ padding: '10px', color: colors[idx], fontWeight: 600 }}>{idx}: {suggestedOptions[idx]?.name}</td>
                                                            <td style={{ padding: '10px', textAlign: 'center', color: '#94a3b8' }}>{currentDays}d</td>
                                                            <td style={{ padding: '10px', textAlign: 'center', color: '#a855f7' }}>{suggestedOptions[idx]?.days}d</td>
                                                            <td style={{ padding: '10px', textAlign: 'center', color: '#94a3b8' }}>{(currentMult / 10000).toFixed(2)}x</td>
                                                            <td style={{ padding: '10px', textAlign: 'center', color: '#a855f7' }}>{(suggestedMult / 10000).toFixed(2)}x</td>
                                                            <td style={{ padding: '10px', textAlign: 'center', color: change > 0 ? '#22c55e' : change < 0 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>
                                                                {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Feature 2: Quick Apply All */}
                                    <button
                                        onClick={applyAllSuggestions}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            marginBottom: '20px',
                                            background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.2))',
                                            border: '1px solid rgba(168,85,247,0.4)',
                                            borderRadius: '10px',
                                            color: '#a855f7',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        📝 {lang === 'vi' ? 'Áp dụng tất cả gợi ý AI' : 'Apply All AI Suggestions'}
                                    </button>

                                    {/* Batch Edit Mode UI (Feature 1) */}
                                    {batchEditMode ? (
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                                {batchOptions.map((opt, idx) => {
                                                    const colors = ['#60a5fa', '#4ade80', '#f59e0b', '#a855f7'];
                                                    const names = ['Flexible', '30 Days', '90 Days', '180 Days'];
                                                    return (
                                                        <div key={idx} style={{ padding: '16px', background: `rgba(${idx === 0 ? '96,165,250' : idx === 1 ? '74,222,128' : idx === 2 ? '245,158,11' : '168,85,247'},0.1)`, border: `1px solid ${colors[idx]}40`, borderRadius: '10px' }}>
                                                            <div style={{ color: colors[idx], fontWeight: 600, marginBottom: '12px' }}>{idx}: {names[idx]}</div>

                                                            {/* Feature 4: Days Slider */}
                                                            <div style={{ marginBottom: '12px' }}>
                                                                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span>Days</span>
                                                                    <span style={{ color: colors[idx] }}>{opt.days}d</span>
                                                                </label>
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="365"
                                                                    value={opt.days}
                                                                    onChange={(e) => updateBatchOption(idx, 'days', e.target.value)}
                                                                    style={{ width: '100%', accentColor: colors[idx] }}
                                                                />
                                                            </div>

                                                            {/* Feature 4: Multiplier Slider */}
                                                            <div>
                                                                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span>Multiplier</span>
                                                                    <span style={{ color: colors[idx] }}>{(Number(opt.multiplier) / 10000).toFixed(2)}x ({opt.multiplier} BP)</span>
                                                                </label>
                                                                <input
                                                                    type="range"
                                                                    min="10000"
                                                                    max="30000"
                                                                    step="100"
                                                                    value={opt.multiplier}
                                                                    onChange={(e) => updateBatchOption(idx, 'multiplier', e.target.value)}
                                                                    style={{ width: '100%', accentColor: colors[idx] }}
                                                                />
                                                            </div>

                                                            {/* Feature 7: Preview Impact */}
                                                            {(() => {
                                                                const contractData = [lockOption0, lockOption1, lockOption2, lockOption3];
                                                                const currentMult = contractData[idx] ? Number((contractData[idx] as any)[1]) : 10000;
                                                                const impact = calculatePreviewImpact(Number(opt.days), currentMult, Number(opt.multiplier));
                                                                return (
                                                                    <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '10px' }}>
                                                                        <div style={{ color: '#64748b' }}>Stake 10K: {impact.currentShares} → {impact.newShares} shares</div>
                                                                        <div style={{ color: impact.change > 0 ? '#22c55e' : impact.change < 0 ? '#ef4444' : '#94a3b8' }}>
                                                                            ({impact.change > 0 ? '+' : ''}{impact.change.toFixed(1)}%)
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Single Edit Mode - Original Form with Sliders */
                                        <div style={{ marginBottom: '20px' }}>
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{ color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                                                    {t.lockOptions.optionId}
                                                </label>
                                                <select
                                                    className="admin-input"
                                                    value={lockOptionId}
                                                    onChange={(e) => {
                                                        const id = Number(e.target.value);
                                                        setLockOptionId(id);
                                                        const contractData = [lockOption0, lockOption1, lockOption2, lockOption3];
                                                        if (contractData[id]) {
                                                            setLockDays(String(Number((contractData[id] as any)[0])));
                                                            setLockMultiplier(String(Number((contractData[id] as any)[1])));
                                                        }
                                                    }}
                                                    style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                >
                                                    {[0, 1, 2, 3].map(id => {
                                                        const opt = [lockOption0, lockOption1, lockOption2, lockOption3][id];
                                                        return <option key={id} value={id}>{id}: {opt ? `${Number((opt as any)[0])}d - ${(Number((opt as any)[1]) / 10000).toFixed(2)}x` : 'Loading...'}</option>;
                                                    })}
                                                </select>
                                            </div>

                                            {/* Feature 4: Days Slider */}
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{ color: '#94a3b8', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span>{t.lockOptions.days}</span>
                                                    <span style={{ color: '#3b82f6' }}>{lockDays || 0}d</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="365"
                                                    value={lockDays || 0}
                                                    onChange={(e) => setLockDays(e.target.value)}
                                                    style={{ width: '100%', accentColor: '#3b82f6', marginBottom: '8px' }}
                                                />
                                                <input type="text" className="admin-input" value={lockDays} onChange={(e) => setLockDays(e.target.value)} placeholder="e.g., 30" />
                                            </div>

                                            {/* Feature 4: Multiplier Slider */}
                                            <div style={{ marginBottom: '16px' }}>
                                                <label style={{ color: '#94a3b8', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <span>{t.lockOptions.multiplier}</span>
                                                    <span style={{ color: '#10b981' }}>{(Number(lockMultiplier || 10000) / 10000).toFixed(2)}x ({lockMultiplier || 10000} BP)</span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="10000"
                                                    max="30000"
                                                    step="100"
                                                    value={lockMultiplier || 10000}
                                                    onChange={(e) => setLockMultiplier(e.target.value)}
                                                    style={{ width: '100%', accentColor: '#10b981', marginBottom: '8px' }}
                                                />
                                                <input type="text" className="admin-input" value={lockMultiplier} onChange={(e) => setLockMultiplier(e.target.value)} placeholder="e.g., 12000" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Feature 5: Validation Warnings */}
                                    {getValidationWarnings().length > 0 && (
                                        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px' }}>
                                            <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: '8px' }}>⚠️ {lang === 'vi' ? 'Cảnh báo:' : 'Warnings:'}</div>
                                            {getValidationWarnings().map((warning, idx) => (
                                                <div key={idx} style={{ fontSize: '12px', color: '#f87171', marginBottom: '4px' }}>{warning}</div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Update Button(s) */}
                                    {batchEditMode ? (
                                        <button
                                            className="admin-btn-primary"
                                            onClick={() => confirmAction(() => {
                                                // Execute batch updates (4 separate transactions)
                                                batchOptions.forEach((opt, idx) => {
                                                    setTimeout(() => {
                                                        writeContract({
                                                            address: STAKING_CONTRACT_ADDRESS,
                                                            abi: STAKING_ABI,
                                                            functionName: 'updateLockOption',
                                                            args: [BigInt(idx), BigInt(opt.days), BigInt(opt.multiplier)],
                                                            chainId: 196,
                                                        } as any);
                                                    }, idx * 1000); // Stagger transactions
                                                });
                                            })}
                                            disabled={isWritePending}
                                            style={{ width: '100%' }}
                                        >
                                            🚀 {lang === 'vi' ? 'Cập nhật TẤT CẢ 4 gói' : 'Update ALL 4 Options'}
                                        </button>
                                    ) : (
                                        <button
                                            className="admin-btn-primary"
                                            onClick={() => confirmAction(handleUpdateLockOption)}
                                            disabled={isWritePending}
                                        >
                                            {t.lockOptions.updateBtn}
                                        </button>
                                    )}
                                </div>

                                {/* Feature 8: Confirmation Modal */}
                                {showConfirmModal && (
                                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                                        <div style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', maxWidth: '500px', width: '90%', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <h3 style={{ color: '#f59e0b', marginBottom: '16px' }}>⚠️ {lang === 'vi' ? 'Xác nhận thay đổi' : 'Confirm Changes'}</h3>

                                            <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>{lang === 'vi' ? 'Bạn sắp cập nhật:' : 'You are about to update:'}</div>
                                                {batchEditMode ? (
                                                    batchOptions.map((opt, idx) => (
                                                        <div key={idx} style={{ fontSize: '12px', color: '#fff', marginBottom: '4px' }}>
                                                            • Option {idx}: {opt.days}d → {(Number(opt.multiplier) / 10000).toFixed(2)}x
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ fontSize: '12px', color: '#fff' }}>
                                                        • Option {lockOptionId}: {lockDays}d → {(Number(lockMultiplier) / 10000).toFixed(2)}x
                                                    </div>
                                                )}
                                            </div>

                                            {getValidationWarnings().length > 0 && (
                                                <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px' }}>
                                                    {getValidationWarnings().map((w, i) => <div key={i} style={{ fontSize: '11px', color: '#f87171' }}>{w}</div>)}
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <button
                                                    onClick={() => setShowConfirmModal(false)}
                                                    style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer' }}
                                                >
                                                    {lang === 'vi' ? 'Hủy' : 'Cancel'}
                                                </button>
                                                <button
                                                    onClick={executeConfirmedAction}
                                                    style={{ flex: 1, padding: '12px', background: '#10b981', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                                                >
                                                    ✅ {lang === 'vi' ? 'Xác nhận' : 'Confirm'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIP Tiers Tab */}
                        {activeTab === 'vipTiers' && (
                            <div className="admin-panel">
                                <h2 className="admin-panel-title">{t.vipTiers.title}</h2>
                                <p style={{ color: '#888', marginBottom: '20px' }}>{t.vipTiers.desc}</p>

                                <div className="admin-section-card">
                                    {/* Current Contract Tiers Display */}
                                    <div style={{ marginBottom: '25px', padding: '15px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px' }}>
                                        <h4 style={{ color: '#3b82f6', marginBottom: '12px', fontSize: '14px' }}>
                                            📋 {lang === 'en' ? 'Current Contract VIP Tiers' : 'Các Hạng VIP Hiện Tại Trên Hợp Đồng'}
                                        </h4>
                                        <div style={{ display: 'grid', gap: '8px' }}>
                                            {contractTier0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(205,127,50,0.15)', borderRadius: '6px' }}>
                                                    <span style={{ color: '#cd7f32' }}>🥉 {(contractTier0 as any)[0]}</span>
                                                    <span style={{ color: '#94a3b8' }}>{formatNumber((contractTier0 as any)[1])} tokens</span>
                                                </div>
                                            )}
                                            {contractTier1 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,215,0,0.15)', borderRadius: '6px' }}>
                                                    <span style={{ color: '#ffd700' }}>🥇 {(contractTier1 as any)[0]}</span>
                                                    <span style={{ color: '#94a3b8' }}>{formatNumber((contractTier1 as any)[1])} tokens</span>
                                                </div>
                                            )}
                                            {contractTier2 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(185,242,255,0.15)', borderRadius: '6px' }}>
                                                    <span style={{ color: '#b9f2ff' }}>💎 {(contractTier2 as any)[0]}</span>
                                                    <span style={{ color: '#94a3b8' }}>{formatNumber((contractTier2 as any)[1])} tokens</span>
                                                </div>
                                            )}
                                            {!contractTier0 && !contractTier1 && !contractTier2 && (
                                                <p style={{ color: '#64748b', fontSize: '13px' }}>
                                                    {lang === 'en' ? 'Loading contract tiers...' : 'Đang tải hạng từ hợp đồng...'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <p style={{ color: '#f59e0b', marginBottom: '20px' }}>{t.vipTiers.warning}</p>

                                    {/* Editable VIP Tiers */}
                                    <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                                        {vipTiers.map((tier, index) => (
                                            <div key={index} style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr auto',
                                                gap: '10px',
                                                alignItems: 'center',
                                                padding: '15px',
                                                background: 'rgba(0,0,0,0.3)',
                                                borderRadius: '8px'
                                            }}>
                                                <div>
                                                    <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                                        {t.vipTiers.tierName}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="admin-input"
                                                        value={tier.name}
                                                        onChange={(e) => updateVipTier(index, 'name', e.target.value)}
                                                        placeholder="e.g., GOLD"
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                                                        {t.vipTiers.minAmount} (tokens)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="admin-input"
                                                        value={tier.minAmount}
                                                        onChange={(e) => updateVipTier(index, 'minAmount', e.target.value)}
                                                        placeholder="e.g., 10000"
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removeVipTier(index)}
                                                    style={{
                                                        background: 'rgba(239,68,68,0.2)',
                                                        border: '1px solid #ef4444',
                                                        color: '#ef4444',
                                                        padding: '8px 12px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        marginTop: '18px'
                                                    }}
                                                    disabled={vipTiers.length <= 1}
                                                >
                                                    {t.vipTiers.removeTier}
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                        <button
                                            onClick={addVipTier}
                                            style={{
                                                background: 'rgba(34,197,94,0.2)',
                                                border: '1px solid #22c55e',
                                                color: '#22c55e',
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            + {t.vipTiers.addTier}
                                        </button>
                                    </div>

                                    <button
                                        className="admin-btn-primary"
                                        onClick={handleSetVIPTiers}
                                        disabled={isWritePending}
                                        style={{ width: '100%' }}
                                    >
                                        {t.vipTiers.updateBtn}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Funds Tab */}
                        {activeTab === 'funds' && (
                            <div className="admin-panel">
                                <h2 className="admin-panel-title">{t.funds.title}</h2>
                                <p style={{ color: '#888', marginBottom: '20px' }}>{t.funds.desc}</p>

                                <div className="admin-section-card">
                                    <h3 className="admin-section-title">{t.funds.donate.label}</h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '10px' }}>{t.funds.donate.hint}</p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            value={donateAmount}
                                            onChange={(e) => setDonateAmount(e.target.value)}
                                            placeholder={t.funds.donate.placeholder}
                                        />
                                        <button className="admin-btn-primary" onClick={handleDonate} disabled={isWritePending}>
                                            {t.funds.donate.btn}
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-section-card">
                                    <h3 className="admin-section-title">{t.funds.withdrawDev.label}</h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '10px' }}>{t.funds.withdrawDev.hint}</p>
                                    <p style={{ color: '#22c55e', fontSize: '18px', marginBottom: '15px' }}>
                                        {t.funds.withdrawDev.current}: {formatNumber(accumulatedDevFees as bigint)} tokens
                                    </p>
                                    <button className="admin-btn-primary" onClick={handleWithdrawDevFees} disabled={isWritePending}>
                                        {t.funds.withdrawDev.btn}
                                    </button>
                                </div>

                                <div className="admin-section-card">
                                    <h3 className="admin-section-title">{t.funds.withdrawDust.label}</h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '10px' }}>{t.funds.withdrawDust.hint}</p>
                                    <p style={{ color: '#22c55e', fontSize: '18px', marginBottom: '15px' }}>
                                        {t.funds.withdrawDust.current}: {healthCheck ? formatNumber((healthCheck as any)[3]) : '0'} tokens
                                    </p>
                                    <button className="admin-btn-primary" onClick={handleWithdrawDust} disabled={isWritePending}>
                                        {t.funds.withdrawDust.btn}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Stakers Tab */}
                        {activeTab === 'stakers' && (
                            <div className="admin-panel">
                                <h2 className="admin-panel-title">{lang === 'en' ? 'Stakers List' : 'Danh Sách Người Stake'}</h2>
                                <p style={{ color: '#888', marginBottom: '20px' }}>
                                    {lang === 'en'
                                        ? `Discovered ${stakerAddresses.length} unique addresses from event logs.`
                                        : `Tìm thấy ${stakerAddresses.length} địa chỉ duy nhất từ lịch sử sự kiện.`}
                                    <button
                                        onClick={fetchStakers}
                                        style={{ marginLeft: '15px', background: 'none', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '99px', fontSize: '11px' }}
                                        disabled={stakersLoading}
                                    >
                                        {stakersLoading ? '...' : '🔄 Refresh List'}
                                    </button>
                                </p>

                                <div style={{ display: 'grid', gap: '15px' }}>
                                    {stakerAddresses.length === 0 && !stakersLoading && (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                            No stakers found.
                                        </div>
                                    )}
                                    {stakerAddresses.map(userAddr => (
                                        <StakerDetail key={userAddr} address={userAddr} lang={lang} t={t} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* System Tab */}
                        {activeTab === 'system' && (
                            <div className="admin-panel">
                                <h2 className="admin-panel-title">{t.system.title}</h2>
                                <p style={{ color: '#888', marginBottom: '20px' }}>{t.system.desc}</p>

                                <div className="admin-section-card">
                                    <h3 className="admin-section-title">{t.system.pause.title}</h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>{t.system.pause.desc}</p>

                                    <p style={{ marginBottom: '15px' }}>
                                        <span style={{ color: '#94a3b8' }}>{t.system.pause.status}: </span>
                                        <span style={{ color: isPaused ? '#ef4444' : '#22c55e', fontWeight: 600 }}>
                                            {isPaused ? t.overview.paused : t.overview.active}
                                        </span>
                                    </p>

                                    <p style={{ color: '#f59e0b', marginBottom: '15px', fontSize: '13px' }}>{t.system.pause.warning}</p>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            className="admin-btn-danger"
                                            onClick={handlePause}
                                            disabled={isWritePending || Boolean(isPaused)}
                                            style={{ opacity: isPaused ? 0.5 : 1 }}
                                        >
                                            {t.system.pause.pauseBtn}
                                        </button>
                                        <button
                                            className="admin-btn-primary"
                                            onClick={handleUnpause}
                                            disabled={isWritePending || !isPaused}
                                            style={{ opacity: !isPaused ? 0.5 : 1 }}
                                        >
                                            {t.system.pause.unpauseBtn}
                                        </button>
                                    </div>
                                </div>

                                {/* DeFi Enable/Disable Toggle */}
                                <div className="admin-section-card" style={{ marginTop: '20px' }}>
                                    <h3 className="admin-section-title">
                                        {lang === 'en' ? 'DeFi Section Toggle' : 'Bật/Tắt DeFi'}
                                    </h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '15px' }}>
                                        {lang === 'en'
                                            ? 'Enable or disable the entire DeFi section. When disabled, users cannot access /defi pages.'
                                            : 'Bật hoặc tắt toàn bộ phần DeFi. Khi tắt, người dùng không thể truy cập các trang /defi.'}
                                    </p>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '15px',
                                        background: defiEnabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                        border: `1px solid ${defiEnabled ? '#22c55e' : '#ef4444'}`,
                                        borderRadius: '10px'
                                    }}>
                                        <div>
                                            <span style={{ color: '#fff', fontWeight: 600 }}>DeFi Hub</span>
                                            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                                                /defi, /defi/staking, ...
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => toggleDefi(!defiEnabled)}
                                            style={{
                                                padding: '10px 24px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                background: defiEnabled ? '#ef4444' : '#22c55e',
                                                color: '#fff'
                                            }}
                                        >
                                            {defiEnabled
                                                ? (lang === 'en' ? '🚫 Disable' : '🚫 Tắt')
                                                : (lang === 'en' ? '✅ Enable' : '✅ Bật')}
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-section-card">
                                    <h3 className="admin-section-title">{t.system.contractInfo.title}</h3>
                                    <div style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                            <span style={{ color: '#94a3b8' }}>{t.system.contractInfo.address}</span>
                                            <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '12px' }}>
                                                {STAKING_CONTRACT_ADDRESS.slice(0, 10)}...{STAKING_CONTRACT_ADDRESS.slice(-8)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                            <span style={{ color: '#94a3b8' }}>{t.system.contractInfo.token}</span>
                                            <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '12px' }}>
                                                {BANMAO_TOKEN_ADDRESS.slice(0, 10)}...{BANMAO_TOKEN_ADDRESS.slice(-8)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                                            <span style={{ color: '#94a3b8' }}>{t.system.contractInfo.devFee}</span>
                                            <span style={{ color: '#fff' }}>{Number(devFee || 0) / 100}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            )}
        </div>
    );
}
