/**
 * Profile Page - User's PK History and Winnings
 */
"use client";

import React from "react";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import SharedProviders from "../../../providers";
import { BANMAOPK_ADDRESS } from "../lib/constants";
import { BANMAOPK_ABI } from "../lib/abis";
import "../globals.css";

export default function ProfilePage() {
    return (
        <SharedProviders>
            <ProfileContent />
        </SharedProviders>
    );
}

function ProfileContent() {
    const { address, isConnected } = useAccount();

    // Read pending winnings
    const { data: pendingWinnings, refetch: refetchWinnings } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "pendingWinnings",
        args: address ? [address] : undefined,
    });

    // Withdraw
    const { writeContract: withdraw, data: withdrawHash, isPending: isWithdrawing } = useWriteContract();
    const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });

    React.useEffect(() => {
        if (isWithdrawSuccess) {
            refetchWinnings();
        }
    }, [isWithdrawSuccess, refetchWinnings]);

    const handleWithdraw = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (withdraw as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "withdrawWinnings",
        });
    };

    if (!isConnected) {
        return (
            <div className="pk-container flex items-center justify-center min-h-screen">
                <div className="pk-card text-center max-w-md">
                    <div className="text-6xl mb-4">🔐</div>
                    <h2 className="text-2xl font-bold mb-4">Vui Lòng Kết Nối Ví</h2>
                    <p className="text-gray-400">Bạn cần kết nối ví để xem thông tin cá nhân.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pk-container">
            {/* Header */}
            <header className="pk-header">
                <Link href="/gamefi/banmaopk" className="pk-btn pk-btn-secondary">
                    ← Quay Lại
                </Link>
                <h1 className="pk-title">👤 Profile</h1>
                <div />
            </header>

            <main className="pk-main max-w-2xl mx-auto">
                {/* Address Display */}
                <div className="pk-card mb-6">
                    <div className="text-sm text-gray-500 mb-2">Địa chỉ ví</div>
                    <div className="font-mono text-lg">{address}</div>
                </div>

                {/* Pending Winnings */}
                <div className="pk-card mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Số dư chờ rút</div>
                            <div className="text-3xl font-black text-yellow-400">
                                {pendingWinnings
                                    ? Number(formatUnits(pendingWinnings, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })
                                    : "0"
                                } BANMAO
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Bao gồm: Tiền thắng KOL, Phí từ trận đấu
                            </div>
                        </div>
                        <button
                            onClick={handleWithdraw}
                            disabled={!pendingWinnings || pendingWinnings === 0n || isWithdrawing || isWithdrawConfirming}
                            className="pk-btn pk-btn-primary"
                        >
                            {isWithdrawing || isWithdrawConfirming ? "Đang rút..." : "💸 Rút Tiền"}
                        </button>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="pk-card">
                        <div className="text-4xl mb-2">🎮</div>
                        <div className="text-sm text-gray-500">Để xem lịch sử vote</div>
                        <div className="font-bold mt-1">Coming Soon</div>
                    </div>
                    <div className="pk-card">
                        <div className="text-4xl mb-2">🏆</div>
                        <div className="text-sm text-gray-500">Để xem thống kê</div>
                        <div className="font-bold mt-1">Coming Soon</div>
                    </div>
                </div>

                {isWithdrawSuccess && (
                    <div className="mt-6 text-center text-green-400 font-bold">
                        ✅ Rút tiền thành công!
                    </div>
                )}
            </main>
        </div>
    );
}
