'use client';
import React, { useState, useCallback, memo } from 'react';
import { useReadContract } from 'wagmi';

// Minimal ERC-20 ABI for balanceOf
const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

// Default: Banmao token on XLayer
const DEFAULT_TOKEN = '0x643643cDe01F4ef604C24e2a3638294D33b68ca4';
const DEFAULT_MIN_AMOUNT = BigInt('1000000000000000000'); // 1 token (18 decimals)

interface TokenGateProps {
    t: Record<string, string>;
    address?: string;
    tokenAddress?: `0x${string}`;
    minAmount?: bigint;
    children: React.ReactNode;
}

const TokenGate = memo(function TokenGate({
    t,
    address,
    tokenAddress = DEFAULT_TOKEN as `0x${string}`,
    minAmount = DEFAULT_MIN_AMOUNT,
    children,
}: TokenGateProps) {
    const { data: balance, isLoading } = useReadContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address as `0x${string}`] : undefined,
        query: { enabled: !!address },
    });

    const hasAccess = balance !== undefined && balance >= minAmount;

    if (!address) {
        return (
            <div className="token-gate-locked">
                <div className="token-gate-icon">🔒</div>
                <p className="token-gate-msg">{t.connectToView || 'Connect wallet to view this content'}</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="token-gate-locked">
                <div className="token-gate-icon">⏳</div>
                <p className="token-gate-msg">{t.checkingAccess || 'Checking access...'}</p>
            </div>
        );
    }

    if (!hasAccess) {
        const required = Number(minAmount) / 1e18;
        return (
            <div className="token-gate-locked">
                <div className="token-gate-icon">🔒</div>
                <h4 className="token-gate-title">{t.tokenGated || 'Token-Gated Content'}</h4>
                <p className="token-gate-msg">
                    {t.holdTokens || `Hold at least ${required.toLocaleString()} BANMAO tokens to access this content`}
                </p>
                <div className="token-gate-badge">
                    🐱 {t.banmaoRequired || 'BANMAO Required'}
                </div>
            </div>
        );
    }

    return <>{children}</>;
});

export default TokenGate;
