"use client";
import { useEffect, useState } from 'react';
import { compositionCode, compositionSharePath, parseCompositionCode } from './composition';
import { previewSvg } from './smil-preview';
import type { BanmaoKingTraitSelection } from './traits';
import type { Lang } from './i18n';

export default function KingComposition({ traits, onSelect, lang }: { traits: BanmaoKingTraitSelection; onSelect: (traits: BanmaoKingTraitSelection) => void; lang: Lang }) {
  const [input, setInput] = useState('');
  const [invalid, setInvalid] = useState(false);
  const vi = lang === 'vi';
  const code = compositionCode(traits);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('code');
    if (!value) return;
    setInput(value);
    try { onSelect(parseCompositionCode(value)); } catch { setInvalid(true); }
  }, [onSelect]);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="king-art">${previewSvg(traits, 0, 'composition-export')}</svg>`;
  return <div className="king-mint-box">
    <h3>{vi ? 'Mã tổ hợp' : 'Composition code'}: <code>{code}</code></h3>
    <p>{vi ? 'Thân · Biểu cảm · Phụ kiện · Nền — mỗi nhóm 2 chữ số, bắt đầu từ 01. Mã không bao gồm tư thế; ảnh xem thử dùng tư thế mặc định. Không phải bằng chứng đã mint hoặc quyền sở hữu.' : 'Body · Expression · Accessory · Background — two digits each, starting at 01. Codes exclude pose; previews use the default pose. Not proof of minting or ownership.'}</p>
    <form className="king-wallet-row" onSubmit={e => { e.preventDefault(); try { onSelect(parseCompositionCode(input)); setInvalid(false); } catch { setInvalid(true); } }}>
      <label htmlFor="king-composition-input">{vi ? 'Nhập mã xem trước' : 'Preview by code'}</label>
      <input id="king-composition-input" value={input} onChange={e => setInput(e.target.value)} placeholder="banmao-01020302" maxLength={32} autoCapitalize="none" spellCheck={false} required aria-invalid={invalid} />
      <button type="submit">{vi ? 'Xem tổ hợp' : 'View composition'}</button>
    </form>
    <p role="status">{invalid ? (vi ? 'Mã không hợp lệ hoặc đặc điểm không tồn tại.' : 'Invalid code or unknown trait.') : ''}</p>
    <p><a href={compositionSharePath(traits)}>{vi ? 'Liên kết chia sẻ mẫu (sao chép liên kết)' : 'Share preview (copy link)'}</a></p>
    <p><a href={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)} download={`${code}-preview.svg`}>{vi ? 'Tải SVG xem thử' : 'Download preview SVG'}</a></p>
  </div>;
}
