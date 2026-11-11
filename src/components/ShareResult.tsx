'use client';
import { useState } from 'react';
import { Share2, Download, Link2, Check } from 'lucide-react';

const SITE = 'https://nursingcareerbd.com';

/** WhatsApp / Facebook / native share / copy-link buttons with a ready-made message. */
export function ShareButtons({ text, path = '/' }: { text: string; path?: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${SITE}${path}?utm_source=share`;
  const msg = `${text}\n${url}`;
  async function native() {
    try { await navigator.share({ text, url }); } catch { /* cancelled */ }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="w-full text-center text-xs font-semibold text-ink-soft">বন্ধুদের চ্যালেঞ্জ দিন:</span>
      <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener" className="btn !py-2 bg-[#25D366] text-white hover:opacity-90">WhatsApp</a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`} target="_blank" rel="noopener" className="btn !py-2 bg-[#1877F2] text-white hover:opacity-90">Facebook</a>
      {canShare && <button onClick={native} className="btn-ghost !py-2"><Share2 className="h-4 w-4" />শেয়ার</button>}
      <button onClick={copy} className="btn-ghost !py-2">{copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}{copied ? 'কপি হয়েছে' : 'লিংক কপি'}</button>
    </div>
  );
}

function bnNum(v: number | string) { return String(v).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]); }
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(' '); const lines: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}

/** Draws a 1080x1080 score card in the browser (no server needed) and returns it as a PNG blob. */
export async function drawScoreCard({ title, score, total, pct, name }: { title: string; score: string; total: string; pct: number; name?: string }) {
  await document.fonts.ready;
  const font = getComputedStyle(document.body).fontFamily;
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 1080, 1080); g.addColorStop(0, '#0d47a1'); g.addColorStop(1, '#db2777');
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1080);
  x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.arc(900, 160, 260, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(140, 980, 300, 0, Math.PI * 2); x.fill();
  x.textAlign = 'center'; x.fillStyle = '#fff';
  x.font = `800 54px ${font}`; x.fillText('Nursing Career BD', 540, 130);
  x.font = `600 40px ${font}`; x.fillStyle = '#cfe3ff';
  wrap(x, title, 900).slice(0, 2).forEach((l, i) => x.fillText(l, 540, 230 + i * 54));
  // score ring
  x.lineWidth = 34; x.strokeStyle = 'rgba(255,255,255,.2)'; x.beginPath(); x.arc(540, 560, 200, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = pct >= 60 ? '#34d399' : pct >= 40 ? '#fcd34d' : '#fca5a5'; x.lineCap = 'round';
  x.beginPath(); x.arc(540, 560, 200, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.02, Math.min(1, pct / 100))); x.stroke();
  x.fillStyle = '#fff'; x.font = `800 120px ${font}`; x.fillText(score, 540, 590);
  x.font = `600 44px ${font}`; x.fillText(`/ ${total}`, 540, 650);
  x.font = `800 58px ${font}`; x.fillText(name ? `${name}-এর স্কোর` : 'আমার স্কোর', 540, 860);
  x.fillStyle = '#fde68a'; x.font = `700 44px ${font}`; x.fillText('তুমি কত পাবে? চ্যালেঞ্জ নাও 👇', 540, 930);
  x.fillStyle = '#fff'; x.beginPath(); x.roundRect(240, 965, 600, 80, 40); x.fill();
  x.fillStyle = '#1f7ad6'; x.font = `800 44px ${font}`; x.fillText('nursingcareerbd.com', 540, 1020);
  return await new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/png'));
}

/** Score card + share buttons for the result page. */
export function ResultShare({ title, correct, total, pct, name }: { title: string; correct: number; total: number; pct: number; name?: string }) {
  const [busy, setBusy] = useState(false);
  const text = `আমি "${title}"-এ ${bnNum(total)}-এর মধ্যে ${bnNum(correct)} পেয়েছি! তুমি কত পাবে? চ্যালেঞ্জ নাও 👇`;
  async function image() {
    setBusy(true);
    try {
      const blob = await drawScoreCard({ title, score: bnNum(correct), total: bnNum(total), pct, name });
      const file = new File([blob], 'my-score.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: `${text}\n${SITE}` }); }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-score.png'; a.click(); }
    } catch { /* cancelled */ }
    setBusy(false);
  }
  return (
    <section className="card p-4 text-center">
      <p className="mb-3 font-semibold text-ink">আপনার স্কোর বন্ধুদের সাথে শেয়ার করুন</p>
      <button onClick={image} disabled={busy} className="btn-pink mb-3 w-full !py-3 sm:w-auto sm:px-8"><Download className="h-4 w-4" />{busy ? 'তৈরি হচ্ছে…' : 'স্কোরের ছবি শেয়ার / ডাউনলোড'}</button>
      <ShareButtons text={text} path="/" />
    </section>
  );
}
