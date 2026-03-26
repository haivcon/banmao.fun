'use client';

import React, { useEffect } from 'react';
import { StakingTranslations } from '../i18n';
import './panels.css';
import { useReadContract, useAccount } from 'wagmi';
import { STAKING_CONTRACT_ADDRESS, STAKING_ABI } from '../contracts';
import { formatEther } from 'viem';

interface CompoundPanelProps {
    t: (key: keyof StakingTranslations) => string;
    isLoading: boolean;
    handleCompound: () => void;
    onClose: () => void;
    onCollapse?: () => void;
    style?: React.CSSProperties;
    isExpanded?: boolean;
    onExpand?: () => void;
}

export function CompoundPanel({
    t, isLoading, handleCompound, onClose, onCollapse, style,
    isExpanded, onExpand
}: CompoundPanelProps) {
    const { address } = useAccount();

    const { data: pendingRewards, refetch } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: STAKING_ABI,
        functionName: 'pendingRewards',
        args: [address as `0x${string}`],
        chainId: 196,
    });

    useEffect(() => {
        if (isExpanded) refetch();
    }, [isExpanded, refetch]);

    const formattedRewards = pendingRewards ? formatEther(pendingRewards as bigint) : '0';

    const renderContent = () => (
        <div className="compound-section">
            <div className="compound-icon">🔄</div>
            <p className="compound-desc">{t('compoundDesc')}</p>

            <div style={{ margin: '15px 0', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#aaa', fontSize: '12px' }}>{t('pendingRewards')}</span>
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>{Number(formattedRewards).toFixed(6)} BANMAO</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#aaa', fontSize: '12px' }}>{t('newStakeLock')}</span>
                    <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{t('lockFlexible')} (0 {t('timeDaysShort')})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#aaa', fontSize: '12px' }}>{t('multiplier')}</span>
                    <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>1.0x</span>
                </div>
            </div>

            <button
                className="btn-primary btn-compound"
                onClick={(e) => { e.stopPropagation(); handleCompound(); }}
                disabled={isLoading || !pendingRewards || pendingRewards === BigInt(0)}
            >
                {isLoading ? t('processing') : t('compound')}
            </button>
        </div>
    );

    // When expanded, render as larger centered circular panel (no backdrop)
    if (isExpanded) {
        return (
            <div
                className="circular-panel-component circular-panel-expanded panel-compound"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="circular-panel-header">
                    <h2 className="circular-panel-title">{t('panelCompound')}</h2>
                </div>
                <div className="circular-panel-content">
                    {renderContent()}
                </div>
                {/* Close button at bottom center - collapses to compact */}
                <button className="circular-panel-close" onClick={(e) => { e.stopPropagation(); onCollapse ? onCollapse() : onClose(); }}>{t('tourBack')}</button>
            </div>
        );
    }

    // Compact circular view
    return (
        <div className="circular-panel-component panel-compound" style={style} onClick={onExpand}>
            <div className="circular-panel-header">
                <h2 className="circular-panel-title">{t('panelCompound')}</h2>
                <button className="circular-panel-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
            </div>
            <div className="circular-panel-content">
                {renderContent()}
            </div>
        </div>
    );
}
