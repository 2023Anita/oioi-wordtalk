#!/usr/bin/env node
/** Copy the 1024px app icon into the generated Capacitor iOS project (single-size AppIcon set). */
import fs from "node:fs";
import path from "node:path";
const set = "ios/App/App/Assets.xcassets/AppIcon.appiconset";
if (!fs.existsSync(set)) {
  console.log("no iOS project yet; run `npx cap add ios` first");
  process.exit(0);
}
for (const f of fs.readdirSync(set)) if (f.endsWith(".png")) fs.rmSync(path.join(set, f));
fs.copyFileSync("resources/icon-1024.png", path.join(set, "AppIcon-1024.png"));
fs.writeFileSync(
  path.join(set, "Contents.json"),
  JSON.stringify({ images: [{ filename: "AppIcon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" }], info: { author: "xcode", version: 1 } }, null, 2),
);
console.log("app icon installed");
