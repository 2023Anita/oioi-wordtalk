import { arr, bool, int, obj, oneOf, optStr, str } from "./json";

/* ---------- Scene Theater ---------- */

export const QUESTION_TYPES = ["comprehension", "fill", "contrast"] as const;
export interface SceneQuestion {
  type: (typeof QUESTION_TYPES)[number];
  word: string;
  q: string;
  options: string[];
  answer: number;
  explain: string;
}
export interface Scene {
  title: string;
  story: string;
  storyZh: string;
  questions: SceneQuestion[];
}

export function validateScene(v: unknown): Scene {
  const o = obj(v, "scene");
  const questions = arr(
    o.questions,
    "questions",
    (x, p) => {
      const q = obj(x, p);
      const options = arr(q.options, `${p}.options`, (y, pp) => str(y, pp, { max: 200 }), { min: 2, max: 4 });
      return {
        type: oneOf(q.type, `${p}.type`, QUESTION_TYPES),
        word: str(q.word, `${p}.word`, { max: 60 }),
        q: str(q.q, `${p}.q`, { max: 600 }),
        options,
        answer: int(q.answer, `${p}.answer`, 0, options.length - 1),
        explain: optStr(q.explain, 600),
      };
    },
    { min: 1, max: 5 },
  );
  return { title: str(o.title, "title", { max: 120 }), story: str(o.story, "story", { min: 40, max: 3000 }), storyZh: optStr(o.storyZh, 3000), questions };
}

/* ---------- Chat with Dr. Anita ---------- */

export interface WordUse {
  word: string;
  correct: boolean;
  comment: string;
}
export interface ChatTurn {
  reply: string;
  feedback: { ok: boolean; note: string; better: string };
  used: WordUse[];
}

const wordUse = (x: unknown, p: string): WordUse => {
  const u = obj(x, p);
  return { word: str(u.word, `${p}.word`, { max: 60 }), correct: bool(u.correct, `${p}.correct`), comment: optStr(u.comment, 300) };
};

export function validateChatTurn(v: unknown): ChatTurn {
  const o = obj(v, "turn");
  const f = obj(o.feedback ?? {}, "feedback");
  return {
    reply: str(o.reply, "reply", { max: 1500 }),
    feedback: { ok: f.ok === undefined ? true : bool(f.ok, "feedback.ok"), note: optStr(f.note, 400), better: optStr(f.better, 400) },
    used: o.used === undefined ? [] : arr(o.used, "used", wordUse, { max: 12 }),
  };
}

/* ---------- Logic: word network ---------- */

export const RELATIONS = ["synonym", "antonym", "collocation", "family", "related"] as const;
export interface NetNode {
  word: string;
  relation: (typeof RELATIONS)[number];
  note: string;
}
export function validateNetwork(v: unknown): { nodes: NetNode[] } {
  const o = obj(v, "network");
  return {
    nodes: arr(
      o.nodes,
      "nodes",
      (x, p) => {
        const n = obj(x, p);
        return { word: str(n.word, `${p}.word`, { max: 60 }), relation: oneOf(n.relation, `${p}.relation`, RELATIONS), note: optStr(n.note, 200) };
      },
      { min: 1, max: 16 },
    ),
  };
}

/* ---------- Logic: argument chain ---------- */

export const CHAIN = ["claim", "reason", "evidence", "concession", "conclusion"] as const;
export type ChainStep = (typeof CHAIN)[number];
export interface ArgumentReview {
  scores: Record<ChainStep, number>;
  comments: Record<ChainStep, string>;
  used: WordUse[];
  overall: string;
  model: string;
}
export function validateArgument(v: unknown): ArgumentReview {
  const o = obj(v, "argument");
  const s = obj(o.scores, "scores");
  const c = obj(o.comments ?? {}, "comments");
  const scores = {} as Record<ChainStep, number>;
  const comments = {} as Record<ChainStep, string>;
  for (const k of CHAIN) {
    scores[k] = int(s[k], `scores.${k}`, 0, 3);
    comments[k] = optStr(c[k], 400);
  }
  return { scores, comments, used: o.used === undefined ? [] : arr(o.used, "used", wordUse, { max: 12 }), overall: optStr(o.overall, 800), model: optStr(o.model, 2500) };
}

/* ---------- Logic: debate ---------- */

export interface DebateTurn {
  rebuttal: string;
  critique: string;
  used: WordUse[];
}
export function validateDebate(v: unknown): DebateTurn {
  const o = obj(v, "debate");
  return { rebuttal: str(o.rebuttal, "rebuttal", { max: 1500 }), critique: optStr(o.critique, 600), used: o.used === undefined ? [] : arr(o.used, "used", wordUse, { max: 12 }) };
}

/* ---------- Logic: confusable pair ---------- */

export interface PairItem {
  sentence: string;
  options: [string, string];
  answer: 0 | 1;
  why: string;
}
export function validatePair(v: unknown): { items: PairItem[] } {
  const o = obj(v, "pair");
  return {
    items: arr(
      o.items,
      "items",
      (x, p) => {
        const it = obj(x, p);
        const opts = arr(it.options, `${p}.options`, (y, pp) => str(y, pp, { max: 60 }), { min: 2, max: 2 });
        return { sentence: str(it.sentence, `${p}.sentence`, { max: 400 }), options: [opts[0], opts[1]] as [string, string], answer: int(it.answer, `${p}.answer`, 0, 1) as 0 | 1, why: optStr(it.why, 400) };
      },
      { min: 1, max: 6 },
    ),
  };
}
