// app/providers.tsx
// Shared providers for wallet connections across all pages
"use client";

// Polyfill localStorage for SSR to prevent RainbowKit errors
import "./gamefi/banmaorps/lib/serverStoragePolyfill";

import { ReactNode, useEffect, useMemo } from "react";
import { WagmiProvider, createConfig, http, fallback, useAccount, useChainId, useSwitchChain } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    RainbowKitProvider,
    darkTheme,
    connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
    okxWallet,
    metaMaskWallet,
    walletConnectWallet,
    rainbowWallet,
    rabbyWallet,
    trustWallet,
    bitgetWallet,
    coinbaseWallet,
    injectedWallet, // For OKX in-app browser detection
} from "@rainbow-me/rainbowkit/wallets";
import type { Chain } from "viem";
import "@rainbow-me/rainbowkit/styles.css";

// ==== ENV ====
const WC_PROJECT_ID =
    process.env.NEXT_PUBLIC_WC_PROJECT_ID || "df8d376695ef6244fbb2accd6a85f00a";

// X Layer RPC endpoints (with fallback for rate limiting)
const RPC_PRIMARY = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.xlayer.tech";
const RPC_BACKUP = "/api/rpc";



// ==== XLayer Mainnet Chain (ID: 196) ====
const xlayer: Chain = {
    id: 196,
    name: "XLayer",
    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
    rpcUrls: {
        default: { http: [RPC_PRIMARY, RPC_BACKUP] },
        public: { http: [RPC_PRIMARY, RPC_BACKUP] },
    },
    blockExplorers: {
        default: { name: "OKLink", url: "https://web3.okx.com/explorer/x-layer" },
    },
};



// ==== Connectors (lazy initialization to prevent duplicate WalletConnect Core) ====
let _connectors: ReturnType<typeof connectorsForWallets> | null = null;
function getConnectors() {
    if (!_connectors) {
        _connectors = connectorsForWallets(
            [
                {
                    groupName: "Recommended",
                    wallets: [injectedWallet, okxWallet, metaMaskWallet, walletConnectWallet],
                },
                {
                    groupName: "More wallets",
                    wallets: [rainbowWallet, rabbyWallet, trustWallet, bitgetWallet, coinbaseWallet],
                },
            ],
            {
                appName: "BANMAO Games",
                projectId: WC_PROJECT_ID,
            }
        );
    }
    return _connectors;
}

// ==== wagmi config (singleton to prevent duplicate initialization) ====
let _config: ReturnType<typeof createConfig> | null = null;
function getWagmiConfig() {
    if (!_config) {
        _config = createConfig({
            chains: [xlayer],
            connectors: getConnectors(),
            transports: {
                // Mainnet with fallback - Direct RPC first, proxy only as last resort
                [xlayer.id]: fallback([
                    http(RPC_PRIMARY, { batch: true, retryCount: 2 }),
                    http(RPC_BACKUP, { batch: true, retryCount: 1 }),
                ]),

            },
            ssr: true,
            // Enable for OKX Wallet in-app browser auto-detection
            multiInjectedProviderDiscovery: true,
        });
    }
    return _config;
}

// ==== QueryClient (singleton to avoid HMR issues) ====
let _queryClient: QueryClient | null = null;
function getQueryClient() {
    if (!_queryClient) {
        _queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 30_000,
                    gcTime: 5 * 60_000,
                    refetchOnWindowFocus: false,
                    refetchOnReconnect: false,
                    retry: 1,
                },
            },
        });
    }
    return _queryClient;
}

// ==== Auto-switch to XLayer when wallet connects on wrong chain ====
function AutoChainSwitch({ children }: { children: ReactNode }) {
    const { isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    useEffect(() => {
        if (isConnected && chainId !== 196) {
            try {
                switchChain({ chainId: 196 });
            } catch {
                // User rejected or wallet doesn't support auto-switch — silently ignore
            }
        }
    }, [isConnected, chainId, switchChain]);

    return <>{children}</>;
}

export default function SharedProviders({ children }: { children: ReactNode }) {
    const theme = useMemo(
        () =>
            darkTheme({
                accentColor: "#a855f7", // Purple for admin theme
                accentColorForeground: "#fff",
                borderRadius: "medium",
                overlayBlur: "small",
            }),
        []
    );

    return (
        <WagmiProvider config={getWagmiConfig()}>
            <QueryClientProvider client={getQueryClient()}>
                <RainbowKitProvider theme={theme} modalSize="compact" initialChain={196}>
                    <AutoChainSwitch>
                        {children}
                    </AutoChainSwitch>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
