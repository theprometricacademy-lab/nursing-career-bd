'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Crown, Loader2, Inbox } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';

export type Subject = { id: number; slug: string; name_en: string; name_bn: string; category: 'nursing' | 'general'; icon: string | null; sort_order: number; exam_lang: 'bn' | 'en'; translatable: boolean };
export type Exam = { id: number; name_en: string; name_bn: string; exam_type: string; year: number; exam_date?: string | null };
export type Topic = { id: number; subject_id: number; name_en: string; name_bn: string };

let subjectCache: Subject[] | null = null;
export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>(subjectCache ?? []);
  useEffect(() => {
    if (subjectCache) return;
    supabaseBrowser().from('subjects').select('*').eq('is_active', true).order('sort_order').then(({ data }) => {
      subjectCache = (data as Subject[]) ?? [];
      setSubjects(subjectCache);
    });
  }, []);
  return subjects;
}

let examCache: Exam[] | null = null;

/** Load subjects and exams in the background so their pages open without a spinner. */
export function warmCatalog() {
  const sb = supabaseBrowser();
  if (!subjectCache) sb.from('subjects').select('*').eq('is_active', true).order('sort_order').then(({ data, error }) => { if (!error && !subjectCache) subjectCache = (data as Subject[]) ?? []; });
  if (!examCache) sb.from('exams').select('*').eq('is_active', true).order('exam_date', { ascending: false, nullsFirst: false }).order('year', { ascending: false })
    .then(({ data, error }) => { if (!error && !examCache) examCache = (data as Exam[]) ?? []; });
}
export function useExams() {
  const [exams, setExams] = useState<Exam[]>(examCache ?? []);
  useEffect(() => {
    if (examCache) return;
    supabaseBrowser().from('exams').select('*').eq('is_active', true).order('exam_date', { ascending: false, nullsFirst: false }).order('year', { ascending: false })
      .then(({ data }) => { examCache = (data as Exam[]) ?? []; setExams(examCache); });
  }, []);
  return exams;
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useApp();
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-soft">
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" /> {label ?? t('loading')}
    </div>
  );
}

export function Empty({ text, action }: { text?: string; action?: React.ReactNode }) {
  const { t } = useApp();
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center text-ink-soft">
      <Inbox className="h-10 w-10 text-brand-300" />
      <p>{text ?? t('noData')}</p>
      {action}
    </div>
  );
}

export function Stat({ label, value, tone = 'brand', icon, href }: { label: string; value: React.ReactNode; tone?: 'brand' | 'mint' | 'blush'; icon?: React.ReactNode; href?: string }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    mint: 'bg-mint-50 text-mint-700',
    blush: 'bg-blush-50 text-blush-700',
  };
  const body = (
    <div className="flex items-center gap-3">
      {icon && <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>{icon}</span>}
      <div className="min-w-0 flex-1">
        <div className="text-xl font-bold text-ink">{value}</div>
        <div className="text-xs text-ink-soft">{label}</div>
      </div>
      {href && <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />}
    </div>
  );
  // with href the whole card is a link to the list behind the number
  return href
    ? <Link href={href} className="card block p-4 transition hover:border-brand-300 hover:shadow-md">{body}</Link>
    : <div className="card p-4">{body}</div>;
}

export function Progress({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'mint' | 'blush' }) {
  const bar = { brand: 'bg-brand-500', mint: 'bg-mint-500', blush: 'bg-blush-500' }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
      <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function PremiumChip() {
  const { t } = useApp();
  return <span className="chip bg-blush-100 text-blush-700"><Crown className="h-3 w-3" />{t('premium')}</span>;
}

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, ready, t } = useApp();
  if (!ready) return <Spinner />;
  if (!user) {
    return (
      <Empty text={t('loginRequired')} action={<Link href="/login" className="btn-primary">{t('login')}</Link>} />
    );
  }
  return <>{children}</>;
}

export function Modal({ open, onClose, children, wide = false }: { open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-md'} animate-rise rounded-2xl bg-white p-5 shadow-xl`}>{children}</div>
    </div>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="mt-1 text-sm text-ink-soft">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
