"use client";
import { kingControl } from './i18n/controls';
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ChevronDown } from 'lucide-react';
import { compositionCode, parseCompositionCode, parsePreviewTokenId } from './composition';
import type { BanmaoKingTraitSelection } from './traits';
import type { Lang } from './i18n';

export default function KingComposition({ traits, onSelect, onTokenId, lang }: { traits: BanmaoKingTraitSelection; onSelect: (traits: BanmaoKingTraitSelection) => void; onTokenId?: (id: number) => void; lang: Lang }) {
  const [input, setInput] = useState('');
  const [invalid, setInvalid] = useState(false);
  const code = compositionCode(traits);
  const hydrated = useRef(false);
  const [copied, setCopied] = useState('');
  useEffect(() => {
    // URL hydration is one-time, even if a caller supplies an inline callback.
    if (hydrated.current) return;
    hydrated.current = true;
    const value = new URLSearchParams(window.location.search).get('code');
    if (!value) return;
    setInput(value);
    try { onSelect(parseCompositionCode(value)); onTokenId?.(parsePreviewTokenId(new URLSearchParams(window.location.search).get('tokenId'))); } catch { setInvalid(true); }
  }, [onSelect, onTokenId]);
  return <div className="king-composition-card">
    <h3>{kingControl(lang, "Composition code")}</h3>
    <div className="king-composition-code-row"><code className="king-composition-value">{code}</code>
    <button type="button" aria-label={kingControl(lang, 'Copy composition code')} title={kingControl(lang, 'Copy composition code')} onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(code); } catch { setCopied('error'); } }}>{copied === code ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}</button></div>
    <p role="status">{copied === code ? kingControl(lang, 'Copied') : copied === 'error' ? kingControl(lang, 'Unable to copy.') : ''}</p>
    <details className="king-inline-editor" open={invalid || undefined}><summary>{kingControl(lang, 'Preview by code')}<ChevronDown size={14} aria-hidden="true" /></summary>
    <p>{kingControl(lang, "Codes contain traits only. Shared links also preserve Token ID and pose. Preview only; not proof of ownership.")}</p>
    <form className="king-composition-import" onSubmit={e => { e.preventDefault(); try { onSelect(parseCompositionCode(input)); setInvalid(false); } catch { setInvalid(true); } }}>
      <label htmlFor="king-composition-input">{kingControl(lang, "Preview by code")}</label>
      <input id="king-composition-input" value={input} onChange={e => setInput(e.target.value)} placeholder="banmao-01020302" maxLength={32} autoCapitalize="none" spellCheck={false} required aria-invalid={invalid} />
      <button type="submit">{kingControl(lang, "View composition")}</button>
    </form>
    <p role="status">{invalid ? (kingControl(lang, "Invalid code or unknown trait.")) : ''}</p></details>
  </div>;
}
