import { Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { play } from "../lib/audio";
import { warmMedia } from "../lib/media";

export function Speak({
  url,
  text,
  accent = "uk",
  label,
  size = "md",
  rate = 1,
  className = "",
  kbd,
}: {
  url: string | null;
  text: string;
  accent?: "uk" | "us";
  label?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  rate?: number;
  className?: string;
  kbd?: string;
}) {
  const [on, setOn] = useState(false);
  // Look up an on-device copy ahead of the tap (no network), so it can play offline.
  useEffect(() => warmMedia([url]), [url]);
  // Must stay synchronous up to play(): iOS only allows audio/speech started inside the tap.
  const run = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOn(true);
    void play(url, text, accent, rate).finally(() => setOn(false));
  };
  return (
    <button
      type="button"
      className={`speak speak-${size} ${on ? "is-on" : ""} ${label ? "has-label" : ""} ${className}`}
      onClick={run}
      aria-label={typeof label === "string" ? `朗读 ${label}` : `朗读 ${text}`}
      title={kbd ? `朗读（${kbd}）` : "朗读"}
    >
      <span className="speak-icon">
        <Volume2 size={size === "lg" ? 22 : size === "sm" ? 15 : 18} strokeWidth={1.8} />
        <span className="speak-waves" />
      </span>
      {label && <span className="speak-label">{label}</span>}
    </button>
  );
}
