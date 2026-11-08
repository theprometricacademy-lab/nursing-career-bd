export type Lang = 'bn' | 'en';

const en = {
  appName: 'Nursing Career BD',
  tagline: 'Smart Preparation for Nursing Jobs in Bangladesh',
  // nav
  home: 'Home', questionBank: 'Question Bank', subjectPractice: 'Subject Practice', mockTest: 'Mock Test',
  previousYear: 'Previous Year Questions', dailyQuiz: 'Daily Quiz', bookmarks: 'Bookmarks',
  wrongAnswers: 'Wrong Answer Practice', results: 'Results & Performance', premium: 'Premium',
  dashboard: 'Dashboard', profile: 'Profile & Settings', admin: 'Admin Panel', menu: 'Menu', more: 'More',
  // auth
  login: 'Log in', logout: 'Log out', signup: 'Create account', email: 'Email', password: 'Password',
  fullName: 'Full name', phone: 'Mobile number', forgotPassword: 'Forgot password?', noAccount: "Don't have an account?",
  haveAccount: 'Already have an account?', sendReset: 'Send reset link', resetSent: 'Check your email for the reset link.',
  newPassword: 'New password', updatePassword: 'Update password', checkEmail: 'Account created. Please check your email to confirm, then log in.',
  loginRequired: 'Please log in to continue.',
  // common
  start: 'Start', startNow: 'Start now', continue: 'Continue', save: 'Save', saved: 'Saved', cancel: 'Cancel', delete: 'Delete',
  edit: 'Edit', add: 'Add', search: 'Search', filter: 'Filter', all: 'All', loading: 'Loading…', noData: 'Nothing here yet.',
  back: 'Back', next: 'Next', previous: 'Previous', submit: 'Submit', close: 'Close', yes: 'Yes', no: 'No', view: 'View',
  free: 'Free', locked: 'Premium only', unlock: 'Unlock with Premium', questions: 'questions', minutes: 'minutes',
  subject: 'Subject', topic: 'Topic', year: 'Year', exam: 'Exam', difficulty: 'Difficulty', easy: 'Easy', medium: 'Medium', hard: 'Hard',
  nursingSubjects: 'Nursing Subjects', generalSubjects: 'General Subjects', error: 'Something went wrong. Please try again.',
  loadMore: 'Load more', language: 'Language', bangla: 'বাংলা', english: 'English',
  // home
  heroTitle: 'Prepare for government nursing jobs, the smart way',
  heroSub: 'Bilingual question bank, real exam-style mock tests, previous year questions and progress tracking — all in one place.',
  getStarted: 'Get started free', exploreQuestions: 'Explore questions',
  featureBank: 'Bilingual question bank', featureBankD: 'Every question in Bangla and English with explanations.',
  featureMock: 'Real exam simulator', featureMockD: 'Timer, question palette, mark for review and negative marking.',
  featurePyq: 'Previous year questions', featurePyqD: 'Filter by exam, year and subject.',
  featureTrack: 'Progress tracking', featureTrackD: 'Subject-wise accuracy, best and average scores.',
  examsCovered: 'Exams we cover', notices: 'Notices',
  bscExam: 'BSc in Nursing', diplomaExam: 'Diploma in Nursing Science & Midwifery', ssnExam: 'Senior Staff Nurse', otherExam: 'Other nursing recruitment',
  // practice
  checkAnswer: 'Check answer', correct: 'Correct!', wrong: 'Wrong', correctAnswer: 'Correct answer', explanation: 'Explanation',
  bookmark: 'Bookmark', bookmarked: 'Bookmarked', showBangla: 'বাংলা', showEnglish: 'English',
  practiceTest: 'Practice test', numQuestions: 'Number of questions', duration: 'Duration (minutes)', practiceQuestions: 'Practise questions',
  // mock
  mockTests: 'Mock Tests', marks: 'marks', negativeMarking: 'Negative marking', perWrong: 'per wrong answer',
  timeLeft: 'Time left', markReview: 'Mark for review', unmark: 'Unmark', clear: 'Clear answer', palette: 'Question palette',
  answered: 'Answered', notAnswered: 'Not answered', markedReview: 'Marked', current: 'Current',
  confirmSubmit: 'Submit the exam?', confirmSubmitD: 'You have {n} unanswered question(s). You cannot change answers after submitting.',
  timeUp: 'Time is up! Your exam was submitted automatically.', submitting: 'Submitting…',
  instructions: 'Instructions', instr1: 'Answers are saved automatically as you go.', instr2: 'The exam submits itself when the timer reaches zero.',
  instr3: 'Correct answers are shown only after you submit.', buyTest: 'Buy this test', premiumTest: 'Premium test',
  // results
  score: 'Score', accuracy: 'Accuracy', correctCount: 'Correct', wrongCount: 'Wrong', skipped: 'Skipped', review: 'Review answers',
  subjectAccuracy: 'Subject-wise accuracy', onlyWrong: 'Only wrong', allQuestions: 'All', yourAnswer: 'Your answer',
  notAttempted: 'Not attempted', retake: 'Take another test', testHistory: 'Test history', inProgress: 'In progress', resume: 'Resume',
  // dashboard
  welcome: 'Welcome', testsCompleted: 'Mock tests completed', questionsAttempted: 'Questions attempted', correctAnswers: 'Correct answers',
  averageScore: 'Average score', bestScore: 'Best score', subjectPerformance: 'Subject-wise performance', recentActivity: 'Recent activity',
  learningProgress: 'Learning progress', coverage: 'of the question bank practised', premiumStatus: 'Premium status',
  active: 'Active', inactive: 'Not active', upgrade: 'Upgrade',
  // premium
  premiumTitle: 'Go Premium', premiumSub: 'Unlock everything you need to crack the exam.', lifetime: 'Premium Lifetime Access',
  singleTest: 'Single Mock Test', oneTime: 'one-time payment', coupon: 'Coupon code', apply: 'Apply', couponOk: 'Coupon applied',
  couponBad: 'Invalid or expired coupon', payWith: 'Pay with', alreadyPremium: 'You already have Premium. Enjoy!',
  pf1: 'Full question bank', pf2: 'Unlimited mock tests', pf3: 'All previous-year questions', pf4: 'Detailed explanations',
  pf5: 'Performance analytics', pf6: 'Advanced practice mode', paySuccess: 'Payment successful! Premium is now active.',
  payFailed: 'Payment failed or was cancelled.', payPending: 'We are confirming your payment…', choosePlan: 'Choose a plan',
  // profile
  settings: 'Settings', profileSaved: 'Profile saved', accountInfo: 'Account information',
} as const;

