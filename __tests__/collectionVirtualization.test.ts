import {
    COLLECTION_VIRTUAL_MAX_ITEMS,
    calculateCollectionRowHeight,
    calculateCollectionVirtualWindow,
    sliceCollectionVirtualWindow,
} from "../app/collection/collectionVirtualization";

const ids = Array.from({ length: 3893 }, (_, index) => ({ publicId: `media-${index}` }));

const windowFor = (overrides: Partial<Parameters<typeof calculateCollectionVirtualWindow>[0]> = {}) => calculateCollectionVirtualWindow({
    itemCount: ids.length,
    columns: 5,
    rowHeight: calculateCollectionRowHeight(1160, 5),
    viewportHeight: 900,
    scrollTop: 0,
    gridTop: 400,
    overscanRows: 4,
    ...overrides,
});

test("desktop and mobile windows reserve fixed grid geometry and stay bounded", () => {
    const desktop = windowFor();
    const mobileRowHeight = calculateCollectionRowHeight(360, 3);
    const mobile = windowFor({ columns: 3, rowHeight: mobileRowHeight, viewportHeight: 780 });

    expect(desktop.rowHeight).toBeCloseTo(274.2);
    expect(mobileRowHeight).toBeCloseTo(156.67, 1);
    expect(desktop.endIndex - desktop.startIndex).toBeLessThanOrEqual(COLLECTION_VIRTUAL_MAX_ITEMS);
    expect(mobile.endIndex - mobile.startIndex).toBeLessThanOrEqual(COLLECTION_VIRTUAL_MAX_ITEMS);
    expect(desktop.startIndex % 5).toBe(0);
    expect(mobile.startIndex % 3).toBe(0);
});

test("top, middle, and end windows make the complete inventory reachable", () => {
    const top = windowFor();
    const middle = windowFor({ scrollTop: 100_000 });
    const end = windowFor({ scrollTop: 1_000_000 });

    expect(top).toMatchObject({ startIndex: 0, topSpacerHeight: 0 });
    expect(middle.startIndex).toBeGreaterThan(0);
    expect(middle.endIndex).toBeLessThan(ids.length);
    expect(end.endIndex).toBe(ids.length);
    expect(end.bottomSpacerHeight).toBe(0);
    expect(sliceCollectionVirtualWindow(ids, end).at(-1)?.publicId).toBe("media-3892");
});

test("spacers plus rendered rows preserve total scroll height", () => {
    const result = windowFor({ scrollTop: 75_000 });
    const renderedRows = Math.ceil((result.endIndex - result.startIndex) / result.columns);

    expect(result.topSpacerHeight + renderedRows * result.rowHeight + result.bottomSpacerHeight)
        .toBeCloseTo(result.totalRows * result.rowHeight);
});

test("representative viewports render at most 200 cards", () => {
    for (const scenario of [
        { columns: 11, rowHeight: calculateCollectionRowHeight(1160, 11), viewportHeight: 1440 },
        { columns: 5, rowHeight: calculateCollectionRowHeight(1160, 5), viewportHeight: 900 },
        { columns: 2, rowHeight: calculateCollectionRowHeight(360, 2), viewportHeight: 844 },
    ]) {
        const result = windowFor({ ...scenario, scrollTop: 50_000 });
        expect(result.endIndex - result.startIndex).toBeLessThanOrEqual(200);
    }
});

test("stable slices retain public IDs at deterministic indexes", () => {
    const result = windowFor({ scrollTop: 40_000 });
    const first = sliceCollectionVirtualWindow(ids, result);
    const second = sliceCollectionVirtualWindow(ids, result);

    expect(first.map(item => item.publicId)).toEqual(second.map(item => item.publicId));
    expect(first[0].publicId).toBe(`media-${result.startIndex}`);
    expect(first.at(-1)?.publicId).toBe(`media-${result.endIndex - 1}`);
});
