"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { ClaimRecord } from '../hooks/useClaimHistory';
import { STAKING_CONTRACT_ADDRESS } from '../contracts';

interface ClaimHistoryPanelProps {
    claimHistory: ClaimRecord[];
    isLoading: boolean;
    hasError?: boolean;
    t: (key: string) => string;
}

const EXPLORER_BASE = 'https://web3.okx.com/explorer/x-layer';
const MAX_VISIBLE_ITEMS = 50;
const ITEM_HEIGHT = 72;

// Truncate hash for display
const truncateHash = (hash: string): string => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
};

// Copyable Keyword component with hover/click effects
interface CopyableKeywordProps {
    keyword: string;
    t: (key: string) => string;
}

function CopyableKeyword({ keyword, t }: CopyableKeywordProps) {
    const [copied, setCopied] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(keyword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for mobile
            const textArea = document.createElement('textarea');
            textArea.value = keyword;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <button
            onClick={handleCopy}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onTouchStart={() => setIsPressed(true)}
            onTouchEnd={() => setIsPressed(false)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: copied
                    ? 'linear-gradient(135deg, rgba(74, 222, 128, 0.3), rgba(34, 197, 94, 0.3))'
                    : isPressed
                        ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.4), rgba(96, 165, 250, 0.4))'
                        : isHovered
                            ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(96, 165, 250, 0.25))'
                            : 'rgba(100, 150, 220, 0.15)',
                border: copied
                    ? '1px solid rgba(74, 222, 128, 0.6)'
                    : '1px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '9999px',
                color: copied ? '#4ade80' : '#a78bfa',
                fontSize: '12px',
                fontFamily: "'Space Mono', monospace",
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: isPressed ? 'scale(0.95)' : isHovered ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isHovered && !copied
                    ? '0 0 15px rgba(168, 85, 247, 0.3)'
                    : copied
                        ? '0 0 15px rgba(74, 222, 128, 0.4)'
                        : 'none',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
            }}
        >
            <span style={{
                fontSize: '14px',
                transition: 'transform 0.2s',
                transform: copied ? 'scale(1.2)' : 'scale(1)',
            }}>
                {copied ? '✅' : '📋'}
            </span>
            <code style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '2px 6px',
                borderRadius: '4px',
                color: copied ? '#4ade80' : '#f0abfc',
            }}>
                {keyword}
            </code>
            <span style={{
                fontSize: '10px',
                opacity: 0.8,
                color: copied ? '#4ade80' : '#94a3b8',
            }}>
                {copied ? '✓ Copied!' : 'Copy'}
            </span>
        </button>
    );
}

// Explorer Button component with hover/click effects
interface ExplorerButtonProps {
    href: string;
    t: (key: string) => string;
}

function ExplorerButton({ href, t }: ExplorerButtonProps) {
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPressed, setIsPressed] = React.useState(false);

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onTouchStart={() => setIsPressed(true)}
            onTouchEnd={() => setIsPressed(false)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: isPressed
                    ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.4), rgba(168, 85, 247, 0.4))'
                    : isHovered
                        ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.3), rgba(168, 85, 247, 0.3))'
                        : 'linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(168, 85, 247, 0.2))',
                border: '1px solid rgba(96, 165, 250, 0.5)',
                borderRadius: '9999px',
                color: '#60a5fa',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isPressed ? 'scale(0.97)' : isHovered ? 'scale(1.03) translateY(-1px)' : 'scale(1)',
                boxShadow: isHovered
                    ? '0 4px 20px rgba(96, 165, 250, 0.4), 0 0 20px rgba(168, 85, 247, 0.3)'
                    : 'none',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
            }}
        >
            <span style={{
                fontSize: '16px',
                transition: 'transform 0.2s',
                transform: isHovered ? 'rotate(15deg) scale(1.1)' : 'rotate(0deg)',
            }}>
                🌐
            </span>
            {t('claimHistorySearchExplorer')}
        </a>
    );
}

// ClaimItem component with hover & click effects
interface ClaimItemProps {
    record: ClaimRecord;
    t: (key: string) => string;
    formatTimeAgo: (timestamp: number) => string;
}

