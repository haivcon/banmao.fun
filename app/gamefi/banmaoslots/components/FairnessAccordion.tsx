import React, { useState } from 'react';
import { SlotsTranslations } from '../lib/i18n/types';

interface FairnessAccordionProps {
    t: SlotsTranslations;
    style: any;
    localCustomSeed: string;
    setLocalCustomSeed: (val: string) => void;
    generateRandomSeed: () => void;
    isSpinning: boolean;
    seedHistory: string[];
    onUseSeed: (seed: string) => void;
    onShowVerify: () => void;
    lastSeed: string | null;
}

const FairnessAccordion: React.FC<FairnessAccordionProps> = ({
    t, style, localCustomSeed, setLocalCustomSeed, generateRandomSeed, isSpinning, seedHistory, onUseSeed, onShowVerify, lastSeed
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [copiedText, setCopiedText] = useState<string | null>(null);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(id);
        setTimeout(() => setCopiedText(null), 2000);
    };

    return (
        <div style={{
            marginTop: 10,
            border: `1px solid ${style.primary}20`,
            borderRadius: 20, // Rounded fairness panel
            background: 'rgba(5, 5, 10, 0.4)',
            overflow: 'hidden',
            marginBottom: 6
        }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: 'none',
                    color: style.primary,
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: "'Orbitron', sans-serif"
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🛡️</span>
                    <span style={{ fontWeight: 600 }}>{t.provablyFair || "Provably Fair"}</span>
                </div>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{isOpen ? '▼' : '▶'}</span>
            </button>

            {/* Collapsible Content */}
            {isOpen && (
                <div style={{ padding: 10, borderTop: `1px solid ${style.primary}10` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 9, color: style.primary }}>🔐 {t.secretSeed}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {seedHistory.length > 0 && (
                                <button onClick={() => setShowHistory(!showHistory)}
                                    style={{ padding: '2px 6px', fontSize: 9, background: `${style.primary}20`, border: `1px solid ${style.primary}30`, borderRadius: 4, color: style.primary, cursor: 'pointer' }}>
                                    📜 {t.history} ({seedHistory.length})
                                </button>
                            )}
                            {lastSeed && (
                                <button onClick={onShowVerify}
                                    style={{ padding: '2px 6px', fontSize: 9, background: '#22c55e25', border: '1px solid #22c55e50', borderRadius: 4, color: '#22c55e', cursor: 'pointer' }}>
                                    ✓ {t.verify}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Seed input moved to main window */}

                    {/* Seed History Dropdown */}
                    {showHistory && seedHistory.length > 0 && (
                        <div className="seed-history-dropdown" style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: 6, marginBottom: 6, maxHeight: 80, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {seedHistory.map((seed, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 0', borderBottom: i < seedHistory.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                                    <span style={{ flex: 1, fontSize: 8, fontFamily: 'monospace', color: 'rgba(200,180,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {seed.slice(0, 20)}...{seed.slice(-8)}
                                    </span>
                                    <button onClick={() => onUseSeed(seed)}
                                        style={{ padding: '2px 4px', fontSize: 8, background: `${style.primary}20`, border: `1px solid ${style.primary}30`, borderRadius: 3, color: style.primary, cursor: 'pointer' }}>
                                        {t.useSeed}
                                    </button>
                                    <button onClick={() => copyToClipboard(seed, `hist-${i}`)}
                                        style={{ padding: '2px 4px', fontSize: 8, background: copiedText === `hist-${i}` ? '#22c55e20' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 3, color: copiedText === `hist-${i}` ? '#22c55e' : 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                                        {copiedText === `hist-${i}` ? '✓' : '📋'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FairnessAccordion;
