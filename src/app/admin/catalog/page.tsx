'use client';
import { useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { PageHeader, useSubjects } from '@/components/ui';
import { SimpleCrud } from '../SimpleCrud';
import { useL } from '../AdminShell';

export default function CatalogAdmin() {
  const L = useL();
  const { pick } = useApp();
  const subjects = useSubjects();
  const [tab, setTab] = useState<'subjects' | 'topics' | 'exams'>('subjects');
  const subjOpts = subjects.map((s) => ({ value: s.id, label: pick(s, 'name') }));
  return (
    <div className="space-y-4">
      <PageHeader title={L('বিষয়, টপিক ও পরীক্ষা', 'Subjects, topics & exams')} />
      <div className="inline-flex rounded-full border border-brand-200 bg-white p-0.5 text-sm font-semibold">
        {(['subjects', 'topics', 'exams'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 ${tab === k ? 'bg-brand-600 text-white' : 'text-brand-700'}`}>
            {{ subjects: L('বিষয়', 'Subjects'), topics: L('টপিক', 'Topics'), exams: L('পরীক্ষা (বিগত)', 'Exams (PYQ)') }[k]}
          </button>
        ))}
      </div>
      {tab === 'subjects' && (
        <SimpleCrud table="subjects" order="sort_order" defaults={{ category: 'nursing', sort_order: 99, is_active: true }} fields={[
          { key: 'name_bn', label: 'নাম (বাংলা)', required: true },
          { key: 'name_en', label: 'Name (English)', required: true },
          { key: 'slug', label: 'Slug', required: true },
          { key: 'category', label: L('ধরন', 'Category'), type: 'select', required: true, options: [{ value: 'nursing', label: 'Nursing' }, { value: 'general', label: 'General' }] },
          { key: 'sort_order', label: L('ক্রম', 'Order'), type: 'number' },
          { key: 'is_active', label: L('চালু', 'Active'), type: 'bool' },
        ]} />
      )}
      {tab === 'topics' && (
        <SimpleCrud table="topics" order="subject_id" defaults={{ subject_id: subjOpts[0]?.value }} fields={[
          { key: 'subject_id', label: L('বিষয়', 'Subject'), type: 'select', required: true, options: subjOpts },
          { key: 'name_bn', label: 'নাম (বাংলা)', required: true },
          { key: 'name_en', label: 'Name (English)', required: true },
        ]} />
      )}
      {tab === 'exams' && (
        <SimpleCrud table="exams" order="year" ascending={false} defaults={{ exam_type: 'senior_staff_nurse', year: new Date().getFullYear(), is_active: true }} fields={[
          { key: 'name_bn', label: 'নাম (বাংলা)', required: true },
          { key: 'name_en', label: 'Name (English)', required: true },
          { key: 'exam_type', label: L('পরীক্ষার ধরন', 'Exam type'), type: 'select', required: true, options: [
            { value: 'senior_staff_nurse', label: 'Senior Staff Nurse' }, { value: 'bsc_nursing', label: 'BSc Nursing' },
            { value: 'diploma_nursing', label: 'Diploma Nursing & Midwifery' }, { value: 'other', label: 'Other' }] },
          { key: 'year', label: L('সাল', 'Year'), type: 'number', required: true },
          { key: 'is_active', label: L('চালু', 'Active'), type: 'bool' },
        ]} />
      )}
    </div>
  );
}
