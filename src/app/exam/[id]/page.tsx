'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Flag, Eraser, Clock, Grid3x3, Send, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { LogoMark } from '@/components/Logo';
import { Modal, Spinner } from '@/components/ui';
import { LETTERS, displayLang, type Attempt, type AttemptQuestion, type ViewMode } from '@/components/examTypes';

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t, lang, num, pick, errMsg } = useApp();
  const sb = supabaseBrowser();
  const [att, setAtt] = useState<Attempt | null>(null);
  const [qs, setQs] = useState<AttemptQuestion[]>([]);
  const [cur, setCur] = useState(0);
  const [mode, setMode] = useState<ViewMode>('real');
  const [left, setLeft] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [palette, setPalette] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const offset = useRef(0); // server - client clock (ms)
  const submittedRef = useRef(false);
  const errRef = useRef(errMsg);
  errRef.current = errMsg;

  useEffect(() => {
    sb.rpc('get_attempt', { p_attempt: id }).then(({ data, error }) => {
      if (error) { setErr(errRef.current(error)); return; }
      const a = data as Attempt;
      if (a.status === 'submitted') { router.replace(`/result/${id}`); return; }
      offset.current = new Date(a.server_now).getTime() - Date.now();
      setAtt(a);
      setQs(a.questions);
      const firstEmpty = a.questions.findIndex((q) => q.selected === null);
      setCur(firstEmpty >= 0 ? firstEmpty : 0);
    });
  }, [id, sb, router]);

  const submit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const { error } = await sb.rpc('submit_attempt', { p_attempt: id });
    if (error && !error.message.includes('already_submitted')) {
      submittedRef.current = false; setSubmitting(false); setErr(errRef.current(error)); return;
    }
    router.replace(`/result/${id}${auto ? '?auto=1' : ''}`);
  }, [id, sb, router]);

  // countdown
  useEffect(() => {
    if (!att) return;
    const end = new Date(att.expires_at).getTime();
    const tick = () => {
      const s = Math.max(0, Math.floor((end - (Date.now() + offset.current)) / 1000));
      setLeft(s);
      if (s === 0) submit(true);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [att, submit]);

  // warn before leaving
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (!submittedRef.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  async function save(pos: number, patch: { p_selected?: number | null; p_marked?: boolean; p_clear?: boolean }) {
    const { error } = await sb.rpc('save_answer', { p_attempt: id, p_position: pos, p_selected: null, p_marked: null, p_clear: false, ...patch });
    if (error) {
      if (error.message.includes('time_over') || error.message.includes('already_submitted')) { submittedRef.current = true; router.replace(`/result/${id}?auto=1`); }
      else setErr(errMsg(error));
    }
  }

  const q = qs[cur];
  const update = (pos: number, patch: Partial<AttemptQuestion>) => setQs((p) => p.map((x) => (x.position === pos ? { ...x, ...patch } : x)));

  function choose(idx: number) {
    if (!q) return;
    update(q.position, { selected: idx });
    save(q.position, { p_selected: idx });
  }
  function toggleMark() {
    if (!q) return;
    update(q.position, { marked: !q.marked });
    save(q.position, { p_marked: !q.marked });
  }
  function clear() {
    if (!q) return;
    update(q.position, { selected: null });
    save(q.position, { p_clear: true });
  }

  const counts = useMemo(() => ({
    answered: qs.filter((x) => x.selected !== null).length,
    marked: qs.filter((x) => x.marked).length,
  }), [qs]);

  if (err && !att) return <div className="mx-auto max-w-md p-6"><p className="rounded-xl bg-red-50 p-4 text-red-700">{err}</p></div>;
  if (!att || !q) return <Spinner />;

  const mm = Math.floor((left ?? 0) / 60), ss = (left ?? 0) % 60;
  const timeStr = `${num(String(mm).padStart(2, '0'))}:${num(String(ss).padStart(2, '0'))}`;
  const low = (left ?? 999) <= 60;
  const ql = displayLang(q, mode);
  const letters = LETTERS[ql];

  const Palette = (
    <div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
        {qs.map((x, i) => {
          let cls = 'bg-white text-ink ring-1 ring-brand-200';
          if (x.selected !== null) cls = 'bg-mint-500 text-white';
          if (x.marked) cls = 'bg-blush-500 text-white';
          return (
            <button key={x.position} onClick={() => { setCur(i); setPalette(false); }}
              className={`relative h-9 rounded-lg text-xs font-semibold ${cls} ${i === cur ? 'ring-2 ring-brand-600 ring-offset-1' : ''}`}>
              {num(i + 1)}
              {x.marked && x.selected !== null && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white bg-mint-400" />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-mint-500" />{t('answered')} ({num(counts.answered)})</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-white ring-1 ring-brand-200" />{t('notAnswered')} ({num(qs.length - counts.answered)})</span>
        <span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-blush-500" />{t('markedReview')} ({num(counts.marked)})</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-brand-50/50">
      <header className="sticky top-0 z-20 border-b border-brand-100 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <button aria-label={t('back')} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brand-200 text-brand-700 hover:bg-brand-50"
            onClick={() => {
              if (window.confirm(lang === 'bn' ? 'পরীক্ষা থেকে বের হবেন? আপনার দেওয়া উত্তরগুলো সংরক্ষিত থাকবে, তবে সময় চলতে থাকবে।' : 'Leave the exam? Your answers are saved, but the timer keeps running.')) {
                if (window.history.length > 1) router.back(); else router.push('/mock-tests');
              }
            }}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <LogoMark size={28} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">{pick(att, 'title')}</div>
            <div className="text-xs text-ink-soft">{num(counts.answered)}/{num(qs.length)} {t('answered')}</div>
          </div>
          <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-sm font-bold tabular-nums ${low ? 'animate-pulse bg-red-100 text-red-700' : 'bg-brand-100 text-brand-800'}`}
            aria-label={t('timeLeft')}>
            <Clock className="h-4 w-4" />{timeStr}
          </div>
          <span className="hidden sm:block"><ViewModeToggle value={mode} onChange={setMode} /></span>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[1fr_280px]">
        <section className="wm card p-4 md:p-6">
          <div className="mb-3 sm:hidden"><ViewModeToggle value={mode} onChange={setMode} /></div>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold text-brand-700">{lang === 'bn' ? 'প্রশ্ন' : 'Question'} {num(cur + 1)} / {num(qs.length)}</span>
            <span className="text-xs text-ink-soft">+{num(att.marks_per_question)}{Number(att.negative_mark) > 0 && <> / −{num(att.negative_mark)}</>}</span>
          </div>
          <h2 className="mb-4 text-base font-medium leading-relaxed text-ink md:text-lg">{ql === 'bn' ? q.question_bn : q.question_en}</h2>
          <div className="space-y-2">
            {q.options.map((o, i) => {
              const on = q.selected === o.idx;
              return (
                <button key={o.idx} onClick={() => choose(o.idx)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${on ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-brand-100 bg-white hover:border-brand-300'}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${on ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700'}`}>{letters[i]}</span>
                  <span className="pt-1">{ql === 'bn' ? o.bn : o.en}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={toggleMark} className={`btn ${q.marked ? 'bg-blush-100 text-blush-700' : 'border border-blush-200 bg-white text-blush-700 hover:bg-blush-50'}`}>
              <Flag className="h-4 w-4" />{q.marked ? t('unmark') : t('markReview')}
            </button>
            <button onClick={clear} disabled={q.selected === null} className="btn-ghost"><Eraser className="h-4 w-4" />{t('clear')}</button>
          </div>

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-brand-100 pt-4">
            <button className="btn-ghost" disabled={cur === 0} onClick={() => setCur(cur - 1)}><ChevronLeft className="h-4 w-4" />{t('previous')}</button>
            <button className="btn-ghost lg:hidden" onClick={() => setPalette(true)} aria-label={t('palette')}><Grid3x3 className="h-4 w-4" /></button>
            {cur < qs.length - 1
              ? <button className="btn-primary" onClick={() => setCur(cur + 1)}>{t('next')}<ChevronRight className="h-4 w-4" /></button>
              : <button className="btn-success" onClick={() => setConfirm(true)}><Send className="h-4 w-4" />{t('submit')}</button>}
          </div>
          {err && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        </section>

        <aside className="hidden lg:block">
          <div className="card sticky top-20 p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">{t('palette')}</h3>
            {Palette}
            <button className="btn-success mt-4 w-full" onClick={() => setConfirm(true)}><Send className="h-4 w-4" />{t('submit')}</button>
          </div>
        </aside>
      </div>

      {palette && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setPalette(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-ink">{t('palette')}</h3>
              <button onClick={() => setPalette(false)} aria-label={t('close')}><X className="h-5 w-5" /></button>
            </div>
            {Palette}
            <button className="btn-success mt-4 w-full" onClick={() => { setPalette(false); setConfirm(true); }}><Send className="h-4 w-4" />{t('submit')}</button>
          </div>
        </div>
      )}

      <Modal open={confirm} onClose={() => !submitting && setConfirm(false)}>
        <h3 className="text-lg font-bold text-ink">{t('confirmSubmit')}</h3>
        <p className="mt-2 text-sm text-ink-soft">{t('confirmSubmitD', { n: qs.length - counts.answered })}</p>
        <div className="mt-5 flex gap-2">
          <button className="btn-ghost flex-1" disabled={submitting} onClick={() => setConfirm(false)}>{t('cancel')}</button>
          <button className="btn-success flex-1" disabled={submitting} onClick={() => submit(false)}>{submitting ? t('submitting') : t('submit')}</button>
        </div>
      </Modal>
    </div>
  );
}
