"use client";
import { metadataTraits, compositionCode, compositionSharePath } from "./composition";
import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { erc721Abi, type PublicClient } from "viem";
import { kingAbi, kingAddress, decodeKingMetadata } from "./mint";
import { identifiedKingImage, kingSharePath, parseKingId } from "./identity";
import { animatedKingImage } from "./animated-image";
import type { Lang } from "./i18n";

export default function KingLookup({ lang }: { lang: Lang }) {
  const client = usePublicClient({ chainId: 196 }) as PublicClient | undefined;
  const vi = lang === "vi";
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(0);
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
      if (!query) return;
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
    <h2>{vi ? "Tra cứu NFT bằng mã số" : "Look up an NFT by ID"}</h2>
    <p>{vi ? "Nhập mã NFT đã mint để xem ảnh thật, chủ sở hữu và tải SVG. Không cần kết nối ví." : "View minted artwork, its owner and download the SVG. No wallet required."}</p>
    <form className="king-wallet-row" onSubmit={event => { event.preventDefault(); setQuery(input.trim()); setRetry(n => n + 1); }}>
      <label htmlFor="king-token-input">Token ID</label>
      <input id="king-token-input" value={input} onChange={e => setInput(e.target.value)} placeholder="#42" inputMode="numeric" maxLength={79} required />
      <button type="submit">{vi ? "Xem NFT" : "View NFT"}</button>
    </form>
    <p role="status" aria-live="polite">{status === "loading" ? (vi ? "Đang đọc blockchain…" : "Reading blockchain…") : status === "invalid" ? (vi ? "Mã số không hợp lệ." : "Invalid token ID.") : status === "missing" ? (vi ? "NFT này chưa được mint." : "This NFT has not been minted.") : status === "error" ? (vi ? "Không đọc được dữ liệu. Vui lòng thử lại." : "Unable to read data. Please retry.") : ""}</p>
    {result && <div>
      <h3>{result.metadata.name} · #{result.id.toString()}</h3>
      <p><a href={compositionSharePath(metadataTraits(result.metadata.attributes))}>{compositionCode(metadataTraits(result.metadata.attributes))}</a></p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={result.image} alt={result.metadata.name} width={512} height={512} style={{ maxWidth: "100%", height: "auto" }} />
      <p>{result.metadata.attributes.map(a => `${a.trait_type}: ${a.value}`).join(" · ")}</p>
      <p>{vi ? "Chủ sở hữu" : "Owner"}: <a href={`https://www.oklink.com/xlayer/address/${result.owner}`} target="_blank" rel="noopener noreferrer">{result.owner}</a></p>
      <p><a href={kingSharePath(result.id)}>{vi ? "Liên kết chia sẻ (sao chép liên kết này)" : "Share link (copy this link)"}</a></p>
      <p><a href={result.image} download={`BanmaoKing-${result.id}-preview.svg`}>{vi ? "Tải SVG xem thử có mã số" : "Download preview SVG with ID"}</a></p>
      <p><a href={result.metadata.image} download={`BanmaoKing-${result.id}-original.svg`}>{vi ? "Tải SVG gốc on-chain" : "Download original on-chain SVG"}</a></p>
      <p>{vi ? "Ảnh xem thử không chứng minh quyền sở hữu. Kiểm tra đúng contract và chủ sở hữu trước khi mua." : "A preview is not proof of ownership. Verify the contract and owner before buying."} {kingAddress}</p>
    </div>}
  </section>;
}
