'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { PageHeader, Spinner } from '@/components/ui';
import { useL } from '../AdminShell';

type S = {
  price_lifetime: number; price_single_test: number; default_negative_mark: number; default_duration_minutes: number;
  payment_gateways: { bkash: boolean; nagad: boolean; sslcommerz: boolean }; support_phone: string;
  manual_payment: { enabled: boolean; bkash: string; nagad: string; account_type: string };
};

export default function SettingsAdmin() {
  const L = useL();
  const sb = supabaseBrowser();
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sb.from('app_settings').select('key, value').then(({ data }) => {
      const m = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
      setS({
        price_lifetime: Number(m.price_lifetime ?? 799), price_single_test: Number(m.price_single_test ?? 99),
        default_negative_mark: Number(m.default_negative_mark ?? 0.25), default_duration_minutes: Number(m.default_duration_minutes ?? 50),
        payment_gateways: { bkash: false, nagad: false, sslcommerz: false, ...(m.payment_gateways as object) },
        support_phone: String(m.support_phone ?? ''),
        manual_payment: { enabled: true, bkash: '', nagad: '', account_type: 'Personal', ...(m.manual_payment as object) },
      });
    });
  }, [sb]);

  async function save() {
    if (!s) return;
    if (s.price_lifetime < 0 || s.price_single_test < 0 || s.default_negative_mark < 0) { setMsg({ ok: false, text: L('ঋণাত্মক মান দেওয়া যাবে না', 'Values cannot be negative') }); return; }
    setBusy(true); setMsg(null);
    const rows = Object.entries(s).map(([key, value]) => ({ key, value, is_public: true, updated_at: new Date().toISOString() }));
    const { error } = await sb.from('app_settings').upsert(rows, { onConflict: 'key' });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: L('সংরক্ষিত হয়েছে', 'Saved') });
  }

  if (!s) return <Spinner />;
  const num = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });

  return (
    <div className="max-w-2xl space-y-4">
      <PageHeader title={L('সেটিংস ও মূল্য', 'Settings & prices')} />
      <section className="card grid gap-3 p-5 sm:grid-cols-2">
        <div><label className="label">{L('আজীবন প্রিমিয়াম মূল্য (৳)', 'Lifetime Premium price (৳)')}</label><input className="input" type="number" min={0} value={s.price_lifetime} onChange={num('price_lifetime')} /></div>
        <div><label className="label">{L('একটি মক টেস্টের ডিফল্ট মূল্য (৳)', 'Default single mock test price (৳)')}</label><input className="input" type="number" min={0} value={s.price_single_test} onChange={num('price_single_test')} /></div>
        <div><label className="label">{L('ডিফল্ট নেগেটিভ মার্ক (প্র্যাকটিস/বিগত)', 'Default negative mark (practice/PYQ)')}</label><input className="input" type="number" step="0.05" min={0} value={s.default_negative_mark} onChange={num('default_negative_mark')} /></div>
        <div><label className="label">{L('ডিফল্ট সময় (মিনিট)', 'Default duration (minutes)')}</label><input className="input" type="number" min={1} value={s.default_duration_minutes} onChange={num('default_duration_minutes')} /></div>
        <div className="sm:col-span-2"><label className="label">{L('সাপোর্ট ফোন', 'Support phone')}</label><input className="input" value={s.support_phone} onChange={(e) => setS({ ...s, support_phone: e.target.value })} /></div>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-ink">{L('bKash / Nagad Send Money (হাতে যাচাই)', 'bKash / Nagad Send Money (manual verification)')}</h2>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-mint-600" checked={s.manual_payment.enabled}
            onChange={(e) => setS({ ...s, manual_payment: { ...s.manual_payment, enabled: e.target.checked } })} />
          {L('Send Money পেমেন্ট চালু', 'Enable Send Money payments')}
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">{L('bKash নম্বর', 'bKash number')}</label><input className="input" inputMode="tel" placeholder="01XXXXXXXXX" value={s.manual_payment.bkash} onChange={(e) => setS({ ...s, manual_payment: { ...s.manual_payment, bkash: e.target.value.trim() } })} /></div>
          <div><label className="label">{L('Nagad নম্বর', 'Nagad number')}</label><input className="input" inputMode="tel" placeholder="01XXXXXXXXX" value={s.manual_payment.nagad} onChange={(e) => setS({ ...s, manual_payment: { ...s.manual_payment, nagad: e.target.value.trim() } })} /></div>
          <div><label className="label">{L('অ্যাকাউন্টের ধরন', 'Account type')}</label>
            <select className="input" value={s.manual_payment.account_type} onChange={(e) => setS({ ...s, manual_payment: { ...s.manual_payment, account_type: e.target.value } })}>
              <option>Personal</option><option>Agent</option><option>Merchant</option>
            </select></div>
        </div>
        <p className="rounded-xl bg-brand-50 p-3 text-xs text-ink-soft">{L('নম্বর খালি রাখলে সেই মাধ্যমটি শিক্ষার্থীরা দেখবে না। জমা পড়া পেমেন্ট "পেমেন্ট" পাতায় অনুমোদন দিন।', 'Leave a number empty to hide that method. Approve submitted payments on the Payments page.')}</p>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-ink">{L('অনলাইন পেমেন্ট গেটওয়ে (মার্চেন্ট অ্যাকাউন্ট লাগবে)', 'Online payment gateways (merchant account required)')}</h2>
        {(['bkash', 'nagad', 'sslcommerz'] as const).map((g) => (
          <label key={g} className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-mint-600" checked={s.payment_gateways[g]}
              onChange={(e) => setS({ ...s, payment_gateways: { ...s.payment_gateways, [g]: e.target.checked } })} />
            {{ bkash: 'bKash', nagad: 'Nagad', sslcommerz: 'SSLCommerz (Card / Bank / Mobile banking)' }[g]}
          </label>
        ))}
        <p className="rounded-xl bg-brand-50 p-3 text-xs text-ink-soft">
          {L('নিরাপত্তার জন্য গেটওয়ের গোপন key/password ডাটাবেসে নয়, Vercel-এর Environment Variables-এ রাখা হয় (BKASH_*, NAGAD_*, SSLCZ_*, PAYMENT_MODE=sandbox/live)। এখানে শুধু কোন গেটওয়ে চালু থাকবে তা ঠিক করুন।',
            'For security, gateway secrets live in Vercel Environment Variables (BKASH_*, NAGAD_*, SSLCZ_*, PAYMENT_MODE=sandbox/live), not in the database. Here you choose which gateways are switched on.')}
        </p>
      </section>
      {msg && <p className={`rounded-xl p-3 text-sm ${msg.ok ? 'bg-mint-50 text-mint-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
      <button className="btn-primary" disabled={busy} onClick={save}>{busy ? '…' : L('সংরক্ষণ', 'Save')}</button>
    </div>
  );
}
