/**
 * OpenRouter helpers: live model list (cached 24 h), free-quota lookup and
 * friendly rate-limit messages. Everything here runs in the browser; the
 * user's key is only ever sent to openrouter.ai.
 */

export const OR_BASE = "https://openrouter.ai/api/v1";
export const OR_FREE_ROUTER = "openrouter/free";
export const OR_KEYS_URL = "https://openrouter.ai/keys";
export const OR_TITLE = "OiOi WordTalk";
const SITE = "https://2023anita.github.io/oioi-wordtalk/";
const CACHE_KEY = "oioi-wordtalk:or-models";
export const MODELS_TTL = 24 * 60 * 60 * 1000;

export interface OrModel {
  id: string;
  name: string;
  context: number;
  free: boolean;
  /** Accepts `response_format` (JSON mode). */
  json: boolean;
  /** Can take a `reasoning` setting (and it is not mandatory). */
  reasoning: boolean;
  created: number;
}

/** Used when the live list cannot be fetched. Checked against /api/v1/models on 2026-11-22. */
export const FALLBACK_MODELS: OrModel[] = [
  { id: OR_FREE_ROUTER, name: "OpenRouter: Free Models Router（自动选免费模型）", context: 200000, free: true, json: true, reasoning: false, created: 0 },
  { id: "google/gemma-4-31b-it:free", name: "Google: Gemma 4 31B (free)", context: 262144, free: true, json: true, reasoning: false, created: 0 },
  { id: "google/gemma-4-26b-a4b-it:free", name: "Google: Gemma 4 26B A4B (free)", context: 262144, free: true, json: true, reasoning: false, created: 0 },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "NVIDIA: Nemotron 3 Ultra (free)", context: 1000000, free: true, json: false, reasoning: false, created: 0 },
  { id: "nvidia/nemotron-3.5-super-vl:free", name: "NVIDIA: Nemotron 3.5 Super VL (free)", context: 1000000, free: true, json: true, reasoning: false, created: 0 },
  { id: "inclusionai/ling-3.2-flash:free", name: "inclusionAI: Ling 3.2 Flash (free)", context: 1048576, free: true, json: true, reasoning: false, created: 0 },
  { id: "baidu/ernie-5.5-flash-preview:free", name: "Baidu: ERNIE 5.5 Flash Preview (free)", context: 1024000, free: true, json: true, reasoning: false, created: 0 },
];

export const isFreeId = (id: string) => id === OR_FREE_ROUTER || id.endsWith(":free");

/** Turn the /api/v1/models payload into text-output models, router first, then newest first. */
export function parseModels(payload: unknown): OrModel[] {
  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data)) throw new Error("bad models payload");
  const out: OrModel[] = [];
  for (const m of data as Record<string, any>[]) {
    if (!m || typeof m.id !== "string") continue;
    const outMods: unknown = m.architecture?.output_modalities;
    const textOnly = Array.isArray(outMods) ? outMods.length === 1 && outMods[0] === "text" : String(m.architecture?.modality ?? "").endsWith("->text");
    if (!textOnly) continue;
    const params: string[] = Array.isArray(m.supported_parameters) ? m.supported_parameters : [];
    const free = String(m.pricing?.prompt) === "0" && String(m.pricing?.completion) === "0";
    out.push({
      id: m.id,
      name: typeof m.name === "string" ? m.name : m.id,
      context: Number(m.context_length) || 0,
      free,
      json: params.includes("response_format"),
      reasoning: params.includes("reasoning") && !m.reasoning?.mandatory,
      created: Number(m.created) || 0,
    });
  }
  return sortModels(out);
}

export function sortModels(models: OrModel[]): OrModel[] {
  return [...models].sort((a, b) => {
    if (a.id === OR_FREE_ROUTER) return -1;
    if (b.id === OR_FREE_ROUTER) return 1;
    if (a.free !== b.free) return a.free ? -1 : 1;
    return b.created - a.created || a.name.localeCompare(b.name);
  });
}

/* ---------- cache (localStorage, falls back to memory) ---------- */

let mem: { at: number; models: OrModel[] } | null = null;
const store = () => (typeof localStorage === "undefined" ? null : localStorage);

