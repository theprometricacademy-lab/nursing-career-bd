import 'server-only';
import { isLive } from './common';

const base = () => (isLive() ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com');

function creds() {
  const { SSLCZ_STORE_ID, SSLCZ_STORE_PASSWORD } = process.env;
  if (!SSLCZ_STORE_ID || !SSLCZ_STORE_PASSWORD) throw new Error('SSLCommerz is not configured');
  return { id: SSLCZ_STORE_ID, pass: SSLCZ_STORE_PASSWORD };
}

export async function sslInit(o: {
  paymentId: string; amount: number; product: string; name: string; email: string; phone: string;
  successUrl: string; failUrl: string; cancelUrl: string; ipnUrl: string;
}) {
  const c = creds();
  const body = new URLSearchParams({
    store_id: c.id, store_passwd: c.pass, total_amount: o.amount.toFixed(2), currency: 'BDT', tran_id: o.paymentId,
    success_url: o.successUrl, fail_url: o.failUrl, cancel_url: o.cancelUrl, ipn_url: o.ipnUrl,
    product_name: o.product, product_category: 'Education', product_profile: 'non-physical-goods', shipping_method: 'NO',
    num_of_item: '1', cus_name: o.name || 'Student', cus_email: o.email || 'student@example.com', cus_phone: o.phone || '01700000000',
    cus_add1: 'Bangladesh', cus_city: 'Dhaka', cus_postcode: '1000', cus_country: 'Bangladesh',
    value_a: o.paymentId,
  });
  const res = await fetch(`${base()}/gwprocess/v4/api.php`, { method: 'POST', body, cache: 'no-store' });
  const j = await res.json();
  if (j.status !== 'SUCCESS' || !j.GatewayPageURL) throw new Error(`SSLCommerz init failed: ${j.failedreason || 'unknown'}`);
  return { url: j.GatewayPageURL as string, ref: (j.sessionkey as string) ?? null };
}

/** Server-to-server validation of a val_id. Never trust the browser's POST alone. */
export async function sslValidate(valId: string) {
  const c = creds();
  const qs = new URLSearchParams({ val_id: valId, store_id: c.id, store_passwd: c.pass, format: 'json', v: '1' });
  const res = await fetch(`${base()}/validator/api/validationserverAPI.php?${qs}`, { cache: 'no-store' });
  const j = await res.json();
  const ok = j.status === 'VALID' || j.status === 'VALIDATED';
  return { ok, tranId: j.tran_id as string, amount: Number(j.amount), currency: j.currency as string, bankTranId: (j.bank_tran_id as string) || valId, raw: j };
}
