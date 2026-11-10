import 'server-only';
import { amountMatches, getPayment, markPaid } from '@/lib/payments/common';
import { sslValidate } from '@/lib/payments/sslcommerz';

/** Validates val_id with SSLCommerz and activates access. Returns the payment id when paid. */
export async function verifySsl(valId: string, expectedPid?: string) {
  const v = await sslValidate(valId);
  if (!v.ok) return { paid: false, pid: expectedPid ?? v.tranId };
  const pay = await getPayment(v.tranId);
  if (!pay || pay.gateway !== 'sslcommerz' || (expectedPid && pay.id !== expectedPid)) return { paid: false, pid: v.tranId };
  if (pay.status === 'paid') return { paid: true, pid: pay.id };
  if (v.currency !== 'BDT' || !amountMatches(pay.amount, v.amount)) return { paid: false, pid: pay.id };
  await markPaid(pay.id, v.bankTranId, v.raw);
  return { paid: true, pid: pay.id };
}
