"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ===================== EASING FUNCTIONS =====================

export const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const easeOutElastic = (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export const easeOutBounce = (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

export const easeOutBack = (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ===================== SOUND MANAGER =====================

export class SoundManager {
    private static audioContext: AudioContext | null = null;
    private static initialized = false;
    private static unlocked = false;

    // Loop tracking for continuous sounds
    private static drumLoopId: NodeJS.Timeout | null = null;
    private static metallicLoopId: NodeJS.Timeout | null = null;

    // Check if sound is muted from localStorage
    private static isMuted(): boolean {
        if (typeof window === 'undefined') return true;
        const storedMuted = localStorage.getItem("banmao_sound_muted");
        return storedMuted === "true";
    }

    static init() {
        if (this.initialized || typeof window === 'undefined') return;
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.initialized = true;

            // Check if audio context is suspended (needs user interaction to unlock)
            if (this.audioContext.state === 'suspended') {
                this.setupUnlockListeners();
            } else {
                this.unlocked = true;
            }
        } catch (e) { /* silent */ }
    }

    // Setup listeners to unlock audio on first user interaction
    private static setupUnlockListeners() {
        const unlock = () => {
            if (this.unlocked || !this.audioContext) return;

            // Resume audio context on user interaction
            this.audioContext.resume().then(() => {
                this.unlocked = true;
                // Play a silent sound to fully unlock
                this.playSilent();
                // Remove listeners after unlock
                document.removeEventListener('click', unlock);
                document.removeEventListener('touchstart', unlock);
                document.removeEventListener('keydown', unlock);
            }).catch(() => { /* silent */ });
        };

        document.addEventListener('click', unlock, { once: false, passive: true });
        document.addEventListener('touchstart', unlock, { once: false, passive: true });
        document.addEventListener('keydown', unlock, { once: false, passive: true });
    }

    // Play a silent sound to unlock audio
    private static playSilent() {
        if (!this.audioContext) return;
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime); // Silent
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.001);
        } catch (e) { /* silent */ }
    }

    static playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) {
        // Check mute state before playing
        if (this.isMuted()) return;

        if (!this.audioContext) this.init();
        if (!this.audioContext || !this.unlocked) return;
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) { /* silent */ }
    }

    // UI Click sound - crisp tap
    static playClick() {
        this.playTone(800, 0.08, 'square', 0.04);
        setTimeout(() => this.playTone(1200, 0.05, 'sine', 0.03), 20);
    }

    // Hover sound - playful bouncy arpeggio (more fun!)
    static playHover() {
        // Ascending happy notes
        this.playTone(523, 0.08, 'sine', 0.03);  // C5
        setTimeout(() => this.playTone(659, 0.08, 'sine', 0.025), 40);  // E5
        setTimeout(() => this.playTone(784, 0.1, 'sine', 0.02), 80);   // G5
    }

    // "Ban-Mao" syllable sounds - cute meow-like tones
    static playBanmao() {
        // "Ban" - rising tone
        this.playTone(392, 0.12, 'sine', 0.06);     // G4
        setTimeout(() => this.playTone(440, 0.1, 'sine', 0.05), 50); // A4
        // "Mao" - descending meow sound
        setTimeout(() => this.playTone(659, 0.15, 'sine', 0.06), 180);  // E5
        setTimeout(() => this.playTone(587, 0.12, 'sine', 0.05), 280);  // D5
        setTimeout(() => this.playTone(523, 0.2, 'sine', 0.04), 380);   // C5
        // Sparkle finish
        setTimeout(() => this.playTone(1047, 0.1, 'sine', 0.03), 500);  // C6
    }

    // "O-K-X" electronic beep sounds
    static playOKX() {
        // "O" - round deep tone
        this.playTone(262, 0.15, 'sine', 0.06);  // C4
        // "K" - sharp click
        setTimeout(() => this.playTone(880, 0.05, 'square', 0.04), 150);  // A5 short
        setTimeout(() => this.playTone(440, 0.08, 'square', 0.03), 180);  // A4
        // "X" - crossing tones (two notes at once)
        setTimeout(() => this.playTone(523, 0.12, 'sawtooth', 0.04), 280);  // C5
        setTimeout(() => this.playTone(784, 0.15, 'sine', 0.03), 320);      // G5
        // Tech finish
        setTimeout(() => this.playTone(1047, 0.08, 'sine', 0.025), 420);    // C6
    }

    // "To-ken Stats" - data analysis beeps
    static playTokenStats() {
        this.playTone(440, 0.1, 'sine', 0.05);     // "To" - A4
        setTimeout(() => this.playTone(523, 0.08, 'sine', 0.045), 100);  // "ken" - C5
        setTimeout(() => this.playTone(659, 0.12, 'sine', 0.05), 220);   // "Stats" - E5
        setTimeout(() => this.playTone(784, 0.1, 'sine', 0.04), 320);    // sparkle - G5
    }

    // "Price Feed" - ticker/stock sounds
    static playPriceFeed() {
        this.playTone(330, 0.12, 'sine', 0.05);    // "Price" - E4
        setTimeout(() => this.playTone(392, 0.1, 'sine', 0.045), 120);   // mid - G4
        setTimeout(() => this.playTone(523, 0.15, 'sine', 0.05), 250);   // "Feed" - C5
        setTimeout(() => this.playTone(659, 0.08, 'sine', 0.035), 380);  // ding - E5
    }

    // "Set-tings" - gear/mechanical clicks
    static playSettings() {
        this.playTone(350, 0.08, 'square', 0.04);   // "Set" - click
        setTimeout(() => this.playTone(440, 0.06, 'square', 0.035), 80);  // second click
        setTimeout(() => this.playTone(550, 0.1, 'sine', 0.045), 160);    // "tings" - ring
        setTimeout(() => this.playTone(660, 0.12, 'sine', 0.04), 260);    // finish
    }

    // "Lan-guage" - global/world sound
    static playLanguage() {
        this.playTone(392, 0.1, 'sine', 0.05);     // "Lan" - G4
        setTimeout(() => this.playTone(440, 0.08, 'sine', 0.045), 100);  // "gu" - A4
        setTimeout(() => this.playTone(523, 0.12, 'sine', 0.05), 200);   // "age" - C5
        setTimeout(() => this.playTone(659, 0.15, 'sine', 0.04), 320);   // world chime - E5
    }

    // "In-stall" - download/install sound
    static playInstall() {
        this.playTone(262, 0.15, 'sine', 0.05);    // "In" - C4 deep
        setTimeout(() => this.playTone(330, 0.1, 'sine', 0.045), 150);   // mid - E4
        setTimeout(() => this.playTone(440, 0.12, 'sine', 0.05), 280);   // "stall" - A4
        setTimeout(() => this.playTone(523, 0.08, 'sine', 0.04), 400);   // complete - C5
        setTimeout(() => this.playTone(784, 0.1, 'sine', 0.035), 480);   // success - G5
    }

    // Mascot Expressions - "Meow!" happy sound
    static playMeow() {
        // Happy meow - ascending cute sounds
        this.playTone(523, 0.1, 'sine', 0.06);      // C5
        setTimeout(() => this.playTone(659, 0.12, 'sine', 0.05), 80);   // E5
        setTimeout(() => this.playTone(784, 0.15, 'sine', 0.06), 180);  // G5
        setTimeout(() => this.playTone(880, 0.08, 'sine', 0.04), 300);  // A5 sparkle
    }

    // Mascot "Excited!" BANMAO rocket sound
    static playExcited() {
        // Excited rapid ascending
        this.playTone(262, 0.08, 'sine', 0.05);     // C4
        setTimeout(() => this.playTone(330, 0.07, 'sine', 0.05), 60);   // E4
        setTimeout(() => this.playTone(392, 0.07, 'sine', 0.05), 120);  // G4
        setTimeout(() => this.playTone(523, 0.08, 'sine', 0.05), 180);  // C5
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.05), 240);   // E5
        setTimeout(() => this.playTone(784, 0.12, 'sine', 0.06), 300);  // G5
        setTimeout(() => this.playTone(1047, 0.15, 'sine', 0.05), 380); // C6 🚀
    }

    // Mascot "Wave" - friendly greeting
    static playWave() {
        // Friendly wave sound
        this.playTone(440, 0.1, 'sine', 0.05);      // A4
        setTimeout(() => this.playTone(523, 0.08, 'sine', 0.045), 100); // C5
        setTimeout(() => this.playTone(440, 0.08, 'sine', 0.04), 200);  // A4
        setTimeout(() => this.playTone(523, 0.12, 'sine', 0.05), 300);  // C5 👋
    }

    // Mascot "Sleepy" - zzz drowsy sound
    static playSleepy() {
        // Descending sleepy tones
        this.playTone(392, 0.2, 'sine', 0.04);      // G4 slow
        setTimeout(() => this.playTone(330, 0.25, 'sine', 0.035), 250); // E4
        setTimeout(() => this.playTone(262, 0.3, 'sine', 0.03), 500);   // C4 💤
    }

    // Success chime
    static playSuccess() {
        this.playTone(523, 0.1, 'sine', 0.05);
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.04), 80);
        setTimeout(() => this.playTone(784, 0.15, 'sine', 0.03), 160);
    }

    // Error/warning sound
    static playError() {
        this.playTone(200, 0.2, 'sawtooth', 0.04);
        setTimeout(() => this.playTone(150, 0.25, 'sawtooth', 0.03), 100);
    }

    // Close panel sound - descending whoosh
    static playClose() {
        this.playTone(523, 0.08, 'sine', 0.04);     // C5
        setTimeout(() => this.playTone(392, 0.08, 'sine', 0.035), 50);  // G4
        setTimeout(() => this.playTone(262, 0.12, 'sine', 0.03), 100);  // C4 soft close
    }

    // Wild drum dance beat - enthusiastic tribal drums for $banmao logo hover 🥁
    static playDrumDance() {
        // Slower tribal drum pattern - rhythmic and groovy!
        this.playTone(80, 0.15, 'square', 0.12);       // Kick drum
        setTimeout(() => this.playTone(150, 0.1, 'square', 0.15), 150);    // Tom
        setTimeout(() => this.playTone(200, 0.08, 'square', 0.12), 280);   // High tom
        setTimeout(() => this.playTone(80, 0.15, 'square', 0.12), 400);    // Kick
        setTimeout(() => this.playTone(300, 0.08, 'sawtooth', 0.1), 520);  // Snare hit
        setTimeout(() => this.playTone(150, 0.1, 'square', 0.12), 650);    // Tom
        setTimeout(() => this.playTone(80, 0.2, 'square', 0.12), 800);     // Deep kick
        setTimeout(() => this.playTone(350, 0.1, 'sawtooth', 0.12), 950);  // Crash
    }

    // Metallic industrial beat - hard metallic sounds for OKX logo hover ⚙️
    static playMetallic() {
        // Slower industrial metal clangs
        this.playTone(120, 0.2, 'sawtooth', 0.1);       // Deep metal clang
        setTimeout(() => this.playTone(800, 0.08, 'square', 0.08), 180);   // High metallic ping
        setTimeout(() => this.playTone(200, 0.15, 'sawtooth', 0.12), 320); // Metal grind
        setTimeout(() => this.playTone(1200, 0.05, 'square', 0.06), 480);  // Spark
        setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.1), 620);   // Heavy clang
        setTimeout(() => this.playTone(600, 0.1, 'square', 0.08), 780);    // Metallic ring
        setTimeout(() => this.playTone(100, 0.25, 'sawtooth', 0.12), 920); // Deep bass hit
    }

    // ===================== CONTINUOUS LOOPING SOUNDS =====================

    // Start continuous drum loop for $banmao logo hover 🥁
    static startDrumLoop() {
        this.stopDrumLoop();
        if (this.isMuted()) return;
        // Play immediately
        this.playDrumDance();
        // Then repeat every 1200ms (slower tempo)
        this.drumLoopId = setInterval(() => {
            this.playDrumDance();
        }, 1200);
    }

    // Stop drum loop
    static stopDrumLoop() {
        if (this.drumLoopId) {
            clearInterval(this.drumLoopId);
            this.drumLoopId = null;
        }
    }

    // Start continuous metallic loop for OKX logo hover ⚙️
    static startMetallicLoop() {
        this.stopMetallicLoop();
        if (this.isMuted()) return;
        // Play immediately
        this.playMetallic();
        // Then repeat every 1200ms (slower tempo)
        this.metallicLoopId = setInterval(() => {
            this.playMetallic();
        }, 1200);
    }

    // Stop metallic loop
    static stopMetallicLoop() {
        if (this.metallicLoopId) {
            clearInterval(this.metallicLoopId);
            this.metallicLoopId = null;
        }
    }

    // ===================== BLACK HOLE VORTEX SOUND =====================

    private static vortexLoopId: NodeJS.Timeout | null = null;

    // Single vortex/whoosh sound - deep rumbling like water swirling
    static playVortex() {
        // Deep bass rumble
        this.playTone(60, 0.4, 'sawtooth', 0.12);
        // Swirling mid tone
        setTimeout(() => this.playTone(100, 0.35, 'triangle', 0.1), 100);
        // Higher swirl
        setTimeout(() => this.playTone(150, 0.3, 'sawtooth', 0.08), 200);
        // Descending whoosh
        setTimeout(() => this.playTone(80, 0.4, 'sawtooth', 0.1), 350);
        // Deep rumble finish
        setTimeout(() => this.playTone(50, 0.5, 'triangle', 0.15), 500);
    }

    // Start continuous vortex loop for black hole hover 🌀
    static startVortexLoop() {
        this.stopVortexLoop();
        if (this.isMuted()) return;
        this.playVortex();
        this.vortexLoopId = setInterval(() => {
            this.playVortex();
        }, 700);
    }

    // Stop vortex loop
    static stopVortexLoop() {
        if (this.vortexLoopId) {
            clearInterval(this.vortexLoopId);
            this.vortexLoopId = null;
        }
    }

    // Suction/implosion sound for when data is cleared
    static playSuction() {
        // Dramatic building rumble
        this.playTone(80, 0.2, 'sawtooth', 0.15);
        setTimeout(() => this.playTone(100, 0.2, 'sawtooth', 0.15), 150);
        setTimeout(() => this.playTone(130, 0.2, 'sawtooth', 0.12), 300);
        setTimeout(() => this.playTone(180, 0.2, 'sawtooth', 0.1), 450);
        // Big bass drop
        setTimeout(() => this.playTone(40, 0.6, 'square', 0.2), 600);
        setTimeout(() => this.playTone(30, 0.8, 'sawtooth', 0.18), 700);
        // Final deep boom
        setTimeout(() => this.playTone(25, 1.0, 'triangle', 0.15), 900);
    }

    // Pie chart segment hover - pitch varies by percentage (0-100)
    static playPieHover(percent: number) {
        // Map percent (0-100) to frequency (300-1000 Hz)
        const baseFreq = 300;
        const maxFreq = 1000;
        const freq = baseFreq + (percent / 100) * (maxFreq - baseFreq);
        this.playTone(freq, 0.08, 'sine', 0.03);
        // Add a subtle harmonic
        setTimeout(() => this.playTone(freq * 1.5, 0.06, 'sine', 0.02), 30);
    }

    // Whoosh for transitions
    static playWhoosh() {
        if (!this.audioContext) this.init();
        if (!this.audioContext || !this.unlocked) return;
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.15);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.03, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        } catch (e) { /* silent */ }
    }

    // Pop sound for spawn
    static playPop() {
        this.playTone(300, 0.05, 'sine', 0.06);
        setTimeout(() => this.playTone(500, 0.08, 'sine', 0.04), 15);
    }

    // ===================== CUBE ANIMATION SOUNDS =====================

    private static touringLoopId: NodeJS.Timeout | null = null;
    private static spinningLoopId: NodeJS.Timeout | null = null;
    private static formingLoopId: NodeJS.Timeout | null = null;

    // Touring sound - magical floating ambient (for 8s touring phase)
    static playTouringNote() {
        // Gentle magical tones - like wind chimes
        const notes = [523, 659, 784, 880, 1047]; // C5, E5, G5, A5, C6
        const note = notes[Math.floor(Math.random() * notes.length)];
        this.playTone(note, 0.4, 'sine', 0.03);
        setTimeout(() => this.playTone(note * 1.5, 0.3, 'sine', 0.02), 200);
    }

    // Start touring ambient loop
    static startTouringLoop() {
        this.stopTouringLoop();
        if (this.isMuted()) return;
        this.playTouringNote();
        this.touringLoopId = setInterval(() => {
            this.playTouringNote();
        }, 800); // Play every 800ms for ambient feel
    }

    // Stop touring loop
    static stopTouringLoop() {
        if (this.touringLoopId) {
            clearInterval(this.touringLoopId);
            this.touringLoopId = null;
        }
    }

    // Spinning sound - accelerating whoosh (for 6s spinning phase)
    static playSpinningNote() {
        // Whooshing circular tones
        this.playTone(150, 0.2, 'sawtooth', 0.06);
        setTimeout(() => this.playTone(200, 0.15, 'sawtooth', 0.05), 100);
        setTimeout(() => this.playTone(250, 0.15, 'sawtooth', 0.04), 180);
    }

    // Start spinning loop (accelerates over time)
    static startSpinningLoop() {
        this.stopSpinningLoop();
        if (this.isMuted()) return;
        let interval = 400;
        const spin = () => {
            this.playSpinningNote();
            interval = Math.max(150, interval - 30); // Speed up
            this.spinningLoopId = setTimeout(spin, interval) as unknown as NodeJS.Timeout;
        };
        spin();
    }

    // Stop spinning loop
    static stopSpinningLoop() {
        if (this.spinningLoopId) {
            clearTimeout(this.spinningLoopId);
            this.spinningLoopId = null;
        }
    }

    // Text forming sound - building/assembly (for 3s text formation)
    static playFormingNote() {
        // Crystallizing/materializing sounds
        const freq = 300 + Math.random() * 400;
        this.playTone(freq, 0.15, 'sine', 0.04);
        setTimeout(() => this.playTone(freq * 1.2, 0.1, 'triangle', 0.03), 50);
    }

    // Start text forming loop
    static startFormingLoop() {
        this.stopFormingLoop();
        if (this.isMuted()) return;
        this.playFormingNote();
        this.formingLoopId = setInterval(() => {
            this.playFormingNote();
        }, 200); // Forming assembly effect
    }

    // Stop forming loop
    static stopFormingLoop() {
        if (this.formingLoopId) {
            clearInterval(this.formingLoopId);
            this.formingLoopId = null;
        }
    }

    // Text complete - celebration fanfare
    static playTextComplete() {
        // Triumphant chord
        this.playTone(523, 0.3, 'sine', 0.05);  // C5
        this.playTone(659, 0.3, 'sine', 0.04);  // E5
        this.playTone(784, 0.3, 'sine', 0.04);  // G5
        setTimeout(() => {
            this.playTone(880, 0.25, 'sine', 0.04);  // A5
            this.playTone(1047, 0.4, 'sine', 0.05); // C6
        }, 200);
        // Sparkle finish
        setTimeout(() => this.playTone(1319, 0.2, 'sine', 0.03), 400); // E6
        setTimeout(() => this.playTone(1568, 0.15, 'sine', 0.025), 500); // G6
    }

    // Scatter explosion sound
    static playScatter() {
        // Explosive scatter
        this.playTone(200, 0.2, 'sawtooth', 0.08);
        this.playTone(100, 0.3, 'square', 0.1);
        setTimeout(() => {
            this.playTone(400, 0.15, 'sawtooth', 0.05);
            this.playTone(600, 0.1, 'triangle', 0.04);
        }, 80);
        setTimeout(() => this.playTone(800, 0.1, 'sine', 0.03), 150);
        setTimeout(() => this.playTone(300, 0.2, 'sawtooth', 0.04), 220);
    }

    // Moon arrival - epic crescendo for "WE GO MOON"
    static playMoonArrival() {
        // Deep space bass
        this.playTone(60, 0.6, 'sawtooth', 0.12);
        setTimeout(() => this.playTone(80, 0.5, 'sawtooth', 0.1), 200);
        // Rising tones
        setTimeout(() => this.playTone(200, 0.4, 'sine', 0.08), 400);
        setTimeout(() => this.playTone(400, 0.35, 'sine', 0.07), 600);
        setTimeout(() => this.playTone(600, 0.3, 'sine', 0.06), 800);
        // Triumphant arrival
        setTimeout(() => {
            this.playTone(784, 0.5, 'sine', 0.08);  // G5
            this.playTone(987, 0.5, 'sine', 0.07);  // B5
            this.playTone(1175, 0.5, 'sine', 0.06); // D6
        }, 1000);
        // Sparkle shower
        setTimeout(() => this.playTone(1568, 0.3, 'sine', 0.04), 1300);
        setTimeout(() => this.playTone(1976, 0.25, 'sine', 0.03), 1450);
        setTimeout(() => this.playTone(2349, 0.2, 'sine', 0.025), 1600);
    }
}

