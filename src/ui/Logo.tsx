/** OiOi WordTalk mark: a speech bubble holding two "O" rings and a spark. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="mark">
      <path d="M7 5h18a5 5 0 0 1 5 5v9a5 5 0 0 1-5 5H14.5L9 28.5V24H7a5 5 0 0 1-5-5v-9a5 5 0 0 1 5-5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="11.2" cy="14.5" r="3.6" fill="none" stroke="var(--terra)" strokeWidth="2.2" />
      <circle cx="20.8" cy="14.5" r="3.6" fill="none" stroke="var(--terra)" strokeWidth="2.2" />
      <path d="M27 1.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9Z" fill="var(--ochre)" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <Mark />
      <span className="logo-text">
        <b>词聊</b>
        {!compact && <small>OiOi WordTalk</small>}
      </span>
    </span>
  );
}
