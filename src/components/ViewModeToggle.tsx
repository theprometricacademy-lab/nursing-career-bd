'use client';
import { useApp } from './AppProvider';
import type { ViewMode } from './examTypes';

/** Question language: as on the real exam paper, or force Bangla / English (translatable subjects only) */
export function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (m: ViewMode) => void }) {
  const { t } = useApp();
  const opts: { v: ViewMode; label: string }[] = [
    { v: 'real', label: t('realExam') }, { v: 'bn', label: 'বাং' }, { v: 'en', label: 'EN' },
  ];
  return (
    <div className="inline-flex rounded-full border border-brand-200 bg-white p-0.5 text-xs font-semibold" role="group" aria-label={t('questionLang')}>
      {opts.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`whitespace-nowrap rounded-full px-2.5 py-1 transition ${value === o.v ? 'bg-brand-600 text-white' : 'text-brand-700'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
