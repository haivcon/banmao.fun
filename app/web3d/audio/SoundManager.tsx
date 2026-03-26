"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface SoundManagerContextType {
    isMuted: boolean;
    volume: number;
    toggleMute: () => void;
    setVolume: (vol: number) => void;
    playHover: () => void;
    playClick: () => void;
    playSuccess: () => void;
    playWhoosh: () => void;
}

const SoundManagerContext = createContext<SoundManagerContextType | null>(null);

// Sound URLs - using base64 encoded minimal sounds for instant loading
const SOUNDS = {
    hover: 'data:audio/wav;base64,UklGRl4AAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToAAAAFAAoADwATABcAGQAaABkAFwATAA4ACAACAAAAAAABAAIAAwADAQMAAwACAQEAAAAA',
    click: 'data:audio/wav;base64,UklGRn4AAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YVoAAAD/AP///wDMAL4AxQDQANYA2ADVAM8AxgC9ALUArwCqAKcApQCkAKQApQCnAKoArgCzALkAwADHAM4A1QDbAOAA5ADnAOkA6gDqAOkA5wDkAOAA2wDVAM4AxwC/ALgA',
    success: 'data:audio/wav;base64,UklGRqoAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YYYAAAAQACAAMABAAFAAYABwAIAAkACgALAAwADQAOAA8AD/AAAB+AD0APAA6ADgANgA0ADIAM8AwACwAKAAkACAAHAAYABQAEAAMAAgABAACAD4APAA6ADgANgA0ADIAO8A',
    whoosh: 'data:audio/wav;base64,UklGRsIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YZ4AAAD/////AADAAKoAoACWAI0AhQB+AHgAcwBvAGwAagBpAGkAagBsAG8AcwB4AH4AhQCNAJYAoACqAMAA1gDtAAQBAQH+APYA7gDlANwA0wDKAMEAuACvAKcAnwCYAJEAiwCFAIAAewB3AHQAcgBwAG8AbwBwAHIAdAB3AHsAgACFAIsAkQCYAJ8ApwCvALgAwQA=',
};

// Audio cache
const audioCache: Map<string, HTMLAudioElement> = new Map();

function getAudio(soundKey: keyof typeof SOUNDS): HTMLAudioElement {
    if (!audioCache.has(soundKey)) {
        const audio = new Audio(SOUNDS[soundKey]);
        audio.preload = 'auto';
        audioCache.set(soundKey, audio);
    }
    return audioCache.get(soundKey)!;
}

interface SoundManagerProviderProps {
    children: ReactNode;
}

export function SoundManagerProvider({ children }: SoundManagerProviderProps) {
    const [isMuted, setIsMuted] = useState(true); // Start muted by default
    const [volume, setVolumeState] = useState(0.3);

    // Load preferences from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const storedMuted = localStorage.getItem("banmao_sound_muted");
            const storedVolume = localStorage.getItem("banmao_sound_volume");

            if (storedMuted !== null) {
                setIsMuted(storedMuted === "true");
            }
            if (storedVolume !== null) {
                setVolumeState(parseFloat(storedVolume));
            }
        }
    }, []);

    // Play sound helper
    const playSound = useCallback((soundKey: keyof typeof SOUNDS) => {
        if (isMuted || typeof window === "undefined") return;

        try {
            const audio = getAudio(soundKey);
            audio.volume = volume;
            audio.currentTime = 0;
            audio.play().catch(() => {
                // Ignore play errors (user hasn't interacted yet)
            });
        } catch {
            // Ignore errors
        }
    }, [isMuted, volume]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newValue = !prev;
            if (typeof window !== "undefined") {
                localStorage.setItem("banmao_sound_muted", String(newValue));
            }
            return newValue;
        });
    }, []);

    const setVolume = useCallback((vol: number) => {
        const clampedVol = Math.max(0, Math.min(1, vol));
        setVolumeState(clampedVol);
        if (typeof window !== "undefined") {
            localStorage.setItem("banmao_sound_volume", String(clampedVol));
        }
    }, []);

    const playHover = useCallback(() => playSound("hover"), [playSound]);
    const playClick = useCallback(() => playSound("click"), [playSound]);
    const playSuccess = useCallback(() => playSound("success"), [playSound]);
    const playWhoosh = useCallback(() => playSound("whoosh"), [playSound]);

    const value: SoundManagerContextType = {
        isMuted,
        volume,
        toggleMute,
        setVolume,
        playHover,
        playClick,
        playSuccess,
        playWhoosh,
    };

    return (
        <SoundManagerContext.Provider value={value}>
            {children}
        </SoundManagerContext.Provider>
    );
}

// Hook to use sound manager
export function useSoundManager(): SoundManagerContextType {
    const context = useContext(SoundManagerContext);
    if (!context) {
        // Return noop functions if not in provider
        return {
            isMuted: true,
            volume: 0,
            toggleMute: () => { },
            setVolume: () => { },
            playHover: () => { },
            playClick: () => { },
            playSuccess: () => { },
            playWhoosh: () => { },
        };
    }
    return context;
}
