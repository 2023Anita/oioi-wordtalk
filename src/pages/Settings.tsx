import { Download, Eye, EyeOff, Gauge, KeyRound, Mail, PlugZap, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cacheClear, cacheCount } from "../ai/cache";
import { chatJSON } from "../ai/client";
import { useAtlas } from "../atlas/context";
import { MEDIA } from "../atlas/types";
import { aiConfig, isDemo, useAiConfig } from "../ai/config";
import { consent, providerName, useConsent } from "../ai/consent";
import { CONTACT_EMAIL } from "../config";
import { clearStoredMedia, downloadAll, formatMB, loadMediaManifest, mediaIsRemote, storedMediaCount, type MediaManifest } from "../lib/media";
import { obj } from "../ai/json";
import { fetchKeyInfo, fetchModels, formatQuota, type OrModel } from "../ai/openrouter";
import { presetById, PRESETS } from "../ai/providers";
import { toast } from "../ui/Toast";

export function SettingsPage() {
  const cfg = useAiConfig();
  const preset = presetById(cfg.provider);
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [cached, setCached] = useState(0);
  const [quota, setQuota] = useState<string | null>(null);
  useEffect(() => {
    cacheCount().then(setCached, () => setCached(0));
  }, []);

  const choose = (id: string) => {
    const p = presetById(id);
    aiConfig.set({ provider: p.id, baseUrl: p.baseUrl, model: p.model });
    setResult(null);
    setQuota(null);
  };

  const test = async () => {
    setTesting(true);
    setResult(null);
    setQuota(null);
    const t0 = performance.now();
    try {
      await chatJSON(aiConfig.get(), [{ role: "user", content: 'Reply with ONLY this JSON: {"ok": true, "word": "hello"}' }], (v) => obj(v, "reply"), { maxTokens: 300 });
      setResult(`✓ 连接成功（${Math.round(performance.now() - t0)} ms）`);
      const c = aiConfig.get();
      if (c.provider === "openrouter" && !c.proxyUrl) {
        fetchKeyInfo(c.apiKey)
          .then((k) => setQuota(formatQuota(k)))
          .catch((e: Error) => setQuota(e.message));
      }
    } catch (e) {
      setResult(`✗ ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="page wt-page">
      <header className="page-head wt-head">
        <p className="eyebrow">模型设置 · Model (BYOK)</p>
        <h1 className="display">接入你自己的大模型</h1>
        <p className="lede">场景故事、对话判词和逻辑批改都由你选的模型生成。API Key 只保存在这台设备的浏览器里，不会上传到我们的任何服务器，也不进学习备份。</p>
      </header>

      <section className="panel wt-form">
        <label className="wt-field">
          <span className="eyebrow">服务商 Provider</span>
          <select value={cfg.provider} onChange={(e) => choose(e.target.value)}>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {preset.note && <small className="muted">{preset.note}</small>}
          {preset.keyUrl && (
            <small>
              获取 Key：
              <a href={preset.keyUrl} target="_blank" rel="noreferrer">
                {preset.keyUrl}
              </a>
            </small>
          )}
        </label>

        {cfg.provider !== "demo" && (
          <>
            <label className="wt-field">
              <span className="eyebrow">Base URL（OpenAI 兼容，需 https）</span>
              <input value={cfg.baseUrl} onChange={(e) => aiConfig.set({ baseUrl: e.target.value })} placeholder="https://api.example.com/v1" spellCheck={false} autoComplete="off" />
            </label>
            {cfg.provider === "openrouter" ? (
              <OpenRouterModels model={cfg.model} />
            ) : (
              <label className="wt-field">
                <span className="eyebrow">模型 Model</span>
                <input value={cfg.model} onChange={(e) => aiConfig.set({ model: e.target.value })} placeholder="model-name" spellCheck={false} autoComplete="off" />
              </label>
            )}
            <label className="wt-field">
              <span className="eyebrow">
                <KeyRound size={13} /> API Key
              </span>
              <span className="wt-row">
                <input type={show ? "text" : "password"} value={cfg.apiKey} onChange={(e) => aiConfig.set({ apiKey: e.target.value })} placeholder="sk-…" spellCheck={false} autoComplete="off" />
                <button className="icon-btn" type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "隐藏" : "显示"}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            <details className="wt-adv">
              <summary>高级：代理与温度</summary>
              <label className="wt-field">
                <span className="eyebrow">代理 Proxy URL（可选）</span>
                <input value={cfg.proxyUrl} onChange={(e) => aiConfig.set({ proxyUrl: e.target.value })} placeholder="https://your-worker.workers.dev" spellCheck={false} />
                <small className="muted">仅当浏览器直连被跨域拦截时才需要。可用仓库 /proxy 目录里的 Cloudflare Worker 自行部署。</small>
              </label>
              <label className="wt-field">
                <span className="eyebrow">温度 Temperature：{cfg.temperature.toFixed(1)}</span>
                <input type="range" min={0} max={1.2} step={0.1} value={cfg.temperature} onChange={(e) => aiConfig.set({ temperature: Number(e.target.value) })} />
              </label>
            </details>
            <div className="wt-row">
              <button className="btn btn-primary" onClick={test} disabled={testing || isDemo(cfg)}>
                <PlugZap size={17} /> {testing ? "测试中…" : "测试连接"}
              </button>
              <button className="btn btn-ghost" onClick={() => (aiConfig.clearKey(), toast("已从本机删除 API Key", "ok"))} disabled={!cfg.apiKey}>
                <Trash2 size={16} /> 删除 Key
              </button>
            </div>
            {result && <p className={result.startsWith("✓") ? "wt-ok" : "wt-bad"}>{result}</p>}
            {quota && (
              <p className="muted wt-quota">
                <Gauge size={14} /> {quota}
              </p>
            )}
          </>
        )}
      </section>

      <AiConsentPanel />

      {mediaIsRemote && <OfflineMediaPanel />}

      <section className="panel">
        <h3 className="eyebrow">生成内容缓存</h3>
        <p className="muted">生成过的故事、词网和辨析题缓存在本机 IndexedDB（{cached} 条），再次打开不重复花费额度。</p>
        <button
          className="btn btn-ghost"
          onClick={async () => {
            await cacheClear();
            setCached(0);
            toast("缓存已清空", "ok");
          }}
        >
          清空缓存
        </button>
      </section>

      <p className="muted wt-hint">
        <ShieldCheck size={14} /> 你输入的英文和任务词会在你同意后发给你选择的模型服务商处理，请阅读对方的隐私条款。详见 <a href="#/privacy">隐私政策</a>。
      </p>
      <p className="muted wt-hint">
        <Mail size={14} /> 支持与反馈 Support：<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </div>
  );
}

/** OpenRouter model picker: live list (cached 24 h), free-only by default, any id can be typed. */
function OpenRouterModels({ model }: { model: string }) {
  const [models, setModels] = useState<OrModel[]>([]);
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [freeOnly, setFreeOnly] = useState(true);
  const load = (force = false) => {
    setLoading(true);
    void fetchModels({ force }).then((r) => {
      setModels(r.models);
      setLive(r.live);
      setLoading(false);
    });
  };
  useEffect(() => load(), []);
  const shown = models.filter((m) => !freeOnly || m.free);
  const k = (n: number) => (n >= 1000000 ? `${Math.round(n / 100000) / 10}M` : `${Math.round(n / 1000)}k`);
  return (
    <div className="wt-field">
      <span className="eyebrow">模型 Model（OpenRouter）</span>
      <span className="wt-row">
        <label className="wt-check">
          <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} /> 只看免费
        </label>
        <button className="icon-btn" type="button" onClick={() => load(true)} disabled={loading} aria-label="刷新模型列表" title="刷新模型列表">
          <RefreshCw size={16} />
        </button>
        <small className="muted">{loading ? "加载中…" : `${shown.length} 个${live ? "" : "（离线备用列表）"}`}</small>
      </span>
      <select value={shown.some((m) => m.id === model) ? model : ""} onChange={(e) => e.target.value && aiConfig.set({ model: e.target.value })}>
        {!shown.some((m) => m.id === model) && <option value="">（自定义：{model || "未填"}）</option>}
        {shown.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.context ? ` · ${k(m.context)}` : ""}
            {m.free ? "" : " · 付费"}
          </option>
        ))}
      </select>
      <input value={model} onChange={(e) => aiConfig.set({ model: e.target.value })} placeholder="或直接输入模型 ID，如 openrouter/free" spellCheck={false} autoComplete="off" aria-label="模型 ID" />
      <small className="muted">免费模型有每分钟和每天的次数上限；遇到限流会自动改用 openrouter/free 重试一次。部分免费模型的提供方可能记录输入用于训练，请勿输入隐私信息。</small>
    </div>
  );
}

/** Which providers may receive text; withdraw consent here (App Store 5.1.2(i)). */
function AiConsentPanel() {
  const cfg = useAiConfig();
  const { granted } = useConsent();
  const entries = Object.entries(granted);
  const name = (key: string) => (key.startsWith("custom:") ? `自定义 Custom (${key.slice(7)})` : providerName({ provider: key, baseUrl: "" }));
  return (
    <section className="panel">
      <h3 className="eyebrow">AI 数据共享同意 · AI data sharing consent</h3>
      <p className="muted">
        第一次使用某个服务商前，应用会先询问你是否同意把练习内容发送给它；不同意就不会发送。撤回后，下次使用前会重新询问。演示模式不发送任何内容。
        <span lang="en"> The app asks before sending anything to a provider for the first time. Withdraw consent here; you will be asked again next time. Demo mode sends nothing.</span>
      </p>
      {entries.length ? (
        <ul className="consent-list">
          {entries.map(([key, at]) => (
            <li key={key}>
              <span>
                <b>{name(key)}</b>
                <small className="muted"> · 同意于 {new Date(at).toLocaleDateString()}</small>
              </span>
              <button className="btn btn-ghost" onClick={() => (consent.revoke(key), toast(`已撤回对 ${name(key)} 的同意`, "ok"))}>
                撤回 Withdraw
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">目前没有同意任何服务商。No provider has your consent.{!isDemo(cfg) && " 下次生成内容前会先询问你。"}</p>
      )}
    </section>
  );
}

/**
 * iOS app only: full illustrations and recordings load on demand and are kept on the device.
 * Optionally fetch them all ahead of time; the size is shown and the user confirms first.
 */
function OfflineMediaPanel() {
  const atlas = useAtlas();
  const [manifest, setManifest] = useState<MediaManifest | null>(null);
  const [stored, setStored] = useState(0);
  const [ask, setAsk] = useState<null | "img" | "audio">(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [ctl, setCtl] = useState<AbortController | null>(null);
  useEffect(() => {
    void loadMediaManifest(import.meta.env.BASE_URL.replace(/\/$/, "")).then(setManifest);
    void storedMediaCount().then(setStored);
  }, []);
  const urls = (kind: "img" | "audio") =>
    kind === "img"
      ? atlas.words.filter((w) => w.media & MEDIA.img).map((w) => atlas.img(w, "full")!)
      : atlas.words.flatMap((w) => (["uk", "us", "ex", "ex2"] as const).map((k) => atlas.audio(w, k)).filter((u): u is string => !!u));
  const start = async (kind: "img" | "audio") => {
    setAsk(null);
    const ac = new AbortController();
    setCtl(ac);
    setProgress({ done: 0, total: 1 });
    const ok = await downloadAll(urls(kind), (done, total) => setProgress({ done, total }), ac.signal);
    setCtl(null);
    setProgress(null);
    setStored(await storedMediaCount());
    toast(ac.signal.aborted ? "已停止下载，已下载的文件会保留" : `已保存 ${ok} 个文件，可离线使用`, "ok");
  };
  const size = (kind: "img" | "audio") => (manifest ? formatMB(manifest[kind].bytes) : "?");
  return (
    <section className="panel">
      <h3 className="eyebrow">离线素材 · Offline media</h3>
      <p className="muted">
        词库和所有缩略图已内置在 App 里，离线可用。大图和真人录音在第一次打开时下载并保存在本机；没网又没下载过时显示文字卡片、用系统语音朗读。本机已保存 {stored.toLocaleString()} 个文件。
      </p>
      {progress ? (
        <div>
          <progress className="wt-progress" value={progress.done} max={progress.total} />
          <p className="muted">
            {progress.done.toLocaleString()} / {progress.total.toLocaleString()}
            <button className="link" onClick={() => ctl?.abort()}>
              停止
            </button>
          </p>
        </div>
      ) : ask ? (
        <div className="wt-row">
          <p>
            要下载全部{ask === "img" ? "插画大图" : "单词与例句录音"}吗？约 <b>{size(ask)}</b>，建议连接 Wi-Fi。Download about {size(ask)}?
          </p>
          <button className="btn btn-ghost" onClick={() => setAsk(null)}>
            取消
          </button>
          <button className="btn btn-primary" onClick={() => start(ask)}>
            下载 Download
          </button>
        </div>
      ) : (
        <div className="wt-row">
          <button className="btn btn-ghost" onClick={() => setAsk("img")}>
            <Download size={16} /> 下载全部插画（{size("img")}）
          </button>
          <button className="btn btn-ghost" onClick={() => setAsk("audio")}>
            <Download size={16} /> 下载全部录音（{size("audio")}）
          </button>
          <button
            className="btn btn-ghost"
            disabled={!stored}
            onClick={async () => {
              await clearStoredMedia();
              setStored(0);
              toast("已删除本机保存的插画和录音", "ok");
            }}
          >
            <Trash2 size={16} /> 删除已下载
          </button>
        </div>
      )}
    </section>
  );
}
