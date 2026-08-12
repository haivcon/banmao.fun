import {
    COLLECTION_INVENTORY_CACHE_SCHEMA,
    createCollectionInventoryEntry,
    hydrateCollectionInventory,
    normalizeCollectionInventoryScope,
    persistCompleteCollectionInventory,
    pruneCollectionInventoryEntries,
    readCollectionInventory,
    sanitizeCollectionInventoryItems,
    writeCollectionInventory,
    type CollectionInventoryItem,
} from "../app/collection/collectionInventoryCache";

const item = (publicId: string, overrides: Partial<CollectionInventoryItem> = {}): CollectionInventoryItem => ({
    publicId,
    src: `https://res.cloudinary.com/demo/image/upload/${publicId}.png`,
    thumb: `https://res.cloudinary.com/demo/image/upload/thumb-${publicId}.png`,
    thumbSm: `https://res.cloudinary.com/demo/image/upload/small-${publicId}.png`,
    name: publicId,
    folder: "banmao/stickers",
    bytes: 10,
    type: "sticker",
    isVideo: false,
    ...overrides,
});

test("normalizes equivalent Collection scopes into one deterministic key", () => {
    expect(normalizeCollectionInventoryScope({ folder: " /BanMao// ", resourceTypes: ["video", "image", "video"] }))
        .toBe("folder=banmao;resources=image,video");
});

test("sanitizes ImageItem-compatible metadata without blobs, base64, functions, or unknown fields", () => {
    const sanitized = sanitizeCollectionInventoryItems([
        { ...item("image-a"), tags: ["cat", 3, "cat"], context: { caption: "hello", unsafe: 3 }, unknown: "drop" },
        item("video-a", { isVideo: true, duration: 2.5, width: 640, height: 480 }),
        item("bad-data", { src: "data:image/png;base64,AAAA" }),
        { ...item("image-a"), bytes: 999 },
    ]);
    expect(sanitized).toEqual([
        { ...item("image-a"), tags: ["cat"], context: { caption: "hello" } },
        item("video-a", { isVideo: true, duration: 2.5, width: 640, height: 480 }),
    ]);
    expect(JSON.stringify(sanitized)).not.toContain("base64");
    expect(JSON.stringify(sanitized)).not.toContain("unknown");
});

test("creates a complete versioned entry with a deterministic fingerprint", () => {
    const first = createCollectionInventoryEntry({ scopeKey: "folder=banmao;resources=image,video", total: 2, totalOriginalBytes: 20, items: [item("a"), item("b")], observedAt: 100 });
    const second = createCollectionInventoryEntry({ scopeKey: first.scopeKey, total: 2, totalOriginalBytes: 20, items: [item("a"), item("b")], observedAt: 200 });
    expect(first).toMatchObject({ schema: COLLECTION_INVENTORY_CACHE_SCHEMA, total: 2, totalOriginalBytes: 20, observedAt: 100 });
    expect(first.fingerprint).toBe(second.fingerprint);
});

test("rejects incomplete inventory so partial cursor results are never persisted", () => {
    expect(() => createCollectionInventoryEntry({ scopeKey: "scope", total: 2, totalOriginalBytes: 10, items: [item("a")], observedAt: 100 })).toThrow("complete inventory");
});

test("persists only an exhausted complete inventory from the current generation", async () => {
    const writes: string[] = [];
    const build = jest.fn(() => createCollectionInventoryEntry({ scopeKey: "scope", total: 1, totalOriginalBytes: 10, items: [item("complete")], observedAt: 100 }));
    const write = async (entry: { fingerprint: string }) => { writes.push(entry.fingerprint); return true; };

    await expect(persistCompleteCollectionInventory({ exhausted: false, isCurrent: () => true, entry: build, write })).resolves.toEqual({ entry: null, persisted: false });
    await expect(persistCompleteCollectionInventory({ exhausted: true, isCurrent: () => false, entry: build, write })).resolves.toEqual({ entry: null, persisted: false });
    expect(build).not.toHaveBeenCalled();
    expect(writes).toEqual([]);

    const complete = await persistCompleteCollectionInventory({ exhausted: true, isCurrent: () => true, entry: build, write });
    expect(complete.entry?.items.map(value => value.publicId)).toEqual(["complete"]);
    expect(complete.persisted).toBe(true);
    expect(writes).toHaveLength(1);
});

