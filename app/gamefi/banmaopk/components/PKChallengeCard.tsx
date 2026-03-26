/**
 * ChallengeCard Component - Displays a pending Challenge
 */
"use client";

import React from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { BANMAOPK_ADDRESS, BANMAO_ADDRESS } from "../lib/constants";
import { BANMAOPK_ABI, ERC20_ABI } from "../lib/abis";

interface ChallengeCardProps {
    challengeId: bigint;
}

export default function ChallengeCard({ challengeId }: ChallengeCardProps) {
    const { address } = useAccount();

    const { data: challengeData, refetch } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "challenges",
        args: [challengeId],
    });

    const { writeContract: acceptChallenge, data: acceptHash, isPending: isAccepting } = useWriteContract();
    const { isLoading: isAcceptConfirming, isSuccess: isAcceptSuccess } = useWaitForTransactionReceipt({ hash: acceptHash });

    const { writeContract: cancelChallenge, data: cancelHash, isPending: isCancelling } = useWriteContract();
    const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ hash: cancelHash });

    React.useEffect(() => {
        if (isAcceptSuccess || isCancelSuccess) {
            refetch();
        }
    }, [isAcceptSuccess, isCancelSuccess, refetch]);

    if (!challengeData) {
        return (
            <div className="pk-card animate-pulse">
                <div className="h-24 bg-gray-700/50 rounded" />
            </div>
        );
    }

    const [host, target, deposit, duration, isActive] = challengeData;

    // Skip inactive challenges
    if (!isActive) {
        return null;
    }

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const formatDuration = (seconds: bigint) => {
        const s = Number(seconds);
        if (s >= 86400) return `${Math.floor(s / 86400)} ngày`;
        if (s >= 3600) return `${Math.floor(s / 3600)} giờ`;
        return `${Math.floor(s / 60)} phút`;
    };

    const isHost = address?.toLowerCase() === host.toLowerCase();
    const isTargeted = target !== "0x0000000000000000000000000000000000000000";
    const canAccept = !isHost && (!isTargeted || address?.toLowerCase() === target.toLowerCase());

    const handleAccept = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acceptChallenge as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "acceptChallenge",
            args: [challengeId],
        });
    };

    const handleCancel = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cancelChallenge as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "cancelChallenge",
            args: [challengeId],
        });
    };

    return (
        <div className="pk-card">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-gray-500">Challenge #{challengeId.toString()}</span>
                {isTargeted ? (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400">
                        🎯 Targeted
                    </span>
                ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400">
                        🌐 Open
                    </span>
                )}
            </div>

            {/* Info */}
            <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Host:</span>
                    <span className="font-bold text-orange-400">{formatAddress(host)}</span>
                </div>
                {isTargeted && (
                    <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Target:</span>
                        <span className="font-bold text-purple-400">{formatAddress(target)}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Deposit:</span>
                    <span className="font-bold text-yellow-400">
                        {Number(formatUnits(deposit, 18)).toLocaleString()} BANMAO
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Duration:</span>
                    <span className="font-bold">{formatDuration(duration)}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                {isHost ? (
                    <button
                        onClick={handleCancel}
                        disabled={isCancelling || isCancelConfirming}
                        className="pk-btn pk-btn-secondary flex-1"
                    >
                        {isCancelling || isCancelConfirming ? "Đang hủy..." : "❌ Hủy Kèo"}
                    </button>
                ) : canAccept ? (
                    <button
                        onClick={handleAccept}
                        disabled={isAccepting || isAcceptConfirming}
                        className="pk-btn pk-btn-primary flex-1"
                    >
                        {isAccepting || isAcceptConfirming ? "Đang nhận..." : "⚔️ Nhận Kèo"}
                    </button>
                ) : (
                    <div className="text-center text-gray-500 text-sm w-full py-2">
                        Kèo này dành riêng cho người khác
                    </div>
                )}
            </div>
        </div>
    );
}
