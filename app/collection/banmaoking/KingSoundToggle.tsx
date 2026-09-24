'use client';
import type { Lang } from './i18n';
import { kingControl } from './i18n/controls';
import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { createKingSoundPlayer, KING_SOUND_KEY } from './king-sound';

export default function KingSoundToggle({ lang = 'en' }: { lang?: Lang }) {
  const root = useRef<HTMLButtonElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [player] = useState(createKingSoundPlayer);
  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => {
    // Restoring a preference never autoplays; clicks still require user interaction.
    try {
      const value = localStorage.getItem(KING_SOUND_KEY) === 'true';
      setEnabled(value); player.setEnabled(value);
    } catch { /* Storage is optional. */ }
    const page = root.current?.closest('.king-page');
    const click = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest('button,a,summary');
      if (!control || control === root.current || control.matches(':disabled,[aria-disabled="true"]') || control.closest('fieldset:disabled')) return;
      player.play('click');
    };
    const feedback = (event: Event) => {
      const kind = (event as CustomEvent).detail;
      if (kind === 'success' || kind === 'error') player.play(kind);
    };
    const storage = (event: StorageEvent) => {
      if (event.key !== KING_SOUND_KEY && event.key !== null) return;
      const value = event.key !== null && event.newValue === 'true';
      setEnabled(value); player.setEnabled(value);
    };
    const visibility = () => { if (document.hidden) player.setEnabled(false); else player.setEnabled(enabledRef.current); };
    page?.addEventListener('click', click);
    window.addEventListener('king-sound', feedback);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      page?.removeEventListener('click', click);
      window.removeEventListener('king-sound', feedback);
      window.removeEventListener('storage', storage);
      document.removeEventListener('visibilitychange', visibility);
      player.dispose();
    };
  }, [player]);
  const label = kingControl(lang, "Sound effects");
  return <button ref={root} type="button" className="king-sound-toggle" aria-label={label} title={`${label}: ${enabled ? (kingControl(lang, "On")) : (kingControl(lang, "Off"))}`} aria-pressed={enabled} onClick={() => {
    const next = !enabled;
    setEnabled(next); player.setEnabled(next);
    try { localStorage.setItem(KING_SOUND_KEY, String(next)); } catch { /* Optional preference. */ }
    if (next) player.play('click');
  }}>{enabled ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}</button>;
}
