/**
 * Offline demo "model": builds content from the dataset itself so every flow
 * works without an API key. It is honest about being a demo in its wording.
 */
import { headwordPattern, splitPair } from "../lib/text";
import type { Scenario } from "./scenarios";
import { CHAIN, type ArgumentReview, type ChainStep, type ChatTurn, type DebateTurn, type NetNode, type PairItem, type Scene, type SceneQuestion } from "./schemas";
import type { WordBrief } from "./tasks";

const uses = (text: string, word: string) => headwordPattern(word).test(text);

const OPENERS: Record<string, string> = {
  airport: "Welcome to the check-in desk. Where are you flying today?",
  renting: "Thanks for coming to see the flat. What are you looking for in a place?",
  doctor: "Please have a seat. What brings you in today?",
  "cafe-interview": "Thanks for coming in. Tell me a little about yourself.",
  "hospital-or": "Welcome to theatre. Have you scrubbed in before?",
  conference: "Thank you for your talk. Could you summarise your main finding?",
  campus: "Good to meet you. What would you like to research this year?",
  restaurant: "Good evening! Do you have any dietary requirements?",
};
export const openingLine = (s: Scenario) => OPENERS[s.id] ?? "Shall we begin?";

export function scene(words: WordBrief[], scenario: Scenario): Scene {
  const lines = words.map((w) => w.example || `I had to think about the word "${w.word}" for a moment.`);
  const story = `[Demo] ${scenario.en}. ${lines.join(" ")} By the end of the day, every new word had found its place.`;
  const first = words[0];
  const second = words[1] ?? words[0];
  const fillSrc = second.example && uses(second.example, second.word) ? second.example.replace(headwordPattern(second.word), "___") : `I need to ___ this before Friday.`;
  const others = words.filter((w) => w.id !== second.id).map((w) => w.word);
  const fillOpts = [second.word, ...others.slice(0, 3)];
  while (fillOpts.length < 4) fillOpts.push(["however", "therefore", "despite"][fillOpts.length - 1]);
  const rot = second.word.length % 4;
  const rotated = [...fillOpts.slice(rot), ...fillOpts.slice(0, rot)];
  const q: SceneQuestion[] = [
    {
      type: "comprehension",
      word: first.word,
      q: `In the story, what does "${first.word}" mean?`,
      options: [first.zh, ...(words.slice(1, 4).map((w) => w.zh))].slice(0, 4),
      answer: 0,
      explain: `“${first.word}” 在这里的意思是：${first.zh}。`,
    },
    { type: "fill", word: second.word, q: fillSrc, options: rotated, answer: rotated.indexOf(second.word), explain: `这里需要 “${second.word}”（${second.zh}）。` },
  ];
  const third = words.find((w) => w.tip) ?? words[2] ?? first;
  const alt = third.syn?.[0] || "a similar word";
  q.push({
    type: "contrast",
    word: third.word,
    q: `Why does the story use "${third.word}" rather than "${alt}"?`,
    options: [third.tip || `“${third.word}” 更贴合这个语境的含义：${third.zh}`, "两个词完全可以互换，没有区别", "因为它更短", "因为它是名词"],
    answer: 0,
    explain: third.tip || `看语境和搭配：${third.zh}。`,
  });
  // Shuffle the comprehension options deterministically while keeping the answer.
  const c = q[0];
  const shift = first.word.length % c.options.length;
  c.options = [...c.options.slice(shift), ...c.options.slice(0, shift)];
  c.answer = (c.options.length - shift) % c.options.length;
  return { title: `${scenario.en} (demo)`, story, storyZh: "演示模式：故事由词库例句拼接而成。填写 API Key 后，Dr. Anita 会为你写一篇连贯的新故事。", questions: q };
}

export function chatTurn(scenario: Scenario, words: WordBrief[], last: string, n: number): ChatTurn {
  const used = words.filter((w) => uses(last, w.word)).map((w) => ({ word: w.word, correct: true, comment: "演示模式：检测到你用了这个词。" }));
  const unused = words.filter((w) => !uses(last, w.word));
  const nudge = unused[n % Math.max(1, unused.length)];
  const ok = /^[A-Z]/.test(last.trim()) && /[.?!]$/.test(last.trim());
  return {
    reply: `${used.length ? "Nice, that sounds natural. " : "I see. "}${nudge ? `Could you tell me more, maybe using "${nudge.word}"?` : "You've used all the words — well done!"} (${scenario.en} · demo)`,
    feedback: { ok, note: ok ? "演示模式：句子格式看起来没问题。" : "演示模式：记得句首大写、句末加标点。", better: ok ? "" : `${last.trim().charAt(0).toUpperCase()}${last.trim().slice(1)}${/[.?!]$/.test(last.trim()) ? "" : "."}` },
    used,
  };
}

