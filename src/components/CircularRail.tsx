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
      .gte('apply_end', new Date().toISOString()).order('apply_end', { ascending: true }).limit(6)
      .then(async ({ data }) => {
        if (data && data.length) { setItems(data as Item[]); return; }
        // Nothing open right now: show the most recent ones instead
        const { data: recent } = await sb.from('circulars').select('id, slug, title_bn, org_bn, total_posts, apply_start, apply_end')
          .order('apply_end', { ascending: false }).limit(4);
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

/** Phones/tablets: a slim strip above the page content. */
export function CircularStrip() {
  const items = useCirculars();
  // Keep the strip's space while loading so the page does not jump when it appears
  if (!items) return <div className="mb-4 h-[34px] xl:hidden" aria-hidden />;
  if (items.length === 0) return null;
  const open = items.filter((c) => status(c).key !== 'closed');
  if (open.length === 0) return null;
  return (
    <div className="mb-4 xl:hidden">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <Link href="/circulars" className="chip shrink-0 bg-blush-600 py-1.5 text-white"><BellRing className="h-3.5 w-3.5" />সার্কুলার</Link>
        {open.map((c) => (
          <Link key={c.id} href={`/circulars/${c.slug}`} className="shrink-0 rounded-full border border-blush-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-blush-50">
            {c.title_bn.length > 42 ? c.title_bn.slice(0, 42) + '…' : c.title_bn}
            <span className="ml-1.5 text-blush-700">· {status(c).label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
