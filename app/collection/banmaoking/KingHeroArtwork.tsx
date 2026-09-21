'use client';
import { memo, useId, useMemo } from 'react';
import KingAnimatedSvg from './KingAnimatedSvg';
import { previewSvg } from './smil-preview';
import { KING_THEME_PRESETS } from './theme-presets';
import { KING_T, type Lang } from './i18n';

/** A fixed catalogue preview, never a representation of the user's mint result. */
export default memo(function KingHeroArtwork({ lang }: { lang: Lang }) {
  const prefix = useId().replace(/:/g, '');
  const markup = useMemo(() => previewSvg(KING_THEME_PRESETS[0], 0, `${prefix}-hero`), [prefix]);
  const t = KING_T[lang];
  return <figure className="king-hero-artwork">
    <div className="king-showcase-label"><span>BANMAO KING</span><span>SVG / X LAYER</span></div>
    <div className="king-showcase-frame"><KingAnimatedSvg viewBox="0 0 512 512" role="img" aria-label={`Banmao King · ${t.preview}`} markup={markup} /></div>
    <figcaption><div><strong>{t.preview}</strong><span>{t.onchain}</span></div><a href="#king-studio">{t.explore} ↗</a></figcaption>
    <p className="king-showcase-note">{t.previewNote}</p>
  </figure>;
});
