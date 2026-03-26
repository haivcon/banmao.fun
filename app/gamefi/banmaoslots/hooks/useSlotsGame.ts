import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBlockNumber, useWatchContractEvent, usePublicClient } from 'wagmi';
import { parseEther, formatEther, keccak256, encodePacked, decodeEventLog } from 'viem';
import { slotsToast } from '../lib/toastUtils';
import {
    SLOTS_ABI,
    ERC20_ABI,
    SLOTS_CONTRACT_ADDRESS,
    BANMAO_TOKEN_ADDRESS,
    GAME_CONFIG,
    parseTokenAmount
} from '../lib/abis';

export type PoolTier = 'cyberpunk' | 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze';

export interface PoolData {
    poolId: bigint;
    name: string;
    owner: string;
    balance: bigint;
    minBet: bigint;
    maxBet: bigint;
    jackpot: bigint;
    isActive: boolean;
    tier?: PoolTier;
}

export type GameStatus = 'idle' | 'approving' | 'committing' | 'waiting' | 'ready_to_reveal' | 'revealing' | 'result' | 'refunding';

export interface SpinResult {
    symbols: number[];
    payout: bigint;
    isJackpot: boolean;
    txHash: string;
    poolId?: bigint; // Pool ID for isolation
    logIndex?: number;
}

// Minimal translation interface for hook toast messages
interface HookTranslations {
    toastConnectWalletFirst?: string;
    toastProcessingPreviousResult?: string;
    toastCannotReadNonce?: string;
    toastLostSeedData?: string;
    toastExpiredCommitSettled?: string;
}

