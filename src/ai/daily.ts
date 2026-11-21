import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAtlas } from "../atlas/context";
import type { Atlas, Entry } from "../atlas/types";
import { hashSeed, shuffle } from "../lib/text";
import { nextNew, todayPlan } from "../store/session";
import { dayKey, store, type Progress, type Settings } from "../store/store";
import { SCENARIOS } from "./scenarios";
import type { WordBrief } from "./tasks";

/** Today's practice set shared by Scene Theater, Chat and Logic. */
export interface Daily {
  day: string;
  scenario: string;
  ids: string[];
  /** Steps of the daily plan the learner finished today. */
  done: string[];
}

const KEY = "oioi-wordtalk:daily";
const subs = new Set<() => void>();
let cur: Daily | null = (() => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null") as Daily | null;
  } catch {
    return null;
  }
})();

function save(d: Daily) {
  cur = d;
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f());
}

/** Pick 5–8 words: today's new words first, then due reviews, then recent words. */
export function pickWords(atlas: Atlas, p: Progress, s: Settings, salt = "") {
  const plan = todayPlan(atlas, p, s);
  const seenToday = Object.entries(p.cards)
    .filter(([, c]) => dayKey(new Date(c.seen)) === dayKey())
    .map(([id]) => id);
  const pool = [...new Set([...seenToday, ...plan.fresh.slice(0, 5), ...plan.due])];
  let ids = shuffle(pool.slice(0, 16), hashSeed(dayKey() + salt)).slice(0, 8);
  if (ids.length < 5) {
    const extra = nextNew(atlas, p, s, 12).filter((id) => !ids.includes(id));
    ids = [...ids, ...shuffle(extra, hashSeed(salt || "x")).slice(0, 6 - ids.length)];
  }
  return ids.filter((id) => atlas.byId.has(id)).slice(0, 8);
}

export function ensureDaily(atlas: Atlas): Daily {
  const today = dayKey();
  if (cur && cur.day === today && cur.ids.every((id) => atlas.byId.has(id)) && cur.ids.length >= 5) return cur;
  const { progress, settings } = store.get();
  const d: Daily = { day: today, scenario: SCENARIOS[hashSeed(today) % SCENARIOS.length].id, ids: pickWords(atlas, progress, settings), done: [] };
  save(d);
  return d;
}

export const daily = {
  get: () => cur,
  set(patch: Partial<Daily>) {
    if (cur) save({ ...cur, ...patch });
  },
  reshuffle(atlas: Atlas) {
    const { progress, settings } = store.get();
    if (cur) save({ ...cur, ids: pickWords(atlas, progress, settings, String(Date.now())) });
  },
  markDone(step: string) {
    if (cur && !cur.done.includes(step)) save({ ...cur, done: [...cur.done, step] });
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

export function useDaily() {
  const atlas = useAtlas();
  const d = useSyncExternalStore(daily.subscribe, daily.get, daily.get);
  const today = dayKey();
  useEffect(() => {
    if (!d || d.day !== today) ensureDaily(atlas);
  }, [atlas, d, today]);
  return d && d.day === today ? d : ensureDaily(atlas);
}

export const brief = (e: Entry): WordBrief => ({
  id: e.id,
  word: e.w,
  zh: e.senses.map((s) => `${s.pos} ${s.zh}`).join("；"),
  example: e.ex[0]?.en,
  tip: e.tip,
  syn: e.syn,
  ant: e.ant,
  col: e.col,
  fam: e.fam,
});

/** Load full entries for ids and expose them as briefs. */
export function useBriefs(ids: string[]) {
  const atlas = useAtlas();
  const key = ids.join(",");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  useEffect(() => {
    let live = true;
    setEntries(null);
    Promise.all(ids.map((id) => atlas.entry(id).catch(() => null))).then((list) => live && setEntries(list.filter((x): x is Entry => !!x)));
    return () => {
      live = false;
    };
  }, [atlas, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const briefs = useMemo(() => entries?.map(brief) ?? null, [entries]);
  return { entries, briefs };
}
