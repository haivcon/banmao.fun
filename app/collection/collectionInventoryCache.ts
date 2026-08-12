export const COLLECTION_INVENTORY_CACHE_SCHEMA = 1;
export const COLLECTION_INVENTORY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const COLLECTION_INVENTORY_CACHE_MAX_SCOPES = 4;

const DB_NAME = "banmao-collection-inventory";
const DB_VERSION = 1;
const STORE_NAME = "inventories";

export interface CollectionInventoryItem {
    publicId: string;
    src: string;
    thumb: string;
    thumbSm: string;
    name: string;
    folder: string;
    bytes: number;
    createdAt?: string;
    type: "sticker" | "background";
    isVideo: boolean;
    duration?: number;
    width?: number;
    height?: number;
    tags?: string[];
    context?: Record<string, string>;
}

export interface CollectionInventoryEntry {
    scopeKey: string;
    schema: number;
    fingerprint: string;
    observedAt: number;
    total: number;
    totalOriginalBytes: number;
    items: CollectionInventoryItem[];
}

interface CacheEnvironment {
    indexedDB?: IDBFactory;
}

function finiteNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function safeHttpUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:" ? value : null;
    } catch {
        return null;
    }
}

export function normalizeCollectionInventoryScope({ folder, resourceTypes }: { folder: string; resourceTypes: string[] }): string {
    const normalizedFolder = folder.trim().replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/").toLowerCase();
    const normalizedTypes = [...new Set(resourceTypes.map(value => value.trim().toLowerCase()).filter(Boolean))].sort();
    return `folder=${normalizedFolder};resources=${normalizedTypes.join(",")}`;
}

export function sanitizeCollectionInventoryItems(values: unknown[]): CollectionInventoryItem[] {
    const result: CollectionInventoryItem[] = [];
    const seen = new Set<string>();
    for (const value of values) {
        if (!value || typeof value !== "object") continue;
        const candidate = value as Record<string, unknown>;
        const publicId = typeof candidate.publicId === "string" ? candidate.publicId.trim() : "";
        const src = safeHttpUrl(candidate.src);
        const thumb = safeHttpUrl(candidate.thumb);
        const thumbSm = safeHttpUrl(candidate.thumbSm);
        const name = typeof candidate.name === "string" ? candidate.name : null;
        const folder = typeof candidate.folder === "string" ? candidate.folder : null;
        const bytes = finiteNumber(candidate.bytes);
        const type = candidate.type === "sticker" || candidate.type === "background" ? candidate.type : null;
        if (!publicId || seen.has(publicId) || !src || !thumb || !thumbSm || name === null || folder === null || bytes === undefined || !type || typeof candidate.isVideo !== "boolean") continue;
        const item: CollectionInventoryItem = { publicId, src, thumb, thumbSm, name, folder, bytes, type, isVideo: candidate.isVideo };
        if (typeof candidate.createdAt === "string") item.createdAt = candidate.createdAt;
        const duration = finiteNumber(candidate.duration);
        const width = finiteNumber(candidate.width);
        const height = finiteNumber(candidate.height);
        if (duration !== undefined) item.duration = duration;
        if (width !== undefined) item.width = width;
        if (height !== undefined) item.height = height;
        if (Array.isArray(candidate.tags)) item.tags = [...new Set(candidate.tags.filter((tag): tag is string => typeof tag === "string"))];
        if (candidate.context && typeof candidate.context === "object" && !Array.isArray(candidate.context)) {
            item.context = Object.fromEntries(Object.entries(candidate.context as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
        }
        seen.add(publicId);
        result.push(item);
    }
    return result;
}

function fingerprintInventory(total: number, totalOriginalBytes: number, items: CollectionInventoryItem[]): string {
    const input = JSON.stringify([total, totalOriginalBytes, items]);
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createCollectionInventoryEntry({ scopeKey, total, totalOriginalBytes, items, observedAt = Date.now() }: {
    scopeKey: string;
    total: number;
    totalOriginalBytes: number;
    items: unknown[];
    observedAt?: number;
}): CollectionInventoryEntry {
    const sanitized = sanitizeCollectionInventoryItems(items);
    if (!scopeKey || !Number.isInteger(total) || total < 0 || sanitized.length !== total) throw new Error("Collection cache requires a complete inventory");
    const bytes = finiteNumber(totalOriginalBytes);
    if (bytes === undefined) throw new Error("Collection cache requires total original bytes");
    return {
        scopeKey,
        schema: COLLECTION_INVENTORY_CACHE_SCHEMA,
        fingerprint: fingerprintInventory(total, bytes, sanitized),
        observedAt,
        total,
        totalOriginalBytes: bytes,
        items: sanitized,
    };
}

export function isUsableCollectionInventory(entry: CollectionInventoryEntry | null, now = Date.now(), ttlMs = COLLECTION_INVENTORY_CACHE_TTL_MS): entry is CollectionInventoryEntry {
    if (!entry
        || typeof entry.scopeKey !== "string"
        || !entry.scopeKey
        || entry.schema !== COLLECTION_INVENTORY_CACHE_SCHEMA
        || !Number.isFinite(entry.observedAt)
        || entry.observedAt > now
        || now - entry.observedAt > ttlMs
        || !Number.isInteger(entry.total)
        || entry.total < 0
        || finiteNumber(entry.totalOriginalBytes) === undefined
        || !Array.isArray(entry.items)
        || entry.total !== entry.items.length) return false;
    const sanitized = sanitizeCollectionInventoryItems(entry.items);
    return sanitized.length === entry.items.length
        && entry.fingerprint === fingerprintInventory(entry.total, entry.totalOriginalBytes, sanitized);
}

export function pruneCollectionInventoryEntries(entries: CollectionInventoryEntry[], { now = Date.now(), ttlMs = COLLECTION_INVENTORY_CACHE_TTL_MS, maxScopes = COLLECTION_INVENTORY_CACHE_MAX_SCOPES } = {}): CollectionInventoryEntry[] {
    return entries
        .filter(entry => isUsableCollectionInventory(entry, now, ttlMs))
        .sort((left, right) => right.observedAt - left.observedAt || left.scopeKey.localeCompare(right.scopeKey))
        .slice(0, maxScopes)
        .sort((left, right) => left.scopeKey.localeCompare(right.scopeKey));
}

function openCache(factory: IDBFactory): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        let request: IDBOpenDBRequest;
        try { request = factory.open(DB_NAME, DB_VERSION); } catch (error) { reject(error); return; }
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "scopeKey" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Collection cache unavailable"));
        request.onblocked = () => reject(new Error("Collection cache blocked"));
    });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Collection cache request failed"));
    });
}

