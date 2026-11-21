import assert from "node:assert/strict";
import { test } from "node:test";
import { endpoint } from "./client";
import { defaultAiConfig, sanitizeAiConfig } from "./config";
import { extractJson } from "./json";
import * as mock from "./mock";
import { SCENARIOS } from "./scenarios";
import { validateArgument, validateChatTurn, validatePair, validateScene } from "./schemas";
import type { WordBrief } from "./tasks";

const words: WordBrief[] = [
  { id: "abandon", word: "abandon", zh: "v. 放弃", example: "They had to abandon the car in the snow.", tip: "abandon 指彻底放弃", syn: ["desert"] },
  { id: "allergy", word: "allergy", zh: "n. 过敏", example: "She has an allergy to penicillin." },
  { id: "anxious", word: "anxious", zh: "adj. 焦虑的", example: "He felt anxious before the operation." },
  { id: "consent", word: "consent", zh: "n. 同意", example: "The patient gave written consent." },
  { id: "delay", word: "delay", zh: "n./v. 延误", example: "Our flight was delayed by two hours." },
];

test("extractJson handles fences, think blocks and trailing text", () => {
  assert.deepEqual(extractJson('<think>hmm {"x":1}</think>\n```json\n{"a": "b}"}\n```'), { a: "b}" });
  assert.deepEqual(extractJson('Sure! {"a": {"b": [1, 2]}} hope it helps'), { a: { b: [1, 2] } });
  assert.throws(() => extractJson("no json here"));
});

test("scene validator accepts good output and rejects bad answers", () => {
  const good = {
    title: "At the gate",
    story: "x".repeat(60),
    questions: [{ type: "fill", word: "delay", q: "Our flight was ___.", options: ["delayed", "abandoned", "anxious", "consent"], answer: 0, explain: "" }],
  };
  assert.equal(validateScene(good).questions[0].answer, 0);
  assert.throws(() => validateScene({ ...good, questions: [{ ...good.questions[0], answer: 7 }] }));
  assert.throws(() => validateScene({ ...good, questions: [{ ...good.questions[0], type: "essay" }] }));
});

test("chat turn validator fills defaults", () => {
  const t = validateChatTurn({ reply: "Hello!" });
  assert.equal(t.feedback.ok, true);
  assert.deepEqual(t.used, []);
  assert.throws(() => validateChatTurn({ reply: "" }));
});

test("argument and pair validators enforce ranges", () => {
  const scores = { claim: 3, reason: 2, evidence: 1, concession: 0, conclusion: 2 };
  assert.equal(validateArgument({ scores }).scores.claim, 3);
  assert.throws(() => validateArgument({ scores: { ...scores, claim: 9 } }));
  assert.throws(() => validatePair({ items: [{ sentence: "x", options: ["a"], answer: 0 }] }));
});

test("offline demo produces schema-valid content", () => {
  for (const s of SCENARIOS) {
    const scene = validateScene(mock.scene(words, s));
    assert.equal(scene.questions.length, 3);
    scene.questions.forEach((q) => assert.ok(q.answer < q.options.length));
  }
  const turn = validateChatTurn(mock.chatTurn(SCENARIOS[0], words, "Sorry for the delay, I was anxious.", 1));
  assert.deepEqual(turn.used.map((u) => u.word).sort(), ["anxious", "delay"]);
  assert.ok(validatePair({ items: mock.pair(words[0], "desert") }).items.length >= 1);
  const arg = validateArgument(mock.argument({ claim: "I believe hospitals should abandon paper records.", reason: "", evidence: "", concession: "", conclusion: "" }, words));
  assert.equal(arg.scores.reason, 0);
  assert.equal(arg.used[0].word, "abandon");
});

test("config sanitizer keeps keys local-shaped and rejects http", () => {
  const c = sanitizeAiConfig({ provider: "deepseek", apiKey: " sk-1 ", baseUrl: "http://evil", proxyUrl: "http://x" });
  assert.equal(c.apiKey, "sk-1");
  assert.equal(c.baseUrl, "https://api.deepseek.com");
  assert.equal(c.proxyUrl, "");
  assert.equal(sanitizeAiConfig({ provider: "nope" }).provider, "demo");
  assert.equal(endpoint({ ...defaultAiConfig, baseUrl: "https://api.minimaxi.com/v1/" }).url, "https://api.minimaxi.com/v1/chat/completions");
  assert.equal(endpoint({ ...defaultAiConfig, baseUrl: "https://a/v1", proxyUrl: "https://p.dev" }).headers["X-Target-Base"], "https://a/v1");
});

test("provider errors become clear, actionable messages", async () => {
  const { errorDetail, statusHint } = await import("./client");
  assert.match(statusHint(401), /API Key/);
  assert.match(statusHint(404), /Base URL/);
  assert.match(statusHint(429), /429/);
  assert.match(statusHint(503), /稍后重试/);
  assert.equal(errorDetail('{"error":{"message":"model not found"}}'), "model not found");
  assert.equal(errorDetail('{"base_resp":{"status_code":1004,"status_msg":"login fail"}}'), "login fail");
  assert.equal(errorDetail("<html><body>Bad gateway</body></html>"), "Bad gateway");
});
