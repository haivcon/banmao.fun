"use client";
import { xLayerExplorerUrl } from "../../../lib/explorer";
import { useState } from "react";
import { KING_CONTRACTS } from "./contract-directory";
import { BANMAO_KING_DEPLOYMENT } from "./deployment";
import { KING_T, type Lang } from "./i18n";
import { contractDescription, directoryCopy } from "./i18n/contract-directory";
export default function KingContracts({ lang, isVi }: { lang?: Lang; isVi?: boolean }) {
  const language = lang ?? (isVi ? "vi" : "en");
  const t = KING_T[language];
  const [copyStatus, setCopyStatus] = useState<"copied" | "copyFailed" | null>(null);
  async function copy(address: string) {
    try { await navigator.clipboard.writeText(address); setCopyStatus("copied"); } catch { setCopyStatus("copyFailed"); }
  }
  const card = (contract: typeof KING_CONTRACTS[number]) => <article className="king-contract-card" id={`contract-${contract.name}`} key={contract.address}>
    <span className="king-contract-label">{contract.reused ? t.reused : t.newContract}</span><h3>{contract.name}</h3>
    <p>{contractDescription(contract, language)}</p>
    {contract.dependencies.length > 0 && <p>{directoryCopy[language].dependencies}: {contract.dependencies.map((name, index) => <span key={name}>{index > 0 ? ", " : ""}<a href={`#contract-${name}`}>{name}</a></span>)}</p>}
    <a href={xLayerExplorerUrl(contract.address.toLowerCase() === BANMAO_KING_DEPLOYMENT.contractAddress.toLowerCase() ? "token" : "address", contract.address, language)} target="_blank" rel="noopener noreferrer" aria-label={contract.name + " — " + t.explorer}><code>{contract.address}</code> ↗</a>
    <button className="king-copy-button" type="button" onClick={() => void copy(contract.address)}>{t.copy}</button>
  </article>;
  return <section id="king-contracts" className="king-section king-contracts" aria-labelledby="king-contracts-title">
    <span className="king-eyebrow">X LAYER · 196</span><h2 id="king-contracts-title">{t.contracts} · {KING_CONTRACTS.length}</h2><p>{directoryCopy[language].intro}</p><div className="king-notice">{t.safety}</div>
    <div className="king-contract-grid">{KING_CONTRACTS.slice(0, 2).map(card)}</div>
    <h3>{t.technical} · {KING_CONTRACTS.length - 2}</h3><div className="king-contract-grid">{KING_CONTRACTS.slice(2).map(card)}</div>
    <p>{t.payment}: <a href={xLayerExplorerUrl("token", BANMAO_KING_DEPLOYMENT.paymentToken, language)} target="_blank" rel="noopener noreferrer"><code>{BANMAO_KING_DEPLOYMENT.paymentToken}</code> ↗</a></p>
    <p>{t.royalty}</p>
    <p role="status">{copyStatus ? t[copyStatus] : ""}</p>
  </section>;
}
