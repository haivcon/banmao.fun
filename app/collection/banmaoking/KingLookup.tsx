"use client";
import { kingLookupCopy } from './i18n/lookup';
import { localizedKingAttribute } from './i18n/traits';
import { xLayerExplorerUrl } from "../../../lib/explorer";
import { metadataTraits, compositionCode, compositionSharePath } from "./composition";
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";
import { erc721Abi, type PublicClient } from "viem";
import { kingAbi, kingAddress, decodeKingMetadata } from "./mint";
import { identifiedKingImage, kingSharePath, parseKingId } from "./identity";
import { animatedKingImage } from "./animated-image";
import type { Lang } from "./i18n";
import KingMetadataRefresh from "./KingMetadataRefresh";
import { copyKingAddress } from "./king-notifications";
import { notifyKingSound } from './king-sound';

export default function KingLookup({ lang }: { lang: Lang }) {
  const client = usePublicClient({ chainId: 196 }) as PublicClient | undefined;
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(0);
  const refreshId = useMemo(() => {
    try { return parseKingId(query); } catch { return undefined; }
  }, [query]);
  const [status, setStatus] = useState<"idle" | "loading" | "invalid" | "missing" | "error" | "ready">("idle");
  const [result, setResult] = useState<{ id: bigint; owner: string; metadata: ReturnType<typeof decodeKingMetadata>; image: string }>();
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) { setInput(token); setQuery(token); }
  }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      setResult(undefined);
      if (!query) { setStatus("idle"); return; }
      let id: bigint;
      try { id = parseKingId(query); } catch { setStatus("invalid"); return; }
      setStatus("loading");
      if (!client) { setStatus("error"); return; }
      try {
        const blockNumber = await client.getBlockNumber();
        const supply = await client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "totalSupply", blockNumber });
        if (!active) return;
        if (id > supply) { setStatus("missing"); return; }
        const [uri, owner] = await Promise.all([
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: kingAbi, functionName: "tokenURI", args: [id], blockNumber }),
          client.readContract({ authorizationList: undefined, address: kingAddress, abi: erc721Abi, functionName: "ownerOf", args: [id], blockNumber }),
        ]);
        const metadata = decodeKingMetadata(uri);
        const image = identifiedKingImage(animatedKingImage(metadata.image), metadataTraits(metadata.attributes));
        if (active) { setResult({ id, owner, metadata, image }); setStatus("ready"); }
      } catch { if (active) setStatus("error"); }
    }
    void load();
    return () => { active = false; };
  }, [query, retry, client]);
  useEffect(() => {
    if (status === 'ready') notifyKingSound('success');
    if (status === 'invalid' || status === 'missing' || status === 'error') notifyKingSound('error');
  }, [status]);
  return <section id="king-lookup" className="king-section king-mint-box">
    <div className="king-lookup-bar"><header className="king-lookup-heading">
      <span className="king-lookup-eyebrow">BANMAO KING · X LAYER</span>
      <h2>{kingLookupCopy(lang, "Find your king")}</h2>
      <p>{kingLookupCopy(lang, "Every ID, a king of its own. Explore minted artwork and traits — no wallet required.")}</p>
    </header>
    <form className="king-lookup-form" onSubmit={event => { event.preventDefault(); setQuery(input.trim()); setRetry(n => n + 1); }}>
      <label htmlFor="king-token-input">{kingLookupCopy(lang, "NFT ID")}</label>
      <div className="king-lookup-search">
        <input id="king-token-input" value={input} onChange={e => setInput(e.target.value)} placeholder={kingLookupCopy(lang, "Example: 42")} inputMode="numeric" maxLength={79} required aria-describedby="king-lookup-hint king-lookup-status" aria-invalid={status === "invalid" && input.trim() === query} />
        <button type="submit" disabled={status === "loading"}>{status === "loading" ? (kingLookupCopy(lang, "Searching…")) : (kingLookupCopy(lang, "Find king"))}</button>
      </div>
      <small id="king-lookup-hint">{kingLookupCopy(lang, "Enter an ID from 1, optionally with #. Press Enter to search.")}</small>
    </form></div>
    <p id="king-lookup-status" role="status" aria-live="polite">{status === "loading" ? (kingLookupCopy(lang, "Reading blockchain…")) : status === "invalid" ? (kingLookupCopy(lang, "Invalid token ID. Enter a whole number from 1.")) : status === "missing" ? (kingLookupCopy(lang, "This NFT has not been minted. Try another ID.")) : status === "error" ? (kingLookupCopy(lang, "Unable to read data. Your ID is saved so you can retry.")) : status === "ready" && result ? ` ${kingLookupCopy(lang, "King")} #${result.id}` : ""}</p>
    {status === 'idle' && <p className="king-lookup-empty">{kingLookupCopy(lang, "Enter an NFT ID to view its artwork and owner on X Layer.")}</p>}
    {query && <button type="button" disabled={status === "loading"} onClick={() => setRetry(n => n + 1)}>{kingLookupCopy(lang, "Reload metadata (free)")}</button>}
    {refreshId !== undefined && (status === "ready" || status === "error") && <KingMetadataRefresh tokenId={refreshId} lang={lang} />}
    {result && <div className="king-lookup-result">
      <figure className="king-lookup-artwork">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={result.image} alt={result.metadata.name} width={512} height={512} />
        <figcaption>BANMAO KING <span>#{result.id.toString()}</span></figcaption>
      </figure>
      <div className="king-lookup-details">
        <span className="king-lookup-eyebrow">{kingLookupCopy(lang, "ON-CHAIN COLLECTION")}</span>
        <h3>{kingLookupCopy(lang, "King")} #{result.id.toString()}</h3>
        <p className="king-lookup-name">{result.metadata.name}</p>
        <div className="king-lookup-actions">
          <button type="button" onClick={() => void copyKingAddress(result.id.toString(), lang)}>{kingLookupCopy(lang, "Copy ID")}</button>
          <button type="button" onClick={() => void copyKingAddress(new URL(kingSharePath(result.id), window.location.origin).href, lang)}>{kingLookupCopy(lang, "Copy link")}</button>
          <a href={kingSharePath(result.id)}>{kingLookupCopy(lang, "NFT permalink")}</a>
        </div>
        <h4>{kingLookupCopy(lang, "King traits")}</h4>
        <dl className="king-lookup-traits">{result.metadata.attributes.map((a, index) => <div key={`${a.trait_type}-${index}`}><dt>{localizedKingAttribute(lang, a).label}</dt><dd>{localizedKingAttribute(lang, a).value}</dd></div>)}</dl>
        <div className="king-lookup-owner"><span>{kingLookupCopy(lang, "On-chain owner")}</span><a href={xLayerExplorerUrl("address", result.owner, lang)} target="_blank" rel="noopener noreferrer">{result.owner}<span> {kingLookupCopy(lang, "View on explorer ↗")}</span></a></div>
        <details key={result.id.toString()} className="king-lookup-technical">
          <summary>{kingLookupCopy(lang, "Technical details & SVG downloads")}</summary>
          <p>{kingLookupCopy(lang, "Composition")}: <a href={compositionSharePath(metadataTraits(result.metadata.attributes))}>{compositionCode(metadataTraits(result.metadata.attributes))}</a></p>
          <p>Contract: <a href={xLayerExplorerUrl("address", kingAddress, lang)} target="_blank" rel="noopener noreferrer">{kingAddress}</a></p>
          <p><a href={result.image} download={`BanmaoKing-${result.id}-preview.svg`}>{kingLookupCopy(lang, "Download preview SVG with composition code")}</a></p>
          <p><a href={result.metadata.image} download={`BanmaoKing-${result.id}-original.svg`}>{kingLookupCopy(lang, "Download original on-chain SVG")}</a></p>
        </details>
        <p className="king-lookup-disclaimer">{kingLookupCopy(lang, "A preview is not proof of ownership. Verify the contract and owner before buying.")}</p>
      </div>
    </div>}
  </section>;
}
