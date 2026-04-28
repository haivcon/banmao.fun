"use client";
import React, { useState, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { BANMAO_TOKEN_ADDRESS, ERC20_ABI, BANMAO_HUB_ADDRESS, BANMAO_HUB_ABI } from "../lib/hubContract";

interface TipModalProps {
    t: Record<string, string>;
    postId: number;
    creatorAddress: string;
    creatorName: string;
    tipperAddress: string;
    onClose: () => void;
    onSuccess: (amount?: string) => void;
}

export default function TipModal({ t, postId, creatorAddress, creatorName, tipperAddress, onClose, onSuccess }: TipModalProps) {
    const [amount, setAmount] = useState("");
    const [step, setStep] = useState<"input" | "approve" | "tip" | "done">("input");
    const [error, setError] = useState("");
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

    // Check if BanmaoHub contract is deployed
    const isContractDeployed = BANMAO_HUB_ADDRESS !== "0x0000000000000000000000000000000000000000";

    // Read user's $banmao balance
    const { data: balance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [tipperAddress as `0x${string}`],
    });

    // Read allowance for the hub contract
    const { data: allowance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [tipperAddress as `0x${string}`, BANMAO_HUB_ADDRESS],
        query: { enabled: isContractDeployed },
    });

    const { writeContract: writeApprove, data: approveTxHash } = useWriteContract();
    const { writeContract: writeTip, data: tipTxHash } = useWriteContract();
    const { writeContract: writeTransfer, data: transferTxHash } = useWriteContract();

    // Wait for approve tx
    const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });
    // Wait for tip tx (via contract)
    const { isSuccess: tipSuccess } = useWaitForTransactionReceipt({ hash: tipTxHash });
    // Wait for direct transfer tx
    const { isSuccess: transferSuccess } = useWaitForTransactionReceipt({ hash: transferTxHash });

    // React to tx completions
    React.useEffect(() => {
        if (approveSuccess && step === "approve") setStep("tip");
    }, [approveSuccess, step]);

    React.useEffect(() => {
        if ((tipSuccess || transferSuccess) && (step === "tip")) {
            const hash = tipTxHash || transferTxHash;
            if (hash) {
                setTxHash(hash);
                // Record tip in database
                fetch("/api/hub/tips", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        txHash: hash,
                        postId,
                        tipperAddress,
                        creatorAddress,
                        amount: parseUnits(amount, 18).toString(),
                        feeAmount: isContractDeployed ? (parseUnits(amount, 18) * BigInt(200) / BigInt(10000)).toString() : "0",
                    }),
                }).then(() => {
                    setStep("done");
                    onSuccess(amount);
                }).catch(console.error);
            }
        }
    }, [tipSuccess, transferSuccess, step, tipTxHash, transferTxHash, postId, tipperAddress, creatorAddress, amount, isContractDeployed, onSuccess]);

    const handleSend = useCallback(async () => {
        if (!amount || Number(amount) <= 0) return;
        setError("");

        try {
            const amountWei = parseUnits(amount, 18);

            if (isContractDeployed) {
                // Use BanmaoHub contract (with fee)
                const currentAllowance = allowance ? BigInt(String(allowance)) : BigInt(0);
                if (currentAllowance < amountWei) {
                    setStep("approve");
                    writeApprove({
                        address: BANMAO_TOKEN_ADDRESS,
                        abi: ERC20_ABI,
                        functionName: "approve",
                        args: [BANMAO_HUB_ADDRESS, amountWei],
                    } as any);
                } else {
                    setStep("tip");
                    writeTip({
                        address: BANMAO_HUB_ADDRESS,
                        abi: BANMAO_HUB_ABI,
                        functionName: "tip",
                        args: [creatorAddress as `0x${string}`, amountWei, BigInt(postId)],
                    } as any);
                }
            } else {
                // Direct transfer (no contract, no fee)
                setStep("tip");
                writeTransfer({
                    address: BANMAO_TOKEN_ADDRESS,
                    abi: ERC20_ABI,
                    functionName: "transfer",
                    args: [creatorAddress as `0x${string}`, amountWei],
                } as any);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Transaction failed");
            setStep("input");
        }
    }, [amount, isContractDeployed, allowance, writeApprove, writeTip, writeTransfer, creatorAddress, postId]);

    const formatBalance = (bal: unknown) => {
        if (!bal) return "0";
        return (Number(BigInt(String(bal))) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 });
    };

    const presets = [100, 1000, 10000, 100000];

    return (
        <div className="hub-modal-overlay" onClick={onClose}>
            <div className="hub-modal hub-tip-modal" onClick={(e) => e.stopPropagation()}>
                <div className="hub-modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon" style={{ color: '#ec4899' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                        {t.tipCreator}
                    </h3>
                    <button className="hub-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="hub-modal-body">
                    <div className="hub-tip-creator">
                        <span className="hub-tip-to">
                            <svg fill="currentColor" viewBox="0 0 24 24" className="hub-icon-sm"><path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" /></svg>
                            {creatorName}
                        </span>
                    </div>

                    {step === "input" && (
                        <>
                            <div className="hub-tip-balance-row">
                                <span className="hub-tip-balance-label">{t.tipBalance || t.tipAmount}</span>
                                <span className="hub-tip-balance-val">{formatBalance(balance)} $BANMAO</span>
                            </div>

                            <div className="hub-tip-input-wrapper">
                                <input
                                    className="hub-tip-input"
                                    type="number"
                                    placeholder="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="1"
                                />
                                <span className="hub-tip-symbol">$BANMAO</span>
                            </div>

                            <div className="hub-tip-presets">
                                {presets.map(p => (
                                    <button
                                        key={p}
                                        className={`hub-tip-preset ${amount === String(p) ? "active" : ""}`}
                                        onClick={() => setAmount(String(p))}
                                    >
                                        {p.toLocaleString()}
                                    </button>
                                ))}
                            </div>

                            {isContractDeployed && (
                                <div className="hub-tip-fee-note">ℹ️ {t.tipFee}</div>
                            )}
                        </>
                    )}

                    {step === "approve" && (
                        <div className="hub-tip-status">
                            <svg className="hub-icon" style={{ width: '32px', height: '32px', color: '#8b5cf6' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                            {t.tipApproving || t.tipApprove}
                        </div>
                    )}
                    {step === "tip" && (
                        <div className="hub-tip-status">
                            <svg className="hub-icon" style={{ width: '32px', height: '32px', color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                            {t.tipSending}
                        </div>
                    )}
                    {step === "done" && (
                        <div className="hub-tip-success">
                            <div className="hub-tip-confetti">🎉🎊✨🎉🎊✨</div>
                            <div className="hub-tip-success-icon">
                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '32px', height: '32px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            </div>
                            <h4>{t.tipSuccess}</h4>
                            {txHash && (
                                <a href={`https://www.okx.com/web3/explorer/xlayer/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="hub-tip-tx-link">
                                    {t.viewTransaction}
                                </a>
                            )}
                        </div>
                    )}

                    {error && <div className="hub-error">{error}</div>}
                </div>

                <div className="hub-modal-footer">
                    {step === "input" && (
                        <button className="hub-btn hub-btn-primary hub-btn-tip" disabled={!amount || Number(amount) <= 0} onClick={handleSend} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon-sm">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                            </svg>
                            {t.tipSend} {amount ? `${Number(amount).toLocaleString()} $BANMAO` : ""}
                        </button>
                    )}
                    {step === "done" && (
                        <button className="hub-btn hub-btn-secondary" onClick={onClose}>✕ {t.close}</button>
                    )}
                </div>
            </div>
        </div>
    );
}
