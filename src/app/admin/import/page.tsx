'use client';
import { useState } from 'react';
import { Download, FileUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Progress, useExams, useSubjects } from '@/components/ui';
import { useL } from '../AdminShell';

const COLS = [
  'code', 'subject', 'topic_en', 'topic_bn', 'question_en', 'question_bn',
  'option_a_en', 'option_b_en', 'option_c_en', 'option_d_en', 'option_a_bn', 'option_b_bn', 'option_c_bn', 'option_d_bn',
  'correct', 'explanation_en', 'explanation_bn', 'difficulty', 'is_premium', 'source', 'year', 'exam',
] as const;

type Raw = Record<string, string>;
type Parsed = { row: number; data?: Record<string, unknown>; topic?: { subject_id: number; en: string; bn: string }; examName?: string; error?: string };

const SAMPLE: Raw = {
  code: '', subject: 'pharmacology', topic_en: 'Antidotes', topic_bn: 'প্রতিষেধক',
  question_en: 'The antidote for warfarin overdose is:', question_bn: 'ওয়ারফারিনের অতিমাত্রার প্রতিষেধক:',
  option_a_en: 'Vitamin K', option_b_en: 'Protamine sulphate', option_c_en: 'Naloxone', option_d_en: 'Atropine',
  option_a_bn: 'ভিটামিন কে', option_b_bn: 'প্রোটামিন সালফেট', option_c_bn: 'নালোক্সোন', option_d_bn: 'অ্যাট্রোপিন',
  correct: 'A', explanation_en: 'Vitamin K reverses warfarin.', explanation_bn: 'ভিটামিন কে ওয়ারফারিনের প্রভাব দূর করে।',
  difficulty: 'medium', is_premium: 'no', source: 'Nursing Career BD', year: '', exam: '',
};

const truthy = (v: string) => ['1', 'yes', 'true', 'y', 'হ্যাঁ', 'premium'].includes(String(v).trim().toLowerCase());

