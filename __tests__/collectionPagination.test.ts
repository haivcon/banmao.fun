import {
    COLLECTION_PAGE_SIZE,
    collectionCountSummary,
    collectionProviderSummary,
    createCursorPageRequester,
    drainCollectionCursorPages,
    shouldLoadCollectionPrefix,
} from "../app/collection/collectionPagination";
import { appendCollectionBatch, sortCollectionItems } from "../app/collection/collectionOrdering";

type Item = { publicId: string; src: string; name: string; bytes: number; createdAt?: string };
type Page = { images: Item[]; total: number; nextCursor: string | null };

const item = (publicId: string, name = publicId, bytes = 1, createdAt = "2026-01-01") => ({
    publicId, src: `https://example.com/${publicId}`, name, bytes, createdAt,
});

test("three cursor pages append without duplicate public IDs and preserve provider total", () => {
    const pages = [
        { images: [item("a"), item("b")], total: 5, nextCursor: "c2" },
        { images: [item("b"), item("c")], total: 5, nextCursor: "c3" },
        { images: [item("d"), item("e")], total: 5, nextCursor: null },
    ];
    let inventory: Item[] = [];
    for (const page of pages) inventory = appendCollectionBatch(inventory, page.images, "name", 1);
    expect(inventory.map(value => value.publicId)).toEqual(["a", "b", "c", "d", "e"]);
    expect(new Set(inventory.map(value => value.publicId)).size).toBe(5);
    expect(pages.at(-1)?.total).toBe(5);
});

test("a requested page beyond the loaded prefix keeps requesting bounded pages", () => {
    expect(COLLECTION_PAGE_SIZE).toBe(36);
    expect(shouldLoadCollectionPrefix({ requestedPage: 4, pageSize: COLLECTION_PAGE_SIZE, loaded: 36, hasMore: true })).toBe(true);
    expect(shouldLoadCollectionPrefix({ requestedPage: 4, pageSize: COLLECTION_PAGE_SIZE, loaded: 108, hasMore: true })).toBe(true);
    expect(shouldLoadCollectionPrefix({ requestedPage: 4, pageSize: COLLECTION_PAGE_SIZE, loaded: 144, hasMore: true })).toBe(false);
    expect(shouldLoadCollectionPrefix({ requestedPage: 4, pageSize: COLLECTION_PAGE_SIZE, loaded: 108, hasMore: false })).toBe(false);
});

test("cursor requester shares an in-flight prefetch and does not request a page twice", async () => {
    let release!: (page: Page) => void;
    const fetchPage = jest.fn(() => new Promise<Page>(resolve => { release = resolve; }));
    const requester = createCursorPageRequester(fetchPage);
    const prefetched = requester("cursor-2");
    const requested = requester("cursor-2");
    expect(fetchPage).toHaveBeenCalledTimes(1);
    release({ images: [item("c")], total: 3, nextCursor: null });
    await expect(Promise.all([prefetched, requested])).resolves.toHaveLength(2);
    await requester("cursor-2");
    expect(fetchPage).toHaveBeenCalledTimes(1);
});

test("a failed cursor remains retryable and successful retries are cached", async () => {
    const fetchPage = jest.fn()
        .mockRejectedValueOnce(new Error("temporary"))
        .mockResolvedValueOnce({ images: [item("c")], total: 3, nextCursor: null });
    const requester = createCursorPageRequester(fetchPage);
    await expect(requester("cursor-2")).rejects.toThrow("temporary");
    await expect(requester("cursor-2")).resolves.toMatchObject({ nextCursor: null });
    await requester("cursor-2");
    expect(fetchPage).toHaveBeenCalledTimes(2);
});

test("automatic cursor drain exhausts three pages without a user trigger", async () => {
    const pages = new Map<string, Page>([
        ["__first__", { images: [item("a"), item("b")], total: 5, nextCursor: "c2" }],
        ["c2", { images: [item("b"), item("c")], total: 5, nextCursor: "c3" }],
        ["c3", { images: [item("d"), item("e")], total: 5, nextCursor: null }],
    ]);
    const fetchPage = jest.fn(async (cursor: string | null) => pages.get(cursor || "__first__")!);
    let inventory: Item[] = [];
    const result = await drainCollectionCursorPages({
        fetchPage,
        getNextCursor: page => page.nextCursor,
        appendPage: page => { inventory = appendCollectionBatch(inventory, page.images, "name", 1); },
        isCurrent: () => true,
    });
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([null, "c2", "c3"]);
    expect(inventory.map(value => value.publicId)).toEqual(["a", "b", "c", "d", "e"]);
    expect(result).toEqual({ exhausted: true, stale: false, nextCursor: null });
    expect(inventory).toHaveLength(pages.get("__first__")!.total);
});

