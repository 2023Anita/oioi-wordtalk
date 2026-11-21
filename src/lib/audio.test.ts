import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { __resetAudioForTests, pickVoice, play, speakText, stopAudio } from "./audio";

type Utter = { text: string; lang: string; rate: number; volume: number; voice?: unknown; onend?: () => void; onerror?: () => void };

const log: string[] = [];
let spoken: Utter[] = [];
let playImpl: () => Promise<void> = () => Promise.resolve();
let audios: FakeAudio[] = [];
let voiceList: { name: string; lang: string; localService: boolean }[] = [];

class FakeUtterance implements Utter {
  lang = "";
  rate = 1;
  volume = 1;
  voice?: unknown;
  onend?: () => void;
  onerror?: () => void;
  constructor(public text: string) {}
}

class FakeAudio {
  src = "";
  preload = "";
  playbackRate = 1;
  onended: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    audios.push(this);
  }
  play() {
    log.push(`audio.play ${this.src}`);
    return playImpl();
  }
  pause() {
    log.push("audio.pause");
  }
}

const synth = {
  speaking: false,
  pending: false,
  paused: false,
  getVoices: () => voiceList,
  addEventListener: () => {},
  cancel() {
    log.push("cancel");
  },
  resume() {},
  speak(u: Utter) {
    log.push(`speak ${JSON.stringify(u.text)}`);
    spoken.push(u);
  },
};

const g = globalThis as Record<string, unknown>;
g.window = { speechSynthesis: synth };
g.SpeechSynthesisUtterance = FakeUtterance;
g.Audio = FakeAudio;

beforeEach(() => {
  __resetAudioForTests();
  log.length = 0;
  spoken = [];
  audios = [];
  voiceList = [];
  synth.speaking = synth.pending = false;
  playImpl = () => Promise.resolve();
});

const tick = () => new Promise((r) => setTimeout(r, 0));

test("no recording: speaks synchronously inside the tap (iOS gesture rule)", async () => {
  const p = play(null, "The essay must be submitted by Friday.", "uk");
  // Before any await/microtask the utterance must already be queued.
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, "The essay must be submitted by Friday.");
  assert.equal(spoken[0].lang, "en-GB");
  assert.ok(Math.abs(spoken[0].rate - 0.9) < 1e-9);
  spoken[0].onend?.();
  assert.equal(await p, "device");
});

test("cancels queued speech before speaking", () => {
  synth.speaking = true;
  void speakText("hello", "us");
  assert.deepEqual(log.slice(0, 2), ["cancel", 'speak "hello"']);
  assert.equal(spoken[0].lang, "en-US");
});

test("does not cancel when idle (iOS drops speak() right after cancel())", () => {
  void speakText("hello");
  assert.deepEqual(log, ['speak "hello"']);
});

test("recording: audio.play() is called synchronously and wins", async () => {
  const p = play("/oioi-wordtalk/atlas/audio/ex2/library.mp3", "text", "us");
  assert.ok(log.includes("audio.play /oioi-wordtalk/atlas/audio/ex2/library.mp3"));
  await tick();
  audios[0].onended?.();
  assert.equal(await p, "recorded");
  // only the silent unlock utterance, never the sentence
  assert.ok(spoken.every((u) => u.volume === 0));
});

test("recording fails (404 / NotAllowed): falls back to device voice", async () => {
  playImpl = () => Promise.reject(new Error("NotSupportedError"));
  const p = play("/missing.mp3", "Fallback sentence.", "uk");
  // speech was unlocked synchronously in the tap
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].volume, 0);
  await tick();
  const real = spoken.find((u) => u.text === "Fallback sentence.");
  assert.ok(real, "fallback utterance spoken");
  real.onend?.();
  assert.equal(await p, "device");
});

test("audio element error mid-playback also falls back", async () => {
  const p = play("/broken.mp3", "Broken.", "uk");
  await tick();
  audios[0].onerror?.();
  await tick();
  const real = spoken.find((u) => u.text === "Broken.");
  assert.ok(real);
  real.onend?.();
  assert.equal(await p, "device");
});

test("stopping a recording does not trigger the fallback", async () => {
  let rej: (e: Error) => void = () => {};
  playImpl = () => new Promise((_, r) => (rej = r));
  const p = play("/a.mp3", "x");
  stopAudio();
  rej(new Error("AbortError"));
  assert.equal(await p, "stopped");
  assert.ok(!spoken.some((u) => u.text === "x"));
});

test("unsupported when there is no speechSynthesis", async () => {
  const w = g.window;
  g.window = {};
  assert.equal(await play(null, "x"), "unsupported");
  g.window = w;
});

test("picks the exact locale and prefers nicer voices; falls back to any English voice", () => {
  const v = (name: string, lang: string) => ({ name, lang, localService: true }) as unknown as SpeechSynthesisVoice;
  const list = [v("Fred", "en-US"), v("Daniel", "en_GB"), v("Arthur", "en-GB"), v("Ting-Ting", "zh-CN")];
  assert.equal(pickVoice(list, "en-GB")?.name, "Daniel");
  assert.equal(pickVoice([v("Fred", "en-US")], "en-GB")?.name, "Fred");
  assert.equal(pickVoice([v("Ting-Ting", "zh-CN")], "en-GB"), undefined);
});

test("uses voices that arrive later (async voice loading)", () => {
  void speakText("one");
  assert.equal(spoken[0].voice, undefined);
  voiceList = [{ name: "Daniel", lang: "en-GB", localService: true }];
  void speakText("two");
  assert.equal((spoken[1].voice as { name: string }).name, "Daniel");
});
