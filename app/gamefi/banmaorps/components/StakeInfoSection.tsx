/**
 * StakeInfoSection Component
 * Collapsible section displaying user info table with balance and stats
 */

"use client";

import React from "react";
import { FaSyncAlt, FaEye, FaEyeSlash } from "react-icons/fa";
import InfoTable from "./InfoTable";
import type { LocaleStrings } from "../lib/i18n";

export interface StakeInfoSectionProps {
    isCollapsed: boolean;
    isConnected: boolean;
    isRefreshing: boolean;
    refreshLabel: string;
    infoBalance: bigint | undefined;
    decimals: number;
    infoStats: any;
    t: LocaleStrings;
    onToggle: () => void;
    onRefresh: () => void;
}

export default function StakeInfoSection({
    isCollapsed,
    isConnected,
    isRefreshing,
    refreshLabel,
    infoBalance,
    decimals,
    infoStats,
    t,
    onToggle,
    onRefresh,
}: StakeInfoSectionProps) {
    return (
        <section
            className={`join-room-section stake-section${isCollapsed ? " stake-section--collapsed" : ""}`}
        >
            <div className="stake-section__header">
                <div className="stake-section__title-row">
                    <h3 className="glowing-title stake-section__title">{t.infoTitle}</h3>
                    <div className="stake-section__title-actions">
                        <button
                            type="button"
                            className={`icon-refresh-button${isRefreshing ? " icon-refresh-button--spinning" : ""}`}
                            onClick={onRefresh}
                            title={refreshLabel}
                            aria-label={refreshLabel}
                            disabled={isRefreshing}
                        >
                            <FaSyncAlt className="icon-refresh-button__icon" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            className="stake-section__toggle"
                            onClick={onToggle}
                            aria-expanded={!isCollapsed}
                            aria-controls="stake-section-content"
                            title={isCollapsed ? "Show" : "Hide"}
                            aria-label={isCollapsed ? "Show" : "Hide"}
                            disabled={!isConnected}
                        >
                            {isCollapsed ? (
                                <FaEyeSlash className="stake-section__toggle-icon" aria-hidden="true" />
                            ) : (
                                <FaEye className="stake-section__toggle-icon" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
            <div className="stake-section__content" id="stake-section-content">
                {!isConnected ? (
                    <p className="stake-section__message">{t.stakeConnectPrompt}</p>
                ) : !isCollapsed ? (
                    <div className="stake-section__info-stack">
                        <InfoTable
                            balance={infoBalance}
                            decimals={decimals}
                            stats={infoStats}
                            strings={t}
                        />
                    </div>
                ) : null}
            </div>
        </section>
    );
}
