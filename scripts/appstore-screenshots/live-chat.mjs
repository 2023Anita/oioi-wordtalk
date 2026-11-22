// Send one learner message in Chat and wait for the real AI reply. Usage: node live-chat.mjs "message"
import { ctx, p, log } from "./live.mjs";
import { nav } from "./common.mjs";
(await import("fs")).mkdirSync(new URL("raw", import.meta.url).pathname, { recursive: true });
import { writeFileSync } from "fs";
const msg = process.argv[2];
await nav(p, "chat", 3000);
const consent = async () => { const b = await p.$("text=同意 Agree"); if (b) { await b.click(); console.log("consent accepted"); } };
const state = () => p.evaluate(() => { const k = Object.keys(localStorage).find((k) => k.includes("chat")); return k ? { k, v: JSON.parse(localStorage.getItem(k)) } : null; });
let st = await state();
console.log("chat key", st?.k, "msgs", st?.v?.msgs?.length);
if (st?.v?.msgs?.some((m) => m.role === "user" && m.content === msg && m.turn)) { console.log("already answered"); await ctx.close(); process.exit(0); }
for (let attempt = 0; attempt < 2; attempt++) {
  st = await state();
  if (st && st.v.msgs.at(-1)?.role === "user") { st.v.msgs.pop(); await p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [st.k, st.v]); await nav(p, "chat", 3000); console.log("removed dangling user msg"); }
  await p.fill('input[aria-label="你的回复"]', msg); await p.keyboard.press("Enter");
  let ok = false;
  for (let i = 0; i < 52; i++) { await p.waitForTimeout(1000); await consent(); st = await state(); const last = st?.v?.msgs?.at(-1); if (last?.role === "assistant" && last.src === "ai") { ok = true; break; } if (await p.$(".wt-page .error-note, .wt-page [role=alert]")) { console.log("error:", await p.evaluate(() => document.querySelector(".wt-page .error-note, .wt-page [role=alert]")?.innerText)); break; } }
  if (ok) break;
}
st = await state();
console.log(JSON.stringify(st?.v?.msgs?.slice(-2), null, 1).slice(0, 1500), "lit", st?.v?.lit);
writeFileSync(new URL("raw/chat-log.json", import.meta.url).pathname, JSON.stringify(log, null, 1));
await ctx.close();
