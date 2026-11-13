// Web push (phone/desktop notifications). The public key pairs with the private key kept only in the database.
import { supabaseBrowser } from '@/lib/supabase/client';

export const VAPID_PUBLIC = 'BEbiJurwGhTBO54b0LJLu-fED_FYxltRWRc6x3RbD-Y62iTw70ZFDjYY19B5LXTbRE2eE9497dDRUNyujvTzRi4';

export type PushState = 'unsupported' | 'ios-install' | 'denied' | 'on' | 'off';

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function key(b64: string) {
  const p = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(p); const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function reg() {
  const r = await navigator.serviceWorker.getRegistration('/') ?? await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return r;
}

export async function pushState(): Promise<PushState> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIOS() && !standalone() ? 'ios-install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  const r = await navigator.serviceWorker.getRegistration('/');
  const s = r ? await r.pushManager.getSubscription() : null;
  return s ? 'on' : 'off';
}

export async function enablePush(): Promise<PushState> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  const r = await reg();
  const sub = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(VAPID_PUBLIC) });
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabaseBrowser().rpc('save_push', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
  if (error) throw error;
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const r = await navigator.serviceWorker.getRegistration('/');
  const sub = r ? await r.pushManager.getSubscription() : null;
  if (sub) {
    await supabaseBrowser().rpc('remove_push', { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  return 'off';
}
