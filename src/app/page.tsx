'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BookOpen, Timer, History, BarChart3, CalendarCheck, ArrowRight, GraduationCap,
  CheckCircle2, Crown, UserPlus, Target, TrendingUp, Trophy, ChevronDown, Smartphone, Languages, ChevronRight, Star, Briefcase,
} from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { useSubjects } from '@/components/ui';
import { supabaseBrowser } from '@/lib/supabase/client';
import { GuideLinks } from '@/components/SeoBlocks';
import { QuickQuiz } from '@/components/QuickQuiz';
import { ReviewList } from '@/components/Reviews';
import { NoticeBoard } from '@/components/NoticeBoard';
import { InstallBanner } from '@/components/InstallApp';
import { SEO_SUBJECTS } from '@/lib/seoSubjects';

type Bi = [bn: string, en: string];

const FAQ: { q: Bi; a: Bi }[] = [
  { q: ['এখানে কোন কোন পরীক্ষার প্রস্তুতি নেওয়া যায়?', 'Which exams can I prepare for here?'],
    a: ['PSC-র সিনিয়র স্টাফ নার্স নিয়োগ পরীক্ষা, বিএসসি ও ডিপ্লোমা নার্সিং ভর্তি পরীক্ষা এবং অন্যান্য সরকারি-বেসরকারি নার্সিং নিয়োগ পরীক্ষার প্রস্তুতি নেওয়া যায়।',
        'The PSC Senior Staff Nurse recruitment exam, BSc and Diploma nursing admission tests, and other government and private nursing recruitment exams.'] },
  { q: ['মডেল টেস্টের প্রশ্ন কীভাবে ভাগ করা থাকে?', 'How are mock test questions distributed?'],
    a: ['পূর্ণাঙ্গ মডেল টেস্টে ১০০টি প্রশ্ন থাকে: বাংলা ২০, ইংরেজি ২০, সাধারণ জ্ঞান ২০ এবং নার্সিং বিষয়ে ৪০টি। সময় ৬০ মিনিট, প্রতিটি ভুল উত্তরে ০.৫ নম্বর কাটা যায়।',
        'A full mock test has 100 questions: Bangla 20, English 20, General Knowledge 20 and Nursing 40, in 60 minutes, with 0.5 negative marking per wrong answer.'] },
  { q: ['প্রশ্নগুলো কোন ভাষায়?', 'What language are the questions in?'],
    a: ['PSC পরীক্ষার মতোই প্রশ্ন বাংলায়, আর ইংরেজি বিষয়ের প্রশ্ন ইংরেজিতে। মেডিকেল পরিভাষাগুলো ইংরেজিতে রাখা হয়েছে, প্রতিটি প্রশ্নের সাথে ব্যাখ্যা আছে।',
        'Like the PSC exam, questions are in Bangla and English-subject questions are in English. Medical terms are kept in English, and every question has an explanation.'] },
  { q: ['ফ্রিতে কী কী ব্যবহার করা যায়?', 'What can I use for free?'],
    a: ['ফ্রি অ্যাকাউন্ট খুলে ফ্রি প্রশ্ন অনুশীলন, প্রতিদিনের ডেইলি কুইজ, বুকমার্ক ও অগ্রগতির হিসাব ব্যবহার করা যায়। সব প্রশ্ন ও পূর্ণাঙ্গ মডেল টেস্টের জন্য প্রিমিয়াম প্যাকেজ লাগে।',
        'With a free account you get free practice questions, the daily quiz, bookmarks and progress tracking. Premium unlocks every question and the full mock tests.'] },
  { q: ['প্রিমিয়ামের পেমেন্ট কীভাবে করব?', 'How do I pay for Premium?'],
    a: ['প্রিমিয়াম পেজ থেকে প্যাকেজ বেছে bKash বা Nagad-এ পেমেন্ট করুন। লাইফটাইম প্যাকেজে একবার পেমেন্ট করলেই হয়, প্রতি মাসে টাকা দিতে হয় না।',
        'Choose a package on the Premium page and pay with bKash or Nagad. The Lifetime package is a one-time payment — no monthly fee.'] },
  { q: ['মোবাইলে কি ব্যবহার করা যাবে?', 'Does it work on mobile?'],
    a: ['হ্যাঁ। কোনো অ্যাপ ইনস্টল করা ছাড়াই মোবাইলের ব্রাউজারে পুরো সাইট ব্যবহার করা যায়।',
        'Yes. The whole site works in your phone\'s browser — no app to install.'] },
];

