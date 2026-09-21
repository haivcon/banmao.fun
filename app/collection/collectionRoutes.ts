export function legacyCollectionPath(params: URLSearchParams): string | null {
    if (params.get("v") === "hub" || params.has("post") || params.has("profile")) {
        return `/collection/hub?${params.toString()}`;
    }
    if (["v", "img", "folder", "tab", "q", "sort", "page", "type", "cols"].some(key => params.has(key))) {
        return `/collection/gallery?${params.toString()}`;
    }
    return null;
}
