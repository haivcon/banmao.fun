"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { LANG_LIST, T } from "./i18n";
import { useHubStore } from "./stores/useHubStore";
import { saveCollectionLanguage } from "./CollectionPreferences";
import "./collection-language-selector.css";

export default function CollectionLanguageSelector() {
    const lang = useHubStore(state => state.lang);
    const theme = useHubStore(state => state.theme);
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const items = useRef<(HTMLButtonElement | null)[]>([]);
    const id = useId();
    const selected = LANG_LIST.find(item => item.code === lang)!;
    const initialFocus = useRef(0);

    useEffect(() => {
        if (!open) return;
        items.current[initialFocus.current]?.focus();
        const dismiss = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", dismiss);
        return () => document.removeEventListener("pointerdown", dismiss);
    }, [open]);

    const show = (index: number) => {
        initialFocus.current = index;
        setOpen(true);
    };
    const close = () => {
        setOpen(false);
        trigger.current?.focus();
    };

    return <div ref={root} className="collection-language" data-theme={theme}
        onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
        }} onKeyDown={event => {
            if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); }
        }}>
        <button ref={trigger} type="button" className="collection-language__trigger"
            aria-label={`${T[lang].language}: ${selected.name}`} aria-haspopup="menu"
            aria-expanded={open} aria-controls={open ? id : undefined}
            onClick={() => open ? setOpen(false) : show(LANG_LIST.findIndex(item => item.code === lang))}
            onKeyDown={event => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    show(event.key === "ArrowUp" ? LANG_LIST.length - 1 : LANG_LIST.findIndex(item => item.code === lang));
                }
            }}>
            <Languages size={17} aria-hidden="true" />
            <span className="collection-language__current" lang={lang}>{selected.name}</span>
            <span className="collection-language__short" aria-hidden="true">{lang.toUpperCase()}</span>
            <ChevronDown size={14} className="collection-language__chevron" aria-hidden="true" />
        </button>
        {open && <div className="collection-language__panel">
            <div className="collection-language__heading"><Languages size={17} aria-hidden="true" /><span>{T[lang].language}</span><span className="collection-language__count">06</span></div>
            <div id={id} role="menu" aria-label={T[lang].language} onKeyDown={event => {
                const current = items.current.indexOf(document.activeElement as HTMLButtonElement);
                let next: number;
                switch (event.key) {
                    case "ArrowDown": next = (current + 1) % LANG_LIST.length; break;
                    case "ArrowUp": next = (current - 1 + LANG_LIST.length) % LANG_LIST.length; break;
                    case "Home": next = 0; break;
                    case "End": next = LANG_LIST.length - 1; break;
                    default: return;
                }
                event.preventDefault();
                items.current[next]?.focus();
            }}>
                {LANG_LIST.map((item, index) => <button key={item.code} type="button"
                    ref={element => { items.current[index] = element; }} role="menuitemradio"
                    aria-checked={lang === item.code} tabIndex={-1} className="collection-language__option"
                    onClick={() => { saveCollectionLanguage(item.code); close(); }}>
                    <span className="collection-language__flag" aria-hidden="true">{item.flag}</span>
                    <span lang={item.code}>{item.name}</span>
                    <span className="collection-language__code" aria-hidden="true">{item.code.toUpperCase()}</span>
                    <span className="collection-language__check">{lang === item.code && <Check size={16} aria-hidden="true" />}</span>
                </button>)}
            </div>
        </div>}
    </div>;
}
