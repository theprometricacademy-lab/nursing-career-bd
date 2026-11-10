'use client';
import { Suspense } from 'react';
import { useApp } from '@/components/AppProvider';
import { QuestionBrowser } from '@/components/QuestionBrowser';
import { LoginGate, PageHeader } from '@/components/ui';

export default function WrongAnswersPage() {
  const { t, lang } = useApp();
  return (
    <div>
      <PageHeader title={t('wrongAnswers')}
        sub={lang === 'bn' ? 'যেসব প্রশ্নে সর্বশেষ ভুল করেছেন। আবার সঠিক উত্তর দিলে তালিকা থেকে সরে যাবে।' : 'Questions you got wrong last time. Answer correctly to clear them from this list.'} />
      <LoginGate>
        <Suspense>
          <QuestionBrowser filter="wrong" emptyText={lang === 'bn' ? 'দারুণ! এখন কোনো ভুল উত্তর বাকি নেই।' : 'Great! No wrong answers to practise right now.'} />
        </Suspense>
      </LoginGate>
    </div>
  );
}