function environmentFactory(environment?: CacheEnvironment): IDBFactory | undefined {
    if (environment) return environment.indexedDB;
    return typeof indexedDB === "undefined" ? undefined : indexedDB;
}

export async function readCollectionInventory(scopeKey: string, environment?: CacheEnvironment): Promise<CollectionInventoryEntry | null> {
    const factory = environmentFactory(environment);
    if (!factory) return null;
    let database: IDBDatabase | null = null;
    try {
        database = await openCache(factory);
        const entry = await requestResult(database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(scopeKey)) as CollectionInventoryEntry | undefined;
        return isUsableCollectionInventory(entry || null) ? entry : null;
    } catch {
        return null;
    } finally {
        database?.close();
    }
}

export async function writeCollectionInventory(entry: CollectionInventoryEntry, environment?: CacheEnvironment): Promise<boolean> {
    const factory = environmentFactory(environment);
    if (!factory || !isUsableCollectionInventory(entry)) return false;
    let database: IDBDatabase | null = null;
    try {
        database = await openCache(factory);
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const existing = await requestResult(store.getAll()) as CollectionInventoryEntry[];
        const retained = pruneCollectionInventoryEntries([...existing.filter(value => value.scopeKey !== entry.scopeKey), entry]);
        const keep = new Set(retained.map(value => value.scopeKey));
        for (const value of existing) if (!keep.has(value.scopeKey)) store.delete(value.scopeKey);
        for (const value of retained) store.put(value);
        await new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error || new Error("Collection cache transaction failed"));
            transaction.onabort = () => reject(transaction.error || new Error("Collection cache transaction aborted"));
        });
        return true;
    } catch {
        return false;
    } finally {
        database?.close();
    }
}

export async function persistCompleteCollectionInventory({ exhausted, isCurrent, entry, write = writeCollectionInventory }: {
    exhausted: boolean;
    isCurrent: () => boolean;
    entry: () => CollectionInventoryEntry;
    write?: (value: CollectionInventoryEntry) => Promise<boolean>;
}): Promise<{ entry: CollectionInventoryEntry | null; persisted: boolean }> {
    if (!exhausted || !isCurrent()) return { entry: null, persisted: false };
    const complete = entry();
    if (!isCurrent()) return { entry: null, persisted: false };
    const persisted = await write(complete);
    if (!isCurrent()) return { entry: null, persisted };
    return { entry: complete, persisted };
}

export async function hydrateCollectionInventory({ read, showCached, refresh, showRefreshed, now = Date.now(), ttlMs = COLLECTION_INVENTORY_CACHE_TTL_MS }: {
    read: () => Promise<CollectionInventoryEntry | null>;
    showCached: (entry: CollectionInventoryEntry) => void;
    refresh: () => Promise<CollectionInventoryEntry | null>;
    showRefreshed?: (entry: CollectionInventoryEntry) => void;
    now?: number;
    ttlMs?: number;
}): Promise<{ cached: boolean; refreshed: boolean; failed: boolean }> {
    let cached = false;
    try {
        const entry = await read();
        if (isUsableCollectionInventory(entry, now, ttlMs)) {
            showCached(entry);
            cached = true;
        }
    } catch { /* cache fallback */ }
    try {
        const refreshed = await refresh();
        if (refreshed && isUsableCollectionInventory(refreshed)) {
            showRefreshed?.(refreshed);
            return { cached, refreshed: true, failed: false };
        }
        return { cached, refreshed: false, failed: false };
    } catch {
        return { cached, refreshed: false, failed: true };
    }
}
