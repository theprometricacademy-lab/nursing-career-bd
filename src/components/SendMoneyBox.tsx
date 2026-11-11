'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Smartphone, Clock } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';

export type ManualCfg = { enabled: boolean; bkash: string; nagad: string; account_type?: string; auto_approve?: boolean; bkash_type?: 'personal' | 'merchant'; nagad_type?: 'personal' | 'merchant' };

const ERR: Record<string, [string, string]> = {
  bad_trx: ['সঠিক TrxID দিন (৮–১২ অক্ষরের ইংরেজি অক্ষর ও সংখ্যা)।', 'Enter a valid TrxID (8–12 letters and digits).'],
  bad_sender: ['যে নম্বর থেকে টাকা পাঠিয়েছেন সেটি সঠিকভাবে দিন (01XXXXXXXXX)।', 'Enter the number you sent from (01XXXXXXXXX).'],
  trx_used: ['এই TrxID আগেই জমা দেওয়া হয়েছে।', 'This TrxID has already been submitted.'],
  too_many_pending: ['আপনার ৩টি পেমেন্ট যাচাইয়ের অপেক্ষায় আছে। অনুমোদন হওয়া পর্যন্ত অপেক্ষা করুন।', 'You already have 3 payments awaiting verification.'],
  already_premium: ['আপনার প্রিমিয়াম আগেই চালু আছে।', 'You already have Premium.'],
  already_owned: ['এই টেস্টটি আপনি আগেই কিনেছেন।', 'You already own this test.'],
  manual_disabled: ['এই মুহূর্তে Send Money পেমেন্ট বন্ধ আছে।', 'Send Money payments are currently disabled.'],
  bad_method: ['এই মাধ্যমটি এখন চালু নেই।', 'This method is not available.'],
  rate_limited: ['অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন।', 'Too many attempts, please try later.'],
};

type Pending = { id: string; amount: number; gateway_txn_id: string; created_at: string; status: string };

