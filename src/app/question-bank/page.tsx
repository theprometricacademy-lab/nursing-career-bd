'use client';
import { Suspense } from 'react';
import { useApp } from '@/components/AppProvider';
import { QuestionBrowser } from '@/components/QuestionBrowser';
import { PageHeader } from '@/components/ui';

export default function QuestionBankPage() {
  const { t } = useApp();
  return (
    <div>
      <PageHeader title={t('questionBank')} sub={t('featureBankD')} />
      <Suspense><QuestionBrowser /></Suspense>
    </div>
  );
}
