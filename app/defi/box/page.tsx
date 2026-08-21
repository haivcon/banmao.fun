"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CheckCircle2,
  CalendarClock,
  ChevronDown,
  Clock3,
  ClipboardPaste,
  Copy,
  Gift,
  Eye,
  ExternalLink,
  Info,
  LoaderCircle,
  LockKeyhole,
  Maximize2,
  PackageOpen,
  RefreshCw,
  Search,
  SortDesc,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
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
  BOX_DASHBOARD_COPY,
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
import {
  formatExactTokenAmount,
  formatTokenAmountForDisplay,
  formatTokenAmountInput,
  normalizeTokenAmountInput,
  tokenBalancePercentage,
} from "./amountFormat";
import { tokenExplorerUrl } from "./tokenIdentity";
import { RendererArtworkPreview, type RendererPreviewAsset } from "./RendererArtworkPreview";
import { BanmaoBoxProductMark } from "./BanmaoBoxProductMark";
import "./box.css";

const DURATION_OPTIONS = [1, 3, 7, 14, 30, 60, 90, 180, 365, 730] as const;
const BOXES_PER_PAGE = 6;
const MAX_BATCH_SIZE = 20;

const METADATA_CONFIRM_COPY: Record<BoxLanguage, {
  title: string;
  description: string;
  gasNotice: string;
  cancel: string;
  continue: string;
}> = {
  en: { title: "Refresh NFT imagery?", description: "This sends an on-chain metadata refresh signal so wallets and marketplaces can request artwork from the latest renderer. No assets will be transferred.", gasNotice: "Your wallet will open so you can review and confirm the network gas fee.", cancel: "Cancel", continue: "Continue to wallet" },
  vi: { title: "Làm mới hình ảnh NFT?", description: "Thao tác này gửi tín hiệu làm mới metadata on-chain để ví và marketplace có thể yêu cầu hình ảnh từ renderer mới nhất. Không có tài sản nào được chuyển.", gasNotice: "Ví của bạn sẽ mở để bạn kiểm tra và xác nhận phí gas của mạng.", cancel: "Hủy", continue: "Tiếp tục tới ví" },
  zh: { title: "刷新 NFT 图像？", description: "此操作会发送链上元数据刷新信号，以便钱包和市场从最新渲染器请求图像。不会转移任何资产。", gasNotice: "钱包将打开，供您检查并确认网络 Gas 费用。", cancel: "取消", continue: "继续前往钱包" },
  ko: { title: "NFT 이미지를 새로고침할까요?", description: "지갑과 마켓플레이스가 최신 렌더러에서 이미지를 요청할 수 있도록 온체인 메타데이터 새로고침 신호를 보냅니다. 자산은 전송되지 않습니다.", gasNotice: "네트워크 가스비를 검토하고 확인할 수 있도록 지갑이 열립니다.", cancel: "취소", continue: "지갑으로 계속" },
  ru: { title: "Обновить изображение NFT?", description: "Будет отправлен on-chain сигнал обновления метаданных, чтобы кошельки и маркетплейсы запросили изображение у актуального рендерера. Активы не переводятся.", gasNotice: "Кошелёк откроется для проверки и подтверждения сетевой комиссии gas.", cancel: "Отмена", continue: "Перейти в кошелёк" },
  id: { title: "Segarkan gambar NFT?", description: "Tindakan ini mengirim sinyal penyegaran metadata on-chain agar dompet dan marketplace dapat meminta gambar dari renderer terbaru. Tidak ada aset yang ditransfer.", gasNotice: "Dompet Anda akan terbuka agar Anda dapat meninjau dan mengonfirmasi biaya gas jaringan.", cancel: "Batal", continue: "Lanjutkan ke dompet" },
};

const RECIPIENT_ACTION_COPY: Record<BoxLanguage, {
  clear: string;
  paste: string;
  pasted: string;
  pasteFailed: string;
  livePreview: string;
  pendingToken: string;
  previewBadge: string;
  enlarge: string;
  closePreview: string;
  previewNote: string;
  network: string;
}> = {
  en: { clear: "Clear all", paste: "Paste address", pasted: "Address pasted", pasteFailed: "Unable to read the clipboard", livePreview: "Live NFT preview", pendingToken: "Token ID after mint", previewBadge: "Preview", enlarge: "Enlarge NFT preview", closePreview: "Close NFT preview", previewNote: "Token ID and final timestamps are assigned when minting.", network: "Network" },
  vi: { clear: "Xóa tất cả", paste: "Dán địa chỉ", pasted: "Đã dán địa chỉ", pasteFailed: "Không thể đọc bộ nhớ tạm", livePreview: "Xem trước NFT trực tiếp", pendingToken: "Token ID sau khi mint", previewBadge: "Bản xem trước", enlarge: "Phóng to NFT", closePreview: "Đóng bản xem trước NFT", previewNote: "Token ID và thời gian cuối cùng được xác định khi mint.", network: "Mạng" },
  zh: { clear: "全部清除", paste: "粘贴地址", pasted: "地址已粘贴", pasteFailed: "无法读取剪贴板", livePreview: "NFT 实时预览", pendingToken: "铸造后的 Token ID", previewBadge: "预览", enlarge: "放大 NFT 预览", closePreview: "关闭 NFT 预览", previewNote: "Token ID 和最终时间戳将在铸造时确定。", network: "网络" },
  ko: { clear: "모두 지우기", paste: "주소 붙여넣기", pasted: "주소를 붙여넣었습니다", pasteFailed: "클립보드를 읽을 수 없습니다", livePreview: "NFT 실시간 미리보기", pendingToken: "민팅 후 Token ID", previewBadge: "미리보기", enlarge: "NFT 미리보기 확대", closePreview: "NFT 미리보기 닫기", previewNote: "Token ID와 최종 타임스탬프는 민팅 시 결정됩니다.", network: "네트워크" },
  ru: { clear: "Очистить всё", paste: "Вставить адрес", pasted: "Адрес вставлен", pasteFailed: "Не удалось прочитать буфер обмена", livePreview: "Предпросмотр NFT", pendingToken: "Token ID после минта", previewBadge: "Предпросмотр", enlarge: "Увеличить NFT", closePreview: "Закрыть предпросмотр NFT", previewNote: "Token ID и окончательное время определяются при минте.", network: "Сеть" },
  id: { clear: "Hapus semua", paste: "Tempel alamat", pasted: "Alamat ditempel", pasteFailed: "Tidak dapat membaca clipboard", livePreview: "Pratinjau NFT langsung", pendingToken: "Token ID setelah mint", previewBadge: "Pratinjau", enlarge: "Perbesar pratinjau NFT", closePreview: "Tutup pratinjau NFT", previewNote: "Token ID dan waktu akhir ditentukan saat mint.", network: "Jaringan" },
};

