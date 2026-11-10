'use client';
import Link from 'next/link';
import { Phone, MessageCircle, Globe } from 'lucide-react';
import { useApp } from '@/components/AppProvider';
import { PageHeader } from '@/components/ui';
import { LegalLinks, SUPPORT_PHONE, SUPPORT_PHONE_INTL } from '@/components/LegalPage';

export default function ContactPage() {
  const { lang } = useApp();
  const bn = lang === 'bn';
  const rows = [
    { icon: Phone, label: bn ? 'ফোন' : 'Phone', value: SUPPORT_PHONE, href: `tel:${SUPPORT_PHONE_INTL}` },
    { icon: MessageCircle, label: 'WhatsApp', value: SUPPORT_PHONE, href: `https://wa.me/${SUPPORT_PHONE_INTL.replace('+', '')}` },
    { icon: Globe, label: bn ? 'ওয়েবসাইট' : 'Website', value: 'nursingcareerbd.com', href: 'https://nursingcareerbd.com' },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={bn ? 'যোগাযোগ' : 'Contact us'} sub={bn ? 'পেমেন্ট, অ্যাকাউন্ট বা প্রশ্নের ভুল—যেকোনো বিষয়ে আমাদের জানান।' : 'Payments, account issues or a wrong answer — let us know.'} />
      <div className="card p-5">
        <p className="mb-4 font-bold text-ink">Nursing Career BD</p>
        <ul className="space-y-3">
          {rows.map(({ icon: Icon, label, value, href }) => (
            <li key={label}>
              <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-brand-100 p-3 hover:bg-brand-50">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-brand-700"><Icon className="h-5 w-5" /></span>
                <span><span className="block text-xs text-ink-soft">{label}</span><span className="font-semibold text-ink">{value}</span></span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-soft">
          {bn ? 'পেমেন্ট-সংক্রান্ত সমস্যায় আপনার অ্যাকাউন্টের ইমেইল ও ট্রানজেকশন আইডি (TrxID) সাথে দিন। টাকা ফেরতের নিয়ম জানতে ' : 'For payment issues include your account email and transaction ID (TrxID). See the '}
          <Link href="/refund" className="font-semibold text-brand-700">{bn ? 'রিফান্ড নীতি' : 'Refund Policy'}</Link>
          {bn ? ' দেখুন।' : '.'}
        </p>
        <LegalLinks className="mt-5 border-t border-brand-100 pt-4" />
      </div>
    </div>
  );
}
