/**
 * GameActionsPanel Component
 * Displays RPS choice cards and game action buttons (commit, reveal, claim, forfeit)
 */

"use client";

import React from "react";
import type { Choice } from "../lib/types";
import type { LocaleStrings } from "../lib/i18n";
import ChoiceCard from "./ChoiceCard";

export interface ChoiceOption {
    k: Choice;
    label: string;
    img: string;
}

export interface GameActionsPanelProps {
    choices: ChoiceOption[];
    selectedChoice: Choice;
    roomId: string;
    activeCommitInfo: any | null;
    isConnected: boolean;
    isClient: boolean;
    t: LocaleStrings;
    onSelectChoice: (choice: Choice) => void;
    onCommit: () => void;
    onReveal: () => void;
    onClaim: () => void;
    onForfeit: () => void;
}

export default function GameActionsPanel({
    choices,
    selectedChoice,
    roomId,
    activeCommitInfo,
    isConnected,
    isClient,
    t,
    onSelectChoice,
    onCommit,
    onReveal,
    onClaim,
    onForfeit,
}: GameActionsPanelProps) {
    return (
        <section className="rps-wrap" style={{ marginTop: 24 }}>
            <h3 className="glowing-title">{t.rpsTitle}</h3>

            <div className="rps-grid">
                {choices.map((c) => (
                    <ChoiceCard
                        key={c.k}
                        label={c.label}
                        src={c.img}
                        selected={selectedChoice === c.k}
                        onClick={() => onSelectChoice(c.k)}
                    />
                ))}
            </div>

            <div id="actions-panel" className="actions-row" style={{ marginTop: 12 }}>
                <button onClick={onCommit} disabled={!isConnected || !roomId || !isClient}>
                    {t.commit}
                </button>
                <button
                    onClick={onReveal}
                    disabled={!isConnected || !roomId || !activeCommitInfo || !isClient}
                >
                    {t.reveal}
                </button>
                <button onClick={onClaim} disabled={!isConnected || !roomId || !isClient}>
                    {t.claim}
                </button>
                <button
                    className="btn-forfeit"
                    onClick={onForfeit}
                    disabled={!isConnected || !roomId || !isClient}
                >
                    {t.forfeit}
                </button>
            </div>
        </section>
    );
}
