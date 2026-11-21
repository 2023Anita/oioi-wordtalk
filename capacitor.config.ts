import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iOS app for OiOi WordTalk. The native project is committed in ios/ (Info.plist keys, privacy
 * manifest, iPhone-only, portrait, launch screen); scripts/ios-verify.mjs checks it in CI.
 * Build with `npm run build:ios`: the dataset and thumbnails are bundled, full illustrations and
 * audio are fetched on demand from GitHub Pages and cached on the device.
 */
const config: CapacitorConfig = {
  appId: "com.oioiacademy.wordtalk",
  appName: "OiOi WordTalk",
  webDir: "dist",
  ios: {
    contentInset: "always",
    backgroundColor: "#f4efe4",
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
