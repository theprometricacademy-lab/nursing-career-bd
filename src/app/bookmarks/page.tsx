'use client';
import { Suspense } from 'react';
import { useApp } from '@/components/AppProvider';
import { QuestionBrowser } from '@/components/QuestionBrowser';
import { LoginGate, PageHeader } from '@/components/ui';

export default function BookmarksPage() {
  const { t, lang } = useApp();
  return (
    <div>
      <PageHeader title={t('bookmarks')} />
      <LoginGate>
        <Suspense>
          <QuestionBrowser filter="bookmarked"
            emptyText={lang === 'bn' ? 'এখনো কোনো প্রশ্ন বুকমার্ক করেননি। প্রশ্নের পাশে বুকমার্ক চিহ্নে চাপ দিন।' : 'No bookmarks yet. Tap the bookmark icon on any question.'} />
        </Suspense>
      </LoginGate>
    </div>
  );
}
