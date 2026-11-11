import { rpc } from './seoSubjects';

export type WrittenPaper = {
  slug: string; title_bn: string; post_bn: string | null; org_bn: string | null; exam_date: string | null; year: number;
  total_marks: number | null; duration_bn: string | null; questions: number; source_note?: string | null;
};
export type WrittenQ = { section: string; q_no: string | null; marks: number | null; question: string; answer: string | null };

export const SECTION_BN: Record<string, string> = {
  nursing: 'পেশাগত / নার্সিং অংশ', bangla: 'বাংলা', english: 'ইংরেজি', gk: 'সাধারণ জ্ঞান', math: 'গণিত ও মানসিক দক্ষতা', other: 'অন্যান্য',
};
export const SECTION_ORDER = ['nursing', 'bangla', 'english', 'gk', 'math', 'other'];

export const listWritten = async () => (await rpc<WrittenPaper[]>('public_written_list', {})) ?? [];
export const writtenPaper = async (slug: string) =>
  rpc<{ paper: WrittenPaper; questions: WrittenQ[] } | null>('public_written_paper', { p_slug: slug });
