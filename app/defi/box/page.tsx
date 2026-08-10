"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CheckCircle2,
  Clock3,
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
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSwitchChain } from "wagmi";
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
import {
  XLAYER_CHAIN_ID,
  XLAYER_TESTNET_CHAIN_ID,
} from "../../lib/walletConfig";
import {
  BOX_COPY,
  getInitialBoxLanguage,
  type BoxCopy,
  type BoxLanguage,
} from "./i18n";
import { formatBanmao, useBox } from "./useBox";
import "./box.css";

const DAY_SECONDS = 86_400n;
const DURATION_OPTIONS = [7, 30, 90, 180, 365] as const;
const BOXES_PER_PAGE = 6;

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
  onTransfer,
  onRefreshMetadata,
  tokenSymbol,
}: {
  entry: BoxEntry;
  copy: BoxCopy;
  language: BoxLanguage;
  now: number;
  decimals: number;
  busy: boolean;
  onOpen: (tokenId: bigint) => void;
  onTransfer: (entry: BoxEntry) => void;
  onRefreshMetadata: (tokenId: bigint) => void;
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
            <dd className={ready ? "box-ready-text" : ""}>
              {getRemaining(entry.unlockTime, now, copy)}
            </dd>
          </div>
        </dl>

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
  const [selectedChainId, setSelectedChainId] = useState<BoxChainId>(
    XLAYER_TESTNET_CHAIN_ID,
  );
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [amount, setAmount] = useState("");
  const [activeBoxAddress, setActiveBoxAddress] = useState<Address>();
  const [activeTokenAddress, setActiveTokenAddress] = useState<Address>();
  const [collectionToken, setCollectionToken] = useState("");
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [multiMode, setMultiMode] = useState(false);
  const [extraAssets, setExtraAssets] = useState<
    (BasketInput & { symbol: string; balance: bigint })[]
  >([]);
  const [newAssetToken, setNewAssetToken] = useState("");
  const [recipient, setRecipient] = useState("");
  const [selectedDays, setSelectedDays] = useState<number | "custom">(30);
  const [customDays, setCustomDays] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [transferEntry, setTransferEntry] = useState<BoxEntry | null>(null);
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [boxPage, setBoxPage] = useState(0);
  const [inspectId, setInspectId] = useState("");
  const [inspectedBox, setInspectedBox] = useState<InspectedBox | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const { switchChainAsync, isPending: isSwitchingNetwork } = useSwitchChain();
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
    boxes,
    boxesLoading,
    boxesError,
    deploymentError,
    isDeploymentValidated,
    totalLocked,
    totalSupply,
    createBox,
    createMultiTokenBox,
    createCollection,
    resolveCollection,
    readAsset,
    openBox,
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

  const handleNetworkChange = async (nextChainId: BoxChainId) => {
    setSelectedChainId(nextChainId);
    setNetworkError(null);
    window.localStorage.setItem("banmaobox_chain_id", String(nextChainId));

    if (!isConnected) return;

    try {
      await switchChainAsync({ chainId: nextChainId });
    } catch (error) {
      setNetworkError(
        error instanceof Error
          ? error.message.split("\n")[0]
          : "Unable to switch network",
      );
    }
  };

  useEffect(() => {
    const savedChainId = Number(
      window.localStorage.getItem("banmaobox_chain_id"),
    );
    if (
      savedChainId === XLAYER_CHAIN_ID ||
      savedChainId === XLAYER_TESTNET_CHAIN_ID
    ) {
      setSelectedChainId(savedChainId);
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(`banmaobox_collection_${selectedChainId}`);
    const [savedToken, savedBox] = saved?.split(":") ?? [];
    if (isAddress(savedToken ?? "") && isAddress(savedBox ?? "")) {
      setActiveTokenAddress(getAddress(savedToken));
      setActiveBoxAddress(getAddress(savedBox));
      setCollectionToken(getAddress(savedToken));
    } else {
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
      setExtraAssets([]);
      setTransferEntry(null);
      setTransferRecipient("");
    }
  }, [phase]);

  const durationDays = useMemo(() => {
    if (selectedDays !== "custom") return selectedDays;
    const parsed = Number(customDays);
    return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
  }, [customDays, selectedDays]);

  const estimatedUnlock = useMemo(
    () => new Date(now + Math.max(durationDays, 0) * 24 * 60 * 60 * 1000),
    [durationDays, now],
  );

  const validateCreate = () => {
    if (!amount || !/^\d+(\.\d+)?$/.test(amount)) {
      return copy.invalidAmount;
    }

    try {
      const baseAmount = parseUnits(amount, tokenDecimals);
      if (baseAmount <= 0n) return copy.invalidAmount;
      if (baseAmount > tokenBalance) return copy.insufficientBalance;
    } catch {
      return copy.invalidAmount;
    }

    if (multiMode) {
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

    if (!isAddress(recipient)) return copy.invalidRecipient;
    if (
      durationDays < 1 ||
      BigInt(durationDays) * DAY_SECONDS > maxLockDuration
    ) {
      return copy.invalidDuration;
    }
    return null;
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateCreate();
    setFormError(validationError);
    if (validationError) return;

    try {
      const duration = BigInt(durationDays) * DAY_SECONDS;
      if (multiMode && activeTokenAddress) {
        await createMultiTokenBox(
          getAddress(recipient),
          [
            {
              token: activeTokenAddress,
              amount,
              decimals: tokenDecimals,
            },
            ...extraAssets.map(({ token, amount: assetAmount, decimals }) => ({
              token,
              amount: assetAmount,
              decimals,
            })),
          ],
          duration,
        );
      } else {
        await createBox(getAddress(recipient), amount, duration);
      }
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
    setCollectionError(null);
    if (!isAddress(collectionToken)) {
      setCollectionError("Enter a valid primary ERC-20 address.");
      return;
    }
    const token = getAddress(collectionToken);
    try {
      await readAsset(token);
      const existing = await resolveCollection(token);
      if (existing !== "0x0000000000000000000000000000000000000000") {
        selectCollection(token, existing);
        return;
      }
      if (!create) {
        setCollectionError("No collection exists for this token. Create it first.");
        return;
      }
      selectCollection(token, await createCollection(token));
    } catch (error) {
      setCollectionError(error instanceof Error ? error.message.split("\n")[0] : "Collection action failed");
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
    try {
      await openBox(tokenId);
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
          <div
            className="box-network-switcher"
            role="group"
            aria-label="BanmaoBox network"
          >
            <Network aria-hidden="true" />
            <button
              type="button"
              className={selectedChainId === XLAYER_CHAIN_ID ? "active" : ""}
              onClick={() => void handleNetworkChange(XLAYER_CHAIN_ID)}
              disabled={isSwitchingNetwork || isBusy}
              aria-pressed={selectedChainId === XLAYER_CHAIN_ID}
            >
              X Layer
            </button>
            <button
              type="button"
              className={
                selectedChainId === XLAYER_TESTNET_CHAIN_ID ? "active" : ""
              }
              onClick={() => void handleNetworkChange(XLAYER_TESTNET_CHAIN_ID)}
              disabled={isSwitchingNetwork || isBusy}
              aria-pressed={selectedChainId === XLAYER_TESTNET_CHAIN_ID}
            >
              Testnet
            </button>
          </div>
          <Link href="/defi/box/admin" className="box-ops-link">
            <ShieldCheck />
            {copy.operations}
          </Link>
          <LanguageSelector currentLang={language} onChangeLang={setLanguage} />
          <ConnectButton
            targetChainId={selectedChainId}
            supportedChainIds={[XLAYER_CHAIN_ID, XLAYER_TESTNET_CHAIN_ID]}
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
            <div>
              <span>{copy.walletMetric}</span>
              <strong>
                {isConnected
                  ? `${formatBanmao(tokenBalance, tokenDecimals, 2)} ${tokenSymbol}`
                  : "—"}
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
            onChange={(event) => setCollectionToken(event.target.value.trim())}
            placeholder="Primary ERC-20 address (0x…)"
            spellCheck={false}
            disabled={isBusy}
          />
          <button type="button" onClick={() => void handleCollection(false)} disabled={isBusy}>
            Use collection
          </button>
          <button type="button" className="primary" onClick={() => void handleCollection(true)} disabled={isBusy || !isConnected}>
            Create if missing
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
            <div className="box-mode-switch" role="group" aria-label="Box asset mode">
              <button type="button" className={!multiMode ? "active" : ""} onClick={() => setMultiMode(false)} disabled={isBusy}>
                Single token
              </button>
              <button type="button" className={multiMode ? "active" : ""} onClick={() => setMultiMode(true)} disabled={isBusy}>
                Multi-token basket (2–5)
              </button>
            </div>
            <label className="box-field">
              <span className="box-field__label">
                {copy.amount}
                <small>
                  {copy.balance}: {formatBanmao(tokenBalance, tokenDecimals)}{" "}
                  {tokenSymbol}
                  <button
                    type="button"
                    onClick={() =>
                      setAmount(formatUnits(tokenBalance, tokenDecimals))
                    }
                    disabled={!isConnected}
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
            </label>

            {multiMode ? (
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
              disabled={!isConnected || !isDeployed || isBusy}
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
                supportedChainIds={[XLAYER_CHAIN_ID, XLAYER_TESTNET_CHAIN_ID]}
              />
            </div>
          ) : boxesLoading ? (
            <div className="box-empty">
              <LoaderCircle className="box-spin" />
              <strong>{copy.loading}</strong>
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
              <Box />
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
                    tokenSymbol={tokenSymbol}
                    busy={isBusy}
                    onOpen={(tokenId) => void handleOpen(tokenId)}
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
              <div
                className="box-svg"
                dangerouslySetInnerHTML={{ __html: inspectedBox.svg }}
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
                    <span key={asset.token} title={asset.token}>
                      Asset {index + 1}: {asset.amount.toString()} base units · {asset.token.slice(0, 8)}…{asset.token.slice(-6)}
                    </span>
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
          <div>
            <strong>{transactionMessage}</strong>
            {transactionHash ? (
              <a
                href={`${chainConfig.chain.blockExplorers?.default.url}/tx/${transactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {transactionHash.slice(0, 10)}…{transactionHash.slice(-8)}
              </a>
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
              {formatBanmao(transferEntry.amount, tokenDecimals)} BANMAO
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
