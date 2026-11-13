'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, BellRing, FileText, Info, Trophy, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';
import { NotifySettings } from './NotifySettings';

type Item = { id: number; kind: 'weekly' | 'circular' | 'info'; title: string; body: string | null; url: string | null; created_at: string };

function ago(iso: string, bn: boolean, num: (n: number) => string) {
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return bn ? `${num(Math.max(1, m))} মিনিট আগে` : `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return bn ? `${num(h)} ঘণ্টা আগে` : `${h}h ago`;
  const d = Math.floor(h / 24); return bn ? `${num(d)} দিন আগে` : `${d}d ago`;
}

/** Header bell: recent announcements (new weekly test, new circulars, notices) with an unread count. */
export function NotificationBell() {
  const { user, lang, num } = useApp();
  const bn = lang === 'bn';
  const path = usePathname();
  const [data, setData] = useState<{ unread: number; items: Item[] } | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: d } = await supabaseBrowser().rpc('my_notifications');
    if (d) setData(d as { unread: number; items: Item[] });
  }, [user]);
  useEffect(() => { load(); }, [load, path]);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!user) return null;
  const unread = data?.unread ?? 0;
  const toggle = async () => {
    const next = !open; setOpen(next);
    if (next && unread > 0) { await supabaseBrowser().rpc('mark_notifications_seen'); setData((d) => (d ? { ...d, unread: 0 } : d)); }
  };
  const Icon = (k: Item['kind']) => (k === 'weekly' ? Trophy : k === 'circular' ? FileText : Info);

  return (
    <div className="relative" ref={box}>
      <button onClick={toggle} aria-label={bn ? 'নোটিফিকেশন' : 'Notifications'} className="relative grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-brand-50">
        {unread > 0 ? <BellRing className="h-5 w-5 text-brand-700" /> : <Bell className="h-5 w-5" />}
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-blush-600 px-1 text-[11px] font-bold text-white">{unread > 9 ? '9+' : num(unread)}</span>}
      </button>
      {open && (
        <div className="fixed inset-x-2 top-16 z-50 max-h-[75vh] overflow-y-auto rounded-2xl border border-brand-100 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96">
          <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
            <b className="text-ink">{bn ? 'নোটিফিকেশন' : 'Notifications'}</b>
            <button onClick={() => setOpen(false)} aria-label="close" className="text-ink-soft"><X className="h-4 w-4" /></button>
          </div>
          {!data || data.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">{bn ? 'এখনো কোনো নোটিফিকেশন নেই। নতুন সাপ্তাহিক টেস্ট বা সার্কুলার এলে এখানে দেখাবে।' : 'No notifications yet.'}</p>
          ) : (
            <ul className="divide-y divide-brand-50">
              {data.items.map((n) => {
                const I = Icon(n.kind);
                const inner = (
                  <div className="flex gap-3 px-4 py-3 hover:bg-brand-50/60">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${n.kind === 'weekly' ? 'bg-gold-100 text-gold-700' : n.kind === 'circular' ? 'bg-mint-100 text-mint-700' : 'bg-brand-100 text-brand-700'}`}><I className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-5 text-ink">{n.title}</p>
                      {n.body && <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-soft">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-ink-soft">{ago(n.created_at, bn, num)}</p>
                    </div>
                  </div>
                );
                return <li key={n.id}>{n.url ? (n.url.startsWith('/') ? <Link href={n.url}>{inner}</Link> : <a href={n.url} target="_blank" rel="noopener noreferrer">{inner}</a>) : inner}</li>;
              })}
            </ul>
          )}
          <div className="border-t border-brand-100 p-3"><NotifySettings compact /></div>
        </div>
      )}
    </div>
  );
}
