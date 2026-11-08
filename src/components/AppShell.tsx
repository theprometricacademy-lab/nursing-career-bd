'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Home, BookOpen, Layers, Timer, History, CalendarCheck, Bookmark, RotateCcw, BarChart3,
  Crown, LayoutDashboard, UserCog, Shield, Menu, X, LogIn, LogOut,
} from 'lucide-react';
import { useApp } from './AppProvider';
import { LogoMark } from './Logo';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { DictKey } from '@/lib/i18n';

const NAV: { href: string; key: DictKey; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: '/', key: 'home', icon: Home },
  { href: '/question-bank', key: 'questionBank', icon: BookOpen },
  { href: '/subject-practice', key: 'subjectPractice', icon: Layers },
  { href: '/mock-tests', key: 'mockTest', icon: Timer },
  { href: '/previous-questions', key: 'previousYear', icon: History },
  { href: '/daily-quiz', key: 'dailyQuiz', icon: CalendarCheck },
  { href: '/bookmarks', key: 'bookmarks', icon: Bookmark },
  { href: '/wrong-answers', key: 'wrongAnswers', icon: RotateCcw },
  { href: '/results', key: 'results', icon: BarChart3 },
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, user, isAdmin, premium, profile } = useApp();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Exam runner and admin have their own chrome
  if (path.startsWith('/exam/') || path.startsWith('/admin')) return <>{children}</>;

  const active = (href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));
  const logout = async () => { await supabaseBrowser().auth.signOut(); setOpen(false); router.push('/'); router.refresh(); };

  const navList = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, key, icon: Icon }) => (
        <Link key={href} href={href} onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            active(href) ? 'bg-brand-100 text-brand-800' : 'text-ink-soft hover:bg-brand-50 hover:text-ink'}`}>
          <Icon className={`h-[18px] w-[18px] ${key === 'premium' ? 'text-blush-600' : ''}`} />
          {t(key)}
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <button className="rounded-lg p-1.5 text-ink lg:hidden" onClick={() => setOpen(true)} aria-label={t('menu')}>
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={32} />
            <span className="text-base font-bold leading-tight text-ink">Nursing Career <span className="text-blush-600">BD</span></span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <LangToggle compact />
            {user ? (
              <Link href="/profile" className="hidden items-center gap-2 rounded-full bg-brand-50 py-1 pl-1 pr-3 text-sm font-medium text-brand-800 sm:flex">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {(profile?.full_name || user.email || '?').trim().charAt(0).toUpperCase()}
                </span>
                {premium && <Crown className="h-4 w-4 text-blush-600" />}
              </Link>
            ) : (
              <Link href="/login" className="btn-primary !px-3 !py-1.5"><LogIn className="h-4 w-4" />{t('login')}</Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 pb-24 pt-4 lg:pb-10">
        <aside className="sticky top-[4.5rem] hidden h-[calc(100vh-5.5rem)] w-60 shrink-0 overflow-y-auto lg:block">
          {navList}
          {user && (
            <button onClick={logout} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-brand-50">
              <LogOut className="h-[18px] w-[18px]" /> {t('logout')}
            </button>
          )}
        </aside>
        <main className="min-w-0 flex-1 animate-rise">{children}</main>
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
