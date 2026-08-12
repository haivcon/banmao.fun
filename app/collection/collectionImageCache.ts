export const COLLECTION_IMAGE_CACHE_NAME = "banmao-collection-opened-v1";
export const COLLECTION_IMAGE_CACHE_MAX_ITEMS = 24;
export const COLLECTION_IMAGE_CACHE_MAX_BYTES = 96 * 1024 * 1024;
export const COLLECTION_IMAGE_CACHE_MAX_ITEM_BYTES = 16 * 1024 * 1024;

const CACHE_KEY_BASE = "https://banmao.collection-cache.invalid/v1/";
const OPENED_AT_HEADER = "x-banmao-opened-at";
const SIZE_HEADER = "x-banmao-image-bytes";

export function cacheKeyForCollectionImage(publicId: string): string {
    return `${CACHE_KEY_BASE}${encodeURIComponent(publicId)}`;
}

interface LoadOpenedCollectionImageOptions {
    publicId: string;
    sourceUrl: string;
    cacheStorage?: CacheStorage;
    fetchImpl?: typeof fetch;
    createObjectURL?: (blob: Blob) => string;
    now?: () => number;
    maxItems?: number;
    maxBytes?: number;
    maxItemBytes?: number;
}

export interface OpenedCollectionImageResult {
    url: string;
    source: "cache" | "network" | "fallback";
    persisted: boolean;
}

async function responseSize(response: Response): Promise<number> {
    const declared = Number(response.headers.get(SIZE_HEADER) || response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared >= 0) return declared;
    return (await response.clone().blob()).size;
}

async function enforceBounds(cache: Cache, maxItems: number, maxBytes: number): Promise<void> {
    const entries = await Promise.all((await cache.keys()).map(async request => {
        const response = await cache.match(request);
        return {
            request,
            openedAt: Number(response?.headers.get(OPENED_AT_HEADER)) || 0,
            bytes: response ? await responseSize(response) : 0,
        };
    }));
    entries.sort((left, right) => left.openedAt - right.openedAt || left.request.url.localeCompare(right.request.url));
    let bytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
    while (entries.length > maxItems || bytes > maxBytes) {
        const oldest = entries.shift();
        if (!oldest) break;
        await cache.delete(oldest.request);
        bytes -= oldest.bytes;
    }
}

export async function loadOpenedCollectionImage({
    publicId,
    sourceUrl,
    cacheStorage = typeof caches === "undefined" ? undefined : caches,
    fetchImpl = fetch,
    createObjectURL = URL.createObjectURL.bind(URL),
    now = Date.now,
    maxItems = COLLECTION_IMAGE_CACHE_MAX_ITEMS,
    maxBytes = COLLECTION_IMAGE_CACHE_MAX_BYTES,
    maxItemBytes = COLLECTION_IMAGE_CACHE_MAX_ITEM_BYTES,
}: LoadOpenedCollectionImageOptions): Promise<OpenedCollectionImageResult> {
    const key = cacheKeyForCollectionImage(publicId);
    try {
        const cache = cacheStorage ? await cacheStorage.open(COLLECTION_IMAGE_CACHE_NAME) : null;
        const cached = await cache?.match(key);
        if (cached) {
            return { url: createObjectURL(await cached.blob()), source: "cache", persisted: true };
        }

        const response = await fetchImpl(sourceUrl, { mode: "cors", credentials: "omit" });
        if (!response.ok || response.type === "opaque") throw new Error("Image response is not cacheable");
        const blob = await response.clone().blob();
        const url = createObjectURL(blob);
        if (!cache || blob.size > maxItemBytes || blob.size > maxBytes) {
            return { url, source: "network", persisted: false };
        }

        const headers = new Headers(response.headers);
        headers.set(OPENED_AT_HEADER, String(now()));
        headers.set(SIZE_HEADER, String(blob.size));
        await cache.put(key, new Response(blob, { status: 200, headers }));
        await enforceBounds(cache, maxItems, maxBytes);
        return { url, source: "network", persisted: true };
    } catch {
        return { url: sourceUrl, source: "fallback", persisted: false };
    }
}
