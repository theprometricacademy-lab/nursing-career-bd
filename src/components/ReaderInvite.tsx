'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CheckCircle2, X } from 'lucide-react';
import { useApp } from './AppProvider';
import { trackEvent } from './Tracker';

const KEY = 'ncbd_reader_invite';

/** A one-time, friendly "create a free account" card for visitors who have been reading previous-year solutions for a while. */
export function ReaderInvite() {
  const { user, ready } = useApp();
  const path = usePathname();
  const [show, setShow] = useState(false);
  const reading = path.startsWith('/question-solution/');

  useEffect(() => {
    if (!ready || user || !reading) return;
    try { if (localStorage.getItem(KEY)) return; } catch { return; }
    const t = setTimeout(() => {
      setShow(true); trackEvent('/invite/shown');
      try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
    }, 120000);
    return () => clearTimeout(t);
  }, [ready, user, reading, path]);

  if (!show || user) return null;
  const next = encodeURIComponent(path);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4" onClick={() => setShow(false)}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-extrabold text-ink">মন দিয়ে পড়ছেন দেখে ভালো লাগলো! 📚</h2>
          <button aria-label="বন্ধ" onClick={() => setShow(false)} className="text-ink-soft"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">একটা ফ্রি অ্যাকাউন্ট খুললে এই প্রস্তুতি আরও কাজে লাগবে:</p>
        <ul className="mt-3 space-y-2 text-sm text-ink">
          {['বিগত বছরের প্রশ্ন নিজে উত্তর দিয়ে অনুশীলন — সঙ্গে সঙ্গে ঠিক/ভুল ও ব্যাখ্যা', 'কোন বিষয়ে দুর্বল, কত প্রশ্ন করলেন — সব সেভ থাকবে', 'প্রতি সপ্তাহে ফ্রি মডেল টেস্ট ও সবার মধ্যে আপনার অবস্থান'].map((x) => (
            <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />{x}</li>
          ))}
        </ul>
        <Link href={`/signup?next=${next}`} onClick={() => trackEvent('/invite/signup')} className="btn-primary mt-4 w-full !py-3 text-base">ফ্রি অ্যাকাউন্ট খুলুন — ১ মিনিট</Link>
        <p className="mt-2 text-center text-xs text-ink-soft">মোবাইল নম্বর বা Google দিয়ে · কোনো টাকা লাগে না · <Link href={`/login?next=${next}`} className="text-brand-700 underline">আগে থেকে অ্যাকাউন্ট আছে?</Link></p>
      </div>
    </div>
  );
}
