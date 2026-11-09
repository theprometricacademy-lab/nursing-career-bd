'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Crown, Ticket, ShieldCheck } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Spinner } from '@/components/ui';
import { SendMoneyBox, type ManualCfg } from '@/components/SendMoneyBox';

type Gateways = { bkash?: boolean; nagad?: boolean; sslcommerz?: boolean };
type Quote = { base: number; discount: number; amount: number; coupon_valid: boolean };
const GW_LABEL: Record<string, string> = { bkash: 'bKash', nagad: 'Nagad', sslcommerz: 'Card / Bank (SSLCommerz)' };
const GW_STYLE: Record<string, string> = {
  bkash: 'bg-[#e2136e] text-white hover:opacity-90', nagad: 'bg-[#f6921e] text-white hover:opacity-90', sslcommerz: 'bg-brand-700 text-white hover:bg-brand-800',
};

export default function PremiumPage() {
  return <Suspense><PremiumView /></Suspense>;
}

function PremiumView() {
  const { t, num, premium, user, pick, lang } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const testId = params.get('test') ? Number(params.get('test')) : null;
  const [prices, setPrices] = useState<{ lifetime: number; single: number } | null>(null);
  const [gateways, setGateways] = useState<Gateways>({});
  const [manual, setManual] = useState<ManualCfg | null>(null);
  const [test, setTest] = useState<{ id: number; title_en: string; title_bn: string; price: number | null } | null>(null);
  const [plan, setPlan] = useState<'lifetime' | 'single_test'>(testId ? 'single_test' : 'lifetime');
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.from('app_settings').select('key, value').in('key', ['price_lifetime', 'price_single_test', 'payment_gateways', 'manual_payment']).then(({ data }) => {
      const m = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
      setPrices({ lifetime: Number(m.price_lifetime ?? 799), single: Number(m.price_single_test ?? 99) });
      setGateways((m.payment_gateways as Gateways) ?? {});
      setManual((m.manual_payment as ManualCfg) ?? null);
    });
    if (testId) {
      sb.from('mock_tests').select('id, title_en, title_bn, price').eq('id', testId).eq('is_premium', true).maybeSingle()
        .then(({ data }) => setTest(data));
    }
  }, [testId]);

  const basePrice = plan === 'lifetime' ? prices?.lifetime : (test?.price ?? prices?.single);
  const payable = quote?.coupon_valid ? quote.amount : basePrice;

  async function applyCoupon() {
    setCouponMsg(null);
    const { data, error } = await supabaseBrowser().rpc('quote_price', { p_plan: plan, p_test: plan === 'single_test' ? testId : null, p_coupon: coupon.trim() });
    if (error) { setCouponMsg({ ok: false, text: error.message }); return; }
    setQuote(data as Quote);
    setCouponMsg((data as Quote).coupon_valid ? { ok: true, text: t('couponOk') } : { ok: false, text: t('couponBad') });
  }

  async function pay(gateway: string) {
    if (!user) { router.push(`/login?next=${encodeURIComponent('/premium' + (testId ? `?test=${testId}` : ''))}`); return; }
    setBusy(gateway); setErr('');
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, testId: plan === 'single_test' ? testId : null, coupon: quote?.coupon_valid ? coupon.trim() : null, gateway }),
      });
      const j = await res.json().catch(() => ({} as Record<string, string>));
      if (!res.ok || !j) throw new Error(j?.error || (lang === 'bn'
        ? 'অনলাইন পেমেন্ট এখন চালু নেই। উপরের bKash/Nagad Send Money ব্যবহার করুন।'
        : 'Online payment is not available right now. Please use bKash/Nagad Send Money above.'));
      if (j.free) { router.push(`/payment/result?status=success&id=${j.paymentId}`); return; }
      window.location.href = j.url;
    } catch (e) {
      setErr((e as Error).message); setBusy(null);
    }
  }

  if (!prices) return <Spinner />;
  const enabled = (Object.keys(GW_LABEL) as (keyof Gateways)[]).filter((g) => gateways[g]);
  const features = ['pf1', 'pf2', 'pf3', 'pf4', 'pf5', 'pf6'] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t('premiumTitle')} sub={t('premiumSub')} />
      {premium && plan === 'lifetime' && <p className="rounded-xl bg-mint-50 p-4 font-semibold text-mint-700">{t('alreadyPremium')}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        <button onClick={() => { setPlan('lifetime'); setQuote(null); setCouponMsg(null); }}
          className={`card relative overflow-hidden p-5 text-left transition ${plan === 'lifetime' ? 'border-blush-400 ring-2 ring-blush-200' : ''}`}>
          <span className="absolute right-3 top-3 chip bg-blush-600 text-white">{lang === 'bn' ? 'সেরা মূল্য' : 'Best value'}</span>
          <Crown className="h-7 w-7 text-blush-600" />
          <h3 className="mt-2 font-bold text-ink">{t('lifetime')}</h3>
          <div className="mt-1 text-3xl font-bold text-ink">৳{num(prices.lifetime)}</div>
          <div className="text-xs text-ink-soft">{t('oneTime')}</div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {features.map((f) => <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-mint-600" />{t(f)}</li>)}
          </ul>
        </button>
        {test && (
          <button onClick={() => { setPlan('single_test'); setQuote(null); setCouponMsg(null); }}
            className={`card p-5 text-left transition ${plan === 'single_test' ? 'border-brand-400 ring-2 ring-brand-200' : ''}`}>
            <h3 className="font-bold text-ink">{t('singleTest')}</h3>
            <p className="text-sm text-ink-soft">{pick(test, 'title')}</p>
            <div className="mt-2 text-3xl font-bold text-ink">৳{num(test.price ?? prices.single)}</div>
            <div className="text-xs text-ink-soft">{t('oneTime')}</div>
          </button>
        )}
      </div>

      <section className="card space-y-4 p-5">
        <div>
          <label className="label">{t('coupon')}</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Ticket className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-soft" />
              <input className="input pl-9 uppercase" value={coupon} onChange={(e) => { setCoupon(e.target.value); setQuote(null); setCouponMsg(null); }} />
            </div>
            <button className="btn-ghost" onClick={applyCoupon} disabled={!coupon.trim()}>{t('apply')}</button>
          </div>
          {couponMsg && <p className={`mt-1 text-sm ${couponMsg.ok ? 'text-mint-700' : 'text-red-600'}`}>{couponMsg.text}</p>}
        </div>

        <div className="flex items-end justify-between border-t border-brand-100 pt-4">
          <span className="text-sm text-ink-soft">{lang === 'bn' ? 'মোট পরিশোধ' : 'Total payable'}</span>
          <span className="text-right">
            {quote?.coupon_valid && <span className="mr-2 text-sm text-ink-soft line-through">৳{num(basePrice ?? 0)}</span>}
            <span className="text-2xl font-bold text-ink">৳{num(payable ?? 0)}</span>
          </span>
        </div>

        {!(premium && plan === 'lifetime') && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink">{t('payWith')}</p>
            {manual && <SendMoneyBox cfg={manual} plan={plan} testId={plan === 'single_test' ? testId : null} coupon={quote?.coupon_valid ? coupon.trim() : null} amount={Number(payable ?? 0)} />}
            {enabled.length === 0 && !(manual?.enabled && (manual.bkash || manual.nagad)) && <p className="text-sm text-ink-soft">{lang === 'bn' ? 'এই মুহূর্তে অনলাইন পেমেন্ট বন্ধ আছে।' : 'Online payment is currently unavailable.'}</p>}
            <div className="grid gap-2 sm:grid-cols-3">
              {enabled.map((g) => (
                <button key={g} className={`btn ${GW_STYLE[g]}`} disabled={!!busy} onClick={() => pay(g)}>
                  {busy === g ? t('loading') : GW_LABEL[g]}
                </button>
              ))}
            </div>
            {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
            <p className="flex items-center gap-1.5 text-xs text-ink-soft"><ShieldCheck className="h-4 w-4 text-mint-600" />
              {lang === 'bn' ? 'পেমেন্ট গেটওয়ের সার্ভার থেকে যাচাইয়ের পরই প্রিমিয়াম চালু হয়।' : 'Premium activates only after the payment is verified with the gateway server.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
