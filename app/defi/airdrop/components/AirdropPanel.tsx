"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAccount, useWriteContract, useBalance, useReadContract, usePublicClient } from "wagmi";
import { parseUnits, isAddress, formatUnits } from "viem";
import AIcon from "./AirdropIcons";
import confetti from "canvas-confetti";

// ===================== CONSTANTS =====================
const BANMAO_TOKEN = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78" as `0x${string}`;
const AIRDROP_CONTRACT = "0xf2d471711D24646b2C50E1F74a063caA7a6863a0" as `0x${string}`;
const XLAYER_EXPLORER = "https://web3.okx.com/explorer/x-layer";
const GAS_PER_TRANSFER = 65000; // gas for single ERC20 transfer
const GAS_PER_BATCH_RECIPIENT = 45000; // gas per recipient in batch contract
const GAS_BATCH_BASE = 50000; // base overhead for batch contract call
const GAS_PRICE_GWEI = 0.1; // XLayer default gas price
const STORAGE_HISTORY = "banmao_airdrop_history";
const STORAGE_BOOK = "banmao_address_book";
const STORAGE_BLACKLIST = "banmao_airdrop_blacklist";
const STORAGE_TEMPLATES = "banmao_airdrop_templates";
const MAX_RETRIES = 3;
const MAX_BATCH_SIZE = 500; // OKX XLayer supports ~666 per TX, safe limit = 500
const BATCH_SIZE_OPTIONS = [50, 100, 200, 300, 500] as const;
const STORAGE_CONFIG = "banmao_airdrop_config";

const ERC20_ABI = [
    {
        name: "transfer",
        type: "function",
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ type: "bool" }],
    },
    {
        name: "approve",
        type: "function",
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ type: "bool" }],
    },
    {
        name: "allowance",
        type: "function",
        inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
        ],
        outputs: [{ type: "uint256" }],
    },
] as const;

