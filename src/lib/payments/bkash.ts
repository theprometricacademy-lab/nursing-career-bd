import 'server-only';
import { isLive } from './common';

// bKash Tokenized Checkout (v1.2.0-beta)
const base = () => process.env.BKASH_BASE_URL
  || (isLive() ? 'https://tokenized.pay.bka.sh/v1.2.0-beta' : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta');

function creds() {
  const { BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD } = process.env;
  if (!BKASH_APP_KEY || !BKASH_APP_SECRET || !BKASH_USERNAME || !BKASH_PASSWORD) throw new Error('bKash is not configured');
  return { appKey: BKASH_APP_KEY, appSecret: BKASH_APP_SECRET, username: BKASH_USERNAME, password: BKASH_PASSWORD };
}

let cached: { token: string; exp: number } | null = null;

async function token() {
  if (cached && cached.exp > Date.now()) return cached.token;
  const c = creds();
  const res = await fetch(`${base()}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', username: c.username, password: c.password },
    body: JSON.stringify({ app_key: c.appKey, app_secret: c.appSecret }),
    cache: 'no-store',
  });
  const j = await res.json();
  if (!j.id_token) throw new Error(`bKash token failed: ${j.statusMessage || j.msg || res.status}`);
  cached = { token: j.id_token, exp: Date.now() + 50 * 60 * 1000 };
  return j.id_token as string;
}

async function call(path: string, body: object) {
  const res = await fetch(`${base()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: await token(), 'X-APP-Key': creds().appKey },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  return res.json();
}

export async function bkashCreate(o: { paymentId: string; amount: number; callbackURL: string; payer: string }) {
  const j = await call('/tokenized/checkout/create', {
    mode: '0011', payerReference: o.payer || '01', callbackURL: o.callbackURL,
    amount: o.amount.toFixed(2), currency: 'BDT', intent: 'sale', merchantInvoiceNumber: o.paymentId,
  });
  if (j.statusCode !== '0000' || !j.bkashURL) throw new Error(`bKash create failed: ${j.statusMessage || 'unknown'}`);
  return { url: j.bkashURL as string, ref: j.paymentID as string };
}

/** Executes then double-checks with the status API. Returns the verified transaction or null. */
export async function bkashExecuteAndVerify(paymentID: string) {
  let j = await call('/tokenized/checkout/execute', { paymentID });
  if (j.transactionStatus !== 'Completed') {
    // execute may fail if it was already executed — confirm with status query
    j = await call('/tokenized/checkout/payment/status', { paymentID });
  }
  if (j.transactionStatus !== 'Completed' || !j.trxID) return { ok: false as const, raw: j };
  return { ok: true as const, trxID: j.trxID as string, amount: Number(j.amount), invoice: j.merchantInvoiceNumber as string, raw: j };
}
