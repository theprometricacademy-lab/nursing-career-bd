'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';
import { QuestionCard, type BankQuestion } from './QuestionCard';
import { Empty, Spinner, useExams, useSubjects, type Topic } from './ui';

const PAGE = 20;

export function QuestionBrowser({ filter = 'all', showExamFilters = false, emptyText }: {
  filter?: 'all' | 'bookmarked' | 'wrong'; showExamFilters?: boolean; emptyText?: string;
}) {
  const { t, pick, num, user, errMsg } = useApp();
  const params = useSearchParams();
  const subjects = useSubjects();
  const exams = useExams();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [f, setF] = useState({
    subject: params.get('subject') ?? '', topic: '', exam: params.get('exam') ?? '', year: params.get('year') ?? '',
    difficulty: '', search: '',
  });
  const [items, setItems] = useState<BankQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!f.subject) { setTopics([]); return; }
    supabaseBrowser().from('topics').select('*').eq('subject_id', Number(f.subject)).order('name_en')
      .then(({ data }) => setTopics((data as Topic[]) ?? []));
  }, [f.subject]);

  const load = useCallback(async (offset: number) => {
    setLoading(true); setErr('');
    const { data, error } = await supabaseBrowser().rpc('list_questions', {
      p_subject: f.subject ? Number(f.subject) : null,
      p_topic: f.topic ? Number(f.topic) : null,
      p_exam: f.exam ? Number(f.exam) : null,
      p_year: f.year ? Number(f.year) : null,
      p_difficulty: f.difficulty || null,
      p_search: f.search.trim() || null,
      p_filter: filter,
      p_limit: PAGE,
      p_offset: offset,
    });
    setLoading(false);
    if (error) { setErr(errMsg(error)); return; }
    setTotal(data.total);
    setItems((prev) => (offset === 0 ? data.items : [...prev, ...data.items]));
  }, [f, filter, errMsg]);

  // debounce filter changes
  useEffect(() => {
    if (filter !== 'all' && !user) { setLoading(false); return; }
    const id = setTimeout(() => load(0), 250);
    return () => clearTimeout(id);
  }, [load, filter, user]);

  const subjectName = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, pick(s, 'name')])), [subjects, pick]);
  const years = useMemo(() => Array.from(new Set(exams.map((e) => e.year))).sort((a, b) => b - a), [exams]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value, ...(k === 'subject' ? { topic: '' } : {}) }));

  return (
    <div className="space-y-4">
      <div className="card grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-4">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-soft" />
          <input className="input pl-9" placeholder={t('search')} value={f.search} onChange={set('search')} />
        </div>
        <select className="input" value={f.subject} onChange={set('subject')} aria-label={t('subject')}>
          <option value="">{t('subject')}: {t('all')}</option>
          <optgroup label={t('nursingSubjects')}>
            {subjects.filter((s) => s.category === 'nursing').map((s) => <option key={s.id} value={s.id}>{pick(s, 'name')}</option>)}
          </optgroup>
          <optgroup label={t('generalSubjects')}>
            {subjects.filter((s) => s.category === 'general').map((s) => <option key={s.id} value={s.id}>{pick(s, 'name')}</option>)}
          </optgroup>
        </select>
        <select className="input" value={f.topic} onChange={set('topic')} disabled={!topics.length} aria-label={t('topic')}>
          <option value="">{t('topic')}: {t('all')}</option>
          {topics.map((tp) => <option key={tp.id} value={tp.id}>{pick(tp, 'name')}</option>)}
        </select>
        {showExamFilters ? (
          <>
            <select className="input" value={f.exam} onChange={set('exam')} aria-label={t('exam')}>
              <option value="">{t('exam')}: {t('all')}</option>
              {exams.map((e) => <option key={e.id} value={e.id}>{pick(e, 'name')} ({num(e.year)})</option>)}
            </select>
            <select className="input" value={f.year} onChange={set('year')} aria-label={t('year')}>
              <option value="">{t('year')}: {t('all')}</option>
              {years.map((y) => <option key={y} value={y}>{num(y)}</option>)}
            </select>
          </>
        ) : (
          <select className="input" value={f.difficulty} onChange={set('difficulty')} aria-label={t('difficulty')}>
            <option value="">{t('difficulty')}: {t('all')}</option>
            <option value="easy">{t('easy')}</option>
            <option value="medium">{t('medium')}</option>
            <option value="hard">{t('hard')}</option>
          </select>
        )}
      </div>

      {!loading && !err && <p className="text-sm text-ink-soft">{num(total)} {t('questions')}</p>}
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      {items.length === 0 && !loading ? (
        <Empty text={emptyText} />
      ) : (
        <div className="space-y-3">
          {items.map((q, i) => (
            <QuestionCard key={q.id} q={q} index={i + 1} subjectName={subjectName[q.subject_id]}
              onBookmarkChange={filter === 'bookmarked' ? (id, v) => { if (!v) { setItems((p) => p.filter((x) => x.id !== id)); setTotal((n) => n - 1); } } : undefined} />
          ))}
        </div>
      )}
      {loading && <Spinner />}
      {!loading && items.length < total && (
        <div className="flex justify-center"><button className="btn-ghost" onClick={() => load(items.length)}>{t('loadMore')}</button></div>
      )}
    </div>
  );
}
