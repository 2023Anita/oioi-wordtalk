# 安全与隐私 / Security and privacy

## 数据去哪里

OiOi WordTalk 没有账号、服务器端存储、统计或追踪。学习进度只保存在当前浏览器（localStorage / IndexedDB），可以在「我的」里导出为 JSON 备份。导入备份时会逐字段校验，畸形数据会被丢弃。

**模型 API Key（BYOK）**：用户在「模型设置」填写的 Key 只保存在本机 localStorage 的独立键 `oioi-wordtalk:ai` 中，不进入学习备份，只随请求直接发给用户选择的服务商（或用户自己部署的可选代理）。AI 功能会把用户输入的英文、任务词与提示词发给该服务商。

OiOi WordTalk has no accounts, server-side storage, analytics or tracking. Model API keys are stored only on the device, excluded from backups, and sent only to the provider the user chose.

## 凭据 / Credentials

网页本身不内置任何 API key（AI 功能使用用户自带的 Key，见上）。只有 `scripts/atlas/` 中的内容生成脚本需要调用模型服务，它们从环境变量（`SUB2_BASE_URL`、`SUB2_API_KEY`、`ELEVENLABS_API_KEY`）或仓库外的目录（`ATLAS_SECRETS`）读取凭据，不会写入仓库。

- 不要使用 `VITE_*` 变量存放凭据，它们会被打包进浏览器代码。
- 如果凭据意外泄露，请立刻在服务商处吊销或轮换。

## 报告问题 / Reporting

发现安全问题请通过 GitHub 私密漏洞报告（Security → Report a vulnerability）联系维护者，不要公开贴出细节。
