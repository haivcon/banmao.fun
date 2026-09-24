"use client";
import { kingControl } from './i18n/controls';
import { useEffect, useMemo, useState } from 'react';
import { compositionCode, compositionSharePath, parseCompositionCode } from './composition';
import { previewSvg } from './smil-preview';
import type { BanmaoKingTraitSelection } from './traits';
import type { Lang } from './i18n';

export default function KingComposition({ traits, onSelect, lang }: { traits: BanmaoKingTraitSelection; onSelect: (traits: BanmaoKingTraitSelection) => void; lang: Lang }) {
  const [input, setInput] = useState('');
  const [invalid, setInvalid] = useState(false);
  const code = compositionCode(traits);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('code');
    if (!value) return;
    setInput(value);
    try { onSelect(parseCompositionCode(value)); } catch { setInvalid(true); }
  }, [onSelect]);
  const svg = useMemo(() => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="king-art">${previewSvg(traits, 0, 'composition-export')}</svg>`, [traits]);
  return <div className="king-mint-box">
    <h3>{kingControl(lang, "Composition code")}: <code>{code}</code></h3>
    <p>{kingControl(lang, "Body · Expression · Accessory · Background — two digits each, starting at 01. Codes exclude pose; previews use the default pose. Not proof of minting or ownership.")}</p>
    <form className="king-wallet-row" onSubmit={e => { e.preventDefault(); try { onSelect(parseCompositionCode(input)); setInvalid(false); } catch { setInvalid(true); } }}>
      <label htmlFor="king-composition-input">{kingControl(lang, "Preview by code")}</label>
      <input id="king-composition-input" value={input} onChange={e => setInput(e.target.value)} placeholder="banmao-01020302" maxLength={32} autoCapitalize="none" spellCheck={false} required aria-invalid={invalid} />
      <button type="submit">{kingControl(lang, "View composition")}</button>
    </form>
    <p role="status">{invalid ? (kingControl(lang, "Invalid code or unknown trait.")) : ''}</p>
    <p><a href={compositionSharePath(traits)}>{kingControl(lang, "Open preview permalink")}</a></p>
    <p><a href={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)} download={`${code}-preview.svg`}>{kingControl(lang, "Download preview SVG")}</a></p>
  </div>;
}
