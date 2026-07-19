"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    getWeb3DQualityConfig,
    type Web3DQualityConfig,
    type Web3DQualityMode,
} from "../config/performanceConfig";

export type Web3DQualityPreference = Web3DQualityMode | "auto";

type Web3DQualityState = {
    quality: Web3DQualityMode;
    preference: Web3DQualityPreference;
    config: Web3DQualityConfig;
    reducedMotion: boolean;
    isLowPowerDevice: boolean;
    webGLSupported: boolean;
    setPreference: (preference: Web3DQualityPreference) => void;
};

const STORAGE_KEY = "banmao_web3d_quality_preference";

function hasWebGLSupport(): boolean {
    if (typeof window === "undefined") return false;

    try {
        const canvas = document.createElement("canvas");
        const context =
            canvas.getContext("webgl2") ||
            canvas.getContext("webgl") ||
            canvas.getContext("experimental-webgl");

        return Boolean(context);
    } catch {
        return false;
    }
}

function detectLowPowerDevice(): boolean {
    if (typeof window === "undefined") return true;

    const nav = navigator as Navigator & {
        deviceMemory?: number;
    };

    const isMobileLike =
        window.matchMedia("(pointer: coarse)").matches ||
        /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(nav.userAgent);

    const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
    const lowCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;
    const smallViewport = Math.min(window.innerWidth, window.innerHeight) < 768;

    return isMobileLike || lowMemory || lowCpu || smallViewport;
}

function detectInitialQuality(reducedMotion: boolean, lowPower: boolean): Web3DQualityMode {
    if (reducedMotion) return "low";
    if (typeof window === "undefined") return "low";

    const width = window.innerWidth;
    const height = window.innerHeight;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const verySmallScreen = Math.min(width, height) < 640;

    if (verySmallScreen || (coarsePointer && lowPower)) return "low";
    if (coarsePointer || lowPower || width < 1180 || height < 720) return "medium";

    return "high";
}

function readSavedPreference(): Web3DQualityPreference {
    if (typeof window === "undefined") return "medium";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "low" || saved === "medium" || saved === "high" || saved === "auto" ? saved : "medium";
}

export function useWeb3DQualityMode(): Web3DQualityState {
    const [quality, setQuality] = useState<Web3DQualityMode>("medium");
    const [preference, setPreferenceState] = useState<Web3DQualityPreference>("medium");
    const [reducedMotion, setReducedMotion] = useState(false);
    const [isLowPowerDevice, setIsLowPowerDevice] = useState(true);
    const [webGLSupported, setWebGLSupported] = useState(false);

    const applyDetection = useCallback(() => {
        const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const lowPower = detectLowPowerDevice();
        const savedPreference = readSavedPreference();
        const autoQuality = detectInitialQuality(shouldReduceMotion, lowPower);

        setPreferenceState(savedPreference);
        setReducedMotion(shouldReduceMotion);
        setIsLowPowerDevice(lowPower);
        setWebGLSupported(hasWebGLSupport());
        setQuality(savedPreference === "auto" ? autoQuality : savedPreference);
    }, []);

    useEffect(() => {
        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

        applyDetection();

        motionQuery.addEventListener?.("change", applyDetection);
        window.addEventListener("resize", applyDetection, { passive: true });

        return () => {
            motionQuery.removeEventListener?.("change", applyDetection);
            window.removeEventListener("resize", applyDetection);
        };
    }, [applyDetection]);

    const setPreference = useCallback((nextPreference: Web3DQualityPreference) => {
        if (typeof window === "undefined") return;

        const currentPref = window.localStorage.getItem(STORAGE_KEY) ?? "medium";
        const nextPrefStr = nextPreference === "auto" ? "auto" : nextPreference;

        if (nextPrefStr === currentPref) return;

        // Persist every explicit choice, including Auto, so the latest
        // user preference is restored consistently on future visits.
        window.localStorage.setItem(STORAGE_KEY, nextPreference);

        // Reload the page so the new quality setting takes full effect
        window.location.reload();
    }, []);

    const config = useMemo(() => getWeb3DQualityConfig(quality), [quality]);

    return {
        quality,
        preference,
        config,
        reducedMotion,
        isLowPowerDevice,
        webGLSupported,
        setPreference,
    };
}