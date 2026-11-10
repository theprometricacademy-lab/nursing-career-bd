import Link from 'next/link';
import { ArrowRight, Crown } from 'lucide-react';

// Server-rendered building blocks for the public guide pages (plain HTML Google can read without running JS).

export function Article({ children }: { children: React.ReactNode }) {
  return <article className="mx-auto max-w-3xl space-y-5">{children}</article>;
}

export function Crumbs({ items }: { items: [href: string, label: string][] }) {
  return (
    <nav aria-label="breadcrumb" className="text-xs text-ink-soft">
      {items.map(([href, label], k) => (
        <span key={href}>
          {k > 0 && <span className="mx-1.5">›</span>}
          {k < items.length - 1 ? <Link href={href} className="hover:text-brand-700">{label}</Link> : <span className="text-ink">{label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Hero({ title, sub, updated }: { title: string; sub: string; updated: string }) {
  return (
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-6 text-white md:p-8">
      <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-blush-400/30 blur-2xl" />
      <div className="relative">
        <h1 className="text-2xl font-bold leading-snug md:text-3xl">{title}</h1>
        <p className="mt-3 text-sm text-brand-50 md:text-base">{sub}</p>
        <p className="mt-3 text-xs text-white/75">হালনাগাদ: {updated}</p>
      </div>
    </header>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card p-5 md:p-6">
      <h2 className="mb-3 text-lg font-bold text-ink md:text-xl">{title}</h2>
      <div className="space-y-3 text-[15px] leading-7 text-ink-soft [&_b]:text-ink [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ul]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

export function Cta({ title, sub }: { title: string; sub: string }) {
  return (
    <aside className="rounded-3xl bg-gradient-to-r from-mint-500 to-brand-600 p-5 text-white md:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-white/90">{sub}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/mock-tests" className="btn bg-white text-brand-700 hover:bg-brand-50">মডেল টেস্ট দিন <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/question-bank" className="btn border border-white/50 bg-white/10 text-white hover:bg-white/20">প্রশ্নব্যাংক দেখুন</Link>
        <Link href="/premium" className="btn border border-white/50 bg-white/10 text-white hover:bg-white/20"><Crown className="h-4 w-4" /> প্রিমিয়াম</Link>
      </div>
    </aside>
  );
}

export function Faq({ items }: { items: [q: string, a: string][] }) {
  const ld = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  };
  return (
    <section className="card p-5 md:p-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <h2 className="mb-2 text-lg font-bold text-ink md:text-xl">সচরাচর জিজ্ঞাসা</h2>
      <div className="divide-y divide-brand-100">
        {items.map(([q, a]) => (
          <details key={q} className="group py-3">
            <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
              <span className="mr-2 text-brand-600 group-open:hidden">+</span><span className="mr-2 hidden text-brand-600 group-open:inline">−</span>{q}
            </summary>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function GuideLinks({ current }: { current?: string }) {
  const all: [string, string, string][] = [
    ['/question-solution', 'সিনিয়র স্টাফ নার্স প্রশ্ন সমাধান', '২০১৬–২০২৬ সালের আসল পরীক্ষার প্রশ্ন ও উত্তর'],
    ['/senior-staff-nurse', 'সিনিয়র স্টাফ নার্স প্রস্তুতি', 'সিলেবাস, মানবণ্টন ও ৬০ দিনের পরিকল্পনা'],
    ['/nursing-job-preparation', 'নার্সিং চাকরির প্রস্তুতি গাইড', 'সরকারি নার্সিং চাকরি ও ভর্তি পরীক্ষার প্রস্তুতি'],
    ['/nursing-mcq', 'নার্সিং MCQ প্রশ্ন ও উত্তর', 'ব্যাখ্যাসহ ফ্রি নমুনা প্রশ্ন'],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {all.filter(([h]) => h !== current).map(([href, t, d]) => (
        <Link key={href} href={href} className="card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="font-semibold text-ink">{t}</div>
          <div className="mt-1 text-sm text-ink-soft">{d}</div>
        </Link>
      ))}
    </div>
  );
}
