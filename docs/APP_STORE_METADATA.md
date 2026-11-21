# App Store metadata — OiOi WordTalk (US storefront)

Draft for App Store Connect. English is the primary listing language for the US store; a Simplified Chinese localization can be added later with the same facts. Keep “IELTS” out of the name, subtitle, keywords, icon and screenshots’ headline text; it appears only in the non-affiliation line below.

## Identity

| Field | Value |
| --- | --- |
| App name (≤30) | **OiOi WordTalk** (fallback if taken: `OiOi WordTalk: Word Chat`) — do not use 词光 |
| Subtitle (≤30) | **Illustrated English Vocabulary** (30) · alt: `Words, Stories & AI Role-Play` (29) |
| Bundle ID | `com.oioiacademy.wordtalk` |
| SKU | `oioi-wordtalk` |
| Seller / developer name | Yin Lixin (individual account) |
| Copyright | `2026 Yin Lixin` |
| Primary category | **Education** |
| Secondary category | Reference |
| Price | Free · no in-app purchases · no ads |
| Availability | United States only (re-check guideline 3.1.1 BYOK/link notes before adding other storefronts) |
| Devices | iPhone only (TARGETED_DEVICE_FAMILY = 1), portrait |
| Minimum iOS | 15.0 |
| Support URL | https://2023anita.github.io/oioi-wordtalk/support/ |
| Privacy Policy URL | https://2023anita.github.io/oioi-wordtalk/privacy/ (in-app copy: `#/privacy`) |
| Marketing URL (optional) | https://oioi-academy.com |
| Contact email | ylx3020129@gmail.com |

## Promotional text (≤170)

Learn English words with a picture for every word, then use them: AI scene stories, role-play chats with Dr. Anita and logic drills. Works offline, no account needed.

## Description (≤4000)

OiOi WordTalk turns vocabulary into conversation. Every word comes with a hand-drawn illustration, IPA, British and American audio and real example sentences — then you put it to work in stories, role-plays and reasoning drills, and a modern spaced-repetition scheduler (FSRS) brings it back right before you forget.

WHAT’S INSIDE
• 7,298 illustrated words with Chinese glosses, collocations, synonyms, antonyms and word families
• Today plan: new words → Scene Theater → chat → quick review
• Scene Theater: a short story built around today’s words, plus comprehension, gap-fill and “why A, not B?” questions
• Chat with Dr. Anita: role-play at the airport, a café interview, a conference, a doctor’s visit and more; use a target word correctly and it lights up a star. Voice input supported
• Logic training: word networks, essay argument chains, debate rebuttals and confusable-word drills
• FSRS memory scheduling on your device, with a record of where each review came from
• Typing and dictation practice, dark mode, offline use

PRIVATE BY DESIGN
• No account, no ads, no analytics, no tracking
• Your progress stays on your iPhone; export or erase it any time
• Demo mode works fully offline with no API key

BRING YOUR OWN AI (OPTIONAL)
For freshly generated stories and replies, connect your own API key from a provider you choose (MiniMax, DeepSeek, Qwen, OpenRouter, OpenAI or any OpenAI-compatible service). The key stays on your device. The app asks for your consent before sending anything to a provider, and you can withdraw it in Settings. AI responses are labelled and can be reported from inside the app.

GOOD TO KNOW
• Medical scenes are role-play for language practice only, not medical advice.
• Word bank, illustrations and word audio from the open-source project Word Atlas (© Word Atlas contributors, CC BY 4.0, modified). App code is open source (MIT).
• OiOi WordTalk is an independent learning tool and is not affiliated with or endorsed by IELTS, the British Council, IDP: IELTS Australia or Cambridge University Press & Assessment.

Questions or feedback: ylx3020129@gmail.com

## Keywords (≤100, comma-separated, no spaces after commas)

`vocabulary,english,flashcards,spaced repetition,AI tutor,role play,speaking,study,chinese,exam,learn` (100)

Do not add IELTS, TOEFL or other trademarks, competitor app names, or words already in the name.

## What’s New (1.0)

First release.

## Age rating questionnaire (answer honestly; Apple calculates the rating)

