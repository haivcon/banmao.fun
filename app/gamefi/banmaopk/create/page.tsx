/**
 * Create Challenge Page
 */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import SharedProviders from "../../../providers";
import { BANMAOPK_ADDRESS, BANMAO_ADDRESS, DURATION_PRESETS } from "../lib/constants";
import { BANMAOPK_ABI, ERC20_ABI } from "../lib/abis";
import "../globals.css";

export default function CreateChallengePage() {
    return (
        <SharedProviders>
            <CreateChallengeContent />
        </SharedProviders>
    );
}

function CreateChallengeContent() {
    const { address } = useAccount();
    const [targetAddress, setTargetAddress] = useState("");
    const [depositAmount, setDepositAmount] = useState("");
    const [duration, setDuration] = useState(DURATION_PRESETS[2].value); // Default 24h

    // Read min deposit
    const { data: minDeposit } = useReadContract({
        address: BANMAOPK_ADDRESS,
        abi: BANMAOPK_ABI,
        functionName: "minChallengeDeposit",
    });

    // Read user balance
    const { data: userBalance } = useReadContract({
        address: BANMAO_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });

    // Check allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: BANMAO_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, BANMAOPK_ADDRESS] : undefined,
    });

    // Approve
    const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

    // Create Challenge
    const { writeContract: createChallenge, data: createHash, isPending: isCreating } = useWriteContract();
    const { isLoading: isCreateConfirming, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({ hash: createHash });

    React.useEffect(() => {
        if (isApproveSuccess) {
            refetchAllowance();
        }
    }, [isApproveSuccess, refetchAllowance]);

    const depositBigInt = depositAmount ? parseUnits(depositAmount, 18) : 0n;
    const needsApproval = allowance !== undefined && depositBigInt > allowance;
    const isValid = depositBigInt >= (minDeposit || 0n) && depositBigInt <= (userBalance || 0n);

    const handleApprove = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (approve as any)({
            address: BANMAO_ADDRESS,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [BANMAOPK_ADDRESS, depositBigInt * 2n], // Approve extra for gas estimation
        });
    };

    const handleCreate = () => {
        const target = targetAddress.trim() || "0x0000000000000000000000000000000000000000";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (createChallenge as any)({
            address: BANMAOPK_ADDRESS,
            abi: BANMAOPK_ABI,
            functionName: "createChallenge",
            args: [BigInt(duration), depositBigInt, target],
        });
    };

    if (isCreateSuccess) {
        return (
            <div className="pk-container flex items-center justify-center min-h-screen">
                <div className="pk-card text-center max-w-md">
                    <div className="text-6xl mb-4">🎉</div>
                    <h2 className="text-2xl font-bold mb-4">Kèo Đã Được Tạo!</h2>
                    <p className="text-gray-400 mb-6">Chờ đối thủ nhận kèo để bắt đầu trận đấu.</p>
                    <Link href="/gamefi/banmaopk" className="pk-btn pk-btn-primary">
                        ← Về Dashboard
                    </Link>
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
                <h1 className="pk-title">🎯 Tạo Kèo Mới</h1>
                <div />
            </header>

            <main className="pk-main max-w-lg mx-auto">
                <div className="pk-card">
                    {/* Tax Warning */}
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <div className="font-bold text-red-400">Lưu ý về Thuế Token</div>
                                <p className="text-sm text-red-300/70 mt-1">
                                    Do token có thuế giao dịch, số điểm thực tế sẽ thấp hơn số tiền bạn gửi.
                                    Người nhận kèo cũng chịu thuế tương tự.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="space-y-6">
                        {/* Target Address */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Địa chỉ Đối thủ (Để trống = Ai cũng nhận được)
                            </label>
                            <input
                                type="text"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500"
                                placeholder="0x... (optional)"
                                value={targetAddress}
                                onChange={(e) => setTargetAddress(e.target.value)}
                            />
                        </div>

                        {/* Deposit Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Số Tiền Cọc (BANMAO)
                            </label>
                            <input
                                type="number"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500"
                                placeholder={`Min: ${minDeposit ? Number(formatUnits(minDeposit, 18)).toLocaleString() : "..."}`}
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Min: {minDeposit ? Number(formatUnits(minDeposit, 18)).toLocaleString() : "..."}</span>
                                <span>Balance: {userBalance ? Number(formatUnits(userBalance, 18)).toLocaleString() : "..."}</span>
                            </div>
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Thời gian đấu
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {DURATION_PRESETS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        onClick={() => setDuration(preset.value)}
                                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${duration === preset.value
                                            ? "bg-orange-500 text-white"
                                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                                            }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-4">
                            {needsApproval ? (
                                <button
                                    onClick={handleApprove}
                                    disabled={isApproving || isApproveConfirming}
                                    className="pk-btn pk-btn-secondary w-full py-4"
                                >
                                    {isApproving || isApproveConfirming ? "Đang Approve..." : "1️⃣ Approve Token"}
                                </button>
                            ) : (
                                <button
                                    onClick={handleCreate}
                                    disabled={!isValid || isCreating || isCreateConfirming}
                                    className="pk-btn pk-btn-primary w-full py-4 text-lg"
                                >
                                    {isCreating || isCreateConfirming ? "Đang tạo..." : "⚔️ Tạo Kèo"}
                                </button>
                            )}
                            {!isValid && depositAmount && (
                                <p className="text-red-400 text-sm text-center mt-2">
                                    {depositBigInt < (minDeposit || 0n)
                                        ? "Số tiền cọc dưới mức tối thiểu"
                                        : "Không đủ số dư"}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
