import { chromium } from "playwright";
// Live site by default. If the browser cannot reach it directly (e.g. behind a proxy), run `python3 mirror.py` and set
// BASE=http://127.0.0.1:8800/oioi-wordtalk/ — media URLs on 2023anita.github.io are then rewritten to the mirror too.
export const BASE = process.env.BASE || "https://2023anita.github.io/oioi-wordtalk/";
const LOCAL = BASE.startsWith("http://127.0.0.1");
export const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
export async function open(profile = process.env.PROFILE || "/tmp/ow-profile", scale = 1) {
  const ctx = await chromium.launchPersistentContext(profile, { viewport: { width: 440, height: 956 }, deviceScaleFactor: scale, userAgent: UA, isMobile: true, hasTouch: true, locale: "zh-CN", timezoneId: "America/Los_Angeles" });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem("oioi-wordtalk:settings"))
      localStorage.setItem("oioi-wordtalk:settings", JSON.stringify({ onboarded: true, splash: false, sfx: false, theme: "light", autoplay: false }));
  });
  if (LOCAL) await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => {
    const u = r.request().url();
    if (u.startsWith("https://2023anita.github.io/")) return r.continue({ url: u.replace("https://2023anita.github.io", "http://127.0.0.1:8800") });
    return r.abort();
  });
  const p = ctx.pages()[0] || (await ctx.newPage());
  return { ctx, p };
}
export async function nav(p, hash, wait = 2500) {
  await p.goto(BASE + "#/" + hash, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForSelector(".app", { timeout: 40000 });
  await p.waitForTimeout(wait);
}
export const fiberFind = (sel, propName) => `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return null; const k = Object.keys(el).find(k => k.startsWith("__reactFiber$")); let f = el[k]; while (f) { if (f.memoizedProps && f.memoizedProps[${JSON.stringify(propName)}]) return f.memoizedProps[${JSON.stringify(propName)}]; f = f.return; } return null; })()`;
