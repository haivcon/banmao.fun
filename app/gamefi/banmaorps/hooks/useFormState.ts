"use client";

import { useState, useCallback } from "react";
import { Choice } from "../lib/types";
import {
    newSalt,
    normalizeRoomId,
    parseSaltHex,
    formatSaltHex,
    parseStakeValue,
    formatStakeDisplayFromNumber,
    formatStakeDisplayString,
    ZERO_BIGINT,
    MAX_SALT_VALUE,
    DEFAULT_COMMIT_WINDOW,
    MIN_COMMIT_WINDOW,
    MAX_COMMIT_WINDOW,
} from "../lib/gameUtils";

export interface UseFormStateReturn {
    // State values
    stakeHuman: string;
    roomId: string;
    choice: Choice;
    salt: `0x${string}`;
    commitDurationInput: string;

    // Setters
    setStakeHuman: (value: string) => void;
    setRoomId: (value: string) => void;
    setChoice: (value: Choice) => void;
    setSalt: (value: `0x${string}`) => void;
    setCommitDurationInput: (value: string) => void;

    // Step handlers
    handleStakeStep: (delta: number) => void;
    handleRoomIdStep: (delta: number) => void;
    handleSaltStep: (delta: bigint) => void;
    handleCommitDurationStep: (delta: number) => void;

    // Utilities
    regenerateSalt: () => void;
    resetForm: () => void;
}

export interface UseFormStateOptions {
    initialStake?: string;
    initialRoomId?: string;
    initialChoice?: Choice;
}

/**
 * Hook to manage game form state
 */
export function useFormState(options: UseFormStateOptions = {}): UseFormStateReturn {
    const {
        initialStake = "1000",
        initialRoomId = "",
        initialChoice = 1,
    } = options;

    const [stakeHuman, setStakeHuman] = useState(() => formatStakeDisplayString(initialStake) || initialStake);
    const [roomId, setRoomId] = useState<string>(initialRoomId);
    const [choice, setChoice] = useState<Choice>(initialChoice);
    const [salt, setSalt] = useState<`0x${string}`>(newSalt());
    const [commitDurationInput, setCommitDurationInput] = useState(String(DEFAULT_COMMIT_WINDOW));

    const handleStakeStep = useCallback((delta: number) => {
        setStakeHuman((prev) => {
            const { base, fractionLength } = parseStakeValue(prev ?? "");
            let next = base + delta;
            if (!Number.isFinite(next)) next = 0;
            if (next < 0) next = 0;
            return formatStakeDisplayFromNumber(next, fractionLength);
        });
    }, []);

    const handleRoomIdStep = useCallback((delta: number) => {
        setRoomId((prev) => {
            const normalized = normalizeRoomId(prev);
            const base = normalized ? Number.parseInt(normalized, 10) : 0;
            const safeBase = Number.isFinite(base) ? base : 0;
            let next = safeBase + delta;
            if (!Number.isFinite(next)) next = 0;
            if (next < 0) next = 0;
            return String(Math.floor(next));
        });
    }, []);

    const handleSaltStep = useCallback((delta: bigint) => {
        setSalt((prev) => {
            const current = parseSaltHex(prev) ?? ZERO_BIGINT;
            let next = current + delta;
            if (next < ZERO_BIGINT) next = ZERO_BIGINT;
            if (next > MAX_SALT_VALUE) next = MAX_SALT_VALUE;
            return formatSaltHex(next);
        });
    }, []);

    const handleCommitDurationStep = useCallback((delta: number) => {
        setCommitDurationInput((prev) => {
            const trimmed = prev.trim();
            const base = /^\d+$/.test(trimmed) ? Number(trimmed) : DEFAULT_COMMIT_WINDOW;
            let next = base + delta;
            if (!Number.isFinite(next)) next = DEFAULT_COMMIT_WINDOW;
            if (next < MIN_COMMIT_WINDOW) next = MIN_COMMIT_WINDOW;
            if (next > MAX_COMMIT_WINDOW) next = MAX_COMMIT_WINDOW;
            return String(Math.floor(next));
        });
    }, []);

    const regenerateSalt = useCallback(() => {
        setSalt(newSalt());
    }, []);

    const resetForm = useCallback(() => {
        setStakeHuman(formatStakeDisplayString(initialStake) || initialStake);
        setRoomId(initialRoomId);
        setChoice(initialChoice);
        setSalt(newSalt());
        setCommitDurationInput(String(DEFAULT_COMMIT_WINDOW));
    }, [initialStake, initialRoomId, initialChoice]);

    return {
        stakeHuman,
        roomId,
        choice,
        salt,
        commitDurationInput,
        setStakeHuman,
        setRoomId,
        setChoice,
        setSalt,
        setCommitDurationInput,
        handleStakeStep,
        handleRoomIdStep,
        handleSaltStep,
        handleCommitDurationStep,
        regenerateSalt,
        resetForm,
    };
}
