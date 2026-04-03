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

// Preset popular tokens on XLayer
const PRESET_TOKENS: {address: string; symbol: string; name: string; decimals: number; logo: string}[] = [
    { address: "0x16d91d1615fc55b76d5f92365bd60c069b46ef78", symbol: "banmao", name: "banmao", decimals: 18, logo: "https://static.oklink.com/cdn/web3/currency/token/large/196-0x16d91d1615fc55b76d5f92365bd60c069b46ef78-110/type=default_90_0?v=1767692192564" },
    { address: "0x87669801a1fad6dad9db70d27ac752f452989667", symbol: "NIUMA", name: "Niuma", decimals: 18, logo: "https://static.oklink.com/cdn/web3/currency/token/large/196-0x87669801a1fad6dad9db70d27ac752f452989667-110/type=default_90_0?v=1764921295782" },
    { address: "0x0cc24c51bf89c00c5affbfcf5e856c25ecbdb48e", symbol: "XDOG", name: "Xdog", decimals: 18, logo: "https://static.oklink.com/cdn/web3/currency/token/large/196-0x0cc24c51bf89c00c5affbfcf5e856c25ecbdb48e-110/type=default_90_0?v=1764839073713" },
    { address: "0xdcc83b32b6b4e95a61951bfcc9d71967515c0fca", symbol: "Xwizard", name: "Xwizard", decimals: 18, logo: "https://static.oklink.com/cdn/web3/currency/token/large/196-0xdcc83b32b6b4e95a61951bfcc9d71967515c0fca-107/type=default_90_0?v=1775024553859" },
];
const STORAGE_HISTORY = "banmao_airdrop_history";
const STORAGE_BOOK = "banmao_address_book";
const STORAGE_BLACKLIST = "banmao_airdrop_blacklist";
const STORAGE_TEMPLATES = "banmao_airdrop_templates";
const MAX_RETRIES = 3;
const MAX_BATCH_SIZE = 200; // OKX Wallet limit: can't decode calldata > ~200 recipients
const BATCH_SIZE_OPTIONS = [25, 50, 100, 150, 200] as const;
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
    // Strip BOM (Excel adds this) and normalize
    const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (const line of cleaned.split('\n')) {
        if (!line.trim()) continue;
        // Strip quotes from each field, handle Excel quoting
        const parts = line.split(/[,;\t]+/).map(s => s.trim().replace(/^"|"$/g, ''));
        // Find address (0x + 40 hex chars)
        const addrPart = parts.find(p => /0x[a-fA-F0-9]{40}/i.test(p));
        if (addrPart) {
            const match = addrPart.match(/0x[a-fA-F0-9]{40}/i);
            if (match) {
                // Lowercase for viem isAddress (rejects ALL-CAPS from Excel)
                const addr = match[0].toLowerCase();
                if (isAddress(addr)) {
                    // Find amount — support: 123.45, 123, 1.23e5, quoted numbers
                    const amountPart = parts.find(p => {
                        if (p === addrPart) return false;
                        const cleaned = p.replace(/"/g, '').replace(/,/g, '').trim();
                        return /^\d+(\.\d+)?(e[+-]?\d+)?$/i.test(cleaned);
                    });
                    const amt = amountPart ? amountPart.replace(/"/g, '').replace(/,/g, '').trim() : undefined;
                    results.push({ address: addr, amount: amt });
                }
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
    
    // Segmentation logic
    const [useSegment, setUseSegment] = useState(false);
    const [segmentSize, setSegmentSize] = useState(5000);
    const [segmentPage, setSegmentPage] = useState(0);
    const [batchSizeConfig, setBatchSizeConfig] = useState(() => {
        try { const v = JSON.parse(localStorage.getItem(STORAGE_CONFIG) || "{}").batchSize; return typeof v === 'number' ? Math.min(v, MAX_BATCH_SIZE) : MAX_BATCH_SIZE; } catch { return MAX_BATCH_SIZE; }
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
    // Enhanced scan statistics dashboard
    const [scanStats, setScanStats] = useState<{
        totalBlocksScanned: number;
        walletsSkipped: number;
        walletsChecked: number;
        scanStartTime: number | null;
        scanSpeed: number;
        bestRound: number;
        hitRate: number;
        lastRoundFound: number;
        lastRoundSkipped: number;
    }>({ totalBlocksScanned: 0, walletsSkipped: 0, walletsChecked: 0, scanStartTime: null, scanSpeed: 0, bestRound: 0, hitRate: 100, lastRoundFound: 0, lastRoundSkipped: 0 });
    const [scanActivityLog, setScanActivityLog] = useState<{time: string; blockRange: string; found: number; skipped: number; total: number}[]>([]);
    const [showActivityLog, setShowActivityLog] = useState(true);
    const scanStatsRef = useRef(scanStats);
    scanStatsRef.current = scanStats;
    // Lifetime persistent stats
    const [lifetimeStats, setLifetimeStats] = useState<{totalBlocks: number; totalWallets: number; totalSessions: number; totalSkipped: number} | null>(null);
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
    // Full holder scan (Transfer events)
    const [fullHolderScanning, setFullHolderScanning] = useState(false);
    const fullHolderAbortRef = useRef(false);
    const [fullHolderProgress, setFullHolderProgress] = useState<{scanned: number; total: number; found: number; transfers: number; pct: number} | null>(null);
    const [holderScanMode, setHolderScanMode] = useState<"top" | "all">("top");

    // Leaderboard & History state
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [lbStats, setLbStats] = useState<any>(null);
    const [lbSortBy, setLbSortBy] = useState<"amount" | "recipients" | "airdrops">("amount");
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

    // Token search state
    const [tokenSearchQuery, setTokenSearchQuery] = useState("");
    const [tokenSearchResults, setTokenSearchResults] = useState<{tokenContractAddress: string; tokenSymbol: string; tokenName: string; tokenLogoUrl: string; decimals: string; price: string}[]>([]);
    const [tokenSearchLoading, setTokenSearchLoading] = useState(false);
    const tokenSearchTimerRef = useRef<any>(null);
    // Preset token metadata (price + holders + liquidity) — from token-search API
    const [presetTokenMeta, setPresetTokenMeta] = useState<Record<string, {price: string; holders: string; liquidity: string}>>({});
    const fetchPresetTokenMeta = useCallback(async () => {
        for (const pt of PRESET_TOKENS) {
            const key = pt.address.toLowerCase();
            if (presetTokenMeta[key]?.price) continue; // already loaded
            try {
                const res = await fetch(`/api/okx/token-search?search=${pt.symbol}&chains=196`).then(r => r.json());
                if (res.success && res.tokens?.length) {
                    const tok = res.tokens.find((t: any) => t.tokenContractAddress?.toLowerCase() === key) || res.tokens[0];
                    const price = tok.price && tok.price !== "0" ? tok.price : "";
                    const holders = tok.holders && tok.holders !== "0" ? tok.holders : "";
                    const liquidity = tok.liquidity && tok.liquidity !== "0" ? tok.liquidity : "";
                    setPresetTokenMeta(prev => ({ ...prev, [key]: { price, holders, liquidity } }));
                }
            } catch {}
            await new Promise(r => setTimeout(r, 1100)); // rate limit (1 req/s)
        }
    }, [presetTokenMeta]);
    // Current token holder count + liquidity
    const [currentTokenHolders, setCurrentTokenHolders] = useState("");
    const [currentTokenLiquidity, setCurrentTokenLiquidity] = useState("");
    useEffect(() => {
        fetch(`/api/okx/token-search?search=${tokenAddress}&chains=196`).then(r => r.json()).then(d => {
            if (d.success && d.tokens?.length) {
                const tok = d.tokens.find((t: any) => t.tokenContractAddress?.toLowerCase() === tokenAddress.toLowerCase()) || d.tokens[0];
                setCurrentTokenHolders(tok.holders && tok.holders !== "0" ? tok.holders : "");
                setCurrentTokenLiquidity(tok.liquidity && tok.liquidity !== "0" ? tok.liquidity : "");
            } else {
                setCurrentTokenHolders("");
                setCurrentTokenLiquidity("");
            }
        }).catch(() => { setCurrentTokenHolders(""); setCurrentTokenLiquidity(""); });
    }, [tokenAddress]);

    // Load lifetime scan stats from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("airdrop_scan_lifetime");
            if (saved) setLifetimeStats(JSON.parse(saved));
        } catch {}
    }, []);

    // Real-time elapsed timer — freezes when scanning stops
    const [scanElapsed, setScanElapsed] = useState("00:00");
    const scanElapsedFrozenRef = useRef<string>("00:00");
    useEffect(() => {
        if (!scanStats.scanStartTime) { setScanElapsed("00:00"); scanElapsedFrozenRef.current = "00:00"; return; }
        const isActive = isScanning || autoScanActive;
        if (!isActive) {
            // Freeze at current value
            setScanElapsed(scanElapsedFrozenRef.current);
            return;
        }
        const tick = () => {
            const sec = Math.floor((Date.now() - (scanStats.scanStartTime || Date.now())) / 1000);
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            const val = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            setScanElapsed(val);
            scanElapsedFrozenRef.current = val;
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [scanStats.scanStartTime, isScanning, autoScanActive]);

    // Wallet balances state (multi-token)
    const [walletTokenBalances, setWalletTokenBalances] = useState<Record<string, {symbol: string; balance: string; valueUsd: string; logoUrl: string; tokenAddress: string; isNative: boolean}[]>>({});
    const [walletTotalValues, setWalletTotalValues] = useState<Record<string, string>>({});
    const [walletBalancesLoading, setWalletBalancesLoading] = useState<Set<string>>(new Set());

    // Smart number formatter: comma separators + reasonable decimals
    const fmtBal = (val: string | number): string => {
        const n = typeof val === "string" ? parseFloat(val) : val;
        if (isNaN(n) || n === 0) return "0";
        const abs = Math.abs(n);
        let formatted: string;
        if (abs >= 1_000_000) formatted = (n / 1_000_000).toFixed(2) + "M";
        else if (abs >= 1_000) formatted = n.toLocaleString("en-US", { maximumFractionDigits: 2 });
        else if (abs >= 1) formatted = n.toLocaleString("en-US", { maximumFractionDigits: 4 });
        else if (abs >= 0.0001) formatted = n.toLocaleString("en-US", { maximumFractionDigits: 6 });
        else formatted = n.toExponential(2);
        return formatted;
    };

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

    // Auto-fetch leaderboard & history — re-runs when tokenAddress changes
    useEffect(() => {
        const tokenParam = tokenAddress ? `&token=${tokenAddress}` : "";
        fetch(`/api/airdrop-records?type=leaderboard&limit=20${tokenParam}`).then(r => r.json()).then(d => {
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
        fetch(`/api/airdrop-records?type=stats${tokenParam}`).then(r => r.json()).then(d => { if (d.success) setLbStats(d.data); }).catch(() => {});
        // Fetch ALL users' history
        setHistoryLoading(true);
        fetch(`/api/airdrop-records?type=all-history&limit=50${tokenParam}`).then(r => r.json()).then(d => { if (d.success) setHistoryData(d.data); }).catch(() => {}).finally(() => setHistoryLoading(false));
        // #12 Fetch analytics
        fetch(`/api/airdrop-records?type=analytics${tokenParam}`).then(r => r.json()).then(d => { if (d.success) setAnalyticsData(d.data); }).catch(() => {});
        // Auto-refresh history every 30s (#1 Realtime History)
        const histInterval = setInterval(() => {
            fetch(`/api/airdrop-records?type=all-history&limit=50${tokenParam}`).then(r => r.json()).then(d => { if (d.success) setHistoryData(d.data); }).catch(() => {});
            fetch(`/api/airdrop-records?type=stats${tokenParam}`).then(r => r.json()).then(d => { if (d.success) setLbStats(d.data); }).catch(() => {});
        }, 30000);
        return () => { clearInterval(histInterval); };
    }, [tokenAddress]);
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
        let addrs = activeTab === "scan" ? Array.from(selectedWallets) : parsedAddresses;
        if (activeTab === "manual" && useSegment && segmentSize > 0) {
            addrs = addrs.slice(segmentPage * segmentSize, (segmentPage + 1) * segmentSize);
        }
        return addrs.map(a => ({
            address: a,
            amount: amountMode === "custom" && customAmounts.has(a.toLowerCase())
                ? customAmounts.get(a.toLowerCase())! : amountPerWallet,
        }));
    }, [activeTab, parsedAddresses, selectedWallets, amountMode, customAmounts, amountPerWallet, useSegment, segmentSize, segmentPage]);

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
        const roundStartTime = Date.now();
        // Set scan start time if first scan
        if (!scanStatsRef.current.scanStartTime) {
            setScanStats(prev => ({ ...prev, scanStartTime: Date.now() }));
        }
        try {
            let apiUrl: string;
            if (scanChain === "xlayer") {
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
                // Track blocks scanned this round
                let roundBlocks = 0;
                let blockRangeStr = "";
                if (scanChain === "xlayer") {
                    scanCursorRef.current = data.cursor || null;
                    if (data.scannedRange && data.latestBlock) {
                        const scannedSoFar = data.latestBlock - data.scannedRange.from;
                        roundBlocks = data.scannedRange.to - data.scannedRange.from;
                        blockRangeStr = `${data.scannedRange.from.toLocaleString()}–${data.scannedRange.to.toLocaleString()}`;
                        setScanProgress({ scannedBlocks: scannedSoFar, totalBlocks: 50000, walletsFound: scannedWalletsRef.current.length + (data.wallets?.length || 0) });
                    }
                }

                let newWallets = (data.wallets || []).filter((w: any) => w.address.toLowerCase() !== address?.toLowerCase());
                const walletsCheckedThisRound = newWallets.length;
                
                // Frontend re-verify: check selected token balance on-chain
                let holdersRemoved = 0;
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
                    holdersRemoved = verifyResults.filter(v => v.hasToken).length;
                    newWallets = verifyResults.filter(v => !v.hasToken).map(v => v.wallet);
                    if (holdersRemoved > 0) {
                        showToast(`🔍 ${holdersRemoved} ${(t("scanFilteredBanmao") || "wallets filtered (already hold {token})").replace(/\$BANMAO|\{token\}/g, `$${tokenSymbol}`)}`);
                    }
                }

                // Update scan statistics
                const roundElapsed = (Date.now() - roundStartTime) / 1000;
                const roundFound = newWallets.length;
                setScanStats(prev => {
                    const totalChecked = prev.walletsChecked + walletsCheckedThisRound;
                    const totalSkipped = prev.walletsSkipped + holdersRemoved;
                    const totalBlocks = prev.totalBlocksScanned + roundBlocks;
                    const elapsed = prev.scanStartTime ? (Date.now() - prev.scanStartTime) / 1000 : roundElapsed;
                    const speed = elapsed > 0 ? (scannedWalletsRef.current.length + roundFound) / elapsed : 0;
                    const hitRate = totalChecked > 0 ? ((totalChecked - totalSkipped) / totalChecked) * 100 : 100;
                    return {
                        ...prev,
                        totalBlocksScanned: totalBlocks,
                        walletsSkipped: totalSkipped,
                        walletsChecked: totalChecked,
                        scanSpeed: Math.round(speed * 10) / 10,
                        bestRound: Math.max(prev.bestRound, roundFound),
                        hitRate: Math.round(hitRate * 10) / 10,
                        lastRoundFound: roundFound,
                        lastRoundSkipped: holdersRemoved,
                    };
                });

                // Add activity log entry
                const now = new Date();
                const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                setScanActivityLog(prev => [...prev.slice(-19), { time: timeStr, blockRange: blockRangeStr || "—", found: roundFound, skipped: holdersRemoved, total: scannedWalletsRef.current.length + roundFound }]);

                if (!newWallets.length && scannedWalletsRef.current.length === 0) { 
                    if (scanChain === "xlayer" && !scanCursorRef.current) {
                        setScanError(t("airdropNoWalletsFound"));
                    } else {
                        showToast(`${t("airdropNoNewWallets")} — ${data.scannedRange ? `blocks ${data.scannedRange.from}-${data.scannedRange.to}` : ""}`);
                    }
                } else {
                    const walletsToAdd = newWallets;
                    setScannedWallets(prev => {
                        const existingMap = new Map(prev.map(w => [w.address.toLowerCase(), w]));
                        let added = 0;
                        for (const w of walletsToAdd) {
                            const key = w.address.toLowerCase();
                            if (!existingMap.has(key)) { existingMap.set(key, w); added++; }
                        }
                        const merged = Array.from(existingMap.values());
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
                    if (newWallets.length > 0) {
                        fetchBatchWalletData(newWallets.map((w: ScannedWallet) => w.address)).catch(() => {});
                    }
                }
            } else setScanError(data.error || t("airdropScanFailed"));
        } catch { setScanError(t("airdropScanFailed")); }
        finally { setIsScanning(false); }
    };

    const clearScanned = () => {
        playClick();
        // Save to lifetime stats before clearing
        try {
            const prev = JSON.parse(localStorage.getItem("airdrop_scan_lifetime") || '{"totalBlocks":0,"totalWallets":0,"totalSessions":0,"totalSkipped":0}');
            const updated = {
                totalBlocks: prev.totalBlocks + scanStatsRef.current.totalBlocksScanned,
                totalWallets: prev.totalWallets + scannedWalletsRef.current.length,
                totalSessions: prev.totalSessions + 1,
                totalSkipped: prev.totalSkipped + scanStatsRef.current.walletsSkipped,
            };
            localStorage.setItem("airdrop_scan_lifetime", JSON.stringify(updated));
            setLifetimeStats(updated);
        } catch {}
        // Reset everything
        scannedWalletsRef.current = []; setScannedWallets([]); setSelectedWallets(new Set()); setScanCount(0);
        scanCursorRef.current = null;
        setScanStats({ totalBlocksScanned: 0, walletsSkipped: 0, walletsChecked: 0, scanStartTime: null, scanSpeed: 0, bestRound: 0, hitRate: 100, lastRoundFound: 0, lastRoundSkipped: 0 });
        setScanActivityLog([]);
        setScanProgress(null);
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
            const text = e.target?.result as string;
            const entries = parseCSVContent(text);
            if (entries.length) {
                // Smart CSV: detect if this is a balance export (has OKB/USDT/balance columns) vs airdrop list
                const firstLine = text.split(/\r?\n/)[0]?.toLowerCase() || "";
                const isBalanceExport = /okb|usdt|balance/i.test(firstLine);
                
                if (amountMode === "custom" && !isBalanceExport) {
                    // Custom mode + non-balance CSV: keep address,amount pairs
                    const hasAmounts = entries.some(e => e.amount);
                    setAddressInput(entries.map(e => e.amount ? `${e.address},${e.amount}` : e.address).join("\n"));
                    showToast(`📊 ${entries.length} ${t("addressesImported")}${hasAmounts ? ` (${t("withAmounts") || "with amounts"})` : ""}`);
                } else {
                    // Equal mode OR balance export: only extract addresses
                    const uniqueAddresses = [...new Set(entries.map(e => e.address))];
                    setAddressInput(uniqueAddresses.join("\n"));
                    showToast(`📊 ${uniqueAddresses.length} ${t("addressesImported")}${isBalanceExport ? " (balances ignored)" : ""}`);
                }
                setActiveTab("manual");
            } else { playError(); showToast(t("csvNoAddresses") || "No valid addresses found in file"); }
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
    const mergeFromBook = (g: AddressGroup) => {
        playClick();
        const existing = addressInput.trim();
        const merged = existing ? existing + "\n" + g.addresses.join("\n") : g.addresses.join("\n");
        setAddressInput(merged); setActiveTab("manual");
        showToast(`+${g.addresses.length} ${t("addressesMerged") || "addresses merged"}`);
    };
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
            // Remove hard block - allow them to try sending even if estimate is low
            showToast(`⚠ ${t("errInsufficientGas")} (${okbNum.toFixed(8)} < ${gasNeeded.toFixed(8)} OKB)`);
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
                        args: [AIRDROP_CONTRACT, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")],
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
                    const tp = tokenAddress ? `&token=${tokenAddress}` : "";
                    fetch(`/api/airdrop-records?type=stats${tp}`).then(r => r.json()).then(d => { if (d.success) setLbStats(d.data); }).catch(() => {});
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
    const resolveCustomToken = async (addressOverride?: string) => {
        const addr = addressOverride || customTokenInput;
        if (!addr || !isAddress(addr)) { showToast(t("invalidTokenAddress") || "Invalid token address"); return; }
        // Check if address matches a preset token — use preset data directly
        const preset = PRESET_TOKENS.find(p => p.address.toLowerCase() === addr.toLowerCase());
        if (preset) {
            setTokenAddress(preset.address);
            setTokenSymbol(preset.symbol);
            setTokenDecimals(preset.decimals);
            setShowTokenSelector(false);
            setTokenSearchQuery("");
            setTokenSearchResults([]);
            playClick();
            showToast(`${t("tokenLoaded") || "Token loaded"}: ${preset.symbol}`);
            setTokenLoading(false);
            return;
        }
        setTokenLoading(true);
        try {
            const RPC_URL = "https://rpc.xlayer.tech";
            // Get symbol: symbol() = 0x95d89b41
            const symRes = await fetch(RPC_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: addr, data: "0x95d89b41" }, "latest"], id: 1 }) });
            const symData = await symRes.json();
            let symbol = "UNKNOWN";
            if (symData.result && symData.result !== "0x") {
                try { const hex = symData.result.slice(130); symbol = Buffer.from(hex, "hex").toString("utf8").replace(/\0/g, "").trim() || "UNKNOWN"; } catch { /* non-standard */ }
            }
            // Get decimals: decimals() = 0x313ce567
            const decRes = await fetch(RPC_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: addr, data: "0x313ce567" }, "latest"], id: 2 }) });
            const decData = await decRes.json();
            const decimals = decData.result ? Number(BigInt(decData.result)) : 18;
            setTokenAddress(addr);
            setTokenSymbol(symbol);
            setTokenDecimals(decimals);
            setShowTokenSelector(false);
            setTokenSearchQuery("");
            setTokenSearchResults([]);
            // Save to list if not a preset token
            const isPreset = PRESET_TOKENS.some(p => p.address.toLowerCase() === addr.toLowerCase());
            if (!isPreset) {
                const exists = savedTokens.some(t => t.address.toLowerCase() === addr.toLowerCase());
                if (!exists) saveTokenList([...savedTokens, { address: addr, symbol, decimals }]);
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
        setTokenSearchQuery("");
        setTokenSearchResults([]);
        playClick();
    };

    // ========== Token Search ==========
    const searchTokens = async (query: string) => {
        if (!query || query.length < 2) { setTokenSearchResults([]); return; }
        setTokenSearchLoading(true);
        try {
            const res = await fetch(`/api/okx/token-search?search=${encodeURIComponent(query)}&chains=196`);
            const data = await res.json();
            if (data.success && data.tokens) {
                setTokenSearchResults(data.tokens);
            } else {
                setTokenSearchResults([]);
            }
        } catch {
            setTokenSearchResults([]);
        }
        setTokenSearchLoading(false);
    };
    const handleTokenSearchInput = (query: string) => {
        setTokenSearchQuery(query);
        setCustomTokenInput(query); // sync for resolveCustomToken
        // Check if it looks like an address — auto-resolve directly
        if (/^0x[a-fA-F0-9]{40}$/.test(query.trim())) {
            setTokenSearchResults([]);
            // Auto-resolve the address
            const trimmedAddr = query.trim();
            setCustomTokenInput(trimmedAddr);
            if (tokenSearchTimerRef.current) clearTimeout(tokenSearchTimerRef.current);
            tokenSearchTimerRef.current = setTimeout(() => {
                // Trigger resolve with address param directly (avoids stale state)
                resolveCustomToken(trimmedAddr);
            }, 200);
            return;
        }
        // Debounce search for name/symbol
        if (tokenSearchTimerRef.current) clearTimeout(tokenSearchTimerRef.current);
        tokenSearchTimerRef.current = setTimeout(() => searchTokens(query), 350);
    };
    const selectSearchResult = (tok: {tokenContractAddress: string; tokenSymbol: string; tokenName: string; decimals: string}) => {
        // Check if it matches a preset token — use preset data if so
        const preset = PRESET_TOKENS.find(p => p.address.toLowerCase() === tok.tokenContractAddress.toLowerCase());
        if (preset) {
            setTokenAddress(preset.address);
            setTokenSymbol(preset.symbol);
            setTokenDecimals(preset.decimals);
            setShowTokenSelector(false);
            setTokenSearchQuery("");
            setTokenSearchResults([]);
            playClick();
            showToast(`${t("tokenLoaded") || "Token loaded"}: ${preset.symbol}`);
            return;
        }
        const decimals = parseInt(tok.decimals) || 18;
        setTokenAddress(tok.tokenContractAddress);
        setTokenSymbol(tok.tokenSymbol);
        setTokenDecimals(decimals);
        setShowTokenSelector(false);
        setTokenSearchQuery("");
        setTokenSearchResults([]);
        // Save to list if not a preset token
        const isPreset = PRESET_TOKENS.some(p => p.address.toLowerCase() === tok.tokenContractAddress.toLowerCase());
        if (!isPreset) {
            const exists = savedTokens.some(t => t.address.toLowerCase() === tok.tokenContractAddress.toLowerCase());
            if (!exists) saveTokenList([...savedTokens, { address: tok.tokenContractAddress, symbol: tok.tokenSymbol, decimals }]);
        }
        playSuccess();
        showToast(`${t("tokenLoaded") || "Token loaded"}: ${tok.tokenSymbol}`);
    };

    // ========== Wallet Balances (Multi-Token) ==========
    // Helper: fetch with 1 retry
    const fetchWithRetry = async (url: string, retries = 1): Promise<any> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
                const data = await res.json();
                if (data.success !== false) return data;
                // API returned error — retry after delay
                if (attempt < retries) await new Promise(r => setTimeout(r, 1200));
            } catch {
                if (attempt < retries) await new Promise(r => setTimeout(r, 1200));
            }
        }
        return null;
    };
    const fetchWalletAllBalances = async (walletAddress: string) => {
        const key = walletAddress.toLowerCase();
        setWalletBalancesLoading(prev => { const next = new Set(prev); next.add(key); return next; });
        try {
            // Fetch total value first
            const valData = await fetchWithRetry(`/api/okx/wallet-total-value?address=${walletAddress}&chains=196`);
            if (valData?.success && valData.totalValue) {
                setWalletTotalValues(prev => ({ ...prev, [key]: valData.totalValue }));
            }
            // Small delay to respect rate limits
            await new Promise(r => setTimeout(r, 600));
            // Then fetch token balances
            const balData = await fetchWithRetry(`/api/okx/wallet-balances?address=${walletAddress}&chains=196`);
            if (balData?.success && balData.tokens) {
                setWalletTokenBalances(prev => ({ ...prev, [key]: balData.tokens }));
            }
        } catch {}
        setWalletBalancesLoading(prev => { const next = new Set(prev); next.delete(key); return next; });
    };
    // Batch fetch: sequential (1 wallet at a time) with delay to avoid rate limits
    const fetchBatchWalletData = async (addresses: string[]) => {
        for (let i = 0; i < addresses.length; i++) {
            const addr = addresses[i];
            const key = addr.toLowerCase();
            try {
                // Fetch total value
                const valData = await fetchWithRetry(`/api/okx/wallet-total-value?address=${addr}&chains=196`);
                if (valData?.success && valData.totalValue) {
                    setWalletTotalValues(prev => ({ ...prev, [key]: valData.totalValue }));
                }
                // Small gap between the 2 calls for same wallet
                await new Promise(r => setTimeout(r, 400));
                // Fetch token balances
                const balData = await fetchWithRetry(`/api/okx/wallet-balances?address=${addr}&chains=196`);
                if (balData?.success && balData.tokens) {
                    setWalletTokenBalances(prev => ({ ...prev, [key]: balData.tokens }));
                }
            } catch {}
            // Delay between wallets
            if (i < addresses.length - 1) await new Promise(r => setTimeout(r, 1200));
        }
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

    // Auto-load trending tokens when entering holders mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (scanMode === "holders" && hotTokens.length === 0 && !hotTokensLoading) {
            fetchHotTokens(holderChain);
        }
    }, [scanMode]);

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

    // Scan ALL holders via Transfer event logs (paginated, real-time display, auto-loop)
    const scanAllHolders = async (tokenAddr?: string) => {
        const addr = tokenAddr || selectedHotToken || holderTokenInput;
        if (!addr) { showToast(t("invalidTokenAddress") || "Enter a token address"); return; }
        playClick();
        fullHolderAbortRef.current = false;
        setFullHolderScanning(true);
        setFullHolderProgress(null);
        // Don't clear holderResults — preserve existing holders for resume
        // Pre-load existing results into the maps for deduplication
        const allAddresses = new Set<string>();
        const verifiedMap = new Map<string, {address: string; amount: string}>();
        for (const h of holderResults) {
            allAddresses.add(h.address.toLowerCase());
            verifiedMap.set(h.address.toLowerCase(), h);
        }
        let totalTransfers = 0;
        const BATCH = 5000;
        const tokenAddrLower = addr.toLowerCase();

        try {
            // Smart Scan: Find first block with Transfer events (binary search)
            showToast("🔍 Smart Scan — finding first transfer...");
            const smartRes = await fetch(`/api/scan-all-holders?tokenAddress=${addr}&chainIndex=${holderChain}&findFirstTransfer=true`);
            const smartData = await smartRes.json();
            if (!smartData.success) { showToast(smartData.error || "Failed"); setFullHolderScanning(false); return; }
            
            let latestBlock = smartData.latestBlock;
            let fromBlock = smartData.firstBlock || Math.max(0, latestBlock - 500000);
            const totalRange = latestBlock - fromBlock;
            showToast(`✅ Token activity starts at block ${fromBlock.toLocaleString()} (saved ${((1 - totalRange / latestBlock) * 100).toFixed(0)}% scan time)`);

            setFullHolderProgress({ scanned: 0, total: totalRange, found: 0, transfers: 0, pct: 0 });

            // Phase 1: Scan Transfer logs + verify balances in real-time
            while (!fullHolderAbortRef.current) {
                if (fromBlock > latestBlock) {
                    // Auto-loop: refresh latestBlock and continue  
                    showToast(`🔄 ${t("airdropScanCycleComplete") || "Cycle complete"} — ${allAddresses.size} ${t("holdersFound") || "addresses"}`);
                    await new Promise(r => setTimeout(r, 3000));
                    const refreshRes = await fetch(`/api/scan-all-holders?tokenAddress=${addr}&chainIndex=${holderChain}&fromBlock=0&batchSize=1`);
                    const refreshData = await refreshRes.json();
                    if (!refreshData.success) break;
                    latestBlock = refreshData.latestBlock;
                    fromBlock = Math.max(0, latestBlock - 500000);
                    continue;
                }

                const res = await fetch(`/api/scan-all-holders?tokenAddress=${addr}&chainIndex=${holderChain}&fromBlock=${fromBlock}&batchSize=${BATCH}`);
                const data = await res.json();
                if (!data.success) { showToast(data.error || "Batch failed"); break; }

                // Collect new unique addresses from this batch
                const newAddrs: string[] = [];
                for (const h of (data.holders || [])) {
                    const low = h.toLowerCase();
                    if (!allAddresses.has(low)) {
                        allAddresses.add(low);
                        newAddrs.push(low);
                    }
                }
                totalTransfers += data.transferCount || 0;

                // Verify balances via server-side API (avoids CORS)
                if (newAddrs.length > 0) {
                    for (let i = 0; i < newAddrs.length && !fullHolderAbortRef.current; i += 50) {
                        const chunk = newAddrs.slice(i, i + 50);
                        try {
                            const vRes = await fetch("/api/verify-balances", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ tokenAddress: tokenAddrLower, addresses: chunk, chainIndex: holderChain }),
                            });
                            const vData = await vRes.json();
                            if (vData.success && vData.results) {
                                for (const r of vData.results) {
                                    const bal = BigInt(r.balance);
                                    if (bal > BigInt(0)) {
                                        verifiedMap.set(r.address, { address: r.address, amount: (Number(bal) / (10 ** 18)).toString() });
                                    }
                                }
                            }
                        } catch { /* skip failed verification batch */ }
                        // Update results in real-time
                        const sorted = Array.from(verifiedMap.values()).sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
                        setHolderResults(sorted);
                    }
                }

                const scannedSoFar = Math.min(data.scannedRange.to - (latestBlock - totalRange), totalRange);
                setFullHolderProgress({
                    scanned: Math.max(0, scannedSoFar),
                    total: totalRange,
                    found: verifiedMap.size,
                    transfers: totalTransfers,
                    pct: Math.round(Math.max(0, scannedSoFar) / totalRange * 100),
                });

                if (!data.hasMore || !data.nextFromBlock) {
                    fromBlock = latestBlock + 1; // trigger auto-loop
                } else {
                    fromBlock = data.nextFromBlock;
                }
                await new Promise(r => setTimeout(r, 150));
            }

            if (fullHolderAbortRef.current) { showToast(t("airdropScanCancelled") || "Scan stopped"); }
            else { playSuccess(); showToast(`✅ ${verifiedMap.size} holders (${totalTransfers} transfers)`); }
        } catch (e) {
            showToast((t("airdropScanFailed") || "Scan failed") + ": " + (e instanceof Error ? e.message : ""));
            playError();
        }
        setFullHolderScanning(false);
    };

    const stopFullHolderScan = () => { fullHolderAbortRef.current = true; };
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
                
                {/* Massive Airdrop Advisory */}
                {sendTotal > 100 && (
                    <div style={{ margin: "16px 0", padding: "16px", background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "12px", textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                            <div style={{ color: "#22c55e", flexShrink: 0, marginTop: "2px" }}><AIcon name="info" size={24} /></div>
                            <div>
                                <strong style={{ display: "block", marginBottom: "6px", fontSize: "15px", color: "#4ade80" }}>{t("airdropMassiveNoticeTitle") || "Massive Airdrop Advisory"}</strong>
                                <div style={{ color: "#86efac", fontSize: "13px", lineHeight: "1.6" }}>{t("airdropMassiveNotice") || "If you are airdropping to a large number of addresses, please pay attention to the gas fee for each transaction. During network congestion, gas fees can spike—consider pausing and retrying the failed wallets later when gas is cheaper. Also, if the wallet popup doesn't appear, please manually open your wallet extension to sign the transaction while the process is running."}</div>
                            </div>
                        </div>
                    </div>
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
                    <div className="airdrop-dash-stat"><AIcon name="coins" size={15} /><div><span className="airdrop-dash-value">{formatNum(dashboardStats.totalDistributed)}</span><span className="airdrop-dash-label">{t("dashTotalDistributed") || "Distributed"} ${tokenSymbol}</span></div></div>
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
                                    <button className="airdrop-select-btn" title={t("loadGroup") || "Load"} onClick={() => loadFromBook(g)}><AIcon name="upload" size={12} /></button>
                                    <button className="airdrop-select-btn" title={t("mergeGroup") || "Merge"} onClick={() => mergeFromBook(g)} style={{ color: "#a855f7" }}>➕</button>
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
                <button className="airdrop-token-current" onClick={() => { playClick(); const opening = !showTokenSelector; setShowTokenSelector(opening); if (opening) { fetchTokenBalances(); fetchPresetTokenMeta(); } }}>
                    {(() => { const preset = PRESET_TOKENS.find(p => p.address.toLowerCase() === tokenAddress.toLowerCase()); return preset ? <img src={preset.logo} alt="" className="token-current-logo" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <AIcon name="coins" size={14} />; })()}
                    <span className="airdrop-token-symbol">${tokenSymbol}</span>
                    <span className="airdrop-token-addr-full">{tokenAddress}</span>
                    <span className="airdrop-token-copy-btn" role="button" tabIndex={0} onClick={e => { e.stopPropagation(); copyText(tokenAddress); showToast(t("airdropAddressCopied")); }} title="Copy address"><AIcon name="copy" size={10} /></span>
                    <a href={`${XLAYER_EXPLORER}/token/${tokenAddress}`} target="_blank" rel="noopener noreferrer" className="airdrop-token-explorer-link" onClick={e => e.stopPropagation()} title="View on Explorer"><AIcon name="link" size={10} /></a>
                    {currentTokenHolders && <span className="token-holders-badge"><AIcon name="users" size={10} /> {Number(currentTokenHolders).toLocaleString()}</span>}
                    {currentTokenLiquidity && <span className="token-holders-badge" style={{background: "rgba(34,197,94,0.15)", color: "#4ade80"}}><AIcon name="water" size={10} /> ${parseFloat(currentTokenLiquidity).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>}
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
                    {/* Preset tokens */}
                    {PRESET_TOKENS.map(pt => {
                        const isActive = tokenAddress.toLowerCase() === pt.address.toLowerCase();
                        const meta = presetTokenMeta[pt.address.toLowerCase()];
                        const priceRaw = meta?.price || "";
                        const holdersVal = meta?.holders || "";
                        const liquidityVal = meta?.liquidity || "";
                        // Full precision price display
                        const formatFullPrice = (p: string) => {
                            const n = parseFloat(p);
                            if (isNaN(n) || n === 0) return "";
                            if (n < 0.000001) return "$" + n.toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
                            if (n < 0.0001) return "$" + n.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
                            if (n < 0.01) return "$" + n.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
                            if (n < 1) return "$" + n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
                            return "$" + n.toLocaleString(undefined, {maximumFractionDigits: 4});
                        };
                        const priceDisplay = formatFullPrice(priceRaw);
                        return (
                            <div key={pt.address} className={`airdrop-book-item preset-token-item ${isActive ? "selected" : ""}`}
                                style={{ cursor: "pointer", border: "none", background: isActive ? "rgba(249,115,22,0.12)" : "transparent", width: "100%", display: "flex", alignItems: "center" }}
                                onClick={() => { setTokenAddress(pt.address); setTokenSymbol(pt.symbol); setTokenDecimals(pt.decimals); setShowTokenSelector(false); playClick(); }}>
                                <img src={pt.logo} alt="" className="preset-token-logo" onError={e => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).style.display = "none"; }} />
                                <div className="preset-token-info">
                                    <div className="preset-token-top">
                                        <span className="preset-token-symbol">${pt.symbol}</span>
                                        {priceDisplay && <span className="preset-token-price">{priceDisplay}</span>}
                                    </div>
                                    <div className="preset-token-addr-row">
                                        <span className="preset-token-addr">{pt.address}</span>
                                        <button className="preset-token-action-btn" onClick={e => { e.stopPropagation(); copyText(pt.address); showToast(t("airdropAddressCopied")); }} title="Copy"><AIcon name="copy" size={9} /></button>
                                        <a href={`${XLAYER_EXPLORER}/token/${pt.address}`} target="_blank" rel="noopener noreferrer" className="preset-token-action-btn" onClick={e => e.stopPropagation()} title="Explorer"><AIcon name="link" size={9} /></a>
                                    </div>
                                    {(holdersVal || liquidityVal) && (
                                        <div className="preset-token-stats-row">
                                            {holdersVal && <span className="preset-token-holders"><AIcon name="users" size={9} /> {Number(holdersVal).toLocaleString()} holders</span>}
                                            {liquidityVal && <span className="preset-token-liquidity"><AIcon name="water" size={9} /> ${parseFloat(liquidityVal).toLocaleString(undefined, {maximumFractionDigits: 0})} liq</span>}
                                        </div>
                                    )}
                                </div>
                                <div style={{ flexShrink: 0, marginLeft: "auto" }}>
                                    {isActive && <AIcon name="check" size={14} className="text-green" />}
                                </div>
                            </div>
                        );
                    })}
                    {/* Saved custom tokens (not in presets) */}
                    {savedTokens.filter(st => !PRESET_TOKENS.some(p => p.address.toLowerCase() === st.address.toLowerCase())).map((st) => (
                        <div key={st.address} className={`airdrop-book-item ${tokenAddress.toLowerCase() === st.address.toLowerCase() ? "selected" : ""}`}
                            style={{ cursor: "pointer", border: "none", background: tokenAddress.toLowerCase() === st.address.toLowerCase() ? "rgba(168,85,247,0.1)" : "transparent", width: "100%", display: "flex", alignItems: "center" }}
                            onClick={() => { setTokenAddress(st.address); setTokenSymbol(st.symbol); setTokenDecimals(st.decimals); setShowTokenSelector(false); playClick(); }}>
                            <span className="preset-token-logo-placeholder"><AIcon name="coins" size={16} /></span>
                            <div className="preset-token-info">
                                <div className="preset-token-top">
                                    <span className="preset-token-symbol">${st.symbol}</span>
                                    {savedTokenBalances[st.address.toLowerCase()] && <span className="token-balance-badge">{savedTokenBalances[st.address.toLowerCase()]}</span>}
                                </div>
                                <div className="preset-token-addr-row">
                                    <span className="preset-token-addr">{st.address}</span>
                                    <button className="preset-token-action-btn" onClick={e => { e.stopPropagation(); copyText(st.address); showToast(t("airdropAddressCopied")); }} title="Copy"><AIcon name="copy" size={9} /></button>
                                    <a href={`${XLAYER_EXPLORER}/token/${st.address}`} target="_blank" rel="noopener noreferrer" className="preset-token-action-btn" onClick={e => e.stopPropagation()} title="Explorer"><AIcon name="link" size={9} /></a>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                                <button className="airdrop-saved-token-delete" onClick={e => { e.stopPropagation(); const wasActive = tokenAddress.toLowerCase() === st.address.toLowerCase(); removeSavedToken(st.address); if (wasActive) resetToDefaultToken(); playClick(); }} title="Remove"><AIcon name="trash" size={11} /></button>
                                {tokenAddress.toLowerCase() === st.address.toLowerCase() && <AIcon name="check" size={14} className="text-green" />}
                            </div>
                        </div>
                    ))}
                    {/* Unified Token Search (name/symbol/address) */}
                    <div className="token-search-container">
                        <div className="token-search-input-wrap">
                            <AIcon name="target" size={13} />
                            <input
                                type="text"
                                className="token-search-input"
                                placeholder={t("tokenSearchPlaceholder") || "Search by name, symbol or 0x address..."}
                                value={tokenSearchQuery}
                                onChange={e => handleTokenSearchInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && /^0x[a-fA-F0-9]{40}$/i.test(tokenSearchQuery.trim())) {
                                        resolveCustomToken(tokenSearchQuery.trim());
                                    }
                                }}
                                autoFocus
                            />
                            {(tokenSearchLoading || tokenLoading) && <span className="airdrop-spinner" />}
                        </div>
                        {tokenSearchResults.length > 0 && (
                            <div className="token-search-results">
                                {tokenSearchResults.map(tok => (
                                    <div
                                        key={tok.tokenContractAddress}
                                        className="token-search-result"
                                    >
                                        <div className="token-search-result-main" onClick={() => selectSearchResult(tok)}>
                                            {tok.tokenLogoUrl ? (
                                                <img src={tok.tokenLogoUrl} alt="" className="token-search-logo" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            ) : (
                                                <span className="token-search-logo-placeholder"><AIcon name="coins" size={16} /></span>
                                            )}
                                            <div className="token-search-info">
                                                <div className="token-search-top-row">
                                                    <span className="token-search-symbol">${tok.tokenSymbol}</span>
                                                    <span className="token-search-name">{tok.tokenName}</span>
                                                    {tok.price && parseFloat(tok.price) > 0 && <span className="token-search-price">${parseFloat(tok.price) < 0.01 ? parseFloat(tok.price).toFixed(8).replace(/0+$/, '').replace(/\.$/, '') : parseFloat(tok.price).toFixed(4)}</span>}
                                                </div>
                                                <div className="token-search-addr-row">
                                                    <span className="token-search-addr-full">{tok.tokenContractAddress}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="token-search-actions">
                                            <button className="preset-token-action-btn" onClick={e => { e.stopPropagation(); copyText(tok.tokenContractAddress); showToast(t("airdropAddressCopied")); }} title="Copy address"><AIcon name="copy" size={10} /></button>
                                            <a href={`${XLAYER_EXPLORER}/token/${tok.tokenContractAddress}`} target="_blank" rel="noopener noreferrer" className="preset-token-action-btn" onClick={e => e.stopPropagation()} title="View on Explorer"><AIcon name="link" size={10} /></a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {tokenSearchQuery.length >= 2 && !tokenSearchLoading && !tokenLoading && tokenSearchResults.length === 0 && !/^0x[a-fA-F0-9]{38,40}$/i.test(tokenSearchQuery.trim()) && (
                            <div className="token-search-empty">
                                <AIcon name="info" size={12} /> {t("tokenSearchNoResults") || "No tokens found"}
                            </div>
                        )}
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
                        {/* Pagination / Segment UI for Massive Airdrops */}
                        {parsedAddresses.length > 500 && (
                            <div className="airdrop-segment-panel" style={{ marginTop: 12, padding: 12, background: "rgba(168,85,247,0.1)", borderRadius: 8, border: "1px solid rgba(168,85,247,0.3)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: useSegment ? 8 : 0 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#a855f7", display: "flex", alignItems: "center", gap: 6 }}><AIcon name="layers" size={14} /> {t("segmentTitle") || "Smart Segmentation"}</span>
                                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", color: "#ccc" }}>
                                        <input type="checkbox" checked={useSegment} onChange={e => { playClick(); setUseSegment(e.target.checked); }} style={{ accentColor: "#a855f7" }} />
                                        {t("segmentEnable") || "Bật chia đợt"}
                                    </label>
                                </div>
                                {useSegment && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 10 }}>
                                        <select className="airdrop-book-input" style={{ width: "auto", flex: 1, padding: "6px 10px", fontSize: 12 }} value={segmentSize} onChange={e => { playClick(); setSegmentSize(Number(e.target.value)); setSegmentPage(0); }}>
                                            <option value={1000}>1,000 {t("segmentWalletsPerPhase") || "ví / đợt"}</option>
                                            <option value={2000}>2,000 {t("segmentWalletsPerPhase") || "ví / đợt"}</option>
                                            <option value={5000}>5,000 {t("segmentWalletsPerPhase") || "ví / đợt"}</option>
                                            <option value={10000}>10,000 {t("segmentWalletsPerPhase") || "ví / đợt"}</option>
                                        </select>
                                        <select className="airdrop-book-input" style={{ width: "auto", flex: 2, padding: "6px 10px", fontSize: 12 }} value={segmentPage} onChange={e => { playClick(); setSegmentPage(Number(e.target.value)); }}>
                                            {Array.from({ length: Math.ceil(parsedAddresses.length / segmentSize) }).map((_, i) => {
                                                const start = i * segmentSize + 1;
                                                const end = Math.min((i + 1) * segmentSize, parsedAddresses.length);
                                                return <option key={i} value={i}>{t("segmentPhase") || "Đợt"} {i + 1} ({start} - {end})</option>;
                                            })}
                                        </select>
                                    </div>
                                )}
                            </div>
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
                            {/* ═══ Professional Scan Dashboard ═══ */}
                            {(isScanning || autoScanActive || scannedWallets.length > 0 || scanStats.totalBlocksScanned > 0) && (
                                <div className="scan-dashboard">
                                    {/* Stats Grid — 6 cards */}
                                    <div className="scan-stats-grid">
                                        <div className="scan-stat-card">
                                            <div className="scan-stat-icon" style={{color: "#a855f7"}}>👛</div>
                                            <div className="scan-stat-value" style={{color: "#c084fc"}}>{scannedWallets.length.toLocaleString()}</div>
                                            <div className="scan-stat-label">{t("airdropScanCount") || "Wallets"}</div>
                                        </div>
                                        <div className="scan-stat-card">
                                            <div className="scan-stat-icon" style={{color: "#3b82f6"}}>🔄</div>
                                            <div className="scan-stat-value" style={{color: "#60a5fa"}}>{scanCount}</div>
                                            <div className="scan-stat-label">{t("airdropScanTimes") || "Rounds"}</div>
                                        </div>
                                        <div className="scan-stat-card">
                                            <div className="scan-stat-icon" style={{color: "#f97316"}}>📦</div>
                                            <div className="scan-stat-value" style={{color: "#fb923c"}}>{scanStats.totalBlocksScanned.toLocaleString()}</div>
                                            <div className="scan-stat-label">Blocks</div>
                                        </div>
                                        <div className="scan-stat-card">
                                            <div className="scan-stat-icon" style={{color: "#ef4444"}}>🚫</div>
                                            <div className="scan-stat-value" style={{color: "#f87171"}}>{scanStats.walletsSkipped.toLocaleString()}</div>
                                            <div className="scan-stat-label">Skipped</div>
                                        </div>
                                        <div className="scan-stat-card">
                                            <div className="scan-stat-icon" style={{color: "#eab308"}}>⚡</div>
                                            <div className="scan-stat-value" style={{color: "#facc15"}}>{scanStats.scanSpeed}/s</div>
                                            <div className="scan-stat-label">Speed</div>
                                        </div>
                                        <div className="scan-stat-card">
                                            <div className="scan-stat-icon" style={{color: "#22c55e"}}>⏱</div>
                                            <div className="scan-stat-value" style={{color: "#4ade80"}}>{scanElapsed}</div>
                                            <div className="scan-stat-label">Elapsed</div>
                                        </div>
                                    </div>

                                    {/* Enhanced Progress Bar with % and ETA */}
                                    {scanProgress && (
                                        <div className="scan-progress-enhanced">
                                            <div className="scan-progress-bar-wrap">
                                                <div className="scan-progress-bar-bg">
                                                    <div className="scan-progress-bar-fill" style={{ width: `${Math.min(100, (scanProgress.scannedBlocks / scanProgress.totalBlocks) * 100)}%` }}>
                                                        {(scanProgress.scannedBlocks / scanProgress.totalBlocks * 100) > 8 && (
                                                            <span className="scan-progress-pct">{Math.round(scanProgress.scannedBlocks / scanProgress.totalBlocks * 100)}%</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="scan-progress-meta">
                                                    <span>📦 {scanProgress.scannedBlocks.toLocaleString()} / {scanProgress.totalBlocks.toLocaleString()} blocks</span>
                                                    {scanStats.scanSpeed > 0 && scanProgress.scannedBlocks < scanProgress.totalBlocks && (
                                                        <span className="scan-progress-eta">~{Math.ceil((scanProgress.totalBlocks - scanProgress.scannedBlocks) / (scanStats.scanSpeed > 0 ? scanStats.scanSpeed * 60 : 1))} min</span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Hit Rate Gauge */}
                                            {scanStats.walletsChecked > 0 && (
                                                <div className="scan-hitrate">
                                                    <svg viewBox="0 0 36 36" className="scan-hitrate-svg">
                                                        <path className="scan-hitrate-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                                                        <path className="scan-hitrate-fill" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={scanStats.hitRate > 50 ? "#4ade80" : scanStats.hitRate > 20 ? "#facc15" : "#f87171"} strokeWidth="3" strokeDasharray={`${scanStats.hitRate}, 100`} strokeLinecap="round" />
                                                    </svg>
                                                    <div className="scan-hitrate-text">
                                                        <span className="scan-hitrate-value" style={{color: scanStats.hitRate > 50 ? "#4ade80" : scanStats.hitRate > 20 ? "#facc15" : "#f87171"}}>{scanStats.hitRate}%</span>
                                                        <span className="scan-hitrate-label">hit rate</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Activity Feed */}
                                    {scanActivityLog.length > 0 && (
                                        <div className="scan-feed">
                                            <div className="scan-feed-header" onClick={() => setShowActivityLog(!showActivityLog)}>
                                                <span><AIcon name="list" size={11} /> Activity Log ({scanActivityLog.length})</span>
                                                <span className="lang-arrow">{showActivityLog ? "▲" : "▼"}</span>
                                            </div>
                                            {showActivityLog && (
                                                <div className="scan-feed-body">
                                                    {scanActivityLog.slice(-8).map((entry, i) => (
                                                        <div key={i} className="scan-feed-entry" style={{animationDelay: `${i * 0.05}s`}}>
                                                            <span className="scan-feed-time">[{entry.time}]</span>
                                                            <span className="scan-feed-blocks">■ {entry.blockRange}</span>
                                                            <span className="scan-feed-found">+{entry.found}</span>
                                                            {entry.skipped > 0 && <span className="scan-feed-skipped">−{entry.skipped}</span>}
                                                            <span className="scan-feed-total">({entry.total})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Lifetime Stats Banner */}
                                    {lifetimeStats && lifetimeStats.totalSessions > 0 && (
                                        <div className="scan-lifetime">
                                            <AIcon name="trophy" size={10} /> All-time: {lifetimeStats.totalBlocks.toLocaleString()} blocks · {lifetimeStats.totalWallets.toLocaleString()} wallets · {lifetimeStats.totalSessions} sessions · {lifetimeStats.totalSkipped.toLocaleString()} skipped
                                        </div>
                                    )}
                                </div>
                            )}
                            {scanError && <div className="airdrop-scan-error"><AIcon name="warning" size={14} /> {scanError}</div>}
                            {scannedWallets.length > 0 && (
                                <>
                                    <div className="airdrop-scan-actions">
                                        <span className="airdrop-scan-count">{scannedWallets.length} {t("airdropScanCount")} · {scanCount} {t("airdropScanTimes")}{scanStats.walletsSkipped > 0 ? ` · 🚫${scanStats.walletsSkipped} skipped` : ""}</span>
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
                                        {scannedWallets.map(w => {
                                            const wKey = w.address.toLowerCase();
                                            const wTokens = walletTokenBalances[wKey] || [];
                                            const wTotal = walletTotalValues[wKey];
                                            const wLoading = walletBalancesLoading.has(wKey);
                                            return (
                                            <div key={w.address} className={`airdrop-wallet-card ${selectedWallets.has(w.address) ? "selected" : ""}`}>
                                                <div className="airdrop-wallet-row" onClick={() => { playClick(); toggleWallet(w.address); }}>
                                                    <div className="airdrop-wallet-check">{selectedWallets.has(w.address) ? <AIcon name="check" size={16} className="text-green" /> : <span className="check-empty" />}</div>
                                                    <span className="airdrop-wallet-full-addr">{w.address}</span>
                                                </div>
                                                <div className="airdrop-wallet-meta">
                                                    <div className="airdrop-wallet-balances">
                                                        {/* 1. Total Value badge (first position) */}
                                                        {wTotal && parseFloat(wTotal) > 0 && <span className="wallet-total-value-badge"><AIcon name="chart" size={11} /> ${fmtBal(wTotal)}</span>}
                                                        {/* 2. OKB from scan — always show, styled badge */}
                                                        {parseFloat(w.balances.OKB) > 0 && <span className="wallet-okb-badge"><AIcon name="coins" size={11} /> {fmtBal(w.balances.OKB)} OKB</span>}
                                                        {/* 3. Multi-token chips (top 3, exclude OKB to avoid duplication) */}
                                                        {wTokens.filter(t => t.symbol !== "OKB").slice(0, 3).map(tok => (
                                                            <span key={tok.symbol + tok.tokenAddress} className="airdrop-wallet-bal">
                                                                {tok.logoUrl ? <img src={tok.logoUrl} alt="" className="wallet-token-chip-logo" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <AIcon name="coins" size={11} />}
                                                                {fmtBal(tok.balance)} {tok.symbol}
                                                            </span>
                                                        ))}
                                                        {wTokens.filter(t => t.symbol !== "OKB").length > 3 && <span className="airdrop-wallet-bal dim" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setExpandedWallet(expandedWallet === w.address ? null : w.address); }}>+{wTokens.filter(t => t.symbol !== "OKB").length - 3}</span>}
                                                        {wTokens.length === 0 && !wTotal && parseFloat(w.balances.OKB) === 0 && <span className="airdrop-wallet-bal dim">{t("airdropActiveWallet")}</span>}
                                                    </div>
                                                    <div className="airdrop-wallet-actions">
                                                        <button className="airdrop-wallet-action-btn" title={t("airdropCopyAddress")} onClick={(e) => { e.stopPropagation(); copyText(w.address); showToast(t("airdropAddressCopied")); }}><AIcon name="copy" size={12} /></button>
                                                        <a className="airdrop-wallet-action-btn" title={t("airdropViewOnExplorer")} href={`${XLAYER_EXPLORER}/address/${w.address}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}><AIcon name="link" size={12} /></a>
                                                        <button className={`airdrop-wallet-action-btn ${wLoading ? "spin-icon" : ""}`} title="Refresh balances" onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!wLoading) fetchWalletAllBalances(w.address);
                                                        }}>{wLoading ? <span className="airdrop-spinner" style={{ width: 12, height: 12 }} /> : <AIcon name="refresh" size={12} />}</button>
                                                        <button className="airdrop-wallet-action-btn" title={t("airdropViewAssets")} onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newAddr = expandedWallet === w.address ? null : w.address;
                                                            setExpandedWallet(newAddr);
                                                            // Lazy-load full balances on expand
                                                            if (newAddr && !walletTokenBalances[wKey]) fetchWalletAllBalances(w.address);
                                                        }}><AIcon name="wallet" size={12} /></button>
                                                    </div>
                                                </div>
                                                {expandedWallet === w.address && (
                                                    <div className="airdrop-wallet-detail">
                                                        <div className="airdrop-wallet-detail-title"><AIcon name="wallet" size={13} /> {t("airdropViewAssets")} {wTotal && <span className="wallet-detail-total">· ${parseFloat(wTotal).toFixed(2)} USD</span>}</div>
                                                        {wLoading && <div className="wallet-detail-loading"><span className="airdrop-spinner" /> {t("walletLoadingBalances") || "Loading balances..."}</div>}
                                                        <div className="airdrop-wallet-detail-grid">
                                                            {/* Legacy fallback */}
                                                            {wTokens.length === 0 && !wLoading && (
                                                                <>
                                                                    <div className="airdrop-wallet-asset"><span className="asset-label">OKB</span><span className="asset-value">{fmtBal(w.balances.OKB)}</span></div>
                                                                    <div className="airdrop-wallet-asset"><span className="asset-label">USDT</span><span className="asset-value">${fmtBal(w.balances.USDT)}</span></div>
                                                                </>
                                                            )}
                                                            {/* Full multi-token list */}
                                                            {wTokens.map(tok => (
                                                                <div key={tok.symbol + tok.tokenAddress} className="airdrop-wallet-asset">
                                                                    <span className="asset-label">
                                                                        {tok.logoUrl ? <img src={tok.logoUrl} alt="" className="wallet-asset-logo" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : null}
                                                                        {tok.symbol}
                                                                    </span>
                                                                    <span className="asset-value">
                                                                        {fmtBal(tok.balance)}
                                                                        {parseFloat(tok.valueUsd) > 0.01 && <span className="asset-usd"> ~${fmtBal(tok.valueUsd)}</span>}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {wTokens.length === 0 && !wLoading && !parseFloat(w.balances.OKB) && <div style={{color: '#666', fontSize: 11, padding: 4}}>{t("walletNoTokens") || "No tokens found"}</div>}
                                                        </div>
                                                        <a className="airdrop-wallet-explorer-link" href={`${XLAYER_EXPLORER}/address/${w.address}`} target="_blank" rel="noopener noreferrer">
                                                            <AIcon name="link" size={12} /> {t("airdropViewOnExplorer")}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        );})}
                                        
                                    </div>
                                    {selectedWallets.size > 0 && <div className="airdrop-selected-count"><AIcon name="check" size={13} /> {selectedWallets.size} {t("airdropSelected")}</div>}
                                </>
                            )}
                        </>
                    )}

                    {/* ═══ Mode 2: Scan Token Holders (Streamlined) ═══ */}
                    {scanMode === "holders" && (
                        <>
                            {/* Row 1: Chain selector (compact) */}
                            <div className="airdrop-chain-selector">
                                {SCAN_CHAINS.map(c => (
                                    <button key={c.id} className={`airdrop-chain-pill ${holderChain === c.id ? "active" : ""}`} onClick={() => handleChainChange(c.id)} onMouseEnter={() => playHover()}>
                                        <span className="chain-emoji">{c.emoji}</span> {c.name}
                                    </button>
                                ))}
                            </div>

                            {/* Row 2: Token Selection (collapsible) */}
                            {!selectedHotToken && !(holderTokenInput && holderTokenInput.startsWith("0x") && holderTokenInput.length >= 40) ? (
                                <>
                                    {/* Search input (same style as token selector above) */}
                                    <div className="airdrop-holder-input-row">
                                        <div className="holder-search-input-wrap">
                                            <AIcon name="search" size={13} className="holder-search-icon" />
                                            <input type="text" className="airdrop-book-input holder-search-input" placeholder={t("holderSearchPlaceholder") || "Search by name, symbol or 0x address..."} value={holderTokenInput} onChange={e => { setHolderTokenInput(e.target.value); setSelectedHotToken(""); }} />
                                        </div>
                                    </div>

                                    {/* Token list (auto-loaded) */}
                                    {hotTokensLoading && <div className="airdrop-scan-note" style={{ textAlign: "center" }}><span className="airdrop-spinner" /> {t("hotTokensLoading")}</div>}
                                    {hotTokens.length > 0 && (
                                        <div className="holder-token-list">
                                            {hotTokens
                                                .filter(tok => {
                                                    if (!holderTokenInput) return true;
                                                    const q = holderTokenInput.toLowerCase();
                                                    return tok.tokenSymbol?.toLowerCase().includes(q) || tok.tokenName?.toLowerCase().includes(q) || tok.tokenContractAddress?.toLowerCase().includes(q);
                                                })
                                                .slice(0, 8).map(tok => (
                                                <div key={tok.tokenContractAddress} className={`holder-token-list-card ${selectedHotToken === tok.tokenContractAddress ? "active" : ""}`} onClick={() => { playClick(); setSelectedHotToken(tok.tokenContractAddress); setHolderTokenInput(""); }}>
                                                    <div className="holder-token-row1">
                                                        <strong className="holder-token-symbol">${tok.tokenSymbol}</strong>
                                                        <span className="holder-token-price-badge">${parseFloat(tok.price || "0") < 0.000001 ? parseFloat(tok.price).toExponential(2) : parseFloat(tok.price || "0") < 0.01 ? parseFloat(tok.price).toFixed(8).replace(/0+$/, '').replace(/\.$/, '') : parseFloat(tok.price).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                                                    </div>
                                                    <div className="holder-token-addr-full">
                                                        {tok.tokenContractAddress}
                                                        <button className="holder-addr-copy" onClick={(e) => { e.stopPropagation(); copyText(tok.tokenContractAddress); showToast(t("airdropAddressCopied")); }}><AIcon name="copy" size={11} /></button>
                                                        <a className="holder-addr-copy" href={`https://www.okx.com/web3/explorer/xlayer/address/${tok.tokenContractAddress}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}><AIcon name="link" size={11} /></a>
                                                    </div>
                                                    <div className="holder-token-stats-row">
                                                        {tok.holders && parseFloat(tok.holders) > 0 && <span className="holder-stat-chip">👛 {parseInt(tok.holders).toLocaleString()} holders</span>}
                                                        {tok.liquidity && parseFloat(tok.liquidity) > 0 && <span className="holder-stat-chip">${parseFloat(tok.liquidity).toLocaleString(undefined, {maximumFractionDigits: 0})} liq</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Full token info card (like token selector — screenshot 2) */
                                <div className="holder-token-detail-card">
                                    {selectedHotToken && hotTokens.length > 0 ? (() => {
                                        const tok = hotTokens.find(tk => tk.tokenContractAddress === selectedHotToken);
                                        return tok ? (
                                            <>
                                                <div className="holder-token-row1">
                                                    <strong className="holder-token-symbol">${tok.tokenSymbol}</strong>
                                                    <span className="holder-token-price-badge">${parseFloat(tok.price || "0") < 0.000001 ? parseFloat(tok.price).toExponential(2) : parseFloat(tok.price || "0") < 0.01 ? parseFloat(tok.price).toFixed(8).replace(/0+$/, '').replace(/\.$/, '') : parseFloat(tok.price).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                                                </div>
                                                <div className="holder-token-addr-full">
                                                    {selectedHotToken}
                                                    <button className="holder-addr-copy" onClick={(e) => { e.stopPropagation(); copyText(selectedHotToken); showToast(t("airdropAddressCopied")); }}><AIcon name="copy" size={11} /></button>
                                                    <a className="holder-addr-copy" href={`https://www.okx.com/web3/explorer/xlayer/address/${selectedHotToken}`} target="_blank" rel="noopener noreferrer"><AIcon name="link" size={11} /></a>
                                                </div>
                                                <div className="holder-token-stats-row">
                                                    {tok.holders && parseFloat(tok.holders) > 0 && <span className="holder-stat-chip">👛 {parseInt(tok.holders).toLocaleString()} holders</span>}
                                                    {tok.liquidity && parseFloat(tok.liquidity) > 0 && <span className="holder-stat-chip">${parseFloat(tok.liquidity).toLocaleString(undefined, {maximumFractionDigits: 0})} liq</span>}
                                                    {tok.marketCap && parseFloat(tok.marketCap) > 0 && <span className="holder-stat-chip">MCap ${(parseFloat(tok.marketCap) / 1e6).toFixed(1)}M</span>}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="holder-token-addr-full">{selectedHotToken}</div>
                                        );
                                    })() : (
                                        <div className="holder-token-addr-full">{holderTokenInput}
                                            <button className="holder-addr-copy" onClick={(e) => { e.stopPropagation(); copyText(holderTokenInput); showToast(t("airdropAddressCopied")); }}><AIcon name="copy" size={11} /></button>
                                        </div>
                                    )}
                                    {!fullHolderScanning && !holderScanning && (
                                        <button className="holder-change-token-btn" onClick={() => { playClick(); setSelectedHotToken(""); setHolderTokenInput(""); }}>
                                            {t("airdropBack") || "Change"}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Row 3: Scan mode toggle + Scan button group (centered, like XLayer pattern) */}
                            {(() => { const hasValidToken = selectedHotToken || (holderTokenInput && holderTokenInput.startsWith("0x") && holderTokenInput.length >= 40); return hasValidToken; })() && (
                                <>
                                    <div className="holder-scan-mode-toggle">
                                        <button className={`holder-scan-mode-btn ${holderScanMode === "top" ? "active" : ""}`} onClick={() => { playClick(); setHolderScanMode("top"); }}>
                                            ⚡ {t("scanHolders") || "Quick Scan"}
                                            <span className="holder-mode-badge">API</span>
                                        </button>
                                        <button className={`holder-scan-mode-btn ${holderScanMode === "all" ? "active" : ""}`} onClick={() => { playClick(); setHolderScanMode("all"); }}>
                                            🔍 {t("scanAllHolders") || "Deep Scan"}
                                            <span className="holder-mode-badge">RPC</span>
                                        </button>
                                    </div>

                                    {/* Scan / Stop / Auto button group (centered) */}
                                    <div className="airdrop-scan-btn-group" style={{ justifyContent: "center" }}>
                                        {fullHolderScanning ? (
                                            <button className="airdrop-scan-btn" style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }} onClick={stopFullHolderScan}>
                                                <span className="airdrop-spinner" /> {t("stopScan") || "Stop"}
                                            </button>
                                        ) : (
                                            <>
                                                <button className="airdrop-scan-btn" onClick={() => holderScanMode === "all" ? scanAllHolders() : scanHolders()} disabled={holderScanning} onMouseEnter={() => playHover()}>
                                                    {holderScanning ? <><span className="airdrop-spinner" /> {t("scanningHolders")}</> : <><AIcon name="target" size={14} /> {holderResults.length > 0 ? `${t("airdropScanMore") || "Scan More"} (#${holderResults.length})` : (holderScanMode === "all" ? (t("scanAllHolders") || "Deep Scan") : t("scanHolders"))}</>}
                                                </button>
                                                {holderScanMode === "all" && (
                                                    <button className="airdrop-scan-btn" style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)", flex: "0 0 auto", padding: "0 16px" }} onClick={() => { fullHolderAbortRef.current = false; scanAllHolders(); }} disabled={holderScanning || fullHolderScanning} onMouseEnter={() => playHover()} title={t("autoScanStart") || "Auto-scan"}>
                                                        🔄 {t("autoScanStart") || "Auto"}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {holderResults.length > 0 && !fullHolderScanning && (
                                            <button className="airdrop-scan-clear-btn" onClick={() => { playClick(); setHolderResults([]); setSelectedHolders(new Set()); setFullHolderProgress(null); }} onMouseEnter={() => playHover()}>
                                                <AIcon name="trash" size={13} />
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Row 5: Progress (only when scanning) */}
                            {fullHolderProgress && (
                                <div className="holder-scan-progress">
                                    <div className="holder-scan-progress-stats">
                                        <div className="holder-progress-stat">
                                            <span className="holder-progress-icon">📦</span>
                                            <span className="holder-progress-val">{fullHolderProgress.scanned.toLocaleString()}</span>
                                            <span className="holder-progress-label">/ {fullHolderProgress.total.toLocaleString()} {t("scanModeWallets") === "Quét Ví" ? "blocks" : "blocks"}</span>
                                        </div>
                                        <div className="holder-progress-stat">
                                            <span className="holder-progress-icon">📋</span>
                                            <span className="holder-progress-val">{fullHolderProgress.transfers.toLocaleString()}</span>
                                            <span className="holder-progress-label">transfers</span>
                                        </div>
                                        <div className="holder-progress-stat">
                                            <span className="holder-progress-icon">👛</span>
                                            <span className="holder-progress-val" style={{color: "#4ade80"}}>{fullHolderProgress.found.toLocaleString()}</span>
                                            <span className="holder-progress-label">holders</span>
                                        </div>
                                    </div>
                                    <div className="scan-progress-bar-bg" style={{marginTop: 8}}>
                                        <div className="scan-progress-bar-fill" style={{ width: `${fullHolderProgress.pct}%` }}>
                                            {fullHolderProgress.pct > 8 && <span className="scan-progress-pct">{fullHolderProgress.pct}%</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Row 6: Results */}
                            {holderResults.length > 0 && (
                                <div className="airdrop-holder-results">
                                    {/* Overlap warning */}
                                    {holderOverlapCount > 0 && (
                                        <div className="airdrop-overlap-warning">
                                            <AIcon name="warning" size={13} /> {holderOverlapCount} {t("holdersOverlap") || "addresses already in your airdrop list"}
                                        </div>
                                    )}

                                    {/* Quick filter tabs + actions bar */}
                                    <div className="airdrop-scan-actions">
                                        <div className="holder-quick-filters">
                                            <button className={`holder-quick-filter ${!holderMinBalance ? "active" : ""}`} onClick={() => setHolderMinBalance("")}>
                                                {t("all") || "All"} ({holderResults.length})
                                            </button>
                                            <button className={`holder-quick-filter ${holderMinBalance === "1000" ? "active" : ""}`} onClick={() => setHolderMinBalance("1000")}>
                                                &gt;1K
                                            </button>
                                            <button className={`holder-quick-filter ${holderMinBalance === "100000" ? "active" : ""}`} onClick={() => setHolderMinBalance("100000")}>
                                                &gt;100K
                                            </button>
                                            <button className={`holder-quick-filter ${holderMinBalance === "1000000" ? "active" : ""}`} onClick={() => setHolderMinBalance("1000000")}>
                                                🐋 &gt;1M
                                            </button>
                                        </div>
                                        <div className="airdrop-scan-buttons">
                                            <button className="airdrop-select-btn" onClick={() => { playClick(); setSelectedHolders(new Set(filteredHolders.map(h => h.address))); }}>
                                                <AIcon name="checkSmall" size={12} /> {t("airdropSelectAll")}
                                            </button>
                                            <button className="airdrop-select-btn" onClick={exportHoldersCSV}>
                                                <AIcon name="file" size={12} /> CSV
                                            </button>
                                        </div>
                                    </div>

                                    {/* Holder list */}
                                    <div className="airdrop-holder-list">
                                        {filteredHolders.map((h, i) => (
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
                                    </div>

                                    {/* Import bar with Airdrop Now button */}
                                    <div className="airdrop-holder-import-bar">
                                        <span className="airdrop-selected-count"><AIcon name="check" size={13} /> {selectedHolders.size > 0 ? `${selectedHolders.size} ${t("airdropSelected")}` : `${filteredHolders.length} holders`}</span>
                                        <div className="holder-import-actions">
                                            <button className="airdrop-select-btn" onClick={importHolders} style={{ padding: "8px 16px" }}>
                                                <AIcon name="download" size={13} /> {t("importHolders")}
                                            </button>
                                            <button className="airdrop-scan-btn holder-airdrop-now-btn" onClick={() => { importHolders(); setTimeout(() => { const manualTab = document.querySelector('[data-tab="manual"]') as HTMLButtonElement; if (manualTab) manualTab.click(); }, 200); }} style={{ padding: "8px 20px", fontSize: 13 }}>
                                                ⚡ Airdrop
                                            </button>
                                        </div>
                                    </div>
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
                            <div className="airdrop-amount-actions">
                                {amountPerWallet && <button className="airdrop-clear-amount-btn" onClick={() => { playClick(); setAmountPerWallet(""); }} title="Clear">×</button>}
                                {isConnected && recipients.length > 0 && balanceNum > 0 && (
                                    <button className="airdrop-max-btn" onClick={() => { playClick(); setAmountPerWallet(String(Math.floor(balanceNum / recipients.length))); }} title={`Max: ${formatNum(Math.floor(balanceNum / recipients.length))} per wallet`}>MAX</button>
                                )}
                                <span className="airdrop-amount-suffix">${tokenSymbol}</span>
                            </div>
                        </div>
                        {/* USD Value Hint */}
                        {tokenPrice > 0 && amountPerWallet && parseFloat(amountPerWallet) > 0 && (
                            <div className="airdrop-usd-hint">
                                <span>{parseFloat(amountPerWallet).toLocaleString()} × ${tokenPrice.toFixed(10).replace(/0+$/, '').replace(/\.$/, '')} = <strong>${(parseFloat(amountPerWallet) * tokenPrice).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')} USD</strong>/{t("airdropWallets") || "wallet"}</span>
                                {recipients.length > 0 && <span className="airdrop-usd-total">Σ {recipients.length} {t("airdropWallets") || "wallets"} = <strong>${(parseFloat(amountPerWallet) * tokenPrice * recipients.length).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')} USD</strong></span>}
                            </div>
                        )}
                        <div className="airdrop-quick-amounts">{[
                            11, 22, 33, 44, 55, 66, 77, 88, 99,
                            111, 222, 333, 444, 555, 666, 777, 888, 999,
                            1111, 2222, 3333, 4444, 5555, 6666, 7777, 8888, 9999,
                            11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999
                        ].map(a => (
                            <button key={a} className={`airdrop-quick-btn ${amountPerWallet === a.toString() ? "active" : ""}`} onClick={() => { playClick(); setAmountPerWallet(a.toString()); }} onMouseEnter={() => playHover()}>{a.toLocaleString("en-US")}</button>
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
                                const amt = parseFloat(row.total_amount || "0") / 1e18;
                                const maxAmt = parseFloat(leaderboardData[0]?.total_amount || "1") / 1e18;
                                const pct = maxAmt > 0 ? (amt / maxAmt * 100) : 0;
                                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
                                return (
                                    <div key={row.address} className="lb-chart-bar">
                                        <span className="lb-chart-label">{medal}</span>
                                        <div className="lb-chart-track">
                                            <div className="lb-chart-fill" style={{ width: `${Math.max(pct, 5)}%` }} />
                                        </div>
                                        <span className="lb-chart-val">{Math.round(amt).toLocaleString()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="lb-table">
                    {/* Sort buttons */}
                    <div className="lb-sort-row">
                        <button className={`lb-sort-btn ${lbSortBy === "amount" ? "active" : ""}`} onClick={() => { playClick(); setLbSortBy("amount"); }}>
                            💰 {t("lbTotalAmount") || "Token"}
                        </button>
                        <button className={`lb-sort-btn ${lbSortBy === "recipients" ? "active" : ""}`} onClick={() => { playClick(); setLbSortBy("recipients"); }}>
                            👛 {t("lbRecipients") || "Recipients"}
                        </button>
                        <button className={`lb-sort-btn ${lbSortBy === "airdrops" ? "active" : ""}`} onClick={() => { playClick(); setLbSortBy("airdrops"); }}>
                            🎯 {t("lbTimes") || "Airdrops"}
                        </button>
                    </div>
                    <div className="lb-header">
                        <span className="lb-col-rank">#</span>
                        <span className="lb-col-addr">{t("lbWallet") || "Wallet"}</span>
                        <span className="lb-col-amount">{t("lbTotalAmount") || "Total"} ${tokenSymbol}</span>
                        <span className="lb-col-recip">👛</span>
                        <span className="lb-col-count">{t("lbTimes") || "×"}</span>
                    </div>
                    <div className="lb-body">
                        {[...leaderboardData].sort((a: any, b: any) => {
                            if (lbSortBy === "recipients") return Number(b.total_recipients || 0) - Number(a.total_recipients || 0);
                            if (lbSortBy === "airdrops") return Number(b.total_airdrops || 0) - Number(a.total_airdrops || 0);
                            return parseFloat(b.total_amount || "0") - parseFloat(a.total_amount || "0");
                        }).map((row: any, i: number) => {
                            const amt = parseFloat(row.total_amount || "0") / 1e18;
                            const recip = Number(row.total_recipients || 0);
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
                                    <span className="lb-col-amount">{Math.round(amt).toLocaleString()}</span>
                                    <span className="lb-col-recip">{recip.toLocaleString()}</span>
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
                    const myAmt = parseFloat(myRow.total_amount || "0") / 1e18;
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
                        const amt = parseFloat(row.total_amount || "0") / 1e18;
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
                const vAmt = vRow ? parseFloat(vRow.total_amount || "0") / 1e18 : 0;
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
