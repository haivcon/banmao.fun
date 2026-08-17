"use client";

import { createConfig, fallback, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import type { Chain } from "viem";
import { XLAYER_MULTICALL3_ADDRESS } from "../defi/box/address";

export const XLAYER_CHAIN_ID = 196;
export const XLAYER_CHAIN_ID_HEX = "0xc4";
export const XLAYER_TESTNET_CHAIN_ID = 1952;
export const XLAYER_TESTNET_CHAIN_ID_HEX = "0x7a0";
export const BANMAOBOX_TESTNET_UI_ENABLED =
  process.env.NEXT_PUBLIC_BANMAOBOX_TESTNET_UI === "true";

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
  "https://web3.okx.com/explorer/x-layer/evm";
const TESTNET_RPC_PRIMARY =
  process.env.NEXT_PUBLIC_XLAYER_TESTNET_RPC_URL ||
  "https://testrpc.xlayer.tech/terigon";
const TESTNET_RPC_BACKUP =
  process.env.NEXT_PUBLIC_XLAYER_TESTNET_RPC_BACKUP_URL ||
  "https://xlayertestrpc.okx.com/terigon";
const TESTNET_EXPLORER_URL =
  process.env.NEXT_PUBLIC_XLAYER_TESTNET_EXPLORER_URL ||
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
  contracts: {
    multicall3: {
      address: XLAYER_MULTICALL3_ADDRESS,
      blockCreated: 47416,
    },
  },
};

export const xLayerTestnet: Chain = {
  id: XLAYER_TESTNET_CHAIN_ID,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: { http: [TESTNET_RPC_PRIMARY, TESTNET_RPC_BACKUP] },
    public: { http: [TESTNET_RPC_PRIMARY, TESTNET_RPC_BACKUP] },
  },
  blockExplorers: {
    default: {
      name: "OKX Testnet Explorer",
      url: TESTNET_EXPLORER_URL.replace(/\/+$/, ""),
    },
  },
  contracts: {
    multicall3: {
      address: XLAYER_MULTICALL3_ADDRESS,
    },
  },
  testnet: true,
};

export const XLAYER_SUPPORTED_CHAIN_IDS: readonly number[] =
  BANMAOBOX_TESTNET_UI_ENABLED
    ? [XLAYER_CHAIN_ID, XLAYER_TESTNET_CHAIN_ID]
    : [XLAYER_CHAIN_ID];

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

const mainnetTransport = fallback([
  http(RPC_PRIMARY, { batch: true, retryCount: 2 }),
  http(RPC_BACKUP, { batch: true, retryCount: 1 }),
]);

export const walletConfig = BANMAOBOX_TESTNET_UI_ENABLED
  ? createConfig({
      chains: [xLayer, xLayerTestnet],
      connectors,
      transports: {
        [xLayer.id]: mainnetTransport,
        [xLayerTestnet.id]: fallback([
          http(TESTNET_RPC_PRIMARY, { batch: true, retryCount: 2 }),
          http(TESTNET_RPC_BACKUP, { batch: true, retryCount: 1 }),
        ]),
      },
      ssr: true,
      multiInjectedProviderDiscovery: true,
    })
  : createConfig({
      chains: [xLayer],
      connectors,
      transports: { [xLayer.id]: mainnetTransport },
      ssr: true,
      multiInjectedProviderDiscovery: true,
    });

export function xLayerExplorerAddressUrl(address: string): string {
  return `${xLayer.blockExplorers.default.url}/address/${address}`;
}