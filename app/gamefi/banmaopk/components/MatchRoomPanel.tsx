/**
 * MatchRoomPanel - View match details, vote, claim rewards
 * Used inside DraggablePanel on the main PK page
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { BANMAOPK_ADDRESS, BANMAO_ADDRESS } from "../lib/constants";
import { BANMAOPK_ABI, ERC20_ABI } from "../lib/abis";

interface MatchRoomPanelProps {
    matchId: bigint;
    onClose?: () => void;
}

export default function MatchRoomPanel({ matchId, onClose }: MatchRoomPanelProps) {
    const { address } = useAccount();
    const [voteAmount, setVoteAmount] = useState("");
    const [selectedPlayer, setSelectedPlayer] = useState<1 | 2 | null>(null);

    // Read match data
    const { data: matchData, refetch: refetchMatch } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "matches",
        args: [matchId],
    });

    // Read user votes
    const { data: userVotes1 } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "matches",
        args: matchId && address ? [matchId] : undefined,
    });

    // Check if claimed
    const { data: hasClaimed, refetch: refetchClaimed } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "hasClaimedReward",
        args: matchId && address ? [matchId, address] : undefined,
    });

    // Check allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: BANMAO_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, BANMAOPK_ADDRESS] : undefined,
    });

    // User balance
    const { data: userBalance } = useReadContract({
        address: BANMAO_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });

    // Write contracts
    const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

    const { writeContract: vote, data: voteHash, isPending: isVoting } = useWriteContract();
    const { isLoading: isVoteConfirming, isSuccess: isVoteSuccess } = useWaitForTransactionReceipt({ hash: voteHash });

    const { writeContract: finalize, data: finalizeHash, isPending: isFinalizing } = useWriteContract();
    const { isLoading: isFinalizeConfirming, isSuccess: isFinalizeSuccess } = useWaitForTransactionReceipt({ hash: finalizeHash });

    const { writeContract: claim, data: claimHash, isPending: isClaiming } = useWriteContract();
    const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

    // Refetch on success
    useEffect(() => {
        if (isApproveSuccess) refetchAllowance();
    }, [isApproveSuccess, refetchAllowance]);

    useEffect(() => {
        if (isVoteSuccess || isFinalizeSuccess || isClaimSuccess) {
            refetchMatch();
            refetchClaimed();
            setVoteAmount("");
            setSelectedPlayer(null);
        }
    }, [isVoteSuccess, isFinalizeSuccess, isClaimSuccess, refetchMatch, refetchClaimed]);

    // Countdown timer
    const [timeLeft, setTimeLeft] = useState<string>("");
    useEffect(() => {
        if (!matchData) return;
        const endTime = Number(matchData[5]) * 1000;

        const updateTimer = () => {
            const now = Date.now();
            const diff = endTime - now;
            if (diff <= 0) {
                setTimeLeft("Đã kết thúc");
                return;
            }
            const hours = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${hours}h ${mins}m ${secs}s`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [matchData]);

    if (!matchData) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                <div className="animate-pulse">Loading match data...</div>
            </div>
        );
    }

    const [player1, player2, score1, score2, startTime, endTime, finalized, isRefunded, overtimeCount, totalPool] = matchData;

    const formatAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const score1Num = Number(formatUnits(score1, 18));
    const score2Num = Number(formatUnits(score2, 18));
    const totalScore = score1Num + score2Num;
    const score1Pct = totalScore > 0 ? (score1Num / totalScore) * 100 : 50;

    const isEnded = Date.now() > Number(endTime) * 1000;
    const canFinalize = isEnded && !finalized;
    const canVote = !isEnded && !finalized;
    const canClaim = finalized && !hasClaimed;

    const voteBigInt = voteAmount ? parseUnits(voteAmount, 18) : 0n;
    const needsApproval = allowance !== undefined && voteBigInt > allowance;

    const handleApprove = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (approve as any)({
            address: BANMAO_ADDRESS,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [BANMAOPK_ADDRESS, voteBigInt * 2n],
        });
    };

    const handleVote = () => {
        if (!selectedPlayer) return;
        const candidate = selectedPlayer === 1 ? player1 : player2;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vote as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "vote",
            args: [matchId, candidate, voteBigInt],
        });
    };

    const handleFinalize = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (finalize as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "finalizeMatch",
            args: [matchId],
        });
    };

    const handleClaim = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (claim as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "claimReward",
            args: [matchId],
        });
    };

    return (
        <div style={{ color: '#fff' }}>
            {/* Match Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>Match #{matchId.toString()}</div>
                {Number(overtimeCount) > 0 && (
                    <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(234,179,8,0.2)',
                        color: '#fbbf24',
                        fontSize: '10px',
                        fontWeight: 600,
                        marginTop: '4px'
                    }}>
                        ⚡ OVERTIME x{overtimeCount.toString()}
                    </span>
                )}
            </div>

            {/* VS Banner */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
            }}>
                <div style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    background: selectedPlayer === 1 ? 'rgba(249,115,22,0.2)' : 'rgba(0,0,0,0.2)',
                    border: selectedPlayer === 1 ? '2px solid #f97316' : '2px solid transparent',
                    cursor: canVote ? 'pointer' : 'default',
                    transition: 'all 0.2s'
                }} onClick={() => canVote && setSelectedPlayer(1)}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔥</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f97316' }}>
                        {formatAddr(player1)}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                        {score1Num.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>

                <div style={{
                    padding: '0 12px',
                    fontSize: '20px',
                    fontWeight: 900,
                    color: '#6b7280'
                }}>VS</div>

                <div style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    background: selectedPlayer === 2 ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.2)',
                    border: selectedPlayer === 2 ? '2px solid #3b82f6' : '2px solid transparent',
                    cursor: canVote ? 'pointer' : 'default',
                    transition: 'all 0.2s'
                }} onClick={() => canVote && setSelectedPlayer(2)}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>💧</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6' }}>
                        {formatAddr(player2)}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                        {score2Num.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>

            {/* Score Bar */}
            <div style={{
                height: '8px',
                borderRadius: '4px',
                background: 'rgba(0,0,0,0.3)',
                overflow: 'hidden',
                marginBottom: '12px'
            }}>
                <div style={{
                    height: '100%',
                    width: `${score1Pct}%`,
                    background: 'linear-gradient(90deg, #f97316, #eab308)',
                    transition: 'width 0.5s ease'
                }} />
            </div>

            {/* Timer */}
            <div style={{
                textAlign: 'center',
                padding: '10px',
                borderRadius: '8px',
                background: isEnded ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                marginBottom: '16px'
            }}>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>
                    {isEnded ? 'Match Ended' : 'Time Remaining'}
                </div>
                <div style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: isEnded ? '#ef4444' : '#22c55e',
                    fontFamily: 'monospace'
                }}>
                    {timeLeft}
                </div>
            </div>

            {/* Pool Info */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '16px'
            }}>
                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    padding: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '9px', color: '#6b7280' }}>Total Pool</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24' }}>
                        {Number(formatUnits(totalPool, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>
                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    padding: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '9px', color: '#6b7280' }}>Voter Reward</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>
                        85%
                    </div>
                </div>
            </div>

            {/* Status Badge */}
            {finalized && (
                <div style={{
                    textAlign: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    background: isRefunded ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)',
                    marginBottom: '12px',
                    border: `1px solid ${isRefunded ? 'rgba(234,179,8,0.3)' : 'rgba(34,197,94,0.3)'}`
                }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                        {isRefunded ? '↩️' : '🏆'}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: isRefunded ? '#fbbf24' : '#22c55e' }}>
                        {isRefunded ? 'REFUNDED' : `WINNER: ${score1 > score2 ? formatAddr(player1) : formatAddr(player2)}`}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Vote Section */}
                {canVote && (
                    <>
                        <div style={{ marginBottom: '4px' }}>
                            <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>
                                Vote Amount (Balance: {userBalance ? Number(formatUnits(userBalance, 18)).toLocaleString() : '0'})
                            </div>
                            <input
                                type="number"
                                placeholder="Enter amount..."
                                value={voteAmount}
                                onChange={(e) => setVoteAmount(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px',
                                    padding: '10px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {needsApproval ? (
                            <button
                                onClick={handleApprove}
                                disabled={isApproving || isApproveConfirming || !voteAmount}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #6b7280, #4b5563)',
                                    color: '#fff',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                {isApproving || isApproveConfirming ? 'Approving...' : '1️⃣ Approve'}
                            </button>
                        ) : (
                            <button
                                onClick={handleVote}
                                disabled={isVoting || isVoteConfirming || !voteAmount || !selectedPlayer}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: selectedPlayer
                                        ? selectedPlayer === 1
                                            ? 'linear-gradient(135deg, #f97316, #eab308)'
                                            : 'linear-gradient(135deg, #3b82f6, #6366f1)'
                                        : 'rgba(255,255,255,0.1)',
                                    color: selectedPlayer ? '#fff' : '#6b7280',
                                    fontWeight: 700,
                                    cursor: selectedPlayer && voteAmount ? 'pointer' : 'not-allowed'
                                }}
                            >
                                {isVoting || isVoteConfirming
                                    ? 'Voting...'
                                    : selectedPlayer
                                        ? `🗳️ Vote for ${selectedPlayer === 1 ? 'Player 1' : 'Player 2'}`
                                        : 'Select a player to vote'
                                }
                            </button>
                        )}
                    </>
                )}

                {/* Finalize Button */}
                {canFinalize && (
                    <button
                        onClick={handleFinalize}
                        disabled={isFinalizing || isFinalizeConfirming}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        {isFinalizing || isFinalizeConfirming ? 'Finalizing...' : '⚡ Finalize Match'}
                    </button>
                )}

                {/* Claim Button */}
                {canClaim && (
                    <button
                        onClick={handleClaim}
                        disabled={isClaiming || isClaimConfirming}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        {isClaiming || isClaimConfirming ? 'Claiming...' : '💰 Claim Reward'}
                    </button>
                )}

                {/* Already Claimed */}
                {finalized && hasClaimed && (
                    <div style={{
                        textAlign: 'center',
                        padding: '10px',
                        color: '#6b7280',
                        fontSize: '12px'
                    }}>
                        ✅ Already claimed
                    </div>
                )}
            </div>

            {/* Success Messages */}
            {isVoteSuccess && (
                <div style={{ textAlign: 'center', color: '#22c55e', marginTop: '8px', fontSize: '12px' }}>
                    ✅ Vote successful!
                </div>
            )}
            {isFinalizeSuccess && (
                <div style={{ textAlign: 'center', color: '#8b5cf6', marginTop: '8px', fontSize: '12px' }}>
                    ✅ Match finalized!
                </div>
            )}
            {isClaimSuccess && (
                <div style={{ textAlign: 'center', color: '#22c55e', marginTop: '8px', fontSize: '12px' }}>
                    ✅ Reward claimed!
                </div>
            )}
        </div>
    );
}
