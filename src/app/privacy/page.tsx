'use client';
import { LegalPage, type LegalSection } from '@/components/LegalPage';

const S: LegalSection[] = [
  { h: ['১. আমরা যে তথ্য সংগ্রহ করি', '1. Information we collect'], p: [
    ['অ্যাকাউন্ট তথ্য: নাম, ইমেইল, মোবাইল নম্বর এবং Google দিয়ে লগইন করলে Google অ্যাকাউন্টের নাম ও ইমেইল।', 'Account details: name, email, mobile number, and your Google name and email if you sign in with Google.'],
    ['ব্যবহারের তথ্য: কোন প্রশ্নের উত্তর দিয়েছেন, পরীক্ষার ফলাফল, বুকমার্ক ও ভুল উত্তরের তালিকা।', 'Usage data: questions answered, test results, bookmarks and wrong-answer lists.'],
    ['সাইট ব্যবহারের পরিসংখ্যান: কোন পেজ দেখা হয়েছে, কতক্ষণ, কোন ধরনের ডিভাইস থেকে এবং কোন সাইট থেকে এসেছেন। এর জন্য ব্রাউজারে একটি এলোমেলো আইডি রাখা হয়; আপনার IP ঠিকানা আমরা সংরক্ষণ করি না। এই তথ্য শুধু সাইট উন্নত করতে ব্যবহার হয়।', 'Site usage statistics: which pages were viewed, for how long, from what type of device and which site you came from. A random ID is kept in your browser for this; we do not store your IP address. This is used only to improve the site.'],
    ['পেমেন্ট তথ্য: পরিমাণ, পেমেন্টের মাধ্যম, ট্রানজেকশন আইডি ও যে নম্বর থেকে টাকা পাঠিয়েছেন। আপনার bKash/Nagad PIN, OTP বা কার্ডের তথ্য আমরা কখনো দেখি না বা সংরক্ষণ করি না।', 'Payment data: amount, method, transaction ID and the sending number. We never see or store your bKash/Nagad PIN, OTP or card details.'],
  ] },
  { h: ['২. তথ্য যে কাজে ব্যবহার হয়', '2. How we use it'], p: [[
    'অ্যাকাউন্ট চালানো, প্রিমিয়াম সুবিধা চালু করা, আপনার অগ্রগতি ও দুর্বল বিষয় দেখানো, পেমেন্ট যাচাই, সাপোর্ট দেওয়া এবং জরুরি নোটিশ (যেমন পাসওয়ার্ড রিসেট) পাঠানো।',
    'To run your account, activate premium, show your progress and weak areas, verify payments, provide support and send essential notices such as password resets.',
  ]] },
  { h: ['৩. তথ্য শেয়ার', '3. Sharing'], p: [
    ['আমরা আপনার ব্যক্তিগত তথ্য বিক্রি করি না এবং বিজ্ঞাপনদাতাদের দিই না।', 'We do not sell your personal data or give it to advertisers.'],
    ['সেবা চালাতে যেসব প্রতিষ্ঠানের সাহায্য নেওয়া হয় (যেমন ডাটাবেস ও হোস্টিং সেবা, ইমেইল সেবা, এবং bKash/Nagad-এর মতো পেমেন্ট প্রতিষ্ঠান), তারা শুধু প্রয়োজনীয় তথ্যটুকু পায়। আইন অনুযায়ী বাধ্য হলে কর্তৃপক্ষকে তথ্য দেওয়া হতে পারে।', 'Service providers we rely on (database and hosting, email, and payment providers such as bKash/Nagad) receive only what they need. We may disclose data where required by law.'],
  ] },
  { h: ['৪. কুকি', '4. Cookies'], p: [[
    'লগইন অবস্থা ধরে রাখা ও ভাষা পছন্দ মনে রাখার জন্য প্রয়োজনীয় কুকি ও ব্রাউজার স্টোরেজ ব্যবহার করা হয়।',
    'We use essential cookies and browser storage to keep you signed in and remember your language choice.',
  ], [
    'ফেসবুক বিজ্ঞাপনের ফল মাপতে Meta Pixel ব্যবহার করা হয়: কোন পেজ দেখা হলো, অ্যাকাউন্ট খোলা, পরীক্ষা শুরু বা প্রিমিয়াম নেওয়ার মতো ঘটনা Meta পায়। আপনার নাম, ফোন নম্বর, ইমেইল বা উত্তর পাঠানো হয় না।',
    'We use the Meta Pixel to measure our Facebook ads: Meta receives events such as page views, sign-ups, test starts and premium purchases. Your name, phone number, email and answers are not sent.',
  ], [
    'ফ্রি ব্যবহারকারীদের বিজ্ঞাপন দেখাতে Google AdSense ব্যবহার করা হতে পারে। Google ও তার অংশীদাররা কুকি ব্যবহার করে আপনার এই সাইট ও অন্য সাইটে আগের ভিজিটের ভিত্তিতে বিজ্ঞাপন দেখাতে পারে। ব্যক্তিগতকৃত বিজ্ঞাপন বন্ধ করতে চাইলে Google-এর Ads Settings (adssettings.google.com) থেকে বন্ধ করা যায়। আমরা আপনার নাম, ফোন নম্বর, ইমেইল বা উত্তর Google-কে দিই না।',
    'We may use Google AdSense to show ads to free users. Google and its partners use cookies to serve ads based on your earlier visits to this and other websites. You can turn off personalised advertising in Google Ads Settings (adssettings.google.com). We do not give Google your name, phone number, email or answers.',
  ]] },
  { h: ['৫. নিরাপত্তা', '5. Security'], p: [[
    'তথ্য এনক্রিপ্টেড সংযোগে (HTTPS) আদান-প্রদান হয় এবং প্রতিটি ব্যবহারকারী শুধু নিজের তথ্য দেখতে পারেন—এমনভাবে ডাটাবেস সুরক্ষিত রাখা হয়েছে।',
    'Data is transferred over encrypted HTTPS, and the database is protected so each user can access only their own data.',
  ]] },
  { h: ['৬. আপনার অধিকার', '6. Your rights'], p: [[
    'প্রোফাইল পেজ থেকে আপনার তথ্য হালনাগাদ করতে পারেন। অ্যাকাউন্ট ও সংশ্লিষ্ট তথ্য মুছে ফেলতে চাইলে নিচের নম্বরে যোগাযোগ করুন; যাচাইয়ের পর ৭ কার্যদিবসের মধ্যে মুছে ফেলা হবে (আইনগত কারণে পেমেন্টের রেকর্ড কিছুদিন রাখা লাগতে পারে)।',
    'You can update your details from the Profile page. To delete your account and data, contact us at the number below; after verification it will be deleted within 7 working days (payment records may be kept for a period where legally required).',
  ]] },
];

export default function PrivacyPage() {
  return <LegalPage title={['গোপনীয়তা নীতি', 'Privacy Policy']} updated="14 November 2026" sections={S}
    intro={['Nursing Career BD আপনার ব্যক্তিগত তথ্যের গোপনীয়তাকে গুরুত্ব দেয়। কোন তথ্য নেওয়া হয় এবং কীভাবে ব্যবহার হয়, তা এখানে বলা হলো।', 'Nursing Career BD respects your privacy. This page explains what we collect and how we use it.']} />;
}
