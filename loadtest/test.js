// Load test for nursingcareerbd.com, run by the owner's request (15 Nov 2026, quiet hours in Bangladesh).
// Simulates test takers (start a free model test, answer, submit) and visitors browsing pages and the question bank.
import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter } from 'k6/metrics';

const SITE = 'https://nursingcareerbd.com';
const SB = 'https://pnbuydaeooxjojkzjdby.supabase.co';
const KEY = 'sb_publishable_yVAYPY0HXdB3XOcDTDadVA_pyczq0_A'; // public browser key, the same one the site ships
const FULL = __ENV.MODE === 'full';
const ACCOUNTS = FULL ? 60 : 3;
const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36 NCBD-LoadTest';

const rateLimited = new Counter('start_rate_limited');
const testsDone = new Counter('tests_submitted');
const answers = new Counter('answers_saved');

const names = ['page', 'signup', 'start_attempt', 'get_attempt', 'save_answer', 'submit_attempt', 'my_stats', 'list_questions', 'winter_offer'];
const thresholds = { http_req_failed: [{ threshold: 'rate<0.5', abortOnFail: true, delayAbortEval: '90s' }] };
for (const n of names) { thresholds[`http_req_duration{name:${n}}`] = ['p(95)<600000']; thresholds[`http_req_failed{name:${n}}`] = ['rate<=1']; }

export const options = {
  discardResponseBodies: true,
  userAgent: UA,
  thresholds,
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  scenarios: {
    main: {
      executor: 'ramping-vus', startVUs: 0, gracefulRampDown: '20s', gracefulStop: '20s',
      stages: FULL
        ? [{ duration: '3m', target: 1000 }, { duration: '15m', target: 1000 }, { duration: '2m', target: 0 }]
        : [{ duration: '20s', target: 10 }, { duration: '60s', target: 10 }, { duration: '10s', target: 0 }],
    },
  },
};

const rnd = (a, b) => a + Math.random() * (b - a);
const hdr = (token, name) => ({ headers: { apikey: KEY, Authorization: `Bearer ${token || KEY}`, 'Content-Type': 'application/json' }, tags: { name }, responseType: 'text' });
const rpc = (fn, body, token, name) => http.post(`${SB}/rest/v1/rpc/${fn}`, JSON.stringify(body || {}), hdr(token, name || fn));

export function setup() {
  const run = Date.now().toString(36);
  const pw = `Lt-${run}-${Math.random().toString(36).slice(2, 12)}`;
  const tokens = [];
  for (let i = 1; i <= ACCOUNTS; i++) {
    const r = http.post(`${SB}/auth/v1/signup`, JSON.stringify({
      email: `loadtest-${run}-${i}@nursingcareerbd.com`, password: pw, data: { full_name: `LOADTEST ${i}`, phone: '' },
    }), hdr(null, 'signup'));
    if (r.status === 200) { try { const t = JSON.parse(r.body).access_token; if (t) tokens.push(t); } catch (e) { /* ignore */ } }
    else console.log(`signup ${i}: ${r.status} ${String(r.body).slice(0, 120)}`);
    sleep(1);
  }
  console.log(`accounts ready: ${tokens.length}/${ACCOUNTS}`);
  return { tokens };
}

const PAGES = ['/', '/weekly-test', '/question-bank', '/mock-tests', '/premium', '/jobs', '/circulars', '/question-solution', '/signup'];
const page = (p) => check(http.get(SITE + p, { tags: { name: 'page' } }), { 'page 200': (r) => r.status === 200 });

function browse() {
  page(PAGES[Math.floor(Math.random() * PAGES.length)]);
  sleep(rnd(2, 5));
  rpc('winter_offer_status', {}, null, 'winter_offer');
  if (Math.random() < 0.6) {
    const r = rpc('list_questions', { p_seed: Math.floor(rnd(1, 1e6)), p_offset: 20 * Math.floor(rnd(0, 6)), p_limit: 20 }, null, 'list_questions');
    check(r, { 'list 200': (x) => x.status === 200 });
  }
  sleep(rnd(5, 15));
}

function takeTest(token) {
  page('/mock-tests');
  sleep(rnd(1, 4));
  const s = rpc('start_attempt', { p_mode: 'mock', p_mock_test: 18 }, token);
  if (s.status !== 200) { if (String(s.body).includes('rate_limited')) rateLimited.add(1); browse(); return; }
  const id = JSON.parse(s.body);
  rpc('get_attempt', { p_attempt: id }, token);
  for (let pos = 1; pos <= 50; pos++) {
    sleep(rnd(8, 20));
    const r = rpc('save_answer', { p_attempt: id, p_position: pos, p_selected: Math.floor(rnd(0, 4)), p_marked: null, p_clear: false }, token);
    if (check(r, { 'answer saved': (x) => x.status === 200 })) answers.add(1);
  }
  const f = rpc('submit_attempt', { p_attempt: id }, token);
  if (check(f, { 'submitted': (x) => x.status === 200 })) testsDone.add(1);
  rpc('get_attempt', { p_attempt: id }, token);
  rpc('my_stats', {}, token);
  sleep(rnd(5, 15));
}

export default function (data) {
  const n = data.tokens.length;
  if (n > 0 && __VU % 10 < 7) takeTest(data.tokens[__VU % n]); else browse();
}
