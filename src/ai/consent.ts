import { useSyncExternalStore } from "react";
import type { AiConfig } from "./config";
import { presetById } from "./providers";

/**
 * Explicit opt-in before any text leaves the device for a third-party AI provider
 * (App Store guideline 5.1.2(i)). Consent is stored per provider (custom endpoints per host),
 * on this device only, and can be withdrawn in Settings at any time. Without consent no request
 * is made.
 */

const KEY = "oioi-wordtalk:ai-consent";

export interface ConsentRequest {
  key: string;
  provider: string;
  host: string;
  resolve: (ok: boolean) => void;
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url || "?";
  }
}

/** One consent per preset; a custom endpoint is its own provider per host. */
export function consentKey(cfg: Pick<AiConfig, "provider" | "baseUrl">) {
  return cfg.provider === "custom" ? `custom:${hostOf(cfg.baseUrl)}` : cfg.provider;
}

/** Human name for the dialog and the settings list. */
export function providerName(cfg: Pick<AiConfig, "provider" | "baseUrl">) {
  if (cfg.provider === "custom") return `自定义服务 Custom (${hostOf(cfg.baseUrl)})`;
  return presetById(cfg.provider).label.replace(/（.*）/, "");
}

let granted: Record<string, string> = {};
try {
  if (typeof localStorage !== "undefined") granted = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
} catch {
  granted = {};
}
let pending: ConsentRequest | null = null;
let handler: ((r: ConsentRequest) => void) | null = null;
const subs = new Set<() => void>();
let snapshot: { granted: Record<string, string>; pending: ConsentRequest | null } = { granted, pending };

function emit() {
  snapshot = { granted: { ...granted }, pending };
  subs.forEach((f) => f());
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(granted));
  } catch {
    /* storage blocked: consent then lasts for this session only */
  }
}

export const consent = {
  has: (cfg: Pick<AiConfig, "provider" | "baseUrl">) => !!granted[consentKey(cfg)],
  grant(key: string) {
    granted[key] = new Date().toISOString();
    save();
    emit();
  },
  revoke(key: string) {
    delete granted[key];
    save();
    emit();
  },
  revokeAll() {
    granted = {};
    save();
    emit();
  },
  list: () => Object.entries(granted).map(([key, at]) => ({ key, at })),
  /** The UI registers here to show the dialog; with no UI mounted, requests are declined. */
  setHandler(h: ((r: ConsentRequest) => void) | null) {
    handler = h;
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
  snapshot: () => snapshot,
};

/** Ask once per provider. Resolves true only after the user taps Agree. */
export function ensureConsent(cfg: Pick<AiConfig, "provider" | "baseUrl">): Promise<boolean> {
  if (consent.has(cfg)) return Promise.resolve(true);
  if (!handler) return Promise.resolve(false);
  if (pending) pending.resolve(false);
  return new Promise((resolve) => {
    const key = consentKey(cfg);
    pending = {
      key,
      provider: providerName(cfg),
      host: hostOf(cfg.baseUrl),
      resolve: (ok) => {
        pending = null;
        if (ok) consent.grant(key);
        else emit();
        resolve(ok);
      },
    };
    emit();
    handler?.(pending);
  });
}

export function useConsent() {
  return useSyncExternalStore(consent.subscribe, consent.snapshot, consent.snapshot);
}