export type DictKey = keyof typeof en;

const bn: Record<DictKey, string> = {
  appName: 'Nursing Career BD',
  tagline: 'বাংলাদেশে নার্সিং চাকরির স্মার্ট প্রস্তুতি',
  home: 'হোম', questionBank: 'প্রশ্ন ব্যাংক', subjectPractice: 'বিষয়ভিত্তিক অনুশীলন', mockTest: 'মক টেস্ট',
  previousYear: 'বিগত বছরের প্রশ্ন', dailyQuiz: 'ডেইলি কুইজ', bookmarks: 'বুকমার্ক',
  wrongAnswers: 'ভুল উত্তর অনুশীলন', results: 'ফলাফল ও পারফরম্যান্স', premium: 'প্রিমিয়াম',
  dashboard: 'ড্যাশবোর্ড', profile: 'প্রোফাইল ও সেটিংস', admin: 'অ্যাডমিন প্যানেল', menu: 'মেনু', more: 'আরও',
  login: 'লগইন', logout: 'লগআউট', signup: 'অ্যাকাউন্ট খুলুন', email: 'ইমেইল', password: 'পাসওয়ার্ড',
  fullName: 'পূর্ণ নাম', phone: 'মোবাইল নম্বর', forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?', noAccount: 'অ্যাকাউন্ট নেই?',
  haveAccount: 'আগে থেকেই অ্যাকাউন্ট আছে?', sendReset: 'রিসেট লিংক পাঠান', resetSent: 'রিসেট লিংকের জন্য ইমেইল দেখুন।',
  newPassword: 'নতুন পাসওয়ার্ড', updatePassword: 'পাসওয়ার্ড আপডেট করুন', checkEmail: 'অ্যাকাউন্ট তৈরি হয়েছে। ইমেইলে পাঠানো লিংকে নিশ্চিত করে লগইন করুন।',
  loginRequired: 'চালিয়ে যেতে লগইন করুন।',
  start: 'শুরু', startNow: 'এখনই শুরু করুন', continue: 'চালিয়ে যান', save: 'সংরক্ষণ', saved: 'সংরক্ষিত', cancel: 'বাতিল', delete: 'মুছুন',
  edit: 'এডিট', add: 'যোগ করুন', search: 'খুঁজুন', filter: 'ফিল্টার', all: 'সব', loading: 'লোড হচ্ছে…', noData: 'এখানে এখনো কিছু নেই।',
  back: 'পেছনে', next: 'পরের', previous: 'আগের', submit: 'জমা দিন', close: 'বন্ধ', yes: 'হ্যাঁ', no: 'না', view: 'দেখুন',
  free: 'ফ্রি', locked: 'শুধু প্রিমিয়াম', unlock: 'প্রিমিয়াম নিয়ে খুলুন', questions: 'টি প্রশ্ন', minutes: 'মিনিট',
  subject: 'বিষয়', topic: 'টপিক', year: 'সাল', exam: 'পরীক্ষা', difficulty: 'কঠিনতা', easy: 'সহজ', medium: 'মাঝারি', hard: 'কঠিন',
  nursingSubjects: 'নার্সিং বিষয়সমূহ', generalSubjects: 'সাধারণ বিষয়সমূহ', error: 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।',
  loadMore: 'আরও দেখুন', language: 'ভাষা', bangla: 'বাংলা', english: 'English',
  heroTitle: 'সরকারি নার্সিং চাকরির প্রস্তুতি নিন স্মার্টভাবে',
  heroSub: 'বাংলা-ইংরেজি প্রশ্ন ব্যাংক, আসল পরীক্ষার মতো মক টেস্ট, বিগত বছরের প্রশ্ন আর অগ্রগতির হিসাব — সব এক জায়গায়।',
  getStarted: 'ফ্রি শুরু করুন', exploreQuestions: 'প্রশ্ন দেখুন',
  featureBank: 'দুই ভাষার প্রশ্ন ব্যাংক', featureBankD: 'প্রতিটি প্রশ্ন বাংলা ও ইংরেজিতে, ব্যাখ্যাসহ।',
  featureMock: 'আসল পরীক্ষার সিমুলেটর', featureMockD: 'টাইমার, প্রশ্ন প্যালেট, রিভিউ চিহ্ন ও নেগেটিভ মার্কিং।',
  featurePyq: 'বিগত বছরের প্রশ্ন', featurePyqD: 'পরীক্ষা, সাল ও বিষয় দিয়ে খুঁজুন।',
  featureTrack: 'অগ্রগতির হিসাব', featureTrackD: 'বিষয়ভিত্তিক নির্ভুলতা, সেরা ও গড় নম্বর।',
  examsCovered: 'যেসব পরীক্ষার প্রস্তুতি', notices: 'নোটিশ',
  bscExam: 'বিএসসি ইন নার্সিং', diplomaExam: 'ডিপ্লোমা ইন নার্সিং সায়েন্স অ্যান্ড মিডওয়াইফারি', ssnExam: 'সিনিয়র স্টাফ নার্স', otherExam: 'অন্যান্য নার্সিং নিয়োগ',
  checkAnswer: 'উত্তর যাচাই', correct: 'সঠিক!', wrong: 'ভুল', correctAnswer: 'সঠিক উত্তর', explanation: 'ব্যাখ্যা',
  bookmark: 'বুকমার্ক', bookmarked: 'বুকমার্ক করা', showBangla: 'বাংলা', showEnglish: 'English',
  practiceTest: 'অনুশীলন পরীক্ষা', numQuestions: 'প্রশ্নের সংখ্যা', duration: 'সময় (মিনিট)', practiceQuestions: 'প্রশ্ন অনুশীলন',
  mockTests: 'মক টেস্ট', marks: 'নম্বর', negativeMarking: 'নেগেটিভ মার্কিং', perWrong: 'প্রতি ভুল উত্তরে',
  timeLeft: 'বাকি সময়', markReview: 'রিভিউর জন্য চিহ্নিত', unmark: 'চিহ্ন তুলুন', clear: 'উত্তর মুছুন', palette: 'প্রশ্ন প্যালেট',
  answered: 'উত্তর দেওয়া', notAnswered: 'উত্তর দেওয়া হয়নি', markedReview: 'চিহ্নিত', current: 'বর্তমান',
  confirmSubmit: 'পরীক্ষা জমা দেবেন?', confirmSubmitD: 'আপনার {n}টি প্রশ্নের উত্তর দেওয়া হয়নি। জমা দেওয়ার পর আর উত্তর বদলানো যাবে না।',
  timeUp: 'সময় শেষ! আপনার পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হয়েছে।', submitting: 'জমা হচ্ছে…',
  instructions: 'নির্দেশনা', instr1: 'আপনার উত্তর সাথে সাথে স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়।', instr2: 'টাইমার শূন্য হলে পরীক্ষা নিজে থেকেই জমা হবে।',
  instr3: 'সঠিক উত্তর শুধু জমা দেওয়ার পর দেখানো হবে।', buyTest: 'টেস্টটি কিনুন', premiumTest: 'প্রিমিয়াম টেস্ট',
  score: 'নম্বর', accuracy: 'নির্ভুলতা', correctCount: 'সঠিক', wrongCount: 'ভুল', skipped: 'বাদ', review: 'উত্তর পর্যালোচনা',
  subjectAccuracy: 'বিষয়ভিত্তিক নির্ভুলতা', onlyWrong: 'শুধু ভুলগুলো', allQuestions: 'সব', yourAnswer: 'আপনার উত্তর',
  notAttempted: 'উত্তর দেওয়া হয়নি', retake: 'আরেকটি টেস্ট দিন', testHistory: 'টেস্টের ইতিহাস', inProgress: 'চলমান', resume: 'আবার শুরু',
  welcome: 'স্বাগতম', testsCompleted: 'সম্পন্ন মক টেস্ট', questionsAttempted: 'উত্তর দেওয়া প্রশ্ন', correctAnswers: 'সঠিক উত্তর',
  averageScore: 'গড় নম্বর', bestScore: 'সেরা নম্বর', subjectPerformance: 'বিষয়ভিত্তিক পারফরম্যান্স', recentActivity: 'সাম্প্রতিক কার্যক্রম',
  learningProgress: 'শেখার অগ্রগতি', coverage: 'প্রশ্ন ব্যাংক অনুশীলন করা হয়েছে', premiumStatus: 'প্রিমিয়াম স্ট্যাটাস',
  active: 'চালু', inactive: 'চালু নেই', upgrade: 'আপগ্রেড',
  premiumTitle: 'প্রিমিয়াম নিন', premiumSub: 'পরীক্ষায় সফল হতে যা দরকার, সব খুলে যাবে।', lifetime: 'আজীবন প্রিমিয়াম অ্যাক্সেস',
  singleTest: 'একটি মক টেস্ট', oneTime: 'একবারের পেমেন্ট', coupon: 'কুপন কোড', apply: 'প্রয়োগ', couponOk: 'কুপন প্রয়োগ হয়েছে',
  couponBad: 'কুপনটি সঠিক নয় বা মেয়াদ শেষ', payWith: 'পেমেন্ট করুন', alreadyPremium: 'আপনার প্রিমিয়াম চালু আছে।',
  pf1: 'পূর্ণ প্রশ্ন ব্যাংক', pf2: 'আনলিমিটেড মক টেস্ট', pf3: 'সব বিগত বছরের প্রশ্ন', pf4: 'বিস্তারিত ব্যাখ্যা',
  pf5: 'পারফরম্যান্স বিশ্লেষণ', pf6: 'অ্যাডভান্সড অনুশীলন মোড', paySuccess: 'পেমেন্ট সফল! প্রিমিয়াম চালু হয়েছে।',
  payFailed: 'পেমেন্ট ব্যর্থ বা বাতিল হয়েছে।', payPending: 'আপনার পেমেন্ট যাচাই করা হচ্ছে…', choosePlan: 'প্ল্যান বেছে নিন',
  settings: 'সেটিংস', profileSaved: 'প্রোফাইল সংরক্ষিত হয়েছে', accountInfo: 'অ্যাকাউন্টের তথ্য',
};

export const dictionaries: Record<Lang, Record<DictKey, string>> = { en, bn };

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export function toBnDigits(s: string | number) {
  return String(s).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Map known server error codes to friendly text */
export const errorText: Record<string, { en: string; bn: string }> = {
  premium_required: { en: 'This needs Premium access.', bn: 'এটির জন্য প্রিমিয়াম প্রয়োজন।' },
  rate_limited: { en: 'Too many requests. Please wait a little.', bn: 'অনেক বেশি অনুরোধ। একটু পরে চেষ্টা করুন।' },
  no_questions: { en: 'No questions available for this selection yet.', bn: 'এই বাছাইয়ে এখনো কোনো প্রশ্ন নেই।' },
  time_over: { en: 'Time is over.', bn: 'সময় শেষ।' },
  already_submitted: { en: 'This exam is already submitted.', bn: 'পরীক্ষাটি আগেই জমা হয়েছে।' },
  auth_required: { en: 'Please log in first.', bn: 'আগে লগইন করুন।' },
  not_found: { en: 'Not found.', bn: 'পাওয়া যায়নি।' },
};
