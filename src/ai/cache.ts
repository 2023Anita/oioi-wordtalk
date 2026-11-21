/** Tiny IndexedDB key/value cache for generated content (falls back to memory). */
const DB = "oioi-wordtalk";
const STORE = "ai-cache";
const mem = new Map<string, unknown>();

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}
let dbp: Promise<IDBDatabase | null> | null = null;
const db = () => (dbp ??= open());

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  if (mem.has(key)) return mem.get(key) as T;
  const d = await db();
  if (!d) return undefined;
  return new Promise((resolve) => {
    const req = d.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => {
      const v = req.result as { at: number; value: T } | undefined;
      if (v) mem.set(key, v.value);
      resolve(v?.value);
    };
    req.onerror = () => resolve(undefined);
  });
}

export async function cacheSet<T>(key: string, value: T) {
  mem.set(key, value);
  const d = await db();
  if (!d) return;
  await new Promise<void>((resolve) => {
    const tx = d.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ at: Date.now(), value }, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function cacheClear() {
  mem.clear();
  const d = await db();
  if (!d) return;
  await new Promise<void>((resolve) => {
    const tx = d.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export async function cacheCount(): Promise<number> {
  const d = await db();
  if (!d) return mem.size;
  return new Promise((resolve) => {
    const req = d.transaction(STORE, "readonly").objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(0);
  });
}
