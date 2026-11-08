'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';

export default function PaymentResultPage() {
  return <Suspense><View /></Suspense>;
}

/** Reads the payment row (verified server-side) — never trusts the URL status alone. */
function View() {
  const { t, refresh } = useApp();
  const params = useSearchParams();
  const id = params.get('id');
  const [status, setStatus] = useState<'pending' | 'paid' | 'failed'>('pending');

  useEffect(() => {
    if (!id) { setStatus('failed'); return; }
    let tries = 0;
    const sb = supabaseBrowser();
    const check = async () => {
      const { data } = await sb.from('payments').select('status').eq('id', id).maybeSingle();
      const s = data?.status;
      if (s === 'paid') { setStatus('paid'); refresh(); return; }
      if (s && s !== 'pending') { setStatus('failed'); return; }
      if (++tries > 10) { setStatus(params.get('status') === 'success' ? 'pending' : 'failed'); return; }
      setTimeout(check, 2000);
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="card flex flex-col items-center gap-3 p-8 text-center">
        {status === 'paid' && <CheckCircle2 className="h-14 w-14 text-mint-500" />}
        {status === 'failed' && <XCircle className="h-14 w-14 text-red-500" />}
        {status === 'pending' && <Loader2 className="h-14 w-14 animate-spin text-brand-500" />}
        <p className="text-lg font-semibold text-ink">{status === 'paid' ? t('paySuccess') : status === 'failed' ? t('payFailed') : t('payPending')}</p>
        <div className="mt-2 flex gap-2">
          {status === 'paid' ? <Link href="/mock-tests" className="btn-success">{t('startNow')}</Link> : <Link href="/premium" className="btn-pink">{t('premium')}</Link>}
          <Link href="/dashboard" className="btn-ghost">{t('dashboard')}</Link>
        </div>
      </div>
    </div>
  );
}
