const BRAND = `${import.meta.env.BASE_URL}brand`;

/** OiOi MedAI Academy brand mark (capybara & penguin), static by default, animated where it has room to play. */
export function Mark({ size = 28, animated = false }: { size?: number; animated?: boolean }) {
  return (
    <img
      className="mark mark-img"
      src={`${BRAND}/${animated ? "logo-anim" : "logo"}.webp`}
      alt=""
      aria-hidden="true"
      width={Math.round(size * 2.56)}
      height={size}
      decoding="async"
      draggable={false}
    />
  );
}

export function Logo({ compact = false, size = 34 }: { compact?: boolean; size?: number }) {
  return (
    <span className="logo">
      <Mark size={size} />
      <span className="logo-text">
        <b>词聊</b>
        {!compact && <small>WordTalk</small>}
      </span>
    </span>
  );
}
