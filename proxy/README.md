# 可选代理 / Optional proxy (Cloudflare Worker)

**大多数情况下不需要它。** 2026-11-22 用 `curl -X OPTIONS` 检查过：MiniMax（中国站与 Global）、DeepSeek、DashScope 兼容模式、OpenRouter 和 OpenAI 都允许浏览器跨域（CORS）直接调用，所以 App 默认直连服务商。

只有当你的网络或某个服务商拦截了浏览器直连时，才需要自己部署这个 Worker（本仓库没有替你部署）：

```bash
npm i -g wrangler
cd proxy
wrangler login
wrangler deploy        # 得到 https://oioi-wordtalk-proxy.<你的子域>.workers.dev
```

然后在 App 的「模型设置 → 高级 → 代理 Proxy URL」里填入这个地址。

- 代理不保存、不记录任何 Key；Key 仍由浏览器放在 `Authorization` 头里转发。
- 只转发到 `worker.js` 白名单内的服务商，只接受白名单里的来源（Origin）。自托管 App 时请把你的域名加进 `ALLOWED_ORIGINS`。

English: optional and not deployed. Deploy with `wrangler deploy`, then paste the Worker URL into Settings → Advanced → Proxy URL. It forwards only to allow-listed providers and stores nothing.
