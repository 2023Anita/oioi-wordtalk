import { Check, GitBranch, Lightbulb, MessagesSquare, Scale, Send, Sparkles, Swords, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAtlas } from "../atlas/context";
import { daily, useBriefs, useDaily } from "../ai/daily";
import { CHAIN, type ArgumentReview, type ChainStep, type DebateTurn, type NetNode, type PairItem } from "../ai/schemas";
import { confusablePair, debateTurn, reviewArgument, TASK2_PROMPTS, wordNetwork, type WordBrief } from "../ai/tasks";
import { openWord } from "../lib/router";
import { cue } from "../lib/sound";
import { splitPair } from "../lib/text";
import { logReview } from "../store/session";
import { Rating } from "../store/srs";
import { store } from "../store/store";
import { AiBadge, ErrorNote, WordChips } from "../ui/ai";

type Tab = "net" | "chain" | "debate" | "pair";
const TABS: { id: Tab; label: string; icon: typeof GitBranch }[] = [
  { id: "net", label: "词网", icon: GitBranch },
  { id: "chain", label: "论证链", icon: Scale },
  { id: "debate", label: "辩论", icon: Swords },
  { id: "pair", label: "易混辨析", icon: Lightbulb },
];

function useLookup() {
  const atlas = useAtlas();
  return useMemo(() => {
    const m = new Map<string, string>();
    for (const w of atlas.words) m.set(w.word.toLowerCase(), w.id);
    return (word: string) => m.get(word.toLowerCase().trim());
  }, [atlas]);
}

/** Log correct target-word uses from a logic exercise. */
function logUses(briefs: WordBrief[], used: { word: string; correct: boolean }[]) {
  let n = 0;
  for (const u of used) {
    const w = briefs.find((b) => b.word.toLowerCase() === u.word.toLowerCase());
    if (w && logReview(w.id, u.correct ? Rating.Good : Rating.Hard, "argument") && u.correct) n++;
  }
  return n;
}

