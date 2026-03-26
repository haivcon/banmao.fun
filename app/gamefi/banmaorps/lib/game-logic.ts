/**
 * Game Logic for BANMAO RPS
 * Core game mechanics and state calculations
 */

import type { ForfeitRecord, RoomSnapshot, RoomWithForfeit } from "./types";
import type { LocaleStrings } from "./i18n";
import { formatTokenAmount, getWinner } from "./utils";
import { ZERO_ADDR, ZERO_COMMIT, ZERO_BIGINT } from "./constants";

// ===================== Types =====================

export type ForfeitResolution = {
    winnerSide: "creator" | "opponent" | null;
    loserSide: "creator" | "opponent" | null;
    winnerAddress: string | null;
    loserAddress: string | null;
};

export type FinalOutcomeVia =
    | "normal"
    | "commit-timeout"
    | "reveal-timeout"
    | "both-commit-timeout"
    | "both-reveal-timeout"
    | "forfeit"
    | "unknown";

export type FinalOutcome = {
    winner: "creator" | "opponent" | "draw" | null;
    via: FinalOutcomeVia;
};

export type RoomAvailability = {
    label: string;
    live: boolean;
    expired: boolean;
    claimable: boolean;
    deadline: number;
    phase: string;
};

// ===================== Room State =====================

export function roomHasRevealedOutcome(room: { revealA?: number; revealB?: number }) {
    const revealA = Number(room?.revealA ?? 0);
    const revealB = Number(room?.revealB ?? 0);
    return revealA > 0 && revealB > 0;
}

export function resolveForfeitOutcome(room: {
    forfeit?: ForfeitRecord | null;
    creator?: `0x${string}`;
    opponent?: `0x${string}`;
}): ForfeitResolution | null {
    const record = room?.forfeit;
    if (!record) return null;

    const winnerLower = record.winner?.toLowerCase?.() ?? null;
    const loserLower = record.loser?.toLowerCase?.() ?? null;
    if (!winnerLower && !loserLower) return null;

    const creatorLower = room.creator?.toLowerCase?.() ?? null;
    const opponentLower = room.opponent?.toLowerCase?.() ?? null;

    let winnerSide: "creator" | "opponent" | null = null;
    let loserSide: "creator" | "opponent" | null = null;

    if (winnerLower && creatorLower && winnerLower === creatorLower) {
        winnerSide = "creator";
    } else if (winnerLower && opponentLower && winnerLower === opponentLower) {
        winnerSide = "opponent";
    }

    if (loserLower && creatorLower && loserLower === creatorLower) {
        loserSide = "creator";
    } else if (loserLower && opponentLower && loserLower === opponentLower) {
        loserSide = "opponent";
    }

    if (!winnerSide) {
        if (loserSide === "creator" && opponentLower) {
            winnerSide = "opponent";
        } else if (loserSide === "opponent" && creatorLower) {
            winnerSide = "creator";
        }
    }

    if (!loserSide) {
        if (winnerSide === "creator" && opponentLower) {
            loserSide = "opponent";
        } else if (winnerSide === "opponent" && creatorLower) {
            loserSide = "creator";
        }
    }

    return {
        winnerSide,
        loserSide,
        winnerAddress: winnerLower,
        loserAddress: loserLower,
    };
}

export function roomIsFinalized(room: {
    state?: number;
    revealA?: number;
    revealB?: number;
    forfeit?: ForfeitRecord | null;
    creator?: `0x${string}`;
    opponent?: `0x${string}`;
}) {
    if (!room) return false;
    if (resolveForfeitOutcome(room)) return true;
    if (room.state === 3) return true;
    if (room.state === 4 && roomHasRevealedOutcome(room)) return true;
    return false;
}

export function deriveFinalOutcome(room: {
    state?: number;
    commitA?: `0x${string}`;
    commitB?: `0x${string}`;
    revealA?: number;
    revealB?: number;
    creator?: `0x${string}`;
    opponent?: `0x${string}`;
    forfeit?: ForfeitRecord | null;
}): FinalOutcome {
    if (!room || !roomIsFinalized(room)) {
        return { winner: null, via: "unknown" };
    }

    const forfeitResolution = resolveForfeitOutcome(room);
    if (forfeitResolution) {
        if (forfeitResolution.winnerSide === "creator") {
            return { winner: "creator", via: "forfeit" };
        }
        if (forfeitResolution.winnerSide === "opponent") {
            return { winner: "opponent", via: "forfeit" };
        }
        if (forfeitResolution.loserSide === "creator") {
            return { winner: "opponent", via: "forfeit" };
        }
        if (forfeitResolution.loserSide === "opponent") {
            return { winner: "creator", via: "forfeit" };
        }
        return { winner: null, via: "forfeit" };
    }

    const hasRevealed = roomHasRevealedOutcome(room);
    if (hasRevealed) {
        const winner = getWinner(room.revealA ?? 0, room.revealB ?? 0);
        if (winner === "A") return { winner: "creator", via: "normal" };
        if (winner === "B") return { winner: "opponent", via: "normal" };
        if (winner === "Draw") return { winner: "draw", via: "normal" };
        return { winner: null, via: "normal" };
    }

    const commitAZero = !room.commitA || room.commitA === ZERO_COMMIT;
    const commitBZero = !room.commitB || room.commitB === ZERO_COMMIT;
    const revealAZero = (room.revealA ?? 0) === 0;
    const revealBZero = (room.revealB ?? 0) === 0;

    if (!commitAZero && commitBZero) {
        return { winner: "creator", via: "commit-timeout" };
    }
    if (commitAZero && !commitBZero) {
        return { winner: "opponent", via: "commit-timeout" };
    }

    if (!revealAZero && revealBZero) {
        return { winner: "creator", via: "reveal-timeout" };
    }
    if (revealAZero && !revealBZero) {
        return { winner: "opponent", via: "reveal-timeout" };
    }

    if (commitAZero && commitBZero) {
        return { winner: "draw", via: "both-commit-timeout" };
    }

    if (revealAZero && revealBZero) {
        return { winner: "draw", via: "both-reveal-timeout" };
    }

    return { winner: "draw", via: "unknown" };
}

