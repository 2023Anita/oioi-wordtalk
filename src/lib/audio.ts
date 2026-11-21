import { duck } from "./sound";

/**
 * Pronunciation playback: a recording when one exists, otherwise the device voice.
 *
 * iOS Safari / WKWebView only allow `audio.play()` and `speechSynthesis.speak()` when they
 * are called synchronously inside the user's tap. So `play()` below never awaits before it
 * starts either one, and it "unlocks" speech synthesis during the tap so that a recording
 * which fails later (404, offline, decode error) can still fall back to the device voice.
 */

export type Accent = "uk" | "us";
export type PlayResult = "recorded" | "device" | "unsupported" | "stopped";

let current: HTMLAudioElement | null = null;
let token = 0;
let plays = 0;
/** Keep a reference so Safari does not garbage-collect the utterance mid-sentence. */
let utterance: SpeechSynthesisUtterance | null = null;
let voices: SpeechSynthesisVoice[] = [];
let voicesHooked = false;
let ttsUnlocked = false;
let sessionSet = false;

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis ?? null;
}

/** Voices load asynchronously (empty on first call in Chrome and iOS); cache them as they arrive. */
function loadVoices(): SpeechSynthesisVoice[] {
  const s = synth();
  if (!s) return voices;
  if (!voicesHooked) {
    voicesHooked = true;
    const refresh = () => {
      const v = s.getVoices();
      if (v.length) voices = v;
    };
    if (typeof s.addEventListener === "function") s.addEventListener("voiceschanged", refresh);
    else s.onvoiceschanged = refresh;
  }
  const v = s.getVoices();
  if (v.length) voices = v;
  return voices;
}

const norm = (lang: string) => lang.replace("_", "-").toLowerCase();
const NICE = /premium|enhanced|natural|neural|google|siri|daniel|serena|kate|samantha|ava|allison/i;

/** Best voice for a BCP-47 tag: exact locale first (nicer voices preferred), then any English voice. */
export function pickVoice(list: readonly SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  const want = norm(lang);
  const exact = list.filter((v) => norm(v.lang) === want);
  if (exact.length) return exact.find((v) => NICE.test(v.name)) ?? exact.find((v) => v.localService) ?? exact[0];
  const base = want.split("-")[0];
  const same = list.filter((v) => norm(v.lang).split("-")[0] === base);
  return same.find((v) => NICE.test(v.name)) ?? same[0];
}

/** Safari 17+: let page audio play even when the ring/silent switch is on. Best effort. */
function playbackSession() {
  if (sessionSet || typeof navigator === "undefined") return;
  sessionSet = true;
  const n = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (n.audioSession) n.audioSession.type = "playback";
  } catch {
    /* not supported */
  }
}

/**
 * Speak with the device voice. Everything up to `speak()` runs synchronously, so calling this
 * from a tap handler satisfies iOS. Resolves when speech ends (or a safety timeout passes,
 * since Safari sometimes never fires `end`).
 */
export function speakText(text: string, accent: Accent = "uk", rate = 1): Promise<"device" | "unsupported"> {
  const s = synth();
  if (!s || typeof SpeechSynthesisUtterance === "undefined" || !text.trim()) return Promise.resolve("unsupported");
  // Cancel anything queued first. Only when needed: on iOS an unconditional cancel() right
  // before speak() can swallow the new utterance.
  if (s.speaking || s.pending) s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = accent === "uk" ? "en-GB" : "en-US";
  u.rate = Math.max(0.5, Math.min(1.5, rate * 0.9));
  u.volume = 1;
  const v = pickVoice(loadVoices(), u.lang);
  if (v) u.voice = v;
  utterance = u;
  ttsUnlocked = true;
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (utterance === u) utterance = null;
      resolve("device");
    };
    const timer = setTimeout(finish, Math.max(4000, text.length * 160) / Math.max(0.5, u.rate));
    u.onend = finish;
    u.onerror = finish;
    s.speak(u);
    // iOS can leave the engine paused after an interruption; nudge it.
    if (typeof s.resume === "function" && s.paused) s.resume();
  });
}

/** Prime speech synthesis inside a tap so a later (async) fallback is allowed to speak on iOS. */
function unlockSpeech() {
  const s = synth();
  if (ttsUnlocked || !s || typeof SpeechSynthesisUtterance === "undefined") return;
  ttsUnlocked = true;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  utterance = u;
  s.speak(u);
}

export function stopAudio() {
  token++;
  if (current) {
    current.onpause = null;
    current.pause();
  }
  current = null;
  const s = synth();
  if (s && (s.speaking || s.pending)) s.cancel();
}

/**
 * Play a recording, falling back to the device voice. Call it directly from the tap handler:
 * it starts playback synchronously. Resolves when playback ends.
 */
export function play(url: string | null | undefined, text: string, accent: Accent = "uk", rate = 1): Promise<PlayResult> {
  duck(true);
  stopAudio();
  playbackSession();
  const mine = ++token;
  const id = ++plays;
  let out: Promise<PlayResult>;
  if (url && typeof Audio !== "undefined") {
    unlockSpeech();
    const a = new Audio();
    a.preload = "auto";
    a.src = url;
    a.playbackRate = rate;
    current = a;
    let started: Promise<void>;
    try {
      started = Promise.resolve(a.play());
    } catch (err) {
      started = Promise.reject(err);
    }
    out = started
      .then(
        () =>
          new Promise<void>((resolve, reject) => {
            a.onended = () => resolve();
            a.onpause = () => resolve();
            a.onerror = () => reject(new Error("audio error"));
          }),
      )
      .then(
        () => "recorded" as const,
        () => {
          if (mine !== token) return "stopped" as const;
          current = null;
          return speakText(text, accent, rate);
        },
      );
  } else {
    out = speakText(text, accent, rate);
  }
  return out.finally(() => {
    if (id === plays) duck(false);
  });
}

/** Test hook: reset module state. */
export function __resetAudioForTests() {
  current = null;
  token = 0;
  plays = 0;
  utterance = null;
  voices = [];
  voicesHooked = false;
  ttsUnlocked = false;
  sessionSet = false;
}
