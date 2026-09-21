"use client";
import { useState, type CSSProperties } from 'react';
import { Check, Search, Palette } from 'lucide-react';
import { accessoryName, BODY_TRAITS, EXPRESSION_TRAITS, ACCESSORY_TRAITS, BACKGROUND_TRAITS, type BanmaoKingTraitSelection } from './traits';
import { KING_THEME_PRESETS, THEME_CATEGORIES, filterKingPresets, type ThemeCategory } from './theme-presets';

export default function KingThemeLab({ traits, onSelect, vi }: {
  traits: BanmaoKingTraitSelection;
  onSelect: (traits: BanmaoKingTraitSelection) => void;
  vi: boolean;
}) {
  const [category, setCategory] = useState<ThemeCategory>('all');
  const [query, setQuery] = useState('');
  const presets = filterKingPresets(category, query);
  const labels = vi ? ['Tất cả', 'Hoàng gia', 'Vũ trụ', 'Thiên nhiên', 'Đời sống'] : ['All themes', 'Royal', 'Cosmic', 'Nature', 'Lifestyle'];
  return <div className="king-theme-library">
    <div className="king-library-heading">
      <div><span className="king-eyebrow"><Palette size={14} aria-hidden="true" />01 · THEME LIBRARY</span>
        <h3>{vi ? 'Một bộ phối. Một cá tính.' : 'A collection of personalities.'}</h3>
        <p>{vi ? 'Chọn mẫu để cập nhật ảnh xem trước, sau đó tùy chỉnh từng lớp.' : 'Choose a look to update the preview, then customize each layer.'}</p></div>
      <label className="king-theme-search"><Search size={17} aria-hidden="true" /><span className="king-sr-only">{vi ? 'Tìm bộ phối' : 'Search themes'}</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={vi ? 'Tìm bộ phối, trang phục…' : 'Search themes, traits…'} /></label>
    </div>
    <div className="king-library-toolbar"><div className="king-category-filters" role="group" aria-label={vi ? 'Nhóm bộ phối' : 'Theme categories'}>{THEME_CATEGORIES.map((key, i) => <button key={key} type="button" aria-pressed={category === key} onClick={() => setCategory(key)}>{labels[i]}</button>)}</div><span role="status">{presets.length} / {KING_THEME_PRESETS.length}</span></div>
    <div className="king-preset-grid">{presets.map(p => {
      const selected = p.body === traits.body && p.expression === traits.expression && p.accessory === traits.accessory && p.background === traits.background;
      return <button className="king-preset-card" type="button" key={p.name} aria-pressed={selected} onClick={() => onSelect({ body: p.body, expression: p.expression, accessory: p.accessory, background: p.background })} style={{ '--preset-body': BODY_TRAITS[p.body].color, '--preset-background': BACKGROUND_TRAITS[p.background].color } as CSSProperties}>
        <span className="king-preset-palette" aria-hidden="true"><i /><i /><i />{selected && <Check size={16} />}</span>
        <span className="king-preset-name">{p.name}{selected && <span className="king-sr-only"> · {vi ? 'Đang chọn' : 'Selected'}</span>}</span>
        <span className="king-preset-detail">{BODY_TRAITS[p.body].name} · {accessoryName(p.accessory)} #{p.accessory}</span>
        <span className="king-preset-detail">{EXPRESSION_TRAITS[p.expression]} · {BACKGROUND_TRAITS[p.background].name}</span>
      </button>;
    })}</div>
    {presets.length === 0 && <div className="king-theme-empty"><p>{vi ? 'Không tìm thấy bộ phối phù hợp.' : 'No themes match your search.'}</p><button type="button" onClick={() => { setCategory('all'); setQuery(''); }}>{vi ? 'Xóa bộ lọc' : 'Clear filters'}</button></div>}
    <p className="king-catalogue-note">{BODY_TRAITS.length} {vi ? 'trang phục' : 'bodies'} · {EXPRESSION_TRAITS.length} {vi ? 'biểu cảm' : 'expressions'} · {ACCESSORY_TRAITS.length} {vi ? 'phụ kiện' : 'accessories'} · {BACKGROUND_TRAITS.length} {vi ? 'phông nền' : 'backgrounds'}. {vi ? 'Bộ phối chỉ dùng để xem trước, không quyết định NFT khi mint. Chưa xác nhận triển khai catalogue lên mạng.' : 'Presets are previews, not mint selections. Catalogue network deployment is not confirmed.'}</p>
  </div>;
}
