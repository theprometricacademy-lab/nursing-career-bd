import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

// Runs the Next.js app on Cloudflare Workers (via OpenNext).
// Pre-built (static) pages are served straight from Workers static assets instead of being
// re-rendered on every visit; cache interception answers them before the Next.js server even loads.
// (The site uses no ISR/revalidate, so a read-only cache is all it needs.)
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
