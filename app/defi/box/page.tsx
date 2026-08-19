"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Gift,
  Eye,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  PackageOpen,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useSwitchChain } from "wagmi";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import {
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
  type Address,
  type Hash,
} from "viem";

import { ConnectButton } from "../../components/wallet/WalletConnection";
import {
  getBoxChainConfig,
  type BasketInput,
  type BoxAsset,
  type BoxChainId,
  type BoxEntry,
  type InspectedBox,
  MAX_LOCK_DURATION_SECONDS,
  addAddressHistoryEntry,
  durationPartsToSeconds,
  parseAddressHistory,
} from "./contracts";
import {
  BANMAOBOX_TESTNET_UI_ENABLED,
  XLAYER_CHAIN_ID,
  XLAYER_SUPPORTED_CHAIN_IDS,
  XLAYER_TESTNET_CHAIN_ID,
} from "../../lib/walletConfig";
import {
  BOX_COPY,
  getInitialBoxLanguage,
  parameterizeBoxCopy,
  type BoxCopy,
  type BoxLanguage,
} from "./i18n";
import { boxNftExplorerUrl } from "./address";
import { svgImageDataUri } from "./safety";
import {
  classifyBanmaoBoxVerification,
  requestBanmaoBoxVerification,
  type BanmaoBoxVerificationRequest,
  type BanmaoBoxVerificationUpdate,
} from "./requestVerification";
import {
  classifyTransactionError,
  resolveStoredAssetSymbol,
  transactionProgressIndex,
} from "./transactionPresentation";
import { ExplorerValueRow } from "./ExplorerValueRow";
import {
  collectionLifecycleOwnsTransaction,
  collectionLifecycleSteps,
  initialCollectionLifecycle,
  transitionCollectionLifecycle,
  type CollectionFailureStage,
  type CollectionLifecycleDetails,
} from "./collectionLifecycle";
import {
  getCollectionLifecycleFixture,
} from "./collectionLifecycleFixture";
import {
  clearPendingVerification,
  loadPendingVerification,
  savePendingVerification,
} from "./verificationPersistence";
import { useBox } from "./useBox";
import { useBoundedLoading } from "./useBoundedLoading";
import { formatExactTokenAmount, tokenAmountInWords } from "./amountFormat";
import { tokenExplorerUrl } from "./tokenIdentity";
import "./box.css";

const DURATION_OPTIONS = [7, 30, 90, 180, 365] as const;
const BOXES_PER_PAGE = 6;
const MAX_BATCH_SIZE = 20;

type CreateMode = "single" | "batch" | "basket";
type BatchRow = { recipient: string; amount: string };
type DurationField = "days" | "hours" | "minutes" | "seconds";
type AddressHistoryType = "asset" | "collection";

function getTier(amount: bigint, decimals: number): string {
  const unit = 10n ** BigInt(decimals);
  if (amount >= 100_000_000n * unit) return "LEGENDARY";
  if (amount >= 10_000_000n * unit) return "GOLD";
  if (amount >= 1_000_000n * unit) return "DELUXE";
  return "CLASSIC";
}

function formatDate(timestamp: bigint, language: BoxLanguage): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(timestamp) * 1000));
}

function formatDuration(seconds: bigint, language: BoxLanguage, copy: BoxCopy): string {
  const total = Number(seconds);
  return [
    [Math.floor(total / 86_400), copy.days],
    [Math.floor((total % 86_400) / 3_600), copy.hours],
    [Math.floor((total % 3_600) / 60), copy.minutes],
    [total % 60, copy.seconds],
  ]
    .filter(([value]) => Number(value) > 0)
    .map(([value, unit]) => `${Number(value).toLocaleString(language)}${unit}`)
    .join(" ");
}

function getRemaining(
  unlockTime: bigint,
  nowMs: number,
  copy: BoxCopy,
): string {
  const remaining = Math.max(0, Number(unlockTime) - Math.floor(nowMs / 1000));

  if (remaining === 0) return copy.ready;

  const days = Math.floor(remaining / 86_400);
  const hours = Math.floor((remaining % 86_400) / 3_600);
  const minutes = Math.floor((remaining % 3_600) / 60);
  const seconds = remaining % 60;

  if (days > 0) {
    return `${days}${copy.days} ${hours}${copy.hours} ${minutes}${copy.minutes}`;
  }
  return `${hours}${copy.hours} ${minutes}${copy.minutes} ${seconds}${copy.seconds}`;
}

function TokenAmount({
  value,
  decimals,
  symbol,
  language,
  compact = false,
}: {
  value: bigint | undefined;
  decimals: number;
  symbol: string;
  language: BoxLanguage;
  compact?: boolean;
}) {
  const numeric = formatExactTokenAmount(value, decimals, language);
  const words = BOX_COPY[language].amountInWords(
    tokenAmountInWords(value, decimals, language),
    symbol,
  );
  return (
    <span className={`box-token-amount ${compact ? "box-token-amount--compact" : ""}`} title={words}>
      <span>{numeric} {symbol}</span>
      <small>{words}</small>
    </span>
  );
}

function GiftBoxArtwork({ ready = false }: { ready?: boolean }) {
  return (
    <div
      className={`box-art ${ready ? "box-art--ready" : ""}`}
      aria-hidden="true"
    >
      <span className="box-art__glow" />
      <span className="box-art__bow box-art__bow--left" />
      <span className="box-art__bow box-art__bow--right" />
      <span className="box-art__lid" />
      <span className="box-art__body" />
      <span className="box-art__ribbon" />
      <span className="box-art__lock">
        {ready ? <PackageOpen /> : <LockKeyhole />}
      </span>
    </div>
  );
}

function BoxCard({
  entry,
  copy,
  language,
  now,
  decimals,
  busy,
  onOpen,
  onOpenAsset,
  onTransfer,
  onRefreshMetadata,
  explorerUrl,
  primaryToken,
  tokenSymbol,
}: {
  entry: BoxEntry;
  copy: BoxCopy;
  language: BoxLanguage;
  now: number;
  decimals: number;
  busy: boolean;
  onOpen: (tokenId: bigint) => void;
  onOpenAsset: (tokenId: bigint, assetIndex: number, asset: BoxAsset) => void;
  onTransfer: (entry: BoxEntry) => void;
  onRefreshMetadata: (tokenId: bigint) => void;
  explorerUrl?: string;
  primaryToken?: Address;
  tokenSymbol: string;
}) {
  const ready =
    entry.canOpen || Number(entry.unlockTime) <= Math.floor(now / 1000);

  return (
    <article className={`box-item ${ready ? "box-item--ready" : ""}`}>
      <div className="box-item__visual">
        {entry.svg ? (
          <Image
            className="box-svg box-item__svg"
            src={svgImageDataUri(entry.svg)}
            alt={`${copy.boxNumber} #${entry.tokenId.toString()}`}
            width={600}
            height={600}
            unoptimized
          />
        ) : (
          <GiftBoxArtwork ready={ready} />
        )}
        <span
          className={`box-status ${
            ready ? "box-status--ready" : "box-status--locked"
          }`}
        >
          {ready ? <PackageOpen /> : <LockKeyhole />}
          {ready ? copy.ready : copy.locked}
        </span>
      </div>

      <div className="box-item__content">
        <div className="box-item__heading">
          <span>
            {copy.boxNumber} #{entry.tokenId.toString()}
            <em
              className={`box-tier box-tier--${getTier(entry.amount, decimals).toLowerCase()}`}
              tabIndex={0}
              title="CLASSIC < 1M · DELUXE ≥ 1M · GOLD ≥ 10M · LEGENDARY ≥ 100M tokens"
              aria-label={`${getTier(entry.amount, decimals)} tier. Classic below 1 million, Deluxe from 1 million, Gold from 10 million, Legendary from 100 million tokens.`}
            >
              {getTier(entry.amount, decimals)}
            </em>
          </span>
          <strong>
            <TokenAmount value={entry.amount} decimals={decimals} symbol={tokenSymbol} language={language} />
          </strong>
          {entry.assets.length > 1 ? <small>{copy.assetsInBasket(entry.assets.length)}</small> : null}
        </div>

        <dl className="box-item__details">
          <div>
            <dt>{copy.createdAt}</dt>
            <dd>{formatDate(entry.createdAt, language)}</dd>
          </div>
          <div>
            <dt>{copy.unlocksAt}</dt>
            <dd>{formatDate(entry.unlockTime, language)}</dd>
          </div>
          <div>
            <dt>{copy.remaining}</dt>
            <dd className={`${ready ? "box-ready-text" : ""} box-countdown`}>
              {getRemaining(entry.unlockTime, now, copy)}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          className="box-button box-button--primary box-item__primary"
          disabled={!ready || busy}
          onClick={() => onOpen(entry.tokenId)}
        >
          {busy ? <LoaderCircle className="box-spin" /> : ready ? <PackageOpen /> : <LockKeyhole />}
          {ready ? copy.open : copy.locked}
        </button>

        <details className="box-card-details">
          <summary><ChevronDown aria-hidden="true" /> {copy.operations}</summary>
          <div className="box-assets">
          <div className="box-assets__heading">
            <strong>{copy.basketAssets}</strong>
            <small>{copy.releaseHint}</small>
          </div>
          <div className="box-assets__list">
            {entry.assets.map((asset, index) => {
              const isPrimary =
                primaryToken?.toLowerCase() === asset.token.toLowerCase();
              const assetDecimals = asset.decimals ?? (isPrimary ? decimals : 18);
              const assetSymbol = resolveStoredAssetSymbol(
                asset.symbol,
                isPrimary ? tokenSymbol : undefined,
                asset.token,
                copy.genericToken,
              );
              return (
                <div className="box-asset" key={asset.token}>
                  <div>
                    <strong>
                      <TokenAmount value={asset.amount} decimals={assetDecimals} symbol={assetSymbol} language={language} compact />
                    </strong>
                    <span className="box-asset__address">
                      <code>{asset.token}</code>
                      <button type="button" onClick={() => void navigator.clipboard.writeText(asset.token)} aria-label={`Copy ${asset.token}`}>
                        <Copy />
                      </button>
                    </span>
                  </div>
                  {isPrimary ? <span>{copy.primaryAsset}</span> : null}
                  <button
                    type="button"
                    disabled={!ready || busy}
                    onClick={() => onOpenAsset(entry.tokenId, index, asset)}
                    title={ready ? copy.releaseHint : copy.locked}
                  >
                    <PackageOpen /> {copy.releaseAsset}
                  </button>
                </div>
              );
            })}
            {entry.assets.length === 0 ? <small>{copy.noAssets}</small> : null}
          </div>
          </div>

        <div className="box-item__actions">
          <button
            type="button"
            className="box-button box-button--secondary"
            disabled={busy}
            onClick={() => onTransfer(entry)}
          >
            <Send />
            {copy.transfer}
          </button>
          <button
            type="button"
            className="box-button box-button--ghost"
            disabled={busy}
            onClick={() => onRefreshMetadata(entry.tokenId)}
            title={copy.refreshMetadata}
          >
            <RefreshCw />
            {copy.refreshMetadata}
          </button>
          {explorerUrl ? (
            <a
              className="box-button box-button--explorer"
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`${copy.viewExplorer}: ${copy.boxNumber} #${entry.tokenId.toString()}`}
            >
              <ExternalLink />
              {copy.viewExplorer}
            </a>
          ) : null}
        </div>
        </details>
      </div>
    </article>
  );
}

