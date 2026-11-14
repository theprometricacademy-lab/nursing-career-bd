'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Crown, LogOut, Shield } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from '@/components/AppProvider';
import { PageHeader, Spinner } from '@/components/ui';
import { ProfilePhoto } from '@/components/ProfilePhoto';
import { MemberCard } from '@/components/MemberCard';
import { BoardConsent } from '@/components/BoardConsent';
import { NotifySettings } from '@/components/NotifySettings';

export default function ProfilePage() {
  const { t, lang, setLang, user, profile, premium, isAdmin, refresh, ready } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ full_name: '', phone: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (profile) setForm({ full_name: profile.full_name ?? '', phone: profile.phone ?? '' }); }, [profile]);

  if (!ready || !user) return <Spinner />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const { error } = await supabaseBrowser().from('profiles')
      .update({ full_name: form.full_name.trim().slice(0, 100), phone: form.phone.trim().slice(0, 20) }).eq('id', user!.id);
    setBusy(false);
    setMsg(error ? error.message : t('profileSaved'));
    if (!error) refresh();
  }

  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.push('/'); router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader title={t('profile')} />
      <MemberCard />
      <section className="card p-5">
        <h2 className="mb-3 font-semibold text-ink">{t('language')}</h2>
        <div className="grid grid-cols-2 gap-2">
          {(['bn', 'en'] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={`rounded-xl border p-3 text-sm font-semibold transition ${lang === l ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-100' : 'border-brand-100 text-ink-soft'}`}>
              {l === 'bn' ? 'বাংলা' : 'English'}
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold text-ink">{t('accountInfo')}</h2>
        <div className="mb-4"><ProfilePhoto /></div>
        <form onSubmit={save} className="space-y-3">
          <div><label className="label">{t('email')}</label><input className="input bg-brand-50/50" value={user.email ?? ''} disabled /></div>
          <div><label className="label">{t('fullName')}</label><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><label className="label">{t('phone')}</label><input className="input" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          {msg && <p className="rounded-xl bg-mint-50 p-2 text-sm text-mint-700">{msg}</p>}
          <button className="btn-primary" disabled={busy}>{busy ? t('loading') : t('save')}</button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold text-ink">{lang === 'bn' ? 'নোটিফিকেশন' : 'Notifications'}</h2>
        <NotifySettings />
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-semibold text-ink">{lang === 'bn' ? 'সাপ্তাহিক টেস্টের বিজয়ী পোস্ট' : 'Weekly test winner post'}</h2>
        <BoardConsent />
      </section>

      <section className="card flex items-center justify-between p-5">
        <div>
          <h2 className="font-semibold text-ink">{t('premiumStatus')}</h2>
          <p className={`text-sm ${premium ? 'text-blush-700' : 'text-ink-soft'}`}>{premium ? t('active') : t('inactive')}</p>
        </div>
        {!premium && <Link href="/premium" className="btn-pink"><Crown className="h-4 w-4" />{t('upgrade')}</Link>}
      </section>

      <div className="flex flex-wrap gap-2">
        {isAdmin && <Link href="/admin" className="btn bg-ink text-white"><Shield className="h-4 w-4" />{t('admin')}</Link>}
        <button onClick={logout} className="btn-ghost"><LogOut className="h-4 w-4" />{t('logout')}</button>
      </div>
    </div>
  );
}