export function cachedModels(now = Date.now()): OrModel[] | null {
  let hit = mem;
  if (!hit) {
    try {
      hit = JSON.parse(store()?.getItem(CACHE_KEY) || "null");
    } catch {
      hit = null;
    }
  }
  if (!hit || !Array.isArray(hit.models) || now - hit.at > MODELS_TTL) return null;
  mem = hit;
  return hit.models;
}

function saveModels(models: OrModel[], now = Date.now()) {
  mem = { at: now, models };
  try {
    store()?.setItem(CACHE_KEY, JSON.stringify(mem));
  } catch {
    /* storage full */
  }
}

export function resetModelCache() {
  mem = null;
  try {
    store()?.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/** Live list (public endpoint, no key needed). Returns the fallback list on failure. */
export async function fetchModels({ force = false, fetchImpl = fetch }: { force?: boolean; fetchImpl?: typeof fetch } = {}): Promise<{ models: OrModel[]; live: boolean }> {
  if (!force) {
    const hit = cachedModels();
    if (hit) return { models: hit, live: true };
  }
  try {
    const res = await fetchImpl(`${OR_BASE}/models`);
    if (!res.ok) throw new Error(String(res.status));
    const models = parseModels(await res.json());
    if (!models.length) throw new Error("empty");
    saveModels(models);
    return { models, live: true };
  } catch {
    return { models: FALLBACK_MODELS, live: false };
  }
}

/** Whether to send `response_format` for this model. Unknown models: no (rely on prompt + validation). */
export function modelSupportsJson(id: string): boolean {
  const m = (cachedModels() ?? FALLBACK_MODELS).find((x) => x.id === id);
  return !!m?.json;
}

export function modelInfo(id: string): OrModel | undefined {
  return (cachedModels() ?? FALLBACK_MODELS).find((x) => x.id === id);
}

/* ---------- key / quota ---------- */

export interface KeyInfo {
  isFreeTier: boolean | null;
  used: number | null;
  limit: number | null;
  remaining: number | null;
}

export function parseKeyInfo(payload: unknown): KeyInfo {
  const d = ((payload as { data?: Record<string, any> })?.data ?? {}) as Record<string, any>;
  const q = (d.free_model_daily_requests ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return { isFreeTier: typeof d.is_free_tier === "boolean" ? d.is_free_tier : null, used: num(q.used), limit: num(q.limit), remaining: num(q.remaining) };
}

export async function fetchKeyInfo(apiKey: string, fetchImpl: typeof fetch = fetch): Promise<KeyInfo> {
  const res = await fetchImpl(`${OR_BASE}/key`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) throw new Error(`额度查询失败（${res.status}）`);
  return parseKeyInfo(await res.json());
}

export function formatQuota(k: KeyInfo): string {
  if (k.used == null && k.limit == null) return k.isFreeTier ? "免费账户（未返回今日额度）" : "未返回今日免费额度";
  const lim = k.limit == null ? "不限" : String(k.limit);
  const rem = k.remaining == null ? "" : `，剩余 ${k.remaining}`;
  return `今日免费模型请求：${k.used ?? 0} / ${lim}${rem}${k.isFreeTier ? "（免费账户）" : ""}`;
}

/* ---------- request helpers ---------- */

export function orHeaders(): Record<string, string> {
  let referer = SITE;
  if (typeof location !== "undefined" && /^https?:/.test(location.protocol)) referer = location.origin + location.pathname;
  return { "HTTP-Referer": referer, "X-Title": OR_TITLE };
}

/** Chinese explanation for an OpenRouter 429. */
export function rateLimitMessage(model: string, headers?: Headers | null, now = Date.now()): string {
  let when = "";
  const reset = Number(headers?.get("X-RateLimit-Reset") ?? "");
  if (reset > 0) {
    const ms = reset < 1e12 ? reset * 1000 : reset;
    const mins = Math.max(1, Math.round((ms - now) / 60000));
    when = mins < 90 ? `约 ${mins} 分钟后恢复。` : `约 ${Math.round(mins / 60)} 小时后恢复。`;
  }
  const free = isFreeId(model);
  return free
    ? `OpenRouter 免费模型限流（429）：免费模型有每分钟和每天的请求上限（从未充值的账户约 50 次/天，充值过 ≥10 美元约 1000 次/天）。${when}可以稍等一会儿、明天再试，或在「模型设置」里换一个模型。`
    : `OpenRouter 请求太频繁或额度不足（429）。${when}请稍后再试，或在「模型设置」里换一个模型。`;
}
