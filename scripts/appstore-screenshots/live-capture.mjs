// Capture raw 1320x2868 screens from the live-AI profile (run live-scene.mjs / live-chat.mjs first; results are cached in the app).
import { ctx, p } from "./live.mjs";
import { nav } from "./common.mjs";
const OUT = process.env.OUT || new URL("raw", import.meta.url).pathname;
(await import("fs")).mkdirSync(OUT, { recursive: true });
const settle = async (ms = 1500) => {
  await p.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await p.addStyleTag({ content: "*,*::before,*::after{caret-color:transparent!important} .toast,.toasts{display:none!important}" });
  await p.waitForTimeout(ms);
};
const which = process.argv.slice(2);
if (which.includes("scene")) {
  await nav(p, "scene", 2500);
  for (let i = 0; i < 30 && !(await p.$(".wt-q")); i++) await p.waitForTimeout(1000);
  const mode = process.env.SCENE_MODE || "title";
  await p.evaluate((mode) => { const c = mode === "story" ? document.querySelector(".wt-stage .wt-title").closest(".panel-head").nextElementSibling : document.querySelector(".wt-stage"); window.scrollTo(0, c.getBoundingClientRect().top + scrollY - (mode === "story" ? 66 : 78)); }, mode);
  await settle(); await p.screenshot({ path: `${OUT}/03-scene.png`, animations: "disabled" }); console.log("saved 03-scene");
}
if (which.includes("chat")) {
  await nav(p, "chat", 2500);
  const top = Number(process.env.CHAT_TOP || 250);
  await p.evaluate((top) => { const c = document.querySelector(".wt-thread"); window.scrollTo(0, c.getBoundingClientRect().top + scrollY - top); }, top);
  await p.waitForTimeout(800);
  if (process.env.CHAT_FROM) await p.evaluate((i) => { window.__from = i[0]; window.__to = i[1]; }, [Number(process.env.CHAT_FROM), Number(process.env.CHAT_TO ?? -1)]);
  // Align: last AI reply's bottom at the thread's bottom edge (or first learner message at the top when it all fits).
  const info = await p.evaluate(() => { const t = document.querySelector(".wt-thread"); const r = t.getBoundingClientRect(); const ms = [...t.querySelectorAll(".wt-msg")]; const u = t.querySelector(".wt-msg.is-user"); const last = ms.at(-1); const firstY = u.getBoundingClientRect().top - r.top + t.scrollTop - 14; const lastY = last.getBoundingClientRect().bottom - r.top + t.scrollTop + 14 - t.clientHeight; const ai = t.querySelectorAll(".wt-msg:not(.is-user)"); const fromIdx = Number(window.__from ?? -1); const startEl = fromIdx >= 0 ? ms[fromIdx] : u; const startY = startEl.getBoundingClientRect().top - r.top + t.scrollTop - 14; const endIdx = Number(window.__to ?? -1); const endY = endIdx >= 0 ? ms[endIdx].getBoundingClientRect().bottom - r.top + t.scrollTop + 14 - t.clientHeight : startY; t.scrollTop = fromIdx >= 0 ? (endY <= startY ? (startY + endY) / 2 : startY) : Math.min(firstY, Math.max(lastY, 0)); return { startY, endY, n: ms.length, h: t.clientHeight, firstY, lastY, top: r.top, bottom: r.bottom, vh: innerHeight }; });
  console.log(JSON.stringify(info));
  await settle(); await p.screenshot({ path: `${OUT}/04-chat.png`, animations: "disabled" }); console.log("saved 04-chat");
}
await ctx.close();
