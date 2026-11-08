'use client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, useExams, useSubjects } from '@/components/ui';
import { SimpleCrud } from '../SimpleCrud';
import { useL } from '../AdminShell';

export default function MockTestsAdmin() {
  const L = useL();
  const { pick } = useApp();
  const exams = useExams();
  const subjects = useSubjects();
  return (
    <div className="space-y-4">
      <PageHeader title={L('মক টেস্ট', 'Mock tests')}
        sub={L(`বিষয় আইডি: ${subjects.map((s) => `${s.id}=${s.name_bn}`).join(', ')}`, `Subject IDs: ${subjects.map((s) => `${s.id}=${s.name_en}`).join(', ')}`)} />
      <SimpleCrud table="mock_tests" defaults={{
        question_count: 50, duration_minutes: 50, marks_per_question: 1, negative_mark: 0.25,
        is_premium: false, shuffle_questions: true, shuffle_options: true, is_published: true,
      }} fields={[
        { key: 'title_bn', label: 'শিরোনাম (বাংলা)', required: true },
        { key: 'title_en', label: 'Title (English)', required: true },
        { key: 'description_bn', label: 'বিবরণ (বাংলা)', type: 'textarea', showInTable: false },
        { key: 'description_en', label: 'Description (English)', type: 'textarea', showInTable: false },
        { key: 'question_count', label: L('প্রশ্ন সংখ্যা', 'Questions'), type: 'number', required: true },
        { key: 'duration_minutes', label: L('সময় (মিনিট)', 'Duration (min)'), type: 'number', required: true },
        { key: 'marks_per_question', label: L('প্রতি প্রশ্নে নম্বর', 'Marks / question'), type: 'number' },
        { key: 'negative_mark', label: L('নেগেটিভ মার্ক', 'Negative mark'), type: 'number' },
        { key: 'subject_ids', label: L('বিষয় আইডি (খালি = সব)', 'Subject IDs (empty = all)'), type: 'intlist', showInTable: false },
        { key: 'exam_id', label: L('বিগত পরীক্ষা (ঐচ্ছিক)', 'Previous exam (optional)'), type: 'select', options: exams.map((e) => ({ value: e.id, label: `${pick(e, 'name')} ${e.year}` })) },
        { key: 'is_premium', label: L('প্রিমিয়াম', 'Premium'), type: 'bool' },
        { key: 'price', label: L('একক মূল্য ৳ (খালি = ডিফল্ট)', 'Single price ৳ (empty = default)'), type: 'number' },
        { key: 'shuffle_questions', label: L('প্রশ্ন এলোমেলো', 'Shuffle questions'), type: 'bool', showInTable: false },
        { key: 'shuffle_options', label: L('অপশন এলোমেলো', 'Shuffle options'), type: 'bool', showInTable: false },
        { key: 'is_published', label: L('প্রকাশিত', 'Published'), type: 'bool' },
      ]} />
    </div>
  );
}
