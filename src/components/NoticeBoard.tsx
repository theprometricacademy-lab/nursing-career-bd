'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BellRing, Check, Copy, Megaphone, Ticket, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';
import { bnNum } from '@/lib/circulars';

type Notice = { id: number; title_en: string; title_bn: string; body_en: string | null; body_bn: string | null };
type Coupon = { code: string; discount_type: 'percent' | 'fixed'; value: number; expires_at: string | null };
const KEY = 'ncbd_board_closed';

function offText(c: Coupon) {
  return c.discount_type === 'percent' ? `${bnNum(Number(c.value))}% ছাড়` : `৳${bnNum(Number(c.value))} ছাড়`;
}

/** Home-page notices: a slim right-to-left ticker under the circulars strip; tapping it opens the full board.
 *  It never pops up by itself (a pop-up on arrival was sending new visitors away). */
export function NoticeBoard() {
  const { pick, premium } = useApp();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [winter, setWinter] = useState<{ active: boolean; price: number; limit: number; left: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    Promise.all([
      sb.from('notices').select('id, title_en, title_bn, body_en, body_bn').eq('is_published', true).order('published_at', { ascending: false }).limit(3),
      sb.rpc('public_featured_coupon'),
      sb.from('circulars').select('id', { count: 'exact', head: true }).eq('is_published', true).gte('apply_end', new Date().toISOString()),
      sb.rpc('winter_offer_status'),
    ]).then(([n, c, o, w]) => {
      setWinter((w.data as typeof winter) ?? null);
      setNotices((n.data as Notice[]) ?? []);
      setCoupon(((c.data as Coupon[] | null) ?? [])[0] ?? null);
      setOpenCount(o.count ?? 0);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function close() {
    setOpen(false);
    try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  }
  async function copy() {
    if (!coupon) return;
    try { await navigator.clipboard.writeText(coupon.code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  }

  // the current offer is shown to everyone (premium users can still share it)
  const showWinter = !!winter?.active;
  // while the winter offer runs it is the better deal, so the coupon isn't advertised
  const showCoupon = !!coupon && !premium && !showWinter;
  if (!loaded) return null;

  const items: { key: string; text: string; href?: string }[] = [
    ...(showWinter ? [{ key: 'w', text: `❄️ শীতের অফার: প্রথম ${bnNum(winter!.limit)} জনের জন্য প্রিমিয়াম মাত্র ৳${bnNum(Number(winter!.price))} · বাকি ${bnNum(winter!.left)} জন`, href: '/premium' }] : []),
    { key: 'pyq', text: '🎁 বিগত সালের সব প্রশ্ন ও সেগুলোর মডেল টেস্ট এখন একদম ফ্রি', href: '/previous-questions' },
    ...(showWinter ? [{ key: 'ref', text: '🤝 বন্ধুর রেফারেল কোডে ৳৫০ ছাড় (মূল দাম ৳৫৯৯ থেকে)', href: '/premium' }] : []),
    { key: 'fast', text: '💳 bKash/Nagad-এ পেমেন্ট করে TrxID দিন — যাচাইয়ের পর প্রিমিয়াম চালু', href: '/premium' },
    ...(showCoupon ? [{ key: 'c', text: `প্রিমিয়ামে ${offText(coupon!)} · কুপন ${coupon!.code}`, href: `/premium?coupon=${encodeURIComponent(coupon!.code)}` }] : []),
    ...notices.map((n) => ({ key: `n${n.id}`, text: pick(n, 'title') })),
  ];
  const row = (dup: boolean) => items.map((it) => {
    const cls = 'mx-1.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-brand-50';
    const inner = <><span className="h-1.5 w-1.5 rounded-full bg-brand-500" />{it.text}</>;
    return it.href
      ? <Link key={(dup ? 'd' : '') + it.key} href={it.href} className={cls} aria-hidden={dup || undefined} tabIndex={dup ? -1 : undefined}>{inner}</Link>
      : <button key={(dup ? 'd' : '') + it.key} type="button" onClick={() => setOpen(true)} className={cls} aria-hidden={dup || undefined} tabIndex={dup ? -1 : undefined}>{inner}</button>;
  });

  return (
    <>
      {/* Slim ticker, right to left, like the circulars strip above it */}
      <div className="flex items-center gap-2 overflow-hidden rounded-full bg-brand-50/70 py-1 pl-1 ring-1 ring-brand-100">
        <button type="button" onClick={() => setOpen(true)} className="chip z-10 shrink-0 bg-brand-600 py-1.5 text-white"><Megaphone className="h-3.5 w-3.5" />নোটিশ</button>
        <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_16px,#000_calc(100%-16px),transparent)]">
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused] active:[animation-play-state:paused] motion-reduce:animate-none"
            style={{ animationDuration: `${Math.max(18, items.length * 14)}s` }}>
            {row(false)}{row(true)}
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="নোটিশ বোর্ড">
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={close} />
          <div className="relative w-full max-w-md animate-rise overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-3.5 text-white">
              <Megaphone className="h-5 w-5" /><b className="text-lg">নোটিশ বোর্ড</b>
              <button onClick={close} aria-label="বন্ধ করুন" className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-white/20 hover:bg-white/30">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
              {showWinter && (
                <Link href="/premium" onClick={close} className="block rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 p-4 text-white">
                  <div className="text-sm font-semibold text-white/90">❄️ শীতের অফার</div>
                  <div className="mt-1 text-2xl font-extrabold">প্রিমিয়াম মাত্র ৳{bnNum(Number(winter!.price))}</div>
                  <p className="mt-1 text-sm text-white/90">প্রথম {bnNum(winter!.limit)} জনের জন্য · বাকি {bnNum(winter!.left)} জন · আজীবন অ্যাক্সেস</p>
                  <ul className="mt-2 space-y-1 text-sm text-white/95">
                    <li>🎁 বিগত সালের সব প্রশ্ন ও মডেল টেস্ট ফ্রি</li>
                    <li>🤝 রেফারেল কোডে ৳৫০ ছাড় (মূল দাম ৳৫৯৯ থেকে; তখন শীতের অফার প্রযোজ্য নয়)</li>
                    <li>💳 bKash / Nagad-এ সহজ পেমেন্ট</li>
                  </ul>
                  <span className="btn mt-3 w-full bg-white text-brand-700">{premium ? 'বন্ধুদের জানান' : 'এখনই অফারটি নিন'}</span>
                </Link>
              )}
              {showCoupon && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blush-600 to-blush-500 p-4 text-white">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15" />
                  <div className="flex items-center gap-2 text-sm font-semibold text-white/90"><Ticket className="h-4 w-4" />বিশেষ অফার</div>
                  <div className="mt-1 text-2xl font-extrabold">প্রিমিয়ামে {offText(coupon!)}!</div>
                  <p className="mt-1 text-sm text-white/90">সব প্রশ্ন, পূর্ণাঙ্গ মডেল টেস্ট ও ফলাফল বিশ্লেষণ — পেমেন্টের সময় এই কুপন দিন।</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="flex-1 rounded-xl border-2 border-dashed border-white/70 bg-white/10 px-3 py-2 text-center text-lg font-extrabold tracking-wider">{coupon!.code}</span>
                    <button onClick={copy} className="btn bg-white/20 text-white hover:bg-white/30" aria-label="কুপন কপি করুন">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'কপি হয়েছে' : 'কপি'}
                    </button>
                  </div>
                  <Link href={`/premium?coupon=${encodeURIComponent(coupon!.code)}`} onClick={close} className="btn mt-3 w-full bg-white text-blush-700 hover:bg-blush-50">
                    এখনই অফারটি নিন
                  </Link>
                </div>
              )}

              {openCount > 0 && (
                <Link href="/circulars" onClick={close} className="flex items-center gap-3 rounded-2xl border border-mint-200 bg-mint-50 p-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-500 text-white"><BellRing className="h-5 w-5" /></span>
                  <span className="flex-1"><b className="block text-ink">{bnNum(openCount)}টি সরকারি নার্সিং সার্কুলারে আবেদন চলছে</b><span className="text-sm text-ink-soft">শেষ তারিখ দেখে নিন →</span></span>
                </Link>
              )}

              {notices.map((n) => (
                <div key={n.id} className="rounded-2xl bg-brand-50/70 p-3.5">
                  <div className="font-semibold text-ink">{pick(n, 'title')}</div>
                  {pick(n, 'body') && <p className="mt-1 text-sm leading-6 text-ink-soft">{pick(n, 'body')}</p>}
                </div>
              ))}
            </div>

            <div className="border-t border-brand-100 p-3">
              <button onClick={close} className="btn-ghost w-full">বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
