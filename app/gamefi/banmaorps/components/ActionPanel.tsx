/**
 * ActionPanel Component
 * Main action buttons for commit, reveal, claim, forfeit
 */

"use client";

import React from "react";
import type { LocaleStrings } from "../lib/i18n";

export interface ActionPanelProps {
    isConnected: boolean;
    isClient: boolean;
    roomId: string;
    hasCommitInfo: boolean;
    onCommit: () => void;
    onReveal: () => void;
    onClaim: () => void;
    onForfeit: () => void;
    t: LocaleStrings;
    className?: string;
}

export default function ActionPanel({
    isConnected,
    isClient,
    roomId,
    hasCommitInfo,
    onCommit,
    onReveal,
    onClaim,
    onForfeit,
    t,
    className = "",
}: ActionPanelProps) {
    const isDisabled = !isConnected || !roomId || !isClient;

    return (
        <div id="actions-panel" className={`actions-row ${className}`}>
            <button onClick={onCommit} disabled={isDisabled}>
                {t.commit}
            </button>
            <button onClick={onReveal} disabled={!isConnected || !roomId || !hasCommitInfo || !isClient}>
                {t.reveal}
            </button>
            <button onClick={onClaim} disabled={isDisabled}>
                {t.claim}
            </button>
            <button className="btn-forfeit" onClick={onForfeit} disabled={isDisabled}>
                {t.forfeit}
            </button>
        </div>
    );
}
