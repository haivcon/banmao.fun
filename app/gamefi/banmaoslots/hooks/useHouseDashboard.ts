// useHouseDashboard.ts - Hook for House Owner Pool Management
import { useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { slotsToast } from '../lib/toastUtils';
import { SlotsTranslations } from '../lib/i18n/types';
import {
    SLOTS_ABI,
    ERC20_ABI,
    SLOTS_CONTRACT_ADDRESS,
    BANMAO_TOKEN_ADDRESS,
    parseTokenAmount,
    formatTokenAmount
} from '../lib/abis';

// Pool struct type
export interface Pool {
    id: bigint;
    owner: string;
    name: string;
    balance: bigint;
    minBet: bigint;
    maxBet: bigint;
    jackpotPercent: bigint;
    jackpotPool: bigint;
    totalSpins: bigint;
    totalBetsVolume: bigint;
    totalPayoutsVolume: bigint;
    totalPendingBets: bigint;
    isActive: boolean;
    createdAt: bigint;
}

export function useHouseDashboard(t?: SlotsTranslations) {
    const { address } = useAccount();
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
    const publicClient = usePublicClient();

    // Contract writes
    const { writeContractAsync: writeContract, isPending: isWritePending } = useWriteContract();

    // Wait for transaction
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash as `0x${string}`,
    });

    // Read user's owned pools (using getUserPools function that returns full array)
    const { data: userPoolIds, refetch: refetchUserPools } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'getUserPools',
        args: address ? [address] : undefined,
    });

    // Read min pool deposit requirement
    const { data: minPoolDeposit } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'minPoolDeposit',
    });

    // Read max pools per user
    const { data: maxPoolsPerUser } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'maxPoolsPerUser',
    });

    // Read active pool count
    const { data: activePoolCount } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'activePoolCount',
    });

    // Read platform pool ID (for contract owner to manage)
    const { data: platformPoolId } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'platformPoolId',
    });

    // Read contract owner
    const { data: contractOwner } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'owner',
    });

    // Check if current user is contract owner
    const isContractOwner = address && contractOwner &&
        address.toLowerCase() === (contractOwner as string).toLowerCase();

    // Combine user pools with platform pool if user is contract owner
    const pPoolId = platformPoolId as bigint | undefined;
    const userPoolArray = (userPoolIds as bigint[]) || [];

    // If user is contract owner and platform pool exists, include it
    const allUserPoolIds = isContractOwner && pPoolId && pPoolId > BigInt(0)
        ? [pPoolId, ...userPoolArray.filter(id => id !== pPoolId)]
        : userPoolArray;

    // Read token allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, SLOTS_CONTRACT_ADDRESS as `0x${string}`] : undefined,
    });

    // Read token balance
    const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // Approve tokens for contract - UNLIMITED approval (one-time)
    const handleApprove = useCallback(async (amount: bigint) => {
        const toastId = slotsToast.loading(t?.toastApproving || 'Approving tokens (one-time unlimited)...');
        try {
            // Use MAX_UINT256 for unlimited approval - user only needs to approve once
            const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            const hash = await writeContract({
                address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [SLOTS_CONTRACT_ADDRESS as `0x${string}`, MAX_UINT256],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastApprovalGranted || 'Unlimited approval granted!');
                refetchAllowance();
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastApprovalFailed || 'Approval failed', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, refetchAllowance, publicClient]);

    // Create a new pool
    const handleCreatePool = useCallback(async (
        name: string,
        initialDeposit: string,
        minBet: string,
        maxBet: string,
        jackpotPercent: number
    ) => {
        const toastId = slotsToast.loading(t?.toastCreatingPool || 'Creating pool...');
        try {
            const depositAmount = parseTokenAmount(initialDeposit);
            const minBetAmount = parseTokenAmount(minBet);
            const maxBetAmount = parseTokenAmount(maxBet);

            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'createPool',
                args: [name, depositAmount, minBetAmount, maxBetAmount, BigInt(jackpotPercent)],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastPoolCreated || 'Pool created successfully!');
                refetchUserPools();
                refetchBalance();
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastPoolCreateFailed || 'Failed to create pool', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, refetchUserPools, refetchBalance, publicClient]);

    // Deposit to pool
    const handleDeposit = useCallback(async (poolId: bigint, amount: string) => {
        const toastId = slotsToast.loading(t?.toastDepositing || 'Depositing...', 'deposit');
        try {
            const depositAmount = parseTokenAmount(amount);
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'depositToPool',
                args: [poolId, depositAmount],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastDepositSuccess || 'Deposit successful!');
                refetchBalance();
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastDepositFailed || 'Deposit failed', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, refetchBalance, publicClient]);

    // Withdraw from pool
    const handleWithdraw = useCallback(async (poolId: bigint, amount: string) => {
        const toastId = slotsToast.loading(t?.toastWithdrawing || 'Withdrawing...', 'withdraw');
        try {
            const withdrawAmount = parseTokenAmount(amount);
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'withdrawFromPool',
                args: [poolId, withdrawAmount],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastWithdrawSuccess || 'Withdrawal successful!');
                refetchBalance();
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastWithdrawFailed || 'Withdrawal failed', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, refetchBalance, publicClient]);

    // Update pool settings
    const handleUpdateSettings = useCallback(async (
        poolId: bigint,
        minBet: string,
        maxBet: string,
        jackpotPercent: number
    ) => {
        const toastId = slotsToast.loading(t?.toastUpdatingSettings || 'Updating settings...', 'settings');
        try {
            const minBetAmount = parseTokenAmount(minBet);
            const maxBetAmount = parseTokenAmount(maxBet);
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'updatePoolSettings',
                args: [poolId, minBetAmount, maxBetAmount, BigInt(jackpotPercent)],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastSettingsUpdated || 'Settings updated!');
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastUpdateFailed || 'Failed to update', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, publicClient]);

    // Deactivate pool
    const handleDeactivate = useCallback(async (poolId: bigint) => {
        const toastId = slotsToast.loading(t?.toastDeactivatingPool || 'Deactivating pool...');
        try {
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'deactivatePool',
                args: [poolId],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastPoolDeactivated || 'Pool deactivated!');
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastOperationFailed || 'Operation failed', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, publicClient]);

    // Reactivate pool
    const handleReactivate = useCallback(async (poolId: bigint) => {
        const toastId = slotsToast.loading(t?.toastReactivatingPool || 'Reactivating pool...');
        try {
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'reactivatePool',
                args: [poolId],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastPoolReactivated || 'Pool reactivated!');
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastOperationFailed || 'Operation failed', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, publicClient]);

    // Close pool permanently
    const handleClosePool = useCallback(async (poolId: bigint) => {
        const toastId = slotsToast.loading(t?.toastClosingPool || 'Closing pool...');
        try {
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'closePool',
                args: [poolId],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastPoolClosed || 'Pool closed! Funds returned.');
                refetchUserPools();
                refetchBalance();
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastOperationFailed || 'Operation failed', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, refetchUserPools, refetchBalance, publicClient]);

    // Transfer pool ownership
    const handleTransferOwnership = useCallback(async (poolId: bigint, newOwner: string) => {
        const toastId = slotsToast.loading(t?.toastTransferringOwnership || 'Transferring ownership...');
        try {
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'transferPoolOwnership',
                args: [poolId, newOwner as `0x${string}`],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastOwnershipTransferred || 'Ownership transferred!');
                refetchUserPools();
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastOperationFailed || 'Operation failed', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, refetchUserPools, publicClient]);

    // Settle expired commit for a player (Owner Only)
    const handleSettleExpiredByOwner = useCallback(async (poolId: bigint, player: string) => {
        const toastId = slotsToast.loading(t?.toastSettlingCommit || 'Settling expired commit...');
        try {
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'settleExpiredCommitByOwner',
                args: [poolId, player as `0x${string}`],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastCommitSettled || 'Commit settled! Funds released.');
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastSettleFailed || 'Failed to settle', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, publicClient]);

    // Batch settle all expired commits for a pool (Owner Only)
    const handleBatchSettleExpired = useCallback(async (
        poolId: bigint,
        maxCount: number = 50,
        startIndex: number = 0,
        maxIterations: number = 200
    ) => {
        const toastId = slotsToast.loading(t?.toastBatchSettling || 'Batch settling expired commits...');
        try {
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'batchSettleExpiredCommits',
                args: [poolId, BigInt(maxCount), BigInt(startIndex), BigInt(maxIterations)],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastBatchSettleComplete || 'Batch settle completed!');
                await refetchUserPools();
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastOperationFailed || 'Batch settle failed', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, publicClient, refetchUserPools]);

    // Get expired pending players for a pool (View function)
    const handleGetExpiredPlayers = useCallback(async (
        poolId: bigint,
        offset: number = 0,
        limit: number = 100
    ): Promise<{ expiredPlayers: string[]; expiredBets: bigint[]; totalPending: bigint } | null> => {
        if (!publicClient) return null;
        try {
            const result = await publicClient.readContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'getExpiredPendingPlayers',
                args: [poolId, BigInt(offset), BigInt(limit)],
            } as any);
            const [expiredPlayers, expiredBets, totalPending] = result as [string[], bigint[], bigint];
            return { expiredPlayers, expiredBets, totalPending };
        } catch (err) {
            console.error('Failed to get expired players:', err);
            return null;
        }
    }, [publicClient]);

    // Get pending players count for a pool
    const handleGetPendingCount = useCallback(async (poolId: bigint): Promise<bigint | null> => {
        if (!publicClient) return null;
        try {
            const result = await publicClient.readContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'getPendingPlayersCount',
                args: [poolId],
            } as any);
            return result as bigint;
        } catch (err) {
            console.error('Failed to get pending count:', err);
            return null;
        }
    }, [publicClient]);

    // ============ Protection Handlers ============

    // Update protection settings
    const handleUpdateProtectionSettings = useCallback(async (
        poolId: bigint,
        dynamicMaxBetEnabled: boolean,
        lowBalanceThreshold: number,
        criticalBalanceThreshold: number,
        streakProtectionEnabled: boolean,
        hourlyPayoutLimit: number,
        emergencyCooldown: number
    ) => {
        const toastId = slotsToast.loading(t?.toastUpdatingProtection || 'Updating protection settings...');
        try {
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'updateProtectionSettings',
                args: [
                    poolId,
                    dynamicMaxBetEnabled,
                    BigInt(lowBalanceThreshold),
                    BigInt(criticalBalanceThreshold),
                    streakProtectionEnabled,
                    BigInt(hourlyPayoutLimit),
                    BigInt(emergencyCooldown)
                ],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastProtectionUpdated || 'Protection settings updated!');
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastOperationFailed || 'Operation failed', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, publicClient]);

    // Trigger emergency withdraw
    const handleTriggerEmergency = useCallback(async (poolId: bigint) => {
        const toastId = slotsToast.loading(t?.toastOperationFailed || 'Triggering emergency mode...');
        try {
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'triggerEmergencyWithdraw',
                args: [poolId],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastOperationFailed || 'Emergency triggered! Pool paused. Cooldown started.');
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastOperationFailed || 'Operation failed', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, publicClient]);

    // Execute emergency withdraw
    const handleExecuteEmergencyWithdraw = useCallback(async (poolId: bigint) => {
        const toastId = slotsToast.loading(t?.toastOperationFailed || 'Executing emergency withdraw...');
        try {
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'executeEmergencyWithdraw',
                args: [poolId],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastOperationFailed || 'Emergency withdraw completed!');
                refetchBalance();
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastOperationFailed || 'Operation failed', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, publicClient, refetchBalance]);

    // Cancel emergency
    const handleCancelEmergency = useCallback(async (poolId: bigint) => {
        const toastId = slotsToast.loading(t?.toastOperationFailed || 'Cancelling emergency...');
        try {
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'cancelEmergency',
                args: [poolId],
            } as any);
            setTxHash(hash);

            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                slotsToast.updateSuccess(toastId, t?.toastOperationFailed || 'Emergency cancelled!');
            }
            return hash;
        } catch (err: unknown) {
            slotsToast.updateError(toastId, t?.toastOperationFailed || 'Operation failed', err instanceof Error ? err.message : (t?.toastOperationFailed || 'Operation failed'));
            throw err;
        }
    }, [writeContract, publicClient]);

    // Get pool health (view function)
    const handleGetPoolHealth = useCallback(async (poolId: bigint): Promise<{
        healthRatio: bigint;
        effectiveMaxBet: bigint;
        hourlyPayoutUsed: bigint;
        hourlyPayoutLimit: bigint;
        emergencyActive: boolean;
        emergencyCooldownEnds: bigint;
    } | null> => {
        if (!publicClient) return null;
        try {
            const result = await publicClient.readContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'getPoolHealth',
                args: [poolId],
            } as any);
            const [healthRatio, effectiveMaxBet, hourlyPayoutUsed, hourlyPayoutLimit, emergencyActive, emergencyCooldownEnds] = result as [bigint, bigint, bigint, bigint, boolean, bigint];
            return { healthRatio, effectiveMaxBet, hourlyPayoutUsed, hourlyPayoutLimit, emergencyActive, emergencyCooldownEnds };
        } catch (err) {
            console.error('Failed to get pool health:', err);
            return null;
        }
    }, [publicClient]);

    // Get protection settings (view function)
    const handleGetProtectionSettings = useCallback(async (poolId: bigint): Promise<{
        dynamicMaxBetEnabled: boolean;
        lowBalanceThreshold: bigint;
        criticalBalanceThreshold: bigint;
        streakProtectionEnabled: boolean;
        hourlyPayoutLimit: bigint;
        emergencyCooldown: bigint;
        initialDeposit: bigint;
    } | null> => {
        if (!publicClient) return null;
        try {
            const result = await publicClient.readContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'getProtectionSettings',
                args: [poolId],
            } as any);
            const [dynamicMaxBetEnabled, lowBalanceThreshold, criticalBalanceThreshold, streakProtectionEnabled, hourlyPayoutLimit, emergencyCooldown, initialDeposit] = result as [boolean, bigint, bigint, boolean, bigint, bigint, bigint];
            return { dynamicMaxBetEnabled, lowBalanceThreshold, criticalBalanceThreshold, streakProtectionEnabled, hourlyPayoutLimit, emergencyCooldown, initialDeposit };
        } catch (err) {
            console.error('Failed to get protection settings:', err);
            return null;
        }
    }, [publicClient]);

    return {
        // State
        isPending: isWritePending || isConfirming,
        isConfirmed,

        // Data
        userPoolIds: allUserPoolIds,
        platformPoolId: pPoolId,
        isContractOwner,
        minPoolDeposit: minPoolDeposit as bigint | undefined,
        maxPoolsPerUser: maxPoolsPerUser as bigint | undefined,
        activePoolCount: activePoolCount as bigint | undefined,
        allowance: allowance as bigint | undefined,
        tokenBalance: tokenBalance as bigint | undefined,

        // Actions
        handleApprove,
        handleCreatePool,
        handleDeposit,
        handleWithdraw,
        handleUpdateSettings,
        handleDeactivate,
        handleReactivate,
        handleClosePool,
        handleTransferOwnership,

        // Settle Expired (Single + Batch)
        handleSettleExpiredByOwner,
        handleBatchSettleExpired,
        handleGetExpiredPlayers,
        handleGetPendingCount,

        // Protection Features
        handleUpdateProtectionSettings,
        handleTriggerEmergency,
        handleExecuteEmergencyWithdraw,
        handleCancelEmergency,
        handleGetPoolHealth,
        handleGetProtectionSettings,

        // Refetch
        refetchUserPools,
        refetchAllowance,
        refetchBalance,
    };
}

