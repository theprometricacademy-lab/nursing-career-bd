// A fresh id for every build: open pages (and the Android app) compare it with /build-id
// and reload themselves when a newer version of the site is live.
// Next.js reads this config several times during one build (sometimes in separate processes), so a plain
// Date.now() gave the browser code and the /build-id route DIFFERENT ids — every page then thought it was
// outdated and reloaded itself. Use the commit being built (same everywhere), else one shared value.
const BUILD_ID = (process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA || '').slice(0, 12)
  || (process.env.NCBD_BUILD_ID ||= String(Date.now()));

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // keep visited/prefetched pages in the browser so switching tabs is instant (like an app)
  experimental: { staleTimes: { dynamic: 180, static: 600 } },
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{
      // the service worker must never be served stale, or app updates get stuck
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
      ],
    }, {
      // Android app file: correct type so phones offer to install it, and download instead of opening
      source: '/downloads/:file*.apk',
      headers: [
        { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
        { key: 'Content-Disposition', value: 'attachment; filename="NursingCareerBD.apk"' },
      ],
    }, {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};
export default nextConfig;
