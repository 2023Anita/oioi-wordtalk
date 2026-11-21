import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { consent, useConsent } from "../ai/consent";
import { Sheet } from "./Sheet";

/**
 * Asked once per AI provider, before the first request: names the provider and what is sent.
 * Nothing is sent unless the user taps 同意 / Agree. Withdraw any time in Settings.
 */
export function ConsentDialog() {
  const { pending } = useConsent();
  useEffect(() => {
    consent.setHandler(() => undefined);
    return () => consent.setHandler(null);
  }, []);
  if (!pending) return null;
  const decline = () => pending.resolve(false);
  return (
    <Sheet open onClose={decline} label="AI 数据共享同意 / AI data sharing consent" className="consent-sheet">
      <div className="consent wt-prose">
        <p className="eyebrow">
          <ShieldCheck size={14} /> 发送前需要你的同意 · Your consent
        </p>
        <h2>把练习内容发送给 {pending.provider}？</h2>
        <p>
          场景故事、对话和逻辑批改由你选择的第三方 AI 服务商 <b>{pending.provider}</b>（{pending.host}）生成。点「同意」后，本应用会把以下内容直接从这台设备发送给它：
        </p>
        <ul>
          <li>你输入的英文句子、论证和对话记录；</li>
          <li>今天的任务词及其中文释义、所选场景；</li>
          <li>生成内容所需的提示词，以及你的 API Key（用于该服务商验证身份）。</li>
        </ul>
        <p className="muted">
          不会发送你的姓名、通讯录、位置或学习记录。我们（开发者）收不到这些内容；服务商按其自己的隐私政策处理。请不要输入病历、证件号等敏感信息。你可以随时在「模型设置」里撤回同意。
        </p>
        <p className="muted" lang="en">
          To write stories, chat replies and feedback, this app sends what you type (sentences, arguments, chat history), today’s target words with their Chinese glosses and the scenario, the prompt, and your API key directly from this device to <b>{pending.provider}</b> ({pending.host}). Your name, contacts, location and study history are not sent. The developer never receives this data; the provider’s own privacy policy applies. You can withdraw consent at any time in Settings. <a href="#/privacy" onClick={decline}>Privacy policy</a>
        </p>
        <div className="wt-row consent-actions">
          <button className="btn btn-ghost" onClick={decline}>
            取消 Cancel
          </button>
          <button className="btn btn-primary" onClick={() => pending.resolve(true)} autoFocus>
            同意 Agree
          </button>
        </div>
      </div>
    </Sheet>
  );
}
