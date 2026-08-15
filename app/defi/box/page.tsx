"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CheckCircle2,
  Circle,
  Clock3,
  Copy,
  Gift,
  Eye,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  Network,
  PackageOpen,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import {
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
  type Address,
} from "viem";
import { ConnectButton } from "../../components/wallet/WalletConnection";
import { LanguageSelector } from "../LanguageSelector";
import {
  getBoxChainConfig,
  type BasketInput,
  type BoxChainId,
  type BoxEntry,
  type InspectedBox,
} from "./contracts";
import { XLAYER_CHAIN_ID } from "../../lib/walletConfig";
import {
  BOX_COPY,
  getInitialBoxLanguage,
  type BoxCopy,
  type BoxLanguage,
} from "./i18n";
import { parseStoredCollection, svgImageDataUri } from "./safety";
import { formatBanmao, useBox } from "./useBox";
import "./box.css";

const DAY_SECONDS = 86_400n;
const DURATION_OPTIONS = [7, 30, 90, 180, 365] as const;
const BOXES_PER_PAGE = 6;
const MAX_BATCH_SIZE = 20;

type CreateMode = "single" | "batch" | "basket";
type BatchRow = { recipient: string; amount: string };

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
  onOpenAsset: (tokenId: bigint, assetIndex: number) => void;
  onTransfer: (entry: BoxEntry) => void;
  onRefreshMetadata: (tokenId: bigint) => void;
  primaryToken?: Address;
  tokenSymbol: string;
}) {
  const ready =
    entry.canOpen || Number(entry.unlockTime) <= Math.floor(now / 1000);

  return (
    <article className={`box-item ${ready ? "box-item--ready" : ""}`}>
      <div className="box-item__visual">
        <GiftBoxArtwork ready={ready} />
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
            {formatBanmao(entry.amount, decimals)} <small>{tokenSymbol}</small>
          </strong>
          {entry.assets.length > 1 ? <small>{entry.assets.length} assets in basket</small> : null}
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
              const assetSymbol = asset.symbol ?? (isPrimary ? tokenSymbol : "TOKEN");
              return (
                <div className="box-asset" key={asset.token}>
                  <div>
                    <strong>
                      {formatBanmao(asset.amount, assetDecimals)} {assetSymbol}
                    </strong>
                    <code title={asset.token}>
                      {asset.token.slice(0, 8)}…{asset.token.slice(-6)}
                    </code>
                  </div>
                  {isPrimary ? <span>{copy.primaryAsset}</span> : null}
                  <button
                    type="button"
                    disabled={!ready || busy}
                    onClick={() => onOpenAsset(entry.tokenId, index)}
                    title={ready ? copy.releaseHint : copy.locked}
                  >
                    <PackageOpen /> {copy.releaseAsset}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="box-item__actions">
          <button
            type="button"
            className="box-button box-button--primary"
            disabled={!ready || busy}
            onClick={() => onOpen(entry.tokenId)}
          >
            {busy ? <LoaderCircle className="box-spin" /> : <PackageOpen />}
            {copy.open}
          </button>
          <button
            type="button"
            className="box-button box-button--secondary"
            disabled={busy}
            onClick={() => onTransfer(entry)}
          >
            <Send />
            {copy.transfer}
          </button>
          {ready ? (
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
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function BanmaoBoxPage() {
  const [language, setLanguage] = useState<BoxLanguage>("en");
  const selectedChainId: BoxChainId = XLAYER_CHAIN_ID;
  const [networkError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [amount, setAmount] = useState("");
  const [activeBoxAddress, setActiveBoxAddress] = useState<Address>();
  const [activeTokenAddress, setActiveTokenAddress] = useState<Address>();
  const [collectionToken, setCollectionToken] = useState("");
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionPending, setCollectionPending] = useState(false);
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
  const [customDays, setCustomDays] = useState("");
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
  const collectionRequestRef = useRef(0);

  const chainConfig = getBoxChainConfig(selectedChainId);

  const {
    address,
    isConnected,
    isCorrectChain,
    isDeployed,
    tokenDecimals,
    tokenSymbol,
    maxLockDuration,
    tokenBalance,
    tokenBalanceLoading,
    tokenBalanceError,
    refetchTokenBalance,
    boxes,
    boxesLoading,
    boxesError,
    deploymentError,
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
  } = useBox(selectedChainId, activeBoxAddress, activeTokenAddress);

  const copy = BOX_COPY[language];
  const pageCount = Math.max(1, Math.ceil(boxes.length / BOXES_PER_PAGE));
  const visibleBoxes = useMemo(
    () => boxes.slice(boxPage * BOXES_PER_PAGE, (boxPage + 1) * BOXES_PER_PAGE),
    [boxPage, boxes],
  );

  useEffect(() => {
    const storageKey = `banmaobox_collection_${selectedChainId}`;
    const saved = parseStoredCollection(window.localStorage.getItem(storageKey));
    if (saved && saved.token !== saved.box) {
      setActiveTokenAddress(saved.token);
      setActiveBoxAddress(saved.box);
      setCollectionToken(saved.token);
    } else {
      window.localStorage.removeItem(storageKey);
      setActiveTokenAddress(chainConfig.tokenAddress);
      setActiveBoxAddress(chainConfig.boxAddress);
      setCollectionToken(chainConfig.tokenAddress ?? "");
    }
    setExtraAssets([]);
  }, [chainConfig.boxAddress, chainConfig.tokenAddress, selectedChainId]);

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
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

  useEffect(() => {
    if (phase === "success") {
      toast.success(`${activeAction} confirmed on X Layer`, {
        id: "banmaobox-transaction",
        duration: 5200,
      });
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
      toast.error(transactionError || copy.transactionError, {
        id: "banmaobox-transaction",
      });
    }
  }, [activeAction, copy.transactionError, phase, transactionError]);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`, { duration: 1800 });
    } catch {
      toast.error("Unable to copy. Please copy it manually.");
    }
  };

  const durationDays = useMemo(() => {
    if (selectedDays !== "custom") return selectedDays;
    const parsed = Number(customDays);
    return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
  }, [customDays, selectedDays]);

  const estimatedUnlock = useMemo(
    () => new Date(now + Math.max(durationDays, 0) * 24 * 60 * 60 * 1000),
    [durationDays, now],
  );

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

    if (durationDays < 1 || BigInt(durationDays) * DAY_SECONDS > maxLockDuration) {
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
      const duration = BigInt(durationDays) * DAY_SECONDS;
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

  const selectCollection = (token: Address, box: Address) => {
    setActiveTokenAddress(token);
    setActiveBoxAddress(box);
    setCollectionToken(token);
    setExtraAssets([]);
    setAmount("");
    window.localStorage.setItem(`banmaobox_collection_${selectedChainId}`, `${token}:${box}`);
  };

  const handleCollection = async (create: boolean) => {
    const requestId = ++collectionRequestRef.current;
    setCollectionError(null);
    if (!isAddress(collectionToken)) {
      setCollectionError("Enter a valid primary ERC-20 address.");
      return;
    }
    const token = getAddress(collectionToken);
    setCollectionPending(true);
    try {
      await readAsset(token);
      if (requestId !== collectionRequestRef.current) return;
      const existing = await resolveCollection(token);
      if (requestId !== collectionRequestRef.current) return;
      if (existing !== "0x0000000000000000000000000000000000000000") {
        selectCollection(token, existing);
        return;
      }
      if (!create) {
        setCollectionError("No collection exists for this token. Create it first.");
        return;
      }
      const created = await createCollection(token);
      if (requestId === collectionRequestRef.current) selectCollection(token, created);
    } catch (error) {
      if (requestId === collectionRequestRef.current) {
        setCollectionError(error instanceof Error ? error.message.split("\n")[0] : "Collection action failed");
      }
    } finally {
      if (requestId === collectionRequestRef.current) setCollectionPending(false);
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
      setExtraAssets((current) => [...current, { ...metadata, amount: "" }]);
      setNewAssetToken("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message.split("\n")[0] : "Unable to read token");
    }
  };

  const handleOpen = async (tokenId: bigint) => {
    setReleaseOutcome(null);
    setActiveAction(`Box #${tokenId.toString()} release`);
    try {
      const { remainingAssetCount } = await openBox(tokenId);
      if (remainingAssetCount === 0n) {
        setReleaseOutcome(
          `Box #${tokenId.toString()} released all assets and was burned.`,
        );
        if (inspectedBox?.tokenId === tokenId) setInspectedBox(null);
      } else if (remainingAssetCount !== null) {
        setReleaseOutcome(
          `Box #${tokenId.toString()} still contains ${remainingAssetCount.toString()} asset${remainingAssetCount === 1n ? "" : "s"}. Retry release for the remaining assets.`,
        );
        if (inspectedBox?.tokenId === tokenId) {
          setInspectedBox(await inspectBox(tokenId));
        }
      } else {
        setReleaseOutcome(
          `Box #${tokenId.toString()} release was confirmed, but the final asset count could not be refreshed. Reload before retrying an asset index.`,
        );
      }
    } catch {
      // The hook exposes a normalized transaction error.
    }
  };

  const handleOpenAsset = async (tokenId: bigint, assetIndex: number) => {
    setReleaseOutcome(null);
    setActiveAction(`Box #${tokenId.toString()} asset release`);
    try {
      const { remainingAssetCount } = await openAsset(
        tokenId,
        BigInt(assetIndex),
      );
      if (remainingAssetCount === 0n) {
        setReleaseOutcome(
          `Box #${tokenId.toString()} released its final asset and was burned.`,
        );
        if (inspectedBox?.tokenId === tokenId) setInspectedBox(null);
      } else if (remainingAssetCount !== null) {
        setReleaseOutcome(
          `Asset released. Box #${tokenId.toString()} now contains ${remainingAssetCount.toString()} asset${remainingAssetCount === 1n ? "" : "s"}; indexes were reloaded.`,
        );
        if (inspectedBox?.tokenId === tokenId) {
          setInspectedBox(await inspectBox(tokenId));
        }
      } else {
        setReleaseOutcome(
          `Asset release was confirmed for Box #${tokenId.toString()}, but indexes could not be refreshed. Reload before releasing another asset.`,
        );
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
          <div className="box-network-switcher" aria-label="X Layer Mainnet, chain 196">
            <Network aria-hidden="true" />
            <span className="active">X Layer · 196</span>
          </div>
          <Link href="/defi/box/admin" className="box-ops-link">
            <ShieldCheck />
            {copy.operations}
          </Link>
          <LanguageSelector currentLang={language} onChangeLang={setLanguage} />
          <ConnectButton
            targetChainId={selectedChainId}
            supportedChainIds={[XLAYER_CHAIN_ID]}
          />
        </div>
      </header>

      <section className="box-hero">
        <div className="box-hero__copy">
          <span className="box-eyebrow">
            <Sparkles />
            {copy.eyebrow}
          </span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>

          <div className="box-metrics">
            <div>
              <span>{copy.lockedMetric}</span>
              <strong>
                {isDeployed
                  ? `${formatBanmao(totalLocked, tokenDecimals, 2)} ${tokenSymbol}`
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
                    aria-label="Balance unavailable. Retry balance check"
                  >
                    <RefreshCw aria-hidden="true" />
                    {copy.retry}
                  </button>
                ) : (
                  `${formatBanmao(tokenBalance, tokenDecimals, 2)} ${tokenSymbol}`
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

      {!isDeployed || deploymentError ? (
        <section className="box-deploy-notice" role="status">
          <span>
            <Box />
          </span>
          <div>
            <h2>
              {deploymentError
                ? "Deployment validation failed"
                : copy.notDeployedTitle}
            </h2>
            <p>{deploymentError ?? copy.notDeployedDescription}</p>
          </div>
        </section>
      ) : null}

      <section className="box-collection-manager">
        <div>
          <strong>Collection manager</strong>
          <span>
            One canonical BanmaoBox collection per primary ERC-20. Anyone can create a missing collection.
          </span>
        </div>
        <div className="box-collection-controls">
          <input
            value={collectionToken}
            onChange={(event) => {
              collectionRequestRef.current += 1;
              setCollectionPending(false);
              setCollectionError(null);
              setCollectionToken(event.target.value.trim());
            }}
            placeholder="Primary ERC-20 address (0x…)"
            spellCheck={false}
            disabled={isBusy}
          />
          <button type="button" onClick={() => void handleCollection(false)} disabled={isBusy || collectionPending}>
            {collectionPending ? "Checking…" : "Use collection"}
          </button>
          <button type="button" className="primary" onClick={() => void handleCollection(true)} disabled={isBusy || collectionPending || !isConnected}>
            {collectionPending ? "Checking…" : "Create if missing"}
          </button>
        </div>
        {activeBoxAddress && activeTokenAddress ? (
          <small>
            Active: {tokenSymbol} · {activeTokenAddress.slice(0, 8)}…{activeTokenAddress.slice(-6)} · Box {activeBoxAddress.slice(0, 8)}…{activeBoxAddress.slice(-6)}
          </small>
        ) : null}
        {collectionError ? <p className="box-form-error" role="alert">{collectionError}</p> : null}
      </section>

      <section className="box-workspace">
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
            <div className="box-mode-switch" role="group" aria-label="Box creation mode">
              <button type="button" className={createMode === "single" ? "active" : ""} onClick={() => setCreateMode("single")} disabled={isBusy}>
                Single box
              </button>
              <button type="button" className={createMode === "batch" ? "active" : ""} onClick={() => setCreateMode("batch")} disabled={isBusy}>
                Batch (1–20)
              </button>
              <button type="button" className={createMode === "basket" ? "active" : ""} onClick={() => setCreateMode("basket")} disabled={isBusy}>
                Basket (2–5 tokens)
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
                      ? "Unavailable"
                      : `${formatBanmao(tokenBalance, tokenDecimals)} ${tokenSymbol}`}
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
                    Add asset
                  </button>
                </div>
                {extraAssets.map((asset, index) => (
                  <div className="box-basket__asset" key={asset.token}>
                    <div>
                      <strong>{asset.symbol}</strong>
                      <small title={asset.token}>{asset.token.slice(0, 8)}…{asset.token.slice(-6)} · {asset.decimals} decimals · balance {formatBanmao(asset.balance, asset.decimals)}</small>
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
                <p className="box-token-warning">
                  Assets are released independently. A paused, blacklisted, rebasing or upgraded token may remain in the NFT and require a later retry, but it will not block other transferable assets. Use only trusted fixed-balance ERC-20s.
                </p>
              </div>
            ) : null}

            {createMode === "batch" ? (
              <div className="box-batch">
                <div className="box-batch__summary">
                  <strong>{batchRows.length} / {MAX_BATCH_SIZE} boxes</strong>
                  <span>Total: {formatBanmao(batchTotal, tokenDecimals)} {tokenSymbol}</span>
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
                  Add recipient
                </button>
                <small>
                  Balance: {tokenBalanceLoading
                    ? copy.loading
                    : tokenBalanceError
                      ? "Unavailable"
                      : `${formatBanmao(tokenBalance, tokenDecimals)} ${tokenSymbol}`}.{" "}
                  The batch is atomic and uses one shared unlock date.
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
                <input
                  className="box-custom-days"
                  type="number"
                  min="1"
                  max="36500"
                  step="1"
                  value={customDays}
                  onChange={(event) => {
                    setCustomDays(event.target.value);
                    setFormError(null);
                  }}
                  placeholder={copy.customDaysPlaceholder}
                  disabled={isBusy || !isDeployed || !isDeploymentValidated}
                />
              ) : null}
              <small className="box-duration__limit">Maximum: 36,500 days (100 years). Locked assets cannot be opened early.</small>
            </fieldset>

            <div className="box-unlock-preview">
              <Clock3 />
              <span>
                {copy.unlockPreview}
                <strong>
                  {estimatedUnlock.toLocaleString(language, {
                    dateStyle: "medium",
                    timeStyle: "short",
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

            <button
              type="submit"
              className="box-submit"
              disabled={!isConnected || !isDeployed || !isDeploymentValidated || isBusy}
            >
              {isBusy ? <LoaderCircle className="box-spin" /> : <Gift />}
              {isConnected ? copy.createButton : copy.connectToCreate}
              {!isBusy ? <ArrowRight /> : null}
            </button>
          </form>
        </article>

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
                supportedChainIds={[XLAYER_CHAIN_ID]}
              />
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
                    onOpenAsset={(tokenId, assetIndex) =>
                      void handleOpenAsset(tokenId, assetIndex)
                    }
                    onTransfer={setTransferEntry}
                    onRefreshMetadata={(tokenId) =>
                      void refreshMetadata(tokenId)
                    }
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

      <section className="box-inspector">
        <div className="box-inspector__copy">
          <span className="box-eyebrow">
            <Eye /> On-chain explorer
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
                width={800}
                height={800}
                unoptimized
              />
              <div className="box-inspector__facts">
                <strong>
                  {copy.boxNumber} #{inspectedBox.tokenId.toString()}
                </strong>
                <span>
                  {formatBanmao(inspectedBox.amount, tokenDecimals)}{" "}
                  {tokenSymbol}
                </span>
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
                  {inspectedBox.assets.map((asset, index) => (
                    <button
                      type="button"
                      key={asset.token}
                      title={
                        inspectedBox.canOpen
                          ? `Release asset ${index + 1} separately. Asset indexes reload after every release.`
                          : asset.token
                      }
                      disabled={!inspectedBox.canOpen || isBusy}
                      onClick={() =>
                        void handleOpenAsset(inspectedBox.tokenId, index)
                      }
                    >
                      <span>
                        {formatBanmao(asset.amount, asset.decimals ?? 18)}{" "}
                        {asset.symbol ?? "TOKEN"}
                        {activeTokenAddress?.toLowerCase() ===
                        asset.token.toLowerCase()
                          ? ` · ${copy.primaryAsset}`
                          : ""}{" "}
                        · {asset.token.slice(0, 8)}…{asset.token.slice(-6)}
                      </span>
                      {inspectedBox.canOpen ? <PackageOpen aria-label="Release this asset" /> : <LockKeyhole aria-label="Locked" />}
                    </button>
                  ))}
                </div>
                <a
                  href={`${chainConfig.chain.blockExplorers?.default.url}/token/${activeBoxAddress ?? chainConfig.boxAddress}?a=${inspectedBox.tokenId}`}
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
              <span>Fully on-chain SVG &amp; metadata</span>
            </div>
          )}
        </div>
      </section>

      {transactionMessage ? (
        <div
          className={`box-transaction box-transaction--${phase}`}
          role={phase === "error" ? "alert" : "status"}
        >
          {phase === "success" ? (
            <CheckCircle2 />
          ) : phase === "error" ? (
            <X />
          ) : (
            <LoaderCircle className="box-spin" />
          )}
          <div className="box-transaction__content">
            <strong>{transactionMessage}</strong>
            <ol className="box-transaction__steps" aria-label="Transaction progress">
              {["Wallet", "Broadcast", "Confirmed"].map((label, index) => {
                const activeIndex = phase === "success" ? 2 : transactionHash ? 1 : 0;
                const complete = index < activeIndex || phase === "success";
                return (
                  <li className={complete ? "complete" : index === activeIndex ? "active" : ""} key={label}>
                    {complete ? <CheckCircle2 /> : <Circle />}
                    <span>{label}</span>
                  </li>
                );
              })}
            </ol>
            {releaseOutcome ? <small>{releaseOutcome}</small> : null}
            {transactionHash ? (
              <span className="box-transaction__hash">
                <a
                  href={`${chainConfig.chain.blockExplorers?.default.url}/tx/${transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on explorer <ExternalLink />
                </a>
                <button type="button" onClick={() => void copyToClipboard(transactionHash, "Transaction hash")} aria-label="Copy transaction hash">
                  <Copy />
                </button>
              </span>
            ) : null}
          </div>
        </div>
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

      {celebrationOpen && phase === "success" ? (
        <div className="box-dialog-backdrop box-celebration-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCelebrationOpen(false);
        }}>
          <section className="box-dialog box-celebration" role="dialog" aria-modal="true" aria-labelledby="box-celebration-title">
            <button type="button" className="box-dialog__close" onClick={() => setCelebrationOpen(false)} aria-label="Close celebration">
              <X />
            </button>
            <div className="box-celebration__art"><GiftBoxArtwork ready /><Sparkles /></div>
            <span className="box-eyebrow"><CheckCircle2 /> Confirmed on X Layer</span>
            <h2 id="box-celebration-title">Your BanmaoBox is ready.</h2>
            <p>The time lock is now secured on-chain. You can follow the transaction or return to your collection.</p>
            {transactionHash ? (
              <div className="box-celebration__actions">
                <a className="box-button box-button--primary" href={`${chainConfig.chain.blockExplorers?.default.url}/tx/${transactionHash}`} target="_blank" rel="noreferrer">
                  View transaction <ExternalLink />
                </a>
                <button className="box-button box-button--secondary" type="button" onClick={() => void copyToClipboard(transactionHash, "Transaction hash")}>
                  <Copy /> Copy hash
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
            <h2 id="box-review-title">Review permanent lock</h2>
            <p>Verify every detail before your wallet request. This lock cannot be shortened or cancelled.</p>
            <dl className="box-review__details">
              <div><dt>Mode</dt><dd>{createMode === "batch" ? `Batch · ${batchRows.length} boxes` : createMode === "basket" ? `Basket · ${extraAssets.length + 1} tokens` : "Single box"}</dd></div>
              <div><dt>Primary total</dt><dd>{createMode === "batch" ? formatBanmao(batchTotal, tokenDecimals) : amount} {tokenSymbol}</dd></div>
              <div><dt>Lock duration</dt><dd>{durationDays.toLocaleString()} days</dd></div>
              <div><dt>Estimated opening</dt><dd>{estimatedUnlock.toLocaleString(language, { dateStyle: "medium", timeStyle: "short" })}</dd></div>
            </dl>
            {createMode === "batch" ? (
              <div className="box-review__rows">
                {batchRows.map((row, index) => <small key={index}>#{index + 1} · {row.recipient.slice(0, 8)}…{row.recipient.slice(-6)} · {row.amount} {tokenSymbol}</small>)}
              </div>
            ) : null}
            <label className="box-review__ack">
              <input type="checkbox" checked={lockAcknowledged} onChange={(event) => setLockAcknowledged(event.target.checked)} disabled={isBusy} />
              <span>I understand these assets cannot be opened before the date shown above, even if I make a mistake.</span>
            </label>
            <div className="box-dialog__actions">
              <button type="button" className="box-button box-button--secondary" onClick={() => setReviewOpen(false)} disabled={isBusy}>{copy.cancel}</button>
              <button type="button" className="box-button box-button--primary" onClick={() => void confirmCreate()} disabled={isBusy || !lockAcknowledged}>
                {isBusy ? <LoaderCircle className="box-spin" /> : <LockKeyhole />}
                Confirm and continue
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
              {formatBanmao(transferEntry.amount, tokenDecimals)} {tokenSymbol}
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
