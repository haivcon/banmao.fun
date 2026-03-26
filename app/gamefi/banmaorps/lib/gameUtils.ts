import { formatUnits, isHex, keccak256, encodePacked } from "viem";
import {
    CachedInfoState,
    CachedRoomEntry,
    Choice,
    ForfeitRecord,
    RoomWithForfeit,
    UserStatsShape,
    TelegramReminderMeta,
    HistoryLookupRaw,
    // ForfeitRecord already imported
    RoomSnapshot,
    FinalOutcome,
    ForfeitResolution,
    MinimalPublicClient
} from "./types";
import { LocaleStrings } from "./i18n";

export const STATE = ["Wait", "Committing", "Revealing", "Finished", "Canceled"];
export const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
export const ZERO_ADDR_LOWER = ZERO_ADDR.toLowerCase();
export const ZERO_COMMIT = "0x0000000000000000000000000000000000000000000000000000000000000000";
export const ZERO_BIGINT = BigInt(0);
export const MAX_SALT_VALUE = BigInt(`0x${"f".repeat(64)}`);

/* ===================== CONSTS ===================== */
export const RPS = process.env.NEXT_PUBLIC_RPS_ADDRESS as `0x${string}`;
export const BANMAO = process.env.NEXT_PUBLIC_BANMAO as `0x${string}`;
export const RPC_LOG_RANGE_LIMIT = BigInt(100);
export const DEFAULT_LOG_CHUNK = BigInt(90);
export const DEFAULT_LOG_ATTEMPTS = 20;

export const LOG_CHUNK_SIZE = (() => {
    const raw = process.env.NEXT_PUBLIC_RPC_LOG_CHUNK;
    if (!raw) return DEFAULT_LOG_CHUNK;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LOG_CHUNK;
    const normalized = BigInt(parsed);
    if (normalized > RPC_LOG_RANGE_LIMIT) return RPC_LOG_RANGE_LIMIT;
    return normalized;
})();

export const LOG_MAX_ATTEMPTS = (() => {
    const raw = process.env.NEXT_PUBLIC_RPC_LOG_ATTEMPTS;
    if (!raw) return DEFAULT_LOG_ATTEMPTS;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LOG_ATTEMPTS;
    return parsed;
})();

export const RPS_DEPLOY_BLOCK = (() => {
    const raw = process.env.NEXT_PUBLIC_RPS_DEPLOY_BLOCK;
    if (!raw) return ZERO_BIGINT;
    try {
        const parsed = BigInt(raw);
        if (parsed < ZERO_BIGINT) return ZERO_BIGINT;
        return parsed;
    } catch {
        return ZERO_BIGINT;
    }
})();

export const STEP_PRESETS = [10, 100, 10000, 100000, 1000000] as const;
export const DEFAULT_VIBRATION = 220;
export const DEFAULT_SNOOZE_MINUTES = 2;
export const FEEDBACK_COOLDOWN_MS = 120;
export const READ_QUERY_BEHAVIOR = {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
} as const;
export const BLOCK_REFETCH_THROTTLE_MS = 1_200;
export const BLOCK_WATCH_POLL_INTERVAL_MS = 1_000;
export const SHARED_REFRESH_INTERVAL_MS = 12_000;
export const FORFEIT_FETCH_COOLDOWN_MS = 25_000;
export const FORFEIT_FETCH_DELAY_MS = 120;
export const DEFAULT_FORFEIT_LOG_INTERVAL_MS = 180;
export const DEFAULT_FORFEIT_RATE_LIMIT_COOLDOWN_MS = 2_000;

export const FORFEIT_LOG_MIN_INTERVAL_MS = (() => {
    const raw = process.env.NEXT_PUBLIC_FORFEIT_LOG_INTERVAL_MS;
    if (!raw) return DEFAULT_FORFEIT_LOG_INTERVAL_MS;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_FORFEIT_LOG_INTERVAL_MS;
    return parsed;
})();

export const FORFEIT_LOG_RATE_LIMIT_COOLDOWN_MS = (() => {
    const raw = process.env.NEXT_PUBLIC_FORFEIT_LOG_RATE_LIMIT_COOLDOWN_MS;
    if (!raw) return DEFAULT_FORFEIT_RATE_LIMIT_COOLDOWN_MS;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return DEFAULT_FORFEIT_RATE_LIMIT_COOLDOWN_MS;
    }
    return parsed;
})();

