"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Crown, Shuffle, RotateCcw } from "lucide-react";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { KING_T, LANG_LIST, kingLanguage, type Lang } from "./i18n";
import { BODY_TRAITS, EXPRESSION_TRAITS, ACCESSORY_TRAITS, BACKGROUND_TRAITS, type BanmaoKingTraitSelection } from "./traits";
import { previewSvg } from "./smil-preview";
import { traitLabels } from "./i18n/traits";
import KingMint from "./KingMint";
import KingContracts from "./KingContracts";
import KingSections from "./KingSections";
import "./banmaoking.css";
import "./experience.css";
const initial: BanmaoKingTraitSelection = { body: 0, expression: 0, accessory: 0, background: 0 };
export default function KingExperience() {
  const [lang, setLang] = useState<Lang>("en");
  const [traits, setTraits] = useState(initial);
  const [tokenId, setTokenId] = useState(0);
  const prefix = useId().replace(/:/g, "");
  const t = KING_T[lang];
  useEffect(() => {
    try { setLang(kingLanguage(localStorage.getItem("banmao_language") || navigator.language.split("-")[0].toLowerCase())); } catch { setLang(kingLanguage(navigator.language.split("-")[0].toLowerCase())); }
    const sync = (event: StorageEvent) => { if (event.key === "banmao_language") setLang(kingLanguage(event.newValue)); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function changeLanguage(value: string) {
    const next = kingLanguage(value); setLang(next);
    try { localStorage.setItem("banmao_language", next); } catch { /* Optional storage. */ }
  }
  const groups = [
    { key: "body", label: t.body, names: BODY_TRAITS.map(v => v.name), colors: BODY_TRAITS.map(v => v.color) },
    { key: "expression", label: t.expression, names: EXPRESSION_TRAITS },
    { key: "accessory", label: t.accessory, names: ACCESSORY_TRAITS },
    { key: "background", label: t.background, names: BACKGROUND_TRAITS.map(v => v.name), colors: BACKGROUND_TRAITS.map(v => v.color) },
  ] as const;
  function randomize() {
    setTraits({ body: Math.floor(Math.random() * 8), expression: Math.floor(Math.random() * 12), accessory: Math.floor(Math.random() * 12), background: Math.floor(Math.random() * 8) });
    setTokenId(v => v + 1);
  }
  return <main className="king-page king-experience" lang={lang}><div className="king-shell">
    <header className="king-header"><Link className="king-brand" href="/collection"><span className="king-sigil"><Crown size={23} aria-hidden="true" /></span><span className="king-wordmark">BANMAO KING<small>{t.collection}</small></span></Link>
      <nav className="king-nav" aria-label={t.explore}><a href="#king-studio">{t.explore}</a><a href="#king-guide">{t.guide}</a><a href="#king-contracts">{t.contracts}</a></nav>
      <div className="king-actions"><label className="king-language-label"><span className="king-sr-only">{t.language}</span><select value={lang} onChange={e => changeLanguage(e.target.value)}>{LANG_LIST.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}</select></label><ConnectButton label={t.connect} accountStatus="address" chainStatus="none" showBalance={false} /></div>
    </header>
    <section className="king-hero"><div><span className="king-eyebrow"><span className="king-live-dot" />{t.kicker}</span><h1>{t.title}<br /><em>{t.titleAccent}</em></h1><p>{t.description}</p><div className="king-hero-actions"><a className="king-primary-link" href="#king-mint">{t.mint} ↗</a><a className="king-secondary-link" href="#king-guide">{t.guide} ↓</a></div></div><div className="king-hero-seal" aria-hidden="true"><Crown size={72} strokeWidth={1} /><span>BANMAO KING</span><small>X LAYER</small></div></section>
    <div className="king-metrics">{[[new Intl.NumberFormat(lang).format(9216), t.combinations], ["4", t.layers], ["100%", t.onchain], [`${new Intl.NumberFormat(lang).format(6666)} BANMAO`, t.price]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <section id="king-studio" className="king-section"><div className="king-section-heading"><div><span className="king-eyebrow">{t.explore}</span><h2>{t.studio}</h2><p>{t.studioDesc}</p></div><span className="king-chip">{t.animated}</span></div>
      <div className="king-studio-grid"><div className="king-preview-card"><div className="king-art-frame"><svg className="king-art" data-animated="true" data-motion-override="true" viewBox="0 0 512 512" role="img" aria-label={`${t.preview} · Banmao King #${tokenId}`} dangerouslySetInnerHTML={{ __html: previewSvg(traits, tokenId, prefix) }} /></div><div className="king-preview-meta" aria-live="polite"><div><strong>Banmao King</strong><br /><span>{t.preview} #{tokenId}</span></div><span>SVG · 512²</span></div></div>
        <div className="king-trait-panel"><div className="king-panel-tools"><button type="button" className="king-random" onClick={randomize}><Shuffle size={16} />{t.randomize}</button><button type="button" className="king-reset" title={t.reset} aria-label={t.reset} onClick={() => { setTraits(initial); setTokenId(0); }}><RotateCcw size={17} /></button></div>
          <div className="king-selectors" aria-describedby="king-preview-only-note">{groups.map((group, groupIndex) => <fieldset key={group.key}><legend>{group.label}<span>{group.names.length}</span></legend><div className="king-trait-options">{group.names.map((name, i) => <button key={name} type="button" aria-pressed={traits[group.key] === i} onClick={() => setTraits(v => ({ ...v, [group.key]: i }))}>{"colors" in group && <span className="king-color-dot" style={{ background: group.colors[i] }} />}<span>{traitLabels[lang][groupIndex][i]}</span></button>)}</div></fieldset>)}</div>
          <div id="king-preview-only-note" className="king-notice"><strong>{t.previewTitle}</strong><p>{t.previewNote}</p></div>
        </div></div>
    </section>
    <div id="king-mint" className="king-section"><KingMint lang={lang} /></div>
    <KingSections t={t} /><KingContracts lang={lang} />
    <footer className="king-footer"><span>© BANMAO KING · {t.footer}</span><Link href="/collection">← {t.collection}</Link><span>X LAYER · 196</span></footer>
  </div></main>;
}
