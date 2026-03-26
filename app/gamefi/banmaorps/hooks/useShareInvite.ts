/**
 * useShareInvite Hook
 * Handles room invite sharing with canvas image generation and share API
 */

"use client";

import { useState, useCallback, useRef, MutableRefObject } from "react";
import type { RoomWithForfeit } from "../lib/types";
import type { LocaleStrings } from "../lib/i18n";
import { copyToClipboard } from "../lib/clipboard";
import { formatTokenAmount } from "../lib/gameUtils";

export interface ShareInviteCallbacks {
    playBeep: (longPress?: boolean) => void;
    showToast: (type: "success" | "error" | "loading", message: string, opts?: { skipBeep?: boolean; id?: string; title?: string; force?: boolean }) => void;
    normalizeRoomId: (id: number | string | null | undefined) => string | null;
    fetchRoomSnapshot: (roomId: number) => Promise<{ stake?: bigint } | null>;
    setRoomId: (roomId: string) => void;
}

export interface UseShareInviteParams {
    roomId: string;
    roomsRef: MutableRefObject<RoomWithForfeit[]>;
    decimals: number;
    t: LocaleStrings;
    callbacks: ShareInviteCallbacks;
}

export interface UseShareInviteReturn {
    isSharing: boolean;
    handleShareInvite: (targetRoomId?: string) => Promise<void>;
}

export function useShareInvite({
    roomId,
    roomsRef,
    decimals,
    t,
    callbacks,
}: UseShareInviteParams): UseShareInviteReturn {
    const { playBeep, showToast, normalizeRoomId, fetchRoomSnapshot, setRoomId } = callbacks;

    const [isSharing, setIsSharing] = useState(false);

    const handleShareInvite = useCallback(
        async (targetRoomId?: string) => {
            playBeep(true);
            const shareRaw = targetRoomId ?? roomId;
            const shareId = normalizeRoomId(shareRaw);
            if (!shareId) {
                showToast("error", t.roomMissing, { skipBeep: true });
                return;
            }
            if (typeof window === "undefined") return;

            setRoomId(shareId);
            setIsSharing(true);
            try {
                let stakeLabelText = t.shareStakeLabel("? $BANMAO");
                const shareIdNum = Number(shareId);
                if (Number.isFinite(shareIdNum) && shareIdNum >= 0) {
                    let stakeValue: bigint | null = null;
                    const cachedRoom = roomsRef.current.find((room) => room.id === shareIdNum);
                    const cachedStake = cachedRoom?.stake;
                    if (typeof cachedStake === "bigint") {
                        stakeValue = cachedStake;
                    } else if (typeof cachedStake === "number") {
                        stakeValue = BigInt(Math.floor(cachedStake));
                    } else if (typeof cachedStake === "string") {
                        try {
                            stakeValue = BigInt(cachedStake);
                        } catch { }
                    }

                    if (stakeValue == null) {
                        const snapshot = await fetchRoomSnapshot(shareIdNum);
                        if (snapshot?.stake != null) {
                            stakeValue = snapshot.stake;
                        }
                    }

                    if (stakeValue != null) {
                        const stakeAmountLabel = `${formatTokenAmount(stakeValue, decimals)} $BANMAO`;
                        stakeLabelText = t.shareStakeLabel(stakeAmountLabel);
                    }
                }

                const canvas = document.createElement("canvas");
                const width = 720;
                const height = 400;
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("Canvas not supported");

                const computed = window.getComputedStyle(document.body);
                const accent = computed.getPropertyValue("--gold").trim() || "#FFD700";
                const accentRgb = computed.getPropertyValue("--gold-rgb").trim() || "255, 215, 0";
                const accentSoftRgb = computed.getPropertyValue("--gold-soft-rgb").trim() || accentRgb;

                const gradient = ctx.createLinearGradient(0, 0, width, height);
                gradient.addColorStop(0, "#050505");
                gradient.addColorStop(1, `rgba(${accentSoftRgb}, 0.2)`);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);

                ctx.fillStyle = `rgba(${accentRgb}, 0.08)`;
                ctx.fillRect(30, 40, width - 60, height - 80);

                ctx.fillStyle = accent;
                ctx.font = "48px Inter, sans-serif";
                ctx.fillText("BANMAO RPS", 60, 110);

                ctx.font = "26px Inter, sans-serif";
                ctx.fillText(`${t.list}`, 60, 160);

                ctx.font = "bold 72px Inter, sans-serif";
                ctx.fillText(`#${shareId}`, 60, 240);

                ctx.fillStyle = "#fff";
                ctx.font = "28px Inter, sans-serif";
                ctx.fillText(stakeLabelText, 60, 300);

                const shareUrl = `${window.location.origin}/?join=${shareId}`;

                const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
                if (!blob) throw new Error("Snapshot failed");

                await copyToClipboard(shareUrl);

                const fileName = `banmao-room-${shareId}.png`;
                const shareFile = new File([blob], fileName, { type: "image/png" });

                if (navigator.canShare?.({ files: [shareFile] })) {
                    await navigator.share({
                        files: [shareFile],
                        title: "BANMAO RPS invite",
                        text: shareUrl,
                        url: shareUrl,
                    });
                    showToast("success", t.shareSuccess, { skipBeep: true });
                } else if (navigator.share) {
                    await navigator.share({ title: "BANMAO RPS invite", text: shareUrl, url: shareUrl });
                    showToast("success", t.shareSuccess, { skipBeep: true });
                } else {
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = fileName;
                    document.body.appendChild(anchor);
                    anchor.click();
                    document.body.removeChild(anchor);
                    URL.revokeObjectURL(url);
                    showToast("success", t.shareUnavailable, { skipBeep: true });
                }
            } catch (err: any) {
                showToast("error", err?.message || "Share failed", { skipBeep: true });
            } finally {
                setIsSharing(false);
            }
        },
        [roomId, t, showToast, playBeep, fetchRoomSnapshot, decimals, normalizeRoomId, setRoomId, roomsRef]
    );

    return {
        isSharing,
        handleShareInvite,
    };
}
