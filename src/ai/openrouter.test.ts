import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AiError, buildBody, chat } from "./client";
import { defaultAiConfig, sanitizeAiConfig, type AiConfig } from "./config";
import { FALLBACK_MODELS, fetchKeyInfo, fetchModels, formatQuota, modelSupportsJson, OR_FREE_ROUTER, parseKeyInfo, parseModels, rateLimitMessage, resetModelCache } from "./openrouter";
import { presetById } from "./providers";

const payload = {
  data: [
    { id: "acme/big", name: "Acme Big", created: 300, context_length: 128000, architecture: { output_modalities: ["text"] }, pricing: { prompt: "0.000001", completion: "0.000002" }, supported_parameters: ["response_format"] },
    { id: "google/lyria-3-pro-preview", name: "Lyria", created: 400, architecture: { output_modalities: ["text", "audio"] }, pricing: { prompt: "0", completion: "0" } },
    { id: "old/free:free", name: "Old free", created: 100, context_length: 32000, architecture: { output_modalities: ["text"] }, pricing: { prompt: "0", completion: "0" }, supported_parameters: ["max_tokens"] },
    { id: "new/free:free", name: "New free", created: 200, context_length: 262144, architecture: { output_modalities: ["text"] }, pricing: { prompt: "0", completion: "0" }, supported_parameters: ["response_format", "reasoning"], reasoning: { mandatory: false } },
    { id: OR_FREE_ROUTER, name: "Free router", created: 1, context_length: 200000, architecture: { output_modalities: ["text"] }, pricing: { prompt: "0", completion: "0" }, supported_parameters: ["response_format"] },
  ],
};

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  resetModelCache();
});

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
const orCfg = (model: string): AiConfig => ({ ...sanitizeAiConfig({ provider: "openrouter", apiKey: "sk-or-1" }), model });

test("OpenRouter preset defaults to the free router", () => {
  const p = presetById("openrouter");
  assert.equal(p.label, "OpenRouter（含免费模型）");
  assert.equal(p.baseUrl, "https://openrouter.ai/api/v1");
  assert.equal(p.keyUrl, "https://openrouter.ai/keys");
  const c = sanitizeAiConfig({ provider: "openrouter", apiKey: "k" });
  assert.equal(c.model, "openrouter/free");
  assert.equal(c.baseUrl, "https://openrouter.ai/api/v1");
});

test("parseModels keeps text models, router first, free before paid, newest first", () => {
  const ms = parseModels(payload);
  assert.deepEqual(
    ms.map((m) => m.id),
    [OR_FREE_ROUTER, "new/free:free", "old/free:free", "acme/big"],
  );
  assert.equal(ms.find((m) => m.id === "acme/big")!.free, false);
  assert.equal(ms.find((m) => m.id === "new/free:free")!.reasoning, true);
  assert.throws(() => parseModels({}));
});

test("fetchModels caches and falls back to the static list", async () => {
  let calls = 0;
  const ok = (async () => (calls++, json(payload))) as typeof fetch;
  const a = await fetchModels({ fetchImpl: ok });
  assert.equal(a.live, true);
  await fetchModels({ fetchImpl: ok });
  assert.equal(calls, 1, "second call served from cache");
  resetModelCache();
  const bad = (async () => {
    throw new Error("offline");
  }) as typeof fetch;
  const b = await fetchModels({ fetchImpl: bad });
  assert.equal(b.live, false);
  assert.equal(b.models, FALLBACK_MODELS);
  assert.ok(FALLBACK_MODELS.every((m) => m.free));
});

