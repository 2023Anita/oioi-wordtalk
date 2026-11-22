// Simulate real use of the app on past days (shifted clock) so Me/FSRS screens show genuine history.
import { open, nav, fiberFind } from "./common.mjs";
const offsets = process.argv.slice(2).map(Number);
const t0 = Date.now();
for (const off of offsets) {
  const { ctx, p } = await open();
  await ctx.addInitScript((ms) => { const D = Date; class FD extends D { constructor(...a) { if (a.length === 0) super(D.now() + ms); else super(...a); } static now() { return D.now() + ms; } } window.Date = FD; }, off * 86400000);
  await nav(p, "learn", 2500);
  for (let i = 0; i < 150; i++) {
    await p.waitForTimeout(250);
    if (!p.url().includes("learn")) break;
    const spell = await p.$(".spell-input:not([readonly])");
    if (spell) { const e = await p.evaluate(fiberFind(".spell", "entry")); const wrong = Math.random() < 0.15; await spell.fill(wrong ? e.w.slice(0, -1) + "x" : e.w); await p.keyboard.press("Enter"); continue; }
    const opt = await p.$("button.option:not([disabled])");
    if (opt) { const step = await p.evaluate(fiberFind(".options", "step")); if (Math.random() < 0.12) await opt.click(); else await p.click(`[data-option="${step.id}"]`); continue; }
    const xl = await p.$("button.btn-xl");
    if (xl) { await xl.click(); continue; }
  }
  // scene quiz (demo content, offline)
  await nav(p, "scene", 2500);
  const qs = await p.evaluate(() => { const el = document.querySelector(".wt-option"); if (!el) return null; const k = Object.keys(el).find((k) => k.startsWith("__reactFiber$")); let f = el[k]; while (f) { let h = f.memoizedState; while (h && typeof h === "object" && "next" in h) { const s = h.memoizedState; if (s && s.questions) return s.questions.map((q) => q.answer); h = h.next; } f = f.return; } return null; });
  if (qs) { const arts = await p.$$(".wt-q"); for (let i = 0; i < qs.length; i++) { const pick = Math.random() < 0.2 ? (qs[i] + 1) % 4 : qs[i]; const b = await arts[i].$$(".wt-option"); await b[pick].click(); await p.waitForTimeout(200); } }
  const st = await p.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); return { cards: Object.keys(s.cards).length, days: Object.keys(s.days).length }; }, "oioi-wordtalk:v2:word-atlas-open");
  console.log("day", off, "scene", !!qs, JSON.stringify(st), Math.round((Date.now() - t0) / 1000) + "s");
  await ctx.close();
}
