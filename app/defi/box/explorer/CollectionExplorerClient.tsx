"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDownUp, ArrowLeft, ArrowRight, Boxes, Check, ChevronDown, ExternalLink, Factory, Layers3, Network, RefreshCw, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatUnits } from "viem";
import { BANMAOBOX_TESTNET_UI_ENABLED, XLAYER_CHAIN_ID, XLAYER_TESTNET_CHAIN_ID } from "../../../lib/walletConfig";
import { getBoxChainConfig, type BoxChainId } from "../contracts";
import { BOX_LANGUAGES, getInitialBoxLanguage, type BoxLanguage } from "../i18n";
import { collectionExplorerCacheKey, readCollectionExplorerCache, writeCollectionExplorerCache } from "./collectionExplorerCache";
import { explorerCopy } from "./copy";
import { formatInteger, formatTokenAmount, NUMBER_LOCALES } from "./numberFormat";
import { MAINNET_RENDERER_CATALOG } from "./rendererCatalog";
import { TokenLogo } from "./TokenLogo";
import type { CollectionExplorerResponse, CollectionSort } from "./types";
import { VerificationBadge } from "./VerificationBadge";
import "./explorer.css";

type SelectOption<T extends string | number> = { value: T; label: string };

function ExplorerSelect<T extends string | number>({ label, value, options, onChange, icon }: {
  label: string; value: T; options: SelectOption<T>[]; onChange: (value: T) => void; icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [open]);

  return <div className={`bce-select${open ? " is-open" : ""}`} ref={rootRef}>
    <button type="button" className="bce-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((value) => !value)}>
      <span className="bce-select-icon" aria-hidden="true">{icon}</span><span>{selected.label}</span><ChevronDown className="bce-select-chevron" />
    </button>
    {open ? <div className="bce-select-menu" id={menuId} role="listbox" aria-label={label}>
      {options.map((option) => <button type="button" role="option" aria-selected={option.value === value} className={option.value === value ? "is-selected" : ""} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}><span>{option.label}</span>{option.value === value ? <Check /> : null}</button>)}
    </div> : null}
  </div>;
}

