import 'server-only';
import { supabaseService } from '@/lib/supabase/server';

export const isLive = () => process.env.PAYMENT_MODE === 'live';

export function appUrl() {
  const u = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');
  return u.replace(/\/$/, '');
}

export type PaymentRow = {
  id: string; user_id: string; plan: 'lifetime' | 'single_test'; mock_test_id: number | null; amount: number;
  gateway: string; status: string; gateway_ref: string | null;
};

export async function getPayment(id: string) {
  const { data } = await supabaseService().from('payments').select('*').eq('id', id).maybeSingle();
  return data as PaymentRow | null;
}

export async function getPaymentByRef(gateway: string, ref: string) {
  const { data } = await supabaseService().from('payments').select('*').eq('gateway', gateway).eq('gateway_ref', ref).maybeSingle();
  return data as PaymentRow | null;
}

/** Activate access. Only call AFTER the gateway has confirmed the payment server-to-server. */
export async function markPaid(paymentId: string, txnId: string, payload: unknown) {
  const { error } = await supabaseService().rpc('grant_payment', { p_payment: paymentId, p_txn: txnId, p_payload: payload as object });
  if (error) throw error;
}

export async function markFailed(paymentId: string, status: 'failed' | 'cancelled', payload?: unknown) {
  await supabaseService().from('payments').update({ status, gateway_payload: payload ?? null })
    .eq('id', paymentId).eq('status', 'pending');
}

export function amountMatches(expected: number, got: unknown) {
  return Math.abs(Number(got) - Number(expected)) < 0.01;
}

export function resultUrl(paymentId: string, status: 'success' | 'failed' | 'cancelled') {
  return `${appUrl()}/payment/result?id=${encodeURIComponent(paymentId)}&status=${status}`;
}

// --- tiny in-memory rate limiter (per server instance) ---
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return true; }
  h.n += 1;
  return h.n <= max;
}
