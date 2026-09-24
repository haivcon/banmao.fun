"use client";
import { kingUi } from './i18n/interface';
import { kingPresetName } from './i18n/presets';
import { traitLabels } from './i18n/traits';
import type { Lang } from './i18n';
import { useState, type CSSProperties } from 'react';
import { Check, Search, Palette } from 'lucide-react';
import { BODY_TRAITS, EXPRESSION_TRAITS, ACCESSORY_TRAITS, BACKGROUND_TRAITS, type BanmaoKingTraitSelection } from './traits';
import { KING_THEME_PRESETS, THEME_CATEGORIES, type ThemeCategory } from './theme-presets';

export default function KingThemeLab({ traits, onSelect, lang = 'en' }: {
  traits: BanmaoKingTraitSelection;
  onSelect: (traits: BanmaoKingTraitSelection) => void;
  lang?: Lang;
}) {
  const [category, setCategory] = useState<ThemeCategory>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const browsingAll = category === 'all' && !query.trim();
  const selectedPreset = KING_THEME_PRESETS.find(p => p.body === traits.body && p.expression === traits.expression && p.accessory === traits.accessory && p.background === traits.background);
  const presetName = (p: typeof KING_THEME_PRESETS[number]) => kingPresetName(lang, p);
  const presets = KING_THEME_PRESETS.filter(p => (category === 'all' || p.category === category) && [presetName(p), p.name, traitLabels[lang][0][p.body], traitLabels[lang][1][p.expression], traitLabels[lang][2][p.accessory], traitLabels[lang][3][p.background]].join(' ').toLocaleLowerCase(lang).includes(query.trim().toLocaleLowerCase(lang)));
  const labels = (['All themes', 'Royal', 'Cosmic', 'Nature', 'Lifestyle'] as const).map(key => kingUi(lang, key));
  return <div className="king-theme-library">
    <div className="king-library-heading">
      <div><h3><Palette size={14} aria-hidden="true" /> {kingUi(lang, 'Theme Lab')} <small>{KING_THEME_PRESETS.length} {kingUi(lang, "looks")}</small></h3>
        <p>{kingUi(lang, "Choose a look to update the preview, then customize each layer.")}</p></div>
      <label className="king-theme-search"><Search size={17} aria-hidden="true" /><span className="king-sr-only">{kingUi(lang, "Search themes")}</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={kingUi(lang, "Search themes, traits…")} /></label>
    </div>
    <div className="king-library-toolbar"><div className="king-category-filters" role="group" aria-label={kingUi(lang, "Theme categories")}>{THEME_CATEGORIES.map((key, i) => <button key={key} type="button" aria-pressed={category === key} onClick={() => setCategory(key)}>{labels[i]}</button>)}</div><span role="status">{presets.length} / {KING_THEME_PRESETS.length}</span></div>
    <p className="king-current-look" aria-live="polite">{kingUi(lang, "Previewing: ")}{(selectedPreset ? presetName(selectedPreset) : undefined) ?? (kingUi(lang, "Custom look"))}</p>
    <div className="king-preset-grid" data-collapsed={browsingAll && !expanded}>{presets.map(p => {
      const selected = p.body === traits.body && p.expression === traits.expression && p.accessory === traits.accessory && p.background === traits.background;
      return <button className="king-preset-card" type="button" key={p.name} aria-pressed={selected} onClick={() => onSelect({ body: p.body, expression: p.expression, accessory: p.accessory, background: p.background })} style={{ '--preset-body': BODY_TRAITS[p.body].color, '--preset-background': BACKGROUND_TRAITS[p.background].color } as CSSProperties}>
        <span className="king-preset-palette" aria-hidden="true"><i /><i /><i />{selected && <Check size={16} />}</span>
        <span className="king-preset-name">{presetName(p)}{selected && <span className="king-sr-only"> · {kingUi(lang, "Selected")}</span>}</span>
        <span className="king-preset-detail">{traitLabels[lang][0][p.body]} · {traitLabels[lang][2][p.accessory]} #{p.accessory}</span>
        <span className="king-preset-detail">{traitLabels[lang][1][p.expression]} · {traitLabels[lang][3][p.background]}</span>
      </button>;
    })}</div>
    <div className="king-library-actions">{browsingAll && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? (kingUi(lang, "Show fewer")) : (kingUi(lang, "Show more looks"))}</button>}<a href="#king-studio">{kingUi(lang, "View preview ↑")}</a></div>
    {presets.length === 0 && <div className="king-theme-empty"><p>{kingUi(lang, "No themes match your search.")}</p><button type="button" onClick={() => { setCategory('all'); setQuery(''); }}>{kingUi(lang, "Clear filters")}</button></div>}
    <p className="king-catalogue-note">{BODY_TRAITS.length} {kingUi(lang, "bodies")} · {EXPRESSION_TRAITS.length} {kingUi(lang, "expressions")} · {ACCESSORY_TRAITS.length} {kingUi(lang, "accessories")} · {BACKGROUND_TRAITS.length} {kingUi(lang, "backgrounds")}. {kingUi(lang, "Presets are previews, not mint selections. Catalogue network deployment is not confirmed.")}</p>
  </div>;
}
