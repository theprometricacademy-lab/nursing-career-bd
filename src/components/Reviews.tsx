'use client';
import { useEffect, useState } from 'react';
import { Star, MessageSquareHeart, CheckCircle2, Clock } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';

type Mine = { rating: number; body: string; display_name: string | null; status: 'pending' | 'approved' | 'rejected' };
type Pub = { id: number; rating: number; body: string; name: string; created_at: string };

function Stars({ value, onPick, size = 'h-5 w-5' }: { value: number; onPick?: (n: number) => void; size?: string }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onPick} onClick={() => onPick?.(n)} aria-label={`${n}`}
          className={onPick ? 'transition hover:scale-110' : 'cursor-default'}>
          <Star className={`${size} ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-amber-200'}`} />
        </button>
      ))}
    </span>
  );
}

const ERR: Record<string, string> = {
  premium_only: 'রিভিউ শুধু প্রিমিয়াম সদস্যরা দিতে পারেন।',
  too_short: 'অন্তত ১০ অক্ষর লিখুন।',
  bad_rating: 'তারকা বেছে নিন।',
  login_required: 'আগে লগইন করুন।',
};

/** Premium members write (or edit) their review. Shown after an admin approves it. */
export function ReviewForm({ compact = false }: { compact?: boolean }) {
  const { user, premium, num } = useApp();
  const [mine, setMine] = useState<Mine | null | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  useEffect(() => {
    if (!user || !premium) return;
    supabaseBrowser().from('reviews').select('rating, body, display_name, status').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        const m = (data as Mine) ?? null; setMine(m);
        if (m) { setRating(m.rating); setBody(m.body); setName(m.display_name ?? ''); }
      });
  }, [user, premium]);

  if (!user || !premium || mine === undefined) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setMsg({ ok: false, t: ERR.bad_rating }); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().rpc('submit_review', { p_rating: rating, p_body: body, p_name: name });
    setBusy(false);
    if (error) { const k = Object.keys(ERR).find((x) => error.message.includes(x)); setMsg({ ok: false, t: k ? ERR[k] : 'পাঠানো যায়নি, আবার চেষ্টা করুন।' }); return; }
    setMine({ rating, body, display_name: name || null, status: 'pending' }); setEditing(false);
    setMsg({ ok: true, t: 'ধন্যবাদ! আপনার রিভিউ জমা হয়েছে। যাচাইয়ের পর ওয়েবসাইটে দেখানো হবে।' });
  }

  const showForm = !mine || editing;
  return (
    <section id="review" className="card scroll-mt-20 border-amber-200 p-4 md:p-5">
      <h2 className="flex items-center gap-2 font-semibold text-ink"><MessageSquareHeart className="h-5 w-5 text-blush-600" />
        {mine ? 'আপনার রিভিউ' : 'Nursing Career BD কেমন লাগছে? একটা রিভিউ দিন'}</h2>
      {!mine && !compact && <p className="mt-1 text-sm text-ink-soft">আপনার মতামত নতুন শিক্ষার্থীদের সিদ্ধান্ত নিতে সাহায্য করবে, আর আমাদের আরও ভালো করতে।</p>}

      {showForm ? (
        <form onSubmit={send} className="mt-3 space-y-3">
          <div className="flex items-center gap-3"><Stars value={rating} onPick={setRating} size="h-8 w-8" />
            {rating > 0 && <span className="text-sm font-semibold text-amber-600">{num(rating)}/৫</span>}</div>
          <textarea className="input min-h-[96px]" maxLength={600} required value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="যেমন: প্রশ্নগুলোর ব্যাখ্যা খুব কাজে দিয়েছে, মডেল টেস্ট দিয়ে আত্মবিশ্বাস বেড়েছে…" />
          <input className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)}
            placeholder="কোন নামে দেখাবে? (ঐচ্ছিক — খালি রাখলে আপনার নামের প্রথম অংশ)" />
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={busy}>{busy ? 'পাঠানো হচ্ছে…' : mine ? 'আপডেট করুন' : 'রিভিউ জমা দিন'}</button>
            {editing && <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>বাতিল</button>}
          </div>
        </form>
      ) : (
        <div className="mt-3 rounded-xl bg-amber-50/60 p-3">
          <Stars value={mine!.rating} />
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{mine!.body}</p>
          <p className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${mine!.status === 'approved' ? 'text-mint-700' : mine!.status === 'rejected' ? 'text-red-600' : 'text-brand-700'}`}>
            {mine!.status === 'approved' ? <><CheckCircle2 className="h-4 w-4" />ওয়েবসাইটে দেখানো হচ্ছে</> : mine!.status === 'rejected' ? 'দেখানো হচ্ছে না — চাইলে সম্পাদনা করে আবার জমা দিন' : <><Clock className="h-4 w-4" />যাচাইয়ের অপেক্ষায়</>}
          </p>
          <button className="btn-ghost mt-2 !py-1.5 text-sm" onClick={() => { setEditing(true); setMsg(null); }}>সম্পাদনা করুন</button>
        </div>
      )}
      {msg && <p className={`mt-3 rounded-xl p-3 text-sm ${msg.ok ? 'bg-mint-50 text-mint-700' : 'bg-red-50 text-red-700'}`}>{msg.t}</p>}
    </section>
  );
}

/** Approved reviews for visitors; renders nothing until there is at least one. */
export function ReviewList({ limit = 6, title = 'প্রিমিয়াম সদস্যরা যা বলছেন' }: { limit?: number; title?: string }) {
  const { num } = useApp();
  const [rows, setRows] = useState<Pub[]>([]);
  useEffect(() => {
    supabaseBrowser().rpc('public_reviews', { p_limit: limit }).then(({ data }) => setRows((data as Pub[]) ?? []));
  }, [limit]);
  if (!rows.length) return null;
  const avg = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <span className="flex items-center gap-1.5 text-sm text-ink-soft"><Stars value={Math.round(avg)} size="h-4 w-4" />
          <b className="text-ink">{num(avg.toFixed(1))}</b> · {num(rows.length)}টি রিভিউ</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <figure key={r.id} className="card p-4">
            <Stars value={r.rating} size="h-4 w-4" />
            <blockquote className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink">“{r.body}”</blockquote>
            <figcaption className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{r.name.slice(0, 1)}</span>
              <span><b className="text-ink">{r.name}</b> · প্রিমিয়াম সদস্য</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
