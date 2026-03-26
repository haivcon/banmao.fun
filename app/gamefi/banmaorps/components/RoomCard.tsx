/**
 * RoomCard Component
 * Displays room information in personal rooms section
 */

"use client";

import React, { useCallback, useMemo } from "react";
import type { LocaleStrings } from "../lib/i18n";
import type { RoomWithForfeit } from "../lib/types";
import { availability, formatTimeLeft, roomIsFinalized } from "../lib/game-logic";
import { formatTokenAmount } from "../lib/utils";

export interface RoomCardProps {
    room: RoomWithForfeit;
    isCreator: boolean;
    viewerAddress: string | null;
    decimals: number;
    nowTs: number;
    t: LocaleStrings;
    onSelect?: () => void;
    onAction?: (action: "commit" | "reveal" | "claim") => void;
    hasCommitInfo?: boolean;
    isSelected?: boolean;
    highlight?: "win" | "loss" | "draw" | null;
}

export default function RoomCard({
    room,
    isCreator,
    viewerAddress,
    decimals,
    nowTs,
    t,
    onSelect,
    onAction,
    hasCommitInfo,
    isSelected,
    highlight,
}: RoomCardProps) {
    const avail = useMemo(() => availability(room, nowTs), [room, nowTs]);

    const stakeLabel = useMemo(
        () => `${formatTokenAmount(room.stake ?? BigInt(0), decimals)} $BANMAO`,
        [room.stake, decimals]
    );

    const timeLabel = useMemo(() => {
        if (avail.deadline > 0 && avail.live) {
            return formatTimeLeft(avail.deadline, t, nowTs);
        }
        return null;
    }, [avail.deadline, avail.live, nowTs, t]);

    const roleLabel = isCreator ? t.creator : t.opponent;

    const statusClass = useMemo(() => {
        if (highlight === "win") return "room-card--win";
        if (highlight === "loss") return "room-card--loss";
        if (highlight === "draw") return "room-card--draw";
        if (avail.expired && !roomIsFinalized(room)) return "room-card--expired";
        if (avail.live) return "room-card--live";
        return "";
    }, [highlight, avail, room]);

    const handleClick = useCallback(() => {
        onSelect?.();
    }, [onSelect]);

    const handleAction = useCallback((action: "commit" | "reveal" | "claim") => {
        onAction?.(action);
    }, [onAction]);

    return (
        <div
            className={`room-card ${statusClass} ${isSelected ? "room-card--selected" : ""}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
        >
            <div className="room-card__header">
                <span className="room-card__id">#{room.id}</span>
                <span className="room-card__role">{roleLabel}</span>
            </div>

            <div className="room-card__body">
                <div className="room-card__stake">{stakeLabel}</div>
                <div className="room-card__status">
                    <span className={`room-card__status-label room-card__status-label--${avail.phase || "done"}`}>
                        {avail.label}
                    </span>
                    {timeLabel && <span className="room-card__countdown">{timeLabel}</span>}
                </div>
            </div>

            {!roomIsFinalized(room) && (
                <div className="room-card__actions">
                    {avail.phase === "commit" && !hasCommitInfo && (
                        <button
                            className="room-card__action-btn room-card__action-btn--commit"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAction("commit");
                            }}
                        >
                            {t.commit}
                        </button>
                    )}
                    {avail.phase === "reveal" && hasCommitInfo && (
                        <button
                            className="room-card__action-btn room-card__action-btn--reveal"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAction("reveal");
                            }}
                        >
                            {t.reveal}
                        </button>
                    )}
                    {avail.claimable && (
                        <button
                            className="room-card__action-btn room-card__action-btn--claim"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAction("claim");
                            }}
                        >
                            {t.claim}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
