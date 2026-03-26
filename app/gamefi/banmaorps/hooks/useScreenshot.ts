/**
 * useScreenshot Hook
 * Handles floating screenshot capture with html2canvas
 */

"use client";

import { useCallback, MutableRefObject } from "react";
import toast from "react-hot-toast";
import type { LocaleStrings } from "../lib/i18n";
import { ensureHtml2Canvas } from "../lib/htmlToCanvas";

export interface ScreenshotCallbacks {
    playBeep: (longPress?: boolean) => void;
    showToast: (type: "success" | "error" | "loading", message: string, opts?: { skipBeep?: boolean; id?: string; title?: string; force?: boolean }) => void;
}

export interface UseScreenshotParams {
    mainContentRef: MutableRefObject<HTMLElement | null>;
    t: LocaleStrings;
    callbacks: ScreenshotCallbacks;
}

export interface UseScreenshotReturn {
    captureFloatingScreenshot: () => Promise<void>;
}

export function useScreenshot({
    mainContentRef,
    t,
    callbacks,
}: UseScreenshotParams): UseScreenshotReturn {
    const { playBeep, showToast } = callbacks;

    const captureFloatingScreenshot = useCallback(async () => {
        if (typeof window === "undefined") return;
        playBeep(true);
        const toastId = "floating-shot";
        showToast("loading", t.sharePreparing, { id: toastId, title: "Preparing", force: true });
        let screenshotMode = false;
        try {
            const html2canvas = await ensureHtml2Canvas();
            if (!html2canvas) {
                toast.dismiss(toastId);
                showToast("error", "Screenshot not supported", { skipBeep: true });
                return;
            }

            toast.dismiss(toastId);

            const target = mainContentRef.current ?? document.body;
            document.body.classList.add("screenshot-mode");
            screenshotMode = true;

            const canvas = await html2canvas(target, {
                backgroundColor: getComputedStyle(document.body).backgroundColor || "#000",
                scale: Math.max(1, window.devicePixelRatio || 1),
                scrollX: 0,
                scrollY: -window.scrollY,
                windowWidth: document.documentElement.clientWidth,
                windowHeight: document.documentElement.clientHeight,
                onclone: (doc: Document) => {
                    doc.body.classList.add("screenshot-mode");
                },
            });
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
            if (!blob) throw new Error("Screenshot failed");

            const fileName = `banmao-screenshot-${Date.now()}.png`;
            const file = new File([blob], fileName, { type: "image/png" });

            let shared = false;
            if (navigator.canShare?.({ files: [file] })) {
                try {
                    await navigator.share({ files: [file], title: "BANMAO snapshot", url: window.location.href });
                    shared = true;
                } catch (error) {
                    console.warn("Share with file failed, falling back to download", error);
                }
            }

            if (!shared && navigator.share) {
                try {
                    await navigator.share({ title: "BANMAO snapshot", text: window.location.href, url: window.location.href });
                    shared = true;
                } catch (error) {
                    console.warn("Text share failed", error);
                }
            }

            toast.dismiss(toastId);

            if (shared) {
                showToast("success", t.shareSuccess, { skipBeep: true });
                return;
            }

            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
            showToast("success", t.shareUnavailable, { skipBeep: true });
        } catch (error: any) {
            toast.dismiss(toastId);
            showToast("error", error?.message || "Screenshot failed", { skipBeep: true });
        } finally {
            toast.dismiss(toastId);
            if (typeof window !== "undefined" && screenshotMode) {
                document.body.classList.remove("screenshot-mode");
            }
        }
    }, [playBeep, showToast, t, mainContentRef]);

    return {
        captureFloatingScreenshot,
    };
}
