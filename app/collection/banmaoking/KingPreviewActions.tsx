'use client';
import { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { compositionCode, compositionSharePath } from './composition';
import { kingControl } from './i18n/controls';
import { KING_T, type Lang } from './i18n';
import type { BanmaoKingTraitSelection } from './traits';

export default function KingPreviewActions({ traits, tokenId, markup, failed, retry, lang }: {
  traits: BanmaoKingTraitSelection; tokenId: number; markup: string; failed: boolean | undefined; retry: () => void; lang: Lang;
}) {
  const [copied, setCopied] = useState('');
  const path = compositionSharePath(traits, tokenId);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="king-art">${markup}</svg>`;
  return <div className="king-preview-actions">
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(new URL(path, window.location.href).href); setCopied(path); }
      catch { setCopied('error'); }
    }}><Copy size={16} aria-hidden="true" /><span>{kingControl(lang, 'Copy preview link')}</span></button>
    {markup ? <a download={`${compositionCode(traits)}-${tokenId}-preview.svg`} href={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)}><Download size={16} aria-hidden="true" /><span>{kingControl(lang, 'Download preview SVG')}</span></a>
      : <button type="button" disabled={!failed} onClick={retry}>{failed ? KING_T[lang].retry : KING_T[lang].processing}</button>}
    <span role="status">{copied === path ? kingControl(lang, 'Copied') : copied === 'error' ? kingControl(lang, 'Unable to copy.') : ''}</span>
  </div>;
}