export function LogicPage() {
  const d = useDaily();
  const { briefs } = useBriefs(d.ids);
  const [tab, setTab] = useState<Tab>("net");
  return (
    <div className="page wt-page">
      <header className="page-head wt-head">
        <p className="eyebrow">逻辑训练 · Logic</p>
        <h1 className="display">词有关系，论证有骨架</h1>
        <AiBadge />
      </header>
      <nav className="wt-tabs" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`chip-btn ${tab === id ? "is-on" : ""}`} onClick={() => setTab(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>
      {!briefs ? (
        <span className="spinner" />
      ) : tab === "net" ? (
        <Network briefs={briefs} />
      ) : tab === "chain" ? (
        <Chain briefs={briefs} />
      ) : tab === "debate" ? (
        <Debate briefs={briefs} />
      ) : (
        <Pair briefs={briefs} />
      )}
    </div>
  );
}

/* ---------- word network ---------- */

const REL_LABEL: Record<NetNode["relation"], string> = { synonym: "近义", antonym: "反义", collocation: "搭配", family: "词族", related: "相关" };

function baseNodes(w: WordBrief): NetNode[] {
  return [
    ...(w.syn ?? []).map((x) => ({ word: x, relation: "synonym" as const, note: "" })),
    ...(w.ant ?? []).map((x) => ({ word: x, relation: "antonym" as const, note: "" })),
    ...(w.col ?? []).map((x) => ({ word: splitPair(x).en, relation: "collocation" as const, note: splitPair(x).zh })),
    ...(w.fam ?? []).map((x) => ({ word: x.replace(/\s*\(.*\)$/, ""), relation: "family" as const, note: (x.match(/\((.*)\)/) || [])[1] || "" })),
  ];
}

function Network({ briefs }: { briefs: WordBrief[] }) {
  const lookup = useLookup();
  const [sel, setSel] = useState(briefs[0]);
  const [extra, setExtra] = useState<NetNode[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setExtra([]);
    setError(null);
  }, [sel]);
  const nodes = useMemo(() => {
    const seen = new Set<string>();
    return [...baseNodes(sel), ...extra].filter((n) => {
      const k = n.word.toLowerCase();
      if (seen.has(k) || k === sel.word.toLowerCase()) return false;
      seen.add(k);
      return true;
    });
  }, [sel, extra]);
  const expand = async () => {
    setBusy(true);
    setError(null);
    try {
      setExtra(await wordNetwork(sel));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const R = 150;
  // Phones get fewer, larger nodes; the full list is always shown below the map.
  const max = typeof window !== "undefined" && window.innerWidth < 520 ? 10 : 16;
  const shown = nodes.slice(0, max);
  return (
    <section className="panel">
      <WordChips words={briefs} lit={[sel.id]} onPick={setSel} />
      <div className="wt-net" role="img" aria-label={`${sel.word} 的词网`}>
        <svg viewBox="-220 -200 440 400" aria-hidden="true">
          {shown.map((n, i) => {
            const a = (i / Math.max(1, shown.length)) * Math.PI * 2 - Math.PI / 2;
            return <line key={i} x1={0} y1={0} x2={Math.cos(a) * R} y2={Math.sin(a) * R} className={`rel-${n.relation}`} />;
          })}
        </svg>
        <button className="wt-net-center" onClick={() => openWord(sel.id)} lang="en">
          {sel.word}
        </button>
        {shown.map((n, i) => {
          const a = (i / Math.max(1, shown.length)) * Math.PI * 2 - Math.PI / 2;
          const id = lookup(n.word);
          return (
            <button
              key={n.word}
              className={`wt-net-node rel-${n.relation}`}
              style={{ left: `calc(50% + ${(Math.cos(a) * R * 100) / 440}%)`, top: `calc(50% + ${(Math.sin(a) * R * 100) / 400}%)` }}
              onClick={() => id && openWord(id)}
              title={n.note || REL_LABEL[n.relation]}
              disabled={!id}
            >
              <b lang="en">{n.word}</b>
              <small>{REL_LABEL[n.relation]}</small>
            </button>
          );
        })}
      </div>
      <div className="wt-legend">
        {Object.entries(REL_LABEL).map(([k, v]) => (
          <span key={k} className={`rel-${k}`}>
            <i /> {v}
          </span>
        ))}
      </div>
      {nodes.length > max && <p className="muted">还有 {nodes.length - max} 个关联没画在图上，见下方列表。</p>}
      <ul className="wt-netlist">
        {nodes.map((n) => (
          <li key={n.word}>
            <span className={`wt-tag rel-${n.relation}`}>{REL_LABEL[n.relation]}</span> <b lang="en">{n.word}</b> {n.note && <small>{n.note}</small>}
          </li>
        ))}
      </ul>
      {error && <ErrorNote error={error} onRetry={expand} />}
      <button className="btn btn-ghost" onClick={expand} disabled={busy}>
        <Sparkles size={16} /> {busy ? "扩展中…" : "让 AI 扩展词网"}
      </button>
    </section>
  );
}

/* ---------- argument chain ---------- */

const CHAIN_LABEL: Record<ChainStep, [string, string]> = {
  claim: ["论点 Claim", "I believe that…"],
  reason: ["理由 Reason", "This is because…"],
  evidence: ["证据 Evidence", "For example, a study…"],
  concession: ["让步 Concession", "Admittedly, some argue…"],
  conclusion: ["结论 Conclusion", "Therefore…"],
};

function Chain({ briefs }: { briefs: WordBrief[] }) {
  const [pi, setPi] = useState(0);
  const [chain, setChain] = useState<Record<ChainStep, string>>({ claim: "", reason: "", evidence: "", concession: "", conclusion: "" });
  const [result, setResult] = useState<ArgumentReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await reviewArgument(TASK2_PROMPTS[pi], chain, briefs);
      setResult(r);
      logUses(briefs, r.used);
      daily.markDone("logic");
      if (store.get().settings.sfx) void cue("complete");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const total = result ? CHAIN.reduce((n, k) => n + result.scores[k], 0) : 0;
  return (
    <section className="panel">
      <label className="wt-field">
        <span className="eyebrow">雅思大作文题目 · IELTS Task 2</span>
        <select value={pi} onChange={(e) => (setPi(Number(e.target.value)), setResult(null))}>
          {TASK2_PROMPTS.map((p, i) => (
            <option key={i} value={i}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <WordChips words={briefs} />
      <ol className="wt-chain">
        {CHAIN.map((k, i) => (
          <li key={k}>
            <label>
              <span>
                {i + 1}. {CHAIN_LABEL[k][0]}
                {result && <em className={`wt-score s${result.scores[k]}`}>{result.scores[k]}/3</em>}
              </span>
              <textarea rows={2} lang="en" value={chain[k]} placeholder={CHAIN_LABEL[k][1]} onChange={(e) => setChain((c) => ({ ...c, [k]: e.target.value }))} />
            </label>
            {result?.comments[k] && <p className="wt-explain">{result.comments[k]}</p>}
          </li>
        ))}
      </ol>
      {error && <ErrorNote error={error} onRetry={submit} />}
      <button className="btn btn-primary" onClick={submit} disabled={busy || !chain.claim.trim()}>
        {busy ? "Dr. Anita 正在批改…" : "提交批改"}
      </button>
      {result && (
        <div className="wt-result">
          <p className="eyebrow">逻辑得分 {total} / 15</p>
          {result.overall && <p>{result.overall}</p>}
          {result.used.length > 0 && (
            <p className="muted">
              用到的任务词：{result.used.map((u) => `${u.word}${u.correct ? " ✓" : " △"}`).join("、")}（已记入 FSRS · 来源：论证）
            </p>
          )}
          {result.model && (
            <blockquote lang="en" className="wt-model">
              {result.model}
            </blockquote>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- debate ---------- */

function Debate({ briefs }: { briefs: WordBrief[] }) {
  const [pi, setPi] = useState(2);
  const [side, setSide] = useState<"for" | "against">("for");
  const [msgs, setMsgs] = useState<{ role: "user" | "assistant"; content: string; turn?: DebateTurn }[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const motion = TASK2_PROMPTS[pi];
  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    setError(null);
    const history = [...msgs, { role: "user" as const, content: t }];
    setMsgs(history);
    setBusy(true);
    try {
      const turn = await debateTurn(
        motion,
        side,
        briefs,
        history.map((m) => ({ role: m.role, content: m.content })),
      );
      logUses(briefs, turn.used);
      setMsgs([...history.slice(0, -1), { ...history[history.length - 1], turn }, { role: "assistant", content: turn.rebuttal }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel">
      <label className="wt-field">
        <span className="eyebrow">辩题 Motion</span>
        <select value={pi} onChange={(e) => (setPi(Number(e.target.value)), setMsgs([]))}>
          {TASK2_PROMPTS.map((p, i) => (
            <option key={i} value={i}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <div className="wt-row">
        <button className={`chip-btn ${side === "for" ? "is-on" : ""}`} onClick={() => (setSide("for"), setMsgs([]))}>
          我方：支持
        </button>
        <button className={`chip-btn ${side === "against" ? "is-on" : ""}`} onClick={() => (setSide("against"), setMsgs([]))}>
          我方：反对
        </button>
      </div>
      <WordChips words={briefs} onPick={(w) => setText((t) => (t ? `${t} ${w.word}` : w.word))} />
      <div className="wt-thread wt-thread-inline">
        {msgs.length === 0 && <p className="muted">先陈述你的观点（英文）。Dr. Anita 会站在对立面反驳，并指出你推理里的漏洞。</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`wt-msg is-${m.role}`}>
            {m.role === "assistant" && <img className="wt-avatar" src={`${import.meta.env.BASE_URL}brand/anita-avatar.webp`} alt="" aria-hidden="true" width={32} height={32} />}
            <div className="wt-bubble">
              <p lang="en">{m.content}</p>
              {m.turn?.critique && (
                <div className="wt-feedback is-fix">
                  <p>🧩 {m.turn.critique}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <span className="spinner" />}
        {error && <ErrorNote error={error} />}
      </div>
      <form
        className="wt-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <MessagesSquare size={18} className="muted" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="State your argument…" lang="en" aria-label="你的论点" />
        <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()}>
          <Send size={17} />
        </button>
      </form>
    </section>
  );
}

/* ---------- confusable pair ---------- */

function pairCandidate(w: WordBrief) {
  if (w.syn?.length) return w.syn[0];
  if (w.ant?.length) return w.ant[0];
  const fromTip = (w.tip || "").match(/[A-Za-z][A-Za-z-]{2,}/g)?.find((x) => x.toLowerCase() !== w.word.toLowerCase() && !/^(sb|sth|the|and|with|for|of|to|in|on|at)$/i.test(x));
  return fromTip || "";
}

function Pair({ briefs }: { briefs: WordBrief[] }) {
  const usable = briefs.filter((b) => b.tip || b.syn?.length);
  const [sel, setSel] = useState(usable[0] ?? briefs[0]);
  const [other, setOther] = useState(pairCandidate(usable[0] ?? briefs[0]));
  const [items, setItems] = useState<PairItem[] | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pick = (w: WordBrief) => {
    setSel(w);
    setOther(pairCandidate(w));
    setItems(null);
    setPicked({});
  };
  const gen = async () => {
    if (!other.trim()) return;
    setBusy(true);
    setError(null);
    setPicked({});
    try {
      setItems(await confusablePair(sel, other.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const answer = (i: number, o: number) => {
    if (!items || picked[i] !== undefined) return;
    const ok = o === items[i].answer;
    setPicked((p) => ({ ...p, [i]: o }));
    if (store.get().settings.sfx) void cue(ok ? "correct" : "wrong");
    logReview(sel.id, ok ? Rating.Good : Rating.Again, "argument");
  };
  return (
    <section className="panel">
      <WordChips words={briefs} lit={[sel.id]} onPick={pick} />
      {sel.tip && (
        <p className="wt-tip">
          <Lightbulb size={15} /> {sel.tip}
        </p>
      )}
      <div className="wt-row wt-pair-row">
        <b lang="en">{sel.word}</b>
        <span>vs</span>
        <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="易混词，如 affect" lang="en" aria-label="易混词" />
        <button className="btn btn-primary" onClick={gen} disabled={busy || !other.trim()}>
          {busy ? "生成中…" : "开始辨析"}
        </button>
      </div>
      {error && <ErrorNote error={error} onRetry={gen} />}
      {items && (
        <ol className="wt-pair">
          {items.map((it, i) => (
            <li key={i}>
              <p lang="en">{it.sentence}</p>
              <div className="wt-row">
                {it.options.map((o, oi) => {
                  const p = picked[i];
                  const state = p === undefined ? "" : oi === it.answer ? "is-right" : oi === p ? "is-wrong" : "is-dim";
                  return (
                    <button key={oi} className={`wt-option ${state}`} onClick={() => answer(i, oi)} disabled={p !== undefined} lang="en">
                      {o} {state === "is-right" && <Check size={15} />}
                      {state === "is-wrong" && <X size={15} />}
                    </button>
                  );
                })}
              </div>
              {picked[i] !== undefined && it.why && <p className="wt-explain">{it.why}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
