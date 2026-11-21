# App Review Notes — OiOi WordTalk (for App Store Connect → App Review Information → Notes)

Paste the block below into **Notes**. Sign-in required: **No** (leave the demo account fields empty).

---

**No account, login or API key is needed to review this app.**

OiOi WordTalk is an illustrated English vocabulary trainer for Chinese-speaking learners. The full word bank (7,298 words with Chinese glosses, example sentences and thumbnails) is built into the app and works offline. A spaced-repetition scheduler (FSRS) runs on the device.

**Demo mode is the default.** On first launch the AI provider is set to “演示模式 / Demo (offline, no key)”. In demo mode every feature works end to end without a network connection or key: Scene Theater stories and quizzes, Chat role-play with feedback and stars, and all four Logic exercises (word network, argument chain, debate, confusable pairs). Demo output is built from the word bank and is labelled “演示内容 · Demo”.

**Optional BYOK (bring your own key).** Users who want freshly generated text can enter their own API key for a provider they choose (MiniMax, DeepSeek, Qwen, OpenRouter, OpenAI or any OpenAI-compatible endpoint) in Settings (top-right chip icon → 模型设置). The key is stored only on the device. The developer runs no servers and sells nothing: there are no in-app purchases, subscriptions, ads, analytics or accounts, and the keys do not unlock any developer content.

**Consent before any data leaves the device (5.1.2).** Before the first AI request to a provider, a dialog names the provider and lists exactly what is sent (typed text, target words, scenario, prompt and the user’s key), with 同意 Agree / 取消 Cancel. Nothing is sent without Agree. Consent can be withdrawn in Settings → “AI data sharing consent”.

**AI content safeguards (1.2 / 4.7).** Every AI response is labelled “AI 生成 · AI-generated” and has a “举报 Report” link that opens a pre-filled email to the developer (ylx3020129@gmail.com) with the content. The system prompt keeps content suitable for a general audience and declines harmful requests.

**Medical role-plays.** “Dr. Anita” is the developer’s English-coach persona. The doctor and operating-room scenes are fictional role-play and show “仅供语言练习，非医疗建议 · Language practice only, not medical advice”.

**How to test (about 3 minutes):**
1. Launch → tap through the welcome card. **Today (今日)** shows today’s words.
2. **Atlas (图鉴)** → tap any word: illustration, IPA, audio (tap the speaker), examples. Full illustrations and recordings are downloaded on first view and cached; offline they fall back to a text card and the device voice. Settings → “离线素材 / Offline media” can download everything ahead of time after showing the size and asking first.
3. **Theater (剧场)** → a demo story with today’s words → answer the three questions.
4. **Chat (聊天)** → type an English sentence (or tap the mic for voice input; the app asks for microphone and speech-recognition permission only then) → Dr. Anita replies with feedback; using a target word lights a star.
5. **Today (今日)** → “加练：逻辑训练” link (or the button at the end of Chat) → **Logic (逻辑)** → try 词网, 论证链, 辩论 and 易混辨析.
6. **Me (我的)** → progress, export or erase data. **About (i icon)** → credits, privacy policy, contact.

iPhone only, portrait. Interface is Simplified Chinese with English learning content.

Content: word bank, illustrations and word audio from the open-source project Word Atlas (© Word Atlas contributors, CC BY 4.0, credited in About; modified). Code MIT. Not affiliated with or endorsed by IELTS (British Council, IDP: IELTS Australia, Cambridge University Press & Assessment).

Contact: Lixin Yin, ylx3020129@gmail.com · Support: https://2023anita.github.io/oioi-wordtalk/support/ · Privacy: https://2023anita.github.io/oioi-wordtalk/privacy/

---

### Optional (developer)
If Review asks to see live AI output, create a low-limit key (e.g. a free OpenRouter key at https://openrouter.ai/keys, which can use free models) and add to the notes: “To try live AI: Settings → Provider OpenRouter → paste key → 测试连接 Test.” Revoke the key after review.
