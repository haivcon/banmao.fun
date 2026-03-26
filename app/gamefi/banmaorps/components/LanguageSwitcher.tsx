// components/LanguageSwitcher.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { flags, langs } from "../lib/i18n";

type LangKey = keyof typeof langs;
const ALL_LANGS = Object.keys(langs) as LangKey[];
const flagSymbol = (l: LangKey) => flags[l] ?? l.toUpperCase();
const isSupportedLang = (value: string | null): value is LangKey =>
  !!value && ALL_LANGS.includes(value as LangKey);

export default function LanguageSwitcher({
  onChange,
  value,
  onInteract,
}: {
  onChange: (lang: LangKey) => void;
  value?: LangKey;
  onInteract?: () => void;
}) {
  const [lang, setLang] = useState<LangKey>("en");
  const keys = useMemo(() => ALL_LANGS, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("banmao_language");
      setLang(isSupportedLang(stored) ? stored : "en");
    }
  }, []);

  useEffect(() => {
    if (value && isSupportedLang(value)) setLang(value);
  }, [value]);

  function handle(l: LangKey) {
    onInteract?.();
    setLang(l);
    if (typeof window !== "undefined") localStorage.setItem("banmao_language", l);
    onChange(l);
  }

  return (
    <div className="language-switcher">
      <div className="language-switcher__scroller">
        {keys.map((l) => (
          <button
            key={l}
            type="button"
            className={`language-switcher__option ${l === lang ? "active" : ""}`}
            onClick={() => handle(l)}
            aria-label={l}
            title={l.toUpperCase()}
          >
            <span
              className="floating-settings__icon language-switcher__icon"
              aria-hidden="true"
            >
              <span className="language-switcher__flag">{flagSymbol(l)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
