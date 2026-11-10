'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useApp } from './AppProvider';
import { LogoMark } from './Logo';
import { normalizeBdPhone, phoneToEmail } from '@/lib/phoneAuth';

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
    if (/invalid login credentials/i.test(m)) return bn ? 'মোবাইল নম্বর/ইমেইল বা পাসওয়ার্ড ভুল।' : 'Wrong mobile number/email or password.';
    if (/already registered/i.test(m)) return bn ? 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে। লগইন করুন।' : 'This email is already registered. Please log in.';
    if (/rate limit|too many/i.test(m)) return bn ? 'অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।' : 'Too many attempts. Please try again in a while.';
    return m;
  };
  // The login field accepts either an email or a Bangladeshi mobile number
  const ident = () => {
    const raw = form.email.trim();
    if (raw.includes('@')) return { email: raw, phone: null as string | null, bad: false };
    const p = normalizeBdPhone(raw);
    return p ? { email: phoneToEmail(p), phone: p, bad: false } : { email: raw, phone: null, bad: true };
  };
  const badIdent = () => new Error(lang === 'bn' ? 'সঠিক মোবাইল নম্বর (01XXXXXXXXX) অথবা ইমেইল দিন' : 'Enter a valid mobile number (01XXXXXXXXX) or email');

  const inApp = typeof navigator !== 'undefined' && /FBAN|FBAV|FB_IAB|Instagram|Messenger/i.test(navigator.userAgent);
  async function google() {
    if (inApp) {
      setMsg({ ok: false, text: lang === 'bn'
        ? 'Facebook-এর ভেতরের ব্রাউজারে Google লগইন কাজ করে না। নিচে মোবাইল নম্বর দিয়ে অ্যাকাউন্ট খুলুন, অথবা উপরের ⋯ চেপে "Open in browser" দিয়ে Chrome-এ খুলুন।'
        : "Google sign-in doesn't work inside Facebook's browser. Use your mobile number below, or tap ⋯ → Open in browser." });
      return;
    }
    setBusy(true); setMsg(null);
    const dest = next.startsWith('/') ? next : '/dashboard';
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest)}` },
    });
    if (error) {
      setBusy(false);
      setMsg({ ok: false, text: /provider is not enabled|unsupported provider/i.test(error.message)
        ? (lang === 'bn' ? 'Google লগইন এখনো চালু হয়নি। আপাতত ইমেইল দিয়ে লগইন করুন।' : 'Google sign-in is not enabled yet. Please use email for now.')
        : error.message });
    }
  }
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
        const id = ident();
        if (id.bad) throw badIdent();
        const { error } = await sb.auth.signInWithPassword({ email: id.email, password: form.password });
        if (error) throw error;
        window.location.assign(next.startsWith('/') ? next : '/dashboard');
      } else if (mode === 'signup') {
        const id = ident();
        if (id.bad) throw badIdent();
        if (form.password.length < 8) throw new Error(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' : 'Password must be at least 8 characters');
        if (id.phone) {
          // Mobile-number account: created on the server (no email, no verification), then signed in right away
          const r = await fetch('/api/auth/phone-signup', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name.trim(), phone: id.phone, password: form.password }) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error || 'Error');
          const { error: le } = await sb.auth.signInWithPassword({ email: id.email, password: form.password });
          if (le) throw le;
          window.location.assign('/dashboard');
          return;
        }
        const extraPhone = form.phone.trim() ? normalizeBdPhone(form.phone) : null;
        if (form.phone.trim() && !extraPhone) throw new Error(lang === 'bn' ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01XXXXXXXXX)' : 'Enter a valid Bangladeshi mobile number (01XXXXXXXXX)');
        const { data, error } = await sb.auth.signUp({
          email: id.email, password: form.password,
          options: { data: { full_name: form.name.trim(), phone: extraPhone ?? '' }, emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
        });
        if (error) throw error;
        if (data.session) window.location.assign('/dashboard');
        else setMsg({ ok: true, text: t('checkEmail') });
      } else if (mode === 'forgot') {
        const id = ident();
        if (id.phone) {
          setMsg({ ok: false, text: lang === 'bn'
            ? 'মোবাইল নম্বরে খোলা অ্যাকাউন্টের পাসওয়ার্ড বদলাতে 01710921994 নম্বরে কল বা WhatsApp করুন। আমরা যাচাই করে নতুন পাসওয়ার্ড সেট করে দেব।'
            : 'For accounts opened with a mobile number, call or WhatsApp 01710921994 and we will reset your password after verifying.' });
          return;
        }
        const { error } = await sb.auth.resetPasswordForEmail(id.email, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
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
          <p className="text-sm text-ink-soft">{mode === 'signup'
            ? (lang === 'bn' ? 'Google, Gmail অথবা মোবাইল নম্বর — যেকোনো একটা দিয়ে ১ মিনিটে ফ্রি অ্যাকাউন্ট খুলুন' : 'Sign up free in a minute with Google, Gmail or your mobile number')
            : mode === 'login' ? (lang === 'bn' ? 'Google, মোবাইল নম্বর বা ইমেইল দিয়ে লগইন করুন' : 'Log in with Google, mobile number or email') : t('tagline')}</p>
        </div>
        {(mode === 'login' || mode === 'signup') && (
          <>
            <button type="button" onClick={google} disabled={busy}
              className="btn w-full border border-brand-200 bg-white text-ink hover:bg-brand-50">
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
              {mode === 'signup' ? (lang === 'bn' ? 'এক ক্লিকে Google দিয়ে অ্যাকাউন্ট খুলুন' : 'Sign up with Google in one click') : (lang === 'bn' ? 'এক ক্লিকে Google দিয়ে লগইন' : 'Log in with Google in one click')}
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-ink-soft">
              <span className="h-px flex-1 bg-brand-100" />{lang === 'bn' ? 'অথবা মোবাইল নম্বর / ইমেইল দিয়ে' : 'or with mobile number / email'}<span className="h-px flex-1 bg-brand-100" />
            </div>
          </>
        )}
        <form onSubmit={onSubmit} className="space-y-3">
          {mode === 'signup' && (
            <>
              <div><label className="label">{t('fullName')}</label><input className="input" required value={form.name} onChange={set('name')} autoComplete="name" /></div>
            </>
          )}
          {mode !== 'reset' && (
            <div>
              <label className="label">{lang === 'bn' ? 'মোবাইল নম্বর অথবা ইমেইল' : 'Mobile number or email'}</label>
              <input className="input" required value={form.email} onChange={set('email')} autoComplete="username" autoCapitalize="none" placeholder={lang === 'bn' ? '01XXXXXXXXX অথবা you@gmail.com' : '01XXXXXXXXX or you@gmail.com'} />
            </div>
          )}
          {mode === 'signup' && form.email.includes('@') && (
            <div><label className="label">{t('phone')} <span className="font-normal text-ink-soft">({lang === 'bn' ? 'ঐচ্ছিক' : 'optional'})</span></label>
              <input className="input" inputMode="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={set('phone')} autoComplete="tel" /></div>
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
