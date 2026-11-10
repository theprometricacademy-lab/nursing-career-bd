// Where is the site running? Used to show/hide the Android app download and to label app visits.

export function isAndroid() {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

/** True when the page is open inside our Android app (the app starts at /?source=app). */
export function inAndroidApp() {
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(location.search).get('source') === 'app' || document.referrer.startsWith('android-app://')) {
      sessionStorage.setItem('inApp', '1');
    }
    return sessionStorage.getItem('inApp') === '1';
  } catch { return false; }
}