export function useSlotsGame(t?: HookTranslations) {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    // Block number with aggressive polling for faster state transitions
    const { data: blockNumber, refetch: refetchBlockNumber } = useBlockNumber({
        watch: true,
        query: {
            refetchInterval: 8000, // Reduced from 2s to 8s for Vercel optimization
            staleTime: 4000,       // Consider stale after 4 seconds
        }
    });

    // Local State
    const [gameState, setGameState] = useState<GameStatus>('idle');
    const [lastSeed, setLastSeed] = useState<`0x${string}` | null>(() => {
        // Initialize from localStorage on mount
        if (typeof window !== 'undefined') {
            const storedSeed = localStorage.getItem('banmao_slots_seed');
            if (storedSeed && storedSeed.startsWith('0x') && storedSeed.length === 66) {
                console.log('[Slots] Restored seed from localStorage on mount:', storedSeed);
                return storedSeed as `0x${string}`;
            }
        }
        return null;
    });
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<SpinResult | null>(null);
    const [lastBetAmount, setLastBetAmount] = useState<string>('0');

    // Multi-spin state
    const [spinCount, setSpinCount] = useState<number>(() => {
        // Restore spinCount from localStorage on mount (for page reload with pending commit)
        if (typeof window !== 'undefined') {
            const storedSpinCount = localStorage.getItem('banmao_slots_spincount');
            if (storedSpinCount) {
                const parsed = parseInt(storedSpinCount, 10);
                if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
                    console.log('[Slots] Restored spinCount from localStorage:', parsed);
                    return parsed;
                }
            }
        }
        return 1;
    });
    const [multiResults, setMultiResults] = useState<SpinResult[]>([]);
    const [isMultiSpinning, setIsMultiSpinning] = useState(false);

    // Clear multi-spin results (call when starting new game)
    const clearMultiResults = () => {
        setMultiResults([]);
        setIsMultiSpinning(false);
        // Clear persisted spinCount when results are cleared
        if (typeof window !== 'undefined') {
            localStorage.removeItem('banmao_slots_spincount');
        }
    };

    // Multi-Pool Logic: Default to Platform Pool (will be updated from contract)
    const [poolId, setPoolId] = useState<bigint>(BigInt(0)); // Start with 0, will be set from platformPoolId

    // Contract Writes
    const { writeContractAsync: writeContract, isPending: isWritePending } = useWriteContract();

    // 1. Read Allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, SLOTS_CONTRACT_ADDRESS as `0x${string}`] : undefined,
    });

    // 2. Read Pending Commit (with polling when in waiting state)
    const { data: pendingCommit, refetch: refetchCommit } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'getPendingCommit',
        args: address ? [address] : undefined,
    });

    // 3. Read Nonce (for seed generation) - MUST refetch after each game
    const { data: nonce, refetch: refetchNonce } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'nonces',
        args: address ? [address] : undefined,
    });

    // 4. Read Player Stats
    const { data: playerStats, refetch: refetchPlayerStats } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'getPlayerPoolStats',
        args: address ? [poolId, address] : undefined,
    });

    // 5. Read Pool Stats (global game statistics for this pool)
    const { data: houseStats } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'getPoolStats',
        args: poolId > BigInt(0) ? [poolId] : undefined,
        query: { refetchInterval: 30000 } // Refresh every 30s
    });

    // 6. Read Pool Config (using pools mapping, not getPool)
    const { data: poolData } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'pools',
        args: poolId > BigInt(0) ? [poolId] : undefined,
        query: { refetchInterval: 60000 }
    });

    // 7. Read Platform Pool ID and set as default if poolId is 0
    const { data: platformPoolIdData } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'platformPoolId',
    });

    // Set poolId to platformPoolId when available
    useEffect(() => {
        const pId = platformPoolIdData as bigint | undefined;
        if (pId && pId > BigInt(0) && poolId === BigInt(0)) {
            console.log('[Slots] Setting pool to platform pool:', pId.toString());
            setPoolId(pId);
        }
    }, [platformPoolIdData, poolId]);

    // Parse pool data from tuple (pools mapping returns tuple)
    // Tuple indexes: [0:id, 1:owner, 2:name, 3:balance, 4:minBet, 5:maxBet, 6:jackpotPercent, 7:jackpotPool, 8:totalSpins, 9:totalBetsVolume, 10:totalPayoutsVolume, 11:totalPendingBets, 12:isActive, 13:createdAt]
    const poolTuple = poolData as readonly [bigint, `0x${string}`, string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, bigint] | undefined;
    const poolBalance = poolTuple?.[3];
    const minBet = poolTuple?.[4];
    const maxBet = poolTuple?.[5];
    const jackpotPoolAmount = poolTuple?.[7];
    const totalPendingBets = poolTuple?.[11];
    const poolIsActive = poolTuple?.[12];

    // Constants from contract (V2)
    const JACKPOT_MULTIPLIER = BigInt(45000); // 450x in basis points (V2)

    // Calculate max safe bet based on pool balance (pool must cover potential 450x jackpot)
    // Formula: maxPotentialPayout = (betAmount * 45000) / 100 + jackpotPool
    // Required: poolBalance + betAmount >= maxPotentialPayout + totalPendingBets
    // Solving for betAmount: betAmount <= (poolBalance - jackpotPool - totalPendingBets) * 100 / (45000 - 100)
    const calculateMaxSafeBet = (): bigint => {
        if (!poolBalance) return BigInt(0);
        const jackpot = jackpotPoolAmount || BigInt(0);
        const pending = totalPendingBets || BigInt(0);
        const available = poolBalance > (jackpot + pending) ? poolBalance - jackpot - pending : BigInt(0);
        // Simplified: maxSafeBet ≈ poolBalance / 500 (ignoring jackpot contribution for safety margin)
        const safeBet = (available * BigInt(100)) / (JACKPOT_MULTIPLIER - BigInt(100));
        return safeBet > BigInt(0) ? safeBet : BigInt(0);
    };
    const maxSafeBet = calculateMaxSafeBet();

    const { data: commitExpiryBlocks } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'commitExpiryBlocks',
    });

    // 8. Read maxSpinsPerMinute (rate limit from contract)
    const { data: maxSpinsPerMinuteData } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: 'maxSpinsPerMinute',
        query: { refetchInterval: 60000 } // Refresh every minute
    });
    const maxSpinsPerMinute = maxSpinsPerMinuteData !== undefined ? Number(maxSpinsPerMinuteData) : 10;

    // Watch Transaction Receipt
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: txHash as `0x${string}`,
    });

    // Polling effect - refetch data periodically when in active state
    useEffect(() => {
        if (gameState === 'waiting' || gameState === 'committing' || gameState === 'ready_to_reveal') {
            const interval = setInterval(() => {
                // Removed noisy log - runs every 5 seconds during active states
                refetchCommit();
                refetchBlockNumber(); // Force block number update
            }, 10000); // Reduced from 5s to 10s
            return () => clearInterval(interval);
        }
    }, [gameState, refetchCommit, refetchBlockNumber]);

    // Effect: Detect ready_to_reveal state based on blockchain data
    useEffect(() => {
        if (!pendingCommit || blockNumber === undefined) return;

        // Pending Commit returns: [poolId, hashedSeed, betAmount, blockNumber, revealed, expired]
        if (!Array.isArray(pendingCommit)) return;

        const p_betAmount = pendingCommit[2];
        const p_commitBlock = pendingCommit[3];
        const p_revealed = pendingCommit[4];

        // Debug log (uncomment when needed - runs frequently on each block)
        // console.log('[Slots] Block Check:', {
        //     betAmount: p_betAmount?.toString(),
        //     commitBlock: p_commitBlock?.toString(),
        //     currentBlock: blockNumber.toString(),
        //     blockDiff: p_commitBlock ? Number(blockNumber) - Number(p_commitBlock) : 0,
        //     revealed: p_revealed
        // });

        // Active commit exists
        if (p_betAmount && p_betAmount > BigInt(0) && !p_revealed) {
            if (p_commitBlock && blockNumber > p_commitBlock) {
                // Block passed - FORCE to ready_to_reveal
                let shouldShowToast = false;
                setGameState(prevState => {
                    if (prevState !== 'ready_to_reveal' && prevState !== 'revealing' && prevState !== 'result') {
                        console.log('[Slots] Block passed! Transitioning to ready_to_reveal');
                        shouldShowToast = true;
                        return 'ready_to_reveal';
                    }
                    return prevState;
                });
                // In-window notification handles this now
                if (shouldShowToast) {
                    console.log('[Slots] Ready to reveal - player should click CLAIM RESULT');
                }
            } else {
                // Still waiting for block
                setGameState(prevState => {
                    if (prevState === 'idle') {
                        console.log('[Slots] Active commit found, setting to waiting');
                        return 'waiting';
                    }
                    return prevState;
                });
            }
        } else if (p_betAmount === BigInt(0) || p_revealed) {
            // No active commit OR commit was revealed
            setGameState(prevState => {
                if (prevState === 'revealing' && p_revealed) {
                    console.log('[Slots] FALLBACK: Detected revealed=true while in revealing state, forcing to result');
                    // In-window notification handles result display
                    return 'result';
                }
                if (prevState === 'waiting' || prevState === 'ready_to_reveal') {
                    console.log('[Slots] Commit resolved, resetting to idle');
                    return 'idle';
                }
                return prevState;
            });
        }
    }, [pendingCommit, blockNumber]); // NO gameState dependency!

    // Watch SpinRevealed Event
    useWatchContractEvent({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        eventName: 'SpinRevealed',
        poll: true,
        pollingInterval: 10000, // Reduced from 5s to 10s
        onLogs(logs) {
            for (const log of logs) {
                // Extract poolId from indexed topic[1]
                const eventPoolId = log.topics[1] ? BigInt(log.topics[1]) : undefined;
                const args = log.args as { player: string; result: readonly number[]; payout: bigint; isJackpot: boolean };
                if (args.player?.toLowerCase() === address?.toLowerCase()) {
                    console.log('[Slots EVENT] SpinRevealed for pool:', eventPoolId?.toString(), args);

                    const newResult: SpinResult = {
                        symbols: [...args.result],
                        payout: args.payout,
                        isJackpot: args.isJackpot,
                        txHash: log.transactionHash,
                        poolId: eventPoolId,
                        logIndex: log.logIndex !== undefined ? Number(log.logIndex) : undefined
                    };

                    // For multi-spin, collect results
                    if (spinCount > 1 && isMultiSpinning) {
                        setMultiResults(prev => {
                            // Avoid duplicates using logIndex if available
                            if (newResult.logIndex !== undefined && prev.some(r => r.txHash === log.transactionHash && r.logIndex === newResult.logIndex)) {
                                return prev;
                            }
                            // Fallback to symbol check if logIndex missing (unlikely)
                            if (newResult.logIndex === undefined && prev.some(r => r.txHash === log.transactionHash && JSON.stringify(r.symbols) === JSON.stringify(newResult.symbols))) {
                                return prev;
                            }
                            const updated = [...prev, newResult];
                            console.log('[Slots] Multi-spin result collected:', updated.length, '/', spinCount);
                            // When all results collected, set game to result state
                            if (updated.length >= spinCount) {
                                setIsMultiSpinning(false);
                                setGameState('result');
                            }
                            return updated;
                        });
                    } else {
                        // Single spin - original behavior
                        setLastResult(newResult);
                        setGameState('result');
                    }
                    console.log('[Slots] SpinRevealed event - result set, payout:', args.payout.toString());
                }
            }
        },
    });

    // Cleanup effects on transaction confirmation
    useEffect(() => {
        if (isConfirmed && txHash) {
            console.log('[Slots] Transaction confirmed!', { gameState });
            setTxHash(null);
            refetchAllowance();
            refetchCommit();

            if (gameState === 'approving') {
                console.log('[Slots] Token approved');
                // In-window notification will handle this
                setGameState('idle');
            }
            if (gameState === 'revealing') {
                localStorage.removeItem('banmao_slots_seed');
                console.log('[Slots] Reveal transaction confirmed, seed cleared');

                // CRITICAL: Wait for nonce and commit data to be refreshed BEFORE allowing next bet
                // This prevents the "cannot bet immediately after win" issue
                (async () => {
                    console.log('[Slots] Force refetching critical data after reveal...');
                    await Promise.all([
                        refetchNonce(),
                        refetchCommit(),
                        refetchAllowance(),
                        refetchPlayerStats()
                    ]);
                    console.log('[Slots] All critical data refreshed, ready for next bet');
                })();

                // Parse result from transaction receipt logs (bypasses rate-limited event polling)
                if (publicClient && txHash) {
                    const savedTxHash = txHash;
                    const currentSpinCount = spinCount; // Capture current spin count
                    const wasMultiSpinning = isMultiSpinning || currentSpinCount > 1;

                    (async () => {
                        try {
                            const receipt = await publicClient.getTransactionReceipt({ hash: savedTxHash as `0x${string}` });
                            console.log('[Slots] Got receipt:', receipt);

                            const collectedResults: SpinResult[] = [];

                            for (const log of receipt.logs) {
                                try {
                                    const logAny = log as any;
                                    const decoded = decodeEventLog({
                                        abi: SLOTS_ABI,
                                        data: logAny.data,
                                        topics: logAny.topics,
                                    }) as { eventName: string; args: any };
                                    console.log('[Slots] Decoded log:', decoded);

                                    if (decoded.eventName === 'SpinRevealed') {
                                        const args = decoded.args as { player: string; result: readonly number[]; payout: bigint; isJackpot: boolean };
                                        console.log('[Slots] SpinRevealed from receipt:', args);

                                        const newResult: SpinResult = {
                                            symbols: [...args.result],
                                            payout: args.payout,
                                            isJackpot: args.isJackpot,
                                            txHash: receipt.transactionHash,
                                            poolId: logAny.topics[1] ? BigInt(logAny.topics[1]) : undefined,
                                            logIndex: logAny.logIndex !== undefined ? Number(logAny.logIndex) : undefined
                                        };

                                        collectedResults.push(newResult);
                                    }
                                } catch (e) {
                                    // Not our event, skip
                                }
                            }

                            console.log('[Slots] Collected results from receipt:', collectedResults.length);

                            if (collectedResults.length > 0) {
                                if (wasMultiSpinning && collectedResults.length > 1) {
                                    // Multi-spin: set all results at once
                                    console.log('[Slots] Multi-spin: setting', collectedResults.length, 'results');
                                    setMultiResults(collectedResults);
                                    setIsMultiSpinning(false);
                                    setGameState('result');
                                } else {
                                    // Single spin or fallback
                                    setLastResult(collectedResults[0]);
                                    setGameState('result');
                                }
                                console.log('[Slots] SpinRevealed from receipt - result set');
                            }
                        } catch (err) {
                            console.error('[Slots] Failed to get receipt:', err);
                        }
                    })();
                }
            }
            if (gameState === 'committing') {
                console.log('[Slots] Bet placed, waiting for block');
                // In-window notification handles this
                setGameState('waiting');
            }
            if (gameState === 'refunding') {
                console.log('[Slots] Refund confirmed');
                // In-window notification handles this
                setGameState('idle');
                localStorage.removeItem('banmao_slots_seed');
                refetchPlayerStats();
            }
        }
    }, [isConfirmed, txHash, refetchAllowance, refetchCommit, refetchNonce, refetchPlayerStats, gameState]);


    // Action: Approve (Infinite Approval for better UX)
    const handleApprove = useCallback(async (amountStr: string) => {
        // In-window notification handles UI feedback
        try {
            setError(null);
            setGameState('approving');
            const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            const hash = await writeContract({
                address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [SLOTS_CONTRACT_ADDRESS as `0x${string}`, MAX_UINT256],
            } as any);
            setTxHash(hash);
        } catch (err: unknown) {
            console.error("Approve error:", err);
            setError(err instanceof Error ? err.message : "Approval failed");
            setGameState('idle');
        }
    }, [writeContract]);

    // Action: Commit (Spin) - accepts optional custom seed and target poolId
    const handleCommit = useCallback(async (betAmountStr: string, customSeed?: string, targetPoolId?: bigint) => {
        if (!address) {
            slotsToast.error(t?.toastConnectWalletFirst || 'Please connect wallet first');
            return;
        }

        // First, check if there's still an active pending commit (blockchain hasn't updated yet)
        const { data: currentCommit } = await refetchCommit();
        if (currentCommit && Array.isArray(currentCommit)) {
            const p_betAmount = currentCommit[2] as bigint | undefined;
            const p_revealed = currentCommit[4] as boolean | undefined;

            if (p_betAmount && p_betAmount > BigInt(0) && !p_revealed) {
                console.log('[Slots COMMIT] Active pending commit found, cannot place new bet yet');
                slotsToast.loading(t?.toastProcessingPreviousResult || 'Processing previous result... Please wait a moment.');
                return;
            }
        }

        // Refetch nonce to ensure it's fresh
        const { data: freshNonce } = await refetchNonce();
        const nonceToUse = freshNonce ?? nonce;

        if (nonceToUse === undefined) {
            slotsToast.error(t?.toastCannotReadNonce || 'Cannot read nonce from contract');
            return;
        }

        console.log('[Slots COMMIT] Starting commit with:', { customSeed, nonce: nonceToUse.toString(), spinCount });

        // In-window notification handles UI feedback
        try {
            setError(null);
            setGameState('committing');
            setMultiResults([]); // Clear previous multi-spin results
            if (spinCount > 1) {
                setIsMultiSpinning(true); // Start multi-spin tracking
            }

            // Use custom seed if provided, otherwise generate random
            let seedToUse: `0x${string}`;
            if (customSeed && customSeed.startsWith('0x') && customSeed.length === 66) {
                seedToUse = customSeed as `0x${string}`;
                console.log('[Slots COMMIT] Using provided hex seed');
            } else if (customSeed && customSeed.length > 0) {
                seedToUse = keccak256(encodePacked(['string'], [customSeed]));
                console.log('[Slots COMMIT] Hashed custom text seed');
            } else {
                seedToUse = keccak256(encodePacked(
                    ['address', 'uint256', 'uint256'],
                    [address, BigInt(Math.floor(Math.random() * 1000000)), BigInt(Date.now())]
                ));
                console.log('[Slots COMMIT] Generated random seed');
            }

            console.log('[Slots COMMIT] Seed to use:', seedToUse);
            setLastSeed(seedToUse);
            localStorage.setItem('banmao_slots_seed', seedToUse);
            // Also store the nonce and spin count used for debugging
            localStorage.setItem('banmao_slots_nonce', nonceToUse.toString());
            localStorage.setItem('banmao_slots_spincount', spinCount.toString());
            console.log('[Slots COMMIT] Saved seed to state and localStorage');

            const betAmount = parseTokenAmount(betAmountStr);

            // Calculate hashed seed: keccak256(abi.encodePacked(seed, msg.sender, nonce))
            const hashedSeed = keccak256(encodePacked(
                ['bytes32', 'address', 'uint256'],
                [seedToUse, address, nonceToUse]
            ));
            console.log('[Slots COMMIT] HashedSeed:', hashedSeed, 'using nonce:', nonceToUse.toString());

            // Use targetPoolId if provided, otherwise fall back to hook state poolId
            const commitPoolId = targetPoolId !== undefined ? targetPoolId : poolId;
            console.log('[Slots COMMIT] Using poolId:', commitPoolId.toString(), 'spinCount:', spinCount);

            let hash: `0x${string}`;
            if (spinCount > 1) {
                // Multi-spin: use commitMultiSpin
                hash = await writeContract({
                    address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                    abi: SLOTS_ABI,
                    functionName: 'commitMultiSpin',
                    args: [commitPoolId, hashedSeed, betAmount, BigInt(spinCount)],
                } as any);
                console.log('[Slots COMMIT] Multi-spin TX Hash:', hash);
            } else {
                // Single spin: use commitSpin (backward compatible)
                hash = await writeContract({
                    address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                    abi: SLOTS_ABI,
                    functionName: 'commitSpin',
                    args: [commitPoolId, hashedSeed, betAmount],
                } as any);
                console.log('[Slots COMMIT] Single spin TX Hash:', hash);
            }
            setTxHash(hash);
        } catch (err: unknown) {
            console.error("[Slots COMMIT] Error:", err);
            setError(err instanceof Error ? err.message : "Spin commit failed");
            setGameState('idle');
        }
    }, [address, nonce, writeContract, poolId, refetchNonce, spinCount]);

    // Track reveal timeout to cancel it on error
    const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Action: Reveal
    const handleReveal = useCallback(async () => {
        if (gameState === 'revealing') {
            console.log('[Slots REVEAL] Already revealing, ignoring click');
            return;
        }

        console.log('[Slots REVEAL] Starting reveal...');
        console.log('[Slots REVEAL] lastSeed from state:', lastSeed);
        console.log('[Slots REVEAL] localStorage seed:', localStorage.getItem('banmao_slots_seed'));

        const storedSeed = lastSeed || localStorage.getItem('banmao_slots_seed') as `0x${string}`;
        console.log('[Slots REVEAL] Using seed:', storedSeed);

        if (!storedSeed) {
            slotsToast.error(t?.toastLostSeedData || 'Lost seed data. Please try Refund.');
            setError("Lost seed data. Please try Refund if spin is stuck.");
            return;
        }

        const toastId = 'reveal'; // Keep ID for error handling
        // In-window notification handles UI feedback
        try {
            setError(null);
            setGameState('revealing');

            if (revealTimeoutRef.current) {
                clearTimeout(revealTimeoutRef.current);
                revealTimeoutRef.current = null;
            }

            console.log('[Slots REVEAL] Calling revealSpin with seed:', storedSeed);
            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'revealSpin',
                args: [storedSeed],
            } as any);
            console.log('[Slots REVEAL] TX Hash:', hash);
            setTxHash(hash);

            revealTimeoutRef.current = setTimeout(() => {
                setGameState(prev => {
                    if (prev === 'revealing') {
                        console.log('[Slots REVEAL] Timeout - still revealing, allowing retry');
                        return 'ready_to_reveal';
                    }
                    return prev;
                });
            }, 30000);
        } catch (err: unknown) {
            console.error("[Slots REVEAL] Error:", err);

            if (revealTimeoutRef.current) {
                clearTimeout(revealTimeoutRef.current);
                revealTimeoutRef.current = null;
            }

            const errorMsg = err instanceof Error ? err.message : "Reveal failed";
            setError(errorMsg);

            setGameState('ready_to_reveal');
        }
    }, [lastSeed, writeContract, gameState]);

    // Action: Settle Expired Commit (Player Forfeit)
    // This cleans up the expired commit so the player can play again.
    // The bet is forfeited to the pool (minus fees).
    const handleRefund = useCallback(async () => {
        try {
            setError(null);
            setGameState('refunding'); // Using 'refunding' state for settlement process
            console.log('[Slots SETTLE] Settling expired commit...');

            const hash = await writeContract({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: 'settleExpiredCommit',
                args: [],
            } as any);
            console.log('[Slots SETTLE] TX Hash:', hash);
            setTxHash(hash);

            // Wait for confirmation and reset state
            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
                console.log('[Slots SETTLE] Transaction confirmed, resetting to idle');
                slotsToast.success(t?.toastExpiredCommitSettled || 'Expired commit settled. You can play again!');
                // Refetch data to update UI
                refetchCommit();
                refetchNonce();
            }
            // Reset to idle so player can spin again
            setGameState('idle');
        } catch (err: unknown) {
            console.error("[Slots SETTLE] Error:", err);
            const errorMsg = err instanceof Error ? err.message : "Settlement failed";
            setError(errorMsg);
            setGameState('idle');
        }
    }, [writeContract, publicClient, refetchCommit, refetchNonce]);

    // Prepare for next spin - refresh nonce and commit data to ensure fresh state
    // This prevents wallet simulation errors due to stale nonce after previous spin
    const prepareForNextSpin = useCallback(async (): Promise<boolean> => {
        console.log('[Slots] Preparing for next spin - refreshing blockchain state...');
        try {
            // Refresh nonce and commit in parallel
            const [nonceResult, commitResult] = await Promise.all([
                refetchNonce(),
                refetchCommit()
            ]);
            console.log('[Slots] State refresh complete. Nonce:', nonceResult.data?.toString(), 'Commit cleared:', !commitResult.data?.[2]);
            return true;
        } catch (err) {
            console.error('[Slots] State refresh failed:', err);
            return false;
        }
    }, [refetchNonce, refetchCommit]);

    return {
        // State
        gameState,
        setGameState,
        error,
        isPending: isWritePending || isConfirming,

        // Blockchain data
        allowance,
        pendingCommit,
        blockNumber,

        // Player Stats (from getPlayerPoolStats)
        playerStats, // PlayerPoolStats struct
        refetchPlayerStats,

        // House Stats (from getPoolStats)
        houseStats, // [totalBetsVolume, totalPayoutsVolume, totalSpins, profitLoss, poolRtpBps]

        // Game Config
        minBet,
        maxBet,
        commitExpiryBlocks,

        // Pool Balance Validation
        poolBalance,
        maxSafeBet,
        poolIsActive,

        // Multi-Pool Selection
        poolId,
        setPoolId,

        // Actions
        handleApprove,
        handleCommit,
        handleReveal,
        handleRefund,

        // Seed & Result
        lastResult,
        lastBetAmount,
        setLastBetAmount,
        lastSeed,

        // Multi-spin
        spinCount,
        setSpinCount,
        multiResults,
        isMultiSpinning,
        clearMultiResults,

        // State refresh for next spin
        prepareForNextSpin,

        // Rate limit from contract
        maxSpinsPerMinute,
    };
}