const BATCH_ABI = [
    {
        name: "batchTransferEqual",
        type: "function",
        inputs: [
            { name: "token", type: "address" },
            { name: "recipients", type: "address[]" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [],
    },
    {
        name: "batchTransfer",
        type: "function",
        inputs: [
            { name: "token", type: "address" },
            { name: "recipients", type: "address[]" },
            { name: "amounts", type: "uint256[]" },
        ],
        outputs: [],
    },
] as const;

// ===================== ERROR I18N =====================
const ERROR_PATTERNS: [RegExp, string][] = [
    [/user rejected|user denied|rejected the request/i, "errUserRejected"],
    [/insufficient funds|insufficient balance/i, "errInsufficientFunds"],
    [/nonce too low|nonce/i, "errNonce"],
    [/gas required exceeds|out of gas/i, "errOutOfGas"],
    [/transfer amount exceeds balance/i, "errExceedsBalance"],
    [/execution reverted/i, "errReverted"],
    [/network|timeout|fetch/i, "errNetwork"],
];

function translateError(error: string, t: (key: string) => string): string {
    for (const [pattern, key] of ERROR_PATTERNS) {
        if (pattern.test(error)) return t(key) || error;
    }
    return error.length > 60 ? error.slice(0, 57) + "..." : error;
}

// ===================== TEMPLATE TYPE =====================
interface AirdropTemplate {
    name: string;
    amount: string;
    amountMode: "equal" | "custom";
    createdAt: number;
}

interface HotToken {
    tokenContractAddress: string;
    tokenSymbol: string;
    tokenName: string;
    price: string;
    volume24h: string;
    holders: string;
    priceChange24h: string;
    liquidity: string;
    marketCap: string;
}

const SCAN_CHAINS = [
    { id: "196", name: "XLayer", emoji: "⛓️" },
    { id: "1", name: "Ethereum", emoji: "Ξ" },
    { id: "56", name: "BSC", emoji: "🟡" },
    { id: "137", name: "Polygon", emoji: "🟣" },
    { id: "42161", name: "Arbitrum", emoji: "🔵" },
    { id: "8453", name: "Base", emoji: "🔷" },
];

const HOLDER_TAGS = [
    { id: "", label: "holderFilterAll", emoji: "📊" },
    { id: "3", label: "holderFilterSmartMoney", emoji: "💰" },
    { id: "4", label: "holderFilterWhale", emoji: "🐋" },
    { id: "1", label: "holderFilterKOL", emoji: "⭐" },
    { id: "5", label: "holderFilterNewWallet", emoji: "🆕" },
];

const CHAIN_EXPLORERS: Record<string, string> = {
    "196": "https://web3.okx.com/explorer/x-layer",
    "1": "https://etherscan.io",
    "56": "https://bscscan.com",
    "137": "https://polygonscan.com",
    "42161": "https://arbiscan.io",
    "8453": "https://basescan.org",
};

// ===================== TYPES =====================
interface ScannedWallet {
    address: string;
    shortAddress: string;
    balances: { OKB: string; USDT: string; BANMAO?: string };
    hasBalance: boolean;
}
interface SendResult {
    address: string;
    amount: string;
    success: boolean;
    txHash?: string;
    error?: string;
}
interface HistoryEntry {
    id: string;
    timestamp: number;
    totalRecipients: number;
    successCount: number;
    failCount: number;
    totalSent: string;
    amountPerWallet: string;
    results: SendResult[];
}
interface AddressGroup {
    name: string;
    addresses: string[];
    createdAt: number;
}
interface RecipientEntry {
    address: string;
    amount: string;
}
interface AirdropPanelProps {
    t: (key: string) => string;
    lang: string;
    playClick: () => void;
    playHover: () => void;
    playSuccess: () => void;
    playError: () => void;
}

type AirdropTab = "manual" | "scan" | "csv";
type AirdropStep = "input" | "preview" | "sending" | "done";
type SendMode = 1 | 3 | 5 | 10 | 20 | "batch";
type AmountMode = "equal" | "custom";

// ===================== HELPERS =====================
function loadStorage<T>(key: string, fallback: T): T {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}
function saveStorage(key: string, data: any) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}
function shortAddr(addr: string) { return `${addr.slice(0, 6)}···${addr.slice(-4)}`; }
function formatNum(n: number) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function parseCSVContent(text: string): { address: string; amount?: string }[] {
    const results: { address: string; amount?: string }[] = [];
    for (const line of text.split(/\r?\n/)) {
        const parts = line.split(/[,;\t]+/).map(s => s.trim());
        const addrPart = parts.find(p => /0x[a-fA-F0-9]{40}/.test(p));
        if (addrPart) {
            const match = addrPart.match(/0x[a-fA-F0-9]{40}/);
            if (match && isAddress(match[0])) {
                const amountPart = parts.find(p => p !== addrPart && /^\d+(\.\d+)?$/.test(p));
                results.push({ address: match[0], amount: amountPart || undefined });
            }
        }
    }
    return results;
}

function generateResultCSV(results: SendResult[]): string {
    return "Address,Amount,Status,TxHash,Error\n" + results.map(r =>
        `${r.address},${r.amount},${r.success ? "Success" : "Failed"},${r.txHash || ""},${r.error || ""}`
    ).join("\n");
}

function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===================== COMPONENT =====================
export default function AirdropPanel({ t, lang, playClick, playHover, playSuccess, playError }: AirdropPanelProps) {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();

    // === Session persistence helper ===
    const SESSION_KEY = "banmao_airdrop_session";
    const loadSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } };
    const saveSession = (data: Record<string, any>) => { try { const prev = loadSession() || {}; sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...prev, ...data })); } catch {} };
    const clearSession = () => { try { sessionStorage.removeItem(SESSION_KEY); } catch {} };
    const saved = useRef(loadSession());

    // State (with session restore)
    const [activeTab, setActiveTab] = useState<AirdropTab>(() => saved.current?.activeTab || "scan");
    const [step, setStep] = useState<AirdropStep>(() => { const s = saved.current?.step; return s === "sending" ? "preview" : s || "input"; });
    const [sendMode, setSendMode] = useState<SendMode>(() => saved.current?.sendMode || "batch");
    const [amountMode, setAmountMode] = useState<AmountMode>(() => saved.current?.amountMode || "equal");
    const [addressInput, setAddressInput] = useState(() => saved.current?.addressInput || "");
    const [parsedAddresses, setParsedAddresses] = useState<string[]>(() => saved.current?.parsedAddresses || []);
    const [invalidAddresses, setInvalidAddresses] = useState<string[]>([]);
    const [duplicateCount, setDuplicateCount] = useState(0);
    const [duplicateAddresses, setDuplicateAddresses] = useState<string[]>([]);
    const [batchSizeConfig, setBatchSizeConfig] = useState(() => {
        try { const v = JSON.parse(localStorage.getItem(STORAGE_CONFIG) || "{}").batchSize; return typeof v === 'number' ? v : MAX_BATCH_SIZE; } catch { return MAX_BATCH_SIZE; }
    });
    const [resultFilter, setResultFilter] = useState<"all" | "success" | "failed">("all");
    const [customAmounts, setCustomAmounts] = useState<Map<string, string>>(() => { try { return new Map(Object.entries(saved.current?.customAmounts || {})); } catch { return new Map(); } });
    const [amountPerWallet, setAmountPerWallet] = useState(() => saved.current?.amountPerWallet || "");
    const [scannedWallets, setScannedWallets] = useState<ScannedWallet[]>([]);
    const scannedWalletsRef = useRef<ScannedWallet[]>([]);
    const [selectedWallets, setSelectedWallets] = useState<Set<string>>(new Set());
    const [recipientSearch, setRecipientSearch] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState("");
    const WALLET_CHAINS = [
        { key: "xlayer", name: "XLayer", icon: "🟠" },
        { key: "ethereum", name: "Ethereum", icon: "🔷" },
        { key: "bsc", name: "BSC", icon: "🟡" },
        { key: "polygon", name: "Polygon", icon: "🟣" },
        { key: "arbitrum", name: "Arbitrum", icon: "🔵" },
        { key: "optimism", name: "Optimism", icon: "🔴" },
        { key: "base", name: "Base", icon: "🔵" },
        { key: "avalanche", name: "Avalanche", icon: "🔺" },
    ];
    const [scanChain, setScanChain] = useState("xlayer");
    const [isSending, setIsSending] = useState(false);
    const [sendProgress, setSendProgress] = useState(0);
    const [sendTotal, setSendTotal] = useState(0);
    const [sendResults, setSendResults] = useState<SendResult[]>([]);
    const [currentSendingAddress, setCurrentSendingAddress] = useState("");
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [addressBook, setAddressBook] = useState<AddressGroup[]>([]);
    const [showBook, setShowBook] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [estimatedGas, setEstimatedGas] = useState("");
    const [csvDragOver, setCsvDragOver] = useState(false);
    const [toasts, setToasts] = useState<{id: number; msg: string; ts: number}[]>([]);
    const toastIdRef = useRef(0);
    const [scanCount, setScanCount] = useState(0);
    // Scan progress tracking
    const [scanProgress, setScanProgress] = useState<{scannedBlocks: number; totalBlocks: number; walletsFound: number} | null>(null);
    // History filters
    const [histFilter, setHistFilter] = useState<"all" | "mine">("all");
    const [histStatusFilter, setHistStatusFilter] = useState<"all" | "success" | "failed">("all");
    const [autoScanActive, setAutoScanActive] = useState(false);
    const autoScanRef = useRef<boolean>(false);
    const [expandedWallet, setExpandedWallet] = useState<string | null>(null);
    // New state: blacklist, templates, OKB balance
    const [blacklist, setBlacklist] = useState<Set<string>>(new Set());
    const [showBlacklist, setShowBlacklist] = useState(false);
    const [blacklistInput, setBlacklistInput] = useState("");
    const [templates, setTemplates] = useState<AirdropTemplate[]>([]);
    const [showTemplates, setShowTemplates] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    // Flagged address prompt — uses direct DOM to bypass React render issues in async loops
    const askFlaggedAddress = (batchSize: number, labels: Record<string, string>, batchAddrs?: string[]): Promise<string | null> => {
        return new Promise((resolve) => {
            document.getElementById("okx-flag-overlay")?.remove();
            const overlay = document.createElement("div");
            overlay.id = "okx-flag-overlay";
            Object.assign(overlay.style, {
                position: "fixed", inset: "0", zIndex: "999999",
                background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "system-ui, sans-serif",
            });
            const addrListHtml = (batchAddrs || []).map((a, i) =>
                `<div class="okx-addr-row" data-addr="${a}" style="display:flex;align-items:center;padding:4px 8px;font-size:12px;font-family:monospace;border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span style="color:#666;min-width:28px;">#${i + 1}</span>
                    <span style="flex:1;color:#ccc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a}</span>
                    <button class="okx-addr-del" data-addr="${a}" style="background:transparent;border:none;cursor:pointer;color:#ff4444;font-size:14px;padding:2px 6px;opacity:0.6;" title="${labels.remove}">🗑️</button>
                </div>`
            ).join("");
            const totalAddrs = (batchAddrs || []).length;
            overlay.innerHTML = `
                <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:2px solid #ff4444;border-radius:16px;padding:24px;width:min(92vw,500px);box-shadow:0 0 60px rgba(255,68,68,0.4);max-height:85vh;display:flex;flex-direction:column;">
                    <div style="font-size:22px;font-weight:700;color:#ff6b6b;margin-bottom:8px;text-align:center;">⚠️ ${labels.title}</div>
                    <div style="font-size:12px;color:#ccc;margin-bottom:10px;text-align:center;line-height:1.5;">${labels.desc}</div>
                    <div style="font-size:11px;color:#888;margin-bottom:10px;text-align:center;">📦 ${labels.batch}: ${batchSize} ${labels.addresses}</div>
                    <input id="okx-flag-input" type="text" placeholder="🔍 ${labels.search || 'Search / Paste 0x...'}" autofocus
                        style="width:100%;padding:12px;background:#0d1117;border:2px solid #ff4444;border-radius:10px;color:#fff;font-size:14px;font-family:monospace;outline:none;margin-bottom:8px;box-sizing:border-box;" />
                    <div id="okx-addr-list" style="max-height:200px;overflow-y:auto;background:rgba(0,0,0,0.3);border-radius:8px;margin-bottom:12px;border:1px solid rgba(255,255,255,0.08);">
                        ${addrListHtml}
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button id="okx-flag-cancel" style="flex:1;min-width:90px;padding:11px 0;background:#333;border:1px solid #555;border-radius:10px;color:#aaa;font-size:14px;cursor:pointer;font-weight:600;">❌ ${labels.stop}</button>
                        <button id="okx-flag-auto" style="flex:1;min-width:90px;padding:11px 0;background:linear-gradient(135deg,#0f7b6c,#4ecdc4);border:none;border-radius:10px;color:#fff;font-size:14px;cursor:pointer;font-weight:700;">🔍 ${labels.autoDetect}</button>
                        <button id="okx-flag-submit" style="flex:1;min-width:90px;padding:11px 0;background:linear-gradient(135deg,#ff4444,#cc0000);border:none;border-radius:10px;color:#fff;font-size:14px;cursor:pointer;font-weight:700;">🚫 ${labels.remove}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            // Search/filter logic
            const listEl = document.getElementById("okx-addr-list")!;
            const allRows = listEl.querySelectorAll(".okx-addr-row");
            setTimeout(() => {
                const inp = document.getElementById("okx-flag-input") as HTMLInputElement;
                inp?.focus();
                inp?.addEventListener("input", () => {
                    const q = inp.value.toLowerCase().trim();
                    allRows.forEach((row) => {
                        const addr = (row as HTMLElement).dataset.addr || "";
                        (row as HTMLElement).style.display = (!q || addr.includes(q)) ? "flex" : "none";
                    });
                });
                inp?.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") { overlay.remove(); resolve(inp.value || null); }
                });
            }, 100);
            // Trash button handlers — click to select address for removal
            listEl.querySelectorAll(".okx-addr-del").forEach(btn => {
                (btn as HTMLElement).onclick = () => {
                    const addr = (btn as HTMLElement).dataset.addr || "";
                    const inp = document.getElementById("okx-flag-input") as HTMLInputElement;
                    if (inp) inp.value = addr;
                    // Highlight selected row
                    allRows.forEach(r => (r as HTMLElement).style.background = "transparent");
                    (btn.closest(".okx-addr-row") as HTMLElement).style.background = "rgba(255,68,68,0.15)";
                };
            });
            document.getElementById("okx-flag-cancel")!.onclick = () => { overlay.remove(); resolve(null); };
            document.getElementById("okx-flag-auto")!.onclick = () => { overlay.remove(); resolve("AUTO"); };
            document.getElementById("okx-flag-submit")!.onclick = () => {
                const inp = document.getElementById("okx-flag-input") as HTMLInputElement;
                overlay.remove(); resolve(inp?.value || null);
            };
        });
    };

    // Multi-token state (#9)
    const [tokenAddress, setTokenAddress] = useState(() => saved.current?.tokenAddress || BANMAO_TOKEN as string);
    const [tokenSymbol, setTokenSymbol] = useState(() => saved.current?.tokenSymbol || "BANMAO");
    const [tokenDecimals, setTokenDecimals] = useState(() => saved.current?.tokenDecimals || 18);
    const [showTokenSelector, setShowTokenSelector] = useState(false);
    const [customTokenInput, setCustomTokenInput] = useState("");
    const [tokenLoading, setTokenLoading] = useState(false);

    // Saved custom tokens (localStorage)
    const STORAGE_TOKENS = "banmao_airdrop_saved_tokens";
    const [savedTokens, setSavedTokens] = useState<{address: string; symbol: string; decimals: number}[]>(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_TOKENS) || "[]"); } catch { return []; }
    });
    const saveTokenList = (list: typeof savedTokens) => { setSavedTokens(list); localStorage.setItem(STORAGE_TOKENS, JSON.stringify(list)); };
    const removeSavedToken = (addr: string) => { saveTokenList(savedTokens.filter(t => t.address.toLowerCase() !== addr.toLowerCase())); };
    const [savedTokenBalances, setSavedTokenBalances] = useState<Record<string, string>>({});
    const fetchTokenBalances = async () => {
        if (!address || savedTokens.length === 0) return;
        const RPC_URL = "https://rpc.xlayer.tech";
        const bals: Record<string, string> = {};
        for (const st of savedTokens) {
            try {
                const data = "0x70a08231" + address.slice(2).padStart(64, "0");
                const res = await fetch(RPC_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: st.address, data }, "latest"], id: 1 }) });
                const json = await res.json();
                if (json.result && json.result !== "0x") {
                    const raw = BigInt(json.result);
                    bals[st.address.toLowerCase()] = (Number(raw) / Math.pow(10, st.decimals)).toFixed(2);
                }
            } catch {}
        }
        setSavedTokenBalances(bals);
    };

    // QR Scanner state (#6)
    const [showQrScanner, setShowQrScanner] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<any>(null);

    // Scheduler state (#7)
    const [scheduledTime, setScheduledTime] = useState("");
    const [scheduleActive, setScheduleActive] = useState(false);
    const [scheduleCountdown, setScheduleCountdown] = useState("");
    const scheduleTimerRef = useRef<any>(null);

    // Holder scanning state
    const [holderChain, setHolderChain] = useState("196");
    const [hotTokens, setHotTokens] = useState<HotToken[]>([]);
    const [hotTokensLoading, setHotTokensLoading] = useState(false);
    const [selectedHotToken, setSelectedHotToken] = useState("");
    const [holderTokenInput, setHolderTokenInput] = useState("");
    const [holderTagFilter, setHolderTagFilter] = useState("");
    const [holderScanning, setHolderScanning] = useState(false);
    const [holderResults, setHolderResults] = useState<{address: string; amount: string}[]>([]);
    const [selectedHolders, setSelectedHolders] = useState<Set<string>>(new Set());
    const [holderMinBalance, setHolderMinBalance] = useState("");
    const [scanMode, setScanMode] = useState<"wallets" | "holders">("wallets");

    // Leaderboard & History state
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [lbStats, setLbStats] = useState<any>(null);
    // Analytics state (#12)
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [rightTab, setRightTab] = useState<"history" | "analytics">("history");
    // Profile editing state
    const AVATARS = ["🐱", "🦁", "🐯", "🐻", "🦊", "🐼", "🐲", "🦅"];
    const [profileMap, setProfileMap] = useState<Record<string, { name: string; avatar: number; telegram?: string; twitter?: string }>>({});
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: "", avatar: 0, telegram: "", twitter: "" });
    const [profileEditsLeft, setProfileEditsLeft] = useState(3);
    const [viewProfileAddr, setViewProfileAddr] = useState<string | null>(null);
    // Market data states
    const [tokenPrice, setTokenPrice] = useState<number>(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { data: banmaoBalance, refetch: refetchBalance } = useBalance({ address, token: tokenAddress as `0x${string}` });
    const { data: okbBalance } = useBalance({ address }); // Native OKB
    const { writeContractAsync } = useWriteContract();
    const okbNum = okbBalance ? parseFloat(okbBalance.formatted) : 0;

    // Batch mode: real-time allowance check
    const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, AIRDROP_CONTRACT] : undefined,
        query: { enabled: !!address && !!tokenAddress },
    } as any);
    const [batchStep, setBatchStep] = useState<"idle" | "approving" | "approved" | "sending">("idle");
    const cancelRef = useRef(false);
    const sendStartTimeRef = useRef(0);
    // Alert sound using Web Audio API
    const playAlert = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator(); const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'square'; osc.frequency.value = 800;
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
            // Second beep
            const osc2 = ctx.createOscillator(); const gain2 = ctx.createGain();
            osc2.connect(gain2); gain2.connect(ctx.destination);
            osc2.type = 'square'; osc2.frequency.value = 1000;
            gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.3);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            osc2.start(ctx.currentTime + 0.3); osc2.stop(ctx.currentTime + 0.8);
        } catch {}
    }, []);
    const configFileRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const scrollToPanel = () => { setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80); };

    // Auto-save session state
    useEffect(() => {
        if (step === "done") { clearSession(); return; }
        saveSession({
            activeTab, step, sendMode, amountMode, addressInput,
            parsedAddresses, amountPerWallet,
            customAmounts: Object.fromEntries(customAmounts),
            tokenAddress, tokenSymbol, tokenDecimals,
        });
    }, [step, activeTab, sendMode, amountMode, addressInput, parsedAddresses, amountPerWallet, customAmounts, tokenAddress, tokenSymbol, tokenDecimals]);

    // Auto-fetch leaderboard & history on mount
    useEffect(() => {
        fetch("/api/airdrop-records?type=leaderboard&limit=20").then(r => r.json()).then(d => {
            if (d.success) {
                setLeaderboardData(d.data);
                const addrs = (d.data as any[]).map((r: any) => r.address).filter(Boolean);
                addrs.forEach((addr: string) => {
                    fetch(`/api/burn-profiles?address=${addr}`).then(r => r.json()).then(pd => {
                        if (pd.success && pd.profile) {
                            setProfileMap(prev => ({ ...prev, [addr.toLowerCase()]: pd.profile }));
                        }
                    }).catch(() => {});
                });
            }
        }).catch(() => {});
        fetch("/api/airdrop-records?type=stats").then(r => r.json()).then(d => { if (d.success) setLbStats(d.data); }).catch(() => {});
        // Fetch ALL users' history
        setHistoryLoading(true);
        fetch("/api/airdrop-records?type=all-history&limit=50").then(r => r.json()).then(d => { if (d.success) setHistoryData(d.data); }).catch(() => {}).finally(() => setHistoryLoading(false));
        // #12 Fetch analytics
        fetch("/api/airdrop-records?type=analytics").then(r => r.json()).then(d => { if (d.success) setAnalyticsData(d.data); }).catch(() => {});
        // Auto-refresh history every 30s (#1 Realtime History)
        const histInterval = setInterval(() => {
            fetch("/api/airdrop-records?type=all-history&limit=50").then(r => r.json()).then(d => { if (d.success) setHistoryData(d.data); }).catch(() => {});
            fetch("/api/airdrop-records?type=stats").then(r => r.json()).then(d => { if (d.success) setLbStats(d.data); }).catch(() => {});
        }, 30000);
        return () => { clearInterval(histInterval); };
    }, []);
    // Fetch price for the currently selected token — re-runs when tokenAddress changes
    useEffect(() => {
        const fetchPrice = () => fetch(`/api/okx/price?tokenAddress=${tokenAddress}`).then(r => r.json()).then(d => { if (d.success) setTokenPrice(parseFloat(d.price) || 0); else setTokenPrice(0); }).catch(() => setTokenPrice(0));
        fetchPrice();
        const priceInterval = setInterval(fetchPrice, 60000);
        return () => clearInterval(priceInterval);
    }, [tokenAddress]);
    // Fetch my profile when address changes (no longer overrides history)
    useEffect(() => {
        if (address) {
            fetch(`/api/burn-profiles?address=${address}`).then(r => r.json()).then(d => {
                if (d.success && d.profile) {
                    setProfileMap(prev => ({ ...prev, [address.toLowerCase()]: d.profile }));
                    setProfileForm({ name: d.profile.name || "", avatar: Number(d.profile.avatar) || 0, telegram: d.profile.telegram || "", twitter: d.profile.twitter || "" });
                    setProfileEditsLeft(3 - (Number(d.profile.editCount) || 0));
                }
            }).catch(() => {});
        }
    }, [address]);
    const saveProfile = async () => {
        if (!address) return;
        try {
            const res = await fetch("/api/burn-profiles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, name: profileForm.name, avatar: profileForm.avatar, telegram: profileForm.telegram, twitter: profileForm.twitter }),
            });
            const d = await res.json();
            if (d.success) {
                setProfileMap(prev => ({ ...prev, [address.toLowerCase()]: d.profile }));
                setProfileEditsLeft(d.editsRemaining ?? (3 - (d.editCount || 0)));
                setShowProfileEdit(false);
                showToast(t("profileSaved") || "Profile saved!");
            } else {
                showToast(d.error || t("profileSaveFailed"));
            }
        } catch { showToast(t("profileSaveError")); }
    };

    // Toast helper — supports stacking, progress bar, close button
    const showToast = (msg: string) => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev.slice(-3), { id, msg, ts: Date.now() }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    };
    const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

    // Load storage
    const STORAGE_PROGRESS = "banmao_airdrop_progress";
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [resumeData, setResumeData] = useState<{ results: SendResult[]; entries: RecipientEntry[]; timestamp: number } | null>(null);
    useEffect(() => {
        setHistory(loadStorage<HistoryEntry[]>(STORAGE_HISTORY, []));
        setAddressBook(loadStorage<AddressGroup[]>(STORAGE_BOOK, []));
        setTemplates(loadStorage<AirdropTemplate[]>(STORAGE_TEMPLATES, []));
        const bl = loadStorage<string[]>(STORAGE_BLACKLIST, []);
        setBlacklist(new Set(bl.map(a => a.toLowerCase())));
        setBlacklistInput(bl.join("\n"));
        // #2: Check for unfinished session
        try {
            const prog = JSON.parse(localStorage.getItem(STORAGE_PROGRESS) || "null");
            if (prog && prog.results && prog.entries && prog.entries.length > 0) {
                const successAddrs = new Set(prog.results.filter((r: SendResult) => r.success).map((r: SendResult) => r.address.toLowerCase()));
                const remaining = prog.entries.filter((e: RecipientEntry) => !successAddrs.has(e.address.toLowerCase()));
                if (remaining.length > 0) {
                    setResumeData(prog);
                    setShowResumePrompt(true);
                }
            }
        } catch {}
    }, []);

    // Parse addresses (with blacklist filtering)
    const parseAddresses = useCallback((input: string) => {
        if (!input.trim()) { setParsedAddresses([]); setInvalidAddresses([]); setDuplicateCount(0); setDuplicateAddresses([]); setCustomAmounts(new Map()); return; }
        const lines = input.split(/[\n;]+/).map(s => s.trim()).filter(Boolean);
        const valid: string[] = [], invalid: string[] = [], seen = new Set<string>(), amounts = new Map<string, string>(), dupeList: string[] = [];
        let dupes = 0;
        for (const line of lines) {
            const parts = line.split(/[,\t\s]+/);
            const addrStr = parts.find(p => /0x[a-fA-F0-9]{40}/.test(p));
            if (addrStr) {
                const match = addrStr.match(/0x[a-fA-F0-9]{40}/);
                if (match) {
                    const norm = match[0].toLowerCase();
                    if (norm === address?.toLowerCase()) continue;
                    if (blacklist.has(norm)) continue; // Skip blacklisted
                    if (seen.has(norm)) { dupeList.push(match[0]); continue; }
                    seen.add(norm);
                    if (isAddress(match[0])) {
                        valid.push(match[0]);
                        const amt = parts.find(p => p !== addrStr && /^\d+(\.\d+)?$/.test(p));
                        if (amt) amounts.set(norm, amt);
                    } else invalid.push(line);
                }
            } else if (line.startsWith("0x")) invalid.push(line);
        }
        setParsedAddresses(valid); setInvalidAddresses(invalid); setDuplicateCount(dupeList.length); setDuplicateAddresses(dupeList); setCustomAmounts(amounts);
    }, [address, blacklist]);

    useEffect(() => { parseAddresses(addressInput); }, [addressInput, parseAddresses]);

    // Recipients
    const getEntries = useCallback((): RecipientEntry[] => {
        const addrs = activeTab === "scan" ? Array.from(selectedWallets) : parsedAddresses;
        return addrs.map(a => ({
            address: a,
            amount: amountMode === "custom" && customAmounts.has(a.toLowerCase())
                ? customAmounts.get(a.toLowerCase())! : amountPerWallet,
        }));
    }, [activeTab, parsedAddresses, selectedWallets, amountMode, customAmounts, amountPerWallet]);

    const recipientEntries = getEntries();
    const recipients = recipientEntries.map(r => r.address);
    const amountNum = parseFloat(amountPerWallet) || 0;
    const totalAmount = amountMode === "custom"
        ? recipientEntries.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
        : amountNum * recipients.length;
    const balanceNum = banmaoBalance ? parseFloat(banmaoBalance.formatted) : 0;
    const hasEnough = balanceNum >= totalAmount && totalAmount > 0;

    // Remove a single recipient by address
    const removeRecipient = (addr: string) => {
        const norm = addr.toLowerCase();
        if (activeTab === "scan") {
            setSelectedWallets(prev => { const next = new Set(prev); next.delete(addr); next.delete(norm); for (const w of prev) { if (w.toLowerCase() === norm) next.delete(w); } return next; });
        } else {
            // Remove from addressInput text
            const lines = addressInput.split(/\n/);
            const filtered = lines.filter(l => !l.toLowerCase().includes(norm));
            setAddressInput(filtered.join("\n"));
        }
        // Also add to blacklist
        setBlacklist(prev => { const next = new Set(prev); next.add(norm); return next; });
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_BLACKLIST) || "[]");
            if (!stored.includes(norm)) stored.push(norm);
            localStorage.setItem(STORAGE_BLACKLIST, JSON.stringify(stored));
        } catch(e) {}
        showToast(`🗑️ ${addr.slice(0, 8)}...${addr.slice(-4)} — ${t("autoRemoved")}`);
    };

    // Gas estimation
    useEffect(() => {
        if (recipients.length > 0) {
            let gasUnits: number;
            if (sendMode === "batch") {
                // Batch mode: base overhead + per-recipient cost, split into chunks
                const chunks = Math.ceil(recipients.length / MAX_BATCH_SIZE);
                const avgPerChunk = Math.ceil(recipients.length / chunks);
                gasUnits = chunks * (GAS_BATCH_BASE + avgPerChunk * GAS_PER_BATCH_RECIPIENT);
            } else if (typeof sendMode === "number" && sendMode > 1) {
                // Parallel mode: same gas as sequential
                gasUnits = recipients.length * GAS_PER_TRANSFER;
            } else {
                // Sequential x1
                gasUnits = recipients.length * GAS_PER_TRANSFER;
            }
            const cost = (gasUnits * GAS_PRICE_GWEI) / 1e9;
            setEstimatedGas(`~${cost.toFixed(8).replace(/0+$/, '').replace(/\.$/, '')} OKB`);
        } else setEstimatedGas("");
    }, [recipients.length, sendMode]);

    // -- Handlers --
    // Cursor for paginated XLayer scanning
    const scanCursorRef = useRef<string | null>(null);

    const handleScan = async () => {
        playClick(); setIsScanning(true); setScanError("");
        try {
            let apiUrl: string;
            if (scanChain === "xlayer") {
                // Build paginated URL with cursor + skip list from ref (always latest)
                const skipAddrs = scannedWalletsRef.current.map(w => w.address.toLowerCase()).join(",");
                const cursorParam = scanCursorRef.current ? `&cursor=${scanCursorRef.current}` : "";
                const skipParam = skipAddrs ? `&skip=${skipAddrs}` : "";
                const tokenParam = `&tokenAddress=${tokenAddress}&tokenDecimals=${tokenDecimals}`;
                apiUrl = `/api/scan-wallets?refresh=true${cursorParam}${skipParam}${tokenParam}`;
            } else {
                apiUrl = `/api/scan-wallets-multichain?chain=${scanChain}&refresh=true`;
            }
            const res = await fetch(apiUrl);
            const data = await res.json();
            if (data.success) {
                // Save cursor for next page (XLayer only)
                if (scanChain === "xlayer") {
                    scanCursorRef.current = data.cursor || null;
                    // #3 Scan Progress Bar
                    if (data.scannedRange && data.latestBlock) {
                        const scannedSoFar = data.latestBlock - data.scannedRange.from;
                        setScanProgress({ scannedBlocks: scannedSoFar, totalBlocks: 50000, walletsFound: scannedWalletsRef.current.length + (data.wallets?.length || 0) });
                    }
                }

                let newWallets = (data.wallets || []).filter((w: any) => w.address.toLowerCase() !== address?.toLowerCase());
                
                // Frontend re-verify: check selected token balance on-chain
                if (newWallets.length > 0) {
                    const RPC = "https://rpc.xlayer.tech";
                    const filterTokenAddr = (tokenAddress as string).toLowerCase();
                    const verifyResults = await Promise.all(
                        newWallets.map(async (w: ScannedWallet) => {
                            try {
                                const callData = "0x70a08231" + w.address.slice(2).toLowerCase().padStart(64, "0");
                                const r = await fetch(RPC, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: filterTokenAddr, data: callData }, "latest"], id: 1 }) });
                                const j = await r.json();
                                const bal = BigInt(j.result || "0x0");
                                return { wallet: w, hasToken: bal > BigInt(0), tokenBalance: Number(bal) / (10 ** tokenDecimals) };
                            } catch { return { wallet: w, hasToken: false, tokenBalance: 0 }; }
                        })
                    );
                    const holdersRemoved = verifyResults.filter(v => v.hasToken).length;
                    newWallets = verifyResults.filter(v => !v.hasToken).map(v => v.wallet);
                    if (holdersRemoved > 0) {
                        showToast(`🔍 ${holdersRemoved} ${(t("scanFilteredBanmao") || "wallets filtered (already hold {token})").replace(/\$BANMAO|\{token\}/g, `$${tokenSymbol}`)}`);
                    }
                }

                if (!newWallets.length && scannedWalletsRef.current.length === 0) { 
                    // If no cursor left, we've scanned all blocks
                    if (scanChain === "xlayer" && !scanCursorRef.current) {
                        setScanError(t("airdropNoWalletsFound"));
                    } else {
                        // More pages available, show "no new wallets this page"
                        showToast(`${t("airdropNoNewWallets")} — ${data.scannedRange ? `blocks ${data.scannedRange.from}-${data.scannedRange.to}` : ""}`);
                    }
                } else {
                    // Accumulate & deduplicate using functional updater (GUARANTEED latest state)
                    const walletsToAdd = newWallets; // capture for closure
                    setScannedWallets(prev => {
                        const existingMap = new Map(prev.map(w => [w.address.toLowerCase(), w]));
                        let added = 0;
                        for (const w of walletsToAdd) {
                            const key = w.address.toLowerCase();
                            if (!existingMap.has(key)) { existingMap.set(key, w); added++; }
                        }
                        const merged = Array.from(existingMap.values());
                        // Sync ref immediately
                        scannedWalletsRef.current = merged;
                        if (added > 0) {
                            const rangeInfo = data.scannedRange ? ` [${data.scannedRange.from}-${data.scannedRange.to}]` : "";
                            showToast(`+${added} ${t("airdropNewWalletsFound")} (${merged.length} ${t("airdropScanCount")})${rangeInfo}`);
                        } else {
                            showToast(t("airdropNoNewWallets"));
                        }
                        return merged;
                    });
                    setScanCount(prev => prev + 1);
                }
            } else setScanError(data.error || t("airdropScanFailed"));
        } catch { setScanError(t("airdropScanFailed")); }
        finally { setIsScanning(false); }
    };

    const clearScanned = () => {
        playClick(); scannedWalletsRef.current = []; setScannedWallets([]); setSelectedWallets(new Set()); setScanCount(0);
        scanCursorRef.current = null; // Reset cursor
        stopAutoScan();
    };

    const startAutoScan = () => {
        autoScanRef.current = true;
        setAutoScanActive(true);
        runAutoScanLoop();
    };
    const stopAutoScan = () => {
        autoScanRef.current = false;
        setAutoScanActive(false);
    };
    const runAutoScanLoop = async () => {
        while (autoScanRef.current) {
            await handleScan();
            // For XLayer: if cursor is null, we've scanned all 50K blocks — reset to scan from latest block again
            if (scanChain === "xlayer" && !scanCursorRef.current) {
                showToast(t("airdropScanCycleComplete") || "🔄 Scan cycle complete — restarting from latest block...");
                scanCursorRef.current = null; // reset so next handleScan starts from latestBlock
                // Wait 5 seconds before restarting to avoid hammering RPC
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }
            // Wait 2 seconds between pages
            await new Promise(r => setTimeout(r, 2000));
        }
    };

    const toggleWallet = (addr: string) => {
        const s = new Set(selectedWallets); s.has(addr) ? s.delete(addr) : s.add(addr); setSelectedWallets(s);
    };

    const handleCSVFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const entries = parseCSVContent(e.target?.result as string);
            if (entries.length) {
                setAddressInput(entries.map(e => e.amount ? `${e.address},${e.amount}` : e.address).join("\n"));
                setActiveTab("manual");
                showToast(`${entries.length} ${t("addressesImported")}`);
            } else playError();
        };
        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setCsvDragOver(false); if (e.dataTransfer.files[0]) handleCSVFile(e.dataTransfer.files[0]); };

    const saveToBook = () => {
        if (!newGroupName.trim() || !parsedAddresses.length) return;
        playClick();
        const updated = [...addressBook, { name: newGroupName.trim(), addresses: parsedAddresses, createdAt: Date.now() }];
        setAddressBook(updated); saveStorage(STORAGE_BOOK, updated); setNewGroupName("");
        showToast(t("airdropCopiedClipboard"));
    };

    const loadFromBook = (g: AddressGroup) => { playClick(); setAddressInput(g.addresses.join("\n")); setActiveTab("manual"); setShowBook(false); };
    const deleteFromBook = (i: number) => { playClick(); const u = addressBook.filter((_, idx) => idx !== i); setAddressBook(u); saveStorage(STORAGE_BOOK, u); };

    // Blacklist
    const saveBlacklist = (input: string) => {
        setBlacklistInput(input);
        const addrs = input.split(/[\n,;]+/).map(s => s.trim()).filter(s => /^0x[a-fA-F0-9]{40}$/.test(s));
        setBlacklist(new Set(addrs.map(a => a.toLowerCase())));
        saveStorage(STORAGE_BLACKLIST, addrs);
    };

    // Templates
    const saveTemplate = () => {
        if (!newTemplateName.trim()) return;
        playClick();
        const tmpl: AirdropTemplate = { name: newTemplateName.trim(), amount: amountPerWallet, amountMode, createdAt: Date.now() };
        const updated = [...templates, tmpl];
        setTemplates(updated); saveStorage(STORAGE_TEMPLATES, updated); setNewTemplateName("");
        showToast(t("templateSaved"));
    };
    const loadTemplate = (tmpl: AirdropTemplate) => {
        playClick(); setAmountPerWallet(tmpl.amount); setAmountMode(tmpl.amountMode); setShowTemplates(false);
        showToast(t("templateLoaded"));
    };
    const deleteTemplate = (i: number) => { playClick(); const u = templates.filter((_, idx) => idx !== i); setTemplates(u); saveStorage(STORAGE_TEMPLATES, u); };

    const copyText = async (text: string) => {
        try { await navigator.clipboard.writeText(text); } catch {
            const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;left:-9999px";
            document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
        }
    };

    // Auto-retry helper with exponential backoff
    const sendWithRetry = async (entry: RecipientEntry, retries = MAX_RETRIES): Promise<SendResult> => {
        const wei = parseUnits(entry.amount || "0", tokenDecimals);
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const hash = await writeContractAsync({ address: tokenAddress as `0x${string}`, abi: ERC20_ABI, functionName: "transfer", args: [entry.address as `0x${string}`, wei] } as any);
                return { address: entry.address, amount: entry.amount, success: true, txHash: hash };
            } catch (err: any) {
                const msg = err?.shortMessage || err?.message || "Failed";
                // Auto-detect OKX "Legal risk" flagged address
                const flagMatch = msg.match(/(?:legal\s*risk|risk\s*associated)[\s\S]*?(0x[a-fA-F0-9]{40})/i);
                if (flagMatch) {
                    const flaggedAddr = flagMatch[1].toLowerCase();
                    setBlacklist(prev => { const next = new Set(prev); next.add(flaggedAddr); return next; });
                    showToast(`🚫 ${entry.address.slice(0, 8)}...${entry.address.slice(-4)} — ${t("legalRiskDetected") || "Legal risk detected, auto-removed"}`);
                    return { address: entry.address, amount: entry.amount, success: false, error: `⚠️ OKX Legal Risk — ${t("autoBlacklisted") || "auto-blacklisted"}` };
                }
                // Only retry nonce errors
                if (msg.includes("nonce") && attempt < retries) {
                    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt))); // 1s, 2s, 4s
                    continue;
                }
                return { address: entry.address, amount: entry.amount, success: false, error: translateError(msg, t) };
            }
        }
        return { address: entry.address, amount: entry.amount, success: false, error: translateError("Max retries", t) };
    };

    // Execute
    const executeAirdrop = async (retryEntries?: RecipientEntry[]) => {
        if (!isConnected || !address) return;
        const fresh = await refetchBalance();
        const freshBal = fresh.data ? parseFloat(formatUnits(fresh.data.value, fresh.data.decimals)) : 0;
        const entries = retryEntries || recipientEntries;
        const needed = entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        if (freshBal < needed) { playError(); showToast(`${t("airdropInsufficientBalance")} (${formatNum(freshBal)} < ${formatNum(needed)})`); return; }

        // OKB gas check
        const gasUnits = sendMode === "batch"
            ? (GAS_BATCH_BASE + entries.length * GAS_PER_BATCH_RECIPIENT) * Math.ceil(entries.length / MAX_BATCH_SIZE)
            : entries.length * GAS_PER_TRANSFER;
        const gasNeeded = (gasUnits * GAS_PRICE_GWEI) / 1e9;
        if (okbNum < gasNeeded) {
            playError();
            showToast(`${t("errInsufficientGas")} (${okbNum.toFixed(8)} < ${gasNeeded.toFixed(8)} OKB)`);
            return;
        }

        playClick(); setStep("sending"); setIsSending(true); setSendProgress(0); setSendTotal(entries.length); scrollToPanel();
        cancelRef.current = false;
        sendStartTimeRef.current = Date.now();
        // #2: Save progress for resume
        try { localStorage.setItem(STORAGE_PROGRESS, JSON.stringify({ entries, results: [], timestamp: Date.now() })); } catch {}
        if (!retryEntries) setSendResults([]);
        const results: SendResult[] = retryEntries ? [...sendResults.filter(r => r.success)] : [];
        let stopped = false;

        // ========== BATCH MODE (1 TX via smart contract) ==========
        if (sendMode === "batch") {
            setCurrentSendingAddress(t("batchApproving") || "Approving contract...");
            try {
                // Step 1: Calculate totalWei precisely using BigInt
                let totalWei = BigInt(0);
                if (amountMode === "equal") {
                    const perWei = parseUnits(amountPerWallet || "0", tokenDecimals);
                    totalWei = perWei * BigInt(entries.length);
                } else {
                    for (const e of entries) {
                        totalWei += parseUnits(e.amount || "0", tokenDecimals);
                    }
                }

                // Smart Approve: check reactive allowance (already approved from UI step)
                const currentAllow = BigInt(currentAllowance?.toString() || "0");
                if (currentAllow < totalWei) {
                    // Shouldn't reach here if user followed 2-step UI, but handle edge case
                    setCurrentSendingAddress(t("batchApproving") || "Approving contract...");
                    showToast(t("batchApprovePrompt") || "Please approve the contract...");
                    await writeContractAsync({
                        address: tokenAddress as `0x${string}`,
                        abi: ERC20_ABI,
                        functionName: "approve",
                        args: [AIRDROP_CONTRACT, totalWei],
                    } as any);
                    await refetchAllowance();
                } else {
                    showToast(t("batchAllowanceSufficient") || "Allowance verified ✓");
                }

                // Step 2: Send batch
                setCurrentSendingAddress(t("batchSending") || "Sending batch transaction...");
                setSendProgress(Math.floor(entries.length / 2));

                // Split into chunks of MAX_BATCH_SIZE
                for (let chunk = 0; chunk < entries.length; chunk += batchSizeConfig) {
                    let batch = entries.slice(chunk, chunk + batchSizeConfig);
                    // #5: Real-time balance check per batch
                    const chunkNeeded = batch.reduce((s, e) => s + (parseFloat(e.amount) || (parseFloat(amountPerWallet) || 0)), 0);
                    try {
                        const freshBal2 = await refetchBalance();
                        const curBal = freshBal2.data ? parseFloat(formatUnits(freshBal2.data.value, freshBal2.data.decimals)) : 0;
                        if (curBal < chunkNeeded) {
                            playAlert();
                            showToast(`⚠️ ${t("airdropInsufficientBalance")}: ${formatNum(curBal)} < ${formatNum(chunkNeeded)}`);
                            break;
                        }
                    } catch {}
                    const isEqual = amountMode === "equal";
                    let hash: string | null = null;
                    let retries = 0;
                    const MAX_FLAG_RETRIES = 20; // max flagged addresses to skip per chunk
                    let consecutiveRejects = 0;

                    while (!hash && retries < MAX_FLAG_RETRIES) {
                        try {
                            const addrs = batch.map(e => e.address as `0x${string}`);
                            if (isEqual) {
                                const amtWei = parseUnits(amountPerWallet || "0", tokenDecimals);
                                hash = await writeContractAsync({
                                    address: AIRDROP_CONTRACT,
                                    abi: BATCH_ABI,
                                    functionName: "batchTransferEqual",
                                    args: [tokenAddress as `0x${string}`, addrs, amtWei],
                                } as any);
                            } else {
                                const amts = batch.map(e => parseUnits(e.amount || "0", tokenDecimals));
                                hash = await writeContractAsync({
                                    address: AIRDROP_CONTRACT,
                                    abi: BATCH_ABI,
                                    functionName: "batchTransfer",
                                    args: [tokenAddress as `0x${string}`, addrs, amts],
                                } as any);
                            }
                        } catch (batchErr: any) {
                            const errMsg = batchErr?.shortMessage || batchErr?.message || "";
                            const errDetails = batchErr?.details || batchErr?.cause?.message || batchErr?.cause?.shortMessage || batchErr?.cause?.details || batchErr?.info?.error?.message || "";
                            const allErrText = errMsg + " " + errDetails;
                            console.log("[Airdrop] errMsg:", errMsg, "| errDetails:", errDetails);
                            // Auto-detect OKX "Legal risk" flagged addresses — multiple patterns
                            const flagPatterns = [
                                /(?:legal\s*risk|risk\s*associated)[\s\S]*?(0x[a-fA-F0-9]{40})/i,
                                /receiving\s*address\s*\(?(0x[a-fA-F0-9]{40})\)?/i,
                                /Unable\s*to\s*initiate[\s\S]*?(0x[a-fA-F0-9]{40})/i,
                            ];
                            let flaggedAddr: string | null = null;
                            for (const pattern of flagPatterns) {
                                const m = allErrText.match(pattern);
                                if (m) { flaggedAddr = m[1].toLowerCase(); break; }
                            }
                            const isLegalRisk = /legal\s*risk|risk\s*associated|unable\s*to\s*initiate/i.test(allErrText);
                            const isUserReject = /rejected|denied/i.test(errMsg);

                            // Strategy 1: Auto-detected flagged address from error
                            if (flaggedAddr) {
                                setBlacklist(prev => { const next = new Set(prev); next.add(flaggedAddr!); return next; });
                                batch = batch.filter(e => e.address.toLowerCase() !== flaggedAddr);
                                results.push({ address: flaggedAddr, amount: amountPerWallet || "0", success: false, error: `⚠️ OKX Legal Risk — ${t("autoBlacklisted") || "auto-blacklisted"}` });
                                setSendResults([...results]);
                                showToast(`🚫 ${flaggedAddr.slice(0, 8)}...${flaggedAddr.slice(-4)} — ${t("legalRiskDetected") || "Legal risk detected, auto-removed"}`);
                                // Save blacklist to storage
                                saveStorage(STORAGE_BLACKLIST, [...blacklist, flaggedAddr]);
                                consecutiveRejects = 0;
                                retries++;
                                if (batch.length === 0) break;
                                continue;
                            }

                            // Strategy 2: User rejected — show modal with paste OR auto-detect options
                            if (isUserReject || isLegalRisk) {
                                console.log("[Airdrop] STRATEGY 2: Showing modal (batch=" + batch.length + ")");
                                playAlert(); // Sound notification for user attention
                                const flagLabels = {
                                    title: t("flagModalTitle"), desc: t("flagModalDesc"),
                                    batch: t("flagModalBatch"), addresses: t("flagModalAddresses"),
                                    stop: t("flagModalStop"), autoDetect: t("flagModalAutoDetect"), remove: t("flagModalRemove"),
                                    search: t("searchWallet"),
                                };
                                const userInput = await askFlaggedAddress(entries.length, flagLabels, entries.map(e => e.address));
                                console.log("[Airdrop] Modal result:", userInput);

                                // Option A: User pasted a specific address
                                if (userInput && userInput !== "AUTO") {
                                    const addrMatch = userInput.match(/(0x[a-fA-F0-9]{40})/);
                                    if (addrMatch) {
                                        const pastedAddr = addrMatch[1].toLowerCase();
                                        const inBatch = batch.some(e => e.address.toLowerCase() === pastedAddr);
                                        if (inBatch) {
                                            setBlacklist(prev => { const next = new Set(prev); next.add(pastedAddr); return next; });
                                            try {
                                                const stored = JSON.parse(localStorage.getItem(STORAGE_BLACKLIST) || "[]");
                                                if (!stored.includes(pastedAddr)) stored.push(pastedAddr);
                                                localStorage.setItem(STORAGE_BLACKLIST, JSON.stringify(stored));
                                            } catch(e) {}
                                            batch = batch.filter(e => e.address.toLowerCase() !== pastedAddr);
                                            results.push({ address: pastedAddr, amount: amountPerWallet || "0", success: false, error: `⚠️ OKX Legal Risk — ${t("autoBlacklisted") || "auto-blacklisted"}` });
                                            setSendResults([...results]);
                                            showToast(`🚫 ${pastedAddr.slice(0, 8)}...${pastedAddr.slice(-4)} — ${t("autoRemoved")}`);
                                            consecutiveRejects = 0;
                                            retries++;
                                            if (batch.length === 0) break;
                                            continue;
                                        } else {
                                            showToast(`❌ ${t("addressNotInBatch")}`);
                                        }
                                    }
                                }

                                // Option B: Auto-detect via binary search
                                if (userInput === "AUTO") {
                                    showToast(`🔍 ${t("autoDetecting")}... (${batch.length} ${t("flagModalAddresses")})`);
                                    // Binary search: recursively split batch until we find the single flagged address
                                    const isolateFlagged = async (candidates: typeof batch): Promise<string | null> => {
                                        if (candidates.length === 0) return null;
                                        if (candidates.length === 1) return candidates[0].address.toLowerCase();
                                        const mid = Math.ceil(candidates.length / 2);
                                        const firstHalf = candidates.slice(0, mid);
                                        const secondHalf = candidates.slice(mid);
                                        // Try first half
                                        try {
                                            const addrs = firstHalf.map(e => e.address as `0x${string}`);
                                            if (isEqual) {
                                                const amtWei = parseUnits(amountPerWallet || "0", tokenDecimals);
                                                await writeContractAsync({
                                                    address: AIRDROP_CONTRACT, abi: BATCH_ABI,
                                                    functionName: "batchTransferEqual",
                                                    args: [tokenAddress as `0x${string}`, addrs, amtWei],
                                                } as any);
                                            } else {
                                                const amts = firstHalf.map(e => parseUnits(e.amount, tokenDecimals));
                                                await writeContractAsync({
                                                    address: AIRDROP_CONTRACT, abi: BATCH_ABI,
                                                    functionName: "batchTransfer",
                                                    args: [tokenAddress as `0x${string}`, addrs, amts],
                                                } as any);
                                            }
                                            // First half succeeded → flagged is in second half
                                            showToast(`✅ ${t("firstHalfOK")} (${firstHalf.length}/${secondHalf.length})...`);
                                            return await isolateFlagged(secondHalf);
                                        } catch (e: any) {
                                            const msg = e?.shortMessage || e?.message || "";
                                            if (/rejected|denied/i.test(msg)) {
                                                // First half rejected → flagged is in first half
                                                showToast(`⚠️ ${t("flaggedInFirstHalf")} (${firstHalf.length})...`);
                                                return await isolateFlagged(firstHalf);
                                            }
                                            // Other error → try second half
                                            return await isolateFlagged(secondHalf);
                                        }
                                    };
                                    const foundAddr = await isolateFlagged(batch);
                                    if (foundAddr) {
                                        setBlacklist(prev => { const next = new Set(prev); next.add(foundAddr); return next; });
                                        try {
                                            const stored = JSON.parse(localStorage.getItem(STORAGE_BLACKLIST) || "[]");
                                            if (!stored.includes(foundAddr)) stored.push(foundAddr);
                                            localStorage.setItem(STORAGE_BLACKLIST, JSON.stringify(stored));
                                        } catch(e) {}
                                        batch = batch.filter(e => e.address.toLowerCase() !== foundAddr);
                                        results.push({ address: foundAddr, amount: amountPerWallet || "0", success: false, error: `⚠️ ${t("autoDetected")} — ${t("autoBlacklistedResult")}` });
                                        setSendResults([...results]);
                                        showToast(`🚫 ${t("autoDetected")}: ${foundAddr.slice(0, 8)}...${foundAddr.slice(-4)} — ${t("autoBlacklistedResult")}!`);
                                        consecutiveRejects = 0;
                                        retries++;
                                        if (batch.length === 0) break;
                                        continue;
                                    }
                                }

                                // Option C: User cancelled → stop
                                showToast(`⚠️ ${t("airdropStoppedByUser") || "Airdrop paused"}`);
                                throw batchErr;
                            }

                            // Unknown error — retry once, then fail this chunk
                            if (retries < 2) {
                                retries++;
                                await new Promise(r => setTimeout(r, 2000));
                                continue;
                            }
                            for (const e of batch) {
                                results.push({ address: e.address, amount: e.amount, success: false, error: translateError(errMsg, t) });
                            }
                            setSendResults([...results]);
                            showToast(`❌ ${t("batchChunkFailed") || "Batch chunk failed"} — ${batch.length} ${t("airdropWallets") || "wallets"}`);
                            break;
                        }
                    }

                    // Record results for successfully sent batch
                    if (hash) {
                        for (const e of batch) {
                            results.push({ address: e.address, amount: e.amount, success: true, txHash: hash });
                        }
                    }
                    setSendResults([...results]);
                    setSendProgress(Math.min(chunk + MAX_BATCH_SIZE, entries.length));
                }
            } catch (err: any) {
                const msg = err?.shortMessage || err?.message || "Batch failed";
                // Mark all unsent entries as failed
                const sentAddrs = new Set(results.map(r => r.address.toLowerCase()));
                for (const e of entries) {
                    if (!sentAddrs.has(e.address.toLowerCase())) {
                        results.push({ address: e.address, amount: e.amount, success: false, error: translateError(msg, t) });
                    }
                }
                setSendResults([...results]);
            }
        }
        // ========== PARALLEL MODE (x3/x5/x10/x20) ==========
        else if (sendMode > 1) {
            const BS = sendMode as number;
            for (let b = 0; b < entries.length && !stopped; b += BS) {
                if (cancelRef.current) { stopped = true; break; }
                const batch = entries.slice(b, b + BS);
                setCurrentSendingAddress(`${b + 1}–${Math.min(b + BS, entries.length)}`);
                setSendProgress(b);
                const settled = await Promise.allSettled(batch.map(entry => sendWithRetry(entry)));
                for (const r of settled) {
                    if (r.status === "fulfilled") {
                        results.push(r.value);
                        if (!r.value.success && r.value.error && /rejected|denied/i.test(r.value.error)) stopped = true;
                    }
                }
                setSendResults([...results]); saveStorage("banmao_airdrop_temp", results);
                try { localStorage.setItem(STORAGE_PROGRESS, JSON.stringify({ entries, results, timestamp: Date.now() })); } catch {}
                setSendProgress(Math.min(b + BS, entries.length));
            }
        }
        // ========== SEQUENTIAL MODE (x1) ==========
        else {
            for (let i = 0; i < entries.length; i++) {
                if (cancelRef.current) break;
                const entry = entries[i]; setCurrentSendingAddress(entry.address); setSendProgress(i);
                const result = await sendWithRetry(entry);
                results.push(result);
                if (!result.success && result.error && /rejected|denied/i.test(result.error)) break;
                setSendResults([...results]); saveStorage("banmao_airdrop_temp", results);
                try { localStorage.setItem(STORAGE_PROGRESS, JSON.stringify({ entries, results, timestamp: Date.now() })); } catch {}
            }
        }

        setSendProgress(entries.length); setIsSending(false); setStep("done"); scrollToPanel();
        // #2: Clear progress on completion
        try { localStorage.removeItem(STORAGE_PROGRESS); } catch {}
        const sc = results.filter(r => r.success).length;
        const ts = results.filter(r => r.success).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const he: HistoryEntry = { id: Date.now().toString(), timestamp: Date.now(), totalRecipients: entries.length, successCount: sc, failCount: results.filter(r => !r.success).length, totalSent: formatNum(ts), amountPerWallet: amountMode === "equal" ? amountPerWallet : "custom", results };
        const uh = [he, ...history].slice(0, 50); setHistory(uh); saveStorage(STORAGE_HISTORY, uh);
        localStorage.removeItem("banmao_airdrop_temp");
        if (sc > 0) {
            playSuccess();
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#f97316", "#a855f7", "#22c55e", "#3b82f6"] });
            // Save to backend for leaderboard
            try {
                // Group results by txHash for accurate per-TX counts
                const txMap = new Map<string, { count: number; amount: number; failed: number }>();
                for (const r of results) {
                    if (r.txHash) {
                        const existing = txMap.get(r.txHash) || { count: 0, amount: 0, failed: 0 };
                        if (r.success) {
                            existing.count++;
                            existing.amount += parseFloat(r.amount) || 0;
                        } else {
                            existing.failed++;
                        }
                        txMap.set(r.txHash, existing);
                    }
                }
                const txBreakdown = Array.from(txMap.entries()).map(([hash, data]) => ({
                    txHash: hash,
                    recipientCount: data.count + data.failed,
                    successCount: data.count,
                    failedCount: data.failed,
                    totalAmount: String(BigInt(Math.floor(data.amount * 1e18))),
                }));
                fetch("/api/airdrop-records", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        txBreakdown,
                        sender: address,
                        tokenAddress,
                        tokenSymbol,
                        mode: String(sendMode),
                        chain: "196",
                    }),
                }).then(() => {
                    // #1: Refresh leaderboard & history after airdrop
                    const oldRank = leaderboardData.findIndex((r: any) => r.address?.toLowerCase() === address?.toLowerCase()) + 1;
                    fetch("/api/airdrop-records?type=leaderboard&limit=20").then(r => r.json()).then(d => {
                        if (d.success) {
                            setLeaderboardData(d.data);
                            // #8: Rank change notification
                            const newRank = d.data.findIndex((r: any) => r.address?.toLowerCase() === address?.toLowerCase()) + 1;
                            if (newRank > 0 && oldRank > 0 && newRank < oldRank) showToast(`\ud83d\ude80 ${t("rankUp") || "Rank up!"} #${oldRank} → #${newRank}`);
                            else if (newRank === 1 && oldRank !== 1) showToast(`\ud83c\udfc6 ${t("rankFirst") || "You're #1 on the leaderboard!"}`);
                            else if (newRank > 0 && oldRank === 0) showToast(`\u2b50 ${t("rankJoined") || "You joined the leaderboard at"} #${newRank}!`);
                        }
                    }).catch(() => {});
                    fetch("/api/airdrop-records?type=stats").then(r => r.json()).then(d => { if (d.success) setLbStats(d.data); }).catch(() => {});
                    if (address) fetch(`/api/airdrop-records?type=history&address=${address}&limit=30`).then(r => r.json()).then(d => { if (d.success) setHistoryData(d.data); }).catch(() => {});
                }).catch(() => {});
            } catch {}
        } else playError();
    };

    const retryFailed = () => { const f = sendResults.filter(r => !r.success); if (f.length) executeAirdrop(f.map(r => ({ address: r.address, amount: r.amount }))); };
    const exportResults = () => { playClick(); downloadFile(generateResultCSV(sendResults), `banmao_airdrop_${Date.now()}.csv`); showToast("CSV exported!"); };
    const shareResults = () => {
        playClick();
        const sc = sendResults.filter(r => r.success).length, fc = sendResults.filter(r => !r.success).length;
        const ts = sendResults.filter(r => r.success).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const txHashes = sendResults.filter(r => r.success && r.txHash).map(r => r.txHash!);
        const dateStr = new Date().toLocaleString();
        const modeStr = sendMode === "batch" ? "Batch 1TX" : `x${sendMode}`;

        // Generate canvas image
        const W = 800, rowH = 32, headerH = 100, footerH = 50;
        const txRows = Math.min(txHashes.length, 10);
        const H = headerH + (8 * rowH) + (txRows * rowH) + footerH + 20;
        const canvas = document.createElement("canvas");
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext("2d")!;

        // Background gradient
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, "#0f0b2e"); bg.addColorStop(0.5, "#1a1145"); bg.addColorStop(1, "#0d0925");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        // Border glow
        ctx.strokeStyle = "rgba(249, 115, 22, 0.3)"; ctx.lineWidth = 2;
        ctx.roundRect(10, 10, W - 20, H - 20, 16); ctx.stroke();

        // Header
        ctx.fillStyle = "#f97316"; ctx.font = "bold 28px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`🪂 ${t("receiptTitle") || "Airdrop Receipt"}`, W / 2, 50);
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "13px 'Segoe UI', sans-serif";
        ctx.fillText("banmao.fun/defi/airdrop", W / 2, 75);

        // Divider
        ctx.strokeStyle = "rgba(249, 115, 22, 0.15)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(30, 90); ctx.lineTo(W - 30, 90); ctx.stroke();

        // Rows
        let y = headerH + 10;
        const drawRow = (label: string, value: string, highlight = false) => {
            ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.font = "14px 'Segoe UI', sans-serif"; ctx.fillText(label, 40, y);
            ctx.textAlign = "right"; ctx.fillStyle = highlight ? "#22c55e" : "rgba(255,255,255,0.9)";
            ctx.font = `${highlight ? "bold " : ""}14px 'Segoe UI', sans-serif`; ctx.fillText(value, W - 40, y);
            y += rowH;
        };

        drawRow(t("receiptSender") || "Sender", address || "-");
        drawRow("Token", `$${tokenSymbol}`);
        drawRow(t("receiptTotalSent") || "Total Sent", `${formatNum(ts)} $${tokenSymbol}`, true);
        drawRow(t("receiptRecipients") || "Recipients", `${sc} ${t("airdropWallets") || "wallets"}`);
        drawRow(t("receiptMode") || "Mode", modeStr);
        drawRow("Chain", "XLayer (196)");
        drawRow(t("receiptDate") || "Date", dateStr);
        drawRow(t("receiptStatus") || "Status", `✅ ${sc} | ❌ ${fc}`);

        // TX Hashes
        if (txHashes.length > 0) {
            ctx.strokeStyle = "rgba(249, 115, 22, 0.1)"; ctx.beginPath(); ctx.moveTo(30, y - 8); ctx.lineTo(W - 30, y - 8); ctx.stroke();
            y += 4;
            txHashes.slice(0, 10).forEach((tx, i) => {
                ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,0.4)";
                ctx.font = "12px 'Segoe UI', sans-serif"; ctx.fillText(`TX #${i + 1}`, 40, y);
                ctx.textAlign = "right"; ctx.fillStyle = "#f97316";
                ctx.font = "12px 'Segoe UI', monospace"; ctx.fillText(`${XLAYER_EXPLORER}/tx/${tx.slice(0, 12)}...${tx.slice(-6)}`, W - 40, y);
                y += rowH;
            });
        }

        // Footer
        ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.font = "11px 'Segoe UI', sans-serif";
        ctx.textAlign = "center"; ctx.fillText("🐱 Powered by Banmao Airdrop Tool — banmao.fun", W / 2, H - 20);

        // Download
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `banmao_airdrop_${Date.now()}.png`; a.click();
            URL.revokeObjectURL(url);
            showToast(t("receiptDownloaded") || "Receipt image downloaded!");
        }, "image/png");
    };
    const resetAirdrop = () => { setStep("input"); setSendResults([]); setSendProgress(0); setCurrentSendingAddress(""); clearSession(); };
    const cancelSending = () => { cancelRef.current = true; showToast(t("airdropCancelled") || "Stopping after current batch..."); };

    // Export/Import config (#12)
    const exportConfig = () => {
        playClick();
        const config = { version: 1, blacklist: Array.from(blacklist), templates, addressBook, exportedAt: new Date().toISOString() };
        downloadFile(JSON.stringify(config, null, 2), `banmao_config_${Date.now()}.json`);
        showToast(t("configExported") || "Config exported!");
    };
    const importConfig = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target?.result as string);
                if (config.blacklist) { const bl = new Set([...blacklist, ...config.blacklist.map((a: string) => a.toLowerCase())]); setBlacklist(bl); setBlacklistInput(Array.from(bl).join("\n")); saveStorage(STORAGE_BLACKLIST, Array.from(bl)); }
                if (config.templates) { const m = [...templates, ...config.templates.filter((t: any) => !templates.some(e => e.name === t.name))]; setTemplates(m); saveStorage(STORAGE_TEMPLATES, m); }
                if (config.addressBook) { const m = [...addressBook, ...config.addressBook.filter((g: any) => !addressBook.some(e => e.name === g.name))]; setAddressBook(m); saveStorage(STORAGE_BOOK, m); }
                showToast(t("configImported") || "Config imported!");
            } catch { showToast(t("configInvalid")); }
        };
        reader.readAsText(file);
    };

    // Shareable link (#10)
    const generateShareLink = () => {
        playClick();
        const params = new URLSearchParams();
        if (parsedAddresses.length) params.set("addrs", parsedAddresses.join(","));
        if (amountPerWallet) params.set("amt", amountPerWallet);
        params.set("mode", amountMode);
        copyText(`${window.location.origin}/defi/airdrop?${params.toString()}`);
        showToast(t("shareLinkCopied") || "Share link copied!");
    };

    // Parse URL params on mount (#10)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const addrs = params.get("addrs");
        const amt = params.get("amt");
        const mode = params.get("mode");
        if (addrs) setAddressInput(addrs.split(",").join("\n"));
        if (amt) setAmountPerWallet(amt);
        if (mode === "custom") setAmountMode("custom");
    }, []);

    // Dashboard stats (#4)
    const dashboardStats = React.useMemo(() => {
        // Use global DB stats (visible to all users) instead of local history
        if (lbStats) {
            return {
                totalDistributed: Number(lbStats.total_distributed || 0),
                totalWallets: Number(lbStats.total_recipients || 0),
                totalSessions: Number(lbStats.total_airdrops || 0),
            };
        }
        // Fallback to local history while DB loads
        const totalDistributed = history.reduce((s, h) => s + parseFloat(h.totalSent.replace(/,/g, "")) || 0, 0);
        const totalWallets = history.reduce((s, h) => s + h.successCount, 0);
        const totalSessions = history.length;
        return { totalDistributed, totalWallets, totalSessions };
    }, [lbStats, history]);

    // ========== QR Scanner (#6) ==========
    const startQrScanner = async () => {
        setShowQrScanner(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            // Use BarcodeDetector API if available
            if ("BarcodeDetector" in window) {
                const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
                scanIntervalRef.current = setInterval(async () => {
                    if (!videoRef.current) return;
                    try {
                        const barcodes = await detector.detect(videoRef.current);
                        for (const barcode of barcodes) {
                            const val = barcode.rawValue;
                            const match = val.match(/0x[a-fA-F0-9]{40}/);
                            if (match && isAddress(match[0])) {
                                const addr = match[0];
                                // #6: Check if already in list before appending
                                setAddressInput(prev => {
                                    const existing = prev.toLowerCase().split(/\s+/);
                                    if (existing.includes(addr.toLowerCase())) return prev; // skip dupe
                                    return prev ? `${prev}\n${addr}` : addr;
                                });
                                playSuccess();
                                showToast(`${t("qrDetected") || "Address detected"}: ${shortAddr(addr)}`);
                                // Don't stop scanner - allow continuous scanning
                                return;
                            }
                        }
                    } catch {}
                }, 500);
            } else {
                showToast(t("qrNotSupported") || "QR scanning requires Chrome/Edge browser");
            }
        } catch (err: any) {
            showToast(t("qrCameraError") || "Camera access denied");
            setShowQrScanner(false);
        }
    };
    const stopQrScanner = () => {
        if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        setShowQrScanner(false);
    };

    // ========== Scheduler (#7) ==========
    const startSchedule = () => {
        if (!scheduledTime) return;
        const target = new Date(scheduledTime).getTime();
        if (target <= Date.now()) { showToast(t("schedulePast") || "Time must be in the future"); return; }
        setScheduleActive(true);
        playClick();
        const update = () => {
            const remaining = target - Date.now();
            if (remaining <= 0) {
                clearInterval(scheduleTimerRef.current);
                setScheduleActive(false);
                setScheduleCountdown("");
                executeAirdrop();
                return;
            }
            const h = Math.floor(remaining / 3600000);
            const m = Math.floor((remaining % 3600000) / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            setScheduleCountdown(`${h}h ${m}m ${s}s`);
        };
        update();
        scheduleTimerRef.current = setInterval(update, 1000);
    };
    const cancelSchedule = () => {
        if (scheduleTimerRef.current) clearInterval(scheduleTimerRef.current);
        setScheduleActive(false);
        setScheduleCountdown("");
        showToast(t("scheduleCancelled") || "Schedule cancelled");
    };
    // Cleanup on unmount
    useEffect(() => () => {
        if (scheduleTimerRef.current) clearInterval(scheduleTimerRef.current);
        stopQrScanner();
    }, []);

    // ========== Multi-token resolve (#9) ==========
    const resolveCustomToken = async () => {
        if (!customTokenInput || !isAddress(customTokenInput)) { showToast(t("invalidTokenAddress") || "Invalid token address"); return; }
        setTokenLoading(true);
        try {
            const RPC_URL = "https://rpc.xlayer.tech";
            // Get symbol: symbol() = 0x95d89b41
            const symRes = await fetch(RPC_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: customTokenInput, data: "0x95d89b41" }, "latest"], id: 1 }) });
            const symData = await symRes.json();
            let symbol = "UNKNOWN";
            if (symData.result && symData.result !== "0x") {
                try { const hex = symData.result.slice(130); symbol = Buffer.from(hex, "hex").toString("utf8").replace(/\0/g, "").trim() || "UNKNOWN"; } catch { /* non-standard */ }
            }
            // Get decimals: decimals() = 0x313ce567
            const decRes = await fetch(RPC_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: customTokenInput, data: "0x313ce567" }, "latest"], id: 2 }) });
            const decData = await decRes.json();
            const decimals = decData.result ? Number(BigInt(decData.result)) : 18;
            setTokenAddress(customTokenInput);
            setTokenSymbol(symbol);
            setTokenDecimals(decimals);
            setShowTokenSelector(false);
            // Save to list if not duplicate
            if (customTokenInput.toLowerCase() !== (BANMAO_TOKEN as string).toLowerCase()) {
                const exists = savedTokens.some(t => t.address.toLowerCase() === customTokenInput.toLowerCase());
                if (!exists) saveTokenList([...savedTokens, { address: customTokenInput, symbol, decimals }]);
            }
            playSuccess();
            showToast(`${t("tokenLoaded") || "Token loaded"}: ${symbol} (${decimals} decimals)`);
        } catch {
            showToast(t("tokenLoadError") || "Failed to load token info");
        }
        setTokenLoading(false);
    };
    const resetToDefaultToken = () => {
        setTokenAddress(BANMAO_TOKEN as string);
        setTokenSymbol("BANMAO");
        setTokenDecimals(18);
        setShowTokenSelector(false);
        setCustomTokenInput("");
        playClick();
    };

    // ========== Holder Scanning ==========
    const fetchHotTokens = async (chain: string) => {
        setHotTokensLoading(true);
        setHotTokens([]);
        try {
            const res = await fetch(`/api/okx/hot-tokens?chainIndex=${chain}`);
            const data = await res.json();
            if (data.success && data.tokens) {
                setHotTokens(data.tokens);
            } else {
                showToast(t("hotTokensEmpty") || "No trending tokens found");
            }
        } catch {
            showToast(t("hotTokensEmpty") || "Failed to load tokens");
        }
        setHotTokensLoading(false);
    };

    const handleChainChange = (chain: string) => {
        playClick();
        setHolderChain(chain);
        setHolderResults([]);
        setSelectedHotToken("");
        setSelectedHolders(new Set());
        setHolderMinBalance("");
        fetchHotTokens(chain);
    };

    const scanHolders = async (tokenAddr?: string) => {
        const addr = tokenAddr || selectedHotToken || holderTokenInput;
        if (!addr) { showToast(t("invalidTokenAddress") || "Enter a token address"); return; }
        playClick();
        setHolderScanning(true);
        setHolderResults([]);
        setSelectedHolders(new Set());
        setHolderMinBalance("");
        try {
            let url = `/api/okx/holders?chainIndex=${holderChain}&tokenContractAddress=${addr}`;
            if (holderTagFilter) url += `&tagFilter=${holderTagFilter}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.success && data.holders) {
                const holders = data.holders.map((h: any) => ({
                    address: h.holderWalletAddress,
                    amount: h.holdAmount || "0",
                })).filter((h: any) => h.address && h.address !== "0x0000000000000000000000000000000000000000");
                setHolderResults(holders);
                if (holders.length > 0) {
                    playSuccess();
                    showToast(`${holders.length} ${t("holdersFound") || "holders found"}`);
                } else {
                    showToast(t("hotTokensEmpty") || "No holders found");
                }
            } else {
                showToast(data.error || "Failed");
            }
        } catch {
            showToast(t("scanHoldersFailed"));
            playError();
        }
        setHolderScanning(false);
    };

    const importHolders = () => {
        const addrs = selectedHolders.size > 0 ? Array.from(selectedHolders) : holderResults.map(h => h.address);
        if (!addrs.length) return;
        playClick();
        const existingMap = new Map(scannedWallets.map(w => [w.address.toLowerCase(), w]));
        let added = 0;
        for (const addr of addrs) {
            const key = addr.toLowerCase();
            if (!existingMap.has(key) && key !== address?.toLowerCase()) {
                existingMap.set(key, {
                    address: addr,
                    shortAddress: shortAddr(addr),
                    balances: { OKB: "0", USDT: "0" },
                    hasBalance: true,
                });
                added++;
            }
        }
        const newWallets = Array.from(existingMap.values());
        scannedWalletsRef.current = newWallets;
        setScannedWallets(newWallets);
        // Auto-select imported holders
        const newSelected = new Set(selectedWallets);
        addrs.forEach(a => newSelected.add(a));
        setSelectedWallets(newSelected);
        setScanCount(prev => prev + 1);
        showToast(`+${added} ${t("holdersImported") || "holders imported!"}`);
        // Switch to wallets mode so user sees selected addresses
        setScanMode("wallets");
        setSelectedHolders(new Set());
    };

    // Overlap detection: how many scan results already exist in manual/scanned lists
    const holderOverlapCount = useMemo(() => {
        if (!holderResults.length) return 0;
        const existingSet = new Set([
            ...parsedAddresses.map(a => a.toLowerCase()),
            ...scannedWallets.map(w => w.address.toLowerCase()),
        ]);
        return holderResults.filter(h => existingSet.has(h.address.toLowerCase())).length;
    }, [holderResults, parsedAddresses, scannedWallets]);

    // Filtered holders by min balance
    const filteredHolders = useMemo(() => {
        const min = parseFloat(holderMinBalance) || 0;
        if (min <= 0) return holderResults;
        return holderResults.filter(h => parseFloat(h.amount) >= min);
    }, [holderResults, holderMinBalance]);

    // Export holders to CSV
    const exportHoldersCSV = () => {
        const rows = filteredHolders.map(h => `${h.address},${h.amount}`);
        const csv = "address,amount\n" + rows.join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `holders_${holderChain}_${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
        playSuccess();
        showToast(t("csvExported") || "CSV exported!");
    };

    // Get explorer URL for current holder chain
    const getHolderExplorerUrl = (addr: string) => {
        const base = CHAIN_EXPLORERS[holderChain] || CHAIN_EXPLORERS["1"];
        return `${base}/address/${addr}`;
    };

    // ===================== RENDER =====================

    // Toast (stacked with progress bar + close)
    const toastEl = toasts.length > 0 ? (
        <div className="airdrop-toast-stack">
            {toasts.map((t) => (
                <div key={t.id} className="airdrop-toast">
                    <span className="airdrop-toast-msg">{t.msg}</span>
                    <button className="airdrop-toast-close" onClick={() => dismissToast(t.id)}>✕</button>
                    <div className="airdrop-toast-progress" />
                </div>
            ))}
        </div>
    ) : null;

    // #2: Resume prompt UI
    const resumeEl = showResumePrompt && resumeData ? (
        <div style={{
            background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(168,85,247,0.15))",
            border: "1px solid rgba(249,115,22,0.3)", borderRadius: 12, padding: "14px 18px",
            marginBottom: 12, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
            <span style={{ fontSize: 20 }}>🔄</span>
            <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, color: "#f97316", fontSize: 13 }}>{t("resumeTitle") || "Unfinished Airdrop Detected"}</div>
                <div style={{ fontSize: 11, color: "#aaa" }}>
                    {resumeData.results.filter(r => r.success).length}/{resumeData.entries.length} {t("airdropSuccessful")} · {new Date(resumeData.timestamp).toLocaleString()}
                </div>
            </div>
            <button onClick={() => {
                playClick();
                const successAddrs = new Set(resumeData.results.filter(r => r.success).map(r => r.address.toLowerCase()));
                const remaining = resumeData.entries.filter(e => !successAddrs.has(e.address.toLowerCase()));
                setSendResults(resumeData.results.filter(r => r.success));
                setShowResumePrompt(false);
                executeAirdrop(remaining);
            }} style={{
                padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #f97316, #a855f7)", color: "#fff", fontWeight: 700, fontSize: 13,
            }}>{t("resumeAirdrop") || "Resume"} ({resumeData.entries.length - resumeData.results.filter(r => r.success).length})</button>
            <button onClick={() => { setShowResumePrompt(false); try { localStorage.removeItem(STORAGE_PROGRESS); } catch {} }} style={{
                padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent", color: "#888", cursor: "pointer", fontSize: 12,
            }}>✕</button>
        </div>
    ) : null;

    // Progress Stepper
    const stepperSteps: { key: AirdropStep; icon: string; label: string }[] = [
        { key: "input", icon: "parachute", label: t("stepSetup") || "Setup" },
        { key: "preview", icon: "chart", label: t("stepPreview") || "Preview" },
        { key: "sending", icon: "rocket", label: t("stepSending") || "Sending" },
        { key: "done", icon: "check", label: t("stepDone") || "Done" },
    ];
    const stepOrder = ["input", "preview", "sending", "done"];
    const currentIdx = stepOrder.indexOf(step);
    const stepperEl = (
        <div className="airdrop-stepper">
            {stepperSteps.map((s, i) => (
                <div key={s.key} className={`airdrop-step ${i === currentIdx ? "active" : ""} ${i < currentIdx ? "completed" : ""}`}>
                    <div className="airdrop-step-circle">
                        {i < currentIdx ? <AIcon name="check" size={12} /> : <AIcon name={s.icon as any} size={12} />}
                    </div>
                    <span className="airdrop-step-label">{s.label}</span>
                    {i < stepperSteps.length - 1 && <div className="airdrop-step-line" />}
                </div>
            ))}
        </div>
    );

    // ---- PREVIEW ----
    if (step === "preview") {
        return (
            <div className="airdrop-panel" ref={panelRef}>
                {toastEl}
                {stepperEl}
                <div className="airdrop-preview-header">
                    <button className="airdrop-back-btn" onClick={() => { playClick(); setStep("input"); }}>
                        <AIcon name="arrowLeft" size={14} /> {t("airdropBack")}
                    </button>
                    <h3 className="airdrop-panel-title"><AIcon name="chart" size={18} /> {t("airdropPreview")}</h3>
                </div>
                {/* Compact 2x2 summary grid */}
                <div className="airdrop-preview-grid">
                    <div className="airdrop-preview-stat"><span className="airdrop-preview-label"><AIcon name="users" size={13} /> {t("airdropRecipients")}</span><span className="airdrop-preview-value">{recipients.length}</span></div>
                    <div className="airdrop-preview-stat"><span className="airdrop-preview-label"><AIcon name="coins" size={13} /> {t("airdropAmountEach")}</span><span className="airdrop-preview-value">{amountMode === "custom" ? "Custom" : formatNum(amountNum)}{tokenPrice > 0 && amountMode !== "custom" && <span className="usd-hint"> ~${(amountNum * tokenPrice).toFixed(4)}</span>}</span></div>
                    <div className="airdrop-preview-stat highlight"><span className="airdrop-preview-label"><AIcon name="chart" size={13} /> {t("airdropTotalCost")}</span><span className="airdrop-preview-value">{formatNum(totalAmount)} ${tokenSymbol}{tokenPrice > 0 && <span className="usd-hint"> ~${(totalAmount * tokenPrice).toFixed(2)}</span>}</span></div>
                    <div className={`airdrop-preview-stat ${hasEnough ? "success" : "error"}`}><span className="airdrop-preview-label"><AIcon name="wallet" size={13} /> {t("airdropYourBalance")}</span><span className="airdrop-preview-value">{formatNum(balanceNum)} ${tokenSymbol}{tokenPrice > 0 && <span className="usd-hint"> ~${(balanceNum * tokenPrice).toFixed(2)}</span>}</span></div>
                </div>
                {/* Inline gas + warnings */}
                <div className="airdrop-preview-meta">
                    {!hasEnough && <span className="preview-warn"><AIcon name="warning" size={12} /> {t("airdropInsufficientBalance")}</span>}
                    {estimatedGas && <span className="preview-gas"><AIcon name="fuel" size={12} /> {t("airdropGasEstimate") || "Gas"}: <strong>{estimatedGas}</strong></span>}
                    {okbNum > 0 && <span className="preview-gas"><AIcon name="wallet" size={12} /> OKB: <strong>{okbNum.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}</strong>{(() => { const gasNeeded = sendMode === "batch" ? (GAS_BATCH_BASE + recipients.length * GAS_PER_BATCH_RECIPIENT) * GAS_PRICE_GWEI / 1e9 : recipients.length * GAS_PER_TRANSFER * GAS_PRICE_GWEI / 1e9; return okbNum < gasNeeded ? <span className="text-red"> ⚠ {t("errInsufficientGas")}</span> : null; })()}</span>}
                </div>
                {/* Compact recipient list with search + delete */}
                <div className="airdrop-preview-recipients">
                    <div className="preview-recipients-header">
                        <span><AIcon name="users" size={13} /> {t("airdropRecipientList")} ({recipients.length})</span>
                    </div>
                    <div style={{ padding: "6px 10px 2px" }}>
                        <input
                            type="text"
                            value={recipientSearch}
                            onChange={e => setRecipientSearch(e.target.value)}
                            placeholder={`🔍 ${t("searchWallet") || "Search wallet..."}`}
                            style={{
                                width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
                                color: "#fff", fontSize: 13, outline: "none", fontFamily: "monospace",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>
                    <div className="preview-recipients-body">
                        {(() => {
                            const q = recipientSearch.toLowerCase().trim();
                            const filtered = q
                                ? recipientEntries.filter(e => e.address.toLowerCase().includes(q))
                                : recipientEntries;
                            return (
                                <>
                                    {filtered.map((e, i) => (
                                        <div key={e.address} className="preview-recipient-row" style={{ display: "flex", alignItems: "center" }}>
                                            <span className="pr-idx">#{q ? recipientEntries.indexOf(e) + 1 : i + 1}</span>
                                            <span className="pr-addr" style={{ flex: 1 }}>{e.address}</span>
                                            <span className="pr-amt">{formatNum(parseFloat(e.amount) || 0)}</span>
                                            <button
                                                onClick={() => { playClick(); removeRecipient(e.address); }}
                                                title={t("delete") || "Delete"}
                                                style={{
                                                    background: "transparent", border: "none", cursor: "pointer",
                                                    color: "#ff4444", fontSize: 16, padding: "2px 6px", marginLeft: 4,
                                                    opacity: 0.6, transition: "opacity 0.2s",
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                                                onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
                                            >🗑️</button>
                                        </div>
                                    ))}
                                    {q && filtered.length === 0 && <div style={{ padding: "10px", textAlign: "center", color: "#666", fontSize: 12 }}>{t("noResults")}</div>}
                                    {q && <div style={{ padding: "4px 10px", textAlign: "center", color: "#888", fontSize: 11 }}>{filtered.length} / {recipientEntries.length} {t("flagModalAddresses")}</div>}
                                </>
                            );
                        })()}
                    </div>
                </div>
                <div className="airdrop-speed-mode">
                    <span className="airdrop-speed-label"><AIcon name="bolt" size={14} /> {t("airdropSpeedMode") || "Mode"}</span>
                    <div className="airdrop-speed-options">
                        <button className={`airdrop-speed-btn batch-btn ${sendMode === "batch" ? "active" : ""}`} onClick={() => { playClick(); setSendMode("batch"); }} title={t("batchModeDesc") || "Smart contract batch transfer"}>
                            <AIcon name="rocket" size={13} /> {t("batchMode") || "Batch 1TX"}
                        </button>
                        {([3, 5, 10, 20] as const).map(n => (
                            <button key={n} className={`airdrop-speed-btn parallel-btn ${sendMode === n ? "active" : ""}`} onClick={() => { playClick(); setSendMode(n); }} title={`${t("parallelModeDesc") || "Send"} ${n} ${t("parallelModeDescEnd") || "transactions simultaneously"}`}>
                                <AIcon name="rocket" size={13} /> x{n}
                            </button>
                        ))}
                        <button className={`airdrop-speed-btn sequential-btn ${sendMode === 1 ? "active" : ""}`} onClick={() => { playClick(); setSendMode(1); }} title={t("sequentialModeDesc") || "Send one transaction at a time"}>
                            <AIcon name="refresh" size={13} /> {t("airdropSequentialMode") || "x1"}
                        </button>
                    </div>
                </div>
                {/* Batch Size Selector (only for batch mode) */}
                {sendMode === "batch" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", marginTop: -4 }}>
                        <span style={{ fontSize: 12, color: "#888" }}>📦 {t("batchSize") || "Batch size"}:</span>
                        <div style={{ display: "flex", gap: 4 }}>
                            {BATCH_SIZE_OPTIONS.map(n => (
                                <button
                                    key={n}
                                    onClick={() => { playClick(); setBatchSizeConfig(n); try { const cfg = JSON.parse(localStorage.getItem(STORAGE_CONFIG) || "{}"); cfg.batchSize = n; localStorage.setItem(STORAGE_CONFIG, JSON.stringify(cfg)); } catch {} }}
                                    style={{
                                        padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                                        background: batchSizeConfig === n ? "linear-gradient(135deg, #f97316, #a855f7)" : "rgba(255,255,255,0.06)",
                                        border: batchSizeConfig === n ? "none" : "1px solid rgba(255,255,255,0.1)",
                                        color: batchSizeConfig === n ? "#fff" : "#888",
                                    }}
                                >{n}</button>
                            ))}
                        </div>
                        <span style={{ fontSize: 11, color: "#555" }}>({Math.ceil(recipients.length / batchSizeConfig)} TX{recipients.length > batchSizeConfig ? 's' : ''})</span>
                    </div>
                )}
                {/* Mode description card */}
                <div className={`airdrop-mode-info-card ${sendMode === "batch" ? "mode-batch" : sendMode === 1 ? "mode-sequential" : "mode-parallel"}`}>
                    <div className="mode-info-header">
                        <span className="mode-info-icon">{sendMode === "batch" ? "⚡" : sendMode === 1 ? "🔄" : "🚀"}</span>
                        <span className="mode-info-title">{sendMode === "batch" ? (t("batchModeTitle") || "Smart Contract Batch") : sendMode === 1 ? (t("sequentialModeTitle") || "Sequential (1 by 1)") : (t("parallelModeTitle") || `Parallel x${sendMode}`)}</span>
                        <span className={`mode-info-badge ${sendMode === "batch" ? "badge-batch" : sendMode === 1 ? "badge-sequential" : "badge-parallel"}`}>{sendMode === "batch" ? (t("modeBadgeFastest") || "Fastest") : sendMode === 1 ? (t("modeBadgeSafest") || "Safest") : (t("modeBadgeBalanced") || "Balanced")}</span>
                    </div>
                    <p className="mode-info-desc">
                        {sendMode === "batch"
                            ? (t("batchModeNote") || "All recipients in 1 transaction via smart contract. Requires 2 wallet confirmations: Approve + Send. Max 200 per batch.")
                            : sendMode === 1
                            ? (t("sequentialModeNote") || "Sends 1 transaction at a time. Slowest but most reliable — ideal for unstable networks or small lists.")
                            : (t("parallelModeNote") || `Sends ${sendMode} transactions simultaneously. Faster than sequential, requires ${sendMode} wallet confirmations at once.`)}
                    </p>
                    {/* Batch mode: Contract info + Approval status */}
                    {sendMode === "batch" && (
                        <div className="batch-contract-info">
                            <div className="batch-contract-row">
                                <span className="batch-contract-label"><AIcon name="link" size={11} /> {t("batchContract") || "Contract"}</span>
                                <a className="batch-contract-addr" href={`${XLAYER_EXPLORER}/address/${AIRDROP_CONTRACT}`} target="_blank" rel="noopener noreferrer">
                                    {AIRDROP_CONTRACT.slice(0, 6)}...{AIRDROP_CONTRACT.slice(-4)} <AIcon name="link" size={10} />
                                </a>
                            </div>
                            <div className="batch-contract-row">
                                <span className="batch-contract-label"><AIcon name="check" size={11} /> {t("batchAllowance") || "Allowance"}</span>
                                {(() => {
                                    const allowanceBig = BigInt(currentAllowance?.toString() || "0");
                                    const neededWei = totalAmount > 0 ? parseUnits(totalAmount.toFixed(tokenDecimals > 6 ? 6 : tokenDecimals), tokenDecimals) : BigInt(0);
                                    const isApproved = allowanceBig >= neededWei && neededWei > BigInt(0);
                                    return isApproved
                                        ? <span className="batch-status approved"><AIcon name="check" size={11} /> {t("batchApproved") || "Approved"} ✓</span>
                                        : <span className="batch-status not-approved"><AIcon name="warning" size={11} /> {t("batchNotApproved") || "Not approved"}</span>;
                                })()}
                            </div>
                        </div>
                    )}
                    <div className="mode-info-stats">
                        <span className="mode-stat"><AIcon name="bolt" size={11} /> {t("modeTxCount") || "TX"}: {sendMode === "batch" ? Math.ceil(recipients.length / MAX_BATCH_SIZE) || 1 : sendMode === 1 ? recipients.length : Math.ceil(recipients.length / (sendMode as number))}</span>
                        <span className="mode-stat"><AIcon name="wallet" size={11} /> {t("modeConfirms") || "Confirms"}: {sendMode === "batch" ? 2 : sendMode === 1 ? recipients.length : Math.ceil(recipients.length / (sendMode as number))}</span>
                    </div>
                </div>
                {/* Batch mode: 2-step approve + send */}
                {sendMode === "batch" ? (
                    <div className="batch-steps-container">
                        {(() => {
                            const allowanceBig = BigInt(currentAllowance?.toString() || "0");
                            const neededWei = totalAmount > 0 ? parseUnits(totalAmount.toFixed(tokenDecimals > 6 ? 6 : tokenDecimals), tokenDecimals) : BigInt(0);
                            const isApproved = allowanceBig >= neededWei && neededWei > BigInt(0);
                            return (
                                <>
                                    {/* Step 1: Approve */}
                                    <button
                                        className={`batch-step-btn ${isApproved ? "completed" : "active"}`}
                                        disabled={isApproved || !hasEnough || !recipients.length || batchStep === "approving"}
                                        onClick={async () => {
                                            playClick();
                                            setBatchStep("approving");
                                            try {
                                                const txHash = await writeContractAsync({
                                                    address: tokenAddress as `0x${string}`,
                                                    abi: ERC20_ABI,
                                                    functionName: "approve",
                                                    args: [AIRDROP_CONTRACT, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")],
                                                } as any);
                                                // Wait for TX to be mined before refreshing allowance
                                                if (publicClient && txHash) {
                                                    await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
                                                }
                                                await refetchAllowance();
                                                playSuccess();
                                                setBatchStep("approved");
                                                showToast(t("batchApproveSuccess") || "Approved! Now click Send.");
                                            } catch (err: any) {
                                                setBatchStep("idle");
                                                playError();
                                                showToast(translateError(err?.shortMessage || err?.message || "Failed", t));
                                            }
                                        }}
                                        onMouseEnter={() => playHover()}
                                    >
                                        <span className="batch-step-number">{isApproved ? "✓" : "1"}</span>
                                        {batchStep === "approving" ? <><span className="airdrop-spinner" /> {t("batchApproving") || "Approving..."}</> : isApproved ? <>{t("batchApproved") || "Approved"}</> : <><AIcon name="check" size={14} /> {t("batchApproveBtn") || "Approve Contract"}</>}
                                    </button>
                                    {!isApproved && <p className="approve-unlimited-hint">💡 {t("approveUnlimitedHint") || "Tip: Select 'Unlimited' in your wallet popup to approve once for all future airdrops."}</p>}
                                    {/* Step 2: Send */}
                                    <button
                                        className={`batch-step-btn send-btn ${isApproved ? "active" : ""}`}
                                        disabled={!isApproved || !hasEnough || !recipients.length}
                                        onClick={() => { playClick(); executeAirdrop(); }}
                                        onMouseEnter={() => playHover()}
                                    >
                                        <span className="batch-step-number">{isApproved ? "2" : "2"}</span>
                                        <AIcon name="rocket" size={14} /> {t("batchSendBtn") || "Send Airdrop"} ({recipients.length} {t("airdropWallets")})
                                    </button>
                                </>
                            );
                        })()}
                    </div>
                ) : (
                    <button className="airdrop-execute-btn" disabled={!hasEnough || !recipients.length} onClick={() => executeAirdrop()} onMouseEnter={() => playHover()}>
                        <AIcon name="rocket" size={16} /> {t("airdropExecute")} ({recipients.length} {t("airdropWallets")})
                    </button>
                )}
            </div>
        );
    }

    // ---- SENDING ----
    if (step === "sending") {
        const pct = sendTotal > 0 ? Math.round((sendProgress / sendTotal) * 100) : 0;
        const sc = sendResults.filter(r => r.success).length, fc = sendResults.filter(r => !r.success).length;
        const elapsed = (Date.now() - sendStartTimeRef.current) / 1000;
        const speed = elapsed > 0 && sendProgress > 0 ? (sendProgress / elapsed).toFixed(1) : "—";
        const etaSeconds = sendProgress > 0 ? Math.round(((sendTotal - sendProgress) / (sendProgress / elapsed))) : 0;
        const etaMin = Math.floor(etaSeconds / 60);
        const etaSec = etaSeconds % 60;
        const etaStr = sendProgress > 0 ? (etaMin > 0 ? `${etaMin}m ${etaSec}s` : `${etaSec}s`) : "—";
        return (
            <div className="airdrop-panel" ref={panelRef}>
                {toastEl}
                {stepperEl}
                <div className="airdrop-panel-header"><h3 className="airdrop-panel-title"><AIcon name="rocket" size={20} className="title-icon spin" /> {t("airdropSending")}</h3></div>
                {/* Progress bar (#3) */}
                <div className="airdrop-progress-bar-container">
                    <div className="airdrop-progress-bar" style={{ width: `${pct}%` }} />
                    <span className="airdrop-progress-text">{pct}% · {sendProgress}/{sendTotal} · {speed} TX/s · ⏱ {etaStr}</span>
                </div>
                <div className="airdrop-sending-status">
                    <div className="airdrop-progress-ring">
                        <svg viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                            <circle cx="60" cy="60" r="50" fill="none" stroke="url(#aGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${pct * 3.14} ${(100 - pct) * 3.14}`} transform="rotate(-90 60 60)" style={{ transition: "stroke-dasharray 0.5s ease" }} />
                            <defs><linearGradient id="aGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f97316" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
                            <text x="60" y="55" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700">{sendProgress}/{sendTotal}</text>
                            <text x="60" y="75" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11">{pct}%</text>
                        </svg>
                    </div>
                    <div className="airdrop-sending-info">
                        <div className="airdrop-sending-label">{isSending ? t("airdropProcessing") : t("airdropComplete")}</div>
                        {currentSendingAddress && isSending && <div className="airdrop-sending-current">{currentSendingAddress}</div>}
                        <div className="airdrop-sending-counts"><span className="airdrop-count-success"><AIcon name="check" size={12} /> {sc}</span>{fc > 0 && <span className="airdrop-count-fail"><AIcon name="xCircle" size={12} /> {fc}</span>}</div>
                        {isSending && sendProgress > 0 && <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>⏱ ETA: {etaStr}</div>}
                    </div>
                </div>
                {/* Cancel button (#5) */}
                {isSending && sendMode !== "batch" && (
                    <button className="airdrop-cancel-btn" onClick={cancelSending}><AIcon name="xCircle" size={14} /> {t("airdropStop") || "Stop"}</button>
                )}
                <div className="airdrop-results-list">
                    {sendResults.slice(-10).reverse().map((r, i) => (
                        <div key={i} className={`airdrop-result-row ${r.success ? "success" : "error"}`}>
                            <span className="airdrop-result-icon">{r.success ? <AIcon name="check" size={14} /> : <AIcon name="xCircle" size={14} />}</span>
                            <span className="airdrop-result-full-addr">{r.address}</span>
                            {r.success && r.txHash && <a href={`${XLAYER_EXPLORER}/tx/${r.txHash}`} target="_blank" rel="noopener noreferrer" className="airdrop-result-link"><AIcon name="link" size={12} /></a>}
                            {!r.success && <span className="airdrop-result-error">{r.error?.slice(0, 30)}</span>}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ---- DONE ----
    if (step === "done") {
        const sc = sendResults.filter(r => r.success).length, fc = sendResults.filter(r => !r.success).length;
        const ts = sendResults.filter(r => r.success).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        return (
            <div className={`airdrop-panel ${sc > 0 ? "airdrop-confetti" : ""}`}>
                {toastEl}
                {stepperEl}
                <div className="airdrop-panel-header"><h3 className="airdrop-panel-title">{sc > 0 ? <AIcon name="check" size={20} className="title-icon text-green" /> : <AIcon name="xCircle" size={20} className="title-icon text-red" />} {t("airdropResults")}</h3></div>
                <div className="airdrop-done-summary">
                    <div className="airdrop-done-icon">{sc > 0 ? <AIcon name="check" size={48} className="text-green" /> : <AIcon name="xCircle" size={48} className="text-red" />}</div>
                    <h4 className="airdrop-done-title">{sc > 0 ? t("airdropSuccess") : t("airdropFailed")}</h4>
                    <div className="airdrop-done-stats">
                        <div className="airdrop-done-stat"><span className="airdrop-done-stat-label"><AIcon name="check" size={13} /> {t("airdropSuccessful")}</span><span className="airdrop-done-stat-value success">{sc}</span></div>
                        {fc > 0 && <div className="airdrop-done-stat"><span className="airdrop-done-stat-label"><AIcon name="xCircle" size={13} /> {t("airdropFailedCount")}</span><span className="airdrop-done-stat-value error">{fc}</span></div>}
                        <div className="airdrop-done-stat"><span className="airdrop-done-stat-label"><AIcon name="coins" size={13} /> {t("airdropTotalSent")}</span><span className="airdrop-done-stat-value">{formatNum(ts)}</span></div>
                    </div>
                </div>
                <div style={{ padding: "6px 12px 2px" }}>
                    <input
                        type="text"
                        value={recipientSearch}
                        onChange={e => setRecipientSearch(e.target.value)}
                        placeholder={`🔍 ${t("searchWallet")}`}
                        style={{
                            width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
                            color: "#fff", fontSize: 13, outline: "none", fontFamily: "monospace",
                            boxSizing: "border-box" as const,
                        }}
                    />
                </div>
                {/* Filter tabs */}
                <div style={{ display: "flex", gap: 6, padding: "4px 12px" }}>
                    {(["all", "success", "failed"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => { playClick(); setResultFilter(f); }}
                            style={{
                                padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                                background: resultFilter === f ? (f === "success" ? "#166534" : f === "failed" ? "#7f1d1d" : "rgba(255,255,255,0.1)") : "rgba(255,255,255,0.04)",
                                border: resultFilter === f ? "none" : "1px solid rgba(255,255,255,0.08)",
                                color: resultFilter === f ? "#fff" : "#888",
                            }}
                        >
                            {f === "all" ? `${t("all") || "All"} (${sendResults.length})` : f === "success" ? `✅ ${t("airdropSuccessful")} (${sc})` : `❌ ${t("airdropFailedCount")} (${fc})`}
                        </button>
                    ))}
                </div>
                <div className="airdrop-results-list full">
                    {(() => {
                        const q = recipientSearch.toLowerCase().trim();
                        const byTab = resultFilter === "all" ? sendResults : resultFilter === "success" ? sendResults.filter(r => r.success) : sendResults.filter(r => !r.success);
                        const filtered = q ? byTab.filter(r => r.address.toLowerCase().includes(q)) : byTab;
                        return (
                            <>
                                {filtered.map((r, i) => (
                                    <div key={i} className={`airdrop-result-card ${r.success ? "success" : "error"}`}>
                                        <div className="airdrop-result-card-top">
                                            <span className="airdrop-result-icon">{r.success ? <AIcon name="check" size={14} /> : <AIcon name="xCircle" size={14} />}</span>
                                            <span className="airdrop-result-full-addr">{r.address}</span>
                                            <button className="airdrop-wallet-action-btn" title={t("airdropCopyAddress")} onClick={() => { copyText(r.address); showToast(t("airdropAddressCopied")); }}><AIcon name="copy" size={11} /></button>
                                        </div>
                                        <div className="airdrop-result-card-bottom">
                                            <span className="airdrop-result-amount">{r.amount} ${tokenSymbol}</span>
                                            {r.success && r.txHash && (
                                                <div className="airdrop-result-tx-group">
                                                    <a href={`${XLAYER_EXPLORER}/tx/${r.txHash}`} target="_blank" rel="noopener noreferrer" className="airdrop-result-tx-link"><AIcon name="link" size={11} /> TX</a>
                                                    <button className="airdrop-wallet-action-btn" title={t("airdropCopyTxHash")} onClick={() => { copyText(r.txHash!); showToast(t("airdropTxCopied")); }}><AIcon name="copy" size={11} /></button>
                                                </div>
                                            )}
                                            {!r.success && <span className="airdrop-result-error">{r.error?.slice(0, 50)}</span>}
                                        </div>
                                    </div>
                                ))}
                                {q && filtered.length === 0 && <div style={{ padding: "14px", textAlign: "center", color: "#666", fontSize: 12 }}>{t("noResults")}</div>}
                                {q && <div style={{ padding: "4px 10px", textAlign: "center", color: "#888", fontSize: 11 }}>{filtered.length} / {sendResults.length}</div>}
                            </>
                        );
                    })()}
                </div>
                <div className="airdrop-action-buttons">
                    {fc > 0 && <button className="airdrop-action-btn retry" onClick={retryFailed} onMouseEnter={() => playHover()}><AIcon name="refresh" size={13} /> {t("airdropRetryFailed") || "Retry"} ({fc})</button>}
                    <button className="airdrop-action-btn export" onClick={exportResults} onMouseEnter={() => playHover()}><AIcon name="download" size={13} /> {t("airdropExportCsv") || "Export"}</button>
                    <button className="airdrop-action-btn share" onClick={shareResults} onMouseEnter={() => playHover()}><AIcon name="share" size={13} /> {t("airdropShareResults") || "Share"}</button>
                </div>
                {/* #4: Airdrop Receipt */}
                {sc > 0 && (
                    <div className="airdrop-receipt">
                        <div className="airdrop-receipt-header">🪂 {t("receiptTitle") || "Airdrop Receipt"}</div>
                        <div className="airdrop-receipt-body">
                            <div className="airdrop-receipt-row"><span>{t("receiptSender") || "Sender"}</span><span>{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "-"}</span></div>
                            <div className="airdrop-receipt-row"><span>Token</span><span>${tokenSymbol}</span></div>
                            <div className="airdrop-receipt-row"><span>{t("receiptTotalSent") || "Total Sent"}</span><span className="receipt-highlight">{formatNum(ts)} ${tokenSymbol}</span></div>
                            <div className="airdrop-receipt-row"><span>{t("receiptRecipients") || "Recipients"}</span><span>{sc} {t("airdropWallets") || "wallets"}</span></div>
                            <div className="airdrop-receipt-row"><span>{t("receiptMode") || "Mode"}</span><span>{sendMode === "batch" ? "Batch 1TX" : `x${sendMode}`}</span></div>
                            <div className="airdrop-receipt-row"><span>Chain</span><span>XLayer (196)</span></div>
                            <div className="airdrop-receipt-row"><span>{t("receiptDate") || "Date"}</span><span>{new Date().toLocaleString()}</span></div>
                            {sendResults.filter(r => r.success && r.txHash).slice(0, 5).map((r, i) => (
                                <div key={i} className="airdrop-receipt-row"><span>TX #{i + 1}</span><a href={`${XLAYER_EXPLORER}/tx/${r.txHash}`} target="_blank" rel="noopener noreferrer" className="receipt-tx-link">{r.txHash!.slice(0, 10)}...{r.txHash!.slice(-6)}</a></div>
                            ))}
                        </div>
                        <button className="airdrop-receipt-copy" onClick={() => {
                            const txList = sendResults.filter(r => r.success && r.txHash).map(r => r.txHash).join('\n');
                            const receipt = `🪂 ${t("receiptTitle") || "Airdrop Receipt"}\n━━━━━━━━━━━━━━━━\n${t("receiptSender") || "Sender"}: ${address}\nToken: $${tokenSymbol}\n${t("receiptTotalSent") || "Total"}: ${formatNum(ts)} $${tokenSymbol}\n${t("receiptRecipients") || "Recipients"}: ${sc} ${t("airdropWallets") || "wallets"}\n${t("receiptMode") || "Mode"}: ${sendMode === "batch" ? "Batch 1TX" : `x${sendMode}`}\nChain: XLayer\n${t("receiptDate") || "Date"}: ${new Date().toLocaleString()}\n\nTransactions:\n${txList}\n━━━━━━━━━━━━━━━━\n🐱 banmao.fun/defi/airdrop`;
                            copyText(receipt); showToast(t("airdropCopiedClipboard")); playClick();
                        }}><AIcon name="copy" size={12} /> {t("receiptCopy") || "Copy Receipt"}</button>
                    </div>
                )}
                <button className="airdrop-execute-btn" onClick={resetAirdrop} onMouseEnter={() => playHover()}><AIcon name="refresh" size={16} /> {t("airdropNewAirdrop")}</button>
            </div>
        );
    }

    // ---- INPUT ----
    const mainPanel = (
        <div className="airdrop-panel">
            {toastEl}
            {stepperEl}
            {resumeEl}
            {/* Compact Header */}
            <div className="airdrop-panel-header-v2">
                <div className="airdrop-header-left">
                    <AIcon name="parachute" size={20} className="title-icon" />
                    <div>
                        <h3 className="airdrop-panel-title-v2">{t("airdropTitle")}</h3>
                        <p className="airdrop-panel-subtitle-v2">{(t("airdropSubtitle") || "").replace(/\$BANMAO/g, `$${tokenSymbol}`)}</p>
                    </div>
                </div>
                {/* Utility actions - icon only */}
                <div className="airdrop-header-utils">
                    <button className="airdrop-util-btn" onClick={generateShareLink} title={t("shareLink") || "Share"}><AIcon name="share" size={14} /></button>
                    <button className="airdrop-util-btn" onClick={exportConfig} title={t("exportConfig") || "Export"}><AIcon name="download" size={14} /></button>
                    <button className="airdrop-util-btn" onClick={() => configFileRef.current?.click()} title={t("importConfig") || "Import"}><AIcon name="upload" size={14} /></button>
                    <input ref={configFileRef} type="file" accept=".json" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) importConfig(e.target.files[0]); e.target.value = ""; }} />
                </div>
            </div>

            {/* Data quick-access tabs */}
            <div className="airdrop-data-tabs">
                <button className={`airdrop-data-tab ${showHistory ? "active" : ""}`} onClick={() => { playClick(); setShowHistory(!showHistory); }}>
                    <AIcon name="clock" size={13} /><span>{t("airdropHistory") || "History"}</span>{history.length > 0 && <span className="airdrop-tab-badge">{history.length}</span>}
                </button>
                <button className={`airdrop-data-tab ${showBook ? "active" : ""}`} onClick={() => { playClick(); setShowBook(!showBook); }}>
                    <AIcon name="book" size={13} /><span>{t("airdropAddressBook") || "Book"}</span>{addressBook.length > 0 && <span className="airdrop-tab-badge">{addressBook.length}</span>}
                </button>
                <button className={`airdrop-data-tab ${showBlacklist ? "active" : ""}`} onClick={() => { playClick(); setShowBlacklist(!showBlacklist); }}>
                    <AIcon name="xCircle" size={13} /><span>{t("blacklistTitle") || "Blacklist"}</span>{blacklist.size > 0 && <span className="airdrop-tab-badge">{blacklist.size}</span>}
                </button>
                <button className={`airdrop-data-tab ${showTemplates ? "active" : ""}`} onClick={() => { playClick(); setShowTemplates(!showTemplates); }}>
                    <AIcon name="bookmark" size={13} /><span>{t("templatesTitle") || "Templates"}</span>{templates.length > 0 && <span className="airdrop-tab-badge">{templates.length}</span>}
                </button>
            </div>

            {/* Dashboard stats */}
            {(dashboardStats.totalSessions > 0 || tokenPrice > 0) && (
                <div className="airdrop-dashboard">
                    {tokenPrice > 0 && <div className="airdrop-dash-stat price"><AIcon name="chart" size={15} /><div><span className="airdrop-dash-value">${tokenPrice.toFixed(10).replace(/0+$/, '').replace(/\.$/, '')}</span><span className="airdrop-dash-label">${tokenSymbol} {t("tokenPrice") || "Price"}</span></div></div>}
                    <div className="airdrop-dash-stat"><AIcon name="coins" size={15} /><div><span className="airdrop-dash-value">{formatNum(dashboardStats.totalDistributed)}</span><span className="airdrop-dash-label">{t("dashTotalDistributed") || "Distributed"}</span></div></div>
                    <div className="airdrop-dash-stat"><AIcon name="users" size={15} /><div><span className="airdrop-dash-value">{formatNum(dashboardStats.totalWallets)}</span><span className="airdrop-dash-label">{t("dashTotalWallets") || "Wallets"}</span></div></div>
                    <div className="airdrop-dash-stat"><AIcon name="rocket" size={15} /><div><span className="airdrop-dash-value">{dashboardStats.totalSessions}</span><span className="airdrop-dash-label">{t("dashTotalSessions") || "Airdrops"}</span></div></div>
                </div>
            )}


            {/* History */}
            {showHistory && (
                <div className="airdrop-history-panel">
                    <div className="airdrop-history-title"><AIcon name="clock" size={15} /> {t("airdropHistory") || "History"}</div>
                    {history.length === 0 ? <div className="airdrop-history-empty">{t("airdropNoHistory") || "No history"}</div> : (
                        <div className="airdrop-history-list">{history.slice(0, 10).map(h => (
                            <div key={h.id} className="airdrop-history-item">
                                <div className="airdrop-history-date">{new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString()}</div>
                                <div className="airdrop-history-stats"><AIcon name="check" size={11} /> {h.successCount} <AIcon name="xCircle" size={11} /> {h.failCount} · {h.totalSent} ${tokenSymbol}</div>
                            </div>
                        ))}</div>
                    )}
                </div>
            )}

            {/* Address Book */}
            {showBook && (
                <div className="airdrop-history-panel">
                    <div className="airdrop-history-title"><AIcon name="book" size={15} /> {t("airdropAddressBook") || "Address Book"}</div>
                    {parsedAddresses.length > 0 && (
                        <div className="airdrop-book-save">
                            <input type="text" className="airdrop-book-input" placeholder={t("airdropGroupName") || "Group name..."} value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveToBook()} />
                            <button className="airdrop-book-save-btn" onClick={saveToBook}><AIcon name="save" size={13} /> {t("save") || "Save"}</button>
                        </div>
                    )}
                    {addressBook.length === 0 ? <div className="airdrop-history-empty">{t("airdropNoSavedGroups") || "No groups"}</div> : (
                        <div className="airdrop-history-list">{addressBook.map((g, i) => (
                            <div key={i} className="airdrop-book-item">
                                <div className="airdrop-book-info"><span className="airdrop-book-name">{g.name}</span><span className="airdrop-book-count">{g.addresses.length} {t("airdropWallets") || "wallets"}</span></div>
                                <div className="airdrop-book-actions">
                                    <button className="airdrop-select-btn" onClick={() => loadFromBook(g)}><AIcon name="upload" size={12} /></button>
                                    <button className="airdrop-select-btn" onClick={() => deleteFromBook(i)}><AIcon name="trash" size={12} /></button>
                                </div>
                            </div>
                        ))}</div>
                    )}
                </div>
            )}

            {/* Blacklist */}
            {showBlacklist && (
                <div className="airdrop-history-panel">
                    <div className="airdrop-history-title"><AIcon name="xCircle" size={15} /> {t("blacklistTitle") || "Blacklist"} ({blacklist.size})</div>
                    <p className="airdrop-scan-desc" style={{ marginBottom: 8, fontSize: 11 }}>{t("blacklistDesc")}</p>
                    <textarea
                        className="airdrop-textarea"
                        value={blacklistInput}
                        onChange={e => saveBlacklist(e.target.value)}
                        placeholder={"0x1234...abcd\n0x5678...efgh"}
                        rows={4}
                        style={{ fontSize: 11 }}
                    />
                    {blacklist.size > 0 && <div className="airdrop-stat-valid" style={{ marginTop: 6 }}><AIcon name="check" size={12} /> {blacklist.size} {t("blacklistActive")}</div>}
                </div>
            )}

            {/* Templates */}
            {showTemplates && (
                <div className="airdrop-history-panel">
                    <div className="airdrop-history-title"><AIcon name="bookmark" size={15} /> {t("templatesTitle") || "Templates"}</div>
                    {amountPerWallet && (
                        <div className="airdrop-book-save">
                            <input type="text" className="airdrop-book-input" placeholder={t("templateNamePlaceholder") || "Template name..."} value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveTemplate()} />
                            <button className="airdrop-book-save-btn" onClick={saveTemplate}><AIcon name="save" size={13} /> {t("save") || "Save"}</button>
                        </div>
                    )}
                    {templates.length === 0 ? <div className="airdrop-history-empty">{t("templatesEmpty")}</div> : (
                        <div className="airdrop-history-list">{templates.map((tmpl, i) => (
                            <div key={i} className="airdrop-book-item">
                                <div className="airdrop-book-info"><span className="airdrop-book-name">{tmpl.name}</span><span className="airdrop-book-count">{tmpl.amount} · {tmpl.amountMode}</span></div>
                                <div className="airdrop-book-actions">
                                    <button className="airdrop-select-btn" title={t("templateLoad")} onClick={() => loadTemplate(tmpl)}><AIcon name="upload" size={12} /></button>
                                    <button className="airdrop-select-btn" title={t("templateDelete")} onClick={() => deleteTemplate(i)}><AIcon name="trash" size={12} /></button>
                                </div>
                            </div>
                        ))}</div>
                    )}
                </div>
            )}
            <div className="airdrop-token-selector">
                <button className="airdrop-token-current" onClick={() => { playClick(); setShowTokenSelector(!showTokenSelector); if (!showTokenSelector) fetchTokenBalances(); }}>
                    <AIcon name="coins" size={14} />
                    <span className="airdrop-token-symbol">${tokenSymbol}</span>
                    <span className="airdrop-token-addr-full">{tokenAddress}</span>
                    <a href={`${XLAYER_EXPLORER}/token/${tokenAddress}`} target="_blank" rel="noopener noreferrer" className="airdrop-token-explorer-link" onClick={e => e.stopPropagation()} title="View on Explorer"><AIcon name="link" size={10} /></a>
                    <span className="lang-arrow">{showTokenSelector ? "▲" : "▼"}</span>
                </button>
                {tokenAddress !== BANMAO_TOKEN && (
                    <button className="airdrop-token-reset" onClick={resetToDefaultToken} title="Reset to BANMAO"><AIcon name="refresh" size={12} /></button>
                )}
            </div>
            <p className="token-selector-hint"><AIcon name="info" size={11} /> {(t("tokenSelectorHint") || "Tap above to change the airdrop token. You can airdrop any ERC-20 token on XLayer.").replace("{token}", `$${tokenSymbol}`)}</p>
            {showTokenSelector && (
                <div className="airdrop-history-panel">
                    <div className="airdrop-history-title"><AIcon name="coins" size={15} /> {t("selectToken") || "Select Token"}</div>
                    <button className={`airdrop-book-item ${tokenAddress === BANMAO_TOKEN ? "selected" : ""}`} style={{ cursor: "pointer", border: "none", background: tokenAddress === BANMAO_TOKEN ? "rgba(249,115,22,0.1)" : "transparent", width: "100%" }} onClick={resetToDefaultToken}>
                        <div className="airdrop-book-info" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                            <span className="airdrop-book-name">$BANMAO</span>
                            <span className="airdrop-token-addr-inline">
                                {BANMAO_TOKEN}
                                <a href={`${XLAYER_EXPLORER}/token/${BANMAO_TOKEN}`} target="_blank" rel="noopener noreferrer" className="airdrop-token-explorer-link" onClick={e => e.stopPropagation()}><AIcon name="link" size={10} /></a>
                            </span>
                        </div>
                        {tokenAddress === BANMAO_TOKEN && <AIcon name="check" size={14} className="text-green" />}
                    </button>
                    {/* Saved custom tokens */}
                    {savedTokens.map((st) => (
                        <div key={st.address} className={`airdrop-book-item ${tokenAddress.toLowerCase() === st.address.toLowerCase() ? "selected" : ""}`}
                            style={{ cursor: "pointer", border: "none", background: tokenAddress.toLowerCase() === st.address.toLowerCase() ? "rgba(168,85,247,0.1)" : "transparent", width: "100%", display: "flex", alignItems: "center" }}
                            onClick={() => { setTokenAddress(st.address); setTokenSymbol(st.symbol); setTokenDecimals(st.decimals); setShowTokenSelector(false); playClick(); }}>
                            <div className="airdrop-book-info" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2, flex: 1 }}>
                                <span className="airdrop-book-name">${st.symbol} {savedTokenBalances[st.address.toLowerCase()] && <span className="token-balance-badge">{savedTokenBalances[st.address.toLowerCase()]}</span>}</span>
                                <span className="airdrop-token-addr-inline">
                                    {st.address}
                                    <a href={`${XLAYER_EXPLORER}/token/${st.address}`} target="_blank" rel="noopener noreferrer" className="airdrop-token-explorer-link" onClick={e => e.stopPropagation()}><AIcon name="link" size={10} /></a>
                                </span>
                            </div>
                            <button className="airdrop-saved-token-delete" onClick={e => { e.stopPropagation(); removeSavedToken(st.address); playClick(); }} title="Remove"><AIcon name="trash" size={11} /></button>
                            {tokenAddress.toLowerCase() === st.address.toLowerCase() && <AIcon name="check" size={14} className="text-green" />}
                        </div>
                    ))}
                    <div className="airdrop-book-save" style={{ marginTop: 8 }}>
                        <input type="text" className="airdrop-book-input" placeholder="0x... (Custom Token)" value={customTokenInput} onChange={e => setCustomTokenInput(e.target.value)} onKeyDown={e => e.key === "Enter" && resolveCustomToken()} />
                        <button className="airdrop-book-save-btn" onClick={resolveCustomToken} disabled={tokenLoading}>
                            {tokenLoading ? <span className="airdrop-spinner" /> : <AIcon name="target" size={13} />} {t("loadToken") || "Load"}
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="airdrop-tabs">
                <button className={`airdrop-tab ${activeTab === "manual" ? "active" : ""}`} data-tab="manual" onClick={() => { playClick(); setActiveTab("manual"); }}><AIcon name="edit" size={14} /> {t("airdropManualTab")}</button>
                <button className={`airdrop-tab ${activeTab === "scan" ? "active" : ""}`} data-tab="scan" onClick={() => { playClick(); setActiveTab("scan"); }}><AIcon name="target" size={14} /> {t("airdropScanTab")}</button>
                <button className={`airdrop-tab ${activeTab === "csv" ? "active" : ""}`} data-tab="csv" onClick={() => { playClick(); setActiveTab("csv"); }}><AIcon name="file" size={14} /> {t("airdropCsvTab") || "CSV"}</button>
            </div>

            {/* Manual */}
            {activeTab === "manual" && (
                <div className="airdrop-tab-content">
                    <div className="airdrop-input-group">
                        <label className="airdrop-label"><AIcon name="users" size={14} /> {t("airdropAddressLabel")}</label>
                        <textarea className="airdrop-textarea" value={addressInput} onChange={e => setAddressInput(e.target.value)} placeholder={amountMode === "custom" ? "0x1234...abcd, 100\n0x5678...efgh, 500" : t("airdropAddressPlaceholder")} rows={6} />
                        <div className="airdrop-address-stats">
                            {parsedAddresses.length > 0 && <span className="airdrop-stat-valid"><AIcon name="check" size={12} /> {parsedAddresses.length} {t("airdropValidAddresses")}</span>}
                            {invalidAddresses.length > 0 && <span className="airdrop-stat-invalid"><AIcon name="xCircle" size={12} /> {invalidAddresses.length} {t("airdropInvalidAddresses")}</span>}
                            {duplicateCount > 0 && <span className="airdrop-stat-dupe" style={{ cursor: "pointer" }} onClick={() => { playClick(); const lines = addressInput.split(/\n/).map(s => s.trim()).filter(Boolean); const seen = new Set<string>(); const unique = lines.filter(l => { const m = l.match(/0x[a-fA-F0-9]{40}/i); if (!m) return true; const norm = m[0].toLowerCase(); if (seen.has(norm)) return false; seen.add(norm); return true; }); setAddressInput(unique.join('\n')); showToast(`${duplicateCount} duplicates removed`); }} title="Click to remove duplicates"><AIcon name="refresh" size={12} /> {duplicateCount} {t("airdropDuplicates")}</span>}
                        </div>
                        {/* Duplicate address details */}
                        {duplicateAddresses.length > 0 && (
                            <details style={{ marginTop: 4, fontSize: 11, color: "#f97316" }}>
                                <summary style={{ cursor: "pointer" }}>⚠️ {duplicateAddresses.length} {t("airdropDuplicates")}: {t("clickToRemoveDupes") || "click to see"}</summary>
                                <div style={{ maxHeight: 100, overflowY: "auto", marginTop: 4, padding: 4, background: "rgba(249,115,22,0.08)", borderRadius: 6 }}>
                                    {duplicateAddresses.map((a, i) => (
                                        <div key={i} style={{ fontFamily: "monospace", fontSize: 10, color: "#ccc", padding: "1px 0" }}>{a}</div>
                                    ))}
                                </div>
                            </details>
                        )}
                        {/* QR Scan button (#6) */}
                        <button className="airdrop-qr-btn" onClick={startQrScanner} onMouseEnter={() => playHover()}>
                            <AIcon name="target" size={14} /> {t("qrScanAddress") || "📷 QR Scan"}
                        </button>
                    </div>
                </div>
            )}

            {/* Scan */}
            {activeTab === "scan" && (
                <div className="airdrop-tab-content">
                    {/* Sub-mode toggle */}
                    <div className="airdrop-scan-mode-toggle">
                        <button className={`airdrop-scan-mode-btn ${scanMode === "wallets" ? "active" : ""}`} onClick={() => { playClick(); setScanMode("wallets"); }}>
                            <AIcon name="target" size={14} /> {t("scanModeWallets") || "Scan Wallets"}
                            <span className="scan-mode-badge">XLayer</span>
                        </button>
                        <button className={`airdrop-scan-mode-btn ${scanMode === "holders" ? "active" : ""}`} onClick={() => { playClick(); setScanMode("holders"); }}>
                            <AIcon name="users" size={14} /> {t("scanModeHolders") || "Scan Holders"}
                            <span className="scan-mode-badge">{t("scanModeMultiChain") || "Multi-Chain"}</span>
                        </button>
                    </div>

                    {/* ═══ Mode 1: Scan Active Wallets (XLayer) ═══ */}
                    {scanMode === "wallets" && (
                        <>
                            <div className="airdrop-scan-header">
                                <p className="airdrop-scan-desc">{(scanChain === "xlayer" ? t("airdropScanDesc") : `${t("scanChainDesc") || "Scan"} ${WALLET_CHAINS.find(c => c.key === scanChain)?.name || scanChain} ${t("scanChainDescEnd") || "for active wallets. Addresses without {token} on XLayer will be shown."}`).replace(/\$BANMAO/g, `$${tokenSymbol}`).replace(/\{token\}/g, `$${tokenSymbol}`)}</p>
                                {/* Chain selector */}
                                <div className="scan-chain-selector">
                                    {WALLET_CHAINS.map(c => (
                                        <button key={c.key} className={`scan-chain-btn ${scanChain === c.key ? "active" : ""}`} onClick={() => { playClick(); setScanChain(c.key); }} onMouseEnter={() => playHover()}>
                                            <span className="scan-chain-icon">{c.icon}</span>
                                            <span className="scan-chain-name">{c.name}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="airdrop-scan-combined-hint">
                                    <div className="scan-hint-icon">💡</div>
                                    <div className="scan-hint-content">
                                        <p className="scan-hint-main"><AIcon name="info" size={12} /> {(t("scanCombinedHint1") || "Wallets that already hold {token} will be automatically excluded. You can scan multiple times to accumulate unique addresses.").replace("{token}", `$${tokenSymbol}`)}</p>
                                        <p className="scan-hint-sub"><AIcon name="bolt" size={12} /> {(t("scanCombinedHint2") || "Each scan explores new blockchain blocks to find active wallets without {token}. Spread {token} and grow the community!").replace(/\{token\}/g, `$${tokenSymbol}`)}</p>
                                    </div>
                                </div>
                                <div className="airdrop-scan-btn-group">
                                    {autoScanActive ? (
                                        <button className="airdrop-scan-btn" style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }} onClick={stopAutoScan} onMouseEnter={() => playHover()}>
                                            <span className="airdrop-spinner" /> {t("autoScanStop") || "Stop Auto-Scan"} (#{scanCount})
                                        </button>
                                    ) : (
                                        <>
                                            <button className="airdrop-scan-btn" onClick={handleScan} disabled={isScanning} onMouseEnter={() => playHover()}>
                                                {isScanning ? <><span className="airdrop-spinner" /> {t("airdropScanning")} ({WALLET_CHAINS.find(c => c.key === scanChain)?.name})</> : <><AIcon name="target" size={14} /> {scannedWallets.length > 0 ? `${t("airdropScanMore")} (#${scanCount + 1})` : t("airdropScanButton")} — {WALLET_CHAINS.find(c => c.key === scanChain)?.name}</>}
                                            </button>
                                            <button className="airdrop-scan-btn" style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", flex: "0 0 auto", padding: "0 16px" }} onClick={startAutoScan} disabled={isScanning} onMouseEnter={() => playHover()} title={t("autoScanStart") || "Auto-scan continuously"}>
                                                🔄 {t("autoScanStart") || "Auto"}
                                            </button>
                                        </>
                                    )}
                                    {scannedWallets.length > 0 && (
                                        <button className="airdrop-scan-clear-btn" onClick={clearScanned} onMouseEnter={() => playHover()}>
                                            <AIcon name="trash" size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {/* #3 Scan Progress Bar */}
                            {(isScanning || autoScanActive) && scanProgress && (
                                <div className="airdrop-scan-progress">
                                    <div className="airdrop-scan-progress-bar">
                                        <div className="airdrop-scan-progress-fill" style={{ width: `${Math.min(100, (scanProgress.scannedBlocks / scanProgress.totalBlocks) * 100)}%` }} />
                                    </div>
                                    <div className="airdrop-scan-progress-info">
                                        <span>📦 {scanProgress.scannedBlocks.toLocaleString()} / {scanProgress.totalBlocks.toLocaleString()} blocks</span>
                                        <span>👛 {scanProgress.walletsFound} {t("airdropScanCount")}</span>
                                    </div>
                                </div>
                            )}
                            {scanError && <div className="airdrop-scan-error"><AIcon name="warning" size={14} /> {scanError}</div>}
                            {scannedWallets.length > 0 && (
                                <>
                                    <div className="airdrop-scan-actions">
                                        <span className="airdrop-scan-count">{scannedWallets.length} {t("airdropScanCount")} · {scanCount} {t("airdropScanTimes")}</span>
                                        <div className="airdrop-scan-buttons">
                                            <button className="airdrop-select-btn" onClick={() => { playClick(); setSelectedWallets(new Set(scannedWallets.map(w => w.address))); }}><AIcon name="checkSmall" size={12} /> {t("airdropSelectAll")}</button>
                                            <button className="airdrop-select-btn" onClick={() => { playClick(); setSelectedWallets(new Set()); }}><AIcon name="xCircle" size={12} /> {t("airdropDeselectAll")}</button>
                                            <button className="airdrop-select-btn export" onClick={() => {
                                                playClick();
                                                const csv = ["address,OKB,USDT", ...scannedWallets.map(w => `${w.address},${w.balances.OKB || "0"},${w.balances.USDT || "0"}`)];
                                                downloadFile(csv.join("\n"), `scanned_wallets_${Date.now()}.csv`);
                                                showToast(`${scannedWallets.length} ${t("addressesImported")} → CSV`);
                                            }}>📥 {t("airdropExportCsv")}</button>
                                        </div>
                                    </div>
                                    <div className="airdrop-wallet-list">
                                        {scannedWallets.map(w => (
                                            <div key={w.address} className={`airdrop-wallet-card ${selectedWallets.has(w.address) ? "selected" : ""}`}>
                                                <div className="airdrop-wallet-row" onClick={() => { playClick(); toggleWallet(w.address); }}>
                                                    <div className="airdrop-wallet-check">{selectedWallets.has(w.address) ? <AIcon name="check" size={16} className="text-green" /> : <span className="check-empty" />}</div>
                                                    <span className="airdrop-wallet-full-addr">{w.address}</span>
                                                </div>
                                                <div className="airdrop-wallet-meta">
                                                    <div className="airdrop-wallet-balances">
                                                        {parseFloat(w.balances.OKB) > 0 && <span className="airdrop-wallet-bal"><AIcon name="coins" size={11} /> {parseFloat(w.balances.OKB).toFixed(4)} OKB</span>}
                                                        {parseFloat(w.balances.USDT) > 0 && <span className="airdrop-wallet-bal"><AIcon name="coins" size={11} /> ${parseFloat(w.balances.USDT).toFixed(2)}</span>}
                                                        {parseFloat(w.balances.OKB) === 0 && parseFloat(w.balances.USDT) === 0 && <span className="airdrop-wallet-bal dim">{t("airdropActiveWallet")}</span>}
                                                    </div>
                                                    <div className="airdrop-wallet-actions">
                                                        <button className="airdrop-wallet-action-btn" title={t("airdropCopyAddress")} onClick={(e) => { e.stopPropagation(); copyText(w.address); showToast(t("airdropAddressCopied")); }}><AIcon name="copy" size={12} /></button>
                                                        <a className="airdrop-wallet-action-btn" title={t("airdropViewOnExplorer")} href={`${XLAYER_EXPLORER}/address/${w.address}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}><AIcon name="link" size={12} /></a>
                                                        <button className="airdrop-wallet-action-btn" title={t("airdropViewAssets")} onClick={(e) => { e.stopPropagation(); setExpandedWallet(expandedWallet === w.address ? null : w.address); }}><AIcon name="wallet" size={12} /></button>
                                                    </div>
                                                </div>
                                                {expandedWallet === w.address && (
                                                    <div className="airdrop-wallet-detail">
                                                        <div className="airdrop-wallet-detail-title"><AIcon name="wallet" size={13} /> {t("airdropViewAssets")}</div>
                                                        <div className="airdrop-wallet-detail-grid">
                                                            <div className="airdrop-wallet-asset"><span className="asset-label">OKB</span><span className="asset-value">{parseFloat(w.balances.OKB).toFixed(6)}</span></div>
                                                            <div className="airdrop-wallet-asset"><span className="asset-label">USDT</span><span className="asset-value">${parseFloat(w.balances.USDT).toFixed(4)}</span></div>
                                                        </div>
                                                        <a className="airdrop-wallet-explorer-link" href={`${XLAYER_EXPLORER}/address/${w.address}`} target="_blank" rel="noopener noreferrer">
                                                            <AIcon name="link" size={12} /> {t("airdropViewOnExplorer")}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {selectedWallets.size > 0 && <div className="airdrop-selected-count"><AIcon name="check" size={13} /> {selectedWallets.size} {t("airdropSelected")}</div>}
                                </>
                            )}
                        </>
                    )}

                    {/* ═══ Mode 2: Scan Token Holders (Multi-Chain) ═══ */}
                    {scanMode === "holders" && (
                        <>
                            <p className="airdrop-scan-desc">{t("scanHoldersDesc")}</p>

                            {/* Chain selector pills */}
                            <div className="airdrop-chain-selector">
                                {SCAN_CHAINS.map(c => (
                                    <button key={c.id} className={`airdrop-chain-pill ${holderChain === c.id ? "active" : ""}`} onClick={() => handleChainChange(c.id)} onMouseEnter={() => playHover()}>
                                        <span className="chain-emoji">{c.emoji}</span> {c.name}
                                    </button>
                                ))}
                            </div>

                            {/* Hot tokens grid */}
                            {hotTokensLoading && <div className="airdrop-scan-note" style={{ textAlign: "center" }}><span className="airdrop-spinner" /> {t("hotTokensLoading")}</div>}
                            {hotTokens.length > 0 && (
                                <div className="airdrop-hot-tokens">
                                    <div className="airdrop-hot-tokens-title"><AIcon name="chart" size={14} /> {t("hotTokensTitle")}</div>
                                    <div className="airdrop-hot-tokens-grid">
                                        {hotTokens.slice(0, 12).map(tok => (
                                            <button key={tok.tokenContractAddress} className={`airdrop-hot-token-card ${selectedHotToken === tok.tokenContractAddress ? "active" : ""}`} onClick={() => { playClick(); setSelectedHotToken(tok.tokenContractAddress); setHolderTokenInput(""); }}>
                                                <span className="hot-token-symbol">{tok.tokenSymbol}</span>
                                                <span className="hot-token-price">${parseFloat(tok.price || "0") < 0.01 ? parseFloat(tok.price).toExponential(1) : parseFloat(tok.price).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                                {tok.priceChange24h && <span className={`hot-token-change ${parseFloat(tok.priceChange24h) >= 0 ? "up" : "down"}`}>{parseFloat(tok.priceChange24h) >= 0 ? "+" : ""}{parseFloat(tok.priceChange24h).toFixed(1)}%</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Custom token input */}
                            <div className="airdrop-holder-input-row">
                                <input type="text" className="airdrop-book-input" placeholder="0x... (Token Contract Address)" value={holderTokenInput} onChange={e => { setHolderTokenInput(e.target.value); setSelectedHotToken(""); }} />
                                {!hotTokens.length && !hotTokensLoading && (
                                    <button className="airdrop-book-save-btn" onClick={() => fetchHotTokens(holderChain)} style={{ whiteSpace: "nowrap" }}>
                                        <AIcon name="chart" size={13} /> {t("hotTokensTitle")}
                                    </button>
                                )}
                            </div>

                            {/* Tag filter */}
                            <div className="airdrop-holder-filters">
                                {HOLDER_TAGS.map(tag => (
                                    <button key={tag.id} className={`airdrop-holder-tag ${holderTagFilter === tag.id ? "active" : ""}`} onClick={() => { playClick(); setHolderTagFilter(tag.id); }}>
                                        {tag.emoji} {t(tag.label) || tag.label}
                                    </button>
                                ))}
                            </div>

                            {/* Scan holders button */}
                            <button className="airdrop-scan-btn" onClick={() => scanHolders()} disabled={holderScanning || (!selectedHotToken && !holderTokenInput)} onMouseEnter={() => playHover()} style={{ marginTop: 8 }}>
                                {holderScanning ? <><span className="airdrop-spinner" /> {t("scanningHolders")}</> : <><AIcon name="users" size={14} /> {t("scanHolders")}</>}
                            </button>

                            {/* Token Info Card (#6) */}
                            {selectedHotToken && hotTokens.length > 0 && (() => {
                                const tok = hotTokens.find(tk => tk.tokenContractAddress === selectedHotToken);
                                if (!tok) return null;
                                return (
                                    <div className="airdrop-token-info-card">
                                        <div className="token-info-header">
                                            <span className="token-info-symbol">{tok.tokenSymbol}</span>
                                            <span className="token-info-name">{tok.tokenName}</span>
                                        </div>
                                        <div className="token-info-grid">
                                            <div className="token-info-stat">
                                                <span className="token-info-label">{t("tokenPrice") || "Price"}</span>
                                                <span className="token-info-value">${parseFloat(tok.price || "0") < 0.01 ? parseFloat(tok.price).toExponential(2) : parseFloat(tok.price).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                            </div>
                                            {tok.priceChange24h && <div className="token-info-stat">
                                                <span className="token-info-label">24h</span>
                                                <span className={`token-info-value ${parseFloat(tok.priceChange24h) >= 0 ? "up" : "down"}`}>{parseFloat(tok.priceChange24h) >= 0 ? "+" : ""}{parseFloat(tok.priceChange24h).toFixed(2)}%</span>
                                            </div>}
                                            {tok.marketCap && parseFloat(tok.marketCap) > 0 && <div className="token-info-stat">
                                                <span className="token-info-label">{t("tokenMcap") || "MCap"}</span>
                                                <span className="token-info-value">${(parseFloat(tok.marketCap) / 1e6).toFixed(1)}M</span>
                                            </div>}
                                            {tok.volume24h && parseFloat(tok.volume24h) > 0 && <div className="token-info-stat">
                                                <span className="token-info-label">{t("tokenVolume") || "Vol"}</span>
                                                <span className="token-info-value">${(parseFloat(tok.volume24h) / 1e3).toFixed(1)}K</span>
                                            </div>}
                                            {tok.holders && parseFloat(tok.holders) > 0 && <div className="token-info-stat">
                                                <span className="token-info-label">{t("tokenHolders") || "Holders"}</span>
                                                <span className="token-info-value">{parseInt(tok.holders).toLocaleString()}</span>
                                            </div>}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Holder results */}
                            {holderResults.length > 0 && (
                                <div className="airdrop-holder-results">
                                    {/* Overlap warning (#5) */}
                                    {holderOverlapCount > 0 && (
                                        <div className="airdrop-overlap-warning">
                                            <AIcon name="warning" size={13} /> {holderOverlapCount} {t("holdersOverlap") || "addresses already in your airdrop list"}
                                        </div>
                                    )}

                                    {/* Balance filter (#2) */}
                                    <div className="airdrop-holder-balance-filter">
                                        <label className="holder-filter-label"><AIcon name="coins" size={12} /> {t("holderMinBalance") || "Min Balance"}</label>
                                        <input type="number" className="holder-filter-input" placeholder="0" value={holderMinBalance} onChange={e => setHolderMinBalance(e.target.value)} min="0" step="any" />
                                        <span className="holder-filter-count">{filteredHolders.length}/{holderResults.length}</span>
                                    </div>

                                    {/* Quick Actions bar (#9) */}
                                    <div className="airdrop-scan-actions">
                                        <span className="airdrop-scan-count">{filteredHolders.length} {t("holdersFound")}</span>
                                        <div className="airdrop-scan-buttons">
                                            <button className="airdrop-select-btn" onClick={() => { playClick(); setSelectedHolders(new Set(filteredHolders.map(h => h.address))); }}>
                                                <AIcon name="checkSmall" size={12} /> {t("airdropSelectAll")}
                                            </button>
                                            <button className="airdrop-select-btn" onClick={() => { playClick(); setSelectedHolders(new Set()); }}>
                                                <AIcon name="xCircle" size={12} /> {t("airdropDeselectAll")}
                                            </button>
                                            <button className="airdrop-select-btn" onClick={exportHoldersCSV}>
                                                <AIcon name="file" size={12} /> CSV
                                            </button>
                                        </div>
                                    </div>

                                    {/* Holder list with checkboxes */}
                                    <div className="airdrop-holder-list">
                                        {filteredHolders.slice(0, 30).map((h, i) => (
                                            <div key={h.address} className={`airdrop-holder-item ${selectedHolders.has(h.address) ? "selected" : ""}`} onClick={() => { playClick(); setSelectedHolders(prev => { const s = new Set(prev); s.has(h.address) ? s.delete(h.address) : s.add(h.address); return s; }); }}>
                                                <div className="airdrop-wallet-check">{selectedHolders.has(h.address) ? <AIcon name="check" size={14} className="text-green" /> : <span className="check-empty" />}</div>
                                                <span className="airdrop-recipient-index">#{i + 1}</span>
                                                <span className="airdrop-wallet-full-addr">{h.address}</span>
                                                {parseFloat(h.amount) > 0 && <span className="holder-balance-badge">{parseFloat(h.amount) > 1e6 ? `${(parseFloat(h.amount)/1e6).toFixed(1)}M` : parseFloat(h.amount) > 1e3 ? `${(parseFloat(h.amount)/1e3).toFixed(1)}K` : parseFloat(h.amount).toFixed(2)}</span>}
                                                <div className="holder-item-actions" onClick={e => e.stopPropagation()}>
                                                    <button className="airdrop-wallet-action-btn" onClick={() => { copyText(h.address); showToast(t("airdropAddressCopied")); }}><AIcon name="copy" size={11} /></button>
                                                    <a className="airdrop-wallet-action-btn" href={getHolderExplorerUrl(h.address)} target="_blank" rel="noopener noreferrer"><AIcon name="link" size={11} /></a>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredHolders.length > 30 && <div className="airdrop-recipient-more">+{filteredHolders.length - 30} {t("airdropMoreAddresses")}</div>}
                                    </div>

                                    {/* Import selected */}
                                    {(selectedHolders.size > 0 || filteredHolders.length > 0) && (
                                        <div className="airdrop-holder-import-bar">
                                            <span className="airdrop-selected-count"><AIcon name="check" size={13} /> {selectedHolders.size > 0 ? `${selectedHolders.size} ${t("airdropSelected")}` : t("importAllHolders") || "Import all"}</span>
                                            <button className="airdrop-scan-btn" onClick={importHolders} style={{ padding: "8px 20px", fontSize: 13 }}>
                                                <AIcon name="download" size={14} /> {t("importHolders")}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* CSV */}
            {activeTab === "csv" && (
                <div className="airdrop-tab-content">
                    <div className={`airdrop-csv-zone ${csvDragOver ? "drag-over" : ""}`} onDragOver={e => { e.preventDefault(); setCsvDragOver(true); }} onDragLeave={() => setCsvDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                        <div className="airdrop-csv-icon"><AIcon name="upload" size={40} /></div>
                        <div className="airdrop-csv-text">{t("airdropCsvDragDrop") || "Drag & Drop CSV"}</div>
                        <div className="airdrop-csv-format">{t("airdropCsvFormat") || "address,amount per line"}</div>
                        <input ref={fileInputRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleCSVFile(e.target.files[0]); e.target.value = ""; }} />
                    </div>
                </div>
            )}


            {/* Amount */}
            <div className="airdrop-amount-section">
                <div className="airdrop-amount-mode-toggle">
                    <label className="airdrop-label"><AIcon name="coins" size={14} /> {t("airdropAmountLabel")}</label>
                    <div className="airdrop-mode-btns">
                        <button className={`airdrop-mode-btn ${amountMode === "equal" ? "active" : ""}`} onClick={() => { playClick(); setAmountMode("equal"); }}>{t("airdropEqualAmount") || "Equal"}</button>
                        <button className={`airdrop-mode-btn ${amountMode === "custom" ? "active" : ""}`} onClick={() => { playClick(); setAmountMode("custom"); }}>{t("airdropCustomAmount") || "Custom"}</button>
                    </div>
                </div>
                {amountMode === "equal" ? (
                    <>
                        <div className="airdrop-amount-input-wrapper">
                            <input type="number" className="airdrop-amount-input" value={amountPerWallet} onChange={e => setAmountPerWallet(e.target.value)} placeholder="100" min="1" />
                            {/* #7: Max balance button */}
                            {isConnected && recipients.length > 0 && balanceNum > 0 && (
                                <button className="airdrop-max-btn" onClick={() => { playClick(); setAmountPerWallet(String(Math.floor(balanceNum / recipients.length))); }} title={`Max: ${formatNum(Math.floor(balanceNum / recipients.length))} per wallet`}>MAX</button>
                            )}
                            <span className="airdrop-amount-suffix">${tokenSymbol}</span>
                        </div>
                        {/* USD Value Hint */}
                        {tokenPrice > 0 && amountPerWallet && parseFloat(amountPerWallet) > 0 && (
                            <div className="airdrop-usd-hint">
                                <span>{parseFloat(amountPerWallet).toLocaleString()} × ${tokenPrice.toFixed(10).replace(/0+$/, '').replace(/\.$/, '')} = <strong>${(parseFloat(amountPerWallet) * tokenPrice).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')} USD</strong>/{t("airdropWallets") || "wallet"}</span>
                                {recipients.length > 0 && <span className="airdrop-usd-total">Σ {recipients.length} {t("airdropWallets") || "wallets"} = <strong>${(parseFloat(amountPerWallet) * tokenPrice * recipients.length).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} USD</strong></span>}
                            </div>
                        )}
                        <div className="airdrop-quick-amounts">{[100, 500, 1000, 5000, 10000].map(a => (
                            <button key={a} className="airdrop-quick-btn" onClick={() => { playClick(); setAmountPerWallet(a.toString()); }} onMouseEnter={() => playHover()}>{a >= 1000 ? `${a / 1000}K` : a}</button>
                        ))}</div>
                    </>
                ) : (
                    <div className="airdrop-custom-info"><p className="airdrop-scan-desc">{t("airdropCustomAmountDesc") || "address,amount per line"}</p>{customAmounts.size > 0 && <div className="airdrop-stat-valid"><AIcon name="check" size={12} /> {customAmounts.size} {t("airdropCustomAmountsDetected") || "custom amounts"}</div>}</div>
                )}
                <div className="airdrop-balance-gas-row">
                    {isConnected && banmaoBalance && <div className="airdrop-balance-display" title={t("tooltipBanmaoBalance")}><AIcon name="wallet" size={13} /> {formatNum(balanceNum)} ${tokenSymbol}</div>}
                    {isConnected && okbBalance && <div className="airdrop-gas-display" title={t("tooltipOkbBalance")}><AIcon name="fuel" size={13} /> {okbNum.toFixed(4)} OKB</div>}
                    {estimatedGas && <div className="airdrop-gas-display" title={t("tooltipGasEstimate")} style={{ opacity: 0.7 }}><AIcon name="chart" size={13} /> {estimatedGas}</div>}
                </div>
                <a href="/gamefi/banmaosnake" target="_blank" rel="noopener noreferrer" className="airdrop-game-tip">
                    <AIcon name="bolt" size={13} />
                    <span>{(t("airdropGameTip") || "").replace(/\$BANMAO/g, `$${tokenSymbol}`)}</span>
                    <AIcon name="link" size={11} />
                </a>
                {recipients.length > 0 && totalAmount > 0 && (
                    <div className="airdrop-summary">
                        <div className="airdrop-summary-row"><span><AIcon name="users" size={12} /> {t("airdropRecipients")}:</span><span>{recipients.length}</span></div>
                        {amountMode === "equal" && <div className="airdrop-summary-row"><span><AIcon name="coins" size={12} /> {t("airdropEach")}:</span><span>{formatNum(amountNum)}</span></div>}
                        <div className="airdrop-summary-row total"><span><AIcon name="chart" size={12} /> {t("airdropTotal")}:</span><span>{formatNum(totalAmount)} ${tokenSymbol}</span></div>
                        {/* #15 Gas Optimization Info */}
                        {sendMode === "batch" && recipients.length > 1 && (
                            <div className="airdrop-summary-row">
                                <span className="gas-savings-badge">⛽ {lang === "vi" ? "Tiết kiệm" : "Save"} ~{((recipients.length - 1) * 0.00015).toFixed(4)} OKB {lang === "vi" ? "so với gửi riêng" : "vs sequential"}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Scheduler (#7) */}
            {isConnected && recipients.length > 0 && totalAmount > 0 && (
                <div className="airdrop-scheduler">
                    <div className="airdrop-scheduler-header">
                        <AIcon name="clock" size={14} />
                        <span>{t("scheduleAirdrop") || "Schedule Airdrop"}</span>
                    </div>
                    {!scheduleActive ? (
                        <div className="airdrop-scheduler-row">
                            <input type="datetime-local" className="airdrop-schedule-input" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} min={new Date().toISOString().slice(0, 16)} />
                            <button className="airdrop-schedule-btn" onClick={startSchedule} disabled={!scheduledTime}><AIcon name="clock" size={13} /> {t("scheduleStart") || "Set"}</button>
                        </div>
                    ) : (
                        <div className="airdrop-scheduler-active">
                            <div className="airdrop-schedule-countdown"><AIcon name="bolt" size={16} /> {scheduleCountdown}</div>
                            <button className="airdrop-cancel-btn" onClick={cancelSchedule} style={{ margin: 0, padding: "6px 12px", fontSize: "12px" }}><AIcon name="xCircle" size={12} /> {t("scheduleCancel") || "Cancel"}</button>
                        </div>
                    )}
                </div>
            )}

            {/* QR Scanner Modal (#6) */}
            {showQrScanner && (
                <div className="airdrop-qr-modal">
                    <div className="airdrop-qr-content">
                        <div className="airdrop-qr-header">
                            <span><AIcon name="target" size={16} /> {t("qrScanTitle") || "Scan QR Code"}</span>
                            <button onClick={stopQrScanner}><AIcon name="xCircle" size={18} /></button>
                        </div>
                        <video ref={videoRef} className="airdrop-qr-video" autoPlay playsInline muted />
                        <p className="airdrop-qr-hint">{t("qrScanHint") || "Point camera at a QR code containing a wallet address"}</p>
                    </div>
                </div>
            )}

            {/* Action */}
            {!isConnected ? (
                <div className="airdrop-connect-msg"><AIcon name="wallet" size={16} /> {t("airdropConnectWallet")}</div>
            ) : (
                <button className="airdrop-execute-btn" disabled={!recipients.length || totalAmount <= 0 || !hasEnough || scheduleActive} onClick={() => { playClick(); setStep("preview"); scrollToPanel(); }} onMouseEnter={() => playHover()}>
                    {scheduleActive ? <><AIcon name="clock" size={16} /> {scheduleCountdown}</>
                        : !hasEnough && totalAmount > 0 ? <><AIcon name="warning" size={16} /> {t("airdropInsufficientBalance")}</>
                            : !recipients.length ? <><AIcon name="plus" size={16} /> {t("airdropAddAddresses")}</>
                                : <><AIcon name="parachute" size={16} /> {t("airdropPreviewBtn")} ({recipients.length} {t("airdropWallets")})</>}
                </button>
            )}
        </div>
    );

    // ---- SIDE PANELS: Leaderboard (left) + History (right) ----
    const leaderboardPanel = (
        <div className="airdrop-side-panel side-leaderboard">
            <div className="side-panel-header">
                <AIcon name="chart" size={16} />
                <span>{t("lbTab") || "Leaderboard"}</span>
            </div>
            {lbStats && (
                <div className="lb-stats-bar">
                    <div className="lb-stat-item"><span className="lb-stat-num">{Number(lbStats.unique_senders || 0)}</span><span className="lb-stat-label">{t("lbSenders") || "Senders"}</span></div>
                    <div className="lb-stat-item"><span className="lb-stat-num">{Number(lbStats.total_airdrops || 0)}</span><span className="lb-stat-label">{t("lbAirdrops") || "Airdrops"}</span></div>
                    <div className="lb-stat-item"><span className="lb-stat-num">{Number(lbStats.total_recipients || 0).toLocaleString()}</span><span className="lb-stat-label">{t("lbRecipients") || "Recipients"}</span></div>
                </div>
            )}
            {leaderboardData.length === 0 ? (
                <div className="side-empty">{t("lbEmpty") || "No airdrop records yet. Be the first!"}</div>
            ) : (
                <>
                    {/* #9: Mini bar chart */}
                    {leaderboardData.length > 1 && (
                        <div className="lb-chart">
                            {leaderboardData.slice(0, 5).map((row: any, i: number) => {
                                const amt = Number(BigInt(row.total_amount || "0") / BigInt(1e18));
                                const maxAmt = Number(BigInt(leaderboardData[0]?.total_amount || "1") / BigInt(1e18));
                                const pct = maxAmt > 0 ? (amt / maxAmt * 100) : 0;
                                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                                return (
                                    <div key={row.address} className="lb-chart-bar">
                                        <span className="lb-chart-label">{medal}</span>
                                        <div className="lb-chart-track">
                                            <div className="lb-chart-fill" style={{ width: `${Math.max(pct, 5)}%` }} />
                                        </div>
                                        <span className="lb-chart-val">{amt > 1e6 ? `${(amt / 1e6).toFixed(1)}M` : amt > 1e3 ? `${(amt / 1e3).toFixed(1)}K` : amt.toLocaleString()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="lb-table">
                    <div className="lb-header">
                        <span className="lb-col-rank">#</span>
                        <span className="lb-col-addr">{t("lbWallet") || "Wallet"}</span>
                        <span className="lb-col-amount">{t("lbTotalAmount") || "Total"}</span>
                        <span className="lb-col-count">{t("lbTimes") || "×"}</span>
                    </div>
                    <div className="lb-body">
                        {leaderboardData.map((row: any, i: number) => {
                            const amt = Number(BigInt(row.total_amount || "0") / BigInt(1e18));
                            const isMe = address?.toLowerCase() === row.address?.toLowerCase();
                            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                            const profile = profileMap[row.address?.toLowerCase()];
                            const displayName = profile?.name || row.name || `${row.address.slice(0, 6)}...${row.address.slice(-4)}`;
                            const displayAvatar = profile ? AVATARS[profile.avatar] || AVATARS[0] : "";
                            return (
                                <div key={row.address} className={`lb-row ${isMe ? "lb-row-me" : ""}`}>
                                    <span className="lb-col-rank">{medal}</span>
                                    <span className="lb-col-addr">
                                        {displayAvatar && <span style={{ marginRight: 3 }}>{displayAvatar}</span>}
                                        <span style={{ cursor: "pointer", color: "#e2e8f0" }} onClick={() => setViewProfileAddr(row.address)} title={t("viewProfile") || "View profile"}>{displayName}</span>
                                        {isMe && <span className="lb-you-badge">YOU</span>}
                                        {isMe && <button className="lb-edit-profile-btn" onClick={() => setShowProfileEdit(true)} title={t("editProfile") || "Edit Profile"}>✏️</button>}
                                        <span className="lb-wallet-actions">
                                            <button className="lb-wallet-action" title={t("airdropCopyAddress") || "Copy address"} onClick={() => { copyText(row.address); showToast(t("airdropAddressCopied")); }}><AIcon name="copy" size={10} /></button>
                                            <button className="lb-wallet-action" title={t("airdropViewOnExplorer") || "View on Explorer"} onClick={() => window.open(`${XLAYER_EXPLORER}/address/${row.address}`, "_blank")}><AIcon name="link" size={10} /></button>
                                        </span>
                                    </span>
                                    <span className="lb-col-amount">{amt > 1e6 ? `${(amt / 1e6).toFixed(1)}M` : amt > 1e3 ? `${(amt / 1e3).toFixed(1)}K` : amt.toLocaleString()}</span>
                                    <span className="lb-col-count">{row.total_airdrops}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* #10: Achievement badges */}
                {(() => {
                    const myRow = leaderboardData.find((r: any) => r.address?.toLowerCase() === address?.toLowerCase());
                    if (!myRow) return null;
                    const myAmt = Number(BigInt(myRow.total_amount || "0") / BigInt(1e18));
                    const myCount = Number(myRow.total_airdrops || 0);
                    const myRecip = Number(myRow.total_recipients || 0);
                    const badges: {icon: string; label: string}[] = [];
                    if (myCount >= 1) badges.push({ icon: "\ud83c\udf1f", label: t("badgeFirstAirdrop") || "First Airdrop" });
                    if (myCount >= 10) badges.push({ icon: "\ud83d\udd25", label: t("badge10Airdrops") || "10 Airdrops" });
                    if (myCount >= 50) badges.push({ icon: "\ud83d\udc8e", label: t("badge50Airdrops") || "50 Airdrops" });
                    if (myRecip >= 100) badges.push({ icon: "\ud83c\udf1f", label: t("badge100Recipients") || "100 Recipients" });
                    if (myRecip >= 1000) badges.push({ icon: "\ud83c\udf0d", label: t("badge1kRecipients") || "1K Recipients" });
                    if (myAmt >= 1e6) badges.push({ icon: "\ud83d\udcb0", label: t("badge1mSent") || "1M Sent" });
                    if (myAmt >= 10e6) badges.push({ icon: "\ud83d\udc51", label: t("badge10mSent") || "10M Sent" });
                    const myRank = leaderboardData.findIndex((r: any) => r.address?.toLowerCase() === address?.toLowerCase()) + 1;
                    if (myRank === 1) badges.push({ icon: "\ud83c\udfc6", label: t("badgeWhale") || "#1 Whale" });
                    else if (myRank <= 3 && myRank > 0) badges.push({ icon: "\ud83c\udfc5", label: t("badgeTop3") || "Top 3" });
                    if (badges.length === 0) return null;
                    return (
                        <div className="lb-badges">
                            <div className="lb-badges-title">{t("yourBadges") || "Your Badges"}</div>
                            <div className="lb-badges-list">
                                {badges.map((b, i) => <span key={i} className="lb-badge">{b.icon} {b.label}</span>)}
                            </div>
                        </div>
                    );
                })()}
                </>
            )}
        </div>
    );

    const historyPanel = (() => {
        // #4 History Filter — filter client-side
        const filteredHistory = historyData.filter((row: any) => {
            if (histFilter === "mine" && address) {
                if ((row.sender_address || "").toLowerCase() !== address.toLowerCase()) return false;
            }
            if (histStatusFilter === "success" && !(Number(row.success_count) > 0)) return false;
            if (histStatusFilter === "failed" && Number(row.success_count) > 0) return false;
            return true;
        });

        return (
        <div className="airdrop-side-panel side-history">
            <div className="side-panel-header">
                <AIcon name="clock" size={16} />
                <span>{t("histTab") || "History"}</span>
            </div>
            {/* #4 Filter Bar */}
            <div className="hist-filter-bar">
                <div className="hist-filter-group">
                    <button className={`hist-filter-chip ${histFilter === "all" ? "active" : ""}`} onClick={() => setHistFilter("all")}>🌍 {lang === "vi" ? "Tất cả" : "All"}</button>
                    <button className={`hist-filter-chip ${histFilter === "mine" ? "active" : ""}`} onClick={() => setHistFilter("mine")} disabled={!address}>👤 {lang === "vi" ? "Của tôi" : "Mine"}</button>
                </div>
                <div className="hist-filter-group">
                    <button className={`hist-filter-chip mini ${histStatusFilter === "all" ? "active" : ""}`} onClick={() => setHistStatusFilter("all")}>All</button>
                    <button className={`hist-filter-chip mini ${histStatusFilter === "success" ? "active" : ""}`} onClick={() => setHistStatusFilter("success")}>✅</button>
                    <button className={`hist-filter-chip mini ${histStatusFilter === "failed" ? "active" : ""}`} onClick={() => setHistStatusFilter("failed")}>❌</button>
                </div>
            </div>
            {historyLoading ? (
                /* #7 Skeleton Loading */
                <div className="hist-skeleton-list">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="hist-skeleton-card">
                            <div className="hist-skeleton-line w60" />
                            <div className="hist-skeleton-line w80" />
                            <div className="hist-skeleton-line w40" />
                        </div>
                    ))}
                </div>
            ) : filteredHistory.length === 0 ? (
                <div className="side-empty">{histFilter === "mine" ? (lang === "vi" ? "Bạn chưa có airdrop nào" : "No airdrops from you yet") : (t("histEmpty") || "No airdrop history yet.")}</div>
            ) : (
                <div className="hist-list">
                    {filteredHistory.slice(0, 20).map((row: any) => {
                        const amt = Number(BigInt(row.total_amount || "0") / BigInt(1e18));
                        const date = new Date(Number(row.timestamp) * 1000);
                        const isSuccess = Number(row.success_count) > 0;
                        const sender = row.sender_address || "";
                        const isMe = address && sender.toLowerCase() === address.toLowerCase();
                        return (
                            <div key={row.id} className={`hist-card ${isSuccess ? "success" : "failed"} ${isMe ? "hist-mine" : ""}`}>
                                <div className="hist-card-header">
                                    <span className={`hist-status ${isSuccess ? "green" : "red"}`}>{isSuccess ? "✅" : "❌"}</span>
                                    <span className="hist-date">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                    <span className="hist-mode-badge">{row.mode === "batch" ? "Batch" : `x${row.mode}`}</span>
                                </div>
                                <div className="hist-sender">
                                    <a href={`${XLAYER_EXPLORER}/address/${sender}`} target="_blank" rel="noopener noreferrer" className="hist-sender-link">
                                        {sender.slice(0, 6)}...{sender.slice(-4)}
                                    </a>
                                    {/* #2 Copy Address */}
                                    <button className="hist-copy-btn" onClick={() => { copyText(sender); showToast(t("airdropAddressCopied")); }} title="Copy">📋</button>
                                    {isMe && <span className="hist-you-badge">YOU</span>}
                                </div>
                                <div className="hist-card-body">
                                    <span className="hist-amount">{amt > 1e6 ? `${(amt / 1e6).toFixed(1)}M` : amt > 1e3 ? `${(amt / 1e3).toFixed(1)}K` : amt.toLocaleString()} {row.token_symbol}</span>
                                    <span className="hist-arrow">→</span>
                                    <span className="hist-recipients">{row.recipient_count} {lang === "vi" ? "ví airdrop" : "wallets airdropped"}</span>
                                </div>
                                <div className="hist-card-footer">
                                    <span className="hist-stats">✅ {row.success_count} {lang === "vi" ? "thành công" : "sent"}{Number(row.failed_count) > 0 ? ` · ❌ ${row.failed_count} ${lang === "vi" ? "lỗi" : "failed"}` : ""}</span>
                                    <a className="hist-tx-link" href={`${XLAYER_EXPLORER}/tx/${row.tx_hash}`} target="_blank" rel="noopener noreferrer">
                                        TX: {row.tx_hash.slice(0, 8)}...{row.tx_hash.slice(-4)} <AIcon name="link" size={10} />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
    })();
    // #12 Analytics Panel
    const analyticsPanel = (
        <div className="airdrop-side-panel side-analytics">
            <div className="side-panel-header">
                <AIcon name="chart" size={16} />
                <span>📊 {lang === "vi" ? "Phân Tích" : "Analytics"}</span>
            </div>
            {!analyticsData ? (
                <div className="hist-skeleton-list">
                    {[1,2,3].map(i => (
                        <div key={i} className="hist-skeleton-card">
                            <div className="hist-skeleton-line w80" />
                            <div className="hist-skeleton-line w60" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="analytics-content">
                    {/* Daily Chart */}
                    <div className="analytics-section">
                        <div className="analytics-section-title">{lang === "vi" ? "Airdrop 14 ngày qua" : "Airdrops (14 days)"}</div>
                        <div className="analytics-chart">
                            {(() => {
                                const daily = analyticsData.daily || [];
                                const maxCount = Math.max(...daily.map((d: any) => Number(d.count)), 1);
                                return daily.length === 0 ? (
                                    <div className="analytics-empty">{lang === "vi" ? "Chưa có dữ liệu" : "No data yet"}</div>
                                ) : (
                                    <div className="analytics-bars">
                                        {daily.map((d: any, i: number) => {
                                            const pct = (Number(d.count) / maxCount) * 100;
                                            const dayLabel = (d.day as string).slice(5); // MM-DD
                                            return (
                                                <div key={i} className="analytics-bar-col" title={`${d.day}: ${d.count} airdrops, ${d.recipients} recipients`}>
                                                    <div className="analytics-bar-value">{d.count}</div>
                                                    <div className="analytics-bar-wrap">
                                                        <div className="analytics-bar-fill" style={{ height: `${pct}%` }} />
                                                    </div>
                                                    <div className="analytics-bar-label">{dayLabel}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                    {/* Top Senders */}
                    <div className="analytics-section">
                        <div className="analytics-section-title">🏆 {lang === "vi" ? "Top Người Gửi" : "Top Senders"}</div>
                        <div className="analytics-top-list">
                            {(analyticsData.topSenders || []).map((s: any, i: number) => (
                                <div key={i} className="analytics-top-item">
                                    <span className="analytics-top-rank">#{i + 1}</span>
                                    <a href={`${XLAYER_EXPLORER}/address/${s.sender_address}`} target="_blank" rel="noopener noreferrer" className="analytics-top-addr">
                                        {s.sender_address.slice(0, 6)}...{s.sender_address.slice(-4)}
                                    </a>
                                    <span className="analytics-top-count">{s.count}x → {s.total_recipients} {t("airdropWallets")}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Right panel with tabs
    const rightPanel = (
        <div className="airdrop-right-panel">
            <div className="right-panel-tabs">
                <button className={`right-tab ${rightTab === "history" ? "active" : ""}`} onClick={() => setRightTab("history")}>🕐 {t("histTab") || "History"}</button>
                <button className={`right-tab ${rightTab === "analytics" ? "active" : ""}`} onClick={() => setRightTab("analytics")}>📊 {lang === "vi" ? "Phân Tích" : "Analytics"}</button>
            </div>
            {rightTab === "history" ? historyPanel : analyticsPanel}
        </div>
    );

    return (
        <>
            <div className="airdrop-layout-3col">
                {leaderboardPanel}
                {mainPanel}
                {rightPanel}
            </div>
            {/* Profile Edit Modal — rendered at top level to escape stacking context */}
            {showProfileEdit && (
                <div className="lb-profile-modal-overlay" onClick={() => setShowProfileEdit(false)}>
                    <div className="lb-profile-modal" onClick={e => e.stopPropagation()}>
                        <div className="lb-profile-title">{t("editProfile") || "Edit Profile"}</div>
                        <div className="lb-profile-avatar-row">
                            {AVATARS.map((a, i) => (
                                <button key={i} className={`lb-avatar-btn ${profileForm.avatar === i ? "active" : ""}`} onClick={() => setProfileForm(f => ({ ...f, avatar: i }))}>{a}</button>
                            ))}
                        </div>
                        <div className="lb-profile-field">
                            <label>{t("profileNickname") || "Nickname"}</label>
                            <input value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} placeholder={t("typeNickname") || "Type nickname..."} maxLength={20} />
                        </div>
                        <div className="lb-profile-field">
                            <label>Telegram</label>
                            <input value={profileForm.telegram} onChange={e => setProfileForm(f => ({ ...f, telegram: e.target.value }))} placeholder="@username" maxLength={30} />
                        </div>
                        <div className="lb-profile-field">
                            <label>X (Twitter)</label>
                            <input value={profileForm.twitter} onChange={e => setProfileForm(f => ({ ...f, twitter: e.target.value }))} placeholder="@handle" maxLength={30} />
                        </div>
                        <div className="lb-profile-actions">
                            <button className="lb-profile-cancel" onClick={() => setShowProfileEdit(false)}>{t("airdropBack") || "Cancel"}</button>
                            <button className="lb-profile-save" onClick={saveProfile} disabled={profileEditsLeft <= 0}>{t("profileSaveBtn") || "Save Profile"}</button>
                        </div>
                        <div className="lb-profile-edits-left">{profileEditsLeft > 0 ? `${profileEditsLeft} ${t("profileEditsRemaining") || "edits remaining"}` : t("profileNoEdits") || "No edits remaining"}</div>
                    </div>
                </div>
            )}
            {/* View Profile Modal */}
            {viewProfileAddr && (() => {
                const vp = profileMap[viewProfileAddr.toLowerCase()];
                const vRow = leaderboardData.find((r: any) => r.address?.toLowerCase() === viewProfileAddr.toLowerCase());
                const vAmt = vRow ? Number(BigInt(vRow.total_amount || "0") / BigInt(1e18)) : 0;
                const vCount = vRow ? Number(vRow.total_airdrops || 0) : 0;
                const vRecip = vRow ? Number(vRow.total_recipients || 0) : 0;
                const vName = vp?.name || (vRow?.name) || `${viewProfileAddr.slice(0, 6)}...${viewProfileAddr.slice(-4)}`;
                const vAvatar = vp ? AVATARS[vp.avatar] || AVATARS[0] : "🐱";
                const isViewMe = address?.toLowerCase() === viewProfileAddr.toLowerCase();
                return (
                    <div className="lb-profile-modal-overlay" onClick={() => setViewProfileAddr(null)}>
                        <div className="lb-profile-modal" onClick={e => e.stopPropagation()}>
                            <div className="lb-profile-view-avatar">{vAvatar}</div>
                            <div className="lb-profile-view-name">{vName}</div>
                            <div className="lb-profile-view-address">
                                <a href={`${XLAYER_EXPLORER}/address/${viewProfileAddr}`} target="_blank" rel="noopener noreferrer">{viewProfileAddr}</a>
                            </div>
                            <div className="lb-profile-view-stats">
                                <div className="lb-profile-view-stat">
                                    <span className="lb-profile-view-stat-num">{vAmt > 1e6 ? `${(vAmt / 1e6).toFixed(1)}M` : vAmt > 1e3 ? `${(vAmt / 1e3).toFixed(1)}K` : vAmt.toLocaleString()}</span>
                                    <span className="lb-profile-view-stat-label">{t("lbTotalAmount") || "Total"}</span>
                                </div>
                                <div className="lb-profile-view-stat">
                                    <span className="lb-profile-view-stat-num">{vCount}</span>
                                    <span className="lb-profile-view-stat-label">{t("lbAirdrops") || "Airdrops"}</span>
                                </div>
                                <div className="lb-profile-view-stat">
                                    <span className="lb-profile-view-stat-num">{vRecip}</span>
                                    <span className="lb-profile-view-stat-label">{t("lbRecipients") || "Recipients"}</span>
                                </div>
                            </div>
                            {(vp?.telegram || vp?.twitter) && (
                                <div className="lb-profile-view-socials">
                                    {vp?.telegram && <div className="lb-profile-view-social">📱 <a href={`https://t.me/${vp.telegram.replace("@", "")}`} target="_blank" rel="noopener noreferrer">{vp.telegram}</a></div>}
                                    {vp?.twitter && <div className="lb-profile-view-social">𝕏 <a href={`https://x.com/${vp.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer">{vp.twitter}</a></div>}
                                </div>
                            )}
                            <div className="lb-profile-view-actions">
                                <button onClick={() => { copyText(viewProfileAddr); showToast(t("airdropAddressCopied")); }}><AIcon name="copy" size={11} /> {t("airdropCopyAddress") || "Copy"}</button>
                                <button onClick={() => window.open(`${XLAYER_EXPLORER}/address/${viewProfileAddr}`, "_blank")}><AIcon name="link" size={11} /> Explorer</button>
                                {isViewMe && <button onClick={() => { setViewProfileAddr(null); setShowProfileEdit(true); }}>✏️ {t("editProfile") || "Edit"}</button>}
                            </div>
                        </div>
                    </div>
                );
            })()}

        </>
    );
}
