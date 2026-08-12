import type { CollectionResultsPayload } from "../../../lib/ai/contracts";
import { aiText } from "../../../lib/ai/client/i18n";

export default function CollectionResultCards({ payload, language }: { payload: CollectionResultsPayload; language: string }) {
  const t = (key: Parameters<typeof aiText>[1]) => aiText(language, key);
  return <section className="banmao-ai-media" aria-label={t("mediaResults")}>
    <div className="banmao-ai-media-heading"><h3>{t("mediaResults")}</h3><span>{t("metadataSearch")}</span></div>
    {!payload.results.length ? <p className="banmao-ai-media-empty">{t("noMediaResults")}</p> : <div className="banmao-ai-media-grid">
      {payload.results.map((item) => <a className="banmao-ai-media-card" href={`/collection?img=${encodeURIComponent(item.publicId)}`} key={item.publicId} aria-label={`${t("openMedia")}: ${item.name}`}>
        <img src={item.thumbnailUrl} alt={item.name} loading="lazy" decoding="async" width={item.width || 480} height={item.height || 480} />
        <span><strong>{item.name}</strong>{item.folder && <small>{item.folder}</small>}</span>
      </a>)}
    </div>}
    <p className="banmao-ai-media-note">{t("metadataLimit")}</p>
  </section>;
}
