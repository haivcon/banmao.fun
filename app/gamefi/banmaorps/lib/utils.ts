/**
 * Utility Functions for BANMAO RPS
 * Extracted from page.tsx for better organization
 */

import { encodePacked, formatUnits, isHex, keccak256 } from "viem";
import type { Choice, ForfeitRecord, MinimalPublicClient, CachedInfoState, CachedRoomEntry, RoomWithForfeit, UserStatsShape } from "./types";
import {
    ZERO_ADDR,
    ZERO_COMMIT,
    ZERO_BIGINT,
    RPS_ADDRESS,
    RPC_LOG_RANGE_LIMIT,
    LOG_CHUNK_SIZE,
    LOG_MAX_ATTEMPTS,
    RPS_DEPLOY_BLOCK,
    FORFEIT_LOG_MIN_INTERVAL_MS,
    FORFEIT_LOG_RATE_LIMIT_COOLDOWN_MS,
} from "./constants";

// ===================== Crypto Utils =====================

/** Generate a new random salt for commit */
export function newSalt(): `0x${string}` {
    const b = new Uint8Array(32);
    crypto.getRandomValues(b);
    return `0x${[...b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** Compute commit hash from choice and salt */
export function commitHash(c: Choice, salt: `0x${string}`) {
    return keccak256(encodePacked(["uint8", "bytes32"], [c, salt]));
}

/** Format bigint salt to hex string */
export function formatSaltHex(value: bigint): `0x${string}` {
    const hex = value.toString(16).padStart(64, "0");
    return `0x${hex}` as `0x${string}`;
}

/** Parse hex string to bigint salt */
export function parseSaltHex(value: string): bigint | null {
    if (!isHex(value) || value.length !== 66) return null;
    try {
        return BigInt(value);
    } catch {
        return null;
    }
}

// ===================== Timing Utils =====================

/** Wait for specified milliseconds */
export function waitMs(ms: number) {
    return new Promise<void>((resolve) => {
        if (!Number.isFinite(ms) || ms <= 0) {
            resolve();
            return;
        }
        setTimeout(resolve, ms);
    });
}

// ===================== Error Utils =====================

/** Collect all error messages from nested error object */
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

/** Check if error is a rate limit error */
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

// ===================== Throttle Utils =====================

/** Create an interval-based throttle for async operations */
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

// Global throttle for forfeit log fetching
export const forfeitLogThrottle = createIntervalThrottle(FORFEIT_LOG_MIN_INTERVAL_MS);

// ===================== Room ID Utils =====================

/** Normalize room ID to string */
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

// ===================== Address Utils =====================

/** Normalize forfeit address */
export function normalizeForfeitAddress(value: string | null | undefined): `0x${string}` | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(lower)) return null;
    if (lower === ZERO_ADDR.toLowerCase()) return null;
    return lower as `0x${string}`;
}

/** Normalize forfeit payout to bigint */
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

/** Format address to short display */
export function formatShortAddress(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return null;
    return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

// ===================== Forfeit Utils =====================

/** Extract forfeit record from log event */
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

/** Fetch latest forfeit log for a room */
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

    const DEFAULT_LOG_CHUNK = BigInt(90);
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
                    address: RPS_ADDRESS,
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

// ===================== Game Logic Utils =====================

/** Determine winner from reveal values */
export function getWinner(a: number, b: number): "A" | "B" | "Draw" | null {
    if (a === 0 && b === 0) return null;
    if (a === 0) return "B";
    if (b === 0) return "A";
    if (a === b) return "Draw";
    const aWins = (a === 1 && b === 3) || (a === 3 && b === 2) || (a === 2 && b === 1);
    return aWins ? "A" : "B";
}

// ===================== Formatting Utils =====================

/** Format number with thousand separators */
export function formatWholeWithThousands(whole: string) {
    const isNegative = whole.startsWith("-");
    const digits = isNegative ? whole.slice(1) : whole;
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return isNegative ? `-${formatted}` : formatted;
}

/** Normalize stake input by removing grouping */
export function normalizeStakeInput(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const withoutGrouping = trimmed.replace(/,/g, "");
    return withoutGrouping;
}

/** Format stake display from number */
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

/** Format stake display from string */
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

/** Parse stake value to number with fraction info */
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

/** Prepare stake string for contract call */
export function prepareStakeForContract(value: string) {
    const normalized = normalizeStakeInput(value);
    return normalized === "" ? "0" : normalized;
}

/** Format token amount with decimals */
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

/** Format token amount with sign */
export function formatTokenAmountSigned(value: bigint, decimals: number) {
    const negative = value < ZERO_BIGINT;
    const absolute = negative ? -value : value;
    const formatted = formatTokenAmount(absolute, decimals);
    if (formatted === "0") return formatted;
    return `${negative ? "-" : "+"}${formatted}`;
}

// ===================== Cache Utils =====================

/** Compare two room arrays for equality */
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

/** Serialize room for localStorage cache */
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

/** Revive room from localStorage cache */
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

/** Compare user stats for equality */
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

/** Serialize info for localStorage cache */
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

/** Revive info from localStorage cache */
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
