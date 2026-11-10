'use client';
import { LegalPage, type LegalSection } from '@/components/LegalPage';

const S: LegalSection[] = [
  { h: ['১. কখন পুরো টাকা ফেরত পাবেন', '1. When you get a full refund'], p: [
    ['টাকা কাটা গেছে কিন্তু ২৪ ঘণ্টার মধ্যে প্রিমিয়াম চালু হয়নি, এবং আমরা সমস্যাটি সমাধান করতে পারিনি।', 'Money was deducted but premium was not activated within 24 hours and we could not resolve it.'],
    ['ভুল করে একই প্যাকেজের জন্য একাধিকবার পেমেন্ট হয়েছে—অতিরিক্ত পেমেন্ট পুরোটা ফেরত দেওয়া হবে।', 'You were charged more than once for the same package — the extra payment is refunded in full.'],
    ['কেনার ৩ দিনের মধ্যে আমাদের কারিগরি ত্রুটির কারণে প্রিমিয়াম কনটেন্ট ব্যবহার করতে পারেননি এবং আমরা তা ঠিক করতে পারিনি।', 'Within 3 days of purchase you could not use premium content due to a technical fault on our side that we could not fix.'],
  ] },
  { h: ['২. কখন ফেরত দেওয়া হয় না', '2. When refunds are not given'], p: [[
    'প্রিমিয়াম একটি ডিজিটাল সেবা, চালু হওয়ার সাথে সাথেই সব কনটেন্ট খুলে যায়। তাই সফলভাবে চালু হওয়ার পর মত পরিবর্তন, পরীক্ষা হয়ে যাওয়া বা আর প্রয়োজন না থাকার কারণে টাকা ফেরত দেওয়া হয় না। শর্তাবলি ভঙ্গের (যেমন অ্যাকাউন্ট শেয়ার) কারণে অ্যাকাউন্ট স্থগিত হলেও টাকা ফেরত হবে না।',
    'Premium is a digital service that unlocks all content immediately. After successful activation, refunds are not given for change of mind, the exam being over or no longer needing it. No refund is given if an account is suspended for breaking the terms (e.g. account sharing).',
  ]] },
  { h: ['৩. কীভাবে আবেদন করবেন', '3. How to request'], p: [[
    'পেমেন্টের ৭ দিনের মধ্যে নিচের নম্বরে কল বা মেসেজ করুন। আপনার অ্যাকাউন্টের ইমেইল, যে নম্বর থেকে টাকা পাঠিয়েছেন এবং ট্রানজেকশন আইডি (TrxID) জানান।',
    'Call or message the number below within 7 days of payment with your account email, the number you paid from and the transaction ID (TrxID).',
  ]] },
  { h: ['৪. টাকা ফেরতের সময় ও মাধ্যম', '4. Timing and method'], p: [[
    'আবেদন যাচাই করে অনুমোদন হলে ৭ কার্যদিবসের মধ্যে যে bKash/Nagad নম্বর থেকে পেমেন্ট করা হয়েছিল, সেই নম্বরেই টাকা ফেরত পাঠানো হবে। রিফান্ড হলে সংশ্লিষ্ট প্রিমিয়াম সুবিধা বন্ধ হয়ে যাবে।',
    'Once verified and approved, the refund is sent within 7 working days to the same bKash/Nagad number used for payment. Premium access for that purchase ends when refunded.',
  ]] },
];

export default function RefundPage() {
  return <LegalPage title={['রিফান্ড নীতি', 'Refund Policy']} updated="10 November 2026" sections={S} />;
}
