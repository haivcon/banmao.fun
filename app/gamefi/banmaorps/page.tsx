// app/page.tsx
"use client";

import { JSX, isValidElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWatchContractEvent,
  usePublicClient,
} from "wagmi";
import { encodePacked, formatUnits, getAbiItem, isHex, keccak256, parseUnits } from "viem";
import Header from "./components/Header";
import ChoiceCard from "./components/ChoiceCard";
import FloatingSettings, {
  type HistoryLookupState,
  type HistoryLookupResult,
  type UiScale,
} from "./components/FloatingSettings";
import TelegramConnect from "./components/TelegramConnect";
import { IconDocs, IconHourglass, IconTelegram, IconToken, IconX } from "./components/Icons";
import {
  FaChevronDown,
  FaCoins,
  FaEye,
  FaEyeSlash,
  FaHandRock,
  FaSyncAlt,
  FaTrophy,
  FaWallet,
} from "react-icons/fa";
import { langs, type LocaleStrings } from "./lib/i18n";
import { RPS_ABI, ERC20_ABI } from "./lib/abis";
import toast, { Toaster } from "react-hot-toast";
import { DEFAULT_THEME, ThemeKey, isThemeKey } from "./lib/themes";
import {
  TELEGRAM_CONNECTION_STORAGE_KEY,
  TELEGRAM_LEGACY_USERNAME_STORAGE_KEY,
  buildTelegramConnectionKey,
} from "./lib/telegram";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useCommitCache } from "./hooks/useCommitCache";
import { useDeadlineCache } from "./hooks/useDeadlineCache";
import { useNotificationFeedback } from "./hooks/useNotificationFeedback";
import { useForfeitTracking } from "./hooks/useForfeitTracking";
import { useFormState } from "./hooks/useFormState";
import { useRoomHistory } from "./hooks/useRoomHistory";
import { useTelegramReminder } from "./hooks/useTelegramReminder";
import { usePersonalSummaries } from "./hooks/usePersonalSummaries";
import { useAutoPlay } from "./hooks/useAutoPlay";
import { useInfoCache } from "./hooks/useInfoCache";
import { useRoomFiltering } from "./hooks/useRoomFiltering";
import { useShareInvite } from "./hooks/useShareInvite";
import { useScreenshot } from "./hooks/useScreenshot";
import { useRoomData } from "./hooks/useRoomData";
import { useToast } from "./hooks/useToast";
import { useAlertLoop } from "./hooks/useAlertLoop";
import { useSettingsHandlers } from "./hooks/useSettingsHandlers";
import { useButtonFeedback } from "./hooks/useButtonFeedback";
import { copyToClipboard } from "./lib/clipboard";
import PersonalBoardRow from "./components/PersonalBoardRow";
import RoomTableRow from "./components/RoomTableRow";
import GameActionsPanel from "./components/GameActionsPanel";
import TelegramRemindersPanel from "./components/TelegramRemindersPanel";
import StakeInfoSection from "./components/StakeInfoSection";
import RoomsTableSection from "./components/RoomsTableSection";
// PWA components for game page
import PWAInstallBanner from "./components/PWAInstallBanner";
import { ensureHtml2Canvas, Html2CanvasFn as Html2CanvasType } from "./lib/htmlToCanvas";
import {
  Choice,
  LastCommitInfo,
  CommitInfoMap,
  Html2CanvasFn,
  ForfeitRecord,
  MinimalPublicClient,
  VibrateOptions,
  RoomSnapshot,
  RoomWithForfeit,
  UserStatsShape,
  CachedInfoState,
  CachedRoomEntry,
  InfoTableProps,
  InfoRow,
  TelegramReminderMeta,
  HistoryLookupRaw,
  PersonalSummary,
} from "./lib/types";
import {
  roomsEqual, serializeRoomForCache, reviveRoomFromCache, userStatsEqual,
  serializeInfoForCache, reviveInfoFromCache, normalizeForfeitAddress,
  normalizeForfeitPayout, formatShortAddress, newSalt, waitMs, collectErrorMessages,
  isRateLimitError, formatSaltHex, parseSaltHex, commitHash, normalizeRoomId,
  getWinner, formatWholeWithThousands, normalizeStakeInput, formatStakeDisplayFromNumber,
  formatStakeDisplayString, parseStakeValue, prepareStakeForContract,
  formatTokenAmount, formatTokenAmountSigned,
  roomHasRevealedOutcome, resolveForfeitOutcome, determineForfeitViewerResult,
  roomIsFinalized, deriveFinalOutcome, formatTimeLeft, getCancelDetails,
  createForfeitWarning, extractForfeitRecord, fetchLatestForfeitLog,
  // Constants
  STATE, ZERO_ADDR, ZERO_ADDR_LOWER, ZERO_COMMIT, ZERO_BIGINT, MAX_SALT_VALUE,
  RPS, BANMAO, RPC_LOG_RANGE_LIMIT, DEFAULT_LOG_CHUNK, DEFAULT_LOG_ATTEMPTS,
  LOG_CHUNK_SIZE, LOG_MAX_ATTEMPTS, RPS_DEPLOY_BLOCK,
  STEP_PRESETS, DEFAULT_VIBRATION, DEFAULT_SNOOZE_MINUTES, FEEDBACK_COOLDOWN_MS,
  READ_QUERY_BEHAVIOR, BLOCK_REFETCH_THROTTLE_MS, BLOCK_WATCH_POLL_INTERVAL_MS,
  SHARED_REFRESH_INTERVAL_MS, FORFEIT_FETCH_COOLDOWN_MS, FORFEIT_FETCH_DELAY_MS,
  DEFAULT_FORFEIT_LOG_INTERVAL_MS, DEFAULT_FORFEIT_RATE_LIMIT_COOLDOWN_MS,
  FORFEIT_LOG_MIN_INTERVAL_MS, FORFEIT_LOG_RATE_LIMIT_COOLDOWN_MS,
  DEFAULT_COMMIT_WINDOW, MIN_COMMIT_WINDOW, MAX_COMMIT_WINDOW, REVEAL_WINDOW,
  X_HANDLE, UI_SCALE_STORAGE_KEY, THEME_STORAGE_KEY,
  TELEGRAM_NOTIFY_ENDPOINT, GOOGLE_DOCS_URL, TELEGRAM_BOT_USERNAME,
  TELEGRAM_URL, X_URL, ROOMS_CACHE_KEY, INFO_CACHE_KEY,
  EMPTY_STATS, RULE_ACCENTS
} from "./lib/gameUtils";
import { FinalOutcomeVia, FinalOutcome } from "./lib/types";
import InfoTable from "./components/InfoTable";
import {
  parseCommitRecord, loadCommitInfoMap, loadCommitInfos, loadArchivedCommitInfos,
  saveCommitInfoToStorage, saveCommitInfo as saveCommitInfoFn, saveArchivedCommitInfo as saveArchivedCommitInfoFn,
  clearCommitInfoFromStorage, clearCommitInfo as clearCommitInfoFn,
  COMMIT_STORAGE_PREFIX, COMMIT_ARCHIVE_STORAGE_PREFIX,
} from "./lib/commitStorage";
import { availability, prioritizeCachedRooms } from "./lib/roomUtils";
import { formatHistoryLookup } from "./lib/historyLookup";
import {
  loadCommitDeadlineFallbacksFromStorage, persistCommitDeadlineFallbacks,
  loadRevealDeadlineFallbacksFromStorage, persistRevealDeadlineFallbacks,
  COMMIT_DEADLINE_CACHE_KEY, REVEAL_DEADLINE_CACHE_KEY,
} from "./lib/deadlineFallbacks";
import { registerServiceWorker, initInstallPrompt } from "./lib/registerSW";
import { updateThemeColor } from "./lib/themeColor";
import { recordGameVisit } from "../../../lib/gameVisitTracker";
import GameDisabled from "../components/GameDisabled";

/* ===================== CONSTS (Moved to gameUtils) ===================== */
// Constants are imported from ../lib/gameUtils
// formatHistoryLookup is now imported from lib/historyLookup.ts


// Commit storage functions are now imported from lib/commitStorage.ts
// (parseCommitRecord, loadCommitInfoMap, loadCommitInfos, loadArchivedCommitInfos,
// saveCommitInfoToStorage, saveCommitInfo, saveArchivedCommitInfo, 
// clearCommitInfoFromStorage, clearCommitInfo, COMMIT_STORAGE_PREFIX, COMMIT_ARCHIVE_STORAGE_PREFIX)

// ensureHtml2Canvas and copyToClipboard are now imported from lib/htmlToCanvas.ts and lib/clipboard.ts

// Room constants are now imported from lib/roomConstants.ts
import {
  HIST_LIMIT, ROOM_SCAN_LIMIT, MAX_TRACKED_ROOMS,
  ACTIVE_ROOM_TARGET, ACTIVE_ROOM_BACKFILL_SCAN_LIMIT
} from "./lib/roomConstants";
// COMMIT_DEADLINE_CACHE_KEY and REVEAL_DEADLINE_CACHE_KEY are now imported from lib/deadlineFallbacks.ts


// loadJoinedRooms, saveJoinedRooms, addRoomToHistory, loadSeenResultRooms, saveSeenResultRooms
// are now provided by useRoomHistory hook

// prioritizeCachedRooms is now imported from lib/roomUtils.ts

// loadCommitDeadlineFallbacksFromStorage, persistCommitDeadlineFallbacks,
// loadRevealDeadlineFallbacksFromStorage, persistRevealDeadlineFallbacks
// are now imported from lib/deadlineFallbacks.ts

// availability is now imported from lib/roomUtils.ts

// availability is now imported from lib/roomUtils.ts