export default function ImportPage() {
  const L = useL();
  const { num } = useApp();
  const subjects = useSubjects();
  const exams = useExams();
  const [parsed, setParsed] = useState<Parsed[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ ok: number; failed: number; msgs: string[] } | null>(null);
  const [busy, setBusy] = useState(false);

  function downloadTemplate() {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const csv = '﻿' + COLS.join(',') + '\n' + COLS.map((c) => esc(SAMPLE[c] ?? '')).join(',') + '\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'nursing-career-bd-questions-template.csv';
    a.click();
  }

  function findSubject(v: string) {
    const s = v.trim().toLowerCase();
    return subjects.find((x) => String(x.id) === s || x.slug === s || x.name_en.toLowerCase() === s || x.name_bn === v.trim());
  }

  function validate(rows: Raw[]): Parsed[] {
    return rows.map((r, i) => {
      const row = i + 2; // header is row 1
      const subj = findSubject(r.subject ?? '');
      if (!subj) return { row, error: `subject "${r.subject ?? ''}" not found` };
      let oe = [r.option_a_en, r.option_b_en, r.option_c_en, r.option_d_en].map((x) => String(x ?? '').trim());
      let ob = [r.option_a_bn, r.option_b_bn, r.option_c_bn, r.option_d_bn].map((x) => String(x ?? '').trim());
      if (!subj.translatable) { // Bangla / English subjects: one language is enough
        r.question_en = r.question_en?.trim() || r.question_bn; r.question_bn = r.question_bn?.trim() || r.question_en;
        oe = oe.map((x, k) => x || ob[k]); ob = ob.map((x, k) => x || oe[k]);
      }
      if (!r.question_en?.trim() || !r.question_bn?.trim()) return { row, error: 'question_en and question_bn are required' };
      if (oe.some((x) => !x) || ob.some((x) => !x)) return { row, error: 'all 8 options are required' };
      const c = String(r.correct ?? '').trim().toUpperCase();
      const correct = { A: 0, B: 1, C: 2, D: 3, '1': 0, '2': 1, '3': 2, '4': 3, 'ক': 0, 'খ': 1, 'গ': 2, 'ঘ': 3 }[c];
      if (correct === undefined) return { row, error: `correct must be A-D or 1-4 (got "${r.correct ?? ''}")` };
      const diff = String(r.difficulty || 'medium').trim().toLowerCase();
      if (!['easy', 'medium', 'hard'].includes(diff)) return { row, error: 'difficulty must be easy/medium/hard' };
      const year = r.year ? Number(r.year) : null;
      if (r.year && !Number.isInteger(year)) return { row, error: 'year must be a number' };
      const examName = String(r.exam ?? '').trim();
      if (examName && !exams.find((e) => e.name_en === examName || e.name_bn === examName)) return { row, error: `exam "${examName}" not found — add it in Subjects, topics & exams first` };
      return {
        row,
        examName: examName || undefined,
        topic: r.topic_en?.trim() ? { subject_id: subj.id, en: r.topic_en.trim(), bn: (r.topic_bn || r.topic_en).trim() } : undefined,
        data: {
          code: r.code?.trim() || null, subject_id: subj.id, question_en: r.question_en.trim(), question_bn: r.question_bn.trim(),
          options_en: oe, options_bn: ob, correct_option: correct,
          explanation_en: r.explanation_en?.trim() || null, explanation_bn: r.explanation_bn?.trim() || null,
          difficulty: diff, is_premium: truthy(r.is_premium ?? ''), source: r.source?.trim() || null, year, is_active: true,
        },
      };
    });
  }

  async function onFile(f: File) {
    setResult(null); setParsed(null); setFileName(f.name);
    let rows: Raw[] = [];
    if (/\.xlsx$/i.test(f.name)) {
      const readXlsx = (await import('read-excel-file')).default;
      const grid = await readXlsx(f);
      const head = grid[0].map((h) => String(h ?? '').trim());
      rows = grid.slice(1).filter((r) => r.some((c) => c !== null && String(c).trim() !== ''))
        .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] === null || r[i] === undefined ? '' : String(r[i])])));
    } else {
      const Papa = (await import('papaparse')).default;
      const res = Papa.parse<Raw>(await f.text(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().replace(/^﻿/, '') });
      rows = res.data;
    }
    setParsed(validate(rows));
  }

  async function runImport() {
    if (!parsed) return;
    const sb = supabaseBrowser();
    const good = parsed.filter((p) => p.data);
    setBusy(true); setProgress(0);
    const msgs: string[] = [];
    let ok = 0, failed = parsed.length - good.length;

    // 1. make sure topics exist
    const topicKey = (t: { subject_id: number; en: string }) => `${t.subject_id}|${t.en}`;
    const wanted = new Map<string, { subject_id: number; name_en: string; name_bn: string }>();
    good.forEach((p) => p.topic && wanted.set(topicKey(p.topic), { subject_id: p.topic.subject_id, name_en: p.topic.en, name_bn: p.topic.bn }));
    if (wanted.size) {
      const { error } = await sb.from('topics').upsert([...wanted.values()], { onConflict: 'subject_id,name_en', ignoreDuplicates: true });
      if (error) msgs.push(`topics: ${error.message}`);
    }
    const { data: allTopics } = await sb.from('topics').select('id, subject_id, name_en');
    const topicId = new Map((allTopics ?? []).map((t: { id: number; subject_id: number; name_en: string }) => [`${t.subject_id}|${t.name_en}`, t.id]));
    const examId = new Map(exams.flatMap((e) => [[e.name_en, e.id], [e.name_bn, e.id]] as [string, number][]));

    const rows = good.map((p) => ({
      ...p.data!,
      topic_id: p.topic ? topicId.get(topicKey(p.topic)) ?? null : null,
      exam_id: p.examName ? examId.get(p.examName) ?? null : null,
    }));
    const withCode = rows.filter((r) => r.code);
    const noCode = rows.filter((r) => !r.code).map(({ code: _c, ...rest }) => rest);

    // 2. insert in batches
    const BATCH = 400;
    const total = rows.length || 1;
    let done = 0;
    for (const [list, upsert] of [[withCode, true], [noCode, false]] as const) {
      for (let i = 0; i < list.length; i += BATCH) {
        const chunk = list.slice(i, i + BATCH);
        const { error } = upsert
          ? await sb.from('questions').upsert(chunk, { onConflict: 'code' })
          : await sb.from('questions').insert(chunk);
        if (error) { failed += chunk.length; msgs.push(error.message); } else ok += chunk.length;
        done += chunk.length;
        setProgress(Math.round((done / total) * 100));
      }
    }
    setBusy(false);
    setResult({ ok, failed, msgs });
  }

  const errors = parsed?.filter((p) => p.error) ?? [];
  const valid = parsed ? parsed.length - errors.length : 0;

  return (
    <div className="space-y-4">
      <PageHeader title={L('বাল্ক প্রশ্ন ইমপোর্ট', 'Bulk import questions')}
        sub={L('CSV বা Excel (.xlsx) ফাইল থেকে একসাথে হাজার হাজার প্রশ্ন যোগ করুন। একই "code" থাকলে প্রশ্নটি আপডেট হবে।', 'Add thousands of questions at once from CSV or Excel (.xlsx). Rows with an existing "code" are updated.')}
        right={<button className="btn-ghost" onClick={downloadTemplate}><Download className="h-4 w-4" />{L('টেমপ্লেট ডাউনলোড', 'Download template')}</button>} />

      <div className="card p-4 text-sm text-ink-soft">
        <p className="mb-1 font-semibold text-ink">{L('কলাম', 'Columns')}:</p>
        <code className="block whitespace-pre-wrap break-words rounded-lg bg-brand-50 p-2 text-xs text-ink">{COLS.join(', ')}</code>
        <ul className="ml-5 mt-2 list-disc space-y-0.5">
          <li>{L('subject: slug (যেমন pharmacology), ইংরেজি নাম বা আইডি', 'subject: slug (e.g. pharmacology), English name or ID')}</li>
          <li>{L('correct: A/B/C/D বা 1-4 বা ক/খ/গ/ঘ', 'correct: A/B/C/D, 1-4 or ক/খ/গ/ঘ')}</li>
          <li>{L('is_premium: yes/no · difficulty: easy/medium/hard · নতুন টপিক নিজে থেকে তৈরি হবে', 'is_premium: yes/no · difficulty: easy/medium/hard · new topics are created automatically')}</li>
          <li>{L('Excel থেকে CSV সেভ করলে "CSV UTF-8" বেছে নিন, যাতে বাংলা ঠিক থাকে', 'When saving CSV from Excel choose "CSV UTF-8" so Bangla text is preserved')}</li>
        </ul>
      </div>

      <label className="card flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-brand-200 p-8 text-center hover:bg-brand-50">
        <FileUp className="h-8 w-8 text-brand-500" />
        <span className="font-semibold text-ink">{fileName || L('CSV বা XLSX ফাইল বেছে নিন', 'Choose a CSV or XLSX file')}</span>
        <input type="file" accept=".csv,.xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>

      {parsed && (
        <div className="card space-y-3 p-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="chip bg-mint-100 py-1 text-mint-700"><CheckCircle2 className="h-4 w-4" />{num(valid)} {L('টি ঠিক আছে', 'valid')}</span>
            {errors.length > 0 && <span className="chip bg-red-50 py-1 text-red-700"><AlertTriangle className="h-4 w-4" />{num(errors.length)} {L('টিতে ভুল', 'with errors')}</span>}
          </div>
          {errors.length > 0 && (
            <ul className="max-h-48 overflow-y-auto rounded-xl bg-red-50 p-3 text-xs text-red-700">
              {errors.slice(0, 200).map((e) => <li key={e.row}>{L('সারি', 'Row')} {e.row}: {e.error}</li>)}
            </ul>
          )}
          {busy && <Progress value={progress} tone="mint" />}
          <button className="btn-success" disabled={busy || valid === 0} onClick={runImport}>
            {busy ? `${num(progress)}%` : `${L('ইমপোর্ট করুন', 'Import')} (${num(valid)})`}
          </button>
          {result && (
            <div className="rounded-xl bg-brand-50 p-3 text-sm">
              <b className="text-mint-700">{num(result.ok)} {L('টি যোগ/আপডেট হয়েছে', 'imported')}</b>
              {result.failed > 0 && <span className="text-red-700"> · {num(result.failed)} {L('টি বাদ', 'skipped')}</span>}
              {result.msgs.map((m, i) => <p key={i} className="text-xs text-red-700">{m}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
