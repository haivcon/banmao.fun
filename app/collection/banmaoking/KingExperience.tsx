"use client";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Crown, Shuffle, RotateCcw } from "lucide-react";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { KING_T, LANG_LIST, kingLanguage, type Lang } from "./i18n";
import { ACCESSORY_IDS, accessoryIndex, BODY_TRAITS, EXPRESSION_TRAITS, ACCESSORY_TRAITS, BACKGROUND_TRAITS, type BanmaoKingTraitSelection } from "./traits";
// Theme Lab intentionally plays the animated NFT, independent of OS motion settings.
import KingAnimatedSvg from './KingAnimatedSvg';
import { previewSvg } from "./smil-preview";
import { CYBORG_PREVIEW_TOKEN_IDS, cyborgForm, cyborgFormName } from './cyborg';
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
import KingThemeLab from './KingThemeLab';
import './glass.css';
const initial: BanmaoKingTraitSelection = { body: 0, expression: 0, accessory: 1, background: 0 };
export default function KingExperience() {

  const [lang, setLang] = useState<Lang>("en");
  const [traits, setTraits] = useState(initial);
  const [tokenId, setTokenId] = useState(0);
  const [tokenInput, setTokenInput] = useState('0');
  const tokenInputValid = /^\d{1,6}$/.test(tokenInput);
  function selectTokenId(value: number) {
    setTokenId(value);
    setTokenInput(String(value));
  }
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
    setTraits({ body: Math.floor(Math.random() * BODY_TRAITS.length), expression: Math.floor(Math.random() * EXPRESSION_TRAITS.length), accessory: ACCESSORY_IDS[Math.floor(Math.random() * ACCESSORY_IDS.length)], background: Math.floor(Math.random() * BACKGROUND_TRAITS.length) });
    selectTokenId((tokenId + 1) % 1000000);
  }
  return <main className="king-page king-experience" lang={lang}><div className="king-shell">
    <header className="king-header"><Link className="king-brand" href="/collection"><span className="king-sigil"><Crown size={23} aria-hidden="true" /></span><span className="king-wordmark">BANMAO KING<small>{t.collection}</small></span></Link>
      <nav className="king-nav" aria-label={t.explore}><a href="#king-studio">{t.explore}</a><a href="#king-guide">{t.guide}</a><a href="#king-contracts">{t.contracts}</a></nav>
      <div className="king-actions"><label className="king-language-label"><span className="king-sr-only">{t.language}</span><select value={lang} onChange={e => changeLanguage(e.target.value)}>{LANG_LIST.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}</select></label><ConnectButton label={t.connect} accountStatus="address" chainStatus="none" showBalance={false} /></div>
    </header>
    <section className="king-hero"><div><span className="king-eyebrow"><span className="king-live-dot" />{t.kicker}</span><h1>{t.title}<br /><em>{t.titleAccent}</em></h1><p>{lang === "vi" ? `${new Intl.NumberFormat(lang).format(TOTAL_COMBINATIONS)} tổ hợp trong Theme Lab. Nguồn cung mint thực tế được đọc từ blockchain bên dưới.` : `${new Intl.NumberFormat(lang).format(TOTAL_COMBINATIONS)} Theme Lab combinations. Live mint supply is read from the blockchain below.`}</p><div className="king-hero-actions"><a className="king-primary-link" href="#king-mint">{t.mint} ↗</a><a className="king-secondary-link" href="#king-guide">{t.guide} ↓</a></div></div><div className="king-hero-seal" aria-hidden="true"><Crown size={72} strokeWidth={1} /><span>BANMAO KING</span><small>X LAYER</small></div></section>
    <div className="king-metrics">{[[new Intl.NumberFormat(lang).format(TOTAL_COMBINATIONS), t.combinations], ["4", t.layers], ["100%", t.onchain], [`${new Intl.NumberFormat(lang).format(6666)} BANMAO`, t.price]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <section id="king-studio" className="king-section"><div className="king-section-heading"><div><span className="king-eyebrow">{t.explore}</span><h2>{t.studio}</h2><p>{t.studioDesc}</p></div><span className="king-chip">{t.animated}</span></div>
      <KingThemeLab traits={traits} vi={lang === 'vi'} onSelect={selection => { setTraits(selection); selectTokenId((tokenId + 1) % 1000000); }} />
      <div className="king-editor-heading"><span className="king-eyebrow">02 · {lang === 'vi' ? 'STUDIO CÁ NHÂN' : 'MAKE IT YOURS'}</span><p>{lang === 'vi' ? 'Xem trước bên trái · Tùy chỉnh bên phải' : 'Live preview · Layer controls'}</p></div><div className="king-studio-grid"><div className="king-preview-card"><div className="king-art-frame"><KingAnimatedSvg key={`${traits.body}-${traits.expression}-${traits.accessory}-${traits.background}-${tokenId}`} className="king-art" data-animated="true" viewBox="0 0 512 512" role="img" aria-label={`${t.preview} · Banmao King #${tokenId}`} markup={previewSvg(traits, tokenId, prefix)} /></div><div className="king-preview-meta" aria-live="polite"><div><strong>Banmao King</strong><br /><span>{t.preview} #{tokenId}{traits.body === 4 ? ` · ${cyborgFormName(tokenId)}` : ''}</span></div><KingSvgViewer traits={traits} tokenId={tokenId} vi={lang === 'vi'} /></div></div>
        <div className="king-trait-panel"><div className="king-panel-tools"><button type="button" className="king-random" onClick={randomize}><Shuffle size={16} />{t.randomize}</button><button type="button" className="king-reset" title={t.reset} aria-label={t.reset} onClick={() => { setTraits(initial); selectTokenId(0); }}><RotateCcw size={17} /></button></div>
          <div className="king-preview-token-control">
            <label htmlFor="king-preview-token-id">Token ID · {lang === 'vi' ? 'Xem trước SVG' : 'SVG preview'}</label>
            <input id="king-preview-token-id" type="text" inputMode="numeric" autoComplete="off" spellCheck={false} value={tokenInput} aria-invalid={!tokenInputValid} aria-describedby="king-preview-token-help" onChange={event => {
              const value = event.target.value;
              setTokenInput(value);
              if (/^\d{1,6}$/.test(value)) setTokenId(Number(value));
            }} onBlur={() => { if (tokenInputValid) setTokenInput(String(tokenId)); }} />
            <small id="king-preview-token-help">{!tokenInputValid
              ? (lang === 'vi' ? 'Nhập số nguyên từ 0 đến 999999. Đang giữ preview hợp lệ gần nhất.' : 'Enter an integer from 0 to 999999. Keeping the last valid preview.')
              : (lang === 'vi' ? 'Nhập 0–999999 để kiểm tra cách xếp số. Chỉ xem trước, không chọn ID khi mint.' : 'Enter 0–999999 to inspect the digits. Preview only; this does not select a mint ID.')}</small>
          </div>
          <div className="king-trait-tabs" role="tablist" aria-label={t.studio}>{groups.map((group, i) => <button type="button" role="tab" key={group.key} id={`king-tab-${group.key}`} aria-controls={`king-group-${group.key}`} aria-selected={activeGroup === i} tabIndex={activeGroup === i ? 0 : -1} onClick={() => setActiveGroup(i)} onKeyDown={event => { const next = event.key === 'ArrowRight' ? (i + 1) % 4 : event.key === 'ArrowLeft' ? (i + 3) % 4 : event.key === 'Home' ? 0 : event.key === 'End' ? 3 : -1; if (next >= 0) { event.preventDefault(); setActiveGroup(next); document.getElementById(`king-tab-${groups[next].key}`)?.focus(); } }}><strong>{group.label}</strong><small>{traitLabels[lang][i][traits[group.key]] ?? group.names[group.key === 'accessory' ? accessoryIndex(traits.accessory) : traits[group.key]]}</small></button>)}</div>
          <div className="king-selectors" aria-describedby="king-preview-only-note">{groups.map((group, groupIndex) => <fieldset key={group.key} id={`king-group-${group.key}`} role="tabpanel" aria-labelledby={`king-tab-${group.key}`} hidden={activeGroup !== groupIndex}><legend>{group.label}<span>{group.names.length}</span></legend><div className="king-trait-options">{group.names.map((name, i) => <button key={name} type="button" aria-pressed={traits[group.key] === (group.key === 'accessory' ? ACCESSORY_IDS[i] : i)} onClick={() => setTraits(v => ({ ...v, [group.key]: group.key === 'accessory' ? ACCESSORY_IDS[i] : i }))}>{"colors" in group && <span className="king-color-dot" style={{ background: group.colors[i] }} />}<span>{traitLabels[lang][groupIndex][group.key === 'accessory' ? ACCESSORY_IDS[i] : i] ?? name}</span></button>)}</div></fieldset>)}</div>
          {traits.body === 4 && <div className="king-selectors"><fieldset>
            <legend>{lang === 'vi' ? 'Dạng Cyborg' : 'Cyborg form'}</legend>
            <div className="king-trait-options">{CYBORG_PREVIEW_TOKEN_IDS.map((sampleTokenId, form) => <button key={sampleTokenId} type="button" aria-pressed={cyborgForm(tokenId) === form} onClick={() => selectTokenId(sampleTokenId)}>{cyborgFormName(sampleTokenId)}</button>)}</div>
            <p>{lang === 'vi' ? 'Đổi token mẫu để xem hai dạng. Dạng NFT thật cố định theo token ID, không chọn khi mint.' : 'Switch sample tokens to preview both forms. Actual NFT form is fixed by token ID, not selected at mint.'}</p>
          </fieldset></div>}
          <div id="king-preview-only-note" className="king-notice"><strong>{t.previewTitle}</strong><p>{t.previewNote}</p></div>
        </div><details className="king-composition-drawer"><summary>{lang === 'vi' ? 'Mã tổ hợp · Chia sẻ · Tải SVG' : 'Composition code · Share · Download SVG'}</summary><KingComposition traits={traits} onSelect={setTraits} lang={lang} /></details></div>
    </section>
    <KingLookup lang={lang} />
    <div id="king-mint" className="king-section"><KingMint lang={lang} /></div>
    <KingSections t={t} /><KingContracts lang={lang} />
    <footer className="king-footer"><span>© BANMAO KING · {t.footer}</span><Link href="/collection">← {t.collection}</Link><span>X LAYER · 196</span></footer>
  </div></main>;
}
