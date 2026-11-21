import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AiError, chat } from "./client";
import { sanitizeAiConfig } from "./config";
import { consent, consentKey, ensureConsent } from "./consent";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  consent.setHandler(null);
  consent.revokeAll();
});

const cfg = sanitizeAiConfig({ provider: "deepseek", apiKey: "k" });
const ok = () => new Response(JSON.stringify({ choices: [{ message: { content: "hi" } }] }), { status: 200, headers: { "Content-Type": "application/json" } });

test("no request is made without consent", async () => {
  let calls = 0;
  globalThis.fetch = (async () => (calls++, ok())) as typeof fetch;
  await assert.rejects(chat(cfg, [{ role: "user", content: "x" }]), (e: unknown) => e instanceof AiError && e.declined);
  assert.equal(calls, 0);
});

test("declining in the dialog sends nothing; agreeing is remembered per provider", async () => {
  let calls = 0;
  globalThis.fetch = (async () => (calls++, ok())) as typeof fetch;
  consent.setHandler((r) => r.resolve(false));
  await assert.rejects(chat(cfg, [{ role: "user", content: "x" }]));
  assert.equal(calls, 0);
  let asked = 0;
  consent.setHandler((r) => (asked++, r.resolve(true)));
  assert.equal(await chat(cfg, [{ role: "user", content: "x" }]), "hi");
  assert.equal(await chat(cfg, [{ role: "user", content: "y" }]), "hi");
  assert.equal(asked, 1);
  assert.equal(calls, 2);
  assert.equal(consent.has(sanitizeAiConfig({ provider: "openai", apiKey: "k" })), false);
});

test("revoking consent asks again; custom endpoints are keyed by host", async () => {
  consent.setHandler((r) => r.resolve(true));
  assert.equal(await ensureConsent(cfg), true);
  consent.revoke(consentKey(cfg));
  assert.equal(consent.has(cfg), false);
  assert.equal(consentKey({ provider: "custom", baseUrl: "https://llm.example.com/v1" }), "custom:llm.example.com");
});
