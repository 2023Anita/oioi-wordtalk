import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iOS wrapper for OiOi WordTalk.
 * Build web assets with `npm run build:ios` (relative base, media streamed from GitHub Pages),
 * then open ios/App in Xcode or let the TestFlight workflow build it.
 */
const config: CapacitorConfig = {
  appId: "com.oioiacademy.wordtalk",
  appName: "OiOi WordTalk",
  webDir: "dist",
  ios: {
    contentInset: "always",
    backgroundColor: "#0b2324",
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
