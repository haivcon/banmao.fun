'use client';

import { useCallback, useState, useEffect } from 'react';

const SOUND_ENABLED_KEY = 'burn-sound-enabled';

export function useSound() {
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Load preference from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(SOUND_ENABLED_KEY);
            if (stored !== null) {
                setSoundEnabled(stored === 'true');
            }
        }
    }, []);

    // Save preference to localStorage
    const toggleSound = useCallback(() => {
        setSoundEnabled(prev => {
            const newValue = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem(SOUND_ENABLED_KEY, String(newValue));
            }
            return newValue;
        });
    }, []);

    const playSound = useCallback((path: string, volume = 0.5) => {
        if (typeof window === 'undefined' || !soundEnabled) return;

        try {
            const audio = new Audio(path);
            audio.volume = volume;
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error('Audio playback failed:', error);
                });
            }
        } catch (e) {
            console.error('Audio init failed', e);
        }
    }, [soundEnabled]);

    const playClick = useCallback(() => {
        playSound('/sounds/click.wav', 0.6);
    }, [playSound]);

    const playHover = useCallback(() => {
        playSound('/sounds/hover.wav', 0.3);
    }, [playSound]);

    const playSuccess = useCallback(() => {
        playSound('/sounds/success.wav', 0.8);
    }, [playSound]);

    const playError = useCallback(() => {
        playSound('/sounds/error.wav', 0.7);
    }, [playSound]);

    return {
        playClick,
        playHover,
        playSuccess,
        playError,
        soundEnabled,
        toggleSound
    };
}