export function network(w: WordBrief): NetNode[] {
  const nodes: NetNode[] = [
    ...(w.syn ?? []).map((x) => ({ word: x, relation: "synonym" as const, note: "近义" })),
    ...(w.ant ?? []).map((x) => ({ word: x, relation: "antonym" as const, note: "反义" })),
    ...(w.col ?? []).map((x) => ({ word: splitPair(x).en, relation: "collocation" as const, note: splitPair(x).zh })),
    ...(w.fam ?? []).map((x) => ({ word: x.replace(/\s*\(.*\)$/, ""), relation: "family" as const, note: (x.match(/\((.*)\)/) || [])[1] || "词族" })),
  ];
  return nodes.length ? nodes.slice(0, 14) : [{ word: w.word, relation: "related", note: "演示模式：此词暂无关联数据" }];
}

export function argument(chain: Record<ChainStep, string>, words: WordBrief[]): ArgumentReview {
  const scores = {} as Record<ChainStep, number>;
  const comments = {} as Record<ChainStep, string>;
  const cues: Record<ChainStep, RegExp> = {
    claim: /\b(i (believe|agree|disagree)|should|must|in my (view|opinion))\b/i,
    reason: /\b(because|since|as|due to|this is why)\b/i,
    evidence: /\b(for example|for instance|study|studies|data|research|%|percent|survey)\b/i,
    concession: /\b(although|admittedly|while|it is true that|some (people )?(argue|claim)|however)\b/i,
    conclusion: /\b(therefore|thus|in conclusion|overall|consequently|so)\b/i,
  };
  for (const k of CHAIN) {
    const t = chain[k] || "";
    const len = t.split(/\s+/).filter(Boolean).length;
    scores[k] = !t ? 0 : Math.min(3, (len >= 8 ? 1 : 0) + (len >= 16 ? 1 : 0) + (cues[k].test(t) ? 1 : 0));
    comments[k] = !t ? "还没写。" : cues[k].test(t) ? "演示模式：有清晰的信号词。" : "演示模式：可以加一个信号词让逻辑更清楚。";
  }
  const all = CHAIN.map((k) => chain[k]).join(" ");
  return {
    scores,
    comments,
    used: words.filter((w) => uses(all, w.word)).map((w) => ({ word: w.word, correct: true, comment: "演示模式：已使用" })),
    overall: "演示模式只按信号词和长度粗评。接入模型后，Dr. Anita 会逐步检查推理是否成立，并给出范文。",
    model: "",
  };
}

export function debate(motion: string, side: "for" | "against", words: WordBrief[], last: string): DebateTurn {
  const general = /\b(all|every|always|never|everyone|nobody)\b/i.test(last);
  return {
    rebuttal: `[Demo] I see your point, but I would argue ${side === "for" ? "against" : "for"} the motion "${motion}". What specific evidence supports your view?`,
    critique: general ? "以偏概全：用了 all / always / never 这类绝对词。" : /\b(because|since|for example)\b/i.test(last) ? "演示模式：有理由或例子，不错。" : "缺少论据：试着加 because… / for example…",
    used: words.filter((w) => uses(last, w.word)).map((w) => ({ word: w.word, correct: true, comment: "演示模式：已使用" })),
  };
}

export function pair(a: WordBrief, b: string): PairItem[] {
  const items: PairItem[] = [];
  if (a.example && uses(a.example, a.word)) items.push({ sentence: a.example.replace(headwordPattern(a.word), "___"), options: [a.word, b], answer: 0, why: a.tip || `例句里的意思是“${a.zh}”。` });
  items.push({ sentence: `Think about meaning: which word means “${a.zh}”? ___`, options: [a.word, b], answer: 0, why: a.tip || "演示模式：按释义判断。" });
  return items;
}
