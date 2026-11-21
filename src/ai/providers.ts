/** OpenAI-compatible chat providers. Users bring their own key (BYOK). */
export interface ProviderPreset {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  /** Whether the endpoint accepts `response_format: {type: "json_object"}` (OpenRouter decides per model). */
  jsonMode: boolean;
  keyUrl?: string;
  note?: string;
}

export const PRESETS: ProviderPreset[] = [
  { id: "demo", label: "演示模式（离线，无需 Key）", baseUrl: "", model: "offline-demo", jsonMode: false, note: "用词库里的例句拼出内容，便于先体验流程。" },
  { id: "minimax-cn", label: "MiniMax 中国站", baseUrl: "https://api.minimaxi.com/v1", model: "MiniMax-M2", jsonMode: false, keyUrl: "https://platform.minimaxi.com" },
  { id: "minimax-global", label: "MiniMax Global", baseUrl: "https://api.minimax.io/v1", model: "MiniMax-M2", jsonMode: false, keyUrl: "https://www.minimax.io/platform" },
  { id: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com", model: "deepseek-chat", jsonMode: true, keyUrl: "https://platform.deepseek.com" },
  { id: "qwen", label: "通义千问 Qwen", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus", jsonMode: true, keyUrl: "https://dashscope.console.aliyun.com" },
  { id: "openrouter", label: "OpenRouter（含免费模型）", baseUrl: "https://openrouter.ai/api/v1", model: "openrouter/free", jsonMode: false, keyUrl: "https://openrouter.ai/keys", note: "一个 Key 用几百个模型，带 :free 的免费模型不花钱（有每日次数上限）。默认 openrouter/free 会自动挑一个可用的免费模型。" },
  { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", jsonMode: true, keyUrl: "https://platform.openai.com/api-keys" },
  { id: "custom", label: "自定义（OpenAI 兼容）", baseUrl: "", model: "", jsonMode: false },
];

export const presetById = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];
