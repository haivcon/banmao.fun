// BANMAO SLOTS - Sound Effects
// Uses Web Audio API for low-latency casino sounds

class SlotsSoundManager {
    private ctx: AudioContext | null = null;
    private enabled = true;
    private spinningOscillator: OscillatorNode | null = null;
    private spinningGain: GainNode | null = null;

    private getContext(): AudioContext {
        if (typeof window === 'undefined') return null as any;
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.ctx;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    setEnabled(v: boolean) {
        this.enabled = v;
        if (!v) {
            this.stopSpinning();
        }
    }

    toggle(): boolean {
        this.setEnabled(!this.enabled);
        return this.enabled;
    }

    // Create a simple beep sound
    private beep(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(frequency, ctx.currentTime);
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            // Audio context not available
        }
    }

    // Play a sequence of notes
    private playSequence(notes: { freq: number; duration: number; delay: number; type?: OscillatorType; volume?: number }[]) {
        notes.forEach(note => {
            setTimeout(() => {
                this.beep(note.freq, note.duration, note.type || 'sine', note.volume || 0.1);
            }, note.delay);
        });
    }

    // ==================== UI SOUNDS ====================

    // Hover sound - soft tick
    hover() {
        this.beep(600, 0.03, 'sine', 0.02);
    }

    // Click sound - crisp tap
    click() {
        this.beep(800, 0.06, 'square', 0.04);
    }

    // Tick sound - clock-like mechanical tick for rotation
    tick() {
        this.beep(1000, 0.03, 'square', 0.03);
        setTimeout(() => this.beep(600, 0.02, 'sine', 0.02), 15);
    }

    // ==================== GAME SOUNDS ====================

    // Start spinning - continuous coin/metallic sound
    startSpinning() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            this.stopSpinning();

            this.spinningGain = ctx.createGain();
            this.spinningGain.connect(ctx.destination);

            // Create multiple oscillators for a rich metallic "jingling" texture
            const frequencies = [1200, 1500, 1800, 2200];
            const oscillators: OscillatorNode[] = [];