function ClaimItem({ record, t, formatTimeAgo }: ClaimItemProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [txBtnHovered, setTxBtnHovered] = useState(false);
    const [txBtnPressed, setTxBtnPressed] = useState(false);

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderBottom: '1px solid rgba(100, 150, 220, 0.1)',
                background: isPressed
                    ? 'linear-gradient(135deg, rgba(100, 150, 220, 0.2), rgba(168, 85, 247, 0.15))'
                    : isHovered
                        ? 'linear-gradient(135deg, rgba(100, 150, 220, 0.1), rgba(168, 85, 247, 0.08))'
                        : 'transparent',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isPressed ? 'scale(0.99)' : isHovered ? 'translateX(4px)' : 'translateX(0)',
                cursor: 'pointer',
                gap: '8px',
                borderLeft: isHovered ? '3px solid rgba(168, 85, 247, 0.6)' : '3px solid transparent',
            }}
        >
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px',
                }}>
                    <span style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#4ade80',
                        textShadow: isHovered ? '0 0 12px rgba(74, 222, 128, 0.6)' : 'none',
                        transition: 'all 0.25s',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                        transformOrigin: 'left',
                    }}>
                        +{parseFloat(record.amount).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4
                        })} $BANMAO
                    </span>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    color: '#94a3b8',
                }}>
                    <a
                        href={`${EXPLORER_BASE}/address/${record.user}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            color: isHovered ? '#c4b5fd' : '#a78bfa',
                            textDecoration: 'none',
                            transition: 'all 0.2s',
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#e9d5ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = isHovered ? '#c4b5fd' : '#a78bfa')}
                    >
                        👤 {truncateHash(record.user)}
                    </a>
                    <span>•</span>
                    <span>{formatTimeAgo(record.timestamp)}</span>
                </div>
            </div>
            <a
                href={`${EXPLORER_BASE}/tx/${record.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setTxBtnHovered(true)}
                onMouseLeave={() => { setTxBtnHovered(false); setTxBtnPressed(false); }}
                onMouseDown={() => setTxBtnPressed(true)}
                onMouseUp={() => setTxBtnPressed(false)}
                style={{
                    fontSize: '11px',
                    color: '#60a5fa',
                    textDecoration: 'none',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    background: txBtnPressed
                        ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.4), rgba(168, 85, 247, 0.3))'
                        : txBtnHovered
                            ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.25), rgba(168, 85, 247, 0.2))'
                            : 'rgba(96, 165, 250, 0.1)',
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0,
                    boxShadow: txBtnHovered ? '0 0 15px rgba(96, 165, 250, 0.4)' : 'none',
                    transform: txBtnPressed ? 'scale(0.95)' : txBtnHovered ? 'scale(1.05)' : 'scale(1)',
                }}
            >
                🔗 TX
            </a>
        </div>
    );
}

