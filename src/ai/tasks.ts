import { headwordPattern, hashSeed, shuffle } from "../lib/text";
import { cacheGet, cacheSet } from "./cache";
import { chatJSON, type Message } from "./client";
import { aiConfig, isDemo, type AiConfig } from "./config";
import * as mock from "./mock";
import type { Scenario } from "./scenarios";
import { CHAIN, validateArgument, validateChatTurn, validateDebate, validateNetwork, validatePair, validateScene, type ArgumentReview, type ChainStep, type ChatTurn, type DebateTurn, type NetNode, type PairItem, type Scene } from "./schemas";

/** What the model is told about a target word (from the dataset). */
export interface WordBrief {
  id: string;
  word: string;
  zh: string;
  example?: string;
  tip?: string;
  syn?: string[];
  ant?: string[];
  col?: string[];
  fam?: string[];
}

const PERSONA =
  "You are Dr. Anita, a warm, precise English coach from OiOi MedAI Academy. You are also a practising anaesthesiologist, so medical and academic contexts feel natural to you. Learners are Chinese speakers preparing for IELTS or using English at work. Keep English natural and at about CEFR B2 unless asked otherwise. Write Chinese explanations in simplified Chinese.";

const wordList = (words: WordBrief[]) => words.map((w) => `- ${w.word} (${w.zh})${w.tip ? ` · tip: ${w.tip}` : ""}`).join("\n");

const cfg = (): AiConfig => aiConfig.get();
const keyOf = (...parts: string[]) => `${cfg().provider}:${cfg().model}:${parts.join("|")}`;

async function cached<T>(key: string, make: () => Promise<T>, force = false): Promise<T> {
  if (!force) {
    const hit = await cacheGet<T>(key);
    if (hit) return hit;
  }
  const v = await make();
  await cacheSet(key, v);
  return v;
}

/** Does the text contain the word (or an inflected form)? */
export const usesWord = (text: string, word: string) => headwordPattern(word).test(text);

/* ---------- Scene Theater ---------- */

export async function generateScene(words: WordBrief[], scenario: Scenario, opts: { force?: boolean; signal?: AbortSignal } = {}): Promise<Scene> {
  const key = keyOf("scene", scenario.id, words.map((w) => w.id).sort().join(","));
  return cached(
    key,
    async () => {
      if (isDemo()) return mock.scene(words, scenario);
      const messages: Message[] = [
        { role: "system", content: `${PERSONA}\nYou write short, vivid learning stories and quiz questions. Reply with ONLY one JSON object, no markdown.` },
        {
          role: "user",
          content: `Scenario: ${scenario.en} (${scenario.zh}).\nTarget words:\n${wordList(words)}\n\nWrite a coherent story of about 150 English words set in this scenario that uses EVERY target word once, in a meaning that matches the Chinese gloss. Then write exactly 3 multiple-choice questions:\n1) type "comprehension": about what happened in the story;\n2) type "fill": a new sentence with ___ where one target word fits, options are 4 target words or close distractors;\n3) type "contrast": "Why is A better than B here?" — compare a target word with a confusable word, options are 4 short explanations in Chinese.\nJSON schema:\n{"title": string (English, max 8 words), "story": string, "storyZh": string (Chinese translation), "questions": [{"type": "comprehension"|"fill"|"contrast", "word": string (the target word tested), "q": string, "options": [4 strings], "answer": 0-3, "explain": string (Chinese, 1-2 sentences)}]}`,
        },
      ];
      return chatJSON(cfg(), messages, validateScene, { signal: opts.signal, maxTokens: 2200 });
    },
    opts.force,
  );
}

/* ---------- Chat with Dr. Anita ---------- */

export function chatOpening(scenario: Scenario, words: WordBrief[]) {
  return `Hi, I'm Dr. Anita. ${mock.openingLine(scenario)} Try to use these words as we talk: ${words.map((w) => w.word).join(", ")}.`;
}

export async function chatTurn(scenario: Scenario, words: WordBrief[], history: { role: "user" | "assistant"; content: string }[], signal?: AbortSignal): Promise<ChatTurn> {
  const last = history[history.length - 1]?.content ?? "";
  if (isDemo()) return mock.chatTurn(scenario, words, last, history.length);
  const messages: Message[] = [
    {
      role: "system",
      content: `${PERSONA}\nRole-play: ${scenario.roles}\nStay in character, keep each reply to 1-3 short sentences and end with a question that invites the learner to use one of the unused target words.\nTarget words the learner should try to use:\n${wordList(words)}\n\nAfter each learner message, reply with ONLY one JSON object:\n{"reply": string (your in-character English reply), "feedback": {"ok": boolean (is the learner's message grammatical and natural), "note": string (Chinese, one short line of feedback), "better": string (a more natural English version of the learner's message, or "" if already natural)}, "used": [{"word": string (target word), "correct": boolean (used with the right meaning and grammar), "comment": string (Chinese, short)}] (only target words that appear in the learner's LAST message)}`,
    },
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.content }) as Message),
  ];
  const turn = await chatJSON(cfg(), messages, validateChatTurn, { signal, maxTokens: 900 });
  // Trust but verify: a word only counts if it actually appears in the learner's message.
  turn.used = turn.used.filter((u) => words.some((w) => w.word.toLowerCase() === u.word.toLowerCase()) && usesWord(last, u.word));
  return turn;
}

