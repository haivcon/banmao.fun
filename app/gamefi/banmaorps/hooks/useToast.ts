/**
 * useToast Hook
 * Handles toast notifications with status badges and auto-dismiss
 */

"use client";

import React, { useCallback } from "react";
import toast from "react-hot-toast";

export interface ToastOptions {
    id?: string;
    title?: string;
    skipBeep?: boolean;
    force?: boolean;
}

export interface UseToastParams {
    notificationsEnabled: boolean;
    playBeep: (longPress?: boolean) => void;
}

export interface UseToastReturn {
    showToast: (type: "success" | "error" | "loading", message: string, options?: ToastOptions) => void;
    pushNotification: (
        content: (tt: { id: string }) => React.ReactNode,
        opts?: { duration?: number; id?: string }
    ) => void;
}

export function useToast({
    notificationsEnabled,
    playBeep,
}: UseToastParams): UseToastReturn {
    const showToast = useCallback(
        (
            type: "success" | "error" | "loading",
            message: string,
            options: ToastOptions = {}
        ) => {
            const { id, title, skipBeep, force } = options;
            const shouldShow = force || notificationsEnabled || type === "error";
            if (!shouldShow) return;
            if (type !== "loading" && !skipBeep) playBeep();

            const scheduleAutoDismiss = (durationMs: number, toastId?: string) => {
                if (!Number.isFinite(durationMs)) return;
                if (typeof window === "undefined") return;
                if (!toastId) return;
                window.setTimeout(() => {
                    toast.dismiss(toastId);
                }, durationMs + 100);
            };

            const normalizedTitle = title?.trim().toLowerCase();
            const normalizedMessage = message.trim().toLowerCase();
            const isPendingStatusBadge =
                type === "loading" &&
                (normalizedTitle === "pending" || normalizedMessage.startsWith("pending"));

            const shouldUseStatusBadge =
                type === "success" || type === "error" || isPendingStatusBadge;

            const duration = isPendingStatusBadge
                ? 1000
                : type === "loading"
                    ? Number.POSITIVE_INFINITY
                    : type === "success" || type === "error"
                        ? 1000
                        : 1000;

            if (shouldUseStatusBadge) {
                const statusLabel =
                    type === "loading"
                        ? isPendingStatusBadge
                            ? "Pending"
                            : message || title || "Loading"
                        : title ?? (type === "success" ? "Success" : "Error");
                const createdId = toast.custom(
                    () => React.createElement("div", {
                        className: `toast-card toast-card--${type} toast-card--status`
                    }, React.createElement("span", {
                        className: "toast-status-text"
                    }, statusLabel)),
                    { id, duration }
                );
                scheduleAutoDismiss(duration, id ?? createdId);
                return;
            }

            const icon = type === "loading" ? "⏳" : "";
            const defaultTitle = title ?? "Processing";

            const createdId = toast.custom(
                (tt) => React.createElement("div", {
                    className: `toast-card toast-card--${type} toast-card--simple`
                }, [
                    React.createElement("div", { className: "toast-text", key: "text" }, [
                        icon && React.createElement("span", {
                            className: "toast-card__icon",
                            "aria-hidden": "true",
                            key: "icon"
                        }, icon),
                        React.createElement("strong", { key: "title" }, defaultTitle),
                        React.createElement("span", { key: "message" }, message)
                    ]),
                    React.createElement("button", {
                        className: "toast-close",
                        "aria-label": "Close notification",
                        onClick: () => toast.dismiss(tt?.id),
                        key: "close"
                    }, "×")
                ]),
                { id, duration }
            );
            scheduleAutoDismiss(duration, id ?? createdId);
        },
        [notificationsEnabled, playBeep]
    );

    const pushNotification = useCallback(
        (
            content: (tt: { id: string }) => React.ReactNode,
            opts?: { duration?: number; id?: string }
        ) => {
            toast.custom(content as any, opts);
        },
        []
    );

    return {
        showToast,
        pushNotification,
    };
}
