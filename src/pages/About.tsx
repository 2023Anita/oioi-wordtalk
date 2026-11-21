import { ArrowUpRight, Github, Heart, ShieldCheck } from "lucide-react";
import { useAtlas } from "../atlas/context";
import { ACADEMY_URL, REPO_URL, UPSTREAM_URL } from "../config";

export function About() {
  const atlas = useAtlas();
  return (
    <div className="page about wt-prose">
      <header className="page-head">
        <p className="eyebrow">关于 · 致谢 · About & Credits</p>
        <h1 className="display">OiOi WordTalk · 词聊</h1>
        <p className="lede">
          背单词，也聊单词。{atlas.count.toLocaleString()} 个雅思词，每个词一幅插画；再用 AI 把它们放进场景故事、角色对话和论证练习里，用 FSRS 记住你真正用出来的词。
        </p>
        <p className="lede">
          作者 Author：<b>Lixin Yin</b> · <a href={ACADEMY_URL}>OiOi MedAI Academy</a>（Dr. Anita）
        </p>
        <div className="about-actions">
          <a className="btn btn-primary" href={REPO_URL} target="_blank" rel="noreferrer">
            <Github size={18} /> 源代码 GitHub
          </a>
          <a className="btn btn-ghost" href="#/privacy">
            <ShieldCheck size={18} /> 隐私政策
          </a>
        </div>
      </header>

      <div className="about-grid">
        <section className="panel">
          <h3 className="eyebrow">致谢 / Credits</h3>
          <p>
            本应用基于开源项目 <b>词光 Word Atlas</b>（作者 designfuchen）改造：
            <a className="link" href={UPSTREAM_URL} target="_blank" rel="noreferrer">
              {UPSTREAM_URL.replace("https://", "")} <ArrowUpRight size={14} />
            </a>
          </p>
          <ul className="feature-list">
            <li>
              <b>代码</b>：沿用并修改了 Word Atlas 的代码，遵循 MIT 许可证，保留原版权声明。
            </li>
            <li>
              <b>词库、插画、单词与例句录音</b>：来自 Word Atlas contributors（词光），以{" "}
              <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
                CC BY 4.0
              </a>{" "}
              授权；本应用对其做了修改与扩展（重新配色的界面、AI 生成的场景故事与练习等）。
            </li>
            <li>
              <b>界面音效与背景音乐</b>：原项目的录制音效和配乐不在 CC BY 授权范围内，本应用已全部移除，改为浏览器实时合成的简单提示音。
            </li>
            <li>本应用是独立的二次开发作品，与原作者及「词光」官方 App 无关，也不代表原作者认可或背书。</li>
          </ul>
          <p className="muted" lang="en">
            Built on the open-source project Word Atlas (词光) by designfuchen. Code under MIT; dataset, illustrations and word audio © Word Atlas contributors, CC BY 4.0, modified and extended here. Not affiliated with or endorsed by the original author. Not an official IELTS product.
          </p>
        </section>

        <section className="panel">
          <h3 className="eyebrow">它怎么帮你记住</h3>
          <ul className="feature-list">
            <li>
              <b>今日计划。</b>新词 → 场景剧场 → 和 Dr. Anita 聊 → 快速复习。
            </li>
            <li>
              <b>场景剧场。</b>AI 用今天的 5–8 个词写一个约 150 词的小故事，再出理解、填空和“为什么是 A 不是 B”三道题。
            </li>
            <li>
              <b>边学边聊。</b>在机场、诊室、手术室、学术会议里角色扮演；用对一个任务词，就点亮一颗星。
            </li>
            <li>
              <b>逻辑训练。</b>词网、雅思大作文论证链、辩论和易混词辨析。
            </li>
            <li>
              <b>FSRS 记忆算法。</b>卡片、场景测验、对话使用、论证练习都会记成复习，并标明来源。
            </li>
          </ul>
        </section>

        <section className="panel">
          <h3 className="eyebrow">内容说明</h3>
          <p className="muted">
            词库内容由 AI 按规范生成并经自动校验，未逐条人工审校；AI 对话和批改也可能出错，请把它当作练习伙伴而不是权威。本应用不是官方雅思词表，也不承诺提分。
          </p>
        </section>
      </div>
      <p className="colophon">
        <Heart size={14} /> Made by Lixin Yin · OiOi MedAI Academy
      </p>
    </div>
  );
}
