"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { KING_T, LANG_LIST, type Lang } from './i18n';
import './language-selector.css';

export default function KingLanguageSelector({ lang, onChange }: { lang: Lang; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const current = LANG_LIST.find(item => item.code === lang);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  return <div className="king-language-picker" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} type="button" className="king-language-trigger" aria-expanded={open} aria-controls={id} aria-label={`${KING_T[lang].language}: ${current?.name}`} onClick={() => setOpen(value => !value)}>
      <Languages size={18} aria-hidden="true" /><span lang={lang}>{current?.name}</span><ChevronDown className="king-language-chevron" size={15} aria-hidden="true" />
    </button>
    {open && <div id={id} ref={panel} className="king-language-panel" role="group" aria-label={KING_T[lang].language} onKeyDown={event => {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : event.key === 'ArrowUp' ? (index + buttons.length - 1) % buttons.length : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); buttons[next]?.focus(); }
    }}>
      <div className="king-language-heading"><Languages size={15} aria-hidden="true" /><span>{KING_T[lang].language}</span></div>
      {LANG_LIST.map(item => <button key={item.code} type="button" className="king-language-option" lang={item.code} aria-pressed={item.code === lang} onClick={() => {
        onChange(item.code); setOpen(false); trigger.current?.focus();
      }}><span className="king-language-code" aria-hidden="true">{item.code.toUpperCase()}</span><span>{item.name}</span><Check className="king-language-check" size={17} aria-hidden="true" /></button>)}
    </div>}
  </div>;
}
