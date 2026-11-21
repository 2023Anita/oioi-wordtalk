#!/usr/bin/env node
/**
 * Guard for the committed iOS project (App Store review requirements). Runs in CI after
 * `npx cap sync ios`. Fails if a required Info.plist key, the privacy manifest, the iPhone-only
 * setting or the bundled thumbnails go missing (e.g. after regenerating ios/).
 */
import fs from "node:fs";

const errors = [];
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : (errors.push(`missing ${p}`), ""));
const plist = read("ios/App/App/Info.plist");
const keyHas = (key, re) => {
  const m = plist.match(new RegExp(`<key>${key}</key>\\s*(<array>[\\s\\S]*?</array>|<[^>]+>[^<]*</[^>]+>|<(true|false)/>)`));
  if (!m) return errors.push(`Info.plist: missing ${key}`);
  if (re && !re.test(m[1])) errors.push(`Info.plist: ${key} has unexpected value ${m[1].replace(/\s+/g, " ").slice(0, 120)}`);
};
keyHas("NSMicrophoneUsageDescription", /<string>.*[\u4e00-\u9fff].*[A-Za-z]{4,}.*<\/string>/s);
keyHas("NSSpeechRecognitionUsageDescription", /<string>.*[\u4e00-\u9fff].*[A-Za-z]{4,}.*<\/string>/s);
keyHas("ITSAppUsesNonExemptEncryption", /<false\/>/);
keyHas("UIDeviceFamily", /^<array>\s*<integer>1<\/integer>\s*<\/array>$/);
keyHas("UISupportedInterfaceOrientations", /^<array>\s*<string>UIInterfaceOrientationPortrait<\/string>\s*<\/array>$/);
keyHas("UILaunchStoryboardName", /LaunchScreen/);
if (/UISupportedInterfaceOrientations~ipad/.test(plist)) errors.push("Info.plist: iPad orientations present but the app is iPhone-only");

const pbx = read("ios/App/App.xcodeproj/project.pbxproj");
if (/TARGETED_DEVICE_FAMILY = "?1,2"?;/.test(pbx) || !/TARGETED_DEVICE_FAMILY = 1;/.test(pbx)) errors.push("project.pbxproj: TARGETED_DEVICE_FAMILY must be 1 (iPhone only)");
if (!/PrivacyInfo\.xcprivacy in Resources/.test(pbx)) errors.push("project.pbxproj: PrivacyInfo.xcprivacy is not in the app target's resources");
if (!/PRODUCT_BUNDLE_IDENTIFIER = com\.oioiacademy\.wordtalk;/.test(pbx)) errors.push("project.pbxproj: bundle id is not com.oioiacademy.wordtalk");

const priv = read("ios/App/App/PrivacyInfo.xcprivacy");
if (!/<key>NSPrivacyTracking<\/key>\s*<false\/>/.test(priv)) errors.push("PrivacyInfo.xcprivacy: NSPrivacyTracking must be false");
if (!/CA92\.1/.test(priv)) errors.push("PrivacyInfo.xcprivacy: missing UserDefaults reason CA92.1");

const pub = "ios/App/App/public";
if (fs.existsSync(pub)) {
  if (!fs.existsSync(`${pub}/atlas/index.json`)) errors.push("bundle: atlas/index.json missing from ios/App/App/public");
  const thumbs = fs.existsSync(`${pub}/atlas/thumb`) ? fs.readdirSync(`${pub}/atlas/thumb`).length : 0;
  if (thumbs < 1000) errors.push(`bundle: expected bundled thumbnails, found ${thumbs}`);
  if (fs.existsSync(`${pub}/atlas/img`) || fs.existsSync(`${pub}/atlas/audio`)) errors.push("bundle: full images/audio should be fetched on demand, not bundled");
  if (!fs.existsSync(`${pub}/atlas/media-manifest.json`)) errors.push("bundle: atlas/media-manifest.json missing (run scripts/strip-media.mjs)");
  console.log(`bundled thumbnails: ${thumbs}`);
}

if (errors.length) {
  for (const e of errors) console.error(`::error::${e}`);
  process.exit(1);
}
console.log("iOS project checks passed");
