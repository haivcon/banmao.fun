"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Crown, Shuffle, RotateCcw } from "lucide-react";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { KING_T, LANG_LIST, kingLanguage, type Lang } from "./i18n";
import { BODY_TRAITS, EXPRESSION_TRAITS, ACCESSORY_TRAITS, BACKGROUND_TRAITS, type BanmaoKingTraitSelection } from "./traits";
// Theme Lab intentionally plays the animated NFT, independent of OS motion settings.
import { previewSvg } from "./smil-preview";
import { traitLabels } from "./i18n/traits";
import KingMint from "./KingMint";
import KingComposition from "./KingComposition";
import KingSvgViewer from './KingSvgViewer';
import KingLookup from "./KingLookup";
import { TOTAL_COMBINATIONS } from "./traits";
import KingContracts from "./KingContracts";
import KingSections from "./KingSections";
import "./banmaoking.css";
import "./experience.css";
import expansion from "./expansion.json";
import { KING_PRESET } from './king-regalia';
const initial: BanmaoKingTraitSelection = { body: 0, expression: 0, accessory: 0, background: 0 };
export default function KingExperience() {

  const [lang, setLang] = useState<Lang>("en");
  const [traits, setTraits] = useState(initial);
  const [tokenId, setTokenId] = useState(0);
  const [activeGroup, setActiveGroup] = useState(0);
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
    setTraits({ body: Math.floor(Math.random() * BODY_TRAITS.length), expression: Math.floor(Math.random() * EXPRESSION_TRAITS.length), accessory: Math.floor(Math.random() * ACCESSORY_TRAITS.length), background: Math.floor(Math.random() * BACKGROUND_TRAITS.length) });
    setTokenId(v => v + 1);
  }
  return <main className="king-page king-experience" lang={lang}><div className="king-shell">
    <header className="king-header"><Link className="king-brand" href="/collection"><span className="king-sigil"><Crown size={23} aria-hidden="true" /></span><span className="king-wordmark">BANMAO KING<small>{t.collection}</small></span></Link>
      <nav className="king-nav" aria-label={t.explore}><a href="#king-studio">{t.explore}</a><a href="#king-guide">{t.guide}</a><a href="#king-contracts">{t.contracts}</a></nav>
      <div className="king-actions"><label className="king-language-label"><span className="king-sr-only">{t.language}</span><select value={lang} onChange={e => changeLanguage(e.target.value)}>{LANG_LIST.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}</select></label><ConnectButton label={t.connect} accountStatus="address" chainStatus="none" showBalance={false} /></div>
    </header>
    <section className="king-hero"><div><span className="king-eyebrow"><span className="king-live-dot" />{t.kicker}</span><h1>{t.title}<br /><em>{t.titleAccent}</em></h1><p>{lang === "vi" ? `${new Intl.NumberFormat(lang).format(TOTAL_COMBINATIONS)} tổ hợp trong Theme Lab. Nguồn cung mint thực tế được đọc từ blockchain bên dưới.` : `${new Intl.NumberFormat(lang).format(TOTAL_COMBINATIONS)} Theme Lab combinations. Live mint supply is read from the blockchain below.`}</p><div className="king-hero-actions"><a className="king-primary-link" href="#king-mint">{t.mint} ↗</a><a className="king-secondary-link" href="#king-guide">{t.guide} ↓</a></div></div><div className="king-hero-seal" aria-hidden="true"><Crown size={72} strokeWidth={1} /><span>BANMAO KING</span><small>X LAYER</small></div></section>
    <div className="king-metrics">{[[new Intl.NumberFormat(lang).format(TOTAL_COMBINATIONS), t.combinations], ["4", t.layers], ["100%", t.onchain], [`${new Intl.NumberFormat(lang).format(6666)} BANMAO`, t.price]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <section id="king-studio" className="king-section"><div className="king-section-heading"><div><span className="king-eyebrow">{t.explore}</span><h2>{t.studio}</h2><p>{t.studioDesc}</p></div><span className="king-chip">{t.animated}</span></div>
      <div className="king-notice"><strong>BanmaoKing · Theme Lab</strong><p>{lang === "vi" ? "Catalogue hoàng gia đã có trong source Solidity; chưa xác nhận triển khai lên mạng. 17 Body · 21 Expression · 21 Accessory · 17 Background. King: vàng hoàng gia, vương miện, áo choàng và quyền trượng. Chọn chủ đề rồi tùy chỉnh từng layer." : "Royal catalogue is included in Solidity source; network deployment is not confirmed. 17 bodies · 21 expressions · 21 accessories · 17 backgrounds. King: imperial gold, crown, mantle and scepter. Choose a theme, then customize each layer."}</p><div className="king-trait-options">{[KING_PRESET, ...expansion.presets].map(p => <button type="button" key={p.name} aria-pressed={traits.body === p.body && traits.expression === p.expression && traits.accessory === p.accessory && traits.background === p.background} onClick={() => { setTraits(p); setTokenId(v => v + 1); }}>{p.name}</button>)}</div></div><div className="king-studio-grid"><div className="king-preview-card"><div className="king-art-frame"><svg key={`${traits.body}-${traits.expression}-${traits.accessory}-${traits.background}-${tokenId}`} className="king-art" data-animated="true" viewBox="0 0 512 512" role="img" aria-label={`${t.preview} · Banmao King #${tokenId}`} dangerouslySetInnerHTML={{ __html: previewSvg(traits, tokenId, prefix) }} /></div><div className="king-preview-meta" aria-live="polite"><div><strong>Banmao King</strong><br /><span>{t.preview} #{tokenId}</span></div><KingSvgViewer traits={traits} tokenId={tokenId} vi={lang === 'vi'} /></div></div>
        <div className="king-trait-panel"><div className="king-panel-tools"><button type="button" className="king-random" onClick={randomize}><Shuffle size={16} />{t.randomize}</button><button type="button" className="king-reset" title={t.reset} aria-label={t.reset} onClick={() => { setTraits(initial); setTokenId(0); }}><RotateCcw size={17} /></button></div>
          <div className="king-trait-tabs" role="tablist" aria-label={t.studio}>{groups.map((group, i) => <button type="button" role="tab" key={group.key} id={`king-tab-${group.key}`} aria-controls={`king-group-${group.key}`} aria-selected={activeGroup === i} tabIndex={activeGroup === i ? 0 : -1} onClick={() => setActiveGroup(i)} onKeyDown={event => { const next = event.key === 'ArrowRight' ? (i + 1) % 4 : event.key === 'ArrowLeft' ? (i + 3) % 4 : event.key === 'Home' ? 0 : event.key === 'End' ? 3 : -1; if (next >= 0) { event.preventDefault(); setActiveGroup(next); document.getElementById(`king-tab-${groups[next].key}`)?.focus(); } }}><strong>{group.label}</strong><small>{traitLabels[lang][i][traits[group.key]] ?? group.names[traits[group.key]]}</small></button>)}</div>
          <div className="king-selectors" aria-describedby="king-preview-only-note">{groups.map((group, groupIndex) => <fieldset key={group.key} id={`king-group-${group.key}`} role="tabpanel" aria-labelledby={`king-tab-${group.key}`} hidden={activeGroup !== groupIndex}><legend>{group.label}<span>{group.names.length}</span></legend><div className="king-trait-options">{group.names.map((name, i) => <button key={name} type="button" aria-pressed={traits[group.key] === i} onClick={() => setTraits(v => ({ ...v, [group.key]: i }))}>{"colors" in group && <span className="king-color-dot" style={{ background: group.colors[i] }} />}<span>{traitLabels[lang][groupIndex][i] ?? name}</span></button>)}</div></fieldset>)}</div>
          <div id="king-preview-only-note" className="king-notice"><strong>{t.previewTitle}</strong><p>{t.previewNote}</p></div>
        </div><details className="king-composition-drawer"><summary>{lang === 'vi' ? 'Mã tổ hợp · Chia sẻ · Tải SVG' : 'Composition code · Share · Download SVG'}</summary><KingComposition traits={traits} onSelect={setTraits} lang={lang} /></details></div>
    </section>
    <KingLookup lang={lang} />
    <div id="king-mint" className="king-section"><KingMint lang={lang} /></div>
    <KingSections t={t} /><KingContracts lang={lang} />
    <footer className="king-footer"><span>© BANMAO KING · {t.footer}</span><Link href="/collection">← {t.collection}</Link><span>X LAYER · 196</span></footer>
  </div></main>;
}