test("automatic cursor drain ignores a stale generation response after an earlier page appended", async () => {
    let current = true;
    let releaseSecond!: (page: Page) => void;
    let markSecondStarted!: () => void;
    const secondStarted = new Promise<void>(resolve => { markSecondStarted = resolve; });
    const appendPage = jest.fn();
    const fetchPage = jest.fn((cursor: string | null) => {
        if (cursor === null) return Promise.resolve({ images: [item("old-a")], total: 2, nextCursor: "old-c2" });
        markSecondStarted();
        return new Promise<Page>(resolve => { releaseSecond = resolve; });
    });
    const draining = drainCollectionCursorPages({ fetchPage, getNextCursor: page => page.nextCursor, appendPage, isCurrent: () => current });
    await secondStarted;
    current = false;
    releaseSecond({ images: [item("old-b")], total: 2, nextCursor: null });
    expect(await draining).toEqual({ exhausted: false, stale: true, nextCursor: "old-c2" });
    expect(appendPage).toHaveBeenCalledTimes(1);
});

test("failed automatic cursor drain can retry the same cursor to completion", async () => {
    const fetchPage = jest.fn()
        .mockResolvedValueOnce({ images: [item("a")], total: 2, nextCursor: "c2" })
        .mockRejectedValueOnce(new Error("temporary"))
        .mockResolvedValueOnce({ images: [item("b")], total: 2, nextCursor: null });
    let inventory: Item[] = [];
    const options = {
        fetchPage,
        getNextCursor: (page: Page) => page.nextCursor,
        appendPage: (page: Page) => { inventory = appendCollectionBatch(inventory, page.images, "name", 1); },
        isCurrent: () => true,
    };
    await expect(drainCollectionCursorPages(options)).rejects.toThrow("temporary");
    await expect(drainCollectionCursorPages({ ...options, initialCursor: "c2" }))
        .resolves.toEqual({ exhausted: true, stale: false, nextCursor: null });
    expect(inventory.map(value => value.publicId)).toEqual(["a", "b"]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
});

test("deterministic sorts use publicId as a tie-breaker after append", () => {
    const values = [item("z", "same", 4), item("a", "same", 4), item("m", "same", 4)];
    expect(sortCollectionItems(values, "name", 7).map(value => value.publicId)).toEqual(["a", "m", "z"]);
    expect(sortCollectionItems(values, "size", 7).map(value => value.publicId)).toEqual(["a", "m", "z"]);
    expect(sortCollectionItems(values, "newest", 7).map(value => value.publicId)).toEqual(["a", "m", "z"]);
});

test("count summary distinguishes provider total, loaded inventory and loaded matches", () => {
    expect(collectionCountSummary({ total: 3869, loaded: 144, matches: 12, filtered: false }))
        .toEqual({ primary: 3869, loaded: 144, matches: 144 });
    expect(collectionCountSummary({ total: 3869, loaded: 144, matches: 12, filtered: true }))
        .toEqual({ primary: 12, loaded: 144, matches: 12 });
});

test("provider summary keeps complete original bytes independent from the loaded page", () => {
    const loadedPage = { resources: [{ bytes: 10 }, { bytes: 20 }], total_count: 5 };
    const providerPages = [
        loadedPage,
        { resources: [{ bytes: 30 }, { bytes: 40 }], total_count: 5 },
        { resources: [{ bytes: 50 }], total_count: 5 },
    ];
    expect(loadedPage.resources.reduce((sum, value) => sum + value.bytes, 0)).toBe(30);
    expect(collectionProviderSummary(providerPages)).toEqual({ total: 5, totalOriginalBytes: 150 });
});

test("infinite prefix loading reaches deterministic cursor exhaustion", () => {
    let loaded = 0;
    let hasMore = true;
    const pageSizes = [36, 36, 13];
    let requests = 0;
    while (shouldLoadCollectionPrefix({ requestedPage: requests + 1, pageSize: COLLECTION_PAGE_SIZE, loaded, hasMore })) {
        loaded += pageSizes[requests++];
        hasMore = requests < pageSizes.length;
    }
    expect({ loaded, hasMore, requests }).toEqual({ loaded: 85, hasMore: false, requests: 3 });
});

test("all six Collection locales have parity for provider and pagination status keys", async () => {
    const locales = await Promise.all(["en", "vi", "zh", "ko", "ru", "id"].map(code => import(`../app/collection/i18n/${code}`)));
    const keys = ["providerImages", "providerOriginalSize", "networkLoadedNote", "imageCacheReady", "imageCacheFallback", "loadedOfTotal", "loadMoreCollection", "loadingMore", "loadingCompleteCollection", "loadCollectionFailed", "retryCollection", "collectionEnd"];
    for (const locale of locales) for (const key of keys) expect(locale.default[key]).toEqual(expect.any(String));
});
