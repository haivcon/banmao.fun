"use client";
import { xLayerExplorerUrl } from "../../../lib/explorer";
import { metadataTraits, compositionCode, compositionSharePath } from "./composition";
import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { erc721Abi, type PublicClient } from "viem";
import { kingAbi, kingAddress, decodeKingMetadata } from "./mint";
import { identifiedKingImage, kingSharePath, parseKingId } from "./identity";
import { animatedKingImage } from "./animated-image";
import type { Lang } from "./i18n";
import KingMetadataRefresh from "./KingMetadataRefresh";
import { copyKingAddress } from "./king-notifications";

export default function KingLookup({ lang }: { lang: Lang }) {
  const client = usePublicClient({ chainId: 196 }) as PublicClient | undefined;
  const vi = lang === "vi";
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(0);
  let refreshId: bigint | undefined;
  try { refreshId = parseKingId(query); } catch { /* Invalid IDs cannot be refreshed. */ }
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
      if (!client) return;
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
  return <section id="king-lookup" className="king-section king-mint-box">
    <header className="king-lookup-heading">
      <span className="king-lookup-eyebrow">BANMAO KING · X LAYER</span>
      <h2>{vi ? "Tìm nhà vua của bạn" : "Find your king"}</h2>
      <p>{vi ? "Mỗi mã số, một nhà vua. Khám phá artwork và đặc điểm của NFT đã mint — không cần kết nối ví." : "Every ID, a king of its own. Explore minted artwork and traits — no wallet required."}</p>
    </header>
    <form className="king-lookup-form" onSubmit={event => { event.preventDefault(); setQuery(input.trim()); setRetry(n => n + 1); }}>
      <label htmlFor="king-token-input">{vi ? "Mã NFT" : "NFT ID"}</label>
      <div className="king-lookup-search">
        <input id="king-token-input" value={input} onChange={e => setInput(e.target.value)} placeholder={vi ? "Ví dụ: 42" : "Example: 42"} inputMode="numeric" maxLength={79} required aria-describedby="king-lookup-hint king-lookup-status" aria-invalid={status === "invalid" && input.trim() === query} />
        <button type="submit" disabled={status === "loading"}>{status === "loading" ? (vi ? "Đang tìm…" : "Searching…") : (vi ? "Tìm nhà vua" : "Find king")}</button>
      </div>
      <small id="king-lookup-hint">{vi ? "Nhập số từ 1, có thể kèm dấu #. Nhấn Enter để tra cứu." : "Enter an ID from 1, optionally with #. Press Enter to search."}</small>
    </form>
    <p id="king-lookup-status" role="status" aria-live="polite">{status === "loading" ? (vi ? "Đang đọc blockchain…" : "Reading blockchain…") : status === "invalid" ? (vi ? "Mã số không hợp lệ. Nhập số nguyên từ 1." : "Invalid token ID. Enter a whole number from 1.") : status === "missing" ? (vi ? "NFT này chưa được mint. Hãy thử một mã khác." : "This NFT has not been minted. Try another ID.") : status === "error" ? (vi ? "Không đọc được dữ liệu. Mã đã nhập được giữ lại để bạn thử lại." : "Unable to read data. Your ID is saved so you can retry.") : status === "ready" && result ? (vi ? `Đã tìm thấy nhà vua #${result.id}.` : `Found king #${result.id}.`) : ""}</p>
    {status === "idle" && <div className="king-lookup-empty"><span aria-hidden="true">#</span><h3>{vi ? "Nhà vua nào đang chờ bạn?" : "Which king awaits you?"}</h3><p>{vi ? "Nhập mã NFT ở trên để xem artwork, đặc điểm và chủ sở hữu on-chain." : "Enter an NFT ID above to reveal its artwork, traits and on-chain owner."}</p></div>}
    {query && <button type="button" disabled={status === "loading"} onClick={() => setRetry(n => n + 1)}>{vi ? "Tải lại metadata (miễn phí)" : "Reload metadata (free)"}</button>}
    {refreshId !== undefined && (status === "ready" || status === "error") && <KingMetadataRefresh tokenId={refreshId} isVi={vi} />}
    {result && <div className="king-lookup-result">
      <figure className="king-lookup-artwork">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={result.image} alt={result.metadata.name} width={512} height={512} />
        <figcaption>BANMAO KING <span>#{result.id.toString()}</span></figcaption>
      </figure>
      <div className="king-lookup-details">
        <span className="king-lookup-eyebrow">{vi ? "BỘ SƯU TẬP ON-CHAIN" : "ON-CHAIN COLLECTION"}</span>
        <h3>{vi ? "Nhà vua" : "King"} #{result.id.toString()}</h3>
        <p className="king-lookup-name">{result.metadata.name}</p>
        <div className="king-lookup-actions">
          <button type="button" onClick={() => void copyKingAddress(result.id.toString(), lang)}>{vi ? "Sao chép mã" : "Copy ID"}</button>
          <button type="button" onClick={() => void copyKingAddress(new URL(kingSharePath(result.id), window.location.origin).href, lang)}>{vi ? "Sao chép liên kết" : "Copy link"}</button>
          <a href={kingSharePath(result.id)}>{vi ? "Liên kết NFT" : "NFT permalink"}</a>
        </div>
        <h4>{vi ? "Đặc điểm nhà vua" : "King traits"}</h4>
        <dl className="king-lookup-traits">{result.metadata.attributes.map((a, index) => <div key={`${a.trait_type}-${index}`}><dt>{a.trait_type}</dt><dd>{a.value}</dd></div>)}</dl>
        <div className="king-lookup-owner"><span>{vi ? "Chủ sở hữu on-chain" : "On-chain owner"}</span><a href={xLayerExplorerUrl("address", result.owner, lang)} target="_blank" rel="noopener noreferrer">{result.owner}<span> {vi ? "Xem trên explorer ↗" : "View on explorer ↗"}</span></a></div>
        <details key={result.id.toString()} className="king-lookup-technical">
          <summary>{vi ? "Thông tin kỹ thuật & tải SVG" : "Technical details & SVG downloads"}</summary>
          <p>{vi ? "Mã phối cảnh" : "Composition"}: <a href={compositionSharePath(metadataTraits(result.metadata.attributes))}>{compositionCode(metadataTraits(result.metadata.attributes))}</a></p>
          <p>Contract: <a href={xLayerExplorerUrl("address", kingAddress, lang)} target="_blank" rel="noopener noreferrer">{kingAddress}</a></p>
          <p><a href={result.image} download={`BanmaoKing-${result.id}-preview.svg`}>{vi ? "Tải SVG xem thử có mã phối cảnh" : "Download preview SVG with composition code"}</a></p>
          <p><a href={result.metadata.image} download={`BanmaoKing-${result.id}-original.svg`}>{vi ? "Tải SVG gốc on-chain" : "Download original on-chain SVG"}</a></p>
        </details>
        <p className="king-lookup-disclaimer">{vi ? "Ảnh xem thử không chứng minh quyền sở hữu. Kiểm tra đúng contract và chủ sở hữu trước khi mua." : "A preview is not proof of ownership. Verify the contract and owner before buying."}</p>
      </div>
    </div>}
  </section>;
}
