/**
 * Sound design for OiOi WordTalk.
 *
 * Every UI cue and ambience bed is synthesized at runtime with the Web Audio API,
 * so the app ships no third-party sound files. (The upstream project's recorded
 * UI sounds and music were not under CC BY and have been removed.)
 */

export type Cue = "correct" | "wrong" | "flip" | "page" | "complete" | "streak" | "start" | "tap" | "key" | "twinkle" | "fly" | "ignite";
export const AMBIENCE = [
  { id: "stars", label: "星空和弦" },
  { id: "rain", label: "细雨白噪" },
  { id: "sea", label: "海浪起伏" },
] as const;
export type AmbienceId = (typeof AMBIENCE)[number]["id"];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** One soft sine/triangle "pluck" with an exponential tail. */
function tone(freq: number, at: number, dur: number, gain: number, type: OscillatorType = "sine", glideTo?: number) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const PATTERNS: Record<Cue, () => void> = {
  correct: () => {
    tone(660, 0, 0.18, 0.18);
    tone(990, 0.08, 0.32, 0.16);
  },
  wrong: () => {
    tone(220, 0, 0.22, 0.16, "triangle");
    tone(196, 0.1, 0.3, 0.12, "triangle");
  },
  flip: () => tone(520, 0, 0.09, 0.08, "triangle", 760),
  page: () => tone(420, 0, 0.12, 0.06, "sine", 620),
  complete: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.5, 0.14)),
  streak: () => [784, 988, 1175].forEach((f, i) => tone(f, i * 0.07, 0.35, 0.12)),
  start: () => {
    tone(392, 0, 0.25, 0.12);
    tone(587, 0.1, 0.4, 0.12);
  },
  tap: () => tone(880, 0, 0.05, 0.05),
  key: () => tone(1200, 0, 0.03, 0.03, "square"),
  twinkle: () => tone(1568 + Math.random() * 400, 0, 0.3, 0.05),
  fly: () => tone(300, 0, 0.35, 0.06, "sine", 900),
  ignite: () => tone(1046 + Math.random() * 300, 0, 0.4, 0.07),
};

/** Kept for API compatibility; synthesized cues need no warm-up. */
export function primeCues() {
  audio();
}

/** Kept for API compatibility; nothing to preload. */
export function preloadFiles(files: string[]) {
  void files;
}

/** Named one-shot "files" are synthesized chords now (splash, star map). */
export async function playFile(name: string, gain = 0.6, delay = 0) {
  const g = Math.min(0.2, gain * 0.2);
  const chord = name.includes("burst") ? [392, 523, 659] : name.includes("door") ? [262, 392] : name.includes("lit") ? [659, 784, 988, 1319] : [523, 784];
  chord.forEach((f, i) => tone(f, delay + i * 0.06, 0.9, g));
}

export async function cue(name: Cue) {
  if (!audio()) return;
  PATTERNS[name]();
}

/* ---------- ambience (procedural) ---------- */

let amb: { id: AmbienceId; nodes: AudioScheduledSourceNode[]; gain: GainNode } | null = null;
let ambVolume = 0.5;
let ducked = false;
const level = () => ambVolume * (ducked ? 0.35 : 1) * 0.35;

function fadeTo(g: GainNode, v: number, seconds: number) {
  const c = ctx!;
  g.gain.cancelScheduledValues(c.currentTime);
  g.gain.setValueAtTime(g.gain.value, c.currentTime);
  g.gain.linearRampToValueAtTime(v, c.currentTime + seconds);
}

function noiseBuffer(c: AudioContext, seconds = 4) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    // Brown-ish noise: softer than white.
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.2;
  }
  return buf;
}

function buildAmbience(c: AudioContext, id: AmbienceId, out: GainNode): AudioScheduledSourceNode[] {
  if (id === "stars") {
    const nodes: AudioScheduledSourceNode[] = [];
    [196, 293.66, 392, 493.88].forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      const lfo = c.createOscillator();
      const lg = c.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.value = 0.12;
      lfo.frequency.value = 0.05 + i * 0.03;
      lg.gain.value = 0.08;
      lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(out);
      o.start();
      lfo.start();
      nodes.push(o, lfo);
    });
    return nodes;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = id === "rain" ? "highpass" : "lowpass";
  filter.frequency.value = id === "rain" ? 900 : 500;
  const g = c.createGain();
  g.gain.value = 0.9;
  src.connect(filter).connect(g).connect(out);
  src.start();
  const nodes: AudioScheduledSourceNode[] = [src];
  if (id === "sea") {
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 0.12;
    lg.gain.value = 0.6;
    lfo.connect(lg).connect(g.gain);
    lfo.start();
    nodes.push(lfo);
  }
  return nodes;
}

export async function setAmbience(id: AmbienceId | null, volume = ambVolume) {
  ambVolume = volume;
  if (amb && amb.id === id) {
    fadeTo(amb.gain, level(), 0.4);
    return;
  }
  const old = amb;
  amb = null;
  if (old) {
    fadeTo(old.gain, 0, 1.2);
    old.nodes.forEach((n) => n.stop(ctx!.currentTime + 1.3));
  }
  if (!id) return;
  const c = audio();
  if (!c || !master) return;
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.connect(master);
  amb = { id, nodes: buildAmbience(c, id, gain), gain };
  fadeTo(gain, level(), 2);
}

/** Lower the ambience while a word or sentence is being spoken. */
export function duck(on: boolean) {
  ducked = on;
  if (amb) fadeTo(amb.gain, level(), on ? 0.15 : 0.6);
}

export const ambienceId = () => amb?.id ?? null;
