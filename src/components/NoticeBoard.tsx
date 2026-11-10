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

/** Home-page notice board: pops up once per visit (closable with ✕) and can be reopened from the bar. */
export function NoticeBoard() {
  const { pick, premium, user } = useApp();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    Promise.all([
      sb.from('notices').select('id, title_en, title_bn, body_en, body_bn').eq('is_published', true).order('published_at', { ascending: false }).limit(3),
      sb.rpc('public_featured_coupon'),
      sb.from('circulars').select('id', { count: 'exact', head: true }).eq('is_published', true).gte('apply_end', new Date().toISOString()),
    ]).then(([n, c, o]) => {
      setNotices((n.data as Notice[]) ?? []);
      setCoupon(((c.data as Coupon[] | null) ?? [])[0] ?? null);
      setOpenCount(o.count ?? 0);
      setLoaded(true);
    });
  }, []);

  // Pop up automatically only for logged-in members; new visitors (e.g. from ads) just see the bar
  useEffect(() => {
    if (!loaded || !user) return;
    let closed = false;
    try { closed = sessionStorage.getItem(KEY) === '1'; } catch { /* storage unavailable */ }
    if (!closed) setOpen(true);
  }, [loaded, user]);

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

  const showCoupon = coupon && !premium;
  if (!loaded || (!notices.length && !showCoupon && !openCount)) return null;

  return (
    <>
      {/* Always-visible bar near the top of the home page */}
      <button onClick={() => setOpen(true)}
        className="card flex w-full items-center gap-3 border-blush-200 bg-gradient-to-r from-blush-50 to-white p-3.5 text-left transition hover:shadow-md">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blush-600 text-white"><Megaphone className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">নোটিশ বোর্ড</span>
          <span className="block truncate text-sm text-ink-soft">
            {showCoupon ? `প্রিমিয়ামে ${offText(coupon!)} · কুপন ${coupon!.code}` : notices[0] ? pick(notices[0], 'title') : `${bnNum(openCount)}টি সার্কুলারে আবেদন চলছে`}
          </span>
        </span>
        <span className="chip bg-blush-600 text-white">দেখুন</span>
      </button>

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
