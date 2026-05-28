// Web push registration via Firebase Cloud Messaging.
// Set these env vars in .env.local to enable:
//   NEXT_PUBLIC_FIREBASE_API_KEY
//   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID
//   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
//   NEXT_PUBLIC_FIREBASE_APP_ID
//   NEXT_PUBLIC_FIREBASE_VAPID_KEY
// If any are missing, registration silently no-ops.

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';
import client from '@/lib/api';

const cfg = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const VAPID = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

function isConfigured(): boolean {
  return !!(cfg.apiKey && cfg.projectId && cfg.appId && cfg.messagingSenderId && VAPID);
}

async function initFirebase() {
  if (!isConfigured()) return null;
  if (typeof window === 'undefined') return null;
  if (!(await isSupported())) return null;

  if (!app) app = getApps().length ? getApps()[0] : initializeApp(cfg as any);
  if (!messaging) messaging = getMessaging(app);
  return messaging;
}

/**
 * Request notification permission, get an FCM token, and POST it to the backend.
 * Idempotent — safe to call on every login. Silently no-ops if Firebase isn't configured.
 */
export async function enablePushNotifications(): Promise<{ ok: boolean; reason?: string }> {
  if (!isConfigured()) return { ok: false, reason: 'firebase-not-configured' };
  if (typeof window === 'undefined') return { ok: false, reason: 'ssr' };
  if (!('Notification' in window)) return { ok: false, reason: 'no-notification-api' };
  if (!('serviceWorker' in navigator)) return { ok: false, reason: 'no-service-worker' };

  // Permission
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'permission-denied' };

  // Register the FCM service worker
  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
  } catch (e: any) {
    return { ok: false, reason: `sw-register-failed: ${e.message}` };
  }

  const m = await initFirebase();
  if (!m) return { ok: false, reason: 'firebase-init-failed' };

  // Get token
  let fcmToken: string;
  try {
    fcmToken = await getToken(m, { vapidKey: VAPID, serviceWorkerRegistration: registration });
  } catch (e: any) {
    return { ok: false, reason: `get-token-failed: ${e.message}` };
  }
  if (!fcmToken) return { ok: false, reason: 'no-token' };

  // Send to backend
  try {
    await client.post('/device-tokens', { fcm_token: fcmToken, platform: 'web' });
  } catch (e: any) {
    return { ok: false, reason: `register-failed: ${e?.response?.data?.error || e.message}` };
  }

  // Foreground messages — show a basic browser notification when the page is open
  onMessage(m, (payload) => {
    const title = payload.notification?.title || 'New notification';
    const body  = payload.notification?.body || '';
    new Notification(title, { body, icon: '/icon-192.png' });
  });

  return { ok: true };
}

export function hasFirebaseConfig(): boolean {
  return isConfigured();
}
