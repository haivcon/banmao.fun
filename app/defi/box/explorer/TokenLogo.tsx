"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Address } from "viem";

const PRESET_TOKEN_LOGOS: Record<string, string> = {
  "0x16d91d1615fc55b76d5f92365bd60c069b46ef78": "https://static.oklink.com/cdn/web3/currency/token/large/196-0x16d91d1615fc55b76d5f92365bd60c069b46ef78-110/type=default_90_0?v=1767692192564",
  "0x87669801a1fad6dad9db70d27ac752f452989667": "https://static.oklink.com/cdn/web3/currency/token/large/196-0x87669801a1fad6dad9db70d27ac752f452989667-110/type=default_90_0?v=1764921295782",
  "0x0cc24c51bf89c00c5affbfcf5e856c25ecbdb48e": "https://static.oklink.com/cdn/web3/currency/token/large/196-0x0cc24c51bf89c00c5affbfcf5e856c25ecbdb48e-110/type=default_90_0?v=1764839073713",
  "0xdcc83b32b6b4e95a61951bfcc9d71967515c0fca": "https://static.oklink.com/cdn/web3/currency/token/large/196-0xdcc83b32b6b4e95a61951bfcc9d71967515c0fca-107/type=default_90_0?v=1775024553859",
};

const logoCache = new Map<string, string>();
const pendingLogos = new Map<string, Promise<string>>();
const passthroughImageLoader = ({ src }: { src: string }) => src;

function normalizeLogoUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const url = value.trim();
  if (!/^https?:\/\//i.test(url)) return "";
  return url.replace(/^http:\/\//i, "https://");
}

async function findTokenLogo(chainId: number, tokenAddress: Address) {
  const normalizedAddress = tokenAddress.toLowerCase();

  try {
    const response = await fetch(`/api/okx/token-search?search=${encodeURIComponent(tokenAddress)}&chains=${chainId}`);
    if (response.ok) {
      const data = await response.json() as {
        success?: boolean;
        tokens?: Array<{ tokenContractAddress?: string; tokenLogoUrl?: string; chainIndex?: string }>;
      };
      const token = data.success ? data.tokens?.find((candidate) => (
        candidate.tokenContractAddress?.toLowerCase() === normalizedAddress
        && String(candidate.chainIndex ?? chainId) === String(chainId)
      )) : undefined;
      const searchLogo = normalizeLogoUrl(token?.tokenLogoUrl);
      if (searchLogo) return searchLogo;
    }
  } catch {}

  try {
    const response = await fetch(`/api/okx/token-info?chainIndex=${chainId}&tokenAddress=${tokenAddress}`);
    if (!response.ok) return "";
    const data = await response.json() as { success?: boolean; logoUrl?: string };
    return data.success ? normalizeLogoUrl(data.logoUrl) : "";
  } catch {
    return "";
  }
}

function loadTokenLogo(chainId: number, tokenAddress: Address) {
  const key = `${chainId}:${tokenAddress.toLowerCase()}`;
  const cached = logoCache.get(key);
  if (cached) return Promise.resolve(cached);

  const pending = pendingLogos.get(key);
  if (pending) return pending;

  const request = findTokenLogo(chainId, tokenAddress).then((logoUrl) => {
    if (logoUrl) logoCache.set(key, logoUrl);
    pendingLogos.delete(key);
    return logoUrl;
  });

  pendingLogos.set(key, request);
  return request;
}

export function TokenLogo({ chainId, tokenAddress, symbol }: {
  chainId: number;
  tokenAddress: Address;
  symbol: string;
}) {
  const cacheKey = `${chainId}:${tokenAddress.toLowerCase()}`;
  const presetLogo = chainId === 196 ? PRESET_TOKEN_LOGOS[tokenAddress.toLowerCase()] : undefined;
  const [logoUrl, setLogoUrl] = useState(presetLogo ?? "");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (presetLogo) {
      setLogoUrl(presetLogo);
      return;
    }

    setLogoUrl("");
    let active = true;
    void loadTokenLogo(chainId, tokenAddress).then((url) => {
      if (active) setLogoUrl(url);
    });
    return () => { active = false; };
  }, [chainId, presetLogo, tokenAddress]);

  return <div className="bce-token-mark" aria-label={symbol} title={symbol}>
    {logoUrl && !failed
      ? <Image loader={passthroughImageLoader} unoptimized src={logoUrl} alt={`${symbol} token logo`} width={76} height={76} onError={() => { logoCache.delete(cacheKey); setFailed(true); }} />
      : <span aria-hidden="true">{symbol.slice(0, 2).toUpperCase()}</span>}
  </div>;
}