export const DEFAULT_COMMIT_WINDOW = 600;
export const MIN_COMMIT_WINDOW = 60;
export const MAX_COMMIT_WINDOW = 24 * 60 * 60;
export const REVEAL_WINDOW = 900;
export const X_HANDLE = "banmao_X";
export const UI_SCALE_STORAGE_KEY = "banmao_ui_scale";
export const THEME_STORAGE_KEY = "banmao_theme";
export const TELEGRAM_NOTIFY_ENDPOINT = process.env.NEXT_PUBLIC_TELEGRAM_NOTIFY_ENDPOINT;
export const GOOGLE_DOCS_URL = "https://docs.google.com/document/d/1ObVjHuoVCjXbF5zuWqzbcUuoqT86CdCm4Z9mwMWCpp0/";
export const TELEGRAM_BOT_USERNAME = "banmaoRPS_bot";
export const TELEGRAM_GROUP = "banmao_X/15605";
// Wait, TELEGRAM_BOT_USERNAME was imported in page.tsx. I should import it here or pass it?
// Actually page.tsx defined TELEGRAM_URL using it.
// I'll stick to what page.tsx had in CONSTS block.
// page.tsx line 177: const TELEGRAM_URL = ...
export const TELEGRAM_URL = `https://t.me/${TELEGRAM_GROUP}`; // Error if I don't import.
export const X_URL = `https://x.com/${X_HANDLE}`;
export const ROOMS_CACHE_KEY = "banmao_rooms_cache_v1";
export const INFO_CACHE_KEY = "banmao_info_cache_v1";


export const EMPTY_STATS: UserStatsShape = {
    win: 0,
    loss: 0,
    draw: 0,
    totalWinnings: ZERO_BIGINT,
    totalLosses: ZERO_BIGINT,
    rock: 0,
    paper: 0,
    scissors: 0,
};

export const RULE_ACCENTS = [
    { icon: "🎮", className: "rule-accent-start" },
    { icon: "🔒", className: "rule-accent-commit" },
    { icon: "🔍", className: "rule-accent-reveal" },
    { icon: "🏆", className: "rule-accent-outcome" },
    { icon: "⏰", className: "rule-accent-timeout" },
    { icon: "🏳️", className: "rule-accent-forfeit" },
    { icon: "♻️", className: "rule-accent-both-commit" },
    { icon: "🌀", className: "rule-accent-both-reveal" },
] as const;

export function roomsEqual(a: RoomWithForfeit[], b: RoomWithForfeit[]) {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        const left = a[i];
        const right = b[i];
        if (!left || !right) return false;
        if (left.id !== right.id) return false;
        if (left.state !== right.state) return false;
        if (left.creator !== right.creator) return false;
        if (left.opponent !== right.opponent) return false;
        if (left.commitA !== right.commitA) return false;
        if (left.commitB !== right.commitB) return false;
        if (left.revealA !== right.revealA) return false;
        if (left.revealB !== right.revealB) return false;
        if (left.commitDeadline !== right.commitDeadline) return false;
        if (left.revealDeadline !== right.revealDeadline) return false;
        if (left.stake !== right.stake) return false;
        const leftForfeit = left.forfeit ?? null;
        const rightForfeit = right.forfeit ?? null;
        if (!!leftForfeit !== !!rightForfeit) return false;
        if (leftForfeit && rightForfeit) {
            if ((leftForfeit.loser ?? null) !== (rightForfeit.loser ?? null)) return false;
            if ((leftForfeit.winner ?? null) !== (rightForfeit.winner ?? null)) return false;
            const leftPayout = leftForfeit.payout ?? null;
            const rightPayout = rightForfeit.payout ?? null;
            if (leftPayout !== rightPayout) return false;
        }
    }
    return true;
}

export function serializeRoomForCache(room: RoomWithForfeit): CachedRoomEntry {
    return {
        id: Number(room.id ?? 0),
        creator: (room.creator ?? ZERO_ADDR) as `0x${string}`,
        opponent: (room.opponent ?? ZERO_ADDR) as `0x${string}`,
        stake: (room.stake ?? ZERO_BIGINT).toString(),
        commitA: (room.commitA ?? ZERO_COMMIT) as `0x${string}`,
        commitB: (room.commitB ?? ZERO_COMMIT) as `0x${string}`,
        revealA: Number(room.revealA ?? 0),
        revealB: Number(room.revealB ?? 0),
        state: Number(room.state ?? 0),
        commitDeadline: Number(room.commitDeadline ?? 0),
        revealDeadline: Number(room.revealDeadline ?? 0),
        forfeit: room.forfeit
            ? {
                loser: (room.forfeit.loser ?? null) as `0x${string}` | null,
                winner: (room.forfeit.winner ?? null) as `0x${string}` | null,
                payout:
                    room.forfeit.payout != null
                        ? room.forfeit.payout.toString()
                        : null,
            }
            : null,
    };
}

