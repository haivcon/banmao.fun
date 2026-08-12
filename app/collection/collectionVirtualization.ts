export const COLLECTION_VIRTUAL_MAX_ITEMS = 200;
export const COLLECTION_VIRTUAL_OVERSCAN_ROWS = 4;

const DESKTOP_COLUMNS = [3, 5, 7, 9, 11] as const;
const MOBILE_COLUMNS = [2, 3, 4] as const;
const DESKTOP_GAP = 16;
const MOBILE_GAP = 5;
const DESKTOP_CARD_FOOTER_HEIGHT = 39;
const MOBILE_CARD_FOOTER_HEIGHT = 35;

export interface CollectionVirtualWindow {
    columns: number;
    rowHeight: number;
    totalRows: number;
    startRow: number;
    endRow: number;
    startIndex: number;
    endIndex: number;
    topSpacerHeight: number;
    bottomSpacerHeight: number;
    totalHeight: number;
}

export interface CollectionVirtualWindowInput {
    itemCount: number;
    columns: number;
    rowHeight: number;
    viewportHeight: number;
    scrollTop: number;
    gridTop: number;
    overscanRows?: number;
    maxItems?: number;
}

function finite(value: number, fallback = 0): number {
    return Number.isFinite(value) ? value : fallback;
}

export function collectionGridGap(containerWidth: number): number {
    return finite(containerWidth) <= 640 ? MOBILE_GAP : DESKTOP_GAP;
}

export function resolveCollectionColumns(containerWidth: number, density: number): number {
    const choices = finite(containerWidth) <= 640 ? MOBILE_COLUMNS : DESKTOP_COLUMNS;
    return choices.reduce((nearest, candidate) => (
        Math.abs(candidate - density) < Math.abs(nearest - density) ? candidate : nearest
    ), choices[0]);
}

/** Row pitch: fixed square media area + fixed footer + the grid row gap. */
export function calculateCollectionRowHeight(containerWidth: number, columns: number): number {
    const width = Math.max(1, finite(containerWidth, 1));
    const count = Math.max(1, Math.floor(finite(columns, 1)));
    const gap = collectionGridGap(width);
    const cardWidth = Math.max(1, (width - gap * (count - 1)) / count);
    const footerHeight = width <= 640 ? MOBILE_CARD_FOOTER_HEIGHT : DESKTOP_CARD_FOOTER_HEIGHT;
    return cardWidth + footerHeight + gap;
}

export function calculateCollectionVirtualWindow(input: CollectionVirtualWindowInput): CollectionVirtualWindow {
    const itemCount = Math.max(0, Math.floor(finite(input.itemCount)));
    const columns = Math.max(1, Math.floor(finite(input.columns, 1)));
    const rowHeight = Math.max(1, finite(input.rowHeight, 1));
    const viewportHeight = Math.max(0, finite(input.viewportHeight));
    const overscanRows = Math.max(0, Math.floor(finite(input.overscanRows)));
    const maxItems = Math.max(columns, Math.floor(finite(input.maxItems, COLLECTION_VIRTUAL_MAX_ITEMS)));
    const maxRows = Math.max(1, Math.floor(maxItems / columns));
    const totalRows = Math.ceil(itemCount / columns);
    const relativeScroll = Math.max(0, finite(input.scrollTop) - finite(input.gridTop));
    const visibleStartRow = Math.min(totalRows, Math.floor(relativeScroll / rowHeight));
    const visibleRows = Math.max(1, Math.ceil(viewportHeight / rowHeight) + 1);
    const desiredStartRow = Math.max(0, visibleStartRow - overscanRows);
    const desiredEndRow = Math.min(totalRows, visibleStartRow + visibleRows + overscanRows);
    const desiredRows = desiredEndRow - desiredStartRow;

    let startRow = desiredStartRow;
    let endRow = desiredEndRow;
    if (desiredRows > maxRows) {
        const leadingRows = Math.min(overscanRows, Math.max(0, maxRows - visibleRows));
        startRow = Math.max(0, visibleStartRow - leadingRows);
        endRow = Math.min(totalRows, startRow + maxRows);
        startRow = Math.max(0, endRow - maxRows);
    }

    const startIndex = Math.min(itemCount, startRow * columns);
    const endIndex = Math.min(itemCount, endRow * columns);
    const topSpacerHeight = startRow * rowHeight;
    const bottomSpacerHeight = Math.max(0, (totalRows - endRow) * rowHeight);

    return {
        columns,
        rowHeight,
        totalRows,
        startRow,
        endRow,
        startIndex,
        endIndex,
        topSpacerHeight,
        bottomSpacerHeight,
        totalHeight: totalRows * rowHeight,
    };
}

export function sliceCollectionVirtualWindow<T>(items: readonly T[], window: Pick<CollectionVirtualWindow, "startIndex" | "endIndex">): T[] {
    return items.slice(window.startIndex, window.endIndex);
}
