/**
 * HistoryLookup Component
 * Search and display historical room information
 */

"use client";

import React, { useCallback, useState } from "react";
import type { LocaleStrings } from "../lib/i18n";

// Match the type from FloatingSettings
export type HistoryLookupResultData = {
    id: number;
    creator: string;
    creatorFull: string;
    opponent: string;
    opponentFull: string;
    stakeFormatted: string;
    stateLabel: string;
    resultSummary: string;
    note?: string;
    hasOpponent: boolean;
};

export type HistoryLookupStateType =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; data: HistoryLookupResultData };

export interface HistoryLookupProps {
    t: LocaleStrings;
    onLookup: (roomId: string) => Promise<void>;
    onCopy: (text: string) => Promise<boolean>;
    state: HistoryLookupStateType;
    className?: string;
}

export default function HistoryLookup({
    t,
    onLookup,
    onCopy,
    state,
    className = "",
}: HistoryLookupProps) {
    const [inputValue, setInputValue] = useState("");

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            await onLookup(inputValue.trim());
        }
    }, [inputValue, onLookup]);

    const handleCopyResult = useCallback(async () => {
        if (state.status === "success" && state.data) {
            const text = JSON.stringify(state.data, null, 2);
            await onCopy(text);
        }
    }, [state, onCopy]);

    return (
        <div className={`history-lookup ${className}`}>
            <form onSubmit={handleSubmit} className="history-lookup__form">
                <input
                    type="text"
                    className="history-lookup__input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={t.historyLookupPlaceholder ?? "Room ID"}
                    inputMode="numeric"
                />
                <button
                    type="submit"
                    className="history-lookup__button"
                    disabled={!inputValue.trim() || state.status === "loading"}
                >
                    {state.status === "loading" ? "..." : t.historyLookupButton ?? "Search"}
                </button>
            </form>

            {state.status === "error" && (
                <div className="history-lookup__error">
                    {state.message ?? t.historyLookupError ?? "Error looking up room"}
                </div>
            )}

            {state.status === "success" && state.data && (
                <div className="history-lookup__result">
                    <div className="history-lookup__result-header">
                        <h4>#{state.data.id}</h4>
                        <button
                            type="button"
                            className="history-lookup__copy-btn"
                            onClick={handleCopyResult}
                        >
                            {t.historyLookupCopy ?? "Copy"}
                        </button>
                    </div>
                    <dl className="history-lookup__details">
                        <dt>{t.historyLookupCreatorLabel ?? t.creator}</dt>
                        <dd title={state.data.creatorFull}>{state.data.creator}</dd>

                        <dt>{t.historyLookupOpponentLabel ?? t.opponent}</dt>
                        <dd title={state.data.opponentFull}>{state.data.opponent}</dd>

                        <dt>{t.historyLookupStakeLabel ?? t.stake}</dt>
                        <dd>{state.data.stakeFormatted}</dd>

                        <dt>{t.historyLookupStateLabel ?? "State"}</dt>
                        <dd>{state.data.stateLabel}</dd>

                        <dt>{t.historyLookupResultLabel ?? "Result"}</dt>
                        <dd>{state.data.resultSummary}</dd>
                    </dl>
                    {state.data.note && (
                        <div className="history-lookup__note">{state.data.note}</div>
                    )}
                </div>
            )}
        </div>
    );
}
