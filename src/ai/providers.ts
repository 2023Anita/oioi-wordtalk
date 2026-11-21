/** OpenAI-compatible chat providers. Users bring their own key (BYOK). */
export interface ProviderPreset {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  /** Whether the endpoint accepts `response_format: {type: "json_object"}`. */
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
  { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", jsonMode: true, keyUrl: "https://platform.openai.com/api-keys" },
  { id: "custom", label: "自定义（OpenAI 兼容）", baseUrl: "", model: "", jsonMode: false },
];

export const presetById = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];
