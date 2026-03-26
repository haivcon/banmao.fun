/**
 * useSettingsHandlers Hook
 * Handles settings-related user interactions (choice selection, notifications, vibration, telegram)
 */

"use client";

import { useCallback } from "react";
import type { Choice } from "../lib/types";

const TELEGRAM_LEGACY_USERNAME_STORAGE_KEY = "banmao_tg_username";
const TELEGRAM_CONNECTION_STORAGE_KEY = "banmao_telegram_connected";

function buildTelegramConnectionKey(address: string | null): string {
    if (!address) return TELEGRAM_CONNECTION_STORAGE_KEY;
    return `banmao_telegram_connected_${address.toLowerCase()}`;
}

export interface UseSettingsHandlersParams {
    address: string | undefined;
    vibrationMs: number;
    setChoice: (value: Choice) => void;
    setNotificationsEnabled: (value: boolean) => void;
    setVibrationMs: (value: number) => void;
    setIsTelegramConnected: (value: boolean) => void;
    triggerInteractBeep: () => void;
    vibrate: (pattern?: number | number[]) => void;
}

export interface UseSettingsHandlersReturn {
    handleSelectChoice: (value: Choice) => void;
    handleNotificationsToggle: (value: boolean) => void;
    handleVibrationChange: (value: number) => void;
    handleTelegramConnected: () => void;
}

export function useSettingsHandlers({
    address,
    vibrationMs,
    setChoice,
    setNotificationsEnabled,
    setVibrationMs,
    setIsTelegramConnected,
    triggerInteractBeep,
    vibrate,
}: UseSettingsHandlersParams): UseSettingsHandlersReturn {
    const handleSelectChoice = useCallback(
        (value: Choice) => {
            setChoice(value);
            triggerInteractBeep();
            vibrate(vibrationMs);
        },
        [setChoice, triggerInteractBeep, vibrate, vibrationMs]
    );

    const handleNotificationsToggle = useCallback(
        (value: boolean) => {
            triggerInteractBeep();
            setNotificationsEnabled(value);
        },
        [triggerInteractBeep, setNotificationsEnabled]
    );

    const handleVibrationChange = useCallback(
        (value: number) => {
            triggerInteractBeep();
            setVibrationMs(value);
        },
        [triggerInteractBeep, setVibrationMs]
    );

    const handleTelegramConnected = useCallback(() => {
        setIsTelegramConnected(true);
        if (typeof window !== "undefined") {
            const storageKey = buildTelegramConnectionKey(address ?? null);
            window.localStorage.setItem(storageKey, "true");
            window.localStorage.removeItem(TELEGRAM_LEGACY_USERNAME_STORAGE_KEY);
            window.localStorage.removeItem(TELEGRAM_CONNECTION_STORAGE_KEY);
        }
    }, [address, setIsTelegramConnected]);

    return {
        handleSelectChoice,
        handleNotificationsToggle,
        handleVibrationChange,
        handleTelegramConnected,
    };
}
