'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Moon, Sun,
  Home, BookOpen, Layers, Timer, History, CalendarCheck, Bookmark, RotateCcw, BarChart3,
  Crown, LayoutDashboard, UserCog, Shield, Menu, X, LogIn, LogOut, BellRing, ArrowLeft, Trophy,
} from 'lucide-react';
import { useApp } from './AppProvider';
import { LogoMark } from './Logo';
import { LegalLinks, SUPPORT_PHONE } from './LegalPage';
import { CircularRail, CircularStrip } from './CircularRail';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { DictKey } from '@/lib/i18n';

const NAV: { href: string; key: DictKey; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: '/', key: 'home', icon: Home },
  { href: '/question-bank', key: 'questionBank', icon: BookOpen },
  { href: '/subject-practice', key: 'subjectPractice', icon: Layers },
  { href: '/mock-tests', key: 'mockTest', icon: Timer },
  { href: '/leaderboard', key: 'leaderboard', icon: Trophy },
  { href: '/previous-questions', key: 'previousYear', icon: History },
  { href: '/daily-quiz', key: 'dailyQuiz', icon: CalendarCheck },
  { href: '/bookmarks', key: 'bookmarks', icon: Bookmark },
  { href: '/wrong-answers', key: 'wrongAnswers', icon: RotateCcw },
  { href: '/results', key: 'results', icon: BarChart3 },
  { href: '/circulars', key: 'circulars', icon: BellRing },
  { href: '/premium', key: 'premium', icon: Crown },
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/profile', key: 'profile', icon: UserCog },
];

const BOTTOM: DictKey[] = ['home', 'questionBank', 'mockTest', 'dashboard'];

export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useApp();
  return (
    <div className="inline-flex rounded-full border border-brand-200 bg-white p-0.5 text-xs font-semibold" role="group" aria-label="Language">
      {(['bn', 'en'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)}
          className={`rounded-full px-2.5 py-1 transition ${lang === l ? 'bg-brand-600 text-white' : 'text-brand-700'}`}>
          {l === 'bn' ? 'বাং' : compact ? 'EN' : 'English'}
        </button>
      ))}
    </div>
  );
}

