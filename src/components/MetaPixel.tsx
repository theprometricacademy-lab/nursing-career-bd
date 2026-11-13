'use client';
import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from './AppProvider';

// Meta (Facebook) Pixel: page views and a few key actions, so ads can be optimised for real sign-ups.
// No names, phone numbers, emails or answers are sent. Admin pages and automated browsers are skipped.
export const PIXEL_ID = '4673131726346391';

type Fbq = ((...a: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
const fbq = (): Fbq | null => (typeof window !== 'undefined' ? ((window as unknown as { fbq?: Fbq }).fbq ?? null) : null);
const off = () => typeof navigator !== 'undefined' && ((navigator as Navigator & { webdriver?: boolean }).webdriver || location.pathname.startsWith('/admin'));

/** Standard Meta event (e.g. 'Lead', 'InitiateCheckout'). */
export function pixel(event: string, params?: Record<string, unknown>) {
  try { if (!off()) fbq()?.('track', event, params ?? {}); } catch { /* ignore */ }
}
/** Custom Meta event (e.g. 'WeeklyTestStart'). */
export function pixelCustom(event: string, params?: Record<string, unknown>) {
  try { if (!off()) fbq()?.('trackCustom', event, params ?? {}); } catch { /* ignore */ }
}

function once(key: string, fn: () => void) {
  try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch { return; }
  fn();
}

export function MetaPixel() {
  const path = usePathname();
  const { user, premium, ready } = useApp();
  const first = useRef(true);

  // SPA page changes (the first PageView is sent by the base code)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!off()) fbq()?.('track', 'PageView');
  }, [path]);

  // a brand-new account (email, phone or Google) → CompleteRegistration, once per browser
  useEffect(() => {
    if (!ready || !user?.created_at) return;
    if (Date.now() - new Date(user.created_at).getTime() < 30 * 60 * 1000) {
      once(`ncbd_px_reg_${user.id}`, () => pixel('CompleteRegistration', { status: true }));
    }
  }, [ready, user]);

  // premium became active → Purchase, once per member per browser
  useEffect(() => {
    if (ready && user && premium) once(`ncbd_px_buy_${user.id}`, () => pixel('Purchase', { currency: 'BDT', value: 599 }));
  }, [ready, user, premium]);

  if (path?.startsWith('/admin')) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
if(!navigator.webdriver){fbq('init','${PIXEL_ID}');fbq('track','PageView');}
`}</Script>
  );
}
