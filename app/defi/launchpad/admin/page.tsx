"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "../../../components/wallet/WalletConnection";
import { formatEther, parseEther } from "viem";
import {
    ArrowLeft, Shield, Wallet, Settings, Loader2, CheckCircle2, AlertTriangle,
    ExternalLink, DollarSign, ArrowRightLeft, GraduationCap, Key, RefreshCw
} from "lucide-react";
import "../launchpad.css";
import { useTranslation } from "../i18n/I18nContext";
import {
    LAUNCHPAD_ADDRESS,
    LAUNCHPAD_ABI,
    BANMAO_TOKEN_ADDRESS,
} from "../contracts";

// ===== Admin ABI (extends LAUNCHPAD_ABI with extra read functions) =====
const ADMIN_ABI = [
    ...LAUNCHPAD_ABI,
    {
        name: "totalActiveOkbReserves",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
] as const;

const shortenAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

// ===== Admin Card Component =====
function AdminCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
    return (
        <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 20px", fontSize: "17px" }}>
                <Icon size={20} className="text-orange-500" /> {title}
            </h3>
            {children}
        </div>
    );
}

// ===== Status Row =====
function StatusRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--lp-border)" }}>
            <span style={{ color: "var(--lp-text-tertiary)", fontSize: "14px" }}>{label}</span>
            <span style={{ color: "var(--lp-text-primary)", fontWeight: 600, fontSize: "14px", fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
        </div>
    );
}

