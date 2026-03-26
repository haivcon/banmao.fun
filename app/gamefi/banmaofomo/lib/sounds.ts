/**
 * FOMO Game Sound System
 * Audio SFX for immersive gameplay
 */

// Sound file paths
const SOUND_PATH = '/sounds/fomo';

// Sound effects configuration
const soundConfig = {
    tickTock: { src: `${SOUND_PATH}/tick.mp3`, volume: 0.3 },
    attack: { src: `${SOUND_PATH}/attack.mp3`, volume: 0.5 },
    critical: { src: `${SOUND_PATH}/critical.mp3`, volume: 0.7 },
    alarm: { src: `${SOUND_PATH}/alarm.mp3`, volume: 0.6 },
    victory: { src: `${SOUND_PATH}/victory.mp3`, volume: 0.8 },
    claim: { src: `${SOUND_PATH}/claim.mp3`, volume: 0.6 },
    // Using a simple placeholder beat (Base64) so user hears something immediately. 
    // User should replace 'bgm.mp3' in public/sounds/fomo/ for real music.
    bgm: {
        src: 'data:audio/mp3;base64,//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
        volume: 0.2,
        loop: true
    },
    notification: { src: 'data:audio/mp3;base64,//uQxAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABwADDx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fAAAAAAAAD//uQxAAACtsQAAAAAAAEAAJABAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAABFAGAAH4AARAAAAAAAAAAAAAA//uQxAAACtsQAAAAAAAEAAJABAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAABFAGAAH4AARAAAAAAAAAAAAAA//uQxAAACtsQAAAAAAAEAAJABAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAABFAGAAH4AARAAAAAAAAAAAAAA//uQxAAACtsQAAAAAAAEAAJABAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAABFAGAAH4AARAAAAAAAAAAAAAA//uQxAAACtsQAAAAAAAEAAJABAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAABFAGAAH4AARAAAAAAAAAAAAAA', volume: 0.5 }, // Silent placeholder, will be replaced by user file or real URI
};

type SoundName = keyof typeof soundConfig;

class FomoSoundManager {
    private sounds: Map<SoundName, HTMLAudioElement> = new Map();
    private muted: boolean = false;
    private musicMuted: boolean = false; // Separate mute for BGM
    private initialized: boolean = false;
    private synthesis: SpeechSynthesis | null = null;
    private voices: SpeechSynthesisVoice[] = [];

    constructor() {
        if (typeof window === 'undefined') return;
        this.synthesis = window.speechSynthesis;
        if (this.synthesis) {
            // Load voices
            this.voices = this.synthesis.getVoices();
            this.synthesis.onvoiceschanged = () => {
                this.voices = this.synthesis.getVoices();
            };
        }
    }

    private init() {
        if (this.initialized || typeof window === 'undefined') return;

        Object.entries(soundConfig).forEach(([name, config]) => {
            try {
                const audio = new Audio(config.src);
                audio.volume = config.volume;
                audio.preload = 'auto'; // Preload useful sounds
                if ((config as any).loop) audio.loop = true;
                this.sounds.set(name as SoundName, audio);
            } catch (e) {
                console.warn(`Failed to load sound: ${name}`);
            }
        });

        this.initialized = true;
    }

