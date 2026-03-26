/**
 * useAutoPlay Hook
 * Manages automatic room actions (commit, reveal, claim) based on room state
 */

"use client";

import { useState, useRef, useCallback, MutableRefObject } from "react";
import type { PersonalSummary, Choice } from "../lib/types";
import type { LocaleStrings } from "../lib/i18n";
import type { CommitInfoMap } from "../lib/types";

export interface ChoiceDisplayItem {
    k: Choice;
    label: string;
    img: string;
}

export interface AutoPlayCallbacks {
    commit: (roomId: string, opts?: { choice?: Choice; salt?: `0x${string}` }) => Promise<void>;
    reveal: (roomId: string) => Promise<void>;
    claim: (roomId: string) => Promise<void>;
    setChoice: (choice: Choice) => void;
    setSalt: (salt: string) => void;
    setRoomId: (roomId: string) => void;
    stopAlertLoop: (key: string) => void;
    showToast: (type: "success" | "error", message: string, opts?: { skipBeep?: boolean }) => void;
    normalizeRoomId: (id: number | string) => string | null;
    newSalt: () => string;
}

export interface UseAutoPlayParams {
    personalSummariesRef: MutableRefObject<PersonalSummary[]>;
    commitInfoMap: CommitInfoMap;
    archivedCommitInfoMap: CommitInfoMap;
    choices: readonly ChoiceDisplayItem[];
    t: LocaleStrings;
    callbacks: AutoPlayCallbacks;
}

export interface UseAutoPlayReturn {
    autoPlayingRooms: Set<number>;
    autoPlayRoom: (roomId: number) => Promise<void>;
    stopAutoPlay: (roomId: number) => void;
}

const waitMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useAutoPlay({
    personalSummariesRef,
    commitInfoMap,
    archivedCommitInfoMap,
    choices,
    t,
    callbacks,
}: UseAutoPlayParams): UseAutoPlayReturn {
    const {
        commit, reveal, claim, setChoice, setSalt, setRoomId,
        stopAlertLoop, showToast, normalizeRoomId, newSalt
    } = callbacks;

    const [autoPlayingRooms, setAutoPlayingRooms] = useState<Set<number>>(() => new Set());
    const autoPlayControllersRef = useRef<Map<number, { canceled: boolean }>>(new Map());

    const updateAutoPlaying = useCallback((roomId: number, active: boolean) => {
        setAutoPlayingRooms((prev) => {
            const next = new Set(prev);
            if (active) next.add(roomId);
            else next.delete(roomId);
            return next;
        });
    }, []);

    const stopAutoPlay = useCallback((roomId: number) => {
        const controller = autoPlayControllersRef.current.get(roomId);
        if (controller) {
            controller.canceled = true;
        }
    }, []);

    const autoPlayRoom = useCallback(
        async (roomId: number) => {
            const normalizedTarget = normalizeRoomId(roomId);
            if (!normalizedTarget) {
                showToast("error", t.roomMissing, { skipBeep: true });
                return;
            }

            if (autoPlayControllersRef.current.has(roomId)) {
                stopAutoPlay(roomId);
                return;
            }

            const controller = { canceled: false };
            autoPlayControllersRef.current.set(roomId, controller);
            updateAutoPlaying(roomId, true);

            try {
                let performed = false;
                let blocked = false;
                let idleCycles = 0;

                const waitForActionTransition = async (
                    previousAction: PersonalSummary["actionType"] | undefined
                ): Promise<"canceled" | "changed" | "cleared" | "missing" | "timeout"> => {
                    const start = Date.now();
                    const MAX_WAIT_MS = 45_000;
                    const POLL_INTERVAL_MS = 650;
                    while (!controller.canceled) {
                        await waitMs(POLL_INTERVAL_MS);
                        const latest = personalSummariesRef.current.find((card) => card.id === roomId);
                        if (!latest) return "missing";
                        if (!latest.needsAction) return "cleared";
                        if (latest.actionType !== previousAction) return "changed";
                        if (Date.now() - start >= MAX_WAIT_MS) return "timeout";
                    }
                    return "canceled";
                };

                while (!controller.canceled) {
                    const summary = personalSummariesRef.current.find((card) => card.id === roomId);
                    if (!summary || !summary.needsAction || !summary.actionType) {
                        if (!summary) break;
                        if (summary.state === 3 || summary.state === 4) {
                            break;
                        }

                        idleCycles += 1;
                        await waitMs(Math.min(5000, 750 + idleCycles * 250));
                        continue;
                    }

                    if (
                        summary.actionType !== "commit" &&
                        summary.actionType !== "reveal" &&
                        summary.actionType !== "claim"
                    ) {
                        break;
                    }

                    idleCycles = 0;

                    if (summary.alertKey) {
                        stopAlertLoop(summary.alertKey);
                    }

                    setRoomId(normalizedTarget);

                    if (controller.canceled) break;

                    const currentAction = summary.actionType;
                    if (summary.actionType === "commit") {
                        const option = choices[Math.floor(Math.random() * choices.length)];
                        const randomSalt = newSalt() as `0x${string}`;
                        await commit(normalizedTarget, { choice: option.k, salt: randomSalt });
                    } else if (summary.actionType === "reveal") {
                        const info = commitInfoMap[normalizedTarget] ?? archivedCommitInfoMap[normalizedTarget];
                        if (!info) {
                            showToast("error", t.personalAutoPlayMissingCommit, { skipBeep: true });
                            blocked = true;
                            break;
                        }
                        setChoice(info.choice);
                        setSalt(info.salt);
                        await reveal(normalizedTarget);
                    } else {
                        await claim(normalizedTarget);
                    }

                    performed = true;
                    const transition = await waitForActionTransition(currentAction);
                    if (transition === "timeout") {
                        blocked = true;
                        showToast("error", t.personalAutoPlayPending, { skipBeep: true });
                        break;
                    }
                    if (transition === "missing") {
                        break;
                    }
                }

                if (controller.canceled) {
                    showToast("success", t.personalAutoPlayStopped, { skipBeep: true });
                } else if (!performed && !blocked) {
                    showToast("error", t.personalAutoPlayNoAction, { skipBeep: true });
                }
            } finally {
                autoPlayControllersRef.current.delete(roomId);
                updateAutoPlaying(roomId, false);
            }
        },
        [
            archivedCommitInfoMap,
            choices,
            claim,
            commit,
            commitInfoMap,
            reveal,
            setChoice,
            setRoomId,
            setSalt,
            stopAutoPlay,
            showToast,
            stopAlertLoop,
            t,
            updateAutoPlaying,
            normalizeRoomId,
            newSalt,
            personalSummariesRef,
        ]
    );

    return {
        autoPlayingRooms,
        autoPlayRoom,
        stopAutoPlay,
    };
}