export default function AdminPage() {
    const { address: userAddress, isConnected } = useAccount();
    const [txStatus, setTxStatus] = useState<string>("");

    // Form states
    const [newHookAddr, setNewHookAddr] = useState("");
    const [newCommunityWallet, setNewCommunityWallet] = useState("");
    const [newCreationFee, setNewCreationFee] = useState("");
    const [newOwner, setNewOwner] = useState("");
    const [migrateTokenAddr, setMigrateTokenAddr] = useState("");

    // ===== Read contract state =====
    const { data: owner, refetch: refetchOwner } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`, abi: ADMIN_ABI, functionName: "owner",
    });
    const { data: communityWallet } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`, abi: ADMIN_ABI, functionName: "communityWallet",
    });
    const { data: hookAddress } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`, abi: ADMIN_ABI, functionName: "hookAddress",
    });
    const { data: creationFee } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`, abi: ADMIN_ABI, functionName: "creationFee",
    });
    const { data: pendingFees, refetch: refetchFees } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`, abi: ADMIN_ABI, functionName: "pendingCommunityFees",
    });
    const { data: totalReserves } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`, abi: ADMIN_ABI, functionName: "totalActiveOkbReserves",
    });
    const { data: totalTokens } = useReadContract({
        address: LAUNCHPAD_ADDRESS as `0x${string}`, abi: ADMIN_ABI, functionName: "totalTokens",
    });

    const isOwner = owner && userAddress && (owner as string).toLowerCase() === userAddress.toLowerCase();

    // ===== Write functions =====
    const { writeContract, data: txHash } = useWriteContract();
    const { isSuccess: txConfirmed, isError: txFailed } = useWaitForTransactionReceipt({ hash: txHash });

    useEffect(() => {
        if (txConfirmed) {
            setTxStatus("success");
            refetchOwner();
            refetchFees();
            setTimeout(() => setTxStatus(""), 3000);
        }
        if (txFailed) {
            setTxStatus("error");
            setTimeout(() => setTxStatus(""), 3000);
        }
    }, [txConfirmed, txFailed, refetchOwner, refetchFees]);

    const execAdmin = (functionName: string, args: any[] = []) => {
        setTxStatus("pending");
        writeContract({
            address: LAUNCHPAD_ADDRESS as `0x${string}`,
            abi: ADMIN_ABI,
            functionName,
            args,
        } as any);
    };

    return (
        <div className="launchpad-page">
            <header className="launchpad-header">
                <div className="launchpad-title">
                    <Shield size={24} className="text-orange-500" />
                    <h1>Admin Panel</h1>
                </div>
                <div className="header-actions">
                    <ConnectButton showBalance={true} chainStatus="icon" accountStatus="avatar" />
                    <Link href="/defi/launchpad" className="icon-button" title="Back">
                        <ArrowLeft size={18} />
                    </Link>
                </div>
            </header>

            {/* TX Status Toast */}
            {txStatus && (
                <div style={{
                    position: "fixed", top: "80px", right: "24px", zIndex: 1001, padding: "12px 20px",
                    borderRadius: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600,
                    background: txStatus === "success" ? "rgba(34,197,94,0.15)" : txStatus === "error" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                    color: txStatus === "success" ? "var(--lp-success)" : txStatus === "error" ? "var(--lp-danger)" : "var(--lp-brand-primary)",
                    border: `1px solid ${txStatus === "success" ? "var(--lp-success)" : txStatus === "error" ? "var(--lp-danger)" : "var(--lp-brand-primary)"}`,
                    backdropFilter: "blur(12px)",
                }}>
                    {txStatus === "pending" && <Loader2 size={16} className="animate-spin" />}
                    {txStatus === "success" && <CheckCircle2 size={16} />}
                    {txStatus === "error" && <AlertTriangle size={16} />}
                    {txStatus === "pending" ? "Transaction pending..." : txStatus === "success" ? "Transaction confirmed!" : "Transaction failed"}
                </div>
            )}

            <div className="launchpad-content" style={{ maxWidth: "900px", gridTemplateColumns: "1fr" }}>
                {!isConnected ? (
                    <div className="glass-panel" style={{ padding: "48px", textAlign: "center" }}>
                        <Shield size={48} style={{ color: "var(--lp-text-tertiary)", margin: "0 auto 16px" }} />
                        <h3 style={{ marginBottom: "16px" }}>Connect your wallet to access the admin panel</h3>
                        <ConnectButton />
                    </div>
                ) : !isOwner ? (
                    <div className="glass-panel" style={{ padding: "48px", textAlign: "center" }}>
                        <AlertTriangle size={48} style={{ color: "var(--lp-danger)", margin: "0 auto 16px" }} />
                        <h3 style={{ color: "var(--lp-danger)", marginBottom: "8px" }}>Access Denied</h3>
                        <p style={{ color: "var(--lp-text-secondary)" }}>
                            Connected: {shortenAddr(userAddress || "")}<br />
                            Owner: {owner ? shortenAddr(owner as string) : "Loading..."}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: "24px" }}>
                        {/* Contract Status */}
                        <AdminCard icon={Settings} title="Contract Status">
                            <StatusRow label="Contract" value={LAUNCHPAD_ADDRESS === "0x0000000000000000000000000000000000000000" ? "⚠️ NOT DEPLOYED" : shortenAddr(LAUNCHPAD_ADDRESS)} mono />
                            <StatusRow label="Owner" value={shortenAddr(owner as string)} mono />
                            <StatusRow label="Community Wallet" value={communityWallet ? shortenAddr(communityWallet as string) : "—"} mono />
                            <StatusRow label="Hook Address" value={hookAddress && hookAddress !== "0x0000000000000000000000000000000000000000" ? shortenAddr(hookAddress as string) : "Not set"} mono />
                            <StatusRow label="Creation Fee" value={creationFee ? `${formatEther(creationFee as bigint)} BANMAO` : "—"} />
                            <StatusRow label="Total Tokens" value={totalTokens ? String(Number(totalTokens)) : "0"} />
                            <StatusRow label="Active OKB Reserves" value={totalReserves ? `${formatEther(totalReserves as bigint)} OKB` : "0"} />
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                                <span style={{ color: "var(--lp-text-tertiary)", fontSize: "14px" }}>Pending Community Fees</span>
                                <span style={{ color: "var(--lp-success)", fontWeight: 700, fontSize: "16px" }}>
                                    {pendingFees ? `${formatEther(pendingFees as bigint)} OKB` : "0"}
                                </span>
                            </div>
                        </AdminCard>

                        {/* Claim Fees */}
                        <AdminCard icon={DollarSign} title="Claim Community Fees">
                            <p style={{ color: "var(--lp-text-secondary)", fontSize: "14px", marginBottom: "16px" }}>
                                Withdraw accumulated trading fees to the community wallet.
                            </p>
                            <button
                                className="action-btn"
                                style={{ margin: 0 }}
                                onClick={() => execAdmin("claimCommunityFees")}
                                disabled={!pendingFees || (pendingFees as bigint) === 0n || txStatus === "pending"}
                            >
                                <DollarSign size={18} /> Claim {pendingFees ? formatEther(pendingFees as bigint) : "0"} OKB
                            </button>
                        </AdminCard>

                        {/* Set Hook Address (ONE-TIME ONLY) */}
                        <AdminCard icon={Key} title="Set Hook Address (One-time)">
                            <p style={{ color: "var(--lp-text-secondary)", fontSize: "14px", marginBottom: "8px" }}>
                                Set the LaunchpadHook contract address (after deploying via Foundry).
                            </p>
                            <p style={{ color: "var(--lp-danger)", fontSize: "13px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <AlertTriangle size={14} /> This can only be set once and cannot be changed later.
                            </p>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <input
                                    className="form-input"
                                    placeholder="0x... Hook address"
                                    value={newHookAddr}
                                    onChange={(e) => setNewHookAddr(e.target.value)}
                                    style={{ flex: 1 }}
                                    disabled={hookAddress && hookAddress !== "0x0000000000000000000000000000000000000000" ? true : false}
                                />
                                <button
                                    className="action-btn"
                                    style={{ width: "auto", padding: "12px 24px", margin: 0 }}
                                    onClick={() => execAdmin("setHookAddress", [newHookAddr as `0x${string}`])}
                                    disabled={!newHookAddr || txStatus === "pending" || (hookAddress && hookAddress !== "0x0000000000000000000000000000000000000000")}
                                >
                                    Set
                                </button>
                            </div>
                        </AdminCard>

                        {/* Set Creation Fee */}
                        <AdminCard icon={Settings} title="Set Creation Fee">
                            <div style={{ display: "flex", gap: "12px" }}>
                                <input
                                    className="form-input"
                                    type="number"
                                    placeholder="Amount in BANMAO (e.g. 1000000)"
                                    value={newCreationFee}
                                    onChange={(e) => setNewCreationFee(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    className="action-btn"
                                    style={{ width: "auto", padding: "12px 24px", margin: 0 }}
                                    onClick={() => execAdmin("setCreationFee", [parseEther(newCreationFee)])}
                                    disabled={!newCreationFee || txStatus === "pending"}
                                >
                                    Update
                                </button>
                            </div>
                        </AdminCard>

                        {/* Set Community Wallet */}
                        <AdminCard icon={Wallet} title="Set Community Wallet">
                            <div style={{ display: "flex", gap: "12px" }}>
                                <input
                                    className="form-input"
                                    placeholder="0x... new community wallet"
                                    value={newCommunityWallet}
                                    onChange={(e) => setNewCommunityWallet(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    className="action-btn"
                                    style={{ width: "auto", padding: "12px 24px", margin: 0 }}
                                    onClick={() => execAdmin("setCommunityWallet", [newCommunityWallet as `0x${string}`])}
                                    disabled={!newCommunityWallet || txStatus === "pending"}
                                >
                                    Update
                                </button>
                            </div>
                        </AdminCard>

                        {/* Migrate Liquidity (PERMISSIONLESS) */}
                        <AdminCard icon={ArrowRightLeft} title="Migrate Liquidity (Permissionless)">
                            <p style={{ color: "var(--lp-text-secondary)", fontSize: "14px", marginBottom: "8px" }}>
                                Creates a Uniswap V4 pool and permanently locks LP for a graduated token.
                            </p>
                            <p style={{ color: "var(--lp-success)", fontSize: "13px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <CheckCircle2 size={14} /> Anyone can call this — LP is sent to the immutable LiquidityLocker (anti-rug).
                            </p>
                            <div style={{ display: "grid", gap: "12px" }}>
                                <input
                                    className="form-input"
                                    placeholder="0x... graduated token address"
                                    value={migrateTokenAddr}
                                    onChange={(e) => setMigrateTokenAddr(e.target.value)}
                                />
                                <button
                                    className="action-btn"
                                    style={{ margin: 0 }}
                                    onClick={() => execAdmin("migrateLiquidity", [migrateTokenAddr as `0x${string}`])}
                                    disabled={!migrateTokenAddr || txStatus === "pending"}
                                >
                                    <ArrowRightLeft size={18} /> Migrate to Uniswap V4 & Lock LP
                                </button>
                            </div>
                        </AdminCard>

                        {/* Sweep Stuck Native */}
                        <AdminCard icon={RefreshCw} title="Sweep Stuck Native OKB">
                            <p style={{ color: "var(--lp-text-secondary)", fontSize: "14px", marginBottom: "16px" }}>
                                Recover OKB accidentally sent directly to the contract (not from trading).
                            </p>
                            <button
                                className="action-btn"
                                style={{ margin: 0, background: "var(--lp-btn-bg)", color: "var(--lp-text-primary)", boxShadow: "none" }}
                                onClick={() => execAdmin("sweepStuckNative")}
                                disabled={txStatus === "pending"}
                            >
                                <RefreshCw size={18} /> Sweep Excess OKB
                            </button>
                        </AdminCard>

                        {/* Transfer Ownership */}
                        <AdminCard icon={Shield} title="Transfer Ownership">
                            <p style={{ color: "var(--lp-danger)", fontSize: "14px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <AlertTriangle size={16} /> This action is irreversible. Double-check the new owner address.
                            </p>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <input
                                    className="form-input"
                                    placeholder="0x... new owner address"
                                    value={newOwner}
                                    onChange={(e) => setNewOwner(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    className="action-btn"
                                    style={{ width: "auto", padding: "12px 24px", margin: 0, background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
                                    onClick={() => execAdmin("transferOwnership", [newOwner as `0x${string}`])}
                                    disabled={!newOwner || txStatus === "pending"}
                                >
                                    Transfer
                                </button>
                            </div>
                        </AdminCard>
                    </div>
                )}
            </div>
        </div>
    );
}