/* ---------- Logic training ---------- */

export async function wordNetwork(word: WordBrief, opts: { force?: boolean } = {}): Promise<NetNode[]> {
  return cached(
    keyOf("net", word.id),
    async () => {
      if (isDemo()) return mock.network(word);
      const messages: Message[] = [
        { role: "system", content: `${PERSONA}\nReply with ONLY one JSON object.` },
        {
          role: "user",
          content: `Build a compact word network for "${word.word}" (${word.zh}) useful for IELTS writing. Known data: synonyms ${JSON.stringify(word.syn ?? [])}, antonyms ${JSON.stringify(word.ant ?? [])}, collocations ${JSON.stringify(word.col ?? [])}, family ${JSON.stringify(word.fam ?? [])}.\nAdd 6-10 NEW items not already listed. JSON: {"nodes": [{"word": string, "relation": "synonym"|"antonym"|"collocation"|"family"|"related", "note": string (Chinese, how it differs or when to use, max 20 characters)}]}`,
        },
      ];
      return (await chatJSON(cfg(), messages, validateNetwork)).nodes;
    },
    opts.force,
  );
}

export const TASK2_PROMPTS = [
  "Some people think that governments should spend more on public healthcare than on preventing illness. To what extent do you agree or disagree?",
  "Many universities now offer courses online. Do the advantages of online learning outweigh the disadvantages?",
  "Some argue that artificial intelligence will do more harm than good in medicine. Discuss both views and give your opinion.",
  "Cities should ban private cars from their centres. To what extent do you agree?",
  "Young people should be required to do some unpaid community work. Do you agree or disagree?",
];

export async function reviewArgument(prompt: string, chain: Record<ChainStep, string>, words: WordBrief[]): Promise<ArgumentReview> {
  if (isDemo()) return mock.argument(chain, words);
  const messages: Message[] = [
    { role: "system", content: `${PERSONA}\nYou are an IELTS Writing Task 2 examiner focused on logical coherence. Reply with ONLY one JSON object.` },
    {
      role: "user",
      content: `Task: ${prompt}\nThe learner built an argument chain:\n${CHAIN.map((k) => `${k}: ${chain[k] || "(empty)"}`).join("\n")}\nTarget words to use: ${words.map((w) => w.word).join(", ")}\n\nScore each step 0-3 for logic and relevance (does the reason support the claim, is the evidence specific, does the concession acknowledge a real counter-argument, does the conclusion follow). JSON: {"scores": {"claim":0-3,"reason":0-3,"evidence":0-3,"concession":0-3,"conclusion":0-3}, "comments": {same keys: Chinese, one line each}, "used": [{"word","correct","comment"}], "overall": string (Chinese, 2 sentences), "model": string (an improved English paragraph of 90-130 words that uses the target words)}`,
    },
  ];
  const r = await chatJSON(cfg(), messages, validateArgument, { maxTokens: 1800 });
  const all = CHAIN.map((k) => chain[k]).join(" ");
  r.used = r.used.filter((u) => usesWord(all, u.word));
  return r;
}

export async function debateTurn(motion: string, side: "for" | "against", words: WordBrief[], history: { role: "user" | "assistant"; content: string }[]): Promise<DebateTurn> {
  const last = history[history.length - 1]?.content ?? "";
  if (isDemo()) return mock.debate(motion, side, words, last);
  const messages: Message[] = [
    {
      role: "system",
      content: `${PERSONA}\nYou are debating the motion "${motion}". The learner argues ${side.toUpperCase()}; you argue the opposite side politely but sharply. Each turn: rebut the learner's strongest point in 2-3 sentences, then point out one logical gap (e.g. hasty generalisation, missing evidence, false cause). Target words: ${words.map((w) => w.word).join(", ")}. Reply with ONLY JSON: {"rebuttal": string (English), "critique": string (Chinese, one line naming the logical gap), "used": [{"word","correct","comment"}] (target words in the learner's last message)}`,
    },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content }) as Message),
  ];
  const t = await chatJSON(cfg(), messages, validateDebate, { maxTokens: 900 });
  t.used = t.used.filter((u) => usesWord(last, u.word));
  return t;
}

export async function confusablePair(a: WordBrief, b: string, opts: { force?: boolean } = {}): Promise<PairItem[]> {
  return cached(
    keyOf("pair", a.id, b.toLowerCase()),
    async () => {
      if (isDemo()) return mock.pair(a, b);
      const messages: Message[] = [
        { role: "system", content: `${PERSONA}\nReply with ONLY one JSON object.` },
        {
          role: "user",
          content: `Confusable pair: "${a.word}" (${a.zh}) vs "${b}". Dataset tip: ${a.tip || "(none)"}.\nWrite 4 gap-fill sentences; in each exactly one of the two words fits. Mix which word is correct. JSON: {"items": [{"sentence": string with ___, "options": ["${a.word}", "${b}"], "answer": 0|1, "why": string (Chinese: the reasoning — meaning, grammar or collocation)}]}`,
        },
      ];
      return (await chatJSON(cfg(), messages, validatePair)).items;
    },
    opts.force,
  );
}

/** Deterministic pick of N items for the day. */
export const pickForDay = <T>(xs: T[], n: number, salt: string) => shuffle(xs, hashSeed(salt)).slice(0, n);
