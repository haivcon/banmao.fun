export const SMART_COLLECTION_IDS = ["recently-added", "most-downloaded", "popular"] as const;

export type SmartCollectionId = (typeof SMART_COLLECTION_IDS)[number];

export type SmartCollectionItem = {
    publicId: string;
    name: string;
    createdAt?: string;
    isVideo?: boolean;
};

export function isSmartCollection(value: string): value is SmartCollectionId {
    return (SMART_COLLECTION_IDS as readonly string[]).includes(value);
}

export function filterSmartCollection<T extends SmartCollectionItem>(
    items: readonly T[],
    collection: SmartCollectionId,
    downloadCounts: Readonly<Record<string, number>>,
): T[] {
    const stableId = (item: T) => item.publicId || item.name;
    if (collection === "popular") {
        return items
            .filter(item => (downloadCounts[item.name] || 0) >= 3)
            .sort((a, b) => (downloadCounts[b.name] || 0) - (downloadCounts[a.name] || 0)
                || stableId(a).localeCompare(stableId(b)))
            .slice(0, 50);
    }
    if (collection === "most-downloaded") {
        return [...items]
            .sort((a, b) => (downloadCounts[b.name] || 0) - (downloadCounts[a.name] || 0)
                || stableId(a).localeCompare(stableId(b)))
            .slice(0, 50);
    }
    return [...items]
        .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || "")
            || stableId(a).localeCompare(stableId(b)))
        .slice(0, 50);
}
