"use client";

import { createConfig, fallback, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import type { Chain } from "viem";

export const XLAYER_CHAIN_ID = 196;
export const XLAYER_TESTNET_CHAIN_ID = 1952;
export const XLAYER_CHAIN_ID_HEX = "0xc4";

const configuredChainId = Number(process.env.NEXT_PUBLIC_XLAYER_CHAIN_ID);

export const WALLETCONNECT_PROJECT_ID = (
  process.env.NEXT_PUBLIC_WC_PROJECT_ID || ""
)
  .replace(/[\u0000-\u001f\u007f]/g, "")
  .trim();

const RPC_PRIMARY =
  configuredChainId === XLAYER_CHAIN_ID
    ? process.env.NEXT_PUBLIC_XLAYER_RPC_URL ||
      process.env.NEXT_PUBLIC_RPC_URL ||
      "https://rpc.xlayer.tech"
    : process.env.NEXT_PUBLIC_XLAYER_MAINNET_RPC_URL ||
      "https://rpc.xlayer.tech";
const RPC_BACKUP = "/api/rpc";
const EXPLORER_URL =
  configuredChainId === XLAYER_CHAIN_ID
    ? process.env.NEXT_PUBLIC_XLAYER_EXPLORER_URL ||
      "https://web3.okx.com/explorer/x-layer/evm"
    : process.env.NEXT_PUBLIC_XLAYER_MAINNET_EXPLORER_URL ||
      "https://web3.okx.com/explorer/x-layer/evm";
const TESTNET_RPC =
  configuredChainId === XLAYER_TESTNET_CHAIN_ID
    ? process.env.NEXT_PUBLIC_XLAYER_RPC_URL ||
      "https://xlayertestrpc.okx.com/terigon"
    : process.env.NEXT_PUBLIC_XLAYER_TESTNET_RPC_URL ||
      "https://xlayertestrpc.okx.com/terigon";
const TESTNET_EXPLORER_URL =
  configuredChainId === XLAYER_TESTNET_CHAIN_ID
    ? process.env.NEXT_PUBLIC_XLAYER_EXPLORER_URL ||
      "https://www.okx.com/web3/explorer/xlayer-test"
    : process.env.NEXT_PUBLIC_XLAYER_TESTNET_EXPLORER_URL ||
      "https://www.okx.com/web3/explorer/xlayer-test";

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

export const xLayerTestnet: Chain = {
  id: XLAYER_TESTNET_CHAIN_ID,
  name: "X Layer Testnet",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [TESTNET_RPC] },
    public: { http: [TESTNET_RPC] },
  },
  blockExplorers: {
    default: {
      name: "OKX Explorer",
      url: TESTNET_EXPLORER_URL.replace(/\/+$/, ""),
    },
  },
  testnet: true,
};

const OKX_WALLET_EXPLORER_ID =
  "971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709";

const connectors = [
  injected({
    shimDisconnect: true,
  }),
  ...(typeof window !== "undefined" && WALLETCONNECT_PROJECT_ID
    ? [
        walletConnect({
          projectId: WALLETCONNECT_PROJECT_ID,
          // Use WalletConnect's official modal so pairing, mobile deep links,
          // wallet discovery and cancellation follow the SDK's supported flow.
          showQrModal: true,
          customStoragePrefix: "banmao-walletconnect-v2",
          metadata: {
            name: "BANMAO",
            description:
              "BANMAO GameFi, DeFi and NFT ecosystem on X Layer",
            url: "https://banmao.fun",
            icons: ["https://banmao.fun/pwa/main/icon-512x512.png"],
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
  chains: [xLayer, xLayerTestnet],
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
    [xLayerTestnet.id]: http(TESTNET_RPC, {
      batch: true,
      retryCount: 2,
    }),
  },
  ssr: true,
  multiInjectedProviderDiscovery: true,
});

export function xLayerExplorerAddressUrl(address: string): string {
  return `${xLayer.blockExplorers.default.url}/address/${address}`;
}