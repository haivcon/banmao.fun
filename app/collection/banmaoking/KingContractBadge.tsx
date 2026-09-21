"use client";
import { Copy, ExternalLink } from "lucide-react";
import { BANMAO_KING_DEPLOYMENT } from "./deployment";
import { KING_T, type Lang } from "./i18n";
import { xLayerExplorerUrl } from "../../../lib/explorer";
import { copyKingAddress } from "./king-notifications";

export default function KingContractBadge({ lang }: { lang: Lang }) {
  const t = KING_T[lang];
  const address = BANMAO_KING_DEPLOYMENT.contractAddress;
  return <div className="king-contract-badge">
    <span className="king-contract-badge-label">BANMAO KING NFT <small>X LAYER · {BANMAO_KING_DEPLOYMENT.chainId}</small></span>
    <code>{address}</code>
    <div className="king-contract-badge-actions">
      <button type="button" onClick={() => void copyKingAddress(address, lang)} aria-label={`${t.copy} · BANMAO KING NFT`}><Copy size={15} aria-hidden="true" />{t.copy}</button>
      <a href={xLayerExplorerUrl("token", address, lang)} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} aria-hidden="true" />{t.explorer}</a>
    </div>
  </div>;
}