const PATTERN: { label: Bi; n: number; bar: string }[] = [
  { label: ['বাংলা', 'Bangla'], n: 20, bar: 'bg-blush-400' },
  { label: ['ইংরেজি', 'English'], n: 20, bar: 'bg-brand-400' },
  { label: ['সাধারণ জ্ঞান', 'General knowledge'], n: 20, bar: 'bg-mint-400' },
  { label: ['নার্সিং', 'Nursing'], n: 40, bar: 'bg-brand-700' },
];

export default function HomePage() {
  const { t, pick, user, num, lang, premium, profile, ready } = useApp();
  const subjects = useSubjects();
  const [price, setPrice] = useState<number | null>(null);
  const [winter, setWinter] = useState<{ active: boolean; price: number; limit: number; left?: number } | null>(null);
  const [refOff, setRefOff] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(0);
  const i = lang === 'bn' ? 0 : 1;
  const L = (bn: string, en: string) => (lang === 'bn' ? bn : en);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.rpc('winter_offer_status').then(({ data }) => setWinter(data as { active: boolean; price: number; limit: number; left?: number } | null));
    sb.from('app_settings').select('key, value').in('key', ['price_lifetime', 'referral_discount']).then(({ data }) => {
      const m = Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, Number(r.value)]));
      setPrice(m.price_lifetime || null); setRefOff(m.referral_discount || null);
    });
  }, []);

  const features = [
    { icon: BookOpen, title: t('featureBank'), d: t('featureBankD'), href: '/question-bank', tone: 'bg-brand-50 text-brand-700' },
    { icon: Timer, title: t('featureMock'), d: t('featureMockD'), href: '/mock-tests', tone: 'bg-mint-50 text-mint-700' },
    { icon: History, title: t('featurePyq'), d: t('featurePyqD'), href: '/previous-questions', tone: 'bg-blush-50 text-blush-700' },
    { icon: BarChart3, title: t('featureTrack'), d: t('featureTrackD'), href: '/dashboard', tone: 'bg-brand-50 text-brand-700' },
  ];

  // Each stat card opens the matching section
  const stats: [string, string, string][] = [
    [L('১০,০০০+', '10,000+'), L('ব্যাখ্যাসহ প্রশ্ন', 'questions with explanations'), '/question-bank'],
    [subjects.length ? num(subjects.length) : L('১৮', '18'), L('বিষয়', 'subjects'), '/subject-practice'],
    [L('১০০ নম্বর', '100 marks'), L('PSC প্যাটার্নে মডেল টেস্ট', 'PSC-pattern mock tests'), '/mock-tests'],
    premium
      ? [L('প্রিমিয়াম চালু', 'Premium active'), L('সব প্রশ্ন ও মডেল টেস্ট খোলা', 'all questions and mock tests unlocked'), '/premium']
      : [L('প্রিমিয়াম প্যাকেজ', 'Premium package'), winter?.active ? L(`❄️ শীতের অফার ৳${num(winter.price)} · প্রথম ${num(winter.limit)} জন`, `❄️ Winter offer ৳${winter.price} · first ${winter.limit}`) : price ? L(`একবার ৳${num(price)} · আজীবন অ্যাক্সেস`, `one-time ৳${price} · lifetime access`) : L('সব প্রশ্ন ও মডেল টেস্ট খুলুন', 'unlock all questions and mock tests'), '/premium'],
  ];

  const steps = [
    { icon: UserPlus, h: L('ফ্রি অ্যাকাউন্ট খুলুন', 'Create a free account'), d: L('ইমেইল বা Google দিয়ে এক মিনিটে।', 'With email or Google in a minute.') },
    { icon: Target, h: L('অনুশীলন ও মডেল টেস্ট', 'Practise and take mock tests'), d: L('বিষয়ভিত্তিক অনুশীলন, তারপর টাইমারসহ পূর্ণ পরীক্ষা।', 'Subject-wise practice, then full timed exams.') },
    { icon: TrendingUp, h: L('দুর্বলতা ঠিক করুন', 'Fix your weak areas'), d: L('ভুল উত্তর আবার অনুশীলন করুন, অগ্রগতি দেখুন।', 'Retry wrong answers and watch your progress.') },
  ];

  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q[0], acceptedAnswer: { '@type': 'Answer', text: f.a[0] } })),
  };

  return (
    <div className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div className="-mt-2"><NoticeBoard /></div>
      {/* new visitors: something to do on the first screen */}
      {/* rendered in the first HTML (before login state is known) so the first screen shows the quiz at once and never jumps;
          it is removed only for visitors who turn out to be logged in */}
      {(!ready || !user) && <QuickQuiz autoStart />}

      {/* Hero */}
      {premium ? (
        <section className="gold-card p-6 md:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="relative max-w-2xl animate-rise">
            <span className="gold-chip"><Crown className="h-3.5 w-3.5" />{L('প্রিমিয়াম সদস্য', 'Premium member')}</span>
            <h1 className="mt-3 text-2xl font-bold leading-snug md:text-4xl">
              {L('স্বাগতম', 'Welcome')}{profile?.full_name ? <>, <span className="gold-text">{profile.full_name.split(' ')[0]}</span></> : ''}!
            </h1>
            <p className="mt-2 text-sm text-white/80 md:text-base">{L('আপনার জন্য সব প্রশ্ন, সব মডেল টেস্ট আর বিস্তারিত ফলাফল বিশ্লেষণ খোলা। আজ কোথা থেকে শুরু করবেন?', 'Every question, every mock test and full analysis are unlocked for you. Where do you want to start today?')}</p>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['/mock-tests', Timer, L('মডেল টেস্ট দিন', 'Take a mock test')],
                ['/wrong-answers', Target, L('ভুলগুলো আবার করুন', 'Retry mistakes')],
                ['/leaderboard', Trophy, L('সাপ্তাহিক মেধাতালিকা', 'Weekly leaderboard')],
                ['/jobs', Briefcase, L('প্রাইভেট হাসপাতালে চাকরি', 'Private hospital jobs')],
                ['/dashboard#review', Star, L('রিভিউ দিন', 'Write a review')],
              ].map(([href, Icon, label]) => {
                const I = Icon as typeof Timer;
                return (
                  <Link key={href as string} href={href as string} className="flex items-center gap-2.5 rounded-2xl border border-gold-400/40 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 text-gold-900"><I className="h-5 w-5" /></span>{label as string}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-6 text-white md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blush-400/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-mint-300/30 blur-2xl" />
        <div className="relative max-w-2xl animate-rise">
          <span className="chip bg-white/15 text-white">{t('tagline')}</span>
          <h1 className="mt-3 text-2xl font-bold leading-snug md:text-4xl">{t('heroTitle')}</h1>
          <p className="mt-3 text-sm text-brand-50 md:text-base">{t('heroSub')}</p>
          <ul className="mt-4 grid gap-1.5 text-sm text-white/95 sm:grid-cols-2">
            {[L('সিনিয়র স্টাফ নার্স (PSC) প্যাটার্ন', 'Senior Staff Nurse (PSC) pattern'), L('প্রতিটি প্রশ্নে ব্যাখ্যা', 'Explanation for every question'),
              L('নেগেটিভ মার্কিংসহ আসল পরীক্ষার পরিবেশ', 'Real exam feel with negative marking'), L('ভুল উত্তর আলাদা করে অনুশীলন', 'Practise your wrong answers')].map((x) => (
              <li key={x} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-mint-300" />{x}</li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={user ? '/mock-tests' : '/signup'} className="btn bg-mint-400 text-ink hover:bg-mint-300">
              {user ? t('startNow') : t('getStarted')} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/question-bank" className="btn border border-white/40 bg-white/10 text-white hover:bg-white/20">{t('exploreQuestions')}</Link>
          </div>
          {!user && (
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/85 md:text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-semibold text-white">
                <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                {L('এক ক্লিকে Google', 'One-click Google')}
              </span>
              {L('অথবা Gmail / মোবাইল নম্বর দিয়ে ১ মিনিটে ফ্রি অ্যাকাউন্ট', 'or Gmail / mobile number — free account in a minute')}
            </p>
          )}
        </div>
      </section>
      )}


      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([v, l, href]) => {
          const isPremiumCard = href === '/premium';
          const inner = (
            <>
              <div className={`flex items-center justify-between gap-2 text-lg font-bold md:text-xl ${isPremiumCard ? 'text-gold-700' : 'text-brand-700'}`}>
                <span className="flex items-center gap-1.5">{isPremiumCard && <Crown className="h-5 w-5 shrink-0 text-gold-500" />}{v}</span>
                <ChevronRight className={`h-4 w-4 shrink-0 ${isPremiumCard ? 'text-gold-400' : 'text-brand-300'}`} />
              </div>
              <div className="text-xs text-ink-soft md:text-sm">{l}</div>
            </>
          );
          const cls = `card block px-4 py-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-md active:scale-[.98] ${isPremiumCard ? '!border-gold-300 bg-gradient-to-br from-gold-50 to-white' : ''}`;
          return <Link key={l} href={href} className={cls}>{inner}</Link>;
        })}
      </section>

      <Link href="/weekly-test" className="card flex items-center gap-4 border-blush-200 bg-gradient-to-r from-blush-50 to-white p-4 transition hover:shadow-md">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-blush-500 text-white"><Trophy className="h-6 w-6" /></span>
        <div className="flex-1">
          <div className="font-semibold text-ink">{L('সাপ্তাহিক ফ্রি মডেল টেস্ট', 'Free weekly model test')}</div>
          <div className="text-sm text-ink-soft">{L('প্রতি সপ্তাহে নতুন · যেকোনো সময় দিন · সবার মধ্যে র‍্যাংকিং', 'New every week · any time · ranked among everyone')}</div>
        </div>
        <ArrowRight className="h-5 w-5 text-blush-600" />
      </Link>

      <Link href="/jobs" className="card flex items-center gap-4 border-brand-200 bg-gradient-to-r from-brand-50 to-white p-4 transition hover:shadow-md">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-700 to-mint-500 text-white"><Briefcase className="h-6 w-6" /></span>
        <div className="flex-1">
          <div className="font-semibold text-ink">{L('প্রাইভেট হাসপাতালে নার্স নিয়োগ', 'Private hospital nurse jobs')}</div>
          <div className="text-sm text-ink-soft">{L('একবার সিভি তৈরি করুন, এখান থেকেই আবেদন করুন', 'Make your CV once and apply from here')}</div>
        </div>
        <ArrowRight className="h-5 w-5 text-brand-600" />
      </Link>

      <Link href="/daily-quiz" className="card flex items-center gap-4 border-mint-200 bg-gradient-to-r from-mint-50 to-white p-4 transition hover:shadow-md">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint-500 text-white"><CalendarCheck className="h-6 w-6" /></span>
        <div className="flex-1">
          <div className="font-semibold text-ink">{t('dailyQuiz')}</div>
          <div className="text-sm text-ink-soft">{num(10)} {t('questions')} · {num(10)} {t('minutes')}</div>
        </div>
        <ArrowRight className="h-5 w-5 text-mint-600" />
      </Link>

      <InstallBanner />

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">{L('যা যা পাচ্ছেন', 'What you get')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {features.map(({ icon: Icon, title, d, href, tone }) => (
            <Link key={href} href={href} className="card group p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
              <h3 className="mt-3 font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{d}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 opacity-80 group-hover:opacity-100">
                {L('দেখুন', 'Open')} <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Exam pattern + how it works */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold text-ink">{L('মডেল টেস্টের মানবণ্টন', 'Mock test mark distribution')}</h2>
          <p className="mt-1 text-sm text-ink-soft">{L('সিনিয়র স্টাফ নার্স পরীক্ষার প্যাটার্নে ১০০ নম্বর, ৬০ মিনিট', 'Senior Staff Nurse pattern: 100 marks, 60 minutes')}</p>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full">
            {PATTERN.map((p) => <div key={p.label[1]} className={p.bar} style={{ width: `${p.n}%` }} />)}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-2">
            {PATTERN.map((p) => (
              <li key={p.label[1]} className="flex items-center justify-between rounded-xl bg-brand-50/60 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-ink"><span className={`h-2.5 w-2.5 rounded-full ${p.bar}`} />{p.label[i]}</span>
                <b className="text-ink">{num(p.n)}</b>
              </li>
            ))}
          </ul>
          <Link href="/mock-tests" className="btn-ghost mt-4 w-full">{L('মডেল টেস্ট দিন', 'Take a mock test')} <ArrowRight className="h-4 w-4" /></Link>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-ink">{L('কীভাবে প্রস্তুতি নেবেন', 'How it works')}</h2>
          <ol className="mt-4 space-y-4">
            {steps.map(({ icon: Icon, h, d }, k) => (
              <li key={h} className="flex gap-3">
                <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
                  <Icon className="h-5 w-5" />
                  <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-blush-500 text-[11px] font-bold text-white">{num(k + 1)}</span>
                </span>
                <div><div className="font-semibold text-ink">{h}</div><p className="text-sm text-ink-soft">{d}</p></div>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-ink-soft">
            <span className="chip bg-mint-50 py-1 text-mint-700"><Smartphone className="h-3.5 w-3.5" />{L('মোবাইলে চলে, অ্যাপ লাগে না', 'Works on mobile, no app')}</span>
            <span className="chip bg-brand-50 py-1 text-brand-700"><Languages className="h-3.5 w-3.5" />{L('বাংলা / English', 'Bangla / English')}</span>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink"><GraduationCap className="h-5 w-5 text-brand-600" />{t('examsCovered')}</h2>
        <div className="flex flex-wrap gap-2">
          {(['bscExam', 'diplomaExam', 'ssnExam', 'otherExam'] as const).map((k, n) => (
            <span key={k} className={`chip py-1.5 text-sm ${['bg-brand-100 text-brand-800', 'bg-mint-100 text-mint-700', 'bg-blush-100 text-blush-700', 'bg-brand-50 text-brand-700'][n]}`}>{t(k)}</span>
          ))}
        </div>
      </section>

      {subjects.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          {(['nursing', 'general'] as const).map((cat) => (
            <div key={cat} className="card p-5">
              <h2 className="mb-3 font-semibold text-ink">{cat === 'nursing' ? t('nursingSubjects') : t('generalSubjects')}</h2>
              <div className="flex flex-wrap gap-2">
                {subjects.filter((s) => s.category === cat).map((s) => (
                  <Link key={s.id} href={`/question-bank?subject=${s.id}`}
                    className={`chip py-1.5 text-sm transition ${cat === 'nursing' ? 'bg-brand-50 text-brand-800 hover:bg-brand-100' : 'bg-mint-50 text-mint-700 hover:bg-mint-100'}`}>
                    {pick(s, 'name')}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {!premium && <ReviewList />}

      {/* Premium band */}
      {!premium && (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blush-600 to-blush-500 p-5 text-white md:p-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-xl" />
          <div className="relative flex flex-wrap items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20"><Crown className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">{L('প্রিমিয়াম নিন — সব প্রশ্ন ও সব মডেল টেস্ট', 'Go Premium — every question and every mock test')}</h2>
              <p className="text-sm text-white/90">
                {winter?.active && price
                  ? <>{L('লাইফটাইম অ্যাক্সেস ', 'Lifetime access ')}<s className="opacity-75">৳{num(price)}</s> <b className="text-base text-white">৳{num(winter.price)}</b>{L(' — একবার পেমেন্ট, মাসিক চার্জ নেই।', ' — one-time, no monthly fee.')}</>
                  : price ? L(`একবার ৳${num(price)} পেমেন্টে লাইফটাইম অ্যাক্সেস। মাসিক কোনো চার্জ নেই।`, `Lifetime access for a one-time ৳${price}. No monthly fee.`)
                  : L('একবারের পেমেন্টে লাইফটাইম অ্যাক্সেস। মাসিক কোনো চার্জ নেই।', 'Lifetime access for a one-time payment. No monthly fee.')}
              </p>
            </div>
            <Link href="/premium" className="btn bg-white text-blush-700 hover:bg-blush-50">{winter?.active ? L('অফারে নিন', 'Get the offer') : L('প্রিমিয়াম দেখুন', 'See Premium')} <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {/* running offers */}
          <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
            {winter?.active && (
              <Link href="/premium" className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/25 transition hover:bg-white/25">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{L('চলমান অফার', 'Running offer')}</p>
                <p className="mt-0.5 font-bold">❄️ {L('শীতের অফার', 'Winter offer')}: ৳{num(winter.price)}{price ? <span className="ml-1 text-sm font-medium line-through opacity-70">৳{num(price)}</span> : null}</p>
                <p className="text-xs text-white/90">{L(`প্রথম ${num(winter.limit)} জনের জন্য`, `For the first ${winter.limit}`)}{typeof winter.left === 'number' ? L(` · বাকি ${num(winter.left)} জন`, ` · ${winter.left} left`) : ''}</p>
                {typeof winter.left === 'number' && winter.limit > 0 && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${Math.max(4, Math.round(((winter.limit - winter.left) / winter.limit) * 100))}%` }} /></div>
                )}
              </Link>
            )}
            <Link href="/question-solution" className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/25 transition hover:bg-white/25">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{L('ফ্রিতে পড়ুন', 'Free to read')}</p>
              <p className="mt-0.5 font-bold">📘 {L('বিগত সালের প্রশ্নের সমাধান', 'Previous-year paper solutions')}</p>
              <p className="text-xs text-white/90">{L('সঠিক উত্তর ও ব্যাখ্যাসহ', 'with answers and explanations')}</p>
            </Link>
            {refOff ? (
              <Link href="/premium" className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/25 transition hover:bg-white/25">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{L('রেফারেল', 'Referral')}</p>
                <p className="mt-0.5 font-bold">🤝 {L(`বন্ধুর কোডে ৳${num(refOff)} ছাড়`, `৳${refOff} off with a friend's code`)}</p>
                <p className="text-xs text-white/90">{price ? L(`মূল দাম ৳${num(price)} থেকে`, `from the full ৳${price}`) : ''}</p>
              </Link>
            ) : null}
          </div>
        </section>
      )}


      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">{L('প্রস্তুতি গাইড ও MCQ', 'Preparation guides & MCQs')}</h2>
        <GuideLinks />
        <div className="mt-3 flex flex-wrap gap-2">
          {SEO_SUBJECTS.filter((s) => s.nursing).map((s) => (
            <Link key={s.slug} href={`/mcq/${s.slug}`} className="chip bg-white py-1.5 text-sm text-brand-800 ring-1 ring-brand-100 hover:bg-brand-50">{s.bn} MCQ</Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="card p-5">
        <h2 className="mb-2 text-lg font-bold text-ink">{L('সচরাচর জিজ্ঞাসা', 'Frequently asked questions')}</h2>
        <div className="divide-y divide-brand-100">
          {FAQ.map((f, k) => (
            <div key={k}>
              <button onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k}
                className="flex w-full items-center justify-between gap-3 py-3 text-left font-semibold text-ink">
                <span>{f.q[i]}</span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-brand-600 transition ${open === k ? 'rotate-180' : ''}`} />
              </button>
              <p className={`pb-3 text-sm leading-6 text-ink-soft ${open === k ? '' : 'hidden'}`}>{f.a[i]}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
