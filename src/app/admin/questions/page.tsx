'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Pencil, Plus, Trash2, Unlock, Upload, Search } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { Modal, PageHeader, PremiumChip, Spinner, useExams, useSubjects, type Topic } from '@/components/ui';
import { useL } from '../AdminShell';

type QRow = {
  id?: number; code?: string; subject_id: number | ''; topic_id: number | '' | null; exam_id: number | '' | null;
  question_en: string; question_bn: string; options_en: string[]; options_bn: string[]; correct_option: number;
  explanation_en: string; explanation_bn: string; difficulty: 'easy' | 'medium' | 'hard'; is_premium: boolean;
  source: string; year: number | '' | null; is_active: boolean; exam_lang: 'bn' | 'en' | '' | null;
};

const EMPTY: QRow = {
  subject_id: '', topic_id: '', exam_id: '', question_en: '', question_bn: '', options_en: ['', '', '', ''], options_bn: ['', '', '', ''],
  correct_option: 0, explanation_en: '', explanation_bn: '', difficulty: 'medium', is_premium: false, source: '', year: '', is_active: true, exam_lang: '',
};
const PAGE = 25;

export default function QuestionsAdmin() {
  const L = useL();
  const { pick, num } = useApp();
  const sb = supabaseBrowser();
  const subjects = useSubjects();
  const exams = useExams();
  const [rows, setRows] = useState<QRow[] | null>(null);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [edit, setEdit] = useState<QRow | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  // Deep link from the reports page: /admin/questions?q=NCB-001234
  useEffect(() => { try { const v = new URLSearchParams(window.location.search).get('q'); if (v) setSearch(v); } catch { /* ignore */ } }, []);

  const load = useCallback(async () => {
    let q = sb.from('questions').select('*', { count: 'exact' }).order('id', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (subject) q = q.eq('subject_id', Number(subject));
    const s = search.trim().replace(/[%,()]/g, ' ');
    if (s) q = q.or(`code.ilike.%${s}%,question_en.ilike.%${s}%,question_bn.ilike.%${s}%`);
    const { data, error, count: c } = await q;
    if (error) setErr(error.message); else { setRows(data as QRow[]); setCount(c ?? 0); }
  }, [sb, page, subject, search]);
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [load]);

  useEffect(() => {
    if (!edit?.subject_id) { setTopics([]); return; }
    sb.from('topics').select('*').eq('subject_id', Number(edit.subject_id)).then(({ data }) => setTopics((data as Topic[]) ?? []));
  }, [sb, edit?.subject_id]);

  async function save() {
    if (!edit) return;
    setErr('');
    // Bangla / English subject questions are not translated: one language is enough, copy it to the other
    const subj = subjects.find((x) => x.id === edit.subject_id);
    if (subj && !subj.translatable) {
      const fill = (a: string, b: string) => (a.trim() ? a : b);
      edit.question_en = fill(edit.question_en, edit.question_bn); edit.question_bn = fill(edit.question_bn, edit.question_en);
      edit.options_en = edit.options_en.map((o, i) => fill(o, edit.options_bn[i])); edit.options_bn = edit.options_bn.map((o, i) => fill(o, edit.options_en[i]));
    }
    if (!edit.subject_id || !edit.question_en.trim() || !edit.question_bn.trim() || edit.options_en.some((o) => !o.trim()) || edit.options_bn.some((o) => !o.trim())) {
      setErr(L('বিষয়, দুই ভাষায় প্রশ্ন ও চারটি অপশন বাধ্যতামূলক।', 'Subject, question in both languages and all four options are required.'));
      return;
    }
    setBusy(true);
    const payload = {
      subject_id: Number(edit.subject_id), topic_id: edit.topic_id ? Number(edit.topic_id) : null, exam_id: edit.exam_id ? Number(edit.exam_id) : null,
      question_en: edit.question_en.trim(), question_bn: edit.question_bn.trim(),
      options_en: edit.options_en.map((o) => o.trim()), options_bn: edit.options_bn.map((o) => o.trim()),
      correct_option: Number(edit.correct_option), explanation_en: edit.explanation_en?.trim() || null, explanation_bn: edit.explanation_bn?.trim() || null,
      difficulty: edit.difficulty, is_premium: edit.is_premium, source: edit.source?.trim() || null, year: edit.year ? Number(edit.year) : null, is_active: edit.is_active,
      exam_lang: edit.exam_lang || null,
    };
    const { error } = edit.id ? await sb.from('questions').update(payload).eq('id', edit.id) : await sb.from('questions').insert(payload);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setEdit(null); load();
  }

  async function remove(id: number) {
    if (!confirm(L('প্রশ্নটি মুছে ফেলবেন? শিক্ষার্থীদের পুরনো ফলাফল থেকেও এটি মুছে যাবে। শুধু লুকাতে চাইলে "চালু" বন্ধ করুন।', 'Delete this question? It will also disappear from past results. To just hide it, untick "Active" instead.'))) return;
    const { error } = await sb.from('questions').delete().eq('id', id);
    if (error) setErr(error.message); else load();
  }

  async function togglePremium(r: QRow) {
    if (!r.id) return;
    setToggling(r.id); setErr('');
    const next = !r.is_premium;
    const { error } = await sb.from('questions').update({ is_premium: next }).eq('id', r.id);
    setToggling(null);
    if (error) { setErr(error.message); return; }
    setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, is_premium: next } : x)) ?? rs);
  }

  const subjName = (id: number | '') => { const s = subjects.find((x) => x.id === id); return s ? pick(s, 'name') : '—'; };
  const setOpt = (lang: 'en' | 'bn', i: number, v: string) => edit && setEdit({ ...edit, [`options_${lang}`]: edit[`options_${lang}`].map((o, j) => (j === i ? v : o)) } as QRow);

  return (
    <div className="space-y-4">
      <PageHeader title={L('প্রশ্ন ব্যবস্থাপনা', 'Manage questions')} sub={`${num(count)} ${L('টি প্রশ্ন', 'questions')}`}
        right={<div className="flex gap-2">
          <Link href="/admin/import" className="btn-ghost"><Upload className="h-4 w-4" />{L('ইমপোর্ট', 'Import')}</Link>
          <button className="btn-primary" onClick={() => { setErr(''); setEdit({ ...EMPTY, options_en: ['', '', '', ''], options_bn: ['', '', '', ''] }); }}><Plus className="h-4 w-4" />{L('নতুন প্রশ্ন', 'New question')}</button>
        </div>} />
      <div className="card grid gap-2 p-3 sm:grid-cols-[1fr_240px]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-ink-soft" />
          <input className="input pl-9" placeholder={L('আইডি বা প্রশ্ন দিয়ে খুঁজুন', 'Search by ID or text')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /></div>
        <select className="input" value={subject} onChange={(e) => { setSubject(e.target.value); setPage(0); }}>
          <option value="">{L('সব বিষয়', 'All subjects')}</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{pick(s, 'name')}</option>)}
        </select>
      </div>
      {err && !edit && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {!rows ? <Spinner /> : (
        <div className="card divide-y divide-brand-100">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                  <b className="text-brand-700">{r.code}</b><span className="chip bg-brand-50 text-brand-700">{subjName(r.subject_id)}</span>
                  <span className="chip bg-white ring-1 ring-brand-100">{r.difficulty}</span>
                  {r.is_premium && <PremiumChip />}{!r.is_active && <span className="chip bg-red-50 text-red-700">{L('বন্ধ', 'Inactive')}</span>}
                  {r.year && <span className="text-ink-soft">{r.year}</span>}
                </div>
                <p className="line-clamp-2 text-ink">{r.question_bn}</p>
                <p className="line-clamp-1 text-xs text-ink-soft">{r.question_en}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                <button className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold ring-1 ${r.is_premium ? 'bg-blush-50 text-blush-700 ring-blush-200 hover:bg-blush-100' : 'bg-mint-50 text-mint-700 ring-mint-200 hover:bg-mint-100'}`}
                  disabled={toggling === r.id} onClick={() => togglePremium(r)} title={L('প্রিমিয়াম/ফ্রি বদলান', 'Switch premium / free')}>
                  {r.is_premium ? <Crown className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  {toggling === r.id ? '…' : r.is_premium ? L('প্রিমিয়াম', 'Premium') : L('ফ্রি', 'Free')}
                </button>
                <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50" onClick={() => { setErr(''); setEdit({ ...EMPTY, ...r, topic_id: r.topic_id ?? '', exam_id: r.exam_id ?? '', year: r.year ?? '', explanation_en: r.explanation_en ?? '', explanation_bn: r.explanation_bn ?? '', source: r.source ?? '', exam_lang: r.exam_lang ?? '' }); }}><Pencil className="h-3.5 w-3.5" />{L('এডিট', 'Edit')}</button>
                <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50" onClick={() => remove(r.id!)}><Trash2 className="h-3.5 w-3.5" />{L('ডিলিট', 'Delete')}</button>
              </div>
            </div>
          ))}
          {rows.length === 0 && <p className="p-6 text-center text-ink-soft">—</p>}
        </div>
      )}
      <div className="flex items-center justify-center gap-2">
        <button className="btn-ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
        <span className="text-sm">{num(page + 1)} / {num(Math.max(1, Math.ceil(count / PAGE)))}</span>
        <button className="btn-ghost" disabled={(page + 1) * PAGE >= count} onClick={() => setPage(page + 1)}>›</button>
      </div>

      <Modal wide open={!!edit} onClose={() => !busy && setEdit(null)}>
        {edit && (
          <div className="max-h-[80vh] space-y-3 overflow-y-auto pr-1">
            <h3 className="text-lg font-bold text-ink">{edit.id ? `${L('এডিট', 'Edit')} ${edit.code}` : L('নতুন প্রশ্ন', 'New question')}</h3>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">{L('বিষয়', 'Subject')} *</label>
                <select className="input" value={edit.subject_id} onChange={(e) => setEdit({ ...edit, subject_id: e.target.value ? Number(e.target.value) : '', topic_id: '' })}>
                  <option value="">—</option>{subjects.map((s) => <option key={s.id} value={s.id}>{pick(s, 'name')}</option>)}
                </select></div>
              <div><label className="label">{L('টপিক', 'Topic')}</label>
                <select className="input" value={edit.topic_id ?? ''} onChange={(e) => setEdit({ ...edit, topic_id: e.target.value ? Number(e.target.value) : '' })}>
                  <option value="">—</option>{topics.map((tp) => <option key={tp.id} value={tp.id}>{pick(tp, 'name')}</option>)}
                </select></div>
            </div>
            <div><label className="label">প্রশ্ন (বাংলা) *</label><textarea className="input min-h-[70px]" value={edit.question_bn} onChange={(e) => setEdit({ ...edit, question_bn: e.target.value })} /></div>
            <div><label className="label">Question (English) *</label><textarea className="input min-h-[70px]" value={edit.question_en} onChange={(e) => setEdit({ ...edit, question_en: e.target.value })} /></div>
            <div>
              <label className="label">{L('অপশন (সঠিকটি বেছে নিন)', 'Options (select the correct one)')} *</label>
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`grid grid-cols-[auto_1fr_1fr] items-center gap-2 rounded-xl p-2 ${edit.correct_option === i ? 'bg-mint-50 ring-1 ring-mint-300' : ''}`}>
                    <input type="radio" name="correct" className="h-4 w-4 accent-mint-600" checked={edit.correct_option === i} onChange={() => setEdit({ ...edit, correct_option: i })} aria-label={`correct ${i + 1}`} />
                    <input className="input" placeholder={`বাংলা ${'কখগঘ'[i]}`} value={edit.options_bn[i]} onChange={(e) => setOpt('bn', i, e.target.value)} />
                    <input className="input" placeholder={`English ${'ABCD'[i]}`} value={edit.options_en[i]} onChange={(e) => setOpt('en', i, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <div><label className="label">ব্যাখ্যা (বাংলা)</label><textarea className="input min-h-[60px]" value={edit.explanation_bn} onChange={(e) => setEdit({ ...edit, explanation_bn: e.target.value })} /></div>
            <div><label className="label">Explanation (English)</label><textarea className="input min-h-[60px]" value={edit.explanation_en} onChange={(e) => setEdit({ ...edit, explanation_en: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">{L('কঠিনতা', 'Difficulty')}</label>
                <select className="input" value={edit.difficulty} onChange={(e) => setEdit({ ...edit, difficulty: e.target.value as QRow['difficulty'] })}>
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select></div>
              <div><label className="label">{L('বিগত পরীক্ষা', 'Previous exam')}</label>
                <select className="input" value={edit.exam_id ?? ''} onChange={(e) => setEdit({ ...edit, exam_id: e.target.value ? Number(e.target.value) : '' })}>
                  <option value="">—</option>{exams.map((x) => <option key={x.id} value={x.id}>{pick(x, 'name')} {x.year}</option>)}
                </select></div>
              <div><label className="label">{L('সাল', 'Year')}</label><input className="input" type="number" value={edit.year ?? ''} onChange={(e) => setEdit({ ...edit, year: e.target.value ? Number(e.target.value) : '' })} /></div>
              <div><label className="label">{L('উৎস', 'Source')}</label><input className="input" value={edit.source} onChange={(e) => setEdit({ ...edit, source: e.target.value })} /></div>
              <div className="col-span-2"><label className="label">{L('আসল পরীক্ষায় প্রশ্নের ভাষা', 'Language on the real exam')}</label>
                <select className="input" value={edit.exam_lang ?? ''} onChange={(e) => setEdit({ ...edit, exam_lang: e.target.value as QRow['exam_lang'] })}>
                  <option value="">{L('বিষয়ের ডিফল্ট', "Subject's default")}</option><option value="en">English</option><option value="bn">বাংলা</option>
                </select></div>
            </div>
            {subjects.find((x) => x.id === edit.subject_id)?.translatable === false && (
              <p className="rounded-xl bg-blush-50 p-2 text-xs text-blush-700">{L('এই বিষয়ের প্রশ্ন অনুবাদ হয় না — একটি ভাষায় প্রশ্ন ও অপশন লিখলেই হবে। ব্যাখ্যা দুই ভাষায় দিন।', 'Questions in this subject are not translated — fill the question and options in one language. Give the explanation in both.')}</p>
            )}
            <div className="flex gap-4 text-sm font-medium">
              <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-blush-600" checked={edit.is_premium} onChange={(e) => setEdit({ ...edit, is_premium: e.target.checked })} />{L('প্রিমিয়াম', 'Premium')}</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-brand-600" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} />{L('চালু', 'Active')}</label>
            </div>
            {err && <p className="rounded-xl bg-red-50 p-2 text-sm text-red-700">{err}</p>}
            <div className="flex gap-2 pt-1">
              <button className="btn-ghost flex-1" disabled={busy} onClick={() => setEdit(null)}>{L('বাতিল', 'Cancel')}</button>
              <button className="btn-primary flex-1" disabled={busy} onClick={save}>{busy ? '…' : L('সংরক্ষণ', 'Save')}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
