'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MailX } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';

function Inner() {
  const t = useSearchParams().get('t') ?? '';
  const [state, setState] = useState<'wait' | 'done' | 'bad'>('wait');
  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(t)) { setState('bad'); return; }
    supabaseBrowser().rpc('unsubscribe_email', { p_token: t }).then(({ data, error }) => setState(!error && data ? 'done' : 'bad'));
  }, [t]);
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <MailX className="mx-auto h-12 w-12 text-brand-600" />
      {state === 'wait' && <p className="mt-4 text-ink-soft">অপেক্ষা করুন…</p>}
      {state === 'done' && <>
        <h1 className="mt-4 text-xl font-bold text-ink">আর ইমেইল পাঠানো হবে না</h1>
        <p className="mt-2 text-sm text-ink-soft">আপনার অনুরোধ রাখা হয়েছে। মত বদলালে প্রোফাইল পেজ থেকে আবার চালু করতে পারবেন।</p>
      </>}
      {state === 'bad' && <>
        <h1 className="mt-4 text-xl font-bold text-ink">লিংকটি কাজ করছে না</h1>
        <p className="mt-2 text-sm text-ink-soft">লগইন করে প্রোফাইল পেজ থেকে ইমেইল বন্ধ করতে পারবেন।</p>
      </>}
      <Link href="/" className="btn-primary mt-6 inline-flex">হোমে যান</Link>
    </div>
  );
}

export default function UnsubscribePage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
