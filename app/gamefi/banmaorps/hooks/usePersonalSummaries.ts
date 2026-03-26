/**
 * usePersonalSummaries Hook
 * Computes PersonalSummary cards from personal rooms list
 */

"use client";

import { useMemo } from "react";
import type { RoomWithForfeit, PersonalSummary, PersonalSummaryAccent, Choice } from "../lib/types";
import type { LocaleStrings } from "../lib/i18n";
import type { CommitInfoMap } from "../lib/types";
import { availability } from "../lib/roomUtils";
import {
    ZERO_ADDR, ZERO_COMMIT, STATE,
    formatTimeLeft, formatTokenAmount,
    roomIsFinalized, deriveFinalOutcome,
    resolveForfeitOutcome, determineForfeitViewerResult,
    getCancelDetails
} from "../lib/gameUtils";

export interface ChoiceDisplayItem {
    k: Choice;
    label: string;
    img: string;
}

export interface EnhancedRoomForSummary extends RoomWithForfeit {
    commitDeadline: number;
    revealDeadline: number;
}

export interface PersonalSummaryCallbacks {
    onClaim: (roomId: string, alertKey?: string) => void;
    onCommit: (roomId: string, alertKey?: string) => void;
    onReveal: (roomId: string, alertKey?: string) => void;
    onForfeit: (roomId: string) => void;
    onShare: (roomId: string) => void;
    onDismiss: (roomId: number) => void;
    onSetRoomId: (roomId: string) => void;
    triggerBeep: () => void;
    stopAlertLoop: (key: string) => void;
}

export interface UsePersonalSummariesParams {
    addressLower: string | null;
    personalRooms: RoomWithForfeit[];
    enhanceRoomDeadlines: (room: RoomWithForfeit) => EnhancedRoomForSummary;
    commitInfoMap: CommitInfoMap;
    archivedCommitInfoMap: CommitInfoMap;
    freshResultRoomIds: Set<number>;
    nowTs: number;
    t: LocaleStrings;
    choices: readonly ChoiceDisplayItem[];
    decimals: number;
    callbacks: PersonalSummaryCallbacks;
}

