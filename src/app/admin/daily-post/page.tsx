'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Shuffle, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { PageHeader } from '@/components/ui';

type Q = { id: number; code: string; question_bn: string; options_bn: string[]; correct_option: number; explanation_bn: string | null; subject_id: number };
const LET = ['ক', 'খ', 'গ', 'ঘ'];
const NURSING = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
const today = () => new Date().toLocaleDateString('bn-BD', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'long', year: 'numeric' });

/** Draw a 1080x1350 (Facebook 4:5) "question of the day" image; with `answer` it highlights the right option. */
async function draw(c: HTMLCanvasElement, q: Q, answer: boolean) {
  await document.fonts.ready;
  const font = getComputedStyle(document.body).fontFamily;
  c.width = 1080; c.height = 1350; const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 1080, 1350); g.addColorStop(0, '#0d47a1'); g.addColorStop(1, '#1f7ad6');
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
  x.fillStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.arc(980, 120, 240, 0, 7); x.fill(); x.beginPath(); x.arc(80, 1250, 280, 0, 7); x.fill();
  x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = `800 46px ${font}`; x.fillText('Nursing Career BD', 70, 110);
  x.textAlign = 'right'; x.font = `600 34px ${font}`; x.fillStyle = '#cfe3ff'; x.fillText(today(), 1010, 110);
  x.textAlign = 'center';
  x.fillStyle = answer ? '#22c55e' : '#ec4899'; x.beginPath(); x.roundRect(330, 160, 420, 76, 38); x.fill();
  x.fillStyle = '#fff'; x.font = `800 42px ${font}`; x.fillText(answer ? 'সঠিক উত্তর' : 'আজকের প্রশ্ন', 540, 212);
  // question
  x.font = `700 54px ${font}`; x.fillStyle = '#fff';
  const ql = wrap(x, q.question_bn, 920).slice(0, 5);
  let y = 330; ql.forEach((l) => { x.fillText(l, 540, y); y += 70; });
  y += 20;
  // options
  x.textAlign = 'left';
  q.options_bn.forEach((o, i) => {
    const ok = answer && i === q.correct_option;
    x.font = `700 42px ${font}`;
    const lines = wrap(x, o, 760).slice(0, 2); const h = 60 + lines.length * 50;
    x.fillStyle = ok ? '#22c55e' : answer ? 'rgba(255,255,255,.55)' : '#fff'; x.beginPath(); x.roundRect(70, y, 940, h, 28); x.fill();
    x.fillStyle = ok ? 'rgba(255,255,255,.3)' : '#e8f1fd'; x.beginPath(); x.roundRect(94, y + (h - 70) / 2, 70, 70, 20); x.fill();
    x.fillStyle = ok ? '#fff' : '#1f7ad6'; x.textAlign = 'center'; x.font = `800 40px ${font}`; x.fillText(LET[i], 129, y + h / 2 + 14);
    x.textAlign = 'left'; x.fillStyle = ok ? '#fff' : '#0f2a4a'; x.font = `700 42px ${font}`;
    lines.forEach((l, k) => x.fillText(l + (ok && k === lines.length - 1 ? '  ✔' : ''), 190, y + 54 + k * 50 + (h - 60 - lines.length * 50) / 2 + 6));
    y += h + 22;
  });
  x.textAlign = 'center';
  if (answer && q.explanation_bn && !q.explanation_bn.startsWith('সঠিক উত্তর:')) {
    x.font = `600 34px ${font}`; x.fillStyle = '#e0f2fe';
    wrap(x, q.explanation_bn, 920).slice(0, 3).forEach((l) => { x.fillText(l, 540, y + 30); y += 46; });
  } else if (!answer) {
    x.font = `800 46px ${font}`; x.fillStyle = '#fde68a'; x.fillText('উত্তর কমেন্টে দিন 👇', 540, Math.min(y + 60, 1200));
  }
  x.fillStyle = '#fff'; x.beginPath(); x.roundRect(260, 1240, 560, 76, 38); x.fill();
  x.fillStyle = '#1f7ad6'; x.font = `800 40px ${font}`; x.fillText('nursingcareerbd.com', 540, 1291);
}

