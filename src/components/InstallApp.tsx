'use client';
import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { useApp } from './AppProvider';

// Android/Chrome fires `beforeinstallprompt` when the site can be installed as an app;
// we keep it so our own "Install app" button can open the install dialog.
// iPhone/iPad never fire it: there the user adds the site from Safari's Share menu,
// so on iOS our button opens a short step-by-step guide instead.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type Mode = 'android' | 'ios' | null;

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

/** Register the service worker and start listening for the install prompt (call once, app-wide). */
export function registerPwa() {
  if (typeof window === 'undefined') return;
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* not fatal */ });
  }
  // the layout catches a prompt that fires before React has loaded
  const early = (window as unknown as { __bip?: InstallEvent }).__bip;
  if (early) { deferred = early; notify(); }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });
}

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so also check for a touch screen
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function useInstallMode(): Mode {
  const [mode, setMode] = useState<Mode>(null);
  useEffect(() => {
    const update = () => setMode(isInstalled() ? null : isIos() ? 'ios' : deferred ? 'android' : null);
    update();
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);
  return mode;
}

async function installAndroid() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice.catch(() => null);
  deferred = null;
  notify();
}

/** Step-by-step guide for adding the site to the iPhone/iPad home screen. */
function IosGuide({ onClose }: { onClose: () => void }) {
  const { lang } = useApp();
  const L = (bn: string, en: string) => (lang === 'bn' ? bn : en);
  const inSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram|Line/.test(navigator.userAgent);
  const steps = [
    { icon: <Share className="h-5 w-5" />, text: L('নিচের (iPad-এ উপরের) Share বোতামে চাপুন — চারকোনা বাক্স থেকে উপরে তীর।', 'Tap the Share button (square with an up arrow) at the bottom — at the top on iPad.') },
    { icon: <SquarePlus className="h-5 w-5" />, text: L('তালিকা একটু নিচে নামিয়ে "Add to Home Screen" (হোম স্ক্রিনে যোগ করুন) চাপুন।', 'Scroll down and tap "Add to Home Screen".') },
    { icon: <span className="text-sm font-bold">Add</span>, text: L('উপরে ডান কোণে "Add" চাপুন। হোম স্ক্রিনে Nursing Career BD আইকন চলে আসবে।', 'Tap "Add" in the top-right corner. The Nursing Career BD icon appears on your home screen.') },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-ink-soft" aria-label={L('বন্ধ করুন', 'Close')}><X className="h-5 w-5" /></button>
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 rounded-xl" />
          <div>
            <b className="block text-ink">{L('iPhone-এ অ্যাপ ইনস্টল করুন', 'Install on iPhone')}</b>
            <span className="text-sm text-ink-soft">{L('মাত্র ৩টি ধাপ', 'Just 3 steps')}</span>
          </div>
        </div>
        {!inSafari && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            {L('এই লিংকটি Safari-তে খুলুন (নিচের ধাপগুলো Safari-তে সবচেয়ে ভালো কাজ করে)। Facebook বা Messenger-এর ভেতর থেকে খুললে ⋯ চেপে "Open in Safari" বেছে নিন।',
               'Open this link in Safari (these steps work best there). If you opened it inside Facebook or Messenger, tap ⋯ and choose "Open in Safari".')}
          </p>
        )}
        <ol className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">{s.icon}</span>
              <span className="pt-1.5 text-sm leading-relaxed text-ink"><b>{lang === 'bn' ? ['১', '২', '৩'][i] : i + 1}.</b> {s.text}</span>
            </li>
          ))}
        </ol>
        <button onClick={onClose} className="btn-primary mt-5 w-full">{L('বুঝেছি', 'Got it')}</button>
      </div>
    </div>
  );
}

function useInstaller() {
  const mode = useInstallMode();
  const [guide, setGuide] = useState(false);
  const start = async () => { if (mode === 'ios') setGuide(true); else await installAndroid(); };
  const guideEl = guide ? <IosGuide onClose={() => setGuide(false)} /> : null;
  return { mode, start, guideEl };
}

/** Menu item: "Install app". Shows only when the phone can install the site. */
export function InstallMenuItem({ onDone }: { onDone?: () => void }) {
  const { lang } = useApp();
  const { mode, start, guideEl } = useInstaller();
  if (!mode) return null;
  return (
    <>
      <button onClick={async () => { await start(); if (mode === 'android') onDone?.(); }}
        className="mt-2 flex w-full items-center gap-3 rounded-xl bg-mint-50 px-3 py-2.5 text-sm font-semibold text-mint-700 hover:bg-mint-100">
        <Download className="h-[18px] w-[18px]" />{lang === 'bn' ? 'অ্যাপ ইনস্টল করুন' : 'Install app'}
      </button>
      {guideEl}
    </>
  );
}

/** Home-page banner inviting phone users to install the app. */
export function InstallBanner() {
  const { lang } = useApp();
  const { mode, start, guideEl } = useInstaller();
  if (!mode) return null;
  const L = (bn: string, en: string) => (lang === 'bn' ? bn : en);
  return (
    <>
      <button onClick={start} className="card flex w-full items-center gap-4 border-brand-200 p-4 text-left transition hover:shadow-md">
        <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-2xl" />
        <span className="flex-1">
          <b className="block text-ink">{mode === 'ios' ? L('iPhone-এ অ্যাপ হিসেবে ইনস্টল করুন', 'Install as an app on your iPhone') : L('ফোনে অ্যাপ হিসেবে ইনস্টল করুন', 'Install as an app on your phone')}</b>
          <span className="text-sm text-ink-soft">{L('হোম স্ক্রিন থেকে এক চাপে খুলুন', 'Open in one tap from your home screen')}</span>
        </span>
        <span className="btn-primary !px-3 !py-1.5"><Download className="h-4 w-4" />{L('ইনস্টল', 'Install')}</span>
      </button>
      {guideEl}
    </>
  );
}
