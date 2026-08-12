export interface CollectionPrefixRequest {
    requestedPage: number;
    pageSize: number;
    loaded: number;
    hasMore: boolean;
}

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
