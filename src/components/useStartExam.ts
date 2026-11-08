'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';

export type StartArgs = {
  mode: 'mock' | 'daily' | 'pyq' | 'custom';
  mockTest?: number; subject?: number | null; exam?: number; count?: number; minutes?: number;
};

export function useStartExam() {
  const router = useRouter();
  const { user, errMsg } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  async function start(a: StartArgs, key = a.mode) {
    if (!user) { router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`); return; }
    setBusy(key); setErr('');
    const { data, error } = await supabaseBrowser().rpc('start_attempt', {
      p_mode: a.mode, p_mock_test: a.mockTest ?? null, p_subject: a.subject ?? null,
      p_exam: a.exam ?? null, p_count: a.count ?? null, p_minutes: a.minutes ?? null,
    });
    if (error) {
      setBusy(null);
      if (error.message.includes('premium_required')) { router.push('/premium' + (a.mockTest ? `?test=${a.mockTest}` : '')); return; }
      setErr(errMsg(error));
      return;
    }
    router.push(`/exam/${data}`);
  }
  return { start, busy, err };
}