// ===================== Availability =====================

export function availability(room: any, nowOverride?: number): RoomAvailability {
    const now = nowOverride ?? Math.floor(Date.now() / 1000);
    const s = room.state as number;

    if (resolveForfeitOutcome(room)) {
        return { label: "Finished", live: false, expired: true, claimable: false, deadline: 0, phase: "" };
    }

    // WAIT: Room without opponent (joinable during commit window)
    if (s === 0 && room.opponent === ZERO_ADDR) {
        const hasDeadline = !!room.commitDeadline && room.commitDeadline > 0;
        const live = hasDeadline ? now < room.commitDeadline : true;
        return {
            label: live ? "Joinable" : "Wait",
            live,
            expired: !live,
            claimable: hasDeadline ? now >= room.commitDeadline : false,
            deadline: hasDeadline ? room.commitDeadline : 0,
            phase: "commit",
        };
    }

    if (s === 1) {
        const live = room.commitDeadline > 0 ? now < room.commitDeadline : true;
        return {
            label: live ? "Committing" : "Commit expired",
            live,
            expired: !live,
            claimable: room.commitDeadline > 0 ? now >= room.commitDeadline : false,
            deadline: room.commitDeadline || 0,
            phase: "commit",
        };
    }

    if (s === 2) {
        const live = room.revealDeadline > 0 ? now < room.revealDeadline : true;
        return {
            label: live ? "Revealing" : "Reveal expired",
            live,
            expired: !live,
            claimable: room.revealDeadline > 0 ? now >= room.revealDeadline : false,
            deadline: room.revealDeadline || 0,
            phase: "reveal",
        };
    }

    if (s === 3) return { label: "Finished", live: false, expired: true, claimable: false, deadline: 0, phase: "" };
    if (s === 4) {
        if (roomIsFinalized(room)) {
            return { label: "Finished", live: false, expired: true, claimable: false, deadline: 0, phase: "" };
        }
        return { label: "Canceled", live: false, expired: true, claimable: false, deadline: 0, phase: "" };
    }
    return { label: "Unknown", live: false, expired: true, claimable: false, deadline: 0, phase: "" };
}

// ===================== Time Formatting =====================

