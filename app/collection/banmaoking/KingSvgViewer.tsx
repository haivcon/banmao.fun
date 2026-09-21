"use client";
import { useId, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, X } from 'lucide-react';
import KingAnimatedSvg from './KingAnimatedSvg';
import { previewSvg } from './smil-preview';
import { compositionCode } from './composition';
import type { BanmaoKingTraitSelection } from './traits';

export default function KingSvgViewer({ traits, tokenId, vi }: { traits: BanmaoKingTraitSelection; tokenId: number; vi: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const prefix = useId().replace(/:/g, '');
  const title = vi ? 'Phóng to SVG' : 'SVG viewer';
  const code = compositionCode(traits);
  const markup = open ? previewSvg(traits, tokenId, `${prefix}-zoom`) : '';
  function close() { dialog.current?.close(); }
  return <>
    <button ref={trigger} type="button" className="king-zoom-trigger" onClick={() => { setZoom(1); setOpen(true); dialog.current?.showModal(); }}><Maximize2 size={16} aria-hidden="true" />{title}</button>
    <dialog ref={dialog} className="king-svg-dialog" aria-labelledby={`${prefix}-title`} onClose={() => { setOpen(false); trigger.current?.focus(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <header><div><strong id={`${prefix}-title`}>{title}</strong><small>{code}</small></div><button type="button" autoFocus onClick={close} aria-label={vi ? 'Đóng' : 'Close'}><X size={20} /></button></header>
      <div className="king-zoom-scroll" tabIndex={0} aria-label={vi ? 'Ảnh SVG, cuộn để xem vùng phóng to' : 'SVG image, scroll to pan'}>
        {open && <KingAnimatedSvg style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} viewBox="0 0 512 512" role="img" aria-label={`Banmao King · ${code}`} markup={markup} />}
      </div>
      <footer><button type="button" disabled={zoom <= 1} onClick={() => setZoom(v => Math.max(1, v - .5))} aria-label={vi ? 'Thu nhỏ' : 'Zoom out'}><Minus size={18} /></button><output>{Math.round(zoom * 100)}%</output><button type="button" disabled={zoom >= 4} onClick={() => setZoom(v => Math.min(4, v + .5))} aria-label={vi ? 'Phóng to' : 'Zoom in'}><Plus size={18} /></button><button type="button" onClick={() => setZoom(1)}>{vi ? 'Vừa khung' : 'Fit'}</button><a download={`${code}.svg`} href={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${markup}</svg>`)}>↓ SVG</a></footer>
    </dialog>
  </>;
}
