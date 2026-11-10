'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, FileQuestion, Upload, FolderTree, Timer, Users, CreditCard, Ticket, Megaphone, Settings, ArrowLeft, Menu, X,
  BellRing,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { LangToggle } from '@/components/AppShell';
import { LogoMark } from '@/components/Logo';

export function useL() {
  const { lang } = useApp();
  return (bn: string, en: string) => (lang === 'bn' ? bn : en);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const L = useL();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = [
    { href: '/admin', icon: LayoutDashboard, label: L('ড্যাশবোর্ড ও পরিসংখ্যান', 'Analytics') },
    { href: '/admin/questions', icon: FileQuestion, label: L('প্রশ্ন', 'Questions') },
    { href: '/admin/import', icon: Upload, label: L('বাল্ক ইমপোর্ট', 'Bulk import') },
    { href: '/admin/catalog', icon: FolderTree, label: L('বিষয়, টপিক ও পরীক্ষা', 'Subjects, topics & exams') },
    { href: '/admin/mock-tests', icon: Timer, label: L('মক টেস্ট', 'Mock tests') },
    { href: '/admin/users', icon: Users, label: L('ইউজার ও প্রিমিয়াম', 'Users & premium') },
    { href: '/admin/payments', icon: CreditCard, label: L('পেমেন্ট', 'Payments') },
    { href: '/admin/coupons', icon: Ticket, label: L('কুপন', 'Coupons') },
    { href: '/admin/notices', icon: Megaphone, label: L('নোটিশ', 'Notices') },
    { href: '/admin/circulars', icon: BellRing, label: L('চাকরির সার্কুলার', 'Job circulars') },
    { href: '/admin/settings', icon: Settings, label: L('সেটিংস ও মূল্য', 'Settings & prices') },
  ];
  const isActive = (h: string) => (h === '/admin' ? path === h : path.startsWith(h));
  const nav = (
    <nav className="flex flex-col gap-0.5">
      {items.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href} onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive(href) ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/10'}`}>
          <Icon className="h-[18px] w-[18px]" />{label}
        </Link>
      ))}
      <Link href="/" className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-brand-200 hover:bg-white/10">
        <ArrowLeft className="h-[18px] w-[18px]" />{L('সাইটে ফিরুন', 'Back to site')}
      </Link>
    </nav>
  );
  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-brand-50/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-brand-100 bg-white px-4">
        <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="menu"><Menu className="h-5 w-5" /></button>
        <LogoMark size={28} />
        <b className="text-ink">Admin · Nursing Career BD</b>
        <div className="ml-auto"><LangToggle compact /></div>
      </header>
      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto bg-ink p-3 lg:block">{nav}</aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-ink p-3">
            <button className="mb-3 text-white" onClick={() => setOpen(false)} aria-label="close"><X className="h-5 w-5" /></button>
            {nav}
          </div>
        </div>
      )}
    </div>
  );
}