export function formatTimeLeft(deadline: number, t: any, nowOverride?: number): string {
    const now = nowOverride ?? Math.floor(Date.now() / 1000);
    const timeLeft = deadline > now ? deadline - now : 0;
    if (timeLeft === 0) return t.timeout ?? "00:00:00";
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// ===================== Forfeit Helpers =====================

export function determineForfeitViewerResult(
    resolution: ForfeitResolution | null,
    options: {
        viewerAddress?: string | null;
        creator?: `0x${string}` | null;
        opponent?: `0x${string}` | null;
    }
): { viewerWon: boolean; viewerLost: boolean } {
    if (!resolution) return { viewerWon: false, viewerLost: false };

    const viewer = options.viewerAddress?.toLowerCase?.() ?? "";
    const creatorLower = options.creator?.toLowerCase?.() ?? null;
    const opponentLower = options.opponent?.toLowerCase?.() ?? null;

    const winnerAddress = resolution.winnerAddress ?? null;
    const loserAddress = resolution.loserAddress ?? null;

    let viewerWon = !!(viewer && winnerAddress && viewer === winnerAddress);
    let viewerLost = !!(viewer && loserAddress && viewer === loserAddress);

    if (!viewerWon && !viewerLost && viewer) {
        if (resolution.winnerSide === "creator" && creatorLower && viewer === creatorLower) {
            viewerWon = true;
        } else if (resolution.winnerSide === "opponent" && opponentLower && viewer === opponentLower) {
            viewerWon = true;
        } else if (resolution.loserSide === "creator" && creatorLower && viewer === creatorLower) {
            viewerLost = true;
        } else if (resolution.loserSide === "opponent" && opponentLower && viewer === opponentLower) {
            viewerLost = true;
        } else if (!resolution.winnerSide && resolution.loserSide === "creator" && opponentLower && viewer === opponentLower) {
            viewerWon = true;
        } else if (!resolution.winnerSide && resolution.loserSide === "opponent" && creatorLower && viewer === creatorLower) {
            viewerWon = true;
        } else if (!resolution.loserSide && resolution.winnerSide === "creator" && opponentLower && viewer === opponentLower) {
            viewerLost = true;
        } else if (!resolution.loserSide && resolution.winnerSide === "opponent" && creatorLower && viewer === creatorLower) {
            viewerLost = true;
        }
    }

    return { viewerWon, viewerLost };
}

export function createForfeitWarning(
    room: Partial<RoomSnapshot>,
    viewerAddress: string | null,
    t: LocaleStrings,
    decimals: number
): { title: string; body: string } | null {
    if (!viewerAddress) return null;
    const viewerLower = viewerAddress.toLowerCase();
    const creatorLower = room.creator?.toLowerCase?.() ?? null;
    const opponentLower = room.opponent?.toLowerCase?.() ?? null;
    const viewerIsCreator = creatorLower === viewerLower;
    const viewerIsOpponent = opponentLower === viewerLower;
    if (!viewerIsCreator && !viewerIsOpponent) return null;

    const stakeValue = typeof room.stake === "bigint" ? room.stake : ZERO_BIGINT;
    const stakeLabel = `${formatTokenAmount(stakeValue, decimals)} $BANMAO`;
    const state = Number(room.state ?? 0);

    const viewerCommitted = viewerIsCreator
        ? room.commitA && room.commitA !== ZERO_COMMIT
        : room.commitB && room.commitB !== ZERO_COMMIT;
    const opponentCommitted = viewerIsCreator
        ? room.commitB && room.commitB !== ZERO_COMMIT
        : room.commitA && room.commitA !== ZERO_COMMIT;

    const viewerRevealed = viewerIsCreator
        ? Number(room.revealA ?? 0) !== 0
        : Number(room.revealB ?? 0) !== 0;
    const opponentRevealed = viewerIsCreator
        ? Number(room.revealB ?? 0) !== 0
        : Number(room.revealA ?? 0) !== 0;

    if (state === 1) {
        if (!viewerCommitted && !opponentCommitted) {
            return {
                title: t.forfeitWarnBothUncommittedTitle,
                body: t.forfeitWarnBothUncommittedBody(stakeLabel),
            };
        }
        if (viewerCommitted && !opponentCommitted) {
            return {
                title: t.forfeitWarnSelfCommittedTitle,
                body: t.forfeitWarnSelfCommittedBody(stakeLabel),
            };
        }
        if (!viewerCommitted && opponentCommitted) {
            return {
                title: t.forfeitWarnSelfUncommittedTitle,
                body: t.forfeitWarnSelfUncommittedBody(stakeLabel),
            };
        }
    } else if (state === 2) {
        if (!viewerRevealed && !opponentRevealed) {
            return {
                title: t.forfeitWarnBothUnrevealedTitle,
                body: t.forfeitWarnBothUnrevealedBody(stakeLabel),
            };
        }
        if (viewerRevealed && !opponentRevealed) {
            return {
                title: t.forfeitWarnSelfRevealedTitle,
                body: t.forfeitWarnSelfRevealedBody(stakeLabel),
            };
        }
        if (!viewerRevealed && opponentRevealed) {
            return {
                title: t.forfeitWarnSelfUnrevealedTitle,
                body: t.forfeitWarnSelfUnrevealedBody(stakeLabel),
            };
        }
    }

    return {
        title: t.forfeitWarnDefaultTitle,
        body: t.forfeitWarnDefaultBody(stakeLabel),
    };
}

// ===================== Cancel Details =====================

export function getCancelDetails(
    room: {
        opponent?: `0x${string}`;
        commitA?: `0x${string}`;
        commitB?: `0x${string}`;
        revealA?: number;
        revealB?: number;
    },
    t: any
): { reason: string; refund: string } {
    const hasOpponent = room.opponent && room.opponent !== ZERO_ADDR;
    const commitAZero = !room.commitA || room.commitA === ZERO_COMMIT;
    const commitBZero = !room.commitB || room.commitB === ZERO_COMMIT;
    const revealAZero = (room.revealA ?? 0) === 0;
    const revealBZero = (room.revealB ?? 0) === 0;

    if (!hasOpponent) {
        return { reason: t?.cancelReasonNoOpponent ?? "No opponent", refund: "100%" };
    }

    if (commitAZero && commitBZero) {
        return { reason: t?.cancelReasonBothUncommitted ?? "Both uncommitted", refund: "50/50" };
    }

    if (revealAZero && revealBZero) {
        return { reason: t?.cancelReasonBothUnrevealed ?? "Both unrevealed", refund: "50/50" };
    }

    return { reason: t?.cancelReasonUnknown ?? "Unknown", refund: "—" };
}

