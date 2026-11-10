// "NC" monogram: Nursing Career initials with a heartbeat line underneath.
// Same drawing as src/app/icon.svg and the app icons in public/icons.
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <linearGradient id="lg-ncbd" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#1f7ad6" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#lg-ncbd)" />
      <path d="M92 366V146l128 220V146" fill="none" stroke="#fff" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M420 190a104 104 0 1 0 0 132" fill="none" stroke="#fff" strokeWidth="40" strokeLinecap="round" />
      <path d="M60 432h120l22-34 26 54 24-40 14 20h186" fill="none" stroke="#fde68a" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