export function SendMoneyBox({ cfg, plan, testId, coupon, amount }: {
  cfg: ManualCfg; plan: 'lifetime' | 'single_test'; testId: number | null; coupon: string | null; amount: number;
}) {
  const { lang, num, user } = useApp();
  const bn = lang === 'bn';
  const methods = (['bkash', 'nagad'] as const).filter((m) => cfg[m]);
  const [method, setMethod] = useState<'bkash' | 'nagad'>(methods[0] ?? 'bkash');
  const [sender, setSender] = useState('');
  const [trx, setTrx] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);

  const loadPending = () => {
    if (!user) return;
    supabaseBrowser().from('payments').select('id, amount, gateway_txn_id, created_at, status')
      .eq('user_id', user.id).eq('gateway', 'manual').order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setPending((data as Pending[]) ?? []));
  };
  useEffect(loadPending, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cfg.enabled || methods.length === 0) return null;
  const number = cfg[method];
  const label = method === 'bkash' ? 'bKash' : 'Nagad';
  const color = method === 'bkash' ? 'bg-[#e2136e]' : 'bg-[#f6921e]';
  // a merchant number takes the app's "Payment" option; a personal number takes "Send Money"
  const merchant = (method === 'bkash' ? cfg.bkash_type : cfg.nagad_type) === 'merchant';
  const action = merchant ? 'Payment' : 'Send Money';
  const anyMerchant = methods.some((m) => cfg[`${m}_type` as 'bkash_type' | 'nagad_type'] === 'merchant');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { window.location.href = '/login?next=/premium'; return; }
    setBusy(true); setMsg(null);
    const { error } = await supabaseBrowser().rpc('submit_manual_payment', {
      p_plan: plan, p_test: testId, p_coupon: coupon, p_method: method, p_sender: sender, p_trx: trx,
    });
    setBusy(false);
    if (error) {
      const code = Object.keys(ERR).find((k) => error.message.includes(k));
      setMsg({ ok: false, text: code ? ERR[code][bn ? 0 : 1] : error.message });
      return;
    }
    setTrx(''); setSender('');
    setMsg({ ok: true, text: cfg.auto_approve
      ? (bn ? 'জমা হয়েছে! ১ মিনিটের মধ্যে আপনার প্রিমিয়াম চালু হবে।' : 'Submitted! Your Premium will be activated within 1 minute.')
      : (bn ? 'জমা হয়েছে! আমরা পেমেন্টটি মিলিয়ে দেখে আপনার প্রিমিয়াম চালু করে দেব। নিচে অবস্থা দেখতে পাবেন।' : 'Submitted! We will verify the payment and activate your Premium. You can see its status below.') });
    loadPending();
  }

  const statusText = (s: string) => ({
    pending: bn ? 'যাচাই চলছে' : 'Verifying', paid: bn ? 'অনুমোদিত' : 'Approved', failed: bn ? 'বাতিল' : 'Rejected',
  }[s] ?? s);

  return (
    <div className="space-y-3 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink"><Smartphone className="h-4 w-4 text-brand-600" />
        {anyMerchant ? (bn ? 'bKash / Nagad দিয়ে পেমেন্ট' : 'Pay with bKash / Nagad') : (bn ? 'bKash / Nagad Send Money দিয়ে পেমেন্ট' : 'Pay by bKash / Nagad Send Money')}</p>

      {methods.length > 1 && (
        <div className="grid grid-cols-2 gap-2">
          {methods.map((m) => (
            <button key={m} type="button" onClick={() => setMethod(m)}
              className={`btn ${method === m ? (m === 'bkash' ? 'bg-[#e2136e] text-white' : 'bg-[#f6921e] text-white') : 'border border-brand-200 bg-white text-ink'}`}>
              {m === 'bkash' ? 'bKash' : 'Nagad'}
            </button>
          ))}
        </div>
      )}

      <ol className="space-y-2 text-sm text-ink">
        <li>১. {merchant
            ? (bn ? `${label} অ্যাপে "Payment" অপশনে গিয়ে এই মার্চেন্ট নম্বরে পেমেন্ট করুন:` : `Open ${label}, choose "Payment" and pay this merchant number:`)
            : (bn ? `${label} অ্যাপ থেকে "Send Money" করুন এই নম্বরে:` : `Open ${label} and "Send Money" to:`)}
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded-lg ${color} px-3 py-1.5 font-mono text-base font-bold tracking-wider text-white`}>{number}</span>
            <button type="button" className="btn-ghost !px-2 !py-1.5 text-xs" onClick={() => { navigator.clipboard?.writeText(number); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? (bn ? 'কপি হয়েছে' : 'Copied') : (bn ? 'কপি' : 'Copy')}
            </button>
          </div>
          <span className="text-xs text-ink-soft">{merchant
            ? (bn ? `(মার্চেন্ট অ্যাকাউন্ট — "Send Money" নয়, "${action}" অপশন ব্যবহার করুন। Reference-এ আপনার মোবাইল নম্বর লিখতে পারেন।)` : `(Merchant account — use "${action}", not "Send Money". You may put your mobile number as reference.)`)
            : (bn ? '(পার্সোনাল নম্বর — "Send Money" করুন)' : '(Personal number — use "Send Money")')}</span>
        </li>
        <li>২. {bn ? 'টাকার পরিমাণ:' : 'Amount:'} <b className="text-lg">৳{num(amount)}</b></li>
        <li>৩. {bn ? 'টাকা পাঠানোর পর মেসেজে আসা Transaction ID (TrxID) নিচে লিখুন।' : 'Enter the Transaction ID (TrxID) from the confirmation message below.'}</li>
      </ol>
      <p className="flex items-center gap-2 rounded-xl bg-mint-50 p-2.5 text-sm font-semibold text-mint-700">
        <Clock className="h-4 w-4 shrink-0" />{cfg.auto_approve
          ? (bn ? 'TrxID জমা দেওয়ার ১ মিনিটের মধ্যে প্রিমিয়াম চালু হবে।' : 'Premium is activated within 1 minute of submitting your TrxID.')
          : (bn ? 'TrxID জমা দেওয়ার পর আমরা পেমেন্ট মিলিয়ে দেখে প্রিমিয়াম চালু করে দেব।' : 'After you submit the TrxID, we verify the payment and activate your Premium.')}
      </p>

      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
        <input className="input" required inputMode="tel" placeholder={bn ? 'যে নম্বর থেকে পাঠিয়েছেন' : 'Number you sent from'} value={sender} onChange={(e) => setSender(e.target.value)} />
        <input className="input font-mono uppercase" required placeholder="TrxID (e.g. 9A7B6C5D4E)" value={trx} onChange={(e) => setTrx(e.target.value)} />
        <button className="btn-success sm:col-span-2" disabled={busy}>{busy ? '…' : (bn ? 'পেমেন্ট জমা দিন' : 'Submit payment')}</button>
      </form>
      {!user && <p className="text-xs text-ink-soft">{bn ? 'জমা দিতে আগে ' : 'Please '}<Link className="font-semibold text-brand-700 underline" href="/login?next=/premium">{bn ? 'লগইন করুন' : 'log in'}</Link>{bn ? '।' : ' first.'}</p>}
      {msg && <p className={`rounded-xl p-3 text-sm ${msg.ok ? 'bg-mint-50 text-mint-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      {pending.length > 0 && (
        <div className="rounded-xl bg-white p-3">
          <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-ink-soft"><Clock className="h-3.5 w-3.5" />{bn ? 'আপনার জমা দেওয়া পেমেন্ট' : 'Your submitted payments'}</p>
          <ul className="space-y-1 text-xs">
            {pending.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span className="font-mono">{p.gateway_txn_id} · ৳{num(p.amount)}</span>
                <span className={p.status === 'paid' ? 'text-mint-700' : p.status === 'failed' ? 'text-red-600' : 'text-brand-700'}>{statusText(p.status)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
