import {
    COLLECTION_PAGE_SIZE,
    collectionCountSummary,
    createCursorPageRequester,
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

test("all six Collection locales have parity for pagination status keys", async () => {
    const locales = await Promise.all(["en", "vi", "zh", "ko", "ru", "id"].map(code => import(`../app/collection/i18n/${code}`)));
    const keys = ["loadedOfTotal", "loadMoreCollection", "loadingMore", "loadCollectionFailed", "retryCollection", "collectionEnd"];
    for (const locale of locales) for (const key of keys) expect(locale.default[key]).toEqual(expect.any(String));
});
