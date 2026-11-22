// Compose App Store marketing frames: headline over washi paper, app capture below. Output 1320x2868 PNG.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "fs";
import { pathToFileURL } from "url";
import path from "path";
const here = path.dirname(new URL(import.meta.url).pathname);
const FRAMES = JSON.parse(readFileSync(path.join(here, "frames.json"), "utf8"));
const root = path.resolve(here, "../..");
const OUT = process.env.OUT || path.join(root, "fastlane/screenshots/en-US");
const RAW = process.env.RAW || path.join(here, "raw");
const font = pathToFileURL(path.join(root, "node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2")).href;
const logo = pathToFileURL(path.join(root, "public/brand/logo.webp")).href;
const noise = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12 0 0 0 0 0.14 0 0 0 0 0.22 0 0 0 .10 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;
const html = (f) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Fraunces;src:url(${font}) format("woff2");font-weight:100 900}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:440px;height:956px;overflow:hidden}
body{background:${noise}, radial-gradient(120% 60% at 50% 0%, #fbf7ee 0%, #f4efe4 55%, #ebe4d5 100%);font-family:Fraunces,"Noto Serif CJK SC",serif;color:#1d2a4a;position:relative}
.wave{position:absolute;left:0;right:0;bottom:0;height:120px;opacity:.5;background:radial-gradient(circle at 50% 100%, transparent 14px, #ddd5c3 15px, transparent 16px, transparent 20px, #ddd5c3 21px, transparent 22px) 0 0/40px 22px}
.head{position:absolute;top:26px;left:30px;right:30px;text-align:center}
.eyebrow{display:flex;align-items:center;justify-content:center;gap:7px;font:600 10.5px/1 "Noto Sans CJK SC",sans-serif;letter-spacing:.18em;color:#c2452d;text-transform:uppercase}
.eyebrow img{height:18px}
h1{margin-top:12px;font-weight:640;font-size:${f.size || 31}px;line-height:1.08;letter-spacing:-.01em;font-variation-settings:"opsz" 72}
.sub{margin-top:9px;font:500 13.5px/1.3 "Noto Serif CJK SC",serif;color:#5a6378;letter-spacing:.04em}
.shot{position:absolute;left:50%;transform:translateX(-50%);top:174px;width:352px;height:${(352 * 956) / 440}px;border-radius:30px;overflow:hidden;box-shadow:0 0 0 1.5px rgba(29,42,74,.10),0 18px 40px -12px rgba(29,42,74,.35),0 4px 12px rgba(29,42,74,.10);background:#f4efe4}
.shot img{width:100%;height:100%;display:block}
.seal{position:absolute;top:18px;right:20px;width:10px;height:10px;border-radius:50%;background:#c2452d;opacity:.0}
</style></head><body><div class="wave"></div>
<div class="head"><div class="eyebrow"><img src="${logo}">OiOi WordTalk · 词聊</div><h1>${f.title}</h1><p class="sub">${f.sub}</p></div>
<div class="shot"><img src="${pathToFileURL(path.join(RAW, f.raw + ".png")).href}"></div></body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });
const ONLY = process.argv.slice(2); // optional: raw names to (re)compose, e.g. 03-scene 04-chat
for (const f of FRAMES.filter((f) => !ONLY.length || ONLY.includes(f.raw))) {
  const file = path.join(RAW, "_frame.html");
  writeFileSync(file, html(f));
  await p.goto(pathToFileURL(file).href);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  const h = await p.evaluate(() => document.querySelector("h1").getBoundingClientRect().height);
  await p.screenshot({ path: path.join(OUT, f.out + ".png") });
  console.log(f.out, "h1 height", Math.round(h));
}
await b.close();
