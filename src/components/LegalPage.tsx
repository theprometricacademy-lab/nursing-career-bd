'use client';
import Link from 'next/link';
import { useApp } from './AppProvider';
import { PageHeader } from './ui';

export const SUPPORT_PHONE = '01710921994';
export const SUPPORT_PHONE_INTL = '+8801710921994';
export const SUPPORT_EMAIL = 'nursingcareerbd@gmail.com';
export const FACEBOOK_URL = 'https://www.facebook.com/share/1Ej43zxCY7/';

type Bi = [bn: string, en: string];
export type LegalSection = { h: Bi; p: Bi[] };

export function LegalPage({ title, updated, intro, sections }: { title: Bi; updated: string; intro?: Bi; sections: LegalSection[] }) {
  const { lang } = useApp();
  const i = lang === 'bn' ? 0 : 1;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={title[i]} sub={(lang === 'bn' ? 'সর্বশেষ হালনাগাদ: ' : 'Last updated: ') + updated} />
      <div className="card space-y-5 p-5 text-[15px] leading-7 text-ink">
        {intro && <p>{intro[i]}</p>}
        {sections.map((s, k) => (
          <section key={k}>
            <h2 className="mb-1.5 text-base font-bold text-ink">{s.h[i]}</h2>
            <div className="space-y-2 text-ink-soft">
              {s.p.map((x, j) => <p key={j}>{x[i]}</p>)}
            </div>
          </section>
        ))}
        <p className="border-t border-brand-100 pt-4 text-sm text-ink-soft">
          {lang === 'bn' ? 'যেকোনো প্রশ্নে যোগাযোগ করুন: ' : 'Questions? Contact us: '}
          <a className="font-semibold text-brand-700" href={`tel:${SUPPORT_PHONE_INTL}`}>{SUPPORT_PHONE}</a>
          {' · '}<Link className="font-semibold text-brand-700" href="/contact">{lang === 'bn' ? 'যোগাযোগ পেজ' : 'Contact page'}</Link>
        </p>
      </div>
    </div>
  );
}

export function LegalLinks({ className = '' }: { className?: string }) {
  const { lang } = useApp();
  const bn = lang === 'bn';
  const links: [string, string][] = [
    ['/terms', bn ? 'শর্তাবলি' : 'Terms'],
    ['/privacy', bn ? 'গোপনীয়তা নীতি' : 'Privacy'],
    ['/refund', bn ? 'রিফান্ড নীতি' : 'Refund'],
    ['/contact', bn ? 'যোগাযোগ' : 'Contact'],
  ];
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft ${className}`}>
      {links.map(([href, label]) => <Link key={href} href={href} className="hover:text-brand-700">{label}</Link>)}
    </div>
  );
}
