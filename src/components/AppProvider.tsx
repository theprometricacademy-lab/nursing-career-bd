'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase/client';
import { dictionaries, errorText, toBnDigits, type DictKey, type Lang } from '@/lib/i18n';

export type Profile = { id: string; full_name: string | null; phone: string | null; role: 'student' | 'admin'; language: Lang };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: DictKey, vars?: Record<string, string | number>) => string;
  /** pick obj[`${field}_bn`] or obj[`${field}_en`] by current language */
  pick: (obj: Record<string, unknown> | null | undefined, field: string) => string;
  num: (n: number | string | null | undefined) => string;
  errMsg: (e: unknown) => string;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  premium: boolean;
  ready: boolean;
  refresh: () => Promise<void>;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  const sb = supabaseBrowser();
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [premium, setPremium] = useState(false);
  const [ready, setReady] = useState(false);
  const [kicked, setKicked] = useState(false);

  const load = useCallback(async () => {
    // getSession is local (no network round-trip); RLS still protects all data on the server.
    const { data } = await sb.auth.getSession();
    const u = data.session?.user ?? null;
    setUser(u);
    if (u) {
      // One account = one device: the newest login wins, older devices are signed out here
      const { data: allowed } = await sb.rpc('claim_session', { p_label: navigator.userAgent.slice(0, 60) });
      if (allowed === false) {
        await sb.auth.signOut({ scope: 'local' });
        setKicked(true);
        return;
      }
      const [{ data: p }, { data: subs }] = await Promise.all([
        sb.from('profiles').select('id, full_name, phone, role, language').eq('id', u.id).maybeSingle(),
        sb.from('subscriptions').select('id').eq('user_id', u.id).eq('plan', 'lifetime').eq('status', 'active').limit(1),
      ]);
      setProfile((p as Profile) ?? null);
      setPremium(!!subs && subs.length > 0);
      if (p?.language && p.language !== lang) {
        setLangState(p.language as Lang);
        document.cookie = `lang=${p.language}; path=/; max-age=31536000; samesite=lax`;
      }
    } else {
      setProfile(null);
      setPremium(false);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sb]);

  useEffect(() => {
    load();
    const { data: sub } = sb.auth.onAuthStateChange((event) => { if (event !== 'TOKEN_REFRESHED') load(); });
    // re-check now and then, and whenever the tab comes back, so a second phone is noticed quickly
    const recheck = () => { if (document.visibilityState === 'visible') load(); };
    const t = setInterval(recheck, 120000);
    document.addEventListener('visibilitychange', recheck);
    return () => { sub.subscription.unsubscribe(); clearInterval(t); document.removeEventListener('visibilitychange', recheck); };
  }, [sb, load]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  // apply the language saved in the browser (layout is static, so the server can't read it)
  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )lang=(bn|en)/);
    if (m && m[1] !== lang) setLangState(m[1] as Lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    if (user) sb.from('profiles').update({ language: l }).eq('id', user.id).then(() => {});
  }, [sb, user]);

  const value = useMemo<Ctx>(() => {
    const dict = dictionaries[lang];
    const num = (n: number | string | null | undefined) => {
      if (n === null || n === undefined || n === '') return lang === 'bn' ? '০' : '0';
      return lang === 'bn' ? toBnDigits(n) : String(n);
    };
    return {
      lang, setLang, user, profile, premium, ready,
      isAdmin: profile?.role === 'admin',
      refresh: load,
      num,
      t: (k, vars) => {
        let s = dict[k] ?? k;
        if (vars) for (const [key, v] of Object.entries(vars)) s = s.replace(`{${key}}`, num(v));
        return s;
      },
      pick: (obj, field) => {
        if (!obj) return '';
        const primary = obj[`${field}_${lang}`];
        const fallback = obj[`${field}_${lang === 'bn' ? 'en' : 'bn'}`];
        return String(primary ?? fallback ?? '');
      },
      errMsg: (e) => {
        const msg = (e as { message?: string })?.message ?? String(e);
        const code = Object.keys(errorText).find((c) => msg.includes(c));
        return code ? errorText[code][lang] : (lang === 'bn' ? dictionaries.bn.error : msg || dictionaries.en.error);
      },
    };
  }, [lang, setLang, user, profile, premium, ready, load]);

  return (
    <AppCtx.Provider value={value}>
      {children}
      {kicked && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/50" />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-blush-100 text-3xl">📱</div>
            <h2 className="text-lg font-bold text-ink">{lang === 'bn' ? 'অন্য ডিভাইসে লগইন হয়েছে' : 'Signed in on another device'}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{lang === 'bn'
              ? 'একটি অ্যাকাউন্ট একসাথে একটি ডিভাইসেই চালানো যায়। অন্য একটি ডিভাইস থেকে লগইন করায় এই ডিভাইস থেকে লগআউট করা হয়েছে। আপনি নিজে না করে থাকলে আবার লগইন করে পাসওয়ার্ড বদলে নিন।'
              : 'An account can be used on one device at a time. Because it was signed in on another device, this device was signed out. If that was not you, sign in again and change your password.'}</p>
            <div className="mt-5 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setKicked(false)}>{lang === 'bn' ? 'ঠিক আছে' : 'OK'}</button>
              <a href="/login" className="btn-primary flex-1">{lang === 'bn' ? 'আবার লগইন' : 'Sign in again'}</a>
            </div>
          </div>
        </div>
      )}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}
