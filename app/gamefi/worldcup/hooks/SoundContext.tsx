"use client";
import React, { createContext, useContext, useEffect, useState, useRef } from "react";

interface SoundContextType {
    isMuted: boolean;
    toggleMute: () => void;
    playTick: () => void;
    playPop: () => void;
    playSuccess: () => void;
    playError: () => void;
}

const SoundContext = createContext<SoundContextType>({
    isMuted: true,
    toggleMute: () => {},
    playTick: () => {},
    playPop: () => {},
    playSuccess: () => {},
    playError: () => {},
});

export function SoundProvider({ children }: { children: React.ReactNode }) {
    const [isMuted, setIsMuted] = useState(true);
    const audioCtxRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Load preference safely on mount
        const stored = localStorage.getItem('wc_sound_muted');
        if (stored === 'false') {
            setIsMuted(false);
        }
    }, []);

    const toggleMute = () => {
        setIsMuted(prev => {
            const next = !prev;
            localStorage.setItem('wc_sound_muted', String(next));
            
            // Initialize AudioContext on first user interaction if unmuting
            if (!next && !audioCtxRef.current) {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                audioCtxRef.current = new AudioContext();
            }
            
            if (!next && audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume();
            }
            return next;
        });
    };

    const playTone = (freq: number, type: OscillatorType, duration: number, vol = 0.1) => {
        if (isMuted) return;
        if (!audioCtxRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AudioContext();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    };

    const playTick = () => playTone(800, 'sine', 0.05, 0.03);
    const playPop = () => playTone(300, 'triangle', 0.1, 0.05);
    
    const playSuccess = () => {
        if (isMuted) return;
        // Arpeggio: C5, E5, G5, C6
        playTone(523.25, 'sine', 0.1, 0.08);
        setTimeout(() => playTone(659.25, 'sine', 0.1, 0.08), 100);
        setTimeout(() => playTone(783.99, 'sine', 0.15, 0.08), 200);
        setTimeout(() => playTone(1046.50, 'sine', 0.4, 0.12), 300);
    };

    const playError = () => {
        if (isMuted) return;
        playTone(150, 'sawtooth', 0.2, 0.05);
        setTimeout(() => playTone(140, 'sawtooth', 0.4, 0.05), 150);
    };

    return (
        <SoundContext.Provider value={{ isMuted, toggleMute, playTick, playPop, playSuccess, playError }}>
            {children}
        </SoundContext.Provider>
    );
}

export const useSoundFX = () => useContext(SoundContext);
