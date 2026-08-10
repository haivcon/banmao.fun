"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WagmiProvider,
  useAccount,
  useSwitchChain,
} from "wagmi";
import { WalletConnectionProvider } from "./components/wallet/WalletConnection";
import {
  XLAYER_CHAIN_ID,
  XLAYER_TESTNET_CHAIN_ID,
  walletConfig,
} from "./lib/walletConfig";

const SharedProvidersBoundary = createContext(false);

let queryClient: QueryClient | null = null;

function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
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

  return queryClient;
}

function AutoChainSwitch({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const attemptedChainId = useRef<number | undefined>(undefined);
  const isBoxTestnet =
    pathname.startsWith("/defi/box") && chainId === XLAYER_TESTNET_CHAIN_ID;

  useEffect(() => {
    if (!isConnected) {
      attemptedChainId.current = undefined;
      return;
    }

    if (!chainId || chainId === XLAYER_CHAIN_ID || isBoxTestnet) {
      attemptedChainId.current = undefined;
      return;
    }

    if (attemptedChainId.current === chainId) return;
    attemptedChainId.current = chainId;

    const timer = window.setTimeout(() => {
      switchChain(
        { chainId: XLAYER_CHAIN_ID },
        {
          onError: () => {
            // Do not loop after a rejected request. The shared wallet button
            // exposes a manual network switch action.
          },
        },
      );
    }, 300);

    return () => window.clearTimeout(timer);
  }, [chainId, isBoxTestnet, isConnected, switchChain]);

  return <>{children}</>;
}

export default function SharedProviders({
  children,
}: {
  children: ReactNode;
}) {
  const alreadyProvided = useContext(SharedProvidersBoundary);

  if (alreadyProvided) return <>{children}</>;

  return (
    <SharedProvidersBoundary.Provider value>
      <WagmiProvider config={walletConfig}>
        <QueryClientProvider client={getQueryClient()}>
          <WalletConnectionProvider>
            <AutoChainSwitch>{children}</AutoChainSwitch>
          </WalletConnectionProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </SharedProvidersBoundary.Provider>
  );
}
