"use client";
import type { Lang } from './i18n';
import { kingControl } from './i18n/controls';
import { useEffect, useId, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, X } from 'lucide-react';
import KingAnimatedSvg from './KingAnimatedSvg';
import { useKingPreview } from './useKingPreview';
import { KING_T } from './i18n';
import { compositionCode } from './composition';
import type { BanmaoKingTraitSelection } from './traits';

export default function KingSvgViewer({ traits, tokenId, lang = 'en' }: { traits: BanmaoKingTraitSelection; tokenId: number; lang?: Lang }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const [fitSize, setFitSize] = useState(0);
  useEffect(() => {
    if (!open || !viewport.current) return;
    const area = viewport.current;
    const measure = () => setFitSize(Math.max(1, Math.min(area.clientWidth, area.clientHeight)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => observer.disconnect();
  }, [open]);
  function fit() {
    setZoom(1);
    viewport.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
  const prefix = useId().replace(/:/g, '');
  const title = kingControl(lang, "SVG viewer");
  const code = compositionCode(traits);
  const { markup, failed, retry } = useKingPreview(traits, tokenId, `${prefix}-zoom`, open);
  function close() { dialog.current?.close(); }
  return <>
    <button ref={trigger} type="button" className="king-zoom-trigger" onClick={() => { setZoom(1); setOpen(true); dialog.current?.showModal(); }}><Maximize2 size={16} aria-hidden="true" />{title}</button>
    <dialog ref={dialog} className="king-svg-dialog" aria-labelledby={`${prefix}-title`} onClose={() => { setOpen(false); trigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <header><div><strong id={`${prefix}-title`}>{title}</strong><small>{code}</small></div><button type="button" autoFocus onClick={close} aria-label={kingControl(lang, "Close")}><X size={20} /></button></header>
      <div ref={viewport} className="king-zoom-scroll" tabIndex={0} aria-label={kingControl(lang, "SVG image, scroll to pan")}>
        {open && !markup && <div role="status">{failed ? <button type="button" onClick={retry}>{KING_T[lang].retry}</button> : KING_T[lang].processing}</div>}
        {open && <KingAnimatedSvg style={{ width: fitSize * zoom, height: fitSize * zoom, maxWidth: 'none' }} viewBox="0 0 512 512" role="img" aria-label={`Banmao King · ${code}`} markup={markup} />}
      </div>
      <footer><button type="button" disabled={zoom <= 1} onClick={() => setZoom(v => Math.max(1, v - .5))} aria-label={kingControl(lang, "Zoom out")}><Minus size={18} /></button><output>{Math.round(zoom * 100)}%</output><button type="button" disabled={zoom >= 4} onClick={() => setZoom(v => Math.min(4, v + .5))} aria-label={kingControl(lang, "Zoom in")}><Plus size={18} /></button><button type="button" onClick={fit}>{kingControl(lang, "Fit")}</button><a aria-disabled={!markup} onClick={event => { if (!markup) event.preventDefault(); }} download={`${code}.svg`} href={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${markup}</svg>`)}>↓ SVG</a></footer>
    </dialog>
  </>;
}