/** Light / dark switch. The choice is saved in the browser; the layout applies it before first paint. */
export function ThemeToggle() {
  const { lang } = useApp();
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  const flip = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch { /* private mode */ }
  };
  const label = dark ? (lang === 'bn' ? 'লাইট মোড' : 'Light mode') : (lang === 'bn' ? 'ডার্ক মোড' : 'Dark mode');
  return (
    <button onClick={flip} aria-label={label} title={label}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-brand-200 bg-white text-brand-700 transition hover:bg-brand-50">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, user, isAdmin, premium, profile, lang, ready } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const visited = useRef(0);
  useEffect(() => { visited.current += 1; }, [path]);

  // Exam runner and admin have their own chrome
  if (path.startsWith('/exam/') || path.startsWith('/admin')) return <>{children}</>;

  const active = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
  // Go to the previous page; if the visitor landed here directly (e.g. from Google), go home instead
  const goBack = () => { if (visited.current > 1) router.back(); else router.push('/'); };
  const logout = async () => { await supabaseBrowser().auth.signOut(); setOpen(false); router.push('/'); router.refresh(); };

  const navList = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, key, icon: Icon }) => (
        <Link key={href} href={href} onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            active(href) ? 'bg-brand-100 text-brand-800' : 'text-ink-soft hover:bg-brand-50 hover:text-ink'}`}>
          <Icon className={`h-[18px] w-[18px] ${key === 'premium' ? (premium ? 'text-gold-500' : 'text-blush-600') : ''}`} />
          {key === 'premium' && premium ? (lang === 'bn' ? 'আমার প্রিমিয়াম' : 'My Premium') : t(key)}
        </Link>
      ))}
      {isAdmin && (
        <Link href="/admin" onClick={() => setOpen(false)}
          className="mt-2 flex items-center gap-3 rounded-xl bg-ink px-3 py-2.5 text-sm font-semibold text-white">
          <Shield className="h-[18px] w-[18px]" /> {t('admin')}
        </Link>
      )}
    </nav>
  );

  return (
    <div className="min-h-[100dvh] overflow-x-clip">
      <header className={`sticky top-0 z-30 border-b bg-white/90 backdrop-blur ${premium ? 'border-gold-300' : 'border-brand-100'}`}>
        {premium && <div className="h-[3px] bg-gradient-to-r from-gold-300 via-gold-500 to-gold-300" />}
        <div className="mx-auto flex h-14 max-w-7xl items-center 2xl:max-w-[1500px] gap-3 px-4">
          <button className="rounded-lg p-1.5 text-ink lg:hidden" onClick={() => setOpen(true)} aria-label={t('menu')}>
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={32} />
            <span className="text-base font-bold leading-tight text-ink">Nursing Career <span className="text-blush-600">BD</span></span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <LangToggle compact />
            {premium && <Link href="/premium" className="gold-chip"><Crown className="h-3.5 w-3.5" />{t('premium')}</Link>}
            {user ? (
              <Link href="/profile" className={`hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium sm:flex ${premium ? 'bg-gold-50 text-gold-800' : 'bg-brand-50 text-brand-800'}`}>
                <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white ${premium ? 'bg-gradient-to-br from-gold-400 to-gold-600 ring-2 ring-gold-300' : 'bg-brand-600'}`}>
                  {(profile?.full_name || user.email || '?').trim().charAt(0).toUpperCase()}
                </span>
                {(profile?.full_name || '').split(' ')[0]}
              </Link>
            ) : (
              <Link href="/login" className="btn-primary !px-3 !py-1.5"><LogIn className="h-4 w-4" />{t('login')}</Link>
            )}
          </div>
        </div>
      </header>

      <div className={`mx-auto flex max-w-7xl gap-6 px-4 pt-4 lg:pb-10 2xl:max-w-[1500px] ${ready && !user ? 'pb-44' : 'pb-24'}`}>
        <aside className="sticky top-[4.5rem] hidden h-[calc(100vh-5.5rem)] w-60 shrink-0 overflow-y-auto lg:block">
          {navList}
          {user && (
            <button onClick={logout} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-brand-50">
              <LogOut className="h-[18px] w-[18px]" /> {t('logout')}
            </button>
          )}
        </aside>
        <main className="min-w-0 flex-1">
          {path !== '/' && (
            <button onClick={goBack} className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50">
              <ArrowLeft className="h-4 w-4" />{t('back')}
            </button>
          )}
          <CircularStrip />
          {children}
          <footer className="mt-10 border-t border-brand-100 pt-4">
            <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-brand-700">
              <Link href="/question-solution">সিনিয়র স্টাফ নার্স প্রশ্ন সমাধান</Link>
              <Link href="/circulars">নার্সিং চাকরির সার্কুলার</Link>
              <Link href="/senior-staff-nurse">সিনিয়র স্টাফ নার্স প্রস্তুতি</Link>
              <Link href="/nursing-job-preparation">নার্সিং চাকরির প্রস্তুতি</Link>
              <Link href="/nursing-mcq">নার্সিং MCQ প্রশ্ন ও উত্তর</Link>
            </div>
            <LegalLinks />
            <p className="mt-1 text-xs text-ink-soft">© {new Date().getFullYear()} Nursing Career BD · {SUPPORT_PHONE}</p>
          </footer>
        </main>
        <CircularRail />
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><LogoMark size={30} /><b className="text-ink">{t('menu')}</b></div>
              <button onClick={() => setOpen(false)} aria-label={t('close')}><X className="h-5 w-5" /></button>
            </div>
            {navList}
            {user ? (
              <button onClick={logout} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-brand-50">
                <LogOut className="h-[18px] w-[18px]" /> {t('logout')}
              </button>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="btn-primary mt-3 w-full">{t('login')}</Link>
            )}
          </div>
        </div>
      )}

      {/* sticky free sign-up prompt for visitors (phones), above the bottom bar */}
      {ready && !user && !['/signup', '/login', '/forgot-password', '/reset-password'].includes(path) && (
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 px-3 pb-2 lg:hidden">
          <Link href="/signup" className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-mint-500 to-brand-600 px-4 py-3 text-white shadow-lg">
            <span className="flex-1 leading-tight">
              <b className="block text-[15px]">{lang === 'bn' ? 'ফ্রি অ্যাকাউন্ট খুলুন' : 'Create a free account'}</b>
              <span className="text-xs text-white/90">{lang === 'bn' ? 'মোবাইল নম্বর বা Google দিয়ে ১ মিনিটে' : 'With mobile number or Google in a minute'}</span>
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-brand-700">{lang === 'bn' ? 'শুরু করুন' : 'Start'}</span>
          </Link>
        </div>
      )}

      {/* mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-100 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid grid-cols-5">
          {NAV.filter((n) => BOTTOM.includes(n.key)).map(({ href, key, icon: Icon }) => (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active(href) ? 'text-brand-700' : 'text-ink-soft'}`}>
              <Icon className="h-5 w-5" />{t(key)}
            </Link>
          ))}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-ink-soft">
            <Menu className="h-5 w-5" />{t('more')}
          </button>
        </div>
      </nav>
    </div>
  );
}
