"use client";

import { createConfig, fallback, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import type { Chain } from "viem";

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

const OKX_WALLET_EXPLORER_ID =
  "971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709";

const connectors = [
  injected({
    shimDisconnect: true,
  }),
  ...(WALLETCONNECT_PROJECT_ID
    ? [
        walletConnect({
          projectId: WALLETCONNECT_PROJECT_ID,
          showQrModal: true,
          customStoragePrefix: "banmao-walletconnect-v2",
          metadata: {
            name: "BANMAO",
            description:
              "BANMAO GameFi, DeFi and NFT ecosystem on X Layer",
            url: "https://banmao.fun",
            icons: ["https://banmao.fun/branding/banmao_logo.png"],
            redirect: {
              universal: "https://banmao.fun",
            },
          },
          qrModalOptions: {
            enableExplorer: true,
            explorerRecommendedWalletIds: [OKX_WALLET_EXPLORER_ID],
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