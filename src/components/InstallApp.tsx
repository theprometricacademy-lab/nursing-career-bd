'use client';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useApp } from './AppProvider';

// Android/Chrome fires `beforeinstallprompt` when the site can be installed as an app.
// We keep that event so our own "Install app" button can open the install dialog.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

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

function useCanInstall() {
  const [can, setCan] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const update = () => setCan(!standalone && !!deferred);
    update();
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);
  return can;
}

async function install() {
  if (!deferred) return;
  await deferred.prompt();
  await deferred.userChoice.catch(() => null);
  deferred = null;
  notify();
}

/** Menu item: "Install app". Shows only when the phone/browser can install the site. */
export function InstallMenuItem({ onDone }: { onDone?: () => void }) {
  const { lang } = useApp();
  const can = useCanInstall();
  if (!can) return null;
  return (
    <button onClick={async () => { await install(); onDone?.(); }}
      className="mt-2 flex w-full items-center gap-3 rounded-xl bg-mint-50 px-3 py-2.5 text-sm font-semibold text-mint-700 hover:bg-mint-100">
      <Download className="h-[18px] w-[18px]" />{lang === 'bn' ? 'অ্যাপ ইনস্টল করুন' : 'Install app'}
    </button>
  );
}

/** Home-page banner inviting phone users to install the app. */
export function InstallBanner() {
  const { lang } = useApp();
  const can = useCanInstall();
  if (!can) return null;
  const L = (bn: string, en: string) => (lang === 'bn' ? bn : en);
  return (
    <button onClick={install} className="card flex w-full items-center gap-4 border-brand-200 p-4 text-left transition hover:shadow-md">
      <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-2xl" />
      <span className="flex-1">
        <b className="block text-ink">{L('ফোনে অ্যাপ হিসেবে ইনস্টল করুন', 'Install as an app on your phone')}</b>
        <span className="text-sm text-ink-soft">{L('হোম স্ক্রিন থেকে এক চাপে খুলুন · কোনো ডাউনলোড ঝামেলা নেই', 'Open in one tap from your home screen')}</span>
      </span>
      <span className="btn-primary !px-3 !py-1.5"><Download className="h-4 w-4" />{L('ইনস্টল', 'Install')}</span>
    </button>
  );
}
