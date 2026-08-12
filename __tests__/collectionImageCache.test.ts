import {
    COLLECTION_IMAGE_CACHE_NAME,
    cacheKeyForCollectionImage,
    loadOpenedCollectionImage,
} from "../app/collection/collectionImageCache";

class MemoryCache {
    entries = new Map<string, Response>();
    private key(request: RequestInfo | URL) { return request instanceof Request ? request.url : String(request); }
    async match(request: RequestInfo | URL) { return this.entries.get(this.key(request))?.clone(); }
    async put(request: RequestInfo | URL, response: Response) { this.entries.set(this.key(request), response.clone()); }
    async delete(request: RequestInfo | URL) { return this.entries.delete(this.key(request)); }
    async keys() { return [...this.entries.keys()].map(key => new Request(key)); }
}

const cacheStorage = (cache: MemoryCache) => ({
    open: jest.fn(async (name: string) => {
        expect(name).toBe(COLLECTION_IMAGE_CACHE_NAME);
        return cache as unknown as Cache;
    }),
}) as unknown as CacheStorage;

const response = (body: string) => new Response(body, {
    status: 200,
    headers: { "content-type": "image/png", "content-length": String(body.length) },
});

test("only an explicitly opened high-quality image enters the versioned cache and repeat open is a hit", async () => {
    const cache = new MemoryCache();
    const fetchImpl = jest.fn(async () => response("original-image"));
    const createObjectURL = jest.fn(() => "blob:opened");
    const options = { cacheStorage: cacheStorage(cache), fetchImpl, createObjectURL, now: () => 100 };

    expect(cache.entries.size).toBe(0);
    await expect(loadOpenedCollectionImage({ publicId: "banmao/cat", sourceUrl: "https://cdn.example/cat.png", ...options }))
        .resolves.toMatchObject({ url: "blob:opened", source: "network", persisted: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect([...cache.entries.keys()]).toEqual([cacheKeyForCollectionImage("banmao/cat")]);

    await expect(loadOpenedCollectionImage({ publicId: "banmao/cat", sourceUrl: "https://cdn.example/cat.png", ...options }))
        .resolves.toMatchObject({ source: "cache", persisted: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test("cache bounds evict oldest opened items deterministically", async () => {
    const cache = new MemoryCache();
    const storage = cacheStorage(cache);
    for (let index = 0; index < 3; index++) {
        await loadOpenedCollectionImage({
            publicId: `item-${index}`,
            sourceUrl: `https://cdn.example/${index}.png`,
            cacheStorage: storage,
            fetchImpl: async () => response("12345"),
            createObjectURL: () => `blob:${index}`,
            now: () => index + 1,
            maxItems: 2,
            maxBytes: 100,
        });
    }
    expect([...cache.entries.keys()]).toEqual([
        cacheKeyForCollectionImage("item-1"),
        cacheKeyForCollectionImage("item-2"),
    ]);
});

test("oversized and unavailable Cache Storage fall back without claiming persistence", async () => {
    const fetchImpl = jest.fn(async () => response("too-large"));
    await expect(loadOpenedCollectionImage({
        publicId: "large",
        sourceUrl: "https://cdn.example/large.png",
        cacheStorage: cacheStorage(new MemoryCache()),
        fetchImpl,
        createObjectURL: () => "blob:large",
        maxItemBytes: 2,
    })).resolves.toMatchObject({ source: "network", persisted: false });

    await expect(loadOpenedCollectionImage({
        publicId: "private",
        sourceUrl: "https://cdn.example/private.png",
        cacheStorage: undefined,
        fetchImpl: jest.fn(async () => { throw new Error("CORS"); }),
        createObjectURL: () => "unused",
    })).resolves.toEqual({ url: "https://cdn.example/private.png", source: "fallback", persisted: false });
});
