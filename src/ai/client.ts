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

/** Pull a short human-readable reason out of a provider error body (OpenAI, MiniMax, DashScope shapes). */
export function errorDetail(body: string) {
  try {
    const j = JSON.parse(body) as { error?: { message?: string } | string; message?: string; base_resp?: { status_msg?: string } };
    const m = typeof j.error === "string" ? j.error : j.error?.message || j.message || j.base_resp?.status_msg;
    if (m) return String(m).slice(0, 160);
  } catch {
    /* not JSON */
  }
  return body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

/** Map an HTTP status to a clear, actionable message in Chinese. */
export function statusHint(status: number) {
  if (status === 400) return "请求被拒绝（400）：多半是模型名称写错或该模型不支持这些参数，请在设置里核对「模型 Model」。";
  if (status === 401) return "API Key 无效或已过期（401），请在设置里重新粘贴 Key。";
  if (status === 402) return "账户余额不足（402），请到服务商后台充值。";
  if (status === 403) return "没有权限（403）：Key 无权使用这个模型，或服务商限制了当前地区。";
  if (status === 404) return "接口地址或模型不存在（404），请核对 Base URL（通常以 /v1 结尾）和模型名称。";
  if (status === 408 || status === 504) return "模型响应超时，请稍后重试。";
  if (status === 413) return "这次发送的内容太长了，请缩短后再试。";
  if (status === 429) return "请求太频繁或额度用完（429），请稍等片刻或检查套餐额度。";
  if (status >= 500) return `模型服务暂时出错（${status}），请稍后重试。`;
  return `服务返回 ${status}。`;
}

/** MiniMax reports failures inside a 200 response. */
const MINIMAX_CODES: Record<number, string> = {
  1002: "请求太频繁，请稍后再试。",
  1004: "API Key 无效，请在设置里重新粘贴 Key。",
  1008: "账户余额不足，请到服务商后台充值。",
  1026: "输入内容触发了服务商的安全审核，换个说法试试。",
  1027: "输出内容触发了服务商的安全审核，请重试。",
  2013: "请求参数有误，请核对模型名称。",
};

const TIMEOUT_MS = 60_000;

/** One OpenAI-compatible chat completion. */
export async function chat(cfg: AiConfig, messages: Message[], { json = false, signal, maxTokens = 1600 }: { json?: boolean; signal?: AbortSignal; maxTokens?: number } = {}) {
  if (!cfg.apiKey) throw new AiError("还没有填写 API Key，请先到「模型设置」里填写。");
  if (!/^https:\/\//.test(cfg.baseUrl)) throw new AiError("Base URL 需要以 https:// 开头，请到「模型设置」里核对。");
  const { url, headers } = endpoint(cfg);
  const body: Record<string, unknown> = { model: cfg.model, messages, temperature: cfg.temperature, max_tokens: maxTokens };
  if (json && presetById(cfg.provider).jsonMode) body.response_format = { type: "json_object" };
  // Our own timeout, chained to the caller's abort signal.
  const ctl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctl.abort();
  }, TIMEOUT_MS);
  const onAbort = () => ctl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}`, ...headers }, body: JSON.stringify(body), signal: ctl.signal });
  } catch (e) {
    if (timedOut) throw new AiError("模型 60 秒内没有响应，请稍后重试，或换一个更快的模型。", 408);
    if ((e as Error).name === "AbortError") throw e;
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new AiError("当前没有网络连接，联网后再试。");
    throw new AiError("连不上模型服务：可能是 Base URL 写错、网络不通，或浏览器跨域被拦截（可在设置的「高级」里填写代理）。");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = errorDetail(await res.text());
    } catch {
      /* ignore */
    }
    throw new AiError(`${statusHint(res.status)}${detail ? `\n服务商说明：${detail}` : ""}`, res.status);
  }
  let data: { choices?: { message?: { content?: string }; finish_reason?: string }[]; base_resp?: { status_code?: number; status_msg?: string } };
  try {
    data = await res.json();
  } catch {
    throw new AiError("模型服务返回的不是 JSON：请核对 Base URL 是否指向 OpenAI 兼容接口（通常以 /v1 结尾）。");
  }
  if (data.base_resp && data.base_resp.status_code) {
    const code = data.base_resp.status_code;
    throw new AiError(`模型服务错误：${MINIMAX_CODES[code] ?? data.base_resp.status_msg ?? code}`);
  }
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new AiError(data.choices?.[0]?.finish_reason === "content_filter" ? "回复被服务商的内容审核拦截，请重试或换个说法。" : "模型返回了空内容，请重试。");
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
  throw new AiError(`模型没能按要求的格式回答（${(lastErr as Error)?.message ?? "未知"}）。请重试；若反复出现，换一个更强的模型。`);
}
