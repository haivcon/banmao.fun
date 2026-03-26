'use client';

import React, { useState } from 'react';

interface CopyableKeywordProps {
    keyword: string;
    t?: (key: string) => string;
}

export function CopyableKeyword({ keyword, t }: CopyableKeywordProps) {
    const [copied, setCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const handleCopy = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(keyword);
            } else {
                // Fallback for mobile
                const textArea = document.createElement('textarea');
                textArea.value = keyword;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
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
                padding: '6px 14px',
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
            <span style={{ fontSize: '14px', transition: 'transform 0.2s' }}>
                {copied ? '✅' : '📋'}
            </span>
            <code style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '2px 8px',
                borderRadius: '6px',
                color: copied ? '#4ade80' : '#f0abfc',
            }}>
                {keyword}
            </code>
            <span style={{
                fontSize: '10px',
                color: copied ? '#4ade80' : '#94a3b8',
                opacity: 0.8,
            }}>
                {copied ? '✓ Copied!' : 'Copy'}
            </span>
        </button>
    );
}

interface ExplorerButtonProps {
    href: string;
    t?: (key: string) => string;
    label?: string;
}

export function ExplorerButton({ href, t, label }: ExplorerButtonProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const buttonLabel = label || (t ? t('searchOnExplorer') : 'Search on Explorer');

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
                gap: '6px',
                padding: '8px 18px',
                background: isPressed
                    ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.4), rgba(168, 85, 247, 0.4))'
                    : isHovered
                        ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.3), rgba(168, 85, 247, 0.3))'
                        : 'linear-gradient(135deg, rgba(96, 165, 250, 0.2), rgba(168, 85, 247, 0.2))',
                border: '1px solid rgba(96, 165, 250, 0.5)',
                borderRadius: '9999px',
                color: '#60a5fa',
                textDecoration: 'none',
                fontSize: '12px',
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
                fontSize: '14px',
                transition: 'transform 0.2s',
                transform: isHovered ? 'rotate(15deg) scale(1.1)' : 'rotate(0deg)',
            }}>
                🌐
            </span>
            {buttonLabel}
        </a>
    );
}
