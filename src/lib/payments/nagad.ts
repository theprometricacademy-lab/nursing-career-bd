import 'server-only';
import crypto from 'node:crypto';
import { isLive } from './common';

// Nagad Merchant API (v-0.2.0). Requires merchant RSA keys from Nagad.
const base = () => process.env.NAGAD_BASE_URL
  || (isLive() ? 'https://api.mynagad.com/api/dfs' : 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs');

function pem(key: string, type: 'PUBLIC KEY' | 'PRIVATE KEY') {
  const k = key.replace(/\\n/g, '\n').trim();
  if (k.includes('BEGIN')) return k;
  return `-----BEGIN ${type}-----\n${k.match(/.{1,64}/g)!.join('\n')}\n-----END ${type}-----`;
}

function creds() {
  const { NAGAD_MERCHANT_ID, NAGAD_MERCHANT_PRIVATE_KEY, NAGAD_PG_PUBLIC_KEY } = process.env;
  if (!NAGAD_MERCHANT_ID || !NAGAD_MERCHANT_PRIVATE_KEY || !NAGAD_PG_PUBLIC_KEY) throw new Error('Nagad is not configured');
  return { id: NAGAD_MERCHANT_ID, priv: pem(NAGAD_MERCHANT_PRIVATE_KEY, 'PRIVATE KEY'), pub: pem(NAGAD_PG_PUBLIC_KEY, 'PUBLIC KEY') };
}

const encrypt = (data: object, pub: string) =>
  crypto.publicEncrypt({ key: pub, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(JSON.stringify(data))).toString('base64');
const decrypt = (b64: string, priv: string) =>
  JSON.parse(crypto.privateDecrypt({ key: priv, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(b64, 'base64')).toString());
const sign = (data: object, priv: string) => crypto.sign('sha256', Buffer.from(JSON.stringify(data)), priv).toString('base64');

function dhakaDateTime() {
  const d = new Date(Date.now() + 6 * 3600 * 1000); // UTC+6
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

const headers = (ip: string) => ({
  'Content-Type': 'application/json', 'X-KM-Api-Version': 'v-0.2.0', 'X-KM-IP-V4': ip || '127.0.0.1', 'X-KM-Client-Type': 'PC_WEB',
});

/** orderId must be short & alphanumeric */
export const nagadOrderId = (paymentId: string) => 'NC' + paymentId.replace(/-/g, '').slice(0, 18);

export async function nagadCreate(o: { paymentId: string; amount: number; callbackURL: string; ip: string }) {
  const c = creds();
  const orderId = nagadOrderId(o.paymentId);
  const datetime = dhakaDateTime();
  const sensitive = { merchantId: c.id, datetime, orderId, challenge: crypto.randomBytes(20).toString('hex') };
  const init = await fetch(`${base()}/check-out/initialize/${c.id}/${orderId}?locale=EN`, {
    method: 'POST', headers: headers(o.ip), cache: 'no-store',
    body: JSON.stringify({ dateTime: datetime, sensitiveData: encrypt(sensitive, c.pub), signature: sign(sensitive, c.priv) }),
  }).then((r) => r.json());
  if (!init.sensitiveData) throw new Error(`Nagad initialize failed: ${init.message || 'unknown'}`);
  const dec = decrypt(init.sensitiveData, c.priv) as { paymentReferenceId: string; challenge: string };

  const order = { merchantId: c.id, orderId, currencyCode: '050', amount: o.amount.toFixed(2), challenge: dec.challenge };
  const done = await fetch(`${base()}/check-out/complete/${dec.paymentReferenceId}`, {
    method: 'POST', headers: headers(o.ip), cache: 'no-store',
    body: JSON.stringify({ sensitiveData: encrypt(order, c.pub), signature: sign(order, c.priv), merchantCallbackURL: o.callbackURL }),
  }).then((r) => r.json());
  if (done.status !== 'Success' || !done.callBackUrl) throw new Error(`Nagad complete failed: ${done.message || 'unknown'}`);
  return { url: done.callBackUrl as string, ref: orderId };
}

export async function nagadVerify(paymentRefId: string) {
  const j = await fetch(`${base()}/verify/payment/${encodeURIComponent(paymentRefId)}`, { headers: headers('127.0.0.1'), cache: 'no-store' }).then((r) => r.json());
  return { ok: j.status === 'Success', orderId: j.orderId as string, amount: Number(j.amount), txn: (j.issuerPaymentRefNo as string) || paymentRefId, raw: j };
}
