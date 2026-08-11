export type CollectionSort = "random" | "name" | "newest" | "size";

export interface CollectionOrderItem {
    publicId: string;
    src: string;
    name: string;
    bytes: number;
    createdAt?: string;
}

export function collectionItemKey(item: CollectionOrderItem): string {
    return item.publicId || item.src;
}

function compareIdentity(a: CollectionOrderItem, b: CollectionOrderItem): number {
    return collectionItemKey(a).localeCompare(collectionItemKey(b));
}

function seededRank(item: CollectionOrderItem, seed: number): number {
    let hash = (seed | 0) ^ 0x811c9dc5;
    for (const char of collectionItemKey(item)) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

export function sortCollectionItems<T extends CollectionOrderItem>(
    items: readonly T[],
    sortBy: CollectionSort,
    randomSeed: number,
): T[] {
    return [...items].sort((a, b) => {
        let result = 0;
        if (sortBy === "name") result = a.name.localeCompare(b.name);
        if (sortBy === "size") result = b.bytes - a.bytes;
        if (sortBy === "newest") result = (b.createdAt || "").localeCompare(a.createdAt || "");
        if (sortBy === "random") result = seededRank(a, randomSeed) - seededRank(b, randomSeed);
        return result || compareIdentity(a, b);
    });
}

export function appendCollectionBatch<T extends CollectionOrderItem>(
    existing: readonly T[],
    batch: readonly T[],
    sortBy: CollectionSort,
    randomSeed: number,
): T[] {
    const seen = new Set(existing.map(collectionItemKey));
    const uniqueBatch = batch.filter((item) => {
        const key = collectionItemKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    return [...existing, ...sortCollectionItems(uniqueBatch, sortBy, randomSeed)];
}
