import Link from 'next/link';
import { ListChecks, PenLine } from 'lucide-react';

/** Switch between previous-year MCQ papers and written papers. */
export function PyqTabs({ active }: { active: 'mcq' | 'written' }) {
  const cls = (on: boolean) => `flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${on ? 'bg-brand-600 text-white shadow' : 'text-ink-soft hover:bg-brand-50'}`;
  return (
    <div className="mb-4 flex gap-1 rounded-2xl border border-brand-100 bg-white p-1">
      <Link href="/previous-questions" className={cls(active === 'mcq')}><ListChecks className="h-4 w-4" />MCQ (প্রিলিমিনারি)</Link>
      <Link href="/written-questions" className={cls(active === 'written')}><PenLine className="h-4 w-4" />লিখিত পরীক্ষার প্রশ্ন</Link>
    </div>
  );
}
