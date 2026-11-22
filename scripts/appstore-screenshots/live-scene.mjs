import { ctx, p, log, MODEL } from "./live.mjs";
import { nav } from "./common.mjs";
(await import("fs")).mkdirSync(new URL("raw", import.meta.url).pathname, { recursive: true });
const SCEN = process.env.SCEN || "餐厅点餐";
await nav(p, "scene", 2500);
const consent = async () => { const b = await p.$("text=同意 Agree"); if (b) { await b.click(); console.log("consent accepted"); } };
for (let i=0;i<10;i++){ await consent(); if (!(await p.$(".sheet-root"))) break; await p.waitForTimeout(500);} 
if (!process.env.IDS) await p.click(`.wt-scenes >> text=${SCEN}`);

for (let i = 0; i < 105; i++) { await p.waitForTimeout(1000); await consent(); if (await p.$(".wt-q")) break; const rb = await p.$(".wt-stage >> text=重试"); if (rb) { console.log("retry at", i); await rb.click(); } }
console.log("words:", await p.evaluate(() => [...document.querySelectorAll(".wt-scenes ~ * .chip, .panel .word-chip, .chips button")].map(e=>e.innerText.replace(/\s+/g," ")).slice(0,12).join(" | ")));
console.log("stage:", (await p.evaluate(() => document.querySelector(".wt-stage")?.innerText)).slice(0, 1500));
(await import("fs")).writeFileSync(new URL("raw/scene-log.json", import.meta.url).pathname, JSON.stringify(log,null,1));
await p.screenshot({ path: new URL("raw/scene-full.png", import.meta.url).pathname, fullPage: true });
await ctx.close();
