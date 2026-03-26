/**
 * PKGame Component - PvP Popularity Battle Mode
 * Functional version connected to deployed BanMaoPK contract
 */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { BANMAOPK_ADDRESS, BANMAO_ADDRESS } from "../lib/constants";
import { BANMAOPK_ABI, ERC20_ABI } from "../lib/abis";
import { GameToaster } from "./GameToast";
import gameToast from "./GameToast";

interface PKGameProps {
    t: any;
}

export default function PKGame({ t }: PKGameProps) {
    const { address, isConnected } = useAccount();
    const [voteAmount, setVoteAmount] = useState("");
    const [selectedSide, setSelectedSide] = useState<1 | 2 | null>(null);
    const matchId = 1n; // First match

    // Read Match Data
    const { data: matchData, refetch: refetchMatch, isLoading: isLoadingMatch } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "matches",
        args: [matchId],
    });

    // Read Current Match ID
    const { data: currentMatchId } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "currentMatchId",
    });

    // Write: Vote
    const { writeContract: vote, data: voteHash, isPending: isVoting } = useWriteContract();
    const { isLoading: isVoteConfirming, isSuccess: isVoteSuccess } = useWaitForTransactionReceipt({ hash: voteHash });

    useEffect(() => {
        if (isVoteSuccess) {
            gameToast.success("Vote thành công! 🎉");
            refetchMatch();
            setVoteAmount("");
        }
    }, [isVoteSuccess, refetchMatch]);

    // Auto refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(refetchMatch, 10000);
        return () => clearInterval(interval);
    }, [refetchMatch]);

    const handleVote = () => {
        if (!selectedSide || !voteAmount || !matchData) return;
        const [p1, p2] = matchData;
        const candidate = selectedSide === 1 ? p1 : p2;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (vote as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "vote",
            args: [matchId, candidate, parseUnits(voteAmount, 18)],
        });
    };

    // No matches yet - show placeholder
    if (!currentMatchId || currentMatchId === 0n || !matchData) {
        return (
            <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#fff',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '24px'
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(59,130,246,0.15))',
                    borderRadius: '24px',
                    padding: '40px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    maxWidth: '600px',
                    width: '100%'
                }}>
                    <div style={{ fontSize: '72px', marginBottom: '16px' }}>⚔️</div>
                    <h2 style={{
                        fontSize: '28px',
                        fontWeight: 800,
                        background: 'linear-gradient(to right, #ef4444, #8b5cf6, #3b82f6)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '16px'
                    }}>
                        PK BATTLE
                    </h2>
                    <p style={{ color: '#9ca3af', fontSize: '16px', marginBottom: '24px' }}>
                        {isLoadingMatch ? "Đang tải dữ liệu..." : "Chưa có trận đấu nào. Tạo Challenge để bắt đầu!"}
                    </p>
                    <Link
                        href="/gamefi/banmaopk/create"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '14px 28px',
                            background: 'linear-gradient(135deg, #f97316, #eab308)',
                            borderRadius: '12px',
                            color: '#000',
                            fontWeight: 700,
                            fontSize: '16px',
                            textDecoration: 'none'
                        }}
                    >
                        ⚡ Tạo Kèo Mới
                    </Link>
                </div>
                <Link
                    href="/gamefi/banmaopk"
                    style={{ color: '#9ca3af', fontSize: '14px', textDecoration: 'underline' }}
                >
                    Xem Dashboard đầy đủ →
                </Link>
            </div>
        );
    }

    // Parse match data
    const [p1, p2, score1, score2, startTime, endTime, finalized, isRefunded, overtimeCount, totalPool] = matchData;
    const now = BigInt(Math.floor(Date.now() / 1000));
    const isEnded = now >= endTime;
    const timeLeft = isEnded ? 0n : endTime - now;
    const totalScore = score1 + score2;
    const percent1 = totalScore > 0n ? Number((score1 * 100n) / totalScore) : 50;

    const formatTime = (seconds: bigint) => {
        const s = Number(seconds);
        if (s > 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
        if (s > 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
        if (s > 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
        return `${s}s`;
    };

    const formatAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <div style={{ padding: '20px', color: '#fff' }}>
            <GameToaster />

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    background: 'linear-gradient(to right, #ef4444, #8b5cf6, #3b82f6)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    ⚔️ PK BATTLE #{matchId.toString()}
                </h2>
                <div style={{ color: '#9ca3af', marginTop: '8px' }}>
                    Pool: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{Number(formatUnits(totalPool, 18)).toLocaleString()}</span> BANMAO
                </div>
                {overtimeCount > 0n && !finalized && (
                    <div style={{
                        marginTop: '8px',
                        color: '#f97316',
                        fontWeight: 700,
                        animation: 'pulse 1.5s infinite'
                    }}>
                        ⚡ SUDDEN DEATH x{overtimeCount.toString()}
                    </div>
                )}
            </div>

            {/* VS Card */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Player 1 */}
                    <div
                        onClick={() => !finalized && !isEnded && setSelectedSide(1)}
                        style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '20px',
                            borderRadius: '16px',
                            cursor: finalized || isEnded ? 'default' : 'pointer',
                            border: selectedSide === 1 ? '2px solid #ef4444' : '2px solid transparent',
                            background: selectedSide === 1 ? 'rgba(239,68,68,0.1)' : 'transparent',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🦁</div>
                        <div style={{ color: '#f87171', fontWeight: 600 }}>{formatAddr(p1)}</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px' }}>
                            {Number(formatUnits(score1, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>Điểm</div>
                    </div>

                    {/* VS */}
                    <div style={{ padding: '0 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '36px', fontWeight: 900, color: '#374151' }}>VS</div>
                        <div style={{
                            marginTop: '12px',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: 600,
                            background: finalized ? 'rgba(34,197,94,0.2)' : isEnded ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.1)',
                            color: finalized ? '#22c55e' : isEnded ? '#ef4444' : '#22c55e'
                        }}>
                            {finalized ? "✅ Kết thúc" : isEnded ? "⏳ Chờ Finalize" : `⏱️ ${formatTime(timeLeft)}`}
                        </div>
                    </div>

                    {/* Player 2 */}
                    <div
                        onClick={() => !finalized && !isEnded && setSelectedSide(2)}
                        style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '20px',
                            borderRadius: '16px',
                            cursor: finalized || isEnded ? 'default' : 'pointer',
                            border: selectedSide === 2 ? '2px solid #3b82f6' : '2px solid transparent',
                            background: selectedSide === 2 ? 'rgba(59,130,246,0.1)' : 'transparent',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🐯</div>
                        <div style={{ color: '#60a5fa', fontWeight: 600 }}>{formatAddr(p2)}</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px' }}>
                            {Number(formatUnits(score2, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>Điểm</div>
                    </div>
                </div>

                {/* Score Bar */}
                <div style={{ marginTop: '20px' }}>
                    <div style={{
                        height: '8px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.1)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${percent1}%`,
                            background: 'linear-gradient(to right, #ef4444, #f97316)',
                            borderRadius: '4px',
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                        <span>{percent1.toFixed(1)}%</span>
                        <span>{(100 - percent1).toFixed(1)}%</span>
                    </div>
                </div>
            </div>

            {/* Vote Panel */}
            {!finalized && !isEnded && isConnected && (
                <div style={{
                    marginTop: '24px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <h3 style={{ marginBottom: '16px', fontWeight: 600 }}>
                        🗳️ Vote cho {selectedSide === 1 ? 'Trái (🦁)' : selectedSide === 2 ? 'Phải (🐯)' : '...'}
                    </h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                            type="number"
                            value={voteAmount}
                            onChange={(e) => setVoteAmount(e.target.value)}
                            placeholder="Số lượng BANMAO"
                            style={{
                                flex: 1,
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                color: '#fff',
                                fontSize: '16px'
                            }}
                        />
                        <button
                            onClick={handleVote}
                            disabled={!selectedSide || !voteAmount || isVoting || isVoteConfirming}
                            style={{
                                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '14px 28px',
                                color: '#fff',
                                fontWeight: 700,
                                cursor: 'pointer',
                                opacity: !selectedSide || !voteAmount ? 0.5 : 1
                            }}
                        >
                            {isVoting || isVoteConfirming ? "..." : "Vote 🚀"}
                        </button>
                    </div>
                </div>
            )}

            {/* Link to full platform */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Link
                    href="/gamefi/banmaopk"
                    style={{
                        color: '#9ca3af',
                        fontSize: '14px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    Xem đầy đủ tại Dashboard →
                </Link>
            </div>
        </div>
    );
}
