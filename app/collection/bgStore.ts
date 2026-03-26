// IndexedDB store for background-removed images
const DB_NAME = "banmao_bg_removed";
const STORE_NAME = "images";
const DB_VERSION = 1;

export interface BgEntry {
    /** Key = original image URL */
    id: string;
    name: string;
    data: ArrayBuffer;
    timestamp: number;
    sizeBytes: number;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/** Save a bg-removed image blob */
export async function saveBgImage(originalSrc: string, name: string, blob: Blob): Promise<void> {
    const db = await openDB();
    const buf = await blob.arrayBuffer();
    const entry: BgEntry = {
        id: originalSrc,
        name,
        data: buf,
        timestamp: Date.now(),
        sizeBytes: buf.byteLength,
    };
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Get a bg-removed image for a given original URL */
export async function getBgImage(originalSrc: string): Promise<BgEntry | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(originalSrc);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
    });
}

/** Delete a bg-removed image */
export async function deleteBgImage(originalSrc: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(originalSrc);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Get all saved entries (for listing) */
export async function getAllBgImages(): Promise<BgEntry[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror = () => reject(req.error);
    });
}

/** Delete all saved entries */
export async function clearAllBgImages(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

/** Convert stored ArrayBuffer back to blob URL */
export function entryToUrl(entry: BgEntry): string {
    return URL.createObjectURL(new Blob([entry.data], { type: "image/png" }));
}
