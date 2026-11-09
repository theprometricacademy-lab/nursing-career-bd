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
  question_en: '', question_bn: 'Warfarin-এর অতিমাত্রার প্রতিষেধক কোনটি?',
  option_a_en: '', option_b_en: '', option_c_en: '', option_d_en: '',
  option_a_bn: 'Vitamin K', option_b_bn: 'Protamine sulphate', option_c_bn: 'Naloxone', option_d_bn: 'Atropine',
  correct: 'ক', explanation_en: '', explanation_bn: 'Vitamin K, Warfarin-এর প্রভাব দূর করে।',
  difficulty: 'medium', is_premium: 'yes', source: 'Nursing Career BD', year: '', exam: '',
};

// Accept many header spellings (English / Bangla / with spaces) so any reasonable sheet works.
const ALIASES: Record<string, string> = {
  question: 'question_bn', prosno: 'question_bn', 'প্রশ্ন': 'question_bn', q: 'question_bn',
  a: 'option_a_bn', b: 'option_b_bn', c: 'option_c_bn', d: 'option_d_bn',
  'ক': 'option_a_bn', 'খ': 'option_b_bn', 'গ': 'option_c_bn', 'ঘ': 'option_d_bn',
  option_a: 'option_a_bn', option_b: 'option_b_bn', option_c: 'option_c_bn', option_d: 'option_d_bn',
  option1: 'option_a_bn', option2: 'option_b_bn', option3: 'option_c_bn', option4: 'option_d_bn',
  option_1: 'option_a_bn', option_2: 'option_b_bn', option_3: 'option_c_bn', option_4: 'option_d_bn',
  answer: 'correct', ans: 'correct', correct_answer: 'correct', right_answer: 'correct', 'উত্তর': 'correct', 'সঠিক_উত্তর': 'correct',
  explanation: 'explanation_bn', 'ব্যাখ্যা': 'explanation_bn',
  topic: 'topic_bn', 'টপিক': 'topic_bn', 'বিষয়': 'subject', subject_name: 'subject', category: 'subject',
  premium: 'is_premium', level: 'difficulty', 'সাল': 'year',
};
function normHeader(h: unknown): string {
  const k = String(h ?? '').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s\-.()]+/g, '_').replace(/_+$/, '');
  if ((COLS as readonly string[]).includes(k)) return k;
  return ALIASES[k] ?? k;
}

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
  const [reading, setReading] = useState(false);
  const [fileErr, setFileErr] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Raw[]>([]);
  const [defSubject, setDefSubject] = useState('');

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

  function validate(rows: Raw[], fallbackSubject: string): Parsed[] {
    return rows.map((r, i) => {
      const row = i + 2; // header is row 1
      const subj = findSubject(r.subject?.trim() ? r.subject : fallbackSubject);
      if (!subj) return { row, error: r.subject?.trim() ? `subject "${r.subject}" not found` : L('বিষয় (subject) দেওয়া নেই — উপরে একটি বিষয় বেছে নিন', 'no subject — pick a default subject above') };
      if (!r.topic_en?.trim() && r.topic_bn?.trim()) r.topic_en = r.topic_bn;
      let oe = [r.option_a_en, r.option_b_en, r.option_c_en, r.option_d_en].map((x) => String(x ?? '').trim());
      let ob = [r.option_a_bn, r.option_b_bn, r.option_c_bn, r.option_d_bn].map((x) => String(x ?? '').trim());
      if (!subj.translatable) { // Bangla / English subjects: one language is enough
        r.question_en = r.question_en?.trim() || r.question_bn; r.question_bn = r.question_bn?.trim() || r.question_en;
        oe = oe.map((x, k) => x || ob[k]); ob = ob.map((x, k) => x || oe[k]);
        r.explanation_en = r.explanation_en?.trim() || r.explanation_bn; r.explanation_bn = r.explanation_bn?.trim() || r.explanation_en;
      }
      if (!r.question_en?.trim() || !r.question_bn?.trim()) return { row, error: 'question_en and question_bn are required' };
      if (oe.some((x) => !x) || ob.some((x) => !x)) return { row, error: 'all 8 options are required' };
      const c = String(r.correct ?? '').trim().replace(/^(উ|ans|answer)[.:\s]*/i, '').replace(/[.)]$/, '').trim().toUpperCase();
      let correct: number | undefined = ({ A: 0, B: 1, C: 2, D: 3, '1': 0, '2': 1, '3': 2, '4': 3, '১': 0, '২': 1, '৩': 2, '৪': 3, 'ক': 0, 'খ': 1, 'গ': 2, 'ঘ': 3 } as Record<string, number>)[c];
      if (correct === undefined && c) { // answer written as the option text
        const idx = [...ob, ...oe].findIndex((x) => x.trim().toUpperCase() === c);
        if (idx >= 0) correct = idx % 4;
      }
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
          difficulty: diff, is_premium: r.is_premium?.trim() ? truthy(r.is_premium) : true, source: r.source?.trim() || null, year, is_active: true,
        },
      };
    });
  }

  async function onFile(f: File) {
    setResult(null); setParsed(null); setFileErr(''); setFileName(f.name); setReading(true);
    try {
      let grid: unknown[][] = [];
      if (/\.xls$/i.test(f.name)) {
        throw new Error(L('পুরনো .xls ফাইল চলবে না। Excel-এ File → Save As → "Excel Workbook (.xlsx)" বা "CSV UTF-8" দিয়ে সেভ করে আবার দিন।', 'Old .xls files are not supported. In Excel use File → Save As → "Excel Workbook (.xlsx)" or "CSV UTF-8" and upload again.'));
      } else if (/\.xlsx$/i.test(f.name)) {
        const readXlsx = (await import('read-excel-file')).default;
        grid = (await readXlsx(f)) as unknown[][];
      } else {
        const Papa = (await import('papaparse')).default;
        grid = Papa.parse<string[]>(await f.text(), { skipEmptyLines: true }).data;
      }
      // the header row is the first row that mentions a question column
      const hi = grid.findIndex((r) => r.map(normHeader).some((h) => h === 'question_bn' || h === 'question_en'));
      if (hi < 0) throw new Error(L('হেডার সারি পাওয়া যায়নি। প্রথম সারিতে কলামের নাম দিন (যেমন question, A, B, C, D, answer) — টেমপ্লেট দেখুন।', 'No header row found. Put column names in the first row (e.g. question, A, B, C, D, answer) — see the template.'));
      const head = grid[hi].map(normHeader);
      setColumns(head.filter(Boolean));
      const rows: Raw[] = grid.slice(hi + 1)
        .filter((r) => r.some((c) => c !== null && c !== undefined && String(c).trim() !== ''))
        .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] === null || r[i] === undefined ? '' : String(r[i])])) as Raw);
      if (!rows.length) throw new Error(L('ফাইলে কোনো প্রশ্ন পাওয়া যায়নি।', 'No question rows found in the file.'));
      setRawRows(rows);
      setParsed(validate(rows.map((r) => ({ ...r })), defSubject));
    } catch (e) {
      setFileErr(e instanceof Error ? e.message : String(e));
    } finally {
      setReading(false);
    }
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

    const rows: Record<string, unknown>[] = good.map((p) => ({
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
          <li>{L('সবচেয়ে সহজ ফাইল: শুধু question, A, B, C, D, answer — এই ৬টি কলাম (বাংলায়)। উপরে বিষয় বেছে নিন।', 'Simplest file: just question, A, B, C, D, answer — 6 columns. Pick the subject above.')}</li>
          <li>{L('subject: slug (যেমন pharmacology), ইংরেজি নাম বা আইডি', 'subject: slug (e.g. pharmacology), English name or ID')}</li>
          <li>{L('answer/correct: A/B/C/D, 1-4, ক/খ/গ/ঘ বা সঠিক অপশনের লেখা', 'answer/correct: A/B/C/D, 1-4, ক/খ/গ/ঘ or the option text')}</li>
          <li>{L('is_premium: yes/no (খালি থাকলে প্রিমিয়াম) · difficulty: easy/medium/hard · নতুন টপিক নিজে থেকে তৈরি হবে', 'is_premium: yes/no · difficulty: easy/medium/hard · new topics are created automatically')}</li>
          <li>{L('Excel থেকে CSV সেভ করলে "CSV UTF-8" বেছে নিন, যাতে বাংলা ঠিক থাকে', 'When saving CSV from Excel choose "CSV UTF-8" so Bangla text is preserved')}</li>
        </ul>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <label className="text-sm font-medium text-ink">{L('ফাইলে subject কলাম না থাকলে সব প্রশ্ন যাবে এই বিষয়ে:', 'If the file has no subject column, put every question in:')}</label>
        <select className="input max-w-xs" value={defSubject} onChange={(e) => {
          setDefSubject(e.target.value);
          if (rawRows.length) setParsed(validate(rawRows.map((r) => ({ ...r })), e.target.value));
        }}>
          <option value="">{L('— বিষয় বেছে নিন —', '— choose subject —')}</option>
          {subjects.map((s) => <option key={s.id} value={s.slug}>{s.name_bn} ({s.name_en})</option>)}
        </select>
      </div>

      <label className="card flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-brand-200 p-8 text-center hover:bg-brand-50">
        <FileUp className="h-8 w-8 text-brand-500" />
        <span className="font-semibold text-ink">{fileName || L('CSV বা XLSX ফাইল বেছে নিন', 'Choose a CSV or XLSX file')}</span>
        <span className="text-xs text-ink-soft">.xlsx · .csv</span>
        <input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />
      </label>
      {reading && <p className="text-sm text-ink-soft">{L('ফাইল পড়া হচ্ছে…', 'Reading file…')}</p>}
      {fileErr && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{fileErr}</p>}
      {columns.length > 0 && <p className="text-xs text-ink-soft">{L('পাওয়া কলাম', 'Detected columns')}: {columns.join(', ')}</p>}

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
