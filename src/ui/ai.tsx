import { Cpu, Settings2, Star } from "lucide-react";
import { useAtlas } from "../atlas/context";
import { isDemo, useAiConfig } from "../ai/config";
import { presetById } from "../ai/providers";
import type { WordBrief } from "../ai/tasks";
import { headwordPattern } from "../lib/text";
import { openWord } from "../lib/router";
import { Speak } from "./Speak";

/** Shows which model is active; links to the model settings. */
export function AiBadge() {
  const cfg = useAiConfig();
  const demo = isDemo(cfg);
  return (
    <a className={`wt-badge ${demo ? "is-demo" : ""}`} href="#/settings" title="模型设置">
      {demo ? <Settings2 size={14} /> : <Cpu size={14} />}
      {demo ? "演示模式 · 去填 API Key" : `${presetById(cfg.provider).label.split("（")[0]} · ${cfg.model}`}
    </a>
  );
}

/** Story text with target words highlighted; tapping one opens its word card. */
export function StoryText({ text, words }: { text: string; words: WordBrief[] }) {
  type Part = { t: string; id?: string };
  let parts: Part[] = [{ t: text }];
  for (const w of words) {
    const re = new RegExp(headwordPattern(w.word).source, "gi");
    parts = parts.flatMap((p) => {
      if (p.id) return [p];
      const out: Part[] = [];
      let last = 0;
      for (const m of p.t.matchAll(re)) {
        const i = m.index ?? 0;
        if (i > last) out.push({ t: p.t.slice(last, i) });
        out.push({ t: m[0], id: w.id });
        last = i + m[0].length;
      }
      if (last < p.t.length) out.push({ t: p.t.slice(last) });
      return out;
    });
  }
  return (
    <p className="wt-story" lang="en">
      {parts.map((p, i) =>
        p.id ? (
          <button key={i} className="wt-hl" onClick={() => openWord(p.id!)}>
            {p.t}
          </button>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </p>
  );
}

/** Target word chips; lit ones show a gold star. */
export function WordChips({ words, lit = [], onPick }: { words: WordBrief[]; lit?: string[]; onPick?: (w: WordBrief) => void }) {
  const atlas = useAtlas();
  return (
    <ul className="wt-chips">
      {words.map((w) => {
        const ref = atlas.byId.get(w.id);
        const on = lit.includes(w.id);
        return (
          <li key={w.id} className={on ? "is-lit" : ""}>
            <button className="wt-chip" onClick={() => (onPick ? onPick(w) : openWord(w.id))} title={w.zh}>
              {on && <Star size={13} fill="currentColor" />}
              <b lang="en">{w.word}</b>
              <small>{w.zh.split("；")[0].replace(/^[a-z.]+\s*/, "")}</small>
            </button>
            {ref && <Speak url={atlas.audio(ref, "uk")} text={w.word} size="sm" />}
          </li>
        );
      })}
    </ul>
  );
}

export function ErrorNote({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="wt-error" role="alert">
      <p>{error}</p>
      <div className="wt-row">
        {onRetry && (
          <button className="btn btn-ghost" onClick={onRetry}>
            重试
          </button>
        )}
        <a className="btn btn-ghost" href="#/settings">
          检查模型设置
        </a>
      </div>
    </div>
  );
}
