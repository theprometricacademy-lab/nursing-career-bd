import { rpc, type SampleQ } from './seoSubjects';

export type ExamPaper = { id: number; slug: string; name_bn: string; name_en: string; year: number; exam_date: string | null; total: number };

export const listPapers = async () => (await rpc<ExamPaper[]>('public_exam_list', {})) ?? [];
export const paperQuestions = async (slug: string) => (await rpc<SampleQ[]>('public_exam_paper', { p_slug: slug })) ?? [];

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const BN_MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
export const bn = (v: number | string) => String(v).replace(/\d/g, (c) => BN_DIGITS[+c]);

/** '2026-08-03' → '৩ আগস্ট ২০২৬' (plain string parse, no timezone shift) */
export function bnExamDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${bn(d)} ${BN_MONTHS[m - 1]} ${bn(y)}`;
}

/** Search-friendly page title, e.g. 'সিনিয়র স্টাফ নার্স প্রশ্ন সমাধান ২০২৬ — সরকারি কর্মচারী হাসপাতাল (পিএসসি, ০৩-০৮-২০২৬)' */
export function paperTitle(p: ExamPaper) {
  const [post, rest] = p.name_bn.split(' — ');
  return rest ? `${post} প্রশ্ন সমাধান ${bn(p.year)} — ${rest}` : `${p.name_bn} প্রশ্ন সমাধান ${bn(p.year)}`;
}