| Question | Answer | Why |
| --- | --- | --- |
| Cartoon or fantasy violence | None | |
| Realistic violence | None | |
| Prolonged graphic or sadistic violence | None | |
| Profanity or crude humor | None | Prompt asks the model to keep content general-audience |
| Mature or suggestive themes | None | |
| Horror / fear themes | None | |
| Medical or treatment information | **Infrequent/Mild** | Doctor and operating-room role-plays (fictional, labelled “not medical advice”) |
| Alcohol, tobacco or drug use or references | None | (Restaurant scene may mention dietary needs only) |
| Simulated gambling | None | |
| Sexual content or nudity | None | |
| Contests | No | |
| Unrestricted web access | **No** | No in-app browser; links open Safari |
| User-generated content shared with other users | **No** | Nothing is shared between users |
| Messaging and chat with other users | **No** | Chat is with an AI coach only |
| AI chatbot / generated content (if asked) | **Yes** | Optional BYOK AI generates open-ended text; labelled, reportable |
| Advertising | No | |
| Parental controls / age assurance | No | |

Expected result: likely 9+ to 13+ because of medical references and AI-generated text. Accept whatever Apple calculates; do not under-answer.

## App Privacy (“nutrition label”)

Must match the privacy policy (docs/privacy/index.md, in-app `#/privacy`) and `ios/App/App/PrivacyInfo.xcprivacy`.

**Do you or your third-party partners collect data from this app?** → **Yes**

| Data type | Collected | Linked to user | Used for tracking | Purpose |
| --- | --- | --- | --- | --- |
| User Content → **Other User Content** | Yes | **No** | **No** | **App Functionality** |

Everything else: **Not collected** (Contact Info, Health & Fitness, Financial Info, Location, Sensitive Info, Contacts, Emails/Messages, Photos/Videos, Audio Data, Gameplay, Customer Support, Browsing/Search History, Identifiers, Purchases, Usage Data, Diagnostics, Other Data).

Reasoning to keep on file: the developer runs no servers and receives nothing. Only when the user picks a third-party AI provider and agrees in the consent dialog does the text they type (plus target words, scenario and prompt) go from the device to that provider to generate a reply. It is not linked to an identity by the app (no accounts), not used for tracking or ads. Speech recognition is performed by Apple’s system service; the app does not collect audio. GitHub Pages serves media files and may keep standard server logs (not used by the developer).

**Tracking:** No. No ATT prompt needed. `NSPrivacyTracking = false`, no tracking domains.

## Export compliance

- `ITSAppUsesNonExemptEncryption = false` is set in Info.plist, so App Store Connect will not ask per build.
- The app uses only standard HTTPS/TLS provided by iOS (exempt). No proprietary or non-standard encryption, no encryption export documentation or France declaration needed for a US-only release.

## Content rights

“Does your app contain, show or access third-party content?” → **Yes**: Word Atlas dataset, illustrations and audio under CC BY 4.0 (attributed in About), and text generated by third-party AI services chosen by the user. You have the rights to use it under that licence.

## Screenshots plan — 6.9-inch iPhone (required; 1320 × 2868 portrait, or 1290 × 2796)

Capture 6–8 screens from the iOS build (or the web build in a 440 × 956 viewport at 3×), light theme, demo mode or a real key. Headline captions in English (Chinese UI is fine underneath). No IELTS wording in captions.

1. **Today** — “Learn it, use it, remember it” (today’s plan with progress ring)
2. **Word card** — “A picture for every word” (illustration, IPA, UK/US audio, examples)
3. **Scene Theater** — “Today’s words in one short story” (story with highlighted words + question)
4. **Chat with Dr. Anita** — “Role-play real situations” (thread with feedback, a lit star and the “AI-generated · Report” line visible)
5. **Logic training** — “Build arguments, not just word lists” (word network or argument chain score)
6. **Atlas / galaxy** — “7,298 illustrated words” (atlas grid or galaxy view)
7. **Progress / FSRS** — “Reviews scheduled by FSRS, on your device” (Me page stats)
8. *(optional)* **Privacy** — “No account. Works offline.” (Settings consent panel / offline media)

iPad screenshots are not needed (iPhone-only build). App Preview video is optional.

## Review information

- Sign-in required: No
- Notes: paste from `docs/APP_REVIEW_NOTES.md`
- Contact: Lixin Yin · ylx3020129@gmail.com · phone as required by App Store Connect
