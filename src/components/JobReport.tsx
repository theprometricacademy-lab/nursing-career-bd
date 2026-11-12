'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Flag } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';

const REASONS: [string, string][] = [
  ['money', 'আবেদনকারীর কাছে টাকা চাইছে'], ['fake', 'ভুয়া / প্রতারণামূলক মনে হচ্ছে'],
  ['wrong_info', 'তথ্য ভুল'], ['closed', 'নিয়োগ শেষ / আর নেওয়া হচ্ছে না'], ['other', 'অন্য কারণ'],
];

/** "Report this post" — three separate reports take a post offline until the admin checks it. */
export function JobReport({ jobId, slug }: { jobId: number; slug: string }) {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('money');
  const [note, setNote] = useState('');
  const [done, setDone] = useState('');

  async function send() {
    const { error } = await supabaseBrowser().rpc('report_job', { p_job: jobId, p_reason: reason, p_note: note || null });
    setDone(error ? (error.message.includes('rate_limited') ? 'আজ অনেক রিপোর্ট করেছেন, কাল আবার চেষ্টা করুন।' : 'রিপোর্ট পাঠানো যায়নি।')
      : 'ধন্যবাদ! রিপোর্ট পেয়েছি, দ্রুত যাচাই করা হবে।');
  }

  if (!open) return <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"><Flag className="h-3.5 w-3.5" />এই বিজ্ঞপ্তি নিয়ে সমস্যা? রিপোর্ট করুন</button>;
  return (
    <div className="card space-y-2 p-4 text-sm">
      <b className="text-ink">বিজ্ঞপ্তিটি রিপোর্ট করুন</b>
      {done ? <p className="text-mint-700">{done}</p> : !user ? (
        <p>রিপোর্ট করতে <Link href={`/login?next=${encodeURIComponent(`/jobs/${slug}`)}`} className="text-brand-700 underline">লগইন করুন</Link>।</p>
      ) : (
        <>
          {REASONS.map(([k, l]) => (
            <label key={k} className="flex items-center gap-2"><input type="radio" name="reason" checked={reason === k} onChange={() => setReason(k)} />{l}</label>
          ))}
          <textarea className="input min-h-[60px]" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="বিস্তারিত (ঐচ্ছিক) — যেমন: কত টাকা চেয়েছে, কে চেয়েছে" />
          <div className="flex gap-2"><button className="btn-pink !py-1.5" onClick={send}>রিপোর্ট পাঠান</button><button className="btn-ghost !py-1.5" onClick={() => setOpen(false)}>বাতিল</button></div>
        </>
      )}
    </div>
  );
}
