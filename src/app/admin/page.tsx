'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Crown, FileQuestion, ClipboardCheck, Wallet, Percent, Hourglass, ChevronRight } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Progress, Spinner, Stat } from '@/components/ui';
import { useL } from './AdminShell';
import { UsageCard } from './UsageCard';
import { AppStatsCard } from './AppStatsCard';

type S = {
  users: number; new_users_30d: number; premium_users: number; questions: number; premium_questions: number;
  attempts: number; attempts_7d: number; revenue: number; revenue_30d: number; avg_percent: number | null;
  subjects: { name_en: string; name_bn: string; questions: number; answered: number; correct: number }[];
  top_students: { full_name: string | null; tests: number; avg_percent: number | null }[];
};

export default function AdminHome() {
  const L = useL();
  const { num, pick } = useApp();
  const [s, setS] = useState<S | null>(null);
  const [err, setErr] = useState('');
  // payments waiting for the admin: not yet approved, and auto-activated ones not yet matched in bKash/Nagad
  const [pay, setPay] = useState<{ pending: number; toCheck: number } | null>(null);
  useEffect(() => { supabaseBrowser().rpc('admin_stats').then(({ data, error }) => (error ? setErr(error.message) : setS(data))); }, []);
  useEffect(() => {
    const sb = supabaseBrowser();
    Promise.all([
      sb.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      sb.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'paid').eq('gateway', 'manual')
        .eq('gateway_payload->>auto_approved', 'true').is('gateway_payload->>checked_at', null),
    ]).then(([a, b]) => setPay({ pending: a.count ?? 0, toCheck: b.count ?? 0 })).catch(() => {});
  }, []);
  if (err) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{err}</p>;
  if (!s) return <Spinner />;
  return (
    <div className="space-y-4">
      <PageHeader title={L('প্ল্যাটফর্ম পরিসংখ্যান', 'Platform analytics')} />
      <Link href="/admin/payments?status=pending"
        className={`card flex items-center gap-3 p-4 transition hover:shadow-md ${pay && pay.pending > 0 ? 'border-amber-300 bg-amber-50' : ''}`}>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${pay && pay.pending > 0 ? 'bg-amber-200 text-amber-800' : 'bg-brand-50 text-brand-700'}`}><Hourglass className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-bold text-ink">{pay ? num(pay.pending) : '…'}</span>
          <span className="block text-xs text-ink-soft">{L('অপেক্ষমাণ পেমেন্ট (অনুমোদন বাকি) — চাপ দিয়ে দেখুন', 'Pending payments (awaiting approval) — tap to open')}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-soft" />
      </Link>
      {pay && pay.toCheck > 0 && (
        <Link href="/admin/payments" className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
          <span className="flex-1">{L(`${num(pay.toCheck)}টি স্বয়ংক্রিয়ভাবে চালু হওয়া পেমেন্ট বিকাশ/নগদে মিলিয়ে দেখা বাকি`, `${pay.toCheck} auto-activated payment(s) still to match in bKash/Nagad`)}</span>
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Stat label={`${L('মোট ইউজার', 'Users')} (+${num(s.new_users_30d)} ${L('৩০ দিনে', 'in 30d')})`} value={num(s.users)} icon={<Users className="h-5 w-5" />} href="/admin/users" />
        <Stat label={L('প্রিমিয়াম ইউজার', 'Premium users')} value={num(s.premium_users)} tone="blush" icon={<Crown className="h-5 w-5" />} href="/admin/users?premium=1" />
        <Stat label={`${L('প্রশ্ন', 'Questions')} (${num(s.premium_questions)} ${L('প্রিমিয়াম', 'premium')})`} value={num(s.questions)} icon={<FileQuestion className="h-5 w-5" />} href="/admin/questions" />
        <Stat label={`${L('জমা হওয়া টেস্ট', 'Tests submitted')} (+${num(s.attempts_7d)} ${L('৭ দিনে', '7d')})`} value={num(s.attempts)} tone="mint" icon={<ClipboardCheck className="h-5 w-5" />} href="/admin/tests" />
        <Stat label={`${L('মোট আয়', 'Revenue')} (৳${num(s.revenue_30d)} ${L('৩০ দিনে', '30d')})`} value={`৳${num(s.revenue)}`} tone="mint" icon={<Wallet className="h-5 w-5" />} href="/admin/payments?status=paid" />
        <Stat label={L('গড় নম্বর', 'Average score')} value={s.avg_percent === null ? '—' : `${num(s.avg_percent)}%`} icon={<Percent className="h-5 w-5" />} href="/admin/tests" />
      </div>
      <AppStatsCard />
      <UsageCard />
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-ink">{L('বিষয়ভিত্তিক শিক্ষার্থী পারফরম্যান্স', 'Student performance by subject')}</h2>
          <div className="space-y-3">
            {s.subjects.map((x) => {
              const pct = x.answered ? Math.round((x.correct / x.answered) * 100) : 0;
              return (
                <div key={x.name_en}>
                  <div className="mb-1 flex justify-between text-sm"><span>{pick(x, 'name')} <span className="text-xs text-ink-soft">({num(x.questions)} Q)</span></span><span className="text-ink-soft">{x.answered ? `${num(pct)}%` : '—'}</span></div>
                  <Progress value={pct} tone={pct >= 70 ? 'mint' : pct >= 40 ? 'brand' : 'blush'} />
                </div>
              );
            })}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-ink">{L('সেরা শিক্ষার্থী', 'Top students')}</h2>
          {s.top_students.length === 0 ? <p className="text-sm text-ink-soft">—</p> : (
            <ol className="space-y-2 text-sm">
              {s.top_students.map((x, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{num(i + 1)}</span>
                  <span className="flex-1">{x.full_name || '—'}</span>
                  <span className="text-ink-soft">{num(x.tests)} {L('টেস্ট', 'tests')}</span>
                  <b>{x.avg_percent === null ? '—' : `${num(x.avg_percent)}%`}</b>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
