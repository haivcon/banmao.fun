"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BANMAO_TOKEN_ADDRESS, XLAYER_CHAIN_ID } from "../contracts";
import { Activity, BarChart3, Newspaper, ShieldCheck, WalletCards } from "lucide-react";

type Props = {
    walletAddress?: `0x${string}`;
    t: Record<string, any>;
};

type OkxState = {
    disabled?: boolean;
    reason?: string;
    chainSupported?: boolean;
    price?: string;
    totalValue?: string;
    balance?: string;
    newsTitle?: string;
    error?: string;
};

export default function OkxInsights({ walletAddress, t }: Props) {
    const [state, setState] = useState<OkxState>({});
    const token = BANMAO_TOKEN_ADDRESS;
    const chain = String(XLAYER_CHAIN_ID);

    const urls = useMemo(() => {
        const q = new URLSearchParams({ chainIndex: chain });
        const tokenQ = new URLSearchParams({ chainIndex: chain, tokenContractAddress: token });
        const balanceQ = new URLSearchParams({ chainIndex: chain, address: walletAddress || "", tokenContractAddress: token });
        return {
            supported: `/api/okx/api/v6/dex/aggregator/supported/chain`,
            price: `/api/okx/api/v6/dex/market/price?${tokenQ.toString()}`,
            balance: walletAddress ? `/api/okx/api/v6/dex/balance/token-balances-by-address?${balanceQ.toString()}` : "",
            totalValue: walletAddress ? `/api/okx/api/v6/dex/balance/total-value-by-address?${new URLSearchParams({ chainIndex: chain, address: walletAddress }).toString()}` : "",
            liquidity: `/api/okx/api/v6/dex/aggregator/get-liquidity?${q.toString()}`,
            news: `/api/okx/api/v6/dex/market/social/news/latest?${new URLSearchParams({ limit: "1" }).toString()}`,
        };
    }, [chain, token, walletAddress]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const calls = [
                    fetch(urls.supported).then(r => r.json()),
                    fetch(urls.price).then(r => r.json()),
                    urls.balance ? fetch(urls.balance).then(r => r.json()) : Promise.resolve(null),
                    urls.totalValue ? fetch(urls.totalValue).then(r => r.json()) : Promise.resolve(null),
                    fetch(urls.news).then(r => r.json()),
                ];
                const [supported, price, balance, totalValue, news] = await Promise.all(calls);
                if (cancelled) return;
                const disabled = [supported, price, balance, totalValue, news].find(x => x?.disabled);
                if (disabled) {
                    setState({ disabled: true, reason: disabled.reason });
                    return;
                }
                setState({
                    chainSupported: inferChainSupported(supported, chain),
                    price: extractFirst(price, ["price", "lastPrice", "tokenPrice", "priceUsd"]),
                    totalValue: extractFirst(totalValue, ["totalValue", "totalValueUsd", "valueUsd", "usdValue"]),
                    balance: extractFirst(balance, ["balance", "tokenBalance", "amount"]),
                    newsTitle: extractFirst(news, ["title", "headline"]),
                });
            } catch (err) {
                if (!cancelled) setState({ error: err instanceof Error ? err.message : (t.insightsUnavailable || "Insights unavailable") });
            }
        }
        load();
        return () => { cancelled = true; };
    }, [urls, chain, t.insightsUnavailable]);

    return (
        <div className="wc-okx-panel">
            <div className="wc-okx-head">
                <span className="wc-eyebrow">{t.xlayerInsights || "XLayer Insights"}</span>
                <h3><Activity size={17} strokeWidth={2.4} />{t.okxInsights || "OKX Read-Only"}</h3>
                <span className="wc-okx-sync-badge"><span className="wc-okx-sync-dot" />Live</span>
            </div>
            {state.disabled || state.error ? (
                <div className="wc-okx-disabled">
                    <ShieldCheck size={17} strokeWidth={2.4} />
                    <span>{state.reason || state.error || t.insightsUnavailable || "Insights unavailable"}</span>
                </div>
            ) : (
                <div className="wc-okx-grid">

                    <div className="wc-okx-news">
                        <span>
                            <Newspaper size={13} />{t.marketNews || "Market News"}
                            <span className="wc-news-hot-badge">HOT</span>
                        </span>
                        <strong>{state.newsTitle || <span className="wc-shimmer wc-shimmer-title" style={{ width: '100%', height: '14px' }}></span>}</strong>
                    </div>
                </div>
            )}
        </div>
    );
}

function inferChainSupported(data: unknown, chain: string) {
    const text = JSON.stringify(data || {});
    if (!text || text === "{}") return undefined;
    return text.includes(`"${chain}"`) || text.includes(`:${chain}`) || text.includes(chain);
}

function extractFirst(data: unknown, keys: string[]): string | undefined {
    const seen = new Set<unknown>();
    const walk = (value: unknown): string | undefined => {
        if (!value || typeof value !== "object" || seen.has(value)) return undefined;
        seen.add(value);
        if (Array.isArray(value)) {
            for (const item of value) {
                const found = walk(item);
                if (found) return found;
            }
            return undefined;
        }
        const obj = value as Record<string, unknown>;
        for (const key of keys) {
            const raw = obj[key];
            if (typeof raw === "string" && raw) return raw;
            if (typeof raw === "number") return String(raw);
        }
        for (const raw of Object.values(obj)) {
            const found = walk(raw);
            if (found) return found;
        }
        return undefined;
    };
    return walk(data);
}