/* ===================== PAGE ===================== */
export default function Page() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const addressLower = useMemo(() => address?.toLowerCase() ?? null, [address]);
  const publicClient = usePublicClient();

  // i18n
  const [lang, setLang] = useState("en");
  const [theme, setTheme] = useState<ThemeKey>(DEFAULT_THEME);
  const t = (langs[lang as keyof typeof langs] ?? langs.vi) as LocaleStrings;
  const docsLink = t.communityLinkDocsUrl || GOOGLE_DOCS_URL;
  const refreshLabel = t.refreshData ?? "Refresh data";

  const [isGameEnabled, setIsGameEnabled] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsGameEnabled(localStorage.getItem('GAME_RPS_ENABLED') !== 'false');
    }
  }, []);

  if (!isGameEnabled) {
    return <GameDisabled gameName="Rock Paper Scissors" />;
  }

  // ===================== CUSTOM HOOKS =====================
  // Form state hook
  const {
    stakeHuman, roomId, choice, salt, commitDurationInput,
    setStakeHuman, setRoomId, setChoice, setSalt, setCommitDurationInput,
    handleStakeStep, handleRoomIdStep, handleSaltStep, handleCommitDurationStep,
    regenerateSalt,
  } = useFormState();

  // Commit cache hook
  const {
    commitInfoMap, archivedCommitInfoMap,
    saveCommit: saveCommitInfo, archiveCommit: saveArchivedCommitInfo,
    clearCommit: clearCommitInfo, getCommitInfo,
  } = useCommitCache(address);

  // Deadline cache hook
  const {
    commitDeadlinesRef: localCommitDeadlinesRef,
    revealDeadlinesRef: localRevealDeadlinesRef,
    commitDurationsRef,
    rememberCommitDeadline: rememberCommitDeadlineFallback,
    rememberRevealDeadline: rememberRevealDeadlineFallback,
    rememberCommitDuration,
    getCommitDuration: getCommitDurationForRoom,
    clearCommitDeadlines: clearCommitDeadlineFallbacks,
    clearRevealDeadlines: clearRevealDeadlineFallbacks,
  } = useDeadlineCache(DEFAULT_COMMIT_WINDOW);

  // Notification & feedback settings (state managed locally, hook provides functions)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [vibrationMs, setVibrationMs] = useState(DEFAULT_VIBRATION);

  // Notification feedback hook (using only vibrate, playBeep, triggerInteractBeep, provideButtonFeedback)
  const {
    vibrate, playBeep,
    triggerInteractBeep, provideButtonFeedback,
  } = useNotificationFeedback({ notificationsEnabled, vibrationMs });

  // Forfeit tracking hook
  const {
    forfeitResults, forfeitResultsRef,
    updateForfeitResult, fetchForfeitForRoom,
    shouldFetchForfeit, rememberForfeitFetch, hasFetchedForfeit,
  } = useForfeitTracking(publicClient);

  // ===================== COMPATIBILITY WRAPPERS =====================
  // These provide backwards compatibility with legacy code patterns
  // syncCommitDeadlineFallbacks and syncRevealDeadlineFallbacks are no-ops since hook handles persistence
  const syncCommitDeadlineFallbacks = useCallback(() => { }, []);
  const syncRevealDeadlineFallbacks = useCallback(() => { }, []);

  // Legacy setCommitInfoMap wrapper
  const setCommitInfoMap = useCallback(
    (valueOrUpdater: CommitInfoMap | ((prev: CommitInfoMap) => CommitInfoMap)) => {
      if (typeof valueOrUpdater === "function") {
        // Updater function - for cases like setCommitInfoMap(prev => ({ ...prev, [id]: info }))
        // We ignore these since hook manages state internally
        return;
      }
      // Direct value - if empty, this is a clear operation
      if (Object.keys(valueOrUpdater).length === 0) {
        clearCommitInfo();
      }
    },
    [clearCommitInfo]
  );

  const setArchivedCommitInfoMap = useCallback(
    (valueOrUpdater: CommitInfoMap | ((prev: CommitInfoMap) => CommitInfoMap)) => {
      if (typeof valueOrUpdater === "function") {
        return;
      }
      if (Object.keys(valueOrUpdater).length === 0) {
        clearCommitInfo(undefined, { preserveArchive: false });
      }
    },
    [clearCommitInfo]
  );

  // Legacy forfeit refs - these are now provided by useForfeitTracking hook
  // Creating dummy refs for backwards compatibility where direct access is needed
  const fetchedForfeitIdsRef = useRef<Set<number>>(new Set());
  const forfeitFetchMetaRef = useRef<Map<number, { lastAttempt: number; settled: boolean }>>(new Map());

  // Other form state (decimals, stakeStep)
  const [decimals, setDecimals] = useState(18);
  const [stakeStep, setStakeStep] = useState<(typeof STEP_PRESETS)[number]>(STEP_PRESETS[0]);
  const stakeStepLabel = useMemo(
    () => formatWholeWithThousands(String(stakeStep)),
    [stakeStep]
  );
  const roomStep = 1;
  const saltStep = 1;
  const [isClient, setIsClient] = useState(false);

  // memoized forfeit event ABI
  const forfeitEventAbi = useMemo(() => {
    try {
      return getAbiItem({ abi: RPS_ABI, name: "Forfeited" });
    } catch {
      return null;
    }
  }, []);

  // Room history hook - manages joined rooms, seen results, fresh results
  const {
    joinedRooms, seenResultRooms, freshResultRooms,
    setJoinedRooms, setSeenResultRooms, setFreshResultRooms,
    addRoomToHistory, markResultSeen, markResultFresh, clearFreshResult,
  } = useRoomHistory(address);

  const [notificationSnoozeMinutes, setNotificationSnoozeMinutes] = useState(
    DEFAULT_SNOOZE_MINUTES
  );
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);

  // Telegram reminder hook
  const {
    sendReminder: sendTelegramReminder,
  } = useTelegramReminder({ address, isTelegramConnected, lang });
  const [isTelegramPanelCollapsed, setIsTelegramPanelCollapsed] = useState(true);
  const [uiScale, setUiScale] = useState<UiScale>("normal");
  const [isPersonalBoardCollapsed, setIsPersonalBoardCollapsed] = useState(false);
  const [isStakeTableCollapsed, setIsStakeTableCollapsed] = useState(false);
  const [showOnlyActionableRooms, setShowOnlyActionableRooms] = useState(false);
  const [joinSectionHighlight, setJoinSectionHighlight] = useState(false);
  const [historyLookupId, setHistoryLookupId] = useState("");
  const [historyLookupState, setHistoryLookupState] = useState<HistoryLookupState>({ status: "idle" });
  const [nowTs, setNowTs] = useState(() => Math.floor(Date.now() / 1000));
  // forfeitResults now provided by useForfeitTracking hook
  const [cachedRooms, setCachedRooms] = useState<RoomWithForfeit[]>([]);
  const [backfillRoomIds, setBackfillRoomIds] = useState<bigint[]>([]);
  const backfillStateRef = useRef<{
    cursor: number | null;
    running: boolean;
  }>({ cursor: null, running: false });
  const backfillVisitedRef = useRef<Set<number>>(new Set());
  const backfillPendingIdsRef = useRef<Set<number>>(new Set());
  const [cachedInfo, setCachedInfo] = useState<CachedInfoState | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // alertLoopsRef, snoozedRef, notifiedRef now provided by useAlertLoop hook
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const joinSectionRef = useRef<HTMLElement | null>(null);
  const joinInputRef = useRef<HTMLInputElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const deepLinkHandledRef = useRef(false);
  const joinPrefillRef = useRef<string | null>(null);
  const lastBeepRef = useRef(0);
  const lastVibrationRef = useRef(0);
  const lastHistoryLookupRef = useRef<HistoryLookupRaw | null>(null);
  // forfeitResultsRef, forfeitFetchMetaRef, fetchedForfeitIdsRef now provided by useForfeitTracking hook
  const roomsRef = useRef<any[]>([]);
  const stableRoomsRawRef = useRef<any[] | null>(null);
  const stableTrackedRoomIdsRef = useRef<bigint[]>([]);
  const blockRefetchState = useRef<{ timer: ReturnType<typeof setTimeout> | null; last: number }>({
    timer: null,
    last: 0,
  });
  const manualRefreshRef = useRef(false);
  const periodicRefreshRef = useRef(false);

  // Track các phòng tôi vừa tạo: id -> expireAt (now + 15m) để rung/thông báo commit/reveal
  const myCreatedRoomsRef = useRef<Map<number, number>>(new Map());
  // localCommitDeadlinesRef, localRevealDeadlinesRef, commitDurationsRef now provided by useDeadlineCache hook

  const { refreshCommitDeadline, fetchRoomSnapshot } = useRoomData({
    publicClient,
    roomsRef,
    commitDurationsRef,
    callbacks: {
      rememberCommitDeadlineFallback,
      rememberCommitDuration,
    },
  });
  // clearCommitDeadlineFallbacks, clearRevealDeadlineFallbacks now provided by useDeadlineCache hook
  const isInMyCreatedWindow = (id: number) => {
    const exp = myCreatedRoomsRef.current.get(id);
    return !!exp && Math.floor(Date.now() / 1000) < exp;
  };
  const iCareAboutThisRoom = (r: { id: number; creator?: string; opponent?: string }) => {
    if (!address) return false;
    return (
      r.creator === address ||
      r.opponent === address ||
      joinedRooms.includes(r.id) ||
      isInMyCreatedWindow(r.id)
    );
  };

  const enhanceRoomDeadlines = useCallback(
    <T extends {
      id: number;
      creator?: string;
      opponent?: string;
      commitDeadline?: number;
      revealDeadline?: number;
      state?: number;
    }>(room: T): T & {
      commitDeadline: number;
      revealDeadline: number;
    } => {
      let commitDeadline = Number(room.commitDeadline ?? 0);
      if (!Number.isFinite(commitDeadline)) {
        commitDeadline = 0;
      }
      const commitFallback = localCommitDeadlinesRef.current.get(room.id);
      if (commitFallback && commitFallback > 0) {
        const shouldOverride =
          commitFallback > commitDeadline ||
          room.state === 1 ||
          (room.state === 0 && (!room.opponent || room.opponent === ZERO_ADDR));
        if (shouldOverride) {
          commitDeadline = commitFallback;
        }
      }

      let revealDeadline = Number(room.revealDeadline ?? 0);
      if (!Number.isFinite(revealDeadline)) {
        revealDeadline = 0;
      }
      if ((revealDeadline ?? 0) <= 0) {
        const fallback = localRevealDeadlinesRef.current.get(room.id);
        if (fallback && fallback > revealDeadline) {
          revealDeadline = fallback;
        }
      }

      return {
        ...room,
        commitDeadline,
        revealDeadline,
      };
    },
    []
  );

  // getNormalizedVibration, vibrate, playBeep, triggerInteractBeep, provideButtonFeedback
  // now provided by useNotificationFeedback hook

  const isMobile = useMediaQuery("(max-width: 768px)");

  const handleLangChange = useCallback((l: string) => {
    setLang(l);
    if (typeof window !== "undefined") localStorage.setItem("banmao_language", l);
  }, []);

  const handleUiScaleChange = useCallback((value: UiScale) => {
    setUiScale(value);
  }, []);

  useButtonFeedback({ provideButtonFeedback });

  const {
    handleSelectChoice,
    handleNotificationsToggle,
    handleVibrationChange,
    handleTelegramConnected,
  } = useSettingsHandlers({
    address,
    vibrationMs,
    setChoice,
    setNotificationsEnabled,
    setVibrationMs,
    setIsTelegramConnected,
    triggerInteractBeep,
    vibrate,
  });

  // sendTelegramReminder is now provided by useTelegramReminder hook

  const { showToast, pushNotification } = useToast({
    notificationsEnabled,
    playBeep,
  });

  const handleResetSite = useCallback(() => {
    if (typeof window === "undefined") return;
    const confirmMessage = t.resetSiteDataConfirm ?? "Reset local data?";
    if (!window.confirm(confirmMessage)) return;

    const keysToClear: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("banmao_")) keysToClear.push(key);
    }
    keysToClear.forEach((key) => window.localStorage.removeItem(key));

    toast.dismiss();

    setCommitInfoMap({});
    setArchivedCommitInfoMap({});
    setStakeHuman(formatStakeDisplayString("1000") || "1000");
    setRoomId("");
    setChoice(1);
    setSalt(newSalt());
    setCommitDurationInput(String(DEFAULT_COMMIT_WINDOW));
    setJoinedRooms([]);
    setSeenResultRooms([]);
    setFreshResultRooms([]);
    setNotificationsEnabled(true);
    setVibrationMs(DEFAULT_VIBRATION);
    setNotificationSnoozeMinutes(DEFAULT_SNOOZE_MINUTES);
    setIsTelegramConnected(false);
    setLang("en");
    setTheme(DEFAULT_THEME);
    if (typeof document !== "undefined") {
      document.body.dataset.theme = DEFAULT_THEME;
    }

    notifiedRef.current.clear();
    snoozedRef.current.clear();
    myCreatedRoomsRef.current.clear();
    localCommitDeadlinesRef.current.clear();
    localRevealDeadlinesRef.current.clear();
    commitDurationsRef.current.clear();
    clearCommitDeadlineFallbacks();
    clearRevealDeadlineFallbacks();
    alertLoopsRef.current.forEach((intervalId) => window.clearInterval(intervalId));
    alertLoopsRef.current.clear();

    if (address) {
      clearCommitInfo(address);
    }

    showToast("success", t.resetSiteDataSuccess, { skipBeep: true });
    window.setTimeout(() => {
      window.location.reload();
    }, 200);
  }, [
    address,
    showToast,
    t.resetSiteDataConfirm,
    t.resetSiteDataSuccess,
    setCommitInfoMap,
    clearCommitDeadlineFallbacks,
    clearRevealDeadlineFallbacks,
  ]);

  const {
    alertLoopsRef,
    snoozedRef,
    notifiedRef,
    isSnoozed,
    snooze,
    stopAlertLoop,
    startAlertLoop,
  } = useAlertLoop({
    notificationsEnabled,
    notificationSnoozeMinutes,
    vibrationMs,
    vibrate,
    playBeep,
    mainContentRef,
  });

  // init client
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      // Initialize PWA service worker and install prompt
      registerServiceWorker();
      initInstallPrompt();

      // Record game visit for ranking
      recordGameVisit('banmaorps');

      // Adjust viewport for mobile - scale down to fit more content (like DPI 560)
      const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
      const isMobileDevice = window.innerWidth < 768;
      if (viewport && isMobileDevice) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=0.65, maximum-scale=5, user-scalable=yes');
      }

      const timer = window.setInterval(() => {
        setNowTs(Math.floor(Date.now() / 1000));
      }, 1000);
      const storedLang = localStorage.getItem("banmao_language");
      if (storedLang && langs[storedLang as keyof typeof langs]) {
        setLang(storedLang);
      } else {
        // Auto-detect browser language if no stored preference
        const browserLang = navigator.language?.split("-")[0].toLowerCase() || "en";
        const detectedLang = langs[browserLang as keyof typeof langs] ? browserLang : "en";
        setLang(detectedLang);
        // Save detected language to localStorage
        localStorage.setItem("banmao_language", detectedLang);
      }
      const storedNotif = localStorage.getItem("banmao_notify");
      if (storedNotif != null) setNotificationsEnabled(storedNotif === "1");
      const storedVibration = localStorage.getItem("banmao_vibration");
      if (storedVibration) {
        const parsed = Number(storedVibration);
        if (!Number.isNaN(parsed) && parsed >= 0) setVibrationMs(parsed);
      }
      const storedSnooze = localStorage.getItem("banmao_notify_snooze");
      if (storedSnooze) {
        const parsed = Number(storedSnooze);
        if (!Number.isNaN(parsed) && parsed >= 0) setNotificationSnoozeMinutes(parsed);
      }
      const storedUiScale = localStorage.getItem(UI_SCALE_STORAGE_KEY);
      if (
        storedUiScale === "xsmall" ||
        storedUiScale === "small" ||
        storedUiScale === "normal" ||
        storedUiScale === "large" ||
        storedUiScale === "desktop"
      ) {
        setUiScale(storedUiScale as UiScale);
        if (typeof document !== "undefined") {
          document.body.dataset.uiScale = storedUiScale;
        }
        if (typeof document !== "undefined") {
          document.body.dataset.uiScale = storedUiScale;
        }
      } else {
        // Auto-detect mobile for better UX
        const fallbackScale: UiScale = isMobile ? "small" : "normal";
        setUiScale(fallbackScale);
        if (typeof document !== "undefined") {
          document.body.dataset.uiScale = fallbackScale;
        }
      }
      if (typeof document !== "undefined") {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme && isThemeKey(storedTheme)) {
          setTheme(storedTheme);
          document.body.dataset.theme = storedTheme;
        } else {
          document.body.dataset.theme = DEFAULT_THEME;
        }
      }
      return () => {
        window.clearInterval(timer);
        // Restore viewport on unmount
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes');
        }
      };
    }
  }, []);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;

    try {
      const storedRooms = window.localStorage.getItem(ROOMS_CACHE_KEY);
      if (storedRooms) {
        const parsed = JSON.parse(storedRooms);
        if (Array.isArray(parsed)) {
          const revived = parsed
            .map((entry) => reviveRoomFromCache(entry))
            .filter((room): room is RoomWithForfeit => !!room);
          if (revived.length > 0) {
            setCachedRooms(prioritizeCachedRooms(revived));
            const nowSeconds = Math.floor(Date.now() / 1000);
            revived.forEach((room) => {
              const remaining = Number(room.commitDeadline ?? 0) - nowSeconds;
              if (Number.isFinite(remaining) && remaining > 0) {
                rememberCommitDuration(room.id, remaining);
              }
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to restore cached rooms", error);
    }

    try {
      const storedInfo = window.localStorage.getItem(INFO_CACHE_KEY);
      if (storedInfo) {
        const parsedInfo = reviveInfoFromCache(JSON.parse(storedInfo));
        if (parsedInfo) {
          setCachedInfo(parsedInfo);
        }
      }
    } catch (error) {
      console.error("Failed to restore cached info", error);
    }
  }, [isClient, rememberCommitDuration]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.dataset.uiScale = uiScale;
    }
    if (!isClient || typeof window === "undefined") return;
    localStorage.setItem(UI_SCALE_STORAGE_KEY, uiScale);
  }, [uiScale, isClient]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.dataset.theme = theme;
      // Update PWA status bar color to match theme
      updateThemeColor(theme);
    }
    if (!isClient || typeof window === "undefined") return;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, isClient]);

  useEffect(() => {
    if (!isClient || typeof window === "undefined" || !isConnected) return;
    localStorage.setItem("banmao_stake_collapsed", isStakeTableCollapsed ? "1" : "0");
  }, [isStakeTableCollapsed, isClient, isConnected]);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    if (!isConnected) {
      setIsStakeTableCollapsed(false);
      return;
    }
    const storedStakeCollapsed = localStorage.getItem("banmao_stake_collapsed");
    if (storedStakeCollapsed == null) {
      setIsStakeTableCollapsed(false);
    } else {
      setIsStakeTableCollapsed(storedStakeCollapsed === "1");
    }
  }, [isClient, isConnected]);

  useEffect(() => {
    if (!isClient) return;
    const cached = loadCommitDeadlineFallbacksFromStorage();
    if (cached.size === 0) return;
    let changed = false;
    cached.forEach((deadline, roomId) => {
      const current = localCommitDeadlinesRef.current.get(roomId);
      if (current !== deadline) {
        localCommitDeadlinesRef.current.set(roomId, deadline);
        changed = true;
      }
    });
    if (changed) syncCommitDeadlineFallbacks();
  }, [isClient, syncCommitDeadlineFallbacks]);

  useEffect(() => {
    if (!isClient) return;
    const cached = loadRevealDeadlineFallbacksFromStorage();
    if (cached.size === 0) return;
    let changed = false;
    cached.forEach((deadline, roomId) => {
      const current = localRevealDeadlinesRef.current.get(roomId);
      if (current !== deadline) {
        localRevealDeadlinesRef.current.set(roomId, deadline);
        changed = true;
      }
    });
    if (changed) syncRevealDeadlineFallbacks();
  }, [isClient, syncRevealDeadlineFallbacks]);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    localStorage.setItem("banmao_notify_snooze", notificationSnoozeMinutes.toString());
  }, [notificationSnoozeMinutes, isClient]);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    if (!address) {
      setIsTelegramConnected(false);
      return;
    }
    const storageKey = buildTelegramConnectionKey(address);
    const storedFlag = localStorage.getItem(storageKey);
    if (storedFlag === "true") {
      setIsTelegramConnected(true);
      return;
    }
    const legacyHandle = localStorage.getItem(TELEGRAM_LEGACY_USERNAME_STORAGE_KEY);
    if (legacyHandle) {
      setIsTelegramConnected(true);
      localStorage.setItem(storageKey, "true");
      localStorage.removeItem(TELEGRAM_LEGACY_USERNAME_STORAGE_KEY);
      localStorage.removeItem(TELEGRAM_CONNECTION_STORAGE_KEY);
      return;
    }
    const legacyFlag = localStorage.getItem(TELEGRAM_CONNECTION_STORAGE_KEY);
    if (legacyFlag === "true") {
      setIsTelegramConnected(true);
      localStorage.setItem(storageKey, "true");
      localStorage.removeItem(TELEGRAM_CONNECTION_STORAGE_KEY);
      return;
    }
    setIsTelegramConnected(false);
  }, [address, isClient]);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    if (!address) return;
    const storageKey = buildTelegramConnectionKey(address);
    if (isTelegramConnected) {
      localStorage.setItem(storageKey, "true");
    } else {
      localStorage.removeItem(storageKey);
    }
    localStorage.removeItem(TELEGRAM_LEGACY_USERNAME_STORAGE_KEY);
    localStorage.removeItem(TELEGRAM_CONNECTION_STORAGE_KEY);
  }, [address, isClient, isTelegramConnected]);

  useEffect(() => {
    if (!isConnected) {
      setIsTelegramPanelCollapsed(true);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!joinSectionHighlight) return;
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => setJoinSectionHighlight(false), 6000);
    return () => window.clearTimeout(timer);
  }, [joinSectionHighlight]);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    if (deepLinkHandledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get("join");
    if (!joinParam) return;
    deepLinkHandledRef.current = true;
    const sanitized = joinParam.replace(/[^0-9]/g, "");
    const normalized = normalizeRoomId(sanitized);
    if (normalized) {
      joinPrefillRef.current = normalized;
    }
    params.delete("join");
    const search = params.toString();
    const newUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`.replace(/#$/, "");
    window.history.replaceState({}, document.title, newUrl || window.location.pathname);
    if (!normalized) return;
    setRoomId(normalized);
    setJoinSectionHighlight(true);
    const langPack = langs[lang as keyof typeof langs] ?? langs.vi;
    const baseLabel = langPack.roomIdSet ?? "Room ID set: ";
    showToast("success", `${baseLabel}${normalized}`, { skipBeep: true });
    window.setTimeout(() => {
      joinInputRef.current?.focus();
      joinSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  }, [isClient, lang, showToast, setRoomId]);

  // handle account change
  useEffect(() => {
    if (!isClient) return;
    if (!address) {
      setCommitInfoMap({});
      setArchivedCommitInfoMap({});
      setSalt(newSalt());
      setRoomId("");
      setJoinedRooms([]);
      setSeenResultRooms([]);
      setFreshResultRooms([]);
      notifiedRef.current.clear();
      myCreatedRoomsRef.current.clear();
      clearCommitDeadlineFallbacks();
      clearRevealDeadlineFallbacks();
      return;
    }
    const infos = loadCommitInfos(address);
    setCommitInfoMap(infos);
    const archivedInfos = loadArchivedCommitInfos(address);
    setArchivedCommitInfoMap(archivedInfos);
    const entries = Object.values(infos);
    const preferred = entries.length
      ? entries.slice().sort((a, b) => Number(b.roomId) - Number(a.roomId))[0]
      : null;
    const prefilledRoomId = joinPrefillRef.current;
    if (prefilledRoomId) {
      setRoomId(prefilledRoomId);
      joinPrefillRef.current = null;
    } else if (preferred) {
      setRoomId(preferred.roomId);
      setChoice(preferred.choice);
      setSalt(preferred.salt);
      setStakeHuman(formatStakeDisplayString(preferred.stakeHuman) || preferred.stakeHuman);
    } else {
      const storedSalt = localStorage.getItem("banmao_salt") as `0x${string}`;
      setSalt(storedSalt && isHex(storedSalt) ? storedSalt : newSalt());
    }
    // Room history and seen results are now managed by useRoomHistory hook
    setFreshResultRooms([]);
    notifiedRef.current.clear();
    myCreatedRoomsRef.current.clear();
  }, [address, isClient, clearCommitDeadlineFallbacks, clearRevealDeadlineFallbacks, setFreshResultRooms]);

  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem("banmao_salt", salt);
  }, [salt, isClient]);

  // saveSeenResultRooms is now handled by useRoomHistory hook automatically

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    localStorage.setItem("banmao_notify", notificationsEnabled ? "1" : "0");
  }, [notificationsEnabled, isClient]);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    localStorage.setItem("banmao_vibration", String(vibrationMs));
  }, [vibrationMs, isClient]);

  /* ---------- token reads ---------- */
  const { data: dec } = useReadContract({
    address: BANMAO,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled: isClient && !!BANMAO,
      ...READ_QUERY_BEHAVIOR,
    },
  });
  useEffect(() => {
    if (typeof dec === "number") setDecimals(dec);
  }, [dec]);

  const {
    data: allowance,
    refetch: refetchAllowance,
  } = useReadContract({
    address: BANMAO,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address ?? ZERO_ADDR, RPS],
    query: {
      enabled: isClient && !!address && !!RPS,
      ...READ_QUERY_BEHAVIOR,
    },
  });

  const {
    data: balance,
    refetch: refetchBalance,
  } = useReadContract({
    address: BANMAO,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address ?? ZERO_ADDR],
    query: {
      enabled: isClient && !!address,
      ...READ_QUERY_BEHAVIOR,
    },
  });

  /* ---------- room list ---------- */
  const {
    data: nRoom,
    refetch: refetchNextRoomId,
  } = useReadContract({
    address: RPS,
    abi: RPS_ABI,
    functionName: "nextRoomId",
    query: {
      enabled: isClient && !!RPS,
      ...READ_QUERY_BEHAVIOR,
    },
  });

  const latestIds = useMemo(() => {
    const n = Number(nRoom || 0);
    if (!Number.isFinite(n) || n <= 0) return [];

    const start = Math.max(1, n - ROOM_SCAN_LIMIT);
    const count = n - start;
    const ids = Array.from({ length: count }, (_, i) => BigInt(n - i - 1));

    return ids;
  }, [nRoom]);

  const trackedRoomIds = useMemo(() => {
    const ids = new Set<bigint>();
    latestIds.forEach((id) => ids.add(id));

    backfillRoomIds.forEach((id) => ids.add(id));

    joinedRooms.forEach((id) => {
      if (Number.isFinite(id) && id > 0) ids.add(BigInt(id));
    });

    Object.values(commitInfoMap).forEach((info) => {
      const parsed = Number(info.roomId);
      if (Number.isFinite(parsed) && parsed > 0) ids.add(BigInt(parsed));
    });

    seenResultRooms.forEach((id) => {
      if (Number.isFinite(id) && id > 0) ids.add(BigInt(id));
    });

    freshResultRooms.forEach((id) => {
      if (Number.isFinite(id) && id > 0) ids.add(BigInt(id));
    });

    const activeRoomIds = new Set<bigint>();
    cachedRooms.forEach((room) => {
      const roomId = Number(room?.id ?? 0);
      if (!Number.isFinite(roomId) || roomId <= 0) return;
      if (roomIsFinalized(room)) return;
      const normalized = BigInt(roomId);
      activeRoomIds.add(normalized);
      ids.add(normalized);
    });

    const sorted = Array.from(ids).sort((a, b) => (a === b ? 0 : a > b ? -1 : 1));
    if (sorted.length <= MAX_TRACKED_ROOMS) {
      return sorted;
    }

    const prioritized: bigint[] = [];
    const remainder: bigint[] = [];
    sorted.forEach((id) => {
      if (activeRoomIds.has(id)) {
        prioritized.push(id);
      } else {
        remainder.push(id);
      }
    });

    const limit = Math.max(MAX_TRACKED_ROOMS, prioritized.length);
    return prioritized.concat(remainder).slice(0, limit);
  }, [
    latestIds,
    backfillRoomIds,
    joinedRooms,
    commitInfoMap,
    seenResultRooms,
    freshResultRooms,
    cachedRooms,
  ]);

  const roomContracts = useMemo(
    () =>
      trackedRoomIds.map((id) => ({
        address: RPS,
        abi: RPS_ABI,
        functionName: "rooms",
        args: [id],
      })) as any[],
    [trackedRoomIds]
  );

  const {
    data: roomsRaw,
    refetch: refetchRooms,
  } = useReadContracts({
    contracts: roomContracts as any,
    query: {
      enabled: roomContracts.length > 0 && isClient,
      ...READ_QUERY_BEHAVIOR,
    },
  } as any);

  const runSharedRefetches = useCallback(() => {
    const tasks: Promise<unknown>[] = [];
    if (refetchAllowance) tasks.push(refetchAllowance());
    if (refetchNextRoomId) tasks.push(refetchNextRoomId());
    if (refetchRooms) tasks.push(refetchRooms());
    if (refetchBalance) tasks.push(refetchBalance());
    if (tasks.length === 0) return Promise.resolve();
    return Promise.allSettled(tasks).then(() => undefined);
  }, [refetchAllowance, refetchBalance, refetchNextRoomId, refetchRooms]);

  const scheduleSharedRefetch = useCallback(() => {
    const state = blockRefetchState.current;
    const now = Date.now();
    const elapsed = now - state.last;
    if (elapsed >= BLOCK_REFETCH_THROTTLE_MS) {
      state.last = now;
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
      void runSharedRefetches();
      return;
    }
    if (state.timer) return;
    const delay = BLOCK_REFETCH_THROTTLE_MS - elapsed;
    state.timer = setTimeout(() => {
      state.timer = null;
      state.last = Date.now();
      void runSharedRefetches();
    }, delay);
  }, [runSharedRefetches]);

  const handleManualRefresh = useCallback(async () => {
    if (manualRefreshRef.current) return;
    manualRefreshRef.current = true;
    setIsRefreshing(true);
    try {
      await runSharedRefetches();
    } catch (error) {
      console.error("Manual refresh failed", error);
    } finally {
      manualRefreshRef.current = false;
      setIsRefreshing(false);
    }
  }, [runSharedRefetches]);

  useEffect(() => {
    if (!isClient) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled || periodicRefreshRef.current) return;
      periodicRefreshRef.current = true;
      try {
        await runSharedRefetches();
      } catch (error) {
        console.error("Periodic refresh failed", error);
      } finally {
        periodicRefreshRef.current = false;
      }
    };

    void tick();
    const intervalId = window.setInterval(tick, SHARED_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      periodicRefreshRef.current = false;
    };
  }, [isClient, runSharedRefetches]);

  const hasFreshRooms = useMemo(
    () => Array.isArray(roomsRaw) && roomsRaw.some((entry) => entry?.result != null),
    [roomsRaw]
  );

  useEffect(() => {
    if (hasFreshRooms) {
      stableRoomsRawRef.current = roomsRaw ?? null;
      stableTrackedRoomIdsRef.current = trackedRoomIds;
    } else if (trackedRoomIds.length === 0) {
      stableRoomsRawRef.current = [];
      stableTrackedRoomIdsRef.current = [];
    }
  }, [hasFreshRooms, roomsRaw, trackedRoomIds]);

  useEffect(() => {
    if (!isClient) return;
    if (roomContracts.length === 0) return;
    scheduleSharedRefetch();
  }, [isClient, roomContracts, scheduleSharedRefetch]);

  const rooms = useMemo<RoomWithForfeit[]>(() => {
    const rawList = (hasFreshRooms ? roomsRaw : stableRoomsRawRef.current) ?? [];
    const idList = (hasFreshRooms ? trackedRoomIds : stableTrackedRoomIdsRef.current) ?? [];
    if (!rawList.length || idList.length === 0) {
      return cachedRooms;
    }
    const parsed = rawList
      .map((r, i) => {
        if (!r?.result) return null;
        const idSource = idList[i];
        const id = Number(idSource);
        if (!Number.isFinite(id) || id <= 0) return null;
        const rr: any = r.result;
        const normalizedId = Number.isFinite(id) && id > 0 ? id : NaN;
        return {
          id,
          creator: rr[0] as `0x${string}`,
          opponent: rr[1] as `0x${string}`,
          stake: rr[2] as bigint,
          commitA: rr[3] as `0x${string}`,
          commitB: rr[4] as `0x${string}`,
          revealA: Number(rr[5] ?? rr.revealA ?? 0),
          revealB: Number(rr[6] ?? rr.revealB ?? 0),
          commitDeadline: Number(rr[7] ?? rr.commitDeadline ?? 0),
          revealDeadline: Number(rr[8] ?? rr.revealDeadline ?? 0),
          state: Number(rr[9] ?? rr.state ?? 0),
          forfeit:
            Number.isFinite(normalizedId) && normalizedId > 0
              ? forfeitResults[normalizedId] ?? null
              : null,
        };
      })
      .filter((room): room is NonNullable<typeof room> => {
        if (!room) return false;
        const roomId = Number(room.id ?? 0);
        if (!Number.isFinite(roomId) || roomId <= 0) {
          return false;
        }
        const creator = room.creator?.toLowerCase?.();
        const opponent = room.opponent?.toLowerCase?.();
        const stakeValue = room.stake ?? ZERO_BIGINT;
        const commitAZero = !room.commitA || room.commitA === ZERO_COMMIT;
        const commitBZero = !room.commitB || room.commitB === ZERO_COMMIT;
        const revealsZero = Number(room.revealA ?? 0) === 0 && Number(room.revealB ?? 0) === 0;
        const zeroAddrLower = ZERO_ADDR.toLowerCase();
        if (
          Number.isFinite(room.commitDeadline) &&
          (room.commitDeadline ?? 0) > 0 &&
          !commitDurationsRef.current.has(roomId)
        ) {
          const nowSec = Math.floor(Date.now() / 1000);
          const remaining = Math.floor(Number(room.commitDeadline) - nowSec);
          if (remaining > 0) {
            rememberCommitDuration(roomId, remaining);
          }
        }
        const isEmptyRoom =
          (!creator || creator === zeroAddrLower) &&
          (!opponent || opponent === zeroAddrLower) &&
          stakeValue === ZERO_BIGINT &&
          commitAZero &&
          commitBZero &&
          revealsZero &&
          (room.state ?? 0) === 0;
        return !isEmptyRoom;
      }) as RoomWithForfeit[];

    const mergedMap = new Map<number, RoomWithForfeit>();
    parsed.forEach((room) => {
      const key = Number(room.id ?? 0);
      if (!Number.isFinite(key) || key <= 0) return;
      mergedMap.set(key, room);
    });

    cachedRooms.forEach((room) => {
      const key = Number(room?.id ?? 0);
      if (!Number.isFinite(key) || key <= 0) return;
      if (mergedMap.has(key)) return;
      if (roomIsFinalized(room)) return;
      mergedMap.set(key, room);
    });

    return Array.from(mergedMap.values()).sort((a, b) => {
      const left = Number(a.id ?? 0);
      const right = Number(b.id ?? 0);
      if (!Number.isFinite(left) && !Number.isFinite(right)) return 0;
      if (!Number.isFinite(left)) return 1;
      if (!Number.isFinite(right)) return -1;
      if (left === right) return 0;
      return left > right ? -1 : 1;
    });
  }, [
    hasFreshRooms,
    roomsRaw,
    trackedRoomIds,
    forfeitResults,
    rememberCommitDuration,
    cachedRooms,
  ]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    if (backfillPendingIdsRef.current.size === 0) return;
    const activeIds = new Set<string>();
    const finalizedIds = new Set<string>();
    rooms.forEach((room) => {
      if (!room) return;
      const key = normalizeRoomId(room.id);
      if (key === "") return;
      if (roomIsFinalized(room)) {
        finalizedIds.add(key);
      } else {
        activeIds.add(key);
      }
    });

    const pending = backfillPendingIdsRef.current;
    pending.forEach((id) => {
      const key = normalizeRoomId(id);
      if (key === "") {
        pending.delete(id);
        return;
      }
      if (activeIds.has(key) || finalizedIds.has(key)) {
        pending.delete(id);
      }
    });
  }, [rooms]);

  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    if (rooms.length === 0) return;
    const normalized = prioritizeCachedRooms(rooms);
    if (roomsEqual(cachedRooms, normalized)) return;
    setCachedRooms(normalized);
    try {
      const payload = normalized.map((room) => serializeRoomForCache(room));
      window.localStorage.setItem(ROOMS_CACHE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to cache rooms", error);
    }
  }, [rooms, isClient, cachedRooms]);

  useEffect(() => {
    if (!publicClient || !forfeitEventAbi) return;
    const pendingIds = trackedRoomIds
      .map((id) => Number(id))
      .filter((id) => {
        if (!Number.isFinite(id) || id <= 0) return false;
        if (fetchedForfeitIdsRef.current.has(id)) return false;
        if (forfeitResultsRef.current[id]) return false;
        return true;
      });
    if (pendingIds.length === 0) return;

    const now = Date.now();
    const eligibleIds = pendingIds.filter((id) => {
      const meta = forfeitFetchMetaRef.current.get(id);
      if (!meta) return true;
      if (meta.settled) return false;
      return now - meta.lastAttempt >= FORFEIT_FETCH_COOLDOWN_MS;
    });
    if (eligibleIds.length === 0) return;

    let cancelled = false;

    (async () => {
      let latestBlockNumber: bigint | null = null;
      try {
        latestBlockNumber = await publicClient.getBlockNumber();
      } catch (error) {
        console.error(error);
      }

      for (const id of eligibleIds) {
        try {
          rememberForfeitFetch(id, false);
          const latestLog = await fetchLatestForfeitLog({
            publicClient,
            event: forfeitEventAbi as any,
            roomId: id,
            latestBlock: latestBlockNumber,
          });
          if (cancelled) return;
          const record = extractForfeitRecord(latestLog);
          if (record) {
            updateForfeitResult(id, record);
            fetchedForfeitIdsRef.current.add(id);
          } else {
            rememberForfeitFetch(id, false);
          }
        } catch (error) {
          console.error(error);
          rememberForfeitFetch(id, false);
        }

        if (FORFEIT_FETCH_DELAY_MS > 0) {
          await new Promise((resolve) => setTimeout(resolve, FORFEIT_FETCH_DELAY_MS));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, trackedRoomIds, forfeitEventAbi, updateForfeitResult, rememberForfeitFetch]);

  useEffect(() => {
    if (!publicClient) return;
    const totalRooms = Number(nRoom ?? 0);
    if (!Number.isFinite(totalRooms) || totalRooms <= 0) return;

    const target = Math.min(MAX_TRACKED_ROOMS, ACTIVE_ROOM_TARGET);
    if (target <= 0) return;

    const activeRooms = rooms.filter((room) => !roomIsFinalized(room));
    const activeCount = activeRooms.length;
    const pendingCount = backfillPendingIdsRef.current.size;

    if (activeCount + pendingCount >= target) {
      if (activeRooms.length === 0) {
        backfillStateRef.current.cursor = null;
      }
      return;
    }

    if (backfillStateRef.current.running) return;

    const visited = backfillVisitedRef.current;
    let cursor = backfillStateRef.current.cursor;

    if (!Number.isFinite(cursor)) {
      if (trackedRoomIds.length > 0) {
        cursor = Number(trackedRoomIds[trackedRoomIds.length - 1]);
      } else {
        cursor = totalRooms;
      }
    }

    if (!Number.isFinite(cursor)) {
      cursor = totalRooms;
    }

    let startCursor = Math.min(Number(cursor), totalRooms);
    if (!Number.isFinite(startCursor)) {
      startCursor = totalRooms;
    }

    if (startCursor <= 1) return;

    backfillStateRef.current.running = true;

    (async () => {
      const foundSnapshots: RoomSnapshot[] = [];
      let attempts = 0;
      let nextCursor = startCursor - 1;

      while (
        nextCursor >= 1 &&
        attempts < ACTIVE_ROOM_BACKFILL_SCAN_LIMIT &&
        foundSnapshots.length + activeCount + pendingCount < target
      ) {
        if (visited.has(nextCursor)) {
          nextCursor -= 1;
          attempts += 1;
          continue;
        }

        visited.add(nextCursor);
        attempts += 1;

        try {
          const snapshot = await fetchRoomSnapshot(nextCursor);
          if (snapshot && !roomIsFinalized(snapshot)) {
            foundSnapshots.push(snapshot);
          }
        } catch (error) {
          console.error("Failed to inspect older room", error);
        }

        nextCursor -= 1;
      }

      backfillStateRef.current.cursor = nextCursor;

      if (foundSnapshots.length === 0) {
        return;
      }

      foundSnapshots.forEach((snapshot) => {
        backfillPendingIdsRef.current.add(snapshot.id);
      });

      setBackfillRoomIds((prev) => {
        if (foundSnapshots.length === 0) return prev;
        const merged = new Set(prev);
        foundSnapshots.forEach((snapshot) => {
          merged.add(BigInt(snapshot.id));
        });
        const sorted = Array.from(merged).sort((a, b) => (a === b ? 0 : a > b ? -1 : 1));
        return sorted.slice(0, MAX_TRACKED_ROOMS);
      });

      setCachedRooms((prev) => {
        const map = new Map<number, RoomWithForfeit>();
        prev.forEach((room) => {
          const id = Number(room.id ?? 0);
          if (Number.isFinite(id) && id > 0) {
            map.set(id, room);
          }
        });

        foundSnapshots.forEach((snapshot) => {
          map.set(snapshot.id, { ...snapshot, forfeit: null });
        });

        const merged = Array.from(map.values());
        const next = prioritizeCachedRooms(merged);
        if (roomsEqual(prev, next)) {
          return prev;
        }
        return next;
      });
    })()
      .catch((error) => {
        console.error("Active room backfill failed", error);
      })
      .finally(() => {
        backfillStateRef.current.running = false;
      });
  }, [
    publicClient,
    nRoom,
    rooms,
    trackedRoomIds,
    fetchRoomSnapshot,
  ]);

  useEffect(() => {
    if (backfillRoomIds.length === 0) return;
    const activeSet = new Set<string>();
    rooms.forEach((room) => {
      const key = normalizeRoomId(room.id);
      if (key === "") return;
      if (!roomIsFinalized(room)) {
        activeSet.add(key);
      }
    });

    setBackfillRoomIds((prev) => {
      if (prev.length === 0) return prev;
      const filtered = prev.filter((id) => {
        const key = normalizeRoomId(id);
        return key !== "" && activeSet.has(key);
      });
      if (filtered.length === prev.length) return prev;
      return filtered;
    });
  }, [rooms, backfillRoomIds.length]);


  const { personalRooms, visibleRooms, roomMeta } = useRoomFiltering({
    rooms,
    addressLower,
    enhanceRoomDeadlines,
    nowTs,
  });

  useEffect(() => {
    if (!isClient) return;
    if (!rooms || rooms.length === 0) return;
    const nowSec = Math.floor(Date.now() / 1000);
    let commitNeedsSync = false;
    let revealNeedsSync = false;

    rooms.forEach((room) => {
      const id = Number(room.id);
      if (!Number.isFinite(id) || id < 0) return;
      const stateNum = Number(room.state ?? 0);
      const commitDeadline = Number(room.commitDeadline ?? 0);
      const revealDeadline = Number(room.revealDeadline ?? 0);

      if (commitDeadline > 0) {
        rememberCommitDeadlineFallback(id, commitDeadline);
      }

      if (stateNum === 2) {
        if (revealDeadline > 0) {
          rememberRevealDeadlineFallback(id, revealDeadline);
        } else {
          const current = localRevealDeadlinesRef.current.get(id) ?? 0;
          if (current <= nowSec) {
            rememberRevealDeadlineFallback(id, nowSec + REVEAL_WINDOW);
          }
        }
      } else if (localRevealDeadlinesRef.current.has(id)) {
        localRevealDeadlinesRef.current.delete(id);
        revealNeedsSync = true;
      }

      if (stateNum >= 3 || stateNum === 4) {
        if (localCommitDeadlinesRef.current.delete(id)) commitNeedsSync = true;
        if (localRevealDeadlinesRef.current.delete(id)) revealNeedsSync = true;
      }
    });

    if (commitNeedsSync) syncCommitDeadlineFallbacks();
    if (revealNeedsSync) syncRevealDeadlineFallbacks();
  }, [
    rooms,
    isClient,
    rememberCommitDeadlineFallback,
    rememberRevealDeadlineFallback,
    syncCommitDeadlineFallbacks,
    syncRevealDeadlineFallbacks,
  ]);

  useEffect(() => {
    if (!addressLower) return;
    const finishedIds = personalRooms.filter((room) => roomIsFinalized(room)).map((room) => room.id);
    if (finishedIds.length === 0) {
      if (freshResultRooms.length > 0) setFreshResultRooms([]);
      return;
    }

    setSeenResultRooms((prev) => {
      const prevSet = new Set(prev);
      let changed = false;
      const next = [...prev];
      finishedIds.forEach((id) => {
        if (!prevSet.has(id)) {
          prevSet.add(id);
          next.push(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    setFreshResultRooms((prev) => {
      const finishedSet = new Set(finishedIds);
      const next = prev.filter((id) => finishedSet.has(id));
      let changed = next.length !== prev.length;
      const seenSet = new Set(seenResultRooms);
      finishedIds.forEach((id) => {
        if (!seenSet.has(id) && !next.includes(id)) {
          next.push(id);
          changed = true;
        }
      });
      if (changed) next.sort((a, b) => b - a);
      return changed ? next : prev;
    });
  }, [personalRooms, addressLower, seenResultRooms]);

  // Cleanup local cache khi phòng kết thúc/huỷ
  useEffect(() => {
    if (!isClient || !address || rooms.length === 0) return;
    const toRemove: string[] = [];
    const nextMap: CommitInfoMap = { ...commitInfoMap };
    Object.values(commitInfoMap).forEach((info) => {
      const room = rooms.find((r) => r.id === Number(info.roomId));
      if (room && (roomIsFinalized(room) || room.state === 4)) {
        delete nextMap[info.roomId];
        toRemove.push(info.roomId);
      }
    });
    if (toRemove.length > 0) {
      setCommitInfoMap(nextMap);
      if (address) {
        toRemove.forEach((rid) => clearCommitInfo(rid, { preserveArchive: true }));
      }
      if (toRemove.includes(roomId)) {
        const fallback = Object.values(nextMap)
          .slice()
          .sort((a, b) => Number(b.roomId) - Number(a.roomId))[0];
        if (fallback) {
          setRoomId(fallback.roomId);
          setChoice(fallback.choice);
          setSalt(fallback.salt);
          setStakeHuman(formatStakeDisplayString(fallback.stakeHuman) || fallback.stakeHuman);
        } else {
          setRoomId("");
          setSalt(newSalt());
        }
      }
    }
  }, [rooms, address, isClient, commitInfoMap, roomId]);

  /* ---------- REFRESH WHEN NEW BLOCK ARRIVES ---------- */
  useEffect(() => {
    if (!isClient || !publicClient) return;
    const unwatch = publicClient.watchBlocks({
      onBlock: () => {
        scheduleSharedRefetch();
      },
      pollingInterval: BLOCK_WATCH_POLL_INTERVAL_MS,
    });
    return () => {
      const state = blockRefetchState.current;
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
      try {
        unwatch?.();
      } catch {
        // no-op
      }
    };
  }, [isClient, publicClient, scheduleSharedRefetch]);

  /* ---------- writes (đợi tx mined) ---------- */
  const { writeContractAsync } = useWriteContract();

  const writeContract = useCallback(
    (config: any) => writeContractAsync(config as any),
    [writeContractAsync]
  );

  async function afterTx() {
    await runSharedRefetches();
  }

  async function doApprove() {
    playBeep(true);
    try {
      if (!publicClient) {
        showToast("error", "RPC not ready", { skipBeep: true });
        return;
      }
      const amt = parseUnits(prepareStakeForContract(stakeHuman), decimals);
      const hash = await writeContract({
        address: BANMAO,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [RPS, amt],
      });
      showToast("loading", "Pending...", { id: "tx", title: "Pending", force: true });
      await publicClient.waitForTransactionReceipt({ hash });
      toast.dismiss("tx");
      showToast("success", t.toastApproveOk, { skipBeep: true });
      await afterTx();
    } catch (e: any) {
      toast.dismiss("tx");
      showToast("error", e?.shortMessage || "Approve failed", { skipBeep: true });
    }
  }

  async function createRoom() {
    playBeep(true);
    try {
      if (!publicClient) {
        showToast("error", "RPC not ready", { skipBeep: true });
        return;
      }
      const amt = parseUnits(prepareStakeForContract(stakeHuman), decimals);
      const durationRaw = commitDurationInput.trim();
      if (!durationRaw || !/^\d+$/.test(durationRaw)) {
        showToast("error", t.commitDurationInvalid, { skipBeep: true });
        return;
      }
      const durationValue = Number(durationRaw);
      if (!Number.isFinite(durationValue) || durationValue <= 0) {
        showToast("error", t.commitDurationInvalid, { skipBeep: true });
        return;
      }
      const normalizedDuration = Math.floor(durationValue);
      if (normalizedDuration < MIN_COMMIT_WINDOW || normalizedDuration > MAX_COMMIT_WINDOW) {
        showToast("error", t.commitDurationRange, { skipBeep: true });
        return;
      }
      const commitDurationArg = BigInt(normalizedDuration);

      // (A) Lấy nextRoomId trước khi tạo — đề phòng fallback
      const nextBefore = await publicClient
        .readContract({
          address: RPS,
          abi: RPS_ABI,
          functionName: "nextRoomId",
          args: [],
        } as any)
        .catch(() => null);

      const hash = await writeContract({
        address: RPS,
        abi: RPS_ABI,
        functionName: "createRoom",
        args: [amt, commitDurationArg],
      });

      showToast("loading", "Pending...", { id: "tx", title: "Pending", force: true });
      await publicClient.waitForTransactionReceipt({ hash });
      toast.dismiss("tx");
      showToast("success", t.toastCreateOk, { skipBeep: true });

      // (B) Sau khi mined, đọc nextRoomId hiện tại
      const curNext = await publicClient
        .readContract({
          address: RPS,
          abi: RPS_ABI,
          functionName: "nextRoomId",
          args: [],
        } as any)
        .catch(() => null);

      // Tính roomId mới tạo
      let newRoomId: number | null = null;
      if (typeof curNext === "bigint") {
        const v = Number(curNext);
        if (!Number.isNaN(v) && v > 0) newRoomId = v - 1;
      } else if (typeof nextBefore === "bigint") {
        const v = Number(nextBefore);
        if (!Number.isNaN(v) && v > 0) newRoomId = v;
      }

      // (C) Lưu lịch sử cho creator + mở cửa sổ 15’
      if (address && newRoomId != null) {
        const next = addRoomToHistory(newRoomId);
        setJoinedRooms(next);
        const nowSec = Math.floor(Date.now() / 1000);
        const expireAt = nowSec + 15 * 60;
        myCreatedRoomsRef.current.set(newRoomId, expireAt);
        rememberCommitDuration(newRoomId, normalizedDuration);
        void refreshCommitDeadline(newRoomId);
        setRoomId(String(newRoomId));
      }

      await afterTx();
    } catch (e: any) {
      toast.dismiss("tx");
      showToast("error", e?.shortMessage || "Create failed", { skipBeep: true });
    }
  }

  const promptJoinConfirmation = useCallback(
    async (details: { readable: string; seconds: number; stakeLabel: string }) => {
      const secondsClamped = Math.max(0, Math.round(details.seconds));
      return new Promise<boolean>((resolve) => {
        let settled = false;
        let toastId: string | undefined;
        const dismiss = (result: boolean, id?: string) => {
          if (settled) return;
          settled = true;
          resolve(result);
          toast.dismiss(id ?? toastId);
        };

        toastId = toast.custom((tt) => {
          const id = tt?.id ?? toastId;
          return (
            <div className="toast-card toast-card--alert toast-card--join-confirm">
              <button
                className="toast-close"
                aria-label="Close notification"
                onClick={() => dismiss(false, id)}
              >
                ×
              </button>
              <div className="toast-join__header">
                <span className="toast-card__icon toast-join__icon" aria-hidden="true">
                  <IconHourglass />
                </span>
                <div className="toast-join__copy">
                  <strong>{t.joinConfirmTitle}</strong>
                  <span>{t.joinConfirmDescription}</span>
                </div>
              </div>
              <div className="toast-join__details">
                <div className="toast-join__details-item">
                  <span className="toast-join__label">{t.joinConfirmTimeLabel}</span>
                  <span className="toast-join__value">{details.readable}</span>
                  <span className="toast-join__hint">{t.joinConfirmTimeHint(secondsClamped)}</span>
                </div>
                <div className="toast-join__details-item">
                  <span className="toast-join__label">{t.joinConfirmStakeLabel}</span>
                  <span className="toast-join__value toast-join__value--stake">
                    <IconToken className="toast-join__value-icon" aria-hidden="true" />
                    {details.stakeLabel}
                  </span>
                </div>
              </div>
              <div className="toast-actions toast-join__actions">
                <button className="table-action-button" onClick={() => dismiss(true, id)}>
                  {t.joinConfirmProceed}
                </button>
                <button className="table-action-button secondary" onClick={() => dismiss(false, id)}>
                  {t.joinConfirmCancel}
                </button>
              </div>
            </div>
          );
        }, { duration: Number.POSITIVE_INFINITY });
      });
    },
    [t]
  );

  async function join(targetRoomId?: string) {
    playBeep(true);
    try {
      const targetRaw = targetRoomId ?? roomId;
      const normalizedRoomId = normalizeRoomId(targetRaw);
      if (!normalizedRoomId) return showToast("error", t.roomMissing, { skipBeep: true });
      if (!publicClient) {
        showToast("error", "RPC not ready", { skipBeep: true });
        return;
      }
      const numericRoomId = Number(normalizedRoomId);
      let confirmDetails: { readable: string; seconds: number; stakeLabel: string } | null = null;
      if (Number.isFinite(numericRoomId) && numericRoomId >= 0) {
        await refreshCommitDeadline(numericRoomId);
        const snapshot = await fetchRoomSnapshot(numericRoomId).catch(() => null);
        if (!snapshot) {
          showToast("error", t.joinRoomLoadFailed ?? t.historyLookupError, { skipBeep: true });
          return;
        }
        const nowSec = Math.floor(Date.now() / 1000);
        const commitWindow = getCommitDurationForRoom(numericRoomId);
        const zeroAddrLower = ZERO_ADDR.toLowerCase();
        let commitDeadline = Number(snapshot.commitDeadline ?? 0);
        if (!Number.isFinite(commitDeadline)) commitDeadline = 0;
        const fallbackDeadline = localCommitDeadlinesRef.current.get(numericRoomId);
        if (fallbackDeadline && fallbackDeadline > commitDeadline) {
          commitDeadline = fallbackDeadline;
        }
        let secondsRemaining: number | null = null;
        if (commitDeadline > 0) {
          secondsRemaining = Math.floor(commitDeadline - nowSec);
        }

        const opponentTaken =
          !!snapshot.opponent && snapshot.opponent.toLowerCase() !== zeroAddrLower;

        const state = Number(snapshot.state ?? 0);
        const stateLabel =
          state === 0
            ? ""
            : state === 1
              ? t.committing ?? STATE[state] ?? "Committing"
              : state === 2
                ? t.revealing ?? STATE[state] ?? "Revealing"
                : state === 3
                  ? t.finished ?? STATE[state] ?? "Finished"
                  : state === 4
                    ? t.canceled ?? STATE[state] ?? "Canceled"
                    : STATE[state] ?? t.expired ?? "Expired";

        if (opponentTaken) {
          showToast("error", t.joinRoomOpponentPresent, { skipBeep: true });
          return;
        }

        if (state !== 0) {
          showToast("error", t.joinRoomInactive(stateLabel), { skipBeep: true });
          return;
        }

        if (secondsRemaining != null && secondsRemaining <= 0) {
          showToast("error", t.joinRoomInactive(t.expired ?? "Expired"), { skipBeep: true });
          return;
        }

        const effectiveSeconds =
          secondsRemaining != null
            ? Math.max(secondsRemaining, 0)
            : Math.max(commitWindow, 0);
        const deadline =
          secondsRemaining != null && commitDeadline > 0
            ? commitDeadline
            : nowSec + effectiveSeconds;
        const readable = formatTimeLeft(deadline, t, nowSec);
        let stakeLabel: string = t.joinStakeUnknown;
        if (snapshot.stake && typeof snapshot.stake === "bigint") {
          stakeLabel = `${formatTokenAmount(snapshot.stake, decimals)} $BANMAO`;
        }
        confirmDetails = { readable, seconds: effectiveSeconds, stakeLabel };
      }
      if (confirmDetails && typeof window !== "undefined") {
        vibrate([vibrationMs, 80, vibrationMs]);
        const confirmed = await promptJoinConfirmation(confirmDetails);
        if (!confirmed) return;
      }
      const hash = await writeContract({
        address: RPS,
        abi: RPS_ABI,
        functionName: "joinRoom",
        args: [BigInt(normalizedRoomId)],
      });
      showToast("loading", "Pending...", { id: "tx", title: "Pending", force: true });
      await publicClient.waitForTransactionReceipt({ hash });
      toast.dismiss("tx");
      showToast("success", t.toastJoinOk, { skipBeep: true });

      // lưu lịch sử (tham gia)
      if (address) {
        const next = addRoomToHistory(Number(normalizedRoomId));
        setJoinedRooms(next);
      }

      const joinedIdNum = Number(normalizedRoomId);
      if (!Number.isNaN(joinedIdNum) && joinedIdNum >= 0) {
        void refreshCommitDeadline(joinedIdNum);
      }

      setRoomId(normalizedRoomId);
      await afterTx();
    } catch (e: any) {
      toast.dismiss("tx");
      showToast("error", e?.shortMessage || "Join failed", { skipBeep: true });
    }
  }

  async function commit(
    targetRoomId?: string,
    overrides?: { choice?: Choice; salt?: `0x${string}` }
  ) {
    playBeep(true);
    try {
      const targetRaw = targetRoomId ?? roomId;
      const normalizedTarget = normalizeRoomId(targetRaw);
      if (!normalizedTarget) return showToast("error", t.roomMissing, { skipBeep: true });
      const commitChoice = overrides?.choice ?? choice;
      const commitSalt = overrides?.salt ?? salt;
      if (!isHex(commitSalt) || (commitSalt as string).length !== 66)
        return showToast("error", t.errSalt, { skipBeep: true });
      if (!publicClient) {
        showToast("error", "RPC not ready", { skipBeep: true });
        return;
      }

      if (overrides?.choice != null && overrides.choice !== choice) {
        setChoice(overrides.choice);
      }
      if (overrides?.salt != null && overrides.salt !== salt) {
        setSalt(overrides.salt);
      }

      const info: LastCommitInfo = { roomId: normalizedTarget, stakeHuman, choice: commitChoice, salt: commitSalt };

      const hash = await writeContract({
        address: RPS,
        abi: RPS_ABI,
        functionName: "commit",
        args: [BigInt(normalizedTarget), commitHash(commitChoice, commitSalt)],
      });

      showToast("loading", "Pending...", { id: "tx", title: "Pending", force: true });
      await publicClient.waitForTransactionReceipt({ hash });
      toast.dismiss("tx");
      showToast("success", t.toastCommitOk, { skipBeep: true });

      const normalizedIdNum = Number(normalizedTarget);
      if (!Number.isNaN(normalizedIdNum) && normalizedIdNum >= 0) {
        void refreshCommitDeadline(normalizedIdNum);
      }

      if (address) {
        saveCommitInfo(info);
        saveArchivedCommitInfo(info);
        setCommitInfoMap((prev) => ({ ...prev, [normalizedTarget]: info }));
        setArchivedCommitInfoMap((prev) => ({ ...prev, [normalizedTarget]: info }));
      }
      setRoomId(normalizedTarget);
      await afterTx();
    } catch (e: any) {
      toast.dismiss("tx");
      showToast("error", e?.shortMessage || "Commit failed", { skipBeep: true });
    }
  }

  async function reveal(targetRoomId?: string) {
    playBeep(true);
    try {
      const targetRaw = targetRoomId ?? roomId;
      const normalizedTarget = normalizeRoomId(targetRaw);
      if (!normalizedTarget) return showToast("error", t.roomMissing, { skipBeep: true });
      setRoomId(normalizedTarget);
      const savedInfo =
        commitInfoMap[normalizedTarget] ?? archivedCommitInfoMap[normalizedTarget];
      const revealChoice: Choice = savedInfo?.choice ?? choice;
      const revealSalt: `0x${string}` = savedInfo?.salt ?? salt;

      if (savedInfo) {
        if (savedInfo.choice !== choice) setChoice(savedInfo.choice);
        if (savedInfo.salt !== salt) setSalt(savedInfo.salt);
        if (savedInfo.stakeHuman !== stakeHuman)
          setStakeHuman(formatStakeDisplayString(savedInfo.stakeHuman) || savedInfo.stakeHuman);
      } else {
        if (!isHex(revealSalt) || (revealSalt as string).length !== 66) {
          return showToast("error", t.errSalt, { skipBeep: true });
        }
      }

      if (!publicClient) {
        showToast("error", "RPC not ready", { skipBeep: true });
        return;
      }

      let currentState = 0;
      try {
        const status: any = await publicClient.readContract({
          address: RPS,
          abi: RPS_ABI,
          functionName: "rooms",
          args: [BigInt(normalizedTarget)],
        } as any);
        currentState = Number(status[9] ?? 0);
      } catch {
        return showToast("error", t.errRoomStatusLoad, { skipBeep: true });
      }
      if (currentState === 1)
        return showToast("error", t.errRoomStatusCommitting, { skipBeep: true });
      if (currentState !== 2) {
        return showToast(
          "error",
          `${t.errRoomStatusNotRevealing} ${STATE[currentState]} (${t.stateCol} ${currentState}).`,
          { skipBeep: true }
        );
      }

      const hash = await writeContract({
        address: RPS,
        abi: RPS_ABI,
        functionName: "reveal",
        args: [BigInt(normalizedTarget), revealChoice, revealSalt],
      });

      showToast("loading", "Pending...", { id: "tx", title: "Pending", force: true });
      await publicClient.waitForTransactionReceipt({ hash });
      toast.dismiss("tx");
      showToast("success", t.toastRevealOk, { skipBeep: true });
      await afterTx();
    } catch (e: any) {
      toast.dismiss("tx");
      showToast("error", e?.shortMessage || "Reveal failed", { skipBeep: true });
    }
  }

  const promptForfeitConfirmation = useCallback(
    async (normalizedTarget: string): Promise<boolean> => {
      const roomIdNum = Number(normalizedTarget);
      if (!Number.isFinite(roomIdNum) || roomIdNum < 0) {
        showToast("error", t.roomMissing, { skipBeep: true });
        return false;
      }

      const snapshot = await fetchRoomSnapshot(roomIdNum);
      if (!snapshot) {
        showToast("error", t.historyLookupError, { skipBeep: true });
        return false;
      }

      const warning = createForfeitWarning(snapshot, addressLower, t, decimals);
      const stakeLabel = `${formatTokenAmount(snapshot.stake ?? ZERO_BIGINT, decimals)} $BANMAO`;
      const finalWarning =
        warning ?? {
          title: t.forfeitWarnDefaultTitle,
          body: t.forfeitWarnDefaultBody(stakeLabel),
        };

      return await new Promise<boolean>((resolve) => {
        let settled = false;
        let toastId: string | undefined;
        const dismiss = (result: boolean, id?: string) => {
          if (settled) return;
          settled = true;
          resolve(result);
          toast.dismiss(id ?? toastId);
        };

        toastId = toast.custom((tt) => {
          const id = tt?.id ?? toastId;
          return (
            <div className="toast-card toast-card--alert">
              <button
                className="toast-close"
                aria-label="Close notification"
                onClick={() => dismiss(false, id)}
              >
                ×
              </button>
              <div className="toast-text">
                <strong>{finalWarning.title}</strong>
                <span>{finalWarning.body}</span>
              </div>
              <div className="toast-actions">
                <button className="table-action-button danger" onClick={() => dismiss(true, id)}>
                  {t.forfeitConfirmProceed}
                </button>
                <button className="table-action-button secondary" onClick={() => dismiss(false, id)}>
                  {t.forfeitCancel}
                </button>
              </div>
            </div>
          );
        }, { duration: Number.POSITIVE_INFINITY });
      });
    },
    [fetchRoomSnapshot, addressLower, t, decimals, showToast]
  );

  async function claim(targetRoomId?: string) {
    playBeep(true);
    try {
      const targetRaw = targetRoomId ?? roomId;
      const normalizedTarget = normalizeRoomId(targetRaw);
      if (!normalizedTarget) return showToast("error", t.roomMissing, { skipBeep: true });
      if (!publicClient) {
        showToast("error", "RPC not ready", { skipBeep: true });
        return;
      }
      const hash = await writeContract({
        address: RPS,
        abi: RPS_ABI,
        functionName: "claimTimeout",
        args: [BigInt(normalizedTarget)],
      });
      showToast("loading", "Pending...", { id: "tx", title: "Pending", force: true });
      await publicClient.waitForTransactionReceipt({ hash });
      toast.dismiss("tx");
      showToast("success", t.toastClaimOk, { skipBeep: true });
      setRoomId(normalizedTarget);
      await afterTx();
    } catch (e: any) {
      toast.dismiss("tx");
      showToast("error", e?.shortMessage || "Claim failed", { skipBeep: true });
    }
  }

  async function forfeit(targetRoomId?: string) {
    try {
      const targetRaw = targetRoomId ?? roomId;
      const normalizedTarget = normalizeRoomId(targetRaw);
      if (!normalizedTarget) return showToast("error", t.roomMissing, { skipBeep: true });
      const confirmed = await promptForfeitConfirmation(normalizedTarget);
      if (!confirmed) return;
      if (!publicClient) {
        showToast("error", "RPC not ready", { skipBeep: true });
        return;
      }

      playBeep(true);

      const hash = await writeContract({
        address: RPS,
        abi: RPS_ABI,
        functionName: "forfeit",
        args: [BigInt(normalizedTarget)],
      });

      showToast("loading", "Pending...", { id: "tx", title: "Pending", force: true });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      toast.dismiss("tx");
      showToast("success", t.toastForfeitOk, { skipBeep: true });
      setRoomId(normalizedTarget);

      if (forfeitEventAbi) {
        let roomIdNum: number | null = null;
        try {
          roomIdNum = Number(normalizedTarget);
          if (Number.isFinite(roomIdNum) && roomIdNum >= 0) {
            const blockNumber = receipt.blockNumber ?? null;
            rememberForfeitFetch(roomIdNum, false);
            const latestLog = await fetchLatestForfeitLog({
              publicClient,
              event: forfeitEventAbi as any,
              roomId: roomIdNum,
              ...(blockNumber != null
                ? { toBlock: blockNumber, minBlock: blockNumber, maxAttempts: 1 }
                : {}),
            });
            const record = extractForfeitRecord(latestLog);
            if (record) {
              updateForfeitResult(roomIdNum, record);
              fetchedForfeitIdsRef.current.add(roomIdNum);
            }
          }
        } catch (error) {
          if (roomIdNum != null) {
            rememberForfeitFetch(roomIdNum, false);
          }
          console.error(error);
        }
      }

      await afterTx();
    } catch (e: any) {
      toast.dismiss("tx");
      showToast("error", e?.shortMessage || "Forfeit failed", { skipBeep: true });
    }
  }

  const { isSharing, handleShareInvite } = useShareInvite({
    roomId,
    roomsRef,
    decimals,
    t,
    callbacks: {
      playBeep,
      showToast,
      normalizeRoomId,
      fetchRoomSnapshot,
      setRoomId,
    },
  });

  const { captureFloatingScreenshot } = useScreenshot({
    mainContentRef,
    t,
    callbacks: {
      playBeep,
      showToast,
    },
  });

  const approvedEnough = useMemo(() => {
    if (!isClient) return false;
    try {
      const want = parseUnits(prepareStakeForContract(stakeHuman), decimals);
      return (allowance ?? BigInt(0)) >= want;
    } catch {
      return false;
    }
  }, [allowance, stakeHuman, decimals, isClient]);

  const CHOICES = [
    { k: 1 as Choice, label: `✊ ${t.rock}`, img: "/games/rps/rock.png" },
    { k: 2 as Choice, label: `🖐 ${t.paper}`, img: "/games/rps/paper.png" },
    { k: 3 as Choice, label: `✌️ ${t.scissors}`, img: "/games/rps/scissors.png" },
  ];

  const seenResultSet = useMemo(() => new Set(seenResultRooms), [seenResultRooms]);
  const freshResultSet = useMemo(() => new Set(freshResultRooms), [freshResultRooms]);

  const activeCommitInfo = useMemo(() => {
    if (roomId && commitInfoMap[roomId]) return commitInfoMap[roomId];
    const entries = Object.values(commitInfoMap);
    if (entries.length === 0) return null;
    return entries.slice().sort((a, b) => Number(b.roomId) - Number(a.roomId))[0];
  }, [commitInfoMap, roomId]);

  // markResultSeen is now provided by useRoomHistory hook (aliased from clearFreshResult)

  const handleHistoryLookup = useCallback(async () => {
    const trimmed = historyLookupId.trim();
    if (!trimmed) {
      setHistoryLookupState({ status: "error", message: t.historyLookupInvalid });
      return;
    }
    const idNum = Number(trimmed);
    if (!Number.isFinite(idNum) || idNum < 0) {
      setHistoryLookupState({ status: "error", message: t.historyLookupInvalid });
      return;
    }
    if (!publicClient) {
      setHistoryLookupState({ status: "error", message: t.historyLookupError });
      return;
    }

    setHistoryLookupState({ status: "loading" });
    try {
      const rawRoom: any = await publicClient.readContract({
        address: RPS,
        abi: RPS_ABI,
        functionName: "rooms",
        args: [BigInt(idNum)],
      } as any);

      const creator = (rawRoom?.[0] ?? rawRoom?.creator ?? ZERO_ADDR) as `0x${string}`;
      const opponent = (rawRoom?.[1] ?? rawRoom?.opponent ?? ZERO_ADDR) as `0x${string}`;
      const stakeSource = rawRoom?.[2] ?? rawRoom?.stake ?? 0;
      const stakeValue = typeof stakeSource === "bigint" ? (stakeSource as bigint) : BigInt(stakeSource ?? 0);
      const commitA = (rawRoom?.[3] ?? rawRoom?.commitA ?? ZERO_COMMIT) as `0x${string}`;
      const commitB = (rawRoom?.[4] ?? rawRoom?.commitB ?? ZERO_COMMIT) as `0x${string}`;
      const revealA = Number(rawRoom?.[5] ?? rawRoom?.revealA ?? 0);
      const revealB = Number(rawRoom?.[6] ?? rawRoom?.revealB ?? 0);
      const state = Number(rawRoom?.[9] ?? rawRoom?.state ?? 0);

      let forfeitInfo: ForfeitRecord | null = null;
      if (forfeitEventAbi) {
        try {
          rememberForfeitFetch(idNum, false);
          const latestLog = await fetchLatestForfeitLog({
            publicClient,
            event: forfeitEventAbi as any,
            roomId: idNum,
          });
          const record = extractForfeitRecord(latestLog);
          if (record) {
            forfeitInfo = record;
            updateForfeitResult(idNum, record);
          }
        } catch (error) {
          rememberForfeitFetch(idNum, false);
          console.error(error);
        }
      }

      const raw: HistoryLookupRaw = {
        id: idNum,
        creator,
        opponent,
        stake: stakeValue,
        state,
        commitA,
        commitB,
        revealA,
        revealB,
        forfeit: forfeitInfo,
      };

      const isEmptyRoom =
        creator === ZERO_ADDR &&
        opponent === ZERO_ADDR &&
        stakeValue === ZERO_BIGINT &&
        state === 0 &&
        commitA === ZERO_COMMIT &&
        commitB === ZERO_COMMIT;

      if (isEmptyRoom) {
        lastHistoryLookupRef.current = null;
        setHistoryLookupState({ status: "error", message: t.historyLookupNotFound });
        return;
      }

      lastHistoryLookupRef.current = raw;
      const formatted = formatHistoryLookup(raw, t, decimals);
      setHistoryLookupState({ status: "success", data: formatted });
      setHistoryLookupId(String(idNum));
    } catch (error) {
      console.error(error);
      lastHistoryLookupRef.current = null;
      setHistoryLookupState({ status: "error", message: t.historyLookupError });
    }
  }, [historyLookupId, publicClient, t, decimals, forfeitEventAbi, updateForfeitResult, rememberForfeitFetch]);

  useEffect(() => {
    if (historyLookupState.status === "success" && lastHistoryLookupRef.current) {
      setHistoryLookupState({
        status: "success",
        data: formatHistoryLookup(lastHistoryLookupRef.current, t, decimals),
      });
    }
  }, [t, decimals, historyLookupState.status]);

  const handleHistoryCopy = useCallback(
    async (addressValue: string) => {
      const ok = await copyToClipboard(addressValue);
      if (ok) showToast("success", t.historyLookupCopied, { skipBeep: true });
      else showToast("error", "Copy failed", { skipBeep: true });
    },
    [showToast, t]
  );

  useEffect(() => {
    if (!isClient) return;
    if (!roomId) return;
    const info = commitInfoMap[roomId] ?? archivedCommitInfoMap[roomId];
    if (info) {
      setChoice(info.choice);
      setSalt(info.salt);
      setStakeHuman(formatStakeDisplayString(info.stakeHuman) || info.stakeHuman);
    }
  }, [roomId, commitInfoMap, archivedCommitInfoMap, isClient]);


  // PersonalSummary type is now imported from lib/types.ts

  const personalSummaries = usePersonalSummaries({
    addressLower,
    personalRooms,
    enhanceRoomDeadlines,
    commitInfoMap,
    archivedCommitInfoMap,
    freshResultRoomIds: freshResultSet,
    nowTs,
    t,
    choices: CHOICES,
    decimals,
    callbacks: {
      onClaim: (roomId: string) => void claim(roomId),
      onCommit: (roomId: string) => void commit(roomId),
      onReveal: (roomId: string) => void reveal(roomId),
      onForfeit: (roomId: string) => void forfeit(roomId),
      onShare: (roomId: string) => handleShareInvite(roomId),
      onDismiss: (roomId: number) => markResultSeen(roomId),
      onSetRoomId: setRoomId,
      triggerBeep: triggerInteractBeep,
      stopAlertLoop,
    },
  });

  const personalSummariesRef = useRef<PersonalSummary[]>([]);
  useEffect(() => {
    personalSummariesRef.current = personalSummaries;
  }, [personalSummaries]);

  const { autoPlayingRooms, autoPlayRoom, stopAutoPlay } = useAutoPlay({
    personalSummariesRef,
    commitInfoMap,
    archivedCommitInfoMap,
    choices: CHOICES,
    t,
    callbacks: {
      commit: async (roomId, opts) => void commit(roomId, opts),
      reveal: async (roomId) => void reveal(roomId),
      claim: async (roomId) => void claim(roomId),
      setChoice,
      setSalt,
      setRoomId,
      stopAlertLoop,
      showToast,
      normalizeRoomId,
      newSalt,
    },
  });

  const actionableSummaries = useMemo(
    () => personalSummaries.filter((card) => card.state !== 3 && card.state !== 4),
    [personalSummaries]
  );

  const { userStats, infoBalance, infoStats } = useInfoCache({
    addressLower,
    personalRooms,
    balance,
    isClient,
  });

  const visiblePersonalSummaries = useMemo(
    () => (showOnlyActionableRooms ? actionableSummaries : personalSummaries),
    [actionableSummaries, personalSummaries, showOnlyActionableRooms]
  );

  /* ---------- WATCH: thêm phòng tự tạo vào lịch sử + set cửa sổ 15 phút ---------- */
  useWatchContractEvent({
    address: RPS,
    abi: RPS_ABI,
    eventName: "RoomCreated" as any,
    onLogs: (logs) => {
      refetchNextRoomId?.();
      refetchRooms?.();
      if (!address) return;
      const mine = logs.find(
        (l: any) => l?.args?.creator?.toLowerCase?.() === address.toLowerCase()
      ) as any;
      if (mine?.args?.roomId != null) {
        const idNum = Number(mine.args.roomId);
        const next = addRoomToHistory(idNum);
        setJoinedRooms(next);

        // set 15 phút để “care” phòng do mình tạo => rung/notify commit-reveal
        const nowSec = Math.floor(Date.now() / 1000);
        const expireAt = nowSec + 15 * 60;
        myCreatedRoomsRef.current.set(idNum, expireAt);
        void refreshCommitDeadline(idNum);
      }
    },
  });

  /* ---------- WATCH: ROOM JOINED -> rung + toast ---------- */
  useWatchContractEvent({
    address: RPS,
    abi: RPS_ABI,
    eventName: "Joined" as any,
    onLogs: (logs) => {
      refetchRooms?.();
      logs.forEach((l: any) => {
        const rid = Number(l?.args?.roomId);
        const opponent = String(l?.args?.opponent || "");
        const opponentLower = opponent.toLowerCase();
        const viewerLower = address?.toLowerCase?.() ?? "";
        if (!Number.isFinite(rid) || rid < 0) return;

        // Nếu là phòng mình care (creator hoặc trong 15'), rung + báo
        if (isInMyCreatedWindow(rid) || (viewerLower && opponentLower === viewerLower)) {
          void refreshCommitDeadline(rid);

          const joinKey = `joined-${rid}-${opponentLower}`;
          if (!notifiedRef.current.has(joinKey)) {
            notifiedRef.current.add(joinKey);
            startAlertLoop(joinKey);
            pushNotification(
              (tt) => (
                <div className="toast-card toast-card--alert">
                  <button
                    className="toast-close"
                    aria-label="Close notification"
                    onClick={() => {
                      stopAlertLoop(joinKey);
                      toast.dismiss(tt?.id);
                    }}
                  >
                    ×
                  </button>
                  <div className="toast-text">
                    <strong>{t.joinedNotificationTitle(rid)}</strong>
                    <span>{t.joinedNotificationBody(opponent)}</span>
                  </div>
                  <div className="toast-actions">
                    <button
                      className="table-action-button"
                      onClick={async () => {
                        setRoomId(String(rid));
                        document.getElementById("join-room-section")?.scrollIntoView({ behavior: "smooth" });
                        const ok = await copyToClipboard(opponent);
                        stopAlertLoop(joinKey, { dismiss: false });
                        toast.dismiss(tt?.id);
                        if (ok) showToast("success", t.copyWallet);
                        else showToast("error", "Copy failed");
                      }}
                    >
                      {t.focusRoom}
                    </button>
                    <button
                      className="table-action-button secondary"
                      onClick={() => {
                        stopAlertLoop(joinKey);
                        toast.dismiss(tt?.id);
                      }}
                    >
                      {t.dismiss}
                    </button>
                  </div>
                </div>
              ),
              { duration: Number.POSITIVE_INFINITY, id: joinKey }
            );
          }
        }

        // Nếu chính mình là opponent, lưu vào history
        if (viewerLower && opponentLower === viewerLower && address) {
          const next = addRoomToHistory(rid);
          setJoinedRooms(next);
        }
      });
    },
  });

  /* ---------- WATCH: COMMIT -> rung + toast ---------- */
  useWatchContractEvent({
    address: RPS,
    abi: RPS_ABI,
    eventName: "Committed" as any,
    onLogs: (logs) => {
      refetchRooms?.();
      logs.forEach((l: any) => {
        const rid = Number(l?.args?.roomId);
        const player = String(l?.args?.player || "");
        if (!Number.isFinite(rid) || rid < 0) return;
        if (!iCareAboutThisRoom({ id: rid, creator: player })) return;

        const roomSnapshot = roomsRef.current.find((room) => Number(room?.id) === rid);
        const playerLower = player.toLowerCase();
        const zeroLower = ZERO_ADDR.toLowerCase();
        let shouldResetCommitWindow = false;
        if (roomSnapshot) {
          const creatorLower = roomSnapshot.creator?.toLowerCase?.() ?? "";
          const opponentLower = roomSnapshot.opponent?.toLowerCase?.() ?? "";
          const creatorPending = !roomSnapshot.commitA || roomSnapshot.commitA === ZERO_COMMIT;
          const opponentPending = !roomSnapshot.commitB || roomSnapshot.commitB === ZERO_COMMIT;
          if (
            playerLower === opponentLower &&
            creatorLower &&
            creatorLower !== zeroLower &&
            creatorPending
          ) {
            shouldResetCommitWindow = true;
          } else if (
            playerLower === creatorLower &&
            opponentLower &&
            opponentLower !== zeroLower &&
            opponentPending
          ) {
            shouldResetCommitWindow = true;
          }
        }

        if (shouldResetCommitWindow) {
          const nowSec = Math.floor(Date.now() / 1000);
          const commitWindow = getCommitDurationForRoom(rid);
          if (commitWindow > 0) {
            rememberCommitDuration(rid, commitWindow);
            rememberCommitDeadlineFallback(rid, nowSec + commitWindow);
            void refreshCommitDeadline(rid);
          }
        }

        const key = `committed-${rid}-${player.toLowerCase()}`;
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          vibrate([vibrationMs, 50, vibrationMs]);
          pushNotification(
            (tt) => (
              <div className="toast-card toast-card--alert">
                <button
                  className="toast-close"
                  aria-label="Close notification"
                  onClick={() => toast.dismiss(tt?.id)}
                >
                  ×
                </button>
                <div className="toast-text">
                  <strong>{`🧠 Room #${rid}`}</strong>
                  <span>{`${player.slice(0, 6)}... committed`}</span>
                </div>
              </div>
            ),
            { duration: 4000, id: key }
          );
        }
      });
    },
  });

  /* ---------- WATCH: REVEAL -> rung + toast ---------- */
  useWatchContractEvent({
    address: RPS,
    abi: RPS_ABI,
    eventName: "Revealed" as any,
    onLogs: (logs) => {
      refetchRooms?.();
      logs.forEach((l: any) => {
        const rid = Number(l?.args?.roomId);
        const player = String(l?.args?.player || "");
        if (!Number.isFinite(rid) || rid < 0) return;
        if (!iCareAboutThisRoom({ id: rid, creator: player })) return;
        const key = `revealed-${rid}-${player.toLowerCase()}`;
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          vibrate([vibrationMs, 80, vibrationMs]);
          pushNotification(
            (tt) => (
              <div className="toast-card toast-card--alert">
                <button
                  className="toast-close"
                  aria-label="Close notification"
                  onClick={() => toast.dismiss(tt?.id)}
                >
                  ×
                </button>
                <div className="toast-text">
                  <strong>{`🔓 Room #${rid}`}</strong>
                  <span>{`${player.slice(0, 6)}... revealed`}</span>
                </div>
              </div>
            ),
            { duration: 4000, id: key }
          );
        }
      });
    },
  });

  useWatchContractEvent({
    address: RPS,
    abi: RPS_ABI,
    eventName: "Forfeited" as any,
    onLogs: (logs) => {
      refetchRooms?.();
      logs.forEach((l: any) => {
        const rid = Number(l?.args?.roomId);
        const loserAddr = normalizeForfeitAddress(String(l?.args?.loser || ""));
        const winnerAddr = normalizeForfeitAddress(String(l?.args?.winner || ""));
        const payoutValue = normalizeForfeitPayout(l?.args?.winnerPayout ?? null);
        if (!Number.isFinite(rid) || rid <= 0) return;
        if (loserAddr || winnerAddr || payoutValue) {
          updateForfeitResult(rid, {
            loser: loserAddr,
            winner: winnerAddr,
            payout: payoutValue,
          });
          fetchedForfeitIdsRef.current.add(rid);
        }

        const viewerLower = addressLower ?? "";
        if (!viewerLower) return;

        const mergedRecord: ForfeitRecord = {
          loser: forfeitResultsRef.current[rid]?.loser ?? loserAddr ?? null,
          winner: forfeitResultsRef.current[rid]?.winner ?? winnerAddr ?? null,
          payout: forfeitResultsRef.current[rid]?.payout ?? payoutValue ?? null,
        };

        const room = roomsRef.current.find((room) => room.id === rid);
        const resolution = resolveForfeitOutcome({
          forfeit: mergedRecord,
          creator: room?.creator,
          opponent: room?.opponent,
        });
        if (!resolution) return;

        const { viewerWon, viewerLost } = determineForfeitViewerResult(resolution, {
          viewerAddress: viewerLower,
          creator: room?.creator ?? null,
          opponent: room?.opponent ?? null,
        });
        if (!viewerWon && !viewerLost) return;

        const creatorAddr = room?.creator ?? null;
        const opponentAddr = room?.opponent ?? null;
        const creatorLower = creatorAddr?.toLowerCase?.() ?? null;
        const opponentLower = opponentAddr?.toLowerCase?.() ?? null;

        const fallbackOpponentLabel = () => {
          if (viewerLower && creatorLower && viewerLower === creatorLower) {
            return formatShortAddress(opponentAddr);
          }
          if (viewerLower && opponentLower && viewerLower === opponentLower) {
            return formatShortAddress(creatorAddr);
          }
          return null;
        };

        if (viewerWon) {
          const loserLabel =
            formatShortAddress(mergedRecord.loser) ?? fallbackOpponentLabel() ?? t.opponent;
          const payoutLabel =
            mergedRecord.payout != null
              ? `${formatTokenAmount(mergedRecord.payout, decimals)} $BANMAO`
              : null;
          const messageParts = [
            t.forfeitWinTitle,
            t.forfeitWinBody(loserLabel, rid),
            t.forfeitWinResultRoom,
            payoutLabel ? t.forfeitWinResultPayout(payoutLabel) : null,
            t.forfeitWinReminder,
          ].filter(Boolean) as string[];
          refetchBalance?.();
          showToast("success", messageParts.join("\n\n"), { skipBeep: true, force: true });
        } else if (viewerLost) {
          const winnerLabel =
            formatShortAddress(mergedRecord.winner) ?? fallbackOpponentLabel() ?? t.opponent;
          showToast("error", t.toastForfeitLose(winnerLabel), { skipBeep: true });
        }
      });
    },
  });

  /* ---------- AUTO-NOTIFY: Action needed (claim, commit, reveal) ---------- */
  useEffect(() => {
    if (!isConnected || !address || rooms.length === 0 || !notificationsEnabled) return;

    let notificationShown = false;
    const lower = address.toLowerCase();
    const allActionableKeys = new Set<string>();

    const showNotification = (
      key: string,
      createToast: (toast: any) => React.ReactElement,
      pattern?: number | number[]
    ): boolean => {
      if (notificationShown) return false;

      if (!notifiedRef.current.has(key) && !isSnoozed(key)) {
        notifiedRef.current.add(key);
        startAlertLoop(key, pattern);
        pushNotification(createToast, { duration: Number.POSITIVE_INFINITY, id: key });
        notificationShown = true;
        return true;
      }

      return false;
    };

    // Prioritize by claims > reveal > commit, and sort by room ID to keep it stable
    const sortedRooms = [...rooms].sort((a, b) => a.id - b.id);

    for (const r of sortedRooms) {
      const viewRoom = enhanceRoomDeadlines(r);
      const isCreator = viewRoom.creator?.toLowerCase?.() === lower;
      const isOpponent = viewRoom.opponent?.toLowerCase?.() === lower;
      if (!isCreator && !isOpponent) continue;
      if (resolveForfeitOutcome(viewRoom)) continue;
      if (roomIsFinalized(viewRoom)) continue;

      const avail = availability(viewRoom, nowTs);
      if (avail.claimable) {
        const claimKey = `claim-${viewRoom.id}`;
        allActionableKeys.add(claimKey);
        const triggered = showNotification(
          claimKey,
          (tt) => (
            <div className="toast-card toast-card--alert">
              <button
                className="toast-close"
                aria-label="Close notification"
                onClick={() => {
                  stopAlertLoop(claimKey);
                  toast.dismiss(tt?.id);
                }}
              >
                ×
              </button>
              <div className="toast-text">
                <strong>{t.notifyClaim(viewRoom.id)}</strong>
                <span>{avail.phase === "commit" ? t.committing : t.revealing}</span>
              </div>
              <div className="toast-actions">
                <button
                  className="table-action-button"
                  onClick={() => {
                    setRoomId(String(viewRoom.id));
                    stopAlertLoop(claimKey, { dismiss: false });
                    toast.dismiss(tt?.id);
                    claim(String(viewRoom.id));
                  }}
                >
                  {t.takeAction}
                </button>
                <button
                  className="table-action-button secondary"
                  onClick={() => {
                    stopAlertLoop(claimKey);
                    snooze(claimKey);
                    toast.dismiss(tt?.id);
                  }}
                >
                  {t.rememberLater}
                </button>
              </div>
            </div>
          )
        );
      } else if (viewRoom.state === 2) {
        const needReveal = (isCreator && viewRoom.revealA === 0) || (isOpponent && viewRoom.revealB === 0);
        if (needReveal) {
          const key = `need-reveal-${viewRoom.id}-${isCreator ? "A" : "B"}`;
          allActionableKeys.add(key);
          const triggered = showNotification(
            key,
            (tt) => (
              <div className="toast-card toast-card--alert">
                <button
                  className="toast-close"
                  aria-label="Close notification"
                  onClick={() => {
                    stopAlertLoop(key);
                    toast.dismiss(tt?.id);
                  }}
                >
                  ×
                </button>
                <div className="toast-text">
                  <strong>{t.notifyReveal(viewRoom.id)}</strong>
                  <span>{t.reveal}</span>
                </div>
                <div className="toast-actions">
                  <button
                    className="table-action-button"
                    onClick={() => {
                      setRoomId(String(viewRoom.id));
                      stopAlertLoop(key, { dismiss: false });
                      toast.dismiss(tt?.id);
                      void reveal(String(viewRoom.id));
                    }}
                  >
                    {t.takeAction}
                  </button>
                  <button
                    className="table-action-button secondary"
                    onClick={() => {
                      stopAlertLoop(key);
                      snooze(key);
                      toast.dismiss(tt?.id);
                    }}
                  >
                    {t.rememberLater}
                  </button>
                </div>
              </div>
            ),
            [vibrationMs, 80, vibrationMs]
          );
          if (triggered) {
            sendTelegramReminder({
              key,
              roomId: viewRoom.id,
              type: "reveal",
              title: t.notifyReveal(viewRoom.id),
              body: t.reveal,
              deadline: viewRoom.revealDeadline ?? null,
            });
          }
        }
      } else if (viewRoom.state === 1) {
        const creatorNeedsCommit =
          isCreator && (!viewRoom.commitA || viewRoom.commitA === ZERO_COMMIT);
        const opponentNeedsCommit =
          isOpponent && (!viewRoom.commitB || viewRoom.commitB === ZERO_COMMIT);
        const needCommit = creatorNeedsCommit || opponentNeedsCommit;
        const secondsRemaining =
          viewRoom.commitDeadline > 0 ? Math.floor(viewRoom.commitDeadline - nowTs) : null;

        if (
          creatorNeedsCommit &&
          secondsRemaining != null &&
          secondsRemaining > 0 &&
          secondsRemaining <= 60
        ) {
          const warningKey = `commit-urgent-${viewRoom.id}`;
          allActionableKeys.add(warningKey);
          const timeLabel = formatTimeLeft(viewRoom.commitDeadline, t, nowTs);
          const secondsLabel = Math.max(0, secondsRemaining);
          const triggered = showNotification(
            warningKey,
            (tt) => (
              <div className="toast-card toast-card--alert">
                <button
                  className="toast-close"
                  aria-label="Close notification"
                  onClick={() => {
                    stopAlertLoop(warningKey);
                    toast.dismiss(tt?.id);
                  }}
                >
                  ×
                </button>
                <div className="toast-text">
                  <strong>{t.commitUrgentTitle(viewRoom.id)}</strong>
                  <span>{t.commitUrgentBody(timeLabel, secondsLabel)}</span>
                </div>
                <div className="toast-actions">
                  <button
                    className="table-action-button"
                    onClick={() => {
                      setRoomId(String(viewRoom.id));
                      stopAlertLoop(warningKey, { dismiss: false });
                      toast.dismiss(tt?.id);
                      void commit(String(viewRoom.id));
                    }}
                  >
                    {t.takeAction}
                  </button>
                  <button
                    className="table-action-button secondary"
                    onClick={() => {
                      stopAlertLoop(warningKey);
                      snooze(warningKey);
                      toast.dismiss(tt?.id);
                    }}
                  >
                    {t.rememberLater}
                  </button>
                </div>
              </div>
            ),
            [vibrationMs, 90, vibrationMs, 90, vibrationMs]
          );
          if (triggered) {
            sendTelegramReminder({
              key: warningKey,
              roomId: viewRoom.id,
              type: "commit-urgent",
              title: t.commitUrgentTitle(viewRoom.id),
              body: t.commitUrgentBody(timeLabel, secondsLabel),
              deadline: viewRoom.commitDeadline ?? null,
            });
          }
          continue;
        }

        if (needCommit) {
          const key = `need-commit-${viewRoom.id}-${isCreator ? "A" : "B"}`;
          allActionableKeys.add(key);
          const triggered = showNotification(key, (tt) => (
            <div className="toast-card toast-card--alert">
              <button
                className="toast-close"
                aria-label="Close notification"
                onClick={() => {
                  stopAlertLoop(key);
                  toast.dismiss(tt?.id);
                }}
              >
                ×
              </button>
              <div className="toast-text">
                <strong>{t.notifyCommit(viewRoom.id)}</strong>
                <span>{t.commit}</span>
              </div>
              <div className="toast-actions">
                <button
                  className="table-action-button"
                  onClick={() => {
                    setRoomId(String(viewRoom.id));
                    stopAlertLoop(key, { dismiss: false });
                    toast.dismiss(tt?.id);
                    void commit(String(viewRoom.id));
                  }}
                >
                  {t.takeAction}
                </button>
                <button
                  className="table-action-button secondary"
                  onClick={() => {
                    stopAlertLoop(key);
                    snooze(key);
                    toast.dismiss(tt?.id);
                  }}
                >
                  {t.rememberLater}
                </button>
              </div>
            </div>
          ));
          if (triggered) {
            sendTelegramReminder({
              key,
              roomId: viewRoom.id,
              type: "commit",
              title: t.notifyCommit(viewRoom.id),
              body: t.commit,
              deadline: viewRoom.commitDeadline ?? null,
            });
          }
        }
      }
    }

    // Cleanup stale notifications
    notifiedRef.current.forEach((key) => {
      if (
        key.startsWith("claim-") ||
        key.startsWith("need-commit-") ||
        key.startsWith("commit-urgent-") ||
        key.startsWith("need-reveal-")
      ) {
        if (!allActionableKeys.has(key)) {
          stopAlertLoop(key);
        }
      }
    });
  }, [
    rooms,
    isConnected,
    address,
    isSnoozed,
    pushNotification,
    snooze,
    t,
    notificationsEnabled,
    startAlertLoop,
    stopAlertLoop,
    vibrationMs,
    nowTs,
    enhanceRoomDeadlines,
    claim,
    commit,
    reveal,
    sendTelegramReminder,
  ]);

  useEffect(() => {
    if (!address || rooms.length === 0 || !notificationsEnabled) return;
    if (freshResultRooms.length === 0) return;

    const lower = address.toLowerCase();
    const latestFreshId = freshResultRooms[0];
    const room = rooms.find((r) => r.id === latestFreshId);
    if (!room || !roomIsFinalized(room)) return;

    const isCreator = room.creator?.toLowerCase?.() === lower;
    const isOpponent = room.opponent?.toLowerCase?.() === lower;
    if (!isCreator && !isOpponent) return;

    const key = `result-${room.id}-${lower}`;
    if (notifiedRef.current.has(key)) return;

    const outcome = deriveFinalOutcome(room);

    let viewerWon =
      (outcome.winner === "creator" && isCreator) || (outcome.winner === "opponent" && isOpponent);
    let viewerLost =
      (outcome.winner === "creator" && isOpponent) || (outcome.winner === "opponent" && isCreator);

    let bodyText: string | null = null;
    let icon = "🤝";

    if (outcome.via === "normal") {
      const opponentChoiceValue = isCreator ? room.revealB : room.revealA;
      if (!opponentChoiceValue) return;
      const opponentChoice = CHOICES.find((c) => c.k === opponentChoiceValue)?.label;
      if (!opponentChoice) return;

      const winner = getWinner(room.revealA, room.revealB);
      let outcomeLabel: string = t.draw;
      if (winner === "A") outcomeLabel = isCreator ? t.win : t.lose;
      else if (winner === "B") outcomeLabel = isOpponent ? t.win : t.lose;

      icon =
        winner === "Draw" || winner === null
          ? "🤝"
          : (winner === "A" && isCreator) || (winner === "B" && isOpponent)
            ? "🏆"
            : "📉";
      bodyText = t.resultNotificationBody(opponentChoice, outcomeLabel);
    } else if (outcome.via === "commit-timeout") {
      if (viewerWon) {
        bodyText = t.personalStatusWinTimeoutCommit;
        icon = "🏆";
      } else if (viewerLost) {
        bodyText = t.personalStatusLoseTimeoutCommit;
        icon = "📉";
      } else {
        bodyText = t.personalStatusDrawTimeoutCommit;
      }
    } else if (outcome.via === "reveal-timeout") {
      if (viewerWon) {
        bodyText = t.personalStatusWinTimeoutReveal;
        icon = "🏆";
      } else if (viewerLost) {
        bodyText = t.personalStatusLoseTimeoutReveal;
        icon = "📉";
      } else {
        bodyText = t.personalStatusDrawTimeoutReveal;
      }
    } else if (outcome.via === "forfeit") {
      const perspective = determineForfeitViewerResult(resolveForfeitOutcome(room), {
        viewerAddress: address,
        creator: room.creator ?? null,
        opponent: room.opponent ?? null,
      });
      viewerWon = perspective.viewerWon;
      viewerLost = perspective.viewerLost;
      if (viewerWon) {
        bodyText = t.personalStatusForfeitWin;
        icon = "🏆";
      } else if (viewerLost) {
        bodyText = t.personalStatusForfeitLose;
        icon = "📉";
      } else {
        bodyText = t.personalStatusForfeitSpectate;
      }
    } else if (outcome.via === "both-commit-timeout") {
      bodyText = t.personalStatusDrawTimeoutCommit;
    } else if (outcome.via === "both-reveal-timeout") {
      bodyText = t.personalStatusDrawTimeoutReveal;
    }

    if (!bodyText) return;

    notifiedRef.current.add(key);
    vibrate([vibrationMs, 120, vibrationMs]);

    const resultTone = viewerWon ? "win" : viewerLost ? "lose" : "draw";
    const title = t.resultNotificationTitle(room.id);

    pushNotification(
      (tt) => (
        <div className={`toast-card toast-card--result toast-card--result-${resultTone}`}>
          <span className="toast-card__icon" aria-hidden="true">
            {icon}
          </span>
          <div className="toast-text">
            <strong>{title}</strong>
            <span>{bodyText}</span>
          </div>
          <button
            className="toast-close"
            aria-label={t.dismiss ?? "Dismiss"}
            onClick={() => toast.dismiss(tt?.id)}
          >
            ×
          </button>
        </div>
      ),
      { duration: 8000, id: key }
    );
  }, [
    rooms,
    address,
    notificationsEnabled,
    CHOICES,
    pushNotification,
    t,
    vibrate,
    vibrationMs,
    freshResultRooms,
  ]);

  useEffect(() => {
    if (!notificationsEnabled) {
      notifiedRef.current.forEach((id) => stopAlertLoop(id));
      notifiedRef.current.clear();
    }
  }, [notificationsEnabled, stopAlertLoop]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        alertLoopsRef.current.forEach((intervalId) => window.clearInterval(intervalId));
        alertLoopsRef.current.clear();
      }
      mainContentRef.current?.classList.remove("app-shake");
    };
  }, []);

  // Dọn map phòng tạo sau 15 phút
  useEffect(() => {
    const timer = setInterval(() => {
      const nowTs = Math.floor(Date.now() / 1000);
      for (const [rid, exp] of myCreatedRoomsRef.current.entries()) {
        if (nowTs >= exp) myCreatedRoomsRef.current.delete(rid);
      }
      let commitChanged = false;
      let revealChanged = false;
      for (const [rid, deadline] of localCommitDeadlinesRef.current.entries()) {
        const commitWindow = getCommitDurationForRoom(rid);
        if (nowTs >= deadline + commitWindow * 6) {
          localCommitDeadlinesRef.current.delete(rid);
          commitChanged = true;
        }
      }
      for (const [rid, deadline] of localRevealDeadlinesRef.current.entries()) {
        if (nowTs >= deadline + REVEAL_WINDOW * 6) {
          localRevealDeadlinesRef.current.delete(rid);
          revealChanged = true;
        }
      }
      if (commitChanged) syncCommitDeadlineFallbacks();
      if (revealChanged) syncRevealDeadlineFallbacks();
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, [syncCommitDeadlineFallbacks, syncRevealDeadlineFallbacks]);

  /* ===================== RENDER ===================== */
  return (
    <main style={{ minHeight: '100%', paddingBottom: '40px', position: 'relative', background: 'var(--bg, #000)' }}>
      {/* Hidden anchor for scroll to top */}
      <div id="page-top" style={{ position: 'absolute', top: 0 }} />
      {/* Back to Home Button - uses theme colors */}
      <div style={{ position: 'fixed', top: '80px', left: '10px', zIndex: 10000 }}>
        <button
          onClick={() => { window.location.href = '/gamefi'; }}
          className="back-to-home-btn"
          style={{
            background: 'rgba(var(--gold-rgb, 255, 215, 0), 0.1)',
            border: '1px solid var(--gold, #FFD700)',
            color: 'var(--gold, #FFD700)',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Orbitron, sans-serif',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 15px rgba(var(--gold-rgb, 255, 215, 0), 0.4)',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--gold-rgb, 255, 215, 0), 0.25)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(var(--gold-rgb, 255, 215, 0), 0.1)'}
        >
          {t.backToHome}
        </button>
      </div>

      {/* Scroll Buttons */}
      <div style={{
        position: 'fixed',
        bottom: '100px',
        right: '20px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <button
          onClick={() => { const el = document.getElementById('page-top'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
          title="Scroll to Top"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(var(--gold-rgb, 255, 215, 0), 0.15)',
            border: '1px solid var(--gold, #FFD700)',
            color: 'var(--gold, #FFD700)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 0 10px rgba(var(--gold-rgb, 255, 215, 0), 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--gold-rgb, 255, 215, 0), 0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(var(--gold-rgb, 255, 215, 0), 0.15)'}
        >
          ▲
        </button>
        <button
          onClick={() => { const el = document.getElementById('page-bottom'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'end' }); }}
          title="Scroll to Bottom"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(var(--gold-rgb, 255, 215, 0), 0.15)',
            border: '1px solid var(--gold, #FFD700)',
            color: 'var(--gold, #FFD700)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 0 10px rgba(var(--gold-rgb, 255, 215, 0), 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(var(--gold-rgb, 255, 215, 0), 0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(var(--gold-rgb, 255, 215, 0), 0.15)'}
        >
          ▼
        </button>
      </div>
      <Toaster
        position="top-center"
        toastOptions={{ className: "toast-wrapper", duration: 5000 }}
        containerStyle={{ top: "12px", pointerEvents: "none", width: "auto", zIndex: 9999 }}
      />
      <Header connectLabel={t.connect} chainUnsupportedLabel={t.connectUnsupported} />

      <div ref={mainContentRef} className="main-wrapper">
        <h2 className="glowing-title" style={{ textAlign: "center" }}>
          {t.title}
        </h2>

        {!isConnected && <p style={{ textAlign: "center" }}>{t.connect}</p>}

        <div className="main-content">
          {/* Cột chính (Game UI) */}
          <div>
            {/* Approve / Create */}
            <div className="row" style={{ marginTop: 24 }}>
              <StakeInfoSection
                isCollapsed={isStakeTableCollapsed}
                isConnected={isConnected}
                isRefreshing={isRefreshing}
                refreshLabel={refreshLabel}
                infoBalance={infoBalance}
                decimals={decimals}
                infoStats={infoStats}
                t={t}
                onToggle={() => setIsStakeTableCollapsed(!isStakeTableCollapsed)}
                onRefresh={handleManualRefresh}
              />

              <section
                id="join-room-section"
                ref={joinSectionRef}
                className={`join-room-section${joinSectionHighlight ? " join-room-section--highlight" : ""}`}
              >
                <h3 className="glowing-title">{t.join}</h3>
                <div className="join-room-section__create-block">
                  <div className="join-room-section__field">
                    <label className="join-room-section__label" htmlFor="join-stake-input">
                      {t.stake}
                    </label>
                    <div className="commit-window-control commit-window-control--wide">
                      <button
                        type="button"
                        className="commit-window-control__step"
                        aria-label={
                          t.stake
                            ? `${t.stake} decrease by ×${stakeStepLabel}`
                            : `Decrease stake by ${stakeStepLabel}`
                        }
                        onClick={() => {
                          handleStakeStep(-stakeStep);
                        }}
                      >
                        −
                      </button>
                      <input
                        id="join-stake-input"
                        className="stake-section__input commit-window-control__input join-room-section__input"
                        value={stakeHuman}
                        onChange={(e) => setStakeHuman(e.target.value)}
                        placeholder={t.stakePH}
                        inputMode="decimal"
                        aria-label={t.stake}
                      />
                      <button
                        type="button"
                        className="commit-window-control__step"
                        aria-label={
                          t.stake
                            ? `${t.stake} increase by ×${stakeStepLabel}`
                            : `Increase stake by ${stakeStepLabel}`
                        }
                        onClick={() => {
                          handleStakeStep(stakeStep);
                        }}
                      >
                        +
                      </button>
                    </div>
                    <div className="commit-window-control__step-options">
                      {STEP_PRESETS.map((multiplier) => {
                        const isActive = stakeStep === multiplier;
                        return (
                          <button
                            key={`stake-step-${multiplier}`}
                            type="button"
                            className={`commit-window-control__step-option${isActive ? " commit-window-control__step-option--active" : ""
                              }`}
                            onClick={() => setStakeStep(multiplier)}
                            aria-pressed={isActive}
                          >
                            ×{formatWholeWithThousands(String(multiplier))}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="join-room-section__commit-window">
                    <label className="join-room-section__label" htmlFor="commit-duration-input">
                      {t.commitDurationLabel}
                    </label>
                    <div className="commit-window-control commit-window-control--wide">
                      <button
                        type="button"
                        className="commit-window-control__step"
                        aria-label={t.commitDurationDecrease ?? "Decrease seconds"}
                        onClick={(event) => {
                          const delta = event.shiftKey ? -60 : -1;
                          handleCommitDurationStep(delta);
                        }}
                      >
                        −
                      </button>
                      <input
                        id="commit-duration-input"
                        className="stake-section__input commit-window-control__input join-room-section__input"
                        type="number"
                        inputMode="numeric"
                        min={MIN_COMMIT_WINDOW}
                        max={MAX_COMMIT_WINDOW}
                        step={1}
                        value={commitDurationInput}
                        onChange={(e) => setCommitDurationInput(e.target.value)}
                        placeholder={t.commitDurationPH}
                        aria-describedby="commit-duration-hint"
                      />
                      <button
                        type="button"
                        className="commit-window-control__step"
                        aria-label={t.commitDurationIncrease ?? "Increase seconds"}
                        onClick={(event) => {
                          const delta = event.shiftKey ? 60 : 1;
                          handleCommitDurationStep(delta);
                        }}
                      >
                        +
                      </button>
                    </div>
                    <span id="commit-duration-hint" className="join-room-section__hint">
                      {t.commitDurationHint}
                    </span>
                  </div>
                  <div className="stake-section__actions join-room-section__create-actions">
                    {!approvedEnough ? (
                      <button onClick={doApprove} disabled={!isConnected || !isClient}>
                        {t.approve}
                      </button>
                    ) : (
                      <button className="approved" type="button" disabled aria-label="Approved">
                        ✅ {t.approved}
                      </button>
                    )}
                    <button onClick={createRoom} disabled={!isConnected || !isClient}>
                      {t.create}
                    </button>
                    <button onClick={() => handleShareInvite()} disabled={!roomId || isSharing}>
                      {isSharing ? t.sharePreparing : t.shareScreenshot}
                    </button>
                  </div>
                </div>
                <div className="join-room-section__field-group">
                  <div className="join-room-section__field">
                    <label className="join-room-section__label" htmlFor="join-room-id-input">
                      {t.room}
                    </label>
                    <div className="commit-window-control commit-window-control--wide">
                      <button
                        type="button"
                        className="commit-window-control__step"
                        aria-label={
                          t.room
                            ? `${t.room} decrease by ${roomStep}`
                            : `Decrease room id by ${roomStep}`
                        }
                        onClick={() => {
                          handleRoomIdStep(-roomStep);
                        }}
                      >
                        −
                      </button>
                      <input
                        id="join-room-id-input"
                        ref={joinInputRef}
                        className="stake-section__input commit-window-control__input join-room-section__input"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        placeholder={t.room}
                        inputMode="numeric"
                        aria-label={t.room}
                      />
                      <button
                        type="button"
                        className="commit-window-control__step"
                        aria-label={
                          t.room
                            ? `${t.room} increase by ${roomStep}`
                            : `Increase room id by ${roomStep}`
                        }
                        onClick={() => {
                          handleRoomIdStep(roomStep);
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="join-room-section__field">
                    <label className="join-room-section__label" htmlFor="join-salt-input">
                      {t.salt}
                    </label>
                    <div className="commit-window-control commit-window-control--wide">
                      <button
                        type="button"
                        className="commit-window-control__step"
                        aria-label={
                          t.salt
                            ? `${t.salt} decrease by ${saltStep}`
                            : `Decrease salt by ${saltStep}`
                        }
                        onClick={() => {
                          const stepValue = BigInt(saltStep);
                          handleSaltStep(-stepValue);
                        }}
                      >
                        −
                      </button>
                      <input
                        id="join-salt-input"
                        className="stake-section__input commit-window-control__input join-room-section__input"
                        value={salt}
                        onChange={(e) => setSalt(e.target.value as `0x${string}`)}
                        placeholder={t.salt}
                        spellCheck={false}
                        aria-label={t.salt}
                      />
                      <button
                        type="button"
                        className="commit-window-control__step"
                        aria-label={
                          t.salt
                            ? `${t.salt} increase by ${saltStep}`
                            : `Increase salt by ${saltStep}`
                        }
                        onClick={() => {
                          const stepValue = BigInt(saltStep);
                          handleSaltStep(stepValue);
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                <div className="join-room-section__join-actions">
                  <button onClick={() => join()} disabled={!isConnected || !isClient}>
                    {t.join}
                  </button>
                  <button
                    onClick={() => {
                      playBeep(true);
                      setSalt(newSalt());
                    }}
                  >
                    🔁 {t.newSalt}
                  </button>
                  <button
                    onClick={async () => {
                      playBeep(true);
                      const ok = await copyToClipboard(salt);
                      if (ok) showToast("success", t.personalCopySaltSuccess, { skipBeep: true });
                      else showToast("error", t.personalCopySaltError, { skipBeep: true });
                    }}
                    disabled={!salt}
                  >
                    📋 {t.personalCopySalt}
                  </button>
                </div>

              </section>
            </div>

            {isConnected && (
              <>
                <section
                  className={`personal-board${isPersonalBoardCollapsed ? " personal-board--collapsed" : ""
                    }${showOnlyActionableRooms ? " personal-board--focused" : ""}${!showOnlyActionableRooms && !isPersonalBoardCollapsed
                      ? " personal-board--all-limited"
                      : ""
                    }`}
                >
                  <div className="personal-board__heading">
                    <div className="personal-board__heading-text">
                      <h3 className="glowing-title">{t.personalBoardTitle}</h3>
                      <p>{t.personalBoardSubtitle}</p>
                    </div>
                    <div className="personal-board__controls">
                      <button
                        type="button"
                        className={`icon-refresh-button personal-board__refresh${isRefreshing ? " icon-refresh-button--spinning" : ""
                          }`}
                        onClick={handleManualRefresh}
                        title={refreshLabel}
                        aria-label={refreshLabel}
                        disabled={isRefreshing}
                      >
                        <FaSyncAlt className="icon-refresh-button__icon" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={`personal-board__toggle${isPersonalBoardCollapsed ? " personal-board__toggle--active" : ""
                          }`}
                        onClick={() => {
                          setIsPersonalBoardCollapsed((prev) => !prev);
                        }}
                        aria-pressed={isPersonalBoardCollapsed}
                        aria-label={
                          isPersonalBoardCollapsed ? t.personalBoardShowAll : t.personalBoardCollapse
                        }
                        title={isPersonalBoardCollapsed ? t.personalBoardShowAll : t.personalBoardCollapse}
                      >
                        <span aria-hidden="true">{isPersonalBoardCollapsed ? "⇲" : "⇱"}</span>
                        <span className="personal-board__toggle-label">
                          {isPersonalBoardCollapsed ? t.personalBoardShowAll : t.personalBoardCollapse}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`personal-board__toggle${showOnlyActionableRooms ? " personal-board__toggle--active" : ""
                          }`}
                        onClick={() => {
                          setShowOnlyActionableRooms((prev) => {
                            const next = !prev;
                            if (next) setIsPersonalBoardCollapsed(false);
                            return next;
                          });
                        }}
                        aria-pressed={showOnlyActionableRooms}
                        aria-label={
                          showOnlyActionableRooms ? t.personalBoardShowAll : t.personalBoardExpand
                        }
                        title={showOnlyActionableRooms ? t.personalBoardShowAll : t.personalBoardExpand}
                      >
                        <span aria-hidden="true">{showOnlyActionableRooms ? "☰" : "⚡"}</span>
                        <span className="personal-board__toggle-label">
                          {showOnlyActionableRooms ? t.personalBoardShowAll : t.personalBoardExpand}
                        </span>
                      </button>
                    </div>
                  </div>

                  {visiblePersonalSummaries.length === 0 ? (
                    <p className="personal-board__empty">
                      {showOnlyActionableRooms ? t.personalBoardNoAction : t.personalBoardEmpty}
                    </p>
                  ) : (
                    <div className="personal-board__table-wrapper">
                      <table className="personal-board__table">
                        <thead>
                          <tr>
                            <th>{t.room}</th>
                            <th>{t.opponent}</th>
                            <th>Phase</th>
                            <th>Status</th>
                            <th>{t.stakeCol}</th>
                            <th className="action-col">{t.actionCol}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visiblePersonalSummaries.map((card) => (
                            <PersonalBoardRow
                              key={card.id}
                              card={card}
                              currentRoomId={roomId}
                              currentChoice={choice}
                              choices={CHOICES}
                              isAutoPlaying={autoPlayingRooms.has(card.id)}
                              isClient={isClient}
                              isConnected={isConnected}
                              t={t}
                              onSelectRoom={(id) => setRoomId(String(id))}
                              onSelectChoice={setChoice}
                              onCopySalt={async (salt) => {
                                const ok = await copyToClipboard(salt);
                                if (ok) showToast("success", t.personalCopySaltSuccess);
                                else showToast("error", t.personalCopySaltError ?? "Copy failed");
                              }}
                              onCopyOpponent={async (addr) => {
                                const ok = await copyToClipboard(addr);
                                if (ok) showToast("success", t.personalCopyOpponent);
                                else showToast("error", "Copy failed");
                              }}
                              onAutoPlay={(id) => void autoPlayRoom(id)}
                              onStopAutoPlay={stopAutoPlay}
                              onPlayBeep={triggerInteractBeep}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <TelegramRemindersPanel
                  isCollapsed={isTelegramPanelCollapsed}
                  isTelegramConnected={isTelegramConnected}
                  t={t}
                  onToggle={() => {
                    triggerInteractBeep();
                    setIsTelegramPanelCollapsed((prev) => !prev);
                  }}
                  onConnected={handleTelegramConnected}
                  onBeforeConnect={triggerInteractBeep}
                />
              </>
            )}

            {/* === RPS === */}
            <GameActionsPanel
              choices={CHOICES}
              selectedChoice={choice}
              roomId={roomId}
              activeCommitInfo={activeCommitInfo}
              isConnected={isConnected}
              isClient={isClient}
              t={t}
              onSelectChoice={handleSelectChoice}
              onCommit={() => commit()}
              onReveal={() => reveal()}
              onClaim={() => claim()}
              onForfeit={() => forfeit()}
            />

            {/* Rooms */}
            <RoomsTableSection
              visibleRooms={visibleRooms}
              roomMeta={roomMeta}
              viewerAddress={addressLower}
              nowTs={nowTs}
              decimals={decimals}
              isRefreshing={isRefreshing}
              refreshLabel={refreshLabel}
              isConnected={isConnected}
              isClient={isClient}
              t={t}
              enhanceRoomDeadlines={enhanceRoomDeadlines}
              onRefresh={handleManualRefresh}
              onJoin={(roomId) => void join(roomId)}
              onCommit={(roomId) => void commit(roomId)}
              onReveal={(roomId) => void reveal(roomId)}
              onClaim={(roomId) => void claim(roomId)}
              onForfeit={(roomId) => void forfeit(roomId)}
              onCopyAddress={async (addr) => {
                const ok = await copyToClipboard(addr);
                if (ok) showToast("success", `${t.addressCol} ${t.copyAddress.toLowerCase()}!`);
                else showToast("error", "Copy failed.");
              }}
              onSetRoomId={setRoomId}
            />
          </div>

          {/* Cột phụ (Luật chơi) */}
          <div>
            <div className="rules-panel" style={{ marginTop: "0" }}>
              <h3 className="glowing-title">{t.rules}</h3>
              <p className="rules-warning">
                <span className="rules-warning__icon" aria-hidden="true">
                  ⚠️
                </span>
                <span>{t.rulesWarning}</span>
              </p>
              <ul>
                {t.rulesList.map((rule, index) => (
                  <li key={index} className={`rule-item ${RULE_ACCENTS[index]?.className ?? ""}`}>
                    <span className="rule-icon" aria-hidden="true">
                      {RULE_ACCENTS[index]?.icon ?? "•"}
                    </span>
                    <span className="rule-text" dangerouslySetInnerHTML={{ __html: rule }} />
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px dashed var(--line)" }}>
                <h3 style={{ fontSize: "1.1rem", margin: "0 0 8px" }}>{t.communityLinksTitle}</h3>
                <ul className="community-links">
                  <li>
                    <a
                      href={TELEGRAM_URL}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => triggerInteractBeep()}
                    >
                      <IconTelegram width={18} height={18} />
                      <span>{t.communityLinkTelegramLabel}</span>
                    </a>
                    <span>{t.communityLinkTelegramDesc}</span>
                  </li>
                  <li>
                    <a
                      href={X_URL}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => triggerInteractBeep()}
                    >
                      <IconX width={18} height={18} />
                      <span>{t.communityLinkXLabel}</span>
                    </a>
                    <span>{t.communityLinkXDesc}</span>
                  </li>
                  <li>
                    <a
                      href={docsLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => triggerInteractBeep()}
                    >
                      <IconDocs width={18} height={18} />
                      <span>{t.communityLinkDocsLabel}</span>
                    </a>
                    <span>{t.communityLinkDocsDesc}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <footer className="footer-credit">{t.footer}</footer>
      </div>
      <FloatingSettings
        lang={lang as keyof typeof langs}
        onLangChange={handleLangChange}
        notificationsEnabled={notificationsEnabled}
        onNotificationsToggle={handleNotificationsToggle}
        vibrationMs={vibrationMs}
        onVibrationChange={handleVibrationChange}
        snoozeMinutes={notificationSnoozeMinutes}
        onSnoozeChange={(value) => {
          setNotificationSnoozeMinutes(value);
        }}
        uiScale={uiScale}
        onUiScaleChange={handleUiScaleChange}
        theme={theme}
        onThemeChange={setTheme}
        telegramHandle={TELEGRAM_BOT_USERNAME}
        xHandle={X_HANDLE}
        onInteract={triggerInteractBeep}
        onScreenshot={captureFloatingScreenshot}
        onReset={handleResetSite}
        historyLookupId={historyLookupId}
        onHistoryLookupIdChange={setHistoryLookupId}
        historyLookupState={historyLookupState}
        onHistoryLookup={handleHistoryLookup}
        onCopyAddress={handleHistoryCopy}
      />

      {/* PWA Install Banner for Game Page */}
      <PWAInstallBanner />
      {/* Hidden anchor for scroll to bottom */}
      <div id="page-bottom" style={{ position: 'relative' }} />
    </main >
  );
}
