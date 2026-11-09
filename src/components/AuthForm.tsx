'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';
import { LogoMark } from './Logo';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';

export function AuthForm({ mode }: { mode: Mode }) {
  const { t, lang } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const sb = supabaseBrowser();
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const friendly = (m: string) => {
    const bn = lang === 'bn';
    if (/email not confirmed/i.test(m)) return bn ? 'ইমেইল এখনো ভেরিফাই হয়নি। ইমেইলে পাঠানো লিংকে চাপুন (Spam/Promotions ফোল্ডারও দেখুন), অথবা নিচের বাটনে চাপ দিয়ে লিংক আবার নিন।' : 'Email not verified yet. Click the link we emailed you (check Spam/Promotions), or resend it below.';
    if (/invalid login credentials/i.test(m)) return bn ? 'ইমেইল বা পাসওয়ার্ড ভুল।' : 'Wrong email or password.';
    if (/already registered/i.test(m)) return bn ? 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে। লগইন করুন।' : 'This email is already registered. Please log in.';
    if (/rate limit|too many/i.test(m)) return bn ? 'অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।' : 'Too many attempts. Please try again in a while.';
    return m;
  };
  async function resend() {
    setBusy(true);
    const { error } = await sb.auth.resend({ type: 'signup', email: form.email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` } });
    setBusy(false);
    setMsg(error ? { ok: false, text: friendly(error.message) } : { ok: true, text: lang === 'bn' ? 'ভেরিফিকেশন লিংক আবার পাঠানো হয়েছে। ইমেইল দেখুন।' : 'Verification link sent again. Check your email.' });
  }
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const origin = window.location.origin;
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
        router.replace(next.startsWith('/') ? next : '/dashboard');
        router.refresh();
      } else if (mode === 'signup') {
        if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(form.phone.replace(/[\s-]/g, ''))) {
          throw new Error(lang === 'bn' ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)' : 'Enter a valid Bangladeshi mobile number (01XXXXXXXXX)');
        }
        if (form.password.length < 8) throw new Error(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' : 'Password must be at least 8 characters');
        const { data, error } = await sb.auth.signUp({
          email: form.email.trim(), password: form.password,
          options: { data: { full_name: form.name.trim(), phone: form.phone.trim() }, emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
        });
        if (error) throw error;
        if (data.session) { router.replace('/dashboard'); router.refresh(); }
        else setMsg({ ok: true, text: t('checkEmail') });
      } else if (mode === 'forgot') {
        const { error } = await sb.auth.resetPasswordForEmail(form.email.trim(), { redirectTo: `${origin}/auth/callback?next=/reset-password` });
        if (error) throw error;
        setMsg({ ok: true, text: t('resetSent') });
      } else {
        if (form.password.length < 8) throw new Error(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' : 'Password must be at least 8 characters');
        const { error } = await sb.auth.updateUser({ password: form.password });
        if (error) throw error;
        router.replace('/dashboard');
      }
    } catch (err) {
      const m = (err as Error).message || '';
      if (/email not confirmed/i.test(m)) setNeedsConfirm(true);
      setMsg({ ok: false, text: friendly(m) });
    } finally {
      setBusy(false);
    }
  }

  const title = { login: t('login'), signup: t('signup'), forgot: t('forgotPassword'), reset: t('newPassword') }[mode];

  return (
    <div className="mx-auto max-w-md py-4">
      <div className="card p-6">
        <div className="mb-5 flex flex-col items-center text-center">
          <LogoMark size={48} />
          <h1 className="mt-3 text-xl font-bold text-ink">{title}</h1>
          <p className="text-sm text-ink-soft">{t('tagline')}</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          {mode === 'signup' && (
            <>
              <div><label className="label">{t('fullName')}</label><input className="input" required value={form.name} onChange={set('name')} autoComplete="name" /></div>
              <div><label className="label">{t('phone')}</label><input className="input" required inputMode="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={set('phone')} autoComplete="tel" /></div>
            </>
          )}
          {mode !== 'reset' && (
            <div><label className="label">{t('email')}</label><input className="input" type="email" required value={form.email} onChange={set('email')} autoComplete="email" /></div>
          )}
          {mode !== 'forgot' && (
            <div>
              <label className="label">{mode === 'reset' ? t('newPassword') : t('password')}</label>
              <input className="input" type="password" required minLength={mode === 'login' ? 1 : 8} value={form.password} onChange={set('password')}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>
          )}
          {msg && <p className={`rounded-xl p-3 text-sm ${msg.ok ? 'bg-mint-50 text-mint-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
          {needsConfirm && mode === 'login' && (
            <button type="button" className="btn-ghost w-full" disabled={busy || !form.email} onClick={resend}>
              {lang === 'bn' ? 'ভেরিফিকেশন লিংক আবার পাঠান' : 'Resend verification link'}
            </button>
          )}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? t('loading') : mode === 'forgot' ? t('sendReset') : mode === 'reset' ? t('updatePassword') : title}
          </button>
        </form>
        <div className="mt-4 space-y-1 text-center text-sm text-ink-soft">
          {mode === 'login' && (
            <>
              <p><Link href="/forgot-password" className="text-brand-700 hover:underline">{t('forgotPassword')}</Link></p>
              <p>{t('noAccount')} <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-blush-600 hover:underline">{t('signup')}</Link></p>
            </>
          )}
          {mode === 'signup' && <p>{t('haveAccount')} <Link href="/login" className="font-semibold text-brand-700 hover:underline">{t('login')}</Link></p>}
          {mode === 'forgot' && <p><Link href="/login" className="text-brand-700 hover:underline">{t('back')}</Link></p>}
        </div>
      </div>
    </div>
  );
}