// ===================== SPAWN ANIMATION HOOK =====================

export function useSpawnAnimation(
    ref: React.RefObject<THREE.Object3D>,
    options: {
        delay?: number;
        duration?: number;
        playSound?: boolean;
    } = {}
) {
    const { delay = 0, duration = 0.8, playSound = true } = options;
    const progress = useRef(0);
    const started = useRef(false);
    const startTime = useRef(0);

    useEffect(() => {
        if (playSound) SoundManager.init();
    }, [playSound]);

    useFrame((state) => {
        if (!ref.current) return;

        if (!started.current) {
            if (startTime.current === 0) startTime.current = state.clock.elapsedTime;
            if (state.clock.elapsedTime - startTime.current < delay) {
                ref.current.scale.setScalar(0.01);
                return;
            }
            started.current = true;
            if (playSound) SoundManager.playPop();
        }

        if (progress.current < 1) {
            progress.current = Math.min(progress.current + (1 / 60) / duration, 1);
            const scale = easeOutElastic(progress.current);
            ref.current.scale.setScalar(scale);
        }
    });

    return { isComplete: progress.current >= 1 };
}

// ===================== HOVER GLOW COMPONENT =====================

interface HoverGlowProps {
    size: number;
    color: string;
    intensity: number;
    isHovered: boolean;
    shape?: 'sphere' | 'cylinder' | 'ring';
    height?: number;
}

