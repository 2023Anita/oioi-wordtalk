import { ACADEMY_URL, REPO_URL } from "../config";

export function PrivacyPage() {
  return (
    <div className="page wt-page wt-prose">
      <header className="page-head">
        <p className="eyebrow">隐私政策 · Privacy Policy</p>
        <h1 className="display">我们不收集你的数据</h1>
        <p className="muted">生效日期 / Effective: 2026-11-22</p>
      </header>

      <section className="panel">
        <h2>中文</h2>
        <ul>
          <li>
            <b>不收集个人数据。</b>OiOi WordTalk · 词聊 没有账号系统，没有后台服务器，不使用统计、广告或追踪代码。
          </li>
          <li>
            <b>学习进度只在本机。</b>记忆卡片、学习记录、对话记录保存在你的浏览器（localStorage / IndexedDB）里。你可以随时在「我的」页面导出或清除。
          </li>
          <li>
            <b>API Key 只在本机。</b>你填写的模型 API Key 只存放在本机浏览器，不进入学习备份，也不会发送给我们。
          </li>
          <li>
            <b>发给模型服务商的内容。</b>使用场景剧场、对话和逻辑训练时，你输入的英文、任务词和必要的提示词会直接发送给你选择的模型服务商（如 MiniMax、DeepSeek、通义千问、OpenRouter、OpenAI 或你自定义的服务）。这些内容如何处理由该服务商的隐私政策决定。请不要输入病历、身份证号等敏感信息。
          </li>
          <li>
            <b>OpenRouter。</b>选择 OpenRouter 时，内容会先发给 OpenRouter，再由它转给实际运行模型的提供方（如 Google、NVIDIA 等），两者的隐私政策都适用。部分免费模型的提供方可能记录输入用于训练，请勿输入隐私信息。设置页读取模型列表时会访问 OpenRouter 的公开接口（不带 Key）；「测试连接」后查询今日免费额度时会带上你的 Key 访问 OpenRouter。
          </li>
          <li>
            <b>静态资源。</b>网站托管在 GitHub Pages，访问时 GitHub 可能按其政策记录常规访问日志。
          </li>
          <li>
            <b>语音输入。</b>语音输入使用浏览器 / 系统自带的语音识别，可能由浏览器厂商处理音频。
          </li>
        </ul>
      </section>

      <section className="panel" lang="en">
        <h2>English</h2>
        <ul>
          <li>
            <b>No personal data is collected.</b> OiOi WordTalk has no accounts, no backend server, and no analytics, ads or trackers.
          </li>
          <li>
            <b>Progress stays on your device</b> in your browser's storage. You can export or erase it at any time from the “我的 / Me” page.
          </li>
          <li>
            <b>API keys stay on your device.</b> The model API key you enter is stored only in this browser, is excluded from backups, and is never sent to us.
          </li>
          <li>
            <b>Text sent to your chosen model provider.</b> When you use Scene Theater, Chat or Logic, the English you type, the target words and the prompts are sent directly to the provider you selected (e.g. MiniMax, DeepSeek, Qwen, OpenRouter, OpenAI or a custom endpoint), under that provider's privacy policy. Please do not enter sensitive personal or medical information.
          </li>
          <li>
            <b>OpenRouter.</b> If you choose OpenRouter, your text goes to OpenRouter and then to the provider that actually runs the model (e.g. Google, NVIDIA); both privacy policies apply. Some free-model providers may log prompts for training, so do not enter private information. The settings page reads OpenRouter's public model list (without your key), and after “Test connection” it checks today's free quota with your key.
          </li>
          <li>
            <b>Hosting.</b> The site is served by GitHub Pages, which may keep standard access logs under GitHub's policy.
          </li>
          <li>
            <b>Voice input</b> uses your browser's or operating system's speech recognition, which may be processed by that vendor.
          </li>
        </ul>
      </section>

      <p className="muted">
        联系 / Contact: Lixin Yin · <a href={ACADEMY_URL}>OiOi MedAI Academy</a> · <a href={`${REPO_URL}/issues`}>GitHub Issues</a>
      </p>
    </div>
  );
}
