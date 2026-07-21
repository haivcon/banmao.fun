"use client";

import { createConnector } from "@wagmi/core";
import { EthereumProvider } from "@walletconnect/ethereum-provider";
import {
  getAddress,
  numberToHex,
  type Address,
  type EIP1193Provider,
} from "viem";

interface WalletConnectConnectorParameters {
  projectId: string;
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  showQrModal?: boolean;
}

type WalletConnectProvider = Awaited<
  ReturnType<(typeof EthereumProvider)["init"]>
>;

export function banmaoWalletConnect({
  projectId,
  metadata,
  showQrModal = true,
}: WalletConnectConnectorParameters) {
  let provider: WalletConnectProvider | undefined;
  let providerPromise: Promise<WalletConnectProvider> | undefined;

  let accountsChanged:
    | ((accounts: string[]) => void)
    | undefined;
  let chainChanged: ((chainId: string) => void) | undefined;
  let disconnected: ((error?: Error) => void) | undefined;
  let sessionDeleted: (() => void) | undefined;

  async function initializeProvider(
    chains: readonly {
      id: number;
      rpcUrls: { default: { http: readonly string[] } };
    }[],
  ): Promise<WalletConnectProvider> {
    const chainIds = chains.map((chain) => chain.id);
    const primaryChainId = chainIds[0];
    if (!primaryChainId) {
      throw new Error("WalletConnect requires at least one chain.");
    }

    const rpcMap = Object.fromEntries(
      chains.map((chain) => [
        chain.id,
        chain.rpcUrls.default.http[0] || "https://rpc.xlayer.tech",
      ]),
    );

    return EthereumProvider.init({
      projectId,
      chains: [primaryChainId],
      optionalChains: chainIds,
      rpcMap,
      showQrModal,
      metadata,
      disableProviderPing: true,
    });
  }

  return createConnector<WalletConnectProvider>((config) => {
    const removeLifecycleListeners = () => {
      if (!provider) return;
      if (accountsChanged) {
        provider.removeListener("accountsChanged", accountsChanged);
        accountsChanged = undefined;
      }
      if (chainChanged) {
        provider.removeListener("chainChanged", chainChanged);
        chainChanged = undefined;
      }
      if (disconnected) {
        provider.removeListener("disconnect", disconnected);
        disconnected = undefined;
      }
      if (sessionDeleted) {
        provider.removeListener("session_delete", sessionDeleted);
        sessionDeleted = undefined;
      }
    };

    const bindLifecycleListeners = () => {
      if (!provider) return;

      if (!accountsChanged) {
        accountsChanged = (accounts) => {
          if (!accounts.length) {
            config.emitter.emit("disconnect");
            return;
          }
          config.emitter.emit("change", {
            accounts: accounts.map((account) => getAddress(account)),
          });
        };
        provider.on("accountsChanged", accountsChanged);
      }

      if (!chainChanged) {
        chainChanged = (chainId) => {
          config.emitter.emit("change", {
            chainId: Number(chainId),
          });
        };
        provider.on("chainChanged", chainChanged);
      }

      if (!disconnected) {
        disconnected = () => {
          removeLifecycleListeners();
          config.emitter.emit("disconnect");
        };
        provider.on("disconnect", disconnected);
      }

      if (!sessionDeleted) {
        sessionDeleted = () => {
          removeLifecycleListeners();
          config.emitter.emit("disconnect");
        };
        provider.on("session_delete", sessionDeleted);
      }
    };

    return {
      id: "walletConnect",
      name: "WalletConnect",
      type: "walletConnect",

      async connect({ chainId } = {}) {
        const activeProvider = await this.getProvider();
        const targetChainId = chainId || config.chains[0].id;

        if (!activeProvider.session) {
          await activeProvider.connect({
            optionalChains: config.chains.map((chain) => chain.id),
          });
        }

        const accounts = (await activeProvider.enable()).map((account) =>
          getAddress(account),
        );

        let currentChainId = activeProvider.chainId;
        if (currentChainId !== targetChainId) {
          try {
            const chain = await this.switchChain?.({
              chainId: targetChainId,
            });
            currentChainId = chain?.id || currentChainId;
          } catch {
            // The user can retry from the shared wrong-network UI.
          }
        }

        bindLifecycleListeners();

        return {
          accounts,
          chainId: currentChainId,
        };
      },

      async disconnect() {
        const activeProvider = await this.getProvider();
        removeLifecycleListeners();

        try {
          if (activeProvider.session) await activeProvider.disconnect();
        } catch (error) {
          if (!/No matching key/i.test((error as Error).message)) throw error;
        }
      },

      async getAccounts(): Promise<readonly Address[]> {
        const activeProvider = await this.getProvider();
        return activeProvider.accounts.map((account) => getAddress(account));
      },

      async getChainId() {
        const activeProvider = await this.getProvider();
        return activeProvider.chainId;
      },

      async getProvider() {
        if (provider) return provider;
        if (!providerPromise) {
          providerPromise = initializeProvider(config.chains);
        }
        provider = await providerPromise;
        provider.events.setMaxListeners(Number.POSITIVE_INFINITY);
        return provider;
      },

      async isAuthorized() {
        try {
          const activeProvider = await this.getProvider();
          return Boolean(
            activeProvider.session && activeProvider.accounts.length,
          );
        } catch {
          return false;
        }
      },

      async switchChain({ chainId }) {
        const activeProvider = await this.getProvider();
        const chain = config.chains.find(
          (candidate) => candidate.id === chainId,
        );
        if (!chain) throw new Error(`Chain ${chainId} is not configured.`);

        try {
          await activeProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: numberToHex(chainId) }],
          });
        } catch (switchError) {
          const error = switchError as {
            code?: number;
            message?: string;
          };
          const shouldAddChain =
            Number(error.code) === 4902 ||
            /unrecognized chain|not added|unsupported chain/i.test(
              error.message || "",
            );

          if (!shouldAddChain) throw switchError;

          await activeProvider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: numberToHex(chainId),
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: [...chain.rpcUrls.default.http],
                blockExplorerUrls: chain.blockExplorers?.default.url
                  ? [chain.blockExplorers.default.url]
                  : undefined,
              },
            ],
          });
        }

        config.emitter.emit("change", { chainId });
        return chain;
      },

      onAccountsChanged(accounts) {
        if (!accounts.length) {
          this.onDisconnect();
          return;
        }
        config.emitter.emit("change", {
          accounts: accounts.map((account) => getAddress(account)),
        });
      },

      onChainChanged(chainId) {
        config.emitter.emit("change", {
          chainId: Number(chainId),
        });
      },

      onDisconnect() {
        removeLifecycleListeners();
        config.emitter.emit("disconnect");
      },

      async onConnect(connectInfo) {
        const accounts = await this.getAccounts();
        config.emitter.emit("connect", {
          accounts,
          chainId: Number(connectInfo.chainId),
        });
      },
    };
  });
}

export type BanmaoWalletConnectProvider = EIP1193Provider;