export default function BanmaoBoxPage() {
  const [language, setLanguage] = useState<BoxLanguage>("en");
  const [selectedChainId, setSelectedChainId] =
    useState<BoxChainId>(XLAYER_CHAIN_ID);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const { switchChainAsync } = useSwitchChain();
  const [now, setNow] = useState(0);
  const [amount, setAmount] = useState("");
  const [activeBoxAddress, setActiveBoxAddress] = useState<Address>();
  const [activeTokenAddress, setActiveTokenAddress] = useState<Address>();
  const [collectionResolving, setCollectionResolving] = useState(true);
  const [collectionToken, setCollectionToken] = useState("");
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionPending, setCollectionPending] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionLifecycle, setCollectionLifecycle] =
    useState<CollectionLifecycleDetails | null>(null);
  const collectionLifecycleRef = useRef<CollectionLifecycleDetails | null>(null);
  const retryCollectionVerificationRef = useRef<(details: CollectionLifecycleDetails) => void>(() => undefined);
  const collectionRequestRef = useRef(0);
  const verificationRequestRef = useRef<BanmaoBoxVerificationRequest | undefined>(undefined);
  const collectionFixtureToastShownRef = useRef(false);
  const [createMode, setCreateMode] = useState<CreateMode>("single");
  const [batchRows, setBatchRows] = useState<BatchRow[]>([
    { recipient: "", amount: "" },
    { recipient: "", amount: "" },
  ]);
  const [extraAssets, setExtraAssets] = useState<
    (BasketInput & { symbol: string; balance: bigint })[]
  >([]);
  const [newAssetToken, setNewAssetToken] = useState("");
  const [recipient, setRecipient] = useState("");
  const [selectedDays, setSelectedDays] = useState<number | "custom">(30);
  const [customDuration, setCustomDuration] = useState<Record<DurationField, string>>({
    days: "", hours: "", minutes: "", seconds: "",
  });
  const [addressHistory, setAddressHistory] = useState<Record<AddressHistoryType, Address[]>>({
    asset: [],
    collection: [],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [lockAcknowledged, setLockAcknowledged] = useState(false);
  const [transferEntry, setTransferEntry] = useState<BoxEntry | null>(null);
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [boxPage, setBoxPage] = useState(0);
  const [inspectId, setInspectId] = useState("");
  const [inspectedBox, setInspectedBox] = useState<InspectedBox | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [releaseOutcome, setReleaseOutcome] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState("Transaction");
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "boxes" | "explore">(
    "create",
  );
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const chainConfig = getBoxChainConfig(selectedChainId);
  const baseCopy = BOX_COPY[language];
  const explorerBaseUrl = chainConfig.chain.blockExplorers.default.url;

  const {
    address,
    isConnected,
    isCorrectChain,
    isDeployed,
    tokenDecimals,
    tokenSymbol,
    tokenIdentity,
    maxLockDuration,
    tokenBalance,
    allowance,
    tokenBalanceLoading,
    tokenBalanceError,
    refetchTokenBalance,
    boxes,
    boxesLoading,
    boxesError,
    retryBoxes: retryBoxReads,
    deploymentError,
    deploymentWarning,
    isDeploymentValidated,
    totalLocked,
    totalSupply,
    createBox,
    createBoxes,
    createMultiTokenBox,
    createCollection,
    resolveCollection,
    readAsset,
    openBox,
    openAsset,
    transferBox,
    refreshMetadata,
    inspectBox,
    refetchAll,
    phase,
    transactionHash,
    transactionError,
    isBusy,
  } = useBox(selectedChainId, activeBoxAddress, activeTokenAddress, baseCopy.genericToken, collectionResolving);
  const copy = useMemo(
    () => parameterizeBoxCopy(baseCopy, tokenIdentity.displaySymbol, tokenIdentity.isCanonicalBanmao),
    [baseCopy, tokenIdentity.displaySymbol, tokenIdentity.isCanonicalBanmao],
  );
  const { timedOut: boxesTimedOut, resetTimeout: resetBoxesTimeout } =
    useBoundedLoading(boxesLoading);
  const retryBoxes = useCallback(() => {
    resetBoxesTimeout();
    retryBoxReads();
  }, [resetBoxesTimeout, retryBoxReads]);

  const parsedAmount = useMemo(() => {
    try {
      if (createMode === "batch") {
        return batchRows.reduce(
          (sum, row) =>
            sum + (row.amount ? parseUnits(row.amount, tokenDecimals) : 0n),
          0n,
        );
      }
      return amount ? parseUnits(amount, tokenDecimals) : 0n;
    } catch {
      return 0n;
    }
  }, [amount, batchRows, createMode, tokenDecimals]);

  const needsApproval =
    isConnected && parsedAmount > 0n && allowance < parsedAmount;

  const pageCount = Math.max(1, Math.ceil(boxes.length / BOXES_PER_PAGE));
  const visibleBoxes = useMemo(
    () => boxes.slice(boxPage * BOXES_PER_PAGE, (boxPage + 1) * BOXES_PER_PAGE),
    [boxPage, boxes],
  );

  useEffect(() => {
    if (getCollectionLifecycleFixture(window.location.search)) return;
    let cancelled = false;
    const requestId = ++collectionRequestRef.current;
    const storageKey = `banmaobox_collection_token_${selectedChainId}`;
    const savedToken = window.localStorage.getItem(storageKey);
    const canonicalToken = chainConfig.tokenAddress;

    // Never restore a Box address supplied by an older frontend. Dynamic Box
    // addresses are always resolved afresh through the canonical Factory.
    window.localStorage.removeItem(`banmaobox_collection_${selectedChainId}`);
    const requestedToken = savedToken && isAddress(savedToken)
      ? getAddress(savedToken)
      : canonicalToken;

    setCollectionResolving(true);
    setActiveTokenAddress(undefined);
    setActiveBoxAddress(undefined);
    setCollectionToken(requestedToken ?? "");
    setCollectionError(null);
    setExtraAssets([]);
    setAddressHistory({
      asset: parseAddressHistory(window.localStorage.getItem(`banmaobox_history_${selectedChainId}_asset`)),
      collection: parseAddressHistory(window.localStorage.getItem(`banmaobox_history_${selectedChainId}_collection`)),
    });

    if (
      requestedToken &&
      canonicalToken &&
      requestedToken.toLowerCase() !== canonicalToken.toLowerCase()
    ) {
      void resolveCollection(requestedToken)
        .then((resolvedBox) => {
          if (cancelled || requestId !== collectionRequestRef.current) return;
          if (resolvedBox === "0x0000000000000000000000000000000000000000") {
            window.localStorage.removeItem(storageKey);
            setCollectionToken(canonicalToken);
            setActiveTokenAddress(canonicalToken);
            setActiveBoxAddress(chainConfig.boxAddress);
            setCollectionError("Saved collection was unavailable; using the canonical collection.");
            setCollectionResolving(false);
            return;
          }
          setActiveTokenAddress(requestedToken);
          setActiveBoxAddress(getAddress(resolvedBox));
          setCollectionResolving(false);
        })
        .catch(() => {
          if (cancelled || requestId !== collectionRequestRef.current) return;
          window.localStorage.removeItem(storageKey);
          setCollectionToken(canonicalToken);
          setActiveTokenAddress(canonicalToken);
          setActiveBoxAddress(chainConfig.boxAddress);
          setCollectionError("Saved collection could not be resolved; using the canonical collection.");
          setCollectionResolving(false);
        });
    } else {
      setActiveTokenAddress(canonicalToken);
      setActiveBoxAddress(chainConfig.boxAddress);
      setCollectionResolving(false);
    }

    return () => {
      cancelled = true;
    };
  }, [
    chainConfig.boxAddress,
    chainConfig.tokenAddress,
    resolveCollection,
    selectedChainId,
  ]);

  useEffect(() => {
    setLanguage(getInitialBoxLanguage());

    const handleLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<BoxLanguage>).detail;
      if (next && Object.prototype.hasOwnProperty.call(BOX_COPY, next)) {
        setLanguage(next);
      }
    };

    window.addEventListener("banmao:language-change", handleLanguageChange);
    return () =>
      window.removeEventListener(
        "banmao:language-change",
        handleLanguageChange,
      );
  }, []);

  useEffect(() => {
    const fixture = getCollectionLifecycleFixture(window.location.search);
    if (!fixture) return;
    setCollectionOpen(true);
    setActiveTokenAddress(fixture.tokenAddress);
    setActiveBoxAddress(fixture.boxAddress);
    setCollectionToken(fixture.tokenAddress);
    setCollectionLifecycle((current) => current ?? fixture);
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => verificationRequestRef.current?.cancel(), []);

  useEffect(() => {
    if (address && !recipient) setRecipient(address);
  }, [address, recipient]);

  useEffect(() => {
    if (phase === "success") {
      setAmount("");
      setBatchRows([
        { recipient: address ?? "", amount: "" },
        { recipient: address ?? "", amount: "" },
      ]);
      setExtraAssets([]);
      setTransferEntry(null);
      setTransferRecipient("");
    }
  }, [address, phase]);

  const showTransactionToast = useCallback(() => {
    const toastId = "banmaobox-transaction";
    if (activeAction === "Collection creation" && collectionLifecycleOwnsTransaction(collectionLifecycleRef.current)) {
      toast.dismiss(toastId);
      return;
    }
    if (phase === "idle") {
      toast.dismiss(toastId);
      return;
    }
    const errorKind = classifyTransactionError(transactionError, Boolean(transactionHash)).kind;
    const localizedError = errorKind === "rejected" ? copy.transactionRejected
      : errorKind === "replaced" ? copy.transactionReplaced
      : errorKind === "timeout" ? copy.transactionTimeout
      : errorKind === "disconnected" ? copy.connectWalletError
      : errorKind === "wrong-chain" ? copy.wrongNetworkError
      : copy.transactionFailed;
    const message = phase === "success"
      ? copy.transactionConfirmed(activeAction)
      : phase === "error"
        ? localizedError
        : copy.phase[phase];
    const detail = releaseOutcome ? `${message} ${releaseOutcome}` : message;
    const options = { id: toastId, duration: phase === "success" ? 6500 : phase === "error" ? 9000 : Infinity };
    const activeIndex = transactionProgressIndex(phase, Boolean(transactionHash));
    const renderToast = () => toast.custom((toastState) => (
      <div
        className={`box-toast box-toast--${phase} ${toastState.visible ? "is-visible" : ""}`}
        role={phase === "error" ? "alert" : "status"}
      >
        <span className="box-toast__icon" aria-hidden="true">
          {phase === "success" ? <CheckCircle2 /> : phase === "error" ? <X /> : <LoaderCircle className="box-spin" />}
        </span>
        <div className="box-toast__content">
          <strong>{detail}</strong>
          <ol className="box-toast__steps" aria-label={copy.transactionProgressLabel}>
            {[copy.stepWallet, copy.stepBroadcast, copy.stepConfirmed].map((label, index) => (
              <li className={index < activeIndex || phase === "success" ? "complete" : index === activeIndex ? "active" : ""} key={label}>
                <span aria-hidden="true" />{label}
              </li>
            ))}
          </ol>
          {transactionHash ? (
            <div className="box-toast__actions">
              <ExplorerValueRow
                label={copy.creatorTransactionLabel}
                value={transactionHash}
                kind="tx"
                explorerBaseUrl={explorerBaseUrl}
                copyLabel={copy.copyTransactionHash}
                onCopied={(label) => toast.success(copy.copied(label), { duration: 1800 })}
                onCopyFailed={() => toast.error(copy.copyFailed)}
              />
            </div>
          ) : null}
        </div>
        <button type="button" className="box-toast__dismiss" aria-label={copy.dismissNotification} onClick={() => toast.dismiss(toastId)}><X /></button>
      </div>
    ), options);
    if (phase === "success") {
      renderToast();
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        void confetti({
          particleCount: 90,
          spread: 72,
          startVelocity: 32,
          colors: ["#ffd85a", "#f59e0b", "#55f29a", "#ffffff"],
          origin: { y: 0.72 },
        });
      }
      return;
    }
    if (phase === "error") {
      renderToast();
      return;
    }
    renderToast();
  }, [activeAction, copy, explorerBaseUrl, phase, releaseOutcome, transactionError, transactionHash]);

  const showVerificationToast = useCallback((
    message: string,
    status: "loading" | "success" | "warning" | "error",
    details: CollectionLifecycleDetails,
  ) => {
    const id = "banmaobox-collection-verification";
    const previous = collectionLifecycleRef.current;
    const next = previous ? transitionCollectionLifecycle(previous, details) : details;
    if (previous && next === previous && previous.status !== details.status) return;
    collectionLifecycleRef.current = next;
    setCollectionLifecycle(next);
    toast.dismiss("banmaobox-transaction");
    const explorerRow = (
      label: string,
      value: Address | Hash | undefined,
      kind: "address" | "tx",
      copyLabel: string,
    ) => value ? (
      <ExplorerValueRow
        key={label}
        label={label}
        value={value}
        kind={kind}
        explorerBaseUrl={explorerBaseUrl}
        copyLabel={copyLabel}
        onCopied={(copiedLabel) => toast.success(copy.copied(copiedLabel), { duration: 1800 })}
        onCopyFailed={() => toast.error(copy.copyFailed)}
      />
    ) : null;
    toast.custom((toastState) => (
      <div className={`box-toast box-toast--${status} ${toastState.visible ? "is-visible" : ""}`} role={status === "error" ? "alert" : "status"}>
        <span className="box-toast__icon" aria-hidden="true">
          {status === "success" ? <CheckCircle2 /> : status === "error" ? <X /> : status === "warning" ? <ShieldAlert /> : <LoaderCircle className="box-spin" />}
        </span>
        <div className="box-toast__content">
          <strong>{message}</strong>
          <div className="box-toast__values">
            {explorerRow(copy.tokenAddressLabel, next.tokenAddress, "address", copy.copyTokenAddress)}
            {explorerRow(copy.collectionAddressLabel, next.boxAddress, "address", copy.copyCollectionAddress)}
            {explorerRow(copy.factoryAddressLabel, next.factoryAddress, "address", copy.copyFactoryAddress)}
            {explorerRow(copy.rendererAddressLabel, next.rendererAddress, "address", copy.copyRendererAddress)}
            {explorerRow(copy.creatorTransactionLabel, next.transactionHash, "tx", copy.copyTransactionHash)}
            <span>{copy.networkLabel}: {chainConfig.chain.name}</span>
            <span>{copy.chainIdLabel}: {selectedChainId}</span>
          </div>
          <ol className="box-collection-lifecycle" aria-label={copy.collectionLifecycleLabel}>
            {collectionLifecycleSteps(next).map((step) => (
              <li className={step.status} data-status={step.status} key={step.id}>{step.label(copy)}</li>
            ))}
          </ol>
          {(["degraded", "manual"].includes(next.status)) && next.transactionHash ? (
            <button type="button" className="box-toast__retry" onClick={() => retryCollectionVerificationRef.current(next)}>
              <RefreshCw /> {copy.retryVerification}
            </button>
          ) : null}
        </div>
        <button type="button" className="box-toast__dismiss" aria-label={copy.dismissNotification} onClick={() => {
          clearPendingVerification(window.localStorage, selectedChainId);
          toast.dismiss(id);
        }}><X /></button>
      </div>
    ), { id, duration: status === "loading" || status === "warning" ? Infinity : status === "success" ? 12_000 : 9000 });
  }, [chainConfig.chain.name, copy, explorerBaseUrl, selectedChainId]);

  function presentVerificationUpdate(
    details: CollectionLifecycleDetails,
    update: BanmaoBoxVerificationUpdate,
  ) {
    if (!details.transactionHash || !details.boxAddress) return;
    const outcome = classifyBanmaoBoxVerification(update);
    const resolvedDetails: CollectionLifecycleDetails = {
      ...details,
      boxAddress: update.boxAddress && isAddress(update.boxAddress)
        ? getAddress(update.boxAddress)
        : details.boxAddress,
      failureReason: update.error,
    };
    if (outcome === "success") {
      clearPendingVerification(window.localStorage, selectedChainId);
      showVerificationToast(copy.collectionReady, "success", { ...resolvedDetails, status: "ready" });
      return;
    }
    const status = outcome === "progress" ? "indexing" : outcome === "manual" ? "manual" : outcome === "degraded" ? "degraded" : "failed";
    if (outcome === "failed") {
      clearPendingVerification(window.localStorage, selectedChainId);
    } else {
      savePendingVerification(window.localStorage, {
        version: 1,
        chainId: selectedChainId,
        tokenAddress: details.tokenAddress,
        boxAddress: resolvedDetails.boxAddress,
        transactionHash: details.transactionHash,
        status: update.status,
        guid: update.guid,
        error: update.error,
      });
    }
    showVerificationToast(
      outcome === "manual"
        ? copy.collectionCreatedVerificationManual
        : outcome === "failed"
          ? copy.collectionVerificationFailure
          : outcome === "progress"
            ? copy.collectionIndexing
            : copy.collectionCreatedVerificationDegraded,
      outcome === "progress" ? "loading" : outcome === "failed" ? "error" : "warning",
      {
        ...resolvedDetails,
        status,
        failureStage: outcome === "failed" ? "verification" : undefined,
      },
    );
  }

  function retryCollectionVerification(details: CollectionLifecycleDetails) {
    if (!details.transactionHash || !details.boxAddress) return;
    showVerificationToast(copy.collectionVerificationRequest, "loading", {
      ...details,
      status: "verifying",
      failureStage: undefined,
      failureReason: undefined,
    });
    verificationRequestRef.current?.cancel();
    verificationRequestRef.current = requestBanmaoBoxVerification(details.transactionHash, (update) => {
      const current = collectionLifecycleRef.current;
      if (!current || current.transactionHash !== details.transactionHash) return;
      presentVerificationUpdate(current, update);
    });
  }

  useEffect(() => {
    retryCollectionVerificationRef.current = retryCollectionVerification;
  });

  useEffect(() => {
    if (getCollectionLifecycleFixture(window.location.search)) return;
    const pending = loadPendingVerification(window.localStorage, selectedChainId);
    if (!pending) return;
    const details: CollectionLifecycleDetails = {
      status: pending.status === "manual-reconciliation" ? "manual" : "degraded",
      tokenAddress: pending.tokenAddress,
      boxAddress: pending.boxAddress,
      transactionHash: pending.transactionHash,
      factoryAddress: chainConfig.factoryAddress,
      rendererAddress: chainConfig.defaultRendererAddress,
      failureReason: pending.error,
    };
    collectionLifecycleRef.current = details;
    setCollectionLifecycle(details);
    setActiveTokenAddress(pending.tokenAddress);
    setActiveBoxAddress(pending.boxAddress);
    setCollectionToken(pending.tokenAddress);
    retryCollectionVerificationRef.current(details);
    return () => verificationRequestRef.current?.cancel();
  }, [chainConfig.defaultRendererAddress, chainConfig.factoryAddress, selectedChainId]);

  useEffect(() => {
    if (collectionFixtureToastShownRef.current || !collectionLifecycle) return;
    if (!getCollectionLifecycleFixture(window.location.search)) return;
    collectionFixtureToastShownRef.current = true;
    const fixtureStatus = collectionLifecycle.status;
    showVerificationToast(
      fixtureStatus === "ready" ? copy.collectionReady
        : fixtureStatus === "manual" ? copy.collectionCreatedVerificationManual
        : fixtureStatus === "failed" ? copy.collectionVerificationFailure
        : fixtureStatus === "degraded" ? copy.collectionCreatedVerificationDegraded
        : copy.collectionIndexing,
      fixtureStatus === "ready" ? "success"
        : fixtureStatus === "failed" ? "error"
        : fixtureStatus === "indexing" ? "loading"
        : "warning",
      collectionLifecycle,
    );
  }, [collectionLifecycle, copy, showVerificationToast]);

  useEffect(() => {
    if (!collectionLifecycle || !transactionHash) return;
    if (collectionLifecycle.status !== "wallet") return;
    showVerificationToast(copy.collectionSubmitted, "loading", {
      ...collectionLifecycle,
      status: "submitted",
      transactionHash,
    });
  }, [collectionLifecycle, copy.collectionSubmitted, showVerificationToast, transactionHash]);

  useEffect(() => {
    showTransactionToast();
  }, [showTransactionToast]);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(copy.copied(label), { duration: 1800 });
    } catch {
      toast.error(copy.copyFailed);
    }
  };

  const selectCollection = (token: Address, box: Address) => {
    setActiveTokenAddress(token);
    setActiveBoxAddress(box);
    setCollectionToken(token);
    setCollectionError(null);
    setExtraAssets([]);
    setAmount("");
    setInspectedBox(null);
    setBoxPage(0);
    rememberAddress("collection", token);
    window.localStorage.setItem(
      `banmaobox_collection_token_${selectedChainId}`,
      token,
    );
  };

  const handleNetworkChange = async (nextChainId: BoxChainId) => {
    if (
      nextChainId === selectedChainId ||
      (nextChainId === XLAYER_TESTNET_CHAIN_ID && !BANMAOBOX_TESTNET_UI_ENABLED)
    ) return;
    setNetworkError(null);
    setSelectedChainId(nextChainId);
    setActiveTokenAddress(undefined);
    setActiveBoxAddress(undefined);
    setCollectionToken("");
    setCollectionError(null);
    setExtraAssets([]);
    setBoxPage(0);
    collectionRequestRef.current += 1;
    verificationRequestRef.current?.cancel();

    if (!isConnected) return;
    try {
      await switchChainAsync({ chainId: nextChainId });
    } catch (error) {
      setNetworkError(
        error instanceof Error
          ? error.message.split("\n")[0]
          : "Unable to switch wallet network.",
      );
    }
  };

  const handleCollection = async (createIfMissing: boolean) => {
    const requestId = ++collectionRequestRef.current;
    verificationRequestRef.current?.cancel();
    verificationRequestRef.current = undefined;
    setCollectionError(null);
    if (!isAddress(collectionToken)) {
      setCollectionError("Enter a valid primary ERC-20 address.");
      return;
    }

    const token = getAddress(collectionToken);
    let lifecycleDetails: CollectionLifecycleDetails | null = null;
    setCollectionPending(true);
    try {
      await readAsset(token);
      let box = await resolveCollection(token);
      if (box === "0x0000000000000000000000000000000000000000") {
        if (!createIfMissing) {
          throw new Error("No collection exists for this token on the canonical Factory.");
        }
        setActiveAction("Collection creation");
        const baseDetails = initialCollectionLifecycle(token, {
          factoryAddress: chainConfig.factoryAddress,
          rendererAddress: chainConfig.defaultRendererAddress,
        });
        lifecycleDetails = baseDetails;
        showVerificationToast(copy.collectionWalletRequest, "loading", baseDetails);
        const created = await createCollection(token);
        box = created.address;
        const confirmedDetails: CollectionLifecycleDetails = {
          ...baseDetails,
          status: "confirmed",
          boxAddress: getAddress(created.address),
          transactionHash: created.txHash,
        };
        lifecycleDetails = confirmedDetails;
        showVerificationToast(copy.collectionReceiptConfirmed, "loading", confirmedDetails);
        if (selectedChainId === XLAYER_CHAIN_ID && created.txHash) {
          savePendingVerification(window.localStorage, {
            version: 1,
            chainId: selectedChainId,
            tokenAddress: token,
            boxAddress: confirmedDetails.boxAddress,
            transactionHash: created.txHash,
            status: "pending",
          });
          showVerificationToast(copy.collectionVerificationRequest, "loading", {
            ...confirmedDetails,
            status: "verifying",
          });
          verificationRequestRef.current?.cancel();
          verificationRequestRef.current = requestBanmaoBoxVerification(created.txHash, (update) => {
            presentVerificationUpdate(confirmedDetails, update);
          });
        } else {
          showVerificationToast(copy.collectionReady, "success", {
            ...confirmedDetails,
            status: "ready",
          });
        }
      }
      if (requestId !== collectionRequestRef.current) return;
      selectCollection(token, getAddress(box));
    } catch (error) {
      if (requestId !== collectionRequestRef.current) return;
      if (lifecycleDetails) {
        const current = collectionLifecycleRef.current ?? lifecycleDetails;
        const knownHash = current.transactionHash ?? transactionHash ?? undefined;
        const classification = classifyTransactionError(error, Boolean(knownHash));
        const reason = error instanceof Error ? error.message : "";
        const validationFailure = /TokenBoxCreated|Factory did not register|runtime bytecode/.test(reason);
        const failureStage: CollectionFailureStage = !knownHash
          ? classification.kind === "rejected" ? "wallet" : "submission"
          : validationFailure ? "validation" : "receipt";
        const lifecycleMessage = classification.kind === "rejected" ? copy.transactionRejected
          : classification.kind === "replaced" ? copy.transactionReplaced
          : classification.kind === "timeout" ? copy.transactionTimeout
          : copy.transactionFailed;
        showVerificationToast(lifecycleMessage, "error", {
          ...current,
          status: "failed",
          failureStage,
          failureReason: reason,
          transactionHash: knownHash,
        });
      }
      setCollectionError(
        error instanceof Error
          ? error.message.split("\n")[0]
          : "Unable to resolve collection",
      );
    } finally {
      if (requestId === collectionRequestRef.current) setCollectionPending(false);
    }
  };

  const durationSeconds = useMemo(
    () => selectedDays === "custom"
      ? durationPartsToSeconds(customDuration)
      : BigInt(selectedDays) * 86_400n,
    [customDuration, selectedDays],
  );

  const estimatedUnlock = useMemo(
    () => new Date(now + Number(durationSeconds ?? 0n) * 1000),
    [durationSeconds, now],
  );

  const rememberAddress = (type: AddressHistoryType, value: Address) => {
    setAddressHistory((current) => {
      const next = addAddressHistoryEntry(current[type], value);
      window.localStorage.setItem(`banmaobox_history_${selectedChainId}_${type}`, JSON.stringify(next));
      return { ...current, [type]: next };
    });
  };

  const removeHistoryAddress = (type: AddressHistoryType, value?: Address) => {
    setAddressHistory((current) => {
      const next = value
        ? current[type].filter((item) => item.toLowerCase() !== value.toLowerCase())
        : [];
      window.localStorage.setItem(`banmaobox_history_${selectedChainId}_${type}`, JSON.stringify(next));
      return { ...current, [type]: next };
    });
  };

  const batchTotal = useMemo(() => {
    try {
      return batchRows.reduce(
        (total, row) => total + parseUnits(row.amount || "0", tokenDecimals),
        0n,
      );
    } catch {
      return 0n;
    }
  }, [batchRows, tokenDecimals]);

  const validateCreate = () => {
    if (!isDeploymentValidated) {
      return deploymentError ?? "The selected BanmaoBox deployment is not validated yet.";
    }
    if (tokenBalanceLoading) {
      return "Your token balance is still loading. Please wait a moment.";
    }
    if (tokenBalanceError) {
      return "Your token balance is unavailable. Retry the balance check before creating a box.";
    }
    if (createMode === "batch") {
      if (batchRows.length === 0 || batchRows.length > MAX_BATCH_SIZE) {
        return `A batch must contain between 1 and ${MAX_BATCH_SIZE} boxes.`;
      }
      for (let index = 0; index < batchRows.length; index += 1) {
        const row = batchRows[index];
        if (!isAddress(row.recipient)) return `Row ${index + 1}: ${copy.invalidRecipient}`;
        try {
          if (!/^\d+(\.\d+)?$/.test(row.amount) || parseUnits(row.amount, tokenDecimals) <= 0n) {
            return `Row ${index + 1}: ${copy.invalidAmount}`;
          }
        } catch {
          return `Row ${index + 1}: ${copy.invalidAmount}`;
        }
      }
      if (batchTotal > tokenBalance) return copy.insufficientBalance;
    } else {
      if (!amount || !/^\d+(\.\d+)?$/.test(amount)) return copy.invalidAmount;
      try {
        const baseAmount = parseUnits(amount, tokenDecimals);
        if (baseAmount <= 0n) return copy.invalidAmount;
        if (baseAmount > tokenBalance) return copy.insufficientBalance;
      } catch {
        return copy.invalidAmount;
      }
      if (!isAddress(recipient)) return copy.invalidRecipient;
    }

    if (createMode === "basket") {
      if (extraAssets.length === 0 || extraAssets.length > 4) {
        return "Add between 1 and 4 extra ERC-20 assets.";
      }
      for (const asset of extraAssets) {
        try {
          const value = parseUnits(asset.amount, asset.decimals);
          if (value <= 0n) return "Every basket amount must be greater than zero.";
          if (value > asset.balance) return `Insufficient ${asset.symbol} balance.`;
        } catch {
          return `Invalid ${asset.symbol} amount.`;
        }
      }
    }

    if (
      durationSeconds === null ||
      durationSeconds < 1n ||
      durationSeconds > MAX_LOCK_DURATION_SECONDS ||
      durationSeconds > maxLockDuration
    ) {
      return copy.invalidDuration;
    }
    return null;
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateCreate();
    setFormError(validationError);
    if (validationError) return;
    setLockAcknowledged(false);
    setReviewOpen(true);
  };

  const confirmCreate = async () => {
    const validationError = validateCreate();
    setFormError(validationError);
    if (validationError || !lockAcknowledged) return;

    try {
      setActiveAction(createMode === "batch" ? "Batch creation" : "BanmaoBox creation");
      const duration = durationSeconds;
      if (duration === null) return;
      if (createMode === "batch") {
        await createBoxes(
          batchRows.map((row) => ({
            recipient: getAddress(row.recipient),
            amount: row.amount,
          })),
          duration,
        );
      } else if (createMode === "basket" && activeTokenAddress) {
        await createMultiTokenBox(
          getAddress(recipient),
          [
            { token: activeTokenAddress, amount, decimals: tokenDecimals },
            ...extraAssets.map(({ token, amount: assetAmount, decimals }) => ({
              token, amount: assetAmount, decimals,
            })),
          ],
          duration,
        );
      } else {
        await createBox(getAddress(recipient), amount, duration);
      }
      setReviewOpen(false);
      setCelebrationOpen(true);
    } catch {
      // The hook exposes a normalized transaction error.
    }
  };

  const handleAddAsset = async () => {
    setFormError(null);
    if (!isAddress(newAssetToken)) {
      setFormError("Enter a valid ERC-20 address.");
      return;
    }
    const token = getAddress(newAssetToken);
    const allTokens = [activeTokenAddress, ...extraAssets.map((asset) => asset.token)];
    if (allTokens.some((value) => value?.toLowerCase() === token.toLowerCase())) {
      setFormError("Each basket token must be unique.");
      return;
    }
    if (extraAssets.length >= 4) {
      setFormError("A box supports at most five assets.");
      return;
    }
    try {
      const metadata = await readAsset(token);
      rememberAddress("asset", token);
      setExtraAssets((current) => [...current, { ...metadata, amount: "" }]);
      setNewAssetToken("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message.split("\n")[0] : "Unable to read token");
    }
  };

  const handleOpen = async (tokenId: bigint) => {
    setReleaseOutcome(null);
    const id = tokenId.toString();
    setActiveAction(copy.boxReleaseAction(id));
    try {
      const { remainingAssetCount, releasedAssetCount, failedAssetCount } = await openBox(tokenId);
      if (remainingAssetCount === 0n && releasedAssetCount > 0) {
        setReleaseOutcome(copy.releaseAllComplete(id, releasedAssetCount));
        if (inspectedBox?.tokenId === tokenId) setInspectedBox(null);
      } else if (remainingAssetCount !== null) {
        setReleaseOutcome(copy.releasePartial(
          id,
          releasedAssetCount,
          failedAssetCount,
          remainingAssetCount.toString(),
        ));
        if (inspectedBox?.tokenId === tokenId) {
          setInspectedBox(await inspectBox(tokenId));
        }
      } else {
        setReleaseOutcome(copy.releaseRefreshUnknown(id, releasedAssetCount, failedAssetCount));
      }
    } catch {
      // The hook exposes a normalized transaction error.
    }
  };

  const handleOpenAsset = async (
    tokenId: bigint,
    assetIndex: number,
    asset: BoxAsset,
  ) => {
    setReleaseOutcome(null);
    const id = tokenId.toString();
    setActiveAction(copy.assetReleaseAction(id));
    try {
      const { remainingAssetCount } = await openAsset(
        tokenId,
        BigInt(assetIndex),
        asset.token,
        asset.amount,
      );
      if (remainingAssetCount === 0n) {
        setReleaseOutcome(copy.assetReleaseComplete(id));
        if (inspectedBox?.tokenId === tokenId) setInspectedBox(null);
      } else if (remainingAssetCount !== null) {
        setReleaseOutcome(copy.assetReleaseRemaining(id, remainingAssetCount.toString()));
        if (inspectedBox?.tokenId === tokenId) {
          setInspectedBox(await inspectBox(tokenId));
        }
      } else {
        setReleaseOutcome(copy.assetReleaseRefreshUnknown(id));
      }
    } catch {
      // The hook exposes a normalized transaction error.
    }
  };

  const handleInspect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d+$/.test(inspectId)) {
      setInspectError(copy.inspectPlaceholder);
      return;
    }
    setInspectLoading(true);
    setInspectError(null);
    setInspectedBox(null);
    try {
      setInspectedBox(await inspectBox(BigInt(inspectId)));
    } catch {
      setInspectError("Box does not exist or the RPC request failed.");
    } finally {
      setInspectLoading(false);
    }
  };

  const handleTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTransferError(null);

    if (!transferEntry || !isAddress(transferRecipient)) {
      setTransferError(copy.invalidRecipient);
      return;
    }

    if (address && getAddress(transferRecipient) === getAddress(address)) {
      setTransferError(copy.sameRecipient);
      return;
    }

    try {
      setActiveAction(`Box #${transferEntry.tokenId.toString()} transfer`);
      await transferBox(
        transferEntry.tokenId,
        getAddress(transferRecipient) as Address,
      );
    } catch {
      // The hook exposes a normalized transaction error.
    }
  };

  const transactionMessage =
    phase === "success"
      ? copy.success
      : phase === "error"
        ? transactionError || copy.transactionError
        : copy.phase[phase];

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const tabs = ["create", "boxes", "explore"] as const;
    const current = tabs.indexOf(activeTab);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(tabs[next]);
    tabRefs.current[next]?.focus();
  };

  const createDisabledReason = !isConnected
    ? copy.connectToCreate
    : !isDeployed || !isDeploymentValidated
      ? deploymentError ?? copy.notDeployedDescription
      : isBusy
        ? transactionMessage
        : null;

  return (
    <main className="box-page">
      <div className="box-orb box-orb--one" aria-hidden="true" />
      <div className="box-orb box-orb--two" aria-hidden="true" />

      <header className="box-header">
        <Link href="/defi" className="box-back">
          <ArrowLeft />
          <span>{copy.back}</span>
        </Link>
        <div className="box-header__brand" aria-label="BanmaoBox">
          <span className="box-header__mark">
            <Gift />
          </span>
          <strong>BanmaoBox</strong>
          <span>BMAO-BOX</span>
        </div>
        <div className="box-header__actions">
          <div className="box-network-switcher" aria-label="BanmaoBox network">
            <Wallet aria-hidden="true" />
            <button
              type="button"
              className={selectedChainId === XLAYER_CHAIN_ID ? "active" : ""}
              onClick={() => void handleNetworkChange(XLAYER_CHAIN_ID)}
            >
              Mainnet
            </button>
            {BANMAOBOX_TESTNET_UI_ENABLED ? (
              <button
                type="button"
                className={selectedChainId === XLAYER_TESTNET_CHAIN_ID ? "active" : ""}
                onClick={() => void handleNetworkChange(XLAYER_TESTNET_CHAIN_ID)}
              >
                Testnet
              </button>
            ) : null}
          </div>
          <Link href="/defi/box/admin" className="box-ops-link">
            <ShieldCheck />
            {copy.operations}
          </Link>
        </div>
      </header>

      {networkError ? (
        <div className="box-network-error" role="alert">
          <ShieldAlert />
          <span>{networkError}</span>
          <button type="button" onClick={() => setNetworkError(null)} aria-label="Dismiss network error">
            <X />
          </button>
        </div>
      ) : null}

      <section className="box-hero">
        <div className="box-hero__copy">
          <span className="box-eyebrow">
            <Sparkles />
            {copy.eyebrow}
          </span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
          <div className="box-identity-chip" title={activeTokenAddress}>
            <ShieldCheck aria-hidden="true" />
            <span><small>{copy.primaryAsset}</small><bdi aria-label={tokenIdentity.displaySymbol}>{tokenIdentity.displaySymbol}</bdi></span>
            <code>{activeTokenAddress ?? copy.checking}</code>
          </div>

          <div className="box-metrics">
            <div>
              <span>{copy.lockedMetric}</span>
              <strong>
                {isDeployed
                  ? <TokenAmount value={totalLocked} decimals={tokenDecimals} symbol={tokenSymbol} language={language} compact />
                  : "—"}
              </strong>
            </div>
            <div>
              <span>{copy.activeMetric}</span>
              <strong>{isDeployed ? totalSupply.toString() : "—"}</strong>
            </div>
            <div className={tokenBalanceError ? "box-metric--error" : ""}>
              <span>{copy.walletMetric}</span>
              <strong aria-live="polite">
                {!isConnected ? (
                  "—"
                ) : tokenBalanceLoading ? (
                  <span className="box-metric__loading">
                    <LoaderCircle className="box-spin" aria-hidden="true" />
                    {copy.loading}
                  </span>
                ) : tokenBalanceError ? (
                  <button
                    type="button"
                    className="box-metric__retry"
                    onClick={() => void refetchTokenBalance()}
                    title={tokenBalanceError}
                    aria-label={copy.balanceRetry}
                  >
                    <RefreshCw aria-hidden="true" />
                    {copy.retry}
                  </button>
                ) : (
                  <TokenAmount value={tokenBalance} decimals={tokenDecimals} symbol={tokenSymbol} language={language} compact />
                )}
              </strong>
            </div>
          </div>
        </div>

        <div className="box-hero__art">
          <GiftBoxArtwork />
          <div className="box-floating-tag box-floating-tag--top">
            <ShieldCheck />
            ERC-721
          </div>
          <div className="box-floating-tag box-floating-tag--bottom">
            <Clock3 />
            TIME LOCK
          </div>
        </div>
      </section>

      {!isDeploymentValidated || deploymentWarning ? (
        <section className="box-deploy-notice" role="status">
          <span>
            <Box />
          </span>
          <div>
            <h2>
              {deploymentError
                ? copy.deploymentFailed
                : deploymentWarning
                  ? copy.deploymentWarning
                  : copy.notDeployedTitle}
            </h2>
            <p>{deploymentError ?? deploymentWarning ?? copy.notDeployedDescription}</p>
          </div>
        </section>
      ) : null}

      <section className="box-collection-manager">
        <button
          type="button"
          className="box-collection-toggle"
          onClick={() => setCollectionOpen((open) => !open)}
          aria-expanded={collectionOpen}
        >
          <span className="box-collection-identity">
            <strong><bdi aria-label={tokenIdentity.displaySymbol}>{tokenIdentity.displaySymbol}</bdi></strong>
            <small>{copy.collectionTitle}</small>
          </span>
          <ChevronDown className={collectionOpen ? "box-chevron-open" : ""} />
        </button>
        {collectionOpen ? (
          <div className="box-collection-body">
            <span>{copy.collectionHint}</span>
            <div className="box-collection-controls">
              <input
                value={collectionToken}
                onChange={(event) => {
                  collectionRequestRef.current += 1;
                  verificationRequestRef.current?.cancel();
                  setCollectionPending(false);
                  setCollectionError(null);
                  setCollectionToken(event.target.value.trim());
                }}
                placeholder="Primary ERC-20 address (0x…)"
                spellCheck={false}
                disabled={isBusy}
              />
              <button
                type="button"
                onClick={() => void handleCollection(false)}
                disabled={isBusy || collectionPending}
              >
                {collectionPending ? copy.checking : copy.useCollection}
              </button>
              <button
                type="button"
                className="primary box-collection-create"
                onClick={() => void handleCollection(true)}
                disabled={isBusy || collectionPending || !isConnected}
              >
                {collectionPending ? copy.checking : copy.createCollection}
              </button>
            </div>
            {addressHistory.collection.length > 0 ? (
              <div className="box-address-history">
                <span>{copy.recentAddresses}</span>
                {addressHistory.collection.map((item) => (
                  <span className="box-address-history__entry" key={item}>
                    <button type="button" onClick={() => setCollectionToken(item)}>{item}</button>
                    <button type="button" onClick={() => removeHistoryAddress("collection", item)} aria-label={`${copy.removeAddress} ${item}`}><X /></button>
                  </span>
                ))}
                <button type="button" onClick={() => removeHistoryAddress("collection")}>{copy.clearHistory}</button>
              </div>
            ) : null}
            {activeBoxAddress && activeTokenAddress ? (
              <div className="box-collection-details" aria-label={copy.collectionLifecycleLabel}>
                <strong>{tokenSymbol}</strong>
                <ExplorerValueRow
                  label={copy.tokenAddressLabel}
                  value={activeTokenAddress}
                  kind="address"
                  explorerBaseUrl={explorerBaseUrl}
                  copyLabel={copy.copyTokenAddress}
                  onCopied={(label) => toast.success(copy.copied(label), { duration: 1800 })}
                  onCopyFailed={() => toast.error(copy.copyFailed)}
                />
                <ExplorerValueRow
                  label={copy.collectionAddressLabel}
                  value={activeBoxAddress}
                  kind="address"
                  explorerBaseUrl={explorerBaseUrl}
                  copyLabel={copy.copyCollectionAddress}
                  onCopied={(label) => toast.success(copy.copied(label), { duration: 1800 })}
                  onCopyFailed={() => toast.error(copy.copyFailed)}
                />
                {collectionLifecycle?.transactionHash ? (
                  <ExplorerValueRow
                    label={copy.creatorTransactionLabel}
                    value={collectionLifecycle.transactionHash}
                    kind="tx"
                    explorerBaseUrl={explorerBaseUrl}
                    copyLabel={copy.copyTransactionHash}
                    onCopied={(label) => toast.success(copy.copied(label), { duration: 1800 })}
                    onCopyFailed={() => toast.error(copy.copyFailed)}
                  />
                ) : null}
                <span>{copy.networkLabel}: {chainConfig.chain.name}</span>
                <span>{copy.chainIdLabel}: {selectedChainId}</span>
              </div>
            ) : null}
            {collectionError ? <p className="box-form-error" role="alert">{collectionError}</p> : null}
          </div>
        ) : null}
      </section>

      <nav className="box-tabs" role="tablist" aria-label="BanmaoBox sections">
        <button id="box-tab-create" ref={(node) => { tabRefs.current[0] = node; }} role="tab" tabIndex={activeTab === "create" ? 0 : -1} aria-selected={activeTab === "create"} aria-controls="box-panel-create" className={activeTab === "create" ? "active" : ""} onKeyDown={handleTabKeyDown} onClick={() => setActiveTab("create")}>
          <Gift /> {copy.tabCreate}
        </button>
        <button id="box-tab-boxes" ref={(node) => { tabRefs.current[1] = node; }} role="tab" tabIndex={activeTab === "boxes" ? 0 : -1} aria-selected={activeTab === "boxes"} aria-controls="box-panel-boxes" className={activeTab === "boxes" ? "active" : ""} onKeyDown={handleTabKeyDown} onClick={() => setActiveTab("boxes")}>
          <Box /> {copy.tabMyBoxes}
          {boxes.length > 0 ? <span className="box-tab-count">{boxes.length}</span> : null}
        </button>
        <button id="box-tab-explore" ref={(node) => { tabRefs.current[2] = node; }} role="tab" tabIndex={activeTab === "explore" ? 0 : -1} aria-selected={activeTab === "explore"} aria-controls="box-panel-explore" className={activeTab === "explore" ? "active" : ""} onKeyDown={handleTabKeyDown} onClick={() => setActiveTab("explore")}>
          <Eye /> {copy.tabExplore}
        </button>
      </nav>

      {activeTab === "create" ? (
      <section className="box-tab-panel" id="box-panel-create" role="tabpanel" aria-labelledby="box-tab-create" tabIndex={0}>
        <article className="box-panel box-create-panel">
          <div className="box-panel__heading">
            <span className="box-panel__icon">
              <Gift />
            </span>
            <div>
              <h2>{copy.createTitle}</h2>
              <p>{copy.createDescription}</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="box-form">
            <ol className="box-create-stages" aria-label={copy.createDescription}>
              {[copy.amount, copy.recipient, copy.duration, copy.reviewTitle].map((label, index) => (
                <li key={label}><span>{index + 1}</span>{label}</li>
              ))}
            </ol>
            <div className="box-mode-switch" role="group" aria-label="Box creation mode">
              <button type="button" className={createMode === "single" ? "active" : ""} onClick={() => setCreateMode("single")} disabled={isBusy}>
                {copy.modeSingle}
              </button>
              <button type="button" className={createMode === "batch" ? "active" : ""} onClick={() => setCreateMode("batch")} disabled={isBusy}>
                {copy.modeBatch}
              </button>
              <button type="button" className={createMode === "basket" ? "active" : ""} onClick={() => setCreateMode("basket")} disabled={isBusy}>
                {copy.modeBasket}
              </button>
            </div>
            {createMode !== "batch" ? <label className="box-field">
              <span className="box-field__label">
                {copy.amount}
                <small>
                  {copy.balance}:{" "}
                  {tokenBalanceLoading
                    ? copy.loading
                    : tokenBalanceError
                      ? copy.unavailable
                      : `${formatExactTokenAmount(tokenBalance, tokenDecimals, language)} ${tokenSymbol}`}
                  <button
                    type="button"
                    onClick={() =>
                      setAmount(formatUnits(tokenBalance, tokenDecimals))
                    }
                    disabled={
                      !isConnected ||
                      tokenBalanceLoading ||
                      Boolean(tokenBalanceError)
                    }
                  >
                    {copy.useMax}
                  </button>
                </small>
              </span>
              <span className="box-input-wrap">
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value.trim());
                    setFormError(null);
                  }}
                  placeholder={copy.amountPlaceholder}
                  disabled={isBusy || !isDeployed || !isDeploymentValidated}
                  aria-invalid={Boolean(
                    formError &&
                    (formError === copy.invalidAmount ||
                      formError === copy.insufficientBalance),
                  )}
                />
                <b>{tokenSymbol}</b>
              </span>
            </label> : null}

            {createMode === "basket" ? (
              <div className="box-basket">
                <div className="box-basket__add">
                  <input
                    value={newAssetToken}
                    onChange={(event) => setNewAssetToken(event.target.value.trim())}
                    placeholder="Additional ERC-20 address"
                    spellCheck={false}
                    disabled={isBusy || extraAssets.length >= 4}
                  />
                  <button type="button" onClick={() => void handleAddAsset()} disabled={isBusy || extraAssets.length >= 4}>
                    {copy.addAsset}
                  </button>
                </div>
                {addressHistory.asset.length > 0 ? (
                  <div className="box-address-history">
                    <span>{copy.recentAddresses}</span>
                    {addressHistory.asset.map((item) => (
                      <span className="box-address-history__entry" key={item}>
                        <button type="button" onClick={() => setNewAssetToken(item)}>{item}</button>
                        <button type="button" onClick={() => removeHistoryAddress("asset", item)} aria-label={`${copy.removeAddress} ${item}`}><X /></button>
                      </span>
                    ))}
                    <button type="button" onClick={() => removeHistoryAddress("asset")}>{copy.clearHistory}</button>
                  </div>
                ) : null}
                {extraAssets.map((asset, index) => (
                  <div className="box-basket__asset" key={asset.token}>
                    <div>
                      <strong>{asset.symbol}</strong>
                      <small title={asset.token}>{asset.token.slice(0, 8)}…{asset.token.slice(-6)} · {asset.decimals} decimals · {copy.balance} {formatExactTokenAmount(asset.balance, asset.decimals, language)}</small>
                    </div>
                    <input
                      inputMode="decimal"
                      value={asset.amount}
                      placeholder="Amount"
                      onChange={(event) => setExtraAssets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value.trim() } : item))}
                      disabled={isBusy}
                    />
                    <button type="button" aria-label={`Remove ${asset.symbol}`} onClick={() => setExtraAssets((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={isBusy}>
                      <X />
                    </button>
                  </div>
                ))}
                <div className="box-token-warning" role="note">
                  <strong>{copy.compatibilityTitle}</strong>
                  <span>{copy.basketWarning}</span>
                </div>
              </div>
            ) : null}

            <div className="box-token-warning box-token-warning--direct" role="note">
              <ShieldAlert aria-hidden="true" />
              <span>{copy.directTransferWarning}</span>
            </div>

            {createMode === "batch" ? (
              <div className="box-batch">
                <div className="box-batch__summary">
                  <strong>{batchRows.length} / {MAX_BATCH_SIZE} boxes</strong>
                  <span>{copy.reviewTotal}: {formatExactTokenAmount(batchTotal, tokenDecimals, language)} {tokenSymbol}</span>
                </div>
                {batchRows.map((row, index) => (
                  <div className="box-batch__row" key={index}>
                    <span>{index + 1}</span>
                    <input
                      value={row.recipient}
                      onChange={(event) => setBatchRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, recipient: event.target.value.trim() } : item))}
                      placeholder="Recipient 0x…"
                      aria-label={`Recipient ${index + 1}`}
                      spellCheck={false}
                      disabled={isBusy}
                    />
                    <input
                      value={row.amount}
                      onChange={(event) => setBatchRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value.trim() } : item))}
                      placeholder={`Amount ${tokenSymbol}`}
                      aria-label={`Amount ${index + 1}`}
                      inputMode="decimal"
                      disabled={isBusy}
                    />
                    <button type="button" aria-label={`Remove row ${index + 1}`} onClick={() => setBatchRows((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={isBusy || batchRows.length === 1}>
                      <X />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="box-batch__add"
                  onClick={() => setBatchRows((current) => [...current, { recipient: address ?? "", amount: "" }])}
                  disabled={isBusy || batchRows.length >= MAX_BATCH_SIZE}
                >
                  {copy.addRecipient}
                </button>
                <small>
                  {copy.balance}: {tokenBalanceLoading
                    ? copy.loading
                    : tokenBalanceError
                      ? copy.unavailable
                      : `${formatExactTokenAmount(tokenBalance, tokenDecimals, language)} ${tokenSymbol}`}.{" "}
                  {copy.batchHint}
                </small>
              </div>
            ) : (
              <label className="box-field">
                <span className="box-field__label">{copy.recipient}</span>
                <span className="box-input-wrap box-input-wrap--address">
                  <Wallet />
                  <input
                    value={recipient}
                    onChange={(event) => {
                      setRecipient(event.target.value.trim());
                      setFormError(null);
                    }}
                    placeholder={copy.recipientPlaceholder}
                    disabled={isBusy || !isDeployed || !isDeploymentValidated}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </span>
                <small className="box-field__hint">{copy.recipientHint}</small>
              </label>
            )}

            <fieldset className="box-duration">
              <legend>{copy.duration}</legend>
              <div className="box-duration__options">
                {DURATION_OPTIONS.map((days) => (
                  <button
                    type="button"
                    key={days}
                    className={selectedDays === days ? "active" : ""}
                    onClick={() => {
                      setSelectedDays(days);
                      setFormError(null);
                    }}
                    disabled={isBusy || !isDeployed || !isDeploymentValidated}
                  >
                    {days}
                    {copy.days}
                  </button>
                ))}
                <button
                  type="button"
                  className={selectedDays === "custom" ? "active" : ""}
                  onClick={() => {
                    setSelectedDays("custom");
                    setFormError(null);
                  }}
                  disabled={isBusy || !isDeployed || !isDeploymentValidated}
                >
                  {copy.customDays}
                </button>
              </div>
              {selectedDays === "custom" ? (
                <div className="box-custom-duration">
                  {(["days", "hours", "minutes", "seconds"] as const).map((field) => (
                    <label key={field}>
                      <span>{copy[field]}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={customDuration[field]}
                        onChange={(event) => {
                          setCustomDuration((current) => ({ ...current, [field]: event.target.value.trim() }));
                          setFormError(null);
                        }}
                        placeholder="0"
                        disabled={isBusy || !isDeployed || !isDeploymentValidated}
                      />
                    </label>
                  ))}
                </div>
              ) : null}
              <small className="box-duration__limit">{copy.durationLimit}</small>
            </fieldset>

            <div className="box-unlock-preview">
              <Clock3 />
              <span>
                {copy.unlockPreview}
                <strong>
                  {estimatedUnlock.toLocaleString(language, {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })}
                </strong>
              </span>
            </div>

            {!isCorrectChain && isConnected ? (
              <p className="box-network-note">
                Switch your wallet to {chainConfig.chain.name} before signing.
              </p>
            ) : null}

            {networkError ? (
              <p className="box-form-error" role="alert">
                {networkError}
              </p>
            ) : null}

            {formError ? (
              <p className="box-form-error" role="alert">
                {formError}
              </p>
            ) : null}

            {isConnected && parsedAmount > 0n ? (
              <div
                className={`box-approval-status ${
                  needsApproval
                    ? "box-approval-status--needed"
                    : "box-approval-status--ready"
                }`}
              >
                {needsApproval ? (
                  <>
                    <ShieldAlert />
                    <span>{copy.approvalNeeded}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck />
                    <span>{copy.approvalReady}</span>
                  </>
                )}
              </div>
            ) : null}

            <button
              type="submit"
              className="box-submit"
              disabled={!isConnected || !isDeployed || !isDeploymentValidated || isBusy}
              aria-describedby={createDisabledReason ? "box-create-disabled-reason" : undefined}
            >
              {isBusy ? <LoaderCircle className="box-spin" /> : <Gift />}
              {isConnected
                ? needsApproval
                  ? copy.approveAndCreate
                  : copy.createButton
                : copy.connectToCreate}
              {!isBusy ? <ArrowRight /> : null}
            </button>
            {createDisabledReason ? (
              <p className="box-submit-reason" id="box-create-disabled-reason" role="status">
                {createDisabledReason}
              </p>
            ) : null}
          </form>
        </article>
      </section>
      ) : null}

      {activeTab === "boxes" ? (
      <section className="box-tab-panel" id="box-panel-boxes" role="tabpanel" aria-labelledby="box-tab-boxes" tabIndex={0}>
        <article className="box-panel box-list-panel">
          <div className="box-panel__heading box-panel__heading--list">
            <span className="box-panel__icon">
              <Box />
            </span>
            <div>
              <h2>{copy.boxesTitle}</h2>
              <p>{copy.boxesDescription}</p>
            </div>
            <button
              type="button"
              className="box-refresh"
              onClick={() => void refetchAll()}
              disabled={boxesLoading || !isDeployed}
              aria-label={copy.retry}
              title={copy.retry}
            >
              <RefreshCw className={boxesLoading ? "box-spin" : ""} />
            </button>
          </div>

          {!isConnected ? (
            <div className="box-empty">
              <Wallet />
              <strong>{copy.connectToCreate}</strong>
              <ConnectButton
                targetChainId={selectedChainId}
                supportedChainIds={[...XLAYER_SUPPORTED_CHAIN_IDS]}
              />
            </div>
          ) : boxesLoading && boxesTimedOut ? (
            <div className="box-empty box-empty--error" role="status">
              <Clock3 />
              <strong>{copy.loadingTimedOut}</strong>
              <button type="button" onClick={retryBoxes}>{copy.retry}</button>
            </div>
          ) : boxesLoading ? (
            <div className="box-skeleton-list" role="status" aria-label={copy.loading}>
              {[0, 1, 2].map((item) => (
                <div className="box-skeleton" key={item} aria-hidden="true">
                  <span className="box-skeleton__art" />
                  <span className="box-skeleton__content">
                    <i /><i /><i /><i />
                  </span>
                </div>
              ))}
              <span className="box-sr-only">{copy.loading}</span>
            </div>
          ) : boxesError ? (
            <div className="box-empty box-empty--error">
              <X />
              <strong>{copy.transactionError}</strong>
              <small>{boxesError}</small>
              <button type="button" onClick={() => void refetchAll()}>
                {copy.retry}
              </button>
            </div>
          ) : boxes.length === 0 ? (
            <div className="box-empty">
              <div className="box-empty__illustration" aria-hidden="true">
                <GiftBoxArtwork />
                <Sparkles />
              </div>
              <strong>{copy.noBoxes}</strong>
              <small>{copy.noBoxesHint}</small>
            </div>
          ) : (
            <>
              <div className="box-list">
                {visibleBoxes.map((entry) => (
                  <BoxCard
                    key={entry.tokenId.toString()}
                    entry={entry}
                    copy={copy}
                    language={language}
                    now={now}
                    decimals={tokenDecimals}
                    primaryToken={activeTokenAddress}
                    tokenSymbol={tokenSymbol}
                    busy={isBusy}
                    onOpen={(tokenId) => void handleOpen(tokenId)}
                    onOpenAsset={(tokenId, assetIndex, asset) =>
                      void handleOpenAsset(tokenId, assetIndex, asset)
                    }
                    onTransfer={setTransferEntry}
                    onRefreshMetadata={(tokenId) =>
                      void refreshMetadata(tokenId)
                    }
                    explorerUrl={boxNftExplorerUrl(
                      chainConfig.chain.blockExplorers.default.url,
                      activeBoxAddress ?? chainConfig.boxAddress,
                      entry.tokenId,
                    )}
                  />
                ))}
              </div>
              {pageCount > 1 ? (
                <nav className="box-pagination" aria-label="Box pages">
                  <button
                    type="button"
                    disabled={boxPage === 0}
                    onClick={() => setBoxPage((value) => value - 1)}
                  >
                    <ArrowLeft /> {copy.previous}
                  </button>
                  <span>
                    {boxPage + 1} / {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={boxPage + 1 >= pageCount}
                    onClick={() => setBoxPage((value) => value + 1)}
                  >
                    {copy.next} <ArrowRight />
                  </button>
                </nav>
              ) : null}
            </>
          )}
        </article>
      </section>
      ) : null}

      {activeTab === "explore" ? (
      <section className="box-tab-panel box-inspector" id="box-panel-explore" role="tabpanel" aria-labelledby="box-tab-explore" tabIndex={0}>
        <div className="box-inspector__copy">
          <span className="box-eyebrow">
            <Eye /> {copy.onchainExplorer}
          </span>
          <h2>{copy.inspectTitle}</h2>
          <p>{copy.inspectDescription}</p>
          <form onSubmit={handleInspect}>
            <input
              inputMode="numeric"
              value={inspectId}
              onChange={(event) => {
                setInspectId(event.target.value.trim());
                setInspectError(null);
              }}
              placeholder={copy.inspectPlaceholder}
              aria-label={copy.inspectPlaceholder}
            />
            <button
              type="submit"
              className="box-button box-button--primary"
              disabled={inspectLoading || !isDeploymentValidated}
            >
              {inspectLoading ? <LoaderCircle className="box-spin" /> : <Eye />}
              {copy.inspectButton}
            </button>
          </form>
          {inspectError ? (
            <p className="box-form-error" role="alert">
              {inspectError}
            </p>
          ) : null}
        </div>
        <div className="box-inspector__result">
          {inspectedBox ? (
            <>
              <Image
                className="box-svg"
                src={svgImageDataUri(inspectedBox.svg)}
                alt={`On-chain artwork for ${copy.boxNumber} #${inspectedBox.tokenId.toString()}`}
                width={600}
                height={600}
                unoptimized
              />
              <div className="box-inspector__facts">
                <strong>
                  {copy.boxNumber} #{inspectedBox.tokenId.toString()}
                </strong>
                <TokenAmount value={inspectedBox.amount} decimals={tokenDecimals} symbol={tokenSymbol} language={language} compact />
                <dl>
                  <div>
                    <dt>{copy.owner}</dt>
                    <dd title={inspectedBox.owner}>
                      {inspectedBox.owner.slice(0, 8)}…
                      {inspectedBox.owner.slice(-6)}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.createdAt}</dt>
                    <dd>{formatDate(inspectedBox.createdAt, language)}</dd>
                  </div>
                  <div>
                    <dt>{copy.unlocksAt}</dt>
                    <dd>{formatDate(inspectedBox.unlockTime, language)}</dd>
                  </div>
                </dl>
                <div className="box-inspector-assets">
                  {inspectedBox.assets.map((asset, index) => {
                    const isPrimary = activeTokenAddress?.toLowerCase() === asset.token.toLowerCase();
                    const assetDecimals = asset.decimals ?? (isPrimary ? tokenDecimals : 18);
                    const assetSymbol = resolveStoredAssetSymbol(
                      asset.symbol,
                      isPrimary ? tokenSymbol : undefined,
                      asset.token,
                      copy.genericToken,
                    );
                    return <button
                      type="button"
                      key={asset.token}
                      title={
                        inspectedBox.canOpen
                          ? `Release asset ${index + 1} separately. Asset indexes reload after every release.`
                          : asset.token
                      }
                      disabled={!inspectedBox.canOpen || isBusy}
                      onClick={() =>
                        void handleOpenAsset(inspectedBox.tokenId, index, asset)
                      }
                    >
                      <span>
                        {formatExactTokenAmount(asset.amount, assetDecimals, language)}{" "}
                        {assetSymbol}
                        {isPrimary ? ` · ${copy.primaryAsset}` : ""}{" "}
                        · {asset.token.slice(0, 8)}…{asset.token.slice(-6)}
                      </span>
                      {inspectedBox.canOpen ? <PackageOpen aria-label="Release this asset" /> : <LockKeyhole aria-label="Locked" />}
                    </button>;
                  })}
                </div>
                <a
                  href={boxNftExplorerUrl(
                    chainConfig.chain.blockExplorers.default.url,
                    activeBoxAddress ?? chainConfig.boxAddress,
                    inspectedBox.tokenId,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Explorer <ExternalLink />
                </a>
              </div>
            </>
          ) : (
            <div className="box-inspector__empty">
              <Gift />
              <span>{copy.onchainSvg}</span>
            </div>
          )}
        </div>
      </section>
      ) : null}


      <section className="box-how">
        <div className="box-how__heading">
          <span className="box-eyebrow">{copy.howTitle}</span>
          <h2>{copy.howDescription}</h2>
        </div>
        <div className="box-steps">
          {[
            {
              number: "01",
              icon: <LockKeyhole />,
              title: copy.stepApprove,
              text: copy.stepApproveText,
            },
            {
              number: "02",
              icon: <Gift />,
              title: copy.stepGift,
              text: copy.stepGiftText,
            },
            {
              number: "03",
              icon: <PackageOpen />,
              title: copy.stepOpen,
              text: copy.stepOpenText,
            },
          ].map((step) => (
            <article key={step.number}>
              <span className="box-step-number">{step.number}</span>
              <span className="box-step-icon">{step.icon}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
        <aside className="box-safety">
          <ShieldCheck />
          <div>
            <strong>{copy.safetyTitle}</strong>
            <p>{copy.safetyText}</p>
          </div>
        </aside>
      </section>

      <details className="box-contract-footer">
        <summary className="box-contract-footer__heading">
          <div>
            <span>Verified deployment details</span>
            <strong>{chainConfig.chain.name}</strong>
          </div>
          <small>Chain ID {selectedChainId}</small>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="box-contract-footer__grid">
          {(activeTokenAddress ?? chainConfig.tokenAddress) ? (
            <ExplorerValueRow
              label={copy.tokenAddressLabel}
              value={(activeTokenAddress ?? chainConfig.tokenAddress) as Address}
              kind="address"
              href={tokenExplorerUrl((activeTokenAddress ?? chainConfig.tokenAddress) as Address)}
              explorerBaseUrl={explorerBaseUrl}
              copyLabel={copy.copyTokenAddress}
              onCopied={(copiedLabel) => toast.success(copy.copied(copiedLabel), { duration: 1800 })}
              onCopyFailed={() => toast.error(copy.copyFailed)}
            />
          ) : null}
          {[
            [copy.collectionAddressLabel, activeBoxAddress ?? chainConfig.boxAddress, copy.copyCollectionAddress],
            [copy.factoryAddressLabel, chainConfig.factoryAddress, copy.copyFactoryAddress],
            [copy.rendererAddressLabel, chainConfig.boxRendererAddress, copy.copyRendererAddress],
          ].map(([label, contractAddress, copyLabel]) =>
            contractAddress ? (
              <ExplorerValueRow
                key={label}
                label={label}
                value={contractAddress as Address}
                kind="address"
                explorerBaseUrl={explorerBaseUrl}
                copyLabel={copyLabel}
                onCopied={(copiedLabel) => toast.success(copy.copied(copiedLabel), { duration: 1800 })}
                onCopyFailed={() => toast.error(copy.copyFailed)}
              />
            ) : null,
          )}
        </div>
      </details>

      {celebrationOpen && phase === "success" ? (
        <div className="box-dialog-backdrop box-celebration-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCelebrationOpen(false);
        }}>
          <section className="box-dialog box-celebration" role="dialog" aria-modal="true" aria-labelledby="box-celebration-title">
            <button type="button" className="box-dialog__close" onClick={() => setCelebrationOpen(false)} aria-label="Close celebration">
              <X />
            </button>
            <div className="box-celebration__art"><GiftBoxArtwork ready /><Sparkles /></div>
            <span className="box-eyebrow"><CheckCircle2 /> {copy.confirmedOnChain}</span>
            <h2 id="box-celebration-title">{copy.celebrationTitle}</h2>
            <p>{copy.celebrationText}</p>
            {transactionHash ? (
              <div className="box-celebration__actions">
                <ExplorerValueRow
                  label={copy.creatorTransactionLabel}
                  value={transactionHash}
                  kind="tx"
                  explorerBaseUrl={explorerBaseUrl}
                  copyLabel={copy.copyTransactionHash}
                  onCopied={(label) => toast.success(copy.copied(label), { duration: 1800 })}
                  onCopyFailed={() => toast.error(copy.copyFailed)}
                />
                <a className="box-button box-button--primary" href={`${chainConfig.chain.blockExplorers?.default.url}/tx/${transactionHash}`} target="_blank" rel="noreferrer">
                  {copy.viewTransaction} <ExternalLink />
                </a>
                <button className="box-button box-button--secondary" type="button" onClick={() => void copyToClipboard(transactionHash, "Transaction hash")}>
                  <Copy /> {copy.copyHash}
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {reviewOpen ? (
        <div
          className="box-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isBusy) setReviewOpen(false);
          }}
        >
          <section className="box-dialog box-review" role="dialog" aria-modal="true" aria-labelledby="box-review-title">
            <button type="button" className="box-dialog__close" onClick={() => setReviewOpen(false)} disabled={isBusy} aria-label={copy.cancel}>
              <X />
            </button>
            <ShieldCheck className="box-review__shield" />
            <h2 id="box-review-title">{copy.reviewTitle}</h2>
            <p>{copy.reviewText}</p>
            <dl className="box-review__details">
              <div><dt>{copy.reviewMode}</dt><dd>{createMode === "batch" ? copy.modeBatch : createMode === "basket" ? copy.modeBasket : copy.modeSingle}</dd></div>
              <div><dt>{copy.reviewTotal}</dt><dd>{createMode === "batch" ? formatExactTokenAmount(batchTotal, tokenDecimals, language) : amount} {tokenSymbol}</dd></div>
              <div><dt>{copy.reviewDuration}</dt><dd>{formatDuration(durationSeconds ?? 0n, language, copy)}</dd></div>
              <div><dt>{copy.reviewOpening}</dt><dd>{estimatedUnlock.toLocaleString(language, { dateStyle: "medium", timeStyle: "medium" })} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</dd></div>
              <div><dt>{copy.primaryAsset}</dt><dd><bdi aria-label={tokenIdentity.displaySymbol}>{tokenIdentity.displaySymbol}</bdi><code>{activeTokenAddress}</code></dd></div>
              {createMode !== "batch" ? <div><dt>{copy.recipient}</dt><dd><code>{recipient}</code></dd></div> : null}
            </dl>
            {createMode === "batch" ? (
              <div className="box-review__rows">
                {batchRows.map((row, index) => <small key={index}>#{index + 1} · {row.recipient} · {row.amount} {tokenSymbol}</small>)}
              </div>
            ) : null}
            {needsApproval ? (
              <div className="box-review__approval-notice">
                <ShieldAlert />
                <span>{copy.reviewApprovalNotice}</span>
              </div>
            ) : null}
            <label className="box-review__ack">
              <input type="checkbox" checked={lockAcknowledged} onChange={(event) => setLockAcknowledged(event.target.checked)} disabled={isBusy} />
              <span>{copy.reviewAck}</span>
            </label>
            <div className="box-dialog__actions">
              <button type="button" className="box-button box-button--secondary" onClick={() => setReviewOpen(false)} disabled={isBusy}>{copy.cancel}</button>
              <button type="button" className="box-button box-button--primary" onClick={() => void confirmCreate()} disabled={isBusy || !lockAcknowledged}>
                {isBusy ? <LoaderCircle className="box-spin" /> : <LockKeyhole />}
                {copy.confirmCreate}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {transferEntry ? (
        <div
          className="box-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isBusy) {
              setTransferEntry(null);
              setTransferError(null);
            }
          }}
        >
          <section
            className="box-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="box-transfer-title"
          >
            <button
              type="button"
              className="box-dialog__close"
              onClick={() => {
                setTransferEntry(null);
                setTransferError(null);
              }}
              disabled={isBusy}
              aria-label={copy.cancel}
            >
              <X />
            </button>

            <GiftBoxArtwork ready={transferEntry.canOpen} />
            <h2 id="box-transfer-title">{copy.transferTitle}</h2>
            <p>
              {copy.boxNumber} #{transferEntry.tokenId.toString()} ·{" "}
              {formatExactTokenAmount(transferEntry.amount, tokenDecimals, language)} {tokenSymbol}
            </p>

            <form onSubmit={handleTransfer}>
              <label className="box-field">
                <span className="box-field__label">
                  {copy.transferRecipient}
                </span>
                <span className="box-input-wrap box-input-wrap--address">
                  <Wallet />
                  <input
                    autoFocus
                    value={transferRecipient}
                    onChange={(event) => {
                      setTransferRecipient(event.target.value.trim());
                      setTransferError(null);
                    }}
                    placeholder={copy.recipientPlaceholder}
                    disabled={isBusy}
                    spellCheck={false}
                  />
                </span>
              </label>

              {transferError ? (
                <p className="box-form-error" role="alert">
                  {transferError}
                </p>
              ) : null}

              <div className="box-dialog__actions">
                <button
                  type="button"
                  className="box-button box-button--secondary"
                  onClick={() => {
                    setTransferEntry(null);
                    setTransferError(null);
                  }}
                  disabled={isBusy}
                >
                  {copy.cancel}
                </button>
                <button
                  type="submit"
                  className="box-button box-button--primary"
                  disabled={isBusy}
                >
                  {isBusy ? <LoaderCircle className="box-spin" /> : <Send />}
                  {copy.confirmTransfer}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