export function usePersonalSummaries({
    addressLower,
    personalRooms,
    enhanceRoomDeadlines,
    commitInfoMap,
    archivedCommitInfoMap,
    freshResultRoomIds,
    nowTs,
    t,
    choices,
    decimals,
    callbacks,
}: UsePersonalSummariesParams): PersonalSummary[] {
    const {
        onClaim, onCommit, onReveal, onForfeit,
        onShare, onDismiss, onSetRoomId, triggerBeep, stopAlertLoop
    } = callbacks;

    return useMemo<PersonalSummary[]>(() => {
        if (!addressLower) return [];

        const cards: PersonalSummary[] = [];

        for (const room of personalRooms) {
            const viewRoom = enhanceRoomDeadlines(room);
            const isCreator = room.creator?.toLowerCase?.() === addressLower;
            const isOpponent = room.opponent?.toLowerCase?.() === addressLower;
            const opponentAddressRaw = isCreator ? room.opponent : room.creator;
            const opponentAddress = opponentAddressRaw && opponentAddressRaw !== ZERO_ADDR ? opponentAddressRaw : null;
            const opponentDisplay = opponentAddress
                ? `${opponentAddress.slice(0, 6)}...${opponentAddress.slice(-4)}`
                : t.personalOpponentUnknown;
            const roomIdStr = String(room.id);
            const savedInfo = commitInfoMap[roomIdStr] ?? archivedCommitInfoMap[roomIdStr];
            const savedChoiceLabel = savedInfo ? choices.find((c) => c.k === savedInfo.choice)?.label ?? null : null;

            const stakeText =
                room.stake != null
                    ? `${formatTokenAmount(room.stake as bigint, decimals)} $BANMAO`
                    : savedInfo?.stakeHuman
                        ? `${savedInfo.stakeHuman} $BANMAO`
                        : undefined;

            const summary: PersonalSummary = {
                id: room.id,
                opponent: opponentAddress,
                opponentDisplay,
                status: t.personalStatusWaitingJoin,
                state: viewRoom.state,
                accent: "idle",
                needsAction: false,
                detail: undefined,
                showChoicePicker: false,
                savedChoice: savedChoiceLabel,
                saltHex: savedInfo?.salt ?? null,
                stakeText: stakeText ?? "—",
                choice: savedInfo ? choices.find((c) => c.k === savedInfo.choice) ?? null : null,
                allowForfeit: false,
                onForfeit: undefined,
                alertKey: undefined,
            };

            const avail = availability(viewRoom, nowTs);
            const deadline =
                viewRoom.state === 1 ? viewRoom.commitDeadline : viewRoom.state === 2 ? viewRoom.revealDeadline : 0;
            const timeLeft = deadline ? formatTimeLeft(deadline, t, nowTs) : "";
            const commitMissing =
                (isCreator && (!viewRoom.commitA || viewRoom.commitA === ZERO_COMMIT)) ||
                (!isCreator && (!viewRoom.commitB || viewRoom.commitB === ZERO_COMMIT));
            const revealMissing = (isCreator && viewRoom.revealA === 0) || (!isCreator && viewRoom.revealB === 0);
            const viewerIsParticipant = isCreator || isOpponent;

            let includeCard = true;

            const isFreshResult = freshResultRoomIds.has(room.id);

            const finalizeCard = (status: string, accent: PersonalSummaryAccent) => {
                summary.status = status;
                summary.accent = accent;
                summary.phase = t.finished;
                summary.timeLeft = null;
                summary.allowForfeit = false;
                summary.onForfeit = undefined;
                summary.needsAction = false;
                summary.actionLabel = undefined;
                summary.actionType = undefined;
                summary.onAction = undefined;
                if (isFreshResult) {
                    summary.actionLabel = t.dismiss;
                    summary.actionType = "dismiss";
                    summary.onAction = () => {
                        triggerBeep();
                        onDismiss(room.id);
                    };
                }
            };

            const defaultPhase =
                viewRoom.state === 0
                    ? t.joinable
                    : viewRoom.state === 1
                        ? t.committing
                        : viewRoom.state === 2
                            ? t.revealing
                            : roomIsFinalized(viewRoom)
                                ? t.finished
                                : viewRoom.state === 4
                                    ? t.canceled
                                    : STATE[viewRoom.state] ?? "";

            summary.phase = defaultPhase;
            summary.timeLeft = timeLeft ? timeLeft : null;

            if (
                viewerIsParticipant &&
                (viewRoom.state === 1 || viewRoom.state === 2) &&
                !resolveForfeitOutcome(viewRoom)
            ) {
                summary.allowForfeit = true;
                summary.onForfeit = () => {
                    onSetRoomId(roomIdStr);
                    onForfeit(roomIdStr);
                };
            }

            const forfeitView = resolveForfeitOutcome(viewRoom);
            if (forfeitView) {
                const { viewerWon, viewerLost } = determineForfeitViewerResult(forfeitView, {
                    viewerAddress: addressLower,
                    creator: viewRoom.creator ?? null,
                    opponent: viewRoom.opponent ?? null,
                });
                const status = viewerWon
                    ? t.personalStatusForfeitWin
                    : viewerLost
                        ? t.personalStatusForfeitLose
                        : t.personalStatusForfeitSpectate;
                const accent = viewerWon ? "finished-win" : viewerLost ? "finished-lose" : "finished";
                summary.state = 3;
                finalizeCard(status, accent);
                if (includeCard) {
                    cards.push(summary);
                }
                continue;
            }

            if (viewRoom.state === 0) {
                summary.status = t.personalStatusWaitingJoin;
                if (avail.claimable) {
                    if (isCreator) {
                        const claimKey = `claim-${room.id}`;
                        summary.status = t.personalStatusClaim(avail.phase === "commit" ? t.committing : t.revealing);
                        summary.actionLabel = t.claim;
                        summary.accent = "claim";
                        summary.actionType = "claim";
                        summary.needsAction = true;
                        summary.phase = t.claim;
                        summary.timeLeft = null;
                        summary.alertKey = claimKey;
                        summary.onAction = () => {
                            onSetRoomId(roomIdStr);
                            stopAlertLoop(claimKey);
                            onClaim(roomIdStr, claimKey);
                        };
                    } else {
                        const noJoinReason = t.canceledReasonNoJoin ?? t.canceledReasonUnknown;
                        const creatorRefund =
                            t.canceledRefundCreatorOnly ??
                            t.canceledRefundBothPartial ??
                            t.canceledRefundUnknown;
                        summary.status = `${t.personalStatusCanceled}: ${noJoinReason}`;
                        summary.detail = creatorRefund;
                        summary.accent = "finished";
                        summary.phase = t.canceled;
                        summary.timeLeft = null;
                    }
                } else if (isCreator) {
                    summary.actionLabel = t.personalActionShare;
                    summary.actionType = "share";
                    summary.needsAction = true;
                    summary.onAction = () => {
                        onSetRoomId(roomIdStr);
                        onShare(roomIdStr);
                    };
                }
            } else if (viewRoom.state === 1) {
                if (avail.claimable) {
                    const creatorCommitted = viewRoom.commitA && viewRoom.commitA !== ZERO_COMMIT;
                    const opponentCommitted = viewRoom.commitB && viewRoom.commitB !== ZERO_COMMIT;
                    const iCommitted = (isCreator && creatorCommitted) || (!isCreator && opponentCommitted);
                    const opponentDidNotCommit = (isCreator && !opponentCommitted) || (!isCreator && !creatorCommitted);
                    const bothPlayersMissed = !creatorCommitted && !opponentCommitted;
                    const claimKey = `claim-${room.id}`;

                    if (bothPlayersMissed) {
                        summary.status = t.personalStatusDrawTimeoutCommit;
                        summary.detail = t.canceledRefundBothFull ?? undefined;
                        summary.actionLabel = t.claim;
                        summary.accent = "claim";
                        summary.actionType = "claim";
                        summary.needsAction = true;
                        summary.phase = t.claim;
                        summary.timeLeft = null;
                        summary.alertKey = claimKey;
                        summary.onAction = () => {
                            onSetRoomId(roomIdStr);
                            stopAlertLoop(claimKey);
                            onClaim(roomIdStr, claimKey);
                        };
                    } else if (iCommitted && opponentDidNotCommit) {
                        summary.status = t.personalStatusClaim(t.committing);
                        summary.actionLabel = t.claim;
                        summary.accent = "claim";
                        summary.actionType = "claim";
                        summary.needsAction = true;
                        summary.phase = t.claim;
                        summary.timeLeft = null;
                        summary.alertKey = claimKey;
                        summary.onAction = () => {
                            onSetRoomId(roomIdStr);
                            stopAlertLoop(claimKey);
                            onClaim(roomIdStr, claimKey);
                        };
                    } else {
                        summary.status = t.personalStatusLoseTimeoutCommit;
                        summary.accent = "finished-lose";
                        summary.phase = t.finished;
                        summary.timeLeft = null;
                    }
                } else if (commitMissing) {
                    summary.status = t.personalStatusNeedCommit(timeLeft);
                    summary.actionLabel = t.commit;
                    summary.accent = "urgent";
                    summary.actionType = "commit";
                    summary.needsAction = true;
                    summary.showChoicePicker = true;
                    summary.phase = t.commit;
                    summary.timeLeft = timeLeft ? timeLeft : null;
                    const commitKey = `need-commit-${room.id}-${isCreator ? "A" : "B"}`;
                    summary.alertKey = commitKey;
                    summary.onAction = () => {
                        onSetRoomId(roomIdStr);
                        stopAlertLoop(commitKey);
                        onCommit(roomIdStr, commitKey);
                    };
                } else {
                    summary.status = t.personalStatusWaitingOpponentCommit(timeLeft);
                }
            } else if (viewRoom.state === 2) {
                if (avail.claimable) {
                    const creatorRevealed = viewRoom.revealA > 0;
                    const opponentRevealed = viewRoom.revealB > 0;
                    const iRevealed = (isCreator && creatorRevealed) || (!isCreator && opponentRevealed);
                    const opponentDidNotReveal = (isCreator && !opponentRevealed) || (!isCreator && !creatorRevealed);
                    const bothPlayersMissedReveal = !creatorRevealed && !opponentRevealed;
                    const claimKey = `claim-${room.id}`;

                    if (bothPlayersMissedReveal) {
                        summary.status = t.personalStatusDrawTimeoutReveal;
                        summary.detail = t.canceledRefundBothPartial ?? undefined;
                        summary.actionLabel = t.claim;
                        summary.accent = "claim";
                        summary.actionType = "claim";
                        summary.needsAction = true;
                        summary.phase = t.claim;
                        summary.timeLeft = null;
                        summary.alertKey = claimKey;
                        summary.onAction = () => {
                            onSetRoomId(roomIdStr);
                            stopAlertLoop(claimKey);
                            onClaim(roomIdStr, claimKey);
                        };
                    } else if (iRevealed && opponentDidNotReveal) {
                        summary.status = t.personalStatusClaim(t.revealing);
                        summary.actionLabel = t.claim;
                        summary.accent = "claim";
                        summary.actionType = "claim";
                        summary.needsAction = true;
                        summary.phase = t.claim;
                        summary.timeLeft = null;
                        summary.alertKey = claimKey;
                        summary.onAction = () => {
                            onSetRoomId(roomIdStr);
                            stopAlertLoop(claimKey);
                            onClaim(roomIdStr, claimKey);
                        };
                    } else {
                        summary.status = t.personalStatusLoseTimeoutReveal;
                        summary.accent = "finished-lose";
                        summary.phase = t.finished;
                        summary.timeLeft = null;
                    }
                } else if (revealMissing) {
                    summary.status = t.personalStatusNeedReveal(timeLeft);
                    summary.actionLabel = t.reveal;
                    summary.accent = "urgent";
                    summary.actionType = "reveal";
                    summary.needsAction = true;
                    summary.showChoicePicker = true;
                    summary.phase = t.reveal;
                    summary.timeLeft = timeLeft ? timeLeft : null;
                    const revealKey = `need-reveal-${room.id}-${isCreator ? "A" : "B"}`;
                    summary.alertKey = revealKey;
                    summary.onAction = () => {
                        onSetRoomId(roomIdStr);
                        stopAlertLoop(revealKey);
                        onReveal(roomIdStr, revealKey);
                    };
                } else {
                    summary.status = t.personalStatusWaitingOpponentReveal(timeLeft);
                }
            } else if (roomIsFinalized(viewRoom)) {
                const outcome = deriveFinalOutcome(viewRoom);
                let viewerWon =
                    (outcome.winner === "creator" && isCreator) || (outcome.winner === "opponent" && !isCreator);
                let viewerLost =
                    (outcome.winner === "creator" && !isCreator) || (outcome.winner === "opponent" && isCreator);

                if (outcome.via === "normal") {
                    const opponentChoiceValue = isCreator ? viewRoom.revealB : viewRoom.revealA;
                    const opponentChoice = choices.find((c) => c.k === opponentChoiceValue)?.label ?? t.personalUnknownChoice;
                    const resultText = outcome.winner === "creator"
                        ? (isCreator ? t.win : t.lose)
                        : outcome.winner === "opponent"
                            ? (isCreator ? t.lose : t.win)
                            : t.draw;
                    summary.detail = t.personalStatusFinished(opponentChoice, resultText);
                    if (viewerWon) {
                        finalizeCard(t.personalStatusRevealSuccessWin, "finished-win");
                    } else if (viewerLost) {
                        finalizeCard(t.personalStatusRevealSuccessLose, "finished-lose");
                    } else {
                        finalizeCard(t.personalStatusRevealSuccessDraw, "finished-draw");
                    }
                } else if (outcome.via === "commit-timeout") {
                    const status = viewerWon
                        ? t.personalStatusWinTimeoutCommit
                        : viewerLost
                            ? t.personalStatusLoseTimeoutCommit
                            : t.personalStatusDrawTimeoutCommit;
                    if (!viewerWon && !viewerLost) {
                        summary.detail = t.canceledRefundBothFull ?? undefined;
                    }
                    const accent = viewerWon ? "finished-win" : viewerLost ? "finished-lose" : "finished-draw";
                    finalizeCard(status, accent);
                } else if (outcome.via === "reveal-timeout") {
                    const status = viewerWon
                        ? t.personalStatusWinTimeoutReveal
                        : viewerLost
                            ? t.personalStatusLoseTimeoutReveal
                            : t.personalStatusDrawTimeoutReveal;
                    const accent = viewerWon ? "finished-win" : viewerLost ? "finished-lose" : "finished-draw";
                    finalizeCard(status, accent);
                } else if (outcome.via === "forfeit") {
                    // Already handled above via forfeitView check
                    finalizeCard(t.personalStatusFinished(t.personalUnknownChoice, t.finished), "finished");
                } else if (outcome.via === "both-commit-timeout") {
                    summary.detail = t.canceledRefundBothFull ?? undefined;
                    finalizeCard(t.personalStatusDrawTimeoutCommit, "finished-draw");
                } else if (outcome.via === "both-reveal-timeout") {
                    summary.detail = t.canceledRefundBothPartial ?? undefined;
                    finalizeCard(t.personalStatusDrawTimeoutReveal, "finished-draw");
                } else {
                    finalizeCard(t.personalStatusFinished(t.personalUnknownChoice, t.finished), "finished");
                }
            } else if (viewRoom.state === 4) {
                const cancelDetails = getCancelDetails(viewRoom, t);
                summary.status = `${t.personalStatusCanceled}: ${cancelDetails.reason}`;
                summary.detail = cancelDetails.refund;
            }

            if (includeCard) {
                cards.push(summary);
            }
        }

        return cards;
    }, [
        addressLower,
        personalRooms,
        enhanceRoomDeadlines,
        t,
        onShare,
        onClaim,
        onCommit,
        onReveal,
        onForfeit,
        onDismiss,
        onSetRoomId,
        triggerBeep,
        stopAlertLoop,
        choices,
        commitInfoMap,
        archivedCommitInfoMap,
        freshResultRoomIds,
        nowTs,
        decimals,
    ]);
}
