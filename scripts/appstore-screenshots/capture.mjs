// Capture raw 1320x2868 app screens (440x956 @3x, iPhone Safari UA, offline demo mode — no API key, no AI calls).
// Usage (from repo root):
//   node scripts/appstore-screenshots/sim.mjs -13 -12 -11 -9 -8 -7 -5 -4 -3 -2 -1   # real study sessions on shifted days -> history for Me/FSRS
//   node scripts/appstore-screenshots/capture.mjs today scene chat logic me         # main profile (chat sends 2 demo messages first time)
//   PROFILE=/tmp/ow-fresh node scripts/appstore-screenshots/capture.mjs word       # fresh profile -> first new-word card
//   node scripts/appstore-screenshots/compose.mjs                                   # -> fastlane/screenshots/en-US/*.png
import { open, nav } from "./common.mjs";
import path from "path";
const OUT = process.env.OUT || path.join(path.dirname(new URL(import.meta.url).pathname), "raw");
import { mkdirSync } from "fs";
mkdirSync(OUT, { recursive: true });
const which = process.argv.slice(2);
const settle = async (p, ms = 1500) => {
  await p.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await p.waitForFunction(() => [...document.images].filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; }).every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 20000 }).catch(() => console.log("  (some images not loaded)"));
  await p.addStyleTag({ content: "*,*::before,*::after{caret-color:transparent!important} .toast,.toasts,[class*=devtools]{display:none!important}" });
  await p.waitForTimeout(ms);
};
const scrollTo = (p, y) => p.evaluate((y) => window.scrollTo(0, y), y);
const shot = async (p, name) => { await p.screenshot({ path: `${OUT}/${name}.png`, animations: "disabled", timeout: 60000 }); console.log("saved", name); };
const shots = {
  async today(p) { await nav(p, "", 3000); await settle(p); await shot(p, "01-today"); },
  async scene(p) { await nav(p, "scene", 2000); await p.click("text=餐厅点餐"); await p.waitForTimeout(2000); await p.evaluate(() => { const s = document.querySelector(".wt-story") || [...document.querySelectorAll("section.panel")].find(e => /Ordering at/.test(e.innerText)); const c = s.closest(".panel") || s; window.scrollTo(0, c.getBoundingClientRect().top + scrollY - 78); }); await settle(p); await shot(p, "03-scene"); },
  async chat(p) {
    await nav(p, "chat", 2000); await p.click("text=餐厅点餐"); await p.waitForTimeout(1000);
    if (!(await p.$(".wt-msg.is-user"))) for (const m of ["Hi! What is the price of the banana pancakes today?", "Great. Could we sit by the window on the east side, please?"]) { await p.fill('input[aria-label="你的回复"]', m); await p.keyboard.press("Enter"); await p.waitForTimeout(2500); }
    await p.evaluate(() => { const c = document.querySelector(".wt-thread"); window.scrollTo(0, c.getBoundingClientRect().top + scrollY - 250); });
    await p.evaluate(() => { const t = document.querySelector(".wt-thread"); const u = t.querySelector(".wt-msg.is-user"); t.scrollTop = u.getBoundingClientRect().top - t.getBoundingClientRect().top + t.scrollTop - 14; });
    await settle(p); await shot(p, "04-chat");
  },
  async logic(p) { await nav(p, "logic", 2000); await p.click("main >> text=angry"); await p.waitForTimeout(1500); await scrollTo(p, 180); await settle(p); await shot(p, "05-logic"); },
  async me(p) { await nav(p, "me", 2500); await scrollTo(p, Number(process.env.ME_Y || 0)); await settle(p); await shot(p, "06-progress"); },
  async word(p) { await nav(p, "learn", 3000); await settle(p, 2500); await shot(p, "02-word"); },
};
const profile = process.env.PROFILE || "/tmp/ow-profile";
const { ctx, p } = await open(profile, 3);
for (const w of which) await shots[w](p);
await ctx.close();
