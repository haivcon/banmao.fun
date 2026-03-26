/**
 * Room Table Utility Functions
 * Pure functions for determining room table row state, actions, and display
 */

import type { LocaleStrings } from "./i18n";
import type { RoomWithForfeit, FinalOutcome, FinalOutcomeVia } from "./types";
import {
    STATE, ZERO_ADDR, ZERO_COMMIT, formatTimeLeft,
    roomIsFinalized, deriveFinalOutcome, resolveForfeitOutcome,
    determineForfeitViewerResult
} from "./gameUtils";
import { availability, type RoomAvailability } from "./roomUtils";

/**
 * Enhanced room type with guaranteed deadlines
 */
export interface EnhancedRoom extends RoomWithForfeit {
    commitDeadline: number;
    revealDeadline: number;
}

/**
 * Room metadata computed for rendering
 */
export interface RoomMeta {
    view: EnhancedRoom;
    availability: RoomAvailability;
}

/**
 * Viewer context for a room
 */
export interface RoomViewerContext {
    viewerAddress: string | null;
    isCreator: boolean;
    isOpponent: boolean;
    isParticipant: boolean;
    viewerCommitted: boolean;
    viewerRevealed: boolean;
    opponentCommitted: boolean;
    opponentRevealed: boolean;
}

/**
 * Determine viewer context for a room
 */
export function deriveViewerContext(
    room: EnhancedRoom,
    viewerAddress: string | null
): RoomViewerContext {
    const lower = viewerAddress?.toLowerCase() ?? "";
    const isCreator = room.creator?.toLowerCase?.() === lower && lower !== "";
    const isOpponent = room.opponent?.toLowerCase?.() === lower && lower !== "";
    const isParticipant = isCreator || isOpponent;

    const creatorCommitted = !!room.commitA && room.commitA !== ZERO_COMMIT;
    const opponentCommitted = !!room.commitB && room.commitB !== ZERO_COMMIT;
    const creatorRevealed = Number(room.revealA) > 0;
    const opponentRevealed = Number(room.revealB) > 0;

    const viewerCommitted = isCreator ? creatorCommitted : isOpponent ? opponentCommitted : false;
    const viewerRevealed = isCreator ? creatorRevealed : isOpponent ? opponentRevealed : false;
    const opponentHasCommitted = isCreator ? opponentCommitted : isOpponent ? creatorCommitted : false;
    const opponentHasRevealed = isCreator ? opponentRevealed : isOpponent ? creatorRevealed : false;

    return {
        viewerAddress,
        isCreator,
        isOpponent,
        isParticipant,
        viewerCommitted,
        viewerRevealed,
        opponentCommitted: opponentHasCommitted,
        opponentRevealed: opponentHasRevealed,
    };
}

/**
 * Action type for room table row
 */
export type RoomAction =
    | { type: "badge"; className: string; label: string }
    | { type: "button"; action: "join" | "commit" | "reveal" | "claim" | "forfeit"; label: string; disabled?: boolean }
    | { type: "text"; content: string }
    | { type: "group"; primary: RoomAction; secondary: RoomAction };

/**
 * Derive the action element for a room table row
 */
export function deriveRoomAction(
    room: EnhancedRoom,
    avail: RoomAvailability,
    ctx: RoomViewerContext,
    t: LocaleStrings,
    nowTs: number,
    isConnected: boolean,
    isClient: boolean
): RoomAction {
    const isFinalized = roomIsFinalized(room);
    const finalOutcome = isFinalized ? deriveFinalOutcome(room) : null;

    // Finalized room states
    if (isFinalized && finalOutcome) {
        return deriveFinalizedAction(room, finalOutcome, ctx, t);
    }

    // State 0: Open room (waiting for opponent)
    if (room.state === 0 && room.opponent === ZERO_ADDR) {
        return deriveOpenRoomAction(room, avail, ctx, t, isConnected, isClient);
    }

    // State 1: Committing phase
    if (room.state === 1) {
        return deriveCommittingAction(room, avail, ctx, t, nowTs, isConnected, isClient);
    }

    // State 2: Revealing phase
    if (room.state === 2) {
        return deriveRevealingAction(room, avail, ctx, t, nowTs, isConnected, isClient);
    }

    // State 4: Canceled
    if (room.state === 4) {
        return { type: "badge", className: "badge lose", label: t.canceled };
    }

    // Default
    return { type: "badge", className: "badge", label: STATE[room.state] || String(room.state) };
}

