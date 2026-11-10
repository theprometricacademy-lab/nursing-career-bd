import type { MetadataRoute } from 'next';

// Makes the site installable as an app (Android "Install app", home-screen icon, full screen).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Nursing Career BD — নার্সিং চাকরির প্রস্তুতি',
    short_name: 'Nursing Career BD',
    description: 'সিনিয়র স্টাফ নার্স ও সরকারি নার্সিং চাকরির প্রস্তুতি: প্রশ্নব্যাংক, PSC প্যাটার্নে মডেল টেস্ট ও ফলাফল বিশ্লেষণ।',
    lang: 'bn',
    dir: 'ltr',
    start_url: '/?source=app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7fbff',
    theme_color: '#1f7ad6',
    categories: ['education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'মডেল টেস্ট', short_name: 'মডেল টেস্ট', url: '/mock-tests', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'প্রশ্ন ব্যাংক', short_name: 'প্রশ্ন ব্যাংক', url: '/question-bank', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'ডেইলি কুইজ', short_name: 'ডেইলি কুইজ', url: '/daily-quiz', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