            frequencies.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                osc.type = i % 2 === 0 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, ctx.currentTime);

                // Modulate frequency slightly for "spinning" movement
                const lfo = ctx.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = 8 + (i * 2); // Fast wobbling
                const lfoGain = ctx.createGain();
                lfoGain.gain.value = 50;

                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfo.start();

                // Connect to main gain
                const oscGain = ctx.createGain();
                oscGain.gain.value = 0.05 / frequencies.length;
                osc.connect(oscGain);
                oscGain.connect(this.spinningGain!);

                osc.start();
                oscillators.push(osc);
            });

            // Pulse volume for rhythmic "spinning" feel
            this.spinningGain.gain.setValueAtTime(0.05, ctx.currentTime);
            const now = ctx.currentTime;
            for (let i = 0; i < 100; i++) { // Loop effect for a few seconds
                this.spinningGain.gain.linearRampToValueAtTime(0.1, now + (i * 0.1));
                this.spinningGain.gain.linearRampToValueAtTime(0.02, now + (i * 0.1) + 0.05);
            }

            // Store for cleanup (simplified for this array approach)
            // In a real implementation we'd track all nodes, but for now we just stop the gain to silence it
            // detailed cleanup would require an array of nodes in the class, but standard stopSpinning handles the gain disconnect.
        } catch (e) {
            console.error('Failed to start spinning sound', e);
        }
    }

    // Stop spinning sound
    stopSpinning() {
        try {
            if (this.spinningOscillator) {
                this.spinningOscillator.stop();
                this.spinningOscillator.disconnect();
                this.spinningOscillator = null;
            }
            if (this.spinningGain) {
                this.spinningGain.disconnect();
                this.spinningGain = null;
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    }

    // Reel stop sound - mechanical click
    reelStop(reelIndex: number) {
        if (!this.enabled) return;
        // Different pitch for each reel to give satisfying cascade
        const baseFreq = 300 + (reelIndex * 50);
        this.beep(baseFreq, 0.08, 'square', 0.06);
        setTimeout(() => this.beep(baseFreq * 0.8, 0.05, 'sine', 0.03), 30);
    }

    // All reels stopped - final thud
    allReelsStopped() {
        this.stopSpinning();
        this.beep(150, 0.15, 'triangle', 0.08);
    }

    // ==================== RESULT SOUNDS ====================

    // Small win - pleasant chime
    smallWin() {
        if (!this.enabled) return;
        this.playSequence([
            { freq: 523, duration: 0.1, delay: 0 },      // C5
            { freq: 659, duration: 0.1, delay: 80 },     // E5
            { freq: 784, duration: 0.15, delay: 160 },   // G5
        ]);
    }

    // Medium win - longer celebration
    mediumWin() {
        if (!this.enabled) return;
        this.playSequence([
            { freq: 523, duration: 0.1, delay: 0, volume: 0.1 },      // C5
            { freq: 659, duration: 0.1, delay: 80, volume: 0.1 },     // E5
            { freq: 784, duration: 0.1, delay: 160, volume: 0.12 },   // G5
            { freq: 1047, duration: 0.15, delay: 240, volume: 0.12 }, // C6
            { freq: 784, duration: 0.1, delay: 350, volume: 0.1 },    // G5
            { freq: 1047, duration: 0.2, delay: 430, volume: 0.15 },  // C6
        ]);
    }

    // Big win - epic celebration
    bigWin() {
        if (!this.enabled) return;
        this.playSequence([
            // Triumphant fanfare
            { freq: 392, duration: 0.1, delay: 0, volume: 0.12 },      // G4
            { freq: 523, duration: 0.1, delay: 100, volume: 0.12 },    // C5
            { freq: 659, duration: 0.1, delay: 200, volume: 0.12 },    // E5
            { freq: 784, duration: 0.15, delay: 300, volume: 0.14 },   // G5
            { freq: 1047, duration: 0.2, delay: 450, volume: 0.15 },   // C6
            // Sparkle effect
            { freq: 1319, duration: 0.08, delay: 600, type: 'sine', volume: 0.08 },
            { freq: 1568, duration: 0.08, delay: 680, type: 'sine', volume: 0.08 },
            { freq: 2093, duration: 0.12, delay: 760, type: 'sine', volume: 0.1 },
        ]);
    }

    // Jackpot!!! - Ultimate celebration
    jackpot() {
        if (!this.enabled) return;

        // Epic ascending fanfare
        this.playSequence([
            // Build up
            { freq: 262, duration: 0.15, delay: 0, type: 'sawtooth', volume: 0.1 },     // C4
            { freq: 330, duration: 0.15, delay: 150, type: 'sawtooth', volume: 0.1 },   // E4
            { freq: 392, duration: 0.15, delay: 300, type: 'sawtooth', volume: 0.12 },  // G4
            { freq: 523, duration: 0.2, delay: 450, type: 'sawtooth', volume: 0.12 },   // C5

            // Triumphant chord
            { freq: 523, duration: 0.3, delay: 700, type: 'sine', volume: 0.12 },   // C5
            { freq: 659, duration: 0.3, delay: 700, type: 'sine', volume: 0.1 },    // E5
            { freq: 784, duration: 0.3, delay: 700, type: 'sine', volume: 0.1 },    // G5

            // Sparkle cascade
            { freq: 1047, duration: 0.1, delay: 1000, type: 'sine', volume: 0.08 },
            { freq: 1319, duration: 0.1, delay: 1080, type: 'sine', volume: 0.08 },
            { freq: 1568, duration: 0.1, delay: 1160, type: 'sine', volume: 0.08 },
            { freq: 2093, duration: 0.15, delay: 1240, type: 'sine', volume: 0.1 },

            // Final triumphant note
            { freq: 1047, duration: 0.4, delay: 1400, type: 'sine', volume: 0.12 },
            { freq: 523, duration: 0.4, delay: 1400, type: 'triangle', volume: 0.08 },
        ]);
    }
    // ==================== SPECIAL SOUNDS ====================

    // Approve transaction
    approve() {
        this.beep(880, 0.1, 'sine', 0.06);
        setTimeout(() => this.beep(1100, 0.12, 'sine', 0.08), 80);
    }

    // Transaction success
    success() {
        this.playSequence([
            { freq: 523, duration: 0.1, delay: 0, volume: 0.08 },
            { freq: 659, duration: 0.1, delay: 100, volume: 0.08 },
            { freq: 784, duration: 0.15, delay: 200, volume: 0.1 },
        ]);
    }

    // Error/failure sound
    error() {
        this.beep(200, 0.2, 'sawtooth', 0.08);
    }

    // Coin/token sound
    coin() {
        this.beep(1200, 0.08, 'sine', 0.06);
        setTimeout(() => this.beep(1500, 0.1, 'sine', 0.05), 60);
    }

    // ==================== LEVER SOUNDS ====================

    // Lever pull sound - mechanical clunk with metallic resonance
    leverPull() {
        if (!this.enabled) return;
        // Low frequency mechanical "clunk"
        this.beep(120, 0.15, 'square', 0.12);
        // Metallic resonance
        setTimeout(() => this.beep(400, 0.08, 'triangle', 0.06), 30);
        // Spring tension sound
        setTimeout(() => this.beep(800, 0.05, 'sine', 0.04), 60);
        // Impact at bottom
        setTimeout(() => {
            this.beep(80, 0.1, 'square', 0.08);
            this.beep(200, 0.08, 'triangle', 0.05);
        }, 150);
    }

    // Lever release sound - spring bounce with mechanical snap
    leverRelease() {
        if (!this.enabled) return;
        // Spring release - ascending tones
        this.playSequence([
            { freq: 200, duration: 0.05, delay: 0, type: 'square', volume: 0.06 },
            { freq: 350, duration: 0.04, delay: 40, type: 'triangle', volume: 0.05 },
            { freq: 500, duration: 0.04, delay: 80, type: 'sine', volume: 0.04 },
            { freq: 300, duration: 0.06, delay: 120, type: 'triangle', volume: 0.05 }, // Bounce back
            { freq: 150, duration: 0.08, delay: 180, type: 'square', volume: 0.04 }, // Final settle
        ]);
    }

    // ==================== WIN/LOSE SOUNDS ====================

    // Win sound - intensity based on match count (3, 4, or 5 matches)
    win(matchCount: number = 3) {
        if (!this.enabled) return;

        if (matchCount >= 5) {
            // JACKPOT! 5 matches - epic celebration
            this.playSequence([
                { freq: 523, duration: 0.1, delay: 0, volume: 0.12 },     // C5
                { freq: 659, duration: 0.1, delay: 80, volume: 0.12 },   // E5
                { freq: 784, duration: 0.1, delay: 160, volume: 0.12 },  // G5
                { freq: 1047, duration: 0.2, delay: 240, volume: 0.15 }, // C6
                { freq: 1319, duration: 0.15, delay: 380, volume: 0.12 }, // E6
                { freq: 1568, duration: 0.25, delay: 500, volume: 0.14 }, // G6
                { freq: 2093, duration: 0.4, delay: 700, volume: 0.1 },  // C7 - triumphant peak
            ]);
            // Add shimmer overtones
            setTimeout(() => {
                this.beep(2500, 0.2, 'sine', 0.04);
                this.beep(3000, 0.15, 'sine', 0.03);
            }, 600);
        } else if (matchCount === 4) {
            // 4 matches - big win celebration
            this.playSequence([
                { freq: 440, duration: 0.1, delay: 0, volume: 0.1 },    // A4
                { freq: 554, duration: 0.1, delay: 100, volume: 0.1 }, // C#5
                { freq: 659, duration: 0.1, delay: 200, volume: 0.1 }, // E5
                { freq: 880, duration: 0.2, delay: 300, volume: 0.12 }, // A5
                { freq: 1047, duration: 0.25, delay: 480, volume: 0.1 }, // C6
            ]);
        } else {
            // 3 matches - small win
            this.playSequence([
                { freq: 392, duration: 0.1, delay: 0, volume: 0.08 },   // G4
                { freq: 494, duration: 0.1, delay: 100, volume: 0.08 }, // B4
                { freq: 587, duration: 0.15, delay: 200, volume: 0.1 }, // D5
            ]);
        }
    }

    // Lose sound - sad descending tone
    lose() {
        if (!this.enabled) return;
        this.playSequence([
            { freq: 300, duration: 0.15, delay: 0, type: 'triangle', volume: 0.06 },
            { freq: 250, duration: 0.15, delay: 120, type: 'triangle', volume: 0.05 },
            { freq: 200, duration: 0.2, delay: 240, type: 'triangle', volume: 0.04 },
        ]);
    }

    // No match sound - neutral feedback
    noMatch() {
        if (!this.enabled) return;
        this.beep(180, 0.12, 'sine', 0.04);
        setTimeout(() => this.beep(150, 0.15, 'sine', 0.03), 100);
    }
}

export const slotsSounds = new SlotsSoundManager();
