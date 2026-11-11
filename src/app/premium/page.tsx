'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Crown, Ticket, ShieldCheck, Snowflake, Gift, Copy } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Spinner } from '@/components/ui';
import { SendMoneyBox, type ManualCfg } from '@/components/SendMoneyBox';
import { ReviewForm, ReviewList } from '@/components/Reviews';

type Gateways = { bkash?: boolean; nagad?: boolean; sslcommerz?: boolean };
type Quote = { base: number; discount: number; amount: number; coupon_valid: boolean; offer: 'winter' | 'referral' | null };
type Winter = { active: boolean; price: number; limit: number; left: number };

/** Each user's referral code: a friend who enters it gets ৳50 off the full price. */
function ReferralCard() {
  const { user, lang, num } = useApp();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabaseBrowser().from('profiles').select('referral_code').eq('id', user.id).maybeSingle()
      .then(({ data }) => setCode((data as { referral_code: string | null } | null)?.referral_code ?? null));
  }, [user]);
  if (!user || !code) return null;
  const bn = lang === 'bn';
  const link = `https://nursingcareerbd.com/premium?coupon=${code}`;
  const share = () => {
    const text = bn ? `Nursing Career BD-তে প্রিমিয়াম নিতে আমার রেফারেল কোড ${code} দিন, ৳${num(50)} ছাড় পাবেন: ${link}` : `Use my referral code ${code} on Nursing Career BD for ৳50 off: ${link}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  };
  return (
    <section className="card flex flex-wrap items-center gap-3 p-4">
      <Gift className="h-6 w-6 shrink-0 text-mint-600" />
      <div className="min-w-0 flex-1 text-sm">
        <b className="text-ink">{bn ? 'বন্ধুকে রেফার করুন' : 'Refer a friend'}</b>
        <span className="block text-ink-soft">{bn ? `আপনার কোড দিলে বন্ধু ৳${num(50)} ছাড় পাবে।` : 'Your friend gets ৳50 off with your code.'} <span className="font-mono font-bold tracking-wider text-mint-700">{code}</span></span>
      </div>
      <button className="btn-ghost !py-2" onClick={share}><Copy className="h-4 w-4" />{copied ? (bn ? 'কপি হয়েছে' : 'Copied') : (bn ? 'শেয়ার করুন' : 'Share')}</button>
    </section>
  );
}
const GW_LABEL: Record<string, string> = { bkash: 'bKash', nagad: 'Nagad', sslcommerz: 'Card / Bank (SSLCommerz)' };
const GW_STYLE: Record<string, string> = {
  bkash: 'bg-[#e2136e] text-white hover:opacity-90', nagad: 'bg-[#f6921e] text-white hover:opacity-90', sslcommerz: 'bg-brand-700 text-white hover:bg-brand-800',
};

function MemberCard() {
  const { user, profile, lang } = useApp();
  const [since, setSince] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabaseBrowser().from('subscriptions').select('starts_at').eq('user_id', user.id).eq('plan', 'lifetime').eq('status', 'active')
      .order('starts_at', { ascending: true }).limit(1).then(({ data }) => setSince(data?.[0]?.starts_at ?? null));
  }, [user]);
  const bn = lang === 'bn';
  const perks = bn
    ? ['১০,০০০+ প্রশ্ন ও ব্যাখ্যা', 'সব মডেল টেস্ট', 'বিষয়ভিত্তিক ফলাফল বিশ্লেষণ', 'ভুল উত্তর অনুশীলন', 'নতুন প্রশ্ন ও টেস্ট — আজীবন']
    : ['10,000+ questions & explanations', 'All mock tests', 'Subject-wise analysis', 'Wrong-answer practice', 'New questions & tests — for life'];
  return (
    <div className="space-y-3">
      <div className="gold-card p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gold-400/25 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-[.2em] text-gold-200">Nursing Career BD</div>
            <div className="mt-1 text-2xl font-extrabold gold-text">{bn ? 'লাইফটাইম প্রিমিয়াম' : 'Lifetime Premium'}</div>
          </div>
          <Crown className="h-9 w-9 text-gold-300" />
        </div>
        <div className="relative mt-8 flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-white/60">{bn ? 'সদস্য' : 'Member'}</div>
            <div className="text-lg font-bold">{profile?.full_name || user?.email}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/60">{bn ? 'সদস্য হয়েছেন' : 'Member since'}</div>
            <div className="font-semibold">{since ? new Date(since).toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div>
          </div>
        </div>
        <div className="relative mt-4 font-mono text-xs tracking-widest text-gold-200/80">ID · {(user?.id || '').slice(0, 8).toUpperCase()}</div>
      </div>
      <div className="card p-4">
        <div className="mb-2 font-semibold text-ink">{bn ? 'আপনার জন্য খোলা' : 'Unlocked for you'}</div>
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
          {perks.map((p) => <li key={p} className="flex items-center gap-2"><Check className="h-4 w-4 text-gold-500" />{p}</li>)}
        </ul>
        <p className="mt-3 text-xs text-ink-soft">{bn ? 'নিরাপত্তার জন্য প্রিমিয়াম একসাথে একটি ডিভাইসেই চলে।' : 'For security, Premium works on one device at a time.'}</p>
      </div>
    </div>
  );
}

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
  const [coupon, setCoupon] = useState(() => (params.get('coupon') ?? '').toUpperCase());
  const [quote, setQuote] = useState<Quote | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [offer, setOffer] = useState<{ code: string; discount_type: string; value: number } | null>(null);
  const [winter, setWinter] = useState<Winter | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.rpc('winter_offer_status').then(({ data }) => setWinter((data as Winter) ?? null));
    sb.rpc('public_featured_coupon').then(({ data }) => setOffer(((data as { code: string; discount_type: string; value: number }[] | null) ?? [])[0] ?? null));
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
  const payable = quote ? quote.amount : basePrice;
  const winterOn = plan === 'lifetime' && !!winter?.active;

  // Price without a code (the winter offer applies to Lifetime while seats are left)
  useEffect(() => {
    if (!prices) return;
    supabaseBrowser().rpc('quote_price', { p_plan: plan, p_test: plan === 'single_test' ? testId : null, p_coupon: null })
      .then(({ data }) => { if (data) setQuote(data as Quote); });
  }, [prices, plan, testId]);

  async function applyCoupon(code?: string) {
    setCouponMsg(null);
    const c = (code ?? coupon).trim();
    if (code) setCoupon(code);
    if (!c) return;
    const { data, error } = await supabaseBrowser().rpc('quote_price', { p_plan: plan, p_test: plan === 'single_test' ? testId : null, p_coupon: c });
    if (error) { setCouponMsg({ ok: false, text: error.message }); return; }
    setQuote(data as Quote);
    const q = data as Quote;
    setCouponMsg(q.coupon_valid
      ? { ok: true, text: q.offer === 'referral' ? (lang === 'bn' ? 'রেফারেল কোড প্রয়োগ হয়েছে (৳৫০ ছাড়)' : 'Referral code applied (৳50 off)') : t('couponOk') }
      : { ok: false, text: t('couponBad') });
  }

  // Coming from the home notice board (?coupon=CODE): apply it automatically once prices are known
  const [autoApplied, setAutoApplied] = useState(false);
  useEffect(() => {
    if (!autoApplied && prices && coupon.trim() && params.get('coupon')) { setAutoApplied(true); applyCoupon(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices]);

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
        ? 'অনলাইন পেমেন্ট এখন চালু নেই। উপরের bKash/Nagad অপশন ব্যবহার করুন।'
        : 'Online payment is not available right now. Please use the bKash/Nagad option above.'));
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
      <PageHeader title={premium ? (lang === 'bn' ? 'আমার প্রিমিয়াম' : 'My Premium') : t('premiumTitle')} sub={premium ? undefined : t('premiumSub')} />
      {premium && plan === 'lifetime' && <MemberCard />}

      <div className={`grid gap-3 md:grid-cols-2 ${premium && !test ? 'hidden' : ''}`}>
        <button onClick={() => { setPlan('lifetime'); setQuote(null); setCouponMsg(null); }}
          className={`card relative overflow-hidden p-5 text-left transition ${plan === 'lifetime' ? 'border-blush-400 ring-2 ring-blush-200' : ''}`}>
          <span className="absolute right-3 top-3 chip bg-blush-600 text-white">{lang === 'bn' ? 'সেরা মূল্য' : 'Best value'}</span>
          <Crown className="h-7 w-7 text-blush-600" />
          <h3 className="mt-2 font-bold text-ink">{t('lifetime')}</h3>
          {winterOn ? (
            <>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-bold text-white"><Snowflake className="h-3.5 w-3.5" />{lang === 'bn' ? 'শীতের অফার' : 'Winter offer'}</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-ink">৳{num(winter!.price)}</span>
                <span className="text-lg text-ink-soft line-through">৳{num(prices.lifetime)}</span>
              </div>
              <div className="text-xs font-semibold text-blush-700">{lang === 'bn' ? `৳${num(prices.lifetime - winter!.price)} ছাড় · প্রথম ${num(winter!.limit)} জনের জন্য · বাকি ${num(winter!.left)} জন` : `৳${prices.lifetime - winter!.price} off · first ${winter!.limit} buyers · ${winter!.left} left`}</div>
            </>
          ) : (
            <div className="mt-1 text-3xl font-bold text-ink">৳{num(prices.lifetime)}</div>
          )}
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

      {!premium && (
        <section className="rounded-2xl border border-mint-200 bg-mint-50/60 p-4">
          <h2 className="font-semibold text-ink">{lang === 'bn' ? '🔍 কেনার আগে ফ্রিতে নিজে যাচাই করে দেখুন' : '🔍 Try it free before you buy'}</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            <li>✅ {lang === 'bn' ? '১,০০০+ প্রশ্ন ব্যাখ্যাসহ — একদম ফ্রি' : '1,000+ questions with explanations — free'}</li>
            <li>✅ {lang === 'bn' ? 'বিগত সালের সব সরকারি পরীক্ষার প্রশ্ন, আসল পরীক্ষার মতো টাইমারসহ — ফ্রি' : 'All previous-year govt papers, timed like the real exam — free'}</li>
            <li>✅ {lang === 'bn' ? 'মান ভালো লাগলে তারপর প্রিমিয়াম নিন' : 'Like the quality? Then go Premium'}</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/question-bank" className="btn-success !py-2">{lang === 'bn' ? 'ফ্রি প্রশ্ন দেখুন' : 'See free questions'}</Link>
            <Link href="/previous-questions" className="btn-ghost !py-2">{lang === 'bn' ? 'বিগত সালের প্রশ্নে পরীক্ষা দিন' : 'Take a past paper'}</Link>
          </div>
        </section>
      )}
      <section className="card space-y-4 p-5">
        {offer && !quote?.coupon_valid && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed border-blush-300 bg-blush-50 p-3">
            <Ticket className="h-6 w-6 shrink-0 text-blush-600" />
            <div className="min-w-0 flex-1 text-sm">
              <b className="text-ink">{lang === 'bn' ? 'চলমান অফার' : 'Current offer'}: {offer.discount_type === 'percent' ? `${num(offer.value)}%` : `৳${num(offer.value)}`} {lang === 'bn' ? 'ছাড়' : 'off'}</b>
              <span className="block text-ink-soft">{lang === 'bn' ? 'কুপন কোড' : 'Coupon code'}: <span className="font-mono font-bold tracking-wider text-blush-700">{offer.code}</span></span>
            </div>
            <button className="btn-pink !py-2" onClick={() => applyCoupon(offer.code)}>{lang === 'bn' ? 'কুপন ব্যবহার করুন' : 'Use coupon'}</button>
          </div>
        )}
        <div>
          <label className="label">{t('coupon')}</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Ticket className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-soft" />
              <input className="input pl-9 uppercase" value={coupon} onChange={(e) => {
                setCoupon(e.target.value); setCouponMsg(null);
                if (quote?.coupon_valid) supabaseBrowser().rpc('quote_price', { p_plan: plan, p_test: plan === 'single_test' ? testId : null, p_coupon: null }).then(({ data }) => { if (data) setQuote(data as Quote); });
              }} />
            </div>
            <button className="btn-ghost" onClick={() => applyCoupon()} disabled={!coupon.trim()}>{t('apply')}</button>
          </div>
          {couponMsg && <p className={`mt-1 text-sm ${couponMsg.ok ? 'text-mint-700' : 'text-red-600'}`}>{couponMsg.text}</p>}
          {winterOn && (
            <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900">
              {lang === 'bn'
                ? `খেয়াল করুন: কুপন বা রেফারেল কোড দিলে শীতের অফার (৳${num(winter!.price)}) প্রযোজ্য হবে না। কোডের ছাড় হিসাব হবে মূল দাম ৳${num(prices.lifetime)} থেকে।`
                : `Note: with a coupon or referral code the winter offer (৳${winter!.price}) does not apply; the code's discount is taken off the full price ৳${prices.lifetime}.`}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between border-t border-brand-100 pt-4">
          <span className="text-sm text-ink-soft">{lang === 'bn' ? 'মোট পরিশোধ' : 'Total payable'}</span>
          <span className="text-right">
            {!!quote && quote.discount > 0 && <span className="mr-2 text-sm text-ink-soft line-through">৳{num(basePrice ?? 0)}</span>}
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
      <ReferralCard />
      {premium ? <ReviewForm /> : <ReviewList />}
    </div>
  );
}
