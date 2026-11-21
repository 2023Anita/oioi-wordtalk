import type { AiConfig } from "./config";
import { extractJson } from "./json";
import { presetById } from "./providers";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export class AiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

/** Build the request target: provider directly, or through the optional proxy. */
export function endpoint(cfg: AiConfig) {
  const base = cfg.baseUrl.replace(/\/+$/, "");
  if (cfg.proxyUrl) return { url: `${cfg.proxyUrl.replace(/\/+$/, "")}/chat/completions`, headers: { "X-Target-Base": base } as Record<string, string> };
  return { url: `${base}/chat/completions`, headers: {} as Record<string, string> };
}

/** One OpenAI-compatible chat completion. */
export async function chat(cfg: AiConfig, messages: Message[], { json = false, signal, maxTokens = 1600 }: { json?: boolean; signal?: AbortSignal; maxTokens?: number } = {}) {
  const { url, headers } = endpoint(cfg);
  const body: Record<string, unknown> = { model: cfg.model, messages, temperature: cfg.temperature, max_tokens: maxTokens };
  if (json && presetById(cfg.provider).jsonMode) body.response_format = { type: "json_object" };
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}`, ...headers }, body: JSON.stringify(body), signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new AiError("网络请求失败：可能是网络不通，或浏览器跨域被拦截（可在设置里填写代理）。");
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 240);
    } catch {
      /* ignore */
    }
    const hint = res.status === 401 ? "API Key 无效或已过期。" : res.status === 429 ? "请求太频繁或额度不足。" : `服务返回 ${res.status}。`;
    throw new AiError(`${hint}${detail ? ` ${detail}` : ""}`, res.status);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; base_resp?: { status_code?: number; status_msg?: string } };
  if (data.base_resp && data.base_resp.status_code) throw new AiError(`模型服务错误：${data.base_resp.status_msg ?? data.base_resp.status_code}`);
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new AiError("模型返回了空内容。");
  return text;
}

/** Ask for JSON, validate it, and retry once with the validation error if it does not fit. */
export async function chatJSON<T>(cfg: AiConfig, messages: Message[], validate: (v: unknown) => T, opts: { signal?: AbortSignal; maxTokens?: number } = {}): Promise<T> {
  let convo = messages;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await chat(cfg, convo, { json: true, ...opts });
    try {
      return validate(extractJson(text));
    } catch (e) {
      lastErr = e;
      convo = [...messages, { role: "assistant", content: text.slice(0, 4000) }, { role: "user", content: `Your reply was not valid for the required JSON schema (${(e as Error).message}). Reply again with ONLY the corrected JSON object.` }];
    }
  }
  throw new AiError(`模型输出格式不对：${(lastErr as Error)?.message ?? "未知"}`);
}
