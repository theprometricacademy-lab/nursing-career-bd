'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

// First-party, cookie-free visit tracking for the admin "Live visitors" page.
// A random visitor id (this browser) and session id (this tab visit); no IP, no personal data.
function uuid() {
  try { if (crypto.randomUUID) return crypto.randomUUID(); } catch { /* older browsers */ }
  const b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function stored(store: 'localStorage' | 'sessionStorage', key: string) {
  try {
    const s = window[store];
    let v = s.getItem(key);
    if (!v) { v = uuid(); s.setItem(key, v); }
    return v;
  } catch { return uuid(); }
}

function device() {
  const ua = navigator.userAgent;
  const kind = /iPad|Tablet/i.test(ua) ? 'ট্যাবলেট' : /Mobi|Android|iPhone/i.test(ua) ? 'মোবাইল' : 'কম্পিউটার';
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iPhone' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : '';
  return os ? `${kind} · ${os}` : kind;
}

function source() {
  const q = new URLSearchParams(location.search);
  const utm = q.get('utm_source') || (q.has('fbclid') ? 'facebook' : null);
  if (utm) return utm.toLowerCase();
  try {
    if (!document.referrer) return null;
    const h = new URL(document.referrer).hostname.replace(/^www\.|^m\.|^l\.|^lm\./, '');
    return h === location.hostname ? null : h;
  } catch { return null; }
}

export function Tracker() {
  const path = usePathname();
  const cur = useRef<{ id: number | null; session: string }>({ id: null, session: '' });
  const first = useRef(true);

  // The page loaded fine: allow the error page to auto-reload again later in this visit if needed
  useEffect(() => {
    const t = setTimeout(() => { try { sessionStorage.removeItem('ncbd_reloaded'); sessionStorage.removeItem('ncbd_reloaded_g'); } catch { /* ignore */ } }, 15000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!path || path.startsWith('/admin') || (navigator as Navigator & { webdriver?: boolean }).webdriver) return;
    const sb = supabaseBrowser();
    const visitor = stored('localStorage', 'ncbd_vid');
    const session = stored('sessionStorage', 'ncbd_sid');
    const ref = first.current ? source() : null;
    first.current = false;
    let alive = true;
    sb.rpc('track_view', { p_visitor: visitor, p_session: session, p_path: path + (location.search || ''), p_ref: ref, p_device: device() })
      .then(({ data }) => { if (alive) cur.current = { id: (data as number) ?? null, session }; });

    // Heartbeats: early ones catch short visits, then every 30 s while the page is visible
    const ping = () => {
      const c = cur.current;
      if (c.id && document.visibilityState === 'visible') sb.rpc('track_ping', { p_id: c.id, p_session: c.session }).then(() => {});
    };
    // Final heartbeat when the visitor leaves or switches app (keepalive survives page close)
    const finalPing = () => {
      const c = cur.current, url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!c.id || !url || !key) return;
      try {
        fetch(`${url}/rest/v1/rpc/track_ping`, { method: 'POST', keepalive: true,
          headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_id: c.id, p_session: c.session }) }).catch(() => {});
      } catch { /* ignore */ }
    };
    const early = [5000, 15000, 30000].map((ms) => setTimeout(ping, ms));
    const t = setInterval(ping, 30000);
    const onVis = () => { if (document.visibilityState === 'visible') ping(); else finalPing(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', finalPing);
    return () => {
      alive = false; finalPing(); early.forEach(clearTimeout); clearInterval(t);
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', finalPing);
      cur.current = { id: null, session };
    };
  }, [path]);

  return null;
}
