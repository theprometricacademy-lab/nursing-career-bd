'use client';
import { useEffect, useRef, useState } from 'react';
import { BookmarkCheck, X } from 'lucide-react';
import { bnNum } from '@/lib/circulars';
import { trackEvent } from './Tracker';

/**
 * Long previous-year papers: remembers (in this browser) which question the reader reached,
 * and offers "continue from question N" the next time they open the same paper.
 */
export function ResumeReading({ id }: { id: string }) {
  const key = `ncbd_read:${id}`;
  const [saved, setSaved] = useState<number | null>(null);
  const offered = useRef(false);

  // the question currently at the top of the screen (questions carry id="q<N>")
  const current = () => {
    const els = document.querySelectorAll<HTMLElement>('li[id^="q"][data-qn]');
    let n = 0;
    for (const el of els) { if (el.getBoundingClientRect().top <= 140) n = Number(el.dataset.qn); else break; }
    return n;
  };

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null') as { n: number; at: number } | null;
      if (v && v.n >= 3 && Date.now() - v.at < 60 * 86400000 && window.scrollY < 300) { setSaved(v.n); offered.current = true; }
    } catch { /* storage off */ }

    let t: ReturnType<typeof setTimeout> | null = null;
    const save = () => {
      const n = current();
      if (n >= 2) { try { localStorage.setItem(key, JSON.stringify({ n, at: Date.now() })); } catch { /* ignore */ } }
    };
    const onScroll = () => {
      if (t) return;
      t = setTimeout(() => { t = null; save(); if (window.scrollY > 900) setSaved(null); }, 800);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', save);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('pagehide', save); if (t) clearTimeout(t); save(); };
  }, [key]);

  if (!saved) return null;
  const go = () => {
    const el = document.getElementById(`q${saved}`);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); trackEvent('/resume/used'); }
    setSaved(null);
  };
  return (
    <div className="fixed inset-x-3 bottom-[calc(130px+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-2 rounded-2xl bg-ink/95 p-2.5 pl-4 text-white shadow-xl lg:bottom-6">
      <BookmarkCheck className="h-5 w-5 shrink-0 text-gold-300" />
      <span className="min-w-0 flex-1 text-sm leading-5">আগেরবার <b>{bnNum(saved)} নম্বর প্রশ্ন</b> পর্যন্ত পড়েছিলেন</span>
      <button onClick={go} className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-bold text-brand-700">সেখান থেকে পড়ুন</button>
      <button onClick={() => setSaved(null)} aria-label="বন্ধ" className="shrink-0 p-1 text-white/70"><X className="h-4 w-4" /></button>
    </div>
  );
}
