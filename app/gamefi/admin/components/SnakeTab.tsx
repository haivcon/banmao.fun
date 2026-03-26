
import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { SNAKE_ABI, ERC20_ABI } from '../../banmaosnake/lib/abis';
import { SNAKE_CONTRACT_ADDRESS, BANMAO_TOKEN_ADDRESS } from '../../banmaosnake/lib/constants';
import ContractInfoCard from './ContractInfoCard';

interface SnakeTabProps {
    backendConfig: Record<string, string>;
    saveBackendConfig: (key: string, value: string) => Promise<void>;
    t: any;
    isOwner: boolean;
    isAdmin: boolean;
}

export default function SnakeTab({ backendConfig, saveBackendConfig, t, isOwner, isAdmin }: SnakeTabProps) {
    const { address } = useAccount();
    const { writeContractAsync, isPending } = useWriteContract();

    // ========== UI STATE ==========
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        stats: true,
        contract: false,
        caps: false,
        signer: false,
        backend: true,
        danger: false
    });
    const toggleSection = (s: string) => setOpenSections(p => ({ ...p, [s]: !p[s] }));

    // Input states
    const [minClaimInput, setMinClaimInput] = useState('');
    const [dailyCapInput, setDailyCapInput] = useState('');
    const [hourlyCapInput, setHourlyCapInput] = useState('');
    const [maxClaimPerGameInput, setMaxClaimPerGameInput] = useState('');
    const [minDonationInput, setMinDonationInput] = useState('');
    const [newSignerInput, setNewSignerInput] = useState('');
    const [newOwnerInput, setNewOwnerInput] = useState('');
    const [emergencyToInput, setEmergencyToInput] = useState('');
    const [emergencyAmountInput, setEmergencyAmountInput] = useState('');
    const [ratioInput, setRatioInput] = useState('');
    const [maxClaimsInput, setMaxClaimsInput] = useState('');
    const [rateLimitWindowInput, setRateLimitWindowInput] = useState('');

    // ========== CONTRACT READS ==========
    const readOpts = { address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI };

    const { data: minClaimAmount, refetch: refetchMinClaim } = useReadContract({ ...readOpts, functionName: 'minClaimAmount' });
    const { data: dailyPlayerCap, refetch: refetchDailyCap } = useReadContract({ ...readOpts, functionName: 'dailyPlayerCap' });
    const { data: hourlySignerCap, refetch: refetchHourlyCap } = useReadContract({ ...readOpts, functionName: 'hourlySignerCap' });
    const { data: signerAddress, refetch: refetchSigner } = useReadContract({ ...readOpts, functionName: 'signerAddress' });
    const { data: maxClaimPerGame, refetch: refetchMaxClaim } = useReadContract({ ...readOpts, functionName: 'maxClaimPerGame' });
    const { data: minDonationForListing, refetch: refetchMinDonation } = useReadContract({ ...readOpts, functionName: 'minDonationForListing' });
    const { data: isPaused, refetch: refetchPaused } = useReadContract({ ...readOpts, functionName: 'paused' });
    const { data: contractOwner } = useReadContract({ ...readOpts, functionName: 'owner' });

    // Stats reads
    const { data: totalDonatedAmount, refetch: refetchTotalDonated } = useReadContract({ ...readOpts, functionName: 'totalDonatedAmount' });
    const { data: totalDonors, refetch: refetchTotalDonors } = useReadContract({ ...readOpts, functionName: 'getTotalDonors' });
    const { data: hourlySignedAmount, refetch: refetchHourlySigned } = useReadContract({ ...readOpts, functionName: 'hourlySignedAmount' });
    const { data: currentHour } = useReadContract({ ...readOpts, functionName: 'currentHour' });

    // Pool balance (ERC20 balance of contract)
    const { data: poolBalance, refetch: refetchPool } = useReadContract({
        address: BANMAO_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [SNAKE_CONTRACT_ADDRESS],
    } as any);

    // ========== HELPERS ==========
    const fmt = (v: bigint | undefined) => v ? Number(formatUnits(v, 18)).toLocaleString() : '0';
    const fmtCompact = (v: bigint | undefined) => {
        if (!v) return '0';
        const n = Number(formatUnits(v, 18));
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return n.toLocaleString();
    };
    const fmtAddr = (addr: string) => addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : '—';

    const refetchAllStats = () => {
        refetchPool(); refetchTotalDonated(); refetchTotalDonors();
        refetchHourlySigned(); refetchMinClaim(); refetchDailyCap();
        refetchHourlyCap(); refetchMaxClaim(); refetchMinDonation();
        refetchPaused();
    };

    // ========== WRITE ACTIONS ==========
    const updateParam = async (fn: string, value: string, refetch: () => void) => {
        if (!value || !isOwner) return;
        try {
            await writeContractAsync({
                address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI,
                functionName: fn as any, args: [parseUnits(value, 18)]
            } as any);
            setTimeout(refetch, 5000);
        } catch (e) { console.error(e); }
    };

    const updateCaps = async () => {
        if (!isOwner) return;
        const d = dailyCapInput ? parseUnits(dailyCapInput, 18) : dailyPlayerCap || parseUnits('5000', 18);
        const h = hourlyCapInput ? parseUnits(hourlyCapInput, 18) : hourlySignerCap || parseUnits('50000', 18);
        try {
            await writeContractAsync({
                address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI,
                functionName: 'updateCaps', args: [d, h]
            } as any);
            setDailyCapInput(''); setHourlyCapInput('');
            setTimeout(() => { refetchDailyCap(); refetchHourlyCap(); }, 5000);
        } catch (e) { console.error(e); }
    };

    const updateSigner = async () => {
        if (!newSignerInput || !isOwner) return;
        try {
            await writeContractAsync({
                address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI,
                functionName: 'setSigner', args: [newSignerInput as `0x${string}`]
            } as any);
            setNewSignerInput('');
            setTimeout(refetchSigner, 5000);
        } catch (e) { console.error(e); }
    };

    const togglePause = async () => {
        if (!isOwner) return;
        try {
            await writeContractAsync({
                address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI,
                functionName: isPaused ? 'unpause' : 'pause',
            } as any);
            setTimeout(refetchPaused, 5000);
        } catch (e) { console.error(e); }
    };

    const doEmergencyWithdraw = async () => {
        if (!emergencyToInput || !emergencyAmountInput || !isOwner) return;
        if (!confirm(`Emergency withdraw ${emergencyAmountInput} tokens to ${emergencyToInput}?`)) return;
        try {
            await writeContractAsync({
                address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI,
                functionName: 'emergencyWithdraw',
                args: [emergencyToInput as `0x${string}`, parseUnits(emergencyAmountInput, 18)]
            } as any);
            setEmergencyToInput(''); setEmergencyAmountInput('');
        } catch (e) { console.error(e); }
    };

    const doTransferOwnership = async () => {
        if (!newOwnerInput || !isOwner) return;
        if (!confirm('⚠️ IRREVERSIBLE! Transfer contract ownership?')) return;
        try {
            await writeContractAsync({
                address: SNAKE_CONTRACT_ADDRESS, abi: SNAKE_ABI,
                functionName: 'transferOwnership', args: [newOwnerInput as `0x${string}`]
            } as any);
            setNewOwnerInput('');
        } catch (e) { console.error(e); }
    };

    // ========== SUB-COMPONENTS ==========
    const CollapsibleSection = ({ id, title, icon, color, tag, children }: any) => {
        const isOpen = openSections[id];
        return (
            <div className={`admin-collapsible ${isOpen ? 'open' : ''}`} style={color ? { borderColor: `${color}33` } : {}}>
                <div className="admin-collapsible-header" onClick={() => toggleSection(id)} style={color ? { color } : {}}>
                    <div className="admin-collapsible-title-group">
                        <span className="admin-collapsible-icon">{icon}</span>
                        <h3 className="admin-collapsible-title" style={color ? { color } : {}}>{title}</h3>
                        {tag && (
                            <span style={{
                                fontSize: '10px', background: tag.bg || 'rgba(255,255,255,0.1)',
                                color: tag.color || '#fff', padding: '2px 8px', borderRadius: '10px',
                                textTransform: 'uppercase', fontWeight: 'bold'
                            }}>{tag.text}</span>
                        )}
                    </div>
                    <span className="admin-collapsible-arrow">▼</span>
                </div>
                <div className="admin-collapsible-content">
                    <div className="admin-collapsible-inner">{children}</div>
                </div>
            </div>
        );
    };

    const NumberInput = ({ value, onChange, placeholder, disabled }: any) => (
        <div className="admin-num-control" style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
            <button className="admin-num-btn" onClick={() => {
                if (disabled) return;
                const c = parseFloat(value || placeholder?.replace(/,/g, '') || '0');
                onChange(Math.max(0, c - 1).toString());
            }}>-</button>
            <input type="number" className="admin-num-input" value={value}
                onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
            <button className="admin-num-btn" onClick={() => {
                if (disabled) return;
                const c = parseFloat(value || placeholder?.replace(/,/g, '') || '0');
                onChange((c + 1).toString());
            }}>+</button>
        </div>
    );

    // Stat card styles
    const statCard = (bg: string, border: string): React.CSSProperties => ({
        flex: '1 1 140px', padding: '14px', borderRadius: '12px', background: bg,
        border: `1px solid ${border}`, textAlign: 'center', minWidth: '130px'
    });
    const statLabel: React.CSSProperties = { fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' };
    const statValue: React.CSSProperties = { fontSize: '20px', fontWeight: '800', fontFamily: 'monospace' };

    // Hourly usage percentage
    const hourlyUsed = hourlySignedAmount ? Number(formatUnits(hourlySignedAmount as bigint, 18)) : 0;
    const hourlyCap = hourlySignerCap ? Number(formatUnits(hourlySignerCap as bigint, 18)) : 50000;
    const hourlyPct = hourlyCap > 0 ? Math.min(100, (hourlyUsed / hourlyCap) * 100) : 0;
    const hourlyColor = hourlyPct > 80 ? '#ef4444' : hourlyPct > 50 ? '#f59e0b' : '#22c55e';

    const st = t.snake;

    return (
        <div className="admin-panel">
            <h2 className="admin-panel-title">{st.title}</h2>
            <p className="admin-panel-desc">{st.desc}</p>

            <ContractInfoCard
                title="BanMaoSnake Contract"
                address={SNAKE_CONTRACT_ADDRESS}
                chainId={196}
                networkName="X Layer Mainnet"
                explorerBaseUrl="https://web3.okx.com/explorer/x-layer/address"
            />

            <div style={{ marginBottom: '20px', padding: '10px', background: 'rgba(34, 211, 238, 0.1)', borderRadius: '8px', fontSize: '14px', color: '#22d3ee' }}>
                {isOwner ? t.common?.ownerView : isAdmin ? t.common?.adminView : t.common?.viewOnly}
            </div>

            {/* ==================== LIVE STATS DASHBOARD ==================== */}
            <CollapsibleSection id="stats" title={st.stats?.title || 'Live Dashboard'} icon="📊"
                tag={{ text: 'Real-time', bg: 'rgba(34, 211, 238, 0.2)', color: '#22d3ee' }}>

                {/* Status Bar */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px',
                    borderRadius: 10, background: isPaused ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.08)',
                    border: `1px solid ${isPaused ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.2)'}`
                }}>
                    <span style={{ fontSize: 22 }}>{isPaused ? '⏸️' : '▶️'}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: isPaused ? '#ef4444' : '#22c55e', fontSize: 14 }}>
                            {isPaused ? (st.paused || 'Contract PAUSED') : (st.running || 'Contract RUNNING')}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{st.pauseHint || 'Pause disables claimReward and donate'}</div>
                    </div>
                    <button
                        className={isPaused ? 'admin-btn-primary' : 'admin-btn-danger'}
                        onClick={togglePause} disabled={isPending || !isOwner}
                        style={{ minWidth: 100, fontSize: 12 }}
                    >
                        {isPending ? t.processing : isPaused ? (st.unpauseBtn || '▶ Unpause') : (st.pauseBtn || '⏸ Pause')}
                    </button>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <div style={statCard('rgba(139, 92, 246, 0.08)', 'rgba(139, 92, 246, 0.2)')}>
                        <div style={statLabel}>{st.stats?.poolBalance || 'Pool Balance'}</div>
                        <div style={{ ...statValue, color: '#a78bfa' }}>{fmtCompact(poolBalance as bigint)}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>$BANMAO</div>
                    </div>
                    <div style={statCard('rgba(34, 211, 238, 0.08)', 'rgba(34, 211, 238, 0.2)')}>
                        <div style={statLabel}>{st.stats?.totalDonated || 'Total Donated'}</div>
                        <div style={{ ...statValue, color: '#22d3ee' }}>{fmtCompact(totalDonatedAmount as bigint)}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>$BANMAO</div>
                    </div>
                    <div style={statCard('rgba(251, 191, 36, 0.08)', 'rgba(251, 191, 36, 0.2)')}>
                        <div style={statLabel}>{st.stats?.totalDonors || 'Donors'}</div>
                        <div style={{ ...statValue, color: '#fbbf24' }}>{totalDonors?.toString() || '0'}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{st.stats?.uniqueAddresses || 'addresses'}</div>
                    </div>
                </div>

                {/* Hourly Usage Bar */}
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>{st.stats?.hourlyUsage || 'Hourly Signer Usage'}</span>
                        <span style={{ fontSize: 12, color: hourlyColor, fontWeight: 700 }}>
                            {fmtCompact(hourlySignedAmount as bigint)} / {fmtCompact(hourlySignerCap as bigint)}
                        </span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: '4px', background: hourlyColor,
                            width: `${hourlyPct}%`, transition: 'width 0.3s ease'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ fontSize: 10, color: '#64748b' }}>{hourlyPct.toFixed(1)}%</span>
                        <span style={{ fontSize: 10, color: '#64748b' }}>
                            {st.stats?.currentHourLabel || 'Hour'}: {currentHour?.toString() || '—'}
                        </span>
                    </div>
                </div>

                {/* Current Config Summary */}
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
                        {st.stats?.currentConfig || 'Active Configuration'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {[
                            [st.stats?.minClaim || 'Min Claim', fmt(minClaimAmount as bigint)],
                            [st.stats?.maxPerGame || 'Max/Game', fmt(maxClaimPerGame as bigint)],
                            [st.stats?.dailyCap || 'Daily Cap', fmt(dailyPlayerCap as bigint)],
                            [st.stats?.hourlyCap || 'Hourly Cap', fmt(hourlySignerCap as bigint)],
                            [st.stats?.minDonation || 'Min Donation', fmt(minDonationForListing as bigint)],
                            [st.stats?.signer || 'Signer', fmtAddr(signerAddress as string || '')],
                        ].map(([label, val], i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                                <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
                                <span style={{ fontSize: 11, color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{val}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <button className="admin-btn-primary" onClick={refetchAllStats}
                    style={{ width: '100%', marginTop: '12px', fontSize: 12 }}>
                    🔄 {st.stats?.refreshBtn || 'Refresh All Data'}
                </button>
            </CollapsibleSection>

            {/* ==================== BACKEND SETTINGS ==================== */}
            <div style={{ marginTop: '24px', marginBottom: '8px' }}>
                <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>{t.common?.backendConfig}</h4>
            </div>

            <CollapsibleSection id="backend" title={st.backend.title} icon="💾"
                tag={{ text: 'Admin + Owner', bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>
                <p className="admin-panel-desc">{st.backend.desc}</p>
                {/* Ratio */}
                <div className="admin-form-group">
                    <label>{st.backend.ratio}</label>
                    <div className="admin-input-row">
                        <NumberInput value={ratioInput} onChange={setRatioInput}
                            placeholder={backendConfig['SNAKE_RATIO'] || '1'} disabled={!isAdmin && !isOwner} />
                        <button className="admin-btn-primary"
                            onClick={() => saveBackendConfig('SNAKE_RATIO', ratioInput)}
                            disabled={!isAdmin && !isOwner}>{t.save}</button>
                    </div>
                    <span className="admin-form-hint">{st.backend.ratioHint}</span>
                    {(() => {
                        const r = parseFloat(ratioInput || backendConfig['SNAKE_RATIO'] || '1');
                        return (
                            <div style={{ marginTop: 4, padding: '6px 10px', borderRadius: 8, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', fontSize: 11, color: '#a78bfa' }}>
                                📐 {st.backend.ratioExample || 'Example'}: 200 {st.backend.points || 'points'} × {r} = <b>{(200 * r).toLocaleString()}</b> $BANMAO
                            </div>
                        );
                    })()}
                </div>
                {/* Max Claims */}
                <div className="admin-form-group">
                    <label>{st.backend.maxClaims}</label>
                    <div className="admin-input-row">
                        <NumberInput value={maxClaimsInput} onChange={setMaxClaimsInput}
                            placeholder={backendConfig['SNAKE_MAX_CLAIMS_PER_HOUR'] || '10'} disabled={!isAdmin && !isOwner} />
                        <button className="admin-btn-primary"
                            onClick={() => saveBackendConfig('SNAKE_MAX_CLAIMS_PER_HOUR', maxClaimsInput)}
                            disabled={!isAdmin && !isOwner}>{t.save}</button>
                    </div>
                    <span className="admin-form-hint">{st.backend.maxClaimsHint}</span>
                    {(() => {
                        const mc = parseInt(maxClaimsInput || backendConfig['SNAKE_MAX_CLAIMS_PER_HOUR'] || '10');
                        const rl = parseInt(rateLimitWindowInput || backendConfig['SNAKE_RATE_LIMIT_WINDOW'] || '60');
                        return (
                            <div style={{ marginTop: 4, padding: '6px 10px', borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', fontSize: 11, color: '#22c55e' }}>
                                📊 {st.backend.maxClaimsExample || 'Practical'}: {mc} {st.backend.claimsWord || 'claims'}/h, {st.backend.cooldownWord || 'cooldown'} {rl}s → ~{Math.floor(3600 / Math.max(rl, 1))} {st.backend.possibleWord || 'possible'}/h
                            </div>
                        );
                    })()}
                </div>
                {/* Rate Limit Window (seconds) */}
                <div className="admin-form-group">
                    <label>{st.backend.rateLimit}</label>
                    <div className="admin-input-row">
                        <NumberInput value={rateLimitWindowInput} onChange={setRateLimitWindowInput}
                            placeholder={backendConfig['SNAKE_RATE_LIMIT_WINDOW'] || '60'} disabled={!isAdmin && !isOwner} />
                        <button className="admin-btn-primary"
                            onClick={() => saveBackendConfig('SNAKE_RATE_LIMIT_WINDOW', rateLimitWindowInput)}
                            disabled={!isAdmin && !isOwner}>{t.save}</button>
                    </div>
                    <span className="admin-form-hint">{st.backend.rateLimitHint}</span>
                    {(() => {
                        const s = parseInt(rateLimitWindowInput || backendConfig['SNAKE_RATE_LIMIT_WINDOW'] || '60');
                        const mins = Math.floor(s / 60);
                        const secs = s % 60;
                        const timeStr = mins > 0 ? `${mins}m${secs > 0 ? ` ${secs}s` : ''}` : `${s}s`;
                        return (
                            <div style={{ marginTop: 4, padding: '6px 10px', borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', fontSize: 11, color: '#fbbf24' }}>
                                ⏱️ {s}s = {timeStr} → {st.backend.rateLimitExample || 'A player must wait'} <b>{timeStr}</b> {st.backend.betweenClaims || 'between claims'}
                            </div>
                        );
                    })()}
                </div>
            </CollapsibleSection>

            {/* ==================== ON-CHAIN SETTINGS ==================== */}
            <div style={{ marginTop: '24px', marginBottom: '8px' }}>
                <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>{t.common?.smartContract}</h4>
            </div>

            {/* Game Parameters */}
            <CollapsibleSection id="contract" title={st.contractParams || t.common?.contractParams} icon="⛓️"
                tag={{ text: 'Owner Only', bg: 'rgba(34, 211, 238, 0.2)', color: '#22d3ee' }}>

                <div className="admin-form-group">
                    <label>{st.minClaim.label}</label>
                    <div className="admin-input-row">
                        <NumberInput value={minClaimInput} onChange={setMinClaimInput}
                            placeholder={fmt(minClaimAmount as bigint)} disabled={!isOwner} />
                        <button className="admin-btn-primary"
                            onClick={() => updateParam('setMinClaim', minClaimInput, refetchMinClaim)}
                            disabled={isPending || !isOwner}>
                            {isPending ? t.processing : t.update}
                        </button>
                    </div>
                    <span className="admin-form-hint">{st.minClaim.hint}</span>
                </div>

                <div className="admin-form-group">
                    <label>{st.maxClaimPerGame?.label || 'Max Claim Per Game ($BANMAO)'}</label>
                    <div className="admin-input-row">
                        <NumberInput value={maxClaimPerGameInput} onChange={setMaxClaimPerGameInput}
                            placeholder={fmt(maxClaimPerGame as bigint)} disabled={!isOwner} />
                        <button className="admin-btn-primary"
                            onClick={() => updateParam('setMaxClaimPerGame', maxClaimPerGameInput, refetchMaxClaim)}
                            disabled={isPending || !isOwner}>
                            {isPending ? t.processing : t.update}
                        </button>
                    </div>
                    <span className="admin-form-hint">{st.maxClaimPerGame?.hint || 'Maximum tokens claimable per single game. Default: 2,000'}</span>
                </div>

                <div className="admin-form-group">
                    <label>{st.minDonation?.label || 'Min Donation For Listing ($BANMAO)'}</label>
                    <div className="admin-input-row">
                        <NumberInput value={minDonationInput} onChange={setMinDonationInput}
                            placeholder={fmt(minDonationForListing as bigint)} disabled={!isOwner} />
                        <button className="admin-btn-primary"
                            onClick={() => updateParam('setMinDonationForListing', minDonationInput, refetchMinDonation)}
                            disabled={isPending || !isOwner}>
                            {isPending ? t.processing : t.update}
                        </button>
                    </div>
                    <span className="admin-form-hint">{st.minDonation?.hint || 'Minimum donation to appear in donor leaderboard. Default: 10'}</span>
                </div>
            </CollapsibleSection>

            {/* Rate Limiting Caps */}
            <CollapsibleSection id="caps" title={st.caps.title} icon="🛡️"
                tag={{ text: 'Owner Only', bg: 'rgba(34, 211, 238, 0.2)', color: '#22d3ee' }}>
                <p className="admin-panel-desc" style={{ marginBottom: '20px' }}>{st.caps.desc}</p>

                <div className="admin-form-group">
                    <label>{st.caps.dailyPlayer}</label>
                    <NumberInput value={dailyCapInput} onChange={setDailyCapInput}
                        placeholder={fmt(dailyPlayerCap as bigint)} disabled={!isOwner} />
                    <span className="admin-form-hint">{st.caps.dailyHint}</span>
                </div>
                <div className="admin-form-group">
                    <label>{st.caps.hourlySigner}</label>
                    <NumberInput value={hourlyCapInput} onChange={setHourlyCapInput}
                        placeholder={fmt(hourlySignerCap as bigint)} disabled={!isOwner} />
                    <span className="admin-form-hint">{st.caps.hourlyHint}</span>
                </div>

                <button className="admin-btn-primary" style={{ width: '100%', marginTop: '10px' }}
                    onClick={updateCaps} disabled={isPending || !isOwner}>
                    {isPending ? t.processing : st.caps.updateBtn}
                </button>
            </CollapsibleSection>

            {/* Signer Management */}
            <CollapsibleSection id="signer" title={st.signer.title} icon="🔐" color="#a855f7"
                tag={{ text: 'Owner Only', bg: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 15px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>🔑</span>
                    <div style={{ flex: 1 }}>
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>{st.signer.current}:</span>
                        <div style={{ color: '#a78bfa', fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all', marginTop: 2 }}>
                            {signerAddress ? `${(signerAddress as string)}` : t.loading}
                        </div>
                    </div>
                </div>
                <div className="admin-form-group">
                    <label>{st.signer.newAddress}</label>
                    <div className="admin-input-row">
                        <input type="text" value={newSignerInput} onChange={e => setNewSignerInput(e.target.value)}
                            placeholder="0x..." disabled={!isOwner} />
                        <button className="admin-btn-primary" onClick={updateSigner}
                            disabled={isPending || !isOwner}>
                            {isPending ? t.processing : st.signer.updateBtn}
                        </button>
                    </div>
                    <span className="admin-form-hint" style={{ color: '#fcd34d' }}>{st.signer.hint}</span>
                </div>
            </CollapsibleSection>

            {/* Danger Zone */}
            <CollapsibleSection id="danger" title={st.danger.title} icon="⚠️" color="#ef4444"
                tag={{ text: 'Owner Only', bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>

                {/* Emergency Withdraw */}
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: 15, borderRadius: 12, marginBottom: 20, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>🚨</span> {st.danger.emergencyTitle || 'Emergency Withdraw'}
                    </div>
                    <div className="admin-form-group">
                        <label>{st.danger.emergencyTo || 'Recipient Address'}</label>
                        <input type="text" value={emergencyToInput} onChange={e => setEmergencyToInput(e.target.value)}
                            placeholder="0x..." style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }} disabled={!isOwner} />
                    </div>
                    <div className="admin-form-group">
                        <label>{st.danger.emergencyAmount || 'Amount ($BANMAO)'}</label>
                        <div className="admin-input-row">
                            <NumberInput value={emergencyAmountInput} onChange={setEmergencyAmountInput}
                                placeholder="0" disabled={!isOwner} />
                            <button className="admin-btn-danger" onClick={doEmergencyWithdraw}
                                disabled={isPending || !isOwner}>
                                {isPending ? t.processing : (st.danger.emergencyBtn || '🚨 Withdraw')}
                            </button>
                        </div>
                    </div>
                    <span className="admin-form-hint" style={{ color: '#ef4444' }}>{st.danger.emergencyHint || 'Sends $BANMAO from contract to specified address'}</span>
                </div>

                {/* Transfer Ownership */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>👑</span>
                    <div style={{ flex: 1 }}>
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>{st.danger.currentOwner}:</span>
                        <div style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-all', marginTop: 2 }}>
                            {contractOwner ? `${(contractOwner as string)}` : t.loading}
                        </div>
                    </div>
                </div>
                <div className="admin-form-group">
                    <label style={{ color: '#ef4444' }}>{st.danger.transferInput}</label>
                    <div className="admin-input-row">
                        <input type="text" value={newOwnerInput} onChange={e => setNewOwnerInput(e.target.value)}
                            placeholder="0x..." style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }} disabled={!isOwner} />
                        <button className="admin-btn-danger" onClick={doTransferOwnership}
                            disabled={isPending || !isOwner}>
                            {isPending ? t.processing : st.danger.transferBtn}
                        </button>
                    </div>
                    <span className="admin-form-hint" style={{ color: '#ef4444', fontWeight: 'bold' }}>{st.danger.hint}</span>
                </div>
            </CollapsibleSection>
        </div>
    );
}
