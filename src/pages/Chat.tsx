import { ArrowRight, Check, Mic, MicOff, RotateCcw, Send, Sparkles, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { daily, useBriefs, useDaily } from "../ai/daily";
import { scenarioById, SCENARIOS } from "../ai/scenarios";
import type { ChatTurn } from "../ai/schemas";
import { chatOpening, chatTurn } from "../ai/tasks";
import { go } from "../lib/router";
import { cue } from "../lib/sound";
import { logReview } from "../store/session";
import { Rating } from "../store/srs";
import { store } from "../store/store";
import { isDemo } from "../ai/config";
import { AiBadge, AiMeta, ErrorNote, MEDICAL_SCENARIOS, MedicalNotice, WordChips } from "../ui/ai";
import { toast } from "../ui/Toast";

const AVATAR = `${import.meta.env.BASE_URL}brand/anita-avatar.webp`;

interface Msg {
  role: "user" | "assistant";
  content: string;
  turn?: ChatTurn;
  /** Where an assistant reply came from: the model, the offline demo, or the fixed opening line. */
  src?: "ai" | "demo";
}

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onend: () => void;
  onerror: () => void;
};
const SR = (typeof window !== "undefined" && ((window as unknown as { SpeechRecognition?: new () => Recognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition)) || null;

const storeKey = (day: string, scenario: string) => `oioi-wordtalk:chat:${day}:${scenario}`;

export function ChatPage() {
  const d = useDaily();
  const scenario = scenarioById(d.scenario);
  const { briefs } = useBriefs(d.ids);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [lit, setLit] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const key = storeKey(d.day, d.scenario);

  // Restore or open the conversation for today's scene.
  useEffect(() => {
    if (!briefs) return;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null") as { msgs: Msg[]; lit: string[] } | null;
      if (saved?.msgs?.length) {
        setMsgs(saved.msgs);
        setLit(saved.lit || []);
        return;
      }
    } catch {
      /* ignore */
    }
    setMsgs([{ role: "assistant", content: chatOpening(scenario, briefs) }]);
    setLit([]);
  }, [briefs, key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (msgs.length)
      try {
        localStorage.setItem(key, JSON.stringify({ msgs: msgs.slice(-40), lit }));
      } catch {
        /* ignore */
      }
    // Scroll only the thread, never the page: opening the chat must not jump past the header.
    const thread = end.current?.parentElement;
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [msgs, lit, key, busy]);

  const send = async (content: string) => {
    const t = content.trim();
    if (!t || busy || !briefs) return;
    setText("");
    setError(null);
    const history: Msg[] = [...msgs, { role: "user", content: t }];
    setMsgs(history);
    setBusy(true);
    try {
      const turn = await chatTurn(
        scenario,
        briefs,
        history.map((m) => ({ role: m.role, content: m.content })),
      );
      const newly: string[] = [];
      for (const u of turn.used) {
        const w = briefs.find((b) => b.word.toLowerCase() === u.word.toLowerCase());
        if (!w) continue;
        if (u.correct && !lit.includes(w.id)) {
          newly.push(w.id);
          logReview(w.id, Rating.Good, "chat");
        } else if (!u.correct) logReview(w.id, Rating.Hard, "chat");
      }
      if (newly.length) {
        if (store.get().settings.sfx) void cue("ignite");
        toast(`点亮 ${newly.length} 颗星 ✦`, "ok");
      }
      const nextLit = [...lit, ...newly];
      setLit(nextLit);
      if (nextLit.length >= Math.min(briefs.length, 5)) daily.markDone("chat");
      setMsgs((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { ...copy[copy.length - 1], turn };
        return [...copy, { role: "assistant", content: turn.reply, src: isDemo() ? "demo" : "ai" }];
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleMic = () => {
    if (!SR) return toast("这个浏览器不支持语音输入，可以用键盘自带的听写。", "warn");
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      const said = Array.from(e.results)
        .map((x) => x[0].transcript)
        .join(" ");
      setText(said);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  const restart = () => {
    localStorage.removeItem(key);
    if (briefs) setMsgs([{ role: "assistant", content: chatOpening(scenario, briefs) }]);
    setLit([]);
  };

  return (
    <div className="page wt-page wt-chat-page">
      <header className="page-head wt-head">
        <p className="eyebrow">边学边聊 · Chat with Dr. Anita</p>
        <h1 className="display">用出来，才算会了</h1>
        <AiBadge />
      </header>

      <section className="panel">
        <div className="chips-scroll wt-scenes">
          {SCENARIOS.map((s) => (
            <button key={s.id} className={`chip-btn ${s.id === scenario.id ? "is-on" : ""}`} onClick={() => daily.set({ scenario: s.id })}>
              <span aria-hidden="true">{s.emoji}</span> {s.zh}
            </button>
          ))}
        </div>
        <div className="panel-head wt-mt">
          <h3 className="eyebrow">
            任务词 · 已点亮 {lit.length}/{briefs?.length ?? 0} <Star size={12} fill="currentColor" />
          </h3>
          <button className="link" onClick={restart}>
            <RotateCcw size={14} /> 重新开始
          </button>
        </div>
        {briefs ? <WordChips words={briefs} lit={lit} onPick={(w) => setText((t) => (t ? `${t} ${w.word}` : w.word))} /> : <span className="spinner" />}
        <p className="muted wt-hint">点词把它插入输入框；用对一个词就点亮一颗星，并记一次 FSRS 复习（来源：对话）。</p>
        <MedicalNotice compact={!MEDICAL_SCENARIOS.has(scenario.id)} />
      </section>

      <section className="panel wt-thread" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`wt-msg is-${m.role}`}>
            {m.role === "assistant" && <img className="wt-avatar" src={AVATAR} alt="" aria-hidden="true" width={32} height={32} />}
            <div className="wt-bubble">
              <p lang="en">{m.content}</p>
              {m.role === "assistant" && m.src && <AiMeta text={m.content} where={`Chat · ${scenario.en}`} demo={m.src === "demo"} />}
              {m.turn && (
                <div className={`wt-feedback ${m.turn.feedback.ok ? "is-ok" : "is-fix"}`}>
                  {m.turn.feedback.note && (
                    <p>
                      {m.turn.feedback.ok ? <Check size={13} /> : "✎"} {m.turn.feedback.note}
                    </p>
                  )}
                  {m.turn.feedback.better && (
                    <p lang="en">
                      更自然：<i>{m.turn.feedback.better}</i>
                    </p>
                  )}
                  {m.turn.used.map((u) => (
                    <p key={u.word} className={u.correct ? "wt-used-ok" : "wt-used-bad"}>
                      {u.correct ? <Star size={12} fill="currentColor" /> : "△"} <b lang="en">{u.word}</b> {u.comment}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="wt-msg is-assistant">
            <img className="wt-avatar" src={AVATAR} alt="" aria-hidden="true" width={32} height={32} />
            <div className="wt-bubble">
              <span className="spinner" />
            </div>
          </div>
        )}
        {error && <ErrorNote error={error} />}
        <div ref={end} />
      </section>

      <form
        className="wt-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <button type="button" className={`icon-btn ${listening ? "is-on" : ""}`} onClick={toggleMic} aria-label={listening ? "停止语音输入" : "语音输入"} title={SR ? "语音输入（英语）" : "此浏览器不支持语音输入"}>
          {listening ? <MicOff size={19} /> : <Mic size={19} />}
        </button>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="用英语回复，试着用上任务词…" lang="en" aria-label="你的回复" autoComplete="off" />
        <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()}>
          <Send size={17} />
        </button>
      </form>

      {briefs && lit.length >= Math.min(briefs.length, 5) && (
        <div className="panel wt-done">
          <p>
            <Sparkles size={18} /> 漂亮！今天的任务词基本都用出来了。
          </p>
          <button className="btn btn-primary" onClick={() => go({ page: "logic" })}>
            下一步：逻辑训练 <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
