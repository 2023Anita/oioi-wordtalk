// Live-AI captures: app configured for OpenRouter (free model); openrouter.ai calls are relayed through mirror.py /or/*,
// which adds the key (OPENROUTER_API_KEY or an egress proxy); the app itself only holds a placeholder. Imported by live-*.mjs.
import { open, nav } from "./common.mjs";
const MODEL = process.env.MODEL || "openrouter/free";
const PROFILE = process.env.PROFILE || "/tmp/ow-live";
const SCALE = Number(process.env.SCALE || 1);
const { ctx, p } = await open(PROFILE, SCALE);
await ctx.addInitScript((m) => {
  const cur = JSON.parse(localStorage.getItem("oioi-wordtalk:ai") || "null");
  if (!cur || cur.model !== m) localStorage.setItem("oioi-wordtalk:ai", JSON.stringify({ provider: "openrouter", baseUrl: "https://openrouter.ai/api/v1", model: m, apiKey: "proxy-injected", proxyUrl: "", temperature: 0.7 }));
}, MODEL);
// Optional: pin today's practice set (word ids + scenario id), as if picked with 换一组 / scenario chips.
if (process.env.IDS) await ctx.addInitScript(([ids, scen]) => {
  const d = new Date(); const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const cur = JSON.parse(localStorage.getItem("oioi-wordtalk:daily") || "null");
  if (!cur || cur.day !== day || cur.ids.join() !== ids.join() || cur.scenario !== scen) localStorage.setItem("oioi-wordtalk:daily", JSON.stringify({ day, scenario: scen, ids, done: cur && cur.day === day ? cur.done : [] }));
}, [process.env.IDS.split(","), process.env.SCENARIO || "restaurant"]);
const log = [];
await ctx.route(/^https:\/\/openrouter\.ai\//, async (r) => {
  const req = r.request();
  if (req.method() === "OPTIONS") return r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,OPTIONS" } });
  const u = req.url().replace("https://openrouter.ai/api/v1/", "http://127.0.0.1:8800/or/");
  const h = { "content-type": req.headers()["content-type"] || "application/json" };
  const res = await fetch(u, { method: req.method(), headers: h, body: req.method() === "POST" ? req.postData() : undefined });
  const body = Buffer.from(await res.arrayBuffer());
  if (req.method() === "POST") { log.push({ status: res.status, req: req.postData()?.slice(0, 300), res: body.toString() }); }
  return r.fulfill({ status: res.status, headers: { "content-type": res.headers.get("content-type") || "application/json", "access-control-allow-origin": "*" }, body });
});
export { ctx, p, log, MODEL };
