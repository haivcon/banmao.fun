"use client";

import { useCallback, useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import {
    STAKING_CONTRACT_ADDRESS,
    BANMAO_TOKEN_ADDRESS, // Changed from BANMAO_TOKEN_TESTNET
    XLAYER_CHAIN_ID, // Added XLAYER_CHAIN_ID
    STAKING_ABI,
    ERC20_ABI,
    LOCK_OPTIONS_INFO,
    UserSummary,
    MAX_STAKES_PER_USER,
} from './contracts';

// XLayer Mainnet Chain ID (using value from contracts.ts)
// Note: XLAYER_CHAIN_ID is imported from './contracts'

// Types
export interface GlobalStats {
    totalStaked: bigint;
    totalShares: bigint;
    rewardBucket: bigint;
    rewardRate: bigint;
    minStake: bigint;
    maxStake: bigint;
    penalty: bigint;
    gracePeriod: bigint;
    isPaused: boolean;
}

export interface HealthCheck {
    rewardsLeft: bigint;
    daysLeft: bigint;
    isHealthy: boolean;
    dust: bigint;
}

// Format token amount
export const formatTokenAmount = (value: bigint | undefined, decimals = 2): string => {
    if (!value) return '0';
    const num = Number(formatEther(value));
    if (num === 0) return '0';
    if (num >= 1_000_000) return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
    if (num >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
};

// Main staking hook for V28 (multi-stake tracking)
export function useStaking() {
    const { address, isConnected } = useAccount();

    // Chain management
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const isCorrectChain = chainId === XLAYER_CHAIN_ID;

    // Helper to ensure correct chain before transactions
    const ensureCorrectChain = useCallback(async (): Promise<boolean> => {
        if (chainId !== XLAYER_CHAIN_ID) {
            try {
                await switchChain({ chainId: XLAYER_CHAIN_ID });
                return true;
            } catch (error) {
                console.error('Failed to switch chain:', error);
                return false;
            }
        }
        return true;
    }, [chainId, switchChain]);

    // ============ Read User Summary ============
    const { data: userSummaryData, refetch: refetchUserSummary } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'userSummary',
        args: address ? [address] : undefined,
        chainId: XLAYER_CHAIN_ID,
    });

    const userSummary: UserSummary | null = userSummaryData ? {
        totalAmount: userSummaryData[0],
        totalShares: userSummaryData[1],
        rewardDebt: userSummaryData[2],
        stakeCount: Number(userSummaryData[3]),
        nextStakeId: Number(userSummaryData[4]),
        lastStakeBlock: userSummaryData[5],
    } : null;

    // For backwards compat with old UI
    const userInfo = userSummary ? {
        amount: userSummary.totalAmount,
        shares: userSummary.totalShares,
        rewardDebt: userSummary.rewardDebt,
        lockEndTime: BigInt(0), // V28 has lock per stake
        lastLockDuration: BigInt(0),
        lastStakeBlock: userSummary.lastStakeBlock,
    } : null;

    // ============ Read User Stake IDs ============
    const { data: stakeIds, refetch: refetchStakeIds } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getUserStakeIds',
        args: address ? [address] : undefined,
        chainId: XLAYER_CHAIN_ID,
    });

    // ============ Read Pending Rewards ============
    const { data: pendingRewardData, refetch: refetchPendingReward } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'pendingRewards',
        args: address ? [address] : undefined,
        chainId: XLAYER_CHAIN_ID,
    });

    const pendingReward = (pendingRewardData as bigint) || BigInt(0);

    // ============ Read VIP Tier ============
    const { data: vipTierData, refetch: refetchVIP } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getVIPTier',
        args: address ? [address] : undefined,
        chainId: XLAYER_CHAIN_ID,
    });

    const vipTier = (vipTierData as string) || 'NONE';

    // ============ Read Token Balance & Allowance ============
    const { data: balance, refetch: refetchBalance } = useReadContract({ // Changed tokenBalance to balance
        address: BANMAO_TOKEN_ADDRESS, // Changed from BANMAO_TOKEN_TESTNET
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        chainId: XLAYER_CHAIN_ID,
    });

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, STAKING_CONTRACT_ADDRESS] : undefined,
        chainId: XLAYER_CHAIN_ID,
    });

    // ============ Read Global Stats ============
    const { data: totalStaked } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'totalStaked',
        chainId: XLAYER_CHAIN_ID,
        query: { refetchInterval: 15000 }, // Reduced from 5s to 15s
    });

    const { data: totalShares } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'totalShares',
        chainId: XLAYER_CHAIN_ID,
        query: { refetchInterval: 15000 }, // Reduced from 5s to 15s
    });

    const { data: rewardBucket } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'rewardBucket',
        chainId: XLAYER_CHAIN_ID,
        query: { refetchInterval: 15000 }, // Reduced from 5s to 15s
    });

    const { data: rewardRate } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'rewardRatePerSecond',
        chainId: XLAYER_CHAIN_ID,
        query: { refetchInterval: 15000 }, // Reduced from 5s to 15s
    });

    const { data: minStake } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'minStakeAmount',
        chainId: XLAYER_CHAIN_ID,
    });

    const { data: maxStake } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'maxStakePerWallet',
        chainId: XLAYER_CHAIN_ID,
    });

    const { data: penalty } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'earlyUnstakePenalty',
        chainId: XLAYER_CHAIN_ID,
    });

    const { data: gracePeriod } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'gracePeriodDuration',
        chainId: XLAYER_CHAIN_ID,
    });

    const { data: isPaused } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'paused',
        chainId: XLAYER_CHAIN_ID,
    });

    // ============ Read Health Check ============
    const { data: healthData } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'getGlobalHealthCheck',
        chainId: XLAYER_CHAIN_ID,
    });

    const healthCheck: HealthCheck = healthData ? {
        rewardsLeft: (healthData as any)[0],
        daysLeft: (healthData as any)[1],
        isHealthy: (healthData as any)[2],
        dust: (healthData as any)[3],
    } : {
        rewardsLeft: BigInt(0),
        daysLeft: BigInt(0),
        isHealthy: true,
        dust: BigInt(0),
    };

    // ============ Read Reward Calculation Parameters ============
    const { data: accRewardPerShareData } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'accRewardPerShare',
        chainId: XLAYER_CHAIN_ID,
        query: { refetchInterval: 30000 }, // Reduced from 10s to 30s
    });

    const { data: devFeeData } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'devFee',
        chainId: XLAYER_CHAIN_ID,
    });

    const accRewardPerShare = (accRewardPerShareData as bigint) || BigInt(0);
    const devFee = (devFeeData as bigint) || BigInt(200); // Default 2%


    const { data: lockOption0 } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'lockOptions',
        args: [BigInt(0)],
        chainId: XLAYER_CHAIN_ID,
    });

    const { data: lockOption1 } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'lockOptions',
        args: [BigInt(1)],
        chainId: XLAYER_CHAIN_ID,
    });

    const { data: lockOption2 } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'lockOptions',
        args: [BigInt(2)],
        chainId: XLAYER_CHAIN_ID,
    });

    const { data: lockOption3 } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'lockOptions',
        args: [BigInt(3)],
        chainId: XLAYER_CHAIN_ID,
    });

    // Build dynamic lock options from contract data (fallback to static if not loaded)
    const lockOptionsInfo = [
        {
            id: 0,
            name: lockOption0 ? (Number((lockOption0 as any)[0]) === 0 ? 'Flexible' : `${Number((lockOption0 as any)[0])} Days`) : 'Flexible',
            days: lockOption0 ? Number((lockOption0 as any)[0]) : 0,
            daysLocked: lockOption0 ? Number((lockOption0 as any)[0]) : 0,
            multiplier: lockOption0 ? Number((lockOption0 as any)[1]) / 10000 : 1.0,
            color: '#60a5fa',
        },
        {
            id: 1,
            name: lockOption1 ? `${Number((lockOption1 as any)[0])} Days` : '30 Days',
            days: lockOption1 ? Number((lockOption1 as any)[0]) : 30,
            daysLocked: lockOption1 ? Number((lockOption1 as any)[0]) : 30,
            multiplier: lockOption1 ? Number((lockOption1 as any)[1]) / 10000 : 1.2,
            color: '#4ade80',
        },
        {
            id: 2,
            name: lockOption2 ? `${Number((lockOption2 as any)[0])} Days` : '90 Days',
            days: lockOption2 ? Number((lockOption2 as any)[0]) : 90,
            daysLocked: lockOption2 ? Number((lockOption2 as any)[0]) : 90,
            multiplier: lockOption2 ? Number((lockOption2 as any)[1]) / 10000 : 1.5,
            color: '#f59e0b',
        },
        {
            id: 3,
            name: lockOption3 ? `${Number((lockOption3 as any)[0])} Days` : '180 Days',
            days: lockOption3 ? Number((lockOption3 as any)[0]) : 180,
            daysLocked: lockOption3 ? Number((lockOption3 as any)[0]) : 180,
            multiplier: lockOption3 ? Number((lockOption3 as any)[1]) / 10000 : 2.0,
            color: '#a855f7',
        },
    ];

    // Aggregate global stats
    const globalStats: GlobalStats = {
        totalStaked: (totalStaked as bigint) || BigInt(0),
        totalShares: (totalShares as bigint) || BigInt(0),
        rewardBucket: (rewardBucket as bigint) || BigInt(0),
        rewardRate: (rewardRate as bigint) || BigInt(0),
        minStake: (minStake as bigint) || BigInt(0),
        maxStake: (maxStake as bigint) || BigInt(0),
        penalty: (penalty as bigint) || BigInt(0),
        gracePeriod: (gracePeriod as bigint) || BigInt(0),
        isPaused: (isPaused as boolean) || false,
    };

    // ============ Write Contract Functions ============
    const { writeContract, data: writeHash, isPending: isWritePending, error: writeError } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: writeHash,
    });

    // Approve token - uses unlimited approval for better UX
    const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

    const approve = useCallback(async () => {
        const onCorrectChain = await ensureCorrectChain();
        if (!onCorrectChain) return;

        writeContract({
            address: BANMAO_TOKEN_ADDRESS, // Changed from BANMAO_TOKEN_TESTNET
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [STAKING_CONTRACT_ADDRESS, MAX_UINT256],
        } as any);
    }, [writeContract, ensureCorrectChain]);

    // Stake tokens
    const stake = useCallback(async (amount: string, lockOptionId: number) => {
        const onCorrectChain = await ensureCorrectChain();
        if (!onCorrectChain) return;

        const amountWei = parseEther(amount);
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'stake',
            args: [amountWei, BigInt(lockOptionId)],
        } as any);
    }, [writeContract, ensureCorrectChain]);

    // Legacy unstake (for backwards compat - unstakes first stake)
    const unstake = useCallback(async (amount: string) => {
        const onCorrectChain = await ensureCorrectChain();
        if (!onCorrectChain) return;

        // In V28, we need to unstake by ID. Try to unstake the first stake.
        if (stakeIds && (stakeIds as bigint[]).length > 0) {
            const firstStakeId = (stakeIds as bigint[])[0];
            writeContract({
                address: STAKING_CONTRACT_ADDRESS,
                abi: STAKING_ABI,
                functionName: 'unstakeById',
                args: [firstStakeId],
            } as any);
        }
    }, [writeContract, ensureCorrectChain, stakeIds]);

    // Unstake by ID (new V28 function)
    const unstakeById = useCallback(async (stakeId: number) => {
        const onCorrectChain = await ensureCorrectChain();
        if (!onCorrectChain) return;

        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'unstakeById',
            args: [BigInt(stakeId)],
        } as any);
    }, [writeContract, ensureCorrectChain]);

    // Unstake partial (new V28 function)
    const unstakePartial = useCallback(async (stakeId: number, amount: string) => {
        const onCorrectChain = await ensureCorrectChain();
        if (!onCorrectChain) return;

        const amountWei = parseEther(amount);
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'unstakePartial',
            args: [BigInt(stakeId), amountWei],
        } as any);
    }, [writeContract, ensureCorrectChain]);

    // Claim rewards
    const claimReward = useCallback(async () => {
        const onCorrectChain = await ensureCorrectChain();
        if (!onCorrectChain) return;

        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'claimReward',
        } as any);
    }, [writeContract, ensureCorrectChain]);

    // Auto compound
    const autoCompound = useCallback(async () => {
        const onCorrectChain = await ensureCorrectChain();
        if (!onCorrectChain) return;

        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'autoCompound',
        } as any);
    }, [writeContract, ensureCorrectChain]);

    // Emergency withdraw
    const emergencyWithdraw = useCallback(async () => {
        const onCorrectChain = await ensureCorrectChain();
        if (!onCorrectChain) return;

        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'emergencyWithdraw',
        } as any);
    }, [writeContract, ensureCorrectChain]);

    // Donate to reward pool
    const donate = useCallback(async (amount: string) => {
        const onCorrectChain = await ensureCorrectChain();
        if (!onCorrectChain) return;

        const amountWei = parseEther(amount);
        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'donate',
            args: [amountWei],
        } as any);
    }, [writeContract, ensureCorrectChain]);

    // Relock stake to new lock option (V30)
    const relock = useCallback(async (stakeId: number, newLockOptionId: number) => {
        const onCorrectChain = await ensureCorrectChain();
        if (!onCorrectChain) return;

        writeContract({
            address: STAKING_CONTRACT_ADDRESS,
            abi: STAKING_ABI,
            functionName: 'relock',
            args: [BigInt(stakeId), BigInt(newLockOptionId)],
        } as any);
    }, [writeContract, ensureCorrectChain]);

    // Refetch all data
    const refetchAll = useCallback(() => {
        refetchUserSummary();
        refetchStakeIds();
        refetchPendingReward();
        refetchVIP();
        refetchBalance();
        refetchAllowance();
    }, [refetchUserSummary, refetchStakeIds, refetchPendingReward, refetchVIP, refetchBalance, refetchAllowance]);

    // Check if user needs to approve
    const needsApproval = (amount: string): boolean => {
        if (!allowance) return true;
        try {
            const amountWei = parseEther(amount);
            return (allowance as bigint) < amountWei;
        } catch {
            return true;
        }
    };

    // Get lock option info
    const getLockOption = (id: number) => lockOptionsInfo[id] || lockOptionsInfo[0];

    // Get time remaining for a lock
    const getTimeRemaining = (lockEndTime: bigint): { days: number; hours: number; minutes: number; isLocked: boolean } => {
        const now = BigInt(Math.floor(Date.now() / 1000));
        if (lockEndTime <= now) {
            return { days: 0, hours: 0, minutes: 0, isLocked: false };
        }
        const remaining = Number(lockEndTime - now);
        return {
            days: Math.floor(remaining / 86400),
            hours: Math.floor((remaining % 86400) / 3600),
            minutes: Math.floor((remaining % 3600) / 60),
            isLocked: true,
        };
    };

    // Auto-refetch data when transaction is confirmed
    useEffect(() => {
        if (isConfirmed) {
            console.log('Transaction confirmed! Refetching all data...');
            // Small delay to ensure blockchain state is updated
            const timer = setTimeout(() => {
                refetchAll();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isConfirmed, refetchAll]);

    // Periodic refetch for pending rewards (every 30 seconds)
    useEffect(() => {
        if (!address) return;
        const interval = setInterval(() => {
            refetchPendingReward();
        }, 30000);
        return () => clearInterval(interval);
    }, [address, refetchPendingReward]);

    // Debug log
    useEffect(() => {
        console.log('=== STAKING V28 DEBUG ===');
        console.log('Contract:', STAKING_CONTRACT_ADDRESS);
        console.log('User Summary:', userSummary);
        console.log('Stake IDs:', stakeIds);
        console.log('Pending Reward:', pendingReward?.toString());
        console.log('=========================');
    }, [userSummary, stakeIds, pendingReward]);

    return {
        // State
        isConnected,
        address,
        userInfo,            // Backwards compat
        userSummary,         // V28 user summary
        stakeIds: (stakeIds as bigint[]) || [],  // V28 stake IDs
        vipTier,
        tokenBalance: (balance as bigint) || BigInt(0),
        allowance: (allowance as bigint) || BigInt(0),
        pendingReward,
        globalStats,
        healthCheck,
        isCorrectChain,
        accRewardPerShare,   // For detailed reward calculation
        devFee,              // DEV fee percentage (basis points)

        // Actions
        approve,
        stake,
        unstake,             // Backwards compat
        unstakeById,         // V28
        unstakePartial,      // V28
        claimReward,
        autoCompound,
        emergencyWithdraw,
        donate,
        relock,              // V30
        refetchAll,

        // Transaction state
        isWritePending,
        isConfirming,
        isConfirmed,
        writeError,

        // Utilities
        needsApproval,
        getLockOption,
        getTimeRemaining,
        formatTokenAmount,
        LOCK_OPTIONS_INFO: lockOptionsInfo,
        MAX_STAKES_PER_USER,
    };
}
