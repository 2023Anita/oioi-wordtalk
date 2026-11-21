import { Eye, EyeOff, KeyRound, PlugZap, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cacheClear, cacheCount } from "../ai/cache";
import { chatJSON } from "../ai/client";
import { aiConfig, isDemo, useAiConfig } from "../ai/config";
import { obj } from "../ai/json";
import { presetById, PRESETS } from "../ai/providers";
import { toast } from "../ui/Toast";

export function SettingsPage() {
  const cfg = useAiConfig();
  const preset = presetById(cfg.provider);
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [cached, setCached] = useState(0);
  useEffect(() => {
    void cacheCount().then(setCached);
  }, []);

  const choose = (id: string) => {
    const p = presetById(id);
    aiConfig.set({ provider: p.id, baseUrl: p.baseUrl, model: p.model });
    setResult(null);
  };

  const test = async () => {
    setTesting(true);
    setResult(null);
    const t0 = performance.now();
    try {
      await chatJSON(aiConfig.get(), [{ role: "user", content: 'Reply with ONLY this JSON: {"ok": true, "word": "hello"}' }], (v) => obj(v, "reply"), { maxTokens: 300 });
      setResult(`✓ 连接成功（${Math.round(performance.now() - t0)} ms）`);
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
            <label className="wt-field">
              <span className="eyebrow">模型 Model</span>
              <input value={cfg.model} onChange={(e) => aiConfig.set({ model: e.target.value })} placeholder="model-name" spellCheck={false} autoComplete="off" />
            </label>
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
          </>
        )}
      </section>

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
        <ShieldCheck size={14} /> 你输入的英文和任务词会发给你选择的模型服务商处理，请阅读对方的隐私条款。详见 <a href="#/privacy">隐私政策</a>。
      </p>
    </div>
  );
}
