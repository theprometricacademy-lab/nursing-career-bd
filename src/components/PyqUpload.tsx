'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Upload, ImagePlus, X, CheckCircle2, Clock, FileText } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';

type Mine = { id: number; exam_name: string; exam_type: string; year: number | null; status: string; created_at: string };
const MAX_FILES = 20;

/** Shrink a phone photo to ≤2200px JPEG so uploads are quick on mobile data; PDFs go as they are. */
async function prepare(f: File): Promise<Blob> {
  if (!f.type.startsWith('image/')) return f;
  try {
    const bmp = await createImageBitmap(f);
    const s = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? f), 'image/jpeg', 0.85));
  } catch { return f; }
}

const ERR: Record<string, string> = {
  name_required: 'পরীক্ষার নাম লিখুন।', bad_files: 'ছবি আপলোড ঠিকমতো হয়নি, আবার চেষ্টা করুন।',
  too_many: 'আজ অনেকবার পাঠিয়েছেন, কাল আবার চেষ্টা করুন।', login_required: 'আগে লগইন করুন।',
};

/** "Have a previous-year paper we don't? Send clear photos" — logged-in users upload; admin reviews. */
export function PyqUpload({ defaultType = 'mcq' }: { defaultType?: 'mcq' | 'written' }) {
  const { user, ready, num } = useApp();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'mcq' | 'written'>(defaultType);
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [mine, setMine] = useState<Mine[]>([]);
  const input = useRef<HTMLInputElement>(null);

  const loadMine = () => {
    if (!user) return;
    supabaseBrowser().from('pyq_submissions').select('id, exam_name, exam_type, year, status, created_at').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(5).then(({ data }) => setMine((data as Mine[]) ?? []));
  };
  useEffect(loadMine, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  function add(list: FileList | null) {
    if (!list) return;
    const ok = Array.from(list).filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf');
    setFiles((cur) => [...cur, ...ok].slice(0, MAX_FILES));
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!files.length) { setMsg({ ok: false, t: 'অন্তত একটি ছবি দিন।' }); return; }
    setMsg(null);
    const sb = supabaseBrowser(); const paths: string[] = []; const stamp = Date.now();
    try {
      for (let i = 0; i < files.length; i++) {
        setBusy(`ছবি আপলোড হচ্ছে ${num(i + 1)}/${num(files.length)}…`);
        const f = files[i]; const blob = await prepare(f);
        const ext = blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : 'jpg';
        const path = `${user.id}/${stamp}-${i + 1}.${ext}`;
        const { error } = await sb.storage.from('pyq-uploads').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
        if (error) throw new Error(error.message);
        paths.push(path);
      }
      setBusy('জমা হচ্ছে…');
      const { error } = await sb.rpc('submit_pyq', { p_type: type, p_name: name, p_year: year ? Number(year) : null, p_note: note, p_files: paths });
      if (error) throw new Error(error.message);
      setFiles([]); setName(''); setYear(''); setNote('');
      setMsg({ ok: true, t: 'ধন্যবাদ! প্রশ্নপত্রটি জমা হয়েছে। যাচাই করে শীঘ্রই ওয়েবসাইটে যোগ করা হবে।' });
      loadMine();
    } catch (err) {
      const m = (err as Error).message; const k = Object.keys(ERR).find((x) => m.includes(x));
      setMsg({ ok: false, t: k ? ERR[k] : 'আপলোড হয়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।' });
    }
    setBusy('');
  }

  return (
    <section className="card mb-4 border-dashed border-brand-200 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blush-50 text-blush-600"><Upload className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-ink">আপনার কাছে এমন বিগত সালের প্রশ্ন আছে, যা এখানে নেই?</h2>
          <p className="text-sm text-ink-soft">MCQ বা লিখিত প্রশ্নপত্রের পরিষ্কার ছবি পাঠান — যাচাই করে সবার জন্য উত্তরসহ যোগ করে দেব।</p>
        </div>
        {!open && <button className="btn-primary" onClick={() => setOpen(true)}><ImagePlus className="h-4 w-4" />ছবি পাঠান</button>}
      </div>

      {open && ready && !user && (
        <div className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-ink">
          ছবি পাঠাতে আগে লগইন করুন। <Link href={`/login?next=${encodeURIComponent(path || '/previous-questions')}`} className="font-semibold text-brand-700 underline">লগইন / ফ্রি অ্যাকাউন্ট</Link>
        </div>
      )}

      {open && user && (
        <form onSubmit={send} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['mcq', 'written'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} className={`btn ${type === t ? 'bg-brand-600 text-white' : 'border border-brand-200 bg-white text-ink'}`}>
                {t === 'mcq' ? 'MCQ (প্রিলিমিনারি)' : 'লিখিত পরীক্ষা'}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
            <input className="input" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)}
              placeholder="পরীক্ষার নাম — যেমন: সিনিয়র স্টাফ নার্স, পিএসসি / DGNM" />
            <input className="input" inputMode="numeric" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} placeholder="সাল (যেমন 2022)" />
          </div>
          <div>
            <input ref={input} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
            <button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-5 text-sm text-ink-soft hover:bg-brand-50">
              <ImagePlus className="h-7 w-7 text-brand-600" />
              <b className="text-ink">ছবি বা PDF বেছে নিন</b>
              <span>প্রতিটি পাতার আলাদা পরিষ্কার ছবি · সর্বোচ্চ {num(MAX_FILES)}টি</span>
            </button>
            {files.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {files.map((f, i) => (
                  <div key={i} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-brand-100 bg-white">
                    {f.type.startsWith('image/')
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                      : <span className="grid h-full place-items-center text-xs text-ink-soft"><FileText className="h-6 w-6" />PDF</span>}
                    <button type="button" aria-label="remove" onClick={() => setFiles(files.filter((_, k) => k !== i))}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <textarea className="input min-h-[70px]" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="অন্য কিছু জানাতে চাইলে লিখুন (ঐচ্ছিক) — যেমন: পরীক্ষার তারিখ, কোন পাতা নেই" />
          <p className="text-xs text-ink-soft">ছবিগুলো শুধু অ্যাডমিন দেখবেন। প্রশ্ন ওয়েবসাইটে লেখা আকারে যোগ করার পর ছবিগুলো মুছে ফেলা হয়।</p>
          <div className="flex gap-2">
            <button className="btn-success" disabled={!!busy}>{busy || 'জমা দিন'}</button>
            <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => { setOpen(false); setMsg(null); }}>বন্ধ করুন</button>
          </div>
        </form>
      )}
      {msg && <p className={`mt-3 rounded-xl p-3 text-sm ${msg.ok ? 'bg-mint-50 text-mint-700' : 'bg-red-50 text-red-700'}`}>{msg.t}</p>}

      {mine.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-white/60 p-3 text-xs">
          <li className="font-semibold text-ink-soft">আপনার পাঠানো প্রশ্নপত্র</li>
          {mine.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2">
              <span className="truncate">{m.exam_name}{m.year ? ` (${num(m.year)})` : ''} · {m.exam_type === 'mcq' ? 'MCQ' : 'লিখিত'}</span>
              <span className={`flex shrink-0 items-center gap-1 font-semibold ${m.status === 'added' ? 'text-mint-700' : m.status === 'rejected' ? 'text-red-600' : 'text-brand-700'}`}>
                {m.status === 'added' ? <><CheckCircle2 className="h-3.5 w-3.5" />যোগ হয়েছে</> : m.status === 'rejected' ? 'যোগ করা যায়নি' : <><Clock className="h-3.5 w-3.5" />যাচাই চলছে</>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
