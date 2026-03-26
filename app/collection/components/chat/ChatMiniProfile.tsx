import React from 'react';
import { useBalance } from 'wagmi';
import { X, ExternalLink } from 'lucide-react';
import { formatUnits } from 'viem';

interface Props {
    address: string;
    onClose: () => void;
    nickname?: string;
    t: any;
}

const BANMAO_ADDRESS = '0x8894179eBCfb9B642C7E5529A51CFe0BA25AE4dd';

export default function ChatMiniProfile({ address, onClose, nickname, t }: Props) {
    const { data: ethBalance } = useBalance({ address: address as `0x${string}` });
    const { data: banmaoBalance } = useBalance({
        address: address as `0x${string}`,
        token: BANMAO_ADDRESS as `0x${string}`
    });

    const shortAddr = address.substring(0, 6) + '...' + address.substring(address.length - 4);

    return (
        <div className="hub-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="hub-modal-content" onClick={e => e.stopPropagation()} style={{ width: '300px', padding: '24px', textAlign: 'center' }}>
                <button className="hub-modal-close" onClick={onClose}><X size={20} /></button>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', margin: '0 auto 16px' }}>
                    {nickname?.[0]?.toUpperCase() || shortAddr[0].toUpperCase()}
                </div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--hub-text)' }}>{nickname || shortAddr}</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--hub-text-muted)' }}>
                    {shortAddr}
                    <a href={`https://www.okx.com/web3/explorer/xlayer/address/${address}`} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: '#0084ff', display: 'inline-block' }}><ExternalLink size={14} /></a>
                </p>

                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--hub-text-muted)', fontSize: '0.9rem' }}>$BANMAO:</span>
                        <strong style={{ color: 'var(--hub-text)' }}>
                            {banmaoBalance ? Number(formatUnits(banmaoBalance.value, banmaoBalance.decimals)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                        </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--hub-text-muted)', fontSize: '0.9rem' }}>OKB:</span>
                        <strong style={{ color: 'var(--hub-text)' }}>
                            {ethBalance ? Number(ethBalance.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 }) : '0.00'}
                        </strong>
                    </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--hub-text-muted)', marginTop: '20px', marginBottom: 0, fontStyle: 'italic' }}>
                    {t.onChainData || 'Live On-chain Data'}
                </p>
            </div>
        </div>
    );
}
