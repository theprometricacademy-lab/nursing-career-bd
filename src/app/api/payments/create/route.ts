import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionUser, supabaseService } from '@/lib/supabase/server';
import { appUrl, markPaid, rateLimit } from '@/lib/payments/common';
import { bkashCreate } from '@/lib/payments/bkash';
import { nagadCreate } from '@/lib/payments/nagad';
import { sslInit } from '@/lib/payments/sslcommerz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  plan: z.enum(['lifetime', 'single_test']),
  testId: z.number().int().positive().nullable().optional(),
  coupon: z.string().trim().max(40).nullable().optional(),
  gateway: z.enum(['bkash', 'nagad', 'sslcommerz']),
});

export async function POST(req: NextRequest) {
  const { user } = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please log in' }, { status: 401 });
  if (!rateLimit(`pay:${user.id}`, 10, 10 * 60 * 1000)) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { plan, gateway } = parsed.data;
  const testId = plan === 'single_test' ? parsed.data.testId ?? null : null;
  if (plan === 'single_test' && !testId) return NextResponse.json({ error: 'Test is required' }, { status: 400 });

  const svc = supabaseService();

  const { data: gw } = await svc.from('app_settings').select('value').eq('key', 'payment_gateways').maybeSingle();
  if (!(gw?.value as Record<string, boolean> | undefined)?.[gateway]) return NextResponse.json({ error: 'This payment method is disabled' }, { status: 400 });

  // already entitled?
  const { data: subs } = await svc.from('subscriptions').select('plan, mock_test_id').eq('user_id', user.id).eq('status', 'active');
  if (subs?.some((s) => s.plan === 'lifetime')) return NextResponse.json({ error: 'You already have Premium' }, { status: 400 });
  if (plan === 'single_test' && subs?.some((s) => s.plan === 'single_test' && s.mock_test_id === testId)) {
    return NextResponse.json({ error: 'You already own this test' }, { status: 400 });
  }

  // price is ALWAYS computed on the server
  const { data: quote, error: qErr } = await svc.rpc('quote_price', { p_plan: plan, p_test: testId, p_coupon: parsed.data.coupon ?? null });
  if (qErr || !quote) return NextResponse.json({ error: 'Could not price this plan' }, { status: 400 });
  const amount = Number(quote.amount);

  const { data: pay, error: pErr } = await svc.from('payments').insert({
    user_id: user.id, plan, mock_test_id: testId, amount, original_amount: Number(quote.base),
    coupon_id: quote.coupon_id ?? null, gateway: amount === 0 ? 'manual' : gateway, status: 'pending',
  }).select('id').single();
  if (pErr || !pay) return NextResponse.json({ error: 'Could not create payment' }, { status: 500 });

  // 100% coupon: nothing to charge
  if (amount === 0) {
    await markPaid(pay.id, `COUPON-${pay.id.slice(0, 8)}`, { coupon: parsed.data.coupon });
    return NextResponse.json({ free: true, paymentId: pay.id });
  }

  const { data: profile } = await svc.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle();
  const base = appUrl();
  try {
    let r: { url: string; ref: string | null };
    if (gateway === 'bkash') {
      r = await bkashCreate({ paymentId: pay.id, amount, payer: profile?.phone ?? '', callbackURL: `${base}/api/payments/bkash/callback?pid=${pay.id}` });
    } else if (gateway === 'nagad') {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
      r = await nagadCreate({ paymentId: pay.id, amount, ip, callbackURL: `${base}/api/payments/nagad/callback` });
    } else {
      r = await sslInit({
        paymentId: pay.id, amount, product: plan === 'lifetime' ? 'Premium Lifetime Access' : 'Single Mock Test',
        name: profile?.full_name ?? '', email: user.email ?? '', phone: profile?.phone ?? '',
        successUrl: `${base}/api/payments/sslcommerz/return?pid=${pay.id}`,
        failUrl: `${base}/api/payments/sslcommerz/return?pid=${pay.id}&r=fail`,
        cancelUrl: `${base}/api/payments/sslcommerz/return?pid=${pay.id}&r=cancel`,
        ipnUrl: `${base}/api/payments/sslcommerz/ipn`,
      });
    }
    await svc.from('payments').update({ gateway_ref: r.ref }).eq('id', pay.id);
    return NextResponse.json({ url: r.url, paymentId: pay.id });
  } catch (e) {
    await svc.from('payments').update({ status: 'failed', gateway_payload: { error: String((e as Error).message) } }).eq('id', pay.id);
    console.error('payment init failed', e);
    return NextResponse.json({ error: 'Payment gateway is not available right now. Please try again later.' }, { status: 502 });
  }
}