export function reviveRoomFromCache(entry: any): RoomWithForfeit | null {
    if (!entry || typeof entry !== "object") return null;
    try {
        const id = Number(entry.id ?? 0);
        if (!Number.isFinite(id) || id <= 0) return null;
        const stakeRaw = entry.stake;
        let stake = ZERO_BIGINT;
        if (typeof stakeRaw === "string" && stakeRaw) {
            try {
                stake = BigInt(stakeRaw);
            } catch {
                stake = ZERO_BIGINT;
            }
        }
        const forfeitEntry = entry.forfeit;
        let forfeit: ForfeitRecord | null = null;
        if (forfeitEntry && typeof forfeitEntry === "object") {
            let payout: bigint | null = null;
            const payoutRaw = (forfeitEntry as any).payout;
            if (typeof payoutRaw === "string" && payoutRaw) {
                try {
                    payout = BigInt(payoutRaw);
                } catch {
                    payout = null;
                }
            }
            forfeit = {
                loser: typeof forfeitEntry.loser === "string" ? (forfeitEntry.loser as `0x${string}`) : undefined,
                winner: typeof forfeitEntry.winner === "string" ? (forfeitEntry.winner as `0x${string}`) : undefined,
                payout,
            };
        }

        return {
            id,
            creator: (typeof entry.creator === "string" ? entry.creator : ZERO_ADDR) as `0x${string}`,
            opponent: (typeof entry.opponent === "string" ? entry.opponent : ZERO_ADDR) as `0x${string}`,
            stake,
            commitA: (typeof entry.commitA === "string" ? entry.commitA : ZERO_COMMIT) as `0x${string}`,
            commitB: (typeof entry.commitB === "string" ? entry.commitB : ZERO_COMMIT) as `0x${string}`,
            revealA: Number(entry.revealA ?? 0),
            revealB: Number(entry.revealB ?? 0),
            state: Number(entry.state ?? 0),
            commitDeadline: Number(entry.commitDeadline ?? 0),
            revealDeadline: Number(entry.revealDeadline ?? 0),
            forfeit,
        };
    } catch {
        return null;
    }
}

export function userStatsEqual(a: UserStatsShape, b: UserStatsShape) {
    return (
        a.win === b.win &&
        a.loss === b.loss &&
        a.draw === b.draw &&
        a.rock === b.rock &&
        a.paper === b.paper &&
        a.scissors === b.scissors &&
        a.totalWinnings === b.totalWinnings &&
        a.totalLosses === b.totalLosses
    );
}

export function serializeInfoForCache(info: CachedInfoState) {
    return {
        balance: info.balance != null ? info.balance.toString() : null,
        stats: {
            win: info.stats.win,
            loss: info.stats.loss,
            draw: info.stats.draw,
            rock: info.stats.rock,
            paper: info.stats.paper,
            scissors: info.stats.scissors,
            totalWinnings: info.stats.totalWinnings.toString(),
            totalLosses: info.stats.totalLosses.toString(),
        },
    };
}

export function reviveInfoFromCache(entry: any): CachedInfoState | null {
    if (!entry || typeof entry !== "object") return null;
    const statsRaw = entry.stats;
    if (!statsRaw || typeof statsRaw !== "object") return null;
    try {
        let balance: bigint | null = null;
        if (typeof entry.balance === "string" && entry.balance) {
            try {
                balance = BigInt(entry.balance);
            } catch {
                balance = null;
            }
        }

        const totalWinningsRaw = statsRaw.totalWinnings;
        const totalLossesRaw = statsRaw.totalLosses;
        let totalWinnings = ZERO_BIGINT;
        let totalLosses = ZERO_BIGINT;
        if (typeof totalWinningsRaw === "string" && totalWinningsRaw) {
            try {
                totalWinnings = BigInt(totalWinningsRaw);
            } catch {
                totalWinnings = ZERO_BIGINT;
            }
        }
        if (typeof totalLossesRaw === "string" && totalLossesRaw) {
            try {
                totalLosses = BigInt(totalLossesRaw);
            } catch {
                totalLosses = ZERO_BIGINT;
            }
        }

        const stats: UserStatsShape = {
            win: Number(statsRaw.win ?? 0) || 0,
            loss: Number(statsRaw.loss ?? 0) || 0,
            draw: Number(statsRaw.draw ?? 0) || 0,
            rock: Number(statsRaw.rock ?? 0) || 0,
            paper: Number(statsRaw.paper ?? 0) || 0,
            scissors: Number(statsRaw.scissors ?? 0) || 0,
            totalWinnings,
            totalLosses,
        };

        return { balance, stats };
    } catch {
        return null;
    }
}

export function normalizeForfeitAddress(value: string | null | undefined): `0x${string}` | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(lower)) return null;
    if (lower === ZERO_ADDR.toLowerCase()) return null;
    return lower as `0x${string}`;
}

export function normalizeForfeitPayout(value: unknown): bigint | null {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") {
        if (!Number.isFinite(value) || value < 0) return null;
        return BigInt(Math.floor(value));
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        try {
            return BigInt(trimmed);
        } catch {
            return null;
        }
    }
    return null;
}

