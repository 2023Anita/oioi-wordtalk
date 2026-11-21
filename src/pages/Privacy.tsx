import { ACADEMY_URL, CONTACT_EMAIL, REPO_URL } from "../config";

/**
 * In-app privacy policy (zh + en). Keep in sync with docs/privacy/index.md and the App Privacy
 * answers in docs/APP_STORE_METADATA.md (User Content – Other: not linked, not tracking,
 * App Functionality — text the user chooses to send to a third-party AI provider).
 */
export const PRIVACY_EFFECTIVE = "2026-11-22";

export function PrivacyPage() {
  return (
    <div className="page wt-page wt-prose">
      <header className="page-head">
        <p className="eyebrow">隐私政策 · Privacy Policy</p>
        <h1 className="display">你的数据留在你的设备上</h1>
        <p className="muted">
          OiOi WordTalk · 词聊（iOS App 与网页版）· 开发者 Lixin Yin（Yin Lixin）· 生效日期 / Effective: {PRIVACY_EFFECTIVE}
        </p>
      </header>

      <section className="panel">
        <h2>中文</h2>
        <ul>
          <li>
            <b>没有账号，没有我们的服务器。</b>本应用没有登录系统、没有开发者后台，不使用统计、广告、追踪或第三方 SDK。开发者收不到你的任何学习数据或输入内容，也不跨应用或网站追踪你。
          </li>
          <li>
            <b>学习进度只在本机。</b>记忆卡片、学习记录、对话记录、已下载的插画和录音都保存在本机（localStorage / IndexedDB）。
          </li>
          <li>
            <b>API Key 只在本机。</b>你填写的模型 API Key 只保存在这台设备上，不进入学习备份，也不会发送给我们；只在你调用 AI 时发送给对应服务商用于验证。
          </li>
          <li>
            <b>发给第三方 AI 服务商的内容（需你先同意）。</b>演示模式完全离线，不发送任何内容。只有当你自己选择服务商（如 MiniMax、DeepSeek、通义千问、OpenRouter、OpenAI 或自定义服务）并在弹窗中点「同意」后，使用场景剧场、对话和逻辑训练时，你输入的英文、对话记录、任务词与释义、所选场景和提示词才会从你的设备直接发送给该服务商，用于生成回复。我们不经手这些内容。服务商是你自己选择的，其处理方式（包括是否保存或用于训练）由该服务商自己的隐私政策和条款决定，请先阅读。请不要输入病历、证件号等敏感个人信息。
          </li>
          <li>
            <b>撤回同意。</b>你可以随时在「模型设置 → AI 数据共享同意」里撤回对任一服务商的同意；撤回后不会再向它发送内容，下次使用前会重新询问。切换回演示模式或删除 API Key 也会停止发送。已发送给服务商的内容请联系该服务商处理。
          </li>
          <li>
            <b>OpenRouter。</b>选择 OpenRouter 时，内容先发给 OpenRouter，再由它转给实际运行模型的提供方，两者的隐私政策都适用；部分免费模型的提供方可能记录输入用于训练。设置页读取模型列表时会访问 OpenRouter 的公开接口（不带 Key）；「测试连接」后查询今日免费额度时会带上你的 Key。
          </li>
          <li>
            <b>删除数据。</b>在「我的」页面可以导出或清除全部学习记录；在「模型设置」里可以删除 API Key、清空生成内容缓存、删除已下载的插画和录音。删除 iOS App（或清除浏览器网站数据）会删除本机上的全部数据。我们没有保存你的任何数据，因此无需也无法在服务器端删除。
          </li>
          <li>
            <b>麦克风与语音识别。</b>只有在你点按「语音输入」时才会请求权限，用于把你说的英语转成文字；识别由系统（Apple）或浏览器厂商的语音识别服务处理，不会发送给我们。
          </li>
          <li>
            <b>素材下载与托管。</b>iOS App 会从 GitHub Pages 下载大图和录音并保存在本机；网页版托管在 GitHub Pages。GitHub 可能按其政策记录常规访问日志（如 IP 地址）。
          </li>
          <li>
            <b>儿童。</b>本应用不面向 13 岁以下儿童，也不会有意收集儿童信息。
          </li>
          <li>
            <b>变更。</b>本政策如有变更，会更新本页并修改生效日期。
          </li>
        </ul>
      </section>

      <section className="panel" lang="en">
        <h2>English</h2>
        <ul>
          <li>
            <b>No accounts, no developer servers.</b> The app has no sign-in, no backend run by the developer, and no analytics, advertising, tracking or third-party SDKs. The developer never receives your study data or what you type, and does not track you across apps or websites.
          </li>
          <li>
            <b>Your progress stays on your device</b> (localStorage / IndexedDB): cards, study history, chat history, and downloaded illustrations and recordings.
          </li>
          <li>
            <b>Your API key stays on your device.</b> It is excluded from backups and never sent to us; it is sent only to the provider you chose, to authenticate your requests.
          </li>
          <li>
            <b>Text sent to a third-party AI provider, only with your consent.</b> Demo mode is fully offline and sends nothing. Only if you choose a provider yourself (e.g. MiniMax, DeepSeek, Qwen, OpenRouter, OpenAI or a custom endpoint) and tap “Agree” in the consent dialog does the app send, directly from your device to that provider, the English you type, your chat history, the target words and their glosses, the scenario and the prompt, so the provider can generate a reply. This text never passes through the developer. The provider is your choice, and its own privacy policy and terms govern how it handles the data (including any retention or training); please read them. Do not enter sensitive personal or medical information.
          </li>
          <li>
            <b>Withdrawing consent.</b> Withdraw consent for any provider at any time in Settings → “AI data sharing consent”. Nothing more is sent to that provider, and you will be asked again before any future use. Switching to demo mode or deleting your API key also stops all sending. For text already sent, contact that provider.
          </li>
          <li>
            <b>OpenRouter.</b> With OpenRouter, text goes to OpenRouter and then to the provider that runs the model; both privacy policies apply, and some free-model providers may log prompts for training. Settings reads OpenRouter’s public model list (without your key), and after “Test connection” checks today’s free quota with your key.
          </li>
          <li>
            <b>Deleting your data.</b> Export or erase all study data on the “我的 / Me” page; delete your API key, the generated-content cache and downloaded media in Settings. Deleting the iOS app (or clearing the site’s data in your browser) removes everything stored on the device. We hold none of your data, so there is nothing to delete on our side.
          </li>
          <li>
            <b>Microphone and speech recognition</b> are requested only when you tap voice input, to turn your spoken English into text. Recognition is handled by Apple’s (or your browser’s) speech service and is never sent to us.
          </li>
          <li>
            <b>Media downloads and hosting.</b> The iOS app downloads full illustrations and recordings from GitHub Pages and keeps them on the device; the web version is hosted on GitHub Pages. GitHub may keep standard access logs (such as IP addresses) under its own policy.
          </li>
          <li>
            <b>Children.</b> The app is not directed to children under 13 and does not knowingly collect their information.
          </li>
          <li>
            <b>Changes.</b> Any update to this policy will be posted here with a new effective date.
          </li>
        </ul>
      </section>

      <p className="muted">
        联系 / Contact: Lixin Yin · <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> · <a href={ACADEMY_URL}>OiOi MedAI Academy</a> · <a href={`${REPO_URL}/issues`}>GitHub Issues</a>
      </p>
    </div>
  );
}
