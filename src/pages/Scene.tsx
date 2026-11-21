import { ArrowRight, Check, Languages, RefreshCw, Shuffle, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAtlas } from "../atlas/context";
import { daily, useBriefs, useDaily } from "../ai/daily";
import { scenarioById, SCENARIOS } from "../ai/scenarios";
import type { Scene as SceneT } from "../ai/schemas";
import { generateScene } from "../ai/tasks";
import { go } from "../lib/router";
import { cue } from "../lib/sound";
import { logReview } from "../store/session";
import { Rating } from "../store/srs";
import { store } from "../store/store";
import { AiBadge, AiMeta, ErrorNote, MEDICAL_SCENARIOS, MedicalNotice, StoryText, WordChips } from "../ui/ai";

const QLABEL = { comprehension: "理解", fill: "填空", contrast: "为什么是 A 不是 B" } as const;

export function ScenePage() {
  const atlas = useAtlas();
  const d = useDaily();
  const scenario = scenarioById(d.scenario);
  const { briefs } = useBriefs(d.ids);
  const [scene, setScene] = useState<SceneT | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zh, setZh] = useState(false);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const abort = useRef<AbortController | null>(null);

  const run = async (force = false) => {
    if (!briefs?.length) return;
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setLoading(true);
    setError(null);
    setPicked({});
    try {
      const s = await generateScene(briefs, scenario, { force, signal: ac.signal });
      if (!ac.signal.aborted) setScene(s);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    setScene(null);
    if (briefs?.length) void run(false);
    return () => abort.current?.abort();
  }, [briefs, d.scenario]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (qi: number, oi: number) => {
    if (!scene || picked[qi] !== undefined) return;
    const q = scene.questions[qi];
    const correct = oi === q.answer;
    setPicked((p) => ({ ...p, [qi]: oi }));
    if (store.get().settings.sfx) void cue(correct ? "correct" : "wrong");
    const w = briefs?.find((b) => b.word.toLowerCase() === q.word.toLowerCase());
    if (w) logReview(w.id, correct ? Rating.Good : Rating.Again, "scene");
    const answered = Object.keys(picked).length + 1;
    if (answered >= scene.questions.length) daily.markDone("scene");
  };

  const score = scene ? scene.questions.filter((q, i) => picked[i] === q.answer).length : 0;
  const finished = scene && Object.keys(picked).length >= scene.questions.length;

  return (
    <div className="page wt-page">
      <header className="page-head wt-head">
        <p className="eyebrow">场景剧场 · Scene Theater</p>
        <h1 className="display">把今天的词，放进一个故事里</h1>
        <AiBadge />
      </header>

      <section className="panel">
        <div className="panel-head">
          <h3 className="eyebrow">选一个场景</h3>
        </div>
        <div className="chips-scroll wt-scenes">
          {SCENARIOS.map((s) => (
            <button key={s.id} className={`chip-btn ${s.id === scenario.id ? "is-on" : ""}`} onClick={() => daily.set({ scenario: s.id })}>
              <span aria-hidden="true">{s.emoji}</span> {s.zh}
            </button>
          ))}
        </div>
        <div className="panel-head wt-mt">
          <h3 className="eyebrow">今天的 {d.ids.length} 个词</h3>
          <button className="link" onClick={() => daily.reshuffle(atlas)}>
            <Shuffle size={14} /> 换一组
          </button>
        </div>
        {briefs ? <WordChips words={briefs} /> : <span className="spinner" />}
        {MEDICAL_SCENARIOS.has(scenario.id) && <MedicalNotice />}
      </section>

      <section className="panel wt-stage" aria-busy={loading}>
        {loading && (
          <div className="wt-loading">
            <span className="spinner" />
            <p>Dr. Anita 正在写故事…</p>
          </div>
        )}
        {error && <ErrorNote error={error} onRetry={() => run(true)} />}
        {scene && !loading && (
          <>
            <div className="panel-head">
              <h2 className="wt-title" lang="en">
                {scenario.emoji} {scene.title}
              </h2>
              <div className="wt-row">
                {scene.storyZh && (
                  <button className={`icon-btn ${zh ? "is-on" : ""}`} onClick={() => setZh((v) => !v)} aria-label="显示中文" title="显示中文">
                    <Languages size={18} />
                  </button>
                )}
                <button className="icon-btn" onClick={() => run(true)} aria-label="重新生成" title="重新生成">
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>
            {briefs && <StoryText text={scene.story} words={briefs} />}
            {zh && <p className="wt-zh">{scene.storyZh}</p>}
            <AiMeta text={`${scene.title}\n${scene.story}`} where={`Scene · ${scenario.en}`} demo={scene.title.endsWith("(demo)")} />
            <p className="muted wt-hint">点高亮的词，打开它的词卡和插画。</p>
          </>
        )}
      </section>

      {scene && !loading && (
        <section className="wt-quiz">
          {scene.questions.map((q, qi) => {
            const p = picked[qi];
            return (
              <article key={qi} className="panel wt-q">
                <p className="eyebrow">
                  {qi + 1} · {QLABEL[q.type]}
                </p>
                <p className="wt-q-text" lang={q.type === "contrast" ? undefined : "en"}>
                  {q.q}
                </p>
                <ol className="wt-options">
                  {q.options.map((o, oi) => {
                    const state = p === undefined ? "" : oi === q.answer ? "is-right" : oi === p ? "is-wrong" : "is-dim";
                    return (
                      <li key={oi}>
                        <button className={`wt-option ${state}`} onClick={() => choose(qi, oi)} disabled={p !== undefined}>
                          <span>{String.fromCharCode(65 + oi)}</span>
                          {o}
                          {state === "is-right" && <Check size={16} />}
                          {state === "is-wrong" && <X size={16} />}
                        </button>
                      </li>
                    );
                  })}
                </ol>
                {p !== undefined && q.explain && <p className="wt-explain">{q.explain}</p>}
              </article>
            );
          })}
          {finished && (
            <div className="panel wt-done">
              <p>
                <Sparkles size={18} /> 答对 {score} / {scene.questions.length}。这些结果已记入 FSRS（来源：场景测验）。
              </p>
              <button className="btn btn-primary" onClick={() => go({ page: "chat" })}>
                下一步：和 Dr. Anita 聊聊 <ArrowRight size={18} />
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
