export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="lg-ncbd" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fb4f6" />
          <stop offset="1" stopColor="#1f7ad6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#lg-ncbd)" />
      <path d="M24 37s-11-6.6-11-14.3A6.2 6.2 0 0 1 24 19a6.2 6.2 0 0 1 11 3.7C35 30.4 24 37 24 37z" fill="#fff" />
      <rect x="21.6" y="22" width="4.8" height="11" rx="1.2" fill="#ec4899" />
      <rect x="18.5" y="25.1" width="11" height="4.8" rx="1.2" fill="#ec4899" />
      <circle cx="36" cy="12" r="4" fill="#6ee7b7" />
    </svg>
  );
}
