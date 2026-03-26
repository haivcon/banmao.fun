/**
 * Match Room Page - Detailed View for a PK Battle
 */
"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import SharedProviders from "../../../../providers";
import { BANMAOPK_ADDRESS, BANMAO_ADDRESS } from "../../lib/constants";
import { BANMAOPK_ABI, ERC20_ABI } from "../../lib/abis";
import "../../globals.css";

export default function MatchRoomPage() {
    return (
        <SharedProviders>
            <MatchRoomContent />
        </SharedProviders>
    );
}

function MatchRoomContent() {
    const params = useParams();
    const matchId = BigInt(params.id as string);
    const { address } = useAccount();

    const [voteAmount, setVoteAmount] = useState("");
    const [selectedSide, setSelectedSide] = useState<1 | 2 | null>(null);

    // Read Match Data
    const { data: matchData, refetch: refetchMatch } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "matches",
        args: [matchId],
    });

    // Read User Votes (Need custom implementation since mappings aren't directly accessible)
    const { data: hasClaimed } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "hasClaimedReward",
        args: address ? [matchId, address] : undefined,
    });

    const { data: votersSharePercent } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "votersShare",
    });

    // Write Functions
    const { writeContract: vote, data: voteHash, isPending: isVoting } = useWriteContract();
    const { isLoading: isVoteConfirming, isSuccess: isVoteSuccess } = useWaitForTransactionReceipt({ hash: voteHash });

    const { writeContract: finalize, data: finalizeHash, isPending: isFinalizing } = useWriteContract();
    const { isLoading: isFinalizeConfirming, isSuccess: isFinalizeSuccess } = useWaitForTransactionReceipt({ hash: finalizeHash });

    const { writeContract: claim, data: claimHash, isPending: isClaiming } = useWriteContract();
    const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

    // Watch for events
    useWatchContractEvent({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        eventName: "Voted",
        onLogs() { refetchMatch(); },
    });

    useWatchContractEvent({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        eventName: "MatchFinalized",
        onLogs() { refetchMatch(); },
    });

    useWatchContractEvent({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        eventName: "MatchExtended",
        onLogs() { refetchMatch(); },
    });

    // Auto-refresh every 5 seconds
    useEffect(() => {
        const interval = setInterval(refetchMatch, 5000);
        return () => clearInterval(interval);
    }, [refetchMatch]);

    useEffect(() => {
        if (isVoteSuccess || isFinalizeSuccess || isClaimSuccess) {
            refetchMatch();
            setVoteAmount("");
        }
    }, [isVoteSuccess, isFinalizeSuccess, isClaimSuccess, refetchMatch]);

    if (!matchData) {
        return (
            <div className="pk-container flex items-center justify-center min-h-screen">
                <div className="text-xl">Loading Match #{matchId.toString()}...</div>
            </div>
        );
    }

    const [p1, p2, score1, score2, startTime, endTime, finalized, isRefunded, overtimeCount, totalPool, totalVotes1, totalVotes2] = matchData;

    const now = BigInt(Math.floor(Date.now() / 1000));
    const isEnded = now >= endTime;
    const timeLeft = isEnded ? 0n : endTime - now;
    const totalScore = score1 + score2;
    const percent1 = totalScore > 0n ? Number((score1 * 100n) / totalScore) : 50;

    const winner = score1 > score2 ? p1 : p2;
    const votersShare = votersSharePercent || 85n;

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const formatTime = (seconds: bigint) => {
        const s = Number(seconds);
        if (s > 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
        if (s > 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
        if (s > 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
        return `${s}s`;
    };

    // Estimate reward calculation
    const estimateReward = () => {
        if (!voteAmount || !selectedSide) return null;
        try {
            const amount = parseUnits(voteAmount, 18);
            const winSideVotes = selectedSide === 1 ? totalVotes1 + amount : totalVotes2 + amount;
            const newPool = totalPool + amount;
            const votersPool = (newPool * BigInt(votersShare)) / 100n;
            const estimated = (amount * votersPool) / winSideVotes;
            return estimated;
        } catch {
            return null;
        }
    };

    const handleVote = () => {
        if (!selectedSide || !voteAmount) return;
        const candidate = selectedSide === 1 ? p1 : p2;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vote as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "vote",
            args: [matchId, candidate, parseUnits(voteAmount, 18)],
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

    const estimated = estimateReward();

    return (
        <div className="pk-container">
            {/* Header */}
            <header className="pk-header">
                <Link href="/gamefi/banmaopk" className="pk-btn pk-btn-secondary">
                    ← Quay Lại
                </Link>
                <h1 className="pk-title">Match #{matchId.toString()}</h1>
                <div />
            </header>

            <main className="pk-main max-w-4xl mx-auto">
                {/* Status Banner */}
                <div className="text-center mb-8">
                    {overtimeCount > 0n && !finalized && (
                        <div className="pk-timer overtime text-lg mb-4">
                            ⚡ SUDDEN DEATH - Overtime x{overtimeCount.toString()}!
                        </div>
                    )}
                    {finalized ? (
                        <div className="text-2xl font-bold text-yellow-400">
                            🏆 {isRefunded ? "REFUNDED" : `WINNER: ${formatAddress(winner)}`}
                        </div>
                    ) : isEnded ? (
                        <div className="pk-timer danger inline-block text-lg">
                            ⏳ Đang chờ Finalize...
                        </div>
                    ) : (
                        <div className={`pk-timer ${Number(timeLeft) < 300 ? "danger" : ""} inline-block text-lg`}>
                            ⏱️ Còn lại: {formatTime(timeLeft)}
                        </div>
                    )}
                </div>

                {/* VS Display */}
                <div className="pk-card mb-8">
                    <div className="pk-vs-container py-8">
                        <div
                            className={`pk-player cursor-pointer p-4 rounded-xl transition-all ${selectedSide === 1 ? "ring-2 ring-red-500 bg-red-500/10" : ""}`}
                            onClick={() => !finalized && !isEnded && setSelectedSide(1)}
                        >
                            <div className="pk-player-avatar text-5xl">🦁</div>
                            <div className="text-lg font-bold text-red-400 mt-2">{formatAddress(p1)}</div>
                            <div className="text-3xl font-black mt-2">
                                {Number(formatUnits(score1, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-xs text-gray-500">Điểm</div>
                        </div>

                        <div className="pk-vs-text text-4xl">VS</div>

                        <div
                            className={`pk-player cursor-pointer p-4 rounded-xl transition-all ${selectedSide === 2 ? "ring-2 ring-blue-500 bg-blue-500/10" : ""}`}
                            onClick={() => !finalized && !isEnded && setSelectedSide(2)}
                        >
                            <div className="pk-player-avatar p2 text-5xl">🐯</div>
                            <div className="text-lg font-bold text-blue-400 mt-2">{formatAddress(p2)}</div>
                            <div className="text-3xl font-black mt-2">
                                {Number(formatUnits(score2, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-xs text-gray-500">Điểm</div>
                        </div>
                    </div>

                    {/* Score Bar */}
                    <div className="px-4 pb-4">
                        <div className="pk-score-bar h-4">
                            <div className="pk-score-fill left h-full" style={{ width: `${percent1}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                            <span>{percent1.toFixed(1)}%</span>
                            <span>Pool: {Number(formatUnits(totalPool, 18)).toLocaleString()} BANMAO</span>
                            <span>{(100 - percent1).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                {/* Vote Panel (if active) */}
                {!finalized && !isEnded && (
                    <div className="pk-card mb-8">
                        <h3 className="text-lg font-bold mb-4">🗳️ Vote cho {selectedSide === 1 ? "Trái" : selectedSide === 2 ? "Phải" : "..."}</h3>
                        <div className="flex gap-4 mb-4">
                            <input
                                type="number"
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white"
                                placeholder="Số lượng BANMAO"
                                value={voteAmount}
                                onChange={(e) => setVoteAmount(e.target.value)}
                            />
                            <button
                                onClick={handleVote}
                                disabled={!selectedSide || !voteAmount || isVoting || isVoteConfirming}
                                className="pk-btn pk-btn-primary px-8"
                            >
                                {isVoting || isVoteConfirming ? "Đang gửi..." : "Vote 🚀"}
                            </button>
                        </div>
                        {estimated && (
                            <div className="text-sm text-green-400">
                                💰 Ước tính thưởng nếu thắng: ~{Number(formatUnits(estimated, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })} BANMAO
                            </div>
                        )}
                    </div>
                )}

                {/* Finalize Button (if ended but not finalized) */}
                {isEnded && !finalized && (
                    <div className="pk-card text-center mb-8">
                        <p className="text-gray-400 mb-4">Trận đấu đã kết thúc. Nhấn để xử lý kết quả.</p>
                        <button
                            onClick={handleFinalize}
                            disabled={isFinalizing || isFinalizeConfirming}
                            className="pk-btn pk-btn-primary"
                        >
                            {isFinalizing || isFinalizeConfirming ? "Đang xử lý..." : "⚡ Finalize Match"}
                        </button>
                    </div>
                )}

                {/* Claim Panel (if finalized) */}
                {finalized && (
                    <div className="pk-card text-center">
                        {hasClaimed ? (
                            <div className="text-green-400 font-bold text-xl">✅ Bạn đã nhận thưởng rồi!</div>
                        ) : isRefunded ? (
                            <>
                                <p className="text-gray-400 mb-4">Trận đấu bị hủy. Bạn có thể lấy lại tiền đã vote.</p>
                                <button
                                    onClick={handleClaim}
                                    disabled={isClaiming || isClaimConfirming}
                                    className="pk-btn bg-green-500 text-white"
                                >
                                    {isClaiming || isClaimConfirming ? "Đang xử lý..." : "🔄 Hoàn Tiền"}
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-gray-400 mb-4">
                                    Nếu bạn vote cho phe thắng, hãy nhận thưởng!
                                </p>
                                <button
                                    onClick={handleClaim}
                                    disabled={isClaiming || isClaimConfirming}
                                    className="pk-btn pk-btn-primary text-lg py-4 px-8"
                                >
                                    {isClaiming || isClaimConfirming ? "Đang xử lý..." : "🎁 Nhận Thưởng"}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
