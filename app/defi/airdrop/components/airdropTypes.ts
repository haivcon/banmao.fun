// Shared types, constants, and utilities for Airdrop components
import { isAddress } from "viem";

// ===================== CONSTANTS =====================
export const BANMAO_TOKEN = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78" as `0x${string}`;
export const AIRDROP_CONTRACT = "0xf2d471711D24646b2C50E1F74a063caA7a6863a0" as `0x${string}`;
export const XLAYER_EXPLORER = "https://web3.okx.com/explorer/x-layer";
export const GAS_PER_TRANSFER = 65000;
export const GAS_PER_BATCH_RECIPIENT = 45000;
export const GAS_BATCH_BASE = 50000;
export const GAS_PRICE_GWEI = 0.1;
export const MAX_RETRIES = 3;
export const MAX_BATCH_SIZE = 200;
export const BATCH_SIZE_OPTIONS = [25, 50, 100, 150, 200] as const;

// Storage keys
export const STORAGE_HISTORY = "banmao_airdrop_history";
export const STORAGE_BOOK = "banmao_address_book";
export const STORAGE_BLACKLIST = "banmao_airdrop_blacklist";
export const STORAGE_TEMPLATES = "banmao_airdrop_templates";
export const STORAGE_CONFIG = "banmao_airdrop_config";
export const STORAGE_PROGRESS = "banmao_airdrop_progress";

// Preset popular tokens on XLayer
export const PRESET_TOKENS: {address: string; symbol: string; name: string; decimals: number; logo: string}[] = [
    { address: "0x16d91d1615fc55b76d5f92365bd60c069b46ef78", symbol: "banmao", name: "banmao", decimals: 18, logo: "https://static.oklink.com/cdn/web3/currency/token/large/196-0x16d91d1615fc55b76d5f92365bd60c069b46ef78-110/type=default_90_0?v=1767692192564" },
    { address: "0x87669801a1fad6dad9db70d27ac752f452989667", symbol: "NIUMA", name: "Niuma", decimals: 18, logo: "https://static.oklink.com/cdn/web3/currency/token/large/196-0x87669801a1fad6dad9db70d27ac752f452989667-110/type=default_90_0?v=1764921295782" },
    { address: "0x0cc24c51bf89c00c5affbfcf5e856c25ecbdb48e", symbol: "XDOG", name: "Xdog", decimals: 18, logo: "https://static.oklink.com/cdn/web3/currency/token/large/196-0x0cc24c51bf89c00c5affbfcf5e856c25ecbdb48e-110/type=default_90_0?v=1764839073713" },
    { address: "0xdcc83b32b6b4e95a61951bfcc9d71967515c0fca", symbol: "Xwizard", name: "Xwizard", decimals: 18, logo: "https://static.oklink.com/cdn/web3/currency/token/large/196-0xdcc83b32b6b4e95a61951bfcc9d71967515c0fca-107/type=default_90_0?v=1775024553859" },
];

export const SCAN_CHAINS = [
    { id: "196", name: "XLayer", emoji: "⛓️" },
    { id: "1", name: "Ethereum", emoji: "Ξ" },
    { id: "56", name: "BSC", emoji: "🟡" },
    { id: "137", name: "Polygon", emoji: "🟣" },
    { id: "42161", name: "Arbitrum", emoji: "🔵" },
    { id: "8453", name: "Base", emoji: "🔷" },
];

export const HOLDER_TAGS = [
    { id: "", label: "holderFilterAll", emoji: "📊" },
    { id: "3", label: "holderFilterSmartMoney", emoji: "💰" },
    { id: "4", label: "holderFilterWhale", emoji: "🐋" },
    { id: "1", label: "holderFilterKOL", emoji: "⭐" },
    { id: "5", label: "holderFilterNewWallet", emoji: "🆕" },
];

export const CHAIN_EXPLORERS: Record<string, string> = {
    "196": "https://web3.okx.com/explorer/x-layer",
    "1": "https://etherscan.io",
    "56": "https://bscscan.com",
    "137": "https://polygonscan.com",
    "42161": "https://arbiscan.io",
    "8453": "https://basescan.org",
};

// ABIs
export const ERC20_ABI = [
    { name: "transfer", type: "function" as const, inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
    { name: "approve", type: "function" as const, inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
    { name: "allowance", type: "function" as const, inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

export const BATCH_ABI = [
    { name: "batchTransferEqual", type: "function" as const, inputs: [{ name: "token", type: "address" }, { name: "recipients", type: "address[]" }, { name: "amount", type: "uint256" }], outputs: [] },
    { name: "batchTransfer", type: "function" as const, inputs: [{ name: "token", type: "address" }, { name: "recipients", type: "address[]" }, { name: "amounts", type: "uint256[]" }], outputs: [] },
] as const;

// ===================== TYPES =====================
export interface AirdropTemplate {
    name: string;
    amount: string;
    amountMode: "equal" | "custom";
    createdAt: number;
}

export interface HotToken {
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

export interface ScannedWallet {
    address: string;
    shortAddress: string;
    balances: { OKB: string; USDT: string; BANMAO?: string };
    hasBalance: boolean;
}

export interface SendResult {
    address: string;
    amount: string;
    success: boolean;
    txHash?: string;
    error?: string;
}

export interface HistoryEntry {
    id: string;
    timestamp: number;
    totalRecipients: number;
    successCount: number;
    failCount: number;
    totalSent: string;
    amountPerWallet: string;
    results: SendResult[];
}

export interface AddressGroup {
    name: string;
    addresses: string[];
    createdAt: number;
}

export interface RecipientEntry {
    address: string;
    amount: string;
}

export interface AirdropPanelProps {
    t: (key: string) => string;
    lang: string;
    playClick: () => void;
    playHover: () => void;
    playSuccess: () => void;
    playError: () => void;
}

export type AirdropTab = "manual" | "scan" | "csv";
export type AirdropStep = "input" | "preview" | "sending" | "done";
export type SendMode = 1 | 3 | 5 | 10 | 20 | "batch";
export type AmountMode = "equal" | "custom";

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

export function translateError(error: string, t: (key: string) => string): string {
    for (const [pattern, key] of ERROR_PATTERNS) {
        if (pattern.test(error)) return t(key) || error;
    }
    return error.length > 60 ? error.slice(0, 57) + "..." : error;
}

// ===================== HELPERS =====================
export function loadStorage<T>(key: string, fallback: T): T {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
}

export function saveStorage(key: string, data: any) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}

export function shortAddr(addr: string) { return `${addr.slice(0, 6)}···${addr.slice(-4)}`; }

export function formatNum(n: number) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function parseCSVContent(text: string): { address: string; amount?: string }[] {
    const results: { address: string; amount?: string }[] = [];
    const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (const line of cleaned.split('\n')) {
        if (!line.trim()) continue;
        const parts = line.split(/[,;\t]+/).map(s => s.trim().replace(/^"|"$/g, ''));
        const addrPart = parts.find(p => /0x[a-fA-F0-9]{40}/i.test(p));
        if (addrPart) {
            const match = addrPart.match(/0x[a-fA-F0-9]{40}/i);
            if (match) {
                const addr = match[0].toLowerCase();
                if (isAddress(addr)) {
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

export function generateResultCSV(results: SendResult[]): string {
    return "Address,Amount,Status,TxHash,Error\n" + results.map(r =>
        `${r.address},${r.amount},${r.success ? "Success" : "Failed"},${r.txHash || ""},${r.error || ""}`
    ).join("\n");
}

export function downloadFile(content: string, filename: string) {
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

export function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
}
