"use client";

import { useCallback } from "react";
import { TelegramReminderMeta } from "../lib/types";
import { TELEGRAM_NOTIFY_ENDPOINT } from "../lib/gameUtils";

export interface UseTelegramReminderOptions {
    address: `0x${string}` | undefined;
    isTelegramConnected: boolean;
    lang: string;
}

export interface UseTelegramReminderReturn {
    sendReminder: (meta: TelegramReminderMeta) => void;
    sendCommitReminder: (roomId: number, deadline?: number) => void;
    sendRevealReminder: (roomId: number, deadline?: number) => void;
    sendUrgentCommitReminder: (roomId: number, deadline?: number) => void;
}

/**
 * Hook for sending Telegram reminders
 */
export function useTelegramReminder({
    address,
    isTelegramConnected,
    lang,
}: UseTelegramReminderOptions): UseTelegramReminderReturn {

    const sendReminder = useCallback(
        (meta: TelegramReminderMeta) => {
            if (!TELEGRAM_NOTIFY_ENDPOINT) return;
            if (!isTelegramConnected) return;
            if (!address) return;
            if (typeof window === "undefined") return;

            const payload = {
                address,
                roomId: meta.roomId,
                type: meta.type,
                title: meta.title,
                body: meta.body,
                locale: lang,
                timestamp: Date.now(),
                deadline: meta.deadline ?? null,
            };

            void fetch(TELEGRAM_NOTIFY_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            }).catch((error) => {
                console.error("Failed to dispatch Telegram reminder", error);
            });
        },
        [address, isTelegramConnected, lang]
    );

    const sendCommitReminder = useCallback(
        (roomId: number, deadline?: number) => {
            sendReminder({
                key: `commit-${roomId}`,
                roomId,
                type: "commit",
                title: "Time to Commit",
                body: `Room #${roomId} is waiting for your commit!`,
                deadline,
            });
        },
        [sendReminder]
    );

    const sendRevealReminder = useCallback(
        (roomId: number, deadline?: number) => {
            sendReminder({
                key: `reveal-${roomId}`,
                roomId,
                type: "reveal",
                title: "Time to Reveal",
                body: `Room #${roomId} is waiting for your reveal!`,
                deadline,
            });
        },
        [sendReminder]
    );

    const sendUrgentCommitReminder = useCallback(
        (roomId: number, deadline?: number) => {
            sendReminder({
                key: `commit-urgent-${roomId}`,
                roomId,
                type: "commit-urgent",
                title: "Urgent: Time to Commit!",
                body: `Room #${roomId} commit deadline is approaching!`,
                deadline,
            });
        },
        [sendReminder]
    );

    return {
        sendReminder,
        sendCommitReminder,
        sendRevealReminder,
        sendUrgentCommitReminder,
    };
}
