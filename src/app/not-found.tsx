import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl font-bold text-brand-600">404</p>
      <h1 className="mt-3 text-lg font-bold text-ink">পেজটি পাওয়া যায়নি</h1>
      <p className="mt-1 text-sm text-ink-soft">Page not found — লিংকটি ভুল বা পেজটি সরিয়ে ফেলা হয়েছে।</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="btn-primary">হোমে ফিরুন</Link>
        <Link href="/question-bank" className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700">প্রশ্নব্যাংক</Link>
      </div>
    </div>
  );
}
