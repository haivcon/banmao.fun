/**
 * useButtonFeedback Hook
 * Sets up global button click and keyboard event listeners for haptic feedback
 */

"use client";

import { useEffect } from "react";

export interface UseButtonFeedbackParams {
    provideButtonFeedback: () => void;
}

export function useButtonFeedback({
    provideButtonFeedback,
}: UseButtonFeedbackParams): void {
    useEffect(() => {
        const shouldSkip = (button: HTMLButtonElement | null) => {
            if (!button) return true;
            if (button.disabled) return true;
            if (button.dataset.feedbackSkip === "true") return true;
            if (button.getAttribute("aria-disabled") === "true") return true;
            return false;
        };

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const button = target.closest("button") as HTMLButtonElement | null;
            if (shouldSkip(button)) return;
            if (event.pointerType === "mouse" && event.button !== 0) return;
            provideButtonFeedback();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.repeat) return;
            if (event.key !== " " && event.key !== "Spacebar" && event.key !== "Space" && event.key !== "Enter") return;
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const button = target.closest("button") as HTMLButtonElement | null;
            if (shouldSkip(button)) return;
            provideButtonFeedback();
        };

        document.addEventListener("pointerdown", handlePointerDown, true);
        document.addEventListener("keydown", handleKeyDown, true);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown, true);
            document.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [provideButtonFeedback]);
}
