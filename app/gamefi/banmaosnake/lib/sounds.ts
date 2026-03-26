// Sound effects utility for snake game
// Uses Web Audio API for low-latency sounds

class SoundManager {
    private ctx: AudioContext | null = null;
    private enabled = true;

    private getContext(): AudioContext {
        if (typeof window === 'undefined') return null as any;
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.ctx;
    }

    setEnabled(v: boolean) {
        this.enabled = v;
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

    // Hover sound - soft tick
    hover() {
        this.beep(800, 0.05, 'sine', 0.03);
    }

    // Click sound - crisp tap
    click() {
        this.beep(600, 0.08, 'square', 0.05);
    }

    // Eat coin sound - pleasant ding
    eatCoin() {
        this.beep(880, 0.1, 'sine', 0.08);
        setTimeout(() => this.beep(1100, 0.1, 'sine', 0.06), 50);
    }

    // Eat power-up sound - ascending tones
    eatPowerUp() {
        this.beep(440, 0.08, 'square', 0.07);
        setTimeout(() => this.beep(660, 0.08, 'square', 0.06), 60);
        setTimeout(() => this.beep(880, 0.12, 'square', 0.05), 120);
    }

    // Game over sound - descending
    gameOver() {
        this.beep(400, 0.15, 'sawtooth', 0.1);
        setTimeout(() => this.beep(300, 0.15, 'sawtooth', 0.08), 100);
        setTimeout(() => this.beep(200, 0.25, 'sawtooth', 0.06), 200);
    }

    // Start game sound
    start() {
        this.beep(523, 0.1, 'sine', 0.08);
        setTimeout(() => this.beep(659, 0.1, 'sine', 0.08), 100);
        setTimeout(() => this.beep(784, 0.15, 'sine', 0.1), 200);
    }

    // Claim success sound - triumphant
    success() {
        this.beep(523, 0.12, 'sine', 0.1);
        setTimeout(() => this.beep(659, 0.12, 'sine', 0.1), 120);
        setTimeout(() => this.beep(784, 0.12, 'sine', 0.1), 240);
        setTimeout(() => this.beep(1047, 0.2, 'sine', 0.12), 360);
    }
}

export const sounds = new SoundManager();
