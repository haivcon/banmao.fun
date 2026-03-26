// hooks/useContract.ts - Contract interaction hooks for Banmao Miner

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useState, useCallback } from 'react';
import {
    BANMAO_TOKEN_ADDRESS,
    BANMAO_MINER_ADDRESS,
    ERC20_ABI,
    BANMAO_MINER_ABI
} from '../lib/abis';

export interface DonorInfo {
    address: string;
    amount: bigint;
    displayAddress: string;
}

export function useMinerContract() {
    const { address, isConnected } = useAccount();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get user's nonce
    const { data: nonce, refetch: refetchNonce } = useReadContract({
        address: BANMAO_MINER_ADDRESS as `0x${string}`,
        abi: BANMAO_MINER_ABI,
        functionName: 'getNonce',
        args: address ? [address] : undefined,
    });

    // Get user's donation info
    const { data: donorInfo, refetch: refetchDonorInfo } = useReadContract({
        address: BANMAO_MINER_ADDRESS as `0x${string}`,
        abi: BANMAO_MINER_ABI,
        functionName: 'getDonorInfo',
        args: address ? [address] : undefined,
    });

    // Get contract balance
    const { data: contractBalance } = useReadContract({
        address: BANMAO_MINER_ADDRESS as `0x${string}`,
        abi: BANMAO_MINER_ABI,
        functionName: 'getContractBalance',
    });

    // Get donors (paginated - offset 0, limit 20)
    const { data: topDonorsData, refetch: refetchTopDonors } = useReadContract({
        address: BANMAO_MINER_ADDRESS as `0x${string}`,
        abi: BANMAO_MINER_ABI,
        functionName: 'getDonorsPaginated',
        args: [BigInt(0), BigInt(20)],
    });

    // Get token balance
    const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // Get token allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, BANMAO_MINER_ADDRESS as `0x${string}`] : undefined,
    });

    // Write contract
    const { writeContract, data: hash } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Approve tokens for donation
    const approve = useCallback(async (amount: bigint) => {
        if (!address) return;
        setIsPending(true);
        setError(null);
        try {
            // @ts-ignore - wagmi types require exact ABI matching
            writeContract({
                address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [BANMAO_MINER_ADDRESS as `0x${string}`, amount],
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Approve failed');
            setIsPending(false);
        }
    }, [address, writeContract]);

    // Donate tokens
    const donate = useCallback(async (amount: bigint) => {
        if (!address) return;
        setIsPending(true);
        setError(null);
        try {
            // @ts-ignore - wagmi types require exact ABI matching
            writeContract({
                address: BANMAO_MINER_ADDRESS as `0x${string}`,
                abi: BANMAO_MINER_ABI,
                functionName: 'donate',
                args: [amount],
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Donation failed');
            setIsPending(false);
        }
    }, [address, writeContract]);

    // Claim reward (requires signature from backend) - V2 with deadline
    const claimReward = useCallback(async (
        amount: bigint,
        nonce: bigint,
        deadline: bigint,
        signature: string
    ) => {
        if (!address) return;
        setIsPending(true);
        setError(null);
        try {
            // @ts-ignore - wagmi types require exact ABI matching
            writeContract({
                address: BANMAO_MINER_ADDRESS as `0x${string}`,
                abi: BANMAO_MINER_ABI,
                functionName: 'claimReward',
                args: [amount, nonce, deadline, signature as `0x${string}`],
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Claim failed');
            setIsPending(false);
        }
    }, [address, writeContract]);

    // Format top donors data
    const topDonors: DonorInfo[] = topDonorsData
        ? (topDonorsData[0] as `0x${string}`[]).map((addr, i) => ({
            address: addr,
            amount: (topDonorsData[1] as bigint[])[i],
            displayAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
        }))
        : [];

    return {
        // State
        address,
        isConnected,
        isPending: isPending || isConfirming,
        isSuccess,
        error,

        // Data
        nonce: nonce as bigint | undefined,
        tokenBalance: tokenBalance as bigint | undefined,
        allowance: allowance as bigint | undefined,
        contractBalance: contractBalance as bigint | undefined,
        topDonors,
        userDonated: donorInfo ? (donorInfo as [bigint, bigint])[0] : BigInt(0),
        userDonationCount: donorInfo ? (donorInfo as [bigint, bigint])[1] : BigInt(0),

        // Actions
        approve,
        donate,
        claimReward,

        // Refetch
        refetchBalance,
        refetchAllowance,
        refetchNonce,
        refetchDonorInfo,
        refetchTopDonors,
    };
}

// Format token amount for display
export function formatTokenAmount(amount: bigint | undefined): string {
    if (!amount) return '0';
    const num = Number(amount) / 1e18;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toFixed(2);
}
