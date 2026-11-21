# iOS 上架 / TestFlight 指南（交 Apple 开发者年费之后）

本仓库已经准备好：Capacitor iOS 配置（`capacitor.config.ts`）、**已提交的原生工程 `ios/`**（Info.plist 权限说明、`ITSAppUsesNonExemptEncryption=false`、仅 iPhone、竖屏、OiOi 启动图、`PrivacyInfo.xcprivacy`，由 `scripts/ios-verify.mjs` 在 CI 里检查）、fastlane（`fastlane/Fastfile`、`Appfile`、`Matchfile`）和一个**只能手动触发、默认不运行**的 GitHub Actions 工作流 `.github/workflows/ios-testflight.yml`。它在 GitHub 的 macOS 机器上编译、签名，并上传到 TestFlight。你不需要在自己的 Mac 上装 Xcode 才能出包（但有 Mac 调试会更方便）。

> 建议的 Bundle ID：`com.oioiacademy.wordtalk`。如果改，请同时改 `capacitor.config.ts`、`fastlane/Appfile`、`fastlane/Fastfile`、`fastlane/Matchfile`。

## 第 1 步：加入 Apple Developer Program

1. 用你的 Apple ID 打开 <https://developer.apple.com/programs/enroll/>，以**个人**身份加入（99 美元/年）。在中国大陆需完成实名与支付验证，审核一般 1–2 天。
2. 通过后，在 <https://developer.apple.com/account> → Membership 里记下 **Team ID**（10 位字母数字）。

## 第 2 步：注册 App ID 并在 App Store Connect 建 App

1. <https://developer.apple.com/account/resources/identifiers> → “+” → App IDs → App → Bundle ID 选 Explicit，填 `com.oioiacademy.wordtalk`，描述填 OiOi WordTalk。
2. <https://appstoreconnect.apple.com> → 我的 App → “+” 新建 App：平台 iOS，名称 `OiOi WordTalk`（若被占用可用 `OiOi WordTalk 词聊`），主要语言 简体中文或英文，Bundle ID 选上一步那个，SKU 随意（如 `oioi-wordtalk`）。

## 第 3 步：生成 App Store Connect API Key

1. App Store Connect → 用户和访问 → 集成（Integrations）→ App Store Connect API → 团队密钥 → “+”。
2. 名称 `github-actions`，权限选 **App 管理（App Manager）**。
3. 下载 `.p8` 文件（**只能下载一次**，妥善保存，不要发给任何人、不要提交到仓库）。记下 **Key ID** 和页面上方的 **Issuer ID**。

## 第 4 步：把密钥放进 GitHub Secrets

打开仓库 → Settings → Secrets and variables → Actions：

**Secrets（New repository secret）**

| 名称 | 内容 |
| --- | --- |
| `ASC_KEY_ID` | 第 3 步的 Key ID |
| `ASC_ISSUER_ID` | 第 3 步的 Issuer ID |
| `ASC_KEY_P8` | `.p8` 文件的完整文本（含 `-----BEGIN PRIVATE KEY-----` 那几行），或其 base64 |
| `APPLE_TEAM_ID` | 第 1 步的 Team ID |

（可选，进阶）如果你想用 fastlane match 管理证书，再加 `MATCH_GIT_URL`（一个**私有**仓库地址）、`MATCH_PASSWORD`、`MATCH_GIT_BASIC_AUTHORIZATION`。不加的话，工作流会用 API Key 让 Xcode **自动签名**，对个人开发者最省事。

**Variables（Variables 标签页 → New repository variable）**

| 名称 | 值 |
| --- | --- |
| `IOS_RELEASE_ENABLED` | `true` |

没有这个变量，iOS 工作流会直接跳过——这就是“默认禁用”。

## 第 5 步：触发构建并上传 TestFlight

仓库 → Actions → “iOS → TestFlight” → Run workflow（可填一句测试说明）。

它会：`npm ci` → 构建网页（词库和全部缩略图打包进 App，约 80 MB；大图和录音首次打开时从 GitHub Pages 下载并缓存在本机，离线时显示文字卡片/系统朗读；设置里可在提示大小后一次性下载全部）→ `cap sync`（使用已提交的 `ios/`）→ 写入 App 图标 → 检查 App Store 必需设置 → fastlane 自动把 build 号 +1 → 编译签名 → 上传 TestFlight。

首次约 15–30 分钟。上传后 App Store Connect 里处理 10–30 分钟，然后：

- **内部测试**（你自己）：TestFlight → 内部测试 → 加你自己的 Apple ID，手机装 TestFlight App 就能装。
- **外部测试**：需要先过一次简短的 Beta 审核。

## 第 6 步：正式上架美区 App Store

1. App Store Connect → 你的 App → 定价与销售范围：选**免费**，销售范围勾选**美国**（也可加其他地区）。
2. App 隐私：按 `docs/APP_STORE_METADATA.md` 填写——收集“用户内容 → 其他用户内容”，不关联身份、不用于追踪、用途“App 功能”（用户同意后发给其自选的 AI 服务商）；其余全部“不收集”。隐私政策网址：`https://2023anita.github.io/oioi-wordtalk/privacy/`，支持网址：`https://2023anita.github.io/oioi-wordtalk/support/`。
3. 名称、副标题、描述、关键词（不含 IELTS）、分级问卷、出口合规、6.9" iPhone 截图计划都在 `docs/APP_STORE_METADATA.md`；审核备注（英文）在 `docs/APP_REVIEW_NOTES.md`。本 App 仅支持 iPhone，不需要 iPad 截图。
4. 在“构建版本”里选 TestFlight 那个 build → 提交审核。人工审核通常 1–3 天。

### 审核常见坑（提前准备）

- **4.2 最低功能**：纯网页套壳容易被拒。本应用有离线词库、FSRS、语音输入、AI 对话，审核备注里说明“离线可用的插画词库与记忆算法，AI 功能使用用户自己的 API Key（可用演示模式体验）”。
- **需要 Key 才能用的功能**：在审核备注里写明“演示模式无需 Key 即可体验全部流程”。
- **内容版权**：备注说明词库/插画/录音来自开源项目 Word Atlas（CC BY 4.0，已署名并修改），代码 MIT；界面音效已替换为程序合成。
- **名称**：不要使用「词光」作为 App 名。

## 本地用 Mac 调试（可选，免费）

```bash
npm ci
npm run build:ios      # 构建并 cap sync
npx cap open ios       # 用 Xcode 打开，选你的 iPhone 运行
```

不交年费也能用免费 Apple ID 装到自己手机，但每 7 天需重新安装一次。
