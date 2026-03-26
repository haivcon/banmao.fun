// lib/sounds.ts - Sound effects for Banmao Miner

// Sound URLs (using public folder paths)
const SOUNDS = {
    // Hook sounds
    hookDrop: '/games/miner/sounds/hook-drop.mp3',
    hookCatch: '/games/miner/sounds/catch.mp3',
    hookReturn: '/games/miner/sounds/return.mp3',

    // Item sounds
    tokenCatch: '/games/miner/sounds/coin.mp3',
    gemCatch: '/games/miner/sounds/gem.mp3',
    jackpotCatch: '/games/miner/sounds/jackpot.mp3',
    rugPull: '/games/miner/sounds/rugpull.mp3',
    airdrop: '/games/miner/sounds/airdrop.mp3',

    // Game sounds
    levelComplete: '/games/miner/sounds/level-complete.mp3',
    gameOver: '/games/miner/sounds/game-over.mp3',
    countdown: '/games/miner/sounds/countdown.mp3',

    // UI sounds
    click: '/games/miner/sounds/click.mp3',
    hover: '/games/miner/sounds/hover.mp3',
};

class SoundManager {
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private enabled: boolean = true;
    private volume: number = 0.5;
    private initialized: boolean = false;

    init() {
        if (this.initialized || typeof window === 'undefined') return;

        // Preload sounds
        Object.entries(SOUNDS).forEach(([key, url]) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = url;
            audio.volume = this.volume;
            this.sounds.set(key, audio);
        });

        this.initialized = true;
    }

    play(soundKey: keyof typeof SOUNDS) {
        if (!this.enabled || typeof window === 'undefined') return;

        try {
            const sound = this.sounds.get(soundKey);
            if (sound) {
                sound.currentTime = 0;
                sound.volume = this.volume;
                sound.play().catch(() => {
                    // Ignore play errors (autoplay policy)
                });
            } else {
                // Fallback: create new audio
                const audio = new Audio(SOUNDS[soundKey]);
                audio.volume = this.volume;
                audio.play().catch(() => { });
            }
        } catch (e) {
            // Silently fail
        }
    }

    // Specific sound methods for convenience
    hookDrop() { this.play('hookDrop'); }
    catchToken() { this.play('tokenCatch'); }
    catchGem() { this.play('gemCatch'); }
    catchJackpot() { this.play('jackpotCatch'); }
    catchRugPull() { this.play('rugPull'); }
    catchAirdrop() { this.play('airdrop'); }
    levelComplete() { this.play('levelComplete'); }
    gameOver() { this.play('gameOver'); }
    countdown() { this.play('countdown'); }
    click() { this.play('click'); }
    hover() { this.play('hover'); }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('miner_sound_enabled', enabled ? '1' : '0');
        }
    }

    isEnabled() {
        return this.enabled;
    }

    setVolume(volume: number) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.sounds.forEach(sound => {
            sound.volume = this.volume;
        });
    }

    loadSettings() {
        if (typeof localStorage === 'undefined') return;
        const saved = localStorage.getItem('miner_sound_enabled');
        if (saved !== null) {
            this.enabled = saved === '1';
        }
        const savedVolume = localStorage.getItem('miner_sound_volume');
        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
        }
    }
}

// Singleton instance
export const soundManager = new SoundManager();

// Initialize on first import (client-side only)
if (typeof window !== 'undefined') {
    soundManager.loadSettings();
    // Delay init until user interaction
    const initOnInteraction = () => {
        soundManager.init();
        window.removeEventListener('click', initOnInteraction);
        window.removeEventListener('touchstart', initOnInteraction);
    };
    window.addEventListener('click', initOnInteraction, { once: true });
    window.addEventListener('touchstart', initOnInteraction, { once: true });
}
