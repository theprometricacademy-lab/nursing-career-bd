import { NextResponse, type NextRequest } from 'next/server';
import { getPayment, markFailed, resultUrl } from '@/lib/payments/common';
import { verifySsl } from '../verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// SSLCommerz POSTs the browser here after success / fail / cancel
export async function POST(req: NextRequest) {
  const pid = req.nextUrl.searchParams.get('pid') ?? '';
  const r = req.nextUrl.searchParams.get('r');
  const form = await req.formData().catch(() => null);
  const valId = form?.get('val_id')?.toString();
  const go = (s: 'success' | 'failed' | 'cancelled') => NextResponse.redirect(resultUrl(pid, s), 303);

  if (r === 'fail' || r === 'cancel' || !valId) {
    const pay = await getPayment(pid);
    if (pay && pay.status === 'pending') await markFailed(pid, r === 'cancel' ? 'cancelled' : 'failed', form ? Object.fromEntries(form) : null);
    return go(r === 'cancel' ? 'cancelled' : 'failed');
  }
  try {
    const { paid } = await verifySsl(valId, pid);
    return go(paid ? 'success' : 'failed');
  } catch (e) {
    console.error('sslcommerz verify error', e);
    return go('failed');
  }
}
