"use client";
import { RefreshCw } from 'lucide-react';
import type { Lang } from './i18n';
import { kingCheckoutCopy } from './i18n/checkout';
import { kingRefreshCopy } from './i18n/refresh';
import KingMetadataRefresh from './KingMetadataRefresh';
import './nft-actions.css';

export default function KingMetadataTools({ lang, tokenId, onReload, loading = false, allowExplorer = true }: {
  lang: Lang; tokenId?: bigint; onReload: () => void; loading?: boolean; allowExplorer?: boolean;
}) {
  return <div className="king-nft-metadata" aria-label={kingCheckoutCopy(lang, 'Metadata & additional options')}>
    <button className="king-nft-action" type="button" disabled={loading} onClick={onReload} aria-busy={loading}>
      <RefreshCw size={16} aria-hidden="true" />
      <span>{kingCheckoutCopy(lang, 'Reload metadata (free)')}</span>
    </button>
    {allowExplorer && tokenId !== undefined && <details className="king-nft-explorer-tools">
      <summary>{kingRefreshCopy(lang, 'Refresh explorer metadata')}</summary>
      <KingMetadataRefresh tokenId={tokenId} lang={lang} />
    </details>}
  </div>;
}