export function HoverGlow({ size, color, intensity, isHovered, shape = 'sphere', height = 0.1 }: HoverGlowProps) {
    const glowRef = useRef<THREE.Mesh>(null);
    const currentIntensity = useRef(0);

    useFrame(() => {
        if (!glowRef.current) return;
        const target = isHovered ? intensity : intensity * 0.3;
        currentIntensity.current += (target - currentIntensity.current) * 0.1;
        const mat = glowRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = currentIntensity.current;

        const targetScale = isHovered ? 1.15 : 1.05;
        glowRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    });

    return (
        <mesh ref={glowRef}>
            {shape === 'sphere' && <sphereGeometry args={[size, 32, 32]} />}
            {shape === 'cylinder' && <cylinderGeometry args={[size, size, height, 32]} />}
            {shape === 'ring' && <ringGeometry args={[size * 0.9, size * 1.1, 64]} />}
            <meshBasicMaterial
                color={color}
                transparent
                opacity={0}
                side={THREE.BackSide}
            />
        </mesh>
    );
}

// ===================== PULSE RING COMPONENT =====================

interface PulseRingProps {
    size: number;
    color: string;
    speed?: number;
    count?: number;
}

export function PulseRing({ size, color, speed = 1, count = 3 }: PulseRingProps) {
    const ringsRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!ringsRef.current) return;
        const time = state.clock.elapsedTime * speed;

        ringsRef.current.children.forEach((ring, i) => {
            const offset = (i / count) * Math.PI * 2;
            const progress = ((time + offset) % (Math.PI * 2)) / (Math.PI * 2);
            const scale = 1 + progress * 0.5;
            const opacity = (1 - progress) * 0.5;

            ring.scale.setScalar(scale);
            (ring as THREE.Mesh).material = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity,
                side: THREE.DoubleSide,
            });
        });
    });

    return (
        <group ref={ringsRef}>
            {Array.from({ length: count }).map((_, i) => (
                <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[size * 0.9, size, 64]} />
                    <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </group>
    );
}

// ===================== PARTICLE BURST COMPONENT =====================

interface ParticleBurstProps {
    colors: string[];
    count?: number;
    trigger: boolean;
    onComplete?: () => void;
}

export function ParticleBurst({ colors, count = 30, trigger, onComplete }: ParticleBurstProps) {
    const particlesRef = useRef<THREE.Group>(null);
    const particles = useMemo(() => {
        if (!trigger) return [];
        return Array.from({ length: count }).map(() => ({
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 2 + 1,
                (Math.random() - 0.5) * 3
            ),
            rotSpeed: (Math.random() - 0.5) * 8,
            color: colors[Math.floor(Math.random() * colors.length)],
            scale: 0.03 + Math.random() * 0.04,
            life: 1,
        }));
    }, [trigger, count, colors]);

    useFrame((_, delta) => {
        if (!particlesRef.current || !trigger) return;

        let allDead = true;
        particlesRef.current.children.forEach((child, i) => {
            const mesh = child as THREE.Mesh;
            const p = particles[i];
            if (!p || p.life <= 0) return;

            mesh.position.x += p.velocity.x * delta;
            mesh.position.y += p.velocity.y * delta;
            mesh.position.z += p.velocity.z * delta;
            p.velocity.y -= 6 * delta;
            mesh.rotation.z += p.rotSpeed * delta;
            p.life -= delta * 1.5;

            const mat = mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = Math.max(0, p.life);

            if (p.life > 0) allDead = false;
        });

        if (allDead && onComplete) onComplete();
    });

    if (!trigger) return null;

    return (
        <group ref={particlesRef}>
            {particles.map((p, i) => (
                <mesh key={i} scale={p.scale}>
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial color={p.color} transparent opacity={1} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </group>
    );
}

// ===================== NEON BORDER COMPONENT =====================

interface NeonBorderProps {
    width: number;
    height: number;
    color: string;
    intensity?: number;
    animated?: boolean;
}

export function NeonBorder({ width, height, color, intensity = 0.8, animated = true }: NeonBorderProps) {
    const borderRef = useRef<THREE.Group>(null);
    const currentOpacity = useRef(intensity);

    useFrame((state) => {
        if (!borderRef.current || !animated) return;
        const pulse = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
        currentOpacity.current = intensity * (0.7 + pulse);

        borderRef.current.children.forEach((child) => {
            const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
            mat.opacity = currentOpacity.current;
        });
    });

    const thickness = 0.02;

    return (
        <group ref={borderRef}>
            {/* Top */}
            <mesh position={[0, height / 2, 0]}>
                <planeGeometry args={[width, thickness]} />
                <meshBasicMaterial color={color} transparent opacity={intensity} />
            </mesh>
            {/* Bottom */}
            <mesh position={[0, -height / 2, 0]}>
                <planeGeometry args={[width, thickness]} />
                <meshBasicMaterial color={color} transparent opacity={intensity} />
            </mesh>
            {/* Left */}
            <mesh position={[-width / 2, 0, 0]}>
                <planeGeometry args={[thickness, height]} />
                <meshBasicMaterial color={color} transparent opacity={intensity} />
            </mesh>
            {/* Right */}
            <mesh position={[width / 2, 0, 0]}>
                <planeGeometry args={[thickness, height]} />
                <meshBasicMaterial color={color} transparent opacity={intensity} />
            </mesh>
            {/* Glow layers */}
            <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[width + 0.08, height + 0.08]} />
                <meshBasicMaterial color={color} transparent opacity={intensity * 0.2} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// ===================== CLICK RIPPLE COMPONENT =====================

interface ClickRippleProps {
    size: number;
    color: string;
    trigger: boolean;
    onComplete?: () => void;
}

export function ClickRipple({ size, color, trigger, onComplete }: ClickRippleProps) {
    const rippleRef = useRef<THREE.Mesh>(null);
    const progress = useRef(0);
    const active = useRef(false);

    useEffect(() => {
        if (trigger && !active.current) {
            active.current = true;
            progress.current = 0;
        }
    }, [trigger]);

    useFrame(() => {
        if (!rippleRef.current || !active.current) return;

        progress.current += 0.05;
        const scale = 1 + progress.current * 2;
        const opacity = Math.max(0, 1 - progress.current);

        rippleRef.current.scale.setScalar(scale);
        (rippleRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.5;

        if (progress.current >= 1) {
            active.current = false;
            if (onComplete) onComplete();
        }
    });

    if (!active.current && !trigger) return null;

    return (
        <mesh ref={rippleRef} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[size * 0.8, size, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
    );
}

// ===================== FLOATING ANIMATION HOOK =====================

export function useFloatingAnimation(
    ref: React.RefObject<THREE.Object3D>,
    options: {
        amplitude?: number;
        speed?: number;
        rotationSpeed?: number;
    } = {}
) {
    const { amplitude = 0.1, speed = 1, rotationSpeed = 0 } = options;
    const baseY = useRef<number | null>(null);

    useFrame((state) => {
        if (!ref.current) return;
        if (baseY.current === null) baseY.current = ref.current.position.y;

        const time = state.clock.elapsedTime * speed;
        ref.current.position.y = baseY.current + Math.sin(time) * amplitude;

        if (rotationSpeed) {
            ref.current.rotation.y += rotationSpeed * 0.01;
        }
    });
}

// ===================== THEME COLORS =====================

export const THEME_COLORS = {
    gold: {
        primary: "#FFD700",
        secondary: "#FFA500",
        glow: "#FFFACD",
        accent: "#FF6347",
        confetti: ["#FFD700", "#FFA500", "#FF6347", "#FFE4B5", "#FFFACD"],
    },
    cyber: {
        primary: "#00F3FF",
        secondary: "#00BFFF",
        glow: "#E0FFFF",
        accent: "#FF00FF",
        confetti: ["#00F3FF", "#00BFFF", "#87CEEB", "#E0FFFF", "#FF69B4"],
    },
};

export function useThemeColors(theme: string) {
    return useMemo(() => theme === "gold" ? THEME_COLORS.gold : THEME_COLORS.cyber, [theme]);
}
