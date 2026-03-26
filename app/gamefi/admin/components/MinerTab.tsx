
import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { BANMAO_MINER_ABI, BANMAO_MINER_ADDRESS } from '../../banmaominer/lib/abis';
import ContractInfoCard from './ContractInfoCard';

interface MinerTabProps {
    backendConfig: Record<string, string>;
    saveBackendConfig: (key: string, value: string) => Promise<void>;
    t: any; // Translation object
    isOwner: boolean;
    isAdmin: boolean;
}

export default function MinerTab({ backendConfig, saveBackendConfig, t, isOwner, isAdmin }: MinerTabProps) {
    const { address } = useAccount();
    const { writeContractAsync, isPending } = useWriteContract();

    // UI Local State for Collapsibles
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        contract: true,
        caps: false,
        cooldown: false,
        backend: true,
        danger: false
    });

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // UI Local State for Inputs
    const [minClaimInput, setMinClaimInput] = useState('');
    const [dailyCapInput, setDailyCapInput] = useState('');
    const [hourlyCapInput, setHourlyCapInput] = useState('');
    const [cooldownInput, setCooldownInput] = useState('');
    const [newOwnerInput, setNewOwnerInput] = useState('');

    // Backend Config State
    const [ratioInput, setRatioInput] = useState('');
    const [maxClaimsInput, setMaxClaimsInput] = useState('');
    const [rateLimitWindowInput, setRateLimitWindowInput] = useState('');

    // Load Contract Data
    const { data: minClaimAmount, refetch: refetchMinClaim } = useReadContract({
        address: BANMAO_MINER_ADDRESS,
        abi: BANMAO_MINER_ABI,
        functionName: 'minClaimAmount',
    });

    const { data: dailyPlayerCap, refetch: refetchDailyCap } = useReadContract({
        address: BANMAO_MINER_ADDRESS,
        abi: BANMAO_MINER_ABI,
        functionName: 'dailyPlayerCap',
    });

    const { data: hourlySignerCap, refetch: refetchHourlyCap } = useReadContract({
        address: BANMAO_MINER_ADDRESS,
        abi: BANMAO_MINER_ABI,
        functionName: 'hourlySignerCap',
    });

    const { data: claimCooldown, refetch: refetchCooldown } = useReadContract({
        address: BANMAO_MINER_ADDRESS,
        abi: BANMAO_MINER_ABI,
        functionName: 'claimCooldown',
    });

    const { data: paused, refetch: refetchPaused } = useReadContract({
        address: BANMAO_MINER_ADDRESS,
        abi: BANMAO_MINER_ABI,
        functionName: 'paused',
    });

    const { data: contractOwner } = useReadContract({
        address: BANMAO_MINER_ADDRESS,
        abi: BANMAO_MINER_ABI,
        functionName: 'owner',
    });

    // Helper functions
    const formatAmount = (amount: bigint | undefined) => {
        if (!amount) return '0';
        return Number(formatUnits(amount, 18)).toLocaleString();
    };

    // Actions
    const updateMinerParam = async (fn: string, value: string, refetch: () => void) => {
        if (!value || !isOwner) return;
        try {
            const amount = parseUnits(value, 18);
            await writeContractAsync({
                address: BANMAO_MINER_ADDRESS,
                abi: BANMAO_MINER_ABI,
                functionName: fn as any,
                args: [amount]
            } as any);
            setTimeout(refetch, 5000);
        } catch (e) {
            console.error(e);
        }
    };

    const updateCaps = async () => {
        if (!isOwner) return;
        const newDaily = dailyCapInput ? parseUnits(dailyCapInput, 18) : dailyPlayerCap || parseUnits('5000', 18);
        const newHourly = hourlyCapInput ? parseUnits(hourlyCapInput, 18) : hourlySignerCap || parseUnits('50000', 18);

        try {
            await writeContractAsync({
                address: BANMAO_MINER_ADDRESS,
                abi: BANMAO_MINER_ABI,
                functionName: 'updateCaps',
                args: [newDaily, newHourly]
            } as any);
            setDailyCapInput('');
            setHourlyCapInput('');
            setTimeout(() => { refetchDailyCap(); refetchHourlyCap(); }, 5000);
        } catch (e) {
            console.error(e);
        }
    };

    const updateCooldown = async () => {
        if (!cooldownInput || !isOwner) return;
        try {
            const seconds = BigInt(cooldownInput);
            await writeContractAsync({
                address: BANMAO_MINER_ADDRESS,
                abi: BANMAO_MINER_ABI,
                functionName: 'setCooldown',
                args: [seconds]
            } as any);
            setCooldownInput('');
            setTimeout(refetchCooldown, 5000);
        } catch (e) {
            console.error(e);
        }
    };

    const togglePause = async () => {
        if (!isOwner) return;
        try {
            await writeContractAsync({
                address: BANMAO_MINER_ADDRESS,
                abi: BANMAO_MINER_ABI,
                functionName: paused ? 'unpause' : 'pause',
                args: []
            } as any);
            setTimeout(refetchPaused, 5000);
        } catch (e) {
            console.error(e);
        }
    };

    const doTransferOwnership = async () => {
        if (!newOwnerInput || !isOwner) return;
        if (!confirm('Are you sure? This is irreversible.')) return;
        try {
            await writeContractAsync({
                address: BANMAO_MINER_ADDRESS,
                abi: BANMAO_MINER_ABI,
                functionName: 'transferOwnership',
                args: [newOwnerInput as `0x${string}`]
            } as any);
            setNewOwnerInput('');
        } catch (e) {
            console.error(e);
        }
    };

    // Components
    const CollapsibleSection = ({ id, title, icon, color, tag, children }: any) => {
        const isOpen = openSections[id];
        return (
            <div className={`admin-collapsible ${isOpen ? 'open' : ''}`} style={color ? { borderColor: `${color}33` } : {}}>
                <div className="admin-collapsible-header" onClick={() => toggleSection(id)} style={color ? { color: color } : {}}>
                    <div className="admin-collapsible-title-group">
                        <span className="admin-collapsible-icon">{icon}</span>
                        <h3 className="admin-collapsible-title" style={color ? { color: color } : {}}>{title}</h3>
                        {tag && (
                            <span style={{
                                fontSize: '10px',
                                background: tag.bg || 'rgba(255,255,255,0.1)',
                                color: tag.color || '#fff',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                textTransform: 'uppercase',
                                fontWeight: 'bold'
                            }}>
                                {tag.text}
                            </span>
                        )}
                    </div>
                    <span className="admin-collapsible-arrow">▼</span>
                </div>
                <div className="admin-collapsible-content">
                    <div className="admin-collapsible-inner">
                        {children}
                    </div>
                </div>
            </div>
        );
    };

    const NumberInput = ({ value, onChange, placeholder, disabled }: any) => {
        const handleIncrement = () => {
            if (disabled) return;
            const current = parseFloat(value || placeholder?.replace(/,/g, '') || '0');
            onChange((current + 1).toString());
        };
        const handleDecrement = () => {
            if (disabled) return;
            const current = parseFloat(value || placeholder?.replace(/,/g, '') || '0');
            onChange(Math.max(0, current - 1).toString());
        };

        return (
            <div className="admin-num-control" style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                <button className="admin-num-btn" onClick={handleDecrement}>-</button>
                <input
                    type="number"
                    className="admin-num-input"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                />
                <button className="admin-num-btn" onClick={handleIncrement}>+</button>
            </div>
        );
    };

    return (
        <div className="admin-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                    <h2 className="admin-panel-title">{t.miner?.title}</h2>
                    <p className="admin-panel-desc">{t.miner?.desc}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={togglePause}
                        className={paused ? "admin-btn-primary" : "admin-btn-danger"}
                        style={paused ? { background: '#22c55e' } : {}}
                        disabled={!isOwner && !isAdmin}
                    >
                        {paused ? '▶️ UNPAUSE GAME' : '⏸️ PAUSE GAME'}
                    </button>
                </div>
            </div>

            <ContractInfoCard
                title="Miner Contract"
                address={BANMAO_MINER_ADDRESS}
                chainId={196}
                networkName="X Layer Mainnet"
                explorerBaseUrl="https://web3.okx.com/explorer/x-layer/address"
            />

            <div style={{ marginBottom: '20px', padding: '10px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px', fontSize: '14px', color: '#fbbf24' }}>
                {isOwner ? t.common?.ownerView : isAdmin ? t.common?.adminView : t.common?.viewOnly}
            </div>

            {/* Backend Settings (Accessible to Admin & Owner) */}
            <div style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>{t.common?.backendConfig}</h4>
                <CollapsibleSection
                    id="backend"
                    title={t.snake.backend?.title || 'Backend Config'}
                    icon="💾"
                    tag={{ text: 'Admin + Owner', bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
                >
                    <p className="admin-panel-desc">{t.snake.backend?.desc}</p>
                    <div className="admin-form-group">
                        <label>Difficulty Ratio</label>
                        <div className="admin-input-row">
                            <NumberInput
                                value={ratioInput}
                                onChange={setRatioInput}
                                placeholder={backendConfig['MINER_RATIO'] || '1'}
                                disabled={!isAdmin && !isOwner}
                            />
                            <button
                                className="admin-btn-primary"
                                onClick={() => saveBackendConfig('MINER_RATIO', ratioInput)}
                                disabled={!isAdmin && !isOwner}
                            >
                                {t.save}
                            </button>
                        </div>
                    </div>
                    <div className="admin-form-group">
                        <label>{t.snake.backend?.maxClaims}</label>
                        <div className="admin-input-row">
                            <NumberInput
                                value={maxClaimsInput}
                                onChange={setMaxClaimsInput}
                                placeholder={backendConfig['MINER_MAX_CLAIMS_PER_HOUR'] || '10'}
                                disabled={!isAdmin && !isOwner}
                            />
                            <button
                                className="admin-btn-primary"
                                onClick={() => saveBackendConfig('MINER_MAX_CLAIMS_PER_HOUR', maxClaimsInput)}
                                disabled={!isAdmin && !isOwner}
                            >
                                {t.save}
                            </button>
                        </div>
                    </div>
                    <div className="admin-form-group">
                        <label>{t.snake.backend?.rateLimit}</label>
                        <div className="admin-input-row">
                            <NumberInput
                                value={rateLimitWindowInput}
                                onChange={setRateLimitWindowInput}
                                placeholder={backendConfig['MINER_RATE_LIMIT_WINDOW'] || '60'}
                                disabled={!isAdmin && !isOwner}
                            />
                            <button
                                className="admin-btn-primary"
                                onClick={() => saveBackendConfig('MINER_RATE_LIMIT_WINDOW', rateLimitWindowInput)}
                                disabled={!isAdmin && !isOwner}
                            >
                                {t.save}
                            </button>
                        </div>
                    </div>
                </CollapsibleSection>
            </div>

            {/* On-Chain Settings (Owner Only) */}
            <div>
                <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>{t.common?.smartContract}</h4>

                <CollapsibleSection
                    id="contract"
                    title={t.miner.minClaim?.label}
                    icon="⛓️"
                    tag={{ text: 'Owner Only', bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}
                >
                    <div className="admin-form-group">
                        <label>{t.snake.minClaim?.label}</label>
                        <div className="admin-input-row">
                            <NumberInput
                                value={minClaimInput}
                                onChange={setMinClaimInput}
                                placeholder={formatAmount(minClaimAmount)}
                                disabled={!isOwner}
                            />
                            <button
                                className="admin-btn-primary"
                                onClick={() => updateMinerParam('setMinClaim', minClaimInput, refetchMinClaim)}
                                disabled={isPending || !isOwner}
                            >
                                {isPending ? t.processing : t.update}
                            </button>
                        </div>
                        <span className="admin-form-hint">{t.snake.minClaim?.hint}</span>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    id="caps"
                    title={t.snake.caps?.title}
                    icon="📊"
                    tag={{ text: 'Owner Only', bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}
                >
                    <p className="admin-panel-desc" style={{ marginBottom: '20px' }}>{t.snake.caps?.desc}</p>
                    <div className="admin-form-group">
                        <label>{t.snake.caps?.dailyPlayer}</label>
                        <NumberInput
                            value={dailyCapInput}
                            onChange={setDailyCapInput}
                            placeholder={formatAmount(dailyPlayerCap)}
                            disabled={!isOwner}
                        />
                        <span className="admin-form-hint">{t.snake.caps?.dailyHint}</span>
                    </div>
                    <div className="admin-form-group">
                        <label>{t.snake.caps?.hourlySigner}</label>
                        <NumberInput
                            value={hourlyCapInput}
                            onChange={setHourlyCapInput}
                            placeholder={formatAmount(hourlySignerCap)}
                            disabled={!isOwner}
                        />
                        <span className="admin-form-hint">{t.snake.caps?.hourlyHint}</span>
                    </div>
                    <button
                        className="admin-btn-primary"
                        style={{ width: '100%', marginTop: '10px' }}
                        onClick={updateCaps}
                        disabled={isPending || !isOwner}
                    >
                        {isPending ? t.processing : t.snake.caps?.updateBtn}
                    </button>
                </CollapsibleSection>

                <CollapsibleSection
                    id="cooldown"
                    title={t.common?.cooldown}
                    icon="⏱️"
                    tag={{ text: 'Owner Only', bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}
                >
                    <div className="admin-form-group">
                        <label>{t.common?.cooldownLabel}</label>
                        <div className="admin-input-row">
                            <NumberInput
                                value={cooldownInput}
                                onChange={setCooldownInput}
                                placeholder={claimCooldown ? String(claimCooldown) : '300'}
                                disabled={!isOwner}
                            />
                            <button
                                className="admin-btn-primary"
                                onClick={updateCooldown}
                                disabled={isPending || !isOwner}
                            >
                                {isPending ? t.processing : t.update}
                            </button>
                        </div>
                        <span className="admin-form-hint">{t.common?.cooldownHint}</span>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    id="danger"
                    title={t.snake.danger.title}
                    icon="⚠️"
                    color="#ef4444"
                    tag={{ text: 'Owner Only', bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                >
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>{t.snake.danger.currentOwner}:</span>
                        <span style={{ color: '#ef4444', fontFamily: 'monospace', marginLeft: '10px', fontSize: '14px' }}>
                            {contractOwner ? `${(contractOwner as string)}` : t.loading}
                        </span>
                    </div>
                    <div className="admin-form-group">
                        <label style={{ color: '#ef4444' }}>{t.snake.danger.transferInput}</label>
                        <div className="admin-input-row">
                            <input
                                type="text"
                                value={newOwnerInput}
                                onChange={e => setNewOwnerInput(e.target.value)}
                                placeholder="0x..."
                                style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                disabled={!isOwner}
                            />
                            <button
                                className="admin-btn-danger"
                                onClick={doTransferOwnership}
                                disabled={isPending || !isOwner}
                            >
                                {isPending ? t.processing : t.snake.danger.transferBtn}
                            </button>
                        </div>
                        <span className="admin-form-hint" style={{ color: '#ef4444', fontWeight: 'bold' }}>{t.snake.danger.hint}</span>
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
}
