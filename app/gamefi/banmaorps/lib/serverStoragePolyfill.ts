// lib/serverStoragePolyfill.ts

// Polyfill `localStorage` in the Node.js environment used by Next.js during SSR or
// build steps. Some third-party SDKs expect a Storage-like object to exist even
// when rendering on the server. Next 16 ships with an experimental storage
// implementation, but when it is unavailable (or lacks the full API) we provide
// a lightweight in-memory fallback that satisfies the interface used at runtime.

const globalWithStorage = globalThis as typeof globalThis & { localStorage?: Storage };

if (typeof window === "undefined") {
  const needsPolyfill =
    !globalWithStorage.localStorage ||
    typeof globalWithStorage.localStorage.getItem !== "function" ||
    typeof globalWithStorage.localStorage.setItem !== "function";

  if (needsPolyfill) {
    const store = new Map<string, string>();

    const storage = {
      clear() {
        store.clear();
      },
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
      setItem(key: string, value: string) {
        store.set(key, String(value));
      },
    } as Storage;

    Object.defineProperty(storage, "length", {
      get: () => store.size,
    });

    globalWithStorage.localStorage = storage;
  }
}

// Polyfill `indexedDB` for server-side rendering
// Some third-party libraries (like wagmi connectors) may access indexedDB during SSR
const globalWithIndexedDB = globalThis as typeof globalThis & { indexedDB?: IDBFactory };

if (typeof window === "undefined" && !globalWithIndexedDB.indexedDB) {
  // Minimal mock that prevents "indexedDB is not defined" errors
  globalWithIndexedDB.indexedDB = {
    open: () => {
      const request = {
        result: null,
        error: null,
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
        onblocked: null,
        readyState: "done" as IDBRequestReadyState,
        source: null,
        transaction: null,
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => true,
      } as unknown as IDBOpenDBRequest;
      // Simulate async behavior - do NOT call success as there's no real DB
      return request;
    },
    deleteDatabase: () => {
      const request = {
        result: undefined,
        error: null,
        onerror: null,
        onsuccess: null,
        onblocked: null,
        readyState: "done" as IDBRequestReadyState,
        source: null,
        transaction: null,
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => true,
      } as unknown as IDBOpenDBRequest;
      return request;
    },
    cmp: () => 0,
    databases: async () => [],
  } as unknown as IDBFactory;
}

export { };