test("generation becoming stale after entry construction prevents the cache write", async () => {
    let checks = 0;
    const write = jest.fn(async () => true);
    const result = await persistCompleteCollectionInventory({
        exhausted: true,
        isCurrent: () => ++checks === 1,
        entry: () => createCollectionInventoryEntry({ scopeKey: "scope", total: 1, totalOriginalBytes: 10, items: [item("complete")], observedAt: 100 }),
        write,
    });
    expect(result).toEqual({ entry: null, persisted: false });
    expect(write).not.toHaveBeenCalled();
});

test("TTL and max-scope pruning evict deterministic oldest observations", () => {
    const entry = (scopeKey: string, observedAt: number) => createCollectionInventoryEntry({ scopeKey, total: 1, totalOriginalBytes: 10, items: [item(scopeKey)], observedAt });
    expect(pruneCollectionInventoryEntries([entry("expired", 1), entry("old", 80), entry("same-b", 90), entry("same-a", 90)], { now: 100, ttlMs: 50, maxScopes: 2 }).map(value => value.scopeKey))
        .toEqual(["same-a", "same-b"]);
});

test("cached-first hydration exposes complete metadata before background refresh", async () => {
    const cached = createCollectionInventoryEntry({ scopeKey: "scope", total: 2, totalOriginalBytes: 20, items: [item("a"), item("b")], observedAt: 100 });
    const events: string[] = [];
    const result = await hydrateCollectionInventory({
        read: async () => cached,
        showCached: value => events.push(`cache:${value.items.length}`),
        refresh: async () => { events.push("refresh"); return null; },
        now: 100,
    });
    expect(events).toEqual(["cache:2", "refresh"]);
    expect(result).toEqual({ cached: true, refreshed: false, failed: false });
});

test("failed or stale background refresh retains cached visible inventory", async () => {
    const cached = createCollectionInventoryEntry({ scopeKey: "scope", total: 1, totalOriginalBytes: 10, items: [item("cached")], observedAt: 100 });
    const visible: string[][] = [];
    const result = await hydrateCollectionInventory({
        read: async () => cached,
        showCached: value => visible.push(value.items.map(item => item.publicId)),
        refresh: async () => { throw new Error("offline"); },
        now: 100,
    });
    expect(result).toEqual({ cached: true, refreshed: false, failed: true });
    expect(visible).toEqual([["cached"]]);
});

test("IndexedDB unavailable/private-mode failures degrade to a no-cache fallback", async () => {
    await expect(readCollectionInventory("scope", { indexedDB: undefined })).resolves.toBeNull();
    const entry = createCollectionInventoryEntry({ scopeKey: "scope", total: 1, totalOriginalBytes: 10, items: [item("a")], observedAt: 100 });
    await expect(writeCollectionInventory(entry, { indexedDB: undefined })).resolves.toBe(false);
    const throwingFactory = { open() { throw new Error("private mode"); } } as unknown as IDBFactory;
    await expect(readCollectionInventory("scope", { indexedDB: throwingFactory })).resolves.toBeNull();
    await expect(writeCollectionInventory(entry, { indexedDB: throwingFactory })).resolves.toBe(false);
});

test("schema mismatch and expired records are ignored", async () => {
    const invalid = { ...createCollectionInventoryEntry({ scopeKey: "scope", total: 1, totalOriginalBytes: 10, items: [item("a")], observedAt: 1 }), schema: 999 };
    const result = await hydrateCollectionInventory({
        read: async () => invalid as never,
        showCached: () => { throw new Error("must not hydrate"); },
        refresh: async () => null,
        now: 100,
        ttlMs: 50,
    });
    expect(result.cached).toBe(false);
});

test("future observations and fingerprint-tampered records are ignored", async () => {
    const valid = createCollectionInventoryEntry({ scopeKey: "scope", total: 1, totalOriginalBytes: 10, items: [item("a")], observedAt: 100 });
    for (const invalid of [{ ...valid, observedAt: 101 }, { ...valid, fingerprint: "tampered" }]) {
        const result = await hydrateCollectionInventory({
            read: async () => invalid,
            showCached: () => { throw new Error("must not hydrate"); },
            refresh: async () => null,
            now: 100,
        });
        expect(result.cached).toBe(false);
    }
});

test("all six Collection locales include cache hydration and sync status parity", async () => {
    const locales = await Promise.all(["en", "vi", "zh", "ko", "ru", "id"].map(code => import(`../app/collection/i18n/${code}`)));
    const keys = ["collectionCached", "collectionSyncing", "collectionSyncFailed"];
    for (const locale of locales) for (const key of keys) expect(locale.default[key]).toEqual(expect.any(String));
});
