import { NextResponse, type NextRequest } from 'next/server';
import { amountMatches, getPaymentByRef, markFailed, markPaid, resultUrl } from '@/lib/payments/common';
import { nagadVerify } from '@/lib/payments/nagad';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams;
  const orderId = u.get('order_id') ?? '';
  const refId = u.get('payment_ref_id') ?? '';
  const pay = orderId ? await getPaymentByRef('nagad', orderId) : null;
  if (!pay) return NextResponse.redirect(resultUrl('', 'failed'));
  if (pay.status === 'paid') return NextResponse.redirect(resultUrl(pay.id, 'success'));
  try {
    const v = refId ? await nagadVerify(refId) : null;
    if (v?.ok && v.orderId === orderId && amountMatches(pay.amount, v.amount)) {
      await markPaid(pay.id, v.txn, v.raw);
      return NextResponse.redirect(resultUrl(pay.id, 'success'));
    }
    await markFailed(pay.id, u.get('status') === 'Aborted' ? 'cancelled' : 'failed', v?.raw ?? Object.fromEntries(u));
  } catch (e) {
    console.error('nagad verify error', e);
  }
  return NextResponse.redirect(resultUrl(pay.id, 'failed'));
}
