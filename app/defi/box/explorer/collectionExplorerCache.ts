import type { CollectionExplorerResponse } from "./types";

const DB_NAME = "banmaobox-collection-explorer";
const STORE = "responses";
const VERSION = 1;
export const COLLECTION_EXPLORER_CACHE_TTL_MS = 10 * 60_000;

type Entry = { key: string; observedAt: number; value: CollectionExplorerResponse };
type Environment = { indexedDB?: IDBFactory };

function factory(environment?: Environment) {
  return environment ? environment.indexedDB : typeof indexedDB === "undefined" ? undefined : indexedDB;
}

function open(dbFactory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = dbFactory.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Explorer cache unavailable"));
    request.onblocked = () => reject(new Error("Explorer cache blocked"));
  });
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Explorer cache request failed"));
  });
}

export function collectionExplorerCacheKey(chainId: number, query: string) {
  return `${chainId}:${query.trim().toLowerCase()}`;
}

export async function readCollectionExplorerCache(key: string, environment?: Environment): Promise<CollectionExplorerResponse | null> {
  const dbFactory = factory(environment);
  if (!dbFactory) return null;
  let database: IDBDatabase | undefined;
  try {
    database = await open(dbFactory);
    const entry = await result(database.transaction(STORE).objectStore(STORE).get(key)) as Entry | undefined;
    return entry && Date.now() - entry.observedAt <= COLLECTION_EXPLORER_CACHE_TTL_MS ? entry.value : null;
  } catch { return null; } finally { database?.close(); }
}

export async function writeCollectionExplorerCache(key: string, value: CollectionExplorerResponse, environment?: Environment): Promise<boolean> {
  const dbFactory = factory(environment);
  if (!dbFactory) return false;
  let database: IDBDatabase | undefined;
  try {
    database = await open(dbFactory);
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put({ key, observedAt: Date.now(), value } satisfies Entry);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    return true;
  } catch { return false; } finally { database?.close(); }
}
