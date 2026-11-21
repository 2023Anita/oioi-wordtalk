/**
 * Optional CORS proxy for OiOi WordTalk (Cloudflare Worker).
 *
 * The app normally calls OpenAI-compatible providers directly from the browser
 * (MiniMax, DeepSeek, DashScope and OpenAI all allowed CORS when checked on 2026-11-22).
 * Deploy this only if a provider blocks browser calls on your network.
 *
 * It stores no keys and logs nothing: the browser sends the user's own key in
 * the Authorization header, and the target base URL in X-Target-Base, which must
 * be on the allow-list below.
 */
const ALLOWED_TARGETS = [
  "https://api.minimaxi.com/v1",
  "https://api.minimax.io/v1",
  "https://api.deepseek.com",
  "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "https://api.openai.com/v1",
];
// Origins allowed to use this proxy. Add your own domain if you self-host the app.
const ALLOWED_ORIGINS = ["https://2023anita.github.io", "capacitor://localhost", "http://localhost:5188"];

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-target-base",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/chat/completions") return new Response("Not found", { status: 404, headers: cors(origin) });
    if (!ALLOWED_ORIGINS.includes(origin)) return new Response("Origin not allowed", { status: 403, headers: cors(origin) });
    const target = (request.headers.get("X-Target-Base") || "").replace(/\/+$/, "");
    if (!ALLOWED_TARGETS.includes(target)) return new Response("Target not allowed", { status: 400, headers: cors(origin) });
    const upstream = await fetch(`${target}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: request.headers.get("Authorization") || "" },
      body: request.body,
    });
    const headers = new Headers(cors(origin));
    headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/json");
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