export default function DailyPostPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [q, setQ] = useState<Q | null>(null);
  const [code, setCode] = useState('');
  const [answer, setAnswer] = useState(false);
  const [copied, setCopied] = useState('');
  const [err, setErr] = useState('');
  const cv = useRef<HTMLCanvasElement>(null);

  const random = useCallback(async () => {
    setErr('');
    const { count } = await sb.from('questions').select('id', { count: 'exact', head: true }).eq('is_active', true).in('subject_id', NURSING);
    const off = Math.floor(Math.random() * Math.max(1, (count ?? 1) - 1));
    const { data, error } = await sb.from('questions').select('id, code, question_bn, options_bn, correct_option, explanation_bn, subject_id')
      .eq('is_active', true).in('subject_id', NURSING).not('question_bn', 'is', null).range(off, off);
    if (error) setErr(error.message); else if (data?.[0]) { setQ(data[0] as Q); setAnswer(false); }
  }, [sb]);
  async function byCode() {
    const { data } = await sb.from('questions').select('id, code, question_bn, options_bn, correct_option, explanation_bn, subject_id').eq('code', code.trim().toUpperCase()).maybeSingle();
    if (data) { setQ(data as Q); setAnswer(false); } else setErr('এই কোডের প্রশ্ন পাওয়া যায়নি');
  }
  useEffect(() => { random(); }, [random]);
  useEffect(() => { if (q && cv.current) draw(cv.current, q, answer); }, [q, answer]);

  const caption = q ? (answer
    ? `✅ আজকের প্রশ্নের সঠিক উত্তর: (${LET[q.correct_option]}) ${q.options_bn[q.correct_option]}\n\n${q.explanation_bn && !q.explanation_bn.startsWith('সঠিক উত্তর:') ? `ব্যাখ্যা: ${q.explanation_bn}\n\n` : ''}প্রতিদিন এমন প্রশ্ন, ব্যাখ্যা আর বিগত বছরের সরকারি পরীক্ষার প্রশ্নের সমাধান 👉 nursingcareerbd.com\n\n#সিনিয়র_স্টাফ_নার্স #নার্সিং_প্রস্তুতি #NursingCareerBD`
    : `📝 আজকের প্রশ্ন (${today()})\n\n${q.question_bn}\n\n${q.options_bn.map((o, i) => `${LET[i]}) ${o}`).join('\n')}\n\n👇 উত্তর কমেন্টে দিন! সঠিক উত্তর ও ব্যাখ্যা আজ রাতে।\n\nআরও ১০,০০০+ প্রশ্ন ফ্রিতে অনুশীলন করুন 👉 nursingcareerbd.com\n\n#সিনিয়র_স্টাফ_নার্স #নার্সিং_চাকরি #NursingCareerBD #BPSC #DGNM`) : '';

  async function copy(t: string, k: string) { try { await navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(''), 2000); } catch { /* ignore */ } }
  function download() {
    if (!cv.current || !q) return;
    cv.current.toBlob((b) => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${answer ? 'answer' : 'question'}-${q.code}.png`; a.click(); }, 'image/png');
  }

  return (
    <div>
      <PageHeader title="আজকের প্রশ্ন — পোস্ট তৈরি" sub="Facebook পেজ ও গ্রুপের জন্য প্রশ্নের ছবি আর ক্যাপশন। সকালে প্রশ্ন পোস্ট করুন, রাতে “উত্তর” ছবি পোস্ট করুন।" />
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={random} className="btn-primary"><Shuffle className="h-4 w-4" />অন্য প্রশ্ন</button>
        <input className="input !w-44" placeholder="প্রশ্নের কোড (NCB-…)" value={code} onChange={(e) => setCode(e.target.value)} />
        <button onClick={byCode} className="btn-ghost">কোড দিয়ে আনুন</button>
        <button onClick={() => setAnswer(!answer)} className="btn-ghost">{answer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{answer ? 'প্রশ্নের ছবি' : 'উত্তরের ছবি'}</button>
      </div>
      {err && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-3">
          <canvas ref={cv} className="h-auto w-full rounded-xl" />
          <button onClick={download} className="btn-pink mt-3 w-full"><Download className="h-4 w-4" />ছবি ডাউনলোড</button>
        </div>
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold text-ink">ক্যাপশন {q && <span className="text-ink-soft">· {q.code}</span>}</p>
          <textarea readOnly className="input min-h-[360px] text-sm" value={caption} />
          <button onClick={() => copy(caption, 'cap')} className="btn-primary mt-3 w-full">{copied === 'cap' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === 'cap' ? 'কপি হয়েছে' : 'ক্যাপশন কপি'}</button>
          <p className="mt-3 text-xs text-ink-soft">টিপস: প্রশ্নের পোস্টে লিংক না দিয়ে প্রথম কমেন্টে লিংক দিলে Facebook পোস্টটা বেশি মানুষকে দেখায়। গ্রুপে পোস্ট করার আগে গ্রুপের নিয়ম দেখে নিন।</p>
        </div>
      </div>
    </div>
  );
}
