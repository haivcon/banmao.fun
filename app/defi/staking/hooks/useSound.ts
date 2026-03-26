'use client';

import { useCallback } from 'react';

export function useSound() {
    const playSound = useCallback((path: string, volume = 0.5) => {
        if (typeof window === 'undefined') return;

        try {
            const audio = new Audio(path);
            audio.volume = volume;
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // console.log('Audio played successfully');
                }).catch(error => {
                    console.error('Audio playback failed:', error);
                    console.error('Path was:', path);
                });
            }
        } catch (e) {
            console.error('Audio init failed', e);
        }
    }, []);

    const playClick = useCallback(() => {
        // console.log('Playing click sound');
        playSound('/sounds/click.wav', 1.0);
    }, [playSound]);

    const playHover = useCallback(() => {
        // console.log('Playing hover sound'); 
        playSound('/sounds/hover.wav', 0.4);
    }, [playSound]);

    const playSuccess = useCallback(() => playSound('/sounds/success.wav', 1.0), [playSound]);
    const playError = useCallback(() => playSound('/sounds/error.wav', 0.8), [playSound]);

    return { playClick, playHover, playSuccess, playError };

    return { playClick, playHover, playSuccess, playError };
}