type CreateMode = "single" | "batch" | "basket";
type BoxFilter = "all" | "ready" | "locked";
type BoxSort = "ready" | "newest" | "unlock";
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
  const numeric = formatTokenAmountForDisplay(value, decimals, language);
  return (
    <span className={`box-token-amount ${compact ? "box-token-amount--compact" : ""}`}>
      <span className="box-token-amount__number">{numeric}</span>
      <span className="box-token-amount__symbol">{symbol}</span>
    </span>
  );
}

function GiftBoxArtwork({ ready = false }: { ready?: boolean }) {
  return (
    <div className={`box-art box-art--image ${ready ? "box-art--ready" : ""}`} aria-hidden="true">
      <span className="box-art__glow" />
      <Image
        className="box-art__image"
        src="/defi/banmao_box.webp"
        alt=""
        width={720}
        height={560}
        sizes="(max-width: 820px) 70vw, 420px"
      />
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
  onPreview,
  onCopyAddress,
  onAddressCopied,
  onCopyFailed,
  explorerUrl,
  explorerBaseUrl,
  collectionAddress,
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
  onPreview: (entry: BoxEntry) => void;
  onCopyAddress: (address: string) => Promise<void>;
  onAddressCopied: (label: string) => void;
  onCopyFailed: () => void;
  explorerUrl?: string;
  explorerBaseUrl: string;
  collectionAddress?: Address;
  primaryToken?: Address;
  tokenSymbol: string;
}) {
  const ready =
    entry.canOpen || Number(entry.unlockTime) <= Math.floor(now / 1000);

  return (
    <article className={`box-item ${ready ? "box-item--ready" : ""}`}>
      <div className="box-item__visual">
        {entry.svg ? (
          <button
            type="button"
            className="box-artwork-trigger"
            onClick={() => onPreview(entry)}
            aria-label={`${BOX_DASHBOARD_COPY[language].previewImage}: ${copy.boxNumber} #${entry.tokenId.toString()}`}
          >
            <Image
              className="box-svg box-item__svg"
              src={svgImageDataUri(entry.svg)}
              alt={`${copy.boxNumber} #${entry.tokenId.toString()}`}
              width={600}
              height={600}
              unoptimized
            />
            <span className="box-artwork-trigger__hint" aria-hidden="true"><Maximize2 /></span>
          </button>
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
          <div>
            <span>{copy.boxNumber} #{entry.tokenId.toString()}</span>
            <em
              className={`box-tier box-tier--${getTier(entry.amount, decimals).toLowerCase()}`}
              tabIndex={0}
              title="CLASSIC < 1M · DELUXE ≥ 1M · GOLD ≥ 10M · LEGENDARY ≥ 100M tokens"
              aria-label={`${getTier(entry.amount, decimals)} tier. Classic below 1 million, Deluxe from 1 million, Gold from 10 million, Legendary from 100 million tokens.`}
            >
              {getTier(entry.amount, decimals)}
            </em>
          </div>
          <div className="box-item__utilities">
            <button type="button" disabled={busy} onClick={() => onRefreshMetadata(entry.tokenId)} title={copy.refreshMetadata} aria-label={copy.refreshMetadata}>
              <RefreshCw />
            </button>
            {explorerUrl ? (
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" title={copy.viewExplorer} aria-label={copy.viewExplorer}>
                <ExternalLink />
              </a>
            ) : null}
          </div>
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

        {ready ? (
          <button
            type="button"
            className="box-button box-button--primary box-item__primary"
            disabled={busy}
            onClick={() => onOpen(entry.tokenId)}
          >
            {busy ? <LoaderCircle className="box-spin" /> : <PackageOpen />}
            {copy.open}
          </button>
        ) : (
          <div className="box-item__locked-callout" aria-label={`${copy.remaining}: ${getRemaining(entry.unlockTime, now, copy)}`}>
            <Clock3 />
            <span><small>{copy.remaining}</small><strong className="box-countdown">{getRemaining(entry.unlockTime, now, copy)}</strong></span>
          </div>
        )}

        <details className="box-card-details">
          <summary><ChevronDown aria-hidden="true" /> {BOX_DASHBOARD_COPY[language].detailsAssets}</summary>
          <div className="box-assets">
          <section className="box-nft-details" aria-label={BOX_DASHBOARD_COPY[language].nftDetails}>
            <strong>{BOX_DASHBOARD_COPY[language].nftDetails}</strong>
            <dl className="box-nft-facts">
              <div><dt>{BOX_DASHBOARD_COPY[language].tokenId}</dt><dd>#{entry.tokenId.toString()}</dd></div>
              <div><dt>{BOX_DASHBOARD_COPY[language].tier}</dt><dd>{getTier(entry.amount, decimals)}</dd></div>
              <div><dt>{BOX_DASHBOARD_COPY[language].status}</dt><dd className={ready ? "box-ready-text" : ""}>{ready ? copy.ready : copy.locked}</dd></div>
              <div><dt>{BOX_DASHBOARD_COPY[language].assetCount}</dt><dd>{entry.assets.length.toLocaleString(language)}</dd></div>
              <div><dt>{copy.createdAt}</dt><dd>{formatDate(entry.createdAt, language)}</dd></div>
              <div><dt>{copy.unlocksAt}</dt><dd>{formatDate(entry.unlockTime, language)}</dd></div>
              <div><dt>{BOX_DASHBOARD_COPY[language].lockDuration}</dt><dd>{formatDuration(entry.unlockTime - entry.createdAt, language, copy)}</dd></div>
            </dl>
            <div className="box-nft-addresses">
              {collectionAddress ? (
                <ExplorerValueRow label={BOX_DASHBOARD_COPY[language].collection} value={collectionAddress} kind="address" explorerBaseUrl={explorerBaseUrl} copyLabel={copy.copyCollectionAddress} onCopied={onAddressCopied} onCopyFailed={onCopyFailed} />
              ) : null}
              <ExplorerValueRow label={BOX_DASHBOARD_COPY[language].creator} value={entry.creator} kind="address" explorerBaseUrl={explorerBaseUrl} copyLabel={copy.copyAddress} onCopied={onAddressCopied} onCopyFailed={onCopyFailed} />
            </div>
          </section>
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
                    <span className="box-asset__metadata">
                      <span>{BOX_DASHBOARD_COPY[language].decimals}: {assetDecimals}</span>
                      <a className="box-asset__explorer" href={`${explorerBaseUrl.replace(/\/+$/, "")}/token/${asset.token}`} target="_blank" rel="noopener noreferrer" title={BOX_DASHBOARD_COPY[language].viewAsset} aria-label={`${BOX_DASHBOARD_COPY[language].viewAsset}: ${assetSymbol}`}>
                        <code>{asset.token}</code><ExternalLink aria-hidden="true" />
                      </a>
                      <button className="box-asset__copy" type="button" onClick={() => void onCopyAddress(asset.token)} aria-label={`${copy.copyAddress}: ${asset.token}`} title={copy.copyAddress}>
                        <Copy aria-hidden="true" />
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
  const [isCollectionSheet, setIsCollectionSheet] = useState(false);
  const collectionToggleRef = useRef<HTMLButtonElement | null>(null);
  const collectionDialogRef = useRef<HTMLDivElement | null>(null);
  const collectionInputRef = useRef<HTMLInputElement | null>(null);
  const previousWalletAddressRef = useRef<Address | undefined>(undefined);
  const [collectionLifecycle, setCollectionLifecycle] =
    useState<CollectionLifecycleDetails | null>(null);
  const collectionLifecycleRef = useRef<CollectionLifecycleDetails | null>(null);
  const retryCollectionVerificationRef = useRef<(details: CollectionLifecycleDetails) => void>(() => undefined);
  const collectionRequestRef = useRef(0);
  const verificationRequestRef = useRef<BanmaoBoxVerificationRequest | undefined>(undefined);
  const collectionFixtureToastShownRef = useRef(false);
  const [createMode, setCreateMode] = useState<CreateMode>("single");
  const [createStep, setCreateStep] = useState(1);
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
  const [boxFilter, setBoxFilter] = useState<BoxFilter>("all");
  const [boxSort, setBoxSort] = useState<BoxSort>("ready");
  const [boxSearch, setBoxSearch] = useState("");
  const [previewEntry, setPreviewEntry] = useState<BoxEntry | null>(null);
  const [artworkPreviewOpen, setArtworkPreviewOpen] = useState(false);
  const [metadataRefreshTokenId, setMetadataRefreshTokenId] = useState<bigint | null>(null);
  const previewCloseRef = useRef<HTMLButtonElement | null>(null);
  const artworkPreviewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const artworkPreviewCloseRef = useRef<HTMLButtonElement | null>(null);
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
    approveToken,
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
    approvalHash,
    transactionError,
    isBusy,
  } = useBox(selectedChainId, activeBoxAddress, activeTokenAddress, baseCopy.genericToken, collectionResolving);
  const copy = useMemo(
    () => parameterizeBoxCopy(baseCopy, tokenIdentity.displaySymbol, tokenIdentity.isCanonicalBanmao),
    [baseCopy, tokenIdentity.displaySymbol, tokenIdentity.isCanonicalBanmao],
  );
  const dashboardCopy = BOX_DASHBOARD_COPY[language];
  const recipientActionCopy = RECIPIENT_ACTION_COPY[language];
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

  const boxPortfolio = useMemo(() => {
    const timestamp = Math.floor(now / 1000);
    const ready = boxes.filter(
      (entry) => entry.canOpen || Number(entry.unlockTime) <= timestamp,
    ).length;
    return {
      total: boxes.length,
      ready,
      locked: boxes.length - ready,
      baskets: boxes.filter((entry) => entry.assets.length > 1).length,
    };
  }, [boxes, now]);
  const filteredBoxes = useMemo(() => {
    const timestamp = Math.floor(now / 1000);
    const query = boxSearch.trim().replace(/^#/, "");
    return boxes
      .filter((entry) => {
        const ready = entry.canOpen || Number(entry.unlockTime) <= timestamp;
        const matchesStatus = boxFilter === "all" || (boxFilter === "ready" ? ready : !ready);
        return matchesStatus && (!query || entry.tokenId.toString().includes(query));
      })
      .sort((a, b) => {
        if (boxSort === "newest") return Number(b.createdAt - a.createdAt);
        if (boxSort === "unlock") return Number(a.unlockTime - b.unlockTime);
        const aReady = a.canOpen || Number(a.unlockTime) <= timestamp;
        const bReady = b.canOpen || Number(b.unlockTime) <= timestamp;
        return Number(bReady) - Number(aReady) || Number(a.unlockTime - b.unlockTime);
      });
  }, [boxFilter, boxSearch, boxSort, boxes, now]);
  const pageCount = Math.max(1, Math.ceil(filteredBoxes.length / BOXES_PER_PAGE));
  const visibleBoxes = useMemo(
    () => filteredBoxes.slice(boxPage * BOXES_PER_PAGE, (boxPage + 1) * BOXES_PER_PAGE),
    [boxPage, filteredBoxes],
  );

  useEffect(() => {
    setBoxPage(0);
  }, [boxFilter, boxSearch, boxSort]);

  useEffect(() => {
    setBoxPage((page) => Math.min(page, pageCount - 1));
  }, [pageCount]);

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

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const update = () => setIsCollectionSheet(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!previewEntry) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => previewCloseRef.current?.focus());
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setPreviewEntry(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewEntry]);

  useEffect(() => {
    if (!artworkPreviewOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previewTrigger = artworkPreviewTriggerRef.current;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => artworkPreviewCloseRef.current?.focus());
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setArtworkPreviewOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      window.requestAnimationFrame(() => previewTrigger?.focus());
    };
  }, [artworkPreviewOpen]);

  const closeCollection = useCallback((restoreFocus = true) => {
    if (isBusy || collectionPending) return;
    setCollectionOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => collectionToggleRef.current?.focus());
    }
  }, [collectionPending, isBusy]);

  useEffect(() => {
    if (!collectionOpen || !isCollectionSheet) return;
    const previousOverflow = document.body.style.overflow;
    const background = Array.from(
      document.querySelectorAll<HTMLElement>(".box-page > :not(.box-collection-manager)"),
    );
    const previousInert = background.map((element) => element.inert);
    document.body.style.overflow = "hidden";
    background.forEach((element) => { element.inert = true; });
    window.requestAnimationFrame(() => collectionInputRef.current?.focus());

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !isBusy && !collectionPending) {
        event.preventDefault();
        closeCollection();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = collectionDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((element, index) => { element.inert = previousInert[index]; });
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCollection, collectionOpen, collectionPending, isBusy, isCollectionSheet]);

  useEffect(() => () => verificationRequestRef.current?.cancel(), []);

  useEffect(() => {
    const previousAddress = previousWalletAddressRef.current;
    previousWalletAddressRef.current = address;
    if (address && address !== previousAddress) setRecipient(address);
  }, [address]);

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
        ? approvalHash && !transactionHash
          ? copy.approvalConfirmedCreateIncomplete
          : localizedError
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
          {transactionHash || approvalHash ? (
            <div className="box-toast__actions">
              {transactionHash ? (
                <ExplorerValueRow
                  label={copy.creatorTransactionLabel}
                  value={transactionHash}
                  kind="tx"
                  explorerBaseUrl={explorerBaseUrl}
                  copyLabel={copy.copyTransactionHash}
                  onCopied={(label) => toast.success(copy.copied(label), { duration: 1800 })}
                  onCopyFailed={() => toast.error(copy.copyFailed)}
                />
              ) : null}
              {approvalHash ? (
                <ExplorerValueRow
                  label={copy.approvalTransactionLabel}
                  value={approvalHash}
                  kind="tx"
                  explorerBaseUrl={explorerBaseUrl}
                  copyLabel={copy.copyTransactionHash}
                  onCopied={(label) => toast.success(copy.copied(label), { duration: 1800 })}
                  onCopyFailed={() => toast.error(copy.copyFailed)}
                />
              ) : null}
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
  }, [activeAction, approvalHash, copy, explorerBaseUrl, phase, releaseOutcome, transactionError, transactionHash]);

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

  const pasteAddress = async (onPaste: (value: string) => void) => {
    try {
      const value = (await navigator.clipboard.readText()).trim();
      if (!value) throw new Error("Clipboard is empty");
      onPaste(value);
      setFormError(null);
      toast.success(recipientActionCopy.pasted, { duration: 1800 });
    } catch {
      toast.error(recipientActionCopy.pasteFailed);
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

  const handleApproveToken = async () => {
    const validationError = validateCreate();
    setFormError(validationError);
    if (validationError || !needsApproval) return;
    setActiveAction("Token approval");
    try {
      await approveToken(parsedAmount);
    } catch {
      // The hook exposes a normalized transaction error.
    }
  };

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateCreate();
    setFormError(validationError);
    if (validationError) return;
    setLockAcknowledged(false);
    setCollectionOpen(false);
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
      setCollectionOpen(false);
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
  const isCreateTransaction =
    phase !== "idle" &&
    (activeAction === "BanmaoBox creation" || activeAction === "Batch creation");
  const createProgressSteps = [
    { id: "wallet", label: copy.stepWallet },
    ...(needsApproval || Boolean(approvalHash)
      ? [{ id: "approval", label: copy.approvalTransactionLabel }]
      : []),
    { id: "broadcast", label: copy.stepBroadcast },
    { id: "confirmed", label: copy.stepConfirmed },
  ];
  const createProgressIndex = phase === "success"
    ? createProgressSteps.length - 1
    : transactionHash
      ? createProgressSteps.findIndex((step) => step.id === "broadcast")
      : approvalHash
        ? createProgressSteps.findIndex((step) => step.id === "broadcast")
        : 0;
  const previewAssetCount = createMode === "basket" ? extraAssets.length + 1 : 1;
  const previewBoxCount = createMode === "batch" ? batchRows.length : 1;
  const previewModeLabel = createMode === "batch"
    ? copy.modeBatch
    : createMode === "basket"
      ? copy.modeBasket
      : copy.modeSingle;
  const previewPrimaryAmount = (() => {
    if (createMode !== "batch") return parsedAmount;
    try {
      return batchRows[0]?.amount ? parseUnits(batchRows[0].amount, tokenDecimals) : 0n;
    } catch {
      return 0n;
    }
  })();
  const previewAssets: RendererPreviewAsset[] = [
    {
      token: activeTokenAddress ?? chainConfig.tokenAddress ?? "0x0000000000000000000000000000000000000000",
      amount: previewPrimaryAmount,
      decimals: tokenDecimals,
      symbol: tokenSymbol,
    },
    ...(createMode === "basket" ? extraAssets.map((asset) => {
      let assetAmount = 0n;
      try { assetAmount = asset.amount ? parseUnits(asset.amount, asset.decimals) : 0n; } catch { /* Keep invalid draft amounts at zero. */ }
      return { token: asset.token, amount: assetAmount, decimals: asset.decimals, symbol: asset.symbol };
    }) : []),
  ];
  const previewCreatedAt = Math.floor(now / 1000);
  const previewUnlockTime = previewCreatedAt + Number(durationSeconds ?? 0n);
  const previewTier = getTier(previewPrimaryAmount, tokenDecimals);

  return (
    <main className={`box-page ${collectionOpen && isCollectionSheet ? "box-page--collection-sheet-open" : ""}`}>
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
          <BanmaoBoxProductMark />
          <div className="box-floating-tag box-floating-tag--top">
            <ShieldCheck />
            ERC-721 OWNERSHIP
          </div>
          <div className="box-floating-tag box-floating-tag--bottom">
            <Clock3 />
            1–5 ERC-20 · TIME LOCK
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
          ref={collectionToggleRef}
          type="button"
          className="box-collection-toggle"
          onClick={() => {
            if (collectionOpen) {
              closeCollection(false);
              return;
            }
            if (isBusy && (reviewOpen || transferEntry || celebrationOpen)) return;
            setReviewOpen(false);
            setTransferEntry(null);
            setTransferError(null);
            setCelebrationOpen(false);
            setCollectionOpen(true);
          }}
          aria-expanded={collectionOpen}
          aria-controls="box-collection-manager-body"
        >
          <span className="box-collection-identity">
            <strong><bdi aria-label={tokenIdentity.displaySymbol}>{tokenIdentity.displaySymbol}</bdi></strong>
            <small>{copy.collectionTitle}</small>
          </span>
          <ChevronDown className={collectionOpen ? "box-chevron-open" : ""} />
        </button>
        {collectionOpen ? (
          <div
            className="box-collection-layer is-open"
            onMouseDown={(event) => {
              if (isCollectionSheet && event.target === event.currentTarget) closeCollection();
            }}
          >
          <div
            ref={collectionDialogRef}
            id="box-collection-manager-body"
            className="box-collection-body"
            role={isCollectionSheet ? "dialog" : undefined}
            aria-modal={isCollectionSheet ? true : undefined}
            aria-labelledby="box-collection-title"
          >
            <header className="box-collection-sheet-header">
              <span className="box-collection-identity">
                <strong id="box-collection-title"><bdi aria-label={tokenIdentity.displaySymbol}>{tokenIdentity.displaySymbol}</bdi></strong>
                <small>{copy.collectionTitle}</small>
              </span>
              <button
                type="button"
                className="box-collection-sheet-close"
                onClick={() => closeCollection()}
                disabled={isBusy || collectionPending}
                aria-label={copy.cancel}
              ><X /></button>
            </header>
            <span className="box-collection-hint">{copy.collectionHint}</span>
            <div className="box-collection-controls">
              <div className="box-address-control">
                <input
                  ref={collectionInputRef}
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
                <span className="box-recipient-actions">
                  <button type="button" onClick={() => {
                    collectionRequestRef.current += 1;
                    verificationRequestRef.current?.cancel();
                    setCollectionPending(false);
                    setCollectionError(null);
                    setCollectionToken("");
                  }} disabled={isBusy || !collectionToken} aria-label={recipientActionCopy.clear} title={recipientActionCopy.clear}>
                    <Trash2 />
                  </button>
                  <button type="button" onClick={() => void pasteAddress((value) => {
                    collectionRequestRef.current += 1;
                    verificationRequestRef.current?.cancel();
                    setCollectionPending(false);
                    setCollectionError(null);
                    setCollectionToken(value);
                  })} disabled={isBusy} aria-label={recipientActionCopy.paste} title={recipientActionCopy.paste}>
                    <ClipboardPaste />
                  </button>
                </span>
              </div>
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
      <section className="box-tab-panel box-tab-panel--create" id="box-panel-create" role="tabpanel" aria-labelledby="box-tab-create" tabIndex={0}>
        <div className="box-create-workspace">
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

          <form id="box-create-form" onSubmit={handleCreate} className="box-form">
            <ol className="box-create-stages" aria-label={copy.createDescription}>
              {[copy.amount, copy.recipient, copy.duration, copy.reviewTitle].map((label, index) => (
                <li key={label} className={createStep === index + 1 ? "active" : createStep > index + 1 ? "complete" : ""}>
                  <button type="button" onClick={() => setCreateStep(index + 1)} aria-current={createStep === index + 1 ? "step" : undefined}>
                    <span>{createStep > index + 1 ? <CheckCircle2 /> : index + 1}</span>{label}
                  </button>
                </li>
              ))}
            </ol>
            <div className={`box-wizard-step ${createStep === 1 ? "is-active" : ""}`} aria-hidden={createStep !== 1}>
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
            <div className="box-mode-guide" role="note" aria-live="polite">
              <Info aria-hidden="true" />
              <div>
                <strong>{copy.modeGuideTitle}</strong>
                <span>{createMode === "single" ? copy.modeSingleGuide : createMode === "batch" ? copy.modeBatchGuide : copy.modeBasketGuide}</span>
              </div>
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
                      : `${formatTokenAmountForDisplay(tokenBalance, tokenDecimals, language)} ${tokenSymbol}`}
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
                  value={formatTokenAmountInput(amount, language)}
                  onChange={(event) => {
                    setAmount(normalizeTokenAmountInput(event.target.value, language, tokenDecimals));
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
              <span className="box-quick-amount">
                <span className="box-quick-amount__heading"><strong>{copy.quickAmount}</strong><span>{copy.quickAmountHint}</span></span>
                <span className="box-quick-amount__options">
                  {[25, 50, 75, 100].map((percentage) => (
                    <button
                      type="button"
                      key={percentage}
                      onClick={() => {
                        setAmount(tokenBalancePercentage(tokenBalance, percentage, tokenDecimals));
                        setFormError(null);
                      }}
                      disabled={!isConnected || tokenBalanceLoading || Boolean(tokenBalanceError) || tokenBalance === 0n || isBusy || !isDeployed || !isDeploymentValidated}
                      aria-label={`${copy.quickAmount} ${percentage}%`}
                    >
                      {percentage}%
                    </button>
                  ))}
                </span>
              </span>
            </label> : null}

            {createMode === "basket" ? (
              <div className="box-basket">
                <div className="box-basket__add">
                  <div className="box-address-control">
                    <input
                      value={newAssetToken}
                      onChange={(event) => setNewAssetToken(event.target.value.trim())}
                      placeholder="Additional ERC-20 address"
                      spellCheck={false}
                      disabled={isBusy || extraAssets.length >= 4}
                    />
                    <span className="box-recipient-actions">
                      <button type="button" onClick={() => { setNewAssetToken(""); setFormError(null); }} disabled={isBusy || !newAssetToken} aria-label={recipientActionCopy.clear} title={recipientActionCopy.clear}>
                        <Trash2 />
                      </button>
                      <button type="button" onClick={() => void pasteAddress(setNewAssetToken)} disabled={isBusy || extraAssets.length >= 4} aria-label={recipientActionCopy.paste} title={recipientActionCopy.paste}>
                        <ClipboardPaste />
                      </button>
                    </span>
                  </div>
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
                      <small title={asset.token}>{asset.token.slice(0, 8)}…{asset.token.slice(-6)} · {asset.decimals} decimals · {copy.balance} {formatTokenAmountForDisplay(asset.balance, asset.decimals, language)}</small>
                    </div>
                    <input
                      inputMode="decimal"
                      value={formatTokenAmountInput(asset.amount, language)}
                      placeholder="Amount"
                      onChange={(event) => setExtraAssets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: normalizeTokenAmountInput(event.target.value, language, item.decimals) } : item))}
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
            <div className="box-wizard-actions"><span /><button type="button" className="box-button box-button--primary" onClick={() => setCreateStep(2)}>{copy.next} <ArrowRight /></button></div>
            </div>

            <div className={`box-wizard-step ${createStep === 2 ? "is-active" : ""}`} aria-hidden={createStep !== 2}>
            {createMode === "batch" ? (
              <div className="box-batch">
                <div className="box-batch__summary">
                  <strong>{batchRows.length} / {MAX_BATCH_SIZE} boxes</strong>
                  <span>{copy.reviewTotal}: {formatExactTokenAmount(batchTotal, tokenDecimals, language)} {tokenSymbol}</span>
                </div>
                {batchRows.map((row, index) => (
                  <div className="box-batch__row" key={index}>
                    <span>{index + 1}</span>
                    <div className="box-batch__recipient">
                      <input
                        value={row.recipient}
                        onChange={(event) => setBatchRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, recipient: event.target.value.trim() } : item))}
                        placeholder="Recipient 0x…"
                        aria-label={`Recipient ${index + 1}`}
                        spellCheck={false}
                        disabled={isBusy}
                      />
                      <div className="box-recipient-actions">
                        <button type="button" onClick={() => setBatchRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, recipient: "" } : item))} disabled={isBusy || !row.recipient} aria-label={recipientActionCopy.clear} title={recipientActionCopy.clear}>
                          <Trash2 />
                        </button>
                        <button type="button" onClick={() => void pasteAddress((value) => setBatchRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, recipient: value } : item)))} disabled={isBusy} aria-label={recipientActionCopy.paste} title={recipientActionCopy.paste}>
                          <ClipboardPaste />
                        </button>
                      </div>
                    </div>
                    <input
                      value={formatTokenAmountInput(row.amount, language)}
                      onChange={(event) => setBatchRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, amount: normalizeTokenAmountInput(event.target.value, language, tokenDecimals) } : item))}
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
                      : `${formatTokenAmountForDisplay(tokenBalance, tokenDecimals, language)} ${tokenSymbol}`}.{" "}
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
                  <span className="box-recipient-actions">
                    <button type="button" onClick={() => { setRecipient(""); setFormError(null); }} disabled={isBusy || !recipient} aria-label={recipientActionCopy.clear} title={recipientActionCopy.clear}>
                      <Trash2 />
                    </button>
                    <button type="button" onClick={() => void pasteAddress(setRecipient)} disabled={isBusy || !isDeployed || !isDeploymentValidated} aria-label={recipientActionCopy.paste} title={recipientActionCopy.paste}>
                      <ClipboardPaste />
                    </button>
                  </span>
                </span>
                <small className="box-field__hint">{copy.recipientHint}</small>
              </label>
            )}
            <div className="box-wizard-actions"><button type="button" className="box-button box-button--secondary" onClick={() => setCreateStep(1)}><ArrowLeft /> {copy.previous}</button><button type="button" className="box-button box-button--primary" onClick={() => setCreateStep(3)}>{copy.next} <ArrowRight /></button></div>
            </div>

            <div className={`box-wizard-step ${createStep === 3 ? "is-active" : ""}`} aria-hidden={createStep !== 3}>
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
            <div className="box-wizard-actions"><button type="button" className="box-button box-button--secondary" onClick={() => setCreateStep(2)}><ArrowLeft /> {copy.previous}</button><button type="button" className="box-button box-button--primary" onClick={() => setCreateStep(4)}>{copy.next} <ArrowRight /></button></div>
            </div>

            <div className={`box-wizard-step ${createStep === 4 ? "is-active" : ""}`} aria-hidden={createStep !== 4}>
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

            {isCreateTransaction ? (
              <section
                className={`box-create-progress box-create-progress--${phase}`}
                aria-label={copy.transactionProgressLabel}
                aria-live="polite"
              >
                <div className="box-create-progress__heading">
                  <span className="box-create-progress__icon" aria-hidden="true">
                    {phase === "success" ? <CheckCircle2 /> : phase === "error" ? <X /> : <LoaderCircle className="box-spin" />}
                  </span>
                  <span>
                    <small>{copy.transactionProgressLabel}</small>
                    <strong>{transactionMessage}</strong>
                  </span>
                </div>
                <ol className="box-create-progress__steps">
                  {createProgressSteps.map((step, index) => {
                    const state = phase === "error" && index === createProgressIndex
                      ? "error"
                      : index < createProgressIndex || phase === "success"
                        ? "complete"
                        : index === createProgressIndex
                          ? "active"
                          : "pending";
                    return (
                      <li className={state} key={step.id}>
                        <span aria-hidden="true">{state === "complete" ? <CheckCircle2 /> : index + 1}</span>
                        <small>{step.label}</small>
                      </li>
                    );
                  })}
                </ol>
                {transactionHash || approvalHash ? (
                  <div className="box-create-progress__links">
                    {approvalHash ? (
                      <a href={`${explorerBaseUrl}/tx/${approvalHash}`} target="_blank" rel="noreferrer">
                        {copy.approvalTransactionLabel} <ExternalLink />
                      </a>
                    ) : null}
                    {transactionHash ? (
                      <a href={`${explorerBaseUrl}/tx/${transactionHash}`} target="_blank" rel="noreferrer">
                        {copy.viewTransaction} <ExternalLink />
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {needsApproval ? (
              <button
                type="button"
                className="box-submit box-submit--approve"
                onClick={() => void handleApproveToken()}
                disabled={!isDeployed || !isDeploymentValidated || isBusy}
                aria-describedby={createDisabledReason ? "box-create-disabled-reason" : undefined}
              >
                {isBusy ? <LoaderCircle className="box-spin" /> : <ShieldCheck />}
                {copy.approveToken}
                {!isBusy ? <ArrowRight /> : null}
              </button>
            ) : (
              <button
                type="submit"
                className="box-submit"
                disabled={!isConnected || !isDeployed || !isDeploymentValidated || isBusy}
                aria-describedby={createDisabledReason ? "box-create-disabled-reason" : undefined}
              >
                {isBusy ? <LoaderCircle className="box-spin" /> : <Gift />}
                {isConnected ? copy.createButton : copy.connectToCreate}
                {!isBusy ? <ArrowRight /> : null}
              </button>
            )}
            {createDisabledReason ? (
              <p className="box-submit-reason" id="box-create-disabled-reason" role="status">
                {createDisabledReason}
              </p>
            ) : null}
            <div className="box-wizard-actions box-wizard-actions--final"><button type="button" className="box-button box-button--secondary" onClick={() => setCreateStep(3)} disabled={isBusy}><ArrowLeft /> {copy.previous}</button></div>
            </div>
          </form>
          </article>

          <aside className="box-live-summary" data-create-step={createStep} aria-label={copy.reviewTitle}>
            <div className="box-live-summary__visual box-nft-preview">
              <div className="box-nft-preview__header">
                <span><Sparkles aria-hidden="true" /> {recipientActionCopy.livePreview}</span>
                <button ref={artworkPreviewTriggerRef} type="button" onClick={() => setArtworkPreviewOpen(true)} aria-label={recipientActionCopy.enlarge} title={recipientActionCopy.enlarge}>
                  <Maximize2 aria-hidden="true" />
                </button>
              </div>
              <button type="button" className="box-nft-preview__frame" onClick={() => setArtworkPreviewOpen(true)} aria-label={recipientActionCopy.enlarge}>
                <RendererArtworkPreview
                  assets={previewAssets}
                  creator={address}
                  createdAt={previewCreatedAt}
                  unlockTime={previewUnlockTime}
                  tier={previewTier}
                  batchPosition={createMode === "batch" ? `1 / ${previewBoxCount}` : undefined}
                />
              </button>
              <div className="box-nft-preview__badges" aria-label={`${previewModeLabel}, ${previewTier}`}>
                <span>{recipientActionCopy.previewBadge}</span>
                <span>{previewModeLabel}</span>
                <strong>{previewTier}</strong>
                {createMode === "batch" ? <span>1 / {previewBoxCount}</span> : null}
              </div>
            </div>
            <div className="box-live-summary__content">
              <dl className="box-live-summary__essentials">
                <div className="box-live-summary__recipient-row">
                  <dt>{copy.recipient}</dt>
                  <dd className="box-live-summary__address">
                    {createMode === "batch" ? `${batchRows.length} ${copy.modeBatch}` : isAddress(recipient) ? (
                      <a
                        href={`${explorerBaseUrl.replace(/\/+$/, "")}/address/${recipient}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${copy.viewExplorer}: ${recipient}`}
                      >
                        {recipient}
                      </a>
                    ) : recipient || "—"}
                  </dd>
                </div>
                <div>
                  <dt>{recipientActionCopy.network}</dt>
                  <dd>{chainConfig.chain.name}</dd>
                </div>
                {createMode === "batch" ? (
                  <div className="box-live-summary__batch-total">
                    <dt>{copy.reviewTotal}</dt>
                    <dd>{formatExactTokenAmount(batchTotal, tokenDecimals, language)} {tokenSymbol}</dd>
                  </div>
                ) : null}
              </dl>
            <div className={`box-live-summary__approval ${needsApproval ? "is-needed" : isConnected && parsedAmount > 0n ? "is-ready" : "is-idle"}`}>
              {needsApproval ? <ShieldAlert /> : <ShieldCheck />}
              <span>{needsApproval ? copy.approvalNeeded : isConnected && parsedAmount > 0n ? copy.approvalReady : copy.checking}</span>
            </div>
            {needsApproval ? (
              <button
                type="button"
                className="box-submit box-submit--approve box-live-summary__submit"
                onClick={() => void handleApproveToken()}
                disabled={!isDeployed || !isDeploymentValidated || isBusy}
                aria-describedby={createDisabledReason ? "box-create-disabled-reason" : undefined}
              >
                {isBusy ? <LoaderCircle className="box-spin" /> : <ShieldCheck />}
                {copy.approveToken}
                {!isBusy ? <ArrowRight /> : null}
              </button>
            ) : (
              <button
                type="submit"
                form="box-create-form"
                className="box-submit box-live-summary__submit"
                disabled={!isConnected || !isDeployed || !isDeploymentValidated || isBusy}
                aria-describedby={createDisabledReason ? "box-create-disabled-reason" : undefined}
              >
                {isBusy ? <LoaderCircle className="box-spin" /> : <Gift />}
                {isConnected ? copy.reviewTitle : copy.connectToCreate}
                {!isBusy ? <ArrowRight /> : null}
              </button>
            )}
              <p className="box-live-summary__note"><ShieldCheck /> {copy.safetyText}</p>
            </div>
          </aside>
        </div>
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

          {isConnected && !boxesLoading && !boxesError && boxes.length > 0 ? (
            <div className="box-portfolio-dashboard">
              <dl className="box-portfolio-summary" aria-label={copy.boxesTitle}>
                {([
                  [dashboardCopy.total, boxPortfolio.total, "total"],
                  [dashboardCopy.ready, boxPortfolio.ready, "ready"],
                  [dashboardCopy.locked, boxPortfolio.locked, "locked"],
                  [dashboardCopy.baskets, boxPortfolio.baskets, "basket"],
                ] satisfies Array<[string, number, string]>).map(([label, value, tone]) => (
                  <div className={`box-portfolio-stat box-portfolio-stat--${tone}`} key={String(tone)}>
                    <dt>{label}</dt><dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="box-portfolio-toolbar">
                <div className="box-filter-group" aria-label={copy.boxesTitle}>
                  {(["all", "ready", "locked"] as const).map((filter) => (
                    <button key={filter} type="button" className={boxFilter === filter ? "is-active" : ""} aria-pressed={boxFilter === filter} onClick={() => setBoxFilter(filter)}>
                      {filter === "all" ? dashboardCopy.all : filter === "ready" ? dashboardCopy.ready : dashboardCopy.locked}
                      <span>{filter === "all" ? boxPortfolio.total : filter === "ready" ? boxPortfolio.ready : boxPortfolio.locked}</span>
                    </button>
                  ))}
                </div>
                <label className="box-portfolio-search">
                  <Search aria-hidden="true" />
                  <span className="box-sr-only">{dashboardCopy.search}</span>
                  <input value={boxSearch} onChange={(event) => setBoxSearch(event.target.value)} inputMode="numeric" placeholder={dashboardCopy.search} />
                </label>
                <div className="box-portfolio-sort" role="group" aria-label={dashboardCopy.sortLabel}>
                  {([
                    ["ready", dashboardCopy.sortReady, <PackageOpen key="ready-icon" />],
                    ["newest", dashboardCopy.sortNewest, <SortDesc key="newest-icon" />],
                    ["unlock", dashboardCopy.sortUnlock, <CalendarClock key="unlock-icon" />],
                  ] as const).map(([sort, label, icon]) => (
                    <button
                      key={sort}
                      type="button"
                      className={boxSort === sort ? "is-active" : ""}
                      aria-pressed={boxSort === sort}
                      onClick={() => setBoxSort(sort)}
                    >
                      {icon}<span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

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
          ) : filteredBoxes.length === 0 ? (
            <div className="box-empty box-empty--filtered">
              <Search />
              <strong>{dashboardCopy.noMatches}</strong>
              <button type="button" onClick={() => { setBoxFilter("all"); setBoxSearch(""); }}>
                {dashboardCopy.clearFilters}
              </button>
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
                    onTransfer={(entry) => {
                      setCollectionOpen(false);
                      setReviewOpen(false);
                      setCelebrationOpen(false);
                      setTransferEntry(entry);
                    }}
                    onRefreshMetadata={(tokenId) => {
                      setCollectionOpen(false);
                      setReviewOpen(false);
                      setTransferEntry(null);
                      setMetadataRefreshTokenId(tokenId);
                    }}
                    onPreview={setPreviewEntry}
                    onCopyAddress={(value) => copyToClipboard(value, copy.tokenAddressLabel)}
                    onAddressCopied={(label) => toast.success(copy.copied(label), { duration: 1800 })}
                    onCopyFailed={() => toast.error(copy.copyFailed)}
                    explorerBaseUrl={explorerBaseUrl}
                    collectionAddress={activeBoxAddress ?? chainConfig.boxAddress}
                    explorerUrl={boxNftExplorerUrl(
                      explorerBaseUrl,
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

      {artworkPreviewOpen ? (
        <div className="box-dialog-backdrop box-preview-backdrop box-artwork-viewer-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setArtworkPreviewOpen(false);
        }}>
          <section className="box-preview-dialog box-artwork-viewer" role="dialog" aria-modal="true" aria-labelledby="box-artwork-viewer-title" aria-describedby="box-artwork-viewer-note">
            <header>
              <div>
                <span>{recipientActionCopy.previewBadge}</span>
                <h2 id="box-artwork-viewer-title">{recipientActionCopy.livePreview}</h2>
              </div>
              <button ref={artworkPreviewCloseRef} type="button" onClick={() => setArtworkPreviewOpen(false)} aria-label={recipientActionCopy.closePreview} title={recipientActionCopy.closePreview}>
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="box-artwork-viewer__canvas">
              <RendererArtworkPreview
                assets={previewAssets}
                creator={address}
                createdAt={previewCreatedAt}
                unlockTime={previewUnlockTime}
                tier={previewTier}
                batchPosition={createMode === "batch" ? `1 / ${previewBoxCount}` : undefined}
              />
            </div>
            <div className="box-artwork-viewer__footer">
              <div className="box-nft-preview__badges">
                <span>{previewModeLabel}</span><strong>{previewTier}</strong>
                {createMode === "batch" ? <span>1 / {previewBoxCount}</span> : null}
              </div>
              <p id="box-artwork-viewer-note">{recipientActionCopy.previewNote}</p>
            </div>
          </section>
        </div>
      ) : null}

      {previewEntry?.svg ? (
        <div className="box-dialog-backdrop box-preview-backdrop box-image-preview-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPreviewEntry(null);
        }}>
          <section className="box-preview-dialog box-image-preview" role="dialog" aria-modal="true" aria-labelledby="box-image-preview-title">
            <header>
              <div>
                <span>{BOX_DASHBOARD_COPY[language].previewImage}</span>
                <h2 id="box-image-preview-title">{copy.boxNumber} #{previewEntry.tokenId.toString()}</h2>
              </div>
              <div className="box-image-preview__actions">
                {boxNftExplorerUrl(explorerBaseUrl, activeBoxAddress ?? chainConfig.boxAddress, previewEntry.tokenId) ? (
                  <a href={boxNftExplorerUrl(explorerBaseUrl, activeBoxAddress ?? chainConfig.boxAddress, previewEntry.tokenId)} target="_blank" rel="noopener noreferrer" title={copy.viewExplorer} aria-label={copy.viewExplorer}><ExternalLink /></a>
                ) : null}
                <button ref={previewCloseRef} type="button" onClick={() => setPreviewEntry(null)} title={BOX_DASHBOARD_COPY[language].closePreview} aria-label={BOX_DASHBOARD_COPY[language].closePreview}><X /></button>
              </div>
            </header>
            <div className="box-image-preview__canvas">
              <Image className="box-image-preview__image" src={svgImageDataUri(previewEntry.svg)} alt={`${copy.boxNumber} #${previewEntry.tokenId.toString()}`} width={1200} height={1200} unoptimized priority />
            </div>
          </section>
        </div>
      ) : null}

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

      {metadataRefreshTokenId !== null ? (
        <div
          className="box-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isBusy) setMetadataRefreshTokenId(null);
          }}
        >
          <section className="box-dialog box-metadata-confirm" role="dialog" aria-modal="true" aria-labelledby="box-metadata-confirm-title" aria-describedby="box-metadata-confirm-description">
            <button type="button" className="box-dialog__close" onClick={() => setMetadataRefreshTokenId(null)} disabled={isBusy} aria-label={METADATA_CONFIRM_COPY[language].cancel}>
              <X />
            </button>
            <span className="box-metadata-confirm__icon" aria-hidden="true"><RefreshCw /></span>
            <span className="box-eyebrow">{copy.boxNumber} #{metadataRefreshTokenId.toString()}</span>
            <h2 id="box-metadata-confirm-title">{METADATA_CONFIRM_COPY[language].title}</h2>
            <p id="box-metadata-confirm-description">{METADATA_CONFIRM_COPY[language].description}</p>
            <div className="box-metadata-confirm__notice" role="note">
              <Wallet aria-hidden="true" />
              <span>{METADATA_CONFIRM_COPY[language].gasNotice}</span>
            </div>
            <div className="box-dialog__actions">
              <button type="button" className="box-button box-button--secondary" onClick={() => setMetadataRefreshTokenId(null)} disabled={isBusy}>
                {METADATA_CONFIRM_COPY[language].cancel}
              </button>
              <button
                type="button"
                className="box-button box-button--primary"
                disabled={isBusy}
                onClick={() => {
                  const tokenId = metadataRefreshTokenId;
                  setMetadataRefreshTokenId(null);
                  void refreshMetadata(tokenId);
                }}
              >
                {isBusy ? <LoaderCircle className="box-spin" /> : <Wallet />}
                {METADATA_CONFIRM_COPY[language].continue}
              </button>
            </div>
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
              {needsApproval ? (
                <button type="button" className="box-button box-button--primary" onClick={() => void handleApproveToken()} disabled={isBusy}>
                  {isBusy ? <LoaderCircle className="box-spin" /> : <ShieldCheck />}
                  {copy.approveToken}
                </button>
              ) : (
                <button type="button" className="box-button box-button--primary" onClick={() => void confirmCreate()} disabled={isBusy || !lockAcknowledged}>
                  {isBusy ? <LoaderCircle className="box-spin" /> : <LockKeyhole />}
                  {copy.confirmCreate}
                </button>
              )}
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
            className="box-dialog box-transfer-dialog"
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
                  <span className="box-recipient-actions">
                    <button type="button" onClick={() => { setTransferRecipient(""); setTransferError(null); }} disabled={isBusy || !transferRecipient} aria-label={recipientActionCopy.clear} title={recipientActionCopy.clear}>
                      <Trash2 />
                    </button>
                    <button type="button" onClick={() => void pasteAddress((value) => { setTransferRecipient(value); setTransferError(null); })} disabled={isBusy} aria-label={recipientActionCopy.paste} title={recipientActionCopy.paste}>
                      <ClipboardPaste />
                    </button>
                  </span>
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
