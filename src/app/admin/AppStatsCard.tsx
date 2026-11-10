'use client';
import { useEffect, useState } from 'react';
import { Download, Smartphone, Radio, Users } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { Stat } from '@/components/ui';
import { useL } from './AdminShell';

type A = {
  downloads_total: number; downloads_people: number; downloads_today: number; downloads_7d: number;
  app_online: number; app_today: number; app_7d: number; app_total: number; app_members: number;
};

/** Android app: how many downloaded it, and how many use the site through the app. Refreshes every 30 s. */
export function AppStatsCard() {
  const L = useL();
  const { num } = useApp();
  const [a, setA] = useState<A | null>(null);
  useEffect(() => {
    const load = () => supabaseBrowser().rpc('admin_app_stats').then(({ data }) => { if (data) setA(data as A); });
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  if (!a) return null;
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink"><Smartphone className="h-5 w-5 text-mint-600" />{L('Android অ্যাপ', 'Android app')}</h2>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat tone="mint" icon={<Download className="h-5 w-5" />} value={num(a.downloads_total)}
          label={`${L('মোট ডাউনলোড', 'Downloads')} (${L('আজ', 'today')} ${num(a.downloads_today)} · ${L('৭ দিনে', '7d')} ${num(a.downloads_7d)})`} />
        <Stat tone="brand" icon={<Users className="h-5 w-5" />} value={num(a.app_total)}
          label={`${L('অ্যাপ থেকে সাইটে এসেছে', 'People who used the app')} (${num(a.app_members)} ${L('জন লগইন করা', 'signed in')})`} />
        <Stat tone="mint" icon={<Radio className="h-5 w-5" />} value={num(a.app_online)}
          label={L('এখন অ্যাপে সক্রিয় (শেষ ২ মিনিট)', 'Active in the app now (last 2 min)')} />
        <Stat tone="brand" icon={<Smartphone className="h-5 w-5" />} value={num(a.app_today)}
          label={`${L('আজ অ্যাপ ব্যবহারকারী', 'App users today')} (${L('৭ দিনে', '7d')} ${num(a.app_7d)})`} />
      </div>
      <p className="mt-3 text-xs text-ink-soft">{L('ডাউনলোড = হোম পেজের "অ্যাপ ডাউনলোড করুন" বোতামে চাপ। অ্যাপ ব্যবহারকারী = অ্যাপের ভেতর থেকে সাইট খুলেছে এমন ডিভাইস। হিসাব শুরু হয়েছে আজ থেকে।',
        'Downloads = taps on the home-page download button. App users = devices that opened the site inside the app. Counting started today.')}</p>
    </section>
  );
}