function deriveFinalizedAction(
    room: EnhancedRoom,
    outcome: FinalOutcome,
    ctx: RoomViewerContext,
    t: LocaleStrings
): RoomAction {
    let viewerWon = (outcome.winner === "creator" && ctx.isCreator) ||
        (outcome.winner === "opponent" && ctx.isOpponent);
    let viewerLost = (outcome.winner === "creator" && ctx.isOpponent) ||
        (outcome.winner === "opponent" && ctx.isCreator);

    const neutralLabel = (reason: string, drawLabel: string) => {
        if (outcome.winner === "draw" || outcome.winner === null) {
            return { className: "badge draw", label: drawLabel };
        }
        const winnerLabel = outcome.winner === "creator" ? t.creator : t.opponent;
        return { className: "badge win", label: `${winnerLabel} · ${reason}` };
    };

    if (outcome.via === "normal") {
        if (outcome.winner === "creator" || outcome.winner === "opponent") {
            if (viewerWon) return { type: "badge", className: "badge win", label: t.win };
            if (viewerLost) return { type: "badge", className: "badge lose", label: t.lose };
            const winnerLabel = outcome.winner === "creator" ? t.creator : t.opponent;
            return { type: "badge", className: "badge win", label: `${winnerLabel} ${t.win}` };
        }
        return { type: "badge", className: "badge draw", label: t.draw };
    }

    if (outcome.via === "commit-timeout") {
        if (viewerWon) return { type: "badge", className: "badge win", label: t.tableWinTimeoutCommit };
        if (viewerLost) return { type: "badge", className: "badge lose", label: t.tableLoseTimeoutCommit };
        const n = neutralLabel(t.tableReasonMissedCommit, t.tableDrawTimeoutCommit);
        return { type: "badge", ...n };
    }

    if (outcome.via === "reveal-timeout") {
        if (viewerWon) return { type: "badge", className: "badge win", label: t.tableWinTimeoutReveal };
        if (viewerLost) return { type: "badge", className: "badge lose", label: t.tableLoseTimeoutReveal };
        const n = neutralLabel(t.tableReasonMissedReveal, t.tableDrawTimeoutReveal);
        return { type: "badge", ...n };
    }

    if (outcome.via === "forfeit") {
        const perspective = determineForfeitViewerResult(resolveForfeitOutcome(room), {
            viewerAddress: ctx.viewerAddress,
            creator: room.creator ?? null,
            opponent: room.opponent ?? null,
        });
        viewerWon = perspective.viewerWon;
        viewerLost = perspective.viewerLost;
        const status = viewerWon ? `${t.win} - ${t.forfeit}` : viewerLost ? `${t.lose} - ${t.forfeit}` : t.forfeit;
        const badgeClass = viewerWon ? "badge win" : viewerLost ? "badge lose" : "badge forfeit";
        return { type: "badge", className: badgeClass, label: status };
    }

    if (outcome.via === "both-commit-timeout") {
        return { type: "badge", className: "badge draw", label: t.tableDrawTimeoutCommit };
    }

    if (outcome.via === "both-reveal-timeout") {
        return { type: "badge", className: "badge draw", label: t.tableDrawTimeoutReveal };
    }

    return { type: "badge", className: "badge win", label: t.finished };
}

function deriveOpenRoomAction(
    room: EnhancedRoom,
    avail: RoomAvailability,
    ctx: RoomViewerContext,
    t: LocaleStrings,
    isConnected: boolean,
    isClient: boolean
): RoomAction {
    if (avail.expired || avail.claimable) {
        if (ctx.isCreator) {
            return { type: "button", action: "claim", label: t.claim };
        }
        return { type: "badge", className: "badge lose", label: t.canceled };
    }

    if (!ctx.isCreator) {
        return { type: "button", action: "join", label: t.join, disabled: !isConnected || !isClient };
    }

    return { type: "text", content: t.personalStatusWaitingJoin };
}

function deriveCommittingAction(
    room: EnhancedRoom,
    avail: RoomAvailability,
    ctx: RoomViewerContext,
    t: LocaleStrings,
    nowTs: number,
    isConnected: boolean,
    isClient: boolean
): RoomAction {
    const bothMissedCommit = !ctx.viewerCommitted && !ctx.opponentCommitted;
    const canClaimCommit = avail.claimable && avail.phase === "commit" && ctx.isParticipant &&
        ((ctx.viewerCommitted && !ctx.opponentCommitted) || bothMissedCommit);

    if (canClaimCommit) {
        return { type: "button", action: "claim", label: t.claim };
    }

    const needCommit = ctx.isParticipant && !ctx.viewerCommitted;
    if (needCommit) {
        return { type: "button", action: "commit", label: t.commit };
    }

    if (room.commitA !== ZERO_COMMIT && room.commitB !== ZERO_COMMIT) {
        return { type: "badge", className: "badge primary", label: t.waitingReveal };
    }

    if (ctx.isParticipant) {
        return { type: "text", content: `${t.committing} (${formatTimeLeft(room.commitDeadline, t, nowTs)})` };
    }

    return { type: "text", content: "—" };
}

function deriveRevealingAction(
    room: EnhancedRoom,
    avail: RoomAvailability,
    ctx: RoomViewerContext,
    t: LocaleStrings,
    nowTs: number,
    isConnected: boolean,
    isClient: boolean
): RoomAction {
    const bothMissedReveal = !ctx.viewerRevealed && !ctx.opponentRevealed;
    const canClaimReveal = avail.claimable && avail.phase === "reveal" && ctx.isParticipant &&
        ((ctx.viewerRevealed && !ctx.opponentRevealed) || bothMissedReveal);

    if (canClaimReveal) {
        return { type: "button", action: "claim", label: t.claim };
    }

    const needReveal = ctx.isParticipant && !ctx.viewerRevealed;
    if (needReveal) {
        return { type: "button", action: "reveal", label: t.reveal };
    }

    if (room.revealA !== 0 && room.revealB !== 0) {
        return { type: "badge", className: "badge primary", label: t.revealing };
    }

    if (ctx.isParticipant) {
        return { type: "text", content: `${t.revealing} (${formatTimeLeft(room.revealDeadline, t, nowTs)})` };
    }

    return { type: "text", content: "—" };
}

/**
 * Check if forfeit button should be shown
 */
export function canShowForfeit(room: EnhancedRoom, ctx: RoomViewerContext): boolean {
    return ctx.isParticipant &&
        (room.state === 1 || room.state === 2) &&
        room.opponent !== ZERO_ADDR &&
        !resolveForfeitOutcome(room);
}

/**
 * Format short address display
 */
export function formatShortAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
