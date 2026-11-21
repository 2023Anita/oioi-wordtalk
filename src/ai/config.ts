import { useSyncExternalStore } from "react";
import { presetById } from "./providers";

/**
 * Model settings live only in this device's localStorage under their own key.
 * They are never part of backups, never sent anywhere except the chosen provider.
 */
export interface AiConfig {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  /** Optional self-hosted proxy (see /proxy). Empty = call the provider directly. */
  proxyUrl: string;
  temperature: number;
}

const KEY = "oioi-wordtalk:ai";

export const defaultAiConfig: AiConfig = { provider: "demo", baseUrl: "", model: "offline-demo", apiKey: "", proxyUrl: "", temperature: 0.7 };

export function sanitizeAiConfig(v: unknown): AiConfig {
  const out = { ...defaultAiConfig };
  if (!v || typeof v !== "object") return out;
  const o = v as Record<string, unknown>;
  const str = (x: unknown, max = 400) => (typeof x === "string" ? x.trim().slice(0, max) : "");
  if (typeof o.provider === "string") out.provider = presetById(o.provider).id;
  const preset = presetById(out.provider);
  out.baseUrl = str(o.baseUrl) || preset.baseUrl;
  out.model = str(o.model, 120) || preset.model;
  out.apiKey = str(o.apiKey, 400);
  const proxy = str(o.proxyUrl);
  out.proxyUrl = /^https:\/\//.test(proxy) ? proxy : "";
  if (typeof o.temperature === "number" && o.temperature >= 0 && o.temperature <= 1.5) out.temperature = o.temperature;
  if (out.baseUrl && !/^https:\/\//.test(out.baseUrl)) out.baseUrl = preset.baseUrl;
  return out;
}

function read(): AiConfig {
  try {
    return sanitizeAiConfig(JSON.parse(localStorage.getItem(KEY) || "null"));
  } catch {
    return { ...defaultAiConfig };
  }
}

let cfg: AiConfig = typeof localStorage === "undefined" ? { ...defaultAiConfig } : read();
const subs = new Set<() => void>();

export const aiConfig = {
  get: () => cfg,
  set(patch: Partial<AiConfig>) {
    cfg = sanitizeAiConfig({ ...cfg, ...patch });
    try {
      localStorage.setItem(KEY, JSON.stringify(cfg));
    } catch {
      /* storage full or blocked */
    }
    subs.forEach((f) => f());
  },
  clearKey() {
    aiConfig.set({ apiKey: "" });
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

export const isDemo = (c: AiConfig = cfg) => c.provider === "demo" || !c.apiKey || !c.baseUrl;

export function useAiConfig() {
  return useSyncExternalStore(aiConfig.subscribe, aiConfig.get, aiConfig.get);
}
