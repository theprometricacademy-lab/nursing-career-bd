'use client';
import { useEffect, useState } from 'react';
import { Radio, Smartphone, UserCheck } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { Stat } from '@/components/ui';
import { useL } from './AdminShell';

type Live = { live: number; app: number; members: number; guests: number; members_today: number; visitors_today: number };

/** Who is on the site right now (seen in the last 2 minutes). Refreshes every 30 s while the page is visible. */
export function LiveCard() {
  const L = useL();
  const { num } = useApp();
  const [v, setV] = useState<Live | null>(null);
  useEffect(() => {
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      supabaseBrowser().rpc('admin_live').then(({ data }) => { if (data) setV(data as Live); });
    };
    load();
    const t = setInterval(load, 30000);
    document.addEventListener('visibilitychange', load);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', load); };
  }, []);
  if (!v) return null;
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
        <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>
        {L('এখন লাইভ', 'Live now')}
      </h2>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Stat tone="mint" icon={<Radio className="h-5 w-5" />} value={num(v.live)} href="/admin/visitors"
          label={`${L('এখন সাইটে আছেন', 'On the site now')} (${L('আজ মোট', 'today')} ${num(v.visitors_today)})`} />
        <Stat tone="brand" icon={<Smartphone className="h-5 w-5" />} value={num(v.app)}
          label={`${L('এর মধ্যে অ্যাপে', 'Of them in the app')} (${L('ব্রাউজারে', 'browser')} ${num(v.live - v.app)})`} />
        <Stat tone="blush" icon={<UserCheck className="h-5 w-5" />} value={num(v.members)}
          label={`${L('অ্যাকাউন্টধারী এখন সক্রিয়', 'Account holders active now')} (${L('আজ', 'today')} ${num(v.members_today)} · ${L('লগইন ছাড়া এখন', 'guests now')} ${num(v.guests)})`} />
      </div>
      <p className="mt-3 text-xs text-ink-soft">{L('শেষ ২ মিনিটে যাদের পেজ খোলা ছিল। ৩০ সেকেন্ড পরপর নিজে থেকে নতুন হয়। অ্যাডমিনের নিজের ভিজিট গোনা হয় না।',
        'People whose page was open in the last 2 minutes. Refreshes every 30 seconds. Admin visits are not counted.')}</p>
    </section>
  );
}