test("response_format only for models that support it", async () => {
  await fetchModels({ fetchImpl: (async () => json(payload)) as typeof fetch });
  assert.equal(modelSupportsJson("new/free:free"), true);
  assert.equal(modelSupportsJson("old/free:free"), false);
  assert.equal(modelSupportsJson("never/heard-of"), false);
  const msgs = [{ role: "user" as const, content: "hi" }];
  assert.deepEqual(buildBody(orCfg("new/free:free"), msgs, { json: true }).response_format, { type: "json_object" });
  assert.equal(buildBody(orCfg("new/free:free"), msgs, { json: true }).reasoning !== undefined, true);
  assert.equal(buildBody(orCfg("old/free:free"), msgs, { json: true }).response_format, undefined);
  // other providers unchanged
  const ds = sanitizeAiConfig({ provider: "deepseek", apiKey: "k" });
  assert.deepEqual(buildBody(ds, msgs, { json: true }).response_format, { type: "json_object" });
  assert.equal(buildBody(ds, msgs, { json: true }).reasoning, undefined);
});

test("chat sends attribution headers and retries a 429 once on openrouter/free", async () => {
  const seen: { model: string; headers: Record<string, string> }[] = [];
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    seen.push({ model: body.model, headers: init.headers as Record<string, string> });
    if (body.model !== OR_FREE_ROUTER) return json({ error: { message: "rate" } }, 429, { "X-RateLimit-Reset": String(Date.now() + 120000) });
    return json({ choices: [{ message: { content: "ok" } }] });
  }) as typeof fetch;
  assert.equal(await chat(orCfg("old/free:free"), [{ role: "user", content: "hi" }]), "ok");
  assert.deepEqual(
    seen.map((s) => s.model),
    ["old/free:free", OR_FREE_ROUTER],
  );
  assert.equal(seen[0].headers["X-Title"], "OiOi WordTalk");
  assert.ok(seen[0].headers["HTTP-Referer"].startsWith("https://"));
});

test("a daily-cap 429 on both tries surfaces the Chinese explanation", async () => {
  let n = 0;
  globalThis.fetch = (async () => (n++, json({ error: { message: "limit" } }, 429))) as typeof fetch;
  await assert.rejects(chat(orCfg("old/free:free"), [{ role: "user", content: "hi" }]), (e: unknown) => {
    assert.ok(e instanceof AiError);
    assert.equal(e.status, 429);
    assert.match(e.message, /免费模型/);
    assert.match(e.message, /换一个模型/);
    return true;
  });
  assert.equal(n, 2);
  // the router itself is not retried
  n = 0;
  await assert.rejects(chat(orCfg(OR_FREE_ROUTER), [{ role: "user", content: "hi" }]));
  assert.equal(n, 1);
  // other providers: no retry, old message
  n = 0;
  await assert.rejects(chat({ ...defaultAiConfig, provider: "deepseek", baseUrl: "https://api.deepseek.com", model: "deepseek-chat", apiKey: "k" }, [{ role: "user", content: "hi" }]), /429/);
  assert.equal(n, 1);
});

test("rate limit message mentions recovery time", () => {
  const h = new Headers({ "X-RateLimit-Reset": String(Date.now() + 5 * 60000) });
  assert.match(rateLimitMessage("x:free", h), /约 5 分钟后恢复/);
  assert.doesNotMatch(rateLimitMessage("acme/big", null), /免费模型/);
});

test("key info parses free daily quota", async () => {
  const k = parseKeyInfo({ data: { is_free_tier: true, free_model_daily_requests: { used: 7, limit: 50, remaining: 43 } } });
  assert.deepEqual(k, { isFreeTier: true, used: 7, limit: 50, remaining: 43 });
  assert.match(formatQuota(k), /7 \/ 50/);
  assert.match(formatQuota(parseKeyInfo({ data: {} })), /未返回/);
  let auth = "";
  const f = (async (_u: string, init: RequestInit) => ((auth = (init.headers as Record<string, string>).Authorization), json({ data: { free_model_daily_requests: { used: 1, limit: 1000, remaining: 999 } } }))) as typeof fetch;
  assert.equal((await fetchKeyInfo("sk-or-x", f)).limit, 1000);
  assert.equal(auth, "Bearer sk-or-x");
  await assert.rejects(fetchKeyInfo("bad", (async () => json({}, 401)) as typeof fetch), /401/);
});
