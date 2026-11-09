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

  const load = useCallback(async () => {
    // getSession is local (no network round-trip); RLS still protects all data on the server.
    const { data } = await sb.auth.getSession();
    const u = data.session?.user ?? null;
    setUser(u);
    if (u) {
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
    const { data: sub } = sb.auth.onAuthStateChange(() => { load(); });
    return () => sub.subscription.unsubscribe();
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

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}
