'use client';
import Link from 'next/link';
import { useState } from 'react';
import { BookOpen, Play } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { Modal, PageHeader, Spinner, useSubjects, type Subject } from '@/components/ui';
import { useStartExam } from '@/components/useStartExam';

export default function SubjectPracticePage() {
  const { t, pick, num, lang } = useApp();
  const subjects = useSubjects();
  const { start, busy, err } = useStartExam();
  const [picked, setPicked] = useState<Subject | 'all' | null>(null);
  const [count, setCount] = useState(20);
  const [minutes, setMinutes] = useState(20);

  const tones = ['from-brand-50', 'from-mint-50', 'from-blush-50'];

  return (
    <div>
      <PageHeader title={t('subjectPractice')}
        sub={lang === 'bn' ? 'একটি বিষয় বেছে নিয়ে প্রশ্ন অনুশীলন করুন অথবা সময় ধরে ছোট পরীক্ষা দিন।' : 'Pick a subject to practise questions or take a short timed test.'}
        right={<button className="btn-success" onClick={() => setPicked('all')}><Play className="h-4 w-4" />{t('practiceTest')}: {t('all')}</button>} />
      {err && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {subjects.length === 0 ? <Spinner /> : (['nursing', 'general'] as const).map((cat) => (
        <section key={cat} className="mb-6">
          <h2 className="mb-2 font-semibold text-ink">{cat === 'nursing' ? t('nursingSubjects') : t('generalSubjects')}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {subjects.filter((s) => s.category === cat).map((s, i) => (
              <div key={s.id} className={`card bg-gradient-to-br ${tones[i % 3]} to-white p-4`}>
                <h3 className="font-semibold text-ink">{pick(s, 'name')}</h3>
                <div className="mt-3 flex gap-2">
                  <Link href={`/question-bank?subject=${s.id}`} className="btn-ghost flex-1 !py-2"><BookOpen className="h-4 w-4" />{t('practiceQuestions')}</Link>
                  <button className="btn-primary flex-1 !py-2" onClick={() => setPicked(s)}><Play className="h-4 w-4" />{t('practiceTest')}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <Modal open={!!picked} onClose={() => setPicked(null)}>
        <h3 className="text-lg font-bold text-ink">{t('practiceTest')}</h3>
        <p className="mb-4 text-sm text-ink-soft">{picked === 'all' ? t('all') : picked ? pick(picked, 'name') : ''}</p>
        <label className="label">{t('numQuestions')}: {num(count)}</label>
        <input type="range" min={5} max={100} step={5} value={count} onChange={(e) => { setCount(+e.target.value); setMinutes(+e.target.value); }} className="w-full accent-brand-600" />
        <label className="label mt-3">{t('duration')}: {num(minutes)}</label>
        <input type="range" min={5} max={180} step={5} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className="w-full accent-mint-600" />
        <div className="mt-5 flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => setPicked(null)}>{t('cancel')}</button>
          <button className="btn-success flex-1" disabled={!!busy}
            onClick={() => start({ mode: 'custom', subject: picked === 'all' || !picked ? null : picked.id, count, minutes })}>
            {busy ? t('loading') : t('startNow')}
          </button>
        </div>
      </Modal>
    </div>
  );
}
