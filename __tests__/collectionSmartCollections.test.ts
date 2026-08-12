import {
    filterSmartCollection,
    SMART_COLLECTION_IDS,
    type SmartCollectionItem,
} from "../app/collection/smartCollections";

const items: SmartCollectionItem[] = [
    { publicId: "old", name: "Old", createdAt: "2024-01-01T00:00:00Z", isVideo: false },
    { publicId: "new", name: "New", createdAt: "2026-01-01T00:00:00Z", isVideo: false },
    { publicId: "popular", name: "Popular", createdAt: "2025-01-01T00:00:00Z", isVideo: true },
];
const counts = { Old: 1, New: 2, Popular: 5 };

describe("Collection smart collections", () => {
    it("exposes every smart collection identifier", () => {
        expect(SMART_COLLECTION_IDS).toEqual(["recently-added", "most-downloaded", "popular"]);
    });

    it("sorts recently added items newest first", () => {
        expect(filterSmartCollection(items, "recently-added", counts).map(item => item.publicId))
            .toEqual(["new", "popular", "old"]);
    });

    it("sorts most downloaded items by descending count", () => {
        expect(filterSmartCollection(items, "most-downloaded", counts).map(item => item.publicId))
            .toEqual(["popular", "new", "old"]);
    });

    it("includes only items with at least three downloads in popular", () => {
        expect(filterSmartCollection(items, "popular", counts).map(item => item.publicId))
            .toEqual(["popular"]);
    });
});
