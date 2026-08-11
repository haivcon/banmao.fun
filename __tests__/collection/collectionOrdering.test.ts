import {
    appendCollectionBatch,
    collectionItemKey,
    sortCollectionItems,
    type CollectionOrderItem,
} from "../../app/collection/collectionOrdering";

function item(id: string, overrides: Partial<CollectionOrderItem> = {}): CollectionOrderItem {
    return {
        publicId: id,
        src: `https://example.com/${id}.png`,
        name: id,
        bytes: 100,
        createdAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    };
}

describe("collection ordering", () => {
    test("deduplicates overlapping API pages by Cloudinary public ID and keeps existing items in place", () => {
        const first = [item("a"), item("b")];
        const next = [item("b", { src: "https://example.com/b-updated.png" }), item("c")];

        const merged = appendCollectionBatch(first, next, "newest", 123);

        expect(merged.map(collectionItemKey)).toEqual(["a", "b", "c"]);
        expect(merged[1].src).toBe("https://example.com/b.png");
    });

    test("sorts only newly appended items so a later batch cannot move rendered cards", () => {
        const first = sortCollectionItems([
            item("older", { createdAt: "2025-01-01T00:00:00.000Z" }),
            item("newer", { createdAt: "2026-01-01T00:00:00.000Z" }),
        ], "newest", 123);

        const merged = appendCollectionBatch(first, [
            item("latest", { createdAt: "2027-01-01T00:00:00.000Z" }),
            item("middle", { createdAt: "2026-06-01T00:00:00.000Z" }),
        ], "newest", 123);

        expect(merged.map(collectionItemKey)).toEqual(["newer", "older", "latest", "middle"]);
    });

    test("uses stable identity tie-breakers for deterministic name and size sorting", () => {
        const sameName = [item("b", { name: "Cat" }), item("a", { name: "Cat" })];
        const sameSize = [item("d", { bytes: 200 }), item("c", { bytes: 200 })];

        expect(sortCollectionItems(sameName, "name", 1).map(collectionItemKey)).toEqual(["a", "b"]);
        expect(sortCollectionItems(sameSize, "size", 1).map(collectionItemKey)).toEqual(["c", "d"]);
    });

    test("produces a deterministic random order independent of input order", () => {
        const forward = [item("a"), item("b"), item("c"), item("d")];
        const backward = [...forward].reverse();

        expect(sortCollectionItems(forward, "random", 9876).map(collectionItemKey))
            .toEqual(sortCollectionItems(backward, "random", 9876).map(collectionItemKey));
    });
});
