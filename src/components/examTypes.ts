export type AttemptOption = { idx: number; en: string; bn: string };
export type AttemptQuestion = {
  position: number; question_id: number; code: string; subject_id: number;
  question_en: string; question_bn: string; options: AttemptOption[];
  selected: number | null; marked: boolean;
  correct_option: number | null; is_correct: boolean | null;
  explanation_en: string | null; explanation_bn: string | null;
};
export type Attempt = {
  id: string; mode: string; title_en: string | null; title_bn: string | null; status: 'in_progress' | 'submitted';
  started_at: string; expires_at: string; submitted_at: string | null; server_now: string;
  total_questions: number; marks_per_question: number; negative_mark: number;
  correct: number | null; wrong: number | null; skipped: number | null; score: number | null; max_score: number | null;
  questions: AttemptQuestion[];
  subjects: { subject_id: number; name_en: string; name_bn: string; total: number; correct: number }[];
};
export const LETTERS = { en: ['A', 'B', 'C', 'D'], bn: ['ক', 'খ', 'গ', 'ঘ'] } as const;