export function CollectionExplorerClient() {
  const [language, setLanguage] = useState<BoxLanguage>("en");
  const copy = useMemo(() => explorerCopy(language), [language]);
  const [chainId, setChainId] = useState<BoxChainId>(XLAYER_CHAIN_ID), [search, setSearch] = useState(""), [query, setQuery] = useState("");
  const [sort, setSort] = useState<CollectionSort>("newest"), [page, setPage] = useState(1), [data, setData] = useState<CollectionExplorerResponse | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState(false), [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    setLanguage(getInitialBoxLanguage());
    const handleLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<BoxLanguage>).detail;
      if (BOX_LANGUAGES.includes(next)) setLanguage(next);
    };
    window.addEventListener("banmao:language-change", handleLanguageChange);
    return () => window.removeEventListener("banmao:language-change", handleLanguageChange);
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { setQuery(search); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [search]);
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    const params = new URLSearchParams({ chainId: String(chainId), page: String(page), pageSize: "12", search: query, sort, ...(refreshKey ? { refresh: "true" } : {}) });
    const key = collectionExplorerCacheKey(chainId, `${page}:${sort}:${query}`);
    setLoading(true); setError(false);
    void readCollectionExplorerCache(key).then((cached) => { if (current && cached) { setData(cached); setLoading(false); } });
    void fetch(`/api/banmaobox/collections?${params}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("index unavailable");
      const value = await response.json() as CollectionExplorerResponse;
      if (current) { setData(value); setLoading(false); void writeCollectionExplorerCache(key, value); }
    }).catch((reason) => { if (current && reason?.name !== "AbortError") { setError(true); setLoading(false); } });
    return () => { current = false; controller.abort(); };
  }, [chainId, page, query, refreshKey, sort]);
  const explorer = getBoxChainConfig(chainId).chain.blockExplorers?.default.url ?? "";
  const sortOptions: SelectOption<CollectionSort>[] = [
    { value: "newest", label: copy.newest }, { value: "oldest", label: copy.oldest }, { value: "supply", label: copy.supply }, { value: "locked", label: copy.locked },
  ];
  const chainOptions: SelectOption<BoxChainId>[] = [
    { value: XLAYER_CHAIN_ID, label: "X Layer" }, { value: XLAYER_TESTNET_CHAIN_ID, label: "X Layer Testnet" },
  ];
  return <main className="bce-shell">
    <header className="bce-topbar"><Link href="/defi/box"><ArrowLeft />{copy.back}</Link><div className="bce-live"><span />{copy.live}</div></header>
    <section className="bce-hero"><div><span className="bce-kicker"><Sparkles />{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.subtitle}</p></div><div className="bce-orbit" aria-hidden="true"><Factory /><span /><span /></div></section>
    <section className="bce-metrics">
      <article><Boxes /><span>{copy.collections}</span><strong>{data ? formatInteger(data.total, language) : "—"}</strong></article><article><Layers3 /><span>{copy.nfts}</span><strong>{data ? formatInteger(data.totals.nfts, language) : "—"}</strong></article>
      <article><ShieldCheck /><span>{copy.verified}</span><strong>{data ? formatInteger(data.totals.verified, language) : "—"}</strong></article><article><Factory /><span>{copy.factories}</span><strong>{data ? formatInteger(data.lineage.length, language) : "—"}</strong></article>
    </section>
    <section className="bce-toolbar">
      <label className="bce-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} aria-label={copy.search} /></label>
      <ExplorerSelect label={copy.sort} value={sort} options={sortOptions} icon={<ArrowDownUp />} onChange={(value) => { setSort(value); setPage(1); }} />
      {BANMAOBOX_TESTNET_UI_ENABLED ? <ExplorerSelect label="Network" value={chainId} options={chainOptions} icon={<Network />} onChange={(value) => { setChainId(value); setPage(1); }} /> : null}
      <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}><RefreshCw className={loading ? "spin" : ""} />{copy.refresh}</button>
    </section>

    {error && !data ? <section className="bce-state"><p>{copy.error}</p><button onClick={() => setRefreshKey((value) => value + 1)}>{copy.retry}</button></section> : null}
    {loading && !data ? <section className="bce-state"><RefreshCw className="spin" /><p>{copy.loading}</p></section> : null}
    {data && data.collections.length === 0 ? <section className="bce-state"><Search /><p>{copy.empty}</p><button onClick={() => setSearch("")}>{copy.clear}</button></section> : null}
    <section className="bce-grid" aria-busy={loading}>
      {data?.collections.map((item) => <article className="bce-card" key={item.boxAddress}>
        <header><TokenLogo chainId={item.chainId} tokenAddress={item.tokenAddress} symbol={item.symbol} /><div><h2>{item.name}</h2><span className="bce-address">{item.symbol} · {item.tokenAddress}</span></div><VerificationBadge status={item.verification.status} copy={copy} /></header>
        <div className="bce-card-metrics"><div><span>{copy.supplyLabel}</span><strong>{formatInteger(item.totalSupply, language)}</strong></div><div><span>{copy.lockedLabel}</span><strong>{formatTokenAmount(formatUnits(BigInt(item.totalLocked), item.decimals), language)} <small>{item.symbol}</small></strong></div></div>
        <dl><div><dt>{copy.collection}</dt><dd className="bce-address"><a href={`${explorer}/address/${item.boxAddress}`} target="_blank" rel="noreferrer">{item.boxAddress}</a></dd></div><div><dt>{copy.creator}</dt><dd className="bce-address">{item.creator}</dd></div><div><dt>{copy.created}</dt><dd>{new Date(item.createdAt).toLocaleDateString(NUMBER_LOCALES[language])}</dd></div></dl>
        <Link className="bce-card-link" href={`/defi/box/explorer/${item.boxAddress}?chainId=${chainId}`}>{copy.details}<ArrowRight /></Link>
      </article>)}
    </section>
    {data ? <nav className="bce-pagination" aria-label="Pagination"><button disabled={data.page <= 1} onClick={() => setPage((value) => value - 1)}><ArrowLeft />{copy.previous}</button><span>{copy.page} {data.page} / {data.totalPages}</span><button disabled={data.page >= data.totalPages} onClick={() => setPage((value) => value + 1)}>{copy.next}<ArrowRight /></button></nav> : null}
    {chainId === XLAYER_CHAIN_ID ? <section className="bce-renderers"><header><Sparkles /><div><h2>{copy.renderers}</h2><p>{copy.renderersHelp}</p></div></header><div className="bce-renderer-grid">{MAINNET_RENDERER_CATALOG.map((renderer, index) => <article className={index === 0 ? "is-current" : ""} key={renderer.address}><div className="bce-renderer-art"><Image src={renderer.artwork} alt={`${renderer.generation} renderer artwork`} width={600} height={600} unoptimized /></div><div className="bce-renderer-copy"><span>{index === 0 ? copy.currentRenderer : copy.historicalRenderer}</span><h3>{renderer.generation}</h3><a className="bce-address" href={`${explorer}/address/${renderer.address}`} target="_blank" rel="noreferrer">{renderer.address}<ExternalLink /></a><dl><div><dt>{copy.introduced}</dt><dd>{renderer.introducedAt}</dd></div><div><dt>{copy.rendererRuntime}</dt><dd>{formatInteger(renderer.runtimeBytes, language)} bytes</dd></div></dl><code title={renderer.runtimeHash}>{renderer.runtimeHash}</code></div></article>)}</div></section> : null}
    {data ? <section className="bce-lineage"><header><Factory /><div><h2>{copy.lineage}</h2><p>{copy.lineageHelp}</p></div></header><div>{data.lineage.map((factory) => <article key={factory.address}><span>{factory.depth === 0 ? copy.currentFactory : copy.predecessor}</span><a href={`${explorer}/address/${factory.address}`} target="_blank" rel="noreferrer">{factory.address}</a><small className="bce-address">{copy.rendererAdmin}: {factory.rendererAdmin}</small></article>)}</div><footer>{copy.observed}: {new Date(data.observedAt).toLocaleString()} · {copy.block} {data.latestBlock}</footer></section> : null}
  </main>;
}