export function formatShortAddress(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return null;
    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

export function newSalt(): `0x${string}` {
    const b = new Uint8Array(32);
    crypto.getRandomValues(b);
    return `0x${[...b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

export function waitMs(ms: number) {
    return new Promise<void>((resolve) => {
        if (!Number.isFinite(ms) || ms <= 0) {
            resolve();
            return;
        }
        setTimeout(resolve, ms);
    });
}

export function collectErrorMessages(value: unknown, seen = new Set<unknown>()): string[] {
    if (value == null) return [];
    if (typeof value === "string") return [value];
    if (typeof value === "number" || typeof value === "boolean") {
        return [String(value)];
    }
    if (typeof value === "bigint") {
        return [value.toString()];
    }
    if (seen.has(value)) return [];
    seen.add(value);

    if (Array.isArray(value)) {
        return value.flatMap((entry) => collectErrorMessages(entry, seen));
    }

    const parts: string[] = [];
    if (value instanceof Error) {
        if (typeof value.message === "string") parts.push(value.message);
        const anyErr = value as any;
        if (typeof anyErr.shortMessage === "string") parts.push(anyErr.shortMessage);
        if (typeof anyErr.details === "string") parts.push(anyErr.details);
        if (typeof anyErr.body === "string") parts.push(anyErr.body);
        if (anyErr.cause) {
            parts.push(...collectErrorMessages(anyErr.cause, seen));
        }
        return parts;
    }

    if (typeof value === "object") {
        const anyValue = value as any;
        if (typeof anyValue.message === "string") parts.push(anyValue.message);
        if (typeof anyValue.shortMessage === "string") parts.push(anyValue.shortMessage);
        if (typeof anyValue.details === "string") parts.push(anyValue.details);
        if (typeof anyValue.body === "string") parts.push(anyValue.body);
        if (anyValue.error) {
            parts.push(...collectErrorMessages(anyValue.error, seen));
        }
        if (anyValue.cause) {
            parts.push(...collectErrorMessages(anyValue.cause, seen));
        }
    }

    return parts;
}

export function isRateLimitError(error: unknown): boolean {
    const combined = collectErrorMessages(error)
        .map((msg) => msg.toLowerCase())
        .join(" ");
    if (!combined) return false;
    return (
        combined.includes("rate limit") ||
        combined.includes("429") ||
        combined.includes("too many requests")
    );
}

export function formatSaltHex(value: bigint): `0x${string}` {
    const hex = value.toString(16).padStart(64, "0");
    return `0x${hex}` as `0x${string}`;
}

export function parseSaltHex(value: string): bigint | null {
    if (!isHex(value) || value.length !== 66) return null;
    try {
        return BigInt(value);
    } catch {
        return null;
    }
}

export function commitHash(c: Choice, salt: `0x${string}`) {
    return keccak256(encodePacked(["uint8", "bytes32"], [c, salt]));
}

export function normalizeRoomId(
    value: string | number | bigint | null | undefined
): string {
    if (value == null) return "";
    const str =
        typeof value === "number" || typeof value === "bigint"
            ? value.toString()
            : String(value).trim();
    if (str === "") return "";
    const digitsOnly = str.replace(/[^0-9]/g, "");
    if (digitsOnly === "") return "";
    const normalized = digitsOnly.replace(/^0+(?=\d)/, "");
    return normalized === "" ? "0" : normalized;
}

export function getWinner(a: number, b: number): "A" | "B" | "Draw" | null {
    if (a === 0 && b === 0) return null;
    if (a === 0) return "B";
    if (b === 0) return "A";
    if (a === b) return "Draw";
    const aWins = (a === 1 && b === 3) || (a === 3 && b === 2) || (a === 2 && b === 1);
    return aWins ? "A" : "B";
}

export function formatWholeWithThousands(whole: string) {
    const isNegative = whole.startsWith("-");
    const digits = isNegative ? whole.slice(1) : whole;
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return isNegative ? `-${formatted}` : formatted;
}

export function normalizeStakeInput(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const withoutGrouping = trimmed.replace(/,/g, "");
    return withoutGrouping;
}

export function formatStakeDisplayFromNumber(value: number, fractionLength: number) {
    if (!Number.isFinite(value)) return "0";
    const safeValue = value < 0 ? 0 : value;
    if (fractionLength > 0) {
        const factor = Math.pow(10, fractionLength);
        const rounded = Math.round(safeValue * factor) / factor;
        const [wholePart, fractionPartRaw] = rounded.toFixed(fractionLength).split(".");
        const trimmedFraction = (fractionPartRaw ?? "").replace(/0+$/, "");
        const wholeWithSeparators = formatWholeWithThousands(wholePart);
        return trimmedFraction ? `${wholeWithSeparators}.${trimmedFraction}` : wholeWithSeparators;
    }

    const roundedInt = Math.round(safeValue);
    return formatWholeWithThousands(String(roundedInt));
}

export function formatStakeDisplayString(value: string) {
    const normalized = normalizeStakeInput(value);
    if (!normalized) return "";
    const base = Number.parseFloat(normalized);
    if (!Number.isFinite(base)) return "";
    const fractionLength = normalized.includes(".")
        ? Math.min((normalized.split(".")[1] ?? "").length, 4)
        : 0;
    return formatStakeDisplayFromNumber(base, fractionLength);
}

export function parseStakeValue(value: string) {
    const normalized = normalizeStakeInput(value);
    const fractionLength = normalized.includes(".")
        ? Math.min((normalized.split(".")[1] ?? "").length, 4)
        : 0;
    const base = Number.parseFloat(normalized || "0");
    return {
        base: Number.isFinite(base) ? base : 0,
        fractionLength,
    };
}

export function prepareStakeForContract(value: string) {
    const normalized = normalizeStakeInput(value);
    return normalized === "" ? "0" : normalized;
}

export function formatTokenAmount(value: bigint, decimals: number) {
    try {
        const raw = formatUnits(value, decimals);
        const [wholePart, fractionPart] = raw.split(".");
        const wholeWithSeparators = formatWholeWithThousands(wholePart);
        if (!fractionPart) return wholeWithSeparators;
        const trimmedFraction = fractionPart.slice(0, 4).replace(/0+$/, "");
        return trimmedFraction ? `${wholeWithSeparators}.${trimmedFraction}` : wholeWithSeparators;
    } catch {
        return value.toString();
    }
}

export function formatTokenAmountSigned(value: bigint, decimals: number) {
    const negative = value < ZERO_BIGINT;
    const absolute = negative ? -value : value;
    const formatted = formatTokenAmount(absolute, decimals);
    if (formatted === "0") return formatted;
    return `${negative ? "-" : "+"}${formatted}`;
}

export function roomHasRevealedOutcome(room: { revealA?: number; revealB?: number }) {
    const revealA = Number(room?.revealA ?? 0);
    const revealB = Number(room?.revealB ?? 0);
    return revealA > 0 && revealB > 0;
}

export function resolveForfeitOutcome(room: {
    forfeit?: ForfeitRecord | null;
    creator?: `0x${string}`;
    opponent?: `0x${string}`;
}): ForfeitResolution | null {
    const record = room?.forfeit;
    if (!record) return null;

    const winnerLower = record.winner?.toLowerCase?.() ?? null;
    const loserLower = record.loser?.toLowerCase?.() ?? null;
    if (!winnerLower && !loserLower) return null;

    const creatorLower = room.creator?.toLowerCase?.() ?? null;
    const opponentLower = room.opponent?.toLowerCase?.() ?? null;

    let winnerSide: "creator" | "opponent" | null = null;
    let loserSide: "creator" | "opponent" | null = null;

    if (winnerLower && creatorLower && winnerLower === creatorLower) {
        winnerSide = "creator";
    } else if (winnerLower && opponentLower && winnerLower === opponentLower) {
        winnerSide = "opponent";
    }

    if (loserLower && creatorLower && loserLower === creatorLower) {
        loserSide = "creator";
    } else if (loserLower && opponentLower && loserLower === opponentLower) {
        loserSide = "opponent";
    }

    if (!winnerSide) {
        if (loserSide === "creator" && opponentLower) {
            winnerSide = "opponent";
        } else if (loserSide === "opponent" && creatorLower) {
            winnerSide = "creator";
        }
    }

    if (!loserSide) {
        if (winnerSide === "creator" && opponentLower) {
            loserSide = "opponent";
        } else if (winnerSide === "opponent" && creatorLower) {
            loserSide = "creator";
        }
    }

    return {
        winnerSide,
        loserSide,
        winnerAddress: winnerLower,
        loserAddress: loserLower,
    };
}

export function determineForfeitViewerResult(
    resolution: ForfeitResolution | null,
    options: {
        viewerAddress?: string | null;
        creator?: `0x${string}` | null;
        opponent?: `0x${string}` | null;
    }
): { viewerWon: boolean; viewerLost: boolean } {
    if (!resolution) return { viewerWon: false, viewerLost: false };

    const viewer = options.viewerAddress?.toLowerCase?.() ?? "";
    const creatorLower = options.creator?.toLowerCase?.() ?? null;
    const opponentLower = options.opponent?.toLowerCase?.() ?? null;

    const winnerAddress = resolution.winnerAddress ?? null;
    const loserAddress = resolution.loserAddress ?? null;

    let viewerWon = !!(viewer && winnerAddress && viewer === winnerAddress);
    let viewerLost = !!(viewer && loserAddress && viewer === loserAddress);

    if (!viewerWon && !viewerLost && viewer) {
        if (resolution.winnerSide === "creator" && creatorLower && viewer === creatorLower) {
            viewerWon = true;
        } else if (resolution.winnerSide === "opponent" && opponentLower && viewer === opponentLower) {
            viewerWon = true;
        } else if (resolution.loserSide === "creator" && creatorLower && viewer === creatorLower) {
            viewerLost = true;
        } else if (resolution.loserSide === "opponent" && opponentLower && viewer === opponentLower) {
            viewerLost = true;
        } else if (!resolution.winnerSide && resolution.loserSide === "creator" && opponentLower && viewer === opponentLower) {
            viewerWon = true;
        } else if (!resolution.winnerSide && resolution.loserSide === "opponent" && creatorLower && viewer === creatorLower) {
            viewerWon = true;
        } else if (!resolution.loserSide && resolution.winnerSide === "creator" && opponentLower && viewer === opponentLower) {
            viewerLost = true;
        } else if (!resolution.loserSide && resolution.winnerSide === "opponent" && creatorLower && viewer === creatorLower) {
            viewerLost = true;
        }
    }

    return { viewerWon, viewerLost };
}

export function roomIsFinalized(room: {
    state?: number;
    revealA?: number;
    revealB?: number;
    forfeit?: ForfeitRecord | null;
    creator?: `0x${string}`;
    opponent?: `0x${string}`;
}) {
    if (!room) return false;
    if (resolveForfeitOutcome(room)) return true;
    if (room.state === 3) return true;
    if (room.state === 4 && roomHasRevealedOutcome(room)) return true;
    return false;
}

export function deriveFinalOutcome(room: {
    state?: number;
    commitA?: `0x${string}`;
    commitB?: `0x${string}`;
    revealA?: number;
    revealB?: number;
    creator?: `0x${string}`;
    opponent?: `0x${string}`;
    forfeit?: ForfeitRecord | null;
}): FinalOutcome {
    if (!room || !roomIsFinalized(room)) {
        return { winner: null, via: "unknown" };
    }

    const forfeitResolution = resolveForfeitOutcome(room);
    if (forfeitResolution) {
        if (forfeitResolution.winnerSide === "creator") {
            return { winner: "creator", via: "forfeit" };
        }
        if (forfeitResolution.winnerSide === "opponent") {
            return { winner: "opponent", via: "forfeit" };
        }
        if (forfeitResolution.loserSide === "creator") {
            return { winner: "opponent", via: "forfeit" };
        }
        if (forfeitResolution.loserSide === "opponent") {
            return { winner: "creator", via: "forfeit" };
        }
        return { winner: null, via: "forfeit" };
    }

    const hasRevealed = roomHasRevealedOutcome(room);
    if (hasRevealed) {
        const winner = getWinner(room.revealA ?? 0, room.revealB ?? 0);
        if (winner === "A") return { winner: "creator", via: "normal" };
        if (winner === "B") return { winner: "opponent", via: "normal" };
        if (winner === "Draw") return { winner: "draw", via: "normal" };
        return { winner: null, via: "normal" };
    }

    const commitAZero = !room.commitA || room.commitA === ZERO_COMMIT;
    const commitBZero = !room.commitB || room.commitB === ZERO_COMMIT;
    const revealAZero = (room.revealA ?? 0) === 0;
    const revealBZero = (room.revealB ?? 0) === 0;

    if (!commitAZero && commitBZero) {
        return { winner: "creator", via: "commit-timeout" };
    }
    if (commitAZero && !commitBZero) {
        return { winner: "opponent", via: "commit-timeout" };
    }

    if (!revealAZero && revealBZero) {
        return { winner: "creator", via: "reveal-timeout" };
    }
    if (revealAZero && !revealBZero) {
        return { winner: "opponent", via: "reveal-timeout" };
    }

    if (commitAZero && commitBZero) {
        return { winner: "draw", via: "both-commit-timeout" };
    }

    if (revealAZero && revealBZero) {
        return { winner: "draw", via: "both-reveal-timeout" };
    }

    return { winner: "draw", via: "unknown" };
}

export function formatTimeLeft(deadline: number, t: any, nowOverride?: number): string {
    const now = nowOverride ?? Math.floor(Date.now() / 1000);
    const timeLeft = deadline > now ? deadline - now : 0;
    if (timeLeft === 0) return t.timeout ?? "00:00:00";
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function getCancelDetails(room: any, t: any) {
    if (room.opponent === ZERO_ADDR) {
        return {
            reason: t.canceledReasonNoJoin ?? t.canceledReasonUnknown,
            refund:
                t.canceledRefundCreatorOnly ??
                t.canceledRefundBothPartial ??
                t.canceledRefundUnknown,
        };
    }
    const commitAZero = !room.commitA || room.commitA === ZERO_COMMIT;
    const commitBZero = !room.commitB || room.commitB === ZERO_COMMIT;
    const revealAZero = room.revealA === 0;
    const revealBZero = room.revealB === 0;

    if (commitAZero && commitBZero) {
        return {
            reason: t.canceledReasonCommit,
            refund: t.canceledRefundBothFull,
        };
    }

    if (!commitAZero && !commitBZero && revealAZero && revealBZero) {
        return {
            reason: t.canceledReasonReveal,
            refund: t.canceledRefundBothPartial,
        };
    }

    return {
        reason: t.canceledReasonUnknown,
        refund: t.canceledRefundUnknown,
    };
}

export function createForfeitWarning(
    room: Partial<RoomSnapshot>,
    viewerAddress: string | null,
    t: LocaleStrings,
    decimals: number
): { title: string; body: string } | null {
    if (!viewerAddress) return null;
    const viewerLower = viewerAddress.toLowerCase();
    const creatorLower = room.creator?.toLowerCase?.() ?? null;
    const opponentLower = room.opponent?.toLowerCase?.() ?? null;
    const viewerIsCreator = creatorLower === viewerLower;
    const viewerIsOpponent = opponentLower === viewerLower;
    if (!viewerIsCreator && !viewerIsOpponent) return null;

    const stakeValue = typeof room.stake === "bigint" ? room.stake : BigInt(0);
    const stakeLabel = `${formatTokenAmount(stakeValue, decimals)} $BANMAO`;
    const state = Number(room.state ?? 0);

    const viewerCommitted = viewerIsCreator
        ? room.commitA && room.commitA !== ZERO_COMMIT
        : room.commitB && room.commitB !== ZERO_COMMIT;
    const opponentCommitted = viewerIsCreator
        ? room.commitB && room.commitB !== ZERO_COMMIT
        : room.commitA && room.commitA !== ZERO_COMMIT;

    const viewerRevealed = viewerIsCreator
        ? Number(room.revealA ?? 0) !== 0
        : Number(room.revealB ?? 0) !== 0;
    const opponentRevealed = viewerIsCreator
        ? Number(room.revealB ?? 0) !== 0
        : Number(room.revealA ?? 0) !== 0;

    if (state === 1) {
        if (!viewerCommitted && !opponentCommitted) {
            return {
                title: t.forfeitWarnBothUncommittedTitle,
                body: t.forfeitWarnBothUncommittedBody(stakeLabel),
            };
        }
        if (viewerCommitted && !opponentCommitted) {
            return {
                title: t.forfeitWarnSelfCommittedTitle,
                body: t.forfeitWarnSelfCommittedBody(stakeLabel),
            };
        }
        if (!viewerCommitted && opponentCommitted) {
            return {
                title: t.forfeitWarnSelfUncommittedTitle,
                body: t.forfeitWarnSelfUncommittedBody(stakeLabel),
            };
        }
    } else if (state === 2) {
        if (!viewerRevealed && !opponentRevealed) {
            return {
                title: t.forfeitWarnBothUnrevealedTitle,
                body: t.forfeitWarnBothUnrevealedBody(stakeLabel),
            };
        }
        if (viewerRevealed && !opponentRevealed) {
            return {
                title: t.forfeitWarnSelfRevealedTitle,
                body: t.forfeitWarnSelfRevealedBody(stakeLabel),
            };
        }
        if (!viewerRevealed && opponentRevealed) {
            return {
                title: t.forfeitWarnSelfUnrevealedTitle,
                body: t.forfeitWarnSelfUnrevealedBody(stakeLabel),
            };
        }
    }

    return {
        title: t.forfeitWarnDefaultTitle,
        body: t.forfeitWarnDefaultBody(stakeLabel),
    };
}

// Throttle logic
export function createIntervalThrottle(minIntervalMs: number) {
    const interval = Number.isFinite(minIntervalMs) && minIntervalMs > 0 ? minIntervalMs : 0;
    let lastStart = 0;
    let cooldownUntil = 0;
    let queue: Promise<void> = Promise.resolve();

    async function runTask<T>(fn: () => Promise<T>) {
        const now = Date.now();
        const waitUntil = Math.max(lastStart + interval, cooldownUntil);
        const wait = waitUntil > now ? waitUntil - now : 0;
        if (wait > 0) {
            await waitMs(wait);
        }
        lastStart = Date.now();
        return fn();
    }

    return {
        run<T>(fn: () => Promise<T>): Promise<T> {
            let resolveTask!: (value: T | PromiseLike<T>) => void;
            let rejectTask!: (reason?: unknown) => void;
            const result = new Promise<T>((resolve, reject) => {
                resolveTask = resolve;
                rejectTask = reject;
            });

            const execute = () =>
                runTask(fn)
                    .then((value) => {
                        resolveTask(value);
                    })
                    .catch((error) => {
                        rejectTask(error);
                    });

            queue = queue.then(execute).catch(() => { });
            return result;
        },
        extendCooldown(ms: number) {
            if (!Number.isFinite(ms) || ms <= 0) return;
            const now = Date.now();
            const candidate = now + ms;
            if (candidate > cooldownUntil) {
                cooldownUntil = candidate;
            }
        },
    };
}

export const forfeitLogThrottle = createIntervalThrottle(FORFEIT_LOG_MIN_INTERVAL_MS);

export function extractForfeitRecord(log: any): ForfeitRecord | null {
    if (!log) return null;
    const loserAddr = normalizeForfeitAddress(String(log?.args?.loser ?? ""));
    const winnerAddr = normalizeForfeitAddress(String(log?.args?.winner ?? ""));
    const payoutValue = normalizeForfeitPayout(log?.args?.winnerPayout ?? null);
    if (!loserAddr && !winnerAddr && payoutValue == null) {
        return null;
    }
    return {
        loser: loserAddr ?? null,
        winner: winnerAddr ?? null,
        payout: payoutValue ?? null,
    };
}

export async function fetchLatestForfeitLog({
    publicClient,
    event,
    roomId,
    latestBlock,
    toBlock,
    minBlock,
    chunkSize,
    maxAttempts,
}: {
    publicClient: MinimalPublicClient | null | undefined;
    event: any;
    roomId: number;
    latestBlock?: bigint | null;
    toBlock?: bigint | null;
    minBlock?: bigint | null;
    chunkSize?: bigint | null;
    maxAttempts?: number | null;
}): Promise<any | null> {
    if (!publicClient || !event) return null;
    if (!Number.isFinite(roomId) || roomId < 0) return null;

    const safeMinBlock = minBlock ?? RPS_DEPLOY_BLOCK;
    const rawChunk = chunkSize ?? LOG_CHUNK_SIZE;
    const safeChunk = rawChunk <= ZERO_BIGINT
        ? DEFAULT_LOG_CHUNK
        : rawChunk > RPC_LOG_RANGE_LIMIT
            ? RPC_LOG_RANGE_LIMIT
            : rawChunk;
    const span = safeChunk > ZERO_BIGINT ? safeChunk - BigInt(1) : ZERO_BIGINT;
    const attemptsLimit = maxAttempts && maxAttempts > 0 ? maxAttempts : LOG_MAX_ATTEMPTS;

    let cursorTo = toBlock ?? latestBlock ?? (await publicClient.getBlockNumber());
    if (cursorTo < safeMinBlock) {
        cursorTo = safeMinBlock;
    }

    let attempts = 0;
    while (cursorTo >= safeMinBlock && attempts < attemptsLimit) {
        let cursorFrom = cursorTo <= safeMinBlock ? safeMinBlock : cursorTo - span;
        if (cursorFrom < safeMinBlock) {
            cursorFrom = safeMinBlock;
        }

        let logs: any[] | null = null;
        try {
            logs = await forfeitLogThrottle.run(() =>
                publicClient.getLogs({
                    address: RPS,
                    event,
                    args: { roomId: BigInt(roomId) },
                    fromBlock: cursorFrom,
                    toBlock: cursorTo,
                } as any)
            );
            attempts += 1;
        } catch (error) {
            attempts += 1;
            if (isRateLimitError(error)) {
                forfeitLogThrottle.extendCooldown(FORFEIT_LOG_RATE_LIMIT_COOLDOWN_MS);
                if (process.env.NODE_ENV !== "production") {
                    console.warn("Rate limited while fetching forfeit logs", error);
                }
                if (FORFEIT_LOG_RATE_LIMIT_COOLDOWN_MS > 0) {
                    await waitMs(FORFEIT_LOG_RATE_LIMIT_COOLDOWN_MS);
                }
                continue;
            }
            throw error;
        }

        const safeLogs = Array.isArray(logs) ? logs : [];
        if (safeLogs.length > 0) {
            return safeLogs[safeLogs.length - 1] as any;
        }

        if (cursorFrom <= safeMinBlock) {
            break;
        }

        const nextTo = cursorFrom - BigInt(1);
        if (nextTo < safeMinBlock) {
            break;
        }
        cursorTo = nextTo;
    }

    return null;
}


/**
 * Smart Sort Rooms:
 * 1. Actionable by ME (Commit/Reveal needed)
 * 2. Joinable (Open Lobby) -> Sorted by Stake DESC
 * 3. Active (In Progress)
 * 4. Others (Finalized, etc.)
 * Tie-breaker: Room ID DESC
 */
export function smartSortRooms(rooms: RoomWithForfeit[], viewerAddress?: string | null): RoomWithForfeit[] {
    if (!rooms || rooms.length === 0) return [];

    const viewer = viewerAddress?.toLowerCase() ?? "";

    // Helper to determine room priority group
    const getGroup = (r: RoomWithForfeit): number => {
        // 4. Finalized / Canceled / Finished -> Bottom
        if (roomIsFinalized(r) || r.state === 3 || r.state === 4) return 4;

        // 1. Actionable
        if (viewer) {
            const isCreator = r.creator?.toLowerCase() === viewer;
            const isOpponent = r.opponent?.toLowerCase() === viewer;

            if (r.state === 1) { // Committing
                if (isCreator && (!r.commitA || r.commitA === ZERO_COMMIT)) return 1;
                if (isOpponent && (!r.commitB || r.commitB === ZERO_COMMIT)) return 1;
            }
            if (r.state === 2) { // Revealing
                if (isCreator && (r.revealA === 0)) return 1;
                if (isOpponent && (r.revealB === 0)) return 1;
            }
        }

        // 2. Open Lobby (Joinable)
        if (r.state === 0 && r.opponent === ZERO_ADDR) return 2;

        // 3. Active (but not actionable by me)
        return 3;
    };

    return [...rooms].sort((a, b) => {
        const groupA = getGroup(a);
        const groupB = getGroup(b);

        if (groupA !== groupB) {
            return groupA - groupB;
        }

        // Within Group 2 (Open Lobby): Sort by Stake DESC
        if (groupA === 2) {
            const stakeA = a.stake ?? ZERO_BIGINT;
            const stakeB = b.stake ?? ZERO_BIGINT;
            if (stakeA !== stakeB) {
                // BigInt comparison
                return stakeA > stakeB ? -1 : 1;
            }
        }

        // Default Tie-breaker: ID DESC
        const idA = Number(a.id ?? 0);
        const idB = Number(b.id ?? 0);
        return idB - idA;
    });
}
