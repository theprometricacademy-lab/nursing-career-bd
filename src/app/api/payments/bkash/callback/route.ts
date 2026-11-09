import { NextResponse, type NextRequest } from 'next/server';
import { amountMatches, getPayment, markFailed, markPaid, resultUrl } from '@/lib/payments/common';
import { bkashExecuteAndVerify } from '@/lib/payments/bkash';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams;
  const pid = u.get('pid') ?? '';
  const paymentID = u.get('paymentID') ?? '';
  const status = u.get('status');
  const pay = pid ? await getPayment(pid) : null;
  if (!pay || pay.gateway !== 'bkash' || pay.gateway_ref !== paymentID) return NextResponse.redirect(resultUrl(pid, 'failed'));
  if (pay.status === 'paid') return NextResponse.redirect(resultUrl(pid, 'success'));

  if (status !== 'success') {
    await markFailed(pid, status === 'cancel' ? 'cancelled' : 'failed', { status });
    return NextResponse.redirect(resultUrl(pid, status === 'cancel' ? 'cancelled' : 'failed'));
  }
  try {
    const v = await bkashExecuteAndVerify(paymentID);
    if (v.ok && v.invoice === pay.id && amountMatches(pay.amount, v.amount)) {
      await markPaid(pay.id, v.trxID, v.raw);
      return NextResponse.redirect(resultUrl(pid, 'success'));
    }
    await markFailed(pid, 'failed', v.raw);
  } catch (e) {
    console.error('bkash verify error', e);
  }
  return NextResponse.redirect(resultUrl(pid, 'failed'));
}