export function ClaimHistoryPanel({ claimHistory, isLoading, hasError, t }: ClaimHistoryPanelProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [headerHovered, setHeaderHovered] = useState(false);

    // Format timestamp with i18n
    const formatTimeAgo = useCallback((timestamp: number): string => {
        const now = Date.now() / 1000;
        const diff = now - timestamp;

        if (diff < 60) return t('claimHistoryJustNow');
        if (diff < 3600) {
            const mins = Math.floor(diff / 60);
            return t('claimHistoryMinutesAgo').replace('{n}', String(mins));
        }
        if (diff < 86400) {
            const hours = Math.floor(diff / 3600);
            return t('claimHistoryHoursAgo').replace('{n}', String(hours));
        }
        if (diff < 604800) {
            const days = Math.floor(diff / 86400);
            return t('claimHistoryDaysAgo').replace('{n}', String(days));
        }
        return new Date(timestamp * 1000).toLocaleDateString();
    }, [t]);

    // Virtual scrolling for large lists
    const visibleItems = useMemo(() => {
        return claimHistory.slice(0, MAX_VISIBLE_ITEMS);
    }, [claimHistory]);

    // Explorer search URL with claimReward filter
    const explorerSearchUrl = `${EXPLORER_BASE}/address/${STAKING_CONTRACT_ADDRESS}?module=transactions&method=claimReward`;

    return (
        <div
            style={{
                width: 'calc(100% - 24px)',
                maxWidth: '800px',
                margin: '24px auto 40px',
                marginLeft: 'auto',
                marginRight: 'auto',
                padding: '0',
                background: 'rgba(10, 10, 30, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(100, 150, 220, 0.3)',
                borderRadius: '22px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div
                onMouseEnter={() => setHeaderHovered(true)}
                onMouseLeave={() => setHeaderHovered(false)}
                style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(100, 150, 220, 0.2)',
                    background: headerHovered
                        ? 'linear-gradient(135deg, rgba(100, 150, 220, 0.15), rgba(168, 85, 247, 0.15))'
                        : 'linear-gradient(135deg, rgba(100, 150, 220, 0.1), rgba(168, 85, 247, 0.1))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                }}
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div>
                    <h3 style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#fff',
                        marginBottom: '4px',
                    }}>
                        💰 {t('claimHistoryTitle')}
                    </h3>
                    <div style={{
                        fontSize: '10px',
                        color: '#94a3b8',
                        wordBreak: 'break-all',
                        lineHeight: 1.4,
                    }}>
                        <a
                            href={`${EXPLORER_BASE}/address/${STAKING_CONTRACT_ADDRESS}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: '#60a5fa',
                                textDecoration: 'none',
                                transition: 'color 0.2s',
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#93c5fd')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#60a5fa')}
                        >
                            {t('claimHistoryContract')}: {STAKING_CONTRACT_ADDRESS}
                        </a>
                    </div>
                </div>
                <div style={{
                    fontSize: '20px',
                    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s',
                    color: headerHovered ? '#fff' : '#94a3b8',
                }}>
                    ▼
                </div>
            </div>

            {/* Content */}
            {!isCollapsed && (
                <div style={{ padding: '12px 0' }}>
                    {isLoading ? (
                        <div style={{ padding: '8px 0' }}>
                            {/* Skeleton Loading UI */}
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 12px',
                                        borderBottom: '1px solid rgba(100, 150, 220, 0.1)',
                                        gap: '8px',
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        {/* Amount skeleton */}
                                        <div
                                            style={{
                                                height: '16px',
                                                width: '140px',
                                                background: 'linear-gradient(90deg, rgba(100, 150, 220, 0.1) 25%, rgba(100, 150, 220, 0.2) 50%, rgba(100, 150, 220, 0.1) 75%)',
                                                backgroundSize: '200% 100%',
                                                borderRadius: '8px',
                                                marginBottom: '8px',
                                                animation: 'skeleton-shimmer 1.5s infinite',
                                            }}
                                        />
                                        {/* Address & time skeleton */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <div
                                                style={{
                                                    height: '12px',
                                                    width: '100px',
                                                    background: 'linear-gradient(90deg, rgba(100, 150, 220, 0.08) 25%, rgba(100, 150, 220, 0.15) 50%, rgba(100, 150, 220, 0.08) 75%)',
                                                    backgroundSize: '200% 100%',
                                                    borderRadius: '6px',
                                                    animation: 'skeleton-shimmer 1.5s infinite',
                                                    animationDelay: `${i * 100}ms`,
                                                }}
                                            />
                                            <div
                                                style={{
                                                    height: '12px',
                                                    width: '60px',
                                                    background: 'linear-gradient(90deg, rgba(100, 150, 220, 0.08) 25%, rgba(100, 150, 220, 0.15) 50%, rgba(100, 150, 220, 0.08) 75%)',
                                                    backgroundSize: '200% 100%',
                                                    borderRadius: '6px',
                                                    animation: 'skeleton-shimmer 1.5s infinite',
                                                    animationDelay: `${i * 150}ms`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {/* TX button skeleton */}
                                    <div
                                        style={{
                                            height: '28px',
                                            width: '50px',
                                            background: 'linear-gradient(90deg, rgba(100, 150, 220, 0.1) 25%, rgba(100, 150, 220, 0.2) 50%, rgba(100, 150, 220, 0.1) 75%)',
                                            backgroundSize: '200% 100%',
                                            borderRadius: '14px',
                                            animation: 'skeleton-shimmer 1.5s infinite',
                                            animationDelay: `${i * 200}ms`,
                                        }}
                                    />
                                </div>
                            ))}
                            <div style={{
                                textAlign: 'center',
                                padding: '12px',
                                color: '#64748b',
                                fontSize: '12px',
                            }}>
                                {t('loadingData')}
                            </div>
                            <style>{`
                                @keyframes skeleton-shimmer {
                                    0% { background-position: 200% 0; }
                                    100% { background-position: -200% 0; }
                                }
                            `}</style>
                        </div>
                    ) : hasError ? (
                        <div style={{
                            padding: '24px 16px',
                            color: '#94a3b8',
                        }}>
                            {/* Error message */}
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '20px',
                                padding: '16px',
                                background: 'rgba(248, 113, 113, 0.1)',
                                border: '1px solid rgba(248, 113, 113, 0.3)',
                                borderRadius: '12px',
                            }}>
                                <span style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}>⚠️</span>
                                <span style={{ color: '#f87171', fontWeight: 600 }}>
                                    {t('claimHistoryLoadError')}
                                </span>
                            </div>

                            {/* Explorer Guide Box */}
                            <div style={{
                                padding: '16px',
                                background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(168, 85, 247, 0.08))',
                                border: '1px solid rgba(100, 150, 220, 0.25)',
                                borderRadius: '16px',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    marginBottom: '14px',
                                }}>
                                    <span style={{ fontSize: '20px' }}>🔎</span>
                                    <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6 }}>
                                        {t('claimHistoryExplorerGuide')}
                                    </div>
                                </div>

                                {/* Copyable keyword */}
                                <div style={{
                                    marginBottom: '14px',
                                    padding: '12px',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    borderRadius: '12px',
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#94a3b8',
                                        marginBottom: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        💡 {t('claimHistorySearchTip')}
                                    </div>
                                    <CopyableKeyword keyword="claimReward" t={t} />
                                </div>

                                {/* Explorer button */}
                                <ExplorerButton href={explorerSearchUrl} t={t} />
                            </div>
                        </div>
                    ) : claimHistory.length === 0 ? (
                        <div style={{
                            padding: '24px 16px',
                            color: '#94a3b8',
                        }}>
                            {/* No records message */}
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '20px',
                                padding: '20px',
                                background: 'rgba(100, 150, 220, 0.05)',
                                borderRadius: '16px',
                            }}>
                                <span style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}>📭</span>
                                <span style={{ fontSize: '14px', color: '#e2e8f0' }}>
                                    {t('claimHistoryNoRecords')}
                                </span>
                            </div>

                            {/* Explorer Guide Box */}
                            <div style={{
                                padding: '16px',
                                background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(168, 85, 247, 0.08))',
                                border: '1px solid rgba(100, 150, 220, 0.25)',
                                borderRadius: '16px',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    marginBottom: '14px',
                                }}>
                                    <span style={{ fontSize: '20px' }}>🔎</span>
                                    <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6 }}>
                                        {t('claimHistoryExplorerGuide')}
                                    </div>
                                </div>

                                {/* Copyable keyword */}
                                <div style={{
                                    marginBottom: '14px',
                                    padding: '12px',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    borderRadius: '12px',
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#94a3b8',
                                        marginBottom: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        💡 {t('claimHistorySearchTip')}
                                    </div>
                                    <CopyableKeyword keyword="claimReward" t={t} />
                                </div>

                                {/* Explorer button */}
                                <ExplorerButton href={explorerSearchUrl} t={t} />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header row */}
                            <div style={{
                                display: 'flex',
                                padding: '8px 16px',
                                fontSize: '11px',
                                color: '#94a3b8',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontWeight: 600,
                                borderBottom: '1px solid rgba(100, 150, 220, 0.2)',
                            }}>
                                <div style={{ flex: 1 }}>{t('claimHistoryAmount')} & {t('claimHistoryTime')}</div>
                                <div>{t('claimHistoryViewTx')}</div>
                            </div>

                            {/* Virtual scrollable list */}
                            <div style={{
                                maxHeight: `${Math.min(visibleItems.length, 5) * ITEM_HEIGHT}px`,
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                scrollBehavior: 'smooth',
                            }}>
                                {visibleItems.map((record) => (
                                    <ClaimItem
                                        key={record.transactionHash}
                                        record={record}
                                        t={t}
                                        formatTimeAgo={formatTimeAgo}
                                    />
                                ))}
                            </div>

                            {/* Footer */}
                            {claimHistory.length > 0 && (
                                <div style={{
                                    padding: '12px 16px',
                                    fontSize: '11px',
                                    color: '#64748b',
                                    textAlign: 'center',
                                    borderTop: '1px solid rgba(100, 150, 220, 0.1)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '16px',
                                    flexWrap: 'wrap',
                                }}>
                                    <span>
                                        {t('claimHistoryShowingRecords').replace('{count}', String(visibleItems.length))}
                                    </span>
                                    <a
                                        href={explorerSearchUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: '#60a5fa',
                                            textDecoration: 'none',
                                            padding: '4px 12px',
                                            borderRadius: '9999px',
                                            background: 'rgba(96, 165, 250, 0.1)',
                                            border: '1px solid rgba(96, 165, 250, 0.2)',
                                            fontSize: '10px',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(96, 165, 250, 0.2)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(96, 165, 250, 0.1)';
                                        }}
                                    >
                                        🔍 {t('claimHistorySearchExplorer')}
                                    </a>
                                </div>
                            )}

                            <div style={{
                                margin: '12px 12px 16px',
                                padding: '14px 16px',
                                background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(168, 85, 247, 0.08))',
                                border: '1px solid rgba(100, 150, 220, 0.2)',
                                borderRadius: '22px',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    marginBottom: '10px',
                                }}>
                                    <span style={{ fontSize: '16px' }}>🔎</span>
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#94a3b8',
                                        lineHeight: 1.5,
                                    }}>
                                        {t('claimHistoryExplorerGuide')}
                                    </div>
                                </div>

                                {/* Copyable keyword */}
                                <div style={{
                                    marginBottom: '12px',
                                    padding: '10px 12px',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    borderRadius: '12px',
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: '#94a3b8',
                                        marginBottom: '8px',
                                    }}>
                                        💡 {t('claimHistorySearchTip')}
                                    </div>
                                    <CopyableKeyword keyword="claimReward" t={t} />
                                </div>

                                {/* Explorer button */}
                                <ExplorerButton href={explorerSearchUrl} t={t} />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
