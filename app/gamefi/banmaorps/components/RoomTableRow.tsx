/**
 * RoomTableRow Component
 * Renders a single row in the rooms table
 */

"use client";

import React, { useCallback } from "react";
import type { LocaleStrings } from "../lib/i18n";
import type { RoomWithForfeit } from "../lib/types";
import { ZERO_ADDR, formatTimeLeft, roomIsFinalized } from "../lib/gameUtils";
import { availability } from "../lib/roomUtils";
import {
    EnhancedRoom,
    RoomMeta,
    RoomAction,
    deriveViewerContext,
    deriveRoomAction,
    canShowForfeit,
    formatShortAddress,
} from "../lib/roomTableUtils";

export interface RoomTableRowProps {
    room: EnhancedRoom;
    meta?: RoomMeta;
    viewerAddress: string | null;
    nowTs: number;
    decimals: number;
    t: LocaleStrings;
    isConnected: boolean;
    isClient: boolean;
    onJoin: (roomId: string) => void;
    onCommit: (roomId: string) => void;
    onReveal: (roomId: string) => void;
    onClaim: (roomId: string) => void;
    onForfeit: (roomId: string) => void;
    onCopyAddress: (address: string) => Promise<void>;
    onSetRoomId: (roomId: string) => void;
}

export default function RoomTableRow({
    room,
    meta,
    viewerAddress,
    nowTs,
    decimals,
    t,
    isConnected,
    isClient,
    onJoin,
    onCommit,
    onReveal,
    onClaim,
    onForfeit,
    onCopyAddress,
    onSetRoomId,
}: RoomTableRowProps) {
    const viewRoom = meta?.view ?? room;
    const avail = meta?.availability ?? availability(viewRoom, nowTs);
    const ctx = deriveViewerContext(viewRoom, viewerAddress);
    const isMyRoom = ctx.isCreator || ctx.isOpponent;
    const isFinalized = roomIsFinalized(viewRoom);

    // Derive primary action
    const primaryAction = deriveRoomAction(viewRoom, avail, ctx, t, nowTs, isConnected, isClient);

    // Check if forfeit should be shown
    const showForfeit = canShowForfeit(viewRoom, ctx);

    // Time cell
    const showTimer = avail.deadline > 0 &&
        (viewRoom.state === 1 || viewRoom.state === 2 || (viewRoom.state === 0 && viewRoom.opponent === ZERO_ADDR));

    // Handle action button clicks
    const handleButtonAction = useCallback((actionType: string) => {
        const target = viewRoom.id.toString();
        onSetRoomId(target);

        switch (actionType) {
            case "join": onJoin(target); break;
            case "commit": onCommit(target); break;
            case "reveal": onReveal(target); break;
            case "claim": onClaim(target); break;
            case "forfeit": onForfeit(target); break;
        }
    }, [viewRoom.id, onSetRoomId, onJoin, onCommit, onReveal, onClaim, onForfeit]);

    // Render action element
    const renderAction = (action: RoomAction): React.ReactNode => {
        if (action.type === "badge") {
            return <span className={action.className}>{action.label}</span>;
        }
        if (action.type === "button") {
            return (
                <button
                    className="table-action-button"
                    onClick={() => handleButtonAction(action.action)}
                    disabled={action.disabled}
                >
                    {action.label}
                </button>
            );
        }
        if (action.type === "text") {
            return <span>{action.content}</span>;
        }
        if (action.type === "group") {
            return (
                <div className="table-action-group">
                    {renderAction(action.primary)}
                    {renderAction(action.secondary)}
                </div>
            );
        }
        return null;
    };

    // Build final action element with optional forfeit
    let actionElement = renderAction(primaryAction);

    if (showForfeit && primaryAction.type !== "group") {
        const forfeitButton = (
            <button
                className="table-action-button danger"
                onClick={() => {
                    const target = viewRoom.id.toString();
                    onSetRoomId(target);
                    onForfeit(target);
                }}
            >
                {t.forfeit}
            </button>
        );

        // Check if primary action is just a dash placeholder
        const isDashPlaceholder = primaryAction.type === "text" && primaryAction.content.trim() === "—";

        if (isDashPlaceholder) {
            actionElement = forfeitButton;
        } else {
            actionElement = (
                <div className="table-action-group">
                    {actionElement}
                    {forfeitButton}
                </div>
            );
        }
    }

    return (
        <tr className={isMyRoom ? "my-room" : ""}>
            {/* Room ID */}
            <td>{viewRoom.id}</td>

            {/* Creator */}
            <td className="address-cell">
                <span>{formatShortAddress(viewRoom.creator)}</span>
                <button
                    className="copy-btn"
                    onClick={() => onCopyAddress(viewRoom.creator)}
                >
                    {t.copyAddress}
                </button>
            </td>

            {/* Opponent */}
            <td className="address-cell">
                {viewRoom.opponent === ZERO_ADDR ? (
                    "-"
                ) : (
                    <>
                        <span>{formatShortAddress(viewRoom.opponent)}</span>
                        <button
                            className="copy-btn"
                            onClick={() => onCopyAddress(viewRoom.opponent)}
                        >
                            {t.copyAddress}
                        </button>
                    </>
                )}
            </td>

            {/* Stake */}
            <td>${Number(viewRoom.stake) / 10 ** decimals}</td>

            {/* Time */}
            <td className="time-col">
                {showTimer ? (
                    <span>{formatTimeLeft(avail.deadline, { timeout: t.timeout }, nowTs)}</span>
                ) : (
                    <span>-</span>
                )}
            </td>

            {/* State badges */}
            <td className="state-col">
                <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                    {viewRoom.state === 0 && avail.expired && <span className="badge lose">{t.expired}</span>}
                    {avail.label === "Joinable" && avail.live && <span className="badge primary">{t.joinable}</span>}
                    {avail.live && (viewRoom.state === 1 || viewRoom.state === 2) && <span className="badge warning">{t.live}</span>}
                    {isFinalized && <span className="badge win">{t.finished}</span>}
                    {!isFinalized && viewRoom.state === 4 && <span className="badge lose">{t.canceled}</span>}
                </div>
            </td>

            {/* Actions */}
            <td className="action-col">{actionElement}</td>
        </tr>
    );
}
