'use client';
import { useEffect } from 'react';

// Pages left open for a long time — above all inside the Android app, which stays in memory —
// keep running the old version of the site. We ask the server which build is live (on return to
// the page, and every 10 minutes); when a newer one is out, the page reloads at a safe moment:
// when the user moves to another page or comes back to the app — never while they're reading,
// and never during an exam, a payment or in the admin panel.
const SKIP = ['/exam/', '/payment', '/admin'];
let stale = false;

function safeToReload() {
  return document.visibilityState === 'visible' && !SKIP.some((p) => location.pathname.startsWith(p));
}

async function checkLive() {
  const mine = process.env.NEXT_PUBLIC_BUILD_ID;
  if (!mine || stale) return;
  try {
    const live = (await (await fetch('/build-id', { cache: 'no-store' })).text()).trim();
    if (live && live !== mine) stale = true;
  } catch { /* offline: try again later */ }
}

export function useUpdateChecker(path: string) {
  // moving to another page: reload into the new version if one is waiting
  useEffect(() => {
    if (stale && safeToReload()) location.reload();
  }, [path]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_BUILD_ID || process.env.NODE_ENV !== 'production') return;
    let hiddenAt = 0;
    const onVisible = async () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
      await checkLive();
      // back in the app/tab after being away: a good moment to switch to the new version
      if (stale && hiddenAt && safeToReload()) location.reload();
    };
    const t = setInterval(checkLive, 10 * 60_000);
    document.addEventListener('visibilitychange', onVisible);
    checkLive();
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
}
