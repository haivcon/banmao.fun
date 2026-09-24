'use client';
import { useEffect, useState } from 'react';
import type { BanmaoKingTraitSelection } from './traits';

// Keep the renderer and its large artwork tables out of the initial UI chunk.
// The module loader caches successful imports; failed loads can be retried.
export function useKingPreview(traits: BanmaoKingTraitSelection, tokenId: number, prefix: string, enabled = true) {
  const { body, expression, accessory, background } = traits;
  const key = `${body}:${expression}:${accessory}:${background}:${tokenId}:${prefix}`;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; markup: string; failed: boolean }>();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void import('./smil-preview').then(({ previewSvg }) => {
      const markup = previewSvg({ body, expression, accessory, background }, tokenId, prefix);
      if (active) setResult({ key, markup, failed: false });
    }).catch(() => {
      if (active) setResult({ key, markup: '', failed: true });
    });
    return () => { active = false; };
  }, [body, expression, accessory, background, tokenId, prefix, enabled, key, attempt]);
  return {
    markup: enabled && result?.key === key ? result.markup : '',
    failed: enabled && result?.key === key && result.failed,
    retry: () => { setResult(undefined); setAttempt(value => value + 1); },
  };
}
