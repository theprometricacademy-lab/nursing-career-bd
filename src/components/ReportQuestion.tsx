'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Flag, CheckCircle2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';
import { Modal } from './ui';

const REASONS: [string, string, string][] = [
  ['wrong_answer', 'সঠিক উত্তর ভুল দেওয়া আছে', 'The marked answer is wrong'],
  ['wrong_option', 'অপশনে সমস্যা (দুইটা সঠিক / কোনোটাই না)', 'Problem with options'],
  ['typo', 'প্রশ্নে বানান বা লেখার ভুল', 'Spelling / typing mistake'],
  ['wrong_explanation', 'ব্যাখ্যা ভুল', 'The explanation is wrong'],
  ['other', 'অন্য সমস্যা', 'Something else'],
];

/** Small "report" flag on a question; opens a form that sends the report to the admin panel. */
export function ReportQuestion({ questionId, code }: { questionId: number; code?: string }) {
  const { lang, user } = useApp();
  const L = (bn: string, en: string) => (lang === 'bn' ? bn : en);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('wrong_answer');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'' | 'busy' | 'done' | 'dup'>('');
  const [err, setErr] = useState('');

  async function send() {
    setState('busy'); setErr('');
    const { data, error } = await supabaseBrowser().rpc('report_question', { p_question: questionId, p_reason: reason, p_note: note });
    if (error) {
      setState('');
      setErr(error.message.includes('too_many') ? L('আজ অনেকগুলো রিপোর্ট করেছেন, কাল আবার চেষ্টা করুন।', 'Too many reports today, please try tomorrow.') : L('পাঠানো যায়নি, আবার চেষ্টা করুন।', 'Could not send, please try again.'));
      return;
    }
    setState(data === 'already_reported' ? 'dup' : 'done');
  }
  const close = () => { setOpen(false); setTimeout(() => { setState(''); setNote(''); setErr(''); }, 200); };

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-soft hover:bg-red-50 hover:text-red-600"
        title={L('এই প্রশ্নে ভুল আছে? রিপোর্ট করুন', 'Report a problem with this question')} aria-label={L('রিপোর্ট', 'Report')}>
        <Flag className="h-4 w-4" />{L('রিপোর্ট', 'Report')}
      </button>
      <Modal open={open} onClose={close}>
        {state === 'done' || state === 'dup' ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-mint-500" />
            <h3 className="mt-2 text-lg font-bold text-ink">{state === 'done' ? L('ধন্যবাদ! রিপোর্ট পাঠানো হয়েছে', 'Thanks! Report sent') : L('আপনি এটা আগেই রিপোর্ট করেছেন', 'You already reported this')}</h3>
            <p className="mt-1 text-sm text-ink-soft">{L('আমরা প্রশ্নটা যাচাই করে দ্রুত ঠিক করে দেব।', 'We will check and fix it soon.')}</p>
            <button className="btn-primary mt-4" onClick={close}>{L('ঠিক আছে', 'OK')}</button>
          </div>
        ) : !user ? (
          <div className="py-4 text-center">
            <p className="text-ink">{L('রিপোর্ট করতে লগইন করুন।', 'Please log in to report.')}</p>
            <Link href="/login" className="btn-primary mt-4 inline-flex">{L('লগইন', 'Log in')}</Link>
          </div>
        ) : (
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-ink"><Flag className="h-5 w-5 text-red-500" />{L('প্রশ্নে ভুল রিপোর্ট করুন', 'Report this question')}</h3>
            {code && <p className="mt-0.5 text-xs text-ink-soft">{code}</p>}
            <div className="mt-3 space-y-2">
              {REASONS.map(([v, bn, en]) => (
                <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${reason === v ? 'border-red-300 bg-red-50 text-red-700' : 'border-brand-100'}`}>
                  <input type="radio" name="reason" className="accent-red-500" checked={reason === v} onChange={() => setReason(v)} />{L(bn, en)}
                </label>
              ))}
            </div>
            <textarea className="input mt-3 min-h-[84px]" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={L('কী ভুল আছে লিখুন (ঐচ্ছিক) — যেমন: সঠিক উত্তর হবে "গ"', 'Describe the problem (optional)')} />
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" onClick={close}>{L('বাতিল', 'Cancel')}</button>
              <button className="btn-primary" disabled={state === 'busy'} onClick={send}>{state === 'busy' ? L('পাঠানো হচ্ছে…', 'Sending…') : L('রিপোর্ট পাঠান', 'Send report')}</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
