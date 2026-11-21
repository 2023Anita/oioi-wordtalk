import { useEffect, useRef, useState } from "react";
import { duck, playFile, preloadFiles } from "../lib/sound";
import { dayKey, store } from "../store/store";

const SEEN_KEY = "oioi-wordtalk:splash";
const BRAND = `${import.meta.env.BASE_URL}brand`;
/** How long the splash holds once painted, and how long it takes to fade. */
const HOLD_MS = 1500;
const FADE_MS = 520;

export function shouldShowSplash() {
  if (!store.get().settings.splash) return false;
  const h = location.hash.replace(/^#\/?/, "");
  if (h && !h.startsWith("?")) return false; // deep links go straight to content
  try {
    return localStorage.getItem(SEEN_KEY) !== dayKey();
  } catch {
    return true;
  }
}

/**
 * A quiet 和紙 (washi) title card: ink-wash Fuji, a sakura branch, the OiOi mark and a vermilion seal.
 * It opens on its own after a short hold; a tap or any key opens it at once.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "out">("in");
  const closing = useRef(false);
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const open = (sound = false) => {
    if (closing.current) return;
    closing.current = true;
    try {
      localStorage.setItem(SEEN_KEY, dayKey());
    } catch {
      /* optional */
    }
    if (sound && store.get().settings.sfx) {
      void playFile("splash-voice.mp3", 0.9, 0.1);
      duck(true);
      window.setTimeout(() => duck(false), 2600);
    }
    setPhase("out");
    window.setTimeout(onDone, reduce ? 120 : FADE_MS);
  };

  useEffect(() => {
    preloadFiles(["splash-voice.mp3"]);
    const t = window.setTimeout(() => open(false), reduce ? 700 : HOLD_MS);
    // Safety net: never leave the splash on screen, even if timers were throttled in a background tab.
    const safety = window.setTimeout(onDone, 5000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(safety);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key === "Tab") return;
      e.preventDefault();
      open(e.key !== "Escape");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`splash is-${phase} ${reduce ? "is-reduced" : ""}`}
      style={{ ["--splash-fade" as string]: `${FADE_MS}ms` }}
      onClick={() => open(true)}
      role="dialog"
      aria-label="欢迎来到 OiOi WordTalk 词聊，轻触进入"
    >
      <div className="splash-bg" aria-hidden="true" />
      <div className="splash-petals" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <i key={i} style={{ ["--i" as string]: i }} />
        ))}
      </div>
      <div className="splash-center">
        <img className="splash-logo" src={`${BRAND}/logo-anim.webp`} alt="OiOi MedAI Academy" width={300} height={117} decoding="async" />
        <div className="splash-title">
          <b>词聊</b>
          <span className="hanko" aria-hidden="true">
            言
          </span>
        </div>
        <p className="splash-en">OiOi WordTalk</p>
        <p className="splash-tag">背单词，也聊单词 · Dr. Anita 陪你练</p>
      </div>
      <button
        className="splash-skip"
        onClick={(e) => {
          e.stopPropagation();
          open(false);
        }}
      >
        跳过
      </button>
    </div>
  );
}
