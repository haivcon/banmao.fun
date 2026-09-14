"use client";
import { useState } from "react";
import { KING_CONTRACTS } from "./contract-directory";
import { BANMAO_KING_DEPLOYMENT } from "./deployment";
import { KING_T, type Lang } from "./i18n";
import { contractCopy } from "./i18n/contracts";
export default function KingContracts({ lang, isVi }: { lang?: Lang; isVi?: boolean }) {
  const language = lang ?? (isVi ? "vi" : "en");
  const t = KING_T[language];
  const [copyStatus, setCopyStatus] = useState<"copied" | "copyFailed" | null>(null);
  async function copy(address: string) {
    try { await navigator.clipboard.writeText(address); setCopyStatus("copied"); } catch { setCopyStatus("copyFailed"); }
  }
  const card = (contract: typeof KING_CONTRACTS[number], index: number) => <article className="king-contract-card" key={contract.name}>
    <span className="king-contract-label">{contract.reused ? t.reused : t.newContract}</span><h3>{contract.name}</h3>
    <p>{language === "en" || language === "vi" ? contract[language] : contractCopy[language][index]}</p>
    <a href={`https://www.oklink.com/xlayer/address/${contract.address}`} target="_blank" rel="noopener noreferrer" aria-label={contract.name + " — " + t.explorer}><code>{contract.address}</code> ↗</a>
    <button className="king-copy-button" type="button" onClick={() => void copy(contract.address)}>{t.copy}</button>
  </article>;
  return <section id="king-contracts" className="king-section king-contracts" aria-labelledby="king-contracts-title">
    <span className="king-eyebrow">X LAYER · 196</span><h2 id="king-contracts-title">{t.contracts}</h2><p>{t.contractDesc}</p><div className="king-notice">{t.safety}</div>
    <div className="king-contract-grid">{KING_CONTRACTS.slice(0, 2).map(card)}</div>
    <details><summary>{t.technical} · 9</summary><div className="king-contract-grid">{KING_CONTRACTS.slice(2).map((c,i) => card(c,i+2))}</div></details>
    <p>{t.payment}: <a href={`https://www.oklink.com/xlayer/address/${BANMAO_KING_DEPLOYMENT.paymentToken}`} target="_blank" rel="noopener noreferrer"><code>{BANMAO_KING_DEPLOYMENT.paymentToken}</code> ↗</a></p>
    <p>{t.royalty}</p><p>{t.faq4Answer}</p><p><code>0x000000000000000000000000000000000000dEaD</code></p>
    <p role="status">{copyStatus ? t[copyStatus] : ""}</p>
  </section>;
}
