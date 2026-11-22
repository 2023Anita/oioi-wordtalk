# App Store screenshots (6.9-inch iPhone, en-US)

Output: `fastlane/screenshots/en-US/iPhone69-0N-*.png` — 1320 × 2868, portrait, RGB PNG (no alpha). Plan and headline rules: `docs/APP_STORE_METADATA.md` (no IELTS wording in headlines, no Apple device frames).

Captured from the live web build (https://2023anita.github.io/oioi-wordtalk/) in headless Chromium: viewport 440 × 956 at deviceScaleFactor 3, iPhone Safari user agent, light theme, offline demo mode for 01/02/05/06. **03 (Scene Theater) and 04 (Chat) show real AI output** (OpenRouter, free model `nvidia/nemotron-3-ultra-550b-a55b:free`, $0), labelled “AI 生成 · AI-generated” — see *Live-AI frames* below.

| File | Headline | Subtitle |
| --- | --- | --- |
| iPhone69-01-today | Learn it, use it, remember it | 背单词，也聊单词 · 每天一条学习路线 |
| iPhone69-02-word-card | A picture for every word | 插画 · 英美发音 · 中文释义 · 例句 |
| iPhone69-03-scene-theater | Today’s words in one short story | 场景剧场 · 读故事，再做理解题 |
| iPhone69-04-chat | Role-play real situations | 和 Dr. Anita 情景对话 · 用对一个词，点亮一颗星 |
| iPhone69-05-logic | Build word networks, not word lists | 逻辑训练 · 词网 · 论证链 · 辩论 · 易混辨析 |
| iPhone69-06-progress | Reviews scheduled by FSRS, on your device | 科学复习排程 · 学习记录只存在本机 |

## Regenerate (from repo root, after `npm ci` and `npx playwright install chromium`)

```sh
S=scripts/appstore-screenshots
rm -rf /tmp/ow-profile /tmp/ow-fresh
node $S/sim.mjs -13 -12 -11 -9 -8 -7 -5 -4 -3 -2 -1   # real learn + scene-quiz sessions on shifted dates (study history for the Me page)
node $S/capture.mjs today scene chat logic me           # raw captures -> $S/raw/
PROFILE=/tmp/ow-fresh node $S/capture.mjs word          # fresh profile -> first new-word card
node $S/compose.mjs                                     # headline frames -> fastlane/screenshots/en-US/
```

`sim.mjs` drives the app's own UI with a shifted clock, so the Me/FSRS numbers are genuine app output from simulated study days, not hand-edited data. If the browser can't reach github.io directly, run `python3 $S/mirror.py` and prefix the commands with `BASE=http://127.0.0.1:8800/oioi-wordtalk/`. Edit headlines in `frames.json`.

## Live-AI frames (03 scene, 04 chat)

Needs `python3 $S/mirror.py` running (it relays `/or/*` to `https://openrouter.ai/api/v1/*`, adding `OPENROUTER_API_KEY` from its environment) and `BASE=http://127.0.0.1:8800/oioi-wordtalk/`. The app is set to provider OpenRouter with a placeholder key; the consent dialog is accepted in the UI. Use a free model only. `IDS`/`SCENARIO` pin today's practice set (same as picking words with 换一组 and a scenario chip). Generated stories/replies are cached by the app, so captures reuse them.

```sh
export BASE=http://127.0.0.1:8800/oioi-wordtalk/ MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
# 03: restaurant story (retries on empty/truncated model output)
export IDS=menu,reservation,recommend,spicy,dessert,receipt SCENARIO=restaurant
node $S/live-scene.mjs && SCALE=3 SCENE_MODE=story node $S/live-capture.mjs scene
# 04: airport check-in role-play, one learner message per run
export IDS=passport,luggage,boarding,aisle,window,delay SCENARIO=airport
node $S/live-chat.mjs "Good morning! Here is my passport. Could I have an aisle seat, please?"
node $S/live-chat.mjs "Just one suitcase as checked luggage. Is there a delay, and when does boarding start?"
node $S/live-chat.mjs "A window seat would be lovely, thank you. Which gate should I go to?"
SCALE=3 CHAT_FROM=2 CHAT_TO=4 node $S/live-capture.mjs chat
node $S/compose.mjs 03-scene 04-chat
```
