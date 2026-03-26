'use client';

import React, { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { LandingTranslations } from '../../../web3d/locals';
import { STAKING_CONTRACT_ADDRESS, STAKING_ABI, LOCK_OPTIONS_INFO, StakeEntry } from '../contracts';
import './panels.css';

interface RelockPanelProps {
    t: (key: keyof LandingTranslations) => string;
    stakeIds: bigint[];
    address: string;
    isLoading: boolean;
    handleRelock: (stakeId: number, newLockOptionId: number) => void;
    onClose: () => void;
    onCollapse?: () => void;
    style?: React.CSSProperties;
    isExpanded?: boolean;
    onExpand?: () => void;
}

interface RelockableStake {
    id: number;
    amount: bigint;
    lockOptionId: number;
    lockEndTime: bigint;
    isUnlocked: boolean;
}

export function RelockPanel({
    t, stakeIds, address, isLoading, handleRelock, onClose, onCollapse, style,
    isExpanded, onExpand
}: RelockPanelProps) {
    const [selectedStakeId, setSelectedStakeId] = useState<number | null>(null);
    const [newLockOptionId, setNewLockOptionId] = useState<number>(0);
    const [relockableStakes, setRelockableStakes] = useState<RelockableStake[]>([]);

    // Fetch stake entries to find unlocked ones
    useEffect(() => {
        const fetchStakes = async () => {
            const stakes: RelockableStake[] = [];
            const nowSec = Math.floor(Date.now() / 1000);

            for (const id of stakeIds) {
                try {
                    // This would need to be fetched via contract read
                    // For now, we'll mark all as potentially relockable and let contract handle validation
                    stakes.push({
                        id: Number(id),
                        amount: BigInt(0), // Will be filled by individual reads
                        lockOptionId: 0,
                        lockEndTime: BigInt(0),
                        isUnlocked: true, // Contract will validate
                    });
                } catch (e) {
                    console.error('Error fetching stake', id, e);
                }
            }
            setRelockableStakes(stakes);
        };

        if (stakeIds.length > 0 && address) {
            fetchStakes();
        }
    }, [stakeIds, address]);

    const handleSubmit = () => {
        if (selectedStakeId !== null && newLockOptionId >= 0) {
            handleRelock(selectedStakeId, newLockOptionId);
        }
    };

    // Get available lock options (only those with >= current multiplier)
    const getAvailableLockOptions = (currentLockId: number) => {
        const currentMultiplier = LOCK_OPTIONS_INFO[currentLockId]?.multiplier || 1.0;
        return LOCK_OPTIONS_INFO.filter(opt => opt.multiplier >= currentMultiplier);
    };

    const renderContent = () => (
        <div className="relock-section">
            <div className="relock-icon">🔒</div>
            <p className="relock-desc">
                Gia hạn khóa stake đã hết hạn để nhận multiplier cao hơn
            </p>

            {/* Stake Selection */}
            <div className="input-group">
                <label className="input-label">Chọn Stake</label>
                <select
                    className="stake-select"
                    value={selectedStakeId ?? ''}
                    onChange={(e) => setSelectedStakeId(e.target.value ? Number(e.target.value) : null)}
                    disabled={isLoading}
                >
                    <option value="">-- Chọn stake --</option>
                    {stakeIds.map((id) => (
                        <option key={id.toString()} value={Number(id)}>
                            Stake #{Number(id)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Lock Option Selection */}
            <div className="input-group">
                <label className="input-label">Lock mới</label>
                <div className="lock-options-grid">
                    {LOCK_OPTIONS_INFO.map((opt) => (
                        <button
                            key={opt.id}
                            className={`lock-option-btn ${newLockOptionId === opt.id ? 'selected' : ''}`}
                            onClick={() => setNewLockOptionId(opt.id)}
                            disabled={isLoading}
                            style={{ borderColor: opt.color }}
                        >
                            <span className="lock-name">{opt.name}</span>
                            <span className="lock-multiplier">{opt.multiplier}x</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Info Box */}
            <div className="relock-info-box">
                <span className="info-icon">ℹ️</span>
                <span className="info-text">
                    Chỉ có thể relock stake đã hết hạn khóa.
                    Multiplier mới phải ≥ multiplier hiện tại.
                </span>
            </div>

            {/* Relock Button */}
            <button
                className="btn-primary btn-relock"
                onClick={handleSubmit}
                disabled={isLoading || selectedStakeId === null}
            >
                {isLoading ? 'Processing...' : '🔒 Relock'}
            </button>
        </div>
    );

    // When expanded, render as larger centered circular panel
    if (isExpanded) {
        return (
            <div
                className="circular-panel-component circular-panel-expanded panel-relock"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="circular-panel-header">
                    <h2 className="circular-panel-title">🔒 Relock Stake</h2>
                </div>
                <div className="circular-panel-content">
                    {renderContent()}
                </div>
                <button className="circular-panel-close" onClick={(e) => { e.stopPropagation(); onCollapse ? onCollapse() : onClose(); }}>
                    {t('closeBtn')}
                </button>
            </div>
        );
    }

    // Compact circular view
    return (
        <div className="circular-panel-component panel-relock" style={style} onClick={onExpand}>
            <div className="circular-panel-header">
                <h2 className="circular-panel-title">🔒 Relock</h2>
                <button className="circular-panel-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
            </div>
            <div className="circular-panel-content">
                {renderContent()}
            </div>
        </div>
    );
}
