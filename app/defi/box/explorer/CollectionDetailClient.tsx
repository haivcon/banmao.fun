"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, isAddress } from "viem";
import { XLAYER_CHAIN_ID } from "../../../lib/walletConfig";
import { getBoxChainConfig, isBoxChainId } from "../contracts";
import { BOX_LANGUAGES, getInitialBoxLanguage, type BoxLanguage } from "../i18n";
import { explorerCopy } from "./copy";
import { formatInteger, formatTokenAmount, NUMBER_LOCALES } from "./numberFormat";
import { TokenLogo } from "./TokenLogo";
import type { CollectionDetailResponse } from "./types";
import { VerificationBadge } from "./VerificationBadge";
import "./explorer.css";

export function CollectionDetailClient({ address }: { address: string }) {
  const [language, setLanguage] = useState<BoxLanguage>("en");
  const copy = useMemo(() => explorerCopy(language), [language]), [data, setData] = useState<CollectionDetailResponse | null>(null), [error, setError] = useState(false);
  const chainParam = typeof window === "undefined" ? XLAYER_CHAIN_ID : Number(new URLSearchParams(window.location.search).get("chainId") || XLAYER_CHAIN_ID);
  const chainId = isBoxChainId(chainParam) ? chainParam : XLAYER_CHAIN_ID;
  useEffect(() => {
    setLanguage(getInitialBoxLanguage());
    const handleLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<BoxLanguage>).detail;
      if (BOX_LANGUAGES.includes(next)) setLanguage(next);
    };
    window.addEventListener("banmao:language-change", handleLanguageChange);
    return () => window.removeEventListener("banmao:language-change", handleLanguageChange);
  }, []);
  useEffect(() => {
    if (!isAddress(address)) { setError(true); return; }
    const controller = new AbortController();
    void fetch(`/api/banmaobox/collections/${address}?chainId=${chainId}`, { signal: controller.signal }).then(async (response) => { if (!response.ok) throw new Error(); setData(await response.json()); }).catch((reason) => { if (reason?.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, [address, chainId]);
  const explorer = getBoxChainConfig(chainId).chain.blockExplorers?.default.url ?? "";
  if (error) return <main className="bce-shell"><Link className="bce-back" href="/defi/box/explorer"><ArrowLeft />{copy.title}</Link><section className="bce-state"><p>{copy.error}</p></section></main>;
  if (!data) return <main className="bce-shell"><section className="bce-state"><RefreshCw className="spin" /><p>{copy.loading}</p></section></main>;
  const item = data.collection;
  return <main className="bce-shell bce-detail">
    <Link className="bce-back" href={`/defi/box/explorer?chainId=${chainId}`}><ArrowLeft />{copy.title}</Link>
    <section className="bce-detail-hero"><TokenLogo chainId={item.chainId} tokenAddress={item.tokenAddress} symbol={item.symbol} /><div><span className="bce-kicker">{copy.detailTitle}</span><h1>{item.name}</h1><p>{item.symbol} · {item.boxAddress}</p></div><VerificationBadge status={item.verification.status} copy={copy} /></section>
    <section className="bce-metrics"><article><span>{copy.supplyLabel}</span><strong>{formatInteger(item.totalSupply, language)}</strong></article><article><span>{copy.lockedLabel}</span><strong>{formatTokenAmount(formatUnits(BigInt(item.totalLocked), item.decimals), language)} {item.symbol}</strong></article><article><span>{copy.created}</span><strong>{new Date(item.createdAt).toLocaleDateString(NUMBER_LOCALES[language])}</strong></article></section>
    <div className="bce-detail-grid"><section className="bce-panel"><h2>{copy.verification}</h2><div className="bce-checks">{item.verification.checks.map((check) => <div key={check.id}>{check.passed ? <CheckCircle2 /> : <XCircle />}<span>{check.label}</span><strong>{check.passed ? copy.pass : copy.fail}</strong></div>)}</div></section>
    <section className="bce-panel"><h2>{copy.provenance}</h2><dl className="bce-provenance"><div><dt>{copy.token}</dt><dd className="bce-address"><a href={`${explorer}/address/${item.tokenAddress}`}>{item.tokenAddress} <ExternalLink /></a></dd></div><div><dt>{copy.factory}</dt><dd className="bce-address">{item.factoryAddress}</dd></div><div><dt>{copy.renderer}</dt><dd className="bce-address">{item.renderer}</dd></div><div><dt>{copy.transaction}</dt><dd className="bce-address"><a href={`${explorer}/tx/${item.transactionHash}`}>{item.transactionHash} <ExternalLink /></a></dd></div></dl></section></div>
    <section className="bce-panel"><h2>{copy.activity}</h2>{data.activity.length ? <div className="bce-activity">{data.activity.map((event) => <a key={`${event.transactionHash}:${event.tokenId}`} href={`${explorer}/tx/${event.transactionHash}`} target="_blank" rel="noreferrer"><strong>#{event.tokenId}</strong><span className="bce-address">{copy.recipient}: {event.to}</span><time>{new Date(event.createdAt).toLocaleString()}</time><ExternalLink /></a>)}</div> : <p>{copy.noActivity}</p>}</section>
  </main>;
}
