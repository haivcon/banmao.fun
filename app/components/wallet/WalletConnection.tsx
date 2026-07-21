"use client";

import {
  createContext,
  type CSSProperties,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { formatEther } from "viem";
import {
  WALLETCONNECT_PROJECT_ID,
  XLAYER_CHAIN_ID,
  xLayer,
  xLayerExplorerAddressUrl,
} from "../../lib/walletConfig";
import "./wallet.css";

type WalletModalView = "connect" | "account" | "chain" | null;

interface WalletModalContextValue {
  modal: WalletModalView;
  openConnectModal: () => void;
  openAccountModal: () => void;
  openChainModal: () => void;
  closeModal: () => void;
}

const WalletModalContext = createContext<WalletModalContextValue | null>(null);

function walletErrorMessage(error: unknown): string {
  const candidate = error as {
    code?: number;
    message?: string;
    details?: string;
    shortMessage?: string;
    cause?: { code?: number };
  };
  const code = Number(candidate?.code ?? candidate?.cause?.code);
  if (code === 4001) return "Connection request was rejected.";
  return (
    candidate?.shortMessage ||
    candidate?.details ||
    candidate?.message ||
    "Unable to connect the wallet."
  );
}

function shortAddress(address?: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function WalletModal() {
  const context = useWalletModalContext();
  const { modal, closeModal, openConnectModal } = context;
  const { address, connector: activeConnector } = useAccount();
  const {
    connectors,
    connectAsync,
    error: connectError,
    isPending: isConnecting,
  } = useConnect();
  const { disconnectAsync, isPending: isDisconnecting } = useDisconnect();
  const {
    switchChainAsync,
    error: switchError,
    isPending: isSwitching,
  } = useSwitchChain();
  const [localError, setLocalError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingConnectorUid, setPendingConnectorUid] = useState("");

  useEffect(() => {
    if (!modal) {
      setLocalError("");
      setCopied(false);
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeModal, modal]);

  if (!modal) return null;

  const connect = async (connector: (typeof connectors)[number]) => {
    const opensExternalModal =
      connector.id.toLowerCase() === "walletconnect";

    setLocalError("");
    setPendingConnectorUid(connector.uid);

    if (opensExternalModal) closeModal();

    try {
      await connectAsync({ connector, chainId: XLAYER_CHAIN_ID });
      if (!opensExternalModal) closeModal();
    } catch (error) {
      if (opensExternalModal) openConnectModal();
      setLocalError(walletErrorMessage(error));
    } finally {
      setPendingConnectorUid("");
    }
  };

  const switchNetwork = async () => {
    setLocalError("");
    try {
      await switchChainAsync({ chainId: XLAYER_CHAIN_ID });
      closeModal();
    } catch (error) {
      setLocalError(walletErrorMessage(error));
    }
  };

  const disconnect = async () => {
    setLocalError("");
    try {
      await disconnectAsync();
      closeModal();
    } catch (error) {
      setLocalError(walletErrorMessage(error));
    }
  };

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch {
      setLocalError("Unable to copy the wallet address.");
    }
  };

  const error =
    localError ||
    (connectError ? walletErrorMessage(connectError) : "") ||
    (switchError ? walletErrorMessage(switchError) : "");

  return (
    <div
      className="banmao-wallet-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) closeModal();
      }}
    >
      <section
        aria-labelledby="banmao-wallet-title"
        aria-modal="true"
        className="banmao-wallet-modal"
        role="dialog"
      >
        <header className="banmao-wallet-modal__header">
          <div>
            <span className="banmao-wallet-modal__eyebrow">BANMAO · X LAYER</span>
            <h2 id="banmao-wallet-title">
              {modal === "connect"
                ? "Connect wallet"
                : modal === "chain"
                  ? "Select network"
                  : "Wallet"}
            </h2>
          </div>
          <button
            aria-label="Close wallet dialog"
            className="banmao-wallet-modal__close"
            onClick={closeModal}
            type="button"
          >
            ×
          </button>
        </header>

        {modal === "connect" && (
          <div className="banmao-wallet-modal__content">
            <p className="banmao-wallet-modal__description">
              Connect once and use the same session across GameFi, DeFi and
              Collection.
            </p>
            <div className="banmao-wallet-options">
              {connectors.map((connector) => {
                const isWalletConnect =
                  connector.id.toLowerCase() === "walletconnect";
                const pending =
                  isConnecting && pendingConnectorUid === connector.uid;
                return (
                  <button
                    className="banmao-wallet-option"
                    disabled={isConnecting}
                    key={connector.uid}
                    onClick={() => void connect(connector)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={`banmao-wallet-option__icon ${
                        isWalletConnect ? "is-walletconnect" : "is-injected"
                      }`}
                    >
                      {isWalletConnect ? "W" : "◆"}
                    </span>
                    <span className="banmao-wallet-option__copy">
                      <strong>{connector.name}</strong>
                      <small>
                        {isWalletConnect
                          ? "Open a wallet app on mobile or scan a QR code"
                          : "Use a wallet installed in this browser"}
                      </small>
                    </span>
                    <span aria-hidden="true" className="banmao-wallet-option__arrow">
                      {pending ? "…" : "›"}
                    </span>
                  </button>
                );
              })}
            </div>
            {!WALLETCONNECT_PROJECT_ID && (
              <p className="banmao-wallet-modal__notice">
                WalletConnect QR is unavailable because
                NEXT_PUBLIC_WC_PROJECT_ID is not configured. Browser wallets
                remain available.
              </p>
            )}
          </div>
        )}

        {modal === "chain" && (
          <div className="banmao-wallet-modal__content">
            <div className="banmao-wallet-network">
              <span className="banmao-wallet-network__icon">X</span>
              <span>
                <strong>{xLayer.name}</strong>
                <small>Chain ID {XLAYER_CHAIN_ID} · OKB</small>
              </span>
              <span className="banmao-wallet-network__status">Required</span>
            </div>
            <button
              className="banmao-wallet-primary"
              disabled={isSwitching}
              onClick={() => void switchNetwork()}
              type="button"
            >
              {isSwitching ? "Switching…" : "Switch to X Layer"}
            </button>
          </div>
        )}

        {modal === "account" && (
          <div className="banmao-wallet-modal__content">
            <div className="banmao-wallet-account">
              <span className="banmao-wallet-account__avatar">
                {address?.slice(2, 4).toUpperCase() || "BM"}
              </span>
              <span>
                <strong>{shortAddress(address)}</strong>
                <small>{activeConnector?.name || "Connected wallet"}</small>
              </span>
              <span className="banmao-wallet-account__live">Connected</span>
            </div>
            <div className="banmao-wallet-account__actions">
              <button onClick={() => void copyAddress()} type="button">
                {copied ? "Copied" : "Copy address"}
              </button>
              {address && (
                <a
                  href={xLayerExplorerAddressUrl(address)}
                  rel="noreferrer"
                  target="_blank"
                >
                  Explorer ↗
                </a>
              )}
            </div>
            <button
              className="banmao-wallet-danger"
              disabled={isDisconnecting}
              onClick={() => void disconnect()}
              type="button"
            >
              {isDisconnecting ? "Disconnecting…" : "Disconnect wallet"}
            </button>
          </div>
        )}

        {error && (
          <p className="banmao-wallet-modal__error" role="alert">
            {error}
          </p>
        )}

        <footer className="banmao-wallet-modal__footer">
          By connecting, you allow this site to request wallet signatures. A
          transaction is never sent without your confirmation.
        </footer>
      </section>
    </div>
  );
}

function useWalletModalContext(): WalletModalContextValue {
  const context = useContext(WalletModalContext);
  if (!context) {
    throw new Error(
      "Wallet UI must be rendered inside WalletConnectionProvider.",
    );
  }
  return context;
}

export function WalletConnectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [modal, setModal] = useState<WalletModalView>(null);

  const value = useMemo<WalletModalContextValue>(
    () => ({
      modal,
      openConnectModal: () => setModal("connect"),
      openAccountModal: () => setModal("account"),
      openChainModal: () => setModal("chain"),
      closeModal: () => setModal(null),
    }),
    [modal],
  );

  return (
    <WalletModalContext.Provider value={value}>
      {children}
      <WalletModal />
    </WalletModalContext.Provider>
  );
}

