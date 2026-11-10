'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BellRing, ArrowRight } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { bnDate, bnNum, status, type Circular } from '@/lib/circulars';

type Item = Pick<Circular, 'id' | 'slug' | 'title_bn' | 'org_bn' | 'total_posts' | 'apply_start' | 'apply_end'>;

function useCirculars() {
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    const sb = supabaseBrowser();
    sb.from('circulars').select('id, slug, title_bn, org_bn, total_posts, apply_start, apply_end')
      .eq('is_published', true).gte('apply_end', new Date().toISOString()).order('apply_end', { ascending: true }).limit(6)
      .then(async ({ data }) => {
        if (data && data.length) { setItems(data as Item[]); return; }
        // Nothing open right now: show the most recent ones instead
        const { data: recent } = await sb.from('circulars').select('id, slug, title_bn, org_bn, total_posts, apply_start, apply_end')
          .eq('is_published', true).order('apply_end', { ascending: false }).limit(4);
        setItems((recent as Item[]) ?? []);
      });
  }, []);
  return items;
}

/** Desktop: sticky "ad-style" panel on the right. */
export function CircularRail() {
  const items = useCirculars();
  if (!items || items.length === 0) return null;
  return (
    <aside className="sticky top-[4.5rem] hidden h-fit w-72 shrink-0 xl:block" aria-label="নার্সিং চাকরির সার্কুলার">
      <div className="overflow-hidden rounded-2xl border border-blush-200 bg-white shadow-card">
        <div className="flex items-center gap-2 bg-gradient-to-r from-blush-600 to-blush-500 px-4 py-2.5 text-white">
          <BellRing className="h-4 w-4" /><span className="text-sm font-bold">নার্সিং চাকরির সার্কুলার</span>
        </div>
        <ul className="divide-y divide-brand-100">
          {items.map((c) => {
            const st = status(c);
            return (
              <li key={c.id}>
                <Link href={`/circulars/${c.slug}`} className="block px-4 py-3 transition hover:bg-blush-50/60">
                  <span className={`chip ${st.tone}`}>{st.label}</span>
                  <div className="mt-1.5 text-sm font-semibold leading-snug text-ink">{c.title_bn}</div>
                  <div className="mt-1 text-xs text-ink-soft">
                    {c.total_posts ? `${bnNum(c.total_posts)} পদ · ` : ''}শেষ: {bnDate(c.apply_end)}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <Link href="/circulars" className="flex items-center justify-center gap-1 border-t border-brand-100 py-2.5 text-sm font-semibold text-blush-700 hover:bg-blush-50">
          সব সার্কুলার <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}

/** News-ticker strip above the page content: open circulars scroll right-to-left continuously. */
export function CircularStrip() {
  const items = useCirculars();
  // Keep the strip's space while loading so the page does not jump when it appears
  if (!items) return <div className="mb-4 h-[38px]" aria-hidden />;
  const open = items.filter((c) => status(c).key !== 'closed');
  if (open.length === 0) return null;
  const row = (dup: boolean) => open.map((c) => (
    <Link key={(dup ? 'd' : '') + c.id} href={`/circulars/${c.slug}`} aria-hidden={dup || undefined} tabIndex={dup ? -1 : undefined}
      className="mx-1.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-blush-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-blush-50">
      <span className="h-1.5 w-1.5 rounded-full bg-blush-500" />{c.title_bn}
      <span className="text-blush-700">· {status(c).label} · শেষ {bnDate(c.apply_end)}</span>
    </Link>
  ));
  return (
    <div className="mb-4 flex items-center gap-2 overflow-hidden rounded-full bg-blush-50/70 py-1 pl-1 pr-0 ring-1 ring-blush-100">
      <Link href="/circulars" className="chip z-10 shrink-0 bg-blush-600 py-1.5 text-white"><BellRing className="h-3.5 w-3.5" />সার্কুলার</Link>
      <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_16px,#000_calc(100%-16px),transparent)]">
        <div className="flex w-max animate-marquee hover:[animation-play-state:paused] active:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ animationDuration: `${Math.max(18, open.length * 14)}s` }}>
          {row(false)}{row(true)}
        </div>
      </div>
    </div>
  );
}
