export type KingSound = 'click' | 'success' | 'error';
export const KING_SOUND_KEY = 'king-sound-enabled';

/** Route-owned player: no audio allocation until an explicit user interaction. */
export function createKingSoundPlayer() {
  let enabled = false;
  let interacted = false;
  let audio: HTMLAudioElement | undefined;
  let lastClick = -Infinity;
  return {
    setEnabled(value: boolean) {
      enabled = value;
      if (!value) audio?.pause();
    },
    play(kind: KingSound) {
      if (!enabled || typeof document === 'undefined' || document.hidden) return;
      if (kind === 'click') interacted = true;
      if (!interacted) return;
      const now = Date.now();
      if (kind === 'click' && now - lastClick < 100) return;
      if (kind === 'click') lastClick = now;
      try {
        audio?.pause();
        audio = new Audio(`/sounds/${kind}.wav`);
        audio.volume = kind === 'click' ? 0.25 : 0.4;
        void audio.play().catch(() => { /* Audio is optional; never interrupt UI or transactions. */ });
      } catch { /* Unsupported audio must not block the action. */ }
    },
    dispose() {
      enabled = false;
      audio?.pause();
      audio = undefined;
    },
  };
}

export function notifyKingSound(kind: Exclude<KingSound, 'click'>) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('king-sound', { detail: kind }));
}