export function useWalletModal() {
  const {
    openConnectModal,
    openAccountModal,
    openChainModal,
    closeModal,
  } = useWalletModalContext();
  return {
    openConnectModal,
    openAccountModal,
    openChainModal,
    closeWalletModal: closeModal,
  };
}

export const useConnectModal = useWalletModal;

type WalletAccountStatus = "avatar" | "address" | "full";

export interface WalletConnectButtonProps {
  accountStatus?:
    | WalletAccountStatus
    | {
        smallScreen: WalletAccountStatus;
        largeScreen: WalletAccountStatus;
      };
  chainStatus?: "icon" | "name" | "full" | "none";
  className?: string;
  label?: string;
  showBalance?: boolean;
  style?: CSSProperties;
}

interface WalletRenderAccount {
  address: string;
  displayName: string;
  displayBalance?: string;
}

interface WalletRenderChain {
  id: number;
  iconBackground: string;
  iconUrl?: string;
  name: string;
  unsupported: boolean;
}

interface WalletRenderProps {
  account?: WalletRenderAccount;
  chain?: WalletRenderChain;
  mounted: boolean;
  openAccountModal: () => void;
  openChainModal: () => void;
  openConnectModal: () => void;
}

function WalletConnectButtonBase({
  accountStatus = "address",
  chainStatus = "full",
  className = "",
  label = "Connect Wallet",
  showBalance = true,
  style,
}: WalletConnectButtonProps) {
  const { address, chain, chainId, isConnected, isReconnecting, status } =
    useAccount();
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const syncViewport = () => setIsSmallScreen(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  const resolvedAccountStatus =
    typeof accountStatus === "string"
      ? accountStatus
      : isSmallScreen
        ? accountStatus.smallScreen
        : accountStatus.largeScreen;

  const { data: balance } = useBalance({
    address,
    chainId: XLAYER_CHAIN_ID,
    query: { enabled: Boolean(address && isConnected) },
  });
  const { openAccountModal, openChainModal, openConnectModal } =
    useWalletModal();

  const mounted = status !== "reconnecting" || !isReconnecting;
  const unsupported = Boolean(chainId && chainId !== XLAYER_CHAIN_ID);

  if (!mounted || !isConnected || !address) {
    return (
      <button
        className={`banmao-wallet-button ${className}`.trim()}
        onClick={openConnectModal}
        style={style}
        type="button"
      >
        <span aria-hidden="true" className="banmao-wallet-button__mark">
          ◈
        </span>
        <span>{label}</span>
      </button>
    );
  }

  if (unsupported) {
    return (
      <button
        className={`banmao-wallet-button is-warning ${className}`.trim()}
        onClick={openChainModal}
        style={style}
        type="button"
      >
        Wrong network
      </button>
    );
  }

  const displayBalance = balance
    ? `${Number(formatEther(balance.value)).toLocaleString(undefined, {
        maximumFractionDigits: 4,
      })} ${balance.symbol}`
    : undefined;

  if (
    resolvedAccountStatus === "avatar" &&
    chainStatus === "icon" &&
    !showBalance
  ) {
    return (
      <button
        aria-label={`Wallet ${shortAddress(address)}`}
        className={`banmao-wallet-button is-avatar ${className}`.trim()}
        onClick={openAccountModal}
        style={style}
        title={shortAddress(address)}
        type="button"
      >
        <span className="banmao-wallet-button__avatar">
          {address.slice(2, 4).toUpperCase()}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`banmao-wallet-button-group ${className}`.trim()}
      style={style}
    >
      {chainStatus !== "none" && (
        <button
          className="banmao-wallet-button is-chain"
          onClick={openChainModal}
          type="button"
        >
          <span className="banmao-wallet-button__network-dot" />
          {chainStatus !== "icon" && (chain?.name || xLayer.name)}
        </button>
      )}
      <button
        className="banmao-wallet-button is-account"
        onClick={openAccountModal}
        type="button"
      >
        {resolvedAccountStatus === "avatar" ? (
          <span className="banmao-wallet-button__avatar">
            {address.slice(2, 4).toUpperCase()}
          </span>
        ) : (
          <span>
            {resolvedAccountStatus === "full"
              ? address
              : shortAddress(address)}
          </span>
        )}
        {showBalance && displayBalance && (
          <span className="banmao-wallet-button__balance">
            {displayBalance}
          </span>
        )}
      </button>
    </div>
  );
}

function WalletConnectButtonCustom({
  children,
}: {
  children: (props: WalletRenderProps) => ReactNode;
}) {
  const { address, chain, chainId, isConnected, status } = useAccount();
  const { data: balance } = useBalance({
    address,
    chainId: XLAYER_CHAIN_ID,
    query: { enabled: Boolean(address && isConnected) },
  });
  const { openAccountModal, openChainModal, openConnectModal } =
    useWalletModal();
  const mounted = status !== "reconnecting";

  const account =
    isConnected && address
      ? {
          address,
          displayName: shortAddress(address),
          displayBalance: balance
            ? `${Number(formatEther(balance.value)).toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })} ${balance.symbol}`
            : undefined,
        }
      : undefined;

  const renderChain =
    isConnected && chainId
      ? {
          id: chainId,
          iconBackground: "#111827",
          iconUrl: undefined,
          name: chain?.name || (chainId === XLAYER_CHAIN_ID ? xLayer.name : `Chain ${chainId}`),
          unsupported: chainId !== XLAYER_CHAIN_ID,
        }
      : undefined;

  return (
    <>
      {children({
        account,
        chain: renderChain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      })}
    </>
  );
}

type WalletConnectButtonComponent = typeof WalletConnectButtonBase & {
  Custom: typeof WalletConnectButtonCustom;
};

export const WalletConnectButton =
  WalletConnectButtonBase as WalletConnectButtonComponent;
WalletConnectButton.Custom = WalletConnectButtonCustom;

export const ConnectButton = WalletConnectButton;