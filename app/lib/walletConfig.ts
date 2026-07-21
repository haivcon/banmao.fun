"use client";

import { createConfig, fallback, http } from "wagmi";
import { injected } from "wagmi/connectors";
import type { Chain } from "viem";
import { banmaoWalletConnect } from "./walletConnectConnector";

export const XLAYER_CHAIN_ID = 196;
export const XLAYER_CHAIN_ID_HEX = "0xc4";

export const WALLETCONNECT_PROJECT_ID = (
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || ""
)
  .replace(/[\u0000-\u001f\u007f]/g, "")
  .trim();

const RPC_PRIMARY =
  process.env.NEXT_PUBLIC_XLAYER_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://rpc.xlayer.tech";
const RPC_BACKUP = "/api/rpc";
const EXPLORER_URL =
  process.env.NEXT_PUBLIC_XLAYER_EXPLORER_URL ||
  "https://web3.okx.com/explorer/x-layer";

export const xLayer: Chain = {
  id: XLAYER_CHAIN_ID,
  name: "X Layer",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [RPC_PRIMARY, RPC_BACKUP] },
    public: { http: [RPC_PRIMARY, RPC_BACKUP] },
  },
  blockExplorers: {
    default: {
      name: "OKX Explorer",
      url: EXPLORER_URL.replace(/\/+$/, ""),
    },
  },
};

const connectors = [
  injected({
    shimDisconnect: true,
  }),
  ...(WALLETCONNECT_PROJECT_ID
    ? [
        banmaoWalletConnect({
          projectId: WALLETCONNECT_PROJECT_ID,
          showQrModal: true,
          metadata: {
            name: "BANMAO",
            description:
              "BANMAO GameFi, DeFi and NFT ecosystem on X Layer",
            url: "https://banmao.fun",
            icons: ["https://banmao.fun/branding/banmao_logo.png"],
          },
        }),
      ]
    : []),
];

export const walletConfig = createConfig({
  chains: [xLayer],
  connectors,
  transports: {
    [xLayer.id]: fallback([
      http(RPC_PRIMARY, {
        batch: true,
        retryCount: 2,
      }),
      http(RPC_BACKUP, {
        batch: true,
        retryCount: 1,
      }),
    ]),
  },
  ssr: true,
  multiInjectedProviderDiscovery: true,
});

export function xLayerExplorerAddressUrl(address: string): string {
  return `${xLayer.blockExplorers.default.url}/address/${address}`;
}