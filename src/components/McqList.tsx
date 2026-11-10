import { CheckCircle2 } from 'lucide-react';
import type { SampleQ } from '@/lib/seoSubjects';

const L = ['ক', 'খ', 'গ', 'ঘ'];
const DIFF: Record<string, string> = { hard: 'কঠিন', medium: 'মাঝারি', easy: 'সহজ' };

/** Server-rendered list of MCQs with the answer and explanation visible (for Google and readers). */
export function McqList({ items }: { items: SampleQ[] }) {
  return (
    <ol className="space-y-4">
      {items.map((q, n) => (
        <li key={q.id} className="rounded-xl border border-brand-100 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-ink">{n + 1}. {q.question_bn}</p>
            {DIFF[q.difficulty] && <span className={`chip shrink-0 ${q.difficulty === 'hard' ? 'bg-blush-100 text-blush-700' : 'bg-brand-50 text-brand-700'}`}>{DIFF[q.difficulty]}</span>}
          </div>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {q.options_bn.map((o, k) => (
              <li key={k} className={`rounded-lg px-3 py-1.5 text-sm ${k === q.correct_option ? 'bg-mint-50 font-semibold text-mint-700' : 'bg-brand-50/50 text-ink-soft'}`}>
                {L[k]}) {o}{k === q.correct_option && <CheckCircle2 className="ml-1 inline h-4 w-4" />}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-ink"><b>সঠিক উত্তর:</b> {L[q.correct_option]}) {q.options_bn[q.correct_option]}</p>
          {q.explanation_bn && <p className="mt-1 text-sm leading-6 text-ink-soft"><b className="text-ink">ব্যাখ্যা:</b> {q.explanation_bn}</p>}
        </li>
      ))}
    </ol>
  );
}
