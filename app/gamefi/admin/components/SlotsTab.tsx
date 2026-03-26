// SlotsTab.tsx - Contract Owner Admin Panel for BanmaoSlotsMultiPool
// Internationalized version - uses t prop for all strings
"use client";

import React, { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import toast from "react-hot-toast";
import {
    SLOTS_ABI,
    SLOTS_CONTRACT_ADDRESS,
    ERC20_ABI,
    BANMAO_TOKEN_ADDRESS,
    formatTokenAmount,
    parseTokenAmount
} from "../../banmaoslots/lib/abis";
import ContractInfoCard from './ContractInfoCard';

interface SlotsTabProps {
    t?: any;
    isAdmin?: boolean;
}

export default function SlotsTab({ t }: SlotsTabProps) {
    const { address } = useAccount();
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

    // Form states
    const [newMinDeposit, setNewMinDeposit] = useState("");
    const [newMaxPools, setNewMaxPools] = useState("");
    const [newMaxSpins, setNewMaxSpins] = useState(10);
    const [newCommitExpiry, setNewCommitExpiry] = useState(256);
    const [platformPoolName, setPlatformPoolName] = useState("Platform Pool");
    const [platformPoolDeposit, setPlatformPoolDeposit] = useState("");
    const [platformPoolMinBet, setPlatformPoolMinBet] = useState("100");
    const [platformPoolMaxBet, setPlatformPoolMaxBet] = useState("10000");
    const [platformPoolJackpot, setPlatformPoolJackpot] = useState(2);

    // Platform Pool Management states (when platformPoolId > 0)
    const [ppDepositAmount, setPpDepositAmount] = useState("");
    const [ppWithdrawAmount, setPpWithdrawAmount] = useState("");
    const [ppNewMinBet, setPpNewMinBet] = useState("");
    const [ppNewMaxBet, setPpNewMaxBet] = useState("");
    const [ppNewJackpot, setPpNewJackpot] = useState(2);

    // Contract writes
    const { writeContractAsync, isPending } = useWriteContract();

    // Wait for transaction
    const { isLoading: isConfirming } = useWaitForTransactionReceipt({
        hash: txHash as `0x${string}`,
    });

    // Read contract state
    const { data: paused, refetch: refetchPaused } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: "paused",
    });

    const { data: platformEarnings, refetch: refetchEarnings } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: "platformEarnings",
    });

    const { data: minPoolDeposit, refetch: refetchMinDeposit } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: "minPoolDeposit",
    });

    const { data: maxPoolsPerUser, refetch: refetchMaxPools } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: "maxPoolsPerUser",
    });

    const { data: maxSpinsPerMinute, refetch: refetchMaxSpins } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: "maxSpinsPerMinute",
    });

    const { data: commitExpiryBlocks, refetch: refetchExpiry } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: "commitExpiryBlocks",
    });

    const { data: activePoolCount } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: "activePoolCount",
    });

    const { data: platformPoolId, refetch: refetchPlatformPool } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: "platformPoolId",
    });

    const { data: tokenBalance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
    });

    // Read Platform Pool data when it exists
    const pPoolId = platformPoolId as bigint | undefined;
    const { data: platformPoolData, refetch: refetchPlatformPoolData } = useReadContract({
        address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
        abi: SLOTS_ABI,
        functionName: "pools",
        args: pPoolId && pPoolId > BigInt(0) ? [pPoolId] : undefined,
    });

    // Parse Platform Pool tuple data
    const ppTuple = platformPoolData as readonly [bigint, `0x${string}`, string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, bigint] | undefined;
    const ppBalance = ppTuple?.[3];
    const ppMinBet = ppTuple?.[4];
    const ppMaxBet = ppTuple?.[5];
    const ppJackpotPercent = ppTuple?.[6];
    const ppJackpotPool = ppTuple?.[7];
    const ppTotalSpins = ppTuple?.[8];
    const ppTotalPendingBets = ppTuple?.[11];
    const ppIsActive = ppTuple?.[12];

    // Check allowance for platform pool creation
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, SLOTS_CONTRACT_ADDRESS] : undefined,
    });

    const depositAmount = platformPoolDeposit ? parseTokenAmount(platformPoolDeposit) : BigInt(0);
    const needsApproval = !allowance || (allowance as bigint) < depositAmount;

    const isLoading = isPending || isConfirming;

    // Approve tokens for platform pool creation - UNLIMITED approval (one-time)
    const handleApprove = async () => {
        const toastId = toast.loading(`⏳ ${t?.buttons?.approve || "Approving"} (one-time unlimited)...`);
        try {
            // Use MAX_UINT256 for unlimited approval - owner only needs to approve once
            const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
            const hash = await writeContractAsync({
                address: BANMAO_TOKEN_ADDRESS as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [SLOTS_CONTRACT_ADDRESS, MAX_UINT256],
            } as any);
            setTxHash(hash);
            toast.success(`✅ Unlimited approval granted!`, { id: toastId });
            setTimeout(() => refetchAllowance(), 2000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    // Action handlers
    const handleSetMinDeposit = async () => {
        if (!newMinDeposit) return;
        const toastId = toast.loading(`⏳ ${t?.processing || "Processing..."}`);
        try {
            const hash = await writeContractAsync({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: "setMinPoolDeposit",
                args: [parseTokenAmount(newMinDeposit)],
            } as any);
            setTxHash(hash);
            toast.success(`✅ ${t?.configMulti?.minPoolDeposit || "Min deposit"} ${t?.configMulti?.update || "updated"}!`, { id: toastId });
            setTimeout(() => refetchMinDeposit(), 2000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    const handleSetMaxPools = async () => {
        if (!newMaxPools) return;
        const toastId = toast.loading(`⏳ ${t?.processing || "Processing..."}`);
        try {
            const hash = await writeContractAsync({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: "setMaxPoolsPerUser",
                args: [BigInt(newMaxPools)],
            } as any);
            setTxHash(hash);
            toast.success(`✅ ${t?.configMulti?.maxPoolsPerUser || "Max pools"} ${t?.configMulti?.update || "updated"}!`, { id: toastId });
            setTimeout(() => refetchMaxPools(), 2000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    const handleSetMaxSpins = async () => {
        const toastId = toast.loading(`⏳ ${t?.processing || "Processing..."}`);
        try {
            const hash = await writeContractAsync({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: "setMaxSpinsPerMinute",
                args: [BigInt(newMaxSpins)],
            } as any);
            setTxHash(hash);
            toast.success(`✅ ${t?.configMulti?.maxSpinsPerMin || "Rate limit"} ${t?.configMulti?.update || "updated"}!`, { id: toastId });
            setTimeout(() => refetchMaxSpins(), 2000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    const handleSetCommitExpiry = async () => {
        const toastId = toast.loading(`⏳ ${t?.processing || "Processing..."}`);
        try {
            const hash = await writeContractAsync({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: "setCommitExpiryBlocks",
                args: [BigInt(newCommitExpiry)],
            } as any);
            setTxHash(hash);
            toast.success(`✅ ${t?.configMulti?.commitExpiry || "Commit expiry"} ${t?.configMulti?.update || "updated"}!`, { id: toastId });
            setTimeout(() => refetchExpiry(), 2000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    const handlePauseUnpause = async () => {
        const action = paused ? "unpause" : "pause";
        const toastId = toast.loading(`⏳ ${t?.processing || "Processing..."}`);
        try {
            const hash = await writeContractAsync({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: action,
                args: [],
            } as any);
            setTxHash(hash);
            toast.success(`✅ Contract ${action}d!`, { id: toastId });
            setTimeout(() => refetchPaused(), 2000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    const handleWithdrawFees = async () => {
        const toastId = toast.loading(`⏳ ${t?.processing || "Processing..."}`);
        try {
            const hash = await writeContractAsync({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: "withdrawPlatformFees",
                args: [],
            } as any);
            setTxHash(hash);
            toast.success(`✅ ${t?.fees?.withdraw || "Fees withdrawn"}!`, { id: toastId });
            setTimeout(() => refetchEarnings(), 2000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    const handleCreatePlatformPool = async () => {
        const toastId = toast.loading(`🏗️ ${t?.processing || "Processing..."}`);
        try {
            const hash = await writeContractAsync({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: "createPlatformPool",
                args: [
                    platformPoolName,
                    parseTokenAmount(platformPoolDeposit),
                    parseTokenAmount(platformPoolMinBet),
                    parseTokenAmount(platformPoolMaxBet),
                    BigInt(platformPoolJackpot),
                ],
            } as any);
            setTxHash(hash);
            toast.success(`🎉 ${t?.platformPool?.title || "Platform pool created"}!`, { id: toastId });
            setTimeout(() => refetchPlatformPool(), 3000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    // Platform Pool Management Handlers
    const handlePpDeposit = async () => {
        if (!ppDepositAmount || !pPoolId) return;
        const toastId = toast.loading("📥 Depositing to Platform Pool...");
        try {
            const hash = await writeContractAsync({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: "depositToPool",
                args: [pPoolId, parseTokenAmount(ppDepositAmount)],
            } as any);
            setTxHash(hash);
            toast.success("✅ Deposit successful!", { id: toastId });
            setPpDepositAmount("");
            setTimeout(() => refetchPlatformPoolData(), 2000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    const handlePpWithdraw = async () => {
        if (!ppWithdrawAmount || !pPoolId) return;
        const toastId = toast.loading("📤 Withdrawing from Platform Pool...");
        try {
            const hash = await writeContractAsync({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: "withdrawFromPool",
                args: [pPoolId, parseTokenAmount(ppWithdrawAmount)],
            } as any);
            setTxHash(hash);
            toast.success("✅ Withdrawal successful!", { id: toastId });
            setPpWithdrawAmount("");
            setTimeout(() => refetchPlatformPoolData(), 2000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    const handlePpUpdateSettings = async () => {
        if (!ppNewMinBet || !ppNewMaxBet || !pPoolId) return;
        const toastId = toast.loading("⚙️ Updating Platform Pool settings...");
        try {
            const hash = await writeContractAsync({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: "updatePoolSettings",
                args: [pPoolId, parseTokenAmount(ppNewMinBet), parseTokenAmount(ppNewMaxBet), BigInt(ppNewJackpot)],
            } as any);
            setTxHash(hash);
            toast.success("✅ Settings updated!", { id: toastId });
            setTimeout(() => refetchPlatformPoolData(), 2000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    const handlePpDeactivate = async () => {
        if (!pPoolId) return;
        const toastId = toast.loading("⏸️ Deactivating Platform Pool...");
        try {
            const hash = await writeContractAsync({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: "deactivatePool",
                args: [pPoolId],
            } as any);
            setTxHash(hash);
            toast.success("✅ Platform Pool deactivated!", { id: toastId });
            setTimeout(() => refetchPlatformPoolData(), 2000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    const handlePpReactivate = async () => {
        if (!pPoolId) return;
        const toastId = toast.loading("▶️ Reactivating Platform Pool...");
        try {
            const hash = await writeContractAsync({
                address: SLOTS_CONTRACT_ADDRESS as `0x${string}`,
                abi: SLOTS_ABI,
                functionName: "reactivatePool",
                args: [pPoolId],
            } as any);
            setTxHash(hash);
            toast.success("✅ Platform Pool reactivated!", { id: toastId });
            setTimeout(() => refetchPlatformPoolData(), 2000);
        } catch (err: any) {
            toast.error("❌ " + (err.shortMessage || err.message), { id: toastId });
        }
    };

    const cardStyle: React.CSSProperties = {
        background: 'rgba(30, 41, 59, 0.9)',
        borderRadius: 12,
        border: '1px solid rgba(168, 85, 247, 0.2)',
        padding: 20,
        marginBottom: 16
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 12px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        color: 'white',
        fontSize: 14,
        marginBottom: 8
    };

    const buttonStyle = (color: string, disabled: boolean): React.CSSProperties => ({
        padding: '10px 20px',
        background: disabled ? 'rgba(255,255,255,0.1)' : color,
        border: 'none',
        borderRadius: 8,
        color: 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 600,
        fontSize: 13,
        opacity: disabled ? 0.5 : 1,
        marginTop: 8
    });

    return (
        <div>
            <ContractInfoCard
                title="Slots Contract"
                address={SLOTS_CONTRACT_ADDRESS}
                chainId={196}
                networkName="X Layer Mainnet"
                explorerBaseUrl="https://web3.okx.com/explorer/x-layer/address"
            />
            {/* Status Overview */}
            <div style={cardStyle}>
                <h3 style={{ margin: '0 0 16px', color: '#facc15' }}>📊 {t?.platform?.title || "Platform Overview"}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                    <StatBox label={t?.platform?.contract || "Contract"} value={SLOTS_CONTRACT_ADDRESS.slice(0, 6) + "..." + SLOTS_CONTRACT_ADDRESS.slice(-4)} color="#94a3b8" />
                    <StatBox label={t?.platform?.status || "Status"} value={paused ? (t?.platform?.paused || "⏸ PAUSED") : (t?.platform?.active || "✅ ACTIVE")} color={paused ? "#ef4444" : "#22c55e"} />
                    <StatBox label={t?.platform?.platformFees || "Platform Fees"} value={formatTokenAmount(platformEarnings as bigint || BigInt(0))} color="#facc15" />
                    <StatBox label={t?.platform?.activePools || "Active Pools"} value={activePoolCount?.toString() || "0"} color="#a855f7" />
                    <StatBox label={t?.platform?.platformPool || "Platform Pool"} value={platformPoolId && Number(platformPoolId) > 0 ? `#${platformPoolId}` : (t?.platform?.notCreated || "Not Created")} color="#06b6d4" />
                </div>
            </div>

            {/* Platform Fee Withdrawal */}
            <div style={cardStyle}>
                <h3 style={{ margin: '0 0 12px', color: '#22c55e' }}>💰 {t?.fees?.title || "Platform Fee Withdrawal"}</h3>
                <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                    {t?.fees?.description || "Platform earns 2% of every bet. Current balance:"} <strong style={{ color: '#facc15' }}>{formatTokenAmount(platformEarnings as bigint || BigInt(0))} $BANMAO</strong>
                </p>
                <button
                    onClick={handleWithdrawFees}
                    disabled={isLoading || !platformEarnings || (platformEarnings as bigint) === BigInt(0)}
                    style={buttonStyle('#22c55e', isLoading || !platformEarnings || (platformEarnings as bigint) === BigInt(0))}
                >
                    {isLoading ? `⏳ ${t?.processing || "Processing..."}` : `💸 ${t?.fees?.withdraw || "Withdraw Fees"}`}
                </button>
            </div>

            {/* Configuration Settings */}
            <div style={cardStyle}>
                <h3 style={{ margin: '0 0 16px', color: '#6366f1' }}>⚙️ {t?.configMulti?.title || "Configuration Settings"}</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Min Pool Deposit */}
                    <div>
                        <label style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 4 }}>
                            {t?.configMulti?.minPoolDeposit || "Min Pool Deposit"} (current: {formatTokenAmount(minPoolDeposit as bigint || BigInt(0))})
                        </label>
                        <input
                            type="text"
                            value={newMinDeposit}
                            onChange={e => setNewMinDeposit(e.target.value)}
                            placeholder="1000000"
                            style={inputStyle}
                        />
                        <button onClick={handleSetMinDeposit} disabled={isLoading || !newMinDeposit} style={buttonStyle('#6366f1', isLoading || !newMinDeposit)}>
                            {t?.configMulti?.update || "Update"}
                        </button>
                    </div>

                    {/* Max Pools Per User */}
                    <div>
                        <label style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 4 }}>
                            {t?.configMulti?.maxPoolsPerUser || "Max Pools Per User"} (current: {maxPoolsPerUser?.toString() || "3"})
                        </label>
                        <input
                            type="number"
                            value={newMaxPools}
                            onChange={e => setNewMaxPools(e.target.value)}
                            placeholder="3"
                            style={inputStyle}
                        />
                        <button onClick={handleSetMaxPools} disabled={isLoading || !newMaxPools} style={buttonStyle('#6366f1', isLoading || !newMaxPools)}>
                            {t?.configMulti?.update || "Update"}
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: 16 }}>
                    <label style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 8 }}>
                        {t?.configMulti?.maxSpinsPerMin || "Max Spins Per Minute"} (current: {maxSpinsPerMinute?.toString() || "10"}): <strong style={{ color: '#a855f7' }}>{newMaxSpins}</strong>
                    </label>
                    <input
                        type="range"
                        min={1}
                        max={60}
                        value={newMaxSpins}
                        onChange={e => setNewMaxSpins(Number(e.target.value))}
                        style={{ width: '100%' }}
                    />
                    <button onClick={handleSetMaxSpins} disabled={isLoading} style={buttonStyle('#6366f1', isLoading)}>
                        {t?.configMulti?.updateRateLimit || "Update Rate Limit"}
                    </button>
                </div>

                <div style={{ marginTop: 16 }}>
                    <label style={{ color: '#94a3b8', fontSize: 11, display: 'block', marginBottom: 8 }}>
                        {t?.configMulti?.commitExpiry || "Commit Expiry Blocks"} (current: {commitExpiryBlocks?.toString() || "256"}): <strong style={{ color: '#a855f7' }}>{newCommitExpiry}</strong>
                    </label>
                    <input
                        type="range"
                        min={10}
                        max={256}
                        value={newCommitExpiry}
                        onChange={e => setNewCommitExpiry(Number(e.target.value))}
                        style={{ width: '100%' }}
                    />
                    <button onClick={handleSetCommitExpiry} disabled={isLoading} style={buttonStyle('#6366f1', isLoading)}>
                        {t?.configMulti?.updateExpiry || "Update Expiry"}
                    </button>
                </div>
            </div>

            {/* Emergency Controls */}
            <div style={{
                ...cardStyle,
                border: `2px solid ${paused ? '#22c55e' : '#ef4444'}40`
            }}>
                <h3 style={{ margin: '0 0 12px', color: paused ? '#22c55e' : '#ef4444' }}>
                    {paused
                        ? `▶️ ${t?.emergencyMulti?.unpauseContract || "Unpause Contract"}`
                        : `⏸ ${t?.emergencyMulti?.pauseContract || "Emergency Pause"}`
                    }
                </h3>
                <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                    {paused
                        ? (t?.emergencyMulti?.unpauseDescription || "Contract is currently paused. All spins are blocked. Click to resume operations.")
                        : (t?.emergencyMulti?.pauseDescription || "Pausing will stop all new spins. Existing commits can still be revealed or refunded.")
                    }
                </p>
                <button
                    onClick={handlePauseUnpause}
                    disabled={isLoading}
                    style={buttonStyle(paused ? '#22c55e' : '#ef4444', isLoading)}
                >
                    {isLoading
                        ? `⏳ ${t?.processing || "Processing..."}`
                        : paused
                            ? `▶️ ${t?.emergencyMulti?.unpauseContract || "Unpause Contract"}`
                            : `⏸ ${t?.emergencyMulti?.pauseContract || "Pause Contract"}`
                    }
                </button>
            </div>

            {/* Platform Pool Creation (only if not exists) */}
            {(!platformPoolId || Number(platformPoolId) === 0) && (
                <div style={{
                    ...cardStyle,
                    border: '2px solid rgba(250, 204, 21, 0.4)',
                    background: 'rgba(250, 204, 21, 0.05)'
                }}>
                    <h3 style={{ margin: '0 0 12px', color: '#facc15' }}>👑 {t?.platformPool?.title || "Create Platform Pool"}</h3>
                    <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 16 }}>
                        {t?.platformPool?.description || "The official platform pool has not been created yet. Create it to start collecting platform fees."}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                            <label style={{ color: '#94a3b8', fontSize: 11 }}>{t?.platformPool?.poolName || "Pool Name"}</label>
                            <input
                                type="text"
                                value={platformPoolName}
                                onChange={e => setPlatformPoolName(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={{ color: '#94a3b8', fontSize: 11 }}>
                                {t?.platformPool?.initialDeposit || "Initial Deposit"}
                                <span style={{ color: '#facc15' }}> (min: {formatTokenAmount(minPoolDeposit as bigint || BigInt(0))})</span>
                            </label>
                            <input
                                type="text"
                                value={platformPoolDeposit}
                                onChange={e => {
                                    const val = e.target.value;
                                    setPlatformPoolDeposit(val);
                                    // Auto-adjust maxBet to be deposit/10
                                    if (val && !isNaN(Number(val))) {
                                        const suggestedMax = Math.floor(Number(val) / 10);
                                        setPlatformPoolMaxBet(suggestedMax > 0 ? String(suggestedMax) : "1");
                                        // Auto-suggest minBet as 1% of deposit
                                        const suggestedMin = Math.floor(Number(val) / 100);
                                        setPlatformPoolMinBet(suggestedMin > 0 ? String(suggestedMin) : "1");
                                    }
                                }}
                                placeholder={formatTokenAmount(minPoolDeposit as bigint || BigInt(0))}
                                style={{
                                    ...inputStyle,
                                    borderColor: platformPoolDeposit && Number(platformPoolDeposit) < Number(formatTokenAmount(minPoolDeposit as bigint || BigInt(0)).replace(/,/g, ''))
                                        ? '#ef4444' : 'rgba(255,255,255,0.1)'
                                }}
                            />
                            {platformPoolDeposit && (
                                <div style={{ fontSize: 10, marginTop: 4, color: '#64748b' }}>
                                    → Max Bet ≤ <strong style={{ color: '#22c55e' }}>{Math.floor(Number(platformPoolDeposit) / 10)}</strong>
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={{ color: '#94a3b8', fontSize: 11 }}>
                                {t?.platformPool?.minBet || "Min Bet"}
                                {platformPoolDeposit && (
                                    <span style={{ color: '#64748b' }}> (gợi ý: {Math.floor(Number(platformPoolDeposit) / 100) || 1})</span>
                                )}
                            </label>
                            <input
                                type="text"
                                value={platformPoolMinBet}
                                onChange={e => setPlatformPoolMinBet(e.target.value)}
                                style={{
                                    ...inputStyle,
                                    borderColor: Number(platformPoolMinBet) > Number(platformPoolMaxBet) ? '#ef4444' : 'rgba(255,255,255,0.1)'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ color: '#94a3b8', fontSize: 11 }}>
                                {t?.platformPool?.maxBet || "Max Bet"}
                                <span style={{ color: platformPoolDeposit && Number(platformPoolMaxBet) > Number(platformPoolDeposit) / 10 ? '#ef4444' : '#22c55e' }}>
                                    {" "}(≤ {platformPoolDeposit ? Math.floor(Number(platformPoolDeposit) / 10) : "deposit/10"})
                                </span>
                            </label>
                            <input
                                type="text"
                                value={platformPoolMaxBet}
                                onChange={e => setPlatformPoolMaxBet(e.target.value)}
                                style={{
                                    ...inputStyle,
                                    borderColor: platformPoolDeposit && Number(platformPoolMaxBet) > Number(platformPoolDeposit) / 10
                                        ? '#ef4444' : 'rgba(255,255,255,0.1)'
                                }}
                            />
                            {platformPoolDeposit && Number(platformPoolMaxBet) > Number(platformPoolDeposit) / 10 && (
                                <div style={{ fontSize: 10, marginTop: 4, color: '#ef4444' }}>
                                    ⚠️ Max bet quá cao! Phải ≤ {Math.floor(Number(platformPoolDeposit) / 10)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Validation Summary */}
                    {platformPoolDeposit && (
                        <div style={{
                            padding: 12,
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: 8,
                            marginBottom: 12,
                            fontSize: 11
                        }}>
                            <div style={{ color: '#64748b', marginBottom: 4 }}>📋 Validation:</div>
                            <div style={{ color: Number(platformPoolMinBet) > 0 && Number(platformPoolMinBet) <= Number(platformPoolMaxBet) ? '#22c55e' : '#ef4444' }}>
                                {Number(platformPoolMinBet) > 0 && Number(platformPoolMinBet) <= Number(platformPoolMaxBet) ? '✅' : '❌'} Min Bet ({platformPoolMinBet}) ≤ Max Bet ({platformPoolMaxBet})
                            </div>
                            <div style={{ color: Number(platformPoolMaxBet) <= Number(platformPoolDeposit) / 10 ? '#22c55e' : '#ef4444' }}>
                                {Number(platformPoolMaxBet) <= Number(platformPoolDeposit) / 10 ? '✅' : '❌'} Max Bet ({platformPoolMaxBet}) ≤ Deposit/10 ({Math.floor(Number(platformPoolDeposit) / 10)})
                            </div>
                        </div>
                    )}

                    <div style={{ marginBottom: 12 }}>
                        <label style={{ color: '#94a3b8', fontSize: 11 }}>{t?.platformPool?.jackpotPercent || "Jackpot %"}: <strong style={{ color: '#facc15' }}>{platformPoolJackpot}%</strong></label>
                        <input
                            type="range"
                            min={0}
                            max={10}
                            value={platformPoolJackpot}
                            onChange={e => setPlatformPoolJackpot(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Approval Status */}
                    {platformPoolDeposit && (
                        <div style={{
                            padding: 12,
                            background: needsApproval ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            borderRadius: 8,
                            marginBottom: 12,
                            fontSize: 12,
                            color: needsApproval ? '#f87171' : '#22c55e'
                        }}>
                            {needsApproval
                                ? `⚠️ ${t?.buttons?.approve || "Approval"} required: ${formatTokenAmount(depositAmount)} $BANMAO`
                                : `✅ ${t?.buttons?.approve || "Approved"}: ${formatTokenAmount(allowance as bigint || BigInt(0))} $BANMAO`
                            }
                        </div>
                    )}

                    {/* Approve or Create button */}
                    {needsApproval && platformPoolDeposit ? (
                        <button
                            onClick={handleApprove}
                            disabled={isLoading || !platformPoolDeposit}
                            style={buttonStyle('#6366f1', isLoading || !platformPoolDeposit)}
                        >
                            {isLoading ? `⏳ ${t?.processing || "Processing..."}` : `✅ ${t?.buttons?.approve || "Approve"} ${formatTokenAmount(depositAmount)} $BANMAO`}
                        </button>
                    ) : (
                        <button
                            onClick={handleCreatePlatformPool}
                            disabled={isLoading || !platformPoolDeposit}
                            style={buttonStyle('#facc15', isLoading || !platformPoolDeposit)}
                        >
                            {isLoading ? `⏳ ${t?.processing || "Processing..."}` : `👑 ${t?.platformPool?.create || "Create Platform Pool"}`}
                        </button>
                    )}
                </div>
            )}

            {/* Platform Pool Management (when exists) */}
            {pPoolId && pPoolId > BigInt(0) && ppTuple && (
                <div style={{
                    ...cardStyle,
                    border: '2px solid rgba(34, 197, 94, 0.4)',
                    background: 'rgba(34, 197, 94, 0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, color: '#22c55e' }}>
                            👑 {t?.platformPool?.manage || "Manage Platform Pool"} (#{pPoolId.toString()})
                        </h3>
                        <span style={{
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: 11,
                            background: ppIsActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                            color: ppIsActive ? '#22c55e' : '#ef4444'
                        }}>
                            {ppIsActive ? '✅ Active' : '⏸️ Inactive'}
                        </span>
                    </div>

                    {/* Pool Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                        <StatBox label="Balance" value={formatTokenAmount(ppBalance || BigInt(0))} color="#22c55e" />
                        <StatBox label="Jackpot Pool" value={formatTokenAmount(ppJackpotPool || BigInt(0))} color="#facc15" />
                        <StatBox label="Min/Max Bet" value={`${formatTokenAmount(ppMinBet || BigInt(0))} - ${formatTokenAmount(ppMaxBet || BigInt(0))}`} color="#6366f1" />
                        <StatBox label="Total Spins" value={(ppTotalSpins || BigInt(0)).toString()} color="#a855f7" />
                    </div>

                    {/* Deposit & Withdraw */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                            <label style={{ color: '#22c55e', fontSize: 11, display: 'block', marginBottom: 8 }}>📥 Deposit to Pool</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text"
                                    placeholder="Amount"
                                    value={ppDepositAmount}
                                    onChange={e => setPpDepositAmount(e.target.value)}
                                    style={inputStyle}
                                />
                                <button onClick={handlePpDeposit} disabled={isLoading || !ppDepositAmount} style={buttonStyle('#22c55e', isLoading || !ppDepositAmount)}>
                                    Deposit
                                </button>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                            <label style={{ color: '#f97316', fontSize: 11, display: 'block', marginBottom: 8 }}>
                                📤 Withdraw (Available: {formatTokenAmount((ppBalance || BigInt(0)) - (ppTotalPendingBets || BigInt(0)) - (ppJackpotPool || BigInt(0)))})
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text"
                                    placeholder="Amount"
                                    value={ppWithdrawAmount}
                                    onChange={e => setPpWithdrawAmount(e.target.value)}
                                    style={inputStyle}
                                />
                                <button onClick={handlePpWithdraw} disabled={isLoading || !ppWithdrawAmount} style={buttonStyle('#f97316', isLoading || !ppWithdrawAmount)}>
                                    Withdraw
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Update Settings */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                        <label style={{ color: '#6366f1', fontSize: 11, display: 'block', marginBottom: 12 }}>⚙️ Update Pool Settings</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                            <div>
                                <label style={{ color: '#94a3b8', fontSize: 10 }}>Min Bet</label>
                                <input
                                    type="text"
                                    placeholder={formatTokenAmount(ppMinBet || BigInt(0))}
                                    value={ppNewMinBet}
                                    onChange={e => setPpNewMinBet(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ color: '#94a3b8', fontSize: 10 }}>Max Bet (≤ balance/10)</label>
                                <input
                                    type="text"
                                    placeholder={formatTokenAmount(ppMaxBet || BigInt(0))}
                                    value={ppNewMaxBet}
                                    onChange={e => setPpNewMaxBet(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={{ color: '#94a3b8', fontSize: 10 }}>Jackpot % (0-10)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={10}
                                    value={ppNewJackpot}
                                    onChange={e => setPpNewJackpot(Number(e.target.value))}
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button onClick={handlePpUpdateSettings} disabled={isLoading || !ppNewMinBet || !ppNewMaxBet} style={buttonStyle('#6366f1', isLoading || !ppNewMinBet || !ppNewMaxBet)}>
                                    Update
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Activate/Deactivate */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        {ppIsActive ? (
                            <button onClick={handlePpDeactivate} disabled={isLoading} style={buttonStyle('#ef4444', isLoading)}>
                                ⏸️ Deactivate Pool
                            </button>
                        ) : (
                            <button onClick={handlePpReactivate} disabled={isLoading} style={buttonStyle('#22c55e', isLoading)}>
                                ▶️ Reactivate Pool
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Your Balance */}
            <div style={{ ...cardStyle, textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}>
                <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>
                    {t?.yourBalance || "Your Balance"}: <strong style={{ color: '#22c55e' }}>{formatTokenAmount(tokenBalance as bigint || BigInt(0))} $BANMAO</strong>
                </p>
            </div>
        </div>
    );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: 12,
            borderRadius: 8,
            textAlign: 'center'
        }}>
            <div style={{ color, fontWeight: 700, fontSize: 14 }}>{value}</div>
            <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>{label}</div>
        </div>
    );
}
