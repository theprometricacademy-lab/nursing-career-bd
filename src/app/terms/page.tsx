'use client';
import { LegalPage, type LegalSection } from '@/components/LegalPage';

const S: LegalSection[] = [
  { h: ['১. সেবার পরিচিতি', '1. About the service'], p: [[
    'Nursing Career BD (nursingcareerbd.com) নার্সিং চাকরি ও পরীক্ষার প্রস্তুতির জন্য একটি অনলাইন প্ল্যাটফর্ম। এখানে প্রশ্নব্যাংক, বিষয়ভিত্তিক অনুশীলন, মডেল টেস্ট ও ফলাফল বিশ্লেষণ পাওয়া যায়। ওয়েবসাইট ব্যবহার করলে আপনি এই শর্তাবলিতে সম্মত হচ্ছেন বলে ধরা হবে।',
    'Nursing Career BD (nursingcareerbd.com) is an online platform for nursing job and exam preparation, offering a question bank, subject-wise practice, mock tests and result analysis. By using the website you agree to these terms.',
  ]] },
  { h: ['২. অ্যাকাউন্ট', '2. Accounts'], p: [
    ['অ্যাকাউন্ট খুলতে সঠিক নাম, ইমেইল ও মোবাইল নম্বর দিতে হবে। আপনার পাসওয়ার্ড গোপন রাখার দায়িত্ব আপনার।', 'You must provide an accurate name, email and mobile number. You are responsible for keeping your password secret.'],
    ['একটি অ্যাকাউন্ট শুধু একজন ব্যক্তি ব্যবহার করবেন। অ্যাকাউন্ট শেয়ার, বিক্রি বা হস্তান্তর করা নিষেধ; এমন প্রমাণ পেলে অ্যাকাউন্ট স্থগিত করা হতে পারে।', 'Each account is for one person only. Sharing, selling or transferring an account is not allowed and may lead to suspension.'],
  ] },
  { h: ['৩. প্রিমিয়াম প্যাকেজ ও মূল্য', '3. Premium packages and pricing'], p: [
    ['প্রিমিয়াম প্যাকেজের মূল্য প্রিমিয়াম পেজে টাকায় (BDT) দেখানো থাকে। পেমেন্ট সফল ও যাচাই হওয়ার পর প্রিমিয়াম সুবিধা চালু হয়।', 'Premium prices are shown in BDT on the Premium page. Premium access is activated once the payment is successful and verified.'],
    ['"লাইফটাইম" প্যাকেজ মানে এই প্ল্যাটফর্ম যতদিন চালু থাকবে ততদিন প্রিমিয়াম কনটেন্ট ব্যবহারের সুযোগ। একক টেস্ট কিনলে শুধু সেই টেস্টটি দেওয়া যাবে।', 'A "Lifetime" package gives premium access for as long as the platform operates. A single-test purchase unlocks only that test.'],
    ['ভবিষ্যতে মূল্য পরিবর্তন হতে পারে, তবে আগে কেনা প্যাকেজের সুবিধা কমানো হবে না।', 'Prices may change in future, but this will not reduce the benefits of packages already bought.'],
  ] },
  { h: ['৪. কনটেন্ট ব্যবহার', '4. Use of content'], p: [
    ['ওয়েবসাইটের প্রশ্ন, ব্যাখ্যা ও অন্যান্য কনটেন্ট শুধু ব্যক্তিগত প্রস্তুতির জন্য। অনুমতি ছাড়া কপি, স্ক্রিনশট করে বিক্রি, অন্য ওয়েবসাইট/অ্যাপ/বইয়ে প্রকাশ বা স্বয়ংক্রিয়ভাবে (bot/scraper) সংগ্রহ করা নিষেধ।', 'Questions, explanations and other content are for personal preparation only. Copying, reselling, republishing on other sites/apps/books or automated scraping without permission is prohibited.'],
    ['আমরা প্রশ্ন ও উত্তর নির্ভুল রাখতে সর্বোচ্চ চেষ্টা করি। কোনো ভুল পেলে জানালে দ্রুত সংশোধন করা হবে। তবে কোনো নিয়োগ পরীক্ষায় সাফল্যের নিশ্চয়তা আমরা দিই না।', 'We try hard to keep questions and answers accurate and will fix reported errors quickly, but we do not guarantee success in any recruitment exam.'],
  ] },
  { h: ['৫. নিষিদ্ধ আচরণ', '5. Prohibited conduct'], p: [[
    'ওয়েবসাইটের নিরাপত্তা ভাঙার চেষ্টা, অন্যের অ্যাকাউন্টে প্রবেশ, ভুয়া পেমেন্ট তথ্য দেওয়া বা সেবার স্বাভাবিক কার্যক্রমে বাধা দেওয়া নিষেধ। এসব ক্ষেত্রে অ্যাকাউন্ট বাতিল ও প্রয়োজনে আইনি ব্যবস্থা নেওয়া হতে পারে।',
    'Attempting to break the site\'s security, accessing others\' accounts, submitting fake payment details or disrupting the service is prohibited and may lead to account termination and legal action.',
  ]] },
  { h: ['৬. সেবার পরিবর্তন', '6. Changes to the service'], p: [[
    'আমরা যেকোনো সময় ফিচার, কনটেন্ট বা এই শর্তাবলি হালনাগাদ করতে পারি। বড় পরিবর্তন হলে ওয়েবসাইটের নোটিশে জানানো হবে।',
    'We may update features, content or these terms at any time. Significant changes will be announced in the site notices.',
  ]] },
  { h: ['৭. প্রযোজ্য আইন', '7. Governing law'], p: [[
    'এই শর্তাবলি বাংলাদেশের প্রচলিত আইন অনুযায়ী পরিচালিত হবে।',
    'These terms are governed by the laws of Bangladesh.',
  ]] },
];

export default function TermsPage() {
  return <LegalPage title={['শর্তাবলি', 'Terms & Conditions']} updated="10 November 2026" sections={S} />;
}
