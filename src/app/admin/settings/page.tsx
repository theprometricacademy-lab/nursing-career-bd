'use client';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { PageHeader, Spinner } from '@/components/ui';
import { useL } from '../AdminShell';

type S = {
  price_lifetime: number; price_single_test: number; default_negative_mark: number; default_duration_minutes: number;
  payment_gateways: { bkash: boolean; nagad: boolean; sslcommerz: boolean }; support_phone: string;
  manual_payment: { enabled: boolean; bkash: string; nagad: string; account_type: string; auto_approve?: boolean; bkash_type?: string; nagad_type?: string };
  winter_offer: { enabled: boolean; price: number; limit: number };
};

export default function SettingsAdmin() {
  const L = useL();
  const sb = supabaseBrowser();
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    sb.from('app_settings').select('key, value').then(({ data }) => {
      const m = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
      setS({
        price_lifetime: Number(m.price_lifetime ?? 799), price_single_test: Number(m.price_single_test ?? 99),
        default_negative_mark: Number(m.default_negative_mark ?? 0.25), default_duration_minutes: Number(m.default_duration_minutes ?? 50),
        payment_gateways: { bkash: false, nagad: false, sslcommerz: false, ...(m.payment_gateways as object) },
        support_phone: String(m.support_phone ?? ''),
        manual_payment: { enabled: true, bkash: '', nagad: '', account_type: 'Personal', ...(m.manual_payment as object) },
        winter_offer: { enabled: false, price: 399, limit: 100, ...(m.winter_offer as object) },
      });
    });
    sb.rpc('winter_offer_status').then(({ data }) => setUsed((data as { used?: number } | null)?.used ?? 0));
  }, [sb]);

  async function save() {
    if (!s) return;
    if (s.price_lifetime < 0 || s.price_single_test < 0 || s.default_negative_mark < 0) { setMsg({ ok: false, text: L('ঋণাত্মক মান দেওয়া যাবে না', 'Values cannot be negative') }); return; }
    if (s.winter_offer.enabled && (s.winter_offer.price <= 0 || s.winter_offer.price >= s.price_lifetime || s.winter_offer.limit < 1)) { setMsg({ ok: false, text: L('অফার মূল্য ০-এর বেশি আর আসল দামের কম হতে হবে, সংখ্যা অন্তত ১', 'Offer price must be above 0 and below the full price; limit at least 1') }); return; }
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
        <h2 className="font-semibold text-ink">{L('শীতকালীন অফার (আজীবন প্রিমিয়াম)', 'Winter offer (lifetime premium)')}</h2>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" checked={s.winter_offer.enabled} onChange={(e) => setS({ ...s, winter_offer: { ...s.winter_offer, enabled: e.target.checked } })} />
          {L('অফার চালু', 'Offer on')}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">{L('অফার মূল্য (৳)', 'Offer price (৳)')}</label><input className="input" type="number" min={1} value={s.winter_offer.price} onChange={(e) => setS({ ...s, winter_offer: { ...s.winter_offer, price: Number(e.target.value) } })} /></div>
          <div><label className="label">{L('প্রথম কতজন পাবেন', 'For the first … buyers')}</label><input className="input" type="number" min={1} value={s.winter_offer.limit} onChange={(e) => setS({ ...s, winter_offer: { ...s.winter_offer, limit: Number(e.target.value) } })} /></div>
        </div>
        <p className="text-xs text-ink-soft">
          {L(`আসল দাম ৳${s.price_lifetime} · ছাড় ৳${Math.max(0, s.price_lifetime - s.winter_offer.price)}`, `Full price ৳${s.price_lifetime} · saving ৳${Math.max(0, s.price_lifetime - s.winter_offer.price)}`)}
          {used !== null && L(` · এ পর্যন্ত অফারে কিনেছেন ${used} জন, বাকি ${Math.max(0, s.winter_offer.limit - used)} জন`, ` · sold at offer so far: ${used}, left: ${Math.max(0, s.winter_offer.limit - used)}`)}
        </p>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-ink">{L('bKash / Nagad — নম্বরে টাকা পাঠিয়ে TrxID জমা', 'bKash / Nagad — pay to number + TrxID')}</h2>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-mint-600" checked={s.manual_payment.enabled}
            onChange={(e) => setS({ ...s, manual_payment: { ...s.manual_payment, enabled: e.target.checked } })} />
          {L('এই পেমেন্ট চালু', 'Enable these payments')}
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-mint-600" checked={!!s.manual_payment.auto_approve}
            onChange={(e) => setS({ ...s, manual_payment: { ...s.manual_payment, auto_approve: e.target.checked } })} />
          {L('TrxID দিলেই প্রিমিয়াম স্বয়ংক্রিয়ভাবে চালু (বন্ধ থাকলে "পেমেন্ট" পাতায় আপনি অনুমোদন দিলে চালু হবে)', 'Activate Premium automatically on TrxID (off = you approve on the Payments page)')}
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label">{L('bKash নম্বর', 'bKash number')}</label><input className="input" inputMode="tel" placeholder="01XXXXXXXXX" value={s.manual_payment.bkash} onChange={(e) => setS({ ...s, manual_payment: { ...s.manual_payment, bkash: e.target.value.trim() } })} /></div>
          <div><label className="label">{L('Nagad নম্বর', 'Nagad number')}</label><input className="input" inputMode="tel" placeholder="01XXXXXXXXX" value={s.manual_payment.nagad} onChange={(e) => setS({ ...s, manual_payment: { ...s.manual_payment, nagad: e.target.value.trim() } })} /></div>
          <div><label className="label">{L('অ্যাকাউন্টের ধরন', 'Account type')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['bkash', 'nagad'] as const).map((m) => (
                <select key={m} className="input" title={m === 'bkash' ? 'bKash' : 'Nagad'} value={s.manual_payment[`${m}_type` as 'bkash_type' | 'nagad_type'] ?? 'personal'}
                  onChange={(e) => setS({ ...s, manual_payment: { ...s.manual_payment, [`${m}_type`]: e.target.value } })}>
                  <option value="personal">{m === 'bkash' ? 'bKash' : 'Nagad'}: Personal</option>
                  <option value="merchant">{m === 'bkash' ? 'bKash' : 'Nagad'}: Merchant</option>
                </select>
              ))}
            </div></div>
        </div>
        <p className="rounded-xl bg-brand-50 p-3 text-xs text-ink-soft">{L('Merchant দিলে শিক্ষার্থীকে অ্যাপের "Payment" অপশন, Personal দিলে "Send Money" করতে বলা হবে। নম্বর খালি রাখলে সেই মাধ্যমটি দেখাবে না। জমা পড়া পেমেন্ট "পেমেন্ট" পাতায় মিলিয়ে নিন।', 'Merchant tells students to use the app\'s "Payment" option, Personal tells them to "Send Money". Leave a number empty to hide that method. Check submitted payments on the Payments page.')}</p>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-ink">{L('অনলাইন পেমেন্ট গেটওয়ে (মার্চেন্ট অ্যাকাউন্ট লাগবে)', 'Online payment gateways (merchant account required)')}</h2>
        <p className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">{L('⚠️ উপরের নম্বরে-পাঠানো পেমেন্টের জন্য এগুলো চালু করবেন না। bKash/Nagad মার্চেন্ট অ্যাকাউন্টের key Cloudflare-এ বসানোর পরেই শুধু চালু করবেন — নইলে শিক্ষার্থীরা পেমেন্টে ত্রুটি দেখবে।', '⚠️ Do not switch these on for Send Money. Only enable after bKash/Nagad merchant keys are added in Cloudflare — otherwise students see an error.')}</p>
        {(['bkash', 'nagad', 'sslcommerz'] as const).map((g) => (
          <label key={g} className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-mint-600" checked={s.payment_gateways[g]}
              onChange={(e) => setS({ ...s, payment_gateways: { ...s.payment_gateways, [g]: e.target.checked } })} />
            {{ bkash: 'bKash', nagad: 'Nagad', sslcommerz: 'SSLCommerz (Card / Bank / Mobile banking)' }[g]}
          </label>
        ))}
        <p className="rounded-xl bg-brand-50 p-3 text-xs text-ink-soft">
          {L('নিরাপত্তার জন্য গেটওয়ের গোপন key/password ডাটাবেসে নয়, Cloudflare Worker-এর Secrets-এ রাখা হয় (BKASH_*, NAGAD_*, SSLCZ_*, PAYMENT_MODE=sandbox/live)। এখানে শুধু কোন গেটওয়ে চালু থাকবে তা ঠিক করুন।',
            'For security, gateway secrets live in Cloudflare Worker secrets (BKASH_*, NAGAD_*, SSLCZ_*, PAYMENT_MODE=sandbox/live), not in the database. Here you choose which gateways are switched on.')}
        </p>
      </section>
      {msg && <p className={`rounded-xl p-3 text-sm ${msg.ok ? 'bg-mint-50 text-mint-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
      <button className="btn-primary" disabled={busy} onClick={save}>{busy ? '…' : L('সংরক্ষণ', 'Save')}</button>
    </div>
  );
}
