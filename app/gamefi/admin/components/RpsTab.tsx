
import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { RPS_ABI } from '../../banmaorps/lib/abis';
import { RPS_ADDRESS } from '../../banmaorps/lib/constants';
import ContractInfoCard from './ContractInfoCard';

// Define props
interface RpsTabProps {
    t: any; // Translation object
    isAdmin: boolean;
}

export default function RpsTab({ t, isAdmin }: RpsTabProps) {
    const { writeContractAsync, isPending } = useWriteContract();

    // UI Local State for Collapsibles
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        info: true,
        actions: false,
        backend: true
    });

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Action Form States
    const [createStake, setCreateStake] = useState('');
    const [createDuration, setCreateDuration] = useState('600'); // Default 10 mins
    const [joinRoomId, setJoinRoomId] = useState('');
    const [forfeitRoomId, setForfeitRoomId] = useState('');
    const [claimTimeoutRoomId, setClaimTimeoutRoomId] = useState('');

    // Load Immutable Contract Data
    const { data: communityWallet } = useReadContract({
        address: RPS_ADDRESS,
        abi: RPS_ABI,
        functionName: 'communityWallet',
    });

    const { data: deadWallet } = useReadContract({
        address: RPS_ADDRESS,
        abi: RPS_ABI,
        functionName: 'deadWallet',
    });

    const { data: tokenAddress } = useReadContract({
        address: RPS_ADDRESS,
        abi: RPS_ABI,
        functionName: 'token',
    });

    // Helper Actions
    const handleCreateRoom = async () => {
        if (!createStake) return;
        try {
            await writeContractAsync({
                address: RPS_ADDRESS,
                abi: RPS_ABI,
                functionName: 'createRoom',
                args: [parseUnits(createStake, 18), BigInt(createDuration)]
            } as any);
            setCreateStake('');
        } catch (e) {
            console.error(e);
        }
    };

    const handleJoinRoom = async () => {
        if (!joinRoomId) return;
        try {
            await writeContractAsync({
                address: RPS_ADDRESS,
                abi: RPS_ABI,
                functionName: 'joinRoom',
                args: [BigInt(joinRoomId)]
            } as any);
            setJoinRoomId('');
        } catch (e) {
            console.error(e);
        }
    };

    const handleForfeit = async () => {
        if (!forfeitRoomId) return;
        try {
            await writeContractAsync({
                address: RPS_ADDRESS,
                abi: RPS_ABI,
                functionName: 'forfeit',
                args: [BigInt(forfeitRoomId)]
            } as any);
            setForfeitRoomId('');
        } catch (e) {
            console.error(e);
        }
    };

    const handleClaimTimeout = async () => {
        if (!claimTimeoutRoomId) return;
        try {
            await writeContractAsync({
                address: RPS_ADDRESS,
                abi: RPS_ABI,
                functionName: 'claimTimeout',
                args: [BigInt(claimTimeoutRoomId)]
            } as any);
            setClaimTimeoutRoomId('');
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
        return (
            <div className="admin-num-control" style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                <input
                    type="number"
                    className="admin-num-input"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    style={{ textAlign: 'left', paddingLeft: '12px' }}
                />
            </div>
        );
    };

    return (
        <div className="admin-panel">
            <h2 className="admin-panel-title">{t.rps.title}</h2>
            <p className="admin-panel-desc">{t.rps.desc}</p>

            <ContractInfoCard
                title="RPS Contract"
                address={RPS_ADDRESS}
                chainId={196}
                networkName="X Layer Mainnet"
                explorerBaseUrl="https://web3.okx.com/explorer/x-layer/address"
            />

            <div style={{ marginBottom: '20px', padding: '10px', background: 'rgba(34, 211, 238, 0.1)', borderRadius: '8px', fontSize: '14px', color: '#22d3ee' }}>
                {isAdmin ? '🛡️ You are an Admin.' : '👁️ View Only Mode.'}
            </div>

            {/* Contract Info (Read-Only) */}
            <div>
                <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>Smart Contract (Immutable)</h4>

                <CollapsibleSection
                    id="info"
                    title="Contract Parameters"
                    icon="ℹ️"
                    tag={{ text: 'Read Only', bg: 'rgba(148, 163, 184, 0.2)', color: '#94a3b8' }}
                >
                    <div className="admin-form-group">
                        <label>Game Fee</label>
                        <div className="admin-input-row" style={{ marginTop: '5px' }}>
                            <span className="admin-stat-value" style={{ fontSize: '16px' }}>2%</span>
                        </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>Community Wallet:</span>
                        <div style={{ color: '#22d3ee', fontFamily: 'monospace', fontSize: '14px', wordBreak: 'break-all', marginTop: '5px' }}>
                            {communityWallet ? `${(communityWallet as string)}` : t.loading}
                        </div>
                    </div>
                </CollapsibleSection>
            </div>

            {/* Public Interactions */}
            <div style={{ marginTop: '30px' }}>
                <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>Interact with Contract</h4>
                <CollapsibleSection
                    id="actions"
                    title="Public Write Functions"
                    icon="✍️"
                    tag={{ text: 'Public', bg: 'rgba(251, 146, 60, 0.2)', color: '#fb923c' }}
                >
                    <p className="admin-panel-desc" style={{ marginBottom: '20px' }}>Execute public functions manually. Useful for testing or forcing state updates.</p>

                    {/* Create Room */}
                    <div className="admin-form-group" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
                        <label>Create Room</label>
                        <div className="admin-input-row">
                            <NumberInput value={createStake} onChange={setCreateStake} placeholder="Stake Amount" />
                            <NumberInput value={createDuration} onChange={setCreateDuration} placeholder="Duration (sec)" />
                            <button className="admin-btn-primary" onClick={handleCreateRoom} disabled={isPending}>
                                Create
                            </button>
                        </div>
                    </div>

                    {/* Join Room */}
                    <div className="admin-form-group" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
                        <label>Join Room</label>
                        <div className="admin-input-row">
                            <NumberInput value={joinRoomId} onChange={setJoinRoomId} placeholder="Room ID" />
                            <button className="admin-btn-primary" onClick={handleJoinRoom} disabled={isPending}>
                                Join
                            </button>
                        </div>
                    </div>

                    {/* Forfeit */}
                    <div className="admin-form-group" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
                        <label>Forfeit (Force End)</label>
                        <div className="admin-input-row">
                            <NumberInput value={forfeitRoomId} onChange={setForfeitRoomId} placeholder="Room ID" />
                            <button className="admin-btn-danger" onClick={handleForfeit} disabled={isPending}>
                                Forfeit
                            </button>
                        </div>
                        <span className="admin-form-hint">Only players can forfeit active games.</span>
                    </div>

                    {/* Claim Timeout */}
                    <div className="admin-form-group">
                        <label>Claim Timeout</label>
                        <div className="admin-input-row">
                            <NumberInput value={claimTimeoutRoomId} onChange={setClaimTimeoutRoomId} placeholder="Room ID" />
                            <button className="admin-btn-primary" onClick={handleClaimTimeout} disabled={isPending}>
                                Claim Timeout
                            </button>
                        </div>
                        <span className="admin-form-hint">Resolve stuck games after deadlines.</span>
                    </div>

                </CollapsibleSection>
            </div>

            {/* Backend Settings Placeholder */}
            <div style={{ marginTop: '30px' }}>
                <h4 style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>Backend Configuration</h4>
                <CollapsibleSection
                    id="backend"
                    title={t?.rps?.backend?.title || "Backend Configuration"}
                    icon="💾"
                    tag={{ text: 'Admin Only', bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
                >
                    <p className="admin-panel-desc">No specific backend configuration available for RPS yet.</p>
                </CollapsibleSection>
            </div>

        </div>
    );
}
