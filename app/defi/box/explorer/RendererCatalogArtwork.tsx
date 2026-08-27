"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { encodePacked, pad, parseAbi, toBytes, toHex } from "viem";
import { usePublicClient } from "wagmi";
import { XLAYER_CHAIN_ID } from "../../../lib/walletConfig";
import { svgImageDataUri } from "../safety";
import type { RendererCatalogEntry } from "./rendererCatalog";

const CURRENT_RENDERER_ABI = parseAbi([
  "function renderSVG(uint256 tokenId, (address token,address creator,uint256 amount,uint128 timestamps,uint8 tokenDecimals,uint8 assetCount,bytes16 tokenSymbol,bytes renderAssets) data) view returns (string)",
]);
const COMPACT_RENDERER_ABI = parseAbi([
  "function renderSVG(uint256 tokenId, (address token,uint256 amount,uint128 timestamps,uint8 tokenDecimals,uint8 assetCount,bytes16 tokenSymbol,bytes renderAssets) data) view returns (string)",
]);
const LEGACY_RENDERER_ABI = parseAbi([
  "function renderSVG(uint256 tokenId, (address token,address creator,uint256 amount,uint128 timestamps,uint8 tokenDecimals,uint8 assetCount,string tokenSymbol) data) view returns (string)",
]);
const TOKEN = "0x16d91d1615fC55b76d5F92365BD60C069b46eF78" as const;
const CREATOR = "0x92809f2837f708163d375960063C8A3156fCeACb" as const;
const AMOUNT = 125_000_000n * 10n ** 18n;
const CREATED_AT = 1_776_470_400n;
const UNLOCK_TIME = CREATED_AT + 100n * 86_400n;
const TIMESTAMPS = (CREATED_AT << 64n) | UNLOCK_TIME;
const SYMBOL = pad(toHex(toBytes("BANMAO")), { size: 16, dir: "right" });
const ASSETS = encodePacked(
  ["address", "uint256", "uint8", "bytes16"],
  [TOKEN, AMOUNT, 18, SYMBOL],
);

export function rendererFixture(entry: RendererCatalogEntry) {
  const common = { token: TOKEN, amount: AMOUNT, timestamps: TIMESTAMPS, tokenDecimals: 18, assetCount: 1 } as const;
  if (entry.schema === "legacy") return { abi: LEGACY_RENDERER_ABI, data: { ...common, creator: CREATOR, tokenSymbol: "BANMAO" } };
  if (entry.schema === "compact") return { abi: COMPACT_RENDERER_ABI, data: { ...common, tokenSymbol: SYMBOL, renderAssets: ASSETS } };
  return { abi: CURRENT_RENDERER_ABI, data: { ...common, creator: CREATOR, tokenSymbol: SYMBOL, renderAssets: ASSETS } };
}

export function RendererCatalogArtwork({ entry, alt }: { entry: RendererCatalogEntry; alt: string }) {
  const client = usePublicClient({ chainId: XLAYER_CHAIN_ID });
  const [artwork, setArtwork] = useState(entry.fallbackArtwork);
  const fixture = useMemo(() => rendererFixture(entry), [entry]);

  useEffect(() => {
    let current = true;
    if (!client) return;
    void client.readContract({
      address: entry.address,
      abi: fixture.abi,
      functionName: "renderSVG",
      args: [3n, fixture.data],
    } as never).then((svg) => {
      if (current && typeof svg === "string") setArtwork(svgImageDataUri(svg));
    }).catch(() => {
      if (current) setArtwork(entry.fallbackArtwork);
    });
    return () => { current = false; };
  }, [client, entry.address, entry.fallbackArtwork, fixture]);

  return <Image src={artwork} alt={alt} width={600} height={600} unoptimized />;
}
