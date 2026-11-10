'use client';
import { useEffect, useState } from 'react';
import { Download, ShieldCheck, X } from 'lucide-react';
import { useApp } from './AppProvider';
import { supabaseBrowser } from '@/lib/supabase/client';
import { inAndroidApp, isAndroid } from '@/lib/appContext';

// The Android app is a file (APK) downloaded from our own site, not the Play Store.
// It is offered only on Android phones, and never inside the app itself.
// iPhone users get no app option (Apple doesn't allow installing app files from a website).
export const APK_URL = '/downloads/NursingCareerBD-v1.apk';

/** Register the service worker (keeps the friendly offline page working). Call once, app-wide. */
export function registerPwa() {
  if (typeof window === 'undefined') return;
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* not fatal */ });
  }
}

/** 'offer' on an Android phone browser, otherwise null. */
function useAndroidOffer() {
  const [offer, setOffer] = useState(false);
  useEffect(() => { setOffer(isAndroid() && !inAndroidApp()); }, []);
  return offer;
}

function visitorId() {
  try { return localStorage.getItem('ncbd_vid'); } catch { return null; }
}

/** Step-by-step install notice with the download button. */
function AndroidNotice({ onClose }: { onClose: () => void }) {
  const { lang } = useApp();
  const L = (bn: string, en: string) => (lang === 'bn' ? bn : en);
  const steps = [
    L('নিচের "অ্যাপ ডাউনলোড করুন" বোতাম চাপুন।', 'Tap "Download the app" below.'),
    L('Chrome "এই ফাইলটি ক্ষতিকর হতে পারে" বললে "Download anyway" (তবুও ডাউনলোড) চাপুন।', 'If Chrome warns the file may be harmful, tap "Download anyway".'),
    L('ডাউনলোড শেষে নোটিফিকেশন থেকে বা ফোনের Downloads ফোল্ডার থেকে ফাইলটা খুলুন।', 'When it finishes, open the file from the notification or the Downloads folder.'),
    L('"Install unknown apps" অনুমতি চাইলে Settings-এ গিয়ে "Allow from this source" চালু করে ফিরে আসুন।', 'If asked for "Install unknown apps", turn on "Allow from this source" in Settings and come back.'),
    L('"Install" চাপুন। Play Protect সতর্কবার্তা দেখালে "More details" → "Install anyway" চাপুন।', 'Tap "Install". If Play Protect warns, tap "More details" → "Install anyway".'),
    L('ইনস্টল শেষে হোম স্ক্রিনের NC আইকন থেকে অ্যাপ খুলুন ও লগইন করুন।', 'Open the app from the NC icon on your home screen and log in.'),
  ];
  const download = () => {
    const v = visitorId();
    if (v) supabaseBrowser().rpc('track_app_download', { p_visitor: v, p_device: 'Android' }).then(() => {});
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-ink-soft" aria-label={L('বন্ধ করুন', 'Close')}><X className="h-5 w-5" /></button>
        <div className="flex items-center gap-3 pr-8">
          <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-2xl" />
          <div>
            <b className="block text-ink">📢 {L('নোটিশ: অ্যাপ কীভাবে ইনস্টল করবেন', 'Notice: how to install the app')}</b>
            <span className="text-sm text-ink-soft">{L('ফ্রি · ১.৩ MB · Android', 'Free · 1.3 MB · Android')}</span>
          </div>
        </div>
        <ol className="mt-4 list-decimal space-y-2 rounded-xl bg-amber-50 p-3 pl-8 text-sm leading-relaxed text-amber-900">
          {steps.map((x) => <li key={x}>{x}</li>)}
        </ol>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-soft">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
          {L('অ্যাপটি Play Store-এ নয়, আমাদের নিজস্ব সাইট থেকে দেওয়া হচ্ছে, তাই ফোন সতর্ক করে। এটি নিরাপদ — শুধু nursingcareerbd.com থেকেই নামাবেন।',
             'The app comes from our own site, not the Play Store, so the phone shows a warning. It is safe — only download it from nursingcareerbd.com.')}
        </p>
        <a href={APK_URL} download="NursingCareerBD.apk" onClick={download} className="btn-success mt-4 w-full !py-3 text-base">
          <Download className="h-5 w-5" />{L('অ্যাপ ডাউনলোড করুন', 'Download the app')}
        </a>
        <button onClick={onClose} className="btn-ghost mt-2 w-full">{L('এখন না', 'Not now')}</button>
      </div>
    </div>
  );
}

/** Menu item (Android phones only): opens the install notice. */
export function InstallMenuItem({ onDone }: { onDone?: () => void }) {
  const { lang } = useApp();
  const offer = useAndroidOffer();
  const [open, setOpen] = useState(false);
  if (!offer) return null;
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center gap-3 rounded-xl bg-mint-50 px-3 py-2.5 text-sm font-semibold text-mint-700 hover:bg-mint-100">
        <Download className="h-[18px] w-[18px]" />{lang === 'bn' ? 'Android অ্যাপ ডাউনলোড' : 'Get the Android app'}
      </button>
      {open && <AndroidNotice onClose={() => { setOpen(false); onDone?.(); }} />}
    </>
  );
}

/** Small home-page card (Android phones only); tapping it shows the install notice. */
export function InstallBanner() {
  const { lang } = useApp();
  const offer = useAndroidOffer();
  const [open, setOpen] = useState(false);
  if (!offer) return null;
  const L = (bn: string, en: string) => (lang === 'bn' ? bn : en);
  return (
    <>
      <button onClick={() => setOpen(true)} className="card flex w-full items-center gap-4 border-brand-200 p-4 text-left transition hover:shadow-md">
        <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-2xl" />
        <span className="flex-1">
          <b className="block text-ink">{L('Android অ্যাপ ডাউনলোড করুন', 'Get the Android app')}</b>
          <span className="text-sm text-ink-soft">{L('ফ্রি · চাপ দিয়ে ইনস্টলের নিয়ম দেখুন', 'Free · tap to see how to install')}</span>
        </span>
        <span className="btn-primary !px-3 !py-1.5"><Download className="h-4 w-4" />{L('ডাউনলোড', 'Download')}</span>
      </button>
      {open && <AndroidNotice onClose={() => setOpen(false)} />}
    </>
  );
}
