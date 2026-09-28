import type { Lang } from './i18n';
import { KING_METADATA_NOTICE } from './i18n/metadata-notice';

export default function KingMetadataNotice({ lang, variant = 'lookup' }: {
  lang: Lang; variant?: 'lookup' | 'mint' | 'faq' | 'marketplace';
}) {
  const t = KING_METADATA_NOTICE[lang];
  if (variant === 'marketplace') return <p className="king-metadata-marketplace-note">{t.marketplace}</p>;
  const explanation = <>
    <p>{t.technical}</p><p>{t.ownership}</p><p>{t.view}</p><p>{t.gas}</p><p>{t.refresh}</p>
  </>;
  if (variant === 'faq') return <details><summary>{t.faq}</summary>{explanation}</details>;
  return <aside className="king-metadata-notice" aria-label={t.title}>
    <strong>{t.title}</strong>
    <p>{t.summary}</p>
    {variant === 'lookup' && <p>{t.view}</p>}
    <details><summary>{t.more}</summary>{explanation}</details>
  </aside>;
}