    play(name: SoundName) {
        if (this.muted && name !== 'bgm') return;
        if (this.musicMuted && name === 'bgm') return;

        // Initialize on first interaction
        this.init();

        const sound = this.sounds.get(name);
        if (sound) {
            if (name !== 'bgm') sound.currentTime = 0;
            // BGM handles its own loop/play state usually
            const playPromise = sound.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    // Auto-play policy blocked
                    // console.warn("Audio play blocked", error);
                });
            }
        }
    }

    playLoop(name: SoundName) {
        if (this.muted && name !== 'bgm') return;
        if (this.musicMuted && name === 'bgm') return;

        this.init();
        const sound = this.sounds.get(name);
        if (sound) {
            sound.loop = true;
            sound.play().catch(() => { });
        }
    }

    stop(name: SoundName) {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.pause();
            if (name !== 'bgm') sound.currentTime = 0; // Don't reset BGM time to resume nicely if needed
            // Keep loop state from config
        }
    }

    stopAll() {
        this.sounds.forEach((sound, name) => {
            sound.pause();
            if (name !== 'bgm') sound.currentTime = 0;
        });
        if (this.synthesis) {
            this.synthesis.cancel();
        }
    }

    setMuted(muted: boolean) {
        this.muted = muted;
        if (muted) {
            // Stop SFX, but maybe keep BGM if controlled separately? 
            // For simplicity, this mutes SFX. BGM has separate toggle often.
        }
    }

    setMusicMuted(muted: boolean) {
        this.musicMuted = muted;
        if (muted) {
            this.stop('bgm');
        } else {
            this.play('bgm');
        }
    }

    isMusicMuted() {
        return this.musicMuted;
    }

    isMuted() {
        return this.muted;
    }

    setVolume(name: SoundName, volume: number) {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.volume = Math.max(0, Math.min(1, volume));
        }
    }

    // --- Speech Synthesis ---
    speak(text: string, langCode: string = 'en') {
        if (this.muted || !this.synthesis) return;

        // Cancel previous speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Map simplified lang codes to browser locale
        const localeMap: Record<string, string> = {
            'en': 'en-US',
            'vi': 'vi-VN',
            'zh': 'zh-CN',
            'ko': 'ko-KR',
            'ja': 'ja-JP',
            'ru': 'ru-RU',
            'id': 'id-ID',
            'ms': 'ms-MY',
            'th': 'th-TH',
            'fr': 'fr-FR',
            'es': 'es-ES'
        };

        const targetLocale = localeMap[langCode] || 'en-US';

        // Find best voice
        const voice = this.voices.find(v => v.lang === targetLocale) ||
            this.voices.find(v => v.lang.startsWith(targetLocale.split('-')[0]));

        if (voice) {
            utterance.voice = voice;
        }

        // Adjust pitch/rate for "BanMao" character (slightly higher pitch for cute cat)
        utterance.pitch = 1.2;
        utterance.rate = 1.1;
        utterance.volume = 0.8;

        this.synthesis.speak(utterance);
    }
}

// Singleton instance
export const fomoSounds = new FomoSoundManager();

// Helper functions
export const playAttackSound = () => fomoSounds.play('attack');
export const playCriticalSound = () => fomoSounds.play('critical');
export const playClaimSound = () => fomoSounds.play('claim');
export const playVictorySound = () => fomoSounds.play('victory');
export const playAlarmSound = () => fomoSounds.play('alarm');
export const startTickTock = () => fomoSounds.playLoop('tickTock');
export const stopTickTock = () => fomoSounds.stop('tickTock');

// New helpers
export const playBGM = () => fomoSounds.playLoop('bgm');
export const stopBGM = () => fomoSounds.stop('bgm');
export const toggleBGM = (mute: boolean) => fomoSounds.setMusicMuted(mute);
export const playNotification = () => {
    // We can use a simple beep or the configured notification sound
    const audio = new Audio('/sounds/fomo/notification.mp3');
    // Fallback if file missing (handled in catch, but we want robust here)
    // Actually using the manager is better
    fomoSounds.play('notification');
};

export const speakBanMao = (text: string, lang: string) => fomoSounds.speak(text, lang);

// Play sound based on lucky number
export const playLuckySound = (lucky: number) => {
    if (lucky >= 900) {
        fomoSounds.play('critical');
    } else if (lucky >= 700) {
        fomoSounds.play('attack');
    } else {
        fomoSounds.play('attack');
    }
};

// ===================== Haptic Feedback =====================

interface HapticPattern {
    duration: number | number[];
}

const hapticPatterns: Record<string, HapticPattern> = {
    attack: { duration: 50 },
    luckyHit: { duration: [50, 30, 50] },
    critical: { duration: [100, 50, 100, 50, 100] },
    leaderChange: { duration: [200, 100, 200] },
    combo: { duration: [30, 20, 30, 20, 30] },
    timerWarning: { duration: [50, 50, 50, 50, 50] },
    victory: { duration: [300, 100, 300] },
};

class HapticManager {
    private enabled: boolean = true;

    isSupported(): boolean {
        return typeof window !== 'undefined' && 'vibrate' in navigator;
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    vibrate(pattern: string | number | number[]) {
        if (!this.enabled || !this.isSupported()) return;

        try {
            if (typeof pattern === 'string') {
                const p = hapticPatterns[pattern];
                if (p) {
                    navigator.vibrate(p.duration);
                }
            } else {
                navigator.vibrate(pattern);
            }
        } catch (e) {
            // Vibration not supported
        }
    }

    stop() {
        if (this.isSupported()) {
            navigator.vibrate(0);
        }
    }
}

export const haptics = new HapticManager();

// Haptic helper functions
export const vibrateAttack = () => haptics.vibrate('attack');
export const vibrateLuckyHit = () => haptics.vibrate('luckyHit');
export const vibrateCritical = () => haptics.vibrate('critical');
export const vibrateLeaderChange = () => haptics.vibrate('leaderChange');
export const vibrateCombo = () => haptics.vibrate('combo');
export const vibrateTimerWarning = () => haptics.vibrate('timerWarning');
export const vibrateVictory = () => haptics.vibrate('victory');
