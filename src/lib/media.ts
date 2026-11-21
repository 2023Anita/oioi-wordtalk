import { useEffect, useState } from "react";

/**
 * On-demand media for the iOS app.
 *
 * The App Store build bundles the dataset and every thumbnail, but streams full-size
 * illustrations and recordings from GitHub Pages (VITE_MEDIA_BASE). Each file is fetched the
 * first time it is needed and kept in IndexedDB (IndexedDB works in WKWebView on the
 * capacitor:// scheme, where the Cache API and service workers are not reliable), so it works
 * offline afterwards. When a file is neither cached nor reachable, callers show a placeholder
 * (illustrations) or fall back to the device voice (audio).
 *
 * On the web build media is same-origin and the service worker caches it, so everything here
 * is a pass-through.
 */

const BASE = ((import.meta.env?.VITE_MEDIA_BASE as string | undefined) || "").replace(/\/$/, "");
/** True when full illustrations and audio come from another host (the iOS build). */
export const mediaIsRemote = /^https:\/\//.test(BASE);
export const isRemoteMedia = (url: string | null | undefined): url is string => !!url && mediaIsRemote && url.startsWith(`${BASE}/`);

const DB = "oioi-wordtalk-media";
const STORE = "files";
const MAX_URLS = 400;

/** Object URLs made this session, oldest first (url -> blob: url). */
const objectUrls = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

let dbp: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

interface Stored {
  type: string;
  buf: ArrayBuffer;
}

async function idbGet(url: string): Promise<Stored | undefined> {
  const d = await db();
  if (!d) return undefined;
  return new Promise((resolve) => {
    try {
      const req = d.transaction(STORE, "readonly").objectStore(STORE).get(url);
      req.onsuccess = () => resolve(req.result as Stored | undefined);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

async function idbHas(url: string): Promise<boolean> {
  const d = await db();
  if (!d) return false;
  return new Promise((resolve) => {
    try {
      const req = d.transaction(STORE, "readonly").objectStore(STORE).getKey(url);
      req.onsuccess = () => resolve(req.result !== undefined);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbPut(url: string, v: Stored) {
  const d = await db();
  if (!d) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = d.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(v, url);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;

function remember(url: string, stored: Stored) {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return url;
  const u = URL.createObjectURL(new Blob([stored.buf], { type: stored.type }));
  objectUrls.set(url, u);
  if (objectUrls.size > MAX_URLS) {
    const [oldUrl, oldObj] = objectUrls.entries().next().value as [string, string];
    objectUrls.delete(oldUrl);
    URL.revokeObjectURL(oldObj);
  }
  return u;
}

async function download(url: string, signal?: AbortSignal): Promise<Stored | null> {
  const res = await fetch(url, { mode: "cors", signal });
  if (!res.ok) return null;
  const stored = { type: res.headers.get("content-type") || (url.endsWith(".mp3") ? "audio/mpeg" : "image/webp"), buf: await res.arrayBuffer() };
  await idbPut(url, stored);
  return stored;
}

/**
 * A playable/displayable URL for a media file, or null when it is not cached and cannot be
 * fetched. `network: false` only looks in the local store.
 */
export function resolveMedia(url: string | null | undefined, { network = true }: { network?: boolean } = {}): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  if (!isRemoteMedia(url)) return Promise.resolve(url);
  const hit = objectUrls.get(url);
  if (hit) return Promise.resolve(hit);
  const k = `${network ? "n" : "l"}:${url}`;
  let p = inflight.get(k);
  if (!p) {
    p = (async () => {
      const stored = await idbGet(url);
      if (stored) return remember(url, stored);
      if (!network || offline()) return null;
      try {
        const fresh = await download(url);
        return fresh ? remember(url, fresh) : null;
      } catch {
        return null;
      }
    })().finally(() => inflight.delete(k));
    inflight.set(k, p);
  }
  return p;
}

/**
 * Synchronous pick for audio started inside a tap (iOS requires play() in the same tick):
 * a cached copy if this session already has it, the remote URL when online (it is cached in
 * the background for next time), or null when offline so the caller speaks with the device voice.
 */
export function mediaForTap(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!isRemoteMedia(url)) return url;
  const hit = objectUrls.get(url);
  if (hit) return hit;
  void resolveMedia(url);
  return offline() ? null : url;
}

/** Look up (and optionally fetch) files ahead of time so taps can play them offline. */
export function warmMedia(urls: (string | null | undefined)[], network = false) {
  for (const u of urls) if (isRemoteMedia(u)) void resolveMedia(u, { network });
}

/** React hook: undefined while resolving, null when unavailable, otherwise a URL to use. */
export function useMediaUrl(url: string | null | undefined): string | null | undefined {
  const initial = !url ? null : !isRemoteMedia(url) ? url : objectUrls.get(url);
  const [state, setState] = useState<{ url: string | null | undefined; value: string | null | undefined }>({ url, value: initial });
  useEffect(() => {
    if (!url || !isRemoteMedia(url)) return;
    let live = true;
    if (!objectUrls.get(url)) setState({ url, value: undefined });
    void resolveMedia(url).then((v) => live && setState({ url, value: v }));
    return () => {
      live = false;
    };
  }, [url]);
  return state.url === url ? state.value : initial;
}

/* ---------- Optional bulk download (asks first, shows the size) ---------- */

export interface MediaManifest {
  img: { files: number; bytes: number };
  audio: { files: number; bytes: number };
}

export async function loadMediaManifest(atlasBase: string): Promise<MediaManifest | null> {
  try {
    const r = await fetch(`${atlasBase}/atlas/media-manifest.json`);
    return r.ok ? ((await r.json()) as MediaManifest) : null;
  } catch {
    return null;
  }
}

export const formatMB = (bytes: number) => `${Math.max(1, Math.round(bytes / 1048576))} MB`;

/** Download every URL not yet stored, a few at a time. Resolves with how many are now stored. */
export async function downloadAll(urls: string[], onProgress: (done: number, total: number) => void, signal?: AbortSignal): Promise<number> {
  const list = urls.filter(isRemoteMedia);
  let done = 0;
  let ok = 0;
  let next = 0;
  try {
    const n = navigator as Navigator & { storage?: { persist?: () => Promise<boolean> } };
    await n.storage?.persist?.();
  } catch {
    /* best effort */
  }
  const worker = async () => {
    while (next < list.length && !signal?.aborted) {
      const u = list[next++];
      try {
        if ((await idbHas(u)) || (await download(u, signal))) ok++;
      } catch {
        /* skip this file; it can be fetched on demand later */
      }
      done++;
      onProgress(done, list.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return ok;
}

export async function storedMediaCount(): Promise<number> {
  const d = await db();
  if (!d) return 0;
  return new Promise((resolve) => {
    try {
      const req = d.transaction(STORE, "readonly").objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}

export async function clearStoredMedia() {
  objectUrls.forEach((u) => URL.revokeObjectURL(u));
  objectUrls.clear();
  const d = await db();
  if (!d) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = d.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
