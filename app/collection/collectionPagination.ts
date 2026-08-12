export interface CollectionPrefixRequest {
    requestedPage: number;
    pageSize: number;
    loaded: number;
    hasMore: boolean;
}

export const COLLECTION_PAGE_SIZE = 36;

export function shouldLoadCollectionPrefix({ requestedPage, pageSize, loaded, hasMore }: CollectionPrefixRequest): boolean {
    return hasMore && requestedPage > 0 && requestedPage * pageSize > loaded;
}

export function createCursorPageRequester<T>(fetchPage: (cursor: string | null) => Promise<T>) {
    const resolved = new Map<string, T>();
    const pending = new Map<string, Promise<T>>();
    return (cursor: string | null): Promise<T> => {
        const key = cursor || "__first__";
        const cached = resolved.get(key);
        if (cached) return Promise.resolve(cached);
        const inFlight = pending.get(key);
        if (inFlight) return inFlight;
        const request = fetchPage(cursor).then((data) => {
            resolved.set(key, data);
            return data;
        }).finally(() => pending.delete(key));
        pending.set(key, request);
        return request;
    };
}

export async function drainCollectionCursorPages<T>({
    fetchPage,
    getNextCursor,
    appendPage,
    isCurrent,
    initialCursor = null,
}: {
    fetchPage: (cursor: string | null) => Promise<T>;
    getNextCursor: (page: T) => string | null;
    appendPage: (page: T) => void;
    isCurrent: () => boolean;
    initialCursor?: string | null;
}) {
    let cursor = initialCursor;
    while (isCurrent()) {
        const page = await fetchPage(cursor);
        if (!isCurrent()) return { exhausted: false, stale: true, nextCursor: cursor };
        appendPage(page);
        cursor = getNextCursor(page);
        if (!cursor) return { exhausted: true, stale: false, nextCursor: null };
    }
    return { exhausted: false, stale: true, nextCursor: cursor };
}

export function collectionCountSummary({ total, loaded, matches, filtered }: {
    total: number;
    loaded: number;
    matches: number;
    filtered: boolean;
}) {
    return {
        primary: filtered ? matches : total,
        loaded,
        matches: filtered ? matches : loaded,
    };
}

export function collectionProviderSummary(pages: Array<{
    resources?: Array<{ bytes?: number }>;
    total_count?: number;
}>) {
    return {
        total: pages[0]?.total_count || 0,
        totalOriginalBytes: pages.reduce(
            (pageTotal, page) => pageTotal + (page.resources || []).reduce(
                (resourceTotal, resource) => resourceTotal + (resource.bytes || 0),
                0,
            ),
            0,
        ),
    };
}
