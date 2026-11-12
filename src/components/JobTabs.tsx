import Link from 'next/link';
import { Briefcase, Landmark } from 'lucide-react';

/** Switch between government circulars and private hospital jobs (shown at the top of both pages). */
export function JobTabs({ active }: { active: 'govt' | 'private' }) {
  const cls = (on: boolean) => `flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold transition ${on ? 'bg-brand-600 text-white shadow-card' : 'text-ink hover:bg-brand-50'}`;
  return (
    <nav className="card flex gap-1 p-1" aria-label="চাকরির ধরন">
      <Link href="/circulars" className={cls(active === 'govt')}><Landmark className="h-4 w-4" />সরকারি সার্কুলার</Link>
      <Link href="/jobs" className={cls(active === 'private')}><Briefcase className="h-4 w-4" />প্রাইভেট হাসপাতালের চাকরি</Link>
    </nav>
  );
}
