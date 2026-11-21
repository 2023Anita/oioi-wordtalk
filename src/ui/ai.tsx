import { Cpu, Flag, Settings2, Sparkles, Stethoscope, Star } from "lucide-react";
import { useAtlas } from "../atlas/context";
import { isDemo, useAiConfig } from "../ai/config";
import { presetById } from "../ai/providers";
import { CONTACT_EMAIL } from "../config";
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

/** mailto link for reporting one piece of AI output (subject + the text, provider and model). */
export function reportHref(text: string, where: string, cfg = { provider: "demo", model: "" }) {
  const subject = `[OiOi WordTalk] 举报 AI 内容 / Report AI content (${where})`;
  const body = [
    "请简单说明问题（不当、冒犯、有害或错误）/ What is wrong with this response?",
    "",
    "",
    "---",
    `Where: ${where}`,
    `Provider: ${cfg.provider} · Model: ${cfg.model}`,
    `Time: ${new Date().toISOString()}`,
    "Content:",
    text.slice(0, 1500),
  ].join("\n");
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Label + report control under every piece of generated text (App Store 1.2 / 4.7).
 * Demo output is labelled as such; real model output as AI-generated.
 */
export function AiMeta({ text, where, demo }: { text: string; where: string; demo?: boolean }) {
  const cfg = useAiConfig();
  const isDemoOut = demo ?? isDemo(cfg);
  return (
    <p className="wt-aimeta">
      <span className="wt-ailabel">
        <Sparkles size={12} /> {isDemoOut ? "演示内容 · Demo" : "AI 生成 · AI-generated"}
      </span>
      <a className="wt-report" href={reportHref(text, where, cfg)} title="举报不当内容 / Report this response">
        <Flag size={12} /> 举报 Report
      </a>
    </p>
  );
}

/** Scenarios that are medical role-plays. */
export const MEDICAL_SCENARIOS = new Set(["doctor", "hospital-or"]);

/** Shown on medical role-plays and wherever Dr. Anita's clinical persona appears (App Store 1.4.1). */
export function MedicalNotice({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`wt-medical ${compact ? "is-compact" : ""}`} role="note">
      <Stethoscope size={14} /> <b>仅供语言练习，非医疗建议 · Language practice only, not medical advice</b>
      {!compact && <span className="muted"> 对话中的医疗情节均为虚构的英语练习，如有健康问题请咨询医生。Medical scenes are fictional English practice; ask a doctor about your health.</span>}
    </p>
  );
}